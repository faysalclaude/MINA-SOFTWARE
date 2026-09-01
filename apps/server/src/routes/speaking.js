import { Router } from 'express'
import { db } from '../db.js'
import { getNextTopic } from '../ai/lessonEngine.js'
import {
  generatePhraseForTopic,
  evaluateSpeaking
} from '../ai/speakingEngine.js'

export const speakingRouter = Router()

// Gets a topic-relevant phrase for the student to read aloud. Reuses the
// same "what's next for this student" logic as regular lessons, so
// speaking practice tracks the same curriculum progression.
speakingRouter.get('/prompt', async (req, res) => {
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
    const phrase = await generatePhraseForTopic(student, topic)
    res.json({
      done: false,
      topicId: topic.id,
      topicTitle: topic.title,
      phrase
    })
  } catch (e) {
    console.error('[SPEAKING] Failed to generate phrase:', e.message)
    res.status(500).json({ error: e.message })
  }
})

speakingRouter.post('/evaluate', async (req, res) => {
  const { studentId, topicId, phrase, transcript } = req.body
  if (!studentId || !topicId || !phrase || transcript == null) {
    return res
      .status(400)
      .json({
        error: 'studentId, topicId, phrase, and transcript are required'
      })
  }

  try {
    const result = await evaluateSpeaking(
      studentId,
      topicId,
      phrase,
      transcript
    )
    res.json(result)
  } catch (e) {
    console.error('[SPEAKING] Failed to evaluate:', e.message)
    res.status(500).json({ error: e.message })
  }
})
