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
    subtitle: "A clean, monitor-first stream for daily intel gathering, quick triage, and deliberate follow-through."
  },
  cases: {
    title: "Cases",
    subtitle: "A durable workspace for the cards that became real investigations."
  },
  library: {
    title: "Library",
    subtitle: "Search cards, inspect saved sources, and recover context without leaving the workbench."
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
    <header className="topbar panel">
      <div>
        <p className="eyebrow">Monitor first. Case second.</p>
        <h2>{view.title}</h2>
        <p className="topbar-copy">{view.subtitle}</p>
      </div>

      <div className="topbar-actions">
        <div className="status-pill">
          <span className="status-dot" />
          <span>Local analyst profile</span>
        </div>
        <button
          className="ghost-button"
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
