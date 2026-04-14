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
    if (typeof google === 'undefined' || !google.ima) {
      this.logger.log('err', 'IMA SDK not loaded')
      return
    }
    google.ima.settings.setLocale('zh-TW')
    this.adDisplayContainer = new google.ima.AdDisplayContainer(
      this.adContainer, this.video
    )
    this.adsLoader = new google.ima.AdsLoader(this.adDisplayContainer)

    // 保留 AD_ERROR listener 以供未來 linear ad fallback 使用。
    // ADS_MANAGER_LOADED listener 已移除：目前 demo 刻意繞過 IMA ad playback，
    // 從未呼叫 requestAds，該事件不會觸發（見 loadScenario）。
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
      const res = await fetch(vastUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const xml = await res.text()
      const doc = new DOMParser().parseFromString(xml, 'application/xml')
      if (doc.querySelector('parsererror')) {
        throw new Error('Invalid VAST XML')
      }
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
