# Ball Duel

A new ball battle every day. Pick who wins, watch the fight, save a 9:16 clip.

Languages (`src/i18n.ts`): 繁體中文 (default), 简体中文, English, 日本語, 한국어, Español, Português, Français, Deutsch, Bahasa Indonesia. The picker remembers the choice; `?lang=ja` in a link overrides it.

Origin: demand-discovery rounds 86–88. Ball-battle clips (Earclacks format) draw "Game name?" comments; existing apps (Weapon Ball Fight, Weapon Ball Battles) stopped updating in 2025–26. What this version adds: a daily shared match-up, a pick-before-the-fight hook, and a clip cut automatically in the browser (intro "WHO WINS?", result card, URL).

## Run

```bash
npm install
npm run dev
```

## How it works

- `src/game/sim.ts`: deterministic arena. Balls bounce at constant speed; each of 9 weapons grows on every hit (sword/hammer +damage, spear +reach, dagger +spin, axe +damage and spin, scythe +damage with 50% lifesteal, bow +arrows, shuriken +wall bounces, shield +damage and width and reflects shots). Sudden death x2 at 25 s, x4 at 40 s.
- `src/core/sfx.ts`: synthesised Web Audio sound effects (no audio files). Routed to the speakers (mute button) and to a MediaStream track that the recorder mixes into the clip.
- `src/game/render.ts`: draws HUD, arena, intro and result card on one 720x1280 canvas, so the recording is a finished short.
- `src/core/recorder.ts`: `canvas.captureStream` + `MediaRecorder` (MP4 when supported, else WebM); Web Share API with download fallback.
- `src/core/daily.ts`: date-seeded match-up, same for everyone each UTC day. Random duels are shareable via `?seed=…&w=sword,bow`.

Balance (150 seeds per pair, sides alternated): overall win rate 46–55% per weapon, most lopsided pair 31%, average match about 45 s.

## Validation plan (stop-loss)

Post 10 clips to TikTok / YouTube Shorts within a week. Stop if none passes 10k views, or nobody records and shares their own clip from the site. Posting kit with the 10 most dramatic seeded duels, captions and a tracking sheet: [docs/launch-kit.md](docs/launch-kit.md). Usage events go to GoatCounter when the repo variable `GOATCOUNTER_CODE` is set.
