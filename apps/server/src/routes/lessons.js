import { Router } from 'express'
import { db } from '../db.js'
import {
  getNextTopic,
  generateLesson,
  sanitizeLessonForClient,
  gradeAndRecordAttempt
} from '../ai/lessonEngine.js'

export const lessonsRouter = Router()

// Figures out the next topic for a student in a subject (based on their
// mastery scores), generates a fresh lesson+quiz for it, and returns it
// WITHOUT correct answers.
lessonsRouter.get('/next', async (req, res) => {
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

  const topic = getNextTopic(studentId, subject)
  if (!topic) {
    return res.json({
      done: true,
      message: 'All topics in this subject are currently mastered.'
    })
  }

  try {
    const lesson = await generateLesson(studentId, topic)
    res.json({
      done: false,
      topic: {
        id: topic.id,
        title: topic.title,
        competencyCode: topic.competencyCode,
        currentMastery: topic.currentMastery
      },
      lesson: sanitizeLessonForClient(lesson)
    })
  } catch (e) {
    console.error('[LESSONS] Failed to generate lesson:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// Grades a submitted quiz attempt server-side and updates mastery.
lessonsRouter.post('/:lessonId/submit', (req, res) => {
  const { studentId, answers } = req.body
  if (!studentId || !Array.isArray(answers)) {
    return res
      .status(400)
      .json({ error: 'studentId and answers[] are required' })
  }

  try {
    const result = gradeAndRecordAttempt(
      req.params.lessonId,
      studentId,
      answers
    )
    res.json(result)
  } catch (e) {
    console.error('[LESSONS] Failed to grade attempt:', e.message)
    res.status(500).json({ error: e.message })
  }
})
