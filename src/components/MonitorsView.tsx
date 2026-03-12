import { getAgentMatchesForThread } from "../lib/agents";
import { getThreadQueueMeta } from "../lib/threadWorkflow";
import type { AgentView, Thread, ThreadWorkflowView } from "../types";

interface FocusView {
  id: string;
  label: string;
  description: string;
  count: number;
}

interface MonitorsViewProps {
  activeFeed: {
    eyebrow: string;
    title: string;
    description: string;
  };
  allCardCount: number;
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
}

function formatTime(value: string) {
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

function getDistinctDomains(thread: Thread) {
  return [...new Set(thread.sources.map((source) => source.domain))].slice(0, 3);
}

function getInitials(label: string) {
  return label
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function MonitorsView({
  activeFeed,
  allCardCount,
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
}: MonitorsViewProps) {
  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? cards[0] ?? null;
  const selectedWorkflow = selectedCard ? threadWorkflowMap[selectedCard.id] : undefined;
  const selectedQueueMeta = selectedWorkflow
    ? getThreadQueueMeta(selectedWorkflow.queueState)
    : null;
  const selectedCardMonitors = selectedCard
    ? getAgentMatchesForThread(monitors, selectedCard.id)
    : [];
  const selectedLeadSource = selectedCard ? getLeadSource(selectedCard) : null;
  const visibleCount = cards.length;

  return (
    <div className="monitor-shell">
      <aside className="panel monitor-rail">
        <section className="workspace-summary">
          <p className="eyebrow">Analyst briefing</p>
          <h3>Start with the feed, not the folder tree.</h3>
          <p className="brand-copy">
            Keep the center column for rapid scanning, the right pane for evidence, and promote only
            the cards that deserve durable follow-through.
          </p>
          <div className="briefing-grid">
            <article className="briefing-card">
              <span className="metric-label">All cards</span>
              <strong>{allCardCount}</strong>
            </article>
            <article className="briefing-card">
              <span className="metric-label">Needs review</span>
              <strong>{reviewCount}</strong>
            </article>
            <article className="briefing-card">
              <span className="metric-label">Watching</span>
              <strong>{watchCount}</strong>
            </article>
            <article className="briefing-card">
              <span className="metric-label">In cases</span>
              <strong>{inCaseCount}</strong>
            </article>
          </div>
        </section>

        <section className="rail-section">
          <div className="rail-section-header">
            <div>
              <p className="eyebrow">Focus views</p>
              <h4>Queues</h4>
            </div>
          </div>
          <div className="quick-view-list">
            {focusViews.map((view) => (
              <button
                key={view.id || "all-cards"}
                className={`quick-view-button${view.id === selectedMonitorId ? " is-active" : ""}`}
                onClick={() => onSelectMonitor(view.id)}
                type="button"
              >
                <div>
                  <strong>{view.label}</strong>
                  <small>{view.description}</small>
                </div>
                <span className="monitor-count">{view.count}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rail-section">
          <div className="rail-section-header">
            <div>
              <p className="eyebrow">Saved monitors</p>
              <h4>Tracked lenses</h4>
            </div>
            <span className="meta-text">{monitors.length}</span>
          </div>
          <div className="monitor-list">
            {monitors.map((monitor) => (
              <button
                key={monitor.id}
                className={`monitor-button${monitor.id === selectedMonitorId ? " is-active" : ""}`}
                onClick={() => onSelectMonitor(monitor.id)}
                type="button"
              >
                <span className="monitor-button-avatar">{getInitials(monitor.title)}</span>
                <div className="monitor-button-copy">
                  <strong>{monitor.title}</strong>
                  <small>{monitor.lens}</small>
                </div>
                <div className="monitor-metrics">
                  <span className={`status-tag status-${monitor.priority}`}>{monitor.priority}</span>
                  <span className="monitor-count">{monitor.threadCount}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <section className="panel feed-panel">
        <div className="feed-header">
          <div>
            <p className="eyebrow">{activeFeed.eyebrow}</p>
            <h3>{activeFeed.title}</h3>
            <p className="topbar-copy">{activeFeed.description}</p>
          </div>

          <div className="feed-actions">
            <span className="status-pill">
              <span className="status-dot" />
              <span>{visibleCount} visible</span>
            </span>
            <button
              className="ghost-button"
              disabled={deltaToggleDisabled}
              onClick={onToggleOnlyDelta}
              type="button"
            >
              {onlyDelta ? "Showing only Δ" : "Show only Δ"}
            </button>
          </div>
        </div>

        <div className="monitor-hero">
          <div>
            <span className="metric-label">Fresh changes</span>
            <strong>
              {
                cards.filter(
                  (card) => threadWorkflowMap[card.id]?.queueState === "new-delta"
                ).length
              }
            </strong>
          </div>
          <div>
            <span className="metric-label">Needs action</span>
            <strong>
              {
                cards.filter((card) =>
                  ["new", "new-delta"].includes(threadWorkflowMap[card.id]?.queueState ?? "")
                ).length
              }
            </strong>
          </div>
          <div>
            <span className="metric-label">Saved to case</span>
            <strong>
              {cards.filter((card) => threadWorkflowMap[card.id]?.queueState === "in-case").length}
            </strong>
          </div>
        </div>

        <div className="feed-list">
          {cards.length ? (
            cards.map((card) => {
              const workflow = threadWorkflowMap[card.id];
              const queueMeta = getThreadQueueMeta(workflow.queueState);
              const leadSource = getLeadSource(card);
              const matchedMonitors = getAgentMatchesForThread(monitors, card.id).slice(0, 2);
              const domains = getDistinctDomains(card);

              return (
                <button
                  key={card.id}
                  className={`feed-card${card.id === selectedCardId ? " is-selected" : ""}`}
                  onClick={() => onSelectCard(card.id)}
                  type="button"
                >
                  <div className="feed-card-main">
                    <div className="thread-card-topline">
                      <span className={`status-tag status-${workflow.queueState}`}>
                        {queueMeta.badge}
                      </span>
                      <span className={`status-tag status-${card.status}`}>{card.status}</span>
                      {leadSource ? <span className="meta-text">{leadSource.domain}</span> : null}
                      <span className="meta-text">{formatRelativeTime(card.lastUpdated)}</span>
                    </div>
                    <h4>{card.title}</h4>
                    <p>{card.summary}</p>
                    <ul className="delta-list">
                      {card.changeHighlights.slice(0, 2).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <div className="feed-card-footer">
                      <div className="entity-row">
                        {card.entities.slice(0, 3).map((entity) => (
                          <span key={entity} className="entity-pill">
                            {entity}
                          </span>
                        ))}
                      </div>
                      <div className="source-cluster">
                        {domains.map((domain) => (
                          <span key={domain} className="source-domain-pill">
                            {domain}
                          </span>
                        ))}
                      </div>
                    </div>
                    {matchedMonitors.length ? (
                      <div className="monitor-chip-row">
                        {matchedMonitors.map(({ agent }) => (
                          <span key={agent.id} className="monitor-chip">
                            {agent.title}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="feed-card-aside">
                    <strong>{card.sourceCount}</strong>
                    <span className="meta-text">sources</span>
                    <strong>{card.corroborationCount}</strong>
                    <span className="meta-text">corroborating</span>
                  </div>
                </button>
              );
            })
          ) : (
            <article className="empty-state">
              <h4>No cards in this view</h4>
              <p>Try another focus view, pick a saved monitor, or relax the delta filter.</p>
            </article>
          )}
        </div>
      </section>

      <aside className="panel preview-panel">
        {selectedCard && selectedWorkflow && selectedQueueMeta ? (
          <>
            <div className="preview-hero">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Card preview</p>
                  <h3>{selectedCard.title}</h3>
                </div>
                <div className="detail-actions">
                  <button
                    className="ghost-button"
                    onClick={() => onSaveCardToCase(selectedCard.id)}
                    type="button"
                  >
                    {selectedWorkflow.caseId ? "Open Case" : "Create Case"}
                  </button>
                  {!selectedWorkflow.caseId ? (
                    <button
                      className="ghost-button"
                      onClick={() => onToggleWatchCard(selectedCard.id)}
                      type="button"
                    >
                      {selectedWorkflow.state === "watching" ? "Unwatch" : "Watch"}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="thread-card-topline">
                <span className={`status-tag status-${selectedWorkflow.queueState}`}>
                  {selectedQueueMeta.badge}
                </span>
                <span className={`status-tag status-${selectedCard.status}`}>{selectedCard.status}</span>
                {selectedLeadSource ? (
                  <span className="canonical-pill">{selectedLeadSource.domain}</span>
                ) : null}
              </div>
              <p className="preview-copy">{selectedCard.summary}</p>
              <div className="preview-stat-grid">
                <article className="preview-stat">
                  <span className="metric-label">Updated</span>
                  <strong>{formatTime(selectedCard.lastUpdated)}</strong>
                </article>
                <article className="preview-stat">
                  <span className="metric-label">Sources</span>
                  <strong>{selectedCard.sourceCount}</strong>
                </article>
                <article className="preview-stat">
                  <span className="metric-label">Corroboration</span>
                  <strong>{selectedCard.corroborationCount}</strong>
                </article>
                <article className="preview-stat">
                  <span className="metric-label">Reviewed</span>
                  <strong>
                    {selectedWorkflow.lastReviewedAt
                      ? formatRelativeTime(selectedWorkflow.lastReviewedAt)
                      : "Not yet"}
                  </strong>
                </article>
              </div>
            </div>

            {selectedLeadSource ? (
              <div className="detail-block">
                <h4>Lead source</h4>
                <article className="source-row">
                  <div className="source-row-topline">
                    <span className="meta-text">
                      {selectedLeadSource.domain} · {selectedLeadSource.sourceType}
                    </span>
                    {selectedLeadSource.isCanonical ? (
                      <span className="canonical-pill">Canonical</span>
                    ) : null}
                    {selectedLeadSource.changed ? <span className="delta-pill">Changed</span> : null}
                  </div>
                  <h5>{selectedLeadSource.title}</h5>
                  <p>{selectedLeadSource.excerpt}</p>
                  <p className="meta-text">
                    {selectedLeadSource.author} · Published{" "}
                    {formatTime(selectedLeadSource.publishedAt)}
                  </p>
                </article>
              </div>
            ) : null}

            {selectedCardMonitors.length ? (
              <div className="detail-block">
                <h4>Monitor coverage</h4>
                <div className="compact-list">
                  {selectedCardMonitors.map(({ agent, match }) => (
                    <article key={agent.id} className="compact-card">
                      <div className="thread-card-topline">
                        <span className={`status-tag status-${agent.priority}`}>{agent.priority}</span>
                        <span className="meta-text">score {match.score}</span>
                      </div>
                      <h5>{agent.title}</h5>
                      <p>{match.reasons.join(" · ")}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="detail-block">
              <h4>What changed</h4>
              <ul className="delta-list">
                {selectedCard.changeHighlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            {selectedCard.analystNotes.length ? (
              <div className="detail-block">
                <h4>Analyst notes</h4>
                <div className="compact-list">
                  {selectedCard.analystNotes.map((note) => (
                    <article key={note} className="compact-card">
                      <p>{note}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="detail-block">
              <h4>Source stack</h4>
              <div className="source-stack">
                {selectedCard.sources.map((source) => (
                  <article key={source.id} className="source-row">
                    <div className="source-row-topline">
                      <span className="meta-text">
                        {source.domain} · {source.sourceType}
                      </span>
                      {source.isCanonical ? <span className="canonical-pill">Canonical</span> : null}
                      {source.changed ? <span className="delta-pill">Changed</span> : null}
                    </div>
                    <h5>{source.title}</h5>
                    <p>{source.excerpt}</p>
                    <p className="meta-text">
                      {source.author} · Published {formatTime(source.publishedAt)}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </>
        ) : (
          <article className="empty-state">
            <h4>No card selected</h4>
            <p>
              Select a card from the feed to inspect the source stack and decide what to do with it.
            </p>
          </article>
        )}
      </aside>
    </div>
  );
}
