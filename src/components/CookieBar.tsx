import { useEffect, useState } from 'react'

export type ConsentState = 'accepted' | 'rejected' | null

const CONSENT_KEY = 'mwz_cookie_consent_v1'

export function readConsent(): ConsentState {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(CONSENT_KEY)
  return value === 'accepted' || value === 'rejected' ? value : null
}

export function CookieBar() {
  const [consent, setConsent] = useState<ConsentState>(null)

  useEffect(() => {
    setConsent(readConsent())
  }, [])

  const save = (value: Exclude<ConsentState, null>) => {
    window.localStorage.setItem(CONSENT_KEY, value)
    setConsent(value)
  }

  if (consent) return null

  return (
    <div className="cookie-bar" role="dialog" aria-live="polite" aria-label="Cookie preferences">
      <div className="cookie-bar__content">
        <div>
          <div className="cookie-bar__title">Cookies & similar storage</div>
          <div className="cookie-bar__text">
            We use essential storage to remember this banner, popup state, and recruiter form progress. Optional analytics stays
            off unless you accept it.
          </div>
        </div>

        <div className="cookie-bar__actions">
          <button type="button" className="cookie-bar__btn cookie-bar__btn--ghost" onClick={() => save('rejected')}>
            Only essential
          </button>
          <button type="button" className="cookie-bar__btn" onClick={() => save('accepted')}>
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}
