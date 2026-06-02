// Theme management.
//
// The mini-app ships with two complete palettes (dark + light) in main.css under
// `:root` (dark default) and `[data-theme="light"]`. Telegram's themeParams are
// notoriously unreliable across clients (some return dark text in dark mode,
// some return partial palettes), so we DO NOT apply individual params anymore.
// We only honour `tg.colorScheme` to pick the bucket. Parent React shell can
// override via postMessage({type: "cyberdef:set-theme", theme: "light"|"dark"}).

export function applyTheme(tg) {
  const fromTg = tg && (tg.colorScheme === "light" ? "light" : "dark");
  setTheme(fromTg || readStored() || systemPref() || "dark");

  // Listen to Telegram theme changes (standalone mode).
  if (tg && typeof tg.onEvent === "function") {
    tg.onEvent("themeChanged", () => {
      if (tg.colorScheme === "light" || tg.colorScheme === "dark") {
        setTheme(tg.colorScheme);
      }
    });
  }

  // Allow our React shell (parent iframe) to push the theme.
  if (typeof window !== "undefined") {
    window.addEventListener("message", (e) => {
      const data = e && e.data;
      if (!data || data.type !== "cyberdef:set-theme") return;
      if (data.theme === "light" || data.theme === "dark") {
        setTheme(data.theme);
      }
    });
  }
}

export function setTheme(theme) {
  if (theme !== "light" && theme !== "dark") return;
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem("cyberdef.theme", theme); } catch {}
}

function readStored() {
  try {
    const v = localStorage.getItem("cyberdef.theme");
    if (v === "light" || v === "dark") return v;
  } catch {}
  return null;
}

function systemPref() {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
