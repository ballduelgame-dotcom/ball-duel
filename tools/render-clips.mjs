// Renders the launch-kit duels to upload-ready 9:16 MP4s by playing them in headless Chrome
// drawing directly into a native 1080x1920 canvas before recording, then encoding H.264/AAC.
// Versioned filenames preserve the original clips and their YouTube upload records.
//
//   node tools/render-clips.mjs                 # all duels, en + zh-TW
//   node tools/render-clips.mjs 1 en            # one duel, one language
//   node tools/render-clips.mjs 2 en --shorts   # uncluttered safe-area layout + original music
//   node tools/render-clips.mjs 2 en --arcade   # centred cinematic arena, effects and edited pacing
//
// Needs Google Chrome (H.264 recording) and ffmpeg on PATH. Plays the live site so the end card
// shows the real URL; GoatCounter is blocked so renders don't count as visits.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { writeShortsMusic } from "./shorts-music.mjs";

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

const args = process.argv.slice(2);
const [onlyNum, onlyLang] = args.filter((a) => !a.startsWith("--"));
const arcade = args.includes("--arcade");
const shorts = arcade || args.includes("--shorts");
const variant = arcade ? "arcadev3" : shorts ? "shortsv2" : "native1080";
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
  const name = `${String(n).padStart(2, "0")}-${weapons.replace(",", "-vs-")}-${variant}-${lang}`;
  const output = join(OUT, `${name}.mp4`);
  if (existsSync(output)) throw new Error(`${output} already exists; archive it before re-rendering`);
  const page = await browser.newPage({ viewport: { width: 540, height: 960 }, acceptDownloads: true });
  const errors = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.error(`${name}: ${error.message}`);
  });
  await page.route(/goatcounter|gc\.zgo\.at/, (r) => r.abort());
  // force the download path instead of the OS share sheet
  await page.addInitScript(() => Object.defineProperty(navigator, "canShare", { value: undefined }));
  await page.addInitScript(() => {
    const OriginalRecorder = window.MediaRecorder;
    window.MediaRecorder = class extends OriginalRecorder {
      constructor(stream, options) {
        const track = stream.getVideoTracks()[0].getSettings();
        if (track.width !== 1080 || track.height !== 1920) throw new Error("Recording canvas is not native 1080x1920");
        super(stream, { ...options, videoBitsPerSecond: 16_000_000 });
      }
    };
  });
  await page.goto(`${SITE}?seed=${seed}&w=${weapons}&lang=${lang}${shorts ? "&format=shorts" : ""}`);
  if (shorts) {
    await page.waitForFunction(() => document.querySelector("#stage")?.dataset.format === "shorts");
  }
  if (arcade) {
    await page.waitForFunction(() => document.querySelector("#stage")?.dataset.presentation === "arcadev3");
  }
  const canvas = await page.locator("#stage").evaluate((canvas) => {
    const width = canvas.width;
    const height = canvas.height;
    if (width !== 720 || height !== 1280) throw new Error("Unexpected logical canvas size");
    canvas.width = 1080;
    canvas.height = 1920;
    // Scale vector drawing coordinates, not a previously rasterised 720p image.
    canvas.getContext("2d").setTransform(1080 / width, 0, 0, 1920 / height, 0, 0);
    return { width: canvas.width, height: canvas.height, logicalWidth: width, logicalHeight: height };
  });
  await page.locator("button.pick").nth(weapons.split(",").indexOf(winner)).click();
  const save = page.locator("button.main").first();
  await save.waitFor({ state: "visible", timeout: 150_000 });
  const [dl] = await Promise.all([page.waitForEvent("download"), save.click()]);
  const raw = join(OUT, "raw", `${name}.${dl.suggestedFilename().split(".").pop()}`);
  await dl.saveAs(raw);
  if (errors.length) throw new Error(errors.join("\n"));
  await page.close();
  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", raw], { encoding: "utf8" }));
  const video = probe.streams.find((s) => s.codec_type === "video");
  if (video?.width !== 1080 || video?.height !== 1920) throw new Error("Raw recording is not 1080x1920");
  // No spatial scaling: retain the native pixels through final encoding.
  const musicFile = join(OUT, "raw", `${name}-music.wav`);
  const music = shorts ? writeShortsMusic(musicFile, Number(probe.format.duration)) : undefined;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", raw,
    ...(shorts ? ["-i", musicFile, "-filter_complex",
      "[0:a]volume=1[fx];[1:a]volume=0.75[bgm];[fx][bgm]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-4:LRA=9[audio]",
      "-map", "0:v:0", "-map", "[audio]"] : []),
    "-vf", "fps=30", "-c:v", "libx264", "-preset", "slow", "-crf", "16",
    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart",
    output]);
  const finalProbe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", output], { encoding: "utf8" }));
  const finalVideo = finalProbe.streams.find((s) => s.codec_type === "video");
  const finalAudio = finalProbe.streams.find((s) => s.codec_type === "audio");
  if (finalVideo?.width !== 1080 || finalVideo?.height !== 1920 || finalVideo?.avg_frame_rate !== "30/1"
      || finalVideo?.codec_name !== "h264" || finalAudio?.codec_name !== "aac"
      || Math.abs(Number(finalProbe.format.duration) - Number(probe.format.duration)) > 0.25) {
    throw new Error("Final recording failed resolution, codec, frame rate or duration checks");
  }
  execFileSync("ffmpeg", ["-v", "error", "-xerror", "-i", output, "-f", "null", "-"], { stdio: ["ignore", "ignore", "pipe"] });
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify({ seed, weapons, winner, lang, canvas,
    variant, music,
    requestedVideoBitsPerSecond: 16_000_000, raw, output, rawVideo: video, finalVideo, finalAudio,
    rawDuration: probe.format.duration, finalDuration: finalProbe.format.duration, errors }, null, 2));
  console.log(`done ${name}`);
}

// Render sequentially: high-resolution recording competes for encoder resources.
const queue = [...jobs];
try {
  while (queue.length) await render(queue.shift());
} finally {
  await browser.close();
}
