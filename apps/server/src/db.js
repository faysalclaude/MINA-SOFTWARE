import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')
fs.mkdirSync(DATA_DIR, { recursive: true })

const dbPath = path.join(DATA_DIR, 'mina_teacher.db')
export const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    school_name TEXT NOT NULL,
    pin TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    grade INTEGER NOT NULL,
    pace_hint TEXT NOT NULL DEFAULT 'average',
    pin TEXT NOT NULL DEFAULT '0000',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS parents (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    pin TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reference_materials (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    material_type TEXT NOT NULL, -- 'pdf' | 'doc' | 'text_notes' | 'link'
    extracted_text TEXT,
    source_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- One curriculum per (student, subject). Subjects: korean, math, science,
  -- social_studies, english, ... extensible, not an enum in SQLite.
  CREATE TABLE IF NOT EXISTS curricula (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'ai_generated', -- 'ai_generated' | 'teacher'
    status TEXT NOT NULL DEFAULT 'active',        -- 'draft' | 'active'
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(student_id, subject)
  );

  CREATE TABLE IF NOT EXISTS curriculum_topics (
    id TEXT PRIMARY KEY,
    curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
    topic_order INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    competency_code TEXT NOT NULL,
    difficulty INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS student_mastery (
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    competency_code TEXT NOT NULL,
    mastery_score INTEGER NOT NULL DEFAULT 0,
    last_updated TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (student_id, competency_code)
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    curriculum_topic_id TEXT REFERENCES curriculum_topics(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    difficulty INTEGER NOT NULL DEFAULT 1,
    generated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lesson_attempts (
    id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    attempt_type TEXT NOT NULL, -- 'practice' | 'exam'
    score INTEGER NOT NULL,
    answers_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS voice_attempts (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
    phrase TEXT NOT NULL,
    transcript TEXT NOT NULL,
    pronunciation_score INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS writing_attempts (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
    prompt TEXT NOT NULL,
    submission TEXT NOT NULL,
    ai_feedback_json TEXT,
    score INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS parent_reports (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    content_ko TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_students_teacher ON students(teacher_id);
  CREATE INDEX IF NOT EXISTS idx_curricula_student ON curricula(student_id);
  CREATE INDEX IF NOT EXISTS idx_mastery_student ON student_mastery(student_id);
  CREATE INDEX IF NOT EXISTS idx_lessons_student ON lessons(student_id);
`)

console.log('[DB] Schema ready at', dbPath)

// --- Lightweight migration for existing databases from earlier phases ---
// (fresh installs already get `pin` from the CREATE TABLE above; this only
// matters if you're upgrading a database created before Phase 4)
function ensureColumn (table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!cols.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
    console.log(`[DB] Migrated: added column ${table}.${column}`)
  }
}
ensureColumn('students', 'pin', "TEXT NOT NULL DEFAULT '0000'")
ensureColumn('curricula', 'used_materials', 'TEXT')
ensureColumn('curricula', 'review_notes', 'TEXT')
