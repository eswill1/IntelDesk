# IntelDesk Design Bible

## Product Character

IntelDesk should feel like a serious analyst workbench:

- calm, dense, and readable over long sessions
- provenance-first instead of summary-first
- confident without spectacle
- structured enough for daily use, but never bureaucratic

The visual metaphor is not a social feed or SaaS dashboard. It is a desk with folders, receipts, status marks, and active threads of inquiry.

## Tone

- Use factual, neutral language.
- Prefer "developing", "corroborated", and "disputed" over dramatic language.
- Put the source and timestamp close to every assertion.
- Treat uncertainty as a first-class UI state.

## Layout

Primary layout:

- left rail for navigation and session context
- main pane for triage lists
- right pane for details, metadata, and actions

This structure should collapse cleanly on smaller screens without hiding the current object or its key actions.

## Interaction Rules

- `Only Delta` is a primary control, not an advanced filter.
- Thread cards must show what changed before they show everything else.
- Cases should reopen with context restored quickly: status, delta, last note, and latest timeline events.
- Source controls must stay lightweight: promote, demote, mute, tag.
- Keyboard support matters. At minimum: `j`, `k`, `enter`, `s`, `m`.

## Component Rules

### Thread Cards

- show thread title, status, top entities, and change bullets
- include corroboration and source counts
- keep actions visible without hover dependency

### Source Rows

- show domain, source type, publication time, and excerpt
- visually distinguish canonical or primary sources
- expose the original URL directly

### Case Panels

- show status, tags, delta summary, last note, and timeline
- notes must feel durable, not chat-like

### Source Dossiers

- show simple, interpretable metrics
- include example threads where the source mattered
- never imply machine certainty beyond the evidence shown

## Visual System

- light mode should feel archival and paper-forward, not sterile white
- dark mode should feel instrument-grade, not neon
- use warm neutrals, muted reds, brass, slate, and moss tones
- reserve bright color for status and delta emphasis only

Typography should separate reading from metadata:

- serif or literary face for large titles and long-form detail headings
- pragmatic sans for UI chrome
- monospace for timestamps, counts, and low-level metadata

## Anti-Patterns

- infinite scroll
- card soup with weak hierarchy
- vague AI summaries without source anchors
- attention traps like streaks, badges, or endless recommendations
- over-abstract source scoring that hides the underlying signals
