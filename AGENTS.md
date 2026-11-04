# AGENTS.md — Ball Duel

這份檔案給所有在這個 repo 工作的 AI agent（Codex、Claude Code 等）。Codex 會自動讀 `AGENTS.md`，Claude Code 透過 `CLAUDE.md` 匯入這份。**這個 repo 是公開的**：不要在任何被 commit 的檔案寫入私人資訊（見「安全」）。

## 開工前、收工後（共同記憶）

共同記憶放在 `.agents/`（已 gitignore，只存在這台電腦，不會公開）：

| 檔案 | 用途 | 怎麼寫 |
|---|---|---|
| `.agents/GOAL.md` | 目標、里程碑、成功和停損條件、agent 能自己做到哪 | 只有使用者能改 |
| `.agents/STATE.md` | 現在進度、下一步、等誰 | 直接改成最新狀態 |
| `.agents/TASKS.md` | 任務板，誰負責哪件事 | 開工前認領，完成後勾掉 |
| `.agents/LOG.md` | 工作紀錄 | 只往下加，不改舊的 |
| `.agents/DECISIONS.md` | 已定案的決定和原因 | 只往下加；推翻舊決定要寫新的一條 |
| `.agents/private.md` | 帳號、私人設定、不能公開的事 | 必要時更新 |

**流程**
1. 開工：讀 `GOAL.md`、`STATE.md`、`TASKS.md`、`DECISIONS.md`（需要帳號資訊才讀 `private.md`），再 `git pull --rebase`。
2. 認領：在 `TASKS.md` 把任務標成 `[進行中 codex]` 或 `[進行中 claude]`。別人已認領的、或會改到同一批檔案的，不要碰。
3. 收工：更新 `STATE.md`，在 `LOG.md` 加一行（日期、agent、做了什麼、commit、還沒做完的），任務打勾，commit 並 push 程式碼。
4. 不要推翻 `DECISIONS.md` 的決定，除非使用者說要改。

## 專案

每日「球球武器對決」網頁遊戲：兩顆帶武器的球在場地裡打，玩家押贏家，結束後可存 9:16 短片分享。目標是做出全球有機會爆紅的產品，現在在**一週發片驗證**階段（見 `docs/launch-kit.md`）。

- 線上：https://ballduelgame-dotcom.github.io/ball-duel/（push 到 main 會自動部署，GitHub Actions → Pages）
- Vite 6 + TypeScript（vanilla），沒有框架；畫布 720×1280
- `src/game/sim.ts` 物理和武器，`src/game/render.ts` 繪圖，`src/main.ts` 流程和 UI
- `src/core/` 錄影、音效、分享、統計（GoatCounter），`src/i18n.ts` 10 種語言
- `tools/render-clips.mjs` 用無頭 Chrome 產生發文短片到 `clips/`（gitignore）
- `tools/youtube.mjs` 上傳到 YouTube、抓播放數（設定見 `docs/youtube-setup.md`）
- `docs/captions.md` 每支片的標題和說明，`docs/launch-kit.md` 驗證計畫與停損條件

## 指令

```bash
npm run dev                         # 本機開發 http://localhost:5173
npm run build                       # tsc + vite build（commit 前要過）
node tools/render-clips.mjs         # 產生 20 支片（約 12 分鐘）
node tools/render-clips.mjs 3 en    # 只做第 3 場英文版
node tools/youtube.mjs upload 02 --dry-run
node tools/youtube.mjs stats
```

## 程式慣例（改之前一定要看）

- **模擬必須跨瀏覽器完全一致**：同一個 seed 在 iPhone、Android、桌機要打出同一場。`sim.ts` 裡只能用 IEEE 精確運算（+ − × ÷ sqrt），三角函數和 hypot 用檔案裡的 `dsin`／`dcos`／`dhypot`，不要用 `Math.sin`、`Math.cos`、`Math.hypot`、`Math.random`（亂數用 `rng(seed)`）。
- 改了武器數值或物理，`docs/launch-kit.md` 的 10 場「大逆轉」seed 結果可能會變，要重新確認贏家，或不要改。
- TypeScript 開了 `erasableSyntaxOnly`：不能用 constructor 參數屬性（`constructor(private x)`），要寫成明確欄位。
- 新增任何介面文字要加到 `src/i18n.ts` 全部 10 種語言；預設語言是繁體中文（zh-TW）。
- 註解密度和命名跟著周圍的程式碼走。

## Git

- 這個 repo 已經設好本機的作者（Ball Duel）和 push 帳號，直接 `git commit`、`git push` 就好，不要改 `git config`。
- commit 訊息最後加上自己的署名，例如 `Co-Authored-By: Codex <noreply@openai.com>` 或 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。
- push 前先 `git pull --rebase`。不要 force push，不要改寫已 push 的歷史。
- 要用 `gh` 操作這個 repo（看 Actions、設變數）時，加上 `GH_TOKEN=$(gh auth token -u ballduelgame-dotcom)`，例如：`GH_TOKEN=$(gh auth token -u ballduelgame-dotcom) gh run list -R ballduelgame-dotcom/ball-duel`。不要用 `gh auth switch`。

## 安全

- 不要把密碼、token、OAuth 檔案、個人信箱、本機使用者名稱或開發者的其他帳號寫進會被 commit 的檔案。這些只放 `.agents/private.md`，憑證檔放 `%APPDATA%\ballduel\`。
- 不要讀出或印出憑證檔的內容。
- 註冊帳號、輸入密碼和驗證碼、同意條款、付款，一律停下來讓使用者自己操作。
- 不要用使用者的社群帳號發文、留言、按讚；上傳影片只在使用者明確要求時做。
