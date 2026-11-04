// Offline boundary checks: executes the actual tracking module with a fake DOM and counter.
// No browser, credentials, or network requests. Run: node tools/verify-tracking.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/core/track.ts", import.meta.url), "utf8")
  .replace("import.meta.env.VITE_GOATCOUNTER", "globalThis.trackingCode");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const key = "ball-duel:analytics-off";
const checks = [];

function load(url, { storage = new Map(), code = "offline-test", blockedStorage = false,
  brokenCounter = false, brokenDOM = false, noCounter = false } = {}) {
  const scripts = [], events = [];
  const context = vm.createContext({
    exports: {}, URLSearchParams, trackingCode: code,
    window: {
      location: new URL(url),
      localStorage: {
        getItem(k) { if (blockedStorage) throw Error("storage denied"); return storage.get(k) ?? null; },
        setItem(k, v) { if (blockedStorage) throw Error("storage denied"); storage.set(k, v); },
        removeItem(k) { if (blockedStorage) throw Error("storage denied"); storage.delete(k); },
      },
      goatcounter: noCounter ? undefined : { count(v) { if (brokenCounter) throw Error("counter failed"); events.push(v); } },
    },
    document: {
      createElement(tag) { assert.equal(tag, "script"); return { dataset: {} }; },
      head: { append(script) { if (brokenDOM) throw Error("DOM denied"); scripts.push(script); } },
    },
  });
  vm.runInContext(compiled, context);
  context.exports.initTracking();
  for (const event of ["pick-daily", "finish", "save-clip", "share-shared", "share-copied"])
    context.exports.track(event);
  return { scripts, events, storage };
}

function suppressed(name, url, options) {
  const result = load(url, options);
  assert.equal(result.scripts.length, 0, `${name}: script must be absent`);
  assert.equal(result.events.length, 0, `${name}: events must be absent`);
  checks.push(name);
  return result;
}

for (const host of ["localhost", "qa.localhost", "127.0.0.1", "127.2.3.4", "[::1]", "0.0.0.0"])
  suppressed(`local ${host}`, `http://${host}:5173/`);
suppressed("file preview", "file:///preview/index.html");
suppressed("unset site code", "https://example.com/", { code: null });
// An explicit empty value represents an unconfigured Vite environment.
suppressed("empty site code", "https://example.com/", { code: "" });
const storage = new Map();
suppressed("QA URL", "https://example.com/?analytics=off", { storage });
assert.equal(storage.get(key), "1");
suppressed("persisted QA browser", "https://example.com/", { storage });
suppressed("QA storage denied", "https://example.com/?analytics=off", { blockedStorage: true });
suppressed("local storage denied", "http://localhost/", { blockedStorage: true });

for (const [name, url, options] of [
  ["ordinary player", "https://example.com/", {}],
  ["explicit restore", "https://example.com/?analytics=on", { storage }],
  ["player storage denied", "https://example.com/", { blockedStorage: true }],
  ["unknown flag does not exclude", "https://example.com/?analytics=no", {}],
  ["non-loopback domain", "https://127.example.com/", {}],
]) {
  const result = load(url, options);
  assert.equal(result.scripts.length, 1);
  assert.equal(result.scripts[0].src, "https://gc.zgo.at/count.js");
  assert.equal(result.scripts[0].dataset.goatcounter, "https://offline-test.goatcounter.com/count");
  assert.equal(result.scripts[0].async, true);
  assert.deepEqual(JSON.parse(JSON.stringify(result.events)),
    ["pick-daily", "finish", "save-clip", "share-shared", "share-copied"]
      .map((event) => ({ path: `event/${event}`, title: event, event: true })));
  checks.push(name);
}
assert.equal(storage.has(key), false);
for (const options of [{ brokenCounter: true }, { brokenDOM: true }, { noCounter: true }]) {
  assert.doesNotThrow(() => load("https://example.com/", options));
  checks.push(Object.keys(options)[0]);
}
console.log(JSON.stringify({ status: "pass", networkRequests: 0, checks }, null, 2));
