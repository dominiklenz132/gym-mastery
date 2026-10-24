# GYM MASTERY — Performance Atelier

## Design judgement

UI/UX Pro Max was searched for the full design system and shadcn dialog accessibility. The first editorial/luxury result recommended brutalism and fashion typography, which did not fit active fitness tracking. A narrowed fitness dashboard query returned Barlow sports typography and block hierarchy. We kept its hierarchy/touch guidance, but selected Manrope + DM Sans for a calmer premium training product rather than aggressive gym branding. Decorative gamification was excluded in accordance with the user brief.

## Implementation

- Independent React 19 frontend; server/API/MCP continue sharing authenticated persistent training state.
- Tailwind CSS 4 compiled locally. Source components follow shadcn/ui Radix/New York patterns (CVA Button, Radix Dialog, Input and Badge), customized for the product.
- Lucide React icons throughout.
- Editorial photographic workout hero, restrained pale-lime actions, warm neutral surfaces, tabular training numbers, amber milestones and consistent depth.
- Real-data-only dashboard, workout history and strength charts. No fabricated readiness, performance or record metrics.
- PWA manifest, vector app icon, install action when supported, service worker with an honest offline screen. Training writes require a live connection.
- Hero image: https://images.unsplash.com/photo-1534438327276-14e5300c3a48 (Unsplash), bundled as optimized WebP. No external image service needed at runtime.
- Base44 is a separate design lab. Production has no Base44 SDK, entities, login or MCP dependency.

## QA

Run `npm test` for shared API/MCP and domain tests. `node scripts/dev.mjs` runs the exact built Worker with an isolated in-memory visual QA store, bound only to 127.0.0.1. Its test records never enter the production database.
