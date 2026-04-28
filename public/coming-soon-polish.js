(() => {
  const css = `
    .war-hero {
      align-items: stretch !important;
    }

    .war-hero__copy {
      align-self: center;
    }

    .command-panel {
      align-self: stretch;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
      background:
        linear-gradient(180deg, rgba(26, 19, 14, 0.94), rgba(4, 4, 6, 0.86)),
        repeating-linear-gradient(135deg, rgba(246, 211, 124, 0.035) 0 1px, transparent 1px 12px) !important;
    }

    .command-panel::before {
      content: "";
      position: absolute;
      inset: 10px;
      border: 1px solid rgba(246, 211, 124, 0.08);
      border-radius: 22px;
      pointer-events: none;
    }

    .command-panel__top {
      flex-shrink: 0;
    }

    .command-panel__body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .radar-card {
      flex: 1;
      min-height: clamp(340px, 42vw, 460px) !important;
      overflow: hidden;
    }

    .radar-card__logo img {
      width: min(340px, 64%) !important;
      max-height: 82%;
      object-fit: contain;
    }

    .radar-card__tag {
      left: 50% !important;
      bottom: 18px !important;
      transform: translateX(-50%);
      white-space: nowrap;
      background: rgba(0, 0, 0, 0.72) !important;
    }

    .panel-grid {
      flex-shrink: 0;
    }

    .panel-stat {
      background:
        linear-gradient(180deg, rgba(246, 211, 124, 0.07), rgba(0, 0, 0, 0.22)) !important;
      border-left: 2px solid rgba(246, 211, 124, 0.28) !important;
    }

    .section-block {
      position: relative;
      overflow: hidden;
    }

    .section-block::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, rgba(246, 211, 124, 0.05), transparent 28%),
        repeating-linear-gradient(135deg, transparent 0 24px, rgba(255, 90, 31, 0.025) 24px 25px);
      pointer-events: none;
    }

    .section-block > * {
      position: relative;
      z-index: 1;
    }

    .section-kicker {
      display: inline-flex;
      align-items: center;
      gap: 9px;
    }

    .section-kicker::before {
      content: "MWZ";
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 22px;
      padding: 0 8px;
      border-radius: 999px;
      border: 1px solid rgba(246, 211, 124, 0.2);
      background: rgba(246, 211, 124, 0.075);
      color: rgba(255, 247, 235, 0.7);
      font-size: 10px;
      letter-spacing: 0.12em;
    }

    .war-card {
      position: relative;
      border-radius: 18px !important;
      border-color: rgba(246, 211, 124, 0.16) !important;
      background:
        linear-gradient(180deg, rgba(18, 14, 11, 0.78), rgba(4, 4, 6, 0.42)) !important;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
    }

    .war-card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 18px;
      right: 18px;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(246, 211, 124, 0.42), transparent);
    }

    .war-card__icon {
      background:
        linear-gradient(180deg, rgba(246, 211, 124, 0.12), rgba(255, 90, 31, 0.08)) !important;
      transform: rotate(-2deg);
    }

    .league-tile,
    .flow-step,
    .timeline-step {
      border-radius: 16px !important;
      background:
        linear-gradient(180deg, rgba(246, 211, 124, 0.045), rgba(0, 0, 0, 0.26)) !important;
    }

    .hero-primary,
    .hero-secondary,
    .link-pill {
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-size: 13px;
    }

    .cta[aria-label="MemeWarzone social links"] {
      display: none !important;
    }

    @media (max-width: 980px) {
      .command-panel {
        min-height: auto;
      }

      .radar-card {
        min-height: 320px !important;
      }
    }

    @media (max-width: 700px) {
      .radar-card {
        min-height: 280px !important;
      }

      .radar-card__logo img {
        width: min(260px, 74%) !important;
      }
    }
  `

  const replacements = new Map([
    ['Rug culture gets no home field here.', 'Built to fight the usual launchpad games.'],
    ['The trust section keeps the copy simple: no dev-wallet custody story, treasury-owned routing, separated reward buckets, and visible claim/status flows.', 'MemeWarzone is built around treasury-owned routing, separated reward buckets, visible claim states, and anti-abuse rules that protect real activity.'],
    ['The page should make the incentive stack easy to understand: recruiters earn from linked activity, active squad members compete for Squad Pool rewards, and smaller active users can qualify for Warzone BNB Airdrops.', 'The incentive stack is simple on the surface: recruiters build the network, active squads fight for pooled upside, and smaller real users get a weekly shot through Warzone BNB Airdrops.'],
    ['The Coming Soon page now explains the whole battlefield without burying visitors in contract language. New users should instantly understand where they fit before they sign up.', 'Choose your lane before the gates open. Creators prepare campaigns, recruiters build squads, and traders join the first wave.'],
    ['The existing recruiter signup logic stays untouched. This section gives it a stronger home, clearer reason to apply, and more entry points from the hero and footer.', 'Recruiters get a clear mission: bring creators, bring traders, and form squads before the full Warzone opens.'],
    ['No wall of docs. Just the battlefield basics.', 'The battlefield basics. No fluff.']
  ])

  function injectStyle() {
    if (document.getElementById('mwz-coming-soon-polish')) return
    const style = document.createElement('style')
    style.id = 'mwz-coming-soon-polish'
    style.textContent = css
    document.head.appendChild(style)
  }

  function replaceText(root = document.body) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    const nodes = []
    let current = walker.nextNode()

    while (current) {
      nodes.push(current)
      current = walker.nextNode()
    }

    for (const node of nodes) {
      const original = node.nodeValue || ''
      let next = original
      for (const [from, to] of replacements.entries()) {
        next = next.split(from).join(to)
      }
      if (next !== original) node.nodeValue = next
    }
  }

  function polish() {
    injectStyle()
    replaceText()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', polish, { once: true })
  } else {
    polish()
  }

  const observer = new MutationObserver(() => polish())
  observer.observe(document.documentElement, { childList: true, subtree: true })
})()
