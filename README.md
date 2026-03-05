# Spirit Shield Keeper

Real-time community-driven emergency safety app for Namibia. Report incidents, receive alerts, and stay connected with your neighborhood.

## Features

- **Panic Alerts** — One-tap emergency broadcasting with live audio recording and GPS tracking
- **Amber Alerts** — Missing person reports with photo upload, outfit description, and vehicle details
- **Live Map** — Real-time incident map powered by Mapbox with heatmap layers and incident markers
- **Community Feed** — Neighbourhood posts with incident keyword detection
- **Look After Me** — Trip tracking with ETA monitoring and auto-escalation
- **Watchers** — Trusted contacts who receive your emergency alerts
- **Direct Messages** — Private chat between community members
- **Safety Dashboard** — Personal safety insights, credibility scores, and achievements
- **Push Notifications** — Real-time alerts via service worker

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Framer Motion, shadcn/ui
- **Backend:** Supabase (Auth, Database, Storage, Edge Functions, Realtime)
- **Maps:** Mapbox GL JS
- **State:** TanStack React Query
- **Build:** Vite

## Local Setup

```bash
git clone <repo-url>
cd spirit-shield-keeper
npm install
cp .env.example .env
# Fill in your Supabase credentials in .env
npm run dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint (fails on warnings) |

## Deployment

### Netlify
The `public/_redirects` file handles SPA routing automatically.

### Vercel
The `vercel.json` file handles SPA routing and asset caching.

## Architecture

See `docs/ARCHITECTURE.md` for detailed architecture documentation.

## License

MIT
