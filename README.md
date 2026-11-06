# sn-posts

A React + TypeScript web app built with [Vite](https://vite.dev), linted with [Oxlint](https://oxc.rs), and deployed on [Vercel](https://vercel.com).

## Getting started

Requires Node 24 (see `.nvmrc`).

```bash
npm install
npm run dev
```

### Available commands

**make** (wraps the Supabase and shadcn/ui `npx` commands; Supabase local stack requires Docker)

| Command                    | Runs                                        | Description                                                        |
| -------------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| `make start`               | `npm run dev`                               | Start the dev server with HMR                                      |
| `make build`               | `npm run build`                             | Type-check and build to `dist/`                                    |
| `make preview`             | `npm run preview`                           | Serve the production build locally                                 |
| `make lint`                | `npm run lint`                              | Lint with Oxlint                                                   |
| `make supabase-start`      | `npx supabase start`                        | Start the local stack (incl. edge functions) and apply migrations  |
| `make supabase-status`     | `npx supabase status`                       | Show the local API URL and publishable key                         |
| `make supabase-stop`       | `npx supabase stop`                         | Shut the local stack down                                          |
| `make db-reset`            | `npx supabase db reset`                     | Rebuild the local database (reopens sign-up for a new first admin) |
| `make link`                | `npx supabase link`                         | Link this folder to a cloud Supabase project                       |
| `make db-push`             | `npx supabase db push`                      | Apply migrations to the linked cloud project                       |
| `make deploy-function`     | `npx supabase functions deploy create-user` | Deploy the `create-user` edge function                             |
| `make shadcn-add c=<name>` | `npx shadcn@latest add <name>`              | Add a shadcn/ui component                                          |

**Vercel CLI**

| Command                | Description                            |
| ---------------------- | -------------------------------------- |
| `vercel login`         | Sign in to Vercel (one-time)           |
| `vercel link`          | Link this folder to the Vercel project |
| `vercel deploy`        | Create a preview deployment            |
| `vercel deploy --prod` | Create a production deployment         |

## UI

Styled with [Tailwind CSS](https://tailwindcss.com) v4 and [shadcn/ui](https://ui.shadcn.com) (config in `components.json`; components live in `src/components/ui`). Add more with `make shadcn-add c=<component>`; the `@/` import alias points to `src/`.

## Authentication (Supabase)

Accounts have **name, club ID, email and password**; sign-in is email + password via Supabase Auth, and name / club ID / admin flag live in `public.profiles` (row-level security: users read and edit only their own profile, and can never change `is_admin`). Email confirmation is off.

**Roles**

- The **first account** to sign up becomes an **admin**. Public sign-up is then closed (a `before insert` trigger on `auth.users` rejects it, so the Auth API can't be used to bypass it) and the sign-up form disappears.
- **Every user** can edit their own name, club ID, email and password from the "Your information" form (RLS allows updates to their own row only, and never to `is_admin`). If the project requires email-change confirmation, the new address takes effect after the user confirms it.
- **Admins** get a "Create a user account" form after signing in, optionally making the new user an admin too. It calls the [`create-user`](supabase/functions/create-user/index.ts) edge function, which verifies the caller is an admin and creates the user with the service-role key (never exposed to the browser).

Schema lives in [`supabase/migrations`](supabase/migrations). To run everything locally (requires Docker):

```bash
make supabase-start     # starts the local stack (incl. edge functions) and applies migrations
make supabase-status    # shows the API URL and publishable key
cp .env.example .env.local   # then fill in VITE_SUPABASE_ANON_KEY
npm run dev
```

`make db-reset` rebuilds the local database (and reopens sign-up for a new first admin); `make supabase-stop` shuts the stack down.

On a cloud project, apply the schema and deploy the function: `make link`, `make db-push`, `make deploy-function`.

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
