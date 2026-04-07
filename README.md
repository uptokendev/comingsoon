# MemeWarzone — Coming Soon Landing

A lightweight Vite + React landing page that matches the MemeWarzone dark / fire / gold vibe and now includes:

- early recruiter onboarding popup
- hero fallback CTA for the same recruiter form
- bottom cookie / storage consent bar
- serverless recruiter endpoints that write recruiter applications into Supabase

## Quickstart

```bash
npm i
cp .env.example .env
npm run dev
```

## Configure social links

Edit `.env`:

- `VITE_X_URL`
- `VITE_TELEGRAM_URL`
- `VITE_DISCORD_URL`
- `VITE_DOCS_URL`
- `VITE_STATUS_TEXT`

## Recruiter database setup

1. Run `db/recruiter_waitlist.sql` in Supabase SQL editor.
2. Set these project env vars in Netlify or Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RECRUITER_TABLE` (optional, defaults to `recruiter_waitlist`)
3. Deploy.

The form posts to `/api/recruiter-waitlist`, validates the core fields, and inserts a row into Supabase using the service role key on the server only.

## Current recruiter fields

Required:

- Name
- X handle
- Telegram handle
- Main BNB wallet address
- Email
- Contact / review consent checkbox

Optional:

- Focus (creators, traders, or both)
- Country / region
- Languages
- Short note

## Popup behavior

- opens automatically on first visit
- if dismissed, it stays hidden for 7 days
- if submitted successfully, it stops showing
- hero CTA can reopen it anytime

## Cookie / storage behavior

The site currently stores:

- popup dismissal state
- recruiter form draft state
- cookie / storage preference state

Optional analytics are not loaded unless the visitor accepts them.

## Swap branding assets

- Logo: `public/logo.png`
- Favicon: `public/favicon.ico`
- OpenGraph image: `public/og.png`

## Deploy

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

The repo includes `public/_redirects` so `/hq/recruiters` works as an SPA route and `/api/*` is proxied to the Netlify Functions.

### Vercel

- Build command: `npm run build`
- Output directory: `dist`

`vercel.json` keeps SPA routing working there as well.


## Recruiter reviewer dashboard

A small protected reviewer page is available at `/hq/recruiters`.

Set this server-side env var:

- `RECRUITER_DASHBOARD_TOKEN`

How it works:

- open `/hq/recruiters`
- enter the token
- the page loads submissions from Supabase through the protected `/api/recruiter-dashboard` route

Notes:

- the token is validated server-side
- you can save reviewer notes
- you can move applications between `new`, `reviewing`, `approved`, and `rejected`
- the browser stores the token locally for convenience until you clear it
