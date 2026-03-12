import { getThreadQueueMeta } from "../lib/threadWorkflow";
import type { AgentView, Thread, ThreadWorkflowView } from "../types";

interface AgentsViewProps {
  agents: AgentView[];
  threads: Thread[];
  threadWorkflowMap: Record<string, ThreadWorkflowView>;
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
  onOpenAgentInLandscape: (agentId: string) => void;
  onOpenThreadInLandscape: (threadId: string, agentId: string) => void;
  onToggleWatchThread: (threadId: string) => void;
  onSaveThreadToCase: (threadId: string) => void;
}

function formatTime(value?: string) {
  if (!value) {
    return "No recent activity";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function AgentsView({
  agents,
  threads,
  threadWorkflowMap,
  selectedAgentId,
  onSelectAgent,
  onOpenAgentInLandscape,
  onOpenThreadInLandscape,
  onToggleWatchThread,
  onSaveThreadToCase
}: AgentsViewProps) {
  const selectedAgent = agents.find((item) => item.id === selectedAgentId) ?? agents[0] ?? null;
  const matchedCards = selectedAgent
    ? selectedAgent.matches
        .map((match) => ({
          match,
          thread: threads.find((thread) => thread.id === match.threadId)
        }))
        .filter((item): item is { match: AgentView["matches"][number]; thread: Thread } =>
          Boolean(item.thread)
        )
    : [];

  return (
    <div className="workspace-grid">
      <section className="panel list-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Saved monitors</p>
            <h3>Agents</h3>
          </div>
          <span className="meta-text">{agents.length} active</span>
        </div>

        <div className="source-dossier-list">
          {agents.map((agent) => (
            <button
              key={agent.id}
              className={`dossier-card${agent.id === selectedAgentId ? " is-selected" : ""}`}
              onClick={() => onSelectAgent(agent.id)}
              type="button"
            >
              <div className="thread-card-topline">
                <span className={`status-tag status-${agent.priority}`}>{agent.priority}</span>
                <span className="meta-text">{agent.threadCount} cards</span>
                <span className="meta-text">{agent.newDeltaCount} new Δ</span>
              </div>
              <h4>{agent.title}</h4>
              <p>{agent.summary}</p>
              <div className="entity-row">
                {agent.entityHints.slice(0, 3).map((item) => (
                  <span key={item} className="entity-pill">
                    {item}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>

      <aside className="panel detail-panel">
        {selectedAgent ? (
          <>
            <div className="panel-header">
              <div>
                <p className="eyebrow">Agent detail</p>
                <h3>{selectedAgent.title}</h3>
              </div>
              <div className="detail-actions">
                <button
                  className="ghost-button"
                  onClick={() => onOpenAgentInLandscape(selectedAgent.id)}
                  type="button"
                >
                  Open in Landscape
                </button>
              </div>
            </div>

            <div className="detail-block">
              <div className="thread-card-topline">
                <span className={`status-tag status-${selectedAgent.priority}`}>
                  {selectedAgent.priority}
                </span>
                <span className="meta-text">Updated {formatTime(selectedAgent.latestActivityAt)}</span>
              </div>
              <p>{selectedAgent.summary}</p>
              <p className="meta-text">{selectedAgent.objective}</p>
            </div>

            <div className="detail-block">
              <h4>Coverage</h4>
              <div className="metric-grid">
                <div>
                  <span className="metric-label">Matched cards</span>
                  <strong>{selectedAgent.threadCount}</strong>
                </div>
                <div>
                  <span className="metric-label">New delta</span>
                  <strong>{selectedAgent.newDeltaCount}</strong>
                </div>
                <div>
                  <span className="metric-label">Watching</span>
                  <strong>{selectedAgent.watchCount}</strong>
                </div>
                <div>
                  <span className="metric-label">In case</span>
                  <strong>{selectedAgent.inCaseCount}</strong>
                </div>
              </div>
            </div>

            <div className="detail-block">
              <h4>Match logic</h4>
              <p className="meta-text">{selectedAgent.lens}</p>
              <div className="entity-row">
                {selectedAgent.entityHints.map((item) => (
                  <span key={item} className="entity-pill">
                    {item}
                  </span>
                ))}
              </div>
              <div className="entity-row">
                {selectedAgent.keywords.map((item) => (
                  <span key={item} className="entity-pill">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="detail-block">
              <h4>Matched cards</h4>
              {matchedCards.length ? (
                <div className="compact-list">
                  {matchedCards.map(({ match, thread }) => {
                    const workflow = threadWorkflowMap[thread.id];
                    const queueMeta = getThreadQueueMeta(workflow?.queueState ?? "new");
                    const isInCase = Boolean(workflow?.caseId);
                    const isWatching = workflow?.state === "watching";

                    return (
                      <article key={thread.id} className="compact-card">
                        <div className="thread-card-topline">
                          <span className={`status-tag status-${thread.status}`}>{thread.status}</span>
                          <span className={`status-tag status-${workflow?.queueState ?? "new"}`}>
                            {queueMeta.badge}
                          </span>
                          <span className="meta-text">{thread.sourceCount} sources</span>
                        </div>
                        <h5>{thread.title}</h5>
                        <p>{thread.summary}</p>
                        <ul className="delta-list">
                          {match.reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                        <div className="mini-actions">
                          <button
                            className="ghost-button mini-ghost"
                            onClick={() => onOpenThreadInLandscape(thread.id, selectedAgent.id)}
                            type="button"
                          >
                            Open in Landscape
                          </button>
                          {!isInCase ? (
                            <button
                              className="ghost-button mini-ghost"
                              onClick={() => onToggleWatchThread(thread.id)}
                              type="button"
                            >
                              {isWatching ? "Unwatch" : "Watch"}
                            </button>
                          ) : null}
                          <button
                            className="ghost-button mini-ghost"
                            onClick={() => onSaveThreadToCase(thread.id)}
                            type="button"
                          >
                            {isInCase ? "Open Case" : "Create Case"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <article className="empty-state">
                  <h4>No matched cards</h4>
                  <p>Adjust the saved monitor logic once real ingestion broadens the coverage.</p>
                </article>
              )}
            </div>
          </>
        ) : (
          <article className="empty-state">
            <h4>No agents yet</h4>
            <p>Saved monitors will appear here once the product starts carrying more than the seed set.</p>
          </article>
        )}
      </aside>
    </div>
  );
}
