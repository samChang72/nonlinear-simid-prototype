// app/app.js
import { Logger } from '/app/logger.js'
import { Player } from '/player/player.js'

const logger = new Logger(document.getElementById('logBody'))
window.__logger = logger   // 方便 console debug
logger.log('sys', 'App initialized')

const state = { activeScenario: null, player: null }

state.player = new Player({
  video: document.getElementById('contentVideo'),
  adContainer: document.getElementById('adContainer'),
  logger
})

async function loadScenarios() {
  try {
    const res = await fetch('/scenarios/scenarios.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
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
  } catch (err) {
    logger.log('err', `Failed to load scenarios: ${err.message}`)
  }
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
