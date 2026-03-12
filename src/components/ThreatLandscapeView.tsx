import { getAgentMatchesForThread } from "../lib/agents";
import { getThreadQueueMeta } from "../lib/threadWorkflow";
import type {
  AgentView,
  Thread,
  ThreadQueueSection,
  ThreadWorkflowView
} from "../types";

interface ThreatLandscapeViewProps {
  threads: Thread[];
  queueSections: ThreadQueueSection[];
  selectedThreadId: string;
  onSelectThread: (threadId: string) => void;
  onlyDelta: boolean;
  onToggleOnlyDelta: () => void;
  threadWorkflowMap: Record<string, ThreadWorkflowView>;
  onToggleWatchThread: (threadId: string) => void;
  onSaveThreadToCase: (threadId: string) => void;
  agents: AgentView[];
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
  onClearAgent: () => void;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getAnalystStateCopy(workflow: ThreadWorkflowView) {
  switch (workflow.queueState) {
    case "new":
      return "This card is still in raw triage. Review it, park it in Watch, or promote it straight into a case if the storyline is already strong enough.";
    case "new-delta":
      return "This card was already reviewed, but meaningful change landed afterward. Treat it like a reactivated signal instead of background noise.";
    case "watching":
      return "This card is parked for revisit without the overhead of a full case. Promote it once it deserves notes, timeline management, or a clearer narrative.";
    case "reviewed":
      return "This card has already been reviewed and deliberately set aside. It should stay out of the way until a real delta arrives.";
    case "in-case":
      return "This card already has a durable case workspace. Reopen the case to add notes, review the timeline, or check deltas.";
    case "muted":
      return "This card is muted from the working landscape. Reopen it intentionally if the signal changes.";
  }
}

export function ThreatLandscapeView({
  threads,
  queueSections,
  selectedThreadId,
  onSelectThread,
  onlyDelta,
  onToggleOnlyDelta,
  threadWorkflowMap,
  onToggleWatchThread,
  onSaveThreadToCase,
  agents,
  selectedAgentId,
  onSelectAgent,
  onClearAgent
}: ThreatLandscapeViewProps) {
  const selectedAgent = agents.find((item) => item.id === selectedAgentId) ?? null;
  const selectedThread =
    threads.find((thread) => thread.id === selectedThreadId) ?? queueSections[0]?.threads[0] ?? null;
  const selectedThreadWorkflow = selectedThread
    ? threadWorkflowMap[selectedThread.id]
    : undefined;
  const selectedThreadQueueMeta = selectedThreadWorkflow
    ? getThreadQueueMeta(selectedThreadWorkflow.queueState)
    : null;
  const selectedThreadCaseId = selectedThreadWorkflow?.caseId;
  const selectedThreadIsWatched = selectedThreadWorkflow?.state === "watching";
  const selectedThreadAgents = selectedThread
    ? getAgentMatchesForThread(agents, selectedThread.id)
    : [];

  return (
    <div className="workspace-grid">
      <section className="panel list-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Monitoring</p>
            <h3>{selectedAgent ? selectedAgent.title : "Threat Landscape"}</h3>
          </div>
          <button className="ghost-button" onClick={onToggleOnlyDelta} type="button">
            {onlyDelta ? "Show all" : "Only Δ"}
          </button>
        </div>

        <div className="detail-block">
          <div className="thread-card-topline">
            <span className="canonical-pill">{selectedAgent ? "Agent lens" : "All coverage"}</span>
            <span className="meta-text">{threads.length} cards in view</span>
            <span className="meta-text">{agents.length} saved agents</span>
          </div>
          <h4>{selectedAgent ? selectedAgent.title : "Prioritized intelligence cards"}</h4>
          <p>
            {selectedAgent
              ? selectedAgent.summary
              : "Review prioritized cards, filter to meaningful delta, and promote the right signals into Watch or Cases."}
          </p>
          <div className="entity-row">
            <button
              className={`entity-pill button-pill${selectedAgent ? "" : " is-active"}`}
              onClick={onClearAgent}
              type="button"
            >
              All cards
            </button>
            {agents.map((agent) => (
              <button
                key={agent.id}
                className={`entity-pill button-pill${agent.id === selectedAgentId ? " is-active" : ""}`}
                onClick={() => onSelectAgent(agent.id)}
                type="button"
              >
                {agent.title}
              </button>
            ))}
          </div>
        </div>

        <div className="thread-list">
          {queueSections.length ? (
            queueSections.map((section) => (
              <section key={section.id} className="queue-section">
                <div className="queue-section-header">
                  <div>
                    <p className="eyebrow">{section.title}</p>
                    <p className="queue-section-copy">{section.description}</p>
                  </div>
                  <span className="meta-text">{section.threads.length} cards</span>
                </div>

                <div className="compact-list">
                  {section.threads.map((thread) => {
                    const workflow = threadWorkflowMap[thread.id];
                    const queueMeta = getThreadQueueMeta(workflow.queueState);

                    return (
                      <button
                        key={thread.id}
                        className={`thread-card${thread.id === selectedThreadId ? " is-selected" : ""}`}
                        onClick={() => onSelectThread(thread.id)}
                        type="button"
                      >
                        <div className="thread-card-topline">
                          <span className={`status-tag status-${thread.status}`}>{thread.status}</span>
                          <span className={`status-tag status-${workflow.queueState}`}>
                            {queueMeta.badge}
                          </span>
                          {workflow.hasMeaningfulDelta && workflow.queueState !== "new-delta" ? (
                            <span className="delta-pill">Changed</span>
                          ) : null}
                          <span className="meta-text">{thread.sourceCount} sources</span>
                          <span className="meta-text">
                            {thread.corroborationCount} corroborating
                          </span>
                        </div>
                        <h4>{thread.title}</h4>
                        <p>{thread.summary}</p>
                        <ul className="delta-list">
                          {thread.changeHighlights.map((highlight) => (
                            <li key={highlight}>{highlight}</li>
                          ))}
                        </ul>
                        <div className="entity-row">
                          {thread.entities.map((entity) => (
                            <span key={entity} className="entity-pill">
                              {entity}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          ) : (
            <article className="empty-state">
              <h4>
                {selectedAgent
                  ? "No cards match this agent"
                  : onlyDelta
                    ? "Nothing needs review"
                    : "No cards in view"}
              </h4>
              <p>
                {selectedAgent
                  ? "Clear the agent lens or add more live material to broaden this monitor."
                  : onlyDelta
                    ? "The active review queue is clear. Toggle Show all to revisit watched, reviewed, or case-linked cards."
                    : "Change filters or ingest more material to repopulate the landscape."}
              </p>
            </article>
          )}
        </div>
      </section>

      <aside className="panel detail-panel">
        {selectedThread && selectedThreadWorkflow && selectedThreadQueueMeta ? (
          <>
            <div className="panel-header">
              <div>
                <p className="eyebrow">Intel card detail</p>
                <h3>{selectedThread.title}</h3>
              </div>
              <div className="detail-actions">
                <button
                  className="ghost-button"
                  onClick={() => onSaveThreadToCase(selectedThread.id)}
                  type="button"
                >
                  {selectedThreadCaseId ? "Open Case" : "Create Case"}
                </button>
                {!selectedThreadCaseId ? (
                  <button
                    className="ghost-button"
                    onClick={() => onToggleWatchThread(selectedThread.id)}
                    type="button"
                  >
                    {selectedThreadIsWatched ? "Unwatch" : "Watch"}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="detail-block">
              <div className="thread-card-topline">
                <span className={`status-tag status-${selectedThread.status}`}>
                  {selectedThread.status}
                </span>
                <span className={`status-tag status-${selectedThreadWorkflow.queueState}`}>
                  {selectedThreadQueueMeta.badge}
                </span>
                {selectedThreadWorkflow.hasMeaningfulDelta &&
                selectedThreadWorkflow.queueState !== "new-delta" ? (
                  <span className="delta-pill">Changed</span>
                ) : null}
              </div>
              <p>{selectedThread.summary}</p>
              <p className="meta-text">
                Updated {formatTime(selectedThread.lastUpdated)}.
                {selectedThreadWorkflow.lastReviewedAt
                  ? ` Reviewed ${formatTime(selectedThreadWorkflow.lastReviewedAt)}.`
                  : " Not reviewed yet."}
                {selectedThreadWorkflow.lastOpenedAt
                  ? ` Opened ${formatTime(selectedThreadWorkflow.lastOpenedAt)}.`
                  : null}
              </p>
            </div>

            {selectedThreadAgents.length ? (
              <div className="detail-block">
                <h4>Matched agents</h4>
                <div className="compact-list">
                  {selectedThreadAgents.map(({ agent, match }) => (
                    <article key={agent.id} className="compact-card">
                      <div className="thread-card-topline">
                        <span className={`status-tag status-${agent.priority}`}>{agent.priority}</span>
                        <span className="meta-text">{agent.lens}</span>
                      </div>
                      <h5>{agent.title}</h5>
                      <ul className="delta-list">
                        {match.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="detail-block">
              <h4>Analyst state</h4>
              <div className="thread-card-topline">
                <span className={`status-tag status-${selectedThreadWorkflow.queueState}`}>
                  {selectedThreadQueueMeta.badge}
                </span>
              </div>
              <p>{getAnalystStateCopy(selectedThreadWorkflow)}</p>
            </div>

            <div className="detail-block">
              <h4>What changed</h4>
              <ul className="delta-list">
                {selectedThread.changeHighlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="detail-block">
              <h4>Source stack</h4>
              <div className="source-stack">
                {selectedThread.sources.map((source) => (
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

            <div className="detail-block">
              <h4>Analyst notes</h4>
              <ul className="note-list">
                {selectedThread.analystNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <article className="empty-state">
            <h4>No card selected</h4>
            <p>Choose a card from the Threat Landscape or clear the current agent filter.</p>
          </article>
        )}
      </aside>
    </div>
  );
}
