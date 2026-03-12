# IntelDesk Implementation Plan

## Product Decision

IntelDesk should be implemented as a hosted web platform shaped primarily by the Feedly Threat Intelligence workflow, with case management and follow-through as the differentiator.

The target product is:

- a `Threat Landscape` home for daily monitoring
- `Agents` for saved monitoring lenses
- `Intel Cards` for grouped intelligence objects such as CVEs, attacks, malware, vendors, and actors
- `Cases` for durable investigations
- `Sources`, `Library`, `Briefs`, and `Search` as supporting surfaces

The current local-first prototype remains useful, but it is now explicitly a stepping stone toward a team-ready hosted product.

## Product Architecture

### Product Surfaces

Primary navigation should evolve toward:

- `Threat Landscape`
- `Agents`
- `Cases`
- `Sources`
- `Library`
- `Briefs`
- `Search`

Implementation notes:

- the current `Inbox` should evolve into `Threat Landscape`
- the current internal `thread` model should evolve into user-facing `Intel Cards`
- `Cases` remains the durable investigation workspace

### Core Product Loop

IntelDesk should optimize for this daily loop:

1. open `Threat Landscape`
2. review prioritized cards or a saved `Agent`
3. take one action per card: review, watch, case, mute, or brief
4. reopen `Cases` for active investigations
5. export or brief when needed

### Core Objects

Shared intelligence layer:

- `Observation`
  - a raw source item such as an advisory, article, repo, or post
- `Entity`
  - CVE, vendor, product, malware, actor, campaign, technique
- `Intel Card`
  - grouped observations about the same vulnerability, attack, actor, malware family, or event
- `Source Registry`
  - tracked domains, feeds, and reliability signals
- `Agent`
  - saved monitoring query or filter lens

Analyst-specific workflow layer:

- `Card State`
  - new, reviewed, watching, in case, muted, new delta
- `Case`
  - investigation workspace with notes and timeline
- `Brief`
  - user-curated exportable output
- `Source Preferences`
  - promoted, demoted, muted, tagged

### Current Code Mapping

To keep implementation continuity:

- internal `thread` can remain the storage primitive for now
- user-facing copy should increasingly refer to `Intel Cards`
- `thread_state` should evolve into `analyst_card_state`

## Scope Priorities

### What Must Be True In V1

- the product feels closer to Feedly Threat Intelligence than to a generic dashboard
- analysts can monitor saved topics without reading everything
- important attacks and vulnerabilities become coherent cards instead of noisy source piles
- `Cases` provide durable follow-through with notes, timeline, and deltas
- source provenance remains visible at every step

### What Is Explicitly Out Of Scope For V1

- full MISP-style sharing exchange
- OpenCTI-style graph exploration as the primary UX
- SIEM, SOAR, and ticket orchestration
- extensive enterprise workflow layers
- automated exploit retrieval or weaponization workflows

## Functional Scope

### Threat Landscape

Must support:

- prioritized cards across vulnerabilities, attacks, malware, actors, and vendors
- `Only Delta` or equivalent "what changed" filter
- time range filtering
- saved views
- clear actions: watch, case, mute, add to brief

### Agents

Must support:

- saved monitors defined by entities, keywords, source classes, and status filters
- reusable saved views for common topics
- later, agent templates for common analyst workflows

### Intel Cards

Each card should support:

- current summary
- canonical sources
- article mention count and corroboration count
- timeline
- entity tags
- change summary since last view
- exploitability or defensive context when available
- actions to watch, case, mute, brief, or export

### Cases

Must support:

- create from card or source
- notes
- timeline
- linked cards and sources
- status and last-seen tracking
- delta summary since last review

### Sources

Must support:

- add URL
- add feed
- promote, demote, mute
- source radar rationale
- original versus echo signal

### Briefs

Must support:

- markdown export
- reading list export
- card and case selection for analyst brief generation

## Intake And Discovery Strategy

### Intake

Source intake should be both deliberate and assisted.

Deliberate paths:

- `Add URL`
- `Add Feed`
- `Promote Source`

Assisted paths:

- `Seed & Expand` from a URL
- outbound-link expansion
- later, saved-agent discovery

### Discovery

Discovery should remain explainable.

Primary discovery signals:

- outbound links from a seed source
- repeated appearance across related cards
- early appearance in a card timeline
- links from already promoted sources
- entity matches against existing cards and agent definitions

Community sources such as Reddit or Bluesky should be treated as pointer layers, not canonical record layers.

## Review And Action Model

Primary review state should remain card-based.

Card lifecycle:

- `New`
- `Reviewed`
- `Watching`
- `In Case`
- `Muted`
- derived `New Delta`

Behavior rules:

- opening a card starts a soft review session
- leaving without another explicit action marks it `Reviewed`
- watched and case-linked cards remain visible in their respective work surfaces
- meaningful change reactivates a card as `New Delta`

## Technology Direction

### Current Prototype Stack

- `React`
- `TypeScript`
- `Vite`
- `IndexedDB` for prototype persistence
- lightweight Node-based preview and seed API

### Hosted Product Stack

Recommended application stack:

- `Nginx` for TLS termination, static asset delivery, and reverse proxying
- `FastAPI` for product APIs
- separate `worker` process for fetch, extraction, clustering, enrichment, and delta detection
- `Postgres` for durable shared state and search
- local filesystem storage for snapshots and exports in early hosted deployments
- `systemd` for supervision on the initial VPS tier

### Deployment Target

Initial hosted deployment target:

- `IONOS VPS M`
- `4 GB RAM`

That tier is appropriate if the deployment remains lean.

Do not add initially:

- `Redis`
- `Elasticsearch` or `OpenSearch`
- container orchestration
- object-storage daemons on-box

### Security Boundary

Fetch and extraction should remain isolated from the request-serving runtime.

Minimum safeguards:

- dedicated non-root application user
- strict fetch timeouts and size limits
- content-type validation
- fetched artifacts stored outside Nginx-served paths

## Data Model Direction

Shared hosted entities:

- `observation`
- `entity`
- `intel_card`
- `card_observation`
- `source_registry`
- `source_feed`
- `agent`
- `brief`

Analyst-scoped entities:

- `analyst_card_state`
- `case_file`
- `case_card`
- `case_observation`
- `note`
- `timeline_entry`
- `source_preference`

Near-term implementation guidance:

- continue using the current thread-backed prototype model where it preserves momentum
- keep all new storage decisions multi-user ready
- do not attach analyst workflow state directly to shared card records

## Milestones

### M0: Product Reframe And Shell Alignment

- update documentation to match the Feedly-like product scope
- evolve navigation from `Inbox` toward `Threat Landscape` and `Agents`
- align terminology around `Intel Cards`

Exit criteria:

- docs, UI labels, and product framing point at the same target

### M1: Threat Landscape And Agent Foundations

- reshape the home view into a prioritized landscape
- add saved view and saved monitor concepts
- persist analyst state locally
- preserve the existing review-state model

Exit criteria:

- the product feels like a monitoring tool, not just a bookmark manager

### M2: Real Intake And Seed Expansion

- strengthen `Add URL`
- add `Add Feed`
- maintain preview and seed expansion
- attach discovered observations to cards
- begin card-level dedupe and grouping rules

Exit criteria:

- real sources enter the product and form coherent cards

### M3: Card-Centric Intelligence Views

- implement richer card pages for vulnerabilities, attacks, malware, and actors
- show timelines, source counts, related entities, and deltas
- support watch and case promotion from the card detail

Exit criteria:

- `Intel Cards` become the main daily operating object

### M4: Cases And Follow-Through

- strengthen case creation from cards
- add notes, timeline, and delta badges
- support analyst re-entry and status management
- prepare for case export and briefing use

Exit criteria:

- a case is materially better than just bookmarking a card

### M5: Sources And Radar

- finish source registry flows
- compute explainable source radar signals
- improve promote, demote, mute, and rationale views

Exit criteria:

- the source layer improves discovery without taking over the main UX

### M6: Briefs And Exports

- markdown case export
- reading list export
- first briefing workflow

Exit criteria:

- analysts can turn gathered intel into usable outputs

### M7: Hosted Shared Layer

- move from prototype-local persistence to shared hosted storage
- add authentication and analyst identity
- preserve the split between shared intelligence objects and analyst-specific workflow objects

Exit criteria:

- multiple analysts can use the product without losing personalization

### M8: Interoperability

- add STIX, MISP, or OpenCTI-aligned export paths
- selectively add import and connector support where it improves workflow

Exit criteria:

- IntelDesk can participate in a broader CTI ecosystem without becoming a clone of those platforms

## Risks And Mitigations

### Risk: Building A Generic Dashboard

Mitigation:

- keep the Feedly-like monitoring workflow central
- make cards and agents first-class concepts

### Risk: Losing The IntelDesk Differentiator

Mitigation:

- keep cases stronger than in typical monitoring products
- build follow-through, notes, and deltas as a core layer

### Risk: Scope Creep Into Full CTI Platform Complexity

Mitigation:

- borrow MISP and OpenCTI data ideas gradually
- do not force graph-first UX or enterprise sharing complexity into v1

### Risk: Low-Signal Discovery

Mitigation:

- keep discovery explainable
- treat community sources as pointers
- show why a source or card surfaced
