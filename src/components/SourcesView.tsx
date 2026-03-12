import type { SourceRegistryEntry } from "../types";

interface SourcesViewProps {
  registry: SourceRegistryEntry[];
  selectedSourceId: string;
  onSelectSource: (sourceId: string) => void;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium"
  }).format(new Date(value));
}

export function SourcesView({
  registry,
  selectedSourceId,
  onSelectSource
}: SourcesViewProps) {
  const selectedSource =
    registry.find((item) => item.id === selectedSourceId) ?? registry[0];

  return (
    <div className="workspace-grid">
      <section className="panel list-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Source registry</p>
            <h3>Reliability and discovery</h3>
          </div>
          <button className="ghost-button" type="button">
            Source Radar
          </button>
        </div>

        <div className="source-dossier-list">
          {registry.map((item) => (
            <button
              key={item.id}
              className={`dossier-card${item.id === selectedSourceId ? " is-selected" : ""}`}
              onClick={() => onSelectSource(item.id)}
              type="button"
            >
              <div className="thread-card-topline">
                <span className={`status-tag status-${item.promotedState}`}>
                  {item.promotedState}
                </span>
                {item.emerging ? <span className="delta-pill">Radar</span> : null}
              </div>
              <h4>{item.label}</h4>
              <p>{item.domain}</p>
              <div className="metric-grid">
                <div>
                  <span className="metric-label">Originality</span>
                  <strong>{formatPercent(item.originalityRatio)}</strong>
                </div>
                <div>
                  <span className="metric-label">Corroboration</span>
                  <strong>{formatPercent(item.corroborationRate)}</strong>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <aside className="panel detail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Source dossier</p>
            <h3>{selectedSource.label}</h3>
          </div>
          <div className="detail-actions">
            <button className="ghost-button" type="button">
              Promote
            </button>
            <button className="ghost-button" type="button">
              Demote
            </button>
            <button className="ghost-button" type="button">
              Mute
            </button>
          </div>
        </div>

        <div className="detail-block">
          <span className={`status-tag status-${selectedSource.promotedState}`}>
            {selectedSource.promotedState}
          </span>
          <p>{selectedSource.domain}</p>
          <p>{selectedSource.rationale}</p>
          <p className="meta-text">First seen {formatDate(selectedSource.firstSeenAt)}</p>
        </div>

        <div className="detail-block">
          <h4>Metrics</h4>
          <div className="metric-grid large">
            <div>
              <span className="metric-label">Originality ratio</span>
              <strong>{formatPercent(selectedSource.originalityRatio)}</strong>
            </div>
            <div>
              <span className="metric-label">Corroboration rate</span>
              <strong>{formatPercent(selectedSource.corroborationRate)}</strong>
            </div>
            <div>
              <span className="metric-label">Saved threads</span>
              <strong>{selectedSource.savedThreadCount}</strong>
            </div>
            <div>
              <span className="metric-label">Category</span>
              <strong>{selectedSource.category}</strong>
            </div>
          </div>
        </div>

        <div className="detail-block">
          <h4>Example threads</h4>
          <div className="compact-list">
            {selectedSource.examples.map((example) => (
              <article key={example} className="compact-card">
                <p>{example}</p>
              </article>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
