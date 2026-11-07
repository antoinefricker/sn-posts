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
| `make stop`                | `pkill` on this project's Vite process      | Stop the dev server started by `make start`                        |
| `make build`               | `npm run build`                             | Type-check and build to `dist/`                                    |
| `make preview`             | `npm run preview`                           | Serve the production build locally                                 |
| `make lint`                | `npm run lint`                              | Lint with Oxlint                                                   |
| `make test`                | `npm test`                                  | Run the Vitest unit tests (no Docker or Supabase needed)           |
| `make supabase-start`      | `npx supabase start`                        | Start the local stack (incl. edge functions) and apply migrations  |
| `make supabase-status`     | `npx supabase status`                       | Show the local API URL and publishable key                         |
| `make supabase-stop`       | `npx supabase stop`                         | Shut the local stack down                                          |
| `make db-reset`            | `npx supabase db reset`                     | Rebuild the local database (reopens sign-up for a new first admin) |
| `make db-test`             | `npx supabase test db`                      | Run the pgTAP database tests (needs the local stack running)       |
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

Accounts have a **name, email and password** and belong to a **club**; sign-in is email + password via Supabase Auth. The name, the club link and the admin flag live in `public.profiles`, and clubs live in `public.clubs` (each has a UUID, a unique **code** and a **name**). Email confirmation is off.

**Roles (per club)**

- The **first account** to sign up creates the club (the sign-up form asks for a club code and a club name) and becomes its **admin**. Public sign-up is then closed (a `before insert` trigger on `auth.users` rejects it, so the Auth API can't be used to bypass it) and the sign-up form disappears.
- **Club admins** get a "User creation" page after signing in, optionally making the new user an admin too. It calls the [`create-user`](supabase/functions/create-user/index.ts) edge function, which verifies the caller is an admin and creates the user in the **caller's own club** (any club in the request body is ignored) with the service-role key (never exposed to the browser). To get the new account past the closed sign-up gate and into the right club, the function writes a short-lived row (valid for 1 minute) into `public.user_invites`, which only the service role can access; the sign-up triggers check and consume it.
- **Every user** can edit their own name, email and password from the "User edition" page. Users cannot change their club or admin flag (RLS only allows updating the `name` column of the profile). If the project requires email-change confirmation, the new address takes effect after the user confirms it.

Schema lives in [`supabase/migrations`](supabase/migrations). To run everything locally (requires Docker):

```bash
make supabase-start     # starts the local stack (incl. edge functions) and applies migrations
make supabase-status    # shows the API URL and publishable key
cp .env.example .env.local   # then fill in VITE_SUPABASE_ANON_KEY
npm run dev
```

`make db-reset` rebuilds the local database (and reopens sign-up for a new first admin); `make supabase-stop` shuts the stack down.

On a cloud project, apply the schema and deploy the function: `make link`, `make db-push`, `make deploy-function`. Run `make db-push` (migrations) **before** `make deploy-function`: the function relies on the `user_invites` table.

**Local development notes**

- After `make supabase-start` or `make db-reset`, restart the edge runtime container with `docker restart supabase_edge_runtime_sn-posts`; otherwise `create-user` answers `BOOT_ERROR`.
- The clubs migration turns the text club IDs of existing accounts into club records (code = name = the old value). That path was only tested on an empty database: check it manually on a populated one before running `make db-push` against a cloud project. Run `select btrim(club_id), count(*) from public.profiles group by 1` on the old schema first to spot variants such as `ABC` / `abc` or tab/space padding, which would become separate clubs.

## Clubs, projects and games

Everything belongs to a **club**. A club has **projects** and **games**; a project groups games through the `project_games` link table, and the same game can appear in several projects.

- **Game**: the **code** is the game's official code, unique within a club (compared trimmed and case-insensitively). The **team name** is the age category. **Location** left empty means the game is at home. The **score** is two optional numbers (ours and theirs, both set or both empty). Games also have an opponent, a date and a kick-off time.
- **Project**: a title and a list of games. A project may be empty.
- **Deleting**: deleting a project keeps its games; deleting a game removes it from every project it was in; deleting a user keeps what they created (shown as created by an unknown member).
- **Who can do what**: every member of a club can create, edit and delete the club's projects and games, and link games to projects. There is no per-user ownership; only creating user accounts is limited to club admins.
- **Club isolation**: row-level security on `clubs`, `profiles`, `projects`, `games` and `project_games` limits every read and write to the caller's own club, and composite foreign keys stop a link from ever joining records of different clubs. A user of another club sees nothing, including through direct API calls.

**Pages**

| Page            | Description                                                                   |
| --------------- | ----------------------------------------------------------------------------- |
| Dashboard       | Recent projects and upcoming games of the club                                |
| Projects        | List, create, rename and delete projects                                      |
| Project page    | The games of one project: add a new game, pick an existing one, edit, remove it from the project, or delete it from the club |
| Games           | All the club's games: edit and delete (games are added from a project page)                                |
| User edition    | Edit your own name, email and password                                        |
| User creation   | Club admins only: create a user in your club                                  |

Tests: `make test` runs the Vitest unit tests, `make db-test` runs the pgTAP tests for clubs, projects and games (see the command table above).

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
