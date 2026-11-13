# Campaign Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a campaign own an ordered list of templates (Intro, Focus, Games) that render 1080×1350 Instagram feed slides, downloadable as PNG.

**Architecture:** A `campaign_templates` table stores type, position and a jsonb config per template. Games templates store only the venue and compute their slides at render time from the campaign's linked games. Slides are fixed-size React components exported to PNG in the browser; images live in a club-scoped private Supabase Storage bucket. Pure logic (config validation, day grouping, pagination, slide building) lives in `src/lib` and is unit-tested.

**Tech Stack:** React 19, TypeScript, Vite, Supabase (Postgres, RLS, Storage), Tailwind v4, shadcn base-nova, Vitest, pgTAP, new deps: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `html-to-image`, `@fontsource/anton`.

**Spec:** `docs/superpowers/specs/2026-11-12-campaign-templates-design.md`

## Global Constraints

- Slide size is 1080×1350 px (4:5), defined once as `SLIDE_WIDTH` / `SLIDE_HEIGHT` in `src/lib/slides.ts`.
- Template types are exactly `intro`, `focus`, `games`. Games venue is exactly `home` or `away`.
- Slide text (labels `DOMICILE` / `EXTÉRIEUR`, day names, `VS`, times like `20H30`) is French; the rest of the app UI stays English.
- Tables are club-scoped: `club_id` defaults to `current_club_id()`, composite FK `(campaign_id, club_id)` with `on delete cascade`, RLS policies use `(select public.current_club_id())`.
- New editable columns need a `grant update (...)` entry; `club_id` is never updatable.
- Dialog pattern: `Dialog` wrapper + body mounted only while open; destructive actions use `ConfirmDialog`; errors go through `toMessage`.
- Games are never copied into a template.
- Deleting a template requires confirmation.
- `npm run lint` clean, `npm run build` passes, `npm test` passes, `make db-test` passes before the final task is done.
- Shadcn components are added with `make shadcn-add c=<name>`.
- Commits follow `feat(campaigns): ...` style.

## Review Focus

- A games template when the campaign has no game of that venue: no slides, and the list row says "No games" instead of crashing or exporting an empty image.
- A single day with more games than fit on one slide: continues on the next slide with the day header repeated.
- A day header that would land alone at the bottom of a slide: moved to the next slide.
- Very long team or opponent names (e.g. `SAINTE CROIX AUX MINES 1` ×2): wrap or shrink, never clip or overlap the VS column.
- A template whose stored image was deleted from storage or never uploaded: renders a neutral placeholder and does not block export of the other slides.
- Uploading a non-image or oversized file: rejected with a readable message, nothing stored.
- Deleting a middle template then adding one: positions stay unique and ordered; two browser tabs reordering at once never produce duplicate positions.
- Another club's member can never read, change, reorder or download this club's templates or images.

---

## File Structure

- `supabase/migrations/20261113100000_campaign_templates.sql`: table, RLS, grants, reorder RPC.
- `supabase/migrations/20261113100100_template_images.sql`: storage bucket and storage RLS.
- `supabase/tests/database/campaign_templates.test.sql`: pgTAP for both migrations.
- `src/data/types.ts`: template types (modify).
- `src/lib/templates.ts`: config defaults, validation, list summaries.
- `src/lib/gameSlides.ts`: day grouping and pagination of games.
- `src/lib/slides.ts`: slide size constants, French text helpers, `buildSlides`, file naming.
- `src/data/templates.ts`: CRUD + reorder for `campaign_templates`.
- `src/data/templateImages.ts`: upload, list, download of images.
- `src/components/slides/`: `SlideFrame.tsx`, `IntroSlide.tsx`, `FocusSlide.tsx`, `GamesSlide.tsx`, `useStorageImage.ts`, `exportSlide.ts`.
- `src/components/templates/`: `TemplatesSection.tsx`, `TemplateList.tsx`, `TemplateDialog.tsx`, `TemplateForms.tsx`, `ImagePicker.tsx`, `SlidesPreview.tsx`.
- `src/pages/CampaignDetailPage.tsx`: mount the section (modify).

---

### Task 1: `campaign_templates` table, RLS and reorder RPC

**Files:**
- Create: `supabase/migrations/20261113100000_campaign_templates.sql`
- Create: `supabase/tests/database/campaign_templates.test.sql`

**Interfaces:**
- Produces: table `public.campaign_templates(id uuid, club_id uuid, campaign_id uuid, type text, position int, config jsonb, created_at, updated_at)`; function `public.reorder_campaign_templates(p_campaign_id uuid, p_ids uuid[]) returns void`.

- [ ] **Step 1: Write the failing pgTAP test** in `campaign_templates.test.sql`, copying the setup block of `campaigns_games.test.sql` (clean slate, club A member `m1`, club B member `m2`). Assertions, each with a message:
  - member creates a template; `club_id` defaults to member's club.
  - `type` outside `intro|focus|games` is rejected (`throws_ok`, SQLSTATE `23514`).
  - `config` that is not a json object is rejected.
  - `(campaign_id, position)` is unique (`23505`).
  - member can update `position` and `config` but not `type` or `club_id` (`42501`).
  - club B member sees 0 rows, cannot insert for club A's campaign (`23503`), cannot delete.
  - deleting the campaign deletes its templates.
  - `reorder_campaign_templates` with the ids in a new order rewrites positions to `1..n` in that order.
  - `reorder_campaign_templates` raises (`22023`) when `p_ids` is missing one of the campaign's templates, contains a foreign id, or has duplicates; positions are unchanged afterwards.
  - club B calling `reorder_campaign_templates` on club A's campaign raises.
  Set `plan(N)` to the exact count.

- [ ] **Step 2: Run to verify it fails.** Run: `make supabase-start && make db-test`. Expected: FAIL, relation `campaign_templates` does not exist.

- [ ] **Step 3: Write the migration.** Table per the Interfaces block with `type` check, `config jsonb not null default '{}' check (jsonb_typeof(config) = 'object')`, `unique (campaign_id, position) deferrable initially immediate`, composite FK with cascade, index on `(club_id)` and `(campaign_id)`, `set_updated_at` trigger (existing function), RLS select/insert/update/delete with the existing policy pattern, `revoke all` then `grant select, insert, delete` and `grant update (position, config)`. `reorder_campaign_templates` is `security invoker`, `set search_path = ''`: it validates that `p_ids` is a duplicate-free set equal to the campaign's template ids (else `raise exception ... using errcode = '22023'`), sets constraints deferred, and updates `position = ordinality` in one statement. Grant execute to `authenticated` only. Insert default for `position`: none, the data layer computes `max + 1`.

- [ ] **Step 4: Run to verify it passes.** Run: `make db-reset && make db-test`. Expected: all files PASS.

- [ ] **Step 5: Commit.**
```bash
git add supabase/migrations/20261113100000_campaign_templates.sql supabase/tests/database/campaign_templates.test.sql
git commit -m "feat(campaigns): add campaign_templates table with RLS and reorder RPC"
```

---

### Task 2: Storage bucket for template images

**Files:**
- Create: `supabase/migrations/20261113100100_template_images.sql`
- Modify: `supabase/tests/database/campaign_templates.test.sql` (append storage assertions, update `plan(N)`)

**Interfaces:**
- Produces: private bucket `template-images` (5 MiB limit, `image/png`, `image/jpeg`, `image/webp`); object path convention `<club_id>/<uuid>-<filename>`.

- [ ] **Step 1: Write failing assertions.** Using `storage.objects` inserts as `authenticated`:
  - member can insert an object whose first path segment is their club id.
  - member cannot insert under another club's id (`42501`) or at the root.
  - member can select/delete their club's objects; club B member sees none of them and cannot delete them.
  - bucket `template-images` exists, is not public, `file_size_limit = 5242880`, allowed mime types are exactly the three above.

- [ ] **Step 2: Run to verify it fails.** Run: `make db-test`. Expected: FAIL, bucket missing.

- [ ] **Step 3: Write the migration.** Insert the bucket into `storage.buckets` (`on conflict do nothing`), then select/insert/delete policies on `storage.objects` with `bucket_id = 'template-images' and (storage.foldername(name))[1] = (select public.current_club_id())::text`. No update policy (re-upload instead).

- [ ] **Step 4: Run to verify it passes.** Run: `make db-reset && make db-test`. Expected: PASS.

- [ ] **Step 5: Commit.**
```bash
git add supabase/migrations/20261113100100_template_images.sql supabase/tests/database/campaign_templates.test.sql
git commit -m "feat(campaigns): add club-scoped storage bucket for template images"
```

---

### Task 3: Template types, config defaults and validation

**Files:**
- Modify: `src/data/types.ts`
- Create: `src/lib/templates.ts`
- Test: `src/lib/templates.test.ts`

**Interfaces:**
- Produces, in `types.ts`:
  ```ts
  export type TemplateType = 'intro' | 'focus' | 'games'
  export type GamesVenue = 'home' | 'away'
  export type IntroConfig = { background_path: string | null; title: string; subtitle: string }
  export type FocusConfig = { badge: string; title: string; image_path: string | null }
  export type GamesConfig = { venue: GamesVenue }
  export type CampaignTemplate =
    | { id: string; campaign_id: string; position: number; created_at: string; updated_at: string; type: 'intro'; config: IntroConfig }
    | { ...same base; type: 'focus'; config: FocusConfig }
    | { ...same base; type: 'games'; config: GamesConfig }
  export type TemplateConfig = IntroConfig | FocusConfig | GamesConfig
  ```
- Produces, in `templates.ts`: `TEMPLATE_TYPE_LABELS: Record<TemplateType, string>` (`Intro`, `Focus`, `Games`); `defaultConfig(type: TemplateType): TemplateConfig`; `validateConfig(type: TemplateType, config: TemplateConfig): string | null` (first error message or null); `templateSummary(t: CampaignTemplate, gameCountByVenue: Record<GamesVenue, number>): string`; `deleteTemplateDescription(t: CampaignTemplate): string`.

- [ ] **Step 1: Write failing tests** in `templates.test.ts`:
  - `defaultConfig('games')` equals `{ venue: 'home' }`; intro/focus defaults have empty strings and `null` paths.
  - `validateConfig('intro', {…title: '  '…})` returns `'Title is required'`; a valid intro returns `null`; intro with empty subtitle and no background is valid.
  - `validateConfig('focus', {badge: '', …})` returns `'Badge is required'`; badge longer than 20 chars returns `'Badge must be 20 characters or fewer'`; title required; `image_path: null` returns `'Image is required'`.
  - `validateConfig('games', {venue: 'neither'} as never)` returns `'Venue must be home or away'`.
  - `templateSummary` for a games template: `'Home · 4 games'`, `'Away · 1 game'`, `'Home · No games'`; for intro: the title; for focus: `'MVP · <title>'`.
  - `deleteTemplateDescription` names the template type and says the campaign's games and uploaded images are not deleted.

- [ ] **Step 2: Run to verify it fails.** Run: `npx vitest run src/lib/templates.test.ts`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement** the types and `templates.ts` per the Interfaces block. Titles are trimmed before checking; messages exactly as in the tests.

- [ ] **Step 4: Run to verify it passes.** Run: `npx vitest run src/lib/templates.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit.**
```bash
git add src/data/types.ts src/lib/templates.ts src/lib/templates.test.ts
git commit -m "feat(campaigns): add template types, defaults and validation"
```

---

### Task 4: Games grouping and slide pagination

**Files:**
- Create: `src/lib/gameSlides.ts`
- Test: `src/lib/gameSlides.test.ts`

**Interfaces:**
- Consumes: `Game` from `src/data/types.ts`.
- Produces:
  ```ts
  export const GAMES_SLIDE_ROW_CAPACITY = 8   // rows per slide; a day header counts as one row
  export type DayGroup = { date: string; games: Game[] }               // date = 'YYYY-MM-DD'
  export type GamesPage = { days: DayGroup[] }                         // a continued day appears again with the same date
  export function groupGamesByDay(games: Game[], venue: GamesVenue): DayGroup[]
  export function paginateDays(days: DayGroup[], capacity?: number): GamesPage[]
  ```

- [ ] **Step 1: Write failing tests** (build small `Game` fixtures via a local `game(date, time, isHome)` helper):
  - `groupGamesByDay` keeps only games with `is_home` matching the venue, groups by `game_date` ascending, sorts each day by `kickoff_time` ascending.
  - empty input and no matching venue return `[]`.
  - `paginateDays([], 8)` returns `[]` (no slide).
  - 3 days with 1, 2, 2 games and capacity 8: one page (3 headers + 5 games = 8 rows).
  - one day with 10 games and capacity 8: two pages; first holds 7 games (header + 7 = 8), second holds 3 games with the same `date`.
  - a header never ends a page: days with 1 game and 6 games and capacity 8 (rows 2 + 7): second day moves entirely to page two, not split as header-alone-on-page-one-with-capacity-left. Specifically page one has only the 1-game day.
  - capacity 2 still makes progress (one header + one game per page), never loops forever.
  - every game appears exactly once across pages, in chronological order.

- [ ] **Step 2: Run to verify it fails.** Run: `npx vitest run src/lib/gameSlides.test.ts`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement** both functions. Pagination walks days; for each day it needs at least header + 1 game rows left on the current page, otherwise it starts a new page; it then takes as many games as fit and continues the remainder with the header repeated. Throw `RangeError` if `capacity < 2`.

- [ ] **Step 4: Run to verify it passes.** Run: `npx vitest run src/lib/gameSlides.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit.**
```bash
git add src/lib/gameSlides.ts src/lib/gameSlides.test.ts
git commit -m "feat(campaigns): group campaign games by day and paginate them onto slides"
```

---

### Task 5: Slide model (`buildSlides`), French text, file names

**Files:**
- Create: `src/lib/slides.ts`
- Test: `src/lib/slides.test.ts`

**Interfaces:**
- Consumes: `CampaignTemplate`, `Game`, `groupGamesByDay`, `paginateDays`.
- Produces:
  ```ts
  export const SLIDE_WIDTH = 1080
  export const SLIDE_HEIGHT = 1350
  export type Slide =
    | { key: string; fileName: string; kind: 'intro'; config: IntroConfig }
    | { key: string; fileName: string; kind: 'focus'; config: FocusConfig }
    | { key: string; fileName: string; kind: 'games'; venue: GamesVenue; days: DayGroup[]; page: number; pageCount: number }
  export function buildSlides(templates: CampaignTemplate[], games: Game[]): Slide[]   // templates sorted by position first
  export function formatDayLabel(date: string): string        // '2026-11-14' -> 'SAMEDI'
  export function formatKickoff(time: string): string         // '20:30:00' -> '20H30'
  export function venueLabel(venue: GamesVenue): string       // 'DOMICILE' | 'EXTÉRIEUR'
  ```
  `key` is unique per slide (`<templateId>` or `<templateId>-<page>`); `fileName` is `01-intro.png`, `02-games-home-1.png`, `03-focus.png`: two-digit global index, type, venue and page for games.

- [ ] **Step 1: Write failing tests:**
  - `formatDayLabel('2026-11-14')` is `'SAMEDI'`, `'2026-11-15'` is `'DIMANCHE'` (parse as local date parts, not UTC, so a timezone cannot shift the day).
  - `formatKickoff('20:30:00')` is `'20H30'`, `'09:05:00'` is `'09H05'`.
  - `venueLabel` returns the two French labels.
  - `buildSlides` orders by `position`, yields one slide for intro/focus, N slides for a games template with N pages, `pageCount` set on each, and zero slides when the venue has no games.
  - file names are numbered across the whole result, contiguous, zero-padded to two digits, and unique.
  - slide `key`s are unique.

- [ ] **Step 2: Run to verify it fails.** Run: `npx vitest run src/lib/slides.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** per the Interfaces block. Use `GAMES_SLIDE_ROW_CAPACITY` from Task 4.

- [ ] **Step 4: Run to verify it passes.** Run: `npx vitest run src/lib/slides.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit.**
```bash
git add src/lib/slides.ts src/lib/slides.test.ts
git commit -m "feat(campaigns): build slide models from templates and games"
```

---

### Task 6: Data layer for templates and images

**Files:**
- Create: `src/data/templates.ts`
- Create: `src/data/templateImages.ts`

**Interfaces:**
- Consumes: `supabase` from `@/supabase`, types from Task 3.
- Produces:
  ```ts
  // templates.ts
  export async function listTemplates(campaignId: string): Promise<CampaignTemplate[]>   // ordered by position
  export async function createTemplate(campaignId: string, type: TemplateType, config: TemplateConfig): Promise<CampaignTemplate>  // position = max + 1
  export async function updateTemplate(id: string, config: TemplateConfig): Promise<void>
  export async function deleteTemplate(id: string): Promise<void>
  export async function reorderTemplates(campaignId: string, orderedIds: string[]): Promise<void>  // rpc reorder_campaign_templates
  // templateImages.ts
  export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
  export type StoredImage = { path: string; name: string; created_at: string }
  export function validateImageFile(file: File): string | null
  export async function uploadTemplateImage(file: File): Promise<string>   // returns the object path
  export async function listTemplateImages(): Promise<StoredImage[]>        // newest first
  export async function downloadTemplateImage(path: string): Promise<Blob>
  ```

- [ ] **Step 1: Write the failing test** for the one pure piece: `src/data/templateImages.test.ts` (Vitest is configured for `src/**/*.test.ts`), asserting `validateImageFile` returns `null` for a 1 KB `image/png`, `'File must be a PNG, JPEG or WebP image'` for `application/pdf`, and `'Image must be 5 MB or smaller'` for a 6 MB `image/jpeg`.

- [ ] **Step 2: Run to verify it fails.** Run: `npx vitest run src/data/templateImages.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement both modules**, following `src/data/campaigns.ts` conventions (select-string constant, row mapper, `if (error) throw error`). `createTemplate` reads the current max position for the campaign and inserts `max + 1`; on a unique violation (`23505`) it retries once. `uploadTemplateImage` validates first, builds the path `<club_id>/<crypto.randomUUID()>-<sanitized filename>` (club id via the `current_club_id` RPC already used elsewhere, or from the profile in `src/auth`; reuse what exists), and throws the validation message on failure. `listTemplateImages` lists the `<club_id>/` folder.

- [ ] **Step 4: Run tests, lint and type-check.** Run: `npx vitest run src/data/templateImages.test.ts && npm run lint && npx tsc -b`. Expected: all pass.

- [ ] **Step 5: Commit.**
```bash
git add src/data/templates.ts src/data/templateImages.ts src/data/templateImages.test.ts
git commit -m "feat(campaigns): add data layer for templates and template images"
```

---

### Task 7: Slide components and PNG export

**Files:**
- Modify: `package.json` (add `html-to-image`, `@fontsource/anton`)
- Modify: `src/main.tsx` (import `@fontsource/anton/400.css`)
- Create: `src/components/slides/SlideFrame.tsx`, `IntroSlide.tsx`, `FocusSlide.tsx`, `GamesSlide.tsx`, `useStorageImage.ts`, `exportSlide.ts`
- Create: `src/assets/slide-background.jpg` (light basketball background, royalty-free or generated; used as the default games/intro backdrop)

**Interfaces:**
- Consumes: `Slide` and `SLIDE_WIDTH/HEIGHT`, `formatDayLabel`, `formatKickoff`, `venueLabel` (Task 5), `downloadTemplateImage` (Task 6).
- Produces:
  ```ts
  export function SlideFrame(props: { children: ReactNode; scale?: number; ref?: Ref<HTMLDivElement> }): JSX.Element  // fixed 1080×1350 box, scaled via CSS transform for previews
  export function SlideView(props: { slide: Slide; scale?: number; ref?: Ref<HTMLDivElement> }): JSX.Element  // switches on slide.kind
  export function useStorageImage(path: string | null): { url: string | null; status: 'idle' | 'loading' | 'ready' | 'missing' }  // downloads the blob, exposes an object URL, revokes it on unmount
  export async function exportSlidePng(node: HTMLElement): Promise<Blob>   // 1080×1350, awaits document.fonts.ready and image decode first
  export function downloadBlob(blob: Blob, fileName: string): void
  ```

- [ ] **Step 1: Install and wire dependencies.** Run: `npm install html-to-image @fontsource/anton`. Add the font import in `main.tsx`.

- [ ] **Step 2: Implement the components** to match the sample: purple `#5b1fa0` text, light lilac day bands, `VS` marker, `Anton` display font, venue title top-right (`DOMICILE` / `EXTÉRIEUR`) in white with purple outline, a day header with a rule line, rows of `kickoff · team · VS · opponent`, a plane icon on away rows only. Long names must wrap within their column and the row height must not exceed `SLIDE_HEIGHT / (GAMES_SLIDE_ROW_CAPACITY + 2)`. Intro renders the background (stored image, or the default asset when `background_path` is null or `missing`) under a translucent overlay with title and subtitle. Focus renders the full-bleed image, the badge pill at top, the title at bottom over a gradient; a `missing` image shows a neutral grey block with the text `Image unavailable`. When `pageCount > 1` the games slide shows a small `page/pageCount` marker.

- [ ] **Step 3: Implement `exportSlidePng`** using `toBlob` from `html-to-image` with `pixelRatio: 1`, `width: SLIDE_WIDTH`, `height: SLIDE_HEIGHT`, after awaiting `document.fonts.ready`. Because the preview node is scaled with a CSS transform, export from an unscaled off-screen clone (`SlideView` rendered at scale 1 in a hidden container) so the PNG is exactly 1080×1350.

- [ ] **Step 4: Verify in the app.** Run: `make start`, temporarily render one `SlideView` of each kind from a scratch route (not committed), and check in the browser: fonts load, the games slide matches the sample, a long name wraps, an unknown storage path shows the placeholder. Then export one slide and confirm the downloaded PNG is 1080×1350 and uses the Anton font. Remove the scratch route. Run: `npm run lint && npm run build`. Expected: pass.

- [ ] **Step 5: Commit.**
```bash
git add package.json package-lock.json src/main.tsx src/components/slides src/assets
git commit -m "feat(campaigns): add slide components and PNG export"
```

---

### Task 8: Template dialogs (add, edit, delete) and image picker

**Files:**
- Create: `src/components/templates/TemplateDialog.tsx`, `TemplateForms.tsx`, `ImagePicker.tsx`

**Interfaces:**
- Consumes: `defaultConfig`, `validateConfig`, `TEMPLATE_TYPE_LABELS` (Task 3); `uploadTemplateImage`, `listTemplateImages`, `validateImageFile` (Task 6); `useStorageImage` (Task 7); `FormField`, `FormMessage`, `NativeSelect`, `toMessage`.
- Produces:
  ```ts
  export function TemplateDialog(props: {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Present when editing; absent when adding. */
    template?: CampaignTemplate
    /** Required when adding. */
    type?: TemplateType
    onSubmit: (type: TemplateType, config: TemplateConfig) => Promise<void>
  }): JSX.Element
  export function ImagePicker(props: { value: string | null; onChange: (path: string | null) => void; disabled?: boolean }): JSX.Element
  ```
  Delete uses the existing `ConfirmDialog` with `deleteTemplateDescription` and is wired in Task 9, not here.

- [ ] **Step 1: Implement `ImagePicker`:** thumbnail grid of the club's stored images (newest first), a file input that calls `validateImageFile` then `uploadTemplateImage`, selecting an image calls `onChange(path)`, a "None" option clears it. Shows the upload error with `FormMessage`.

- [ ] **Step 2: Implement the per-type forms** in `TemplateForms.tsx` (Intro: title, subtitle, background picker; Focus: badge, title, image picker; Games: venue `NativeSelect` with `Home` / `Away`). Validation runs `validateConfig` on submit and shows its message; no inline per-keystroke validation.

- [ ] **Step 3: Implement `TemplateDialog`** following the `CampaignForm` pattern: wrapper owns `busy`, ignores Esc and backdrop while saving, body mounted only while open, submit calls `onSubmit`, errors via `toMessage` keep the dialog open.

- [ ] **Step 4: Verify in the app.** Run: `make start`, open a scratch usage of `TemplateDialog` for each type: required-field errors show, a PDF upload is rejected with the message from Task 6, an uploaded image appears in the grid and is selectable, closing mid-save is blocked. Remove scratch usage. Run: `npm run lint && npx tsc -b`. Expected: pass.

- [ ] **Step 5: Commit.**
```bash
git add src/components/templates
git commit -m "feat(campaigns): add template add/edit dialog and image picker"
```

---

### Task 9: Templates section with drag-and-drop reordering

**Files:**
- Modify: `package.json` (add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`)
- Create: `src/components/templates/TemplatesSection.tsx`, `TemplateList.tsx`
- Modify: `src/pages/CampaignDetailPage.tsx` (mount `TemplatesSection` after the games section, passing `campaignId` and the already-loaded `games`)

**Interfaces:**
- Consumes: Tasks 3, 6, 8; `ConfirmDialog`; `groupGamesByDay` for per-venue counts.
- Produces:
  ```ts
  export function TemplatesSection(props: { campaignId: string; games: GameWithCampaigns[] | null; onSlides: (slides: Slide[]) => void }): JSX.Element
  export function reorderIds(ids: string[], activeId: string, overId: string): string[]   // pure, exported from TemplateList.tsx's sibling `src/lib/templates.ts`
  ```
  `reorderIds` lives in `src/lib/templates.ts` (add it there so it is unit-tested).

- [ ] **Step 1: Write the failing test** for `reorderIds` in `src/lib/templates.test.ts`: moving `'b'` over `'d'` in `['a','b','c','d']` gives `['a','c','d','b']`; moving `'d'` over `'a'` gives `['d','a','b','c']`; `activeId === overId` returns the same order; an unknown id returns the input unchanged.

- [ ] **Step 2: Run to verify it fails.** Run: `npx vitest run src/lib/templates.test.ts`. Expected: FAIL, `reorderIds` not exported.

- [ ] **Step 3: Implement `reorderIds`** and make the test pass. Run: `npx vitest run src/lib/templates.test.ts`. Expected: PASS.

- [ ] **Step 4: Implement the section.**
  - `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`.
  - `TemplateList`: sortable list with a drag handle (keyboard sensor enabled for accessibility), type label, `templateSummary`, edit and delete buttons. On drop, apply `reorderIds` optimistically, call `reorderTemplates`, and reload on error (showing `toMessage`).
  - `TemplatesSection`: loads with `listTemplates` using the request-id ref pattern from `CampaignDetailPage`, an "Add template" menu (Intro / Focus / Games), opens `TemplateDialog`, delete through `ConfirmDialog` with `deleteTemplateDescription`, and calls `onSlides(buildSlides(templates, games))` whenever templates or games change. Empty state: "No templates yet."
  - Mount it in `CampaignDetailPage.tsx` under a `Separator`, keeping the page's existing refresh pattern.

- [ ] **Step 5: Verify in the app.** Run: `make start`. In a campaign with home and away games: add one of each template, drag to reorder and reload the page (order persists), edit each, delete one (confirmation shown, games and images still exist). With a second browser profile signed in to another club, confirm it cannot see them. Run: `npm run lint && npm run build && npm test`. Expected: pass.

- [ ] **Step 6: Commit.**
```bash
git add package.json package-lock.json src/lib/templates.ts src/lib/templates.test.ts src/components/templates src/pages/CampaignDetailPage.tsx
git commit -m "feat(campaigns): add templates section with drag-and-drop reordering"
```

---

### Task 10: Slides preview and download

**Files:**
- Create: `src/components/templates/SlidesPreview.tsx`
- Modify: `src/components/templates/TemplatesSection.tsx` (render the preview from the slides it builds)

**Interfaces:**
- Consumes: `Slide`, `SlideView`, `exportSlidePng`, `downloadBlob` (Tasks 5, 7).
- Produces:
  ```ts
  export function SlidesPreview(props: { slides: Slide[] }): JSX.Element
  ```

- [ ] **Step 1: Implement `SlidesPreview`:** a responsive grid of scaled `SlideView` thumbnails (each captioned with its `fileName`), a per-slide "Download" button, and a "Download all" button that exports and downloads each slide sequentially (one `downloadBlob` per slide, in order, with a short await between them so browsers do not drop multi-downloads) while showing `Exporting 2 of 5…` and disabling the buttons. Export failures show an error naming the slide and let the user retry; one failure does not stop the remaining slides. Empty `slides` shows "Nothing to preview yet." Games templates without games contribute no slide, and the template list row already says "No games" (Task 3 summary).

- [ ] **Step 2: Wire it into `TemplatesSection`.**

- [ ] **Step 3: Verify end to end in the app.** Run: `make start`. Using a campaign with 11 home games on one day plus one away day: the preview shows the home games across two slides with the day header repeated, file names `01-…png` onward are contiguous, "Download all" downloads every slide, each PNG is 1080×1350 and matches the preview (fonts and images included), deleting a stored image leaves a placeholder without blocking other slides.

- [ ] **Step 4: Final verification.** Run: `npm run lint && npm run build && npm test && make db-test`. Expected: all pass. Update `README.md` with a short "Campaign templates" section (what they are, the bucket, `make db-reset` to apply migrations).

- [ ] **Step 5: Commit.**
```bash
git add src/components/templates README.md
git commit -m "feat(campaigns): preview and download template slides as PNG"
```

---

## Self-Review

- **Spec coverage:** Intro/Focus/Games types (Tasks 3, 7, 8); multi-page games (Tasks 4, 5, 10); add/edit/delete (Tasks 8, 9); drag-and-drop reorder (Tasks 1, 9); feed 1080×1350 (Tasks 5, 7); PNG download (Tasks 7, 10); reusable backgrounds and uploaded images (Tasks 2, 6, 8); club isolation (Tasks 1, 2); French slide text (Task 5); delete confirmation (Task 9); no games copied (Tasks 3, 5).
- **Anti-goals:** preview/export mismatch is covered by the off-screen unscaled export and the manual end-to-end check in Task 10; overflow by the wrapping requirement and row-height bound in Task 7; no cross-club access by the pgTAP assertions in Tasks 1 and 2.
- **Type consistency:** `CampaignTemplate`, `TemplateConfig`, `Slide`, `DayGroup`, `GamesVenue` and the function names are used identically across tasks.
- **Test limits:** the project has no component test setup, so component behaviour (Tasks 7 to 10) is verified manually in the browser, and everything that can be pure is in `src/lib` with Vitest.
- **Open tuning:** `GAMES_SLIDE_ROW_CAPACITY = 8` is a starting value to adjust visually in Task 7.
