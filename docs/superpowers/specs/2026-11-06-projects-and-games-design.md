# Clubs, projects and games: design

Date: 2026-11-06 (revised after the club decision)

## Intent

sn-posts is a small app for club staff who prepare publications (social posts) about football matches. A **club** groups its members; the members share **publication projects**, and each project groups the **games** that the publication covers. Today the app only has sign-in, a profile (name, club ID as plain text) and admin-created accounts. This work adds the club as a real record, projects, games, a dashboard summarising them, and a proper navigation.

## Goals

- A club is a record with a UUID, a code and a name. Every user belongs to exactly one club.
- All members of a club share the club's projects and games: each member can create, list, edit and delete them.
- A project contains any number of games, including none. A game is one shared record that several projects of the club can include.
- Users can create games, add existing games to a project, list a project's games, edit games, remove a game from a project, and delete a game.
- Deleting a project, removing a game from a project, or deleting a game always asks for confirmation.
- A dashboard summarises **recent projects** and **upcoming games** of the club.
- A navigation reorganises the existing pages and the new ones.
- The record of who created each project and game is kept, and shown in lists.

## Non-goals

- One club only for now: no UI to create or switch clubs. The schema must not prevent adding more clubs later.
- No sharing between clubs, and no per-project member lists.
- No generating of publications/posts themselves: this is data management only.
- No import of games from a federation API.

## Anti-goals

- A user must never be able to read or change another club's data, including by calling the Supabase API directly (enforced by row-level security, not just by the UI).
- A club admin must never be able to create or manage users outside their own club.
- No unconfirmed deletion.

## Roles

- **Member:** reads and changes the club's projects and games, edits their own profile.
- **Club admin:** everything a member can, plus creating user accounts in their own club (optionally as admin too). Admins have no extra rights over projects and games (guess).
- Admin is a role within a club, not global. Decided by the user: each club has its own admins.

## Data model

**Club**: UUID, code, name. The existing profile text field "club ID" becomes a link to the club; existing values are migrated into club records (the builder decides how, since the real values are in the database, not in the repo).

**Profile**: as today (name, admin flag), now linked to a club. The admin flag now means admin of that club.

**Project**: title, creation date, update date, club, creator. May have zero games. The update date changes when the project is edited, and also when a game in it is added, removed or edited (database triggers), so "recent projects" reflects real activity.

**Game**: one record per official match code within a club, shared by every project of that club that includes it. Has a creator.

| Field | Meaning | Required |
| --- | --- | --- |
| game code | The official match code. Typed in by the user, never generated. Distinct from the database id. Unique per club. | yes |
| team name | The age category of the club's team, e.g. "U13". Free text, not the club name and not a fixed list. | yes |
| opponent name | Free text. | yes |
| date | Match date. | yes |
| kick-off time | Time of day. | yes |
| location | Free text. Empty means a home game. | no |
| score | Two numbers (ours, theirs). A game can be created before it is played. | no |

**Project-game link**: many-to-many between projects and games of the same club. A game can be in many projects; a project can have many games; the same game cannot be linked twice to one project; a link can never cross clubs.

Decided by the user: the game code is the official code, not the DB id; the team name is an age category; projects can be empty; uniqueness is by official code only; one shared game record used by many projects; required fields as in the table; clubs have a UUID, code and name; projects and games are shared among the members of a club; each club has its own admins; one club for the moment.

## Behaviour

- **Projects page:** list of the club's projects (title, creator, dates, number of games), a "new project" action, edit and delete per project. Opening a project shows its games. Deleting a project deletes only the project and its links; the games stay. The confirmation says so.
- **Project page:** the project's title with edit/delete, and the list of its games. Two ways to add a game: create a new one, or pick an existing one. If the user types a code that already exists in the club, the form offers to reuse that game instead of failing. Each game row has edit, "remove from project" (unlinks only) and delete.
- **Games page (guess, builder may place it differently):** since games are shared across projects, members need one place to see all the club's games and delete one for good. Deleting a game removes it from every project; the confirmation states how many projects use it.
- **Editing a game:** changes it everywhere it is used. The form says how many projects use it.
- **Dashboard:** two blocks: recent projects (by update date) and upcoming games (date and time from now on, across the club's games, soonest first, each shown with the projects it is in). Each item links to its project. Counts and empty states are left to the builder (guess: 5 each). "Upcoming" uses the browser's local date and time.
- **Delete confirmations:** a dialog naming what is being deleted and what it affects.

## Navigation

Grouped, with separators between groups:

1. Dashboard
2. Projects (and Games, guess: see Behaviour)
3. User edition (the existing profile form), user creation (existing admin form, shown to club admins only), logout

Today the profile form and admin form live on the single welcome page; they move to their own pages under this navigation.

## Constraints and how it gets made

Builds on the existing stack: React 19 + TypeScript + Vite, Tailwind v4 with shadcn/ui components, Supabase (Postgres with row-level security, migrations in `supabase/migrations`), deployed on Vercel. Migrations follow the existing pattern (profiles table, RLS policies using `(select auth.uid())`). The existing `create-user` edge function and the "first account becomes admin, then sign-up closes" rule must be adapted to the club model.

My calls (not discussed with the user): add a client-side router so the navigation has real pages; implement the confirmation as a shadcn/ui dialog; store the kick-off time as a time-of-day and the date as a date; navigation as a sidebar on desktop and a collapsible menu on small screens; "upcoming" uses the browser's local time (no club timezone exists); project update dates are bumped by database triggers on the link table and on games; the creator of a project or game is recorded but gives no extra rights.

My guess about the first club: the first sign-up form asks for the club's code and name, creating the club and making that first user its admin (this replaces the free-text club ID field). Subsequent users are created by that admin inside the same club. Say so if the club should be created differently, for example seeded by a migration.

## Left to the builder

Table and column naming, router choice, layout details of the navigation, form validation messages, empty states, loading and error states, how to word the confirmations, and how existing profile data is migrated.
