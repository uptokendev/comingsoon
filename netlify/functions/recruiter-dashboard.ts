import { json, readBody } from './_lib/http'
import { getSupabaseConfig, supabaseGet, supabasePatch } from './_lib/supabase'

type RecruiterRow = {
  id: number
  created_at: string
  updated_at: string
  status: string
  source: string
  name: string
  x_handle: string
  telegram_handle: string
  wallet_address: string
  email: string
  country_region: string | null
  focus: string
  languages: string | null
  notes: string | null
  reviewed_at: string | null
  reviewer_notes: string | null
  recruiter_code?: string | null
  approved_at?: string | null
  approval_email_sent_at?: string | null
  approval_email_last_error?: string | null
  approval_email_last_attempt_at?: string | null
  approval_email_send_count?: number | null
  recruiter_last_login_at?: string | null
  squad?: {
    counts: {
      total: number
      creators: number
      traders: number
      unknown: number
    }
    members: SquadMember[]
  }
}

type SquadMember = {
  wallet_address: string
  recruiter_id: number
  role: string
  bound_at: string
}

type ReviewPayload = {
  id?: number | string
  status?: string
  reviewerNotes?: string | null
  resendApprovalEmail?: boolean
}

type PatchResult = {
  row: RecruiterRow
  message?: string
  emailSent?: boolean
  emailError?: string | null
}

const ALLOWED_STATUSES = new Set(['new', 'reviewing', 'approved', 'rejected'])
const SELECT_FIELDS =
  'id,created_at,updated_at,status,source,name,x_handle,telegram_handle,wallet_address,email,country_region,focus,languages,notes,reviewed_at,reviewer_notes,recruiter_code,approved_at,recruiter_last_login_at,approval_email_sent_at,approval_email_last_error,approval_email_last_attempt_at,approval_email_send_count'

function readToken(event: any) {
  return String(event.headers?.['x-dashboard-token'] || event.headers?.['x-recruiter-dashboard-token'] || event.queryStringParameters?.token || '').trim()
}

function getEmailConfig() {
  return {
    RESEND_API_KEY: process.env.RESEND_API_KEY || '',
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || '',
    RESEND_REPLY_TO: process.env.RESEND_REPLY_TO || '',
    APP_BASE_URL: process.env.APP_BASE_URL || process.env.VITE_APP_BASE_URL || 'https://memewar.zone',
  }
}

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeBaseUrl(value: string) {
  return String(value || 'https://memewar.zone').trim().replace(/\/$/, '')
}

function buildDashboardUrl(baseUrl: string) {
  return `${normalizeBaseUrl(baseUrl)}/recruiter/portal`
}

function buildApprovalEmail(row: RecruiterRow, dashboardUrl: string) {
  const safeName = escapeHtml(row.name || 'Recruiter')
  const safeDashboardUrl = escapeHtml(dashboardUrl)
  const safeWallet = escapeHtml(row.wallet_address)
  const safeCode = escapeHtml(row.recruiter_code || 'Generated after your first login')

  return {
    subject: 'MemeWarzone Recruiter access unlocked',
    text: [
      `Hi ${row.name || 'there'},`,
      '',
      'You are officially approved for the MemeWarzone Recruiter Program.',
      '',
      'Your dashboard is ready:',
      dashboardUrl,
      '',
      'What to do next:',
      '1. Open the recruiter dashboard.',
      '2. Connect the same approved wallet you used on your application.',
      '3. Sign the login message to unlock your recruiter portal.',
      '4. Copy your referral link and start building your squad.',
      '',
      `Approved wallet: ${row.wallet_address}`,
      `Recruiter code: ${row.recruiter_code || 'Generated automatically after first login'}`,
      '',
      'Inside the portal you can manage your code, track your squad, and share your progress publicly.',
      '',
      'Welcome to the Warzone.',
      'MemeWarzone',
    ].join('\n'),
    html: `
      <div style="background:#06090f;padding:32px 16px;font-family:Inter,Arial,sans-serif;color:#e5e7eb;">
        <div style="max-width:680px;margin:0 auto;background:linear-gradient(180deg,#0f1722 0%,#0a1018 100%);border:1px solid rgba(255,255,255,0.08);border-radius:22px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,0.45);">
          <div style="padding:30px 30px 18px;background:linear-gradient(135deg,rgba(34,197,94,0.16),rgba(17,24,39,0) 60%);border-bottom:1px solid rgba(255,255,255,0.06);">
            <div style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#86efac;font-weight:800;">MemeWarzone Recruiter Program</div>
            <h1 style="margin:14px 0 10px;font-size:34px;line-height:1.02;color:#ffffff;">Dashboard unlocked.</h1>
            <p style="margin:0;font-size:16px;line-height:1.75;color:#cbd5e1;max-width:560px;">Hi ${safeName}, your application is approved. You can now enter your recruiter portal, lock in your code, and start building your squad before launch.</p>
          </div>

          <div style="padding:28px 30px 30px;">
            <div style="margin-bottom:22px;">
              <a href="${safeDashboardUrl}" style="display:inline-block;background:#22c55e;color:#04110a;text-decoration:none;padding:14px 20px;border-radius:14px;font-weight:900;font-size:15px;letter-spacing:0.02em;">Open recruiter dashboard</a>
            </div>

            <div style="display:block;margin:0 0 20px;padding:18px 18px 16px;border:1px solid rgba(255,255,255,0.08);border-radius:16px;background:#0b1220;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:#94a3b8;font-weight:700;">Approved wallet</div>
              <div style="margin-top:8px;font-size:14px;line-height:1.65;color:#ffffff;word-break:break-all;">${safeWallet}</div>
              <div style="margin-top:14px;font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:#94a3b8;font-weight:700;">Recruiter code</div>
              <div style="margin-top:8px;font-size:14px;line-height:1.65;color:#ffffff;">${safeCode}</div>
            </div>

            <div style="margin:0 0 20px;padding:18px 18px 8px;border:1px solid rgba(255,255,255,0.08);border-radius:16px;background:#0f172a;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:#86efac;font-weight:800;">What to do next</div>
              <ol style="margin:14px 0 0;padding:0 0 0 18px;color:#dbe4ef;line-height:1.9;font-size:14px;">
                <li>Open your recruiter dashboard.</li>
                <li>Connect the exact wallet you used on your application.</li>
                <li>Sign the login message to unlock your portal.</li>
                <li>Copy your referral link, onboard creators and traders, and grow your squad.</li>
              </ol>
            </div>

            <div style="padding:18px;border:1px solid rgba(255,255,255,0.08);border-radius:16px;background:#111827;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:#94a3b8;font-weight:700;">Inside your portal</div>
              <p style="margin:10px 0 0;font-size:14px;line-height:1.8;color:#cbd5e1;">Track your squad size, manage your recruiter code, generate referral links, and share your progress publicly to flex your growth before launch.</p>
            </div>

            <p style="margin:24px 0 0;font-size:14px;line-height:1.8;color:#cbd5e1;">Welcome to the Warzone,<br />MemeWarzone</p>
          </div>
        </div>
      </div>
    `,
  }
}

async function sendApprovalEmail(row: RecruiterRow) {
  const config = getEmailConfig()
  if (!config.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured.')
  if (!config.RESEND_FROM_EMAIL) throw new Error('RESEND_FROM_EMAIL is not configured.')
  if (!row.email) throw new Error('This applicant does not have an email address.')

  const dashboardUrl = buildDashboardUrl(config.APP_BASE_URL)
  const email = buildApprovalEmail(row, dashboardUrl)
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: config.RESEND_FROM_EMAIL,
      to: [row.email],
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(config.RESEND_REPLY_TO ? { reply_to: [config.RESEND_REPLY_TO] } : {}),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || 'Resend rejected the email request.')
  }

  return response.json().catch(() => ({}))
}

async function getRowById(table: string, id: number) {
  const rows = await supabaseGet<RecruiterRow[]>(`/rest/v1/${table}?select=${encodeURIComponent(SELECT_FIELDS)}&id=eq.${id}&limit=1`)
  if (!rows[0]) throw new Error('Submission was not found.')
  return rows[0]
}

async function patchTable(table: string, id: number, body: Record<string, unknown>) {
  const rows = await supabasePatch(`/rest/v1/${table}?id=eq.${id}&select=${encodeURIComponent(SELECT_FIELDS)}`, body)
  const row = (rows as RecruiterRow[])[0]
  if (!row) throw new Error('Submission was not found.')
  return row
}

async function listRows(table: string) {
  return await supabaseGet<RecruiterRow[]>(`/rest/v1/${table}?select=${encodeURIComponent(SELECT_FIELDS)}&order=created_at.desc&limit=250`)
}

function buildEmptySquad() {
  return {
    counts: { total: 0, creators: 0, traders: 0, unknown: 0 },
    members: [] as SquadMember[],
  }
}

function summarizeSquad(members: SquadMember[]) {
  return members.reduce(
    (acc, member) => {
      acc.members.push(member)
      acc.counts.total += 1
      if (member.role === 'creator') acc.counts.creators += 1
      else if (member.role === 'trader') acc.counts.traders += 1
      else acc.counts.unknown += 1
      return acc
    },
    buildEmptySquad(),
  )
}

async function enrichRowsWithSquads(rows: RecruiterRow[]) {
  if (!rows.length) return rows.map((row) => ({ ...row, squad: buildEmptySquad() }))

  const recruiterIds = Array.from(new Set(rows.map((row) => Number(row.id)).filter((id) => Number.isInteger(id) && id > 0)))
  if (!recruiterIds.length) return rows.map((row) => ({ ...row, squad: buildEmptySquad() }))

  try {
    const squadRows = await supabaseGet<SquadMember[]>(`/rest/v1/ref_wallets?select=wallet_address,recruiter_id,role,bound_at&recruiter_id=in.${encodeURIComponent(`(${recruiterIds.join(',')})`)}&order=bound_at.desc&limit=1000`)
    const grouped = new Map<number, SquadMember[]>()

    for (const member of squadRows) {
      const recruiterId = Number(member.recruiter_id)
      if (!grouped.has(recruiterId)) grouped.set(recruiterId, [])
      grouped.get(recruiterId)!.push(member)
    }

    return rows.map((row) => ({
      ...row,
      squad: summarizeSquad(grouped.get(Number(row.id)) || []),
    }))
  } catch {
    return rows.map((row) => ({ ...row, squad: buildEmptySquad() }))
  }
}

async function patchRow(table: string, payload: ReviewPayload): Promise<PatchResult> {
  const id = Number(payload.id)
  if (!Number.isInteger(id) || id <= 0) throw new Error('A valid submission id is required.')

  const currentRow = await getRowById(table, id)
  const updateBody: Record<string, unknown> = {}
  let nextStatus = currentRow.status || 'new'

  if (payload.status !== undefined) {
    const status = String(payload.status || '').trim().toLowerCase()
    if (!ALLOWED_STATUSES.has(status)) throw new Error('Invalid status.')
    updateBody.status = status
    updateBody.reviewed_at = status === 'new' ? null : new Date().toISOString()
    nextStatus = status

    if (status === 'approved' && !currentRow.approved_at) {
      updateBody.approved_at = new Date().toISOString()
    }
  }

  if (payload.reviewerNotes !== undefined) {
    const notes = String(payload.reviewerNotes || '').trim()
    if (notes.length > 5000) throw new Error('Reviewer notes are too long.')
    updateBody.reviewer_notes = notes || null
    if (payload.status === undefined && !payload.resendApprovalEmail) {
      updateBody.reviewed_at = notes ? new Date().toISOString() : null
    }
  }

  if (Object.keys(updateBody).length === 0 && !payload.resendApprovalEmail) throw new Error('Nothing to update.')

  const forceResend = Boolean(payload.resendApprovalEmail)
  if (forceResend && nextStatus !== 'approved') {
    throw new Error('Only approved applications can receive a manual resend.')
  }

  let row = Object.keys(updateBody).length > 0 ? await patchTable(table, id, updateBody) : currentRow
  const shouldAttemptApprovalEmail = forceResend || (nextStatus === 'approved' && !currentRow.approval_email_sent_at)

  if (!shouldAttemptApprovalEmail) return { row }

  const attemptTimestamp = new Date().toISOString()

  try {
    await sendApprovalEmail(row)
    row = await patchTable(table, id, {
      approval_email_sent_at: attemptTimestamp,
      approval_email_last_attempt_at: attemptTimestamp,
      approval_email_last_error: null,
      approval_email_send_count: Math.max(Number(currentRow.approval_email_send_count || 0), Number(row.approval_email_send_count || 0), 0) + 1,
    })
    return {
      row,
      message: forceResend ? 'Approval email resent.' : 'Application approved and approval email sent.',
      emailSent: true,
      emailError: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Approval email failed to send.'
    row = await patchTable(table, id, {
      approval_email_last_attempt_at: attemptTimestamp,
      approval_email_last_error: message,
    })
    return {
      row,
      message: forceResend ? `Approval email resend failed: ${message}` : `Application approved, but the approval email failed: ${message}`,
      emailSent: false,
      emailError: message,
    }
  }
}

export const handler = async (event: any) => {
  if (!['GET', 'PATCH', 'POST'].includes(event.httpMethod)) {
    return json(405, { error: 'Method not allowed.' })
  }

  const { RECRUITER_TABLE } = getSupabaseConfig()
  const DASHBOARD_TOKEN = process.env.RECRUITER_DASHBOARD_TOKEN || process.env.DIAGNOSTICS_TOKEN || ''

  if (!DASHBOARD_TOKEN) {
    return json(500, { error: 'Dashboard token is not configured yet.' })
  }

  const token = readToken(event)
  if (!token || token !== DASHBOARD_TOKEN) {
    return json(401, { error: 'Unauthorized.' })
  }

  try {
    if (event.httpMethod === 'GET') {
      const rows = await listRows(RECRUITER_TABLE)
      const counts = rows.reduce(
        (acc, row) => {
          acc.total += 1
          const key = row.status || 'unknown'
          acc.byStatus[key] = (acc.byStatus[key] || 0) + 1
          return acc
        },
        { total: 0, byStatus: {} as Record<string, number> },
      )
      return json(200, { ok: true, counts, rows })
    }

    const result = await patchRow(RECRUITER_TABLE, readBody<ReviewPayload>(event) || {})
    return json(200, { ok: true, row: result.row, message: result.message, emailSent: result.emailSent, emailError: result.emailError })
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Unexpected server error.' })
  }
}
