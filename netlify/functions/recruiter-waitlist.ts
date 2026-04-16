import { sendApprovalEmail, type ApprovalEmailRecipient } from './_lib/recruiter-approval'
import { supabasePatch, supabasePost } from './_lib/supabase'

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

type RecruiterRow = ApprovalEmailRecipient & {
  id: number
  approval_email_send_count?: number | null
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

  const RECRUITER_TABLE = process.env.RECRUITER_TABLE || 'recruiter_waitlist'

  const checked = validate(parseBody(event))
  if ('error' in checked) {
    return json(400, { error: checked.error })
  }

  const payload = checked.payload

  try {
    const approvedAt = new Date().toISOString()
    const rows = (await supabasePost(`/rest/v1/${RECRUITER_TABLE}`, {
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
        status: 'approved',
        approved_at: approvedAt,
        reviewed_at: approvedAt,
      })) as RecruiterRow[]

    const row = rows[0]
    if (!row) {
      throw new Error('Recruiter submission could not be created.')
    }

    const attemptTimestamp = new Date().toISOString()
    let emailSent = false
    let emailError: string | null = null

    try {
      await sendApprovalEmail(row)
      emailSent = true

      try {
        await supabasePatch(`/rest/v1/${RECRUITER_TABLE}?id=eq.${row.id}`, {
          approval_email_sent_at: attemptTimestamp,
          approval_email_last_attempt_at: attemptTimestamp,
          approval_email_last_error: null,
          approval_email_send_count: Math.max(Number(row.approval_email_send_count || 0), 0) + 1,
        })
      } catch {}
    } catch (error) {
      emailError = error instanceof Error ? error.message : 'Approval email failed to send.'

      try {
        await supabasePatch(`/rest/v1/${RECRUITER_TABLE}?id=eq.${row.id}`, {
          approval_email_last_attempt_at: attemptTimestamp,
          approval_email_last_error: emailError,
        })
      } catch {}
    }

    return json(200, { ok: true, emailSent, emailError })
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Unexpected server error.' })
  }
}
