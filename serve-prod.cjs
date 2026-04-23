/* Servidor de `dist` para produção (Heroku ou `npm start` local). */
const { spawn } = require('node:child_process')
const { resolve } = require('node:path')

const dist = resolve(__dirname, 'dist')
const port = String(process.env.PORT || 3000)
const listen = `tcp://0.0.0.0:${port}`
const serveMain = resolve(__dirname, 'node_modules', 'serve', 'build', 'main.js')

const child = spawn(
  process.execPath,
  [serveMain, '-s', dist, '-l', listen],
  { stdio: 'inherit', cwd: __dirname, env: { ...process.env, PORT: port } }
)

child.on('exit', (code) => process.exit(code == null ? 1 : code))
