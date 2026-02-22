const THEME_STORAGE_KEY = "studentosTheme";

function getStoredTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore localStorage failures.
  }
}

function syncThemeControls(isDark) {
  const toggles = document.querySelectorAll(".theme-toggle-input");
  toggles.forEach((toggle) => {
    toggle.checked = isDark;
    toggle.setAttribute("aria-checked", String(isDark));
  });
}

function applyTheme(theme, emitEvent = true) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark", isDark);
  syncThemeControls(isDark);

  if (emitEvent) {
    document.dispatchEvent(new CustomEvent("studentos:theme-change", {
      detail: { isDark }
    }));
  }
}

function handleThemeToggle(event) {
  const isDark = event.target.checked;
  const theme = isDark ? "dark" : "light";
  saveTheme(theme);
  applyTheme(theme);
}

function initTheme() {
  const savedTheme = getStoredTheme();
  applyTheme(savedTheme, false);

  const toggles = document.querySelectorAll(".theme-toggle-input");
  toggles.forEach((toggle) => {
    toggle.addEventListener("change", handleThemeToggle);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTheme);
} else {
  initTheme();
}
