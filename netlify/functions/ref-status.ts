import { json, parseCookies } from './_lib/http'
import { supabaseGet } from './_lib/supabase'

const REF_COOKIE = 'mb_ref_sid'

type SessionRow = {
  id: string
  recruiter_code: string
  expires_at: string
  recruiter_id: number
}

type BindingRow = {
  wallet_address: string
  recruiter_id: number
  recruiter_code: string
  role: string
  bound_at: string
}

export const handler = async (event: any) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed.' })
  const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie)
  const sessionId = cookies[REF_COOKIE]
  if (!sessionId) return json(200, { ok: true, hasReferral: false })

  try {
    const sessions = await supabaseGet<SessionRow[]>(`/rest/v1/ref_sessions?select=id,recruiter_code,expires_at,recruiter_id&id=eq.${encodeURIComponent(sessionId)}&limit=1`)
    const session = sessions[0]
    if (!session || new Date(session.expires_at).getTime() < Date.now()) {
      return json(200, { ok: true, hasReferral: false })
    }

    const bindings = await supabaseGet<BindingRow[]>(`/rest/v1/ref_wallets?select=wallet_address,recruiter_id,recruiter_code,role,bound_at&session_id=eq.${encodeURIComponent(sessionId)}&limit=1`)
    const binding = bindings[0] || null

    return json(200, {
      ok: true,
      hasReferral: true,
      code: session.recruiter_code,
      isBound: Boolean(binding),
      binding,
    })
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Unexpected server error.' })
  }
}
