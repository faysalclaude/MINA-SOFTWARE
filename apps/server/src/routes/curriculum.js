import { Router } from 'express'
import { db } from '../db.js'
import {
  generateCurriculumForStudent,
  getCurriculumForStudent
} from '../ai/curriculumEngine.js'

export const curriculumRouter = Router()

// Triggers MINA to generate (or regenerate) a full multi-subject
// curriculum for one student. This calls the local AI model once per
// subject, so it can take anywhere from ~30 seconds to a few minutes
// depending on the server's hardware.
curriculumRouter.post('/generate', async (req, res) => {
  const { studentId } = req.body
  if (!studentId)
    return res.status(400).json({ error: 'studentId is required' })

  const student = db
    .prepare('SELECT id FROM students WHERE id = ?')
    .get(studentId)
  if (!student) return res.status(404).json({ error: 'Student not found' })

  try {
    const results = await generateCurriculumForStudent(studentId)
    res.json({ results })
  } catch (e) {
    console.error('[CURRICULUM] Generation failed:', e.message)
    res.status(500).json({ error: e.message })
  }
})

curriculumRouter.get('/', (req, res) => {
  const { studentId } = req.query
  if (!studentId)
    return res.status(400).json({ error: 'studentId query param is required' })
  res.json(getCurriculumForStudent(studentId))
})
