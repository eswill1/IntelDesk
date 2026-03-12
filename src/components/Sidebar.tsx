import type { NavView } from "../types";

interface SidebarProps {
  activeView: NavView;
  onSelectView: (view: NavView) => void;
  reviewCount: number;
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
    view: "monitors",
    label: "Monitors",
    shortLabel: "1",
    blurb: "Saved feeds, focused monitors, and the main intel stream"
  },
  {
    view: "cases",
    label: "Cases",
    shortLabel: "2",
    blurb: "Watch queue and durable investigations"
  },
  {
    view: "library",
    label: "Library",
    shortLabel: "3",
    blurb: "Search, saved sources, and supporting context"
  }
];

export function Sidebar({
  activeView,
  onSelectView,
  reviewCount,
  watchCount,
  caseCount,
  sourceCount
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-surface">
        <div className="brand-panel">
          <div className="brand-mark">ID</div>
          <div className="brand-lockup">
            <p className="eyebrow">Threat Intelligence Cockpit</p>
            <h1>IntelDesk</h1>
            <p className="brand-copy">
              Feed-driven monitoring with deliberate case follow-through when the story becomes
              operational.
            </p>
          </div>
        </div>

        <section className="sidebar-brief">
          <p className="eyebrow">Today</p>
          <h3>Stay inside the signal.</h3>
          <p className="brand-copy">
            Start in monitors, decide fast, and only open a case when the evidence says it deserves
            one.
          </p>
        </section>

        <nav className="nav-panel" aria-label="Primary">
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

        <section className="session-panel">
          <div className="session-metric">
            <span className="metric-label">Needs review</span>
            <strong>{reviewCount}</strong>
          </div>
          <div className="session-metric">
            <span className="metric-label">Watch queue</span>
            <strong>{watchCount}</strong>
          </div>
          <div className="session-metric">
            <span className="metric-label">Open cases</span>
            <strong>{caseCount}</strong>
          </div>
          <div className="session-metric">
            <span className="metric-label">Tracked sources</span>
            <strong>{sourceCount}</strong>
          </div>
        </section>
      </div>
    </aside>
  );
}
