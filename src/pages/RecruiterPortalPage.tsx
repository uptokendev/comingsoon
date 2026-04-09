import { useEffect, useMemo, useState } from 'react'
import { connectWallet } from '../lib/wallet'

const BASE_URL = (import.meta.env.VITE_APP_BASE_URL as string) || (typeof window !== 'undefined' ? window.location.origin : 'https://memewar.zone')

type Recruiter = {
  id: number
  name: string
  x_handle: string
  telegram_handle: string
  wallet_address: string
  status: string
  focus: string | null
  recruiter_code: string
  approved_at?: string | null
}

type SquadRow = {
  wallet_address: string
  recruiter_id: number
  recruiter_code: string
  role: string
  source: string
  bound_at: string
}

type PortalData = {
  recruiter: Recruiter
  squad: {
    counts: {
      total: number
      creators: number
      traders: number
      unknown: number
    }
    rows: SquadRow[]
  }
}

function shorten(value: string) {
  return value ? `${value.slice(0, 6)}...${value.slice(-4)}` : ''
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function RecruiterPortalPage() {
  const [loading, setLoading] = useState(true)
  const [authing, setAuthing] = useState(false)
  const [savingCode, setSavingCode] = useState(false)
  const [error, setError] = useState('')
  const [portal, setPortal] = useState<PortalData | null>(null)
  const [preferredCode, setPreferredCode] = useState('')
  const [copied, setCopied] = useState('')

  const loadPortal = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/recruiter-portal', {
        credentials: 'same-origin',
        cache: 'no-store',
      })
      const data = await response.json().catch(() => ({}))
      if (response.status === 401) {
        setPortal(null)
        return
      }
      if (!response.ok || !data?.ok) throw new Error(data?.error || 'Failed to load recruiter portal.')
      setPortal(data)
      setPreferredCode(data.recruiter.recruiter_code || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recruiter portal.')
      setPortal(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPortal()
  }, [])

  const signIn = async () => {
    setAuthing(true)
    setError('')
    try {
      const { signer, address } = await connectWallet()
      const nonceResponse = await fetch(`/api/recruiter-auth-nonce?address=${encodeURIComponent(address)}`, {
        credentials: 'same-origin',
      })
      const nonceData = await nonceResponse.json().catch(() => ({}))
      if (!nonceResponse.ok || !nonceData?.nonce || !nonceData?.message) {
        throw new Error(nonceData?.error || 'Failed to request recruiter login challenge.')
      }

      const signature = await signer.signMessage(nonceData.message)
      const verifyResponse = await fetch('/api/recruiter-auth-verify', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature }),
      })
      const verifyData = await verifyResponse.json().catch(() => ({}))
      if (!verifyResponse.ok || !verifyData?.ok) {
        throw new Error(verifyData?.error || 'Wallet sign-in failed.')
      }
      await loadPortal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wallet sign-in failed.')
    } finally {
      setAuthing(false)
    }
  }

  const logout = async () => {
    await fetch('/api/recruiter-logout', {
      method: 'POST',
      credentials: 'same-origin',
    }).catch(() => undefined)
    setPortal(null)
    setPreferredCode('')
  }

  const saveCode = async () => {
    if (!portal) return
    setSavingCode(true)
    setError('')
    try {
      const response = await fetch('/api/recruiter-portal', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setCode', code: preferredCode }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) throw new Error(data?.error || 'Failed to update recruiter code.')
      setPreferredCode(data.recruiter_code)
      await loadPortal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update recruiter code.')
    } finally {
      setSavingCode(false)
    }
  }

  const canonicalLink = portal ? `${BASE_URL.replace(/\/$/, '')}/r/${portal.recruiter.recruiter_code}` : ''
  const queryLink = portal ? `${BASE_URL.replace(/\/$/, '')}/?ref=${portal.recruiter.recruiter_code}` : ''

  const shareText = useMemo(() => {
    if (!portal) return ''
    return `I’m building my MemeWarzone squad early. ${portal.squad.counts.total} creators and traders already locked in. Join with my code ${portal.recruiter.recruiter_code}: ${canonicalLink}`
  }, [portal, canonicalLink])

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      window.setTimeout(() => setCopied(''), 1300)
    } catch {
      setCopied('')
    }
  }

  const shareToX = () => {
    if (!shareText) return
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const nativeShare = async () => {
    if (!shareText) return
    if (navigator.share) {
      await navigator.share({
        title: 'My MemeWarzone squad',
        text: shareText,
        url: canonicalLink,
      })
      return
    }
    shareToX()
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <div className="dashboard-head">
          <div>
            <div className="dashboard-kicker">Recruiter portal</div>
            <h1 className="dashboard-title">Build your squad early</h1>
            <p className="dashboard-subtitle">Approved Recruiters can sign in with their main wallet, lock in a custom code, and track everyone who binds into their squad.</p>
          </div>
          <a className="dashboard-back" href="/">
            ← Back to coming soon
          </a>
        </div>

        {loading ? <div className="dashboard-empty">Loading recruiter portal...</div> : null}

        {!loading && !portal ? (
          <div className="dashboard-token-card">
            <div className="dashboard-token-copy">
              <div className="dashboard-token-title">Wallet sign-in</div>
              <div className="dashboard-token-text">Connect the same BNB wallet address that was approved on your recruiter application.</div>
            </div>
            <div className="dashboard-token-form">
              <button className="dashboard-btn" type="button" onClick={() => void signIn()} disabled={authing}>
                {authing ? 'Waiting for signature...' : 'Connect wallet'}
              </button>
            </div>
            {error ? <div className="dashboard-error">{error}</div> : null}
          </div>
        ) : null}

        {portal ? (
          <>
            <div className="dashboard-stats">
              <div className="dashboard-stat">
                <div className="dashboard-stat__label">Squad size</div>
                <div className="dashboard-stat__value">{portal.squad.counts.total}</div>
              </div>
              <div className="dashboard-stat">
                <div className="dashboard-stat__label">Creators</div>
                <div className="dashboard-stat__value">{portal.squad.counts.creators}</div>
              </div>
              <div className="dashboard-stat">
                <div className="dashboard-stat__label">Traders</div>
                <div className="dashboard-stat__value">{portal.squad.counts.traders}</div>
              </div>
              <div className="dashboard-stat">
                <div className="dashboard-stat__label">Unknown</div>
                <div className="dashboard-stat__value">{portal.squad.counts.unknown}</div>
              </div>
            </div>

            <div className="portal-grid">
              <section className="portal-card">
                <div className="portal-card__label">Recruiter</div>
                <h2 className="portal-card__title">{portal.recruiter.name}</h2>
                <div className="portal-meta-list">
                  <div><span>Wallet</span><strong>{shorten(portal.recruiter.wallet_address)}</strong></div>
                  <div><span>X</span><strong>{portal.recruiter.x_handle}</strong></div>
                  <div><span>Telegram</span><strong>{portal.recruiter.telegram_handle}</strong></div>
                </div>
                <div className="portal-code-editor">
                  <label className="field">
                    <span className="field__label">Recruiter code</span>
                    <input value={preferredCode} onChange={(e) => setPreferredCode(e.target.value.toUpperCase())} placeholder="KOL123" />
                  </label>
                  <button className="dashboard-btn" type="button" onClick={() => void saveCode()} disabled={savingCode}>
                    {savingCode ? 'Saving...' : 'Save code'}
                  </button>
                </div>
                <div className="portal-links">
                  <div className="portal-link-row">
                    <span>Canonical</span>
                    <code>{canonicalLink}</code>
                    <button className="mini-btn" type="button" onClick={() => void copy('Canonical link', canonicalLink)}>Copy</button>
                  </div>
                  <div className="portal-link-row">
                    <span>Universal</span>
                    <code>{queryLink}</code>
                    <button className="mini-btn" type="button" onClick={() => void copy('Query link', queryLink)}>Copy</button>
                  </div>
                </div>
                <div className="portal-share-row">
                  <button className="dashboard-btn" type="button" onClick={shareToX}>Share on X</button>
                  <button className="dashboard-btn dashboard-btn--ghost" type="button" onClick={() => void nativeShare()}>Brag about squad</button>
                  <button className="dashboard-btn dashboard-btn--ghost" type="button" onClick={() => void logout()}>Disconnect</button>
                </div>
                <div className="dashboard-results-meta">{copied ? `${copied} copied • ` : ''}Anyone who lands with your code and signs with a wallet is added to your squad.</div>
              </section>

              <section className="portal-card">
                <div className="portal-card__label">How attribution works</div>
                <h2 className="portal-card__title">Built for drop-off between click and connect</h2>
                <ul className="portal-checklist">
                  <li>Short route <code>/r/{portal.recruiter.recruiter_code}</code> captures attribution, then redirects to the landing page.</li>
                  <li><code>?ref={portal.recruiter.recruiter_code}</code> works on any deep link.</li>
                  <li>Attribution survives return visits in the same browser for 30 days.</li>
                  <li>The wallet signature locks the referral at the first connect.</li>
                </ul>
              </section>
            </div>

            <section className="portal-card portal-card--full">
              <div className="portal-card__label">Squad roster</div>
              <h2 className="portal-card__title">Creators and traders already locked in</h2>
              {portal.squad.rows.length === 0 ? (
                <div className="dashboard-empty">No squad members yet. Share your code and start onboarding creators or traders.</div>
              ) : (
                <div className="portal-roster">
                  {portal.squad.rows.map((row) => (
                    <article key={row.wallet_address} className="portal-roster__card">
                      <div>
                        <div className="submission-card__name">{shorten(row.wallet_address)}</div>
                        <div className="submission-card__meta">Bound {formatDate(row.bound_at)}</div>
                      </div>
                      <div className="portal-roster__meta">
                        <span className={`status-pill ${row.role === 'creator' ? 'status-pill--approved' : row.role === 'trader' ? 'status-pill--reviewing' : ''}`}>{row.role}</span>
                        <button className="mini-btn" type="button" onClick={() => void copy('Wallet', row.wallet_address)}>Copy</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}
