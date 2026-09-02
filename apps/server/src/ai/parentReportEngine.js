import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import { complete } from './ollamaClient.js'
import { getCurriculumForStudent } from './curriculumEngine.js'

/**
 * Generates a warm, honest Korean-language progress letter for a parent,
 * grounded entirely in real data (mastery scores, recent attempts, speaking
 * and writing practice) - never a generic template with the name swapped in.
 */
export async function generateParentReport (studentId) {
  const student = db
    .prepare('SELECT * FROM students WHERE id = ?')
    .get(studentId)
  if (!student) throw new Error('Student not found')

  const curriculum = getCurriculumForStudent(studentId)
  if (curriculum.length === 0) {
    throw new Error(
      'This student has no curriculum yet, so there is nothing to report on.'
    )
  }

  const subjectSummaries = curriculum
    .map(s => {
      const weak = s.topics.filter(t => t.masteryScore < 50).map(t => t.title)
      const strong = s.topics
        .filter(t => t.masteryScore >= 80)
        .map(t => t.title)
      return `${s.subjectLabel}: ${s.masteredCount}/${
        s.totalCount
      } topics mastered. Strong areas: ${
        strong.join(', ') || 'none yet'
      }. Needs more practice: ${weak.join(', ') || 'none'}.`
    })
    .join('\n')

  const recentAttempts = db
    .prepare(
      `SELECT la.score, l.title FROM lesson_attempts la
       JOIN lessons l ON l.id = la.lesson_id
       WHERE la.student_id = ? ORDER BY la.created_at DESC LIMIT 5`
    )
    .all(studentId)
  const recentSummary =
    recentAttempts.map(a => `${a.title}: ${a.score}%`).join(', ') ||
    'No attempts yet'

  const voiceStats = db
    .prepare(
      'SELECT AVG(pronunciation_score) as avg, COUNT(*) as count FROM voice_attempts WHERE student_id = ?'
    )
    .get(studentId)
  const writingStats = db
    .prepare(
      'SELECT AVG(score) as avg, COUNT(*) as count FROM writing_attempts WHERE student_id = ? AND score IS NOT NULL'
    )
    .get(studentId)

  const system =
    'You are MINA, a warm Korean elementary school teacher writing a progress ' +
    'report letter to a parent. Respond with ONLY the report letter text in ' +
    'Korean, no markdown, no JSON, no commentary outside the letter itself.'

  const user = `Student: ${student.name}, grade ${student.grade}, age ${
    student.age
  }.

Subject progress:
${subjectSummaries}

Recent lesson attempts: ${recentSummary}
Speaking practice: ${voiceStats.count} attempts, average score ${
    voiceStats.avg ? Math.round(voiceStats.avg) : 'N/A'
  }
Writing practice: ${writingStats.count} attempts, average score ${
    writingStats.avg ? Math.round(writingStats.avg) : 'N/A'
  }

Write a warm, honest progress report letter in Korean addressed to the
parent(s) of ${student.name}. Structure it as:
1. A warm opening greeting
2. What ${
    student.name
  } is doing well - be specific, citing actual subjects/topics from the data above
3. What needs more practice - be specific and gentle, constructive framing, citing actual weak topics
4. One concrete, practical suggestion for how the parent can help at home
5. A warm closing

Base every claim on the data given above - do not invent achievements or
problems not supported by it. Keep it 250-400 words, written as a real
letter a teacher would send, not a data dump or bullet list.`

  const reportText = await complete(system, user, {
    temperature: 0.6,
    numPredict: 900
  })

  const id = uuid()
  const now = new Date()
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  const periodEnd = now.toISOString().slice(0, 10)

  db.prepare(
    `INSERT INTO parent_reports (id, student_id, period_start, period_end, content_ko)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, studentId, periodStart, periodEnd, reportText.trim())

  return { id, periodStart, periodEnd, content: reportText.trim() }
}

export function listReports (studentId) {
  return db
    .prepare(
      `SELECT id, period_start as periodStart, period_end as periodEnd,
              content_ko as content, created_at as createdAt
       FROM parent_reports WHERE student_id = ? ORDER BY created_at DESC`
    )
    .all(studentId)
}
