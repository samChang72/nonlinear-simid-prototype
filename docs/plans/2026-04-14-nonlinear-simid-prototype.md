# Non-linear Ad + SIMID 互動廣告原型 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立一個以 Google IMA SDK 為播放器、以 VAST Non-linear Ad 搭配 SIMID 互動格式為核心的內部 Demo 原型，展示 6 種互動場景。

**Architecture:** 純 HTML5 video + Google IMA SDK 作為主播放器，用本地 Node.js 靜態伺服器提供 VAST XML 與 SIMID creative 資源。SIMID creative 於 sandboxed iframe 中執行，透過 `postMessage` 與主播放器通訊。每個場景為獨立的 `vast.xml` + `simid.html` 組合。

**Tech Stack:** HTML5 `<video>`, Google IMA SDK (HTML5), Node.js (只用內建 `http` / `fs` / `path`), 純 JavaScript (ES2020+), CSS3, VAST 4.2, SIMID 1.1

**設計文件**：`docs/plans/2026-04-14-nonlinear-simid-prototype-design.md`

---

## 目錄

1. 階段 0：專案初始化
2. 階段 1：主頁面骨架與本地伺服器
3. 階段 2：SIMID 協定共用模組
4. 階段 3：IMA SDK 播放器整合
5. 階段 4：場景 01 — Basic Overlay（端到端驗證）
6. 階段 5：場景 02 — Expand/Collapse
7. 階段 6：場景 03 — Carousel
8. 階段 7：場景 04 — Countdown Timer
9. 階段 8：場景 05 — Form Capture
10. 階段 9：場景 06 — Mini Game
11. 階段 10：最終驗收與 README

---

## 階段 0：專案初始化

### Task 0.1：建立 package.json 與 README

**Files:**
- Create: `package.json`
- Create: `README.md`
- Create: `.gitignore`

**Step 1：建立 package.json**

```json
{
  "name": "nonlinear-simid-prototype",
  "version": "0.1.0",
  "description": "Non-linear Ad + SIMID interactive ad prototype with Google IMA SDK",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "license": "MIT"
}
```

**Step 2：建立 .gitignore**

```
node_modules/
.DS_Store
*.log
.vscode/
.idea/
```

**Step 3：建立初始 README.md**

```markdown
# Non-linear Ad + SIMID 互動廣告原型

內部 Demo：展示 IAB Non-linear Ad + SIMID 規格的 6 種互動場景，透過 Google IMA SDK 測試。

## 啟動方式

\`\`\`bash
npm start
# 瀏覽器開啟 http://localhost:8080
\`\`\`

## 場景列表

1. Basic Overlay — SIMID 最小握手
2. Expand/Collapse — 動態尺寸協商
3. Carousel — 多素材輪播
4. Countdown Timer — 時效型促銷
5. Form Capture — Lead Gen
6. Mini Game — Gamification

詳見 `docs/plans/2026-04-14-nonlinear-simid-prototype-design.md`。
```

**Step 4：Commit**

```bash
cd /Users/sam/project/nonlinear-simid-prototype
git init
git add package.json .gitignore README.md docs/
git commit -m "chore: initial project scaffold"
```

---

### Task 0.2：建立資料夾結構

**Files:**
- Create: 下列目錄（用 `mkdir -p`）

**Step 1：建立空資料夾**

```bash
mkdir -p player app shared/assets
mkdir -p scenarios/01-basic scenarios/02-expand scenarios/03-carousel
mkdir -p scenarios/04-countdown scenarios/05-form scenarios/06-minigame
```

**Step 2：每個資料夾加 .gitkeep**

```bash
touch player/.gitkeep app/.gitkeep shared/.gitkeep shared/assets/.gitkeep
touch scenarios/01-basic/.gitkeep scenarios/02-expand/.gitkeep
touch scenarios/03-carousel/.gitkeep scenarios/04-countdown/.gitkeep
touch scenarios/05-form/.gitkeep scenarios/06-minigame/.gitkeep
```

**Step 3：Commit**

```bash
git add .
git commit -m "chore: scaffold directory structure"
```

---

## 階段 1：主頁面骨架與本地伺服器

### Task 1.1：建立 Node 靜態伺服器

**Files:**
- Create: `server.js`

**Step 1：實作 server.js**

```javascript
// server.js
const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 8080
const ROOT = __dirname

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4'
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0])
  const filePath = path.join(ROOT, urlPath === '/' ? '/index.html' : urlPath)

  // 安全：禁止跳出 ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404)
      res.end('Not Found: ' + urlPath)
      return
    }
    const ext = path.extname(filePath).toLowerCase()
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    })
    res.end(data)
  })
})

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
```

**Step 2：啟動並驗證**

```bash
node server.js
# 另開終端：curl -I http://localhost:8080/package.json
```

Expected：`HTTP/1.1 200 OK` 且 `Content-Type: application/json`。

**Step 3：Commit**

```bash
git add server.js
git commit -m "feat: add local static http server"
```

---

### Task 1.2：建立主頁面 HTML 骨架

**Files:**
- Create: `index.html`
- Create: `app/app.css`

**Step 1：實作 index.html**

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<title>Non-linear SIMID Prototype</title>
<link rel="stylesheet" href="/app/app.css">
<link rel="stylesheet" href="/player/player.css">
<script src="https://imasdk.googleapis.com/js/sdkloader/ima3.js"></script>
</head>
<body>
  <header class="app-header">
    <h1>Non-linear Ad + SIMID 互動廣告原型</h1>
    <span class="app-subtitle">Google IMA SDK + VAST + SIMID 1.1</span>
  </header>

  <main class="app-main">
    <aside class="scenario-list" id="scenarioList">
      <h2>場景</h2>
      <ul id="scenarioItems"></ul>
    </aside>

    <section class="player-section">
      <div class="player-wrapper" id="playerWrapper">
        <video id="contentVideo" playsinline controls
               src="/shared/assets/content.mp4"></video>
        <div id="adContainer" class="ad-container"></div>
      </div>
      <div class="player-controls">
        <button id="playBtn">播放</button>
        <button id="resetBtn">重新載入場景</button>
      </div>
    </section>

    <aside class="log-panel">
      <h2>事件 Log</h2>
      <div class="log-body" id="logBody"></div>
      <button id="clearLogBtn">清空</button>
    </aside>
  </main>

  <script src="/app/app.js" type="module"></script>
</body>
</html>
```

**Step 2：實作 app/app.css**

```css
:root {
  --bg: #0f1115;
  --panel: #1a1d24;
  --border: #2a2f3a;
  --text: #e4e6eb;
  --accent: #4a9eff;
}

* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, Segoe UI, sans-serif;
       background: var(--bg); color: var(--text); }

.app-header {
  padding: 12px 20px; border-bottom: 1px solid var(--border);
  display: flex; align-items: baseline; gap: 12px;
}
.app-header h1 { margin: 0; font-size: 18px; }
.app-subtitle { color: #888; font-size: 13px; }

.app-main {
  display: grid;
  grid-template-columns: 220px 1fr 340px;
  gap: 12px; padding: 12px; height: calc(100vh - 55px);
}

.scenario-list, .log-panel {
  background: var(--panel); border: 1px solid var(--border);
  border-radius: 8px; padding: 12px; overflow: auto;
}

.scenario-list ul { list-style: none; padding: 0; margin: 0; }
.scenario-list li {
  padding: 10px 12px; border-radius: 6px; cursor: pointer;
  margin-bottom: 4px;
}
.scenario-list li:hover { background: #242832; }
.scenario-list li.active { background: var(--accent); color: #fff; }

.player-section { display: flex; flex-direction: column; gap: 12px; }
.player-wrapper {
  position: relative; background: #000; border-radius: 8px;
  aspect-ratio: 16/9; overflow: hidden;
}
#contentVideo { width: 100%; height: 100%; display: block; }
.ad-container {
  position: absolute; inset: 0; pointer-events: none;
}
.ad-container > * { pointer-events: auto; }

.player-controls button {
  background: var(--accent); color: #fff; border: none;
  padding: 8px 16px; border-radius: 6px; cursor: pointer;
  margin-right: 8px;
}

.log-panel h2 { margin: 0 0 8px; font-size: 14px; }
.log-body {
  font-family: ui-monospace, Menlo, monospace; font-size: 11px;
  line-height: 1.5; height: calc(100% - 80px); overflow-y: auto;
  background: #0a0c10; padding: 8px; border-radius: 4px;
}
.log-entry { margin-bottom: 4px; word-break: break-all; }
.log-entry.in { color: #8ad8a0; }
.log-entry.out { color: #ffb86c; }
.log-entry.sys { color: #888; }
.log-entry.err { color: #ff6b6b; }
```

**Step 3：啟動並以瀏覽器檢查**

```bash
node server.js
# 開啟 http://localhost:8080，確認 layout 三欄顯示正常
```

Expected：看到左側場景欄、中央黑色播放器、右側 log 面板。

**Step 4：Commit**

```bash
git add index.html app/app.css
git commit -m "feat: add main page layout and shell"
```

---

### Task 1.3：下載 demo 用內容影片素材

**Files:**
- Create: `shared/assets/content.mp4`（下載免費素材）

**Step 1：下載公開可用的測試影片**

```bash
curl -L -o shared/assets/content.mp4 \
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
```

**Step 2：驗證影片可播放**

瀏覽器開啟 `http://localhost:8080/shared/assets/content.mp4`，應能播放。

**Step 3：Commit（用 Git LFS 或 .gitignore 排除）**

由於影片較大，改為 .gitignore：

```bash
echo "shared/assets/*.mp4" >> .gitignore
git add .gitignore
git commit -m "chore: ignore large video assets"
```

README 需補充「首次執行前需跑 Task 1.3 的 curl 指令下載影片」，稍後在階段 10 統一處理。

---

## 階段 2：SIMID 協定共用模組

### Task 2.1：撰寫 SIMID 協定測試（人工驗證用）

> 此原型不做自動化測試，但需建立一個 `shared/simid-protocol.test.html` 頁面，手動驗證 postMessage 流程。

**Files:**
- Create: `shared/simid-protocol.test.html`

**Step 1：建立手動測試頁**

```html
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>SIMID Protocol Test</title></head>
<body>
<h1>SIMID Protocol Test Harness</h1>
<button id="sendInit">Send Player:init</button>
<button id="sendResize">Send Player:resize</button>
<pre id="log"></pre>
<iframe id="frame" src="/shared/simid-protocol.test.creative.html"
        sandbox="allow-scripts allow-same-origin"
        style="width:480px;height:70px;border:1px solid #999"></iframe>
<script type="module">
  const log = (m) => document.getElementById('log').textContent += m + '\n'
  window.addEventListener('message', (e) => {
    log('IN  <-- ' + JSON.stringify(e.data))
  })
  const frame = document.getElementById('frame')
  document.getElementById('sendInit').onclick = () => {
    const msg = { type:'SIMID:Player:init', messageId:1, sessionId:'test', args:{ videoDimensions:{w:640,h:360} } }
    frame.contentWindow.postMessage(msg, '*')
    log('OUT --> ' + JSON.stringify(msg))
  }
</script>
</body></html>
```

**Step 2：建立最小 creative 測試頁**

```html
<!-- shared/simid-protocol.test.creative.html -->
<!DOCTYPE html>
<html><body>
<button id="click">Click</button>
<script>
  const post = (type, args={}) => parent.postMessage({ type, sessionId:'test', messageId:Date.now(), args }, '*')
  window.addEventListener('load', () => post('SIMID:Creative:createSession'))
  window.addEventListener('message', (e) => {
    if (e.data.type === 'SIMID:Player:init') post('SIMID:Creative:ready')
  })
  document.getElementById('click').onclick = () => post('SIMID:Creative:clickThru', { url:'https://example.com' })
</script>
</body></html>
```

**Step 3：手動驗證**

開啟 `http://localhost:8080/shared/simid-protocol.test.html`，應看到：
- 頁面載入立即收到 `SIMID:Creative:createSession`
- 點 Send Player:init → 收到 `SIMID:Creative:ready`
- 點 iframe 內 Click → 收到 `SIMID:Creative:clickThru`

**Step 4：Commit**

```bash
git add shared/simid-protocol.test.html shared/simid-protocol.test.creative.html
git commit -m "test: add manual simid protocol harness"
```

---

### Task 2.2：實作 SIMID 協定共用模組（creative 端）

**Files:**
- Create: `shared/simid-protocol.js`
- Create: `shared/simid-base.css`

**Step 1：實作 simid-protocol.js**

```javascript
// shared/simid-protocol.js — 載入於 SIMID creative iframe 內
export class SimidCreative {
  constructor() {
    this.sessionId = crypto.randomUUID()
    this.messageCounter = 0
    this.environmentData = null
    this.listeners = new Map()

    window.addEventListener('message', (e) => this._onMessage(e))
  }

  start() {
    this._send('SIMID:Creative:createSession')
  }

  on(type, cb) {
    if (!this.listeners.has(type)) this.listeners.set(type, [])
    this.listeners.get(type).push(cb)
  }

  ready() { this._send('SIMID:Creative:ready') }
  clickThru(url) { this._send('SIMID:Creative:clickThru', { url }) }
  expand(w, h) {
    this._send('SIMID:Creative:expandNonlinear', { requestedDimensions: { width: w, height: h } })
  }
  collapse() { this._send('SIMID:Creative:collapseNonlinear') }
  requestStop(reason = 'user_close') { this._send('SIMID:Creative:requestStop', { reason }) }
  fatalError(code, message) { this._send('SIMID:Creative:fatalError', { code, message }) }
  log(data) { this._send('SIMID:Creative:log', { data }) }

  _send(type, args = {}) {
    const msg = {
      sessionId: this.sessionId,
      messageId: ++this.messageCounter,
      type,
      timestamp: Date.now(),
      args
    }
    parent.postMessage(msg, '*')
  }

  _onMessage(e) {
    const data = e.data
    if (!data || typeof data !== 'object' || !data.type) return
    if (data.type === 'SIMID:Player:init') this.environmentData = data.args?.environmentData
    const cbs = this.listeners.get(data.type) || []
    cbs.forEach((cb) => {
      try { cb(data.args, data) } catch (err) { this.fatalError('handler_error', err.message) }
    })
  }
}
```

**Step 2：實作 simid-base.css**

```css
/* shared/simid-base.css — SIMID creative 共用樣式 */
html, body {
  margin: 0; padding: 0; width: 100%; height: 100%;
  background: transparent; font-family: -apple-system, Segoe UI, sans-serif;
  color: #fff; overflow: hidden;
}
.simid-overlay {
  position: fixed; inset: 0; background: rgba(20,22,28,0.92);
  border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
  display: flex; align-items: center; padding: 8px 12px; gap: 12px;
}
.simid-badge {
  position: absolute; top: 4px; right: 28px;
  background: rgba(0,0,0,0.5); color: #fff; font-size: 9px;
  padding: 1px 4px; border-radius: 3px; letter-spacing: 1px;
}
.simid-close {
  position: absolute; top: 4px; right: 6px;
  width: 18px; height: 18px; border: none; border-radius: 50%;
  background: rgba(0,0,0,0.6); color: #fff; cursor: pointer;
  font-size: 12px; line-height: 1; padding: 0;
}
.simid-cta {
  background: #4a9eff; color: #fff; border: none;
  padding: 6px 14px; border-radius: 4px; cursor: pointer;
  font-size: 13px; font-weight: 600;
}
```

**Step 3：Commit**

```bash
git add shared/simid-protocol.js shared/simid-base.css
git commit -m "feat: add SIMID creative-side protocol module"
```

---

### Task 2.3：實作 SIMID 協定共用模組（player 端）

**Files:**
- Create: `player/simid-host.js`

**Step 1：實作 simid-host.js**

```javascript
// player/simid-host.js — 主頁面用，管理 SIMID iframe 生命週期
export class SimidHost {
  constructor({ container, logger }) {
    this.container = container
    this.logger = logger
    this.iframe = null
    this.messageCounter = 0
    this.sessionId = null
    this.initTimeout = null
    this._onMessage = this._onMessage.bind(this)
  }

  load({ src, width, height, position = 'bottom' }) {
    this.destroy()
    this.iframe = document.createElement('iframe')
    this.iframe.sandbox = 'allow-scripts allow-same-origin'
    this.iframe.style.cssText = `
      position: absolute; left: 50%; transform: translateX(-50%);
      ${position === 'bottom' ? 'bottom: 16px;' : 'top: 16px;'}
      width: ${width}px; height: ${height}px; border: 0;
      background: transparent; transition: width .25s, height .25s;
    `
    this.iframe.src = src
    this.container.appendChild(this.iframe)

    window.addEventListener('message', this._onMessage)

    this.initTimeout = setTimeout(() => {
      this.logger.log('err', 'SIMID init timeout (5s)')
      this.destroy()
    }, 5000)
  }

  resize(width, height) {
    if (!this.iframe) return
    this.iframe.style.width = width + 'px'
    this.iframe.style.height = height + 'px'
  }

  destroy() {
    window.removeEventListener('message', this._onMessage)
    if (this.initTimeout) clearTimeout(this.initTimeout)
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe)
    }
    this.iframe = null
    this.sessionId = null
  }

  _send(type, args = {}) {
    if (!this.iframe) return
    const msg = {
      sessionId: this.sessionId,
      messageId: ++this.messageCounter,
      type,
      timestamp: Date.now(),
      args
    }
    this.iframe.contentWindow.postMessage(msg, '*')
    this.logger.log('out', JSON.stringify(msg))
  }

  _onMessage(e) {
    if (!this.iframe || e.source !== this.iframe.contentWindow) return
    const data = e.data
    if (!data || typeof data !== 'object' || !data.type) return
    this.logger.log('in', JSON.stringify(data))

    switch (data.type) {
      case 'SIMID:Creative:createSession':
        this.sessionId = data.sessionId
        this._send('SIMID:Player:init', {
          environmentData: {
            videoDimensions: {
              width: this.container.clientWidth,
              height: this.container.clientHeight
            },
            muted: false,
            currentSrc: 'content.mp4'
          }
        })
        break
      case 'SIMID:Creative:ready':
        clearTimeout(this.initTimeout)
        this._send('SIMID:Player:startCreative')
        break
      case 'SIMID:Creative:clickThru':
        window.open(data.args?.url, '_blank', 'noopener,noreferrer')
        break
      case 'SIMID:Creative:expandNonlinear':
        const dims = data.args?.requestedDimensions
        if (dims) this.resize(dims.width, dims.height)
        break
      case 'SIMID:Creative:collapseNonlinear':
        // 由 creative 自行在 expand 前記錄初始尺寸後 resize 回去
        break
      case 'SIMID:Creative:requestStop':
        this._send('SIMID:Player:adStopped')
        this.destroy()
        break
      case 'SIMID:Creative:fatalError':
        this.logger.log('err', `SIMID fatalError: ${data.args?.code} ${data.args?.message}`)
        this.destroy()
        break
    }
  }
}
```

**Step 2：Commit**

```bash
git add player/simid-host.js
git commit -m "feat: add SIMID host module for main player"
```

---

### Task 2.4：實作 log 面板與 app 入口

**Files:**
- Create: `app/logger.js`
- Create: `app/app.js`
- Create: `scenarios/scenarios.json`

**Step 1：實作 logger.js**

```javascript
// app/logger.js
export class Logger {
  constructor(el) { this.el = el }
  log(type, message) {
    const ts = new Date().toISOString().slice(11, 23)
    const prefix = { in: '← IN ', out: '→ OUT', sys: '  SYS', err: '  ERR' }[type] || '   ?  '
    const div = document.createElement('div')
    div.className = 'log-entry ' + type
    div.textContent = `[${ts}] ${prefix}  ${message}`
    this.el.appendChild(div)
    this.el.scrollTop = this.el.scrollHeight
  }
  clear() { this.el.innerHTML = '' }
}
```

**Step 2：實作 scenarios.json**

```json
[
  {
    "id": "01-basic",
    "title": "01 Basic Overlay",
    "description": "SIMID 最小握手實作",
    "vast": "/scenarios/01-basic/vast.xml"
  }
]
```

> 其餘場景會在對應階段加入。

**Step 3：實作 app.js（場景選單 + 事件綁定，不含 IMA 整合）**

```javascript
// app/app.js
import { Logger } from '/app/logger.js'

const logger = new Logger(document.getElementById('logBody'))
window.__logger = logger   // 方便 console debug
logger.log('sys', 'App initialized')

const state = { activeScenario: null, player: null }

async function loadScenarios() {
  const res = await fetch('/scenarios/scenarios.json')
  const list = await res.json()
  const ul = document.getElementById('scenarioItems')
  ul.innerHTML = ''
  list.forEach((s) => {
    const li = document.createElement('li')
    li.textContent = s.title
    li.title = s.description
    li.dataset.id = s.id
    li.onclick = () => selectScenario(s)
    ul.appendChild(li)
  })
}

function selectScenario(scenario) {
  document.querySelectorAll('#scenarioItems li').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === scenario.id)
  })
  state.activeScenario = scenario
  logger.log('sys', `Scenario selected: ${scenario.title}`)
  if (state.player) state.player.loadScenario(scenario)
}

document.getElementById('clearLogBtn').onclick = () => logger.clear()

loadScenarios()
```

**Step 4：驗證**

啟動 server，瀏覽器開啟首頁，左側應顯示「01 Basic Overlay」，點擊後 log 出現 `Scenario selected`。

**Step 5：Commit**

```bash
git add app/logger.js app/app.js scenarios/scenarios.json
git commit -m "feat: add logger and scenario menu"
```

---

## 階段 3：IMA SDK 播放器整合

### Task 3.1：實作 IMA SDK 播放器封裝

**Files:**
- Create: `player/player.js`
- Create: `player/player.css`

**Step 1：實作 player.css（空檔，未來補細節樣式）**

```css
/* 目前使用 app.css 即可，保留檔案以便日後擴充 */
```

**Step 2：實作 player.js**

```javascript
// player/player.js
import { SimidHost } from '/player/simid-host.js'

export class Player {
  constructor({ video, adContainer, logger }) {
    this.video = video
    this.adContainer = adContainer
    this.logger = logger
    this.simidHost = new SimidHost({ container: adContainer, logger })

    this.adDisplayContainer = null
    this.adsLoader = null
    this.adsManager = null

    this._initIma()
  }

  _initIma() {
    google.ima.settings.setLocale('zh-TW')
    this.adDisplayContainer = new google.ima.AdDisplayContainer(
      this.adContainer, this.video
    )
    this.adsLoader = new google.ima.AdsLoader(this.adDisplayContainer)

    this.adsLoader.addEventListener(
      google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      (e) => this._onAdsManagerLoaded(e)
    )
    this.adsLoader.addEventListener(
      google.ima.AdErrorEvent.Type.AD_ERROR,
      (e) => this.logger.log('err', 'IMA AdError: ' + e.getError())
    )
  }

  loadScenario(scenario) {
    this.logger.log('sys', 'Loading VAST: ' + scenario.vast)
    this.simidHost.destroy()

    // For Non-linear overlay, we bypass IMA ad playback entirely and
    // manually fetch + parse VAST to extract the SIMID creative URL.
    // （IMA SDK 對 SIMID non-linear 的支援仍有限制，改用自實作解析確保 demo 穩定。）
    this._loadSimidFromVast(scenario.vast)
  }

  async _loadSimidFromVast(vastUrl) {
    try {
      const xml = await fetch(vastUrl).then((r) => r.text())
      const doc = new DOMParser().parseFromString(xml, 'application/xml')
      const nonLinear = doc.querySelector('NonLinear')
      if (!nonLinear) throw new Error('No <NonLinear> found in VAST')
      const width = parseInt(nonLinear.getAttribute('width'), 10) || 480
      const height = parseInt(nonLinear.getAttribute('height'), 10) || 70
      const iframeRes = nonLinear.querySelector('IFrameResource')
      if (!iframeRes) throw new Error('Only IFrameResource supported in this prototype')
      const src = iframeRes.textContent.trim()
      this.simidHost.load({ src, width, height, position: 'bottom' })
      this.video.play().catch(() => {})
    } catch (err) {
      this.logger.log('err', 'VAST parse failed: ' + err.message)
    }
  }
}
```

> **註**：IMA SDK 的 `adTagUrl` 方式對 SIMID non-linear 支援在不同版本行為不一致。為確保 demo 穩定，採直接解析 VAST 抽出 `IFrameResource` 的做法。IMA SDK 仍用於：(1) 展示 `AdDisplayContainer` 概念、(2) 日後擴充 linear ad 時無縫切換。這個決策已於設計文件第 2 節記錄。

**Step 3：於 app.js 建立 Player 實例**

修改 `app/app.js`，在 `loadScenarios()` 前加：

```javascript
import { Player } from '/player/player.js'
// ...（保留原本程式）

state.player = new Player({
  video: document.getElementById('contentVideo'),
  adContainer: document.getElementById('adContainer'),
  logger
})
```

**Step 4：Commit**

```bash
git add player/player.js player/player.css app/app.js
git commit -m "feat: add IMA SDK player wrapper with VAST non-linear parser"
```

---

## 階段 4：場景 01 — Basic Overlay（端到端驗證）

此階段完成後，整個架構會跑通一次。後續場景只需複製 pattern。

### Task 4.1：建立場景 01 的 VAST XML

**Files:**
- Create: `scenarios/01-basic/vast.xml`

**Step 1：撰寫 VAST**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<VAST version="4.2" xmlns="http://www.iab.com/VAST">
  <Ad id="basic-overlay">
    <InLine>
      <AdSystem>LocalPrototype</AdSystem>
      <AdTitle>Basic Non-linear Overlay</AdTitle>
      <Impression><![CDATA[/dev/null]]></Impression>
      <Creatives>
        <Creative id="simid-basic">
          <NonLinearAds>
            <NonLinear width="480" height="70" minSuggestedDuration="00:00:15" apiFramework="SIMID">
              <IFrameResource><![CDATA[/scenarios/01-basic/simid.html]]></IFrameResource>
              <NonLinearClickThrough><![CDATA[https://example.com/landing]]></NonLinearClickThrough>
            </NonLinear>
          </NonLinearAds>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>
```

**Step 2：Commit**

```bash
git add scenarios/01-basic/vast.xml
git commit -m "feat(scenario-01): add basic overlay VAST"
```

---

### Task 4.2：建立場景 01 的 SIMID Creative

**Files:**
- Create: `scenarios/01-basic/simid.html`

**Step 1：撰寫 simid.html**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="/shared/simid-base.css">
  <style>
    .simid-overlay { justify-content: space-between; }
    .brand { font-weight: 700; font-size: 14px; }
    .headline { font-size: 12px; color: #bbb; }
  </style>
</head>
<body>
  <div class="simid-overlay">
    <div>
      <div class="brand">SampleBrand</div>
      <div class="headline">春季新品 85 折開賣中</div>
    </div>
    <button class="simid-cta" id="cta">了解更多</button>
    <span class="simid-badge">廣告 AD</span>
    <button class="simid-close" id="close">✕</button>
  </div>
  <script type="module">
    import { SimidCreative } from '/shared/simid-protocol.js'
    const simid = new SimidCreative()
    simid.on('SIMID:Player:init', () => simid.ready())
    document.getElementById('cta').onclick = () =>
      simid.clickThru('https://example.com/landing?s=01')
    document.getElementById('close').onclick = () =>
      simid.requestStop('user_close')
    simid.start()
  </script>
</body>
</html>
```

**Step 2：端到端驗證**

1. 啟動 `node server.js`
2. 瀏覽器開啟 `http://localhost:8080`
3. 點擊「01 Basic Overlay」
4. 影片下方應出現半透明 banner
5. Log 面板依序顯示：
   - `SIMID:Creative:createSession`
   - `SIMID:Player:init`（OUT）
   - `SIMID:Creative:ready`
   - `SIMID:Player:startCreative`（OUT）
6. 點擊 CTA → 新分頁開啟 example.com
7. 點擊 ✕ → overlay 消失，log 顯示 `requestStop` 與 `adStopped`

**Step 3：Commit**

```bash
git add scenarios/01-basic/simid.html
git commit -m "feat(scenario-01): add basic simid creative"
```

---

## 階段 5-9：其餘場景

> 每個場景都遵循相同 pattern：
> 1. 加入 `scenarios.json` 條目
> 2. 新增 `scenarios/NN-xxx/vast.xml`
> 3. 新增 `scenarios/NN-xxx/simid.html`
> 4. 手動端到端驗證
> 5. Commit

---

### Task 5：場景 02 — Expand/Collapse

**Files:** `scenarios/02-expand/vast.xml`, `scenarios/02-expand/simid.html`, 修改 `scenarios.json`

**VAST 關鍵 NonLinear 屬性：**
```xml
<NonLinear width="320" height="50" expandedWidth="640" expandedHeight="360" apiFramework="SIMID">
  <IFrameResource><![CDATA[/scenarios/02-expand/simid.html]]></IFrameResource>
</NonLinear>
```

**SIMID 邏輯：**
- 預設態：小 banner「查看產品詳情 ▸」
- 點擊 banner → `simid.expand(640, 360)`
- 展開態：產品大圖 + 描述 + CTA + ✕
- 點擊 ✕（展開態）→ `simid.collapse()` 後自行 `this.resize(320, 50)`
- 需在 `simid-host.js` 支援 `collapseNonlinear` 訊息（已在 host 處理，但需補：host 接到 `collapseNonlinear` 時 resize 回預設，creative 需透過 `SIMID:Creative:log` 帶 `initialSize` 或 host 記憶預設尺寸）

**Host 端補強**：在 `load()` 時記憶 `this.defaultWidth/defaultHeight`，`collapseNonlinear` 訊息處理改為 `this.resize(this.defaultWidth, this.defaultHeight)`。

**驗收**：動畫流暢、展開/收合均能觸發。

**Commit**：`feat(scenario-02): add expand/collapse scenario`

---

### Task 6：場景 03 — Carousel

**Files:** `scenarios/03-carousel/vast.xml`, `scenarios/03-carousel/simid.html`

**VAST：** `width=728 height=150`

**SIMID 邏輯：**
- 3 張圖片（用 placeholder 圖 URL 或 shared/assets/product-1~3.jpg）
- `setInterval(3000)` 自動切換
- 左右箭頭手動切換
- 每張圖點擊帶參數：`simid.clickThru('https://example.com/p1?s=03&i=' + index)`
- 每次切換發 `simid.log({ carousel: index })`
- 下方小圓點指示器

**素材**：`shared/assets/` 加 3 張 728×150 的色塊 SVG 或下載 placeholder。

**Commit**：`feat(scenario-03): add carousel scenario`

---

### Task 7：場景 04 — Countdown Timer

**Files:** `scenarios/04-countdown/vast.xml`, `scenarios/04-countdown/simid.html`

**VAST：** `width=400 height=80`

**SIMID 邏輯：**
- `endTime = Date.now() + 60 * 1000`（示範 60 秒）
- `setInterval(1000)` 更新 `MM:SS` 顯示
- 結束時 CTA 變「已結束」按鈕 disabled
- `setTimeout(5000)` 後自動 `simid.requestStop('countdown_ended')`
- 期間點擊 CTA → `simid.clickThru(...)`

**Commit**：`feat(scenario-04): add countdown scenario`

---

### Task 8：場景 05 — Form Capture

**Files:** `scenarios/05-form/vast.xml`, `scenarios/05-form/simid.html`

**VAST：** `width=320 height=60 expandedWidth=480 expandedHeight=280`

**SIMID 邏輯：**
- 預設態：小 banner「留下 Email 領 9 折優惠」
- 點擊展開 → `simid.expand(480, 280)`
- 展開態：`<input type="email">` + `<button>` + 隱私連結
- 送出按鈕：
  - 驗證正則 `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
  - 驗證失敗：欄位紅框 + 錯誤訊息
  - 成功：顯示「訂閱成功！」+ `simid.log({ email: value })`
  - 3 秒後 `simid.requestStop('form_submitted')`

**安全注意**：不要把真實 email 存在任何地方，log 只給 demo 看。

**Commit**：`feat(scenario-05): add form capture scenario`

---

### Task 9：場景 06 — Mini Game

**Files:** `scenarios/06-minigame/vast.xml`, `scenarios/06-minigame/simid.html`

**VAST：** `width=320 height=60 expandedWidth=500 expandedHeight=400`

**SIMID 邏輯：**
- 預設態：「點擊挑戰 3 秒得高分！」
- 展開 → 500×400 遊戲區
- 遊戲：`<canvas>` 或純 DOM，氣球每 400ms 隨機位置出現、點到消失並加 1 分
- 3 秒倒數結束 → 顯示得分 + 「領取獎品」CTA
- CTA 點擊：`simid.clickThru('https://example.com/reward?s=06&score=' + score)`
- `simid.log({ finalScore: score })`

**Commit**：`feat(scenario-06): add minigame scenario`

---

## 階段 10：最終驗收與 README

### Task 10.1：更新 scenarios.json 完整列表

**Files:** `scenarios/scenarios.json`

確保所有 6 場景都在列表中並有正確 title、description、vast 路徑。

### Task 10.2：執行完整驗收 checklist

依照設計文件第 8 節的 checklist 手動驗收，修正任何問題。

### Task 10.3：完善 README

補充：
- 安裝與啟動步驟
- 首次執行需下載影片（Task 1.3 的 curl 指令）
- 各場景截圖（可選）
- 架構圖（複製自設計文件）
- IMA SDK 版本說明
- 瀏覽器需求（Chrome 最新版）
- 已知限制

### Task 10.4：最終 commit

```bash
git add .
git commit -m "docs: finalize README and scenario list"
```

---

## 驗收 Checklist 總覽

### 基本功能
- [ ] 6 場景全部能從選單切換並載入
- [ ] 內容影片播放/暫停/繼續正常
- [ ] Overlay 位置與尺寸符合 VAST 規格
- [ ] ✕ 關閉按鈕所有場景均生效
- [ ] clickThru 開啟新分頁

### 場景專屬
- [ ] 場景 02 展開/收合動畫流暢
- [ ] 場景 03 自動輪播 + 手動切換
- [ ] 場景 04 倒數準確（偏差 < 1 秒）
- [ ] 場景 05 Email 驗證與送出流程
- [ ] 場景 06 遊戲計分準確

### 協定
- [ ] Log 面板顯示完整 IN/OUT postMessage
- [ ] Log 格式可讀（時間戳 + 方向 + 事件 + payload）
- [ ] iframe sandbox 屬性正確
- [ ] origin 不匹配的訊息被忽略

---

## 執行原則

- DRY：共用樣式放 `shared/simid-base.css`，共用協定放 `shared/simid-protocol.js`
- YAGNI：不實作不需要的 SIMID 訊息、不做 ad server、不做自動化測試
- TDD：此原型採手動驗收（Task 2.1 的 test harness 是例外）
- 頻繁 commit：每個 Task 結尾都 commit
