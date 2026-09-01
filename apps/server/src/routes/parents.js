import { Router } from 'express'
import { db } from '../db.js'

export const parentsRouter = Router()

// Parent login is scoped to one student: the parent first picks their
// child's name from the teacher's roster (same public list used for
// student login), then enters the parent PIN set for that specific child.
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
