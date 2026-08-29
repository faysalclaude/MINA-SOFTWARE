import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import { completeJson } from './ollamaClient.js'

const MASTERY_THRESHOLD = 80

function getMastery (studentId, competencyCode) {
  const row = db
    .prepare(
      'SELECT mastery_score FROM student_mastery WHERE student_id = ? AND competency_code = ?'
    )
    .get(studentId, competencyCode)
  return row ? row.mastery_score : 0
}

function upsertMastery (studentId, competencyCode, score) {
  db.prepare(
    `INSERT INTO student_mastery (student_id, competency_code, mastery_score, last_updated)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(student_id, competency_code) DO UPDATE SET
       mastery_score = excluded.mastery_score,
       last_updated = excluded.last_updated`
  ).run(studentId, competencyCode, score)
}

/**
 * Picks the next curriculum topic MINA should teach this student in a
 * subject: the first not-yet-mastered topic in curriculum order. Returns
 * null if every topic in the subject is already mastered.
 */
export function getNextTopic (studentId, subject) {
  const curriculum = db
    .prepare('SELECT id FROM curricula WHERE student_id = ? AND subject = ?')
    .get(studentId, subject)
  if (!curriculum) return null

  const topics = db
    .prepare(
      `SELECT id, topic_order, title, description, competency_code as competencyCode, difficulty
       FROM curriculum_topics WHERE curriculum_id = ? ORDER BY topic_order ASC`
    )
    .all(curriculum.id)

  for (const topic of topics) {
    const mastery = getMastery(studentId, topic.competencyCode)
    if (mastery < MASTERY_THRESHOLD) {
      return { ...topic, currentMastery: mastery }
    }
  }
  return null
}

/**
 * Generates a lesson (teaching content + quiz) for a topic, adapted to how
 * the student did last time they saw this exact topic:
 *  - scored low  -> simpler re-explanation, easier follow-up quiz
 *  - scored high -> quick review, harder follow-up quiz
 *  - first time  -> standard grade-level introduction
 */
export async function generateLesson (studentId, topic) {
  const student = db
    .prepare('SELECT * FROM students WHERE id = ?')
    .get(studentId)
  if (!student) throw new Error('Student not found')

  const priorAttempt = db
    .prepare(
      `SELECT la.score FROM lesson_attempts la
       JOIN lessons l ON l.id = la.lesson_id
       WHERE la.student_id = ? AND l.curriculum_topic_id = ?
       ORDER BY la.created_at DESC LIMIT 1`
    )
    .get(studentId, topic.id)

  let adaptiveNote =
    "This is the student's first attempt at this topic. Teach it at a standard level for their grade."
  if (priorAttempt) {
    if (priorAttempt.score < 50) {
      adaptiveNote = `The student scored only ${priorAttempt.score}% last time. Re-explain this topic more simply, with more examples and encouragement, before quizzing again at an EASIER level.`
    } else if (priorAttempt.score >= 80) {
      adaptiveNote = `The student scored ${priorAttempt.score}% last time and is doing well. Briefly review, then quiz at a slightly HARDER level than before to keep challenging them.`
    } else {
      adaptiveNote = `The student scored ${priorAttempt.score}% last time (partial understanding). Reinforce the weaker parts, then quiz again at a similar level.`
    }
  }

  const system =
    'You are MINA, a warm and patient AI teacher for a Korean elementary school student. ' +
    'You always respond with ONLY a raw JSON object, no markdown fences, no commentary.'

  const user = `Student: age ${student.age}, grade ${student.grade}.
Topic: "${topic.title}" — ${topic.description}
${adaptiveNote}

Write the teaching explanation in Korean (age-appropriate, warm, simple
sentences, 2-4 short paragraphs, with a couple of concrete examples). Then
write 4 quiz questions in Korean testing understanding of this exact topic.

Respond with ONLY a JSON object in this exact shape, nothing else:
{
  "teaching": "Korean explanation text",
  "quiz": [
    {
      "id": "q1",
      "question": "Korean question text",
      "questionType": "multiple_choice",
      "options": ["Korean option A", "Korean option B", "Korean option C", "Korean option D"],
      "correctAnswer": "must exactly match one of the options"
    }
  ]
}
Mix multiple_choice (4 options) and short_answer (options: null) question types.`

  const result = await completeJson(system, user, { temperature: 0.5 })
  if (
    !result.teaching ||
    !Array.isArray(result.quiz) ||
    result.quiz.length === 0
  ) {
    throw new Error('Model returned an incomplete lesson')
  }

  const lessonId = uuid()
  db.prepare(
    `INSERT INTO lessons (id, student_id, curriculum_topic_id, title, content, difficulty)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    lessonId,
    studentId,
    topic.id,
    topic.title,
    JSON.stringify(result),
    topic.difficulty
  )

  return {
    id: lessonId,
    title: topic.title,
    difficulty: topic.difficulty,
    ...result
  }
}

/** Strips correct answers before a lesson/quiz is sent to the browser. */
export function sanitizeLessonForClient (lesson) {
  return {
    id: lesson.id,
    title: lesson.title,
    difficulty: lesson.difficulty,
    teaching: lesson.teaching,
    quiz: lesson.quiz.map(q => ({
      id: q.id,
      question: q.question,
      questionType: q.questionType,
      options: q.options || null
    }))
  }
}

/**
 * Grades a submitted attempt against the answers stored server-side (never
 * trusts the client for correctness), records the attempt, and updates the
 * student's mastery score for that topic's competency.
 */
export function gradeAndRecordAttempt (lessonId, studentId, answers) {
  const lessonRow = db
    .prepare('SELECT * FROM lessons WHERE id = ?')
    .get(lessonId)
  if (!lessonRow) throw new Error('Lesson not found')

  const content = JSON.parse(lessonRow.content)
  const quiz = content.quiz

  let correctCount = 0
  const feedback = quiz.map(q => {
    const given = String(answers.find(a => a.questionId === q.id)?.answer ?? '')
    const isCorrect =
      given.trim().toLowerCase() ===
      String(q.correctAnswer).trim().toLowerCase()
    if (isCorrect) correctCount++
    return {
      questionId: q.id,
      correct: isCorrect,
      correctAnswer: q.correctAnswer
    }
  })

  const scorePercent = Math.round((correctCount / quiz.length) * 100)

  db.prepare(
    `INSERT INTO lesson_attempts (id, lesson_id, student_id, attempt_type, score, answers_json)
     VALUES (?, ?, ?, 'practice', ?, ?)`
  ).run(uuid(), lessonId, studentId, scorePercent, JSON.stringify(answers))

  const topic = db
    .prepare(
      'SELECT competency_code as competencyCode FROM curriculum_topics WHERE id = ?'
    )
    .get(lessonRow.curriculum_topic_id)

  let newMastery = null
  if (topic) {
    const current = getMastery(studentId, topic.competencyCode)
    let delta
    if (scorePercent >= 80) delta = 30
    else if (scorePercent >= 50) delta = 10
    else delta = -5
    newMastery = Math.max(0, Math.min(100, current + delta))
    upsertMastery(studentId, topic.competencyCode, newMastery)
  }

  return {
    scorePercent,
    correctCount,
    total: quiz.length,
    feedback,
    newMastery
  }
}
