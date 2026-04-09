import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { captureReferralVisit } from '../lib/referral'

export default function ReferralCapturePage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('Locking in your referral...')

  useEffect(() => {
    let active = true
    ;(async () => {
      const result = await captureReferralVisit(code, `/r/${code}`)
      if (!active) return
      if (!result.ok) {
        setMessage(result.error || 'That referral link could not be verified.')
        window.setTimeout(() => navigate('/', { replace: true }), 1800)
        return
      }
      setMessage(`Referral ${String(result.data.code || code).toUpperCase()} locked in. Redirecting...`)
      window.setTimeout(() => navigate('/', { replace: true }), 700)
    })()
    return () => {
      active = false
    }
  }, [code, navigate])

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell dashboard-shell--narrow">
        <div className="dashboard-head">
          <div>
            <div className="dashboard-kicker">Referral routing</div>
            <h1 className="dashboard-title">Joining the squad</h1>
            <p className="dashboard-subtitle">{message}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
