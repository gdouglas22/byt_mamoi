const MAP = {
  bg_color: "--bg",
  secondary_bg_color: "--bg-soft",
  section_bg_color: "--bg-card",
  text_color: "--text",
  hint_color: "--text-dim",
  link_color: "--accent",
  button_color: "--accent",
  destructive_text_color: "--danger",
};

export function applyTheme(tg) {
  const p = tg && tg.themeParams ? tg.themeParams : {};
  const root = document.documentElement.style;
  for (const [tgKey, cssVar] of Object.entries(MAP)) {
    if (p[tgKey]) root.setProperty(cssVar, p[tgKey]);
  }
  if (tg && tg.colorScheme === "light") {
    document.documentElement.dataset.scheme = "light";
  }
}
