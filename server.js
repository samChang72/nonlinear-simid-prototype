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
  let urlPath
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0])
  } catch {
    res.writeHead(400)
    res.end('Bad Request')
    return
  }
  const filePath = path.resolve(ROOT, '.' + (urlPath === '/' ? '/index.html' : urlPath))

  // 安全：禁止跳出 ROOT（用 path.relative 判斷，避開 startsWith 的前綴誤判）
  const rel = path.relative(ROOT, filePath)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
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
