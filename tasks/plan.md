# PLAN: D1 Persistence

**Source spec:** `SPEC.md`
**Created:** 2026-05-05
**Status:** Draft — pending approval

## Slicing strategy

Vertical slices. Each slice is independently reviewable, deployable to local, and rollback-safe. The order is chosen so that read paths land before write paths — meaning we can confirm D1 is wired up correctly with low-risk read-only changes before touching mutation flow.

## Dependency graph

```
A   (foundation: D1 + schema + seed + db.ts + helpers)
└── A.5 (smoke test: db.ts → seeded campaigns count via throwaway probe)
    ├── B  (Home read)
    ├── C  (Detail read)
    ├── D  (Impact read)
    └── E  (Create write)
                    └── F1 (POST /api/ad-views: backend, atomic, rate limit, 409, cookie)
                          └── F2 (Watch Ad UI → fetch /api/ad-views)
                                └── F3 (drop viewerName; activity feed = "Anonymous")
                                      └── G (cleanup: AppContext/mockData/COST_PER_VIEW)
                                            └── H (prod deploy + E2E)
```

- **A blocks everything.**
- **B/C/D/E can theoretically run in parallel after A**, but we'll sequence them for clean reviews.
- **F is the riskiest slice** (atomic batch + cookie + UI flow); land it after the read paths so we have a stable baseline.
- **G can only happen after B–F all use D1** — once nothing imports `mockData` or `useApp`.
- **H is gated on `/review-code` passing.**

## Checkpoints

| After | Review action |
|-------|---------------|
| Slice A | Inspect schema in D1 (`wrangler d1 execute --local "SELECT name FROM sqlite_master WHERE type='table'"`); confirm seed count = 15. |
| Slice A.5 | Smoke test passes: throwaway probe lists 15 campaigns from D1 via `db.ts`. Bail before B if this fails. |
| Slice D | Read path complete on local. Re-read SPEC §4 (API contracts) before starting writes. |
| Slice F1 | `curl` POST to `/api/ad-views` works: row inserted, raised_amount incremented, cookie returned. Test 409 on funded campaign. Test 429 on 11th rapid call. |
| Slice F3 | Run all 6 manual E2E checks (SPEC §10) on `wrangler dev`. |
| Slice G | `pnpm build` clean; no `useApp` / `mockData` / `COST_PER_VIEW` references left. |
| Slice H | Run `/ship` checklist before applying remote migrations or deploying. |

---

## Slice A — Foundation: D1 + schema + seed + access layer

**Goal:** D1 database created, schema migrated, 15 campaigns seeded, typed query layer ready. No app code touches D1 yet.

**Files created:**
- `app/migrations/0001_initial.sql` — schema (integer cents, CHECK constraint on ad_views identity)
- `app/migrations/0002_seed.sql` — 15 campaigns from `mockData.ts` converted to cents, `INSERT OR IGNORE`
- `app/src/lib/db.ts` — typed query functions; centralized cents↔dollars mappers
- `app/src/lib/session.ts` — `getAnonSession()` (read-only, UUID validated); `setAnonSession()` for route handlers
- `app/src/lib/validation.ts` — input validators (UUID-shape, length checks, integer dollars)

**Files modified:**
- `app/wrangler.jsonc` — add `d1_databases` binding (`DB`) + `ratelimits` binding for `/api/ad-views`
- `app/cloudflare-env.d.ts` — regenerated via `pnpm cf-typegen`

**Acceptance criteria:**
1. `wrangler d1 create angelraise` succeeds; binding ID captured in `wrangler.jsonc`.
2. `wrangler d1 migrations apply angelraise --local` applies 0001 cleanly.
3. `wrangler d1 execute angelraise --local --file=migrations/0002_seed.sql` inserts 15 rows.
4. `wrangler d1 execute angelraise --local "SELECT COUNT(*) FROM campaigns"` returns 15.
5. `wrangler d1 execute angelraise --local "SELECT goal_amount, raised_amount FROM campaigns LIMIT 1"` returns integer values (cents).
6. `db.ts` exports typed functions: `listCampaigns({ limit })`, `getCampaign(id)`, `listRecentAdViewsForCampaign(id, limit)`, `createCampaign(input)`, `recordAdView(input)`, `listAdViewsForSession(sessionId, { limit })`. Each maps cents → dollars in returned domain objects.
7. `recordAdView()` uses D1 `db.batch()` with the MIN(cost, goal-raised) formula computed pre-batch.
8. `pnpm cf-typegen` regenerates `cloudflare-env.d.ts` with `DB: D1Database` binding.
9. `pnpm build` still passes (db.ts has no runtime callers yet, so no regression).

**Verification:** Schema and seed inspected via `wrangler d1 execute` queries. `db.ts` is callable but not yet invoked from app code.

**Risks:** First time touching D1 in this repo — Wrangler config quirks. Resolved before Slice B starts.

---

## Slice A.5 — Smoke test `db.ts` against local D1

**Goal:** Prove the full plumbing (D1 binding → `getCloudflareContext` → `db.ts` query → cents↔dollars mapping) works via a one-shot probe before converting any real page.

**Approach:** Create a throwaway Server Component route at `/_probe` that calls `listCampaigns()` and renders the count + first campaign title. Run `wrangler dev`, visit `/_probe`, confirm. Delete route in same commit (or in Slice G).

**Acceptance criteria:**
1. `/_probe` returns the seed campaign count (15).
2. First campaign's `goalAmount` displays as a sane dollar value (e.g., `500`, not `50000`).
3. No errors in `wrangler tail` console.

**Verification:** 5-minute manual check. If it fails, the bug is in foundation (Slice A), not in any UI conversion — much easier to localize.

**Rollback:** Single commit revert (or roll into Slice G cleanup).

---

## Slice B — Home reads from D1

**Goal:** `/` is a Server Component that lists campaigns from D1.

**Files modified:**
- `app/src/app/page.tsx` — convert from client to Server Component; calls `listCampaigns()`; renders stats + trending + list. Filter UI extracted.
- `app/src/app/_components/CategoryFilter.tsx` (new) — client component owning filter state. Receives campaigns as prop, renders the category tabs + filtered list section.

**Files NOT touched yet:**
- `AppContext.tsx`, `mockData.ts` still exist and are still imported by other pages. Layout still wraps in `<AppProvider>`. (Cleanup in Slice G.)

**Acceptance criteria:**
1. Home page renders without `"use client"` at the top.
2. 15 seed campaigns appear from D1 (verify by editing one row's title via `wrangler d1 execute` and refreshing — should reflect).
3. Stats (Total Raised, Ad Views, Fully Funded, Active) calculate correctly using cents → dollars conversion.
4. Trending list renders 5 campaigns sorted by velocity.
5. Category filter still works (client island).
6. Page reload returns same data (it's coming from D1, not in-memory state).
7. `pnpm dev` works (with caveat: may need `wrangler dev` instead — see SPEC §12 risk register; document outcome here).

**Verification:** `wrangler dev` → http://localhost:8787 → see all 15 campaigns; modify a row in D1 directly, reload page, see change.

**Rollback:** Single commit revert restores client-only Home reading from Context.

---

## Slice C — Campaign Detail reads from D1

**Goal:** `/campaign/[id]` is a Server Component reading single campaign + recent ad_views.

**Files modified:**
- `app/src/app/campaign/[id]/page.tsx` — convert to Server Component; calls `getCampaign(id)` and `listRecentAdViewsForCampaign(id, 5)`. Renders hero + sidebar.
- `app/src/lib/db.ts` — add `listRecentAdViewsForCampaign(campaignId, limit)` if not already in A.
- `app/src/app/campaign/[id]/_components/WatchButton.tsx` (new) — client component for the CTA (no logic changes; just isolation so the page can be a Server Component).

**Acceptance criteria:**
1. Detail page renders without `"use client"`.
2. Hero, sidebar, ProgressBar, HowItWorks all render with correct values.
3. Recent Activity feed shows at most 5 most recent views (will be empty until Slice F lands writes — that's expected).
4. 404 case ("campaign not found") renders correctly for unknown id.
5. ProgressBar color logic intact (orange < 80%, yellow ≥ 80%, green when funded).

**Verification:** Click into a campaign from Home, see detail page; navigate to `/campaign/nonexistent`, see "Campaign not found"; reload preserves state.

**Rollback:** Single commit revert.

---

## Slice D — My Impact reads from D1 (anon cookie)

**Goal:** `/impact` is a Server Component reading ad_views scoped by anon session cookie.

**Files modified:**
- `app/src/app/impact/page.tsx` — convert to Server Component; reads cookie via `next/headers`, calls `listAdViewsForSession(sessionId)` and `listCampaigns()` for join data.
- `app/src/lib/session.ts` — `getOrCreateAnonSession(): { id, isNew }` helper. Note: in a Server Component we can only **read** cookies; **setting** a new cookie must happen from a Route Handler or Server Action. So `getAnonSession()` (read-only) is what /impact needs. Cookie creation happens in Slice F (POST /api/ad-views).

**Acceptance criteria:**
1. Impact page renders without `"use client"`.
2. With no cookie, page shows the empty-state UI ("No ads watched yet" + Browse Campaigns CTA).
3. With a cookie but no matching ad_views, page shows the empty-state UI.
4. Stats row renders (zeros initially).
5. Page reads cookie correctly via `cookies()` from `next/headers`.

**Verification:** Open `/impact` in fresh browser → empty state. (Full validation comes in Slice F when ad-view writes populate this.)

**Rollback:** Single commit revert.

---

## Slice E — POST /api/campaigns + Create form refactor

**Goal:** Creating a campaign writes to D1 and persists.

**Files created:**
- `app/src/app/api/campaigns/route.ts` — `POST` handler: parse → validate → `createCampaign()` → return `{ id }`.

**Files modified:**
- `app/src/app/create/page.tsx` — replace `useApp().addCampaign` call with `fetch('/api/campaigns', {...})` inside `useTransition`; on success, `router.push('/campaign/' + id)`. Keep loading + error states.
- `app/src/lib/validation.ts` — `validateCampaignInput()` returns `{ ok: true, value } | { ok: false, error }`.

**Acceptance criteria:**
1. POST /api/campaigns with valid body returns `201 { id }`.
2. POST with missing fields returns `400` with descriptive error.
3. POST with `goalAmount < 1` (dollars) returns `400`.
4. Create form submission shows loading state during POST.
5. On success, user redirected to new campaign detail page; campaign visible on Home after redirect (router.push triggers fresh server render).
6. New campaign survives reload and visible in second browser.
7. `goalAmount` from form (dollars, integer string) is converted to cents in API route, stored as integer cents.

**Verification:** Create campaign → submit → land on new detail page → reload Home → new campaign in list. Open second browser → also visible.

**Rollback:** Revert + remove API route file.

---

## Slice F1 — POST /api/ad-views (backend only)

**Goal:** Functional `/api/ad-views` endpoint with atomic batch, cookie set, rate limit, and 409 guard. **No UI changes.** Validated via `curl`.

**Files created:**
- `app/src/app/api/ad-views/route.ts` — `POST`: rate-limit check, validate campaignId UUID, read/set anon cookie, 409 guard if funded, batch INSERT + UPDATE with MIN delta formula, return `{ id, amountCredited, raisedAmount }`.

**Files modified:**
- `app/src/lib/db.ts` — `recordAdView({ campaignId, adTitle, anonSessionId })` uses D1 batch API for atomicity. Computes `delta = MIN(cost_per_view, goal_amount - raised_amount)` from a pre-read of the campaign row, then batches `[INSERT ad_view, UPDATE campaigns]`.
- `app/src/lib/session.ts` — `setAnonSession(response)` for route handlers; sets `Secure` only in production.
- `app/wrangler.jsonc` — add Workers Rate Limiting binding (10 req/min per IP, namespace=ad_views).

**Acceptance criteria:**
1. `curl -X POST http://localhost:8787/api/ad-views -H 'Content-Type: application/json' -d '{"campaignId":"<id>","adTitle":"Nike"}'` returns 201 with body `{id, amountCredited, raisedAmount}`.
2. Returned `Set-Cookie` header includes `ar_anon=<uuid>; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000` (no `Secure` in dev).
3. Subsequent `curl` calls (with cookie) reuse the cookie (no new `Set-Cookie` header).
4. `wrangler d1 execute --local "SELECT * FROM ad_views"` shows the inserted row with `anon_session_id` matching the cookie.
5. `wrangler d1 execute --local "SELECT raised_amount FROM campaigns WHERE id=?"` shows incremented value.
6. Invariant: `SUM(amount_credited) FROM ad_views WHERE campaign_id=?` equals `raised_amount` for that campaign (verify after several test calls including one that crosses the goal cap).
7. POST to fully-funded campaign returns 409.
8. POST with malformed campaignId (`{"campaignId":"not-a-uuid","adTitle":"x"}`) returns 400.
9. POST to nonexistent campaignId (valid UUID, no row) returns 404.
10. 11th rapid POST in 60s from same IP returns 429.

**Verification:** `curl` script in `tasks/scratch/` (gitignored) covering all 9 cases. Run on `wrangler dev`.

**Rollback:** Revert + remove route file + revert `db.ts` `recordAdView`. UI still uses Context (unchanged).

---

## Slice F2 — Watch Ad UI calls /api/ad-views

**Goal:** Watch Ad page swaps `useApp().recordAdView()` for `fetch('/api/ad-views', ...)`.

**Files modified:**
- `app/src/app/campaign/[id]/watch/page.tsx` — replace context call with `fetch` inside `useTransition`. On success, `router.refresh()` then `router.push(/campaign/${id})` so detail page shows updated total. Keep existing timer UI and `phase` guard for in-flight dedup.

**Acceptance criteria:**
1. Watch ad page still plays the 15s timer + "Credit & Continue" flow visually unchanged.
2. Clicking "Credit & Continue" POSTs to `/api/ad-views`, shows loading state, redirects on success.
3. Ad-view row visible in D1; raised_amount on Detail page reflects the increment after redirect.
4. `/impact` shows the new view after reload.
5. Campaign Detail Recent Activity feed shows the view.
6. 409 from server (e.g., race-condition where someone else funded it during your timer) shows a "campaign already funded" toast/redirect; no broken state.
7. 429 from server (rate-limited) shows a "please wait" message; doesn't crash.

**Verification:** Full browser E2E. Open two tabs on same campaign, race them; second receives 409, both DB rows clean.

**Rollback:** Revert Watch Ad page to Context-based flow (F1 backend stays).

---

## Slice F3 — Drop `viewerName`; activity feed = "Anonymous"

**Goal:** Remove the dead `viewerName` field. Display layer hardcodes "Anonymous" for the activity feed until auth ships.

**Files modified:**
- `app/src/data/types.ts` — drop `viewerName` from `AdView`.
- `app/src/app/campaign/[id]/page.tsx` — `ActivityFeed` component: replace `view.viewerName` with literal `"Anonymous"`.
- `app/src/lib/db.ts` — `mapAdView` no longer reads/produces `viewerName`.
- (No DB schema change — `ad_views` never had `viewer_name`.)

**Acceptance criteria:**
1. `pnpm build` passes.
2. Activity feed shows "Anonymous" for all rows.
3. No remaining references to `viewerName` (`grep -r viewerName app/src` returns empty).

**Verification:** Build + visual check on Detail page activity feed.

**Rollback:** Trivial revert.

**Checkpoint after F3:** Run all 6 manual E2E checks (SPEC §10) on `wrangler dev`.

---

## Slice G — Cleanup

**Goal:** Remove dead code now that nothing reads/writes through Context.

**Files deleted:**
- `app/src/context/AppContext.tsx`
- `app/src/data/mockData.ts`

**Files modified:**
- `app/src/app/layout.tsx` — remove `<AppProvider>` wrapper.
- `app/src/theme/index.ts` — remove `COST_PER_VIEW` constant (now stored on each campaign row).
- `app/src/data/types.ts` — final type pass: ensure interfaces match D1 row shapes (after cents→dollars mapping).
- `CLAUDE.md` — update Commands section: add D1 setup + migration commands; flag `wrangler dev` vs `pnpm dev` if relevant.
- `MVP_CHECKLIST.md` — mark v2 P0 #4 complete.

**Acceptance criteria:**
1. `pnpm build` passes.
2. `pnpm lint` passes.
3. `grep -r "useApp\|AppContext\|mockData\|mockCampaigns\|mockAds\|COST_PER_VIEW" app/src` returns nothing.
4. All 6 E2E checks still pass after cleanup.

**Verification:** Build, lint, manual E2E re-run.

**Rollback:** Single commit revert (this is purely deletions + small mods; safe).

---

## Slice H — Production deploy + E2E

**Goal:** Ship to production Cloudflare; confirm prod E2E.

**Pre-flight:**
- Run `/review-code` on the full diff (B–G).
- Run `/ship` checklist.
- Confirm production D1 ID in `wrangler.jsonc` is the prod database (per SPEC §11 boundaries).

**Steps:**
1. `wrangler d1 migrations apply angelraise --remote` → creates schema in prod.
2. `wrangler d1 execute angelraise --remote --file=migrations/0002_seed.sql` → seed 15 campaigns to prod.
3. `pnpm deploy` → builds + deploys to Cloudflare Workers.
4. Manual E2E: run all 6 SPEC §10 checks on https://angelraise.ontheclock.live.

**Acceptance criteria:**
1. Migration applied to remote D1 successfully.
2. Seed query returns 15 rows on remote.
3. Production deploy succeeds; site loads at custom domain.
4. All 6 E2E checks pass on production.
5. No 5xx errors in `wrangler tail` during E2E.

**Verification:** Manual E2E on production. Two real browsers / devices for cross-browser data sharing check.

**Rollback:**
- For app: `wrangler rollback` to previous deploy.
- For DB: prod schema is additive. If needed, drop tables + reapply (no data to preserve in seed-only state).

---

## What this plan does NOT cover

Per SPEC §1 out-of-scope, deferred to future v2 items:
- Auth (#1) — `users` schema is a skeleton; `host_id` and `user_id` stay null.
- Real ad playback (#2) — timer UI unchanged; server-side completion enforcement comes later.
- Image upload (#3) — Create form still uses hardcoded Unsplash URL.
- Search/sort APIs (#5).
- Mobile responsive polish (#10) — no responsive changes.
- Tech debt items — separate batched PR after this lands.

## Estimated review surface

| Slice | LOC delta (rough) | Review difficulty |
|-------|-------------------|-------------------|
| A | +280 (SQL + db.ts + helpers) | Medium — review schema + invariants |
| A.5 | +15 / -15 | Low — throwaway probe |
| B | +30 / -50 | Low |
| C | +40 / -10 | Low |
| D | +30 / -50 | Low |
| E | +60 / -10 | Medium |
| F1 | +90 / 0 | High — atomic write + rate limit + cookie |
| F2 | +20 / -10 | Medium |
| F3 | -10 | Low |
| G | -150 | Low |
| H | 0 (deploy only) | Medium |

Total: ~+575 / -305 LOC across 11 commits.
