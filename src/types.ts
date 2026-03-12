export type NavView = "inbox" | "cases" | "sources" | "search";

export type ThreadStatus = "developing" | "confirmed" | "watching" | "disputed";
export type CaseStatus = "watching" | "active" | "resolved" | "archived";
export type SourceType = "advisory" | "gov" | "researcher" | "community" | "repo";
export type PromotionState = "promoted" | "neutral" | "demoted" | "muted";
export type ThreadLifecycleState = "new" | "reviewed" | "watching" | "in_case" | "muted";
export type ThreadQueueState = "new" | "reviewed" | "watching" | "in-case" | "muted" | "new-delta";

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

export interface ManualUrlIntake {
  url: string;
  title?: string;
  summary?: string;
  sourceType: SourceType;
  status: ThreadStatus;
  author?: string;
  entities: string[];
  note?: string;
}

export interface ManualUrlAddResult {
  threadId: string;
  sourceId: string;
  duplicate: boolean;
}

export interface ManualUrlMetadata {
  normalizedUrl: string;
  title?: string;
  summary?: string;
  author?: string;
  entities: string[];
  sourceType?: SourceType;
  strategy: "fetched" | "derived";
  message: string;
}

export interface WorkspaceUser {
  id: string;
  name: string;
  handle: string;
  scope: "local";
}

export interface ThreadState {
  id: string;
  userId: string;
  threadId: string;
  state: ThreadLifecycleState;
  firstSeenAt: string;
  lastOpenedAt?: string;
  lastReviewedAt?: string;
  lastMeaningfulDeltaAt?: string;
  lastReactivatedAt?: string;
  caseId?: string;
  updatedAt: string;
}

export interface StoredCaseFile extends CaseFile {
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkbenchSnapshot {
  currentUser: WorkspaceUser;
  threads: Thread[];
  sourceRegistry: SourceRegistryEntry[];
  cases: StoredCaseFile[];
  threadStates: ThreadState[];
}

export interface ThreadWorkflowView {
  threadId: string;
  state: ThreadLifecycleState;
  queueState: ThreadQueueState;
  hasMeaningfulDelta: boolean;
  lastOpenedAt?: string;
  lastReviewedAt?: string;
  lastReactivatedAt?: string;
  caseId?: string;
}

export interface ThreadQueueSection {
  id: ThreadQueueState;
  title: string;
  description: string;
  threads: Thread[];
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
