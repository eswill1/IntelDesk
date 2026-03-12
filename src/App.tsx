import { useDeferredValue, useEffect, useState } from "react";
import { caseFiles as seededCases, sourceRegistry, threads } from "./data/mockData";
import { CasesView } from "./components/CasesView";
import { InboxView } from "./components/InboxView";
import { SearchView } from "./components/SearchView";
import { Sidebar } from "./components/Sidebar";
import { SourcesView } from "./components/SourcesView";
import { TopBar } from "./components/TopBar";
import type { CaseFile, NavView, SearchResult, Thread } from "./types";

const themeStorageKey = "inteldesk-theme";
const casesStorageKey = "inteldesk-cases-v2";
const watchedThreadsStorageKey = "inteldesk-watched-threads-v2";

function readStoredJson<T>(storageKey: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const stored = window.localStorage.getItem(storageKey);

  if (!stored) {
    return fallback;
  }

  try {
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function buildCaseFromThread(thread: Thread): CaseFile {
  const createdAt = new Date().toISOString();
  const canonicalSource = thread.sources.find((source) => source.isCanonical) ?? thread.sources[0];

  return {
    id: `case-${thread.id}`,
    title: thread.title,
    status: "watching",
    tags: thread.entities.slice(0, 3),
    lastUpdated: thread.lastUpdated,
    lastSeenAt: createdAt,
    deltaSummary: [
      "Case created from Inbox for deliberate follow-up.",
      ...thread.changeHighlights.slice(0, 2)
    ],
    linkedThreadIds: [thread.id],
    linkedSourceIds: thread.sources.map((source) => source.id),
    notes: [
      {
        id: `note-${thread.id}-seed`,
        createdAt,
        text: "Created from the Inbox when the thread crossed from interesting to worth revisiting.",
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
          : "Thread promoted from Inbox without a canonical source selected yet.",
        kind: "source"
      },
      {
        id: `timeline-${thread.id}-promotion`,
        at: createdAt,
        label: "Case created from Inbox",
        detail: "Thread promoted into a case so notes, deltas, and sources survive triage.",
        kind: "status"
      }
    ]
  };
}

export default function App() {
  const [activeView, setActiveView] = useState<NavView>("inbox");
  const [selectedThreadId, setSelectedThreadId] = useState<string>("thread-fortinet");
  const [cases, setCases] = useState<CaseFile[]>(() => readStoredJson(casesStorageKey, seededCases));
  const [watchedThreadIds, setWatchedThreadIds] = useState<string[]>(() =>
    readStoredJson(watchedThreadsStorageKey, ["thread-fortinet"])
  );
  const [selectedCaseId, setSelectedCaseId] = useState<string>(() =>
    readStoredJson(casesStorageKey, seededCases)[0]?.id ?? ""
  );
  const [selectedSourceId, setSelectedSourceId] = useState<string>(sourceRegistry[0].id);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResultId, setSelectedResultId] = useState("");
  const [onlyDelta, setOnlyDelta] = useState(true);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const persisted =
      typeof window !== "undefined" ? window.localStorage.getItem(themeStorageKey) : null;
    return persisted ? persisted === "dark" : true;
  });

  const deferredQuery = useDeferredValue(searchQuery);
  const threadCaseIdMap = cases.reduce<Record<string, string>>((accumulator, item) => {
    item.linkedThreadIds.forEach((threadId) => {
      accumulator[threadId] = item.id;
    });
    return accumulator;
  }, {});
  const watchedThreads = threads.filter(
    (thread) => watchedThreadIds.includes(thread.id) && !threadCaseIdMap[thread.id]
  );

  const visibleThreads = onlyDelta
    ? threads.filter(
        (thread) =>
          thread.changeHighlights.length > 0 &&
          thread.changeHighlights[0] !== "No new changes since the last review."
      )
    : threads;

  const query = deferredQuery.trim().toLowerCase();
  const resultSet: SearchResult[] = [
    ...threads.map((thread) => ({
      id: thread.id,
      kind: "thread" as const,
      title: thread.title,
      subtitle: thread.summary,
      context: thread.changeHighlights.join(" "),
      updatedAt: thread.lastUpdated,
      tags: [
        ...thread.entities,
        threadCaseIdMap[thread.id]
          ? "in case"
          : watchedThreadIds.includes(thread.id)
            ? "watch queue"
            : "inbox"
      ]
    })),
    ...cases.map((item) => ({
      id: item.id,
      kind: "case" as const,
      title: item.title,
      subtitle: item.deltaSummary.join(" "),
      context: item.notes.map((note) => note.text).join(" "),
      updatedAt: item.lastUpdated,
      tags: item.tags
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

  function openThreadInInbox(threadId: string) {
    if (!visibleThreads.some((thread) => thread.id === threadId)) {
      setOnlyDelta(false);
    }

    setSelectedThreadId(threadId);
    setActiveView("inbox");
  }

  function toggleWatchThread(threadId: string) {
    if (threadCaseIdMap[threadId]) {
      setSelectedCaseId(threadCaseIdMap[threadId]);
      setActiveView("cases");
      return;
    }

    setWatchedThreadIds((current) =>
      current.includes(threadId)
        ? current.filter((id) => id !== threadId)
        : [threadId, ...current]
    );
  }

  function saveThreadToCase(threadId: string) {
    const existingCaseId = threadCaseIdMap[threadId];

    if (existingCaseId) {
      setSelectedCaseId(existingCaseId);
      setActiveView("cases");
      return;
    }

    const thread = threads.find((item) => item.id === threadId);

    if (!thread) {
      return;
    }

    const createdCase = buildCaseFromThread(thread);

    setCases((current) => [createdCase, ...current]);
    setWatchedThreadIds((current) => current.filter((id) => id !== threadId));
    setSelectedCaseId(createdCase.id);
    setActiveView("cases");
  }

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    window.localStorage.setItem(themeStorageKey, darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    window.localStorage.setItem(casesStorageKey, JSON.stringify(cases));
  }, [cases]);

  useEffect(() => {
    window.localStorage.setItem(watchedThreadsStorageKey, JSON.stringify(watchedThreadIds));
  }, [watchedThreadIds]);

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
    if (!searchResults.some((result) => result.id === selectedResultId)) {
      setSelectedResultId(searchResults[0]?.id ?? "");
    }
  }, [searchResults, selectedResultId]);

  useEffect(() => {
    const selectedThreadCaseId = threadCaseIdMap[selectedThreadId];

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

      if (event.key === "w" && activeView === "inbox" && !selectedThreadCaseId) {
        event.preventDefault();
        toggleWatchThread(selectedThreadId);
      }

      if (event.key === "s" && activeView === "inbox") {
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
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeView, selectedThreadId, threadCaseIdMap, visibleThreads]);

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        caseCount={cases.length}
        onSelectView={setActiveView}
        sourceCount={sourceRegistry.length}
        threadCount={visibleThreads.length}
        watchCount={watchedThreads.length}
      />

      <main className="main-shell">
        <TopBar
          activeView={activeView}
          darkMode={darkMode}
          onToggleTheme={() => setDarkMode((current) => !current)}
        />

        {activeView === "inbox" ? (
          <InboxView
            onlyDelta={onlyDelta}
            onSelectThread={setSelectedThreadId}
            onSaveThreadToCase={saveThreadToCase}
            onToggleOnlyDelta={() => setOnlyDelta((current) => !current)}
            onToggleWatchThread={toggleWatchThread}
            selectedThreadId={selectedThreadId}
            threadCaseIdMap={threadCaseIdMap}
            threads={visibleThreads}
            watchedThreadIds={watchedThreadIds}
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
    </div>
  );
}
