# MemeBattles — Coming Soon Landing

A lightweight Vite + React landing page that matches the MemeBattles dark / fire / gold vibe and includes social buttons (X, Telegram, Discord).

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

## Swap branding assets

- Logo: `public/logo.svg`
- Favicon: `public/favicon.ico`
- OpenGraph image: `public/og.png`

## Deploy to Vercel

- Build command: `npm run build`
- Output directory: `dist`

For SPA routing on Vercel, `vercel.json` already rewrites all routes to `/`.
