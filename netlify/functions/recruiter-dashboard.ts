type RecruiterRow = {
  id: number
  created_at: string
  updated_at: string
  status: string
  source: string
  name: string
  x_handle: string
  telegram_handle: string
  wallet_address: string
  email: string
  country_region: string | null
  focus: string
  languages: string | null
  notes: string | null
  reviewed_at: string | null
  reviewer_notes: string | null
}

type JsonResponse = {
  statusCode: number
  headers: Record<string, string>
  body: string
}

function json(statusCode: number, body: Record<string, unknown>): JsonResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  }
}

function readToken(event: any) {
  const headerToken = String(event.headers?.['x-dashboard-token'] || event.headers?.['X-Dashboard-Token'] || event.headers?.['x-recruiter-dashboard-token'] || '').trim()
  const queryToken = String(event.queryStringParameters?.token || '').trim()
  return headerToken || queryToken
}

export const handler = async (event: any): Promise<JsonResponse> => {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed.' })
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const RECRUITER_TABLE = process.env.RECRUITER_TABLE || 'recruiter_waitlist'
  const DASHBOARD_TOKEN = process.env.RECRUITER_DASHBOARD_TOKEN || process.env.DIAGNOSTICS_TOKEN || ''

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: 'Server is not configured yet.' })
  }

  if (!DASHBOARD_TOKEN) {
    return json(500, { error: 'Dashboard token is not configured yet.' })
  }

  const token = readToken(event)
  if (!token || token !== DASHBOARD_TOKEN) {
    return json(401, { error: 'Unauthorized.' })
  }

  try {
    const url = new URL(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${RECRUITER_TABLE}`)
    url.searchParams.set('select', 'id,created_at,updated_at,status,source,name,x_handle,telegram_handle,wallet_address,email,country_region,focus,languages,notes,reviewed_at,reviewer_notes')
    url.searchParams.set('order', 'created_at.desc')
    url.searchParams.set('limit', '250')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      return json(500, { error: errorText || 'Database read failed.' })
    }

    const rows = (await response.json()) as RecruiterRow[]
    const counts = rows.reduce(
      (acc, row) => {
        acc.total += 1
        const key = row.status || 'unknown'
        acc.byStatus[key] = (acc.byStatus[key] || 0) + 1
        return acc
      },
      { total: 0, byStatus: {} as Record<string, number> },
    )

    return json(200, { ok: true, counts, rows })
  } catch {
    return json(500, { error: 'Unexpected server error.' })
  }
}
