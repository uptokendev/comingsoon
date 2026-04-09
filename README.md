# MemeWarzone — Coming Soon + Recruiter Referral Stack

A lightweight Vite + React landing page with Netlify Functions and a Supabase-backed recruiter / referral flow.

This repo now includes:

- early recruiter onboarding popup
- recruiter reviewer page at `/hq/recruiters`
- recruiter wallet-signature portal at `/recruiter/portal`
- referral short links at `/r/<CODE>`
- universal deep-link attribution with `?ref=<CODE>`
- wallet-signature bind flow for creators / traders
- squad tracking for each approved recruiter
- bottom cookie / storage consent bar

## Quickstart

```bash
npm i
cp .env.example .env
npm run dev
```

For local testing with functions, use `netlify dev` rather than plain `vite` so the `/api/*` routes work.

## Configure social links

Edit `.env`:

- `VITE_X_URL`
- `VITE_TELEGRAM_URL`
- `VITE_DISCORD_URL`
- `VITE_DOCS_URL`
- `VITE_STATUS_TEXT`
- `VITE_APP_BASE_URL`

## Database setup

Run these in Supabase SQL Editor, in this order:

1. `db/recruiter_waitlist.sql`
2. `db/recruiter_referrals.sql`
3. `db/recruiter_approval_email.sql`

The second file extends the recruiter table with a recruiter code and adds the referral/session tables:

- `ref_sessions`
- `wallet_nonces`
- `ref_wallets`

## Required Netlify env vars

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RECRUITER_TABLE` (optional, defaults to `recruiter_waitlist`)
- `RECRUITER_DASHBOARD_TOKEN` (for `/hq/recruiters`)
- `RECRUITER_AUTH_SECRET` (for recruiter wallet sessions)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO` (optional)
- `APP_BASE_URL` (optional, defaults to `https://memewar.zone`)

## Deployed routes

Public:

- `/`
- `/r/:code`
- `/?ref=CODE`

Protected:

- `/hq/recruiters` → reviewer page, token protected
- `/recruiter/portal` → approved recruiter portal, wallet-signature protected

API endpoints:

- `/api/recruiter-waitlist`
- `/api/recruiter-dashboard`
- `/api/recruiter-auth-nonce`
- `/api/recruiter-auth-verify`
- `/api/recruiter-logout`
- `/api/recruiter-portal`
- `/api/ref-visit`
- `/api/ref-refresh`
- `/api/ref-status`
- `/api/ref-nonce`
- `/api/ref-bind`

## Approval flow

1. Recruiter applies through the popup.
2. You review them in Supabase or your reviewer page.
3. Set `status = approved` for the application.
4. The reviewer endpoint sends a branded approval email through Resend with a direct link to `/recruiter/portal`.
5. For already-approved recruiters, the reviewer page can manually resend the approval email.
6. On first successful wallet sign-in, the portal auto-generates a unique recruiter code if one does not exist yet.
7. Recruiters can later change that code inside their portal if the new code is still free.

## Referral flow

### Canonical short link

`https://yourdomain/r/CODE`

This captures the referral and redirects back to the landing page.

### Universal deep link

`https://yourdomain/anything?ref=CODE`

This also captures the referral and keeps it alive for 30 days in the same browser/device.

### Bind moment

When a creator or trader connects their wallet from a referred browser:

1. the frontend requests a bind nonce
2. the wallet signs the bind message
3. the backend verifies the signature
4. the wallet is immutably mapped to that recruiter in `ref_wallets`

Self-referrals are rejected. Existing wallet bindings are preserved and not overwritten.

## Recruiter portal

Approved recruiters can:

- sign in with their approved wallet
- view their recruiter code
- copy canonical + deep links
- change their code
- track squad size
- see creators vs traders vs unknown
- share their squad on X or via the browser share API

## Netlify deployment

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

This repo includes both `netlify.toml` and `public/_redirects` so SPA routes and function routes work on Netlify.
