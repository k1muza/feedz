export type DashboardTheme = "light" | "dark";

export const DASHBOARD_THEME_STORAGE_KEY = "feedsport-dashboard-theme";

// Runs in <head> before first paint so /dashboard doesn't flash light before
// switching to a saved (or system) dark theme. Kept in sync with
// resolveDashboardTheme below.
export const dashboardThemeScript = `(function(){try{if(!/^\\/dashboard(\\/|$)/.test(location.pathname))return;var t=localStorage.getItem("${DASHBOARD_THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";if(t==="dark")document.documentElement.classList.add("dark")}catch(e){}})()`;

export function resolveDashboardTheme(): DashboardTheme {
  try {
    const stored = localStorage.getItem(DASHBOARD_THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyDashboardTheme(theme: DashboardTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function saveDashboardTheme(theme: DashboardTheme) {
  try {
    localStorage.setItem(DASHBOARD_THEME_STORAGE_KEY, theme);
  } catch {
    // Theme still applies for this visit even if it can't be remembered.
  }
}
