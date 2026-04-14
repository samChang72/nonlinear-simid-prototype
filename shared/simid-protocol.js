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
