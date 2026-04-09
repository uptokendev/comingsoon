import { referralBindMessage, verifyWalletSignature } from './_lib/auth'
import { json, normalizeAddress, parseCookies, readBody } from './_lib/http'
import { supabaseGet, supabasePatch, supabasePost } from './_lib/supabase'

const REF_COOKIE = 'mb_ref_sid'

type BindBody = {
  address?: string
  signature?: string
  role?: string
}

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' })

  const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie)
  const sessionId = cookies[REF_COOKIE]
  if (!sessionId) return json(400, { error: 'No active referral session found.' })

  const body = readBody<BindBody>(event)
  const address = normalizeAddress(body?.address || '')
  const signature = String(body?.signature || '').trim()
  const role = body?.role === 'creator' || body?.role === 'trader' ? body.role : 'unknown'

  if (!/^0x[a-f0-9]{40}$/.test(address)) return json(400, { error: 'Enter a valid wallet address.' })
  if (!signature) return json(400, { error: 'Missing signature.' })

  try {
    const [sessions, nonceRows, existingBindings] = await Promise.all([
      supabaseGet<{ id: string; recruiter_id: number; recruiter_code: string; expires_at: string }[]>(`/rest/v1/ref_sessions?select=id,recruiter_id,recruiter_code,expires_at&id=eq.${encodeURIComponent(sessionId)}&limit=1`),
      supabaseGet<{ id: number; nonce: string; expires_at: string; used_at: string | null; ref_session_id: string | null }[]>(`/rest/v1/wallet_nonces?select=id,nonce,expires_at,used_at,ref_session_id&address=ilike.${encodeURIComponent(address)}&purpose=eq.ref_bind&limit=1`),
      supabaseGet<{ wallet_address: string; recruiter_id: number; recruiter_code: string; role: string; bound_at: string }[]>(`/rest/v1/ref_wallets?select=wallet_address,recruiter_id,recruiter_code,role,bound_at&wallet_address=ilike.${encodeURIComponent(address)}&limit=1`),
    ])

    const session = sessions[0]
    const nonceRow = nonceRows[0]
    const existing = existingBindings[0]

    if (!session || new Date(session.expires_at).getTime() < Date.now()) return json(400, { error: 'Referral session expired.' })
    if (existing) {
      return json(200, { ok: true, alreadyBound: true, binding: existing })
    }
    if (!nonceRow || nonceRow.ref_session_id !== sessionId) return json(400, { error: 'No bind challenge found. Request a new nonce.' })
    if (nonceRow.used_at) return json(400, { error: 'This bind challenge was already used. Request a new nonce.' })
    if (new Date(nonceRow.expires_at).getTime() < Date.now()) return json(400, { error: 'This bind challenge expired. Request a new nonce.' })

    const recruiters = await supabaseGet<{ id: number; wallet_address: string }[]>(`/rest/v1/recruiter_waitlist?select=id,wallet_address&id=eq.${session.recruiter_id}&limit=1`)
    const recruiter = recruiters[0]
    if (!recruiter) return json(400, { error: 'Recruiter record no longer exists.' })
    if (normalizeAddress(recruiter.wallet_address) === address) return json(400, { error: 'Self-referrals are not allowed.' })

    const isValid = await verifyWalletSignature(referralBindMessage(address, nonceRow.nonce, sessionId), signature, address)
    if (!isValid) return json(401, { error: 'Signature verification failed.' })

    await Promise.all([
      supabasePost('/rest/v1/ref_wallets', {
        wallet_address: address,
        recruiter_id: session.recruiter_id,
        recruiter_code: session.recruiter_code,
        role,
        source: 'session',
        session_id: sessionId,
        bound_at: new Date().toISOString(),
        signature_message: referralBindMessage(address, nonceRow.nonce, sessionId),
      }),
      supabasePatch(`/rest/v1/ref_sessions?id=eq.${encodeURIComponent(sessionId)}`, {
        bound_wallet_address: address,
        bound_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      }),
      supabasePatch(`/rest/v1/wallet_nonces?id=eq.${nonceRow.id}`, {
        used_at: new Date().toISOString(),
      }),
    ])

    return json(200, {
      ok: true,
      binding: {
        wallet_address: address,
        recruiter_id: session.recruiter_id,
        recruiter_code: session.recruiter_code,
        role,
        bound_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Unexpected server error.' })
  }
}
