// Renders the launch-kit duels to upload-ready 9:16 MP4s by playing them in headless Chrome
// drawing directly into a native 1080x1920 canvas before recording, then encoding H.264/AAC.
// Versioned filenames preserve the original clips and their YouTube upload records.
//
//   node tools/render-clips.mjs                 # all duels, en + zh-TW
//   node tools/render-clips.mjs 1 en            # one duel, one language
//   node tools/render-clips.mjs 2 en --shorts   # uncluttered safe-area layout + original music
//   node tools/render-clips.mjs 2 en --arcade   # centred cinematic arena, effects and edited pacing
//   node tools/render-clips.mjs 7 en --arcade --encode-only # reuse an existing WebM raw; no browser
//
// Needs Google Chrome (WebM recording) and ffmpeg on PATH. Plays the live site so the end card
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
const encodeOnly = args.includes("--encode-only");
const [onlyNum, onlyLang] = args.filter((a) => !a.startsWith("--"));
const arcade = args.includes("--arcade");
const shorts = arcade || args.includes("--shorts");
const variant = arcade ? "arcadev3" : shorts ? "shortsv2" : "native1080";
const langs = onlyLang ? [onlyLang] : ["en", "zh-TW"];
const jobs = DUELS.map((d, i) => [i + 1, ...d])
  .filter(([n]) => !onlyNum || n === Number(onlyNum))
  .flatMap((d) => langs.map((l) => [...d, l]));

mkdirSync(join(OUT, "raw"), { recursive: true });
const browser = encodeOnly ? null : await chromium.launch({
  channel: "chrome",
  args: ["--autoplay-policy=no-user-gesture-required"],
});

async function render([n, seed, weapons, winner, lang]) {
  const name = `${String(n).padStart(2, "0")}-${weapons.replace(",", "-vs-")}-${variant}-${lang}`;
  const output = join(OUT, `${name}.mp4`);
  if (existsSync(output)) throw new Error(`${output} already exists; archive it before re-rendering`);
  let sourceScript = null;
  let canvas = { width: 1080, height: 1920, logicalWidth: 720, logicalHeight: 1280 };
  let raw = join(OUT, "raw", `${name}.webm`);
  if (!encodeOnly) {
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
      // Avoid the 30fps capture clock repeatedly missing variable-rate animation frames.
      // Oversample native drawings, then select a constant 30fps during final encoding.
      const capture = HTMLCanvasElement.prototype.captureStream;
      HTMLCanvasElement.prototype.captureStream = function () { return capture.call(this, 60); };
      const OriginalRecorder = window.MediaRecorder;
      window.MediaRecorder = class extends OriginalRecorder {
        // Chrome MP4 capture can lose the tail while audio continues. Record WebM,
        // then transcode only after checking coverage of both streams.
        static isTypeSupported(type) {
          return type === "video/webm" && OriginalRecorder.isTypeSupported(type);
        }
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
    sourceScript = await page.locator('script[type="module"]').getAttribute("src");
    canvas = await page.locator("#stage").evaluate((canvas) => {
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
    raw = join(OUT, "raw", `${name}.${dl.suggestedFilename().split(".").pop()}`);
    await dl.saveAs(raw);
    if (errors.length) throw new Error(errors.join("\n"));
    await page.close();
  }
  if (!existsSync(raw)) throw new Error(`Missing raw recording: ${raw}`);
  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", raw], { encoding: "utf8" }));
  const video = probe.streams.find((s) => s.codec_type === "video");
  const audio = probe.streams.find((s) => s.codec_type === "audio");
  if (video?.width !== 1080 || video?.height !== 1920) throw new Error("Raw recording is not 1080x1920");
  const packets = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_packets",
    "-show_entries", "packet=stream_index,pts_time,duration_time", "-of", "json", raw], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })).packets;
  const endTime = (index) => Math.max(...packets.filter((p) => p.stream_index === index)
    .map((p) => Number(p.pts_time) + Number(p.duration_time ?? 0)));
  const videoEnd = endTime(video.index), audioEnd = audio ? endTime(audio.index) : NaN;
  if (!Number.isFinite(videoEnd) || !Number.isFinite(audioEnd) || Math.abs(videoEnd - audioEnd) > 0.25)
    throw new Error(`Raw audiovisual coverage mismatch: video=${videoEnd}s audio=${audioEnd}s`);
  // Streaming WebM may omit duration headers. Its packet timestamps remain authoritative.
  const rawDuration = Math.max(videoEnd, audioEnd) - Math.min(...packets.map((p) => Number(p.pts_time)));
  const rawFps = Number(video.nb_read_frames) / rawDuration;
  if (!Number.isFinite(rawFps) || rawFps < 27) throw new Error(`Raw capture is only ${rawFps.toFixed(1)} fps; optimise before encoding`);
  // No spatial scaling: retain the native pixels through final encoding.
  const musicFile = join(OUT, "raw", `${name}-music.wav`);
  const music = shorts ? writeShortsMusic(musicFile, rawDuration) : undefined;
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
  const finalVideoDuration = Number(finalVideo?.duration), finalAudioDuration = Number(finalAudio?.duration);
  if (finalVideo?.width !== 1080 || finalVideo?.height !== 1920 || finalVideo?.avg_frame_rate !== "30/1"
      || finalVideo?.codec_name !== "h264" || finalAudio?.codec_name !== "aac"
      || !Number.isFinite(finalVideoDuration) || !Number.isFinite(finalAudioDuration)
      || Math.abs(finalVideoDuration - finalAudioDuration) > 0.25
      || Math.abs(Number(finalProbe.format.duration) - rawDuration) > 0.25) {
    throw new Error("Final recording failed resolution, codec, frame rate or duration checks");
  }
  execFileSync("ffmpeg", ["-v", "error", "-xerror", "-i", output, "-f", "null", "-"], { stdio: ["ignore", "ignore", "pipe"] });
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify({ seed, weapons, winner, lang, canvas,
    variant, music, sourceScript, recordedAt: encodeOnly ? null : new Date().toISOString(), encodedAt: new Date().toISOString(),
    rawFps, coverage: { videoEnd, audioEnd }, reusedRaw: encodeOnly,
    requestedVideoBitsPerSecond: 16_000_000, captureFps: 60, raw, output, rawVideo: video, finalVideo, finalAudio,
    rawDuration, finalDuration: finalProbe.format.duration, errors: encodeOnly ? null : [] }, null, 2));
  console.log(`done ${name}`);
}

// Render sequentially: high-resolution recording competes for encoder resources.
const queue = [...jobs];
try {
  while (queue.length) await render(queue.shift());
} finally {
  await browser?.close();
}
