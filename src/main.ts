import "./style.css";
import { dayKey, dayNumber, hashString, rng } from "./core/daily";
import { ClipRecorder, shareOrDownload } from "./core/recorder";
import { Sfx } from "./core/sfx";
import { load, save, shareText } from "./core/share";
import { initTracking, track } from "./core/track";
import { ARENA, H, Renderer, W } from "./game/render";
import { LANGS, lang, langName, setLang, t, weaponLabel, type Lang } from "./i18n";
import { Sim, WEAPONS, WEAPON_KINDS, type Fighter, type SimEvent, type WeaponKind } from "./game/sim";

const GAME = "Ball Duel";
const SHORTS = new URLSearchParams(location.search).get("format") === "shorts";
const LAUNCH = "2026-11-02";
const COLORS = ["#ff5d73", "#4dabff", "#ffd34d", "#7dffa1", "#c792ff", "#ff9f43"];
const INTRO = 1.2; // short: Shorts/TikTok viewers decide in the first second
const OUTRO = SHORTS ? 2 : 3.2;
const KO_HOLD = 0.9;
const STEP = 1 / 120;

interface Match { seed: number; fighters: Fighter[]; daily: boolean }
interface Stats { days: Record<string, { pick: WeaponKind; won: boolean }> }

const canvas = document.querySelector<HTMLCanvasElement>("#stage")!;
canvas.dataset.format = SHORTS ? "shorts" : "game";
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext("2d")!;
const panel = document.querySelector<HTMLDivElement>("#panel")!;
const recorder = new ClipRecorder(canvas);
const sfx = new Sfx();
const muteBtn = document.querySelector<HTMLButtonElement>("#mute")!;
sfx.muted = load("ballduel.muted", false);
const syncMute = () => (muteBtn.textContent = sfx.muted ? "🔇" : "🔊");
syncMute();
muteBtn.onclick = () => {
  sfx.muted = !sfx.muted;
  save("ballduel.muted", sfx.muted);
  syncMute();
};
// host alone 404s on GitHub Pages: project sites live under /<repo>/
const shortUrl = (location.host + location.pathname).replace(/\/(index\.html)?$/, "") || "ballduel.app";

const langSelect = document.querySelector<HTMLSelectElement>("#lang")!;
for (const l of LANGS) langSelect.add(new Option(langName(l), l));
langSelect.value = lang();
const applyLang = () => {
  document.documentElement.lang = t().htmlLang;
  document.title = `${GAME} · ${t().whoWins}`;
};
applyLang();
langSelect.onchange = () => {
  setLang(langSelect.value as Lang);
  track(`lang-${langSelect.value}`);
  applyLang();
  // the canvas re-reads strings every frame; rebuild whichever panel is showing
  if (phase === "menu") showMenu();
  else if (phase === "done") showResult(sim.winner?.id === pick);
};

function shuffled<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeMatch(seed: number, kinds: WeaponKind[] | null, daily: boolean): Match {
  const rand = rng(seed);
  const picked = kinds ?? shuffled(WEAPON_KINDS, rand).slice(0, 2);
  const colors = shuffled(COLORS, rand);
  return { seed, fighters: picked.map((k, i) => ({ kind: k, color: colors[i] })), daily };
}

const dailyMatch = () => makeMatch(hashString(dayKey()), null, true);
const randomMatch = (seed = Math.floor(Math.random() * 1e9), kinds: WeaponKind[] | null = null) =>
  makeMatch(seed, kinds, false);
const matchTitle = (m: Match) =>
  m.daily ? `${GAME} #${dayNumber(new Date(), LAUNCH)}` : `${GAME} · ${t().random}`;

function matchFromUrl(): Match | null {
  const q = new URLSearchParams(location.search);
  const seed = Number(q.get("seed"));
  const kinds = (q.get("w") ?? "").split(",").filter((k): k is WeaponKind => k in WEAPONS);
  return seed && kinds.length >= 2 ? randomMatch(seed, kinds) : null;
}

function matchLink(m: Match): string {
  const base = location.origin + location.pathname;
  return m.daily ? base : `${base}?seed=${m.seed}&w=${m.fighters.map((f) => f.kind).join(",")}`;
}

let match = matchFromUrl() ?? dailyMatch();
const stats = load<Stats>("ballduel.stats", { days: {} });

// ---------- game loop ----------
type Phase = "menu" | "intro" | "fight" | "outro" | "done";
let phase: Phase = "menu";
let sim = new Sim(ARENA, match.fighters, match.seed);
let renderer = new Renderer(ctx, { title: () => matchTitle(match), url: shortUrl, shorts: SHORTS });
let pick: number | null = null;
let phaseTime = 0;
let koAt: number | null = null;
let suddenDeathAnnounced = false;
let acc = 0;
let last = performance.now();
let clip: Blob | null = null;

function freshSim(): void {
  sim = new Sim(ARENA, match.fighters, match.seed);
  renderer = new Renderer(ctx, { title: () => matchTitle(match), url: shortUrl, shorts: SHORTS });
}

function setPhase(p: Phase): void {
  phase = p;
  phaseTime = 0;
  koAt = null;
  acc = 0;
}

function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  phaseTime += dt;

  if (phase === "menu") {
    renderer.intro(sim, 1);
  } else if (phase === "intro") {
    renderer.intro(sim, phaseTime);
    if (phaseTime >= INTRO) setPhase("fight");
  } else if (phase === "fight") {
    acc += dt;
    while (acc >= STEP) {
      sim.step(STEP);
      acc -= STEP;
    }
    playSounds(sim.events);
    if (sim.suddenDeath && !suddenDeathAnnounced) {
      suddenDeathAnnounced = true;
      sfx.suddenDeath();
    }
    renderer.consume(sim.events, sim);
    renderer.update(dt);
    renderer.draw(sim);
    // let the KO burst play out before the result card
    if (sim.winner) {
      koAt ??= phaseTime;
      if (phaseTime - koAt > KO_HOLD) {
        setPhase("outro");
        sfx.win();
      }
    }
  } else {
    renderer.update(dt);
    renderer.outro(sim, pick, phaseTime);
    if (phase === "outro" && phaseTime >= OUTRO) void finish();
  }
  requestAnimationFrame(frame);
}

function playSounds(events: SimEvent[]): void {
  for (const e of events) {
    if (e.type === "hit") sfx.hit(e.damage);
    else if (e.type === "parry") sfx.parry();
    else if (e.type === "reflect") sfx.reflect();
    else if (e.type === "shoot") sfx.shoot(e.shot);
    else if (e.type === "heal") sfx.heal();
    else if (e.type === "ko") sfx.ko();
    else if (e.type === "bounce") sfx.bounce();
  }
}

function start(pickId: number): void {
  pick = pickId;
  clip = null;
  suddenDeathAnnounced = false;
  freshSim();
  panel.hidden = true;
  sfx.unlock();
  recorder.start(sfx.track);
  setPhase("intro");
  sfx.intro();
  track(match.daily ? "pick-daily" : "pick-random");
}

async function finish(): Promise<void> {
  phase = "done";
  clip = await recorder.stop();
  const won = sim.winner?.id === pick;
  if (match.daily && pick !== null && !stats.days[dayKey()]) {
    stats.days[dayKey()] = { pick: match.fighters[pick].kind, won };
    save("ballduel.stats", stats);
  }
  track("finish");
  showResult(won);
}

function reset(m: Match): void {
  match = m;
  pick = null;
  clip = null;
  freshSim();
  setPhase("menu");
  showMenu();
}

// ---------- UI ----------
function btn(label: string, cls: string, onClick: () => void, color?: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.textContent = label;
  b.className = cls;
  if (color) b.style.setProperty("--c", color);
  b.onclick = onClick;
  return b;
}

function el(tag: string, cls: string, text: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  e.textContent = text;
  return e;
}

function row(...children: HTMLElement[]): HTMLDivElement {
  const r = document.createElement("div");
  r.className = "row";
  r.append(...children);
  return r;
}

function showMenu(): void {
  panel.replaceChildren(
    el("p", "lead", match.daily ? t().todayPrompt : t().pickPrompt),
    row(...match.fighters.map((f, i) =>
      btn(`${WEAPONS[f.kind].emoji} ${weaponLabel(f.kind)}`, "pick", () => start(i), f.color))),
  );
  const done = match.daily ? stats.days[dayKey()] : undefined;
  if (done) {
    panel.append(el("p", "note", t().alreadyPicked(weaponLabel(done.pick), done.won)));
  }
  panel.append(btn(t().randomDuel, "ghost", () => reset(randomMatch())));
  panel.append(Object.assign(document.createElement("a"), {
    href: "./privacy.html", className: "privacy-link", textContent: "Privacy · 隱私政策",
  }));
  panel.hidden = false;
}

function streakCount(): number {
  let n = 0;
  const d = new Date();
  while (stats.days[dayKey(d)]?.won) {
    n++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}

function resultText(won: boolean): string {
  const s = t();
  const [a, b] = match.fighters.map((f) => WEAPONS[f.kind]);
  const w = sim.winner;
  const mine = pick !== null ? WEAPONS[match.fighters[pick].kind] : null;
  const streak = streakCount();
  return [
    `${matchTitle(match)} ${a.emoji} vs ${b.emoji}`,
    mine ? `${s.sharePick}${mine.emoji} ${won ? "✅" : "❌"}` : "",
    w ? s.shareWon(weaponLabel(w.weapon.def.kind), Math.ceil(w.hp), Math.floor(sim.time)) : s.draw,
    match.daily && streak > 1 ? s.streak(streak) : "",
    matchLink(match),
  ].filter(Boolean).join("\n");
}

function showResult(won: boolean): void {
  const s = t();
  const share = btn(s.shareResult, "main", async () => {
    const r = await shareText(resultText(won));
    track(`share-${r}`);
    share.textContent = r === "copied" ? s.copied : r === "shared" ? s.shared : s.shareFailed;
  });
  const top = row(share);
  if (clip) {
    const c = clip;
    top.prepend(btn(s.saveClip, "main", () => {
      track("save-clip");
      void shareOrDownload(c, "ball-duel", resultText(won));
    }));
  }
  const bottom = row(
    btn(s.watchAgain, "ghost", () => start(pick ?? 0)),
    btn(s.randomDuel, "ghost", () => reset(randomMatch())),
  );
  if (!match.daily) bottom.append(btn(s.todaysDuel, "ghost", () => reset(dailyMatch())));
  panel.replaceChildren(el("p", "lead", won ? s.calledIt : s.notThisTime), top, bottom);
  if (!recorder.supported) panel.append(el("p", "note", s.noRecord));
  panel.hidden = false;
}

initTracking();
showMenu();
requestAnimationFrame(frame);
