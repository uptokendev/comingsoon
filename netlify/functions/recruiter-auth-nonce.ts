import { randomBytes } from 'node:crypto'
import { json, normalizeAddress } from './_lib/http'
import { supabaseGet, supabasePatch, supabasePost } from './_lib/supabase'

export const handler = async (event: any) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed.' })

  const address = normalizeAddress(String(event.queryStringParameters?.address || ''))
  if (!/^0x[a-f0-9]{40}$/.test(address)) return json(400, { error: 'Enter a valid wallet address.' })

  const nonce = randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  try {
    const existing = await supabaseGet<{ id: number }[]>(`/rest/v1/wallet_nonces?select=id&address=ilike.${encodeURIComponent(address)}&purpose=eq.recruiter_login&limit=1`)
    if (existing[0]?.id) {
      await supabasePatch(`/rest/v1/wallet_nonces?id=eq.${existing[0].id}`, {
        nonce,
        expires_at: expiresAt,
        used_at: null,
        ref_session_id: null,
      })
    } else {
      await supabasePost('/rest/v1/wallet_nonces', {
        address,
        purpose: 'recruiter_login',
        nonce,
        expires_at: expiresAt,
      })
    }

    return json(200, { ok: true, nonce, message: `MemeWarzone recruiter login\naddress: ${address}\nnonce: ${nonce}` })
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Unexpected server error.' })
  }
}
