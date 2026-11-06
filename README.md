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

Preview URL: _to be added after the first deploy_
