import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import { complete } from './ollamaClient.js'

/**
 * Character-level Levenshtein distance, used to score how close the
 * browser's speech-to-text transcript is to the target phrase. This is a
 * proxy for pronunciation accuracy: if the student said it correctly, the
 * browser's recognizer should transcribe it close to the target phrase. It
 * isn't true phonetic analysis (that needs an audio model we don't have
 * offline), but it's a reasonable, honest signal without pretending to
 * more precision than we have.
 */
function levenshtein (a, b) {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function normalize (text) {
  return text.replace(/[.,!?~\s]+/g, '').trim()
}

function similarityScore (target, transcript) {
  const t = normalize(target)
  const s = normalize(transcript)
  if (t.length === 0) return 0
  const distance = levenshtein(t, s)
  const score = Math.round(
    100 * (1 - distance / Math.max(t.length, s.length, 1))
  )
  return Math.max(0, Math.min(100, score))
}

/** Asks MINA for a short Korean phrase/sentence tied to a topic, for the student to read aloud. */
export async function generatePhraseForTopic (student, topic) {
  const system =
    'You are MINA, a Korean elementary school teacher preparing a short ' +
    'read-aloud phrase for pronunciation practice. Respond with ONLY the ' +
    'Korean phrase itself, nothing else - no quotes, no explanation.'

  const user = `Grade ${student.grade} student, topic: "${topic.title}" — ${topic.description}.
Write ONE short, natural Korean sentence (8-15 words) related to this topic,
appropriate for reading aloud practice at this grade level.`

  const phrase = await complete(system, user, {
    temperature: 0.6,
    numPredict: 100
  })
  return phrase.trim().replace(/^["']|["']$/g, '')
}

/** Scores a speaking attempt and asks MINA for warm, specific feedback in Korean. */
export async function evaluateSpeaking (studentId, topicId, phrase, transcript) {
  const score = similarityScore(phrase, transcript)

  const system =
    'You are MINA, a warm Korean elementary school teacher giving pronunciation ' +
    'feedback. Respond with ONLY the feedback text in Korean, 2-3 short ' +
    'encouraging sentences, no markdown, no commentary outside the feedback itself.'

  const user = `Target phrase: "${phrase}"
What the student's speech was recognized as: "${transcript}"
Score: ${score}/100

Give short, warm, specific feedback in Korean: praise what went well, and if
there's a difference between the target and what was recognized, gently
point out which part to practice again. Keep it encouraging, appropriate for
a child.`

  let feedback
  try {
    feedback = (
      await complete(system, user, { temperature: 0.6, numPredict: 200 })
    ).trim()
  } catch (e) {
    feedback =
      score >= 70
        ? '잘했어요! 계속 연습해봐요.'
        : '조금 더 천천히 다시 말해볼까요?'
  }

  db.prepare(
    `INSERT INTO voice_attempts (id, student_id, lesson_id, phrase, transcript, pronunciation_score)
     VALUES (?, ?, NULL, ?, ?, ?)`
  ).run(uuid(), studentId, phrase, transcript, score)

  // Speaking practice contributes to the same mastery score as the topic's
  // written work, at a lighter weight - it's reinforcement, not the primary
  // assessment.
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
    const delta = score >= 80 ? 10 : score >= 50 ? 3 : -2
    const updated = Math.max(0, Math.min(100, current + delta))
    db.prepare(
      `INSERT INTO student_mastery (student_id, competency_code, mastery_score, last_updated)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(student_id, competency_code) DO UPDATE SET
         mastery_score = excluded.mastery_score, last_updated = excluded.last_updated`
    ).run(studentId, topic.competencyCode, updated)
  }

  return { score, feedback }
}
