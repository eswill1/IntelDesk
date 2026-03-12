export type NavView = "inbox" | "cases" | "sources" | "search";

export type ThreadStatus = "developing" | "confirmed" | "watching" | "disputed";
export type CaseStatus = "watching" | "active" | "resolved" | "archived";
export type SourceType = "advisory" | "gov" | "researcher" | "community" | "repo";
export type PromotionState = "promoted" | "neutral" | "demoted" | "muted";

export interface SourceItem {
  id: string;
  title: string;
  url: string;
  domain: string;
  author: string;
  publishedAt: string;
  fetchedAt: string;
  sourceType: SourceType;
  excerpt: string;
  entities: string[];
  isCanonical: boolean;
  changed?: boolean;
}

export interface Thread {
  id: string;
  title: string;
  summary: string;
  status: ThreadStatus;
  lastUpdated: string;
  lastSeenAt: string;
  changeHighlights: string[];
  sourceCount: number;
  corroborationCount: number;
  entities: string[];
  sources: SourceItem[];
  analystNotes: string[];
  muted?: boolean;
}

export interface CaseNote {
  id: string;
  createdAt: string;
  text: string;
  pinned?: boolean;
}

export interface TimelineEntry {
  id: string;
  at: string;
  label: string;
  detail: string;
  kind: "source" | "status" | "note";
}

export interface CaseFile {
  id: string;
  title: string;
  status: CaseStatus;
  tags: string[];
  lastUpdated: string;
  lastSeenAt: string;
  deltaSummary: string[];
  linkedThreadIds: string[];
  linkedSourceIds: string[];
  notes: CaseNote[];
  timeline: TimelineEntry[];
}

export interface SourceRegistryEntry {
  id: string;
  domain: string;
  label: string;
  category: string;
  promotedState: PromotionState;
  originalityRatio: number;
  corroborationRate: number;
  savedThreadCount: number;
  firstSeenAt: string;
  examples: string[];
  rationale: string;
  emerging: boolean;
}

export interface SearchResult {
  id: string;
  kind: "thread" | "case" | "source" | "registry";
  title: string;
  subtitle: string;
  context: string;
  updatedAt: string;
  tags: string[];
}
