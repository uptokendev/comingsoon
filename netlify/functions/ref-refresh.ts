import { json, normalizeCode, readBody } from './_lib/http'
import { findRecruiterByCode } from './_lib/recruiters'
import { supabasePost } from './_lib/supabase'
import { buildCookie, getSecureCookieFlag } from './_lib/http'

const REF_COOKIE = 'mb_ref_sid'
const REF_TTL_SECONDS = 60 * 60 * 24 * 30

type RefreshBody = {
  code?: string
}

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' })
  const body = readBody<RefreshBody>(event)
  const code = normalizeCode(body?.code || '')
  if (code.length < 4) return json(400, { error: 'Invalid referral code.' })

  try {
    const recruiter = await findRecruiterByCode(code)
    if (!recruiter || recruiter.status !== 'approved') return json(404, { error: 'Referral code not found.' })

    const rows = await supabasePost('/rest/v1/ref_sessions', {
      recruiter_id: recruiter.id,
      recruiter_code: code,
      landing_path: '/',
      source: 'refresh',
      expires_at: new Date(Date.now() + REF_TTL_SECONDS * 1000).toISOString(),
    }) as Array<{ id: string }>

    const sessionId = rows[0]?.id
    if (!sessionId) return json(500, { error: 'Failed to refresh referral session.' })

    return json(200, { ok: true, code, sessionId }, {
      'Set-Cookie': buildCookie(REF_COOKIE, sessionId, {
        maxAge: REF_TTL_SECONDS,
        httpOnly: true,
        secure: getSecureCookieFlag(event),
        sameSite: 'Lax',
        path: '/',
      }),
    })
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Unexpected server error.' })
  }
}
