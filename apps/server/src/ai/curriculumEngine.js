import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import { completeJson } from './ollamaClient.js'
import { buildReferenceContext } from './referenceMaterials.js'

const SUBJECT_LABELS = {
  korean: '국어 (Korean Language)',
  math: '수학 (Math)',
  science: '과학 (Science)',
  social_studies: '사회 (Social Studies)',
  english: '영어 (English)',
  integrated_curriculum:
    '통합교과 (Integrated Curriculum - Spring/Summer/Fall/Winter themes)',
  moral_education: '도덕 (Moral Education)',
  practical_arts: '실과 (Practical Arts)',
  computing: '컴퓨팅/코딩 (Computing & Coding)'
}

export function subjectsForGrade (grade) {
  if (grade <= 2) {
    return ['korean', 'math', 'integrated_curriculum', 'computing']
  }
  if (grade <= 4) {
    return [
      'korean',
      'math',
      'science',
      'social_studies',
      'english',
      'moral_education',
      'computing'
    ]
  }
  return [
    'korean',
    'math',
    'science',
    'social_studies',
    'english',
    'moral_education',
    'practical_arts',
    'computing'
  ]
}

async function generateTopicsForSubject (subject, age, grade, referenceContext) {
  const label = SUBJECT_LABELS[subject] || subject

  const system =
    'You are an expert curriculum designer for Korean elementary schools ' +
    '(초등학교), following the Korean national curriculum (교육과정) standards. ' +
    'You always respond with ONLY a raw JSON array, no markdown fences, no commentary.'

  const user = `Design a ${label} curriculum for a grade ${grade} Korean elementary student, age ${age}.

Produce exactly 8 topics, ordered from most foundational to most advanced for
this grade level. Each topic must be a distinct, teachable unit a student
could complete in one sitting.
${referenceContext || ''}

Respond with ONLY a JSON array in this exact shape, nothing else:
[
  {
    "title": "short topic title",
    "description": "1-2 sentence description of what the student will learn",
    "competencyCode": "short_snake_case_unique_id",
    "difficulty": 1
  }
]
"difficulty" must be an integer 1-5, increasing roughly with topic order.`

  const topics = await completeJson(system, user, {
    temperature: 0.4,
    numPredict: 1000
  })
  if (!Array.isArray(topics) || topics.length === 0) {
    throw new Error(`Model returned no usable topics for subject "${subject}"`)
  }
  return topics
}

export async function generateCurriculumForStudent (studentId) {
  const student = db
    .prepare('SELECT * FROM students WHERE id = ?')
    .get(studentId)
  if (!student) throw new Error('Student not found')

  const subjects = subjectsForGrade(student.grade)
  const results = []
  const { promptText, usedTitles } = buildReferenceContext(student.teacher_id)

  for (const subject of subjects) {
    console.log(
      `[CURRICULUM] Generating ${subject} for ${student.name} (grade ${student.grade})...`
    )

    let topics
    try {
      topics = await generateTopicsForSubject(
        subject,
        student.age,
        student.grade,
        promptText
      )
    } catch (e) {
      console.error(
        `[CURRICULUM] Failed to generate ${subject} for ${student.name}:`,
        e.message
      )
      results.push({ subject, error: e.message, topicCount: 0 })
      continue
    }

    const existing = db
      .prepare('SELECT id FROM curricula WHERE student_id = ? AND subject = ?')
      .get(studentId, subject)

    let curriculumId
    if (existing) {
      curriculumId = existing.id
      db.prepare('DELETE FROM curriculum_topics WHERE curriculum_id = ?').run(
        curriculumId
      )
      db.prepare(
        "UPDATE curricula SET source = 'ai_generated', status = 'active', used_materials = ? WHERE id = ?"
      ).run(JSON.stringify(usedTitles), curriculumId)
    } else {
      curriculumId = uuid()
      db.prepare(
        `INSERT INTO curricula (id, student_id, subject, source, status, used_materials)
         VALUES (?, ?, ?, 'ai_generated', 'active', ?)`
      ).run(curriculumId, studentId, subject, JSON.stringify(usedTitles))
    }

    const insertTopic = db.prepare(
      `INSERT INTO curriculum_topics
         (id, curriculum_id, topic_order, title, description, competency_code, difficulty)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    topics.forEach((t, i) => {
      insertTopic.run(
        uuid(),
        curriculumId,
        i + 1,
        t.title,
        t.description,
        t.competencyCode || `${subject}_${i + 1}`,
        Number(t.difficulty) || 1
      )
    })

    console.log(`[CURRICULUM] ${subject}: ${topics.length} topics saved`)
    results.push({
      subject,
      topicCount: topics.length,
      usedMaterials: usedTitles
    })
  }

  return results
}

export function getCurriculumForStudent (studentId) {
  const curricula = db
    .prepare('SELECT * FROM curricula WHERE student_id = ?')
    .all(studentId)

  return curricula.map(c => {
    const topics = db
      .prepare(
        `SELECT ct.title, ct.description, ct.competency_code as competencyCode, ct.difficulty,
                COALESCE(sm.mastery_score, 0) as masteryScore
         FROM curriculum_topics ct
         LEFT JOIN student_mastery sm
           ON sm.student_id = ? AND sm.competency_code = ct.competency_code
         WHERE ct.curriculum_id = ? ORDER BY ct.topic_order ASC`
      )
      .all(studentId, c.id)

    const masteredCount = topics.filter(t => t.masteryScore >= 80).length

    let usedMaterials = []
    try {
      usedMaterials = c.used_materials ? JSON.parse(c.used_materials) : []
    } catch {
      usedMaterials = []
    }

    return {
      subject: c.subject,
      subjectLabel: SUBJECT_LABELS[c.subject] || c.subject,
      source: c.source,
      status: c.status,
      topics,
      masteredCount,
      totalCount: topics.length,
      usedMaterials
    }
  })
}
