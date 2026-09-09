import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { db } from '../db.js'

export const parentsRouter = Router()

parentsRouter.get('/', (req, res) => {
  const { studentId } = req.query
  if (!studentId)
    return res.status(400).json({ error: 'studentId query param is required' })

  const parent = db
    .prepare('SELECT id, name FROM parents WHERE student_id = ?')
    .get(studentId)

  res.json(parent || null)
})

parentsRouter.post('/', (req, res) => {
  const { studentId, name, pin } = req.body
  if (!studentId || !name || !pin || String(pin).length < 4) {
    return res
      .status(400)
      .json({
        error: 'studentId, name, and a pin of at least 4 digits are required'
      })
  }

  const student = db
    .prepare('SELECT id FROM students WHERE id = ?')
    .get(studentId)
  if (!student) return res.status(404).json({ error: 'Student not found' })

  const existing = db
    .prepare('SELECT id FROM parents WHERE student_id = ?')
    .get(studentId)
  if (existing)
    return res
      .status(409)
      .json({
        error:
          'This student already has a parent account. Use reset-pin instead.'
      })

  const id = uuid()
  db.prepare(
    'INSERT INTO parents (id, student_id, name, pin) VALUES (?, ?, ?, ?)'
  ).run(id, studentId, name, String(pin))
  console.log(`[PARENTS] Added parent ${name} for student ${studentId}`)
  res.status(201).json({ id, studentId, name })
})

parentsRouter.post('/:studentId/reset-pin', (req, res) => {
  const { newPin } = req.body
  if (!newPin || String(newPin).length < 4) {
    return res.status(400).json({ error: 'newPin must be at least 4 digits' })
  }

  const parent = db
    .prepare('SELECT id FROM parents WHERE student_id = ?')
    .get(req.params.studentId)
  if (!parent)
    return res
      .status(404)
      .json({ error: 'No parent account exists for this student yet' })

  db.prepare('UPDATE parents SET pin = ? WHERE student_id = ?').run(
    String(newPin),
    req.params.studentId
  )
  console.log(`[PARENTS] PIN reset for student ${req.params.studentId}`)
  res.json({ ok: true })
})

parentsRouter.post('/login', (req, res) => {
  const { studentId, pin } = req.body
  if (!studentId || !pin)
    return res.status(400).json({ error: 'studentId and pin are required' })

  const parent = db
    .prepare(
      'SELECT id, student_id as studentId, name, pin FROM parents WHERE student_id = ?'
    )
    .get(studentId)

  if (!parent) {
    return res
      .status(404)
      .json({
        error:
          'No parent account is set up for this student yet. Ask the teacher to add one.'
      })
  }
  if (String(parent.pin) !== String(pin))
    return res.status(401).json({ error: 'Incorrect PIN' })

  const { pin: _pin, ...safe } = parent
  res.json(safe)
})
