import { startTransition, useState } from "react";
import { getAgentMatchesForThread } from "../lib/agents";
import { getThreadQueueMeta } from "../lib/threadWorkflow";
import type {
  AgentView,
  NavView,
  SearchResult,
  SourceRegistryEntry,
  StoredCaseFile,
  Thread,
  ThreadWorkflowView
} from "../types";

export interface FocusView {
  id: string;
  label: string;
  description: string;
  count: number;
}

interface WorkspaceExperienceProps {
  activeView: NavView;
  onSelectView: (view: NavView) => void;
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenAddUrl: () => void;
  addUrlDisabled?: boolean;
  monitors: AgentView[];
  focusViews: FocusView[];
  selectedMonitorId: string;
  onSelectMonitor: (monitorId: string) => void;
  cards: Thread[];
  reviewCount: number;
  watchCount: number;
  inCaseCount: number;
  selectedCardId: string;
  onSelectCard: (cardId: string) => void;
  onlyDelta: boolean;
  deltaToggleDisabled: boolean;
  onToggleOnlyDelta: () => void;
  threadWorkflowMap: Record<string, ThreadWorkflowView>;
  onToggleWatchCard: (cardId: string) => void;
  onSaveCardToCase: (cardId: string) => void;
  cases: StoredCaseFile[];
  selectedCaseId: string;
  onSelectCase: (caseId: string) => void;
  watchedThreads: Thread[];
  allThreads: Thread[];
  onPromoteThreadToCase: (threadId: string) => void;
  onOpenThreadInMonitors: (threadId: string) => void;
  query: string;
  results: SearchResult[];
  selectedResultId: string;
  onSelectResult: (resultId: string) => void;
  onQueryChange: (value: string) => void;
  registry: SourceRegistryEntry[];
  selectedSourceId: string;
  onSelectSource: (sourceId: string) => void;
}

const viewLabels: Record<NavView, { label: string; blurb: string }> = {
  monitors: {
    label: "Monitors",
    blurb: "Daily signal collection"
  },
  cases: {
    label: "Cases",
    blurb: "Tracked follow-through"
  },
  library: {
    label: "Library",
    blurb: "Recovered context"
  }
};

const starterQueries = ["CVE-2026-1182", "Ivanti", "supply chain", "Fortinet"];

function formatAbsoluteTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatRelativeTime(value: string) {
  const deltaMinutes = Math.round((new Date(value).getTime() - Date.now()) / 60000);
  const formatter = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

  if (Math.abs(deltaMinutes) < 60) {
    return formatter.format(deltaMinutes, "minute");
  }

  const deltaHours = Math.round(deltaMinutes / 60);

  if (Math.abs(deltaHours) < 36) {
    return formatter.format(deltaHours, "hour");
  }

  return formatter.format(Math.round(deltaHours / 24), "day");
}

function getLeadSource(thread: Thread) {
  return thread.sources.find((source) => source.isCanonical) ?? thread.sources[0] ?? null;
}

function getSourceDomains(thread: Thread) {
  return [...new Set(thread.sources.map((source) => source.domain))].slice(0, 3);
}

function getInitials(value: string) {
  return value
    .split(" ")
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? "")
    .join("");
}

function MonitorStage({
  monitors,
  focusViews,
  selectedMonitorId,
  onSelectMonitor,
  cards,
  reviewCount,
  watchCount,
  inCaseCount,
  selectedCardId,
  onSelectCard,
  onlyDelta,
  deltaToggleDisabled,
  onToggleOnlyDelta,
  threadWorkflowMap,
  onToggleWatchCard,
  onSaveCardToCase
}: Pick<
  WorkspaceExperienceProps,
  | "monitors"
  | "focusViews"
  | "selectedMonitorId"
  | "onSelectMonitor"
  | "cards"
  | "reviewCount"
  | "watchCount"
  | "inCaseCount"
  | "selectedCardId"
  | "onSelectCard"
  | "onlyDelta"
  | "deltaToggleDisabled"
  | "onToggleOnlyDelta"
  | "threadWorkflowMap"
  | "onToggleWatchCard"
  | "onSaveCardToCase"
>) {
  const selectedMonitor = monitors.find((monitor) => monitor.id === selectedMonitorId) ?? null;
  const selectedFocusView = focusViews.find((view) => view.id === selectedMonitorId) ?? focusViews[0];
  const activeTitle = selectedMonitor?.title ?? selectedFocusView.label;
  const activeCopy = selectedMonitor?.summary ?? selectedFocusView.description;
  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? cards[0] ?? null;
  const selectedWorkflow = selectedCard ? threadWorkflowMap[selectedCard.id] : undefined;
  const selectedQueueMeta = selectedWorkflow
    ? getThreadQueueMeta(selectedWorkflow.queueState)
    : null;
  const selectedLeadSource = selectedCard ? getLeadSource(selectedCard) : null;
  const selectedCardMonitors = selectedCard
    ? getAgentMatchesForThread(monitors, selectedCard.id)
    : [];

  return (
    <section className="monitor-stage">
      <aside className="stage-rail">
        <article className="radar-module">
          <div>
            <p className="eyebrow">Live radar</p>
            <h3>Daily briefing</h3>
          </div>
          <div className="radar-stats">
            <div>
              <span className="metric-label">Review</span>
              <strong>{reviewCount}</strong>
            </div>
            <div>
              <span className="metric-label">Watching</span>
              <strong>{watchCount}</strong>
            </div>
            <div>
              <span className="metric-label">In cases</span>
              <strong>{inCaseCount}</strong>
            </div>
          </div>
        </article>

        <article className="rail-module">
          <div className="rail-module-header">
            <div>
              <p className="eyebrow">Saved monitors</p>
              <h4>Priority lenses</h4>
            </div>
            <span className="meta-text">{monitors.length}</span>
          </div>
          <div className="monitor-rail-list">
            {monitors.map((monitor) => (
              <button
                key={monitor.id}
                className={`monitor-lens${monitor.id === selectedMonitorId ? " is-active" : ""}`}
                onClick={() => onSelectMonitor(monitor.id)}
                type="button"
              >
                <span className="monitor-lens-mark">{getInitials(monitor.title)}</span>
                <span className="monitor-lens-copy">
                  <strong>{monitor.title}</strong>
                  <small>{monitor.lens}</small>
                </span>
                <span className="monitor-lens-count">{monitor.threadCount}</span>
              </button>
            ))}
          </div>
        </article>
      </aside>

      <main className="feed-stage">
        <article className="feed-banner">
          <div className="feed-banner-copy">
            <p className="eyebrow">Monitor stream</p>
            <h2>{activeTitle}</h2>
            <p>{activeCopy}</p>
          </div>
          <div className="feed-banner-actions">
            <span className="feed-banner-stat">
              <span className="metric-label">Visible cards</span>
              <strong>{cards.length}</strong>
            </span>
            <button
              className="toolbar-button"
              disabled={deltaToggleDisabled}
              onClick={onToggleOnlyDelta}
              type="button"
            >
              {onlyDelta ? "Showing only delta" : "Show only delta"}
            </button>
          </div>
        </article>

        <div className="focus-chip-row">
          {focusViews.map((view) => (
            <button
              key={view.id || "all-cards"}
              className={`focus-chip${view.id === selectedMonitorId ? " is-active" : ""}`}
              onClick={() => onSelectMonitor(view.id)}
              type="button"
            >
              <span>{view.label}</span>
              <strong>{view.count}</strong>
            </button>
          ))}
        </div>

        <section className="signal-stream">
          {cards.length ? (
            cards.map((card) => {
              const workflow = threadWorkflowMap[card.id];
              const queueMeta = getThreadQueueMeta(workflow.queueState);
              const leadSource = getLeadSource(card);
              const domains = getSourceDomains(card);
              const matches = getAgentMatchesForThread(monitors, card.id).slice(0, 2);

              return (
                <article
                  key={card.id}
                  className={`signal-card${card.id === selectedCardId ? " is-selected" : ""}`}
                >
                  <button
                    className="signal-card-main"
                    onClick={() => onSelectCard(card.id)}
                    type="button"
                  >
                    <div className="signal-card-topline">
                      <span className={`status-tag status-${workflow.queueState}`}>
                        {queueMeta.badge}
                      </span>
                      <span className={`status-tag status-${card.status}`}>{card.status}</span>
                      {leadSource ? <span className="meta-text">{leadSource.domain}</span> : null}
                      <span className="meta-text">{formatRelativeTime(card.lastUpdated)}</span>
                    </div>
                    <h4>{card.title}</h4>
                    <p>{card.summary}</p>
                    <div className="signal-card-bottomline">
                      <div className="entity-row">
                        {card.entities.slice(0, 3).map((entity) => (
                          <span key={entity} className="entity-pill">
                            {entity}
                          </span>
                        ))}
                      </div>
                      <div className="source-domain-row">
                        {domains.map((domain) => (
                          <span key={domain} className="source-domain-pill">
                            {domain}
                          </span>
                        ))}
                      </div>
                    </div>
                    {matches.length ? (
                      <div className="monitor-match-row">
                        {matches.map(({ agent }) => (
                          <span key={agent.id} className="monitor-chip">
                            {agent.title}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>

                  <div className="signal-card-side">
                    <div className="signal-stat">
                      <strong>{card.sourceCount}</strong>
                      <span className="metric-label">Sources</span>
                    </div>
                    <div className="signal-stat">
                      <strong>{card.corroborationCount}</strong>
                      <span className="metric-label">Corroboration</span>
                    </div>
                    <div className="signal-card-actions">
                      {!workflow.caseId ? (
                        <button
                          className="mini-button"
                          onClick={() => onToggleWatchCard(card.id)}
                          type="button"
                        >
                          {workflow.state === "watching" ? "Unwatch" : "Watch"}
                        </button>
                      ) : null}
                      <button
                        className="mini-button accent"
                        onClick={() => onSaveCardToCase(card.id)}
                        type="button"
                      >
                        {workflow.caseId ? "Open Case" : "Create Case"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <article className="blank-module">
              <h4>No cards in this view</h4>
              <p>Switch focus views or drop the delta filter to broaden the stream.</p>
            </article>
          )}
        </section>
      </main>

      <aside className="insight-stage">
        {selectedCard && selectedWorkflow && selectedQueueMeta ? (
          <>
            <article className="insight-hero">
              <div className="insight-hero-top">
                <div>
                  <p className="eyebrow">Insight card</p>
                  <h3>{selectedCard.title}</h3>
                </div>
                <div className="insight-hero-actions">
                  {!selectedWorkflow.caseId ? (
                    <button
                      className="toolbar-button"
                      onClick={() => onToggleWatchCard(selectedCard.id)}
                      type="button"
                    >
                      {selectedWorkflow.state === "watching" ? "Unwatch" : "Watch"}
                    </button>
                  ) : null}
                  <button
                    className="toolbar-button accent"
                    onClick={() => onSaveCardToCase(selectedCard.id)}
                    type="button"
                  >
                    {selectedWorkflow.caseId ? "Open case" : "Create case"}
                  </button>
                </div>
              </div>

              <div className="signal-card-topline">
                <span className={`status-tag status-${selectedWorkflow.queueState}`}>
                  {selectedQueueMeta.badge}
                </span>
                <span className={`status-tag status-${selectedCard.status}`}>{selectedCard.status}</span>
                {selectedLeadSource ? (
                  <span className="canonical-pill">{selectedLeadSource.domain}</span>
                ) : null}
              </div>

              <p className="insight-summary">{selectedCard.summary}</p>

              <div className="insight-grid">
                <div>
                  <span className="metric-label">Updated</span>
                  <strong>{formatRelativeTime(selectedCard.lastUpdated)}</strong>
                </div>
                <div>
                  <span className="metric-label">Reviewed</span>
                  <strong>
                    {selectedWorkflow.lastReviewedAt
                      ? formatRelativeTime(selectedWorkflow.lastReviewedAt)
                      : "Not yet"}
                  </strong>
                </div>
                <div>
                  <span className="metric-label">Sources</span>
                  <strong>{selectedCard.sourceCount}</strong>
                </div>
                <div>
                  <span className="metric-label">Corroboration</span>
                  <strong>{selectedCard.corroborationCount}</strong>
                </div>
              </div>
            </article>

            <article className="insight-module">
              <h4>What changed</h4>
              <ul className="delta-list">
                {selectedCard.changeHighlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            {selectedLeadSource ? (
              <article className="insight-module">
                <h4>Lead source</h4>
                <div className="source-teaser">
                  <div className="signal-card-topline">
                    <span className="canonical-pill">{selectedLeadSource.sourceType}</span>
                    <span className="meta-text">{formatAbsoluteTime(selectedLeadSource.publishedAt)}</span>
                  </div>
                  <h5>{selectedLeadSource.title}</h5>
                  <p>{selectedLeadSource.excerpt}</p>
                  <p className="meta-text">
                    {selectedLeadSource.author} · {selectedLeadSource.domain}
                  </p>
                </div>
              </article>
            ) : null}

            {selectedCardMonitors.length ? (
              <article className="insight-module">
                <h4>Why this landed here</h4>
                <div className="module-stack">
                  {selectedCardMonitors.map(({ agent, match }) => (
                    <div key={agent.id} className="mini-record">
                      <div className="signal-card-topline">
                        <span className={`status-tag status-${agent.priority}`}>{agent.priority}</span>
                        <span className="meta-text">score {match.score}</span>
                      </div>
                      <strong>{agent.title}</strong>
                      <p>{match.reasons.join(" · ")}</p>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}

            <article className="insight-module">
              <h4>Source stack</h4>
              <div className="module-stack">
                {selectedCard.sources.map((source) => (
                  <div key={source.id} className="mini-record">
                    <div className="signal-card-topline">
                      <span className="meta-text">
                        {source.domain} · {source.sourceType}
                      </span>
                      {source.isCanonical ? <span className="canonical-pill">Canonical</span> : null}
                      {source.changed ? <span className="delta-pill">Changed</span> : null}
                    </div>
                    <strong>{source.title}</strong>
                    <p>{source.excerpt}</p>
                  </div>
                ))}
              </div>
            </article>
          </>
        ) : (
          <article className="blank-module">
            <h4>Select a card</h4>
            <p>Open a signal from the stream to inspect the evidence and decide whether it deserves follow-through.</p>
          </article>
        )}
      </aside>
    </section>
  );
}

function CasesStage({
  cases,
  selectedCaseId,
  onSelectCase,
  watchedThreads,
  onPromoteThreadToCase,
  onOpenThreadInMonitors,
  allThreads
}: Pick<
  WorkspaceExperienceProps,
  | "cases"
  | "selectedCaseId"
  | "onSelectCase"
  | "watchedThreads"
  | "onPromoteThreadToCase"
  | "onOpenThreadInMonitors"
  | "allThreads"
>) {
  const selectedCase = cases.find((item) => item.id === selectedCaseId) ?? cases[0] ?? null;
  const linkedThreads = selectedCase
    ? allThreads.filter((thread) => selectedCase.linkedThreadIds.includes(thread.id))
    : [];

  return (
    <section className="secondary-stage">
      <aside className="secondary-column">
        <article className="secondary-hero">
          <p className="eyebrow">Case board</p>
          <h3>Tracked follow-through</h3>
          <p>Only the few signals that need narrative continuity should land here.</p>
        </article>

        <article className="secondary-module">
          <div className="rail-module-header">
            <div>
              <p className="eyebrow">Watch queue</p>
              <h4>Worth revisiting</h4>
            </div>
            <span className="meta-text">{watchedThreads.length}</span>
          </div>
          <div className="module-stack">
            {watchedThreads.length ? (
              watchedThreads.map((thread) => (
                <div key={thread.id} className="mini-record">
                  <strong>{thread.title}</strong>
                  <p>{thread.summary}</p>
                  <div className="mini-actions">
                    <button
                      className="mini-button"
                      onClick={() => onOpenThreadInMonitors(thread.id)}
                      type="button"
                    >
                      Open
                    </button>
                    <button
                      className="mini-button accent"
                      onClick={() => onPromoteThreadToCase(thread.id)}
                      type="button"
                    >
                      Promote
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="mini-record">
                <p>No watched cards yet.</p>
              </div>
            )}
          </div>
        </article>

        <article className="secondary-module">
          <div className="rail-module-header">
            <div>
              <p className="eyebrow">Open cases</p>
              <h4>Investigation list</h4>
            </div>
            <span className="meta-text">{cases.length}</span>
          </div>
          <div className="module-stack">
            {cases.map((item) => (
              <button
                key={item.id}
                className={`case-strip${item.id === selectedCaseId ? " is-active" : ""}`}
                onClick={() => onSelectCase(item.id)}
                type="button"
              >
                <div className="signal-card-topline">
                  <span className={`status-tag status-${item.status}`}>{item.status}</span>
                  <span className="meta-text">{item.linkedThreadIds.length} cards</span>
                </div>
                <strong>{item.title}</strong>
                <p>{item.deltaSummary[0] ?? "No deltas recorded yet."}</p>
              </button>
            ))}
          </div>
        </article>
      </aside>

      <main className="notebook-stage">
        {selectedCase ? (
          <>
            <article className="notebook-hero">
              <div>
                <p className="eyebrow">Case file</p>
                <h2>{selectedCase.title}</h2>
                <p>{selectedCase.deltaSummary.join(" ")}</p>
              </div>
              <div className="signal-card-topline">
                <span className={`status-tag status-${selectedCase.status}`}>
                  {selectedCase.status}
                </span>
                <span className="canonical-pill">{linkedThreads.length} linked cards</span>
              </div>
            </article>

            <section className="notebook-grid">
              <article className="secondary-module">
                <h4>Delta since last view</h4>
                <ul className="delta-list">
                  {selectedCase.deltaSummary.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className="secondary-module">
                <h4>Case notes</h4>
                <div className="module-stack">
                  {selectedCase.notes.map((note) => (
                    <div key={note.id} className="mini-record">
                      <div className="signal-card-topline">
                        {note.pinned ? <span className="canonical-pill">Pinned</span> : null}
                        <span className="meta-text">{formatAbsoluteTime(note.createdAt)}</span>
                      </div>
                      <p>{note.text}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="secondary-module">
                <h4>Linked cards</h4>
                <div className="module-stack">
                  {linkedThreads.map((thread) => (
                    <div key={thread.id} className="mini-record">
                      <div className="signal-card-topline">
                        <span className={`status-tag status-${thread.status}`}>{thread.status}</span>
                        <span className="meta-text">{thread.sourceCount} sources</span>
                      </div>
                      <strong>{thread.title}</strong>
                      <p>{thread.summary}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="secondary-module">
                <h4>Timeline</h4>
                <div className="module-stack">
                  {selectedCase.timeline.map((entry) => (
                    <div key={entry.id} className="timeline-record">
                      <span className="timeline-mark" />
                      <div>
                        <span className="meta-text">{formatAbsoluteTime(entry.at)}</span>
                        <strong>{entry.label}</strong>
                        <p>{entry.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          </>
        ) : (
          <article className="blank-module">
            <h4>No cases yet</h4>
            <p>Promote a watched card or create a case directly from the monitor stream.</p>
          </article>
        )}
      </main>
    </section>
  );
}

function LibraryStage({
  query,
  results,
  selectedResultId,
  onSelectResult,
  onQueryChange,
  registry,
  selectedSourceId,
  onSelectSource
}: Pick<
  WorkspaceExperienceProps,
  | "query"
  | "results"
  | "selectedResultId"
  | "onSelectResult"
  | "onQueryChange"
  | "registry"
  | "selectedSourceId"
  | "onSelectSource"
>) {
  const [activePanel, setActivePanel] = useState<"search" | "sources">("search");
  const selectedResult = results.find((result) => result.id === selectedResultId) ?? results[0] ?? null;
  const selectedSource =
    registry.find((entry) => entry.id === selectedSourceId) ?? registry[0] ?? null;

  return (
    <section className="secondary-stage">
      <aside className="secondary-column">
        <article className="secondary-hero">
          <p className="eyebrow">Library</p>
          <h3>Recovered context</h3>
          <p>Jump back into prior cards, source dossiers, and terms you know matter.</p>
        </article>

        <article className="secondary-module">
          <div className="mode-switch">
            <button
              className={`switch-pill${activePanel === "search" ? " is-active" : ""}`}
              onClick={() => setActivePanel("search")}
              type="button"
            >
              Search
            </button>
            <button
              className={`switch-pill${activePanel === "sources" ? " is-active" : ""}`}
              onClick={() => setActivePanel("sources")}
              type="button"
            >
              Sources
            </button>
          </div>

          {activePanel === "search" ? (
            <>
              <label className="field-group">
                <span className="meta-text">Query</span>
                <input
                  className="search-input"
                  onChange={(event) => {
                    const value = event.target.value;
                    startTransition(() => onQueryChange(value));
                  }}
                  placeholder="Search cards, monitors, notes, or sources"
                  type="search"
                  value={query}
                />
              </label>
              {!query ? (
                <div className="chip-cloud">
                  {starterQueries.map((item) => (
                    <button
                      key={item}
                      className="switch-pill"
                      onClick={() => onQueryChange(item)}
                      type="button"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="module-stack">
                {results.map((result) => (
                  <button
                    key={result.id}
                    className={`search-strip${result.id === selectedResultId ? " is-active" : ""}`}
                    onClick={() => onSelectResult(result.id)}
                    type="button"
                  >
                    <div className="signal-card-topline">
                      <span className="meta-text">{result.kind}</span>
                      <span className="meta-text">{formatRelativeTime(result.updatedAt)}</span>
                    </div>
                    <strong>{result.title}</strong>
                    <p>{result.subtitle}</p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="module-stack">
              {registry.map((entry) => (
                <button
                  key={entry.id}
                  className={`search-strip${entry.id === selectedSourceId ? " is-active" : ""}`}
                  onClick={() => onSelectSource(entry.id)}
                  type="button"
                >
                  <div className="signal-card-topline">
                    <span className={`status-tag status-${entry.promotedState}`}>
                      {entry.promotedState}
                    </span>
                    {entry.emerging ? <span className="delta-pill">Radar</span> : null}
                  </div>
                  <strong>{entry.label}</strong>
                  <p>{entry.domain}</p>
                </button>
              ))}
            </div>
          )}
        </article>
      </aside>

      <main className="notebook-stage">
        {activePanel === "search" ? (
          selectedResult ? (
            <>
              <article className="notebook-hero">
                <div>
                  <p className="eyebrow">Search result</p>
                  <h2>{selectedResult.title}</h2>
                  <p>{selectedResult.subtitle}</p>
                </div>
                <span className="canonical-pill">{selectedResult.kind}</span>
              </article>

              <section className="notebook-grid">
                <article className="secondary-module">
                  <h4>Context</h4>
                  <p>{selectedResult.context}</p>
                </article>

                <article className="secondary-module">
                  <h4>Tags</h4>
                  <div className="entity-row">
                    {selectedResult.tags.map((tag) => (
                      <span key={tag} className="entity-pill">
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              </section>
            </>
          ) : (
            <article className="blank-module">
              <h4>No result selected</h4>
              <p>Search the library to recover a card, case, source, or monitor.</p>
            </article>
          )
        ) : selectedSource ? (
          <>
            <article className="notebook-hero">
              <div>
                <p className="eyebrow">Source dossier</p>
                <h2>{selectedSource.label}</h2>
                <p>{selectedSource.rationale}</p>
              </div>
              <span className={`status-tag status-${selectedSource.promotedState}`}>
                {selectedSource.promotedState}
              </span>
            </article>

            <section className="notebook-grid">
              <article className="secondary-module">
                <h4>Metrics</h4>
                <div className="insight-grid">
                  <div>
                    <span className="metric-label">Originality</span>
                    <strong>{Math.round(selectedSource.originalityRatio * 100)}%</strong>
                  </div>
                  <div>
                    <span className="metric-label">Corroboration</span>
                    <strong>{Math.round(selectedSource.corroborationRate * 100)}%</strong>
                  </div>
                  <div>
                    <span className="metric-label">Saved cards</span>
                    <strong>{selectedSource.savedThreadCount}</strong>
                  </div>
                  <div>
                    <span className="metric-label">Category</span>
                    <strong>{selectedSource.category}</strong>
                  </div>
                </div>
              </article>

              <article className="secondary-module">
                <h4>Examples</h4>
                <div className="module-stack">
                  {selectedSource.examples.map((example) => (
                    <div key={example} className="mini-record">
                      <p>{example}</p>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          </>
        ) : (
          <article className="blank-module">
            <h4>No source selected</h4>
            <p>Choose a source dossier to inspect why it keeps showing up in your work.</p>
          </article>
        )}
      </main>
    </section>
  );
}

export function WorkspaceExperience(props: WorkspaceExperienceProps) {
  return (
    <div className="studio-shell">
      <header className="command-deck">
        <div className="command-brand">
          <div className="command-mark">IntelDesk</div>
          <div>
            <p className="eyebrow">Open-source threat intelligence</p>
            <h1>Follow the signal before the crowd catches up.</h1>
          </div>
        </div>

        <div className="view-switch">
          {(Object.keys(viewLabels) as NavView[]).map((view) => (
            <button
              key={view}
              className={`view-chip${props.activeView === view ? " is-active" : ""}`}
              onClick={() => props.onSelectView(view)}
              type="button"
            >
              <span>{viewLabels[view].label}</span>
              <small>{viewLabels[view].blurb}</small>
            </button>
          ))}
        </div>

        <div className="command-actions">
          <span className="workspace-badge">Local workspace</span>
          <button
            className="toolbar-button accent"
            disabled={props.addUrlDisabled}
            onClick={props.onOpenAddUrl}
            type="button"
          >
            Add source
          </button>
          <button className="toolbar-button" onClick={props.onToggleTheme} type="button">
            {props.darkMode ? "Light" : "Dark"}
          </button>
        </div>
      </header>

      {props.activeView === "monitors" ? (
        <MonitorStage
          cards={props.cards}
          deltaToggleDisabled={props.deltaToggleDisabled}
          focusViews={props.focusViews}
          inCaseCount={props.inCaseCount}
          monitors={props.monitors}
          onSaveCardToCase={props.onSaveCardToCase}
          onSelectCard={props.onSelectCard}
          onSelectMonitor={props.onSelectMonitor}
          onToggleOnlyDelta={props.onToggleOnlyDelta}
          onToggleWatchCard={props.onToggleWatchCard}
          onlyDelta={props.onlyDelta}
          reviewCount={props.reviewCount}
          selectedCardId={props.selectedCardId}
          selectedMonitorId={props.selectedMonitorId}
          threadWorkflowMap={props.threadWorkflowMap}
          watchCount={props.watchCount}
        />
      ) : null}

      {props.activeView === "cases" ? (
        <CasesStage
          allThreads={props.allThreads}
          cases={props.cases}
          onOpenThreadInMonitors={props.onOpenThreadInMonitors}
          onPromoteThreadToCase={props.onPromoteThreadToCase}
          onSelectCase={props.onSelectCase}
          selectedCaseId={props.selectedCaseId}
          watchedThreads={props.watchedThreads}
        />
      ) : null}

      {props.activeView === "library" ? (
        <LibraryStage
          onQueryChange={props.onQueryChange}
          onSelectResult={props.onSelectResult}
          onSelectSource={props.onSelectSource}
          query={props.query}
          registry={props.registry}
          results={props.results}
          selectedResultId={props.selectedResultId}
          selectedSourceId={props.selectedSourceId}
        />
      ) : null}
    </div>
  );
}
