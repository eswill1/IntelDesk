# IntelDesk

> A local-first threat intel research workbench for tracking incidents, sources, and deltas without losing provenance.

IntelDesk is built for a single analyst who reads across scattered, uneven sources and needs a durable place to turn that chaos into trackable cases. The product favors provenance, clustering, and change detection over feeds, engagement, or client workflow.

## Current Direction

This repo now starts as a local-first web app:

- `React + Vite + TypeScript` for a fast product shell
- `IndexedDB` for local persistence with a multi-user-ready analyst model
- background ingestion and extraction workers planned behind the UI shell
- a three-surface workbench centered on `Inbox`, `Cases`, `Sources`, and `Search`

The first implementation target is a working research cockpit, not a backend platform.

## Documentation

| Document | Description |
|---|---|
| [DESIGN_BIBLE.md](./DESIGN_BIBLE.md) | Visual language, workbench interaction rules, and content tone |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Repo-specific architecture, milestones, and data model direction |

## Product Principles

- Discovery lives upstream; IntelDesk stores the record.
- Threads must reduce noise, not repackage it.
- Sources come before summaries.
- The right default question is: what changed since last view?
- The product remains single-user and local-first for v1.

## Local Bootstrap

1. Install dependencies with `npm install`
2. Start the app shell with `npm run dev`
3. Build with `npm run build`

## Backend Preview API

IntelDesk now includes a small preview API for `Add URL` at `server/intakePreviewServer.mjs`.

- Start it with `npm run dev:api`
- It listens on `127.0.0.1:4100`
- Vite proxies `/api/*` to that port during local development
- Set `INTELDESK_API_DATA_DIR` if you want seed jobs persisted outside the current release directory

The current endpoints are:

- `POST /api/intake/preview`
- `POST /api/intake/seed`
- `GET /api/intake/jobs/:jobId`

They provide server-side URL fetch, best-effort metadata extraction, outbound-link discovery, and a first-pass seed job model so `Add URL` can evolve into a seed-and-expand workflow instead of staying a manual form forever.

Current `Add URL` behavior:

- `Add to Inbox` creates a local thread and source item immediately
- `Seed & Expand` creates the same local thread, then asks the backend to fetch the seed URL and expand related sources from outbound links
- completed expansion jobs enrich the existing local thread with discovered sources and re-surface it as a meaningful delta

The current UI is a high-fidelity shell with representative data, intended to lock the interaction model before ingestion and persistence land.
