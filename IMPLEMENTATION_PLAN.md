# IntelDesk Implementation Plan

## Decision

IntelDesk will start as a local-first web app, not a hosted SaaS platform and not a desktop shell on day one.

This is a deliberate adjustment from the original desktop recommendation:

- the user asked for a web app
- the product still benefits from local-first storage and offline-friendly interaction
- the first milestone should validate the research workflow before introducing native shell complexity

## Stack

### Frontend

- `React`
- `TypeScript`
- `Vite`
- plain CSS with design tokens

### Local Data Layer

Planned next:

- `IndexedDB` for local persistence
- local snapshot storage for saved source content
- search index bootstrapped from local content

### Hosted Team Layer

When IntelDesk moves from single-user local-first into a small hosted pilot for colleagues, the recommended service stack is:

- `Nginx` for TLS termination, reverse proxying, and static asset delivery
- `FastAPI` for API endpoints, auth/session logic, exports, and operational reads/writes
- a separate `worker` process for ingestion, extraction, clustering, and delta detection
- `Postgres` for durable shared state and full-text search
- local filesystem storage for snapshots and exports in v1
- `systemd` for service supervision on a small VPS

Avoid introducing Redis, Elasticsearch, Kubernetes, or object-storage daemons on day one for this deployment tier unless load proves they are necessary

### Later Service Layer

Once the UI loop is proven:

- ingestion workers for RSS and manual URL fetch
- extraction pipeline for canonical text and metadata
- background delta detection
- optional desktop packaging if browser background limits become a real constraint

## Core Workflow

IntelDesk should operate on a simple hierarchy of intent:

- `Thread` means the system believes multiple items are about the same thing
- `Watch` means the user believes the thread is worth revisiting
- `Case` means the user wants a durable investigation workspace

Not every thread becomes a case. Most should die in triage. The product becomes useful only if it helps the user close items quickly without losing the ability to resurface real changes.

Daily loop:

1. open `Inbox`, usually with `Only Delta` enabled
2. review thread cards instead of raw items
3. take one action per thread: ignore, review and move on, watch, case, or mute
4. reopen `Cases` for threads that earned durable notes, timeline, and context
5. review `Sources` when IntelDesk suggests new domains worth adding to the canon

## Review Queue Model

The primary queue should be thread-based, not source-item-based.

V1 thread lifecycle states:

- `New`: never reviewed
- `Reviewed`: opened and intentionally left behind without escalation
- `Watching`: explicitly parked for revisit
- `In Case`: promoted into a durable case workspace
- `Muted`: hidden unless manually revisited or overridden by future rules

Derived state:

- `New Delta`: a reviewed, watched, or case-linked thread that changed meaningfully since last seen

Behavior rules:

- opening a thread starts a soft read session
- leaving a thread without another explicit action marks it `Reviewed`
- `Reviewed` threads fall out of the default queue
- a thread can move from `Reviewed` back to `New Delta` when meaningful change occurs
- `Watch` is the lightweight intermediate state between triage and case creation
- `Case` is the durable state for incidents that need notes, timeline, and repeat re-entry

The point is to give every item closure without turning the Inbox into a permanent unread list.

## Source Addition And Discovery Strategy

Source onboarding should be deliberate. Source discovery should be opportunistic and explainable.

### Source Addition

Initial source entry points:

- `Add URL` for one-off source items
- `Add Feed` for continuous RSS monitoring
- `Promote Source` from the Source Registry or Source Radar

The system should not silently subscribe the user to newly discovered sources. Promotion into the monitored set must remain explicit.

### Source Discovery

IntelDesk should discover candidate sources through evidence already flowing through the workbench:

- outbound links extracted from ingested source items
- repeated appearance of a domain in saved, watched, or high-signal threads
- early appearance in a thread timeline
- citation by already promoted domains
- community connectors such as Reddit or Bluesky, treated as pointer layers rather than durable record layers

### Source Radar

`Source Radar` should surface candidates with an interpretable rationale, not a magic score.

Candidate reasons:

- appears early in multiple credible threads
- repeatedly cited by promoted sources
- contributes original reporting more often than repetition
- shows up in watched or case-linked threads with increasing frequency

For each candidate, show:

- why it surfaced
- example threads where it mattered
- current user stance: neutral, promoted, demoted, muted

### Rollout Order

Source onboarding should be built in this order:

1. `Add URL`
2. `Add Feed`
3. `Source Registry`
4. `Source Radar`
5. community discovery connectors, pointer-first and retention-minimal

## Deployment Architecture

### Deployment Target

Initial hosted deployment target:

- `IONOS VPS M`
- `4 GB RAM`

This size is enough for a small internal rollout if the deployment stays lean and the ingestion cadence remains disciplined. It is not the right box for a container-heavy or microservice-heavy architecture.

### Recommended Hosted Layout

Run IntelDesk as a small set of supervised processes on one host:

- `Nginx`
- `inteldesk-api` as a `FastAPI` service
- `inteldesk-worker` as a separate background worker service
- `Postgres`

Serve the built frontend as static files directly from Nginx. Route `/api/` to the FastAPI service. Keep the worker separate from the API process even on the same VPS, because it will fetch and parse arbitrary internet content and should not share the request-serving runtime.

### Why This Layout Fits A 4 GB VPS

This hosted shape is intentionally conservative:

- the frontend costs almost nothing at runtime when served as static assets
- `FastAPI` remains light enough for a small internal audience
- `Postgres` can handle app storage plus initial search needs
- a separate worker preserves architectural isolation without needing more machines
- `systemd` is leaner than a full container orchestration stack on this class of server

### Do Not Add Initially

For the first VPS deployment, do not add:

- `Redis` for queues or cache
- `Elasticsearch` or `OpenSearch`
- `MinIO`
- Docker Swarm or Kubernetes

Instead:

- use a Postgres-backed job table for worker tasks
- use Postgres full-text search for v1
- store HTML snapshots and exports on local disk outside the web root
- back up database dumps and snapshot directories to an external destination

### Operational Shape

Recommended process supervision:

- `nginx.service`
- `postgresql.service`
- `inteldesk-api.service`
- `inteldesk-worker.service`

Recommended API serving model:

- one app process behind `uvicorn` or `gunicorn + uvicorn workers`
- start with low worker counts to preserve RAM
- increase concurrency only after measuring actual team usage

Recommended storage layout:

- Postgres data on the VPS
- snapshot and export files under an application-owned directory such as `/var/lib/inteldesk/`
- nightly off-box backups for database and snapshots

### Security Notes

Because IntelDesk fetches arbitrary external content, the worker should be treated as the higher-risk process.

Minimum safeguards:

- run API and worker under a dedicated non-root application user
- keep fetched content outside the Nginx-served directories
- apply outbound fetch timeouts, size limits, and content-type checks
- separate worker temp files from app runtime files

### Scale-Up Trigger

This single-VPS deployment remains the default until at least one of the following becomes true:

- ingestion jobs begin contending with interactive user traffic
- Postgres search latency becomes noticeably poor
- snapshot storage begins consuming too much local disk
- concurrent colleagues make API latency unstable during ingest windows

When that happens, the first split should be:

1. move Postgres to a managed or separate host
2. move the worker off the web/API box
3. add Redis only if job throughput genuinely requires it

## Milestones

### M0: Repo Foundations

- scaffold the app shell
- codify product doctrine
- build the information architecture into the UI
- make the watch queue and case model visible in the prototype

Exit criteria:

- the repo has an intentional starting structure
- the app shell reflects the real workbench model rather than a generic dashboard

### M1: Local Library, Review State, And Persistence

- add IndexedDB schema for source items, threads, cases, notes, source registry entries, and thread review state
- persist theme, selected views, watch queue, and case list
- add thread-level review lifecycle: new, reviewed, watching, in case, muted
- auto-mark a thread `Reviewed` when the user leaves it without another action
- add reactivation rules so meaningful deltas can revive previously reviewed threads

Exit criteria:

- the app restores state after reload
- thread workflow survives reloads, not just raw content
- the Inbox behaves like a review queue instead of a bookmark pile

### M2: Ingestion And Source Onboarding

- add manual `Add URL`
- add `Add Feed` for RSS sources
- extract main content, title, author, timestamps, and outbound links
- canonicalize URLs and strip safe tracking parameters
- store the minimum viable source-registry record for newly added feeds and discovered domains

Exit criteria:

- new source items can enter the local library through real ingestion paths
- the user can deliberately expand the monitored source set

### M3: Threads, Dedupe, And Delta Reactivation

- exact dedupe using canonical URL and content hash
- near-duplicate grouping using title and entity overlap
- manual merge, split, and canonical-source pinning
- reactivate previously reviewed threads when source content changes or corroboration meaningfully improves

Exit criteria:

- the Inbox feels materially less noisy than the raw source stream
- reviewed items stay out of the way until a real delta occurs

### M4: Watch Queue And Cases

- allow a thread to be watched without forcing case creation
- show a dedicated watch queue inside `Cases`
- create cases from thread, source item, or search result
- allow watched threads to be promoted into cases
- add timestamped notes and timeline entries
- implement last-seen tracking and delta badges per case

Exit criteria:

- an analyst can park promising threads without cluttering active cases
- an analyst can reopen a case and regain context within seconds

### M5: Source Registry And Source Radar

- implement source registry persistence
- add promote, demote, mute, and tags
- compute explainable discovery signals for candidate sources
- surface Source Radar suggestions with examples and rationale
- distinguish discovery-pointer sources from canonical record sources

Exit criteria:

- the Sources view helps build a durable canon
- source discovery feels additive and explainable rather than noisy

### M6: Delta Engine And Export

- detect meaningful content changes for advisory revisions
- summarize what changed between revisions
- show `New Delta` clearly across Inbox and Cases
- export case files to Markdown with notes, timeline, and sources

Exit criteria:

- delta-first review is credible enough for daily usage
- a case can leave the product cleanly as a usable research artifact

### M7: Hosted Pilot Deployment

- package the web build for Nginx static serving
- expose FastAPI under `/api/`
- run worker and API as separate systemd services
- configure Postgres for shared team usage on the VPS
- add backup jobs for database and stored snapshots
- validate the hosted build against the IONOS VPS memory and disk constraints

Exit criteria:

- IntelDesk runs reliably on a single small VPS for a small internal team
- ingestion jobs do not destabilize the interactive app
- backups and restore steps are documented and tested

## Data Model Direction

Core local entities:

- `source_item`
- `thread`
- `thread_item`
- `thread_state`
- `case_file`
- `case_thread`
- `case_item`
- `note`
- `timeline_entry`
- `source_registry`
- `source_feed`
- `source_candidate`

`thread_state` is the operational queue table for v1. It should include enough information to support:

- lifecycle state
- first seen
- last opened
- last reviewed
- last meaningful delta
- last reactivated

`source_item` read state is secondary for v1. The user’s main workflow decisions happen at the thread level.

The current UI mock already follows those concepts, so the view layer will not need to be thrown away when persistence lands.

## Build Rules

- stay single-user and local-first
- keep ingestion explainable and source-grounded
- do not auto-promote newly discovered sources into the monitored set
- do not add social or team workflow concepts to v1
- optimize for rapid re-entry into a live case
- design for offline reading and durable notes
- keep the primary review unit at the thread level
