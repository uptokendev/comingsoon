type RecruiterPayload = {
  name?: string
  xHandle?: string
  telegramHandle?: string
  walletAddress?: string
  email?: string
  country?: string
  focus?: 'creators' | 'traders' | 'both'
  languages?: string
  notes?: string
  consent?: boolean
  website?: string
}

type JsonResponse = {
  statusCode: number
  headers: Record<string, string>
  body: string
}

const HANDLE_RE = /^[A-Za-z0-9_]{1,30}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WALLET_RE = /^0x[a-fA-F0-9]{40}$/

function json(statusCode: number, body: Record<string, unknown>): JsonResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  }
}

function normalizeHandle(value: string) {
  return value.replace(/^@+/, '').trim()
}

function parseBody(event: any): RecruiterPayload {
  if (!event.body) return {}
  try {
    return JSON.parse(event.body) as RecruiterPayload
  } catch {
    return {}
  }
}

function validate(body: RecruiterPayload) {
  const payload = {
    name: String(body.name || '').trim(),
    xHandle: normalizeHandle(String(body.xHandle || '')),
    telegramHandle: normalizeHandle(String(body.telegramHandle || '')),
    walletAddress: String(body.walletAddress || '').trim(),
    email: String(body.email || '').trim().toLowerCase(),
    country: String(body.country || '').trim(),
    focus: body.focus === 'creators' || body.focus === 'traders' || body.focus === 'both' ? body.focus : 'both',
    languages: String(body.languages || '').trim(),
    notes: String(body.notes || '').trim(),
    consent: body.consent === true,
    website: String(body.website || '').trim(),
  }

  if (payload.website) return { error: 'Spam detected.' }
  if (!payload.name) return { error: 'Name is required.' }
  if (!HANDLE_RE.test(payload.xHandle)) return { error: 'Valid X handle is required.' }
  if (!HANDLE_RE.test(payload.telegramHandle)) return { error: 'Valid Telegram handle is required.' }
  if (!WALLET_RE.test(payload.walletAddress)) return { error: 'Valid BNB wallet address is required.' }
  if (!EMAIL_RE.test(payload.email)) return { error: 'Valid email is required.' }
  if (!payload.consent) return { error: 'Consent is required.' }

  return { payload }
}

export const handler = async (event: any): Promise<JsonResponse> => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' })
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const RECRUITER_TABLE = process.env.RECRUITER_TABLE || 'recruiter_waitlist'

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: 'Server is not configured yet.' })
  }

  const checked = validate(parseBody(event))
  if ('error' in checked) {
    return json(400, { error: checked.error })
  }

  const payload = checked.payload

  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${RECRUITER_TABLE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        name: payload.name,
        x_handle: payload.xHandle,
        telegram_handle: payload.telegramHandle,
        wallet_address: payload.walletAddress,
        email: payload.email,
        country_region: payload.country || null,
        focus: payload.focus,
        languages: payload.languages || null,
        notes: payload.notes || null,
        consent_text: 'I agree that MemeWarzone may store this application, review it, and contact me about early recruiter onboarding.',
        source: 'coming-soon-popup',
        status: 'new',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      return json(500, { error: errorText || 'Database insert failed.' })
    }

    return json(200, { ok: true })
  } catch {
    return json(500, { error: 'Unexpected server error.' })
  }
}
