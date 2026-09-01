import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import { complete, completeJson } from './ollamaClient.js'

/** Asks MINA for a short Korean writing prompt tied to a topic. */
export async function generatePromptForTopic (student, topic) {
  const system =
    'You are MINA, a Korean elementary school teacher preparing a short ' +
    'writing exercise. Respond with ONLY the writing prompt itself in ' +
    'Korean, nothing else.'

  const user = `Grade ${student.grade} student, topic: "${topic.title}" — ${topic.description}.
Write ONE short writing prompt in Korean asking the student to write 2-4
sentences related to this topic, appropriate for this grade level.`

  const prompt = await complete(system, user, {
    temperature: 0.6,
    numPredict: 150
  })
  return prompt.trim().replace(/^["']|["']$/g, '')
}

/**
 * Scores a writing submission against a simple rubric (grammar, vocabulary,
 * structure) via the local model, and gives specific, encouraging feedback
 * in Korean - never just a number with no explanation.
 */
export async function evaluateWriting (
  studentId,
  topicId,
  prompt,
  submission,
  student
) {
  const system =
    'You are MINA, a warm Korean elementary school teacher grading a short ' +
    'writing exercise. You always respond with ONLY a raw JSON object, no ' +
    'markdown fences, no commentary.'

  const user = `Grade ${student.grade} student.
Writing prompt: "${prompt}"
Student's submission: "${submission}"

Evaluate this against three criteria appropriate for this grade level:
grammar (문법), vocabulary (어휘), and structure/clarity (구성). Give an
overall score 0-100, and specific, encouraging feedback in Korean for each
criterion - point out one concrete thing done well and one concrete thing
to improve, not generic praise.

Respond with ONLY a JSON object in this exact shape:
{
  "score": 85,
  "grammarFeedback": "Korean feedback on grammar",
  "vocabularyFeedback": "Korean feedback on vocabulary",
  "structureFeedback": "Korean feedback on structure/clarity",
  "overallFeedback": "one short encouraging closing sentence in Korean"
}`

  let result
  try {
    result = await completeJson(system, user, {
      temperature: 0.4,
      numPredict: 500
    })
  } catch (e) {
    console.error('[WRITING] AI evaluation failed, using fallback:', e.message)
    result = {
      score: null,
      grammarFeedback: '',
      vocabularyFeedback: '',
      structureFeedback: '',
      overallFeedback:
        'MINA가 지금 평가를 완료하지 못했어요. 다시 시도해주세요.'
    }
  }

  db.prepare(
    `INSERT INTO writing_attempts (id, student_id, lesson_id, prompt, submission, ai_feedback_json, score)
     VALUES (?, ?, NULL, ?, ?, ?, ?)`
  ).run(
    uuid(),
    studentId,
    prompt,
    submission,
    JSON.stringify(result),
    result.score
  )

  if (result.score !== null && topicId) {
    const topic = db
      .prepare(
        'SELECT competency_code as competencyCode FROM curriculum_topics WHERE id = ?'
      )
      .get(topicId)
    if (topic) {
      const row = db
        .prepare(
          'SELECT mastery_score FROM student_mastery WHERE student_id = ? AND competency_code = ?'
        )
        .get(studentId, topic.competencyCode)
      const current = row ? row.mastery_score : 0
      const delta = result.score >= 80 ? 10 : result.score >= 50 ? 3 : -2
      const updated = Math.max(0, Math.min(100, current + delta))
      db.prepare(
        `INSERT INTO student_mastery (student_id, competency_code, mastery_score, last_updated)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(student_id, competency_code) DO UPDATE SET
           mastery_score = excluded.mastery_score, last_updated = excluded.last_updated`
      ).run(studentId, topic.competencyCode, updated)
    }
  }

  return result
}
