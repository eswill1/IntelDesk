import { startTransition, useState } from "react";
import type { SearchResult, SourceRegistryEntry } from "../types";

interface LibraryViewProps {
  query: string;
  results: SearchResult[];
  selectedResultId: string;
  onSelectResult: (resultId: string) => void;
  onQueryChange: (value: string) => void;
  registry: SourceRegistryEntry[];
  selectedSourceId: string;
  onSelectSource: (sourceId: string) => void;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

const starterQueries = ["CVE-2026-1182", "Ivanti", "supply chain", "Fortinet"];

export function LibraryView({
  query,
  results,
  selectedResultId,
  onSelectResult,
  onQueryChange,
  registry,
  selectedSourceId,
  onSelectSource
}: LibraryViewProps) {
  const [activeTab, setActiveTab] = useState<"search" | "sources">("search");
  const selectedResult =
    results.find((result) => result.id === selectedResultId) ?? results[0];
  const selectedSource =
    registry.find((item) => item.id === selectedSourceId) ?? registry[0];

  return (
    <div className="workspace-grid">
      <section className="panel list-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Library</p>
            <h3>Search and saved sources</h3>
            <p className="topbar-copy">
              Recover prior context fast, whether you remember the card, the case, the source, or
              just the entity.
            </p>
          </div>
          <div className="segmented-control" role="tablist" aria-label="Library sections">
            <button
              className={`segment-button${activeTab === "search" ? " is-active" : ""}`}
              onClick={() => setActiveTab("search")}
              type="button"
            >
              Search
            </button>
            <button
              className={`segment-button${activeTab === "sources" ? " is-active" : ""}`}
              onClick={() => setActiveTab("sources")}
              type="button"
            >
              Sources
            </button>
          </div>
        </div>

        <div className="monitor-hero">
          <div>
            <span className="metric-label">Results loaded</span>
            <strong>{results.length}</strong>
          </div>
          <div>
            <span className="metric-label">Tracked sources</span>
            <strong>{registry.length}</strong>
          </div>
          <div>
            <span className="metric-label">Mode</span>
            <strong>{activeTab}</strong>
          </div>
        </div>

        {activeTab === "search" ? (
          <>
            <label className="search-input-shell">
              <span className="meta-text">Query</span>
              <input
                aria-label="Search"
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
              <div className="starter-query-group">
                <p className="meta-text">Suggested jumps</p>
                <div className="entity-row">
                  {starterQueries.map((item) => (
                    <button
                      key={item}
                      className="entity-pill button-pill"
                      onClick={() => onQueryChange(item)}
                      type="button"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="search-results">
              {results.length ? (
                results.map((result) => (
                  <button
                    key={result.id}
                    className={`search-card${result.id === selectedResultId ? " is-selected" : ""}`}
                    onClick={() => onSelectResult(result.id)}
                    type="button"
                  >
                    <div className="thread-card-topline">
                      <span className="meta-text">{result.kind}</span>
                      <span className="meta-text">{formatTime(result.updatedAt)}</span>
                    </div>
                    <h4>{result.title}</h4>
                    <p>{result.subtitle}</p>
                    <div className="entity-row">
                      {result.tags.map((tag) => (
                        <span key={tag} className="entity-pill">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </button>
                ))
              ) : (
                <article className="empty-state">
                  <h4>No results</h4>
                  <p>Try a CVE, product, source, or phrase from a case note.</p>
                </article>
              )}
            </div>
          </>
        ) : (
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
        )}
      </section>

      <aside className="panel detail-panel">
        {activeTab === "search" ? (
          selectedResult ? (
            <>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Selected result</p>
                  <h3>{selectedResult.title}</h3>
                </div>
              </div>

              <div className="detail-block">
                <p className="meta-text">
                  {selectedResult.kind} · Updated {formatTime(selectedResult.updatedAt)}
                </p>
                <p>{selectedResult.subtitle}</p>
              </div>

              <div className="detail-block">
                <h4>Context</h4>
                <p>{selectedResult.context}</p>
              </div>

              <div className="detail-block">
                <h4>Tags</h4>
                <div className="entity-row">
                  {selectedResult.tags.map((tag) => (
                    <span key={tag} className="entity-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <article className="empty-state">
              <h4>Search the library</h4>
              <p>Cards, monitors, cases, and sources will appear here.</p>
            </article>
          )
        ) : selectedSource ? (
          <>
            <div className="panel-header">
              <div>
                <p className="eyebrow">Source dossier</p>
                <h3>{selectedSource.label}</h3>
              </div>
            </div>

            <div className="detail-block">
              <span className={`status-tag status-${selectedSource.promotedState}`}>
                {selectedSource.promotedState}
              </span>
              <p>{selectedSource.domain}</p>
              <p>{selectedSource.rationale}</p>
              <p className="meta-text">First seen {formatTime(selectedSource.firstSeenAt)}</p>
            </div>

            <div className="detail-block">
              <h4>Metrics</h4>
              <div className="metric-grid">
                <div>
                  <span className="metric-label">Originality</span>
                  <strong>{formatPercent(selectedSource.originalityRatio)}</strong>
                </div>
                <div>
                  <span className="metric-label">Corroboration</span>
                  <strong>{formatPercent(selectedSource.corroborationRate)}</strong>
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
            </div>

            <div className="detail-block">
              <h4>Example cards</h4>
              <div className="compact-list">
                {selectedSource.examples.map((example) => (
                  <article key={example} className="compact-card">
                    <p>{example}</p>
                  </article>
                ))}
              </div>
            </div>
          </>
        ) : (
          <article className="empty-state">
            <h4>No source selected</h4>
            <p>Select a source to inspect why it matters and how often it shows up in your work.</p>
          </article>
        )}
      </aside>
    </div>
  );
}
