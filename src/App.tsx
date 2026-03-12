import { useDeferredValue, useEffect, useRef, useState } from "react";
import { AddUrlDialog } from "./components/AddUrlDialog";
import { CasesView } from "./components/CasesView";
import { LibraryView } from "./components/LibraryView";
import { MonitorsView } from "./components/MonitorsView";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { agentDefinitions } from "./data/mockData";
import { buildAgentViews } from "./lib/agents";
import {
  startSeedInvestigation,
  waitForSeedInvestigationJob
} from "./lib/seedInvestigation";
import {
  buildThreadWorkflowMap,
  getThreadQueueMeta,
  sortThreadsForInbox
} from "./lib/threadWorkflow";
import { workbenchRepository } from "./lib/workbenchRepository";
import type {
  ManualUrlIntake,
  NavView,
  SearchResult,
  ThreadQueueState,
  WorkbenchSnapshot
} from "./types";

const themeStorageKey = "inteldesk-theme";
const reviewQueueViewId = "queue-review";
const watchlistViewId = "queue-watching";
const inCasesViewId = "queue-in-case";
const specialMonitorViewIds = new Set([reviewQueueViewId, watchlistViewId, inCasesViewId]);

function readStoredTheme() {
  if (typeof window === "undefined") {
    return false;
  }

  const persisted = window.localStorage.getItem(themeStorageKey);
  return persisted ? persisted === "dark" : false;
}

function isNeedsReviewQueue(queueState?: ThreadQueueState) {
  return queueState === "new" || queueState === "new-delta";
}

export default function App() {
  const [snapshot, setSnapshot] = useState<WorkbenchSnapshot | null>(null);
  const [activeView, setActiveView] = useState<NavView>("monitors");
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [selectedMonitorId, setSelectedMonitorId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResultId, setSelectedResultId] = useState("");
  const [onlyDelta, setOnlyDelta] = useState(true);
  const [darkMode, setDarkMode] = useState<boolean>(readStoredTheme);
  const [isAddUrlOpen, setIsAddUrlOpen] = useState(false);
  const deferredQuery = useDeferredValue(searchQuery);
  const previousMonitorSelectionRef = useRef<string | null>(null);
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
  const allCards = sortThreadsForInbox(
    threads.filter((thread) => threadWorkflowMap[thread.id]?.queueState !== "muted"),
    threadWorkflowMap
  );
  const monitorViews = buildAgentViews(agentDefinitions, threads, threadWorkflowMap);
  const watchedThreads = allCards.filter(
    (thread) => threadWorkflowMap[thread.id]?.state === "watching"
  );
  const needsReviewCount = allCards.filter((thread) =>
    isNeedsReviewQueue(threadWorkflowMap[thread.id]?.queueState)
  ).length;
  const inCaseCount = allCards.filter(
    (thread) => threadWorkflowMap[thread.id]?.queueState === "in-case"
  ).length;
  const selectedMonitor = monitorViews.find((monitor) => monitor.id === selectedMonitorId) ?? null;
  const scopedThreads = (() => {
    if (selectedMonitorId === reviewQueueViewId) {
      return allCards.filter((thread) => isNeedsReviewQueue(threadWorkflowMap[thread.id]?.queueState));
    }

    if (selectedMonitorId === watchlistViewId) {
      return allCards.filter((thread) => threadWorkflowMap[thread.id]?.queueState === "watching");
    }

    if (selectedMonitorId === inCasesViewId) {
      return allCards.filter((thread) => threadWorkflowMap[thread.id]?.queueState === "in-case");
    }

    if (!selectedMonitor) {
      return allCards;
    }

    const matchedThreadIds = new Set(selectedMonitor.matches.map((match) => match.threadId));
    return allCards.filter((thread) => matchedThreadIds.has(thread.id));
  })();
  const deltaToggleDisabled = specialMonitorViewIds.has(selectedMonitorId);
  const visibleThreads =
    onlyDelta && !deltaToggleDisabled
      ? scopedThreads.filter((thread) => isNeedsReviewQueue(threadWorkflowMap[thread.id]?.queueState))
      : scopedThreads;
  const focusViews = [
    {
      id: "",
      label: "All cards",
      description: "Everything IntelDesk is tracking across your saved monitors.",
      count: allCards.length
    },
    {
      id: reviewQueueViewId,
      label: "Review queue",
      description: "Fresh or reactivated cards that still need a decision.",
      count: needsReviewCount
    },
    {
      id: watchlistViewId,
      label: "Watchlist",
      description: "Signals worth revisiting before they graduate into full cases.",
      count: watchedThreads.length
    },
    {
      id: inCasesViewId,
      label: "In cases",
      description: "Cards already promoted into active follow-through work.",
      count: inCaseCount
    }
  ];
  const selectedFocusView = focusViews.find((view) => view.id === selectedMonitorId) ?? focusViews[0];
  const activeFeed = selectedMonitor
    ? {
        eyebrow: "Saved monitor",
        title: selectedMonitor.title,
        description: selectedMonitor.summary
      }
    : {
        eyebrow: selectedFocusView.id ? "Focused view" : "Daily monitor feed",
        title: selectedFocusView.label,
        description: selectedFocusView.description
      };

  const query = deferredQuery.trim().toLowerCase();
  const resultSet: SearchResult[] = [
    ...threads.map((thread) => {
      const workflow = threadWorkflowMap[thread.id];
      const queueMeta = getThreadQueueMeta(workflow?.queueState ?? "new");

      return {
        id: thread.id,
        kind: "card" as const,
        title: thread.title,
        subtitle: thread.summary,
        context: thread.changeHighlights.join(" "),
        updatedAt: thread.lastUpdated,
        tags: [...thread.entities, queueMeta.badge.toLowerCase()]
      };
    }),
    ...monitorViews.map((monitor) => ({
      id: monitor.id,
      kind: "monitor" as const,
      title: monitor.title,
      subtitle: `${monitor.lens} · ${monitor.threadCount} cards`,
      context: `${monitor.summary} ${monitor.objective}`,
      updatedAt: monitor.latestActivityAt ?? threads[0]?.lastUpdated ?? new Date().toISOString(),
      tags: [monitor.priority, ...monitor.entityHints.slice(0, 3)]
    })),
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
    ? resultSet.slice(0, 10)
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
    setSelectedMonitorId("");
    setSelectedThreadId(result.threadId);
    setActiveView("monitors");
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
    setSelectedMonitorId("");
    setSelectedThreadId(result.threadId);
    setActiveView("monitors");
    setIsAddUrlOpen(false);
  }

  function openThreadInMonitors(threadId: string) {
    setSelectedMonitorId("");
    setOnlyDelta(false);
    setSelectedThreadId(threadId);
    setActiveView("monitors");
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
    if (!currentUserId || activeView !== "monitors" || !selectedThreadId) {
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

    const currentMonitorSelection = activeView === "monitors" ? selectedThreadId : null;
    const previousThreadId = previousMonitorSelectionRef.current;

    if (previousThreadId && previousThreadId !== currentMonitorSelection) {
      if (skipAutoReviewThreadRef.current === previousThreadId) {
        skipAutoReviewThreadRef.current = null;
      } else if (isNeedsReviewQueue(threadWorkflowMap[previousThreadId]?.queueState)) {
        void (async () => {
          await workbenchRepository.markThreadReviewed(currentUserId, previousThreadId);
          await refreshWorkbench();
        })();
      }
    }

    previousMonitorSelectionRef.current = currentMonitorSelection;
  }, [activeView, currentUserId, selectedThreadId, threadWorkflowMap]);

  useEffect(() => {
    if (!visibleThreads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(visibleThreads[0]?.id ?? "");
    }
  }, [selectedThreadId, visibleThreads]);

  useEffect(() => {
    if (
      selectedMonitorId &&
      !specialMonitorViewIds.has(selectedMonitorId) &&
      !monitorViews.some((monitor) => monitor.id === selectedMonitorId)
    ) {
      setSelectedMonitorId("");
    }
  }, [monitorViews, selectedMonitorId]);

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
        setActiveView("monitors");
      }

      if (event.key === "2") {
        setActiveView("cases");
      }

      if (event.key === "3") {
        setActiveView("library");
      }

      if (event.key === "j" && activeView === "monitors") {
        event.preventDefault();
        const currentIndex = visibleThreads.findIndex((thread) => thread.id === selectedThreadId);
        const nextIndex = Math.min(currentIndex + 1, visibleThreads.length - 1);

        if (visibleThreads[nextIndex]) {
          setSelectedThreadId(visibleThreads[nextIndex].id);
        }
      }

      if (event.key === "k" && activeView === "monitors") {
        event.preventDefault();
        const currentIndex = visibleThreads.findIndex((thread) => thread.id === selectedThreadId);
        const nextIndex = Math.max(currentIndex - 1, 0);

        if (visibleThreads[nextIndex]) {
          setSelectedThreadId(visibleThreads[nextIndex].id);
        }
      }

      if (event.key === "d" && activeView === "monitors") {
        event.preventDefault();
        setOnlyDelta((current) => !current);
      }

      if (
        event.key === "w" &&
        activeView === "monitors" &&
        selectedThreadId &&
        !selectedThreadCaseId
      ) {
        event.preventDefault();
        toggleWatchThread(selectedThreadId);
      }

      if (event.key === "s" && activeView === "monitors" && selectedThreadId) {
        event.preventDefault();
        saveThreadToCase(selectedThreadId);
      }

      if (event.key === "/" && activeView !== "library") {
        event.preventDefault();
        setActiveView("library");
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
              <h4>Loading monitors</h4>
              <p>Opening the local analyst profile and restoring the curated feed.</p>
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

        {activeView === "monitors" ? (
          <MonitorsView
            activeFeed={activeFeed}
            allCardCount={allCards.length}
            cards={visibleThreads}
            deltaToggleDisabled={deltaToggleDisabled}
            focusViews={focusViews}
            inCaseCount={inCaseCount}
            monitors={monitorViews}
            onSaveCardToCase={saveThreadToCase}
            onSelectCard={setSelectedThreadId}
            onSelectMonitor={setSelectedMonitorId}
            onToggleOnlyDelta={() => setOnlyDelta((current) => !current)}
            onToggleWatchCard={toggleWatchThread}
            onlyDelta={onlyDelta}
            reviewCount={needsReviewCount}
            selectedCardId={selectedThreadId}
            selectedMonitorId={selectedMonitorId}
            threadWorkflowMap={threadWorkflowMap}
            watchCount={watchedThreads.length}
          />
        ) : null}

        {activeView === "cases" ? (
          <CasesView
            cases={cases}
            onOpenThreadInMonitors={openThreadInMonitors}
            onPromoteThreadToCase={saveThreadToCase}
            onSelectCase={setSelectedCaseId}
            selectedCaseId={selectedCaseId}
            threads={threads}
            watchedThreads={watchedThreads}
          />
        ) : null}

        {activeView === "library" ? (
          <LibraryView
            onQueryChange={setSearchQuery}
            onSelectResult={setSelectedResultId}
            onSelectSource={setSelectedSourceId}
            query={searchQuery}
            registry={sourceRegistry}
            results={searchResults}
            selectedResultId={selectedResultId}
            selectedSourceId={selectedSourceId}
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
