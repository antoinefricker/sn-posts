# sn-posts

A React + TypeScript web app built with [Vite](https://vite.dev), linted with [Oxlint](https://oxc.rs), and deployed on [Vercel](https://vercel.com).

## Getting started

Requires Node 24 (see `.nvmrc`).

```bash
npm install
npm run dev
```

| Command           | Description                         |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Start the dev server with HMR       |
| `npm run build`   | Type-check and build to `dist/`     |
| `npm run preview` | Serve the production build locally  |
| `npm run lint`    | Lint with Oxlint                    |

## Authentication (Supabase)

Users sign up with **name, club ID, email and password** and sign in with email and password. Auth is handled by Supabase Auth; name and club ID are stored in `public.profiles` (created by a database trigger at sign-up, readable and editable only by its owner via row-level security). Email confirmation is off.

Schema lives in [`supabase/migrations`](supabase/migrations). To run it locally (requires Docker):

```bash
npx supabase start     # starts the local stack and applies migrations
npx supabase status    # shows the API URL and publishable key
cp .env.example .env.local   # then fill in VITE_SUPABASE_ANON_KEY
npm run dev
```

`npx supabase db reset` rebuilds the local database from the migrations; `npx supabase stop` shuts the stack down.

## Deploying to Vercel

### Prerequisites

- Node 24 (pinned in `package.json` `engines` and `.nvmrc`)
- The Vercel CLI: `npm i -g vercel`

### Configuration

Project settings live in [`vercel.ts`](vercel.ts) (via `@vercel/config`):

- **Build**: Vite framework preset, `npm run build`, output in `dist/`
- **SPA rewrite**: every path falls back to `/index.html` so client-side routes work on refresh (static files are still served first)
- **Asset caching**: `/assets/*` is served with `public, max-age=31536000, immutable`, since Vite hashes the filenames

### Deploy

```bash
vercel login            # one-time browser sign-in
vercel link             # link this folder to the Vercel project
vercel deploy           # preview deployment
vercel deploy --prod    # production deployment
```

Latest deployment: https://sn-posts-ok1d2xyn3-antoinefricker.vercel.app (Vercel Deployment Protection is on, so it requires a Vercel login)
