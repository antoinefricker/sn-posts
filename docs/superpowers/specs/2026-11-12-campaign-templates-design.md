# Campaign templates: design

Date: 2026-11-12

## Intent

A club communicator builds an Instagram carousel for each campaign (a weekend of games, a result recap). Today they make every slide by hand in a design tool. Campaign templates generate those slides in seconds from the campaign's own data. The communicator picks templates, fills a few fields, and downloads the slides as images to post manually.

## Goals

- A campaign owns an ordered list of templates. Each template produces one or more slides.
- Slides are 1080×1350 px (Instagram feed post, 4:5), visually close to the sample screenshot (purple, bold condensed type, light basketball background, day headers, VS rows).
- First three template types:
  - **Intro:** reusable background image, title, subtitle.
  - **Focus:** badge text (MVP, Victoire…), title, uploaded image.
  - **Games:** the campaign's games for one venue (home or away), grouped by day. It spills onto extra slides when there are too many games.
- Templates can be added, edited, deleted and reordered by drag and drop.
- The user can preview slides and download them as PNG images.

## Non-goals

- No posting or scheduling to Instagram. Download only.
- No free-form designer: layouts are fixed per template type, only the fields above are editable.
- No story (9:16) format yet. Keep slide size a single constant so a variant can be added later.
- No translation layer for the app UI.

## Anti-goals

- A slide that looks right in the preview but exports differently (fonts or images missing in the PNG).
- Text overflowing or clipped on a slide when game names are long or there are many games.
- Cross-club access to templates or uploaded images.
- Deleting a template without confirmation.

## Constraints (from the existing codebase)

- Vite + React 19 + TypeScript SPA on Supabase (Postgres + RLS), Tailwind v4, shadcn "base-nova", Vitest (node only, no component tests), pgTAP for DB.
- Club scoping via `current_club_id()`; composite FKs `(campaign_id, club_id)`; column-level `grant update`.
- Dialog pattern: `Dialog` wrapper + body mounted only while open; destructive actions through `ConfirmDialog`; errors through `toMessage`.
- Pure logic lives in `src/lib` with colocated tests. oxlint clean, `npm run build` passes.
- No drag-and-drop library, no Supabase Storage bucket, no image export library exist yet.

## Decisions

Marked **[user]** if the user decided it, **[call]** if it is my default and can be changed.

- **[user]** Template types, fields and ordering as listed in Goals.
- **[user]** Output is downloaded images; feed post format.
- **[user]** A template can produce several pages.
- **[call] Data model.** New table `campaign_templates`: `id`, `club_id`, `campaign_id`, `type` (`intro | focus | games`), `position` (int), `config` (jsonb, shape depends on type), timestamps. Composite FK `(campaign_id, club_id)` with `on delete cascade`; same RLS pattern as `campaign_games`; update grant limited to `position, config`.
- **[call] Games are never copied into a template.** A games template stores only `{ venue: 'home' | 'away' }`. Its slides are computed at render time from the campaign's linked games filtered on `is_home`, grouped by `game_date`. Editing a game updates the slides.
- **[call] One games template per venue.** To show home and away, the user adds two games templates.
- **[call] Pagination.** A pure function in `src/lib` takes day groups and a per-slide row capacity and returns pages. Day headers repeat when a day continues on the next page; a header is never left alone at the bottom of a slide. Fully unit-tested.
- **[call] Images.** One private Supabase Storage bucket, club-scoped by path (`<club_id>/…`) with storage RLS. Intro backgrounds are uploaded once and picked from the club's existing images, which is what "reusable" means here. Focus images are uploaded to the same bucket.
- **[call] Rendering.** Slides are React components with fixed 1080×1350 CSS size, scaled down for preview. Export to PNG client-side with `html-to-image`. Bundle the display font (Fontsource) so it is present at export time.
- **[call] Download.** Per-slide PNG, plus "Download all" as sequentially numbered files (`01-intro.png`, `02-games-home-1.png`…).
- **[call] Reordering.** `@dnd-kit` sortable list on the campaign detail page. On drop, positions are rewritten in one request (RPC `reorder_campaign_templates`).
- **[call] UI placement.** A "Templates" section on the existing campaign detail page: sortable list (drag handle, type, summary, edit, delete), an "Add template" menu, and a preview/download panel for the resulting slides.
- **[call] Add/edit** uses the existing dialog pattern, one form per type; delete uses `ConfirmDialog`.

## Left to the builder

- Exact visual styling, spacing and font choice, within the screenshot's look.
- Row capacity per slide and long-name handling (shrink or wrap), as long as nothing is clipped.
- File names, bucket name, RPC details, component breakdown.
- Test split: pgTAP for RLS and reorder, Vitest for pagination and grouping helpers.

## Open question for the user

- **Language of slide text.** The sample is French (DOMICILE/EXTÉRIEUR, VENDREDI, "VS"), while the app UI is English with `en-GB` dates. Default: slide labels and day names in French, app UI unchanged. Is that right?
