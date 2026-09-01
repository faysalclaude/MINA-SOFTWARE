import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { db } from '../db.js'

export const studentsRouter = Router()

// Add a student to a teacher's roster, with the student's own login PIN,
// and optionally a linked parent account (name + PIN) in the same step.
studentsRouter.post('/', (req, res) => {
  const { teacherId, name, age, grade, paceHint, pin, parentName, parentPin } =
    req.body
  if (!teacherId || !name || age == null || grade == null || !pin) {
    return res
      .status(400)
      .json({ error: 'teacherId, name, age, grade, and pin are required' })
  }

  const teacher = db
    .prepare('SELECT id FROM teachers WHERE id = ?')
    .get(teacherId)
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' })

  const id = uuid()
  db.prepare(
    'INSERT INTO students (id, teacher_id, name, age, grade, pace_hint, pin) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, teacherId, name, age, grade, paceHint || 'average', String(pin))

  if (parentName && parentPin) {
    db.prepare(
      'INSERT INTO parents (id, student_id, name, pin) VALUES (?, ?, ?, ?)'
    ).run(uuid(), id, parentName, String(parentPin))
  }

  console.log(
    `[STUDENTS] Added ${name} (grade ${grade}) to teacher ${teacherId}`
  )
  res
    .status(201)
    .json({ id, teacherId, name, age, grade, paceHint: paceHint || 'average' })
})

// List a teacher's students. Deliberately does NOT include the pin - this
// endpoint is also used pre-login (student/parent picking their name from
// a list), so it must stay safe to show before authentication.
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

// Student login - matches the student's own PIN.
studentsRouter.post('/:id/login', (req, res) => {
  const { pin } = req.body
  const student = db
    .prepare(
      'SELECT id, teacher_id as teacherId, name, age, grade, pin FROM students WHERE id = ?'
    )
    .get(req.params.id)

  if (!student) return res.status(404).json({ error: 'Student not found' })
  if (String(student.pin) !== String(pin))
    return res.status(401).json({ error: 'Incorrect PIN' })

  const { pin: _pin, ...safe } = student
  res.json(safe)
})

studentsRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id)
  console.log(`[STUDENTS] Deleted ${req.params.id}`)
  res.status(204).send()
})
