import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { db } from '../db.js'

export const teachersRouter = Router()

// Create a teacher profile (first-run setup on this server).
teachersRouter.post('/', (req, res) => {
  const { name, schoolName, pin } = req.body
  if (!name || !schoolName || !pin) {
    return res
      .status(400)
      .json({ error: 'name, schoolName, and pin are required' })
  }

  const id = uuid()
  db.prepare(
    'INSERT INTO teachers (id, name, school_name, pin) VALUES (?, ?, ?, ?)'
  ).run(id, name, schoolName, pin)

  console.log(`[TEACHERS] Created teacher ${name} (${id})`)
  res.status(201).json({ id, name, schoolName })
})

// List all teacher profiles on this server (for the login picker).
teachersRouter.get('/', (req, res) => {
  const rows = db
    .prepare(
      'SELECT id, name, school_name as schoolName FROM teachers ORDER BY created_at ASC'
    )
    .all()
  res.json(rows)
})

// Simple PIN login - returns the teacher record if the PIN matches.
teachersRouter.post('/:id/login', (req, res) => {
  const { pin } = req.body
  const teacher = db
    .prepare(
      'SELECT id, name, school_name as schoolName, pin FROM teachers WHERE id = ?'
    )
    .get(req.params.id)

  if (!teacher) return res.status(404).json({ error: 'Teacher not found' })
  if (teacher.pin !== pin)
    return res.status(401).json({ error: 'Incorrect PIN' })

  const { pin: _pin, ...safe } = teacher
  res.json(safe)
})
