const ALLOWED_STATUSES = new Set(['new', 'reviewing', 'approved', 'rejected'])
const SELECT_FIELDS =
  'id,created_at,updated_at,status,source,name,x_handle,telegram_handle,wallet_address,email,country_region,focus,languages,notes,reviewed_at,reviewer_notes'

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

function readToken(event) {
  const headers = event.headers || {}
  return String(headers['x-dashboard-token'] || headers['x-recruiter-dashboard-token'] || event.queryStringParameters?.token || '').trim()
}

function config() {
  return {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RECRUITER_TABLE: process.env.RECRUITER_TABLE || 'recruiter_waitlist',
    DASHBOARD_TOKEN: process.env.RECRUITER_DASHBOARD_TOKEN || process.env.DIAGNOSTICS_TOKEN || '',
  }
}

function parseBody(event) {
  if (!event.body) return {}
  try {
    return JSON.parse(event.body)
  } catch {
    return {}
  }
}

async function listRows(baseUrl, serviceKey, table) {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/rest/v1/${table}`)
  url.searchParams.set('select', SELECT_FIELDS)
  url.searchParams.set('order', 'created_at.desc')
  url.searchParams.set('limit', '250')

  const res = await fetch(url.toString(), {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  })

  if (!res.ok) throw new Error((await res.text().catch(() => '')) || 'Database read failed.')
  return await res.json()
}

async function patchRow(baseUrl, serviceKey, table, payload) {
  const id = Number(payload.id)
  if (!Number.isInteger(id) || id <= 0) throw new Error('A valid submission id is required.')

  const updateBody = {}

  if (payload.status !== undefined) {
    const status = String(payload.status || '').trim().toLowerCase()
    if (!ALLOWED_STATUSES.has(status)) throw new Error('Invalid status.')
    updateBody.status = status
    updateBody.reviewed_at = status === 'new' ? null : new Date().toISOString()
  }

  if (payload.reviewerNotes !== undefined) {
    const notes = String(payload.reviewerNotes || '').trim()
    if (notes.length > 5000) throw new Error('Reviewer notes are too long.')
    updateBody.reviewer_notes = notes || null
    if (payload.status === undefined) {
      updateBody.reviewed_at = notes ? new Date().toISOString() : null
    }
  }

  if (Object.keys(updateBody).length === 0) throw new Error('Nothing to update.')

  const url = new URL(`${baseUrl.replace(/\/$/, '')}/rest/v1/${table}`)
  url.searchParams.set('id', `eq.${id}`)
  url.searchParams.set('select', SELECT_FIELDS)

  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(updateBody),
  })

  if (!res.ok) throw new Error((await res.text().catch(() => '')) || 'Database update failed.')
  const rows = await res.json()
  if (!rows[0]) throw new Error('Submission was not found.')
  return rows[0]
}

export async function handler(event) {
  if (!['GET', 'PATCH', 'POST'].includes(event.httpMethod)) {
    return response(405, { error: 'Method not allowed.' })
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RECRUITER_TABLE, DASHBOARD_TOKEN } = config()
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return response(500, { error: 'Server is not configured yet.' })
  }
  if (!DASHBOARD_TOKEN) {
    return response(500, { error: 'Dashboard token is not configured yet.' })
  }

  const token = readToken(event)
  if (!token || token !== DASHBOARD_TOKEN) {
    return response(401, { error: 'Unauthorized.' })
  }

  try {
    if (event.httpMethod === 'GET') {
      const rows = await listRows(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RECRUITER_TABLE)
      const counts = rows.reduce(
        (acc, row) => {
          acc.total += 1
          const key = row.status || 'unknown'
          acc.byStatus[key] = (acc.byStatus[key] || 0) + 1
          return acc
        },
        { total: 0, byStatus: {} },
      )
      return response(200, { ok: true, counts, rows })
    }

    const row = await patchRow(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RECRUITER_TABLE, parseBody(event))
    return response(200, { ok: true, row })
  } catch (error) {
    return response(500, { error: error instanceof Error ? error.message : 'Unexpected server error.' })
  }
}
