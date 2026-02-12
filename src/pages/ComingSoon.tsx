import SocialButton from '../components/SocialButton'
import { SpaceBackground } from '../components/SpaceBackground'

const X_URL = (import.meta.env.VITE_X_URL as string) || 'https://x.com/'
const TG_URL = (import.meta.env.VITE_TELEGRAM_URL as string) || 'https://t.me/'
const DC_URL = (import.meta.env.VITE_DISCORD_URL as string) || 'https://discord.gg/T7Sp6nSM'
const DOCS_URL = (import.meta.env.VITE_DOCS_URL as string) || 'https://docs.memebattles.gg'
const STATUS = (import.meta.env.VITE_STATUS_TEXT as string) || ''

function IconDocs() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6.5 4.5H18c.83 0 1.5.67 1.5 1.5v14c0 .83-.67 1.5-1.5 1.5H6.5A2.5 2.5 0 0 1 4 19V7A2.5 2.5 0 0 1 6.5 4.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M7 8h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 12h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 16h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M18.9 2H21.9L15.4 9.4L23 22H17.4L13 14.8L6.7 22H3.7L10.8 13.9L3.5 2H9.2L13.2 8.6L18.9 2Z"
        fill="currentColor"
      />
    </svg>
  )
}

function IconTelegram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9.6 15.4L9.3 19.4C9.7 19.4 9.9 19.2 10.2 18.9L12.1 17.1L16.1 20C16.8 20.4 17.3 20.2 17.5 19.3L20.9 4.9C21.1 3.8 20.5 3.4 19.8 3.7L2.7 10.3C1.6 10.7 1.6 11.2 2.5 11.5L6.9 12.9L17.1 6.5C17.6 6.2 18.1 6.4 17.7 6.8L9.6 15.4Z"
        fill="currentColor"
      />
    </svg>
  )
}

function IconDiscord() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M19.5 5.2C18.1 4.5 16.7 4 15.2 3.7L15 4.1C16.3 4.5 17.5 5 18.7 5.7C17.4 5.1 16.1 4.7 14.7 4.4C13.1 4.1 11.5 4.1 9.9 4.4C8.5 4.7 7.2 5.1 5.9 5.7C7.1 5 8.3 4.5 9.6 4.1L9.4 3.7C7.9 4 6.5 4.5 5.1 5.2C2.7 8.8 2 12.3 2.3 15.8C3.7 16.8 5.2 17.5 6.8 17.9C7.2 17.4 7.6 16.8 7.9 16.3C7.3 16.1 6.7 15.8 6.2 15.5L6.5 15.3C7.9 16 9.4 16.5 10.9 16.7C12.5 16.9 14.1 16.9 15.7 16.7C17.3 16.5 18.8 16 20.2 15.3L20.5 15.5C20 15.8 19.4 16.1 18.8 16.3C19.1 16.8 19.5 17.4 19.9 17.9C21.5 17.5 23 16.8 24.4 15.8C24.8 11.9 23.8 8.4 19.5 5.2ZM8.5 14.3C7.6 14.3 6.9 13.5 6.9 12.6C6.9 11.7 7.6 10.9 8.5 10.9C9.4 10.9 10.1 11.7 10.1 12.6C10.1 13.5 9.4 14.3 8.5 14.3ZM15.9 14.3C15 14.3 14.3 13.5 14.3 12.6C14.3 11.7 15 10.9 15.9 10.9C16.8 10.9 17.5 11.7 17.5 12.6C17.5 13.5 16.8 14.3 15.9 14.3Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function ComingSoon() {
  return (
    <div className="page">
      <SpaceBackground particleCount={450} particleColor="rgba(175, 127, 35, 0.8)" backgroundColor="#000" />

      <header className="top">
        <div className="top__brand">
          <img className="top__logo" src="/logo.png" alt="MemeBattles" />
        </div>
        <div className="top__pill">BNB Chain • Launchpad • Leagues</div>
      </header>

      <main className="main">
        <section className="hero">
          <div className="badge">⚔️ The arena opens soon</div>
          <h1 className="h1">
            MemeBattles is
            <span className="h1__accent"> coming soon</span>
          </h1>
          <p className="lead">
            A creator-first meme launchpad where every launch becomes a competition — UpVotes drive discovery and on-chain
            leagues turn launches into repeatable events.
          </p>

          <div className="cta">
            <SocialButton href={X_URL} label="Follow on X" icon={<IconX />} />
            <SocialButton href={TG_URL} label="Join Telegram" icon={<IconTelegram />} />
            <SocialButton href={DC_URL} label="Join Discord" icon={<IconDiscord />} />
            <SocialButton href={DOCS_URL} label="Docs" icon={<IconDocs />} />
          </div>

          <div className="cards">
            <div className="card">
              <div className="card__title">Launch in seconds</div>
              <div className="card__text">Create a campaign, watch the bonding curve fill, and graduate into liquidity.</div>
            </div>
            <div className="card">
              <div className="card__title">UpVote-driven discovery</div>
              <div className="card__text">Transparent, paid promotion that pushes real demand into ranking and visibility.</div>
            </div>
            <div className="card">
              <div className="card__title">Weekly & monthly leagues</div>
              <div className="card__text">Recurring finals and winners that create content beats and bring communities back.</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer__left">© {new Date().getFullYear()} MemeBattles. All rights reserved.</div>
        {STATUS ? <div className="footer__right">{STATUS}</div> : null}
      </footer>
    </div>
  )
}
