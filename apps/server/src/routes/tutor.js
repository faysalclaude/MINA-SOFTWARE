import { Router } from 'express'
import { askTutor, getTutorHistory } from '../ai/tutorChat.js'

export const tutorRouter = Router()

tutorRouter.post('/ask', async (req, res) => {
  const { studentId, question, history } = req.body
  if (!studentId || !question) {
    return res
      .status(400)
      .json({ error: 'studentId and question are required' })
  }

  try {
    const result = await askTutor(studentId, question, history || [])
    res.json(result)
  } catch (e) {
    console.error('[TUTOR] Failed to answer:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// Lets a teacher review what a student has been asking MINA directly -
// often the clearest signal of real confusion, beyond quiz scores.
tutorRouter.get('/history', (req, res) => {
  const { studentId } = req.query
  if (!studentId)
    return res.status(400).json({ error: 'studentId query param is required' })
  res.json(getTutorHistory(studentId))
})
