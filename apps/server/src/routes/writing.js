import { Router } from 'express'
import { db } from '../db.js'
import { getNextTopic } from '../ai/lessonEngine.js'
import { generatePromptForTopic, evaluateWriting } from '../ai/writingEngine.js'

export const writingRouter = Router()

writingRouter.get('/prompt', async (req, res) => {
  const { studentId, subject } = req.query
  if (!studentId || !subject) {
    return res
      .status(400)
      .json({ error: 'studentId and subject query params are required' })
  }

  const student = db
    .prepare('SELECT * FROM students WHERE id = ?')
    .get(studentId)
  if (!student) return res.status(404).json({ error: 'Student not found' })

  const topic = getNextTopic(studentId, subject)
  if (!topic) return res.json({ done: true })

  try {
    const prompt = await generatePromptForTopic(student, topic)
    res.json({
      done: false,
      topicId: topic.id,
      topicTitle: topic.title,
      prompt
    })
  } catch (e) {
    console.error('[WRITING] Failed to generate prompt:', e.message)
    res.status(500).json({ error: e.message })
  }
})

writingRouter.post('/evaluate', async (req, res) => {
  const { studentId, topicId, prompt, submission } = req.body
  if (!studentId || !prompt || !submission) {
    return res
      .status(400)
      .json({ error: 'studentId, prompt, and submission are required' })
  }

  const student = db
    .prepare('SELECT * FROM students WHERE id = ?')
    .get(studentId)
  if (!student) return res.status(404).json({ error: 'Student not found' })

  try {
    const result = await evaluateWriting(
      studentId,
      topicId,
      prompt,
      submission,
      student
    )
    res.json(result)
  } catch (e) {
    console.error('[WRITING] Failed to evaluate:', e.message)
    res.status(500).json({ error: e.message })
  }
})
