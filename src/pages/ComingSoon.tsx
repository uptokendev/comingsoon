import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useMatch } from 'react-router-dom'
import { CookieBar } from '../components/CookieBar'
import { RecruiterModal } from '../components/RecruiterModal'
import SocialButton from '../components/SocialButton'
import { SpaceBackground } from '../components/SpaceBackground'
import { captureReferralVisit, fetchReferralStatus, getStoredReferralCode, normalizeCode, refreshReferral, saveReferralCode, type ReferralStatus } from '../lib/referral'
import { connectWallet } from '../lib/wallet'

const X_URL = (import.meta.env.VITE_X_URL as string) || 'https://x.com/MemeWarzoneHQ'
const TG_URL = (import.meta.env.VITE_TELEGRAM_URL as string) || 'https://t.me/memewarzonehq'
const DC_URL = (import.meta.env.VITE_DISCORD_URL as string) || 'https://discord.gg/T7Sp6nSM'
const DOCS_URL = (import.meta.env.VITE_DOCS_URL as string) || 'https://docs.memewar.zone'
const STATUS = (import.meta.env.VITE_STATUS_TEXT as string) || ''

const warRoomStyles = `
.page--war-room {
  min-height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
}

.page--war-room .page__overlay {
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.58) 24%, rgba(0, 0, 0, 0.68) 64%, rgba(0, 0, 0, 0.9) 100%),
    radial-gradient(circle at 18% 16%, rgba(255, 122, 31, 0.22), transparent 30%),
    radial-gradient(circle at 82% 18%, rgba(246, 211, 124, 0.12), transparent 32%),
    radial-gradient(circle at center, rgba(0, 0, 0, 0.16) 0%, rgba(0, 0, 0, 0.52) 64%, rgba(0, 0, 0, 0.86) 100%);
}

.top--war-room {
  gap: 22px;
}

.top__nav {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex: 1;
}

.top__nav a,
.top__nav button {
  min-height: 38px;
  border-radius: 999px;
  border: 1px solid rgba(246, 211, 124, 0.14);
  background: rgba(0, 0, 0, 0.42);
  color: rgba(255, 247, 235, 0.78);
  padding: 0 12px;
  cursor: pointer;
}

.main--war-room {
  display: block;
  padding: 28px 22px 70px;
}

.war-room-shell {
  width: min(1180px, 100%);
  margin: 0 auto;
}

.launch-banner {
  margin: 0 auto 18px;
  padding: 13px 16px;
  border: 1px solid rgba(246, 211, 124, 0.24);
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.5);
  color: rgba(255, 247, 235, 0.82);
  text-align: center;
  line-height: 1.45;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.26);
  backdrop-filter: blur(12px);
}

.launch-banner strong {
  color: rgba(246, 211, 124, 0.98);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.top__pill--coming-soon {
  border-color: rgba(246, 211, 124, 0.32);
  color: rgba(246, 211, 124, 0.96);
  background: rgba(0, 0, 0, 0.62);
}

.war-hero {
  min-height: 560px;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
  gap: 22px;
  align-items: center;
}

.war-hero__copy {
  text-align: left;
}

.war-hero__copy .badge {
  margin-bottom: 18px;
}

.war-hero__copy .h1 {
  margin-top: 0;
  font-size: clamp(42px, 6vw, 78px);
}

.war-hero__copy .lead {
  max-width: 780px;
  font-size: 17px;
}

.hero-actions {
  margin-top: 26px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.hero-primary,
.hero-secondary,
.link-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 50px;
  padding: 0 18px;
  border-radius: 15px;
  font-weight: 800;
  cursor: pointer;
}

.hero-primary {
  border: 1px solid rgba(246, 211, 124, 0.36);
  background: linear-gradient(180deg, rgba(246, 211, 124, 0.25), rgba(255, 90, 31, 0.14));
  color: rgba(255, 248, 236, 0.98);
  box-shadow: 0 20px 70px rgba(255, 90, 31, 0.18);
}

.hero-secondary,
.link-pill {
  border: 1px solid rgba(246, 211, 124, 0.18);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 247, 235, 0.86);
}

.hero-primary:hover,
.hero-secondary:hover,
.link-pill:hover,
.top__nav a:hover,
.top__nav button:hover {
  transform: translateY(-1px);
  border-color: rgba(246, 211, 124, 0.42);
}

.war-hero__meta {
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.meta-chip {
  padding: 13px 14px;
  border-radius: 16px;
  border: 1px solid rgba(246, 211, 124, 0.13);
  background: rgba(0, 0, 0, 0.38);
  color: rgba(255, 247, 235, 0.76);
  line-height: 1.4;
}

.meta-chip strong {
  display: block;
  color: rgba(246, 211, 124, 0.96);
  font-size: 12px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.command-panel {
  border: 1px solid rgba(246, 211, 124, 0.22);
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(19, 15, 17, 0.9), rgba(6, 6, 8, 0.78));
  box-shadow: 0 28px 100px rgba(0, 0, 0, 0.48);
  backdrop-filter: blur(13px);
  overflow: hidden;
}

.command-panel__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(246, 211, 124, 0.12);
}

.command-panel__label {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(246, 211, 124, 0.95);
}

.command-panel__status {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(143, 214, 164, 0.12);
  color: rgba(143, 214, 164, 0.95);
  font-size: 12px;
  font-weight: 800;
}

.command-panel__body {
  padding: 18px;
}

.radar-card {
  position: relative;
  min-height: 230px;
  border-radius: 24px;
  border: 1px solid rgba(246, 211, 124, 0.13);
  background:
    radial-gradient(circle at center, rgba(246, 211, 124, 0.14), transparent 21%),
    repeating-radial-gradient(circle at center, rgba(246, 211, 124, 0.14) 0 1px, transparent 1px 42px),
    linear-gradient(135deg, rgba(255, 90, 31, 0.08), rgba(0, 0, 0, 0.22));
  overflow: hidden;
}

.radar-card::after {
  content: "";
  position: absolute;
  inset: -30%;
  background: conic-gradient(from 0deg, rgba(246, 211, 124, 0.2), transparent 18%, transparent 100%);
  animation: mwzRadar 7s linear infinite;
  transform-origin: center;
}

@keyframes mwzRadar {
  to { transform: rotate(360deg); }
}

.radar-card__logo {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 1;
}

.radar-card__logo img {
  width: min(250px, 72%);
  filter: drop-shadow(0 24px 45px rgba(0, 0, 0, 0.5));
}

.radar-card__tag {
  position: absolute;
  left: 16px;
  bottom: 16px;
  z-index: 2;
  padding: 9px 12px;
  border-radius: 999px;
  border: 1px solid rgba(246, 211, 124, 0.18);
  background: rgba(0, 0, 0, 0.58);
  color: rgba(255, 247, 235, 0.82);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.panel-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.panel-stat {
  padding: 14px;
  border-radius: 18px;
  border: 1px solid rgba(246, 211, 124, 0.12);
  background: rgba(255, 255, 255, 0.035);
}

.panel-stat__value {
  font-size: 24px;
  font-weight: 900;
  color: rgba(246, 211, 124, 0.96);
}

.panel-stat__label {
  margin-top: 5px;
  color: rgba(255, 247, 235, 0.64);
  font-size: 13px;
}

.section-block {
  margin-top: 34px;
  padding: 30px;
  border-radius: 30px;
  border: 1px solid rgba(246, 211, 124, 0.13);
  background: linear-gradient(180deg, rgba(12, 10, 11, 0.68), rgba(4, 4, 6, 0.54));
  backdrop-filter: blur(12px);
  box-shadow: 0 24px 90px rgba(0, 0, 0, 0.28);
}

.section-head {
  max-width: 820px;
}

.section-kicker {
  color: rgba(246, 211, 124, 0.95);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.section-title {
  margin: 9px 0 0;
  font-size: clamp(28px, 4vw, 44px);
  line-height: 1.08;
}

.section-copy {
  margin: 12px 0 0;
  color: rgba(255, 247, 235, 0.76);
  line-height: 1.65;
}

.problem-grid,
.role-grid,
.feature-grid,
.security-grid,
.faq-grid {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.feature-grid--two,
.security-grid,
.faq-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.war-card {
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(246, 211, 124, 0.12);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(0, 0, 0, 0.18));
}

.war-card__icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  border: 1px solid rgba(246, 211, 124, 0.15);
  background: rgba(246, 211, 124, 0.08);
  margin-bottom: 14px;
}

.war-card__eyebrow {
  color: rgba(246, 211, 124, 0.9);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.war-card__title {
  margin-top: 8px;
  font-size: 20px;
  font-weight: 900;
}

.war-card__text {
  margin-top: 9px;
  color: rgba(255, 247, 235, 0.72);
  line-height: 1.62;
}

.war-card ul {
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.war-card li {
  color: rgba(255, 247, 235, 0.76);
  line-height: 1.45;
}

.war-card li::before {
  content: "⚔";
  color: rgba(246, 211, 124, 0.9);
  margin-right: 8px;
}

.flow-grid {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.flow-step {
  position: relative;
  padding: 18px;
  min-height: 172px;
  border-radius: 22px;
  border: 1px solid rgba(246, 211, 124, 0.12);
  background: rgba(0, 0, 0, 0.24);
}

.flow-step__number {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: rgba(246, 211, 124, 0.13);
  color: rgba(246, 211, 124, 0.96);
  font-weight: 900;
}

.flow-step__title {
  margin-top: 16px;
  font-weight: 900;
  font-size: 18px;
}

.flow-step__text {
  margin-top: 8px;
  color: rgba(255, 247, 235, 0.7);
  line-height: 1.55;
}

.recruiter-layout {
  margin-top: 22px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.72fr);
  gap: 18px;
  align-items: stretch;
}

.recruiter-cta-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 22px;
  border-radius: 24px;
  border: 1px solid rgba(143, 214, 164, 0.2);
  background: linear-gradient(180deg, rgba(143, 214, 164, 0.1), rgba(0, 0, 0, 0.22));
}

.recruiter-cta-card__big {
  font-size: 42px;
  font-weight: 950;
  color: rgba(143, 214, 164, 0.95);
}

.recruiter-cta-card__text {
  margin-top: 12px;
  color: rgba(255, 247, 235, 0.72);
  line-height: 1.6;
}

.league-strip {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.league-tile {
  padding: 17px;
  border-radius: 20px;
  border: 1px solid rgba(246, 211, 124, 0.12);
  background: rgba(0, 0, 0, 0.28);
}

.league-tile strong {
  display: block;
  font-size: 22px;
  color: rgba(246, 211, 124, 0.96);
}

.league-tile span {
  display: block;
  margin-top: 6px;
  color: rgba(255, 247, 235, 0.66);
  line-height: 1.45;
}

.timeline {
  margin-top: 22px;
  display: grid;
  gap: 12px;
}

.timeline-step {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 16px;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid rgba(246, 211, 124, 0.12);
  background: rgba(0, 0, 0, 0.24);
}

.timeline-step__phase {
  color: rgba(246, 211, 124, 0.95);
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 12px;
}

.timeline-step__title {
  font-weight: 900;
}

.timeline-step__text {
  margin-top: 5px;
  color: rgba(255, 247, 235, 0.68);
  line-height: 1.55;
}

.footer--war-room {
  align-items: stretch;
  gap: 16px;
}

.footer-cta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(246, 211, 124, 0.14);
  background: rgba(0, 0, 0, 0.34);
}

.footer-cta strong {
  color: rgba(255, 247, 235, 0.92);
}

.footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

@media (max-width: 980px) {
  .top--war-room {
    align-items: flex-start;
  }

  .top__nav {
    display: none;
  }

  .war-hero,
  .recruiter-layout {
    grid-template-columns: 1fr;
  }

  .war-hero {
    min-height: auto;
    padding-top: 18px;
  }

  .problem-grid,
  .role-grid,
  .feature-grid,
  .feature-grid--two,
  .security-grid,
  .faq-grid,
  .flow-grid,
  .league-strip {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 700px) {
  .main--war-room {
    padding-left: 16px;
    padding-right: 16px;
  }

  .war-hero__copy {
    text-align: center;
  }

  .hero-actions,
  .war-hero__meta {
    grid-template-columns: 1fr;
    justify-content: center;
  }

  .hero-primary,
  .hero-secondary,
  .link-pill {
    width: 100%;
  }

  .problem-grid,
  .role-grid,
  .feature-grid,
  .feature-grid--two,
  .security-grid,
  .faq-grid,
  .flow-grid,
  .league-strip,
  .panel-grid {
    grid-template-columns: 1fr;
  }

  .section-block {
    padding: 22px;
    border-radius: 24px;
  }

  .timeline-step {
    grid-template-columns: 1fr;
  }

  .footer-cta {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }
}
`

function IconDocs() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.5 4.5H18c.83 0 1.5.67 1.5 1.5v14c0 .83-.67 1.5-1.5 1.5H6.5A2.5 2.5 0 0 1 4 19V7A2.5 2.5 0 0 1 6.5 4.5Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 8h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 12h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 16h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.9 2H21.9L15.4 9.4L23 22H17.4L13 14.8L6.7 22H3.7L10.8 13.9L3.5 2H9.2L13.2 8.6L18.9 2Z" fill="currentColor" />
    </svg>
  )
}

function IconTelegram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.6 15.4L9.3 19.4C9.7 19.4 9.9 19.2 10.2 18.9L12.1 17.1L16.1 20C16.8 20.4 17.3 20.2 17.5 19.3L20.9 4.9C21.1 3.8 20.5 3.4 19.8 3.7L2.7 10.3C1.6 10.7 1.6 11.2 2.5 11.5L6.9 12.9L17.1 6.5C17.6 6.2 18.1 6.4 17.7 6.8L9.6 15.4Z" fill="currentColor" />
    </svg>
  )
}

function IconDiscord() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.5 5.2C18.1 4.5 16.7 4 15.2 3.7L15 4.1C16.3 4.5 17.5 5 18.7 5.7C17.4 5.1 16.1 4.7 14.7 4.4C13.1 4.1 11.5 4.1 9.9 4.4C8.5 4.7 7.2 5.1 5.9 5.7C7.1 5 8.3 4.5 9.6 4.1L9.4 3.7C7.9 4 6.5 4.5 5.1 5.2C2.7 8.8 2 12.3 2.3 15.8C3.7 16.8 5.2 17.5 6.8 17.9C7.2 17.4 7.6 16.8 7.9 16.3C7.3 16.1 6.7 15.8 6.2 15.5L6.5 15.3C7.9 16 9.4 16.5 10.9 16.7C12.5 16.9 14.1 16.9 15.7 16.7C17.3 16.5 18.8 16 20.2 15.3L20.5 15.5C20 15.8 19.4 16.1 18.8 16.3C19.1 16.8 19.5 17.4 19.9 17.9C21.5 17.5 23 16.8 24.4 15.8C24.8 11.9 23.8 8.4 19.5 5.2ZM8.5 14.3C7.6 14.3 6.9 13.5 6.9 12.6C6.9 11.7 7.6 10.9 8.5 10.9C9.4 10.9 10.1 11.7 10.1 12.6C10.1 13.5 9.4 14.3 8.5 14.3ZM15.9 14.3C15 14.3 14.3 13.5 14.3 12.6C14.3 11.7 15 10.9 15.9 10.9C16.8 10.9 17.5 11.7 17.5 12.6C17.5 13.5 16.8 14.3 15.9 14.3Z" fill="currentColor" />
    </svg>
  )
}

export default function ComingSoon() {
  const [recruiterModalOpen, setRecruiterModalOpen] = useState(false)
  const [referralStatus, setReferralStatus] = useState<ReferralStatus>({ hasReferral: false })
  const [referralRole, setReferralRole] = useState<'creator' | 'trader'>('creator')
  const [referralLoading, setReferralLoading] = useState(false)
  const [referralMessage, setReferralMessage] = useState('')
  const [checkingReferral, setCheckingReferral] = useState(true)
  const [referralGateDismissed, setReferralGateDismissed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const referralMatch = useMatch('/r/:code')
  const pathReferralCode = normalizeCode(referralMatch?.params?.code || '')

  const referralCodeHint = useMemo(() => {
    const queryCode = normalizeCode(new URLSearchParams(location.search).get('ref') || '')
    return pathReferralCode || queryCode || getStoredReferralCode() || ''
  }, [location.search, pathReferralCode])

  const referralGateActive = !referralGateDismissed && Boolean(referralCodeHint || referralStatus.hasReferral)

  useEffect(() => {
    let active = true

    ;(async () => {
      const params = new URLSearchParams(location.search)
      const queryCode = normalizeCode(params.get('ref') || '')
      const incomingCode = pathReferralCode || queryCode || ''

      try {
        if (incomingCode) {
          const result = await captureReferralVisit(incomingCode, `${location.pathname}${location.search}`)
          if (result.ok) {
            saveReferralCode(incomingCode)
            if (active) {
              setReferralStatus((prev) => ({
                ...prev,
                hasReferral: true,
                code: incomingCode,
              }))
            }

            if (queryCode) {
              params.delete('ref')
              const nextSearch = params.toString()
              navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true })
            }
          } else if (active) {
            setReferralMessage(result.error || 'Referral check failed.')
          }
        }

        let status = await fetchReferralStatus().catch(() => ({ hasReferral: false } as ReferralStatus))

        if (!status.hasReferral) {
          const storedCode = incomingCode || getStoredReferralCode()
          if (storedCode) {
            const refreshed = await refreshReferral(storedCode)
            if (refreshed.ok) {
              status = await fetchReferralStatus().catch(() => ({
                hasReferral: true,
                code: storedCode,
                isBound: false,
                binding: null,
              } as ReferralStatus))
            }
          }
        }

        if (active) {
          if (status.hasReferral) {
            setReferralStatus(status)
          } else if (incomingCode) {
            setReferralStatus({ hasReferral: true, code: incomingCode, isBound: false, binding: null })
          } else {
            setReferralStatus(status)
            setReferralGateDismissed(false)
          }
        }
      } catch (error) {
        if (active) {
          const fallbackCode = incomingCode || getStoredReferralCode()
          if (fallbackCode) {
            setReferralStatus({ hasReferral: true, code: fallbackCode, isBound: false, binding: null })
          }
          setReferralMessage(error instanceof Error ? error.message : 'Referral check failed.')
        }
      } finally {
        if (active) setCheckingReferral(false)
      }
    })()

    return () => {
      active = false
    }
  }, [location.pathname, location.search, navigate, pathReferralCode])

  const bindReferral = async () => {
    setReferralLoading(true)
    setReferralMessage('')

    try {
      const activeCode = referralStatus.code || referralCodeHint
      if (activeCode) {
        const refreshed = await refreshReferral(activeCode)
        if (refreshed.ok) {
          const refreshedStatus = await fetchReferralStatus().catch(() => ({ hasReferral: true, code: activeCode, isBound: false, binding: null } as ReferralStatus))
          setReferralStatus(refreshedStatus)
        }
      }

      const { signer, address } = await connectWallet()
      const nonceResponse = await fetch(`/api/ref-nonce?address=${encodeURIComponent(address)}`, {
        credentials: 'same-origin',
      })
      const nonceData = await nonceResponse.json().catch(() => ({}))
      if (!nonceResponse.ok || !nonceData?.message) {
        throw new Error(nonceData?.error || 'Failed to create a referral bind challenge.')
      }

      const signature = await signer.signMessage(nonceData.message)
      const bindResponse = await fetch('/api/ref-bind', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, role: referralRole }),
      })
      const bindData = await bindResponse.json().catch(() => ({}))
      if (!bindResponse.ok || !bindData?.ok) {
        throw new Error(bindData?.error || 'Failed to lock in your recruiter attribution.')
      }

      setReferralStatus({
        hasReferral: true,
        code: bindData?.binding?.recruiter_code || referralStatus.code,
        isBound: true,
        binding: bindData?.binding || null,
      })
      setReferralMessage(bindData?.alreadyBound ? 'This wallet was already linked to a recruiter.' : `Wallet locked in as a ${referralRole}.`)
    } catch (error) {
      setReferralMessage(error instanceof Error ? error.message : 'Failed to lock in your recruiter attribution.')
    } finally {
      setReferralLoading(false)
    }
  }

  const scrollToRecruiter = () => {
    document.getElementById('recruiter-signup')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={['page', 'page--war-room', referralGateActive ? 'page--referral-focus' : ''].filter(Boolean).join(' ')}>
      <style>{warRoomStyles}</style>
      <div className="page__bg" aria-hidden="true" />
      <div className="page__overlay" aria-hidden="true" />
      <SpaceBackground particleCount={220} particleColor="rgba(255, 165, 70, 0.55)" backgroundColor="transparent" className="page__particles" />

      <RecruiterModal
        forcedOpen={recruiterModalOpen}
        onCloseForced={() => setRecruiterModalOpen(false)}
        suppressAutoOpen={referralGateActive || checkingReferral}
      />

      <header className="top top--war-room">
        <div className="top__brand">
          <img className="top__logo" src="/logo.png" alt="MemeWarzone" />
        </div>
        <nav className="top__nav" aria-label="Primary navigation">
          <a href="#roles">Roles</a>
          <a href="#leagues">Leagues</a>
          <a href="#rewards">Rewards</a>
          <button type="button" onClick={scrollToRecruiter}>Recruiters</button>
        </nav>
        <div className="top__pill top__pill--coming-soon">Coming Soon - Prepare Mode</div>
      </header>

      <main className="main main--war-room">
        <div className="war-room-shell">
          <div className="launch-banner" role="status">
            <strong>Coming soon.</strong> MemeWarzone is not live yet. Recruiters and squads are forming before launch.
          </div>
          <section className="war-hero" aria-labelledby="war-hero-title">
            <div className="war-hero__copy">
              <div className="badge">Coming soon - Prepare Mode War Room</div>
              <h1 className="h1" id="war-hero-title">
                The meme launchpad built like a <span className="h1__accent">Warzone</span>
              </h1>
              <p className="lead">
                Creators launch campaigns. Traders battle for upside. Recruiters build squads. Weekly and monthly Leagues turn meme launches into recurring competition instead of dead-chart gambling.
              </p>
              <div className="hero-actions">
                <a className="hero-primary" href={DC_URL} target="_blank" rel="noreferrer">Join Prepare Mode</a>
                <button type="button" className="hero-secondary" onClick={() => setRecruiterModalOpen(true)}>Become a Recruiter</button>
                <a className="hero-secondary" href={DOCS_URL} target="_blank" rel="noreferrer">Read the War Briefing</a>
              </div>
              <div className="war-hero__meta" aria-label="Platform highlights">
                <div className="meta-chip"><strong>Launch</strong>Creator-first campaign flow</div>
                <div className="meta-chip"><strong>Battle</strong>Weekly and monthly Leagues</div>
                <div className="meta-chip"><strong>Reward</strong>Squads, recruiters, and airdrops</div>
              </div>
            </div>

            <aside className="command-panel" aria-label="MemeWarzone command panel">
              <div className="command-panel__top">
                <div className="command-panel__label">Command Screen</div>
                <div className="command-panel__status">Loading</div>
              </div>
              <div className="command-panel__body">
                <div className="radar-card">
                  <div className="radar-card__logo"><img src="/logo.png" alt="MemeWarzone" /></div>
                  <div className="radar-card__tag">Squads forming now</div>
                </div>
                <div className="panel-grid">
                  <div className="panel-stat">
                    <div className="panel-stat__value">3</div>
                    <div className="panel-stat__label">Core roles: creators, recruiters, traders</div>
                  </div>
                  <div className="panel-stat">
                    <div className="panel-stat__value">24/7</div>
                    <div className="panel-stat__label">Launchpad arena with recurring competition</div>
                  </div>
                  <div className="panel-stat">
                    <div className="panel-stat__value">Weekly</div>
                    <div className="panel-stat__label">Epochs, standings, claims, winners</div>
                  </div>
                  <div className="panel-stat">
                    <div className="panel-stat__value">No rugs</div>
                    <div className="panel-stat__label">Treasury-first routing and public reward surfaces</div>
                  </div>
                </div>
              </div>
            </aside>
          </section>

          <section className="section-block" id="problem" aria-labelledby="problem-title">
            <div className="section-head">
              <div className="section-kicker">Why this exists</div>
              <h2 className="section-title" id="problem-title">Most meme launches die because nothing keeps the fight going.</h2>
              <p className="section-copy">
                MemeWarzone is designed around distribution, retention, and transparent reward loops. The point is not just to launch fast. The point is to keep creators, traders, and communities coming back for the next battle.
              </p>
            </div>
            <div className="problem-grid">
              <article className="war-card">
                <div className="war-card__icon">📉</div>
                <div className="war-card__eyebrow">Problem</div>
                <div className="war-card__title">Dead charts</div>
                <p className="war-card__text">Most launches spike once, dump once, and vanish. No recurring event, no reason to return, no community scoreboard.</p>
              </article>
              <article className="war-card">
                <div className="war-card__icon">🧨</div>
                <div className="war-card__eyebrow">Problem</div>
                <div className="war-card__title">Rug culture</div>
                <p className="war-card__text">Hidden control, insider routes, and fake activity kill trust before serious communities even arrive.</p>
              </article>
              <article className="war-card">
                <div className="war-card__icon">⚔️</div>
                <div className="war-card__eyebrow">Answer</div>
                <div className="war-card__title">Recurring competition</div>
                <p className="war-card__text">UpVotes, Leagues, Squad Pool, Recruiter Program, and Airdrops turn platform activity into a repeatable war machine.</p>
              </article>
            </div>
          </section>

          <section className="section-block" id="roles" aria-labelledby="roles-title">
            <div className="section-head">
              <div className="section-kicker">Choose your role</div>
              <h2 className="section-title" id="roles-title">Every soldier has a lane.</h2>
              <p className="section-copy">
                The Coming Soon page now explains the whole battlefield without burying visitors in contract language. New users should instantly understand where they fit before they sign up.
              </p>
            </div>
            <div className="role-grid">
              <article className="war-card">
                <div className="war-card__icon">🚀</div>
                <div className="war-card__eyebrow">Creators</div>
                <div className="war-card__title">Prepare campaigns</div>
                <p className="war-card__text">Launch through the bonding curve, push visibility with UpVotes, and compete for weekly attention.</p>
                <ul>
                  <li>Creator-first graduation path</li>
                  <li>Campaign visibility through UpVotes</li>
                  <li>League moments after launch</li>
                </ul>
              </article>
              <article className="war-card">
                <div className="war-card__icon">🪖</div>
                <div className="war-card__eyebrow">Recruiters</div>
                <div className="war-card__title">Build squads</div>
                <p className="war-card__text">Bring creators and traders before the gates open. Your public recruiter profile becomes your battlefield identity.</p>
                <ul>
                  <li>Recruiter code and link</li>
                  <li>Linked creators and traders</li>
                  <li>Weekly claim-based rewards</li>
                </ul>
              </article>
              <article className="war-card">
                <div className="war-card__icon">🔥</div>
                <div className="war-card__eyebrow">Traders</div>
                <div className="war-card__title">Fight the boards</div>
                <p className="war-card__text">Join campaigns, help squads climb, qualify for activity-based systems, and keep the market moving.</p>
                <ul>
                  <li>Trader activity matters</li>
                  <li>Squad Pool contribution scoring</li>
                  <li>Warzone Airdrop eligibility path</li>
                </ul>
              </article>
            </div>
          </section>

          <section className="section-block" aria-labelledby="flow-title">
            <div className="section-head">
              <div className="section-kicker">How it works</div>
              <h2 className="section-title" id="flow-title">From launch to league war.</h2>
            </div>
            <div className="flow-grid">
              <article className="flow-step">
                <div className="flow-step__number">1</div>
                <div className="flow-step__title">Creator launches</div>
                <p className="flow-step__text">Campaigns start on-platform and build through the bonding curve.</p>
              </article>
              <article className="flow-step">
                <div className="flow-step__number">2</div>
                <div className="flow-step__title">Community pushes</div>
                <p className="flow-step__text">UpVotes create transparent discovery and help campaigns fight for visibility.</p>
              </article>
              <article className="flow-step">
                <div className="flow-step__number">3</div>
                <div className="flow-step__title">Squads compete</div>
                <p className="flow-step__text">Recruiters, creators, and traders rally around campaigns and build public standings.</p>
              </article>
              <article className="flow-step">
                <div className="flow-step__number">4</div>
                <div className="flow-step__title">Leagues pay attention</div>
                <p className="flow-step__text">Weekly and monthly epochs create winners, finals, claims, and new content beats.</p>
              </article>
            </div>
          </section>

          <section className="section-block" id="recruiter-signup" aria-labelledby="recruiter-title">
            <div className="section-head">
              <div className="section-kicker">Recruiter Program</div>
              <h2 className="section-title" id="recruiter-title">Recruiters form the first squads before launch.</h2>
              <p className="section-copy">
                The existing recruiter signup logic stays untouched. This section gives it a stronger home, clearer reason to apply, and more entry points from the hero and footer.
              </p>
            </div>
            <div className="recruiter-layout">
              <div className="feature-grid feature-grid--two">
                <article className="war-card">
                  <div className="war-card__eyebrow">Attribution</div>
                  <div className="war-card__title">Recruiter links matter</div>
                  <p className="war-card__text">Visitors can arrive through recruiter links and later lock attribution when they connect as creators or traders.</p>
                </article>
                <article className="war-card">
                  <div className="war-card__eyebrow">Public status</div>
                  <div className="war-card__title">Profiles and leaderboards</div>
                  <p className="war-card__text">Recruiters get public identity, linked-user stats, and a visible status board as the ecosystem grows.</p>
                </article>
                <article className="war-card">
                  <div className="war-card__eyebrow">Squad upsell</div>
                  <div className="war-card__title">A real reason to recruit</div>
                  <p className="war-card__text">Squad Pool gives recruiters a stronger pitch: traders and creators can benefit from being part of an active squad.</p>
                </article>
                <article className="war-card">
                  <div className="war-card__eyebrow">Claim flow</div>
                  <div className="war-card__title">Weekly settlement</div>
                  <p className="war-card__text">Reward systems are designed around weekly epochs and user-initiated claims through dashboards.</p>
                </article>
              </div>

              <aside className="recruiter-cta-card">
                <div>
                  <div className="recruiter-cta-card__big">Apply</div>
                  <p className="recruiter-cta-card__text">
                    Bring creators. Bring traders. Build your squad before the public battlefield opens.
                  </p>
                </div>
                <div className="hero-actions">
                  <button type="button" className="hero-primary" onClick={() => setRecruiterModalOpen(true)}>Open recruiter form</button>
                  <Link to="/recruiter/portal" className="hero-secondary">Recruiter sign in</Link>
                </div>
              </aside>
            </div>
          </section>

          <section className="section-block" id="leagues" aria-labelledby="leagues-title">
            <div className="section-head">
              <div className="section-kicker">Battle Leagues</div>
              <h2 className="section-title" id="leagues-title">The launch is only the first shot.</h2>
              <p className="section-copy">
                Weekly and monthly Leagues turn platform activity into recurring events: standings, finals, winners, content, and prize-pool pressure that keeps communities active.
              </p>
            </div>
            <div className="league-strip">
              <div className="league-tile"><strong>Weekly</strong><span>Fast recurring competitions and fresh social moments.</span></div>
              <div className="league-tile"><strong>Monthly</strong><span>Bigger finals and stronger leaderboard pressure.</span></div>
              <div className="league-tile"><strong>UpVotes</strong><span>Transparent discovery that helps campaigns fight for attention.</span></div>
              <div className="league-tile"><strong>Activity</strong><span>Prize pools and rewards are connected to real platform usage.</span></div>
            </div>
          </section>

          <section className="section-block" id="rewards" aria-labelledby="rewards-title">
            <div className="section-head">
              <div className="section-kicker">Reward systems</div>
              <h2 className="section-title" id="rewards-title">Squads eat. Active soldiers get a shot.</h2>
              <p className="section-copy">
                The page should make the incentive stack easy to understand: recruiters earn from linked activity, active squad members compete for Squad Pool rewards, and smaller active users can qualify for Warzone BNB Airdrops.
              </p>
            </div>
            <div className="feature-grid feature-grid--two">
              <article className="war-card">
                <div className="war-card__icon">🏆</div>
                <div className="war-card__eyebrow">Squad Pool</div>
                <div className="war-card__title">Contribution-based squad rewards</div>
                <p className="war-card__text">No equal split and no empty member farming. Eligible members share based on trader and creator contribution.</p>
              </article>
              <article className="war-card">
                <div className="war-card__icon">🎯</div>
                <div className="war-card__eyebrow">Warzone Airdrops</div>
                <div className="war-card__title">Built for active smaller users</div>
                <p className="war-card__text">Airdrops target real weekly activity, with trader and creator buckets, caps, cooldowns, and anti-abuse filters.</p>
              </article>
              <article className="war-card">
                <div className="war-card__icon">🧭</div>
                <div className="war-card__eyebrow">Recruiter rewards</div>
                <div className="war-card__title">Build the network</div>
                <p className="war-card__text">Recruiters help creators and traders enter the Warzone, then track status through public and dashboard surfaces.</p>
              </article>
              <article className="war-card">
                <div className="war-card__icon">🛡️</div>
                <div className="war-card__eyebrow">Anti-farm logic</div>
                <div className="war-card__title">Real activity only</div>
                <p className="war-card__text">Self-trading, circular wallets, fake demand, and farming loops are excluded from reward systems.</p>
              </article>
            </div>
          </section>

          <section className="section-block" id="security" aria-labelledby="security-title">
            <div className="section-head">
              <div className="section-kicker">Built against rug culture</div>
              <h2 className="section-title" id="security-title">Rug culture gets no home field here.</h2>
              <p className="section-copy">
                The trust section keeps the copy simple: no dev-wallet custody story, treasury-owned routing, separated reward buckets, and visible claim/status flows.
              </p>
            </div>
            <div className="security-grid">
              <article className="war-card">
                <div className="war-card__title">Treasury-first control</div>
                <p className="war-card__text">Protocol and reward flows are designed around treasury-controlled routing instead of direct personal wallet custody.</p>
              </article>
              <article className="war-card">
                <div className="war-card__title">Separated reward buckets</div>
                <p className="war-card__text">League, Recruiter, Community Rewards, Squad Pool, Airdrop, and Protocol revenue paths can be explained clearly.</p>
              </article>
              <article className="war-card">
                <div className="war-card__title">Claim-based rewards</div>
                <p className="war-card__text">Rewards are designed around weekly epochs, public status, eligibility states, and dashboard claim flows.</p>
              </article>
              <article className="war-card">
                <div className="war-card__title">No fake transparency</div>
                <p className="war-card__text">Users should see eligibility, claims, rankings, and broad exclusion reasons without exposing private anti-abuse thresholds.</p>
              </article>
            </div>
          </section>

          <section className="section-block" aria-labelledby="timeline-title">
            <div className="section-head">
              <div className="section-kicker">Prepare Mode timeline</div>
              <h2 className="section-title" id="timeline-title">The first mission is positioning.</h2>
            </div>
            <div className="timeline">
              <div className="timeline-step">
                <div className="timeline-step__phase">Now</div>
                <div>
                  <div className="timeline-step__title">Recruiters form squads</div>
                  <p className="timeline-step__text">Early recruiters apply, prepare their links, and start organizing creator and trader networks.</p>
                </div>
              </div>
              <div className="timeline-step">
                <div className="timeline-step__phase">Prepare Mode</div>
                <div>
                  <div className="timeline-step__title">Creators and soldiers get ready</div>
                  <p className="timeline-step__text">Campaign plans, squad positioning, social channels, and early community activity line up before full launch.</p>
                </div>
              </div>
              <div className="timeline-step">
                <div className="timeline-step__phase">Launch</div>
                <div>
                  <div className="timeline-step__title">Battle Leagues open</div>
                  <p className="timeline-step__text">Campaigns fight for visibility, squads climb standings, and weekly reward/claim loops begin.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="section-block" aria-labelledby="faq-title">
            <div className="section-head">
              <div className="section-kicker">Fast answers</div>
              <h2 className="section-title" id="faq-title">No wall of docs. Just the battlefield basics.</h2>
            </div>
            <div className="faq-grid">
              <article className="war-card">
                <div className="war-card__title">Do I need to be a recruiter?</div>
                <p className="war-card__text">No. Creators and traders can still join. Recruiters are for people who want to build squads and bring users into the ecosystem.</p>
              </article>
              <article className="war-card">
                <div className="war-card__title">Can solo users qualify for rewards?</div>
                <p className="war-card__text">Yes. Warzone BNB Airdrops are designed for active smaller users, including solo users that meet eligibility rules.</p>
              </article>
              <article className="war-card">
                <div className="war-card__title">Why squads?</div>
                <p className="war-card__text">Squads give recruiters, creators, and traders a shared reason to push real activity instead of one-off hype.</p>
              </article>
              <article className="war-card">
                <div className="war-card__title">Where do I follow updates?</div>
                <p className="war-card__text">Join X, Telegram, Discord, and the docs. The social buttons stay visible so the page still converts visitors into community members.</p>
              </article>
            </div>
          </section>

          <section className="cta" aria-label="MemeWarzone social links">
            <SocialButton href={X_URL} label="Follow on X" icon={<IconX />} />
            <SocialButton href={TG_URL} label="Join Telegram" icon={<IconTelegram />} />
            <SocialButton href={DC_URL} label="Join Discord" icon={<IconDiscord />} />
            <SocialButton href={DOCS_URL} label="Docs" icon={<IconDocs />} />
          </section>
        </div>
      </main>

      {referralGateActive ? (
        <div className="referral-gate" role="dialog" aria-modal="true" aria-labelledby="referral-gate-title">
          <div className="referral-gate__backdrop" aria-hidden="true" />
          <div className="referral-gate__panel">
            <div className="referral-gate__eyebrow">Squad invite detected</div>
            <h2 className="referral-gate__title" id="referral-gate-title">
              Join recruiter <span>{referralStatus.code || referralCodeHint}</span>
            </h2>
            <p className="referral-gate__text">
              You arrived through a recruiter invite. Connect your wallet here as a creator or trader to lock that attribution in.
            </p>
            <div className="referral-gate__warning">
              This flow is for <strong>creators and traders</strong>. Recruiters should use the recruiter application or recruiter sign-in instead.
            </div>

            {checkingReferral ? (
              <div className="dashboard-results-meta">Checking recruiter invite and preparing your creator/trader connect flow...</div>
            ) : referralStatus.isBound ? (
              <>
                <div className="referral-bound">
                  Wallet already linked as <strong>{referralStatus.binding?.role || 'unknown'}</strong> under recruiter <strong>{referralStatus.code || referralCodeHint}</strong>.
                </div>
                <div className="referral-gate__actions">
                  <button type="button" className="hero-callout__button" onClick={() => setReferralGateDismissed(true)}>
                    Continue to site
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="referral-role-switch referral-role-switch--gate">
                  <button type="button" className={`mini-toggle ${referralRole === 'creator' ? 'mini-toggle--active' : ''}`} onClick={() => setReferralRole('creator')}>
                    I’m a creator
                  </button>
                  <button type="button" className={`mini-toggle ${referralRole === 'trader' ? 'mini-toggle--active' : ''}`} onClick={() => setReferralRole('trader')}>
                    I’m a trader
                  </button>
                </div>
                <button type="button" className="hero-callout__button referral-gate__primary" onClick={() => void bindReferral()} disabled={referralLoading}>
                  {referralLoading ? 'Waiting for signature...' : 'Connect wallet & lock referral'}
                </button>
                <div className="referral-gate__actions">
                  <button type="button" className="hero-callout__button hero-callout__button--ghost" onClick={() => setReferralGateDismissed(true)}>
                    Continue without connecting
                  </button>
                </div>
              </>
            )}

            {referralMessage ? <div className="dashboard-results-meta">{referralMessage}</div> : null}
          </div>
        </div>
      ) : null}

      <footer className="footer footer--war-room">
        <div className="footer-cta">
          <div>
            <strong>Recruiters:</strong> form your squad before the Warzone opens.
          </div>
          <button type="button" className="hero-primary" onClick={() => setRecruiterModalOpen(true)}>Become a Recruiter</button>
        </div>
        <div className="footer-links">
          <a className="link-pill" href={X_URL} target="_blank" rel="noreferrer">X</a>
          <a className="link-pill" href={TG_URL} target="_blank" rel="noreferrer">Telegram</a>
          <a className="link-pill" href={DC_URL} target="_blank" rel="noreferrer">Discord</a>
          <a className="link-pill" href={DOCS_URL} target="_blank" rel="noreferrer">Docs</a>
        </div>
        <div className="footer__left">© {new Date().getFullYear()} MemeWarzone 2026. All rights reserved.</div>
        {STATUS ? <div className="footer__right">{STATUS}</div> : null}
      </footer>

      <CookieBar />
    </div>
  )
}
