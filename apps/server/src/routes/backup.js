import { Router } from 'express'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'mina_teacher.db')

export const backupRouter = Router()

// Downloads the entire SQLite database file - every teacher, student,
// curriculum, mastery score, lesson, and report - as one file. This is
// the whole school's data, so treat the downloaded file like any other
// sensitive record.
backupRouter.get('/', (req, res) => {
  if (!fs.existsSync(DB_PATH)) {
    return res
      .status(404)
      .json({ error: 'No database file found yet - nothing to back up.' })
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `mina_teacher_backup_${stamp}.db`

  res.download(DB_PATH, filename, err => {
    if (err) console.error('[BACKUP] Download failed:', err.message)
  })
})
