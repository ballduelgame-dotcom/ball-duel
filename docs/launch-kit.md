# Ball Duel 一週驗證發文工具包

目標：7 天內發 10 支 9:16 短片，取得陌生人觀看、進入遊戲和主動分享的證據。2026-11-04 使用者已授權 agent 在以下 Ball Duel 官方帳號發布經品質審查的產品素材、導流留言與置頂；只限本產品。登入、驗證碼、同意條款、付款和平台要求本人操作的步驟仍由使用者處理。

## 停損條件（先講好）

沿用已核定的 7 天驗證條件，不因新版畫面或重新上傳而重算起點。

**繼續訊號：任一條成立即可。**

- 有一支片超過 **1 萬播放**。
- 有陌生人的留言問「遊戲叫什麼／在哪玩」。
- GoatCounter 出現陌生人的 `save-clip` 或 `share-*` 事件。

**停損：觀察滿 7 天，沒有任何影片超過 1 萬播放，而且沒有陌生人存片或分享，才觸發停損審議。** 若已有上述詢問遊戲的留言，應列為繼續訊號，不可只因播放數低就判停損。第 7 天整理完整證據與繼續／調整／停損建議，交使用者決定；agent 不自行更改門檻或重大方向。資料缺失、流量身分不明與未完整執行的發片計畫須單獨列出，不可當成零需求。

## 官方帳號（2026-11-03 開好）

| 平台 | 帳號 | 網址 |
|---|---|---|
| YouTube | @ballduelgame | https://www.youtube.com/@ballduelgame |
| TikTok | @ballduel | https://www.tiktok.com/@ballduel |
| Instagram | @ballduelgame | https://www.instagram.com/ballduelgame/ |
| Threads | @ballduelgame | https://www.threads.com/@ballduelgame |

登入資訊只保存在本機私人紀錄。TikTok 沿用已決定的個人帳號；各平台發文前確認現有登入與上傳能力。Instagram 網站連結若仍缺少，交使用者在手機 App → 編輯個人檔案 → 連結 補上。

## 第 0 步：打開流量統計（已完成）

GoatCounter 代號 `ballduel`。發片前（10/27–11/03）的 5 筆 visits 都是測試，計算時扣掉。

已使用 `ballduel` 站點；部署變數為 `GOATCOUNTER_CODE`，程式讀取 `VITE_GOATCOUNTER`。在官方統計後台讀取以下事件：

   - `pick-daily`／`pick-random`：有人開打
   - `finish`：看完一整場
   - `save-clip`：按下儲存 9:16 短片；現有實作在分享／下載完成前計數，不能證明檔案已存入相簿
   - `share-shared`／`share-copied`：系統分享 API 完成／結果已複製；不能證明接收者已收到或開啟
   - `lang-xx`：切換語言

`share-failed` 是失敗，不可算作分享成功。上述成功條件的 `share-*` 僅採成功事件；`save-clip` 依既定門檻保留為存片意圖訊號，報告時須說明它的實作限制。

每份快照記錄擷取時間、統計期間、來源、排除方式與未知項。agent 錄片已由 `tools/render-clips.mjs` 阻擋 GoatCounter；其他 QA、開發者與自測也必須排除。過去未排除或無法判定身分的事件標為「來源未明」，不能算作陌生人成功訊號。播放、讚和留言數可能包含測試者，須另列已知自測；影片總播放數不等於陌生玩家數。

目前事件是操作次數，不能直接當作獨立玩家漏斗或回訪率。缺少可驗證的來源歸因、重玩與回訪資料時標為未量測；沒有完播資料、付款意願或收入證據時也不得以播放數代替。

## 第 1 步：錄 10 支片（每支約 1 分鐘）

這 10 場是用模擬從 36 種武器組合、每種 400 場裡挑出來的**大逆轉**：贏家都曾落後 49–99 HP，最後只剩 1–10 HP 獲勝。連結會重播完全同一場（已改成跨瀏覽器一致的物理運算，iPhone 和 Android 結果相同）。

錄法：用手機打開連結 → 押**贏家**（片尾會出現「我押中了 ✅」）→ 等打完 → 按「🎬 儲存 9:16 短片」→ 存到相簿。

| # | 對戰 | 連結 | 贏家（押這個） | 戲劇性 | 長度 |
|---|---|---|---|---|---|
| 1 | 弓 vs 鐮刀 | [英文版](https://ballduelgame-dotcom.github.io/ball-duel/?seed=1291&w=bow,scythe&lang=en) · [中文版](https://ballduelgame-dotcom.github.io/ball-duel/?seed=1291&w=bow,scythe&lang=zh-TW) | 弓（Bow） | 剩 1 HP，曾落後 86 | 50 秒 |
| 2 | 匕首 vs 鐮刀 | [英文版](https://ballduelgame-dotcom.github.io/ball-duel/?seed=1354&w=dagger,scythe&lang=en) · [中文版](https://ballduelgame-dotcom.github.io/ball-duel/?seed=1354&w=dagger,scythe&lang=zh-TW) | 匕首（Dagger） | 剩 1 HP，曾落後 99 | 53 秒 |
| 3 | 鐮刀 vs 劍 | [英文版](https://ballduelgame-dotcom.github.io/ball-duel/?seed=1292&w=scythe,sword&lang=en) · [中文版](https://ballduelgame-dotcom.github.io/ball-duel/?seed=1292&w=scythe,sword&lang=zh-TW) | 劍（Sword） | 剩 1 HP，曾落後 84 | 52 秒 |
| 4 | 戰鎚 vs 飛鏢 | [英文版](https://ballduelgame-dotcom.github.io/ball-duel/?seed=1237&w=hammer,shuriken&lang=en) · [中文版](https://ballduelgame-dotcom.github.io/ball-duel/?seed=1237&w=hammer,shuriken&lang=zh-TW) | 飛鏢（Shuriken） | 剩 4 HP，曾落後 96 | 51 秒 |
| 5 | 弓 vs 戰鎚 | [英文版](https://ballduelgame-dotcom.github.io/ball-duel/?seed=1128&w=bow,hammer&lang=en) · [中文版](https://ballduelgame-dotcom.github.io/ball-duel/?seed=1128&w=bow,hammer&lang=zh-TW) | 弓（Bow） | 剩 3 HP，曾落後 73 | 49 秒 |
| 6 | 斧頭 vs 劍 | [英文版](https://ballduelgame-dotcom.github.io/ball-duel/?seed=1243&w=axe,sword&lang=en) · [中文版](https://ballduelgame-dotcom.github.io/ball-duel/?seed=1243&w=axe,sword&lang=zh-TW) | 斧頭（Axe） | 剩 1 HP，曾落後 62 | 45 秒 |
| 7 | 匕首 vs 戰鎚 | [英文版](https://ballduelgame-dotcom.github.io/ball-duel/?seed=1193&w=dagger,hammer&lang=en) · [中文版](https://ballduelgame-dotcom.github.io/ball-duel/?seed=1193&w=dagger,hammer&lang=zh-TW) | 匕首（Dagger） | 剩 4 HP，曾落後 92 | 49 秒 |
| 8 | 盾牌 vs 劍 | [英文版](https://ballduelgame-dotcom.github.io/ball-duel/?seed=1220&w=shield,sword&lang=en) · [中文版](https://ballduelgame-dotcom.github.io/ball-duel/?seed=1220&w=shield,sword&lang=zh-TW) | 盾牌（Shield） | 剩 1 HP，曾落後 60 | 43 秒 |
| 9 | 弓 vs 盾牌 | [英文版](https://ballduelgame-dotcom.github.io/ball-duel/?seed=1350&w=bow,shield&lang=en) · [中文版](https://ballduelgame-dotcom.github.io/ball-duel/?seed=1350&w=bow,shield&lang=zh-TW) | 弓（Bow） | 剩 2 HP，曾落後 90 | 48 秒 |
| 10 | 盾牌 vs 飛鏢 | [英文版](https://ballduelgame-dotcom.github.io/ball-duel/?seed=1249&w=shield,shuriken&lang=en) · [中文版](https://ballduelgame-dotcom.github.io/ball-duel/?seed=1249&w=shield,shuriken&lang=zh-TW) | 盾牌（Shield） | 剩 10 HP，曾落後 49 | 53 秒 |

建議 TikTok、YouTube Shorts 用**英文版**（全球觀眾），Threads、IG Reels 可以英文版和中文版各試一次，比較哪邊反應好。

## 第 2 步：發文

**平台優先順序**：YouTube Shorts（這個格式的源頭在這裡，搜尋也會帶流量）→ TikTok → IG Reels。同一支片三個平台都可以發。

**時間**：7 天內發完 10 支，每天 1–2 支，每天固定時間發。

**標題與說明範本**：新版精簡影片無畫面網址，遊戲入口放官方帳號個人檔案、說明或導流留言。逐平台實際檢查入口是否可用；不能假設說明或留言的文字網址一定可點擊。

- 英文：`Who wins? 🏹 vs 💀 (comment before it ends)` ／ `It was 1 HP… 😳 #ballbattle #satisfying #whowins`
- 中文：`誰會贏？留言押一邊再看完 👀` ／ `剩 1 HP 的逆轉… #球球對決 #誰會贏`
- 日文：`どっちが勝つ？コメントで予想してね 👇 #ボールバトル`

**hashtag**：`#ballbattle #weaponball #whowins #satisfying #simulation`（中文加 `#球球對決`）

**留言區**：發文後第一則留言自己貼網址「今天的對決在這裡玩：ballduelgame-dotcom.github.io/ball-duel」，並回覆每一則「遊戲叫什麼」的留言。

## 第 3 步：記錄（每支片發文後 24 小時與 72 小時各記一次）

| # | 平台 | 發文日期 | 24h 播放 | 72h 播放 | 留言數 | 問「遊戲名／在哪玩」的留言數 |
|---|---|---|---|---|---|---|
| 1 |  |  |  |  |  |  |
| 2 | YouTube Shorts（英文，原生 1080p） | 2026-11-04 10:16:30 +08:00 | 待 24h | 待 72h | 0（發布基準） | 尚未檢查 |
| 3 |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |
| 5 |  |  |  |  |  |  |
| 6 |  |  |  |  |  |  |
| 7 |  |  |  |  |  |  |
| 8 | YouTube Shorts（英文，原生 1080p） | 2026-11-04 10:17:02 +08:00 | 待 24h | 待 72h | 0（發布基準） | 尚未檢查 |
| 9 |  |  |  |  |  |  |
| 10 |  |  |  |  |  |  |

### 第 1 天發布紀錄

2026-11-04 為第 1 天，第 7 天為 2026-11-10（Asia/Taipei）。以下兩支原生 1080p 英文版已確認公開、高畫質處理完成，並可透過未登入的公開 oEmbed 查詢讀取；舊測試版仍為私人。

| 影片 | 公開時間（台北） | 24h 追蹤時間（台北） | 72h 追蹤時間（台北） |
|---|---|---|---|
| [02 Dagger vs Scythe](https://youtube.com/shorts/W2u4gPVx9IM) | 2026-11-04 10:16:30 | 2026-11-05 10:16:30 | 2026-11-07 10:16:30 |
| [08 Shield vs Sword](https://youtube.com/shorts/QnBk8a4Eps0) | 2026-11-04 10:17:02 | 2026-11-05 10:17:02 | 2026-11-07 10:17:02 |

發布基準（2026-11-04 10:18 台北時間）：兩支均為 0 播放、0 讚、0 留言；這不是 24h／72h 成效。其後數字須附實際擷取時間，不能填入尚未到期的 24h／72h 欄位。官方社群發布、導流留言與置頂已取得最新使用者授權；執行成功仍須有平台上的實際紀錄。

### 本週單變因實驗：補上可找到遊戲的導流留言

- **假設**：看完對決的陌生觀眾有試玩意願，清楚的遊戲入口能促成站內存片或分享。
- **對象與唯一變因**：既有公開英文版 02、08，各新增一則相同英文導流留言：`Play today's duel free 👉 ballduelgame-dotcom.github.io/ball-duel`。平台允許時置頂；各支分別記錄實際成功與否。期間保留原片、標題、說明與公開狀態，不同時替換 arcadev3。原定後續日更照常，但記錄其發布時間作為干擾因素。
- **狀態與起點**：準備完成，尚不能宣稱已執行。先保存公開影片和 GoatCounter 的當下快照；以第一則留言實際發布時間為 T0，記下影片 ID、留言 ID／連結、置頂狀態及入口檢查結果。
- **主要指標**：T0 至 T0+72h 內，可排除已知測試後的陌生人 `save-clip`／`share-*` 事件；來源未明另列，不當成成功。T0+24h 做中途快照，T0+72h 做本實驗觀察；原片既定 24h／72h 檢查點與第 7 天門檻維持不變。
- **判定**：有可確認的陌生人存片或分享，符合既定繼續訊號；只有詢問遊戲的陌生留言也符合既定繼續訊號。無事件代表本次未取得正向證據，須等滿原定 7 天再審議停損。若後台不可讀或身分無法辨識，結論為資料不足。
- **限制**：這是前後觀察，不是隨機 A/B；影片流量、自然成長和其他日更都會干擾，不能把事件增長歸因為留言造成，也不能由這項實驗推論 arcadev3 的完播改善。

### 營收階段交接

本週先驗證陌生人的需求，不新增付費功能。出現繼續訊號後，先整理受眾、進入遊戲、完成、重玩／分享的實際證據與未知項，再選一條營收路徑；不因某支影片有播放就視為可營收。

選定方式時才以當時官方資料核對平台資格、費率和限制。正式啟用所需的條款、商業承諾、稅務及收款設定交使用者處理；其餘產品價值、正式流程、權益交付、失敗／取消／退款、收益核對、揭露和支援準備由 agent 完成。未逐項驗證正式外部使用者可完成流程及可結算安排前，狀態只能是「營收未就緒」；測試交易、自己付款與無法結算數字不算市場收入。
