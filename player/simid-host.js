// player/simid-host.js — 主頁面用，管理 SIMID iframe 生命週期
export class SimidHost {
  constructor({ container, logger }) {
    this.container = container
    this.logger = logger
    this.iframe = null
    this.messageCounter = 0
    this.sessionId = null
    this.initTimeout = null
    this.initialWidth = null
    this.initialHeight = null
    this._onMessage = this._onMessage.bind(this)
  }

  load({ src, width, height, position = 'bottom' }) {
    this.destroy()
    this.initialWidth = width
    this.initialHeight = height
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
    this.initialWidth = null
    this.initialHeight = null
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
      case 'SIMID:Creative:expandNonlinear': {
        const dims = data.args?.requestedDimensions
        if (dims) this.resize(dims.width, dims.height)
        break
      }
      case 'SIMID:Creative:collapseNonlinear':
        if (this.initialWidth && this.initialHeight) {
          this.resize(this.initialWidth, this.initialHeight)
        }
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
