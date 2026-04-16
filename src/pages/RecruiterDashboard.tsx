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
    members: Array<{
      wallet_address: string
      role: string
      bound_at: string
    }>
  }
}

type DashboardResponse = {
  ok?: boolean
  error?: string
  counts?: {
    total: number
    byStatus: Record<string, number>
  }
  rows?: RecruiterRow[]
  row?: RecruiterRow
  deletedId?: number
  message?: string
  emailSent?: boolean
  emailError?: string | null
}

const TOKEN_KEY = 'mwz_recruiter_dashboard_token_v1'
const STATUS_ORDER = ['new', 'reviewing', 'approved', 'rejected'] as const

function formatDate(value: string | null) {
  if (!value) return '—'
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

function shortenWallet(value: string) {
  return value ? `${value.slice(0, 6)}...${value.slice(-4)}` : '—'
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
  const [actionMessage, setActionMessage] = useState('')
  const [savingKey, setSavingKey] = useState('')
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({})

  useEffect(() => {
    const stored = window.localStorage.getItem(TOKEN_KEY) || ''
    if (stored) {
      setToken(stored)
      setSavedToken(stored)
    }
  }, [])

  useEffect(() => {
    setNoteDrafts((prev) => {
      const next = { ...prev }
      const activeIds = new Set<number>()
      for (const row of rows) {
        activeIds.add(row.id)
        if (typeof next[row.id] !== 'string') {
          next[row.id] = row.reviewer_notes || ''
        }
      }
      for (const key of Object.keys(next)) {
        if (!activeIds.has(Number(key))) delete next[Number(key)]
      }
      return next
    })
  }, [rows])

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
        row.reviewer_notes || '',
        row.recruiter_code || '',
        ...(row.squad?.members?.map((member) => `${member.wallet_address} ${member.role}`) || []),
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
        acc.portalConnected += row.recruiter_last_login_at ? 1 : 0
        acc.codeSet += row.recruiter_code ? 1 : 0
        const squadTotal = row.squad?.counts.total || 0
        acc.squadMembers += squadTotal
        acc.activeSquads += squadTotal > 0 ? 1 : 0
        return acc
      },
      { total: 0, portalConnected: 0, codeSet: 0, squadMembers: 0, activeSquads: 0 } as Record<string, number>,
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
    const extra = rows
      .map((row) => row.status)
      .filter((status): status is string => Boolean(status) && !STATUS_ORDER.includes(status as (typeof STATUS_ORDER)[number]))
    return ['all', ...STATUS_ORDER, ...Array.from(new Set(extra))]
  }, [rows])

  const replaceRow = (updatedRow: RecruiterRow) => {
    setRows((prev) => prev.map((row) => (row.id === updatedRow.id ? { ...row, ...updatedRow } : row)))
    setNoteDrafts((prev) => ({ ...prev, [updatedRow.id]: updatedRow.reviewer_notes || '' }))
  }

  const removeRow = (deletedId: number) => {
    setRows((prev) => prev.filter((row) => row.id !== deletedId))
    setNoteDrafts((prev) => {
      const next = { ...prev }
      delete next[deletedId]
      return next
    })
  }

  const runReviewAction = async (
    row: RecruiterRow,
    payload: { status?: string; reviewerNotes?: string | null; resendApprovalEmail?: boolean },
    successMessage: string,
  ) => {
    if (!savedToken.trim()) {
      setError('Enter the dashboard token to load submissions.')
      return
    }

    setSavingKey(`${row.id}:${payload.resendApprovalEmail ? 'resend' : payload.status || 'notes'}`)
    setError('')
    setActionMessage('')

    try {
      const response = await fetch('/api/recruiter-dashboard', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-dashboard-token': savedToken.trim(),
        },
        body: JSON.stringify({
          id: row.id,
          ...payload,
        }),
      })

      const data = (await response.json().catch(() => ({}))) as DashboardResponse
      if (!response.ok || !data.ok || !data.row) {
        throw new Error(data.error || 'Failed to update recruiter submission.')
      }

      replaceRow(data.row)
      setActionMessage(data.message || successMessage)
      window.setTimeout(() => setActionMessage(''), 1600)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update recruiter submission.'
      setError(message)
    } finally {
      setSavingKey('')
    }
  }

  const runDeleteAction = async (row: RecruiterRow) => {
    if (!savedToken.trim()) {
      setError('Enter the dashboard token to load submissions.')
      return
    }

    const shouldDelete = window.confirm(
      `Delete recruiter ${row.name}? This also removes their referral sessions and bound squad data.`,
    )
    if (!shouldDelete) return

    setSavingKey(`${row.id}:delete`)
    setError('')
    setActionMessage('')

    try {
      const response = await fetch('/api/recruiter-dashboard', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-dashboard-token': savedToken.trim(),
        },
        body: JSON.stringify({ id: row.id }),
      })

      const data = (await response.json().catch(() => ({}))) as DashboardResponse
      if (!response.ok || !data.ok || typeof data.deletedId !== 'number') {
        throw new Error(data.error || 'Failed to delete recruiter submission.')
      }

      removeRow(data.deletedId)
      setActionMessage(data.message || 'Recruiter deleted.')
      window.setTimeout(() => setActionMessage(''), 1600)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete recruiter submission.'
      setError(message)
    } finally {
      setSavingKey('')
    }
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <div className="dashboard-head">
          <div>
            <div className="dashboard-kicker">Private reviewer page</div>
            <h1 className="dashboard-title">Recruiter submissions</h1>
            <p className="dashboard-subtitle">Protected with a server-side token. New applicants are auto-approved and emailed on arrival, and you can still note, resend, reject, or delete them here.</p>
          </div>
          <a className="dashboard-back" href="/">
            ← Back to coming soon
          </a>
        </div>

        <div className="dashboard-token-card">
          <div className="dashboard-token-copy">
            <div className="dashboard-token-title">Access token</div>
            <div className="dashboard-token-text">Enter the reviewer token to load and manage the applicant queue.</div>
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
                  setActionMessage('')
                }}
              >
                Clear token
              </button>
            ) : null}
          </div>
          {error ? <div className="dashboard-error">{error}</div> : null}
          {actionMessage ? <div className="dashboard-success">{actionMessage}</div> : null}
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
          <div className="dashboard-stat">
            <div className="dashboard-stat__label">Rejected</div>
            <div className="dashboard-stat__value">{counts.rejected || 0}</div>
          </div>
          <div className="dashboard-stat">
            <div className="dashboard-stat__label">Portal connected</div>
            <div className="dashboard-stat__value">{counts.portalConnected || 0}</div>
          </div>
          <div className="dashboard-stat">
            <div className="dashboard-stat__label">Codes set</div>
            <div className="dashboard-stat__value">{counts.codeSet || 0}</div>
          </div>
          <div className="dashboard-stat">
            <div className="dashboard-stat__label">Active squads</div>
            <div className="dashboard-stat__value">{counts.activeSquads || 0}</div>
          </div>
          <div className="dashboard-stat">
            <div className="dashboard-stat__label">Squad members</div>
            <div className="dashboard-stat__value">{counts.squadMembers || 0}</div>
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
            filteredRows.map((row) => {
              const noteDraft = noteDrafts[row.id] ?? ''
              const rowBusy = savingKey.startsWith(`${row.id}:`)

              return (
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

                  <section className="submission-overview">
                    <div className="submission-overview__top">
                      <div>
                        <div className="submission-item__label">Recruiter setup overview</div>
                        <div className="dashboard-results-meta dashboard-results-meta--compact">See who already logged into the portal, locked a code, and started building a squad.</div>
                      </div>
                      <div className="submission-summary-pills">
                        <span className={`status-pill ${row.recruiter_last_login_at ? 'status-pill--approved' : ''}`}>
                          {row.recruiter_last_login_at ? 'Portal connected' : row.status === 'approved' ? 'Approved, not signed in yet' : 'Portal locked'}
                        </span>
                        <span className={`status-pill ${row.recruiter_code ? 'status-pill--reviewing' : ''}`}>
                          {row.recruiter_code ? `Code ${row.recruiter_code}` : 'Code not set yet'}
                        </span>
                        <span className={`status-pill ${(row.squad?.counts.total || 0) > 0 ? 'status-pill--approved' : ''}`}>
                          Squad {(row.squad?.counts.total || 0).toString()}
                        </span>
                      </div>
                    </div>

                    <div className="submission-grid">
                      <div className="submission-item">
                        <span className="submission-item__label">Portal login</span>
                        <div>{row.recruiter_last_login_at ? formatDate(row.recruiter_last_login_at) : 'Not yet'}</div>
                      </div>
                      <div className="submission-item">
                        <span className="submission-item__label">Recruiter code</span>
                        <div>{row.recruiter_code || 'Not set yet'}</div>
                      </div>
                      <div className="submission-item">
                        <span className="submission-item__label">Squad breakdown</span>
                        <div>
                          {(row.squad?.counts.total || 0) > 0
                            ? `${row.squad?.counts.total || 0} total • ${row.squad?.counts.creators || 0} creators • ${row.squad?.counts.traders || 0} traders • ${row.squad?.counts.unknown || 0} unknown`
                            : 'No bound squad members yet'}
                        </div>
                      </div>
                      <div className="submission-item">
                        <span className="submission-item__label">Dashboard status</span>
                        <div>{row.recruiter_last_login_at ? 'Signed in and ready' : row.status === 'approved' ? 'Approved, waiting for first login' : 'Waiting for approval'}</div>
                      </div>
                    </div>

                    {(row.squad?.members?.length || 0) > 0 ? (
                      <div className="submission-squad">
                        <div className="submission-item__label">Squad roster</div>
                        <div className="portal-roster submission-squad-roster">
                          {row.squad?.members.map((member) => (
                            <article key={`${row.id}-${member.wallet_address}`} className="portal-roster__card">
                              <div>
                                <div className="submission-card__name submission-card__name--small">{shortenWallet(member.wallet_address)}</div>
                                <div className="submission-card__meta">Bound {formatDate(member.bound_at)}</div>
                              </div>
                              <div className="portal-roster__meta">
                                <span className={`status-pill ${member.role === 'creator' ? 'status-pill--approved' : member.role === 'trader' ? 'status-pill--reviewing' : ''}`}>{member.role}</span>
                                <button type="button" className="mini-btn" onClick={() => void copyValue('Wallet', member.wallet_address)}>
                                  Copy
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>

                  {row.notes ? (
                    <div className="submission-notes">
                      <div className="submission-item__label">Applicant notes</div>
                      <div>{row.notes}</div>
                    </div>
                  ) : null}

                  <div className="review-panel">
                    <div className="review-panel__head">
                      <div>
                        <div className="submission-item__label">Reviewer notes</div>
                        <div className="review-panel__meta">Last reviewed: {formatDate(row.reviewed_at)}</div>
                        {row.approval_email_sent_at ? <div className="review-panel__meta">Approval email sent: {formatDate(row.approval_email_sent_at)}</div> : null}
                        {row.approval_email_last_attempt_at ? <div className="review-panel__meta">Last email attempt: {formatDate(row.approval_email_last_attempt_at)}</div> : null}
                        {typeof row.approval_email_send_count === 'number' ? <div className="review-panel__meta">Emails sent: {row.approval_email_send_count}</div> : null}
                        {row.approval_email_last_error ? <div className="review-panel__meta review-panel__meta--error">Approval email error: {row.approval_email_last_error}</div> : null}
                      </div>
                      <div className="review-panel__head-actions">
                        {row.status === 'approved' ? (
                          <button
                            type="button"
                            className="mini-btn"
                            disabled={rowBusy}
                            onClick={() => void runReviewAction(row, { reviewerNotes: noteDraft, resendApprovalEmail: true }, 'Approval email resent.')}
                          >
                            {savingKey === `${row.id}:notes` ? 'Saving...' : savingKey === `${row.id}:resend` ? 'Sending...' : 'Resend email'}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="mini-btn"
                          disabled={rowBusy}
                          onClick={() => void runReviewAction(row, { reviewerNotes: noteDraft }, 'Reviewer notes saved.')}
                        >
                          {savingKey === `${row.id}:notes` ? 'Saving...' : 'Save notes'}
                        </button>
                      </div>
                    </div>

                    <textarea
                      className="dashboard-textarea"
                      value={noteDraft}
                      onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      placeholder="Internal notes, fit check, region, creator quality, follow-up steps..."
                    />

                    <div className="review-actions">
                      <button
                        type="button"
                        className="dashboard-btn dashboard-btn--ghost"
                        disabled={rowBusy}
                        onClick={() => void runReviewAction(row, { status: 'new', reviewerNotes: noteDraft }, 'Application moved back to new.')}
                      >
                        Reset to new
                      </button>
                      <button
                        type="button"
                        className="dashboard-btn dashboard-btn--ghost"
                        disabled={rowBusy}
                        onClick={() => void runReviewAction(row, { status: 'reviewing', reviewerNotes: noteDraft }, 'Application marked as reviewing.')}
                      >
                        {savingKey === `${row.id}:reviewing` ? 'Saving...' : 'Mark reviewing'}
                      </button>
                      <button
                        type="button"
                        className="dashboard-btn dashboard-btn--success"
                        disabled={rowBusy}
                        onClick={() => void runReviewAction(row, { status: 'approved', reviewerNotes: noteDraft }, 'Application approved.')}
                      >
                        {savingKey === `${row.id}:approved` ? 'Saving...' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        className="dashboard-btn dashboard-btn--danger"
                        disabled={rowBusy}
                        onClick={() => void runReviewAction(row, { status: 'rejected', reviewerNotes: noteDraft }, 'Application rejected.')}
                      >
                        {savingKey === `${row.id}:rejected` ? 'Saving...' : 'Reject'}
                      </button>
                      <button
                        type="button"
                        className="dashboard-btn dashboard-btn--danger"
                        disabled={rowBusy}
                        onClick={() => void runDeleteAction(row)}
                      >
                        {savingKey === `${row.id}:delete` ? 'Deleting...' : 'Delete recruiter'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
