import type { Thread } from "../types";

interface InboxViewProps {
  threads: Thread[];
  selectedThreadId: string;
  onSelectThread: (threadId: string) => void;
  onlyDelta: boolean;
  onToggleOnlyDelta: () => void;
  watchedThreadIds: string[];
  threadCaseIdMap: Record<string, string>;
  onToggleWatchThread: (threadId: string) => void;
  onSaveThreadToCase: (threadId: string) => void;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function InboxView({
  threads,
  selectedThreadId,
  onSelectThread,
  onlyDelta,
  onToggleOnlyDelta,
  watchedThreadIds,
  threadCaseIdMap,
  onToggleWatchThread,
  onSaveThreadToCase
}: InboxViewProps) {
  const selectedThread = threads.find((thread) => thread.id === selectedThreadId) ?? threads[0];

  if (!selectedThread) {
    return (
      <div className="workspace-grid">
        <section className="panel list-panel">
          <article className="empty-state">
            <h4>No Inbox threads</h4>
            <p>Change filters or ingest more material to repopulate the queue.</p>
          </article>
        </section>
      </div>
    );
  }

  const selectedThreadCaseId = threadCaseIdMap[selectedThread.id];
  const selectedThreadIsWatched =
    watchedThreadIds.includes(selectedThread.id) && !selectedThreadCaseId;

  function getThreadRoutingState(threadId: string) {
    if (threadCaseIdMap[threadId]) {
      return "in-case";
    }

    if (watchedThreadIds.includes(threadId)) {
      return "watching";
    }

    return "untracked";
  }

  return (
    <div className="workspace-grid">
      <section className="panel list-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Thread queue</p>
            <h3>{onlyDelta ? "Only delta" : "All active threads"}</h3>
          </div>
          <button className="ghost-button" onClick={onToggleOnlyDelta} type="button">
            {onlyDelta ? "Show all" : "Only Δ"}
          </button>
        </div>

        <div className="thread-list">
          {threads.map((thread) => (
            <button
              key={thread.id}
              className={`thread-card${thread.id === selectedThreadId ? " is-selected" : ""}`}
              onClick={() => onSelectThread(thread.id)}
              type="button"
            >
              <div className="thread-card-topline">
                <span className={`status-tag status-${thread.status}`}>{thread.status}</span>
                {getThreadRoutingState(thread.id) === "watching" ? (
                  <span className="delta-pill">Watch queue</span>
                ) : null}
                {getThreadRoutingState(thread.id) === "in-case" ? (
                  <span className="canonical-pill">In case</span>
                ) : null}
                <span className="meta-text">{thread.sourceCount} sources</span>
                <span className="meta-text">{thread.corroborationCount} corroborating</span>
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
          ))}
        </div>
      </section>

      <aside className="panel detail-panel">
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
          <span className={`status-tag status-${selectedThread.status}`}>
            {selectedThread.status}
          </span>
          <p>{selectedThread.summary}</p>
          <p className="meta-text">
            Last updated {formatTime(selectedThread.lastUpdated)}. Last seen{" "}
            {formatTime(selectedThread.lastSeenAt)}.
          </p>
        </div>

        <div className="detail-block">
          <h4>Triage state</h4>
          <div className="thread-card-topline">
            <span
              className={`status-tag ${
                selectedThreadCaseId
                  ? "status-active"
                  : selectedThreadIsWatched
                    ? "status-watching"
                    : "status-neutral"
              }`}
            >
              {selectedThreadCaseId
                ? "linked to case"
                : selectedThreadIsWatched
                  ? "watch queue"
                  : "inbox only"}
            </span>
          </div>
          <p>
            {selectedThreadCaseId
              ? "This thread already has a durable workspace. Reopen the case to add notes, review the timeline, or check deltas."
              : selectedThreadIsWatched
                ? "This thread is parked for revisit without the overhead of a full case. Promote it once it deserves notes and timeline management."
                : "This thread is still in raw triage. Watch it if it looks promising, or save it directly to a case if you know it matters."}
          </p>
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
      </aside>
    </div>
  );
}
