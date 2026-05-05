# MVP Checklist — AngelRaise

## Vision
- Problem: People want to support nonprofits but can't afford to donate money
- User: Cause-minded young adults (college students, young professionals)
- Platform: Web | Framework: Next.js (TypeScript, Tailwind)

## Hypothesis
> We believe **cause-minded young adults** have **the intent to donate but not the funds**, and will **watch ads to fund campaigns** if we build **a platform that converts ad views into donations**. We'll validate this by **users completing the watch-ad-to-fund loop multiple times per session**.

## Persona
- Name & context: Alex, 22, college senior — volunteers at a local food bank, shares causes on social media
- Primary goal: Support causes they care about without spending money
- Key frustration: Wants to help but can't afford donations; sharing on social media feels hollow
- Current workaround: Shares GoFundMe links and hopes friends with money donate
- Success moment: Watches 5 ads, sees the campaign progress bar move, feels like they actually made a difference

## Success Criteria
- [ ] User can go from landing → pick campaign → watch ad → see progress update in under 60 seconds
- [ ] Watch-ad-to-fund loop feels rewarding enough for 3+ repeats per sitting
- [ ] Host can create a campaign and see it on browse page within 1 minute

## Screen Inventory

| Screen | Priority | Wireframe | Styled | Variations | Integration | Status |
|--------|----------|-----------|--------|------------|-------------|--------|
| Home / Browse | P0 | done | V3 (Dashboard) | 3 | done | complete |
| Campaign Detail | P0 | done | V1 (Hero) | 3 | done | complete |
| Watch Ad | P0 | done | done | 1 | done | complete |
| Create Campaign | P0 | done | done | 1 | done | complete |
| My Impact | P1 | done | done | 1 | done | complete |

## User Flows
- [ ] Flow 1: Watch ads to fund — Home → Campaign Detail → Watch Ad → Campaign Detail (updated)
- [ ] Flow 2: Create campaign — Nav → Create Campaign → fill form → Campaign Detail (new)
- [ ] Flow 3: Check impact (P1) — Nav → My Impact → view history

## Shared Components
| Component | First Used In | Status |
|-----------|--------------|--------|
| Header/Nav | Home | pending |
| CampaignCard | Home | pending |
| ProgressBar | Campaign Detail | pending |
| AdPlayer | Watch Ad | pending |

## Navigation Structure
```
App (Next.js)
├── / (Home / Browse Campaigns)
│   └── /campaign/[id] (Campaign Detail)
│       └── /campaign/[id]/watch (Watch Ad — modal/overlay)
├── /create (Create Campaign)
├── /impact (My Impact — P1)
└── Layout (Header + Footer)
```

## Data Entities
[Pending — Phase 2]

## Analytics Events
[Pending — Phase 2]

## Gate Log
- **Gate 1** (IA): APPROVED — Riskiest assumption: "Users will find campaigns they care about" — without many real campaigns, browsing might feel empty. Mitigation: seed with 10-15 diverse, realistic mock campaigns.
- **Gate 2** (design system): APPROVED — Orange brand (#F28C28) + blue primary (#2B7DE9), Plus Jakarta Sans + Nunito Sans, clean white backgrounds. Faithful to original DNA, modernized for 2026.
- **Gate 3** (wireframe flow): APPROVED — All 4 P0 screens tappable, flows verified.
- **Dev Review: Architecture** (post-Gate 3): [pending]
- **Gate 4** (styled core): APPROVED — Home V3 (Dashboard), Campaign Detail V1 (Hero), Watch Ad, Create Campaign, My Impact all styled. Clean build.
- **Gate 5** (integration): APPROVED — All 5 screens wired, shared state works, clean build, empty/funded states handled.
- **Dev Review: Code** (post-Gate 5): APPROVE — Fixed 3 critical (recordAdView logic bug, double-credit, form a11y), 2 important (context memoization, unused import). Build clean.

## Feedback Tracker

## Use Case Review (Phase 8b)
