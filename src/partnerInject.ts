const PARTNER_CARD_ID = 'mwz-crypticpump-partner-card'
const PARTNER_STYLE_ID = 'mwz-crypticpump-partner-style'
const CRYPTIC_PUMP_URL = 'https://CrypticPump.com'
const CRYPTIC_PUMP_IMAGE = '/crypicpump.jpg'

function injectPartnerStyles() {
  if (document.getElementById(PARTNER_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = PARTNER_STYLE_ID
  style.textContent = `
    .partner-card {
      margin-top: 18px;
      width: min(760px, 100%);
      display: grid;
      grid-template-columns: 150px minmax(0, 1fr);
      align-items: stretch;
      overflow: hidden;
      border-radius: 22px;
      border: 1px solid rgba(246, 211, 124, 0.24);
      background: linear-gradient(180deg, rgba(18, 14, 16, 0.82), rgba(8, 8, 10, 0.68));
      box-shadow: 0 22px 80px rgba(0, 0, 0, 0.42);
      backdrop-filter: blur(12px);
      text-align: left;
      transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
    }

    .partner-card:hover {
      transform: translateY(-1px);
      border-color: rgba(246, 211, 124, 0.42);
      background: linear-gradient(180deg, rgba(24, 18, 16, 0.9), rgba(8, 8, 10, 0.74));
    }

    .partner-card__image-wrap {
      position: relative;
      width: 150px;
      height: 150px;
      min-height: 150px;
      background: radial-gradient(circle at 50% 28%, rgba(246, 211, 124, 0.18), rgba(0, 0, 0, 0.92) 62%);
      overflow: hidden;
    }

    .partner-card__image {
      position: relative;
      z-index: 1;
      width: 150px;
      height: 150px;
      display: block;
      object-fit: contain;
      object-position: center;
    }

    .partner-card__fallback {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      color: rgba(246, 211, 124, 0.92);
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      text-align: center;
    }

    .partner-card__content {
      padding: 18px 20px 16px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .partner-card__eyebrow {
      width: fit-content;
      padding: 7px 10px;
      border-radius: 999px;
      border: 1px solid rgba(246, 211, 124, 0.24);
      background: rgba(246, 211, 124, 0.1);
      color: rgba(246, 211, 124, 0.96);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .partner-card__title {
      margin-top: 10px;
      font-size: 24px;
      font-weight: 900;
      color: rgba(255, 247, 235, 0.96);
    }

    .partner-card__text {
      margin-top: 5px;
      color: rgba(255, 247, 235, 0.74);
      line-height: 1.45;
    }

    @media (max-width: 640px) {
      .partner-card {
        grid-template-columns: 1fr;
        width: min(330px, 100%);
        text-align: center;
      }

      .partner-card__image-wrap {
        width: 150px;
        height: 150px;
        min-height: 150px;
        justify-self: center;
      }

      .partner-card__content {
        align-items: center;
      }
    }
  `
  document.head.appendChild(style)
}

function buildPartnerCard() {
  const card = document.createElement('a')
  card.id = PARTNER_CARD_ID
  card.className = 'partner-card'
  card.href = CRYPTIC_PUMP_URL
  card.target = '_blank'
  card.rel = 'noopener noreferrer'
  card.setAttribute('aria-label', 'Visit CrypticPump, official MemeWarzone partner')

  card.innerHTML = `
    <div class="partner-card__image-wrap">
      <div class="partner-card__fallback">CrypticPump</div>
      <img class="partner-card__image" src="${CRYPTIC_PUMP_IMAGE}" alt="CrypticPump" />
    </div>
    <div class="partner-card__content">
      <div class="partner-card__eyebrow">Official Partner</div>
      <div class="partner-card__title">CrypticPump</div>
      <div class="partner-card__text">Get listed. Get seen. Join the warzone.</div>
    </div>
  `

  const image = card.querySelector<HTMLImageElement>('.partner-card__image')
  image?.addEventListener('error', () => {
    image.style.display = 'none'
  })

  return card
}

function injectPartnerCard() {
  if (document.getElementById(PARTNER_CARD_ID)) return true

  const heroCallout = document.querySelector('.hero-callout')
  if (!heroCallout?.parentNode) return false

  injectPartnerStyles()
  heroCallout.parentNode.insertBefore(buildPartnerCard(), heroCallout.nextSibling)
  return true
}

let attempts = 0
const interval = window.setInterval(() => {
  attempts += 1
  if (injectPartnerCard() || attempts > 40) {
    window.clearInterval(interval)
  }
}, 100)
