import { Router } from 'express'
import { db } from '../db.js'
import { getCurriculumForStudent } from '../ai/curriculumEngine.js'

export const analyticsRouter = Router()

// Whole-class snapshot: every student's overall and per-subject mastery,
// so a teacher can see at a glance who's ahead and who needs attention
// without opening each student individually.
analyticsRouter.get('/class-overview', (req, res) => {
  const { teacherId } = req.query
  if (!teacherId)
    return res.status(400).json({ error: 'teacherId query param is required' })

  const students = db
    .prepare(
      'SELECT id, name, grade, age FROM students WHERE teacher_id = ? ORDER BY name ASC'
    )
    .all(teacherId)

  const overview = students.map(s => {
    const curriculum = getCurriculumForStudent(s.id)
    const totalTopics = curriculum.reduce((sum, c) => sum + c.totalCount, 0)
    const masteredTopics = curriculum.reduce(
      (sum, c) => sum + c.masteredCount,
      0
    )
    const overallPercent =
      totalTopics > 0 ? Math.round((masteredTopics / totalTopics) * 100) : 0

    return {
      id: s.id,
      name: s.name,
      grade: s.grade,
      hasCurriculum: curriculum.length > 0,
      overallPercent,
      subjects: curriculum.map(c => ({
        subject: c.subject,
        subjectLabel: c.subjectLabel,
        masteredCount: c.masteredCount,
        totalCount: c.totalCount
      }))
    }
  })

  res.json(overview)
})
