// Privacy-friendly usage counts (GoatCounter: no cookies, no personal data).
// Off unless VITE_GOATCOUNTER is set to the site code, e.g. "ballduel" for ballduel.goatcounter.com.

declare global {
  interface Window {
    goatcounter?: { count(vars: { path: string; title?: string; event?: boolean }): void };
  }
}

const CODE = import.meta.env.VITE_GOATCOUNTER as string | undefined;

export function initTracking(): void {
  if (!CODE) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://gc.zgo.at/count.js";
  s.dataset.goatcounter = `https://${CODE}.goatcounter.com/count`;
  document.head.append(s);
}

// funnel events: which step people reach (pick → finish → save clip / share)
export function track(event: string): void {
  if (!CODE) return;
  try {
    window.goatcounter?.count({ path: `event/${event}`, title: event, event: true });
  } catch {
    // counting must never break the game
  }
}
