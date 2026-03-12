# IntelDesk

> A local-first threat intel research workbench for tracking incidents, sources, and deltas without losing provenance.

IntelDesk is built for a single analyst who reads across scattered, uneven sources and needs a durable place to turn that chaos into trackable cases. The product favors provenance, clustering, and change detection over feeds, engagement, or client workflow.

## Current Direction

This repo now starts as a local-first web app:

- `React + Vite + TypeScript` for a fast product shell
- `IndexedDB` planned for local persistence
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
2. Start the app with `npm run dev`
3. Build with `npm run build`

The current UI is a high-fidelity shell with representative data, intended to lock the interaction model before ingestion and persistence land.
