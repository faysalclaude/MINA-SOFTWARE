import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { db } from '../db.js'

export const studentsRouter = Router()

// Add a student to a teacher's roster. This does NOT generate a curriculum
// yet (that's Phase 2) - it just creates the student record.
studentsRouter.post('/', (req, res) => {
  const { teacherId, name, age, grade, paceHint } = req.body
  if (!teacherId || !name || age == null || grade == null) {
    return res
      .status(400)
      .json({ error: 'teacherId, name, age, and grade are required' })
  }

  const teacher = db
    .prepare('SELECT id FROM teachers WHERE id = ?')
    .get(teacherId)
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' })

  const id = uuid()
  db.prepare(
    'INSERT INTO students (id, teacher_id, name, age, grade, pace_hint) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, teacherId, name, age, grade, paceHint || 'average')

  console.log(
    `[STUDENTS] Added ${name} (grade ${grade}) to teacher ${teacherId}`
  )
  res
    .status(201)
    .json({ id, teacherId, name, age, grade, paceHint: paceHint || 'average' })
})

// List a teacher's students.
studentsRouter.get('/', (req, res) => {
  const { teacherId } = req.query
  if (!teacherId)
    return res.status(400).json({ error: 'teacherId query param is required' })

  const rows = db
    .prepare(
      `SELECT id, teacher_id as teacherId, name, age, grade, pace_hint as paceHint, created_at as createdAt
       FROM students WHERE teacher_id = ? ORDER BY name ASC`
    )
    .all(teacherId)

  res.json(rows)
})

studentsRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id)
  console.log(`[STUDENTS] Deleted ${req.params.id}`)
  res.status(204).send()
})
