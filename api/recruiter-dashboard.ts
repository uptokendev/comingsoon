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

type ReviewPayload = {
  id?: number | string
  status?: string
  reviewerNotes?: string | null
}

const ALLOWED_STATUSES = new Set(['new', 'reviewing', 'approved', 'rejected'])
const SELECT_FIELDS =
  'id,created_at,updated_at,status,source,name,x_handle,telegram_handle,wallet_address,email,country_region,focus,languages,notes,reviewed_at,reviewer_notes'

function json(res: any, status: number, body: Record<string, unknown>) {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.send(JSON.stringify(body))
}

function readToken(req: any) {
  const headerToken = String(req.headers?.['x-dashboard-token'] || req.headers?.['x-recruiter-dashboard-token'] || '').trim()
  const queryToken = String(req.query?.token || '').trim()
  return headerToken || queryToken
}

function getConfig() {
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const RECRUITER_TABLE = process.env.RECRUITER_TABLE || 'recruiter_waitlist'
  const DASHBOARD_TOKEN = process.env.RECRUITER_DASHBOARD_TOKEN || process.env.DIAGNOSTICS_TOKEN || ''

  return { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RECRUITER_TABLE, DASHBOARD_TOKEN }
}

function readBody(req: any): ReviewPayload {
  const raw = req.body
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as ReviewPayload
    } catch {
      return {}
    }
  }
  return raw as ReviewPayload
}

async function listRows(baseUrl: string, serviceKey: string, table: string) {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/rest/v1/${table}`)
  url.searchParams.set('select', SELECT_FIELDS)
  url.searchParams.set('order', 'created_at.desc')
  url.searchParams.set('limit', '250')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || 'Database read failed.')
  }

  return (await response.json()) as RecruiterRow[]
}

async function patchRow(baseUrl: string, serviceKey: string, table: string, payload: ReviewPayload) {
  const id = Number(payload.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('A valid submission id is required.')
  }

  const updateBody: Record<string, unknown> = {}

  if (payload.status !== undefined) {
    const status = String(payload.status || '').trim().toLowerCase()
    if (!ALLOWED_STATUSES.has(status)) {
      throw new Error('Invalid status.')
    }
    updateBody.status = status
    updateBody.reviewed_at = status === 'new' ? null : new Date().toISOString()
  }

  if (payload.reviewerNotes !== undefined) {
    const notes = String(payload.reviewerNotes || '').trim()
    if (notes.length > 5000) {
      throw new Error('Reviewer notes are too long.')
    }
    updateBody.reviewer_notes = notes || null
    if (payload.status === undefined) {
      updateBody.reviewed_at = notes ? new Date().toISOString() : null
    }
  }

  if (Object.keys(updateBody).length === 0) {
    throw new Error('Nothing to update.')
  }

  const url = new URL(`${baseUrl.replace(/\/$/, '')}/rest/v1/${table}`)
  url.searchParams.set('id', `eq.${id}`)
  url.searchParams.set('select', SELECT_FIELDS)

  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(updateBody),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || 'Database update failed.')
  }

  const rows = (await response.json()) as RecruiterRow[]
  if (!rows[0]) {
    throw new Error('Submission was not found.')
  }

  return rows[0]
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'PATCH' && req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed.' })
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RECRUITER_TABLE, DASHBOARD_TOKEN } = getConfig()

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
    if (req.method === 'GET') {
      const rows = await listRows(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RECRUITER_TABLE)
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
    }

    const row = await patchRow(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RECRUITER_TABLE, readBody(req))
    return json(res, 200, { ok: true, row })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.'
    return json(res, 500, { error: message })
  }
}
