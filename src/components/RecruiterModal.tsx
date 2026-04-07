import { useEffect, useMemo, useState } from 'react'

const DISMISSED_KEY = 'mwz_recruiter_modal_dismissed_until_v1'
const SUBMITTED_KEY = 'mwz_recruiter_modal_submitted_v1'
const FORM_DRAFT_KEY = 'mwz_recruiter_form_draft_v1'
const AUTO_OPEN_DELAY_MS = 800
const DISMISS_FOR_DAYS = 7

export type RecruiterModalProps = {
  forcedOpen: boolean
  onCloseForced: () => void
}

type RecruiterFormState = {
  name: string
  xHandle: string
  telegramHandle: string
  walletAddress: string
  email: string
  country: string
  focus: 'creators' | 'traders' | 'both'
  languages: string
  notes: string
  consent: boolean
  website: string
}

const INITIAL_FORM: RecruiterFormState = {
  name: '',
  xHandle: '',
  telegramHandle: '',
  walletAddress: '',
  email: '',
  country: '',
  focus: 'both',
  languages: '',
  notes: '',
  consent: false,
  website: '',
}

function sanitizeHandle(value: string) {
  return value.replace(/^@+/, '').trim()
}

function loadDraft(): RecruiterFormState {
  if (typeof window === 'undefined') return INITIAL_FORM

  try {
    const raw = window.localStorage.getItem(FORM_DRAFT_KEY)
    if (!raw) return INITIAL_FORM
    const parsed = JSON.parse(raw) as Partial<RecruiterFormState>
    return {
      ...INITIAL_FORM,
      ...parsed,
      website: '',
      consent: Boolean(parsed.consent),
    }
  } catch {
    return INITIAL_FORM
  }
}

function shouldAutoOpen() {
  if (typeof window === 'undefined') return false
  if (window.localStorage.getItem(SUBMITTED_KEY) === '1') return false

  const dismissedUntil = Number(window.localStorage.getItem(DISMISSED_KEY) || '0')
  return !dismissedUntil || Date.now() > dismissedUntil
}

function saveDismissed() {
  const until = Date.now() + DISMISS_FOR_DAYS * 24 * 60 * 60 * 1000
  window.localStorage.setItem(DISMISSED_KEY, String(until))
}

function saveDraft(form: RecruiterFormState) {
  const { website, ...safeForm } = form
  window.localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(safeForm))
}

function normalizePayload(form: RecruiterFormState) {
  return {
    name: form.name.trim(),
    xHandle: sanitizeHandle(form.xHandle),
    telegramHandle: sanitizeHandle(form.telegramHandle),
    walletAddress: form.walletAddress.trim(),
    email: form.email.trim().toLowerCase(),
    country: form.country.trim(),
    focus: form.focus,
    languages: form.languages.trim(),
    notes: form.notes.trim(),
    consent: form.consent,
    website: form.website.trim(),
  }
}

function validateForm(form: ReturnType<typeof normalizePayload>) {
  if (!form.name) return 'Please enter your name.'
  if (!form.xHandle) return 'Please enter your X handle.'
  if (!form.telegramHandle) return 'Please enter your Telegram handle.'
  if (!/^0x[a-fA-F0-9]{40}$/.test(form.walletAddress)) return 'Please enter a valid BNB wallet address.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email address.'
  if (!form.consent) return 'Please confirm that we may review and contact you about recruiter onboarding.'
  return ''
}

export function RecruiterModal({ forcedOpen, onCloseForced }: RecruiterModalProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<RecruiterFormState>(() => loadDraft())
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (shouldAutoOpen()) setOpen(true)
    }, AUTO_OPEN_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (forcedOpen) {
      setOpen(true)
      setSuccess('')
      setError('')
    }
  }, [forcedOpen])

  useEffect(() => {
    saveDraft(form)
  }, [form])

  const payload = useMemo(() => normalizePayload(form), [form])

  const close = () => {
    setOpen(false)
    setError('')
    if (forcedOpen) onCloseForced()
    else saveDismissed()
  }

  const onChange = <K extends keyof RecruiterFormState>(key: K, value: RecruiterFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const validationError = validateForm(payload)
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/recruiter-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = (await response.json().catch(() => ({}))) as { error?: string; ok?: boolean }

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Submission failed. Please try again.')
      }

      window.localStorage.setItem(SUBMITTED_KEY, '1')
      window.localStorage.removeItem(DISMISSED_KEY)
      window.localStorage.removeItem(FORM_DRAFT_KEY)
      setSuccess('Application received. We will contact selected recruiters first as onboarding opens.')
      setForm(INITIAL_FORM)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submission failed. Please try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="recruiter-modal-title">
      <div className="modal__backdrop" onClick={close} aria-hidden="true" />
      <div className="modal__panel">
        <button type="button" className="modal__close" aria-label="Close recruiter form" onClick={close}>
          ×
        </button>

        <div className="modal__eyebrow">Early onboarding</div>
        <h2 className="modal__title" id="recruiter-modal-title">
          Become an early Recruiter
        </h2>
        <p className="modal__text">
          Bring creators. Bring traders. Build your squad early and get priority access when the Recruiter Program opens.
        </p>

        <div className="modal__chips">
          <span className="modal__chip">Low-friction intake</span>
          <span className="modal__chip">BNB wallet ready</span>
          <span className="modal__chip">Early-access shortlist</span>
        </div>

        <form className="recruiter-form" onSubmit={onSubmit}>
          <div className="recruiter-form__grid">
            <label className="field">
              <span className="field__label">Name</span>
              <input value={form.name} onChange={(e) => onChange('name', e.target.value)} placeholder="Your name" autoComplete="name" />
            </label>

            <label className="field">
              <span className="field__label">Email</span>
              <input value={form.email} onChange={(e) => onChange('email', e.target.value)} placeholder="you@example.com" autoComplete="email" />
            </label>

            <label className="field">
              <span className="field__label">X handle</span>
              <input value={form.xHandle} onChange={(e) => onChange('xHandle', e.target.value)} placeholder="@yourhandle" />
            </label>

            <label className="field">
              <span className="field__label">Telegram handle</span>
              <input value={form.telegramHandle} onChange={(e) => onChange('telegramHandle', e.target.value)} placeholder="@yourtelegram" />
            </label>

            <label className="field field--full">
              <span className="field__label">Main BNB wallet address</span>
              <input
                value={form.walletAddress}
                onChange={(e) => onChange('walletAddress', e.target.value)}
                placeholder="0x..."
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>

            <label className="field">
              <span className="field__label">Focus</span>
              <select value={form.focus} onChange={(e) => onChange('focus', e.target.value as RecruiterFormState['focus'])}>
                <option value="both">Creators + traders</option>
                <option value="creators">Mostly creators</option>
                <option value="traders">Mostly traders</option>
              </select>
            </label>

            <label className="field">
              <span className="field__label">Country / region</span>
              <input value={form.country} onChange={(e) => onChange('country', e.target.value)} placeholder="Optional" autoComplete="country-name" />
            </label>

            <label className="field">
              <span className="field__label">Languages</span>
              <input value={form.languages} onChange={(e) => onChange('languages', e.target.value)} placeholder="Optional" />
            </label>

            <label className="field field--full">
              <span className="field__label">Short note</span>
              <textarea
                value={form.notes}
                onChange={(e) => onChange('notes', e.target.value)}
                placeholder="Optional — tell us briefly how you recruit or what kind of network you bring."
                rows={4}
              />
            </label>

            <label className="field field--hp" aria-hidden="true">
              <span className="field__label">Website</span>
              <input tabIndex={-1} value={form.website} onChange={(e) => onChange('website', e.target.value)} autoComplete="off" />
            </label>
          </div>

          <label className="consent">
            <input type="checkbox" checked={form.consent} onChange={(e) => onChange('consent', e.target.checked)} />
            <span>
              I agree that MemeWarzone may store this application, review it, and contact me about early recruiter onboarding.
            </span>
          </label>

          {error ? <div className="form-message form-message--error">{error}</div> : null}
          {success ? <div className="form-message form-message--success">{success}</div> : null}

          <div className="recruiter-form__footer">
            <div className="recruiter-form__meta">Required: name, X, Telegram, BNB wallet, email.</div>
            <button type="submit" className="recruiter-form__submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Apply now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
