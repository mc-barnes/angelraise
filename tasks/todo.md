# TODO: D1 Persistence

Tracks slice-level progress. Detailed acceptance criteria live in `plan.md`. Architecture review decisions live in `SPEC.md` §14.

## Slice A — Foundation
- [ ] Run `wrangler d1 create angelraise` in `app/`
- [ ] Add `d1_databases` binding (`DB`) to `wrangler.jsonc`
- [ ] Add Workers Rate Limiting binding to `wrangler.jsonc` (10 req/min, namespace=ad_views)
- [ ] Run `pnpm cf-typegen` to regenerate `cloudflare-env.d.ts`
- [ ] Write `migrations/0001_initial.sql` (integer cents, CHECK constraint on ad_views identity)
- [ ] Write `migrations/0002_seed.sql` (15 campaigns, dollars→cents, `INSERT OR IGNORE`)
- [ ] Apply both migrations locally
- [ ] Verify seed count = 15 and amounts are integer cents
- [ ] Write `src/lib/db.ts` (typed query helpers, centralized cents↔dollars mappers, `recordAdView` with batch + MIN delta)
- [ ] Write `src/lib/session.ts` (`getAnonSession()` UUID-validated read; `setAnonSession()` for handlers)
- [ ] Write `src/lib/validation.ts` (UUID-shape, length, integer dollars validators)
- [ ] `pnpm build` passes

**Checkpoint:** Inspect schema + seed in D1 before A.5.

## Slice A.5 — Smoke test
- [ ] Add throwaway `/_probe` Server Component
- [ ] Run `wrangler dev`, visit `/_probe`, confirm count = 15
- [ ] Confirm goal_amount displays as dollars (e.g. `500`, not `50000`)
- [ ] (Will be deleted in Slice G if not removed sooner)

**Checkpoint:** If smoke fails, fix Slice A; do not proceed to B.

## Slice B — Home reads from D1
- [ ] Convert `src/app/page.tsx` to async Server Component using `await getCloudflareContext({ async: true })`
- [ ] Call `listCampaigns({ limit: 100 })`
- [ ] Extract `src/app/_components/CategoryFilter.tsx` client island
- [ ] Verify Home renders 15 campaigns from D1
- [ ] Verify edit-row-in-D1 → reload reflects change

## Slice C — Campaign Detail reads from D1
- [ ] Convert `src/app/campaign/[id]/page.tsx` to async Server Component
- [ ] Call `getCampaign(id)` and `listRecentAdViewsForCampaign(id, 5)`
- [ ] Extract `src/app/campaign/[id]/_components/WatchButton.tsx` client island
- [ ] Verify hero, sidebar, ProgressBar render
- [ ] Verify 404 for unknown id

## Slice D — My Impact reads from D1
- [ ] Convert `src/app/impact/page.tsx` to async Server Component
- [ ] Read anon cookie via `await cookies()` from `next/headers`
- [ ] Validate UUID shape; treat malformed as missing
- [ ] Call `listAdViewsForSession(sessionId, { limit: 100 })`
- [ ] Verify empty-state when no cookie / no views

**Checkpoint:** Read path complete. Re-read SPEC §4 before writes.

## Slice E — POST /api/campaigns + Create form refactor
- [ ] Write `src/app/api/campaigns/route.ts` POST handler
- [ ] Implement `validateCampaignInput()` (length checks, integer dollars, valid category)
- [ ] Refactor `src/app/create/page.tsx` to fetch API + `useTransition`
- [ ] Verify create → redirect → visible on Home
- [ ] Verify cross-browser visibility
- [ ] Verify dollars→cents conversion happens in `db.ts` (not in route or form)
- [ ] Verify validation errors return 400

## Slice F1 — POST /api/ad-views (backend only)
- [ ] Write `src/app/api/ad-views/route.ts` POST handler
- [ ] Implement Workers Rate Limiting check (10 req/min per IP)
- [ ] Implement UUID-shape validation on campaignId + ar_anon cookie
- [ ] Implement 409 guard for fully-funded campaign
- [ ] Implement `recordAdView()` in db.ts: D1 batch with MIN(cost, goal-raised) delta
- [ ] Implement `setAnonSession()` with `Secure` only in production
- [ ] curl test: 201 success path
- [ ] curl test: 400 malformed campaignId
- [ ] curl test: 404 nonexistent campaignId
- [ ] curl test: 409 fully-funded campaign
- [ ] curl test: 429 rate limit
- [ ] DB invariant: `SUM(amount_credited) == raised_amount` after a goal-cap-crossing call

**Checkpoint:** All 6 curl cases pass before F2.

## Slice F2 — Watch Ad UI swap
- [ ] Refactor `src/app/campaign/[id]/watch/page.tsx` to fetch /api/ad-views
- [ ] Wrap mutation in `useTransition`
- [ ] Add `router.refresh()` then `router.push()` post-success
- [ ] Handle 409 response (campaign funded mid-watch) gracefully
- [ ] Handle 429 response (rate-limited) gracefully
- [ ] Verify full browser E2E watch flow
- [ ] Race two tabs on same campaign; second gets 409, no broken state

## Slice F3 — Drop viewerName
- [ ] Remove `viewerName` from `AdView` in `src/data/types.ts`
- [ ] Update `ActivityFeed` in Campaign Detail to display literal "Anonymous"
- [ ] `pnpm build` passes
- [ ] `grep -r viewerName app/src` returns empty

**Checkpoint:** Run all 6 SPEC §10 E2E checks on `wrangler dev`.

## Slice G — Cleanup
- [ ] Delete `src/context/AppContext.tsx`
- [ ] Delete `src/data/mockData.ts`
- [ ] Remove `<AppProvider>` from `src/app/layout.tsx`
- [ ] Remove `COST_PER_VIEW` from `src/theme/index.ts`
- [ ] Delete `/_probe` route if not already removed
- [ ] `grep` confirms no remaining references to `useApp` / `mockData` / `COST_PER_VIEW`
- [ ] Update `CLAUDE.md` Commands section: D1 + migration commands; `wrangler dev` as canonical
- [ ] Mark v2 P0 #4 complete in `MVP_CHECKLIST.md`
- [ ] `pnpm build` + `pnpm lint` pass

**Checkpoint:** Run `/review-code` on full diff (B–G).

## Slice H — Production deploy
- [ ] Confirm `database_id` in `wrangler.jsonc` is the prod database
- [ ] Note D1 time-travel timestamp before remote migration (rollback anchor)
- [ ] Run `/ship` checklist
- [ ] `wrangler d1 migrations apply angelraise --remote`
- [ ] `wrangler d1 execute angelraise --remote --file=migrations/0002_seed.sql`
- [ ] `pnpm deploy`
- [ ] Manual E2E: 6 SPEC §10 checks on https://angelraise.ontheclock.live
- [ ] Monitor `wrangler tail` for 5xx during E2E
- [ ] Mark v2 P0 #4 complete in CLAUDE.md and MVP_CHECKLIST.md
