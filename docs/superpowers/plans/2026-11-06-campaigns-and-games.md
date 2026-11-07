# Clubs, Campaigns and Games Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add clubs, club-shared campaigns and games (many-to-many), a dashboard, and a grouped navigation to the existing Supabase + React app.

**Architecture:** Postgres tables with row-level security scoped by the caller's club (`current_club_id()`), composite foreign keys so a link can never cross clubs, and triggers that bump `campaigns.updated_at`. The React app gets `react-router` pages, a thin `src/data/*` layer over supabase-js, and a few pure helpers unit-tested with Vitest. Database behaviour is tested with pgTAP (`npx supabase test db`).

**Tech Stack:** React 19, TypeScript, Vite, Tailwind v4, shadcn/ui (base-ui), Supabase (Postgres, Auth, Deno edge function), `react-router` v7, Vitest, pgTAP.

**Spec:** `docs/superpowers/specs/2026-11-06-campaigns-and-games-design.md`

## Global Constraints

- Every user belongs to exactly one club; one club only for now, but no schema that prevents more.
- All members of a club read and write the club's campaigns and games; admins get no extra rights there. Admin is per club.
- A user must never read or change another club's data via the Supabase API directly (RLS, not UI).
- Game code: official match code typed by the user, never generated, unique per club, distinct from the database id.
- Team name = age category, free text. Location optional, empty means home. Score = two optional integers (ours, theirs).
- Required game fields: code, team name, opponent name, date, kick-off time.
- A campaign may have zero games. The same game cannot be linked twice to one campaign. A link cannot cross clubs.
- Campaign `updated_at` changes on campaign edit and on game add/remove/edit.
- Deleting a campaign, removing a game from a campaign, and deleting a game always ask for confirmation, stating the effect (games stay / game stays / "used in N campaigns").
- Dashboard: 5 recent campaigns (by update date), 5 upcoming games (soonest first, from browser-local now). Navigation order: Dashboard, separator, Campaigns (+ Games), separator, User edition, User creation (club admins only), Logout.
- Follow existing patterns: migrations in `supabase/migrations` with `(select auth.uid())` in policies, shadcn components via `make shadcn-add c=<name>`, `@/` alias, oxlint clean, `npm run build` passes.

## Review Focus

- A user of club A reading, inserting, updating, deleting, or linking rows of club B through the API (including a link between a club-A campaign and a club-B game). Expect: zero rows / rejected. (Task 2)
- Game codes that differ only by case or surrounding whitespace (`" ab12 "` vs `"AB12"`) in the same club. Expect: treated as the same code and rejected, not stored twice. (Task 2, Task 6)
- Game today whose kick-off already passed, and a game at exactly `now`. Expect: past excluded, exactly-now included. (Task 7)
- Score `0 - 0`, and a score with only one number. Expect: `0 - 0` shown as a score, not as "no score"; a half-filled score is rejected. (Task 2, Task 6)
- Admin of club A creating a user while sending a different club in the request body. Expect: the new user lands in the caller's club; body club ignored. (Task 3)

---

## Task 1: Clubs schema, profile migration, sign-up

**Files:**
- Create: `supabase/migrations/20261106100000_clubs.sql`, `supabase/tests/database/clubs.test.sql`
- Modify: `Makefile` (add `db-test` target running `npx supabase test db`; add to `.PHONY`), `README.md` command table

**Interfaces:**
- Produces: `public.clubs(id uuid pk, code text unique not null, name text not null)`; `public.profiles.club_id uuid not null references clubs(id)` (replaces the text column); `public.current_club_id() returns uuid` (security definer, stable, `search_path=''`); `public.is_club_admin() returns boolean`. Sign-up metadata keys: user metadata `club_code`, `club_name` (first user only); app metadata `club_id` (set server-side for admin-created users).

- [ ] **Step 1: Write failing pgTAP tests** in `clubs.test.sql`. Helper `create_test_user(email, club uuid, admin bool)` inserts into `auth.users` with `raw_app_meta_data` `{"created_by_admin": true, "club_id": ..., "make_admin": ...}` (the first user in an empty db goes through `club_code`/`club_name` metadata instead). Assertions: first sign-up creates a club with that code/name and an admin profile in it; a user created with app metadata `club_id` joins that club and is not admin; a member selects only their own club row and only their club's profiles; a member cannot update `club_id` or `is_admin` on their profile (permission denied); `update profiles set name` works.
- [ ] **Step 2: Run** `npx supabase db reset && npx supabase test db`. Expected: FAIL (no clubs table).
- [ ] **Step 3: Write the migration.** Create `clubs`; backfill one club per distinct `btrim(profiles.club_id)` (code = name = that value) and rewrite `profiles.club_id` to the uuid (add new column, backfill by join, set not null, drop old, rename); `current_club_id()` / `is_club_admin()` read the caller's profile; RLS on `clubs` (select where `id = current_club_id()`) and replace the profiles select policy with "same club"; keep `update` grant to `name` only (drop `club_id` from the grant); rewrite `handle_new_user` (first user: insert club from `club_code`/`club_name` metadata and become admin; otherwise `club_id` from `raw_app_meta_data`, with `make_admin` as today). Leave `prevent_additional_users` and `signup_open` unchanged.
- [ ] **Step 4: Run** `npx supabase db reset && npx supabase test db`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(db): clubs, club-scoped profiles and sign-up`.

## Task 2: Campaigns, games and links schema

**Files:**
- Create: `supabase/migrations/20261106100100_campaigns_games.sql`, `supabase/tests/database/campaigns_games.test.sql`

**Interfaces:**
- Consumes: `current_club_id()` from Task 1.
- Produces tables (all RLS enabled, policies `club_id = current_club_id()`; inserts also require `created_by = (select auth.uid())`; update grants limited to editable columns so `club_id`/`created_by` can't change):
  - `campaigns(id uuid pk default gen_random_uuid(), club_id uuid not null default current_club_id(), created_by uuid not null default auth.uid() references profiles, title text not null (non-blank), created_at, updated_at timestamptz default now(), unique (id, club_id))`
  - `games(id, club_id, created_by, code text not null (non-blank), team_name, opponent_name text not null, game_date date not null, kickoff_time time not null, location text null, score_ours int null, score_theirs int null, created_at, updated_at, unique (id, club_id))`, a unique index on `(club_id, lower(btrim(code)))`, and a check that scores are both null or both non-null and `>= 0`
  - `campaign_games(campaign_id, game_id, club_id, primary key (campaign_id, game_id))` with composite FKs `(campaign_id, club_id) -> campaigns(id, club_id)` and `(game_id, club_id) -> games(id, club_id)`, both `on delete cascade`
- Triggers: `campaigns` before update sets `updated_at`; `games` before update sets `updated_at`; after insert/delete on `campaign_games`, and after update on `games`, set `updated_at = now()` on the affected campaigns.

- [ ] **Step 1: Write failing pgTAP tests** covering the Review Focus rows and the spec: club B user sees 0 of club A's campaigns/games and cannot insert, update or delete them; inserting a `campaign_games` row pairing a club-A campaign with a club-B game fails; `" ab12 "` and `"AB12"` collide in one club but are allowed in different clubs; scores `(0,0)` accepted, `(1,null)` rejected, `(-1,0)` rejected; a campaign with no games is valid; deleting a campaign removes its links but keeps its games; deleting a game removes its links; linking the same pair twice fails; editing a game, linking, and unlinking each advance `campaigns.updated_at` (compare with `pg_sleep(0.01)`); a member cannot change `created_by` or `club_id`.
- [ ] **Step 2: Run** `npx supabase db reset && npx supabase test db`. Expected: FAIL (tables missing).
- [ ] **Step 3: Write the migration** as specified above (`trigger` functions `security definer`, `search_path = ''`).
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(db): campaigns, games and campaign_games with club RLS`.

## Task 3: Auth flow and `create-user` edge function adapted to clubs

**Files:**
- Modify: `supabase/functions/create-user/index.ts`, `src/auth/AuthContext.ts`, `src/auth/AuthProvider.tsx`, `src/auth/AuthForm.tsx`, `src/auth/EditProfile.tsx`, `src/auth/AdminCreateUser.tsx`, `src/App.tsx` (only the welcome text that shows `Club {club_id}`)

**Interfaces:**
- Produces: `Profile = { name: string; is_admin: boolean; club_id: string; club: { code: string; name: string } }`; `SignUpInput = { name; clubCode; clubName; email; password }`; `AuthValue.updateProfile(input: { name: string }): Promise<string | null>`. The edge function request body becomes `{ name, email, password, isAdmin }` (no club field).

- [ ] **Step 1: Edge function.** Read the caller's `club_id` and `is_admin` from `profiles`; ignore any club in the body; pass `app_metadata: { created_by_admin: true, make_admin, club_id }` and `user_metadata: { name }`. Keep the 403 for non-admins.
- [ ] **Step 2: Frontend.** Sign-up form asks club code and club name instead of Club ID (user metadata `club_code`, `club_name`); `AuthProvider` selects `name, is_admin, club_id, club:clubs(code, name)`; `EditProfile` drops the club input and shows the club name and code read-only; `AdminCreateUser` drops the Club ID field and says the user joins the admin's club.
- [ ] **Step 3: Verify** with `npx supabase db reset`, `make supabase-start`, `npm run build`, `npm run lint` (expected: both clean). Then with the dev server: sign up the first account with a club code and name (it becomes admin), create a second user from the admin form, sign in as them and check they see the same club name and no admin form.
- [ ] **Step 4: Verify the Review Focus item** against the local function URL: call `create-user` as the admin with an extra body field `clubId` set to a random uuid. Expected: 201 and the created user's profile `club_id` equals the admin's.
- [ ] **Step 5: Commit** `feat(auth): club-aware sign-up and user creation`.

## Task 4: Router, layout and navigation

**Files:**
- Create: `src/layout/AppLayout.tsx`, `src/layout/AdminRoute.tsx`, `src/pages/AccountPage.tsx`, `src/pages/CreateUserPage.tsx`, `src/pages/DashboardPage.tsx` (placeholder heading), `src/pages/CampaignsPage.tsx` (placeholder), `src/pages/GamesPage.tsx` (placeholder)
- Modify: `package.json` (add `react-router`), `src/main.tsx` (wrap in `BrowserRouter`), `src/App.tsx` (routes)

**Interfaces:**
- Produces routes: `/` Dashboard, `/campaigns`, `/campaigns/:campaignId`, `/games`, `/account` (renders `EditProfile`), `/users/new` (renders `AdminCreateUser`; `AdminRoute` redirects non-admins to `/`). `AppLayout` renders the nav (sidebar on desktop, a toggled menu on small screens) with the spec's grouping using `Separator`, a `NavLink` per entry with active styling, and a Logout button calling `signOut`; it renders `<Outlet />`. The existing `vercel.ts` SPA rewrite already serves deep links.

- [ ] **Step 1:** `npm install react-router`, build the layout, routes and pages above.
- [ ] **Step 2: Verify** `npm run build` and `npm run lint` clean. In the browser: each nav link opens its page, a non-admin never sees "User creation" and visiting `/users/new` redirects to `/`, reloading `/campaigns` keeps the page, the menu works at 375px width.
- [ ] **Step 3: Commit** `feat(ui): router and grouped navigation`.

## Task 5: Shared confirm dialog and data types

**Files:**
- Create: `src/components/ConfirmDialog.tsx`, `src/data/types.ts`, `src/data/errors.ts`
- Modify: add shadcn components via `make shadcn-add c=alert-dialog` and `make shadcn-add c=dialog`

**Interfaces:**
- Produces: `ConfirmDialog(props: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; confirmLabel: string; onConfirm: () => Promise<void> | void })` (shows busy state while `onConfirm` runs; destructive styling). `src/data/types.ts` exports `Campaign = { id; title; created_at; updated_at; created_by; creator_name: string | null; game_count: number }`, `GameInput = { code; team_name; opponent_name; game_date: string; kickoff_time: string; location: string | null; score_ours: number | null; score_theirs: number | null }`, `Game = GameInput & { id; created_by; creator_name: string | null; created_at; updated_at }`, `GameWithCampaigns = Game & { campaigns: { id: string; title: string }[] }`. `errors.ts` exports `toMessage(error: unknown): string` and maps the unique-code violation to `"A game with this code already exists in your club"`.

- [ ] **Step 1:** Add the components and types. **Step 2:** `npm run build` and `npm run lint` clean. **Step 3: Commit** `feat(ui): confirm dialog and data types`.

## Task 6: Games data layer, helpers and game form

**Files:**
- Create: `src/data/games.ts`, `src/lib/games.ts`, `src/lib/games.test.ts`, `src/components/GameForm.tsx`, `vitest.config.ts`
- Modify: `package.json` (add `vitest`, `test` script), `Makefile` (`test` target)

**Interfaces:**
- Produces in `src/lib/games.ts`: `normalizeGameCode(code: string): string` (trim), `isHomeGame(game: { location: string | null }): boolean` (empty or whitespace is home), `formatScore(game: { score_ours: number | null; score_theirs: number | null }): string | null` (`"2 - 1"`, and `"0 - 0"` for zeros, `null` when unset).
- Produces in `src/data/games.ts` (all throw on error): `listGames(): Promise<GameWithCampaigns[]>`, `listCampaignGames(campaignId: string): Promise<GameWithCampaigns[]>`, `findGameByCode(code: string): Promise<Game | null>` (case-insensitive after trim), `createGame(input: GameInput): Promise<Game>`, `updateGame(id: string, input: GameInput): Promise<Game>`, `deleteGame(id: string): Promise<void>`, `addGameToCampaign(campaignId: string, gameId: string): Promise<void>`, `removeGameFromCampaign(campaignId: string, gameId: string): Promise<void>`.
- Produces `GameForm(props: { initial?: Game; usedInCampaigns?: number; onSubmit: (input: GameInput) => Promise<void>; onCancel: () => void })`, validating required fields, trimming the code, and requiring both score numbers or neither.

- [ ] **Step 1: Write failing Vitest tests** for the helpers: `formatScore({score_ours: 0, score_theirs: 0})` equals `"0 - 0"`; `formatScore({score_ours: null, score_theirs: null})` is `null`; `isHomeGame({location: null})`, `({location: ""})` and `({location: "  "})` are true and `({location: "Stade"})` is false; `normalizeGameCode("  AB12 ")` equals `"AB12"`.
- [ ] **Step 2:** `npm install -D vitest`, add `"test": "vitest run"` and run `npm test`. Expected: FAIL (helpers missing).
- [ ] **Step 3:** Implement the helpers, then the data layer (campaign joins via `campaign_games(campaigns(id, title))`, creator name via `profiles`), then `GameForm`.
- [ ] **Step 4:** `npm test`, `npm run build`, `npm run lint`. Expected: all pass.
- [ ] **Step 5: Commit** `feat(games): data layer, helpers and form`.

## Task 7: Upcoming-games helper

**Files:**
- Create: `src/lib/upcoming.ts`, `src/lib/upcoming.test.ts`

**Interfaces:**
- Produces: `upcomingGames<T extends { game_date: string; kickoff_time: string }>(games: T[], now: Date, limit: number): T[]` — keeps games whose local date-time (`game_date` + `kickoff_time`) is `>= now`, sorted soonest first, truncated to `limit`.

- [ ] **Step 1: Write failing tests:** a game today at 10:00 with `now` 14:00 is excluded; at exactly `now` is included; tomorrow 08:00 is included; unsorted input comes back sorted; `limit` is respected; empty input returns `[]`.
- [ ] **Step 2:** `npm test`. Expected: FAIL. **Step 3:** Implement, parsing the strings as local time (not UTC). **Step 4:** `npm test`. Expected: PASS. **Step 5: Commit** `feat(games): upcoming games helper`.

## Task 8: Campaigns pages

**Files:**
- Create: `src/data/campaigns.ts`, `src/components/CampaignForm.tsx`
- Modify: `src/pages/CampaignsPage.tsx`

**Interfaces:**
- Produces: `listCampaigns(): Promise<Campaign[]>` (ordered by `updated_at` desc, includes game count and creator name), `getCampaign(id: string): Promise<Campaign | null>`, `createCampaign(title: string): Promise<Campaign>`, `updateCampaign(id: string, title: string): Promise<Campaign>`, `deleteCampaign(id: string): Promise<void>`. `CampaignForm` is a dialog with one required title field, for create and edit.

- [ ] **Step 1:** Implement the data layer and the page: table or card list (title, creator, created and updated dates, number of games), "New campaign", edit, delete via `ConfirmDialog` ("Deletes the campaign only; its N games stay"), empty state, error and loading states, row links to `/campaigns/:id`.
- [ ] **Step 2: Verify** build and lint clean; in the browser create, rename and delete a campaign (cancel keeps it, confirm removes it), check a second user in the same club sees and can edit it, and its updated date advances after a rename.
- [ ] **Step 3: Commit** `feat(campaigns): list, create, edit, delete`.

## Task 9: Campaign page with games

**Files:**
- Create: `src/pages/CampaignDetailPage.tsx`, `src/components/GameRow.tsx`, `src/components/AddGameDialog.tsx`

**Interfaces:**
- Consumes: Task 5, 6 and 8 interfaces.
- Produces: the page for `/campaigns/:campaignId` with the campaign title (edit and delete as in Task 8, deleting navigates to `/campaigns`), its games (code, team name, opponent, date and time, home/away or location, score from `formatScore`, creator name), and per-game actions: edit (`GameForm`, showing "used in N campaigns"), "Remove from campaign" (`ConfirmDialog`: unlink only, the game remains), and delete (`ConfirmDialog` stating how many campaigns use it). `AddGameDialog` has two modes: create a new game (and link it), or pick an existing club game not yet in the campaign; on a duplicate code the form offers "Use the existing game" and links that one instead of failing.

- [ ] **Step 1:** Implement. **Step 2: Verify** build and lint clean; in the browser: a new campaign shows an empty state; add a new game; reuse the same code with different case (offered the existing game, not a duplicate); add the same game to a second campaign; edit it from one campaign and see the change in both; remove it from one campaign (stays in the other); delete it (confirmation shows 1 campaign; gone from the other); a `0 - 0` score displays as `0 - 0`.
- [ ] **Step 3: Commit** `feat(campaigns): campaign page with shared games`.

## Task 10: Games page

**Files:**
- Modify: `src/pages/GamesPage.tsx`

- [ ] **Step 1:** List all the club's games (as in `GameRow`, plus the campaign titles each is in, linking to them), with edit and delete (`ConfirmDialog` stating how many campaigns use it), and an empty state. **Step 2: Verify** build and lint clean; in the browser: delete from here removes it from every campaign. **Step 3: Commit** `feat(games): club games page`.

## Task 11: Dashboard

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `listCampaigns`, `listGames`, `upcomingGames(games, new Date(), 5)`.

- [ ] **Step 1:** Two cards: "Recent campaigns" (first 5 of `listCampaigns()` by update date) and "Upcoming games" (each with date, time, team and opponent, and links to the campaigns it is in); each with an empty state and a link to the full list. Replace the welcome text that was in `App.tsx` with a short greeting showing the user's name and club.
- [ ] **Step 2: Verify** build, lint and `npm test` clean; in the browser: with no data both empty states show; a game today whose kick-off has passed is absent, a game later today is present.
- [ ] **Step 3: Commit** `feat(dashboard): recent campaigns and upcoming games`.

## Task 12: Docs and final verification

**Files:**
- Modify: `README.md` (clubs, roles, new data model, `make db-test`/`make test`, first sign-up creating the club)

- [ ] **Step 1:** Update the README sections on authentication and commands. **Step 2:** Run `npx supabase db reset && npx supabase test db`, `npm test`, `npm run lint`, `npm run build`. Expected: all clean. **Step 3:** Walk the full flow in the browser once as admin and once as a member of the same club, and confirm a second club (created by inserting a club and a user via SQL) cannot see the first club's data. **Step 4: Commit** `docs: clubs, campaigns and games`.
