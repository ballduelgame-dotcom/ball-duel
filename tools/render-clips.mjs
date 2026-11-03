// Renders the launch-kit duels to upload-ready 9:16 MP4s by playing them in headless Chrome
// and saving the game's own clip (same frames and sound a player would get), then re-encoding
// to 1080x1920 H.264/AAC with ffmpeg.
//
//   node tools/render-clips.mjs                 # all duels, en + zh-TW
//   node tools/render-clips.mjs 1 en            # one duel, one language
//
// Needs Google Chrome (H.264 recording) and ffmpeg on PATH. Plays the live site so the end card
// shows the real URL; GoatCounter is blocked so renders don't count as visits.

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const SITE = "https://ballduelgame-dotcom.github.io/ball-duel/";
const OUT = "clips";

// docs/launch-kit.md: seed, weapons, winner
export const DUELS = [
  [1291, "bow,scythe", "bow"],
  [1354, "dagger,scythe", "dagger"],
  [1292, "scythe,sword", "sword"],
  [1237, "hammer,shuriken", "shuriken"],
  [1128, "bow,hammer", "bow"],
  [1243, "axe,sword", "axe"],
  [1193, "dagger,hammer", "dagger"],
  [1220, "shield,sword", "shield"],
  [1350, "bow,shield", "bow"],
  [1249, "shield,shuriken", "shield"],
];

const [onlyNum, onlyLang] = process.argv.slice(2);
const langs = onlyLang ? [onlyLang] : ["en", "zh-TW"];
const jobs = DUELS.map((d, i) => [i + 1, ...d])
  .filter(([n]) => !onlyNum || n === Number(onlyNum))
  .flatMap((d) => langs.map((l) => [...d, l]));

mkdirSync(join(OUT, "raw"), { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  args: ["--autoplay-policy=no-user-gesture-required"],
});

async function render([n, seed, weapons, winner, lang]) {
  const name = `${String(n).padStart(2, "0")}-${weapons.replace(",", "-vs-")}-${lang}`;
  const page = await browser.newPage({ viewport: { width: 540, height: 960 }, acceptDownloads: true });
  await page.route(/goatcounter|gc\.zgo\.at/, (r) => r.abort());
  // force the download path instead of the OS share sheet
  await page.addInitScript(() => Object.defineProperty(navigator, "canShare", { value: undefined }));
  await page.goto(`${SITE}?seed=${seed}&w=${weapons}&lang=${lang}`);
  await page.locator("button.pick").nth(weapons.split(",").indexOf(winner)).click();
  const save = page.locator("button.main").first();
  await save.waitFor({ state: "visible", timeout: 150_000 });
  const [dl] = await Promise.all([page.waitForEvent("download"), save.click()]);
  const raw = join(OUT, "raw", `${name}.${dl.suggestedFilename().split(".").pop()}`);
  await dl.saveAs(raw);
  await page.close();
  // constant 30 fps, 1080x1920, platform-friendly H.264 + AAC with the index at the front
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", raw,
    "-vf", "scale=1080:1920:flags=lanczos,fps=30", "-c:v", "libx264", "-preset", "slow", "-crf", "18",
    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart",
    join(OUT, `${name}.mp4`)]);
  console.log(`done ${name}`);
}

// two at a time: real-time playback, more in parallel risks dropped frames
const queue = [...jobs];
await Promise.all([0, 1].map(async () => {
  while (queue.length) await render(queue.shift());
}));
await browser.close();
if (!onlyNum) rmSync(join(OUT, "raw"), { recursive: true, force: true });
