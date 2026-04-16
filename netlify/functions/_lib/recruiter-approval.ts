export type ApprovalEmailRecipient = {
  name: string
  email: string
  wallet_address: string
  recruiter_code?: string | null
}

export function getApprovalEmailConfig() {
  return {
    RESEND_API_KEY: process.env.RESEND_API_KEY || '',
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || '',
    RESEND_REPLY_TO: process.env.RESEND_REPLY_TO || '',
    APP_BASE_URL: process.env.APP_BASE_URL || process.env.VITE_APP_BASE_URL || 'https://memewar.zone',
  }
}

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeBaseUrl(value: string) {
  return String(value || 'https://memewar.zone').trim().replace(/\/$/, '')
}

function buildDashboardUrl(baseUrl: string) {
  return `${normalizeBaseUrl(baseUrl)}/recruiter/portal`
}

function buildApprovalEmail(row: ApprovalEmailRecipient, dashboardUrl: string) {
  const safeName = escapeHtml(row.name || 'Recruiter')
  const safeDashboardUrl = escapeHtml(dashboardUrl)
  const safeWallet = escapeHtml(row.wallet_address)
  const safeCode = escapeHtml(row.recruiter_code || 'Generated after your first login')

  return {
    subject: 'MemeWarzone Recruiter access unlocked',
    text: [
      `Hi ${row.name || 'there'},`,
      '',
      'You are officially approved for the MemeWarzone Recruiter Program.',
      '',
      'Your dashboard is ready:',
      dashboardUrl,
      '',
      'What to do next:',
      '1. Open the recruiter dashboard.',
      '2. Connect the same approved wallet you used on your application.',
      '3. Sign the login message to unlock your recruiter portal.',
      '4. Copy your referral link and start building your squad.',
      '',
      `Approved wallet: ${row.wallet_address}`,
      `Recruiter code: ${row.recruiter_code || 'Generated automatically after first login'}`,
      '',
      'Inside the portal you can manage your code, track your squad, and share your progress publicly.',
      '',
      'Welcome to the Warzone.',
      'MemeWarzone',
    ].join('\n'),
    html: `
      <div style="background:#06090f;padding:32px 16px;font-family:Inter,Arial,sans-serif;color:#e5e7eb;">
        <div style="max-width:680px;margin:0 auto;background:linear-gradient(180deg,#0f1722 0%,#0a1018 100%);border:1px solid rgba(255,255,255,0.08);border-radius:22px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,0.45);">
          <div style="padding:30px 30px 18px;background:linear-gradient(135deg,rgba(34,197,94,0.16),rgba(17,24,39,0) 60%);border-bottom:1px solid rgba(255,255,255,0.06);">
            <div style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#86efac;font-weight:800;">MemeWarzone Recruiter Program</div>
            <h1 style="margin:14px 0 10px;font-size:34px;line-height:1.02;color:#ffffff;">Dashboard unlocked.</h1>
            <p style="margin:0;font-size:16px;line-height:1.75;color:#cbd5e1;max-width:560px;">Hi ${safeName}, your application is approved. You can now enter your recruiter portal, lock in your code, and start building your squad before launch.</p>
          </div>

          <div style="padding:28px 30px 30px;">
            <div style="margin-bottom:22px;">
              <a href="${safeDashboardUrl}" style="display:inline-block;background:#22c55e;color:#04110a;text-decoration:none;padding:14px 20px;border-radius:14px;font-weight:900;font-size:15px;letter-spacing:0.02em;">Open recruiter dashboard</a>
            </div>

            <div style="display:block;margin:0 0 20px;padding:18px 18px 16px;border:1px solid rgba(255,255,255,0.08);border-radius:16px;background:#0b1220;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:#94a3b8;font-weight:700;">Approved wallet</div>
              <div style="margin-top:8px;font-size:14px;line-height:1.65;color:#ffffff;word-break:break-all;">${safeWallet}</div>
              <div style="margin-top:14px;font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:#94a3b8;font-weight:700;">Recruiter code</div>
              <div style="margin-top:8px;font-size:14px;line-height:1.65;color:#ffffff;">${safeCode}</div>
            </div>

            <div style="margin:0 0 20px;padding:18px 18px 8px;border:1px solid rgba(255,255,255,0.08);border-radius:16px;background:#0f172a;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:#86efac;font-weight:800;">What to do next</div>
              <ol style="margin:14px 0 0;padding:0 0 0 18px;color:#dbe4ef;line-height:1.9;font-size:14px;">
                <li>Open your recruiter dashboard.</li>
                <li>Connect the exact wallet you used on your application.</li>
                <li>Sign the login message to unlock your portal.</li>
                <li>Copy your referral link, onboard creators and traders, and grow your squad.</li>
              </ol>
            </div>

            <div style="padding:18px;border:1px solid rgba(255,255,255,0.08);border-radius:16px;background:#111827;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:#94a3b8;font-weight:700;">Inside your portal</div>
              <p style="margin:10px 0 0;font-size:14px;line-height:1.8;color:#cbd5e1;">Track your squad size, manage your recruiter code, generate referral links, and share your progress publicly to flex your growth before launch.</p>
            </div>

            <p style="margin:24px 0 0;font-size:14px;line-height:1.8;color:#cbd5e1;">Welcome to the Warzone,<br />MemeWarzone</p>
          </div>
        </div>
      </div>
    `,
  }
}

export async function sendApprovalEmail(row: ApprovalEmailRecipient, config = getApprovalEmailConfig()) {
  if (!config.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured.')
  if (!config.RESEND_FROM_EMAIL) throw new Error('RESEND_FROM_EMAIL is not configured.')
  if (!row.email) throw new Error('This applicant does not have an email address.')

  const dashboardUrl = buildDashboardUrl(config.APP_BASE_URL)
  const email = buildApprovalEmail(row, dashboardUrl)
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: config.RESEND_FROM_EMAIL,
      to: [row.email],
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(config.RESEND_REPLY_TO ? { reply_to: [config.RESEND_REPLY_TO] } : {}),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || 'Resend rejected the email request.')
  }

  return response.json().catch(() => ({}))
}
