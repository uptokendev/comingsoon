import { useEffect, useMemo, useState } from 'react'

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
}

type DashboardResponse = {
  ok?: boolean
  error?: string
  counts?: {
    total: number
    byStatus: Record<string, number>
  }
  rows?: RecruiterRow[]
}

const TOKEN_KEY = 'mwz_recruiter_dashboard_token_v1'

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

function timeAgo(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  const diffMonth = Math.round(diffDay / 30)
  return `${diffMonth}mo ago`
}

function statusClass(status: string) {
  switch (status) {
    case 'approved':
      return 'status-pill status-pill--approved'
    case 'rejected':
      return 'status-pill status-pill--rejected'
    case 'reviewing':
      return 'status-pill status-pill--reviewing'
    default:
      return 'status-pill'
  }
}

export default function RecruiterDashboard() {
  const [token, setToken] = useState('')
  const [savedToken, setSavedToken] = useState('')
  const [rows, setRows] = useState<RecruiterRow[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  useEffect(() => {
    const stored = window.localStorage.getItem(TOKEN_KEY) || ''
    if (stored) {
      setToken(stored)
      setSavedToken(stored)
    }
  }, [])

  const fetchRows = async (activeToken: string) => {
    if (!activeToken.trim()) {
      setError('Enter the dashboard token to load submissions.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/recruiter-dashboard', {
        headers: {
          'x-dashboard-token': activeToken.trim(),
        },
      })

      const data = (await response.json().catch(() => ({}))) as DashboardResponse
      if (!response.ok || !data.ok || !data.rows) {
        throw new Error(data.error || 'Failed to load recruiter submissions.')
      }

      window.localStorage.setItem(TOKEN_KEY, activeToken.trim())
      setSavedToken(activeToken.trim())
      setRows(data.rows)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load recruiter submissions.'
      setError(message)
      if (/unauthorized/i.test(message)) {
        window.localStorage.removeItem(TOKEN_KEY)
        setSavedToken('')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (savedToken) {
      void fetchRows(savedToken)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedToken])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (!query) return true

      const haystack = [
        row.name,
        row.email,
        row.wallet_address,
        row.x_handle,
        row.telegram_handle,
        row.country_region || '',
        row.focus,
        row.languages || '',
        row.notes || '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [rows, search, statusFilter])

  const counts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.total += 1
        acc[row.status] = (acc[row.status] || 0) + 1
        return acc
      },
      { total: 0 } as Record<string, number>,
    )
  }, [rows])

  const copyValue = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      window.setTimeout(() => setCopied(''), 1200)
    } catch {
      setCopied('')
    }
  }

  const statusOptions = useMemo(() => {
    const unique = Array.from(new Set(rows.map((row) => row.status).filter(Boolean)))
    return ['all', ...unique]
  }, [rows])

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <div className="dashboard-head">
          <div>
            <div className="dashboard-kicker">Private reviewer page</div>
            <h1 className="dashboard-title">Recruiter submissions</h1>
            <p className="dashboard-subtitle">Protected with a server-side token. Read-only for now.</p>
          </div>
          <a className="dashboard-back" href="/">
            ← Back to coming soon
          </a>
        </div>

        <div className="dashboard-token-card">
          <div className="dashboard-token-copy">
            <div className="dashboard-token-title">Access token</div>
            <div className="dashboard-token-text">Enter the reviewer token to load the applicant queue.</div>
          </div>
          <div className="dashboard-token-form">
            <input
              className="dashboard-input"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter dashboard token"
            />
            <button className="dashboard-btn" type="button" onClick={() => void fetchRows(token)} disabled={loading}>
              {loading ? 'Loading...' : 'Unlock'}
            </button>
            {savedToken ? (
              <button
                className="dashboard-btn dashboard-btn--ghost"
                type="button"
                onClick={() => {
                  window.localStorage.removeItem(TOKEN_KEY)
                  setSavedToken('')
                  setToken('')
                  setRows([])
                  setError('')
                }}
              >
                Clear token
              </button>
            ) : null}
          </div>
          {error ? <div className="dashboard-error">{error}</div> : null}
        </div>

        <div className="dashboard-stats">
          <div className="dashboard-stat">
            <div className="dashboard-stat__label">Total</div>
            <div className="dashboard-stat__value">{counts.total || 0}</div>
          </div>
          <div className="dashboard-stat">
            <div className="dashboard-stat__label">New</div>
            <div className="dashboard-stat__value">{counts.new || 0}</div>
          </div>
          <div className="dashboard-stat">
            <div className="dashboard-stat__label">Reviewing</div>
            <div className="dashboard-stat__value">{counts.reviewing || 0}</div>
          </div>
          <div className="dashboard-stat">
            <div className="dashboard-stat__label">Approved</div>
            <div className="dashboard-stat__value">{counts.approved || 0}</div>
          </div>
        </div>

        <div className="dashboard-controls">
          <input
            className="dashboard-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, handle, email, wallet, country, notes..."
          />
          <select className="dashboard-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? 'All statuses' : option}
              </option>
            ))}
          </select>
          <button className="dashboard-btn dashboard-btn--ghost" type="button" onClick={() => savedToken && void fetchRows(savedToken)}>
            Refresh
          </button>
        </div>

        <div className="dashboard-results-meta">
          Showing {filteredRows.length} of {rows.length} submissions {copied ? `• ${copied} copied` : ''}
        </div>

        <div className="dashboard-list">
          {filteredRows.length === 0 ? (
            <div className="dashboard-empty">No submissions match the current filters.</div>
          ) : (
            filteredRows.map((row) => (
              <article key={row.id} className="submission-card">
                <div className="submission-card__top">
                  <div>
                    <div className="submission-card__name">{row.name}</div>
                    <div className="submission-card__meta">
                      Applied {timeAgo(row.created_at)} • {formatDate(row.created_at)}
                    </div>
                  </div>
                  <div className={statusClass(row.status)}>{row.status || 'new'}</div>
                </div>

                <div className="submission-grid">
                  <div className="submission-item">
                    <span className="submission-item__label">Email</span>
                    <div className="submission-item__row">
                      <a href={`mailto:${row.email}`}>{row.email}</a>
                      <button type="button" className="mini-btn" onClick={() => void copyValue('Email', row.email)}>
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="submission-item">
                    <span className="submission-item__label">Wallet</span>
                    <div className="submission-item__row submission-item__row--wrap">
                      <code>{row.wallet_address}</code>
                      <button type="button" className="mini-btn" onClick={() => void copyValue('Wallet', row.wallet_address)}>
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="submission-item">
                    <span className="submission-item__label">X</span>
                    <div className="submission-item__row">
                      <a href={`https://x.com/${row.x_handle.replace(/^@+/, '')}`} target="_blank" rel="noreferrer">
                        @{row.x_handle.replace(/^@+/, '')}
                      </a>
                    </div>
                  </div>

                  <div className="submission-item">
                    <span className="submission-item__label">Telegram</span>
                    <div className="submission-item__row">
                      <a href={`https://t.me/${row.telegram_handle.replace(/^@+/, '')}`} target="_blank" rel="noreferrer">
                        @{row.telegram_handle.replace(/^@+/, '')}
                      </a>
                    </div>
                  </div>

                  <div className="submission-item">
                    <span className="submission-item__label">Focus</span>
                    <div>{row.focus || 'both'}</div>
                  </div>

                  <div className="submission-item">
                    <span className="submission-item__label">Country / region</span>
                    <div>{row.country_region || '—'}</div>
                  </div>

                  <div className="submission-item">
                    <span className="submission-item__label">Languages</span>
                    <div>{row.languages || '—'}</div>
                  </div>

                  <div className="submission-item">
                    <span className="submission-item__label">Source</span>
                    <div>{row.source || 'coming-soon-popup'}</div>
                  </div>
                </div>

                {row.notes ? (
                  <div className="submission-notes">
                    <div className="submission-item__label">Notes</div>
                    <div>{row.notes}</div>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
