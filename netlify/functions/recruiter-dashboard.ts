import { json, readBody } from './_lib/http'
import { sendApprovalEmail } from './_lib/recruiter-approval'
import { supabaseDelete, supabaseGet, supabasePatch } from './_lib/supabase'

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
const BASE_SELECT_FIELDS =
  'id,created_at,updated_at,status,source,name,x_handle,telegram_handle,wallet_address,email,country_region,focus,languages,notes,reviewed_at,reviewer_notes'
const OPTIONAL_SELECT_FIELDS = [
  'recruiter_code',
  'approved_at',
  'recruiter_last_login_at',
  'approval_email_sent_at',
  'approval_email_last_error',
  'approval_email_last_attempt_at',
  'approval_email_send_count',
] as const

function readToken(event: any) {
  return String(event.headers?.['x-dashboard-token'] || event.headers?.['x-recruiter-dashboard-token'] || event.queryStringParameters?.token || '').trim()
}

function buildSelectFields(optionalFields: readonly string[] = OPTIONAL_SELECT_FIELDS) {
  return [BASE_SELECT_FIELDS, ...optionalFields].join(',')
}

function parseMissingColumn(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || '')
  let combined = raw

  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      combined = [parsed.message, parsed.details, parsed.hint, raw].filter(Boolean).join(' ')
    }
  } catch {}

  const patterns = [
    /column[\s"']+([a-zA-Z0-9_]+)[\s"']+does not exist/i,
    /Could not find the ['\"]?([a-zA-Z0-9_]+)['\"]? column/i,
  ]

  for (const pattern of patterns) {
    const match = combined.match(pattern)
    if (match?.[1]) return match[1]
  }

  return ''
}

function normalizeRecruiterRow(row: RecruiterRow) {
  return {
    ...row,
    recruiter_code: row.recruiter_code ?? null,
    approved_at: row.approved_at ?? null,
    recruiter_last_login_at: row.recruiter_last_login_at ?? null,
    approval_email_sent_at: row.approval_email_sent_at ?? null,
    approval_email_last_error: row.approval_email_last_error ?? null,
    approval_email_last_attempt_at: row.approval_email_last_attempt_at ?? null,
    approval_email_send_count: row.approval_email_send_count ?? 0,
  }
}

async function supabaseGetRowsWithFallback(pathFactory: (selectFields: string) => string) {
  const optionalFields = [...OPTIONAL_SELECT_FIELDS]

  while (true) {
    try {
      return await supabaseGet<RecruiterRow[]>(pathFactory(buildSelectFields(optionalFields)))
    } catch (error) {
      const missingColumn = parseMissingColumn(error)
      if (missingColumn && optionalFields.includes(missingColumn as (typeof OPTIONAL_SELECT_FIELDS)[number])) {
        const next = optionalFields.filter((field) => field !== missingColumn)
        optionalFields.splice(0, optionalFields.length, ...next)
        continue
      }
      throw error
    }
  }
}

async function getRowById(table: string, id: number) {
  const rows = await supabaseGetRowsWithFallback((selectFields) => `/rest/v1/${table}?select=${encodeURIComponent(selectFields)}&id=eq.${id}&limit=1`)
  if (!rows[0]) throw new Error('Submission was not found.')
  return normalizeRecruiterRow(rows[0])
}

async function patchTable(table: string, id: number, body: Record<string, unknown>) {
  const optionalFields = [...OPTIONAL_SELECT_FIELDS]

  while (true) {
    try {
      const rows = await supabasePatch(`/rest/v1/${table}?id=eq.${id}&select=${encodeURIComponent(buildSelectFields(optionalFields))}`, body)
      const row = (rows as RecruiterRow[])[0]
      if (!row) throw new Error('Submission was not found.')
      return normalizeRecruiterRow(row)
    } catch (error) {
      const missingColumn = parseMissingColumn(error)
      if (missingColumn && optionalFields.includes(missingColumn as (typeof OPTIONAL_SELECT_FIELDS)[number])) {
        const next = optionalFields.filter((field) => field !== missingColumn)
        optionalFields.splice(0, optionalFields.length, ...next)
        continue
      }
      throw error
    }
  }
}

async function listRows(table: string) {
  const rows = await supabaseGetRowsWithFallback((selectFields) => `/rest/v1/${table}?select=${encodeURIComponent(selectFields)}&order=created_at.desc&limit=250`)
  return rows.map(normalizeRecruiterRow)
}

async function deleteRow(table: string, id: number) {
  await supabaseDelete(`/rest/v1/${table}?id=eq.${id}`)
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
  if (!['GET', 'PATCH', 'POST', 'DELETE'].includes(event.httpMethod)) {
    return json(405, { error: 'Method not allowed.' })
  }

  const RECRUITER_TABLE = process.env.RECRUITER_TABLE || 'recruiter_waitlist'
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
      const rows = await enrichRowsWithSquads(await listRows(RECRUITER_TABLE))
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

    if (event.httpMethod === 'DELETE') {
      const payload = readBody<ReviewPayload>(event) || {}
      const id = Number(payload.id)
      if (!Number.isInteger(id) || id <= 0) {
        throw new Error('A valid submission id is required.')
      }

      const row = await getRowById(RECRUITER_TABLE, id)
      await deleteRow(RECRUITER_TABLE, id)
      return json(200, { ok: true, deletedId: id, message: `Recruiter ${row.name} deleted.` })
    }

    const result = await patchRow(RECRUITER_TABLE, readBody<ReviewPayload>(event) || {})
    return json(200, { ok: true, row: result.row, message: result.message, emailSent: result.emailSent, emailError: result.emailError })
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Unexpected server error.' })
  }
}
