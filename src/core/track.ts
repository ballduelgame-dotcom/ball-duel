// Privacy-friendly usage counts (GoatCounter: no cookies, no personal data).
// Off unless VITE_GOATCOUNTER is set to the site code, e.g. "ballduel" for ballduel.goatcounter.com.

declare global {
  interface Window {
    goatcounter?: { count(vars: { path: string; title?: string; event?: boolean }): void };
  }
}

const CODE = import.meta.env.VITE_GOATCOUNTER as string | undefined;
const OPT_OUT = "ball-duel:analytics-off";

// QA links opt this browser out across visits; analytics=on explicitly restores counting.
function excluded(): boolean {
  const { hostname, search, protocol } = window.location;
  const local = protocol === "file:" || hostname === "localhost" || hostname.endsWith(".localhost") ||
    hostname === "[::1]" || hostname === "::1" || hostname === "0.0.0.0" || /^127(?:\.\d{1,3}){3}$/.test(hostname);
  const choice = new URLSearchParams(search).get("analytics");
  try {
    if (choice === "off") window.localStorage.setItem(OPT_OUT, "1");
    if (choice === "on") window.localStorage.removeItem(OPT_OUT);
    return local || choice === "off" || window.localStorage.getItem(OPT_OUT) === "1";
  } catch {
    // Private browsing/storage restrictions still honour the current QA link.
    return local || choice === "off";
  }
}

const EXCLUDED = excluded();

export function initTracking(): void {
  if (!CODE || EXCLUDED) return;
  try {
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://gc.zgo.at/count.js";
    s.dataset.goatcounter = `https://${CODE}.goatcounter.com/count`;
    document.head.append(s);
  } catch {
    // counting must never break the game
  }
}

// funnel events: which step people reach (pick → finish → save clip / share)
export function track(event: string): void {
  if (!CODE || EXCLUDED) return;
  try {
    window.goatcounter?.count({ path: `event/${event}`, title: event, event: true });
  } catch {
    // counting must never break the game
  }
}
