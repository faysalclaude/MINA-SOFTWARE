import { Router } from 'express'
import { db } from '../db.js'
import { generateParentReport, listReports } from '../ai/parentReportEngine.js'

export const reportsRouter = Router()

reportsRouter.post('/generate', async (req, res) => {
  const { studentId } = req.body
  if (!studentId)
    return res.status(400).json({ error: 'studentId is required' })

  const student = db
    .prepare('SELECT id FROM students WHERE id = ?')
    .get(studentId)
  if (!student) return res.status(404).json({ error: 'Student not found' })

  try {
    const report = await generateParentReport(studentId)
    res.json(report)
  } catch (e) {
    console.error('[REPORTS] Failed to generate report:', e.message)
    res.status(500).json({ error: e.message })
  }
})

reportsRouter.get('/', (req, res) => {
  const { studentId } = req.query
  if (!studentId)
    return res.status(400).json({ error: 'studentId query param is required' })
  res.json(listReports(studentId))
})
