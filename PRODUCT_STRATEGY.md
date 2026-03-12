# IntelDesk Product Strategy

## Product Thesis

IntelDesk should be scoped as:

`A Feedly-like threat intelligence platform for collection and monitoring, with a stronger case-following workbench once something is worth tracking.`

This is not a generic dashboard and not a pure research notebook. It is a daily operating surface for analysts who need to:

- discover relevant intelligence quickly
- prioritize what matters now
- follow incidents over time
- keep notes, evidence, and context durable
- produce useful outputs for themselves or colleagues

## Benchmark Takeaways

IntelDesk should borrow selectively from three reference products:

### Feedly Threat Intelligence

The strongest benchmark for the product front-end is Feedly Threat Intelligence.

Public product and documentation material emphasizes:

- broad monitoring across the open web
- `AI Feeds` and saved monitoring logic instead of source-by-source reading
- agent-style views such as vulnerability monitoring
- entity or incident-centric cards that aggregate reporting over time
- downstream reporting and sharing workflows

Useful references:

- [Feedly Threat Intelligence](https://feedly.com/threat-intelligence)
- [What is an AI Feed?](https://docs.feedly.com/article/764-what-is-an-ai-feed-feedly)
- [What is the Vulnerability Agent?](https://docs.feedly.com/article/795-what-is-the-vulnerability-dashboard)
- [What are Cyberattack Insights Cards?](https://docs.feedly.com/article/826-what-are-cyberattack-insights-card-feedly)

What IntelDesk should copy:

- monitoring-first product shape
- personalized saved monitors
- entity and incident-centric intelligence cards
- prioritization and filtering for actionability

What IntelDesk should not copy blindly:

- opaque AI without receipts
- over-compressed summaries that hide provenance
- a workflow that ends at reading instead of ongoing case ownership

### MISP

MISP is the right benchmark for structured CTI thinking and interoperability, not for the primary UX.

Public material emphasizes:

- structured and machine-readable intelligence
- taxonomies, objects, reports, and correlation
- sharing and automation

Useful references:

- [MISP project](https://www.misp-project.org/)
- [MISP features](https://www.misp-project.org/features/)

What IntelDesk should borrow:

- structured entities and relationships
- exports and interoperability mindset
- strong support for actionable and machine-readable intelligence

What IntelDesk should avoid in v1:

- turning the main product into a heavy indicator warehouse
- leading with sharing mechanics before analyst workflow is excellent

### OpenCTI

OpenCTI is the right benchmark for longer-term platform architecture and knowledge modeling.

Public material emphasizes:

- a structured CTI knowledge base
- cases and analyst workbench patterns
- connectors, enrichment, and multi-user governance

Useful references:

- [OpenCTI platform](https://filigran.io/platforms/opencti/)
- [OpenCTI Cases](https://docs.opencti.io/latest/usage/exploring-cases/)

What IntelDesk should borrow:

- clean separation between shared intelligence and analyst-specific workflow
- case-centric investigation support
- team-ready access control and collaboration model

What IntelDesk should avoid in v1:

- making a graph platform the main user experience
- exposing excessive ontology complexity too early

## Product Identity

IntelDesk should be positioned as:

- `Feedly for threat intel gathering`
- `plus a better investigation follow-through layer`

The product is strongest when it helps an analyst move through this progression:

1. notice something important
2. understand what it is and why it matters
3. decide whether to ignore, watch, or escalate
4. follow the story without losing the plot
5. produce a useful output from the accumulated context

## Primary User

Initial user:

- senior threat intelligence or security consultant
- strong source intuition already
- reads widely across advisories, blogs, vendors, research, GitHub, Reddit, and other open-web sources
- wants prioritization and continuity more than generic news aggregation

Later user expansion:

- small analyst teams with shared underlying intelligence but personal queues, notes, and cases

## Core Jobs To Be Done

- `What matters today?`
- `What is actually new since I last checked?`
- `Show me the best source-backed card for this attack, CVE, or actor.`
- `Let me watch this without overcommitting.`
- `Let me promote this into a real case when it becomes important.`
- `Let me brief myself or a colleague without rebuilding context from scratch.`

## Core Product Surfaces

### Threat Landscape

This should be the home screen.

It answers:

- what is emerging
- what is being exploited
- what is trending in reporting
- what changed since last review

Primary content units:

- attack cards
- CVE cards
- malware cards
- actor cards
- vendor and product cards

### Agents

Agents are saved monitoring lenses, not just feeds.

Examples:

- critical exploited vulnerabilities
- ransomware attacks in healthcare
- Microsoft and Ivanti security issues
- Russian APT reporting

Each agent should feel like a focused intelligence stream with saved filters, not a folder of sources.

### Intel Cards

Intel Cards are the core unit of gathered intelligence.

They are the user-facing evolution of the current internal `thread` model.

Each card should aggregate:

- key summary
- source-backed facts
- entities
- timeline
- corroborating sources
- delta since last view
- available action points such as exploit status, mitigations, or detection references

### Cases

Cases are the durable follow-through layer and IntelDesk's clearest differentiator.

They should support:

- notes
- timeline
- linked cards and sources
- analyst stance and status
- change tracking since last view
- later, structured claims and collaborative comments

### Sources

Sources remain important, but they are a supporting system rather than the main front door.

The product should still maintain:

- source registry
- source radar
- promoted and muted sources
- origin versus echo signals

### Briefs

IntelDesk should support outputs, not just reading.

Initial outputs:

- markdown case export
- reading list export
- analyst brief from a case or card set

## Core Action Model

Every card should make the next analyst action obvious.

Primary actions:

- `Review`
- `Watch`
- `Create Case`
- `Mute`
- `Save to Brief`

Secondary actions:

- open sources
- pin canonical source
- add note
- export

## Actionable Intel Definition

IntelDesk should treat a card as actionable when it provides:

- a current summary
- clear provenance
- extracted entities
- a time-aware view of change
- priority or exploitability clues
- at least one obvious next action for the analyst

This is the main difference between generic reading products and a serious intel platform.

## Scope Boundaries

### In Scope For V1

- Feedly-like monitoring and triage
- saved agents
- intel cards for attacks, vulnerabilities, malware, actors, and vendors
- case creation and follow-through
- source registry and explainable source discovery
- delta tracking
- exports and briefing outputs

### Out Of Scope For V1

- full MISP-style sharing exchange
- full OpenCTI-style graph exploration as the primary UX
- SIEM, SOAR, or ticketing orchestration
- exploit-hosting or weaponization workflows
- broad enterprise workflow overhead

## Multi-User Direction

IntelDesk should be architected as multi-user ready even if the first strong workflow remains analyst-centric.

The model should separate:

- shared intelligence objects
  - observations
  - sources
  - entities
  - cards
- analyst-specific objects
  - review state
  - watched cards
  - cases
  - notes
  - briefs
  - source preferences

This allows:

- personal queues and notes
- team-wide intelligence visibility
- later shared cases and role-based access

## Success Criteria

IntelDesk is on the right track when:

- it feels closer to Feedly Threat Intelligence than to a generic dashboard
- analysts can review and prioritize quickly without losing provenance
- cards become the central operating object for daily work
- cases feel like durable follow-through, not an afterthought
- the product is useful before full MISP or OpenCTI interoperability lands
