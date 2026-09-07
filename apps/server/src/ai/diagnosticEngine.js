import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import { completeJson } from './ollamaClient.js'
import { getMastery, upsertMastery } from './lessonEngine.js'

/**
 * Picks a spread of topics across the difficulty range (not sequential
 * order) so one short quiz can estimate where a student's real level is,
 * rather than making every student grind from topic 1 regardless of what
 * they already know.
 */
function sampleTopicsAcrossDifficulty (topics) {
  const byDifficulty = {}
  for (const t of topics) {
    const d = t.difficulty || 1
    if (!byDifficulty[d]) byDifficulty[d] = t
  }
  return Object.values(byDifficulty).sort((a, b) => a.difficulty - b.difficulty)
}

/**
 * Generates a short placement quiz: one question per sampled difficulty
 * level for a subject's curriculum. Stored as a special "diagnostic"
 * lesson row (curriculum_topic_id left NULL since it spans many topics)
 * so grading can look answers up server-side without trusting the client.
 */
export async function generateDiagnosticQuiz (studentId, subject) {
  const student = db
    .prepare('SELECT * FROM students WHERE id = ?')
    .get(studentId)
  if (!student) throw new Error('Student not found')

  const curriculum = db
    .prepare('SELECT id FROM curricula WHERE student_id = ? AND subject = ?')
    .get(studentId, subject)
  if (!curriculum) throw new Error('No curriculum for this subject yet')

  const allTopics = db
    .prepare(
      `SELECT id, title, description, competency_code as competencyCode, difficulty
       FROM curriculum_topics WHERE curriculum_id = ? ORDER BY difficulty ASC`
    )
    .all(curriculum.id)
  if (allTopics.length === 0) throw new Error('This subject has no topics yet')

  const sampled = sampleTopicsAcrossDifficulty(allTopics)

  const system =
    'You are MINA, testing what a Korean elementary student already knows ' +
    "before teaching, so you don't waste their time on things they've " +
    'already mastered. Respond with ONLY a raw JSON array, no markdown, no commentary.'

  const user = `Student: grade ${student.grade}, age ${student.age}.
For EACH of these topics, write exactly ONE quick check-understanding
question in Korean (multiple_choice with 4 options). Keep questions short -
this is a placement check, not a full lesson.

Topics:
${sampled
  .map(
    (t, i) =>
      `${i + 1}. "${t.title}" (difficulty ${t.difficulty}) — ${t.description}`
  )
  .join('\n')}

Respond with ONLY a JSON array, one entry per topic above, in this exact
shape and SAME ORDER as the topics listed:
[
  {
    "question": "Korean question text",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "must exactly match one of the options"
  }
]`

  const questions = await completeJson(system, user, {
    temperature: 0.4,
    numPredict: 900
  })
  if (!Array.isArray(questions) || questions.length !== sampled.length) {
    throw new Error('MINA could not generate a matching placement quiz')
  }

  const quizItems = sampled.map((topic, i) => ({
    id: `d${i}`,
    topicId: topic.id,
    competencyCode: topic.competencyCode,
    difficulty: topic.difficulty,
    question: questions[i].question,
    options: questions[i].options,
    correctAnswer: questions[i].correctAnswer
  }))

  const lessonId = uuid()
  db.prepare(
    `INSERT INTO lessons (id, student_id, curriculum_topic_id, title, content, difficulty)
     VALUES (?, ?, NULL, ?, ?, 0)`
  ).run(
    lessonId,
    studentId,
    `Placement check: ${subject}`,
    JSON.stringify({ subject, quizItems })
  )

  return {
    diagnosticId: lessonId,
    questions: quizItems.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options
    }))
  }
}

/**
 * Grades the placement quiz and seeds mastery for the WHOLE subject, not
 * just the tested topics: topics at or below the highest difficulty the
 * student answered correctly get a moderate starting score (they likely
 * know it, but haven't proven it yet, so they're not marked "mastered"
 * outright); topics above that get 0, same as a brand new student.
 */
export function gradeDiagnosticQuiz (diagnosticId, studentId, answers) {
  const lessonRow = db
    .prepare('SELECT * FROM lessons WHERE id = ?')
    .get(diagnosticId)
  if (!lessonRow) throw new Error('Placement quiz not found')

  const { subject, quizItems } = JSON.parse(lessonRow.content)

  let highestCorrectDifficulty = 0
  const feedback = quizItems.map(q => {
    const given = String(answers.find(a => a.questionId === q.id)?.answer ?? '')
    const isCorrect =
      given.trim().toLowerCase() ===
      String(q.correctAnswer).trim().toLowerCase()
    if (isCorrect && q.difficulty > highestCorrectDifficulty)
      highestCorrectDifficulty = q.difficulty

    upsertMastery(studentId, q.competencyCode, isCorrect ? 70 : 15)

    return {
      questionId: q.id,
      correct: isCorrect,
      correctAnswer: q.correctAnswer,
      difficulty: q.difficulty
    }
  })

  const curriculum = db
    .prepare('SELECT id FROM curricula WHERE student_id = ? AND subject = ?')
    .get(studentId, subject)
  if (curriculum) {
    const allTopics = db
      .prepare(
        'SELECT competency_code as competencyCode, difficulty FROM curriculum_topics WHERE curriculum_id = ?'
      )
      .all(curriculum.id)

    const testedCodes = new Set(quizItems.map(q => q.competencyCode))
    for (const topic of allTopics) {
      if (testedCodes.has(topic.competencyCode)) continue
      const seed = topic.difficulty <= highestCorrectDifficulty ? 50 : 0
      if (getMastery(studentId, topic.competencyCode) === 0) {
        upsertMastery(studentId, topic.competencyCode, seed)
      }
    }
  }

  const correctCount = feedback.filter(f => f.correct).length
  return {
    correctCount,
    total: feedback.length,
    highestLevelShown: highestCorrectDifficulty,
    feedback
  }
}
