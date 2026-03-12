import type { NavView } from "../types";

interface TopBarProps {
  activeView: NavView;
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenAddUrl: () => void;
  addUrlDisabled?: boolean;
}

const titles: Record<NavView, { title: string; subtitle: string }> = {
  monitors: {
    title: "Monitors",
    subtitle:
      "A monitor-first stream for daily collection, triage, and quick analyst decisions."
  },
  cases: {
    title: "Cases",
    subtitle: "A durable workspace for the few signals that earned narrative follow-through."
  },
  library: {
    title: "Library",
    subtitle: "Search your retained context, inspect sources, and recover prior work without hunting."
  }
};

export function TopBar({
  activeView,
  darkMode,
  onToggleTheme,
  onOpenAddUrl,
  addUrlDisabled = false
}: TopBarProps) {
  const view = titles[activeView];

  return (
    <header className="topbar">
      <div className="topbar-intro">
        <p className="eyebrow">Analyst workspace</p>
        <div className="topbar-heading-row">
          <h2>{view.title}</h2>
          <div className="status-pill topbar-status">
            <span className="status-dot" />
            <span>Local workspace</span>
          </div>
        </div>
        <p className="topbar-copy">{view.subtitle}</p>
      </div>

      <div className="topbar-actions">
        <button
          className="ghost-button primary-button"
          disabled={addUrlDisabled}
          onClick={onOpenAddUrl}
          type="button"
        >
          Add Source
        </button>
        <button className="theme-button" onClick={onToggleTheme} type="button">
          {darkMode ? "Light theme" : "Dark theme"}
        </button>
      </div>
    </header>
  );
}
