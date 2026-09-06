import { Router } from 'express'
import { db } from '../db.js'
import {
  generateCurriculumForStudent,
  getCurriculumForStudent,
  reviewTeacherCurriculum,
  getSubjectsForGradeWithLabels
} from '../ai/curriculumEngine.js'

export const curriculumRouter = Router()

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

curriculumRouter.post('/teacher-submit', async (req, res) => {
  const { studentId, subject, draftText } = req.body
  if (!studentId || !subject || !draftText) {
    return res
      .status(400)
      .json({ error: 'studentId, subject, and draftText are required' })
  }

  const student = db
    .prepare('SELECT id FROM students WHERE id = ?')
    .get(studentId)
  if (!student) return res.status(404).json({ error: 'Student not found' })

  try {
    const result = await reviewTeacherCurriculum(studentId, subject, draftText)
    res.json(result)
  } catch (e) {
    console.error('[CURRICULUM] Teacher-submit review failed:', e.message)
    res.status(500).json({ error: e.message })
  }
})

curriculumRouter.get('/subjects', (req, res) => {
  const grade = Number(req.query.grade)
  if (!grade)
    return res.status(400).json({ error: 'grade query param is required' })
  res.json(getSubjectsForGradeWithLabels(grade))
})

curriculumRouter.get('/', (req, res) => {
  const { studentId } = req.query
  if (!studentId)
    return res.status(400).json({ error: 'studentId query param is required' })
  res.json(getCurriculumForStudent(studentId))
})
