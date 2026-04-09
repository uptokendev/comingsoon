import { buildCookie, getSecureCookieFlag, json, normalizeCode, parseCookies, readBody, sha256 } from './_lib/http'
import { findRecruiterByCode } from './_lib/recruiters'
import { supabasePost } from './_lib/supabase'

const REF_COOKIE = 'mb_ref_sid'
const REF_TTL_SECONDS = 60 * 60 * 24 * 30

type VisitBody = {
  code?: string
  landingPath?: string
}

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' })
  const body = readBody<VisitBody>(event)
  const code = normalizeCode(body?.code || '')
  if (code.length < 4) return json(400, { error: 'Invalid referral code.' })

  try {
    const recruiter = await findRecruiterByCode(code)
    if (!recruiter || recruiter.status !== 'approved') return json(404, { error: 'Referral code not found.' })

    const landingPath = String(body?.landingPath || '/').slice(0, 500)
    const ip = String(event.headers?.['x-forwarded-for'] || '').split(',')[0].trim()
    const ua = String(event.headers?.['user-agent'] || '')
    const expiresAt = new Date(Date.now() + REF_TTL_SECONDS * 1000).toISOString()

    const rows = await supabasePost('/rest/v1/ref_sessions', {
      recruiter_id: recruiter.id,
      recruiter_code: code,
      landing_path: landingPath,
      source: landingPath.startsWith('/r/') ? 'short-link' : 'query-param',
      expires_at: expiresAt,
      ip_hash: ip ? sha256(ip) : null,
      ua_hash: ua ? sha256(ua) : null,
    }) as Array<{ id: string }>

    const sessionId = rows[0]?.id
    if (!sessionId) return json(500, { error: 'Failed to create referral session.' })

    return json(200, {
      ok: true,
      code,
      sessionId,
      recruiter: {
        name: recruiter.name,
        recruiter_code: code,
      },
    }, {
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
