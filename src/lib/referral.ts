export const REF_STORAGE_KEY = 'mwz_ref_code_v1'
export const REF_EXP_KEY = 'mwz_ref_exp_v1'
const REF_TTL_MS = 30 * 24 * 60 * 60 * 1000

export type ReferralStatus = {
  hasReferral: boolean
  code?: string
  isBound?: boolean
  binding?: {
    wallet_address: string
    recruiter_code: string
    role: string
    bound_at: string
  } | null
}

export function normalizeCode(input: string) {
  return String(input || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
}

export function saveReferralCode(code: string) {
  const normalized = normalizeCode(code)
  if (!normalized) return
  window.localStorage.setItem(REF_STORAGE_KEY, normalized)
  window.localStorage.setItem(REF_EXP_KEY, String(Date.now() + REF_TTL_MS))
}

export function clearReferralCode() {
  window.localStorage.removeItem(REF_STORAGE_KEY)
  window.localStorage.removeItem(REF_EXP_KEY)
}

export function getStoredReferralCode() {
  const code = normalizeCode(window.localStorage.getItem(REF_STORAGE_KEY) || '')
  const exp = Number(window.localStorage.getItem(REF_EXP_KEY) || '0')
  if (!code || !exp || exp < Date.now()) {
    clearReferralCode()
    return ''
  }
  return code
}

export async function captureReferralVisit(code: string, landingPath: string) {
  const normalized = normalizeCode(code)
  if (!normalized) return { ok: false as const }
  const response = await fetch('/api/ref-visit', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: normalized, landingPath }),
  })
  const data = await response.json().catch(() => ({}))
  if (response.ok && data?.ok) {
    saveReferralCode(normalized)
    return { ok: true as const, data }
  }
  return { ok: false as const, error: data?.error || 'Failed to capture referral.' }
}

export async function refreshReferral(code: string) {
  const normalized = normalizeCode(code)
  if (!normalized) return { ok: false as const }
  const response = await fetch('/api/ref-refresh', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: normalized }),
  })
  const data = await response.json().catch(() => ({}))
  if (response.ok && data?.ok) {
    saveReferralCode(normalized)
    return { ok: true as const, data }
  }
  return { ok: false as const, error: data?.error || 'Failed to refresh referral.' }
}

export async function fetchReferralStatus(): Promise<ReferralStatus> {
  const response = await fetch('/api/ref-status', {
    credentials: 'same-origin',
    cache: 'no-store',
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error || 'Failed to load referral status.')
  return {
    hasReferral: Boolean(data?.hasReferral),
    code: data?.code,
    isBound: Boolean(data?.isBound),
    binding: data?.binding || null,
  }
}
