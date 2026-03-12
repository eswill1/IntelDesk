import type { StoredCaseFile, Thread } from "../types";

interface CasesViewProps {
  cases: StoredCaseFile[];
  threads: Thread[];
  selectedCaseId: string;
  onSelectCase: (caseId: string) => void;
  watchedThreads: Thread[];
  onPromoteThreadToCase: (threadId: string) => void;
  onOpenThreadInLandscape: (threadId: string) => void;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function CasesView({
  cases,
  threads,
  selectedCaseId,
  onSelectCase,
  watchedThreads,
  onPromoteThreadToCase,
  onOpenThreadInLandscape
}: CasesViewProps) {
  const selectedCase = cases.find((item) => item.id === selectedCaseId) ?? cases[0] ?? null;
  const linkedThreads = selectedCase
    ? threads.filter((thread) => selectedCase.linkedThreadIds.includes(thread.id))
    : [];

  return (
    <div className="workspace-grid">
      <section className="panel list-panel">
        <div className="section-stack">
          <section className="subsection">
            <div className="subsection-header">
              <div>
                <p className="eyebrow">Watch queue</p>
                <h3>Worth revisiting</h3>
              </div>
              <span className="meta-text">{watchedThreads.length} tracked</span>
            </div>

            {watchedThreads.length ? (
              <div className="compact-list">
                {watchedThreads.map((thread) => (
                  <article key={thread.id} className="compact-card">
                    <div className="thread-card-topline">
                      <span className="status-tag status-watching">watching</span>
                      <span className="meta-text">{thread.sourceCount} sources</span>
                    </div>
                    <h5>{thread.title}</h5>
                    <p>{thread.summary}</p>
                    <div className="mini-actions">
                      <button
                        className="ghost-button mini-ghost"
                        onClick={() => onOpenThreadInLandscape(thread.id)}
                        type="button"
                      >
                        Open in Landscape
                      </button>
                      <button
                        className="ghost-button mini-ghost"
                        onClick={() => onPromoteThreadToCase(thread.id)}
                        type="button"
                      >
                        Promote to Case
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <article className="empty-state">
                <h4>No watched cards</h4>
                <p>Use Watch in the Threat Landscape for cards that are interesting but not yet worth a full case.</p>
              </article>
            )}
          </section>

          <section className="subsection">
            <div className="subsection-header">
              <div>
                <p className="eyebrow">Case files</p>
                <h3>Living investigations</h3>
              </div>
              <span className="meta-text">{cases.length} open</span>
            </div>

            <div className="case-list">
              {cases.map((item) => (
                <button
                  key={item.id}
                  className={`case-card${item.id === selectedCaseId ? " is-selected" : ""}`}
                  onClick={() => onSelectCase(item.id)}
                  type="button"
                >
                  <div className="thread-card-topline">
                    <span className={`status-tag status-${item.status}`}>{item.status}</span>
                    <span className="meta-text">{item.linkedThreadIds.length} cards</span>
                  </div>
                  <h4>{item.title}</h4>
                  <div className="entity-row">
                    {item.tags.map((tag) => (
                      <span key={tag} className="entity-pill">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <ul className="delta-list">
                    {item.deltaSummary.map((delta) => (
                      <li key={delta}>{delta}</li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </section>
        </div>
      </section>

      <aside className="panel detail-panel">
        {selectedCase ? (
          <>
            <div className="panel-header">
              <div>
                <p className="eyebrow">Case detail</p>
                <h3>{selectedCase.title}</h3>
              </div>
              <div className="detail-actions">
                <button className="ghost-button" type="button">
                  Export MD
                </button>
                <button className="ghost-button" type="button">
                  Add Note
                </button>
              </div>
            </div>

            <div className="detail-block">
              <span className={`status-tag status-${selectedCase.status}`}>
                {selectedCase.status}
              </span>
              <p className="meta-text">
                Last updated {formatTime(selectedCase.lastUpdated)}. Last seen{" "}
                {formatTime(selectedCase.lastSeenAt)}.
              </p>
              <div className="entity-row">
                {selectedCase.tags.map((tag) => (
                  <span key={tag} className="entity-pill">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="detail-block">
              <h4>Delta since last view</h4>
              <ul className="delta-list">
                {selectedCase.deltaSummary.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="detail-block">
              <h4>Linked cards</h4>
              <div className="compact-list">
                {linkedThreads.map((thread) => (
                  <article key={thread.id} className="compact-card">
                    <div className="thread-card-topline">
                      <span className={`status-tag status-${thread.status}`}>{thread.status}</span>
                      <span className="meta-text">{thread.sourceCount} sources</span>
                    </div>
                    <h5>{thread.title}</h5>
                    <p>{thread.summary}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="detail-block">
              <h4>Notes</h4>
              <div className="compact-list">
                {selectedCase.notes.map((note) => (
                  <article key={note.id} className="compact-card">
                    <div className="thread-card-topline">
                      {note.pinned ? <span className="canonical-pill">Pinned</span> : null}
                      <span className="meta-text">{formatTime(note.createdAt)}</span>
                    </div>
                    <p>{note.text}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="detail-block">
              <h4>Timeline</h4>
              <div className="timeline">
                {selectedCase.timeline.map((entry) => (
                  <article key={entry.id} className="timeline-entry">
                    <div className="timeline-marker" />
                    <div>
                      <p className="meta-text">{formatTime(entry.at)}</p>
                      <h5>{entry.label}</h5>
                      <p>{entry.detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </>
        ) : (
          <article className="empty-state">
            <h4>No cases yet</h4>
            <p>Promote a watched card or save a Threat Landscape card directly into a new case.</p>
          </article>
        )}
      </aside>
    </div>
  );
}
