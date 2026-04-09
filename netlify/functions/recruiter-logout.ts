import { clearRecruiterAuthCookie } from './_lib/auth'
import { json } from './_lib/http'

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' })
  return json(200, { ok: true }, { 'Set-Cookie': clearRecruiterAuthCookie(event) })
}
