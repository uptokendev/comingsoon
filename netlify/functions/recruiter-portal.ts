import { readRecruiterAuth, unauthorized } from './_lib/auth'
import { json, normalizeCode, readBody } from './_lib/http'
import { ensureRecruiterCode } from './_lib/recruiters'
import { supabaseGet, supabasePatch } from './_lib/supabase'

type RecruiterRecord = {
  id: number
  name: string
  x_handle: string
  telegram_handle: string
  wallet_address: string
  status: string
  focus: string | null
  recruiter_code: string | null
  created_at: string
  approved_at: string | null
}

type SquadRow = {
  wallet_address: string
  recruiter_id: number
  recruiter_code: string
  role: string
  source: string
  bound_at: string
}

async function getRecruiter(recruiterId: number) {
  const RECRUITER_TABLE = process.env.RECRUITER_TABLE || 'recruiter_waitlist'
  const rows = await supabaseGet<RecruiterRecord[]>(`/rest/v1/${RECRUITER_TABLE}?select=id,name,x_handle,telegram_handle,wallet_address,status,focus,recruiter_code,created_at,approved_at&id=eq.${recruiterId}&limit=1`)
  return rows[0] || null
}

function summarizeSquad(rows: SquadRow[]) {
  return rows.reduce(
    (acc, row) => {
      acc.total += 1
      if (row.role === 'creator') acc.creators += 1
      else if (row.role === 'trader') acc.traders += 1
      else acc.unknown += 1
      return acc
    },
    { total: 0, creators: 0, traders: 0, unknown: 0 },
  )
}

function validateCode(value: string) {
  const code = normalizeCode(value)
  if (code.length < 4) return { code, error: 'Code must be at least 4 characters.' }
  if (code.length > 12) return { code, error: 'Code must be 12 characters or less.' }
  if (!/^[A-Z0-9]+$/.test(code)) return { code, error: 'Code must contain only letters and numbers.' }
  return { code, error: '' }
}

export const handler = async (event: any) => {
  const auth = readRecruiterAuth(event)
  if (!auth) return unauthorized('Connect your approved recruiter wallet to access the portal.')

  try {
    const recruiter = await getRecruiter(auth.recruiterId)
    if (!recruiter) return unauthorized('Recruiter session is no longer valid.')
    if (recruiter.status !== 'approved') return json(403, { error: 'Recruiter access is only available for approved applications right now.' })

    if (event.httpMethod === 'GET') {
      const recruiterCode = await ensureRecruiterCode(recruiter)
      const squadRows = await supabaseGet<SquadRow[]>(`/rest/v1/ref_wallets?select=wallet_address,recruiter_id,recruiter_code,role,source,bound_at&recruiter_id=eq.${recruiter.id}&order=bound_at.desc&limit=250`)
      return json(200, {
        ok: true,
        recruiter: {
          ...recruiter,
          recruiter_code: recruiterCode,
        },
        squad: {
          counts: summarizeSquad(squadRows),
          rows: squadRows,
        },
      })
    }

    if (event.httpMethod === 'POST') {
      const body = readBody<{ action?: string; code?: string }>(event)
      if (body?.action !== 'setCode') return json(400, { error: 'Unsupported action.' })
      const checked = validateCode(String(body.code || ''))
      if (checked.error) return json(400, { error: checked.error })

      const RECRUITER_TABLE = process.env.RECRUITER_TABLE || 'recruiter_waitlist'
      const existing = await supabaseGet<{ id: number }[]>(`/rest/v1/${RECRUITER_TABLE}?select=id&recruiter_code=ilike.${encodeURIComponent(checked.code)}&limit=1`)
      if (existing[0] && existing[0].id !== recruiter.id) {
        return json(409, { error: 'That code is already taken.' })
      }

      await supabasePatch(`/rest/v1/${RECRUITER_TABLE}?id=eq.${recruiter.id}`, { recruiter_code: checked.code })
      return json(200, { ok: true, recruiter_code: checked.code })
    }

    return json(405, { error: 'Method not allowed.' })
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Unexpected server error.' })
  }
}
