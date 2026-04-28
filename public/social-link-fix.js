(() => {
  const TELEGRAM_URL = 'https://t.me/memewarzonehq'

  function normalizeTelegramLinks() {
    document.querySelectorAll('a[href*="t.me"], a[href*="telegram.me"]').forEach((anchor) => {
      anchor.setAttribute('href', TELEGRAM_URL)
      anchor.setAttribute('target', '_blank')
      anchor.setAttribute('rel', 'noreferrer')
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', normalizeTelegramLinks, { once: true })
  } else {
    normalizeTelegramLinks()
  }

  const observer = new MutationObserver(normalizeTelegramLinks)
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] })
})()
