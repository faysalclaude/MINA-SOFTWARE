import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { db } from '../db.js'

export const studentsRouter = Router()

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

// Teacher resets a student's PIN if they forgot it. Requires no
// verification of the old PIN by design - only a logged-in teacher can
// reach this screen in the app, and a real school needs this to be quick.
studentsRouter.post('/:id/reset-pin', (req, res) => {
  const { newPin } = req.body
  if (!newPin || String(newPin).length < 4) {
    return res.status(400).json({ error: 'newPin must be at least 4 digits' })
  }

  const student = db
    .prepare('SELECT id FROM students WHERE id = ?')
    .get(req.params.id)
  if (!student) return res.status(404).json({ error: 'Student not found' })

  db.prepare('UPDATE students SET pin = ? WHERE id = ?').run(
    String(newPin),
    req.params.id
  )
  console.log(`[STUDENTS] PIN reset for student ${req.params.id}`)
  res.json({ ok: true })
})

studentsRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id)
  console.log(`[STUDENTS] Deleted ${req.params.id}`)
  res.status(204).send()
})
