# SPEC: D1 Persistence (v2 P0 #4)

**Status:** Draft — pending approval
**Owner:** McCay Barnes
**Created:** 2026-05-05

## 1. Objective

Move AngelRaise's app state from in-memory React Context (resets on page reload) to Cloudflare D1 (durable, shared across users). This is the foundation for v2: Auth (#1), Real Ad Playback (#2), Campaign Updates (#7), Leaderboard (#9), and Host Dashboard (#11) all depend on server-side persistence.

**Target users:** Same as v1 — viewers (watch ads, see funding update) and hosts (create campaigns).

**Success criteria:**
- Data survives page reload, browser close, and worker restarts.
- Two browsers see the same campaigns and funding totals.
- An ad view recorded in browser A is visible in browser B within one revalidation cycle.
- 15 seed campaigns appear on first load of fresh DB.
- All v1 user flows (Home, Campaign Detail, Watch Ad, Create Campaign, My Impact) work end-to-end against D1.
- Works locally with `wrangler dev` and on production Cloudflare Workers.

**Out of scope (deferred to later v2 items):**
- Real authentication (#1) — `users` table is a skeleton, IDs nullable.
- Real ad playback / server-side completion enforcement (#2).
- Image upload to R2 (#3).
- Search/sort APIs (#5).
- Any new UI screens.

## 2. Architecture decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Server Components for reads** (Home, Campaign Detail) query D1 via `await getCloudflareContext({ async: true })` | Better SEO, faster first paint, no client waterfall. Async mode is safe in both `next dev` (Node) and Workers runtime. API routes use sync mode (always run on Workers). |
| 2 | **API routes for writes** (`POST /api/campaigns`, `POST /api/ad-views`) | Mutations need explicit endpoints; client triggers them via fetch. |
| 3 | **Nullable `user_id` / `host_id`** until auth ships | Avoids throwaway anon-user rows; clean fill-in path when #1 lands. |
| 4 | **Anonymous session cookie** (`ar_anon`) for My Impact scoping | Keeps My Impact per-browser today, still carries forward into auth (anon → real user merge later). |
| 5 | **Raw SQL** via D1 client, no ORM | Few queries, simple schema; ORM is premature. Revisit if query count explodes. |
| 6 | **Wrangler-native migrations** (`wrangler d1 migrations`) | First-party tooling, no extra deps. |
| 7 | **Client write cache** in `AppProvider` for optimistic UI | Keeps existing UX (instant credit feedback after ad view) without round-trip latency. |
| 8 | **Atomic ad-view write** via D1 batch API | Insert ad_view + UPDATE campaigns.raised_amount in one batch — no partial writes if worker dies mid-flight. |

## 3. Schema

```sql
-- migrations/0001_initial.sql

CREATE TABLE users (
  id TEXT PRIMARY KEY,                  -- UUID, populated when auth lands
  email TEXT UNIQUE,                    -- nullable until auth
  name TEXT,
  created_at INTEGER NOT NULL           -- unix ms
);

CREATE TABLE campaigns (
  id TEXT PRIMARY KEY,                  -- UUID
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,               -- enum stored as TEXT
  image_url TEXT NOT NULL,
  goal_amount INTEGER NOT NULL,         -- cents; >= 0
  raised_amount INTEGER NOT NULL DEFAULT 0,
  cost_per_view INTEGER NOT NULL,       -- 5 (cents) for v2
  total_ad_views INTEGER NOT NULL DEFAULT 0,
  host_name TEXT NOT NULL,
  host_description TEXT NOT NULL,
  host_id TEXT REFERENCES users(id),    -- nullable until auth
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_campaigns_category ON campaigns(category);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);

CREATE TABLE ad_views (
  id TEXT PRIMARY KEY,                  -- UUID
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  user_id TEXT REFERENCES users(id),    -- nullable until auth
  anon_session_id TEXT,                 -- cookie value pre-auth; nullable post-auth
  ad_title TEXT NOT NULL,
  amount_credited INTEGER NOT NULL,     -- cents; equals MIN(cost_per_view, goal_amount - raised_amount_pre)
  viewed_at INTEGER NOT NULL,
  CHECK (user_id IS NOT NULL OR anon_session_id IS NOT NULL)
);

CREATE INDEX idx_ad_views_campaign ON ad_views(campaign_id);
CREATE INDEX idx_ad_views_user ON ad_views(user_id);
CREATE INDEX idx_ad_views_anon ON ad_views(anon_session_id);
```

**Notes:**
- `ad_views` has both `user_id` and `anon_session_id` so My Impact can scope by whichever exists (cookie now, user later).
- `cost_per_view` stored on `campaigns` so historical changes to the platform rate don't retroactively change funded totals.
- All amounts are `INTEGER` cents. Display layer divides by 100. No floating-point drift. `db.ts` mappers convert cents → dollars in domain objects so UI code stays unchanged.
- `created_at` / `viewed_at` are unix milliseconds (INTEGER). Convert to `Date` at the access layer.

## 4. API contracts

### `POST /api/campaigns`
**Body:**
```ts
{
  title: string;          // 1-100 chars
  description: string;    // 1-500 chars
  category: CampaignCategory;
  imageUrl: string;       // URL
  goalAmount: number;     // > 0
  hostName: string;       // 1-100 chars
  hostDescription: string;// 1-200 chars
}
```
**Response:** `201 { id: string }` | `400 { error: string }`
**Behavior:** Inserts row with `raised_amount=0`, `total_ad_views=0`, `cost_per_view=0.05`, `host_id=null`, `created_at=now()`, `id=crypto.randomUUID()`.

### `POST /api/ad-views`
**Body:**
```ts
{
  campaignId: string;       // UUID-shape validated
  adTitle: string;          // 1-100 chars
}
```
**Responses:**
- `201 { id, amountCredited, raisedAmount }` on success
- `400 { error }` malformed body / invalid UUID shape
- `404 { error }` campaign not found
- `409 { error }` campaign already fully funded
- `429 { error }` rate-limited

**Behavior:**
- **Rate limit** check via Workers Rate Limiting binding: max 10 req/min per IP. Reject with 429 above threshold.
- Reads `ar_anon` cookie; if missing or malformed (not UUID-shaped), generates new one and sets `Set-Cookie: ar_anon=<uuid>; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000` (+ `Secure` in production).
- 409 guard: read campaign first; if `raised_amount >= goal_amount`, return without writing.
- Batch-executes (atomic via D1 `db.batch([...])`):
  1. `INSERT INTO ad_views (...)` with `anon_session_id = cookie`, `amount_credited = MIN(cost_per_view, goal_amount - raised_amount)`.
  2. `UPDATE campaigns SET raised_amount = raised_amount + <delta>, total_ad_views = total_ad_views + 1 WHERE id = ?` where `<delta>` is the same MIN computed above.
- **Invariant:** `SUM(ad_views.amount_credited) == campaigns.raised_amount` for any given campaign. The MIN formula in both statements (using pre-update raised_amount) ensures no drift.
- Returns updated raised total in cents → dollars for optimistic UI reconciliation.

## 5. Read paths (Server Components)

| Page | Query |
|------|-------|
| `/` (Home) | `SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 100` (compute trending + stats in JS) |
| `/campaign/[id]` | `SELECT * FROM campaigns WHERE id = ?` + `SELECT * FROM ad_views WHERE campaign_id = ? ORDER BY viewed_at DESC LIMIT 5` |
| `/impact` | `SELECT av.*, c.title AS campaign_title FROM ad_views av JOIN campaigns c ON c.id = av.campaign_id WHERE av.anon_session_id = ? ORDER BY av.viewed_at DESC LIMIT 100` |
| `/create` | No read — pure form. |

Server Components: `const { env } = await getCloudflareContext({ async: true })`. Cookies via `await cookies()` from `next/headers` (Next 16 cookies API is async). Pages re-fetch on each request (no `force-cache`); revisit caching once we hit perf issues. `getAnonSession()` validates the cookie value is UUID-shaped; treats malformed cookies as missing.

## 6. Client refactor

**`AppContext.tsx` becomes a thin write cache:**
- No longer holds seed data — receives `initialCampaigns` prop from server.
- Wait — actually, since Home and Campaign Detail are now Server Components, they fetch their own data. AppContext is only needed for:
  - Watch Ad page (client) — needs campaign data + `recordAdView` mutation
  - Create Campaign page (client) — needs `addCampaign` mutation
  - Optimistic UI updates after writes
- **Decision (confirmed):** Remove `AppProvider` and `AppContext.tsx` entirely. Pass campaign data as props from Server Components into client components that need it. Mutations call APIs directly with `useTransition` + `router.refresh()` for revalidation.

**Files affected:**
- `app/src/app/layout.tsx` — remove `<AppProvider>`.
- `app/src/context/AppContext.tsx` — **delete** (or keep as no-op until Watch Ad / Create Campaign refactored, then delete).
- `app/src/app/page.tsx` — convert to Server Component, extract category filter into `<CategoryFilter>` client island.
- `app/src/app/campaign/[id]/page.tsx` — convert to Server Component, keep "Watch Ad" CTA as client.
- `app/src/app/campaign/[id]/watch/page.tsx` (or wherever ad watch lives) — call `POST /api/ad-views` on completion.
- `app/src/app/create/page.tsx` — call `POST /api/campaigns`, redirect to new campaign on success.
- `app/src/app/impact/page.tsx` — convert to Server Component, read cookie.

## 7. Project structure (additions)

```
app/
├── migrations/
│   ├── 0001_initial.sql
│   └── 0002_seed.sql           ← 15 seed campaigns
├── src/
│   ├── lib/
│   │   ├── db.ts               ← typed query helpers
│   │   ├── session.ts          ← anon cookie get/set
│   │   └── validation.ts       ← input validation for API routes
│   ├── app/
│   │   ├── api/
│   │   │   ├── campaigns/route.ts
│   │   │   └── ad-views/route.ts
│   │   └── (existing pages, refactored)
│   └── data/
│       ├── types.ts            ← keep (shared types)
│       └── mockData.ts         ← DELETE after seed migration
└── wrangler.jsonc              ← add d1_databases binding
```

## 8. Commands

```bash
# One-time setup
cd app
wrangler d1 create angelraise                           # capture database_id
# Edit wrangler.jsonc with database_id
wrangler d1 migrations apply angelraise --local         # apply schema locally
wrangler d1 execute angelraise --local --file=migrations/0002_seed.sql

# Production
wrangler d1 migrations apply angelraise --remote
wrangler d1 execute angelraise --remote --file=migrations/0002_seed.sql

# Dev loop
pnpm dev                                                # Next dev (uses wrangler-emulated D1 via OpenNext)
# OR
wrangler dev                                            # full Workers runtime locally

# Type generation (after wrangler.jsonc changes)
pnpm cf-typegen                                         # regenerates cloudflare-env.d.ts with DB binding

# Deploy
pnpm deploy
```

**Confirmed:** `wrangler dev` is the canonical local dev command for D1-aware testing. `pnpm dev` (Next dev) will be relegated to UI-only iteration where D1 isn't needed. CLAUDE.md commands section will be updated in Slice G.

## 9. Code style

- Keep raw SQL in `db.ts`; do not scatter SQL across components.
- All DB row → domain object mapping in `db.ts` (e.g., `camelCase` keys, `Date` from millis).
- API routes are thin: parse → validate → call `db.ts` → return JSON. No business logic.
- No comments unless the *why* is non-obvious (per CLAUDE.md).
- Match existing TypeScript style: explicit types on exported functions, no default exports for utilities.
- No new dependencies — D1 client is built into the Workers runtime.

## 10. Testing strategy

**Manual E2E (wrangler dev) — required before merge:**
1. Fresh local DB → 15 seed campaigns visible on Home.
2. Watch ad on a campaign → raised total increments by $0.05, persists across reload, visible in second browser.
3. Create campaign → appears on Home, persists across reload.
4. My Impact in browser A shows that browser's views; browser B shows none.
5. Goal cap: campaign at $X.95 of $Y goal — next view caps at goal (no over-fund).
6. Two simultaneous ad views on same campaign — total increments by $0.10, no lost writes.

**Unit tests (deferred to tech-debt phase, not blocking this spec):**
- Goal-cap logic in `recordAdView` SQL.
- Validation in `lib/validation.ts`.
- Session cookie get/set.

**No integration test harness yet.** Cloudflare's D1 testing story is rough; manual E2E is acceptable for v2.

## 11. Boundaries

### Always do
- Run `wrangler d1 migrations apply --local` before testing locally after schema changes.
- Validate API inputs at the route boundary; never trust client.
- UUID-shape check on `campaignId` and `ar_anon` cookie at API boundary.
- Use D1 batch (`db.batch([...])`) for multi-statement atomic writes.
- Reference `node_modules/next/dist/docs/` before writing Next 16 patterns (CLAUDE.md rule).
- Keep `cost_per_view` read from the campaign row, not from a constant — leaves room for per-campaign rates later.
- Centralize cents↔dollars conversion in `db.ts` mappers — never sprinkle `* 100` / `/ 100` in components or routes.
- Render user-supplied text (descriptions, titles, host names) as React text only; **never** `dangerouslySetInnerHTML`.
- Set `Secure` cookie flag in production (`process.env.NODE_ENV === 'production'`); omit in local http dev.

### Ask first
- Adding any new dependency.
- Changing the schema after migration 0001 ships (use additive migrations only).
- Caching Server Component reads (`fetch` cache, `unstable_cache`) — has perf and freshness tradeoffs.
- Skipping the goal cap (e.g., letting campaigns over-fund).
- Touching production D1 (`--remote` migrations or executes).

### Never do
- Bypass validation on API routes.
- Issue raw SQL outside `db.ts`.
- Drop or rewrite columns in a migration — additive only.
- Commit `database_id` from a personal account if it's a shared prod DB (it goes in `wrangler.jsonc`, which is checked in — verify with user this is the prod ID).
- Leave `mockData.ts` import paths alive after deletion (TS will catch, but double-check).
- Skip hooks (`--no-verify`) per global rules.

## 12. Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `pnpm dev` doesn't see D1 binding | Resolved | n/a | `next.config.ts` already calls `initOpenNextCloudflareForDev()` so `pnpm dev` would see bindings via platform proxy. **User chose `wrangler dev` as canonical** for closer Workers runtime parity. CLAUDE.md updated in Slice G. |
| Bot drains campaign cap via `/api/ad-views` spam | Medium | High (UX) | Workers Rate Limiting binding: 10 req/min per IP. Returns 429 above threshold. Real ad-completion (#2) hardens further. |
| `cookies()` is async in Next 16 (breaking change) | High | Medium | Spec calls for `await cookies()` everywhere; lint will catch sync misuse. |
| `SUM(amount_credited)` drifts from `raised_amount` due to goal cap | Medium | Medium | API uses `MIN(cost, goal - raised)` for both INSERT and UPDATE delta — invariant holds. |
| CSRF on POST routes | Low | Medium | SameSite=Lax + same-origin policy. Re-evaluate when auth (#1) ships. Documented residual risk. |
| OpenNext + D1 binding edge cases | Medium | Medium | Consult `node_modules/next/dist/docs/` and OpenNext docs at `opennext.js.org/cloudflare`. Test with `pnpm preview` before deploy. |
| Race condition on goal cap (two concurrent views push past goal) | Low | Low | `MIN(raised + cost, goal)` in UPDATE makes it idempotent at the row level. |
| Cents↔dollars conversion bug at boundary | Medium | Low | Single mapper in `db.ts` (`rowToCampaign`); domain object exposes dollars. Validate at API boundary that incoming `goalAmount` is integer dollars and convert to cents in one place. |
| Anon cookie lost → My Impact appears empty | Low | Low | Documented behavior; auth (#1) fixes it. |
| Seed migration applied twice | Low | Medium | Use `INSERT OR IGNORE` in 0002; document that prod seed runs once. |

## 13. Acceptance gates

Before declaring done:
- [ ] All 6 manual E2E checks pass on `wrangler dev`.
- [ ] All 6 manual E2E checks pass on production after deploy.
- [ ] `SUM(amount_credited) == raised_amount` invariant verified via test data on a partially-capped campaign.
- [ ] Rate limit confirmed: 11th request in a minute returns 429.
- [ ] 409 confirmed: POST to fully-funded campaign rejected.
- [ ] Malformed cookie (`ar_anon=garbage`) treated as missing.
- [ ] `mockData.ts` deleted; no remaining imports.
- [ ] `AppContext.tsx` and `<AppProvider>` deleted entirely.
- [ ] `cloudflare-env.d.ts` regenerated with `DB` and rate-limit bindings.
- [ ] `CLAUDE.md` updated: D1 dev/migration commands, new file paths, `wrangler dev` as canonical.
- [ ] `MVP_CHECKLIST.md` v2 P0 #4 marked complete.
- [ ] `/review-code` passed.
- [ ] `/ship` checklist completed before production deploy.

## 14. Architecture review decisions (locked 2026-05-05)

These supersede earlier text where they conflict:

1. **`amount_credited = MIN(cost_per_view, goal_amount - raised_amount)`** — invariant `SUM == raised_amount` holds.
2. **Slice F split into F1 (backend), F2 (UI), F3 (cleanup).** See `tasks/plan.md`.
3. **Workers Rate Limiting binding added** in Slice F1 (10 req/min per IP on `/api/ad-views`).
4. **Slice A.5 added** — smoke test `db.ts` against local D1 before any UI conversion.
5. **`wrangler dev` is canonical** local command (user choice). `pnpm dev` works via `initOpenNextCloudflareForDev` but is reserved for UI-only iteration.
6. **Prod D1 is brand new** — no existing data; clean apply of migrations + seed.
7. **`cookies()` and `getCloudflareContext({ async: true })` are async in Server Components.**
8. **`CHECK (user_id IS NOT NULL OR anon_session_id IS NOT NULL)`** added to `ad_views`.
9. **409 guard** in `POST /api/ad-views` for fully-funded campaigns.
10. **UUID-shape validation** on `campaignId` (API) and `ar_anon` cookie (read).
11. **`Secure` cookie flag** conditional on production.
12. **Centralized cents↔dollars conversion** in `db.ts` mappers only.
13. **`LIMIT 100`** on `listCampaigns()` and `listAdViewsForSession()`.
