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

function json(res: any, status: number, body: Record<string, unknown>) {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.send(JSON.stringify(body))
}

function readToken(req: any) {
  const headerToken = String(req.headers?.['x-dashboard-token'] || req.headers?.['x-recruiter-dashboard-token'] || '').trim()
  const queryToken = String(req.query?.token || '').trim()
  return headerToken || queryToken
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed.' })
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const RECRUITER_TABLE = process.env.RECRUITER_TABLE || 'recruiter_waitlist'
  const DASHBOARD_TOKEN = process.env.RECRUITER_DASHBOARD_TOKEN || process.env.DIAGNOSTICS_TOKEN || ''

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { error: 'Server is not configured yet.' })
  }

  if (!DASHBOARD_TOKEN) {
    return json(res, 500, { error: 'Dashboard token is not configured yet.' })
  }

  const token = readToken(req)
  if (!token || token !== DASHBOARD_TOKEN) {
    return json(res, 401, { error: 'Unauthorized.' })
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
      return json(res, 500, { error: errorText || 'Database read failed.' })
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

    return json(res, 200, {
      ok: true,
      counts,
      rows,
    })
  } catch {
    return json(res, 500, { error: 'Unexpected server error.' })
  }
}
