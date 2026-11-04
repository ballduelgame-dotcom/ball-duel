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
網址仍在上傳說明；第一則留言或置頂需使用者另行授權。產生預覽不會上傳，也不會更改已公開影片。

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

一般遊戲新增選邊卡片、支持對象標示及原創循環背景音樂；重玩會重啟單一音樂排程，回到選單或結束時停止。
Shorts 錄製不使用遊戲音樂，改由工具混入原創立體聲配樂，避免重複混音。

短片只改播放節奏：雙方相距較遠時 2.6 倍、接近時 1.25 倍、任何一方剩 20 HP 以下時恢復原速。所有物理步驟依序保持 1/120 秒，數值、seed 與勝負不變；畫面秒數仍為模擬時間，成片時間會更短。
`verify-presentation.mjs` 會比較十場種子的原速／剪輯節奏完整終局狀態，並檢查三種手機尺寸、十語系、音樂排程、選邊、整場播放、存片及重玩；報告與截圖輸出至 `clips/`。

成片檔名為 `*-arcadev3-en.mp4`，與先前版本及上傳紀錄分開。產出預覽與 dry-run 不會上傳或替換已公開影片；需獲使用者授權才上傳／公開。

## 限制：上傳後要手動改「公開」

Google 規定：未經稽核的 API 專案上傳的影片會被**鎖成私人**。所以第一週的流程是：

1. `node tools/youtube.mjs upload 02 08` 上傳
2. 到 YouTube Studio → 內容 → 把影片改成「公開」（或在 Studio 設排程）
3. 自己留言貼遊戲網址並置頂（API 沒辦法置頂留言）

要完全自動（`--public`、`--at 2026-11-05T20:00+08:00` 排程），要先申請 YouTube API 稽核：在 Google 搜尋「YouTube API Services Audit and Quota Extension Form」填表，審核需要幾天到幾週。建議等第一週數字出來、確定要繼續再申請。
