// Uploads the rendered clips to the Ball Duel YouTube channel and reads back their view counts.
// Titles/descriptions come from docs/captions.md; uploaded video ids are kept in clips/uploads.json
// so nothing is uploaded twice.
//
//   node tools/youtube.mjs auth                     # one-time: sign in as the channel, allow access
//   node tools/youtube.mjs upload 02 08             # upload clips 02 and 08 (English), as private
//   node tools/youtube.mjs upload 02 --lang zh-TW   # the Chinese version
//   node tools/youtube.mjs upload 02 --public       # public right away (only once the API project is audited)
//   node tools/youtube.mjs upload 02 --at 2026-11-05T20:00+08:00   # scheduled (also needs the audit)
//   node tools/youtube.mjs upload 02 --dry-run      # show what would be sent, no network
//   node tools/youtube.mjs upload 02 --variant native1080  # a separate upload; keeps the original
//   node tools/youtube.mjs upload 02 --variant shortsv2     # safe-area layout with original music
//   node tools/youtube.mjs stats                    # views / likes / comments of everything uploaded
//
// Credentials live outside the repo in %APPDATA%\ballduel (or ~/.config/ballduel):
//   client_secret.json  - OAuth "Desktop app" client downloaded from Google Cloud (docs/youtube-setup.md)
//   youtube-token.json  - written by `auth`; delete it to sign out

import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";

const CONF = process.env.APPDATA ? join(process.env.APPDATA, "ballduel") : join(homedir(), ".config", "ballduel");
const SECRET = join(CONF, "client_secret.json");
const TOKEN = join(CONF, "youtube-token.json");
const CLIPS = "clips";
const LOG = join(CLIPS, "uploads.json");
const SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"];
const GAMING = "20";

const die = (msg) => {
  console.error(msg);
  process.exit(1);
};
const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fallback);

// ---------- captions.md ----------

// "## 01 · ..." sections with "- **EN 標題**：`...`" lines
function loadCaptions() {
  const md = readFileSync("docs/captions.md", "utf8");
  const posts = {};
  for (const sec of md.split(/^## /m).slice(1)) {
    const num = sec.match(/^(\d{2}) ·/)?.[1];
    if (!num) continue;
    const field = (label) => sec.match(new RegExp(`\\*\\*${label}\\*\\*：\`([^\`]+)\``))?.[1];
    posts[num] = {
      en: { title: field("EN 標題"), description: field("EN 說明") },
      "zh-TW": { title: field("中文標題"), description: field("中文說明") },
    };
  }
  const pinned = {
    en: md.match(/英文：`(Play today[^`]+)`/)?.[1],
    "zh-TW": md.match(/中文：`(今天的對決[^`]+)`/)?.[1],
  };
  return { posts, pinned };
}

function videoMeta(num, lang) {
  const { posts, pinned } = loadCaptions();
  const post = posts[num]?.[lang];
  if (!post?.title || !post.description) die(`docs/captions.md has no ${lang} title/description for ${num}`);
  const tags = [...post.description.matchAll(/#(\S+)/g)].map((m) => m[1]).filter((t) => t !== "shorts");
  // the link goes in the description too: YouTube Shorts descriptions are one tap away
  const description = `${post.description}\n\n${pinned[lang]}`;
  return { title: post.title.slice(0, 100), description, tags };
}

function clipFile(num, lang, variant) {
  const pattern = new RegExp(`^${num}-[a-z]+-vs-[a-z]+${variant ? `-${variant}` : ""}-${lang}\\.mp4$`);
  const f = readdirSync(CLIPS).find((n) => pattern.test(n));
  if (!f) die(`no clips/${num}-*-${lang}.mp4 (run: node tools/render-clips.mjs ${Number(num)} ${lang})`);
  return join(CLIPS, f);
}

// ---------- OAuth (installed app, loopback + PKCE) ----------

function client() {
  if (!existsSync(SECRET)) die(`missing ${SECRET}\nsee docs/youtube-setup.md`);
  const c = JSON.parse(readFileSync(SECRET, "utf8"));
  return c.installed ?? c.web ?? die(`${SECRET} is not an OAuth client file`);
}

function openBrowser(url) {
  const [cmd, args] = process.platform === "win32" ? ["rundll32", ["url.dll,FileProtocolHandler", url]]
    : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  execFile(cmd, args, () => {});
}

async function tokenRequest(params) {
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams(params) });
  const j = await r.json();
  if (!r.ok) die(`token error: ${j.error} ${j.error_description ?? ""}`);
  return j;
}

async function auth() {
  const { client_id, client_secret } = client();
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(16).toString("hex");
  const server = createServer();
  await new Promise((res) => server.listen(0, "127.0.0.1", res));
  const redirect = `http://127.0.0.1:${server.address().port}`;
  const url = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
    client_id, redirect_uri: redirect, response_type: "code", scope: SCOPES.join(" "),
    access_type: "offline", prompt: "consent", state, code_challenge: challenge, code_challenge_method: "S256",
  });
  console.log(`Sign in with the Ball Duel Google account (ballduel.game@gmail.com):\n${url}\n`);
  openBrowser(url);
  const code = await new Promise((resolve, reject) => {
    server.on("request", (req, res) => {
      const q = new URL(req.url, redirect).searchParams;
      if (!q.get("code") && !q.get("error")) return res.end();
      res.end(q.get("code") ? "Ball Duel: signed in, you can close this tab." : `Sign-in failed: ${q.get("error")}`);
      server.close();
      if (q.get("state") !== state) reject(new Error("state mismatch"));
      else if (q.get("error")) reject(new Error(q.get("error")));
      else resolve(q.get("code"));
    });
  });
  const t = await tokenRequest({
    client_id, client_secret, code, code_verifier: verifier, redirect_uri: redirect, grant_type: "authorization_code",
  });
  if (!t.refresh_token) die("Google returned no refresh token; remove the app's access at myaccount.google.com/permissions and retry");
  mkdirSync(CONF, { recursive: true });
  writeFileSync(TOKEN, JSON.stringify({ refresh_token: t.refresh_token, scope: t.scope }, null, 2));
  const ch = await api("GET", "channels?part=snippet&mine=true", t.access_token);
  console.log(`saved ${TOKEN}\nchannel: ${ch.items?.[0]?.snippet?.title ?? "(none found)"} ${ch.items?.[0]?.snippet?.customUrl ?? ""}`);
}

async function accessToken() {
  const saved = readJson(TOKEN, null) ?? die("not signed in: node tools/youtube.mjs auth");
  const { client_id, client_secret } = client();
  const t = await tokenRequest({ client_id, client_secret, refresh_token: saved.refresh_token, grant_type: "refresh_token" });
  return t.access_token;
}

async function api(method, path, token, body) {
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body && { "Content-Type": "application/json" }) },
    body: body && JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) die(`YouTube API ${r.status}: ${j.error?.message ?? JSON.stringify(j)}`);
  return j;
}

// ---------- commands ----------

async function upload(nums, { lang, variant, privacy, at, dryRun }) {
  const log = readJson(LOG, {});
  const token = dryRun ? null : await accessToken();
  for (const n of nums) {
    const num = n.padStart(2, "0");
    const file = clipFile(num, lang, variant);
    const key = file.replace(/^.*[\\/]/, "");
    if (log[key]) {
      console.log(`skip ${key}: already uploaded https://youtube.com/shorts/${log[key].id}`);
      continue;
    }
    const meta = videoMeta(num, lang);
    const body = {
      snippet: { ...meta, categoryId: GAMING, defaultLanguage: lang },
      status: {
        privacyStatus: at ? "private" : privacy,
        ...(at && { publishAt: new Date(at).toISOString() }),
        selfDeclaredMadeForKids: false,
        embeddable: true,
      },
    };
    if (dryRun) {
      console.log(`--- ${key} (${(statSync(file).size / 1e6).toFixed(1)} MB)\n${JSON.stringify(body, null, 2)}`);
      continue;
    }
    const size = statSync(file).size;
    const start = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, "Content-Type": "application/json",
          "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": String(size),
        },
        body: JSON.stringify(body),
      },
    );
    if (!start.ok) die(`upload start ${start.status}: ${await start.text()}`);
    const put = await fetch(start.headers.get("location"), {
      method: "PUT", headers: { "Content-Type": "video/mp4", "Content-Length": String(size) }, body: readFileSync(file),
    });
    const v = await put.json();
    if (!put.ok) die(`upload ${put.status}: ${v.error?.message ?? JSON.stringify(v)}`);
    log[key] = { id: v.id, uploadedAt: new Date().toISOString(), privacy: v.status?.privacyStatus, title: meta.title };
    writeFileSync(LOG, JSON.stringify(log, null, 2));
    console.log(`uploaded ${key} -> https://youtube.com/shorts/${v.id} (${v.status?.privacyStatus})`);
  }
}

async function stats() {
  const log = readJson(LOG, {});
  const ids = Object.values(log).map((v) => v.id);
  const token = await accessToken();
  if (!ids.length) {
    await api("GET", "channels?part=id&mine=true", token);
    console.log("nothing uploaded yet");
    return;
  }
  const byId = {};
  for (let i = 0; i < ids.length; i += 50) {
    const j = await api("GET", `videos?part=statistics,status,processingDetails,fileDetails&id=${ids.slice(i, i + 50).join(",")}`, token);
    for (const v of j.items) byId[v.id] = v;
  }
  const rows = Object.entries(log).map(([file, u]) => {
    const v = byId[u.id];
    const s = v?.statistics ?? {};
    const source = v?.fileDetails?.videoStreams?.[0];
    return { file, privacy: v?.status?.privacyStatus ?? "gone", views: +(s.viewCount ?? 0),
      processing: v?.processingDetails?.processingStatus ?? "unknown",
      source: source ? `${source.widthPixels}x${source.heightPixels}` : "unknown",
      likes: +(s.likeCount ?? 0), comments: +(s.commentCount ?? 0), url: `https://youtube.com/shorts/${u.id}` };
  });
  console.table(rows);
  const best = Math.max(...rows.map((r) => r.views));
  console.log(`best clip: ${best} views (stop-loss line is 10,000 within 7 days)`);
}

// ---------- cli ----------

const [cmd, ...rest] = process.argv.slice(2);
const flag = (name) => rest.includes(`--${name}`);
const opt = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};
const nums = rest.filter((a, i) => /^\d{1,2}$/.test(a) && !rest[i - 1]?.startsWith("--"));

if (cmd === "auth") await auth();
else if (cmd === "upload") {
  if (!nums.length) die("which clips? e.g. node tools/youtube.mjs upload 02 08");
  const at = opt("at");
  const variant = opt("variant");
  if (flag("variant") && !["native1080", "shortsv2"].includes(variant)) die("--variant must be native1080 or shortsv2");
  if (at && Number.isNaN(Date.parse(at))) die(`bad --at time: ${at}`);
  await upload(nums, { lang: opt("lang") ?? "en", variant, privacy: flag("public") ? "public" : "private", at, dryRun: flag("dry-run") });
} else if (cmd === "stats") await stats();
else die(readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).slice(0, 13).join("\n"));
