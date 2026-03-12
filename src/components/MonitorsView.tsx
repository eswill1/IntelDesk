import { getAgentMatchesForThread } from "../lib/agents";
import { getThreadQueueMeta } from "../lib/threadWorkflow";
import type { AgentView, Thread, ThreadWorkflowView } from "../types";

interface MonitorsViewProps {
  monitors: AgentView[];
  selectedMonitorId: string;
  onSelectMonitor: (monitorId: string) => void;
  cards: Thread[];
  selectedCardId: string;
  onSelectCard: (cardId: string) => void;
  onlyDelta: boolean;
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

export function MonitorsView({
  monitors,
  selectedMonitorId,
  onSelectMonitor,
  cards,
  selectedCardId,
  onSelectCard,
  onlyDelta,
  onToggleOnlyDelta,
  threadWorkflowMap,
  onToggleWatchCard,
  onSaveCardToCase
}: MonitorsViewProps) {
  const selectedMonitor =
    monitors.find((monitor) => monitor.id === selectedMonitorId) ?? null;
  const selectedCard =
    cards.find((card) => card.id === selectedCardId) ?? cards[0] ?? null;
  const selectedWorkflow = selectedCard ? threadWorkflowMap[selectedCard.id] : undefined;
  const selectedQueueMeta = selectedWorkflow
    ? getThreadQueueMeta(selectedWorkflow.queueState)
    : null;
  const selectedCardMonitors = selectedCard
    ? getAgentMatchesForThread(monitors, selectedCard.id)
    : [];

  return (
    <div className="monitor-shell">
      <aside className="panel monitor-rail">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Saved monitors</p>
            <h3>Monitors</h3>
          </div>
        </div>

        <button
          className={`monitor-button${selectedMonitor ? "" : " is-active"}`}
          onClick={() => onSelectMonitor("")}
          type="button"
        >
          <div>
            <strong>All monitors</strong>
            <small>Everything worth scanning right now.</small>
          </div>
          <span className="monitor-count">{cards.length}</span>
        </button>

        <div className="monitor-list">
          {monitors.map((monitor) => (
            <button
              key={monitor.id}
              className={`monitor-button${monitor.id === selectedMonitorId ? " is-active" : ""}`}
              onClick={() => onSelectMonitor(monitor.id)}
              type="button"
            >
              <div>
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
      </aside>

      <section className="panel feed-panel">
        <div className="feed-header">
          <div>
            <p className="eyebrow">Monitor feed</p>
            <h3>{selectedMonitor ? selectedMonitor.title : "All monitors"}</h3>
            <p className="topbar-copy">
              {selectedMonitor
                ? selectedMonitor.summary
                : "A prioritized stream of source-backed intel cards. Scan, review, watch, or promote into a case."}
            </p>
          </div>

          <div className="feed-actions">
            <button className="ghost-button" onClick={onToggleOnlyDelta} type="button">
              {onlyDelta ? "Show all cards" : "Only Δ"}
            </button>
          </div>
        </div>

        <div className="monitor-hero">
          <div>
            <span className="metric-label">Cards in view</span>
            <strong>{cards.length}</strong>
          </div>
          <div>
            <span className="metric-label">New delta</span>
            <strong>{cards.filter((card) => threadWorkflowMap[card.id]?.queueState === "new-delta").length}</strong>
          </div>
          <div>
            <span className="metric-label">Watching</span>
            <strong>{cards.filter((card) => threadWorkflowMap[card.id]?.queueState === "watching").length}</strong>
          </div>
        </div>

        <div className="feed-list">
          {cards.length ? (
            cards.map((card) => {
              const workflow = threadWorkflowMap[card.id];
              const queueMeta = getThreadQueueMeta(workflow.queueState);

              return (
                <button
                  key={card.id}
                  className={`feed-card${card.id === selectedCardId ? " is-selected" : ""}`}
                  onClick={() => onSelectCard(card.id)}
                  type="button"
                >
                  <div className="thread-card-topline">
                    <span className={`status-tag status-${card.status}`}>{card.status}</span>
                    <span className={`status-tag status-${workflow.queueState}`}>
                      {queueMeta.badge}
                    </span>
                    {workflow.hasMeaningfulDelta && workflow.queueState !== "new-delta" ? (
                      <span className="delta-pill">Changed</span>
                    ) : null}
                    <span className="meta-text">{card.sourceCount} sources</span>
                  </div>
                  <h4>{card.title}</h4>
                  <p>{card.summary}</p>
                  <ul className="delta-list">
                    {card.changeHighlights.slice(0, 2).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <div className="entity-row">
                    {card.entities.map((entity) => (
                      <span key={entity} className="entity-pill">
                        {entity}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })
          ) : (
            <article className="empty-state">
              <h4>No cards in this view</h4>
              <p>Try another monitor or turn off the delta filter.</p>
            </article>
          )}
        </div>
      </section>

      <aside className="panel preview-panel">
        {selectedCard && selectedWorkflow && selectedQueueMeta ? (
          <>
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

            <div className="detail-block">
              <div className="thread-card-topline">
                <span className={`status-tag status-${selectedCard.status}`}>{selectedCard.status}</span>
                <span className={`status-tag status-${selectedWorkflow.queueState}`}>
                  {selectedQueueMeta.badge}
                </span>
              </div>
              <p>{selectedCard.summary}</p>
              <p className="meta-text">
                Updated {formatTime(selectedCard.lastUpdated)}.
                {selectedWorkflow.lastReviewedAt
                  ? ` Reviewed ${formatTime(selectedWorkflow.lastReviewedAt)}.`
                  : " Not reviewed yet."}
              </p>
            </div>

            {selectedCardMonitors.length ? (
              <div className="detail-block">
                <h4>Monitors covering this card</h4>
                <div className="entity-row">
                  {selectedCardMonitors.map(({ agent }) => (
                    <span key={agent.id} className="entity-pill">
                      {agent.title}
                    </span>
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
            <p>Select a card from the feed to preview it here.</p>
          </article>
        )}
      </aside>
    </div>
  );
}
