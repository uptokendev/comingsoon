import { createRecruiterAuthCookie, recruiterLoginMessage, verifyWalletSignature } from './_lib/auth'
import { json, normalizeAddress, readBody } from './_lib/http'
import { ensureRecruiterCode, findRecruiterByWallet } from './_lib/recruiters'
import { supabaseGet, supabasePatch } from './_lib/supabase'

type VerifyBody = {
  address?: string
  signature?: string
}

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' })
  const body = readBody<VerifyBody>(event)
  const address = normalizeAddress(body?.address || '')
  const signature = String(body?.signature || '').trim()
  if (!/^0x[a-f0-9]{40}$/.test(address)) return json(400, { error: 'Enter a valid wallet address.' })
  if (!signature) return json(400, { error: 'Missing signature.' })

  try {
    const nonceRows = await supabaseGet<{ id: number; nonce: string; expires_at: string; used_at: string | null }[]>(`/rest/v1/wallet_nonces?select=id,nonce,expires_at,used_at&address=ilike.${encodeURIComponent(address)}&purpose=eq.recruiter_login&limit=1`)
    const nonceRow = nonceRows[0]
    if (!nonceRow) return json(400, { error: 'No login challenge found. Request a new nonce.' })
    if (nonceRow.used_at) return json(400, { error: 'This login challenge was already used. Request a new nonce.' })
    if (new Date(nonceRow.expires_at).getTime() < Date.now()) return json(400, { error: 'This login challenge expired. Request a new nonce.' })

    const isValid = await verifyWalletSignature(recruiterLoginMessage(address, nonceRow.nonce), signature, address)
    if (!isValid) return json(401, { error: 'Signature verification failed.' })

    const recruiter = await findRecruiterByWallet(address)
    if (!recruiter) return json(404, { error: 'No recruiter application found for this wallet yet.' })
    if (recruiter.status !== 'approved') {
      return json(403, {
        error: recruiter.status === 'reviewing'
          ? 'Your recruiter application is still under review.'
          : recruiter.status === 'rejected'
            ? 'This recruiter application was rejected.'
            : 'Your recruiter application is not approved yet.',
        status: recruiter.status,
      })
    }

    const recruiterCode = await ensureRecruiterCode(recruiter)
    const RECRUITER_TABLE = process.env.RECRUITER_TABLE || 'recruiter_waitlist'

    await Promise.all([
      supabasePatch(`/rest/v1/wallet_nonces?id=eq.${nonceRow.id}`, { used_at: new Date().toISOString() }),
      supabasePatch(`/rest/v1/${RECRUITER_TABLE}?id=eq.${recruiter.id}`, { recruiter_last_login_at: new Date().toISOString() }),
    ])

    return json(200, {
      ok: true,
      recruiter: {
        id: recruiter.id,
        name: recruiter.name,
        x_handle: recruiter.x_handle,
        telegram_handle: recruiter.telegram_handle,
        wallet_address: recruiter.wallet_address,
        recruiter_code: recruiterCode,
        status: recruiter.status,
      },
    }, {
      'Set-Cookie': createRecruiterAuthCookie(event, { recruiterId: recruiter.id, address }),
    })
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Unexpected server error.' })
  }
}
