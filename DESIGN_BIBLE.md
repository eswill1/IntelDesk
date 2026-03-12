# IntelDesk Design Bible

## Product Character

IntelDesk should feel like a threat intelligence cockpit, not a generic dashboard and not a doomscroll feed.

It should combine two moods:

- `Feedly-like monitoring`: broad awareness, fast scanning, strong prioritization
- `Workbench follow-through`: receipts, timelines, notes, and ongoing context

The product should feel:

- calm
- dense but readable
- operational
- source-backed
- built for repeat daily use

## Product Posture

The home experience should say:

- `Here is what matters`
- `Here is what changed`
- `Here is what you should do next`

It should not say:

- `Here is an endless pile of articles`

## Tone

- use factual, neutral language
- prefer `developing`, `corroborated`, `disputed`, and `watching`
- keep timestamps and provenance near every important assertion
- treat uncertainty as a first-class UI state
- avoid hype language, fear language, and vague AI confidence theater

## Information Architecture

Primary surfaces:

- `Threat Landscape`
- `Agents`
- `Cases`
- `Sources`
- `Library`
- `Briefs`

Support surfaces:

- global search
- settings
- add URL and add feed flows

## Layout Principles

Desktop should usually follow a three-zone structure:

- left rail for navigation, saved views, and agent access
- main pane for cards, lists, and detail views
- right rail for actions, source details, and analyst context

On smaller screens, preserve:

- current object
- primary next action
- visible provenance

## Interaction Principles

- `Only Delta` should remain a primary control
- `Watch` should be lighter weight than `Create Case`
- the product should make it easy to take one action per card and move on
- keyboard navigation matters for daily users
- reopening a case should restore context immediately

Recommended keyboard baseline:

- `j` and `k` or arrow keys for movement
- `enter` to open
- `w` to watch
- `s` to create case or save
- `m` to mute
- `a` to add URL

## Core Screen Rules

### Threat Landscape

This is the home screen and should feel like the strongest Feedly-inspired surface.

Rules:

- lead with prioritized cards, not raw source rows
- support saved views and filter chips
- mix broad awareness with clear next actions
- highlight changes since last visit before deep metadata

### Agents

Agents should feel like analyst-defined monitoring lenses.

Rules:

- each agent needs a clear purpose and saved logic
- show why a card matched the agent
- make it easy to tune or fork an agent

### Intel Cards

Intel Cards are the main content unit.

Rules:

- show title, type, status, top entities, and what changed
- include mention count, corroboration count, and canonical sources
- prioritize timeline, evidence, and next steps over decorative chrome
- avoid forcing the user to open multiple articles to understand the current state

### Case Workspace

Cases are the follow-through layer.

Rules:

- show status, tags, last note, timeline, and recent delta clearly
- notes should feel durable and report-friendly, not like chat bubbles
- preserve the link back to the underlying card and sources

### Source Dossier

Rules:

- keep metrics simple and interpretable
- show example cards where the source mattered
- distinguish originality from repetition
- never imply certainty the system cannot defend

### Brief Builder

Rules:

- make export feel like assembling an analyst-ready output
- let the user pull in cards, sources, and notes intentionally
- keep provenance visible in the output workflow

## Component Rules

### Landscape Cards

- show object type such as CVE, attack, malware, actor, or vendor
- show a concise summary and change line
- expose immediate actions: watch, case, mute, brief
- include visible source count and freshness

### Source Rows

- show domain, source type, publication time, and excerpt
- distinguish canonical sources clearly
- expose the original URL without hiding it behind heavy chrome

### Timeline Blocks

- separate automated events from analyst notes
- make absolute timestamps easy to inspect
- keep chronology legible in long-running cases

### Filters And Saved Views

- make filters feel powerful but not enterprise-heavy
- save views with clear names and obvious scope
- surface current active filters prominently

## Visual System

The visual system should feel more like an intelligence product than a generic SaaS app.

- light mode should feel editorial and paper-forward, not sterile white
- dark mode should feel instrument-grade, not neon
- use warm neutrals, slate, deep ink, rust, moss, and restrained amber
- reserve brighter color for state, priority, and delta emphasis

Typography:

- use a more editorial face for major page titles and major card headers
- use a pragmatic sans for controls and dense UI surfaces
- use monospace for timestamps, counts, and technical metadata

## AI And Summary Rules

- AI may assist collection, tagging, and summarization
- AI must not obscure provenance
- every important summary should stay close to its supporting sources
- if uncertainty is high, show that explicitly
- avoid large free-floating summaries without evidence anchors

## Anti-Patterns

- infinite scroll as the dominant interaction
- raw article list as the main home screen
- card soup with weak hierarchy
- vague summaries without sources
- over-gamified activity chrome
- black-box source scores with no rationale
- graph visualizations used as decoration rather than as a real investigation aid
