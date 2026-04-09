import { randomBytes } from 'node:crypto'
import { json, normalizeAddress, parseCookies } from './_lib/http'
import { supabaseGet, supabasePatch, supabasePost } from './_lib/supabase'

const REF_COOKIE = 'mb_ref_sid'

export const handler = async (event: any) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed.' })
  const address = normalizeAddress(String(event.queryStringParameters?.address || ''))
  if (!/^0x[a-f0-9]{40}$/.test(address)) return json(400, { error: 'Enter a valid wallet address.' })

  const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie)
  const sessionId = cookies[REF_COOKIE]
  if (!sessionId) return json(400, { error: 'No active referral session found.' })

  try {
    const sessions = await supabaseGet<{ id: string; recruiter_id: number; recruiter_code: string; expires_at: string }[]>(`/rest/v1/ref_sessions?select=id,recruiter_id,recruiter_code,expires_at&id=eq.${encodeURIComponent(sessionId)}&limit=1`)
    const session = sessions[0]
    if (!session || new Date(session.expires_at).getTime() < Date.now()) return json(400, { error: 'Referral session expired.' })

    const nonce = randomBytes(16).toString('hex')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const existing = await supabaseGet<{ id: number }[]>(`/rest/v1/wallet_nonces?select=id&address=ilike.${encodeURIComponent(address)}&purpose=eq.ref_bind&limit=1`)

    if (existing[0]?.id) {
      await supabasePatch(`/rest/v1/wallet_nonces?id=eq.${existing[0].id}`, {
        nonce,
        expires_at: expiresAt,
        used_at: null,
        ref_session_id: session.id,
      })
    } else {
      await supabasePost('/rest/v1/wallet_nonces', {
        address,
        purpose: 'ref_bind',
        nonce,
        expires_at: expiresAt,
        ref_session_id: session.id,
      })
    }

    return json(200, {
      ok: true,
      nonce,
      sid: session.id,
      message: `MemeWarzone referral bind\naddress: ${address}\nnonce: ${nonce}\nsid: ${session.id}`,
      code: session.recruiter_code,
    })
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Unexpected server error.' })
  }
}
