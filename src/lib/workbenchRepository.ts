import {
  caseFiles as seededCases,
  sourceRegistry as seededSourceRegistry,
  threads as seededThreads
} from "../data/mockData";
import { hasMeaningfulThreadChange } from "./threadWorkflow";
import { normalizeUrlInput } from "./urlMetadata";
import type {
  CaseFile,
  ManualUrlAddResult,
  ManualUrlIntake,
  SourceRegistryEntry,
  SourceItem,
  SourceType,
  StoredCaseFile,
  Thread,
  ThreadLifecycleState,
  ThreadState,
  WorkbenchSnapshot,
  WorkspaceUser
} from "../types";

const databaseName = "inteldesk-workbench";
const databaseVersion = 1;
const defaultUserId = "local-analyst";

const storeNames = {
  users: "users",
  threads: "threads",
  sourceRegistry: "source_registry",
  threadStates: "thread_states",
  cases: "cases"
} as const;

const defaultUser: WorkspaceUser = {
  id: defaultUserId,
  name: "Ed Williams",
  handle: "ed",
  scope: "local"
};

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, databaseVersion);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(storeNames.users)) {
        database.createObjectStore(storeNames.users, { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains(storeNames.threads)) {
        database.createObjectStore(storeNames.threads, { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains(storeNames.sourceRegistry)) {
        database.createObjectStore(storeNames.sourceRegistry, { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains(storeNames.threadStates)) {
        const store = database.createObjectStore(storeNames.threadStates, { keyPath: "id" });
        store.createIndex("by_user", "userId", { unique: false });
        store.createIndex("by_user_thread", ["userId", "threadId"], { unique: true });
      }

      if (!database.objectStoreNames.contains(storeNames.cases)) {
        const store = database.createObjectStore(storeNames.cases, { keyPath: "id" });
        store.createIndex("by_user", "userId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Unable to open the IntelDesk workbench database."));
  });
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed unexpectedly."));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed unexpectedly."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction was aborted."));
  });
}

function buildStoredCase(seedCase: CaseFile): StoredCaseFile {
  const createdAt = seedCase.timeline[0]?.at ?? seedCase.lastUpdated;

  return {
    ...seedCase,
    userId: defaultUser.id,
    createdAt,
    updatedAt: seedCase.lastUpdated
  };
}

function buildCaseFromThread(thread: Thread, userId: string): StoredCaseFile {
  const createdAt = new Date().toISOString();
  const canonicalSource = thread.sources.find((source) => source.isCanonical) ?? thread.sources[0];

  return {
    id: `case-${thread.id}-${Date.now()}`,
    userId,
    title: thread.title,
    status: "watching",
    tags: thread.entities.slice(0, 3),
    lastUpdated: thread.lastUpdated,
    lastSeenAt: createdAt,
    updatedAt: createdAt,
    createdAt,
    deltaSummary: [
      "Case created from the Inbox for deliberate follow-up.",
      ...thread.changeHighlights.slice(0, 2)
    ],
    linkedThreadIds: [thread.id],
    linkedSourceIds: thread.sources.map((source) => source.id),
    notes: [
      {
        id: `note-${thread.id}-seed`,
        createdAt,
        text: "Created from triage when the thread crossed from interesting into something worth revisiting.",
        pinned: true
      }
    ],
    timeline: [
      {
        id: `timeline-${thread.id}-source`,
        at: canonicalSource?.publishedAt ?? thread.lastUpdated,
        label: "Initial canonical source",
        detail: canonicalSource
          ? `${canonicalSource.domain} established the first durable record for this case.`
          : "Thread promoted from the Inbox before a canonical source was pinned.",
        kind: "source"
      },
      {
        id: `timeline-${thread.id}-promotion`,
        at: createdAt,
        label: "Case created from Inbox",
        detail: "Thread promoted into a durable workspace so notes, deltas, and sources survive triage.",
        kind: "status"
      }
    ]
  };
}

function buildThreadStateId(userId: string, threadId: string) {
  return `thread-state-${userId}-${threadId}`;
}

function buildSeedThreadStates(cases: StoredCaseFile[]): ThreadState[] {
  const caseByThreadId = cases.reduce<Record<string, string>>((accumulator, item) => {
    item.linkedThreadIds.forEach((threadId) => {
      accumulator[threadId] = item.id;
    });
    return accumulator;
  }, {});

  return seededThreads.map((thread) => {
    const caseId = caseByThreadId[thread.id];
    const state: ThreadLifecycleState = caseId ? "in_case" : "new";

    return {
      id: buildThreadStateId(defaultUser.id, thread.id),
      userId: defaultUser.id,
      threadId: thread.id,
      state,
      firstSeenAt: thread.lastSeenAt,
      lastOpenedAt: state === "new" ? undefined : thread.lastSeenAt,
      lastReviewedAt: state === "new" ? undefined : thread.lastSeenAt,
      lastMeaningfulDeltaAt: hasMeaningfulThreadChange(thread) ? thread.lastUpdated : undefined,
      caseId,
      updatedAt: thread.lastUpdated
    };
  });
}

async function ensureSeedData(database: IDBDatabase) {
  const inspection = database.transaction([storeNames.users, storeNames.threads], "readonly");
  const existingThreadCountRequest = inspection.objectStore(storeNames.threads).count();
  const existingUserRequest = inspection.objectStore(storeNames.users).get(defaultUser.id);
  const existingThreadCount = await requestToPromise(existingThreadCountRequest);
  const existingUser = await requestToPromise(existingUserRequest);

  await transactionDone(inspection);

  if (existingThreadCount > 0 && existingUser) {
    return;
  }

  const transaction = database.transaction(Object.values(storeNames), "readwrite");
  const userStore = transaction.objectStore(storeNames.users);

  if (!existingUser) {
    userStore.put(defaultUser);
  }

  if (existingThreadCount === 0) {
    const threadStore = transaction.objectStore(storeNames.threads);
    const sourceStore = transaction.objectStore(storeNames.sourceRegistry);
    const threadStateStore = transaction.objectStore(storeNames.threadStates);
    const caseStore = transaction.objectStore(storeNames.cases);

    seededThreads.forEach((thread) => threadStore.put(thread));
    seededSourceRegistry.forEach((entry) => sourceStore.put(entry));

    const cases = seededCases.map(buildStoredCase);
    cases.forEach((item) => caseStore.put(item));

    buildSeedThreadStates(cases).forEach((item) => threadStateStore.put(item));
  }

  await transactionDone(transaction);
}

async function withDatabase<T>(operation: (database: IDBDatabase) => Promise<T>) {
  const database = await openDatabase();

  try {
    await ensureSeedData(database);
    return await operation(database);
  } finally {
    database.close();
  }
}

function sortThreads(threads: Thread[]) {
  return [...threads].sort(
    (left, right) => new Date(right.lastUpdated).getTime() - new Date(left.lastUpdated).getTime()
  );
}

function sortCases(cases: StoredCaseFile[]) {
  return [...cases].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
}

function sortRegistryEntries(entries: SourceRegistryEntry[]) {
  return [...entries].sort((left, right) => right.savedThreadCount - left.savedThreadCount);
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDomainFromUrl(url: string) {
  return new URL(url).hostname.replace(/^www\./, "");
}

function cleanEntities(entities: string[]) {
  return Array.from(
    new Set(
      entities
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function getRegistrySeedMetrics(sourceType: SourceType) {
  switch (sourceType) {
    case "advisory":
      return { originalityRatio: 0.72, corroborationRate: 0.66 };
    case "gov":
      return { originalityRatio: 0.76, corroborationRate: 0.79 };
    case "researcher":
      return { originalityRatio: 0.68, corroborationRate: 0.64 };
    case "repo":
      return { originalityRatio: 0.59, corroborationRate: 0.48 };
    case "community":
      return { originalityRatio: 0.24, corroborationRate: 0.33 };
  }
}

function buildManualSourceItem(draft: ManualUrlIntake, normalizedUrl: string, now: string): SourceItem {
  const domain = getDomainFromUrl(normalizedUrl);
  const title = draft.title?.trim() || domain;
  const excerpt =
    draft.summary?.trim() ||
    draft.note?.trim() ||
    "Added manually from analyst URL intake and awaiting corroboration.";

  return {
    id: createId("src-manual"),
    title,
    url: normalizedUrl,
    domain,
    author: draft.author?.trim() || "Unknown",
    publishedAt: now,
    fetchedAt: now,
    sourceType: draft.sourceType,
    excerpt,
    entities: cleanEntities(draft.entities),
    isCanonical: true
  };
}

function buildManualThread(draft: ManualUrlIntake, source: SourceItem, now: string): Thread {
  const title = source.title;
  const summary =
    draft.summary?.trim() ||
    `${source.domain} was added manually and still needs broader corroboration or enrichment.`;
  const note = draft.note?.trim();

  return {
    id: createId("thread-manual"),
    title,
    summary,
    status: draft.status,
    lastUpdated: now,
    lastSeenAt: now,
    changeHighlights: [note || "Manually added from analyst URL intake."],
    sourceCount: 1,
    corroborationCount: 0,
    entities: source.entities,
    sources: [source],
    analystNotes: note
      ? [note]
      : ["Captured from manual URL intake. Needs extraction, corroboration, and source comparison."]
  };
}

function buildManualRegistryEntry(
  source: SourceItem,
  threadTitle: string,
  now: string
): SourceRegistryEntry {
  const metrics = getRegistrySeedMetrics(source.sourceType);

  return {
    id: createId("registry"),
    domain: source.domain,
    label: source.author !== "Unknown" ? source.author : source.domain,
    category: source.sourceType,
    promotedState: "neutral",
    originalityRatio: metrics.originalityRatio,
    corroborationRate: metrics.corroborationRate,
    savedThreadCount: 1,
    firstSeenAt: now,
    examples: [threadTitle],
    rationale: "Added manually from analyst intake. Treat early metrics as provisional until repeated use establishes a pattern.",
    emerging: true
  };
}

function mergeRegistryEntry(
  existingEntry: SourceRegistryEntry,
  source: SourceItem,
  threadTitle: string
): SourceRegistryEntry {
  const nextExamples = [threadTitle, ...existingEntry.examples.filter((item) => item !== threadTitle)]
    .slice(0, 5);

  return {
    ...existingEntry,
    category: existingEntry.category || source.sourceType,
    savedThreadCount: existingEntry.savedThreadCount + 1,
    examples: nextExamples,
    emerging: existingEntry.savedThreadCount + 1 < 4 ? true : existingEntry.emerging
  };
}

async function getCurrentUser(database: IDBDatabase, userId: string) {
  const transaction = database.transaction(storeNames.users, "readonly");
  const user = await requestToPromise(
    transaction.objectStore(storeNames.users).get(userId)
  );

  await transactionDone(transaction);

  return (user as WorkspaceUser | undefined) ?? defaultUser;
}

async function getThreadStateForUser(
  database: IDBDatabase,
  userId: string,
  threadId: string
) {
  const transaction = database.transaction(storeNames.threadStates, "readonly");
  const index = transaction.objectStore(storeNames.threadStates).index("by_user_thread");
  const threadState = await requestToPromise(index.get([userId, threadId]));

  await transactionDone(transaction);

  return threadState as ThreadState | undefined;
}

async function putThreadState(database: IDBDatabase, threadState: ThreadState) {
  const transaction = database.transaction(storeNames.threadStates, "readwrite");
  transaction.objectStore(storeNames.threadStates).put(threadState);
  await transactionDone(transaction);
}

export const workbenchRepository = {
  async getSnapshot(userId?: string): Promise<WorkbenchSnapshot> {
    return withDatabase(async (database) => {
      const resolvedUserId = userId ?? defaultUser.id;
      const transaction = database.transaction(Object.values(storeNames), "readonly");
      const userStore = transaction.objectStore(storeNames.users);
      const threadStore = transaction.objectStore(storeNames.threads);
      const sourceStore = transaction.objectStore(storeNames.sourceRegistry);
      const threadStateStore = transaction.objectStore(storeNames.threadStates);
      const caseStore = transaction.objectStore(storeNames.cases);

      const currentUserRequest = userStore.get(resolvedUserId);
      const threadsRequest = threadStore.getAll();
      const sourceRegistryRequest = sourceStore.getAll();
      const threadStatesRequest = threadStateStore.getAll();
      const casesRequest = caseStore.getAll();

      const currentUser = (await requestToPromise(currentUserRequest)) as WorkspaceUser | undefined;
      const threads = (await requestToPromise(threadsRequest)) as Thread[];
      const sourceRegistry = (await requestToPromise(
        sourceRegistryRequest
      )) as SourceRegistryEntry[];
      const threadStates = (await requestToPromise(threadStatesRequest)) as ThreadState[];
      const cases = (await requestToPromise(casesRequest)) as StoredCaseFile[];

      await transactionDone(transaction);

      return {
        currentUser: currentUser ?? defaultUser,
        threads: sortThreads(threads),
        sourceRegistry: sortRegistryEntries(sourceRegistry),
        cases: sortCases(cases.filter((item) => item.userId === resolvedUserId)),
        threadStates: threadStates.filter((item) => item.userId === resolvedUserId)
      };
    });
  },

  async recordThreadOpen(userId: string, threadId: string) {
    return withDatabase(async (database) => {
      const now = new Date().toISOString();
      const existingState = await getThreadStateForUser(database, userId, threadId);

      await putThreadState(database, {
        id: existingState?.id ?? buildThreadStateId(userId, threadId),
        userId,
        threadId,
        state: existingState?.state ?? "new",
        firstSeenAt: existingState?.firstSeenAt ?? now,
        lastOpenedAt: now,
        lastReviewedAt: existingState?.lastReviewedAt,
        lastMeaningfulDeltaAt: existingState?.lastMeaningfulDeltaAt,
        lastReactivatedAt: existingState?.lastReactivatedAt,
        caseId: existingState?.caseId,
        updatedAt: now
      });
    });
  },

  async markThreadReviewed(userId: string, threadId: string) {
    return withDatabase(async (database) => {
      const now = new Date().toISOString();
      const existingState = await getThreadStateForUser(database, userId, threadId);

      await putThreadState(database, {
        id: existingState?.id ?? buildThreadStateId(userId, threadId),
        userId,
        threadId,
        state: "reviewed",
        firstSeenAt: existingState?.firstSeenAt ?? now,
        lastOpenedAt: existingState?.lastOpenedAt ?? now,
        lastReviewedAt: now,
        lastMeaningfulDeltaAt: existingState?.lastMeaningfulDeltaAt,
        lastReactivatedAt: now,
        updatedAt: now
      });
    });
  },

  async toggleThreadWatch(userId: string, threadId: string) {
    return withDatabase(async (database) => {
      const now = new Date().toISOString();
      const existingState = await getThreadStateForUser(database, userId, threadId);

      await putThreadState(database, {
        id: existingState?.id ?? buildThreadStateId(userId, threadId),
        userId,
        threadId,
        state: existingState?.state === "watching" ? "reviewed" : "watching",
        firstSeenAt: existingState?.firstSeenAt ?? now,
        lastOpenedAt: existingState?.lastOpenedAt ?? now,
        lastReviewedAt: now,
        lastMeaningfulDeltaAt: existingState?.lastMeaningfulDeltaAt,
        lastReactivatedAt: existingState?.state === "watching" ? existingState.lastReactivatedAt : now,
        updatedAt: now
      });
    });
  },

  async saveThreadToCase(userId: string, threadId: string) {
    return withDatabase(async (database) => {
      const existingState = await getThreadStateForUser(database, userId, threadId);

      if (existingState?.caseId) {
        return existingState.caseId;
      }

      const currentUser = await getCurrentUser(database, userId);
      const lookup = database.transaction(storeNames.threads, "readonly");
      const thread = (await requestToPromise(
        lookup.objectStore(storeNames.threads).get(threadId)
      )) as Thread | undefined;

      await transactionDone(lookup);

      if (!thread) {
        throw new Error(`Thread ${threadId} was not found.`);
      }

      const now = new Date().toISOString();
      const createdCase = buildCaseFromThread(thread, currentUser.id);
      const transaction = database.transaction([storeNames.cases, storeNames.threadStates], "readwrite");
      const caseStore = transaction.objectStore(storeNames.cases);
      const threadStateStore = transaction.objectStore(storeNames.threadStates);

      caseStore.put(createdCase);
      threadStateStore.put({
        id: existingState?.id ?? buildThreadStateId(currentUser.id, thread.id),
        userId: currentUser.id,
        threadId: thread.id,
        state: "in_case",
        firstSeenAt: existingState?.firstSeenAt ?? now,
        lastOpenedAt: existingState?.lastOpenedAt ?? now,
        lastReviewedAt: now,
        lastMeaningfulDeltaAt: existingState?.lastMeaningfulDeltaAt ?? thread.lastUpdated,
        lastReactivatedAt: existingState?.lastReactivatedAt,
        caseId: createdCase.id,
        updatedAt: now
      });

      await transactionDone(transaction);

      return createdCase.id;
    });
  },

  async addManualUrl(userId: string, draft: ManualUrlIntake): Promise<ManualUrlAddResult> {
    return withDatabase(async (database) => {
      const normalizedUrl = normalizeUrlInput(draft.url).toString();
      const lookup = database.transaction(
        [storeNames.threads, storeNames.sourceRegistry, storeNames.threadStates],
        "readonly"
      );
      const threadsRequest = lookup.objectStore(storeNames.threads).getAll();
      const registryRequest = lookup.objectStore(storeNames.sourceRegistry).getAll();
      const threadStatesRequest = lookup.objectStore(storeNames.threadStates).getAll();
      const threads = (await requestToPromise(threadsRequest)) as Thread[];
      const registryEntries = (await requestToPromise(registryRequest)) as SourceRegistryEntry[];
      const threadStates = (await requestToPromise(threadStatesRequest)) as ThreadState[];

      await transactionDone(lookup);

      const now = new Date().toISOString();
      const existingThread = threads.find((thread) =>
        thread.sources.some((source) => source.url === normalizedUrl)
      );

      if (existingThread) {
        const existingSource =
          existingThread.sources.find((source) => source.url === normalizedUrl) ??
          existingThread.sources[0];
        const existingState = threadStates.find(
          (item) => item.userId === userId && item.threadId === existingThread.id
        );

        await putThreadState(database, {
          id: existingState?.id ?? buildThreadStateId(userId, existingThread.id),
          userId,
          threadId: existingThread.id,
          state: existingState?.caseId
            ? "in_case"
            : existingState?.state === "watching"
              ? "watching"
              : "new",
          firstSeenAt: existingState?.firstSeenAt ?? now,
          lastOpenedAt: existingState?.lastOpenedAt,
          lastReviewedAt: existingState?.lastReviewedAt,
          lastMeaningfulDeltaAt: existingState?.lastMeaningfulDeltaAt ?? now,
          lastReactivatedAt: now,
          caseId: existingState?.caseId,
          updatedAt: now
        });

        return {
          threadId: existingThread.id,
          sourceId: existingSource.id,
          duplicate: true
        };
      }

      const source = buildManualSourceItem(draft, normalizedUrl, now);
      const thread = buildManualThread(draft, source, now);
      const existingRegistryEntry = registryEntries.find((entry) => entry.domain === source.domain);
      const registryEntry = existingRegistryEntry
        ? mergeRegistryEntry(existingRegistryEntry, source, thread.title)
        : buildManualRegistryEntry(source, thread.title, now);
      const transaction = database.transaction(
        [storeNames.threads, storeNames.sourceRegistry, storeNames.threadStates],
        "readwrite"
      );

      transaction.objectStore(storeNames.threads).put(thread);
      transaction.objectStore(storeNames.sourceRegistry).put(registryEntry);
      transaction.objectStore(storeNames.threadStates).put({
        id: buildThreadStateId(userId, thread.id),
        userId,
        threadId: thread.id,
        state: "new",
        firstSeenAt: now,
        lastMeaningfulDeltaAt: now,
        updatedAt: now
      });

      await transactionDone(transaction);

      return {
        threadId: thread.id,
        sourceId: source.id,
        duplicate: false
      };
    });
  }
};
