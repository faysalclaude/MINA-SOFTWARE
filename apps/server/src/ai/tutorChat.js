import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import { complete } from './ollamaClient.js'
import { lookupTopic } from './webLookup.js'

/**
 * Answers a free-form question from a student, in whichever language they
 * asked in. If the question looks like it's about a specific topic MINA
 * might not have deep knowledge of, it first tries a free Wikipedia lookup
 * and includes that as grounding context - so MINA effectively "goes
 * online to learn about it" for topics outside everyday tutoring content,
 * without needing any paid search API.
 */
export async function askTutor (studentId, question, history = []) {
  const student = db
    .prepare('SELECT * FROM students WHERE id = ?')
    .get(studentId)
  if (!student) throw new Error('Student not found')
  if (!question || !question.trim()) throw new Error('Question is empty')

  const lookup = await lookupTopic(question)
  const referenceBlock = lookup
    ? `\n\nMINA looked this up online just now (${
        lookup.lang === 'ko' ? 'Korean' : 'English'
      } Wikipedia, "${lookup.title}"): ${lookup.extract}`
    : ''

  const system =
    'You are MINA, a warm, patient personal tutor for a Korean elementary ' +
    'student. Always reply in the SAME language the student used to ask ' +
    '(Korean or English) - never switch languages on them. When a student ' +
    "says they don't understand something, figure out specifically what's " +
    'confusing them and re-explain it a different, simpler way with a ' +
    'concrete example - the way a great one-on-one tutor would, not a ' +
    'lecture. Keep answers short and conversational: a few sentences to a ' +
    'short paragraph, appropriate for a child. Respond with ONLY your ' +
    'answer to the student - no notes, no commentary about your process.'

  const historyText = history
    .slice(-6)
    .map(h => `${h.role === 'student' ? 'Student' : 'MINA'}: ${h.text}`)
    .join('\n')

  const user = `Student: age ${student.age}, grade ${student.grade}.
${
  historyText ? 'Recent conversation:\n' + historyText + '\n\n' : ''
}Student's message: "${question.trim()}"${referenceBlock}

Reply now, in the same language the student used.`

  const answer = await complete(system, user, {
    temperature: 0.6,
    numPredict: 500,
    numCtx: 4096
  })
  if (!answer || !answer.trim())
    throw new Error('MINA could not generate a response')

  // Persist every question a student asks MINA directly - this is one of
  // the clearest signals of what a student is actually struggling with,
  // often more specific than a quiz score. The teacher can review these
  // to see patterns a structured quiz might miss entirely.
  db.prepare(
    `INSERT INTO tutor_conversations (id, student_id, question, answer, used_web_lookup)
     VALUES (?, ?, ?, ?, ?)`
  ).run(uuid(), studentId, question.trim(), answer.trim(), lookup ? 1 : 0)

  return {
    answer: answer.trim(),
    usedWebLookup: !!lookup,
    lookupTitle: lookup?.title || null,
    lookupUrl: lookup?.url || null
  }
}

/** Recent questions a student has asked MINA directly, for the teacher to review. */
export function getTutorHistory (studentId, limit = 30) {
  return db
    .prepare(
      `SELECT id, question, answer, used_web_lookup as usedWebLookup, created_at as createdAt
       FROM tutor_conversations WHERE student_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .all(studentId, limit)
}
