import { randomBytes } from 'node:crypto'
import { normalizeCode } from './http'
import { getSupabaseConfig, supabaseGet, supabasePatch } from './supabase'

export type RecruiterRecord = {
  id: number
  name: string
  x_handle: string
  telegram_handle: string
  wallet_address: string
  status: string
  recruiter_code: string | null
  focus?: string | null
  created_at?: string
  approved_at?: string | null
}

export function makeRecruiterCodeSeed(record: Pick<RecruiterRecord, 'name' | 'x_handle'>) {
  const preferred = normalizeCode(String(record.x_handle || '').replace(/^@+/, ''))
  if (preferred.length >= 4) return preferred
  const fallback = normalizeCode(String(record.name || 'RECRUITER'))
  if (fallback.length >= 4) return fallback
  return 'RECR' + randomBytes(2).toString('hex').toUpperCase().slice(0, 4)
}

export async function findRecruiterByWallet(address: string) {
  const { RECRUITER_TABLE } = getSupabaseConfig()
  const rows = await supabaseGet<RecruiterRecord[]>(`/rest/v1/${RECRUITER_TABLE}?select=id,name,x_handle,telegram_handle,wallet_address,status,recruiter_code,focus,created_at,approved_at&wallet_address=ilike.${encodeURIComponent(address)}&limit=1`)
  return rows[0] || null
}

export async function findRecruiterByCode(code: string) {
  const { RECRUITER_TABLE } = getSupabaseConfig()
  const rows = await supabaseGet<RecruiterRecord[]>(`/rest/v1/${RECRUITER_TABLE}?select=id,name,x_handle,telegram_handle,wallet_address,status,recruiter_code,focus,created_at,approved_at&recruiter_code=ilike.${encodeURIComponent(code)}&limit=1`)
  return rows[0] || null
}

export async function ensureRecruiterCode(record: RecruiterRecord) {
  if (record.recruiter_code) return normalizeCode(record.recruiter_code)

  const { RECRUITER_TABLE } = getSupabaseConfig()
  const seed = makeRecruiterCodeSeed(record)
  const candidates = [seed]
  for (let i = 0; i < 10; i += 1) {
    const suffix = String(10 + i)
    candidates.push(`${seed.slice(0, Math.max(4, 12 - suffix.length))}${suffix}`.slice(0, 12))
  }
  candidates.push(`R${randomBytes(3).toString('hex').toUpperCase().slice(0, 7)}`)

  for (const candidate of candidates) {
    const existing = await findRecruiterByCode(candidate)
    if (!existing || existing.id === record.id) {
      await supabasePatch(`/rest/v1/${RECRUITER_TABLE}?id=eq.${record.id}`, {
        recruiter_code: candidate,
        approved_at: record.approved_at || new Date().toISOString(),
      })
      return candidate
    }
  }

  throw new Error('Unable to generate a unique recruiter code.')
}
