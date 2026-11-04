// Run against `npm run dev`: validates presentation without changing or uploading content.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const origin = process.env.BALL_DUEL_URL ?? "http://127.0.0.1:5173";
mkdirSync("clips/arcade-qa", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", args: ["--autoplay-policy=no-user-gesture-required"] });
const report = { errors: [], sizes: [], languages: [], seeds: [], audio: null, flow: null };
try {
  const page = await browser.newPage({ acceptDownloads: true });
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.route(/goatcounter|gc\.zgo\.at/, (r) => r.abort());
  await page.addInitScript(() => Object.defineProperty(navigator, "canShare", { value: undefined }));
  for (const [width, height] of [[360, 640], [390, 844], [590, 1280]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${origin}/?seed=1220&w=shield,sword&lang=zh-TW`);
    await page.locator("button.pick").first().waitFor();
    await page.waitForTimeout(350); // Let the menu entrance transition settle before measuring.
    const bounds = await page.locator("#panel").boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y >= 0 && bounds.y + bounds.height <= height);
    report.sizes.push({ width, height, panel: bounds });
    await page.screenshot({ path: `clips/arcade-qa/menu-${width}.png` });
  }
  const geometry = await page.evaluate(async () => {
    const { VIEW, W, H } = await import("/src/game/render.ts");
    return { x: VIEW.x + VIEW.size / 2, y: VIEW.y + VIEW.size / 2, expectedX: W / 2, expectedY: H / 2 };
  });
  assert.equal(geometry.x, geometry.expectedX); assert.equal(geometry.y, geometry.expectedY);
  report.geometry = geometry;
  report.seeds = await page.evaluate(async () => {
    const { Sim } = await import("/src/game/sim.ts");
    const { Renderer, ARENA } = await import("/src/game/render.ts");
    const { playbackRate } = await import("/src/core/presentation.ts");
    const duels = [[1291,"bow","scythe","bow"],[1354,"dagger","scythe","dagger"],[1292,"scythe","sword","sword"],
      [1237,"hammer","shuriken","shuriken"],[1128,"bow","hammer","bow"],[1243,"axe","sword","axe"],
      [1193,"dagger","hammer","dagger"],[1220,"shield","sword","shield"],[1350,"bow","shield","bow"],[1249,"shield","shuriken","shield"]];
    return duels.map(([seed,a,b,expected]) => {
      const fighters = [{kind:a,color:"#ff5d73"},{kind:b,color:"#ffd34d"}];
      const base = new Sim(ARENA, fighters, seed), edited = new Sim(ARENA, fighters, seed);
      for (let i = 0; !base.winner && i < 21600; i++) { base.step(1/120); base.events.length = 0; }
      const view = new Renderer(document.createElement("canvas").getContext("2d"), { title: () => "", url: "", shorts: true });
      let acc = 0, wall = 0;
      while (!edited.winner && wall < 180) {
        acc += 1/30 * playbackRate(edited, true); wall += 1/30;
        while (acc >= 1/120) { edited.step(1/120); acc -= 1/120; }
        view.consume(edited.events, edited); view.update(1/30);
      }
      const state = (s) => JSON.stringify({ time:s.time,balls:s.balls,shots:s.shots });
      return { seed, expected, actual: edited.winner?.weapon.def.kind, hp: edited.winner?.hp,
        exactState: state(base) === state(edited), simulationSeconds: base.time, editedFightSeconds: wall };
    });
  });
  for (const seed of report.seeds) { assert.equal(seed.actual, seed.expected); assert.ok(seed.exactState); }
  const languages = await page.evaluate(async () => (await import("/src/i18n.ts")).LANGS);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const lang of languages) {
    await page.goto(`${origin}/?seed=1354&w=dagger,scythe&lang=${lang}`);
    const cards = page.locator("button.pick");
    await cards.first().waitFor();
    assert.equal(await cards.count(), 2);
    const bounds = await page.locator("#panel").boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
    report.languages.push(lang);
  }
  report.audio = await page.evaluate(async () => {
    const { Sfx } = await import("/src/core/sfx.ts");
    const originalSet = window.setInterval, originalClear = window.clearInterval, timers = new Set();
    window.setInterval = (...args) => { const id = originalSet(...args); timers.add(id); return id; };
    window.clearInterval = (id) => { timers.delete(id); return originalClear(id); };
    const sfx = new Sfx(); sfx.unlock();
    for (let i = 0; i < 5; i++) sfx.startMusic();
    const active = timers.size, tracks = sfx.track ? 1 : 0;
    sfx.muted = true; sfx.stopMusic();
    const afterStop = timers.size;
    window.setInterval = originalSet; window.clearInterval = originalClear;
    return { active, afterStop, tracks, muted: sfx.muted };
  });
  assert.equal(report.audio.active, 1); assert.equal(report.audio.afterStop, 0); assert.equal(report.audio.tracks, 1);
  await page.goto(`${origin}/?seed=1220&w=shield,sword&lang=en`);
  await page.locator("button.pick").first().click();
  await page.waitForTimeout(3500);
  assert.equal(await page.locator("body").getAttribute("data-phase"), "fight");
  assert.ok(await page.locator("#panel").isHidden());
  await page.screenshot({ path: "clips/arcade-qa/live-fight.png" });
  await page.waitForFunction(() => document.body.dataset.phase === "done", undefined, { timeout: 110_000 });
  await page.locator("button.main").first().waitFor({ state: "visible" });
  await page.waitForTimeout(350);
  await page.screenshot({ path: "clips/arcade-qa/result.png" });
  const [download] = await Promise.all([page.waitForEvent("download"), page.locator("button.main").first().click()]);
  await download.saveAs("clips/arcade-qa/live-game-recording.mp4");
  await page.getByText("▶ Watch again", { exact: true }).click();
  assert.equal(await page.locator("body").getAttribute("data-phase"), "intro");
  report.flow = { selection: "pass", fight: "pass", result: "pass", save: "pass", replay: "pass" };
  assert.deepEqual(report.errors, []);
  writeFileSync("clips/arcade-verification.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  writeFileSync("clips/arcade-verification.json", JSON.stringify(report, null, 2));
  await browser.close();
}
