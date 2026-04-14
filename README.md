# Non-linear Ad + SIMID 互動廣告原型

內部 Demo：展示 IAB **VAST 4.2 Non-linear Ad** + **SIMID 1.1** 互動協定的 6 種常見場景，透過 Google IMA SDK 作為播放載體。

- 設計規格：`docs/plans/2026-04-14-nonlinear-simid-prototype-design.md`
- 實作計畫：`docs/plans/2026-04-14-nonlinear-simid-prototype.md`

---

## 📋 先決條件

- Node.js **>= 18**
- 現代瀏覽器（建議 Chrome 最新版）
- 可連外網路（首次下載 IMA SDK 與 demo 影片）

---

## 🚀 首次設定

1. 取得專案後，先下載 demo 影片（約 61 MB）：

   ```bash
   curl -L -o shared/assets/content.mp4 \
     "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4"
   ```

2. 啟動 server：

   ```bash
   npm start
   # 瀏覽器開啟 http://localhost:8080
   ```

---

## 🎯 六個場景

| #  | 名稱             | 初始尺寸   | 展開尺寸   | 重點                                  |
|----|------------------|------------|------------|---------------------------------------|
| 01 | Basic Overlay    | 480×70     | —          | SIMID 最小握手（init / ready / stop） |
| 02 | Expand / Collapse| 320×50     | 640×360    | 動態尺寸協商（expandNonlinear）       |
| 03 | Carousel         | 728×150    | —          | 多素材自動 + 手動輪播                 |
| 04 | Countdown Timer  | 400×80     | —          | 時效型促銷，倒數歸零後自動收起        |
| 05 | Form Capture     | 320×60     | 480×280    | Lead Gen，Email 驗證與送出            |
| 06 | Mini Game        | 320×60     | 500×400    | Gamification 點擊小遊戲               |

---

## 🏗️ 架構圖

```
┌─────────────────────────────────────────────────────────────┐
│  index.html                                                  │
│  ┌──────────┬──────────────────────────┬─────────────────┐  │
│  │          │                          │                 │  │
│  │ 場景選單 │   Video Player           │   Event Log     │  │
│  │          │  ┌────────────────────┐  │                 │  │
│  │ 01 ...   │  │ <video> content    │  │ [IN ] init      │  │
│  │ 02 ...   │  │                    │  │ [OUT] ready     │  │
│  │ 03 ...   │  │ ┌───────────────┐  │  │ [IN ] start...  │  │
│  │ 04 ...   │  │ │ SIMID iframe  │◀─┼──┼─ postMessage    │  │
│  │ 05 ...   │  │ │ (sandboxed)   │  │  │                 │  │
│  │ 06 ...   │  │ └───────────────┘  │  │                 │  │
│  │          │  └────────────────────┘  │                 │  │
│  └──────────┴──────────────────────────┴─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
        ▲                    ▲                     ▲
        │                    │                     │
   app/app.js         player/player.js       app/logger.js
                      player/simid-host.js
                      shared/simid-protocol.js
```

---

## 📁 目錄結構

```
nonlinear-simid-prototype/
├── index.html               # 單頁入口
├── server.js                # 靜態檔案 server（port 8080）
├── package.json
├── app/                     # 主頁應用邏輯
│   ├── app.js               #   載入 scenarios.json、切換場景
│   ├── app.css
│   └── logger.js            #   Event Log 面板
├── player/                  # 播放器 + SIMID host
│   ├── player.js            #   VAST 載入、影片播放、overlay 掛載
│   ├── simid-host.js        #   SIMID 協定 host 端實作
│   └── player.css
├── shared/                  # 共用模組
│   ├── simid-protocol.js    #   訊息建構/解析
│   ├── simid-base.css       #   creative 共用樣式
│   └── assets/
│       └── content.mp4      #   demo 影片（需自行下載）
├── scenarios/               # 6 個互動場景
│   ├── scenarios.json       #   場景清單
│   ├── 01-basic/   { vast.xml, simid.html }
│   ├── 02-expand/  { vast.xml, simid.html }
│   ├── 03-carousel/{ vast.xml, simid.html }
│   ├── 04-countdown/{ vast.xml, simid.html }
│   ├── 05-form/    { vast.xml, simid.html }
│   └── 06-minigame/{ vast.xml, simid.html }
└── docs/plans/              # 設計與實作計畫
```

---

## 🔌 SIMID 協定支援

本原型實作 SIMID 1.1 子集，已涵蓋常見 overlay 互動所需訊息：

**Player → Creative**
- `SIMID:Player:init`
- `SIMID:Player:startCreative`
- `SIMID:Player:adStopped`
- `SIMID:Player:resize`

**Creative → Player**
- `SIMID:Creative:createSession`
- `SIMID:Creative:ready`
- `SIMID:Creative:clickThru`
- `SIMID:Creative:expandNonlinear`
- `SIMID:Creative:collapseNonlinear`
- `SIMID:Creative:requestStop`
- `SIMID:Creative:fatalError`
- `SIMID:Creative:log`

訊息統一格式：

```json
{
  "sessionId": "uuid-v4",
  "messageId": "uuid-v4",
  "type": "SIMID:Creative:ready",
  "timestamp": 1712700000000,
  "args": { }
}
```

---

## 🛠️ 技術設計重點

- **IMA SDK 僅作為載體**：`AdDisplayContainer` 提供 ad slot 與使用者手勢解鎖，實際 VAST XML 解析由 `player/player.js` 自行處理（Non-linear overlay 不走 IMA 的線性廣告流程）。
- **SIMID Creative 跑在 iframe sandbox**：`allow-scripts allow-same-origin`，隔離 DOM 但允許 postMessage。
- **雙向通訊採 postMessage**：host 驗證 `event.source` 與 `origin`，忽略不匹配的訊息。
- **host 記憶預設尺寸**：`load()` 時記錄 `defaultWidth/Height`，收到 `collapseNonlinear` 時自動 resize 回初始值。
- **Event Log 面板**：完整記錄 IN/OUT postMessage，方便對照 SIMID 協定行為。

---

## ⚠️ 已知限制

- 僅於 Chrome 最新版驗證過，其他瀏覽器未測試
- 不發送真實 ad tracking beacon（`Impression`、`TrackingEvents` 等）
- VAST 資源型態只支援 `<IFrameResource>`，未支援 `<StaticResource>`、`<HTMLResource>`
- 無自動化測試，採人工驗收（見下方 Checklist）
- 不包含真實 ad server 整合

---

## 📚 參考文件

- 設計文件：[`docs/plans/2026-04-14-nonlinear-simid-prototype-design.md`](docs/plans/2026-04-14-nonlinear-simid-prototype-design.md)
- 實作計畫：[`docs/plans/2026-04-14-nonlinear-simid-prototype.md`](docs/plans/2026-04-14-nonlinear-simid-prototype.md)
- IAB VAST 4.2：<https://iabtechlab.com/standards/vast/>
- IAB SIMID 1.1：<https://iabtechlab.com/standards/secure-interactive-media-interface-definition-simid/>
- Google IMA SDK（HTML5）：<https://developers.google.com/interactive-media-ads/docs/sdks/html5>

---

## ✅ 驗收 Checklist

### 基本功能
- [ ] 6 場景全部能從選單切換並載入
- [ ] 內容影片播放 / 暫停 / 繼續正常
- [ ] Overlay 位置與尺寸符合 VAST 規格
- [ ] ✕ 關閉按鈕所有場景均生效
- [ ] clickThru 開啟新分頁

### 場景專屬
- [ ] 場景 02 展開 / 收合動畫流暢
- [ ] 場景 03 自動輪播 + 手動切換
- [ ] 場景 04 倒數準確（偏差 < 1 秒）
- [ ] 場景 05 Email 驗證與送出流程
- [ ] 場景 06 遊戲計分準確

### 協定
- [ ] Log 面板顯示完整 IN / OUT postMessage
- [ ] Log 格式可讀（時間戳 + 方向 + 事件 + payload）
- [ ] iframe sandbox 屬性正確
- [ ] origin 不匹配的訊息被忽略
