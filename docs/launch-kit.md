# Ball Duel 一週驗證發文工具包

目標：7 天內發 10 支 9:16 短片，看這個格式有沒有反應。這一步要用你自己的帳號發文，我不會代發。

## 停損條件（先講好）

7 天後，只要符合下面任一條，就停止這個方向：
- 10 支短片沒有任何一支超過 **1 萬播放**
- 網站上**沒有任何陌生人**自己存短片或分享結果（看 GoatCounter 的 `save-clip`、`share-shared`、`share-copied` 事件）

反過來，只要有一支超過 1 萬播放，或者留言裡有人問「遊戲叫什麼／在哪玩」，就繼續做下一步（分享卡、國家大亂鬥、實況模式）。

## 第 0 步：打開流量統計（約 3 分鐘，要你操作）

1. 到 https://www.goatcounter.com/signup 註冊免費帳號，**Code** 欄位填 `ballduel`（被用掉的話換一個，記下來）。不用 cookie、不收個資，不需要隱私同意視窗。
2. 把 code 告訴我，我會幫你設定 GitHub repo 變數 `GOATCOUNTER_CODE` 並重新部署。
3. 之後在 `https://<code>.goatcounter.com` 看數字。會記錄的事件：
   - `pick-daily`／`pick-random`：有人開打
   - `finish`：看完一整場
   - `save-clip`：存了 9:16 短片
   - `share-shared`／`share-copied`：分享了結果
   - `lang-xx`：切換語言

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

**標題與說明範本**（不要放外部連結在影片裡要求點擊，TikTok 會降觸及；網址已經在片尾畫面上）：

- 英文：`Who wins? 🏹 vs 💀 (comment before it ends)` ／ `It was 1 HP… 😳 #ballbattle #satisfying #whowins`
- 中文：`誰會贏？留言押一邊再看完 👀` ／ `剩 1 HP 的逆轉… #球球對決 #誰會贏`
- 日文：`どっちが勝つ？コメントで予想してね 👇 #ボールバトル`

**hashtag**：`#ballbattle #weaponball #whowins #satisfying #simulation`（中文加 `#球球對決`）

**留言區**：發文後第一則留言自己貼網址「今天的對決在這裡玩：ballduelgame-dotcom.github.io/ball-duel」，並回覆每一則「遊戲叫什麼」的留言。

## 第 3 步：記錄（每支片發文後 24 小時與 72 小時各記一次）

| # | 平台 | 發文日期 | 24h 播放 | 72h 播放 | 留言數 | 問「遊戲名／在哪玩」的留言數 |
|---|---|---|---|---|---|---|
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |
| 5 |  |  |  |  |  |  |
| 6 |  |  |  |  |  |  |
| 7 |  |  |  |  |  |  |
| 8 |  |  |  |  |  |  |
| 9 |  |  |  |  |  |  |
| 10 |  |  |  |  |  |  |

7 天後把這張表和 GoatCounter 的數字給我，我會判斷要繼續、調整還是停損。
