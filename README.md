# IntelDesk

> A Feedly-like threat intelligence platform with first-class case tracking.

IntelDesk is being scoped as a threat intelligence product for analysts who want the speed of Feedly Threat Intelligence for information gathering, but need a stronger place to follow incidents, build context, and keep durable investigation records.

The product direction is:

- `Threat Landscape` for prioritized monitoring
- `Agents` for saved monitors and recurring research lenses
- `Intel Cards` for CVEs, attacks, malware, actors, vendors, and campaigns
- `Cases` for tracked investigations with notes, timelines, and deltas
- `Sources` and `Briefs` as supporting workflow surfaces

Current repo state:

- `React + Vite + TypeScript` frontend prototype
- `IndexedDB` for local analyst state in the current build
- a lightweight preview and seed API for `Add URL`
- deployment path already working on a small VPS behind `Nginx`

## Documentation

| Document | Description |
|---|---|
| [PRODUCT_STRATEGY.md](./PRODUCT_STRATEGY.md) | Product thesis, benchmark takeaways, user workflows, and v1 scope |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Architecture, milestones, data model direction, and rollout plan |
| [DESIGN_BIBLE.md](./DESIGN_BIBLE.md) | UX, visual language, interaction rules, and component behavior |

## Product Principles

- Lean into the Feedly workflow for collection, monitoring, and prioritization.
- Make `Cases` the durable differentiator once a signal matters enough to follow.
- Keep every important assertion source-backed and time-stamped.
- Show what changed since last view before showing everything else.
- Build multi-user readiness into the model without forcing heavy enterprise complexity on day one.

## Local Bootstrap

1. Install dependencies with `npm install`
2. Start the app shell with `npm run dev`
3. Start the intake API with `npm run dev:api`
4. Build with `npm run build`

## Current Intake API

The current preview and seed API lives at `server/intakePreviewServer.mjs`.

- it listens on `127.0.0.1:4100`
- Vite proxies `/api/*` to that port during local development
- set `INTELDESK_API_DATA_DIR` if you want seed jobs persisted outside the current release directory

Current endpoints:

- `POST /api/intake/preview`
- `POST /api/intake/seed`
- `GET /api/intake/jobs/:jobId`

Current `Add URL` behavior:

- `Add to Inbox` creates a local thread and source item immediately
- `Seed & Expand` creates the same local thread, then asks the backend to fetch the seed URL and expand related sources from outbound links
- completed expansion jobs enrich the local thread with discovered related sources and resurface it as a meaningful delta

This repo is still an early product prototype, but the docs now treat IntelDesk as a real hosted threat intelligence product target rather than only a local research workbench.
