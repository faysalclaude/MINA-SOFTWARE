import { Router } from 'express'
import { db } from '../db.js'
import {
  generateDiagnosticQuiz,
  gradeDiagnosticQuiz
} from '../ai/diagnosticEngine.js'

export const diagnosticRouter = Router()

diagnosticRouter.get('/quiz', async (req, res) => {
  const { studentId, subject } = req.query
  if (!studentId || !subject) {
    return res
      .status(400)
      .json({ error: 'studentId and subject query params are required' })
  }

  const student = db
    .prepare('SELECT id FROM students WHERE id = ?')
    .get(studentId)
  if (!student) return res.status(404).json({ error: 'Student not found' })

  try {
    const quiz = await generateDiagnosticQuiz(studentId, subject)
    res.json(quiz)
  } catch (e) {
    console.error('[DIAGNOSTIC] Failed to generate quiz:', e.message)
    res.status(500).json({ error: e.message })
  }
})

diagnosticRouter.post('/submit', (req, res) => {
  const { diagnosticId, studentId, answers } = req.body
  if (!diagnosticId || !studentId || !Array.isArray(answers)) {
    return res
      .status(400)
      .json({ error: 'diagnosticId, studentId, and answers[] are required' })
  }

  try {
    const result = gradeDiagnosticQuiz(diagnosticId, studentId, answers)
    res.json(result)
  } catch (e) {
    console.error('[DIAGNOSTIC] Failed to grade quiz:', e.message)
    res.status(500).json({ error: e.message })
  }
})
