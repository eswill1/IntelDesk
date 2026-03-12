import { useDeferredValue, useEffect, useRef, useState } from "react";
import { AddUrlDialog } from "./components/AddUrlDialog";
import { CasesView } from "./components/CasesView";
import { InboxView } from "./components/InboxView";
import { SearchView } from "./components/SearchView";
import { Sidebar } from "./components/Sidebar";
import { SourcesView } from "./components/SourcesView";
import { TopBar } from "./components/TopBar";
import {
  buildThreadQueueSections,
  buildThreadWorkflowMap,
  getThreadQueueMeta,
  sortThreadsForInbox
} from "./lib/threadWorkflow";
import {
  startSeedInvestigation,
  waitForSeedInvestigationJob
} from "./lib/seedInvestigation";
import { workbenchRepository } from "./lib/workbenchRepository";
import type {
  ManualUrlIntake,
  NavView,
  SearchResult,
  ThreadQueueState,
  WorkbenchSnapshot
} from "./types";

const themeStorageKey = "inteldesk-theme";

function readStoredTheme() {
  if (typeof window === "undefined") {
    return true;
  }

  const persisted = window.localStorage.getItem(themeStorageKey);
  return persisted ? persisted === "dark" : true;
}

function isNeedsReviewQueue(queueState?: ThreadQueueState) {
  return queueState === "new" || queueState === "new-delta";
}

export default function App() {
  const [snapshot, setSnapshot] = useState<WorkbenchSnapshot | null>(null);
  const [activeView, setActiveView] = useState<NavView>("inbox");
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResultId, setSelectedResultId] = useState("");
  const [onlyDelta, setOnlyDelta] = useState(true);
  const [darkMode, setDarkMode] = useState<boolean>(readStoredTheme);
  const [isAddUrlOpen, setIsAddUrlOpen] = useState(false);
  const deferredQuery = useDeferredValue(searchQuery);
  const previousInboxSelectionRef = useRef<string | null>(null);
  const skipAutoReviewThreadRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkbench() {
      const nextSnapshot = await workbenchRepository.getSnapshot();

      if (!cancelled) {
        setSnapshot(nextSnapshot);
      }
    }

    void loadWorkbench();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    window.localStorage.setItem(themeStorageKey, darkMode ? "dark" : "light");
  }, [darkMode]);

  const currentUserId = snapshot?.currentUser.id ?? "";
  const threads = snapshot?.threads ?? [];
  const sourceRegistry = snapshot?.sourceRegistry ?? [];
  const cases = snapshot?.cases ?? [];
  const threadStates = snapshot?.threadStates ?? [];
  const threadWorkflowMap = buildThreadWorkflowMap(threads, threadStates);
  const inboxThreads = sortThreadsForInbox(
    threads.filter((thread) => threadWorkflowMap[thread.id]?.queueState !== "muted"),
    threadWorkflowMap
  );
  const visibleThreads = onlyDelta
    ? inboxThreads.filter((thread) => isNeedsReviewQueue(threadWorkflowMap[thread.id]?.queueState))
    : inboxThreads;
  const queueSections = buildThreadQueueSections(visibleThreads, threadWorkflowMap);
  const watchedThreads = inboxThreads.filter(
    (thread) => threadWorkflowMap[thread.id]?.state === "watching"
  );
  const needsReviewCount = inboxThreads.filter((thread) =>
    isNeedsReviewQueue(threadWorkflowMap[thread.id]?.queueState)
  ).length;

  const query = deferredQuery.trim().toLowerCase();
  const resultSet: SearchResult[] = [
    ...threads.map((thread) => {
      const workflow = threadWorkflowMap[thread.id];
      const queueMeta = getThreadQueueMeta(workflow?.queueState ?? "new");

      return {
        id: thread.id,
        kind: "thread" as const,
        title: thread.title,
        subtitle: thread.summary,
        context: thread.changeHighlights.join(" "),
        updatedAt: thread.lastUpdated,
        tags: [...thread.entities, queueMeta.badge.toLowerCase()]
      };
    }),
    ...cases.map((item) => ({
      id: item.id,
      kind: "case" as const,
      title: item.title,
      subtitle: item.deltaSummary.join(" "),
      context: item.notes.map((note) => note.text).join(" "),
      updatedAt: item.updatedAt,
      tags: [...item.tags, item.status]
    })),
    ...threads.flatMap((thread) =>
      thread.sources.map((source) => ({
        id: source.id,
        kind: "source" as const,
        title: source.title,
        subtitle: `${source.domain} · ${source.sourceType}`,
        context: `${source.excerpt} ${source.entities.join(" ")}`,
        updatedAt: source.fetchedAt,
        tags: source.entities
      }))
    ),
    ...sourceRegistry.map((entry) => ({
      id: entry.id,
      kind: "registry" as const,
      title: entry.label,
      subtitle: `${entry.domain} · ${entry.promotedState}`,
      context: `${entry.rationale} ${entry.examples.join(" ")}`,
      updatedAt: entry.firstSeenAt,
      tags: [entry.category, entry.promotedState]
    }))
  ];

  const searchResults = !query
    ? resultSet.slice(0, 8)
    : resultSet.filter((result) => {
        const haystack = `${result.title} ${result.subtitle} ${result.context} ${result.tags.join(" ")}`
          .toLowerCase()
          .trim();
        return haystack.includes(query);
      });

  async function refreshWorkbench() {
    const nextSnapshot = await workbenchRepository.getSnapshot();
    setSnapshot(nextSnapshot);
  }

  async function handleAddUrl(draft: ManualUrlIntake) {
    if (!currentUserId) {
      throw new Error("The local analyst profile is still loading.");
    }

    const result = await workbenchRepository.addManualUrl(currentUserId, draft);
    await refreshWorkbench();
    setOnlyDelta(!result.duplicate);
    setSelectedThreadId(result.threadId);
    setActiveView("inbox");
    setIsAddUrlOpen(false);
  }

  async function handleSeedInvestigation(draft: ManualUrlIntake) {
    if (!currentUserId) {
      throw new Error("The local analyst profile is still loading.");
    }

    const result = await workbenchRepository.addManualUrl(currentUserId, draft);
    const seedStart = await startSeedInvestigation(draft.url);
    const completedJob = await waitForSeedInvestigationJob(seedStart.jobId);

    await workbenchRepository.applySeedInvestigation(currentUserId, result.threadId, completedJob);
    await refreshWorkbench();
    setOnlyDelta(false);
    setSelectedThreadId(result.threadId);
    setActiveView("inbox");
    setIsAddUrlOpen(false);
  }

  function openThreadInInbox(threadId: string) {
    if (!visibleThreads.some((thread) => thread.id === threadId)) {
      setOnlyDelta(false);
    }

    setSelectedThreadId(threadId);
    setActiveView("inbox");
  }

  function toggleWatchThread(threadId: string) {
    if (!currentUserId) {
      return;
    }

    const caseId = threadWorkflowMap[threadId]?.caseId;

    if (caseId) {
      setSelectedCaseId(caseId);
      setActiveView("cases");
      return;
    }

    skipAutoReviewThreadRef.current = threadId;

    void (async () => {
      await workbenchRepository.toggleThreadWatch(currentUserId, threadId);
      await refreshWorkbench();
    })();
  }

  function saveThreadToCase(threadId: string) {
    if (!currentUserId) {
      return;
    }

    const existingCaseId = threadWorkflowMap[threadId]?.caseId;

    if (existingCaseId) {
      skipAutoReviewThreadRef.current = threadId;
      setSelectedCaseId(existingCaseId);
      setActiveView("cases");
      return;
    }

    skipAutoReviewThreadRef.current = threadId;

    void (async () => {
      const caseId = await workbenchRepository.saveThreadToCase(currentUserId, threadId);
      await refreshWorkbench();
      setSelectedCaseId(caseId);
      setActiveView("cases");
    })();
  }

  useEffect(() => {
    if (!currentUserId || activeView !== "inbox" || !selectedThreadId) {
      return;
    }

    void (async () => {
      await workbenchRepository.recordThreadOpen(currentUserId, selectedThreadId);
      await refreshWorkbench();
    })();
  }, [activeView, currentUserId, selectedThreadId]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const currentInboxSelection = activeView === "inbox" ? selectedThreadId : null;
    const previousThreadId = previousInboxSelectionRef.current;

    if (previousThreadId && previousThreadId !== currentInboxSelection) {
      if (skipAutoReviewThreadRef.current === previousThreadId) {
        skipAutoReviewThreadRef.current = null;
      } else if (isNeedsReviewQueue(threadWorkflowMap[previousThreadId]?.queueState)) {
        void (async () => {
          await workbenchRepository.markThreadReviewed(currentUserId, previousThreadId);
          await refreshWorkbench();
        })();
      }
    }

    previousInboxSelectionRef.current = currentInboxSelection;
  }, [activeView, currentUserId, selectedThreadId, threadWorkflowMap]);

  useEffect(() => {
    if (!visibleThreads.some((thread) => thread.id === selectedThreadId) && visibleThreads[0]) {
      setSelectedThreadId(visibleThreads[0].id);
    }
  }, [selectedThreadId, visibleThreads]);

  useEffect(() => {
    if (!cases.some((item) => item.id === selectedCaseId)) {
      setSelectedCaseId(cases[0]?.id ?? "");
    }
  }, [cases, selectedCaseId]);

  useEffect(() => {
    if (!sourceRegistry.some((item) => item.id === selectedSourceId)) {
      setSelectedSourceId(sourceRegistry[0]?.id ?? "");
    }
  }, [selectedSourceId, sourceRegistry]);

  useEffect(() => {
    if (!searchResults.some((result) => result.id === selectedResultId)) {
      setSelectedResultId(searchResults[0]?.id ?? "");
    }
  }, [searchResults, selectedResultId]);

  useEffect(() => {
    const selectedThreadCaseId = threadWorkflowMap[selectedThreadId]?.caseId;

    function onKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.key === "1") {
        setActiveView("inbox");
      }

      if (event.key === "2") {
        setActiveView("cases");
      }

      if (event.key === "3") {
        setActiveView("sources");
      }

      if (event.key === "4") {
        setActiveView("search");
      }

      if (event.key === "j" && activeView === "inbox") {
        event.preventDefault();
        const currentIndex = visibleThreads.findIndex((thread) => thread.id === selectedThreadId);
        const nextIndex = Math.min(currentIndex + 1, visibleThreads.length - 1);

        if (visibleThreads[nextIndex]) {
          setSelectedThreadId(visibleThreads[nextIndex].id);
        }
      }

      if (event.key === "k" && activeView === "inbox") {
        event.preventDefault();
        const currentIndex = visibleThreads.findIndex((thread) => thread.id === selectedThreadId);
        const nextIndex = Math.max(currentIndex - 1, 0);

        if (visibleThreads[nextIndex]) {
          setSelectedThreadId(visibleThreads[nextIndex].id);
        }
      }

      if (event.key === "d" && activeView === "inbox") {
        event.preventDefault();
        setOnlyDelta((current) => !current);
      }

      if (event.key === "w" && activeView === "inbox" && selectedThreadId && !selectedThreadCaseId) {
        event.preventDefault();
        toggleWatchThread(selectedThreadId);
      }

      if (event.key === "s" && activeView === "inbox" && selectedThreadId) {
        event.preventDefault();
        saveThreadToCase(selectedThreadId);
      }

      if (event.key === "s" && activeView !== "inbox") {
        event.preventDefault();
        setActiveView("cases");
      }

      if (event.key === "/") {
        event.preventDefault();
        setActiveView("search");
      }

      if (event.key === "a" && currentUserId) {
        event.preventDefault();
        setIsAddUrlOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeView, currentUserId, selectedThreadId, threadWorkflowMap, visibleThreads]);

  if (!snapshot) {
    return (
      <div className="app-shell">
        <Sidebar
          activeView={activeView}
          caseCount={0}
          onSelectView={setActiveView}
          reviewCount={0}
          sourceCount={0}
          watchCount={0}
        />

        <main className="main-shell">
          <TopBar
            addUrlDisabled
            activeView={activeView}
            darkMode={darkMode}
            onOpenAddUrl={() => setIsAddUrlOpen(true)}
            onToggleTheme={() => setDarkMode((current) => !current)}
          />

          <section className="panel list-panel">
            <article className="empty-state">
              <h4>Loading workbench</h4>
              <p>Opening the local analyst profile and restoring the review queue.</p>
            </article>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        caseCount={cases.length}
        onSelectView={setActiveView}
        reviewCount={needsReviewCount}
        sourceCount={sourceRegistry.length}
        watchCount={watchedThreads.length}
      />

      <main className="main-shell">
        <TopBar
          activeView={activeView}
          addUrlDisabled={!currentUserId}
          darkMode={darkMode}
          onOpenAddUrl={() => setIsAddUrlOpen(true)}
          onToggleTheme={() => setDarkMode((current) => !current)}
        />

        {activeView === "inbox" ? (
          <InboxView
            onlyDelta={onlyDelta}
            onSaveThreadToCase={saveThreadToCase}
            onSelectThread={setSelectedThreadId}
            onToggleOnlyDelta={() => setOnlyDelta((current) => !current)}
            onToggleWatchThread={toggleWatchThread}
            queueSections={queueSections}
            selectedThreadId={selectedThreadId}
            threadWorkflowMap={threadWorkflowMap}
            threads={visibleThreads}
          />
        ) : null}

        {activeView === "cases" ? (
          <CasesView
            cases={cases}
            onOpenThreadInInbox={openThreadInInbox}
            onPromoteThreadToCase={saveThreadToCase}
            onSelectCase={setSelectedCaseId}
            selectedCaseId={selectedCaseId}
            threads={threads}
            watchedThreads={watchedThreads}
          />
        ) : null}

        {activeView === "sources" ? (
          <SourcesView
            onSelectSource={setSelectedSourceId}
            registry={sourceRegistry}
            selectedSourceId={selectedSourceId}
          />
        ) : null}

        {activeView === "search" ? (
          <SearchView
            onQueryChange={setSearchQuery}
            onSelectResult={setSelectedResultId}
            query={searchQuery}
            results={searchResults}
            selectedResultId={selectedResultId}
          />
        ) : null}
      </main>

      <AddUrlDialog
        onClose={() => setIsAddUrlOpen(false)}
        onSeedInvestigation={handleSeedInvestigation}
        onSubmit={handleAddUrl}
        open={isAddUrlOpen}
      />
    </div>
  );
}
