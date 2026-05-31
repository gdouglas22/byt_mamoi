function tg() { return window.Telegram && window.Telegram.WebApp; }
function hf() { const t = tg(); return t && t.HapticFeedback ? t.HapticFeedback : null; }

export function impact(style = "light") {
  const h = hf();
  if (h && h.impactOccurred) { try { h.impactOccurred(style); return; } catch {} }
  if (navigator.vibrate) navigator.vibrate(style === "heavy" ? 25 : style === "medium" ? 15 : 8);
}

export function notify(kind = "success") {
  const h = hf();
  if (h && h.notificationOccurred) { try { h.notificationOccurred(kind); return; } catch {} }
  if (navigator.vibrate) navigator.vibrate(kind === "error" ? [20, 40, 20] : [15, 30, 15]);
}

export function select() {
  const h = hf();
  if (h && h.selectionChanged) { try { h.selectionChanged(); return; } catch {} }
  if (navigator.vibrate) navigator.vibrate(5);
}
