# GYM MASTERY

Independent web frontend and MCP training backend. No Base44 runtime, SDK or data dependency.

## Run checks

Node.js 20+: `npm test`, then `npm run build`. The build emits an ES module Worker at `dist/server/index.js`. Source is `server/worker.js`, `server/domain.js` and `dist/` frontend assets.

## Hosting

The current deployment uses Cloudflare Workers with D1 SQL persistence through Sites. Set the logical D1 binding `DB` and apply the SQL migrations in `drizzle/`. Sites provisions the database and applies migrations. The database is SQL/SQLite, not PostgreSQL. The domain module has no hosting dependencies. To move hosts, replace the D1 persistence adapter and authenticated identity adapter. Never trust identity headers on an unprotected origin; the current gateway strips and supplies those headers.

Browser API and MCP share one authenticated domain service. Each user owns a separate state record with optimistic revision checks. Training snapshots preserve plan history; set request IDs prevent duplicates. No demonstration training data is inserted automatically.

## ChatGPT

`POST /mcp` exposes plan creation/listing, plan details, session start/resume, set logging, history, preferences, progression and workout completion. UI is delivered through an MCP Apps resource with the standard host bridge. Publishing with the MCP capability provisions the private plugin. No OpenAI API key is needed for ChatGPT to call these tools.

## Current limits

Plan editing/version creation, detailed interactive charts, account deletion/export, database backups and full responsive/accessibility QA are still pending. This is not yet a completed commercial release.
