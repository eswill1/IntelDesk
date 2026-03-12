import type { CaseFile, SourceRegistryEntry, Thread } from "../types";

export const threads: Thread[] = [
  {
    id: "thread-ivanti",
    title: "Ivanti Connect Secure exploitation expands beyond initial clusters",
    summary:
      "Vendor guidance, CISA updates, and researcher notes now point to broader active exploitation with revised mitigation language.",
    status: "confirmed",
    lastUpdated: "2026-03-11T18:42:00Z",
    lastSeenAt: "2026-03-10T12:10:00Z",
    changeHighlights: [
      "CISA added a fresh KEV timeline reference.",
      "Ivanti revised mitigation text in the advisory body.",
      "A second research org published independent victim evidence."
    ],
    sourceCount: 9,
    corroborationCount: 4,
    entities: ["CVE-2026-1182", "Ivanti", "Connect Secure"],
    analystNotes: [
      "Primary source is still the vendor advisory plus CISA movement, not the social chatter.",
      "Need to watch whether product version language stabilizes."
    ],
    sources: [
      {
        id: "src-ivanti-advisory",
        title: "Security advisory for Connect Secure gateway exploitation",
        url: "https://www.ivanti.example/security/advisory-connect-secure",
        domain: "ivanti.example",
        author: "Ivanti Security Team",
        publishedAt: "2026-03-09T07:00:00Z",
        fetchedAt: "2026-03-11T18:25:00Z",
        sourceType: "advisory",
        excerpt:
          "Vendor advisory updated with revised workaround language and affected version clarification.",
        entities: ["CVE-2026-1182", "Ivanti", "Connect Secure"],
        isCanonical: true,
        changed: true
      },
      {
        id: "src-cisa-ivanti",
        title: "CISA updates active exploitation reference for Ivanti appliances",
        url: "https://www.cisa.gov/example/ivanti-kev-update",
        domain: "cisa.gov",
        author: "CISA",
        publishedAt: "2026-03-11T14:15:00Z",
        fetchedAt: "2026-03-11T18:31:00Z",
        sourceType: "gov",
        excerpt:
          "Federal guidance now links the issue to the active exploitation workflow and remediation timeline.",
        entities: ["CVE-2026-1182", "CISA", "Ivanti"],
        isCanonical: false,
        changed: true
      },
      {
        id: "src-mandiant-ivanti",
        title: "Observed post-exploitation patterns on exposed Ivanti gateways",
        url: "https://cloud.google.com/blog/topics/threat-intelligence/ivanti-gateway-analysis",
        domain: "cloud.google.com",
        author: "Mandiant",
        publishedAt: "2026-03-11T16:05:00Z",
        fetchedAt: "2026-03-11T18:33:00Z",
        sourceType: "researcher",
        excerpt:
          "Incident responders describe victim overlap and operator behavior consistent with field exploitation.",
        entities: ["Ivanti", "Mandiant", "post-exploitation"],
        isCanonical: false,
        changed: true
      }
    ]
  },
  {
    id: "thread-fortinet",
    title: "Fortinet edge device bug chatter starts to converge on a real campaign",
    summary:
      "Community posts and vendor notes are beginning to align around a likely exploitation path, but public detail is still uneven.",
    status: "developing",
    lastUpdated: "2026-03-11T17:18:00Z",
    lastSeenAt: "2026-03-11T13:52:00Z",
    changeHighlights: [
      "Vendor quietly updated the FAQ section.",
      "Two independent researchers linked the same exploit chain.",
      "Reddit discussion surfaced a now-deleted proof-of-impact claim."
    ],
    sourceCount: 12,
    corroborationCount: 3,
    entities: ["Fortinet", "FortiOS", "edge appliance"],
    analystNotes: [
      "Still short on clean primary sourcing.",
      "Need a canonical writeup before moving this from watch to active."
    ],
    sources: [
      {
        id: "src-fortinet-advisory",
        title: "Fortinet advisory updated with workaround clarifications",
        url: "https://www.fortinet.example/psirt/example-update",
        domain: "fortinet.example",
        author: "FortiGuard PSIRT",
        publishedAt: "2026-03-11T15:40:00Z",
        fetchedAt: "2026-03-11T17:04:00Z",
        sourceType: "advisory",
        excerpt:
          "Updated FAQ now narrows likely affected deployment patterns and adds workaround sequencing.",
        entities: ["Fortinet", "FortiOS"],
        isCanonical: true,
        changed: true
      },
      {
        id: "src-foxio-fortinet",
        title: "Research thread on edge appliance exploitation fingerprints",
        url: "https://blog.foxio.example/fortinet-fingerprints",
        domain: "foxio.example",
        author: "FoxIO Labs",
        publishedAt: "2026-03-11T16:11:00Z",
        fetchedAt: "2026-03-11T17:08:00Z",
        sourceType: "researcher",
        excerpt:
          "Researchers outline telemetry markers that may indicate the same exploitation route discussed across community channels.",
        entities: ["Fortinet", "edge appliance"],
        isCanonical: false
      }
    ]
  },
  {
    id: "thread-github-action",
    title: "Suspicious GitHub Action compromise claims remain disputed",
    summary:
      "The story is getting repeated widely, but the evidence still appears to rest on a narrow set of community claims and repo history anomalies.",
    status: "disputed",
    lastUpdated: "2026-03-11T11:26:00Z",
    lastSeenAt: "2026-03-08T19:20:00Z",
    changeHighlights: [
      "Maintainer posted a denial and repo cleanup note.",
      "A second repo reproduced the hash mismatch claim.",
      "No vendor or platform advisory has appeared yet."
    ],
    sourceCount: 18,
    corroborationCount: 2,
    entities: ["GitHub Actions", "supply chain", "repo integrity"],
    analystNotes: [
      "This is the classic echo-chamber pattern. Keep separated from confirmed package compromise cases."
    ],
    sources: [
      {
        id: "src-github-repo-issue",
        title: "Maintainer statement on action compromise rumors",
        url: "https://github.com/example/action/issues/412",
        domain: "github.com",
        author: "project-maintainer",
        publishedAt: "2026-03-11T09:12:00Z",
        fetchedAt: "2026-03-11T11:09:00Z",
        sourceType: "repo",
        excerpt:
          "Maintainer disputes the compromise narrative and points to an unrelated release pipeline problem.",
        entities: ["GitHub Actions", "repo integrity"],
        isCanonical: true,
        changed: true
      },
      {
        id: "src-bluesky-action",
        title: "Researchers debate whether the compromised tag was ever served",
        url: "https://bsky.app/profile/example/post/123",
        domain: "bsky.app",
        author: "independent-researcher",
        publishedAt: "2026-03-10T23:04:00Z",
        fetchedAt: "2026-03-11T10:58:00Z",
        sourceType: "community",
        excerpt:
          "Community thread points to mirrored archives that may or may not show the claimed malicious artifact.",
        entities: ["GitHub Actions", "supply chain"],
        isCanonical: false
      }
    ]
  },
  {
    id: "thread-microsoft-outlook",
    title: "Outlook auth bypass fix lands with limited public exploitation detail",
    summary:
      "Patch guidance is clear, but external reporting on in-the-wild abuse is still thin and mostly derivative.",
    status: "watching",
    lastUpdated: "2026-03-10T20:06:00Z",
    lastSeenAt: "2026-03-10T20:06:00Z",
    changeHighlights: [
      "No new changes since the last review."
    ],
    sourceCount: 6,
    corroborationCount: 2,
    entities: ["Microsoft", "Outlook", "auth bypass"],
    analystNotes: [
      "Good candidate for background monitoring instead of active case work."
    ],
    sources: [
      {
        id: "src-msrc-outlook",
        title: "Microsoft security update guidance for Outlook auth bypass",
        url: "https://msrc.microsoft.com/update-guide/example",
        domain: "microsoft.com",
        author: "MSRC",
        publishedAt: "2026-03-10T18:00:00Z",
        fetchedAt: "2026-03-10T20:03:00Z",
        sourceType: "advisory",
        excerpt:
          "Patch guidance includes affected build ranges and mitigation sequencing.",
        entities: ["Microsoft", "Outlook"],
        isCanonical: true
      }
    ]
  }
];

export const caseFiles: CaseFile[] = [
  {
    id: "case-edge-appliances",
    title: "Edge appliance exploitation spring wave",
    status: "active",
    tags: ["edge", "active exploitation", "vendor advisories"],
    lastUpdated: "2026-03-11T18:42:00Z",
    lastSeenAt: "2026-03-10T12:10:00Z",
    deltaSummary: [
      "Ivanti case added new CISA and Mandiant corroboration.",
      "Still tracking edge exploitation as a category rather than splitting by vendor too early."
    ],
    linkedThreadIds: ["thread-ivanti"],
    linkedSourceIds: ["src-ivanti-advisory", "src-cisa-ivanti"],
    notes: [
      {
        id: "note-edge-1",
        createdAt: "2026-03-11T18:46:00Z",
        text: "Operational pattern is advisory revision followed by community amplification and only later clearer victim reporting.",
        pinned: true
      },
      {
        id: "note-edge-2",
        createdAt: "2026-03-10T12:13:00Z",
        text: "Need a concise matrix by product family once ingestion is real."
      }
    ],
    timeline: [
      {
        id: "edge-time-1",
        at: "2026-03-09T07:00:00Z",
        label: "Ivanti advisory posted",
        detail: "Initial vendor notice established the canonical source chain.",
        kind: "source"
      },
      {
        id: "edge-time-2",
        at: "2026-03-11T14:15:00Z",
        label: "CISA guidance expanded",
        detail: "KEV-oriented language sharpened urgency and remediation framing.",
        kind: "source"
      },
      {
        id: "edge-time-3",
        at: "2026-03-11T18:46:00Z",
        label: "Analyst note added",
        detail: "Pattern looks broader than one vendor-specific burst.",
        kind: "note"
      }
    ]
  },
  {
    id: "case-supply-chain",
    title: "Open source supply-chain integrity watch",
    status: "watching",
    tags: ["supply chain", "GitHub", "disputed"],
    lastUpdated: "2026-03-11T11:26:00Z",
    lastSeenAt: "2026-03-08T19:20:00Z",
    deltaSummary: [
      "Maintainer denial and second reproduction thread added."
    ],
    linkedThreadIds: ["thread-github-action"],
    linkedSourceIds: ["src-github-repo-issue"],
    notes: [
      {
        id: "note-supply-1",
        createdAt: "2026-03-11T11:34:00Z",
        text: "Do not merge this into confirmed package compromise reporting until platform evidence appears."
      }
    ],
    timeline: [
      {
        id: "supply-time-1",
        at: "2026-03-10T23:04:00Z",
        label: "Community chatter spikes",
        detail: "Claims begin spreading across mirrored posts and reposts.",
        kind: "source"
      },
      {
        id: "supply-time-2",
        at: "2026-03-11T09:12:00Z",
        label: "Maintainer response",
        detail: "Repo owner disputes the compromise interpretation.",
        kind: "status"
      }
    ]
  },
  {
    id: "case-microsoft-watch",
    title: "Microsoft patch-cycle monitoring",
    status: "resolved",
    tags: ["patching", "background monitoring"],
    lastUpdated: "2026-03-10T20:06:00Z",
    lastSeenAt: "2026-03-10T20:06:00Z",
    deltaSummary: [
      "No material change since last review."
    ],
    linkedThreadIds: ["thread-microsoft-outlook"],
    linkedSourceIds: ["src-msrc-outlook"],
    notes: [
      {
        id: "note-ms-1",
        createdAt: "2026-03-10T20:09:00Z",
        text: "Keep as background watch unless exploitation evidence becomes clearer."
      }
    ],
    timeline: [
      {
        id: "ms-time-1",
        at: "2026-03-10T18:00:00Z",
        label: "Patch guidance published",
        detail: "Affected builds and mitigation sequence documented.",
        kind: "source"
      }
    ]
  }
];

export const sourceRegistry: SourceRegistryEntry[] = [
  {
    id: "registry-cisa",
    domain: "cisa.gov",
    label: "CISA",
    category: "gov",
    promotedState: "promoted",
    originalityRatio: 0.78,
    corroborationRate: 0.91,
    savedThreadCount: 12,
    firstSeenAt: "2025-11-04T10:00:00Z",
    examples: [
      "Ivanti Connect Secure exploitation expands beyond initial clusters",
      "Several KEV-linked appliance cases"
    ],
    rationale: "Reliable escalation signal for confirmed exploitation and remediation framing.",
    emerging: false
  },
  {
    id: "registry-mandiant",
    domain: "cloud.google.com",
    label: "Mandiant / Google Cloud",
    category: "researcher",
    promotedState: "promoted",
    originalityRatio: 0.83,
    corroborationRate: 0.88,
    savedThreadCount: 9,
    firstSeenAt: "2025-12-18T09:20:00Z",
    examples: [
      "Ivanti Connect Secure exploitation expands beyond initial clusters",
      "Cloud victimology and incident response notes"
    ],
    rationale: "High field-report value and strong linkage back to primary evidence.",
    emerging: false
  },
  {
    id: "registry-foxio",
    domain: "foxio.example",
    label: "FoxIO Labs",
    category: "researcher",
    promotedState: "neutral",
    originalityRatio: 0.67,
    corroborationRate: 0.72,
    savedThreadCount: 3,
    firstSeenAt: "2026-02-28T16:00:00Z",
    examples: [
      "Fortinet edge device bug chatter starts to converge on a real campaign"
    ],
    rationale: "Useful in emerging threads, but still early in the personal corpus.",
    emerging: true
  },
  {
    id: "registry-bsky",
    domain: "bsky.app",
    label: "Bluesky discovery pointers",
    category: "community",
    promotedState: "demoted",
    originalityRatio: 0.18,
    corroborationRate: 0.39,
    savedThreadCount: 2,
    firstSeenAt: "2025-12-02T12:44:00Z",
    examples: [
      "Open source supply-chain integrity watch"
    ],
    rationale: "Good for discovery, weak as a durable record source.",
    emerging: false
  },
  {
    id: "registry-github",
    domain: "github.com",
    label: "GitHub repositories and issues",
    category: "repo",
    promotedState: "neutral",
    originalityRatio: 0.75,
    corroborationRate: 0.61,
    savedThreadCount: 5,
    firstSeenAt: "2025-10-11T15:30:00Z",
    examples: [
      "Open source supply-chain integrity watch",
      "PoC repo monitoring"
    ],
    rationale: "Often primary for maintainer statements and code diffs, but context quality varies widely.",
    emerging: false
  }
];
