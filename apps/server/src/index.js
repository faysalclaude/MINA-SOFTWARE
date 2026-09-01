import express from 'express'
import cors from 'cors'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import './db.js'
import { teachersRouter } from './routes/teachers.js'
import { studentsRouter } from './routes/students.js'
import { parentsRouter } from './routes/parents.js'
import { systemRouter } from './routes/system.js'
import { curriculumRouter } from './routes/curriculum.js'
import { lessonsRouter } from './routes/lessons.js'
import { materialsRouter } from './routes/materials.js'
import { speakingRouter } from './routes/speaking.js'
import { writingRouter } from './routes/writing.js'
import { isOllamaRunning, CURRENT_MODEL } from './ai/ollamaClient.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 4000

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/teachers', teachersRouter)
app.use('/api/students', studentsRouter)
app.use('/api/parents', parentsRouter)
app.use('/api/system', systemRouter)
app.use('/api/curriculum', curriculumRouter)
app.use('/api/lessons', lessonsRouter)
app.use('/api/materials', materialsRouter)
app.use('/api/speaking', speakingRouter)
app.use('/api/writing', writingRouter)

const webDist = path.join(__dirname, '..', '..', 'web', 'dist')
app.use(express.static(webDist))
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next()
  res.sendFile(path.join(webDist, 'index.html'), err => {
    if (err)
      res
        .status(200)
        .send(
          'MINA TEACHER server is running. Build the web client to see the UI (see README).'
        )
  })
})

function getLanAddresses () {
  const nets = os.networkInterfaces()
  const addresses = []
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) addresses.push(net.address)
    }
  }
  return addresses
}

app.listen(PORT, '0.0.0.0', async () => {
  console.log('')
  console.log('========================================')
  console.log('  MINA TEACHER server is running')
  console.log('========================================')
  console.log(`  On this PC:      http://localhost:${PORT}`)

  const addrs = getLanAddresses()
  if (addrs.length === 0) {
    console.log('  On the network:  (no WiFi/LAN interface detected)')
  } else {
    for (const addr of addrs) {
      console.log(`  On the network:  http://${addr}:${PORT}`)
    }
    console.log('')
    console.log('  Any phone/laptop on the SAME WiFi can open the "On the')
    console.log('  network" address above in a browser to use MINA TEACHER.')
  }

  const ollamaUp = await isOllamaRunning()
  console.log('')
  console.log(
    `  Ollama (AI engine): ${ollamaUp ? 'running ✔' : 'NOT running ✘'}`
  )
  console.log(`  Model expected:     ${CURRENT_MODEL}`)
  if (!ollamaUp) {
    console.log('  -> Start Ollama on this machine before using AI features.')
    console.log(
      '     (run scripts/setup.sh or scripts/setup.bat if you have not yet)'
    )
  }
  console.log('========================================')
  console.log('')
})
