import type { NavView } from "../types";

interface SidebarProps {
  activeView: NavView;
  onSelectView: (view: NavView) => void;
  threadCount: number;
  watchCount: number;
  caseCount: number;
  sourceCount: number;
}

const navItems: Array<{
  view: NavView;
  label: string;
  shortLabel: string;
  blurb: string;
}> = [
  {
    view: "inbox",
    label: "Inbox",
    shortLabel: "Δ",
    blurb: "New threads and meaningful changes"
  },
  {
    view: "cases",
    label: "Cases",
    shortLabel: "C",
    blurb: "Watch queue and living investigations"
  },
  {
    view: "sources",
    label: "Sources",
    shortLabel: "S",
    blurb: "Registry, trust, and radar"
  },
  {
    view: "search",
    label: "Search",
    shortLabel: "/",
    blurb: "Find notes, entities, and sources"
  }
];

export function Sidebar({
  activeView,
  onSelectView,
  threadCount,
  watchCount,
  caseCount,
  sourceCount
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-panel panel">
        <p className="eyebrow">Threat Intel Research Workbench</p>
        <h1>IntelDesk</h1>
        <p className="brand-copy">
          Follow incidents end-to-end without losing the plot.
        </p>
      </div>

      <nav className="nav-panel panel" aria-label="Primary">
        {navItems.map((item) => (
          <button
            key={item.view}
            className={`nav-button${activeView === item.view ? " is-active" : ""}`}
            onClick={() => onSelectView(item.view)}
            type="button"
          >
            <span className="nav-key">{item.shortLabel}</span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.blurb}</small>
            </span>
          </button>
        ))}
      </nav>

      <section className="session-panel panel">
        <div>
          <span className="metric-label">Active threads</span>
          <strong>{threadCount}</strong>
        </div>
        <div>
          <span className="metric-label">Watch queue</span>
          <strong>{watchCount}</strong>
        </div>
        <div>
          <span className="metric-label">Open cases</span>
          <strong>{caseCount}</strong>
        </div>
        <div>
          <span className="metric-label">Tracked sources</span>
          <strong>{sourceCount}</strong>
        </div>
      </section>
    </aside>
  );
}
