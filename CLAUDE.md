# AngelRaise

Watch ads to raise money for nonprofits — no donations required.

## Tech Stack
- **Framework**: Next.js 16.2.4 (TypeScript, Tailwind v4)
- **Fonts**: Plus Jakarta Sans (display), Nunito Sans (body)
- **Hosting**: Cloudflare Workers via @opennextjs/cloudflare
- **State**: React Context (client-only, resets on reload)
- **Domain**: https://angelraise.ontheclock.live
- **Repo**: https://github.com/mc-barnes/angelraise

## Project Structure
```
angelraise/
├── CLAUDE.md              ← you are here
├── DESIGN_SYSTEM.md       ← locked design tokens (read before UI changes)
├── MVP_CHECKLIST.md       ← full build history and gate log
└── app/
    ├── src/
    │   ├── app/           ← Next.js pages (/, /campaign/[id], /create, /impact)
    │   ├── components/    ← Header
    │   ├── context/       ← AppContext (campaigns, adViews, recordAdView, addCampaign)
    │   ├── data/          ← types.ts, mockData.ts (15 campaigns, 4 ads)
    │   └── theme/         ← colors.ts, index.ts (spacing, radius, shadow constants)
    ├── wrangler.jsonc     ← Cloudflare Workers config
    └── open-next.config.ts
```

## Commands
- **Dev (canonical, D1-aware)**: `cd app && pnpm exec wrangler dev --port 8787 --local` → http://localhost:8787
- **Dev (UI-only, no D1)**: `cd app && pnpm dev` → http://localhost:3000
- **Build (Next)**: `cd app && pnpm build`
- **Build (worker bundle)**: `cd app && pnpm build:cf`
- **Deploy**: `cd app && pnpm deploy` (builds + deploys to Cloudflare)

## D1 (after schema or seed changes)
- **Local apply**: `cd app && pnpm exec wrangler d1 migrations apply angelraise --local`
- **Local seed**: `cd app && pnpm exec wrangler d1 execute angelraise --local --file=migrations/0002_seed.sql`
- **Remote (prod) apply**: `cd app && pnpm exec wrangler d1 migrations apply angelraise --remote`
- **Remote (prod) seed**: `cd app && pnpm exec wrangler d1 execute angelraise --remote --file=migrations/0002_seed.sql`
- **Inspect**: `pnpm exec wrangler d1 execute angelraise --local --command="SELECT ..."`
- **Regenerate env types** (after wrangler.jsonc changes): `cd app && pnpm cf-typegen`

## Key Files
- `app/src/lib/db.ts` — typed D1 query helpers + cents↔dollars mappers; recordAdView uses in-batch SQL subqueries to prevent over-fund races
- `app/src/lib/session.ts` — anon session cookie (`ar_anon`, UUID-validated, Secure derived from request transport)
- `app/src/lib/validation.ts` — input validators for /api/campaigns and /api/ad-views
- `app/migrations/0001_initial.sql` — schema (integer cents, CHECK constraints)
- `app/migrations/0002_seed.sql` — 15 seeded campaigns
- `app/src/data/types.ts` — Campaign, AdView, CampaignCategory interfaces
- `app/wrangler.jsonc` — D1 binding (`DB`) + Workers Rate Limit binding (`AD_VIEW_RATE_LIMITER`, 10 req/min)

## Design System
Read `DESIGN_SYSTEM.md` before any visual changes. Key tokens:
- Brand orange: `#F28C28` / Primary blue: `#2B7DE9`
- Text: `#1A1D21` / `#5E6572` / `#8C939E`
- Radius: sm 6px, md 10px, lg 14px, xl 20px
- All values are hardcoded in Tailwind classes (not CSS vars) — keep consistent

## v1 Status (Complete)
- 5 screens: Home (Dashboard), Campaign Detail (Hero), Watch Ad, Create Campaign, My Impact
- All gates passed, code review passed, deployed to Cloudflare

## v2 P0 #4 — D1 Persistence (Complete)
- Cloudflare D1 schema (integer cents, CHECK constraints) + 15-campaign seed
- Server Components for reads (Home, Detail, Impact); Route Handlers for writes
- POST /api/campaigns (validated, dollars→cents in db.ts), POST /api/ad-views (rate-limited 10/min/IP, atomic batch with in-batch SQL subqueries to prevent over-fund races, anon ar_anon cookie)
- AppContext + mockData removed; all data flows through D1

---

## v2 Roadmap

### P0 — Core Experience Gaps

#### 1. Auth & User Identity
- Add basic auth (email/password or OAuth with Google)
- Replace "Anonymous User" in recordAdView with real user identity
- Gate Create Campaign behind auth (hosts must be logged in)
- My Impact becomes per-user (currently global)
- **Screens**: Sign Up, Log In, Account Settings (new)

#### 2. Real Ad Playback
- Replace mock video player with actual `<video>` element playing the sample MP4s
- Enforce that the ad actually plays (can't just fast-forward)
- Track ad completion server-side (current timer is client-only, trivially bypassable)
- Add ad skip prevention (disable page navigation during playback)

#### 3. Campaign Image Upload
- Replace hardcoded Unsplash URL in Create Campaign with real image upload
- Use Cloudflare R2 for storage
- Add image preview in the create form
- Support crop/resize on upload

#### 4. Server-Side Persistence
- Migrate from React Context (resets on reload) to Cloudflare D1
- Schema: `campaigns`, `ad_views`, `users` tables
- API routes for CRUD operations
- Keep context as a client cache layer over the API

#### 5. Search & Sort
- Add search bar to Home page (search by title, host, description)
- Sort options: newest, most funded, almost funded, most views
- Make category filter URL-driven (shareable filtered views)

### P1 — Engagement & Retention

#### 6. Social Sharing
- Share button on Campaign Detail (copy link, Twitter/X, Facebook)
- Open Graph meta tags per campaign (dynamic og:image, og:title)
- "Invite friends to watch" CTA after completing an ad view

#### 7. Campaign Updates
- Allow hosts to post text updates on their campaign
- Show update feed on Campaign Detail below description
- Notify supporters when a campaign they funded posts an update

#### 8. Fully Funded Celebrations
- Confetti animation when a campaign hits 100%
- "You helped fund this" badge on campaigns the user contributed to
- Funded campaign summary email to all contributors

#### 9. Leaderboard
- Top funders this week/month (by $ raised through ad views)
- Top campaigns by velocity (fastest growing)
- Gamification: badges for milestones (10 ads, 50 ads, $5 raised, etc.)

#### 10. Mobile Responsive Polish
- Test and fix all 5 screens at 375px width
- Bottom sticky CTA on Campaign Detail (mobile)
- Horizontal scroll touch behavior on Trending cards
- Hamburger menu for Header on small screens

### P2 — Platform & Scale

#### 11. Host Dashboard
- Campaign analytics for hosts (views over time, funding velocity, top referrers)
- Edit campaign (title, description, goal)
- Pause/unpause campaign
- Withdraw funds (placeholder — needs payment integration)

#### 12. Admin Panel
- Review and approve new campaigns before they go live
- Flag/remove inappropriate content
- Platform-wide analytics (total raised, DAU, ad completion rate)

#### 13. Real Ad Network Integration
- Replace mock ads with a real ad provider (Google AdSense, or direct partnerships)
- Dynamic cost-per-view based on actual ad revenue
- Ad targeting based on user interests / campaign category

#### 14. Dark Mode
- Extend DESIGN_SYSTEM.md with dark palette
- Add theme toggle to Header
- Persist preference in localStorage

### Tech Debt (from v1 code review)

- [ ] Add `role="progressbar"` + `aria-valuenow/min/max` to all progress bars
- [ ] Consume CSS variables from globals.css instead of hardcoded hex (or remove dead CSS vars)
- [ ] Remove dead exports in `theme/colors.ts` and `theme/index.ts` (spacing, radius, shadow unused)
- [ ] Add unit tests for: ad watch flow, campaign creation, state updates, progress calculations
- [ ] Extract shared `ProgressBar` component (duplicated in home and campaign detail)
- [ ] Add `aria-label="Main navigation"` to Header `<nav>`
- [ ] Handle `goalAmount === 0` edge case in percentage calculations
- [ ] Update shared components table in MVP_CHECKLIST.md (currently says "pending")
- [ ] Complete Phase 8b Use Case Review
