# Mobile overflow fix — 2026-10-24

Reproduced on the previous live version at 360px: document scrollWidth 367px, hero/week panel right edge 367.33px. The mobile 1fr track inherited the weekly calendar's intrinsic minimum width.

Fix: explicit zero minimums on grid/flex content, bounded single-column mobile tracks, flexible calendar cells, static grid layout for the week score, consistent 16px gutters (12px below 360), wrapping user titles, smaller mobile hero and safe-area-aware navigation/content spacing. No global overflow hiding is used to mask content.

Browser QA against the built Worker, with isolated local-only training data:

| Viewport | Available document width | Content scroll width |
| --- | --- | --- |
| 320 | 305 | 305 |
| 360 | 345 | 345 |
| 375 | 360 | 360 |
| 390 | 375 | 375 |
| 414 | 399 | 399 |
| 844 landscape | 829 | 829 |

The desktop browser reserves 15px for its vertical scrollbar. Plans, plan dialog, workout with a long exercise name, and progress were also checked at 320px with no document overflow. Dark and light themes retain the same sizing rules. These are browser viewport checks, not a claim of physical-device testing.
