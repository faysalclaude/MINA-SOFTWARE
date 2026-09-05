import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'

const MAX_STORED_CHARS = 8000
const MAX_PROMPT_CHARS_PER_MATERIAL = 1500

export async function extractText (materialType, fileBuffer, textNotes) {
  if (materialType === 'pdf') {
    const parser = new PDFParse({ data: fileBuffer })
    try {
      const result = await parser.getText()
      return result.text.slice(0, MAX_STORED_CHARS)
    } finally {
      await parser.destroy()
    }
  }
  if (materialType === 'doc') {
    const result = await mammoth.extractRawText({ buffer: fileBuffer })
    return result.value.slice(0, MAX_STORED_CHARS)
  }
  if (materialType === 'text_notes') {
    return (textNotes || '').slice(0, MAX_STORED_CHARS)
  }
  return null
}

export function saveMaterial ({
  teacherId,
  title,
  materialType,
  extractedText,
  sourceUrl
}) {
  const id = uuid()
  db.prepare(
    `INSERT INTO reference_materials (id, teacher_id, title, material_type, extracted_text, source_url)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    teacherId,
    title,
    materialType,
    extractedText || null,
    sourceUrl || null
  )
  return id
}

export function listMaterials (teacherId) {
  return db
    .prepare(
      `SELECT id, title, material_type as materialType, source_url as sourceUrl,
              substr(extracted_text, 1, 200) as preview, created_at as createdAt
       FROM reference_materials WHERE teacher_id = ? ORDER BY created_at DESC`
    )
    .all(teacherId)
}

export function deleteMaterial (id) {
  db.prepare('DELETE FROM reference_materials WHERE id = ?').run(id)
}

/**
 * Builds a short context block from a teacher's most recent reference
 * materials, to prepend to curriculum-generation prompts. PDFs/DOCs/text
 * notes contribute real extracted text. Links only ever contribute their
 * URL string and the teacher's own note - never claimed page content,
 * since this offline model cannot browse the internet.
 *
 * Returns both the prompt text AND the plain list of material titles that
 * were actually included, so callers can record/show "MINA used: X, Y"
 * without anyone having to read the Korean output to guess.
 */
export function buildReferenceContext (teacherId) {
  const materials = db
    .prepare(
      `SELECT title, material_type as materialType, extracted_text as extractedText, source_url as sourceUrl
       FROM reference_materials WHERE teacher_id = ? ORDER BY created_at DESC LIMIT 3`
    )
    .all(teacherId)

  if (materials.length === 0) return { promptText: '', usedTitles: [] }

  const blocks = materials.map(m => {
    if (m.materialType === 'link') {
      return `Reference "${
        m.title
      }" (a link the teacher provided; content was NOT fetched): ${
        m.sourceUrl
      }\nTeacher's note about it: ${m.extractedText || '(none)'}`
    }
    return `Reference "${m.title}" (${m.materialType}):\n${(
      m.extractedText || ''
    ).slice(0, MAX_PROMPT_CHARS_PER_MATERIAL)}`
  })

  return {
    promptText: `\n\nThe teacher provided these reference materials — use them to inform the curriculum where relevant:\n${blocks.join(
      '\n\n'
    )}`,
    usedTitles: materials.map(m => m.title)
  }
}
