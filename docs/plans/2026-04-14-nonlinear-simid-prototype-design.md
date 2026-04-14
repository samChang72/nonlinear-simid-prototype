# Non-linear Ad + SIMID 互動廣告原型 — 設計文件

**日期**：2026-04-14
**作者**：Sam
**狀態**：設計核准，待實作

---

## 1. 專案目標

建立一個以 **Google IMA SDK** 為播放器、以 **VAST Non-linear Ad** 搭配 **SIMID (Secure Interactive Media Interface Definition)** 為互動格式的內部 Demo 原型，用於向團隊/客戶展示「在串流影片播放過程中疊加互動式 banner 廣告」的技術可行性與體驗效果。

### 目的
- **內部 Demo**：可現場展示的原型，非上線產品

### 範圍
- 6 種互動場景（從基本 overlay 到小遊戲）
- 本地靜態 VAST XML，不串接真實 ad server
- 純 HTML + IMA SDK 播放器
- 僅支援 Chrome 最新版桌面環境

### 非目標（YAGNI）
- 真實 ad tracking（impression/click beacon）
- CDN/Gzip 優化
- 多瀏覽器與行動裝置相容性
- VAST 4.x 進階功能（UniversalAdId、Verification）
- TypeScript、自動化測試

---

## 2. 技術選型

| 項目 | 選擇 | 理由 |
|------|------|------|
| 播放器 | 純 HTML5 `<video>` + Google IMA SDK (HTML5) | 最貼近 IAB 標準實作，demo 專注在 SIMID 本身 |
| Ad Server | 本地靜態 VAST XML | 無外部依賴，穩定可展示 |
| SIMID 執行環境 | 沙箱 iframe (`sandbox="allow-scripts allow-same-origin"`) | 符合 IAB SIMID 安全隔離規範 |
| 通訊機制 | `window.postMessage` + JSON 訊息 | SIMID 標準協定 |
| Local Server | Node.js (`http.createServer`) | IMA SDK 要求 HTTP 環境，`file://` 無法載入 |
| 語言 | 純 JavaScript + HTML + CSS | 無建置步驟，降低 demo 門檻 |

---

## 3. 專案結構

```
nonlinear-simid-prototype/
├── index.html              # 主頁面
├── server.js               # 本地靜態伺服器
├── package.json
├── README.md
│
├── player/
│   ├── player.js           # IMA SDK 初始化、VAST 請求、事件綁定
│   └── player.css          # 播放器與 UI 樣式
│
├── app/
│   ├── app.js              # 場景選單、log 面板、狀態管理
│   └── app.css             # 整體 layout
│
├── scenarios/
│   ├── scenarios.json      # 場景清單
│   ├── 01-basic/
│   │   ├── vast.xml
│   │   └── simid.html
│   ├── 02-expand/
│   ├── 03-carousel/
│   ├── 04-countdown/
│   ├── 05-form/
│   └── 06-minigame/
│
├── shared/
│   ├── simid-protocol.js   # SIMID postMessage 協定封裝（creative 端）
│   ├── simid-base.css      # SIMID creative 共用樣式
│   └── assets/             # 共用素材（logo、產品圖）
│
└── docs/
    └── plans/
        └── 2026-04-14-nonlinear-simid-prototype-design.md
```

---

## 4. 系統架構

```
┌────────────────────────────────────────────────────────────┐
│  index.html (主頁面)                                        │
│                                                             │
│  ┌──────────┐   ┌──────────────────────────┐   ┌─────────┐ │
│  │ 場景選單  │   │  Video Player Container   │   │ 事件 Log │ │
│  │          │   │  ┌────────────────────┐   │   │         │ │
│  │ 01 Basic │──▶│  │ <video> 內容影片    │   │   │ [時間]  │ │
│  │ 02 Expand│   │  │  ┌──────────────┐  │   │   │ 訊息    │ │
│  │ 03 Carsl │   │  │  │ SIMID iframe │◀─┼───┼──▶│ 內容    │ │
│  │ 04 Cntdn │   │  │  │ (sandbox)    │  │   │   │         │ │
│  │ 05 Form  │   │  │  └──────────────┘  │   │   │         │ │
│  │ 06 Game  │   │  └────────────────────┘   │   │         │ │
│  └──────────┘   │   (IMA Ad Container)     │   │         │ │
│                 └──────────────────────────┘   └─────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 資料流

**階段 A — 場景載入**
1. 用戶點選選單 → `app.js` 從 `scenarios.json` 找到 VAST 路徑
2. 呼叫 `player.loadScenario(vastUrl)` 重置播放器

**階段 B — VAST + SIMID 握手**
3. IMA SDK `AdsRequest`，`adTagUrl` 指向本地 VAST XML
4. IMA SDK 解析 VAST，遇到 `<MediaFiles apiFramework="SIMID">` → 建立 sandbox iframe 載入 `simid.html`
5. SIMID creative 送出 `SIMID:Creative:createSession`
6. 主頁回應後送出 `SIMID:Player:init` 傳遞 `environmentData`
7. Creative 回應 `SIMID:Creative:ready`

**階段 C — 執行期互動**
8. SIMID creative 處理用戶互動
9. 事件透過 `postMessage` 上報
10. 主頁 log 面板即時顯示 JSON 流量

**階段 D — 結束**
11. SIMID 送出 `requestStop` 或倒數結束
12. 主頁關閉 iframe，內容影片繼續

---

## 5. 六個 Demo 場景

### 01 — Basic Overlay
- **尺寸**：480×70 置底
- **元素**：品牌 Logo + 標語 + [了解更多] + ✕
- **互動**：clickThru、requestStop
- **展示重點**：SIMID 最小可行實作與握手流程

### 02 — Expand / Collapse
- **預設態**：320×50 右下小 banner
- **展開態**：640×360 大展示區（產品圖 + 影片 + CTA）
- **互動**：expandNonlinear、collapseNonlinear
- **展示重點**：尺寸協商與動畫

### 03 — Carousel
- **尺寸**：728×150 置底
- **內容**：3 張產品圖自動輪播（3 秒）+ 手動切換
- **互動**：每張圖獨立 clickThru URL，點擊帶圖片索引
- **展示重點**：複雜 UI 邏輯可封裝於 SIMID

### 04 — Countdown Timer
- **尺寸**：400×80
- **內容**：「限時優惠剩餘 HH:MM:SS」+ [立即搶購]
- **行為**：倒數結束 → 變「已結束」→ 5 秒後自行關閉
- **展示重點**：生命週期管理

### 05 — Form Capture
- **預設態**：320×60「留下 Email 領優惠」
- **展開態**：480×280（Email 欄位 + 訂閱按鈕 + 隱私連結）
- **行為**：送出 → 驗證 → 成功訊息 → 3 秒自動收合
- **展示重點**：Lead gen 轉換不跳離影片

### 06 — Mini Game
- **預設態**：320×60「點擊玩遊戲抽獎」
- **展開態**：500×400 遊戲區（點擊氣球 3 秒計分）
- **行為**：結束顯示得分 + [領取獎品]
- **展示重點**：Gamification 互動能力

### 共用規格
- ✕ 關閉按鈕（所有場景）
- 右上角「廣告 AD」標示（IAB 透明度規範）
- 共通事件上報：impression、clickThru、expand、collapse、closeAd

---

## 6. SIMID 協定實作範圍

實作 **SIMID 1.1 核心訊息**（非完整規格）。

### 訊息格式

```json
{
  "sessionId": "uuid-v4",
  "messageId": 42,
  "type": "SIMID:Xxx:yyy",
  "timestamp": 1712000000000,
  "args": { "..." : "..." }
}
```

### Player → Creative

| 訊息 | 時機 | Payload |
|------|------|---------|
| `SIMID:Player:init` | iframe 載入後 | `environmentData` |
| `SIMID:Player:startCreative` | init ack 後 | 空 |
| `SIMID:Player:adStopped` | 關閉時 | 空 |
| `SIMID:Player:resize` | 視窗變化 | `videoDimensions`, `creativeDimensions` |

### Creative → Player

| 訊息 | 時機 | Payload |
|------|------|---------|
| `SIMID:Creative:createSession` | iframe 載入完成 | `sessionId` |
| `SIMID:Creative:ready` | creative 準備完畢 | 空 |
| `SIMID:Creative:clickThru` | 用戶點擊 | `url` |
| `SIMID:Creative:expandNonlinear` | 展開 | `requestedDimensions` |
| `SIMID:Creative:collapseNonlinear` | 收合 | 空 |
| `SIMID:Creative:requestStop` | 用戶關閉 | `reason` |
| `SIMID:Creative:fatalError` | 異常 | `code`, `message` |
| `SIMID:Creative:log` | demo 用自訂事件 | `data` |

---

## 7. 錯誤處理策略

| 錯誤類型 | 處理方式 |
|---------|---------|
| SIMID iframe 載入失敗 | 5 秒超時 → 關閉 iframe，log 錯誤，繼續內容 |
| postMessage origin 不匹配 | 忽略並 log 警告 |
| SIMID JSON 格式錯誤 | try/catch 包 `JSON.parse`，log 錯誤 |
| VAST XML 載入失敗 | IMA `AD_ERROR` → 顯示提示 3 秒 |
| Creative fatalError | 立即關閉 iframe，log 錯誤代碼 |

---

## 8. 驗收標準（手動）

### 基本功能
- [ ] 6 場景可切換並正常載入
- [ ] 內容影片播放/暫停/繼續正常
- [ ] Overlay 疊加位置正確
- [ ] ✕ 關閉按鈕所有場景運作
- [ ] clickThru 開啟新分頁

### 場景專屬
- [ ] 場景 02 展開/收合動畫流暢
- [ ] 場景 03 自動輪播 + 手動切換
- [ ] 場景 04 倒數準確（偏差 < 1 秒）
- [ ] 場景 05 Email 驗證與送出成功
- [ ] 場景 06 遊戲計分準確

### 協定驗收
- [ ] Log 面板顯示完整 postMessage 流量
- [ ] Log 格式可讀（時間戳 + 方向 + 事件名 + payload）
- [ ] iframe sandbox 屬性設定正確
- [ ] origin 不匹配訊息被忽略

---

## 9. 關鍵風險

| 風險 | 緩解 |
|------|------|
| IMA SDK 對本地 VAST 的 CORS 要求 | Local Node server 加 `Access-Control-Allow-Origin: *` |
| SIMID iframe 通訊 origin 在 `file://` 下會是 `"null"` | 強制使用 `http://localhost:PORT`，README 明確標示 |
| IMA SDK SIMID 支援度仍在演進 | 以 IMA SDK 最新版本為基準，README 註記版本 |
| iframe 內嵌 HTML creative 的相對路徑解析 | 每個 creative 用絕對路徑或 `<base>` tag |

---

## 10. 後續步驟

設計核准後：
1. 呼叫 `writing-plans` skill 建立詳細實作計畫（`docs/plans/2026-04-14-nonlinear-simid-prototype-plan.md`）
2. 依計畫分階段實作
3. 每個場景完成後進行手動驗收
