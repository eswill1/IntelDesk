import { getThreadQueueMeta } from "../lib/threadWorkflow";
import type {
  Thread,
  ThreadQueueSection,
  ThreadWorkflowView
} from "../types";

interface InboxViewProps {
  threads: Thread[];
  queueSections: ThreadQueueSection[];
  selectedThreadId: string;
  onSelectThread: (threadId: string) => void;
  onlyDelta: boolean;
  onToggleOnlyDelta: () => void;
  threadWorkflowMap: Record<string, ThreadWorkflowView>;
  onToggleWatchThread: (threadId: string) => void;
  onSaveThreadToCase: (threadId: string) => void;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getTriageCopy(workflow: ThreadWorkflowView) {
  switch (workflow.queueState) {
    case "new":
      return "This thread is still in raw triage. Review it, park it in the watch queue, or promote it straight into a case if the storyline is already obvious.";
    case "new-delta":
      return "This thread was reviewed already, but meaningful changes landed afterward. Treat it like a reactivated queue item instead of background noise.";
    case "watching":
      return "This thread is parked for revisit without the overhead of a full case. Promote it once it deserves notes, timeline management, or a clearer narrative.";
    case "reviewed":
      return "This thread has already been reviewed and deliberately set aside. It should stay out of the way until a real delta arrives.";
    case "in-case":
      return "This thread already has a durable workspace. Reopen the case to add notes, review the timeline, or check deltas.";
    case "muted":
      return "This thread is muted from the working queue. Reopen it intentionally if the signal changes.";
  }
}

export function InboxView({
  threads,
  queueSections,
  selectedThreadId,
  onSelectThread,
  onlyDelta,
  onToggleOnlyDelta,
  threadWorkflowMap,
  onToggleWatchThread,
  onSaveThreadToCase
}: InboxViewProps) {
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

  return (
    <div className="workspace-grid">
      <section className="panel list-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Review queue</p>
            <h3>{onlyDelta ? "Only needs review" : "Full Inbox state"}</h3>
          </div>
          <button className="ghost-button" onClick={onToggleOnlyDelta} type="button">
            {onlyDelta ? "Show all" : "Only Δ"}
          </button>
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
                  <span className="meta-text">{section.threads.length} threads</span>
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
              <h4>{onlyDelta ? "Nothing needs review" : "No Inbox threads"}</h4>
              <p>
                {onlyDelta
                  ? "The active queue is clear. Toggle Show all to revisit watched, reviewed, or case-linked threads."
                  : "Change filters or ingest more material to repopulate the queue."}
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
                <p className="eyebrow">Thread detail</p>
                <h3>{selectedThread.title}</h3>
              </div>
              <div className="detail-actions">
                <button
                  className="ghost-button"
                  onClick={() => onSaveThreadToCase(selectedThread.id)}
                  type="button"
                >
                  {selectedThreadCaseId ? "Open Case" : "Save to Case"}
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

            <div className="detail-block">
              <h4>Triage state</h4>
              <div className="thread-card-topline">
                <span className={`status-tag status-${selectedThreadWorkflow.queueState}`}>
                  {selectedThreadQueueMeta.badge}
                </span>
              </div>
              <p>{getTriageCopy(selectedThreadWorkflow)}</p>
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
            <h4>Queue is clear</h4>
            <p>Nothing is selected right now. Reopen the full Inbox or ingest new material.</p>
          </article>
        )}
      </aside>
    </div>
  );
}
