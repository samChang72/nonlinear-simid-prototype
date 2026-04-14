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
