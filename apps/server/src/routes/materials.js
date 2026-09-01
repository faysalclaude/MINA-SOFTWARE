import { Router } from 'express'
import multer from 'multer'
import { db } from '../db.js'
import {
  extractText,
  saveMaterial,
  listMaterials,
  deleteMaterial
} from '../ai/referenceMaterials.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
})

export const materialsRouter = Router()

// Wrap multer manually so a malformed upload returns a clean JSON error
// instead of an uncaught exception / raw stack trace.
function handleUpload (req, res, next) {
  upload.single('file')(req, res, err => {
    if (err) {
      console.error('[MATERIALS] Upload error:', err.message)
      return res
        .status(400)
        .json({ error: `File upload failed: ${err.message}` })
    }
    next()
  })
}

materialsRouter.post('/', handleUpload, async (req, res) => {
  const { teacherId, title, materialType, sourceUrl, textNotes } = req.body
  if (!teacherId || !title || !materialType) {
    return res
      .status(400)
      .json({ error: 'teacherId, title, and materialType are required' })
  }

  const teacher = db
    .prepare('SELECT id FROM teachers WHERE id = ?')
    .get(teacherId)
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' })

  try {
    let extractedText = null

    if (materialType === 'pdf' || materialType === 'doc') {
      if (!req.file)
        return res
          .status(400)
          .json({ error: 'A file is required for this material type' })
      extractedText = await extractText(materialType, req.file.buffer, null)
    } else if (materialType === 'text_notes') {
      extractedText = await extractText(materialType, null, textNotes)
    } else if (materialType === 'link') {
      extractedText = textNotes || null // the teacher's manual note about the link
    } else {
      return res.status(400).json({
        error: `MINA can't process "${materialType}" content yet (no image/video understanding in this offline model). Please use PDF, DOC, a text note, or a link with a short description instead.`
      })
    }

    const id = saveMaterial({
      teacherId,
      title,
      materialType,
      extractedText,
      sourceUrl
    })
    res.status(201).json({ id })
  } catch (e) {
    console.error('[MATERIALS] Failed to process material:', e.message)
    res.status(500).json({ error: e.message })
  }
})

materialsRouter.get('/', (req, res) => {
  const { teacherId } = req.query
  if (!teacherId)
    return res.status(400).json({ error: 'teacherId query param is required' })
  res.json(listMaterials(teacherId))
})

materialsRouter.delete('/:id', (req, res) => {
  deleteMaterial(req.params.id)
  res.status(204).send()
})
