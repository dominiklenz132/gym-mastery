# GYM MASTERY

Independent web frontend and MCP training backend. No Base44 runtime, SDK or data dependency.

## Run checks

Node.js 20+: `npm ci`, then `npm test`. The build emits an ES module Worker at `dist/server/index.js`. React source lives in `src/`, backend source in `server/`; `dist/` is generated. UI uses Tailwind CSS, adapted shadcn/ui-style Radix components and Lucide icons, with Manrope/DM Sans typography. Run `node scripts/dev.mjs` after building for isolated local visual QA.

The standalone PWA has generated 192/512px icons, a manifest and an offline reconnect screen. It does not silently queue workout writes offline. Base44 is a separate visual experimentation lab, never a production dependency. See DESIGN-REDESIGN.md.

## Hosting

The current deployment uses Cloudflare Workers with D1 SQL persistence through Sites. Set the logical D1 binding `DB` and apply the SQL migrations in `drizzle/`. Sites provisions the database and applies migrations. The database is SQL/SQLite, not PostgreSQL. The domain module has no hosting dependencies. To move hosts, replace the D1 persistence adapter and authenticated identity adapter. Never trust identity headers on an unprotected origin; the current gateway strips and supplies those headers.

Browser API and MCP share one authenticated domain service. Each user owns a separate state record with optimistic revision checks. Training snapshots preserve plan history; set request IDs prevent duplicates. No demonstration training data is inserted automatically.

## ChatGPT

`POST /mcp` exposes plan creation/listing, plan details, session start/resume, set logging, history, preferences, progression and workout completion. UI is delivered through an MCP Apps resource with the standard host bridge. Publishing with the MCP capability provisions the private plugin. No OpenAI API key is needed for ChatGPT to call these tools.

## Current limits

Plan editing/version creation, set corrections, own-data export and real-data strength charts are implemented. Automated tests cover core domain behavior and the shared browser/MCP service with an isolated persistence test double. The published plugin has successfully loaded the authenticated user's context. Account deletion, configured backup/restore operations, broad chart ranges and comprehensive accessibility QA remain pending. This is not yet a completed commercial release.
