import { startTransition } from "react";
import type { SearchResult } from "../types";

interface SearchViewProps {
  query: string;
  results: SearchResult[];
  selectedResultId: string;
  onSelectResult: (resultId: string) => void;
  onQueryChange: (value: string) => void;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

const starterQueries = ["CVE-2026-1182", "Ivanti", "edge exploitation", "supply chain"];

export function SearchView({
  query,
  results,
  selectedResultId,
  onSelectResult,
  onQueryChange
}: SearchViewProps) {
  const selectedResult =
    results.find((result) => result.id === selectedResultId) ?? results[0];

  return (
    <div className="workspace-grid">
      <section className="panel list-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Global search</p>
            <h3>Cards, agents, notes, entities, and sources</h3>
          </div>
        </div>

        <label className="search-input-shell">
          <span className="meta-text">Query</span>
          <input
            aria-label="Search"
            className="search-input"
            onChange={(event) => {
              const value = event.target.value;
              startTransition(() => onQueryChange(value));
            }}
            placeholder="Search for a CVE, product, note, or source"
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
              <p>Try a CVE, vendor, product, or a phrase from a case note.</p>
            </article>
          )}
        </div>
      </section>

      <aside className="panel detail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Selected result</p>
            <h3>{selectedResult ? selectedResult.title : "Nothing selected"}</h3>
          </div>
        </div>

        {selectedResult ? (
          <>
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
            <h4>Search the workbench</h4>
            <p>Results from cards, agents, cases, source items, and the source registry will appear here.</p>
          </article>
        )}
      </aside>
    </div>
  );
}
