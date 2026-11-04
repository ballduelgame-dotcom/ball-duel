# YouTube 自動上傳：一次性設定

`tools/youtube.mjs` 用 YouTube Data API 上傳 `clips/` 裡的影片，標題和說明讀自 `docs/captions.md`，也能抓播放數。使用前要先在 Google Cloud 建一個「OAuth 用戶端」（約 10 分鐘，全程用 ballduel.game@gmail.com）。

## 給 Codex 的 prompt

```
請用已登入 ballduel.game@gmail.com 的瀏覽器，在 Google Cloud 為 YouTube 上傳腳本建立 OAuth 用戶端。
規則：密碼、驗證碼、付款資訊一律停下來讓我自己處理；不要啟用計費、不要開試用；每個「建立／發布／同意」按鈕按下前先告訴我。

1. 打開 https://console.cloud.google.com/ ，若要求同意服務條款，停下讓我按。國家選台灣。
2. 建立新專案，名稱 ball-duel（不要選機構）。
3. 「API 和服務」→「程式庫」→ 搜尋 YouTube Data API v3 → 啟用。
4. 「Google Auth Platform」（或「OAuth 同意畫面」）→ 開始設定：
   - 應用程式名稱：Ball Duel Uploader
   - 使用者支援電子郵件、開發人員聯絡資訊：ballduel.game@gmail.com
   - 目標對象：外部（External）
5. 「目標對象」頁面 → 發布應用程式（Publish app / 正式版）。會提示未驗證，確認即可，不需要送審。
6. 「用戶端」→ 建立用戶端 → 應用程式類型選「電腦版應用程式（Desktop app）」→ 名稱 ball-duel-cli → 建立。
7. 下載用戶端的 JSON 檔，存成：
   %APPDATA%\ballduel\client_secret.json
   （資料夾不存在就建立；不要把檔案內容貼到聊天裡）
完成後回報：專案 ID、API 是否已啟用、應用程式狀態（測試中／正式版）、JSON 是否已存到指定路徑。
```

為什麼第 5 步要「發布」：留在「測試中」的話，登入授權 7 天就失效，每週要重登一次。發布後不需要 Google 審核（只有你自己用），登入時會看到「Google 尚未驗證這個應用程式」，點「進階」→「前往 Ball Duel Uploader」即可。

## 登入（一次）

```bash
node tools/youtube.mjs auth
```

瀏覽器會打開 Google 登入頁：選 **ballduel.game@gmail.com** → 選 **Ball Duel 頻道**（若問要用哪個頻道）→ 允許。終端機顯示頻道名稱就完成。授權存在 `%APPDATA%\ballduel\youtube-token.json`，不在 repo 裡。

## 使用

```bash
node tools/youtube.mjs upload 02 08               # 上傳第 02、08 支英文版（私人）
node tools/youtube.mjs upload 02 --lang zh-TW     # 中文版
node tools/youtube.mjs upload 02 --dry-run        # 只顯示會送出的標題與說明
node tools/youtube.mjs stats                      # 所有已上傳影片的播放／讚／留言
```

上傳紀錄在 `clips/uploads.json`，同一支不會傳兩次。

## 原生 1080×1920 重錄

```bash
node tools/render-clips.mjs 2 en
node tools/render-clips.mjs 8 en
node tools/youtube.mjs upload 02 08 --variant native1080 --dry-run
node tools/youtube.mjs upload 02 08 --variant native1080
node tools/youtube.mjs stats
```

錄影工具直接把線上遊戲的向量繪圖畫進 1080×1920 畫布，保持原本的模擬座標和 seed。
錄影要求 16 Mbps，再以 CRF 16 編成 H.264/AAC、30 fps；不再放大 720p 影片。實際碼率會隨畫面複雜度變動。
錄影循序執行，避免高解析度編碼互搶資源；GoatCounter 仍會被擋掉。
錄製以 60 fps 取樣，避免動畫與錄影時脈互相錯過，再輸出固定 30 fps；原始錄影平均若低於 27 fps 會停止，不能只靠補成 30 fps 通過檢查。錄影報告也記錄來源腳本與錄製時間。

新版檔名例如 `02-dagger-vs-scythe-native1080-en.mp4`，原始錄影和驗證資料保留在 `clips/raw/`、`clips/*-native1080-*.json`。
若新版檔已存在，工具會停止，需先自行封存再重錄。上傳前應檢查原始錄影與成片解析度、開場／對戰／片尾畫面及音效。

`--variant native1080` 只選新版檔案，建立獨立上傳紀錄，不會刪除或覆蓋舊影片；不帶此參數仍只選原版。
`stats` 同時列出隱私、處理狀態與 YouTube 回報的來源尺寸；來源尺寸不代表所有播放畫質版本都已處理完成。

## 手機 Shorts 精簡預覽

```bash
node tools/render-clips.mjs 2 en --shorts
node tools/render-clips.mjs 8 en --shorts
```

此模式使用線上頁面的 `?format=shorts`：隱藏畫面標題、等級、成長說明與網址，把武器名、血條和戰鬥畫面收進手機平台介面的安全範圍。
遊戲座標、武器數值和 seed 不變。此段記錄早期精簡版；目前頁面已升級為下述置中競技場，舊有本機成片仍保留，不應以同一檔名覆蓋。

成片另存為 `*-shortsv2-en.mp4`，混入原創合成配樂 Duel Pulse v1（132 BPM、A minor），包含鼓、低音、琶音及結尾和弦，無第三方音檔或樣本。
音效與配樂混音後以 -16 LUFS / -4 dBTP 為正規化目標，為 AAC 編碼後的峰值留餘量；實測音量應在上傳前另外檢查。音樂來源和影片規格寫入相鄰 JSON，原始 WAV 留在 `clips/raw/`。
網址仍在上傳說明。2026-11-04 持續目標已授權官方產品宣傳、導流留言與置頂；仍須先完成品質審查。產生預覽不會上傳，也不會更改已公開影片。

獲准上傳新版時，使用 `node tools/youtube.mjs upload 02 08 --variant shortsv2 --dry-run` 預覽資料，再移除 `--dry-run`；新版會有獨立的上傳紀錄。

## 置中競技場 arcadev3

```bash
npm run dev
node tools/verify-presentation.mjs
node tools/render-clips.mjs 2 en --arcade
node tools/render-clips.mjs 8 en --arcade
node tools/youtube.mjs upload 02 08 --variant arcadev3 --dry-run
```

遊戲與影片共用置中競技場：720×1280 邏輯畫布中的場地為 x=70、y=350、580×580，中心精確為 (360,640)。血條與標題對稱排列，畫面不顯示網址。
加入立體球體、發光網格、武器光軌、命中衝擊波、傷害浮字、殘血警示、真實領先交換提示、入場和勝利動畫；新提示涵蓋全部十語系。減少動態效果偏好會停用鏡頭震動、光軌和勝利彩帶。
固定背景與場地光效以原生畫布解析度快取，保留像素細節，同時減少每幀繪製成本。

一般遊戲新增選邊卡片、支持對象標示及原創循環背景音樂；重玩會重啟單一音樂排程，回到選單或結束時停止。
Shorts 錄製不使用遊戲音樂，改由工具混入原創立體聲配樂，避免重複混音。

短片只改播放節奏：雙方相距較遠時 2.6 倍、接近時 1.25 倍、任何一方剩 20 HP 以下時恢復原速。所有物理步驟依序保持 1/120 秒，數值、seed 與勝負不變；畫面秒數仍為模擬時間，成片時間會更短。
`verify-presentation.mjs` 會比較十場種子的原速／剪輯節奏完整終局狀態，並檢查三種手機尺寸、十語系、音樂排程、選邊、整場播放、存片及重玩；報告與截圖輸出至 `clips/`。

成片檔名為 `*-arcadev3-en.mp4`，與先前版本及上傳紀錄分開。產出預覽與 dry-run 不會上傳或替換已公開影片；正式發布沿用最新持續目標授權與原定發片順序，平台要求本人操作時交接使用者。

宣傳錄影現在先用 WebM 保存原始影音，再轉為 H.264/AAC MP4。2026-11-04 的 07 原始 MP4 曾缺少最後約 17 秒畫面，雖然容器時長與名義幀率檢查通過，仍沒有錄到勝負。工具因此改為檢查影音 packet 結束時間差（最多 0.25 秒）、以整段時間計算實際幀率（至少 27fps），並檢查成片兩軌時長；最後仍須實際看見正確勝者與剩餘 HP，不能只靠解碼成功。

若原錄已完整保存、只有轉碼流程中斷，可用 `node tools/render-clips.mjs 7 en --arcade --encode-only` 處理既有 `clips/raw/*-arcadev3-en.webm`，不再開瀏覽器錄製。串流 WebM 可能沒有 duration 標頭，工具使用 packet 時間跨度。重用 raw 的 JSON 會標示 `reusedRaw`，不推測未知的原錄網頁來源與時間。失敗片與其證據應封存，不能靠拉伸、凍結畫面或裁掉音軌掩蓋缺失對局。

## 留言唯讀查詢

`node tools/youtube.mjs comments` 讀取上傳紀錄中當下仍公開影片的最新 100 則已發布頂層留言，保存帶時間的 `clips/youtube-comments-*.json`。`hasMore` 表示尚有下一頁；回覆、待審留言與作者是否陌生人未驗證，不能由空清單推論沒有需求。私人或不可讀影片另列 `skipped`。

2026-11-04 實際呼叫回傳 `403: Request had insufficient authentication scopes`，尚未取得留言內容；指令遇到 API 錯誤會失敗退出，不會產生冒充零留言的成功快照。既有授權仍可用於原本的成效查詢。不要刪除憑證或自行擴大權限；先用已登入的官方 Studio 查看，若選擇重新授權，由使用者完成登入與同意。

官方介面參數與錯誤定義：[commentThreads.list](https://developers.google.com/youtube/v3/docs/commentThreads/list)。

## 公開、排程與目前實際限制

2026-11-04 核對的官方 [videos.insert 文件](https://developers.google.com/youtube/v3/docs/videos/insert) 在 `status.privacyStatus` 說明寫明：未稽核 API 專案上傳的影片不會因此受限於私人觀看。原先「必須先稽核才能公開／排程」的通則說明已過時；本專案尚未實測新上傳直接公開／排程，須以實際回傳狀態和未登入可見性驗證，不能只靠文件宣稱發布成功。

本工具的 `--public`／`--at` 只影響**新上傳**，已在 `clips/uploads.json` 的同一影片會跳過，不會更改既有影片。修改既有私人影片的公開或排程狀態需 Studio，或使用另一個 API 方法。官方 [videos.update](https://developers.google.com/youtube/v3/docs/videos/update) 要求 `youtube`、`youtube.force-ssl` 或 `youtubepartner` 其中一個權限；目前授權流程僅請求 `youtube.upload`／`youtube.readonly`，不可假設有更新權限。若選擇擴大權限，由使用者完成登入與同意。

目前日更流程為：品質審查完成後私人上傳，按既定日期在官方 Studio 公開或排程，再核對實際狀態與導流入口。私人上傳完成不等於已公開，準備好的排程也不等於平台已接受。

2026-11-04 批次上傳另遇到 `400 uploadLimitExceeded`，表示帳號可上傳影片數已達限制（[官方錯誤定義](https://developers.google.com/youtube/v3/docs/videos/insert#errors)）。01、09、04、03、06 已成功私人上傳；05、10 保留本機待限制解除。不可重傳已成功影片，也不要將此錯誤當作影片壞檔或 API 配額不足。可恢復時間尚未確認，未建立自動重試。
