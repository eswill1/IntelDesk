import type { NavView } from "../types";

interface TopBarProps {
  activeView: NavView;
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenAddUrl: () => void;
  addUrlDisabled?: boolean;
}

const titles: Record<NavView, { title: string; subtitle: string }> = {
  landscape: {
    title: "Threat Landscape",
    subtitle: "Monitor prioritized intel cards, then decide what to watch, case, or ignore."
  },
  agents: {
    title: "Agents",
    subtitle: "Saved monitors that cut the landscape into focused lenses for daily review."
  },
  cases: {
    title: "Cases",
    subtitle: "Watch emerging cards lightly, then promote the real ones into durable case files."
  },
  sources: {
    title: "Sources",
    subtitle: "Curate the source canon and spot emerging domains worth keeping."
  },
  search: {
    title: "Search",
    subtitle: "Find entities, notes, cards, agents, and source dossiers in one place."
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
        <p className="eyebrow">Feedly-style intel prototype</p>
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
          Add URL
        </button>
        <button className="theme-button" onClick={onToggleTheme} type="button">
          {darkMode ? "Light theme" : "Dark theme"}
        </button>
      </div>
    </header>
  );
}
