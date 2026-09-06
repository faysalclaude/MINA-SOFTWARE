import { useEffect, useState } from 'react'
import { api } from './api.js'
import { subjectColor, subjectIcon } from './subjectMeta.js'

export default function TeacherApp ({ onBack }) {
  const [teacher, setTeacher] = useState(null)
  if (!teacher) return <TeacherAuth onLoggedIn={setTeacher} onBack={onBack} />
  return (
    <TeacherDashboard teacher={teacher} onSwitch={() => setTeacher(null)} />
  )
}

function TeacherAuth ({ onLoggedIn, onBack }) {
  const [teachers, setTeachers] = useState([])
  const [mode, setMode] = useState('loading')
  const [selected, setSelected] = useState(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .listTeachers()
      .then(list => {
        setTeachers(list)
        setMode(list.length === 0 ? 'create' : 'pickOrCreate')
      })
      .catch(() => setMode('create'))
  }, [])

  if (mode === 'loading') return <p className='muted'>Loading...</p>

  if (mode === 'pickOrCreate') {
    return (
      <div>
        <h2>Select your profile</h2>
        {teachers.map(t => (
          <button
            key={t.id}
            className='secondary'
            onClick={() => {
              setSelected(t)
              setMode('login')
            }}
          >
            {t.name} — {t.schoolName}
          </button>
        ))}
        <button className='secondary' onClick={() => setMode('create')}>
          + Add a new teacher profile
        </button>
        <button className='secondary' onClick={onBack}>
          Back
        </button>
      </div>
    )
  }

  if (mode === 'login') {
    return (
      <div>
        <h2>Enter PIN for {selected.name}</h2>
        {error && <div className='error-box'>{error}</div>}
        <div className='field'>
          <label>PIN</label>
          <input
            type='password'
            inputMode='numeric'
            value={pin}
            onChange={e => setPin(e.target.value)}
          />
        </div>
        <button
          className='primary'
          onClick={async () => {
            try {
              const t = await api.loginTeacher(selected.id, pin)
              onLoggedIn(t)
            } catch (e) {
              setError(e.message)
            }
          }}
        >
          Log in
        </button>
        <button className='secondary' onClick={() => setMode('pickOrCreate')}>
          Back
        </button>
      </div>
    )
  }

  return (
    <CreateTeacherForm
      onCreated={onLoggedIn}
      onCancel={() => setMode('pickOrCreate')}
      showCancel={teachers.length > 0}
    />
  )
}

function CreateTeacherForm ({ onCreated, onCancel, showCancel }) {
  const [name, setName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!name.trim() || !schoolName.trim() || pin.length < 4) {
      setError(
        'Please fill in your name, school name, and a PIN of at least 4 digits.'
      )
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const t = await api.createTeacher(name.trim(), schoolName.trim(), pin)
      onCreated(t)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h2>Create your teacher profile</h2>
      {error && <div className='error-box'>{error}</div>}
      <div className='field'>
        <label>Your name</label>
        <input value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className='field'>
        <label>School name</label>
        <input
          value={schoolName}
          onChange={e => setSchoolName(e.target.value)}
        />
      </div>
      <div className='field'>
        <label>PIN (4+ digits, used to log back in)</label>
        <input
          type='password'
          inputMode='numeric'
          value={pin}
          onChange={e => setPin(e.target.value)}
        />
      </div>
      <button className='primary' disabled={submitting} onClick={submit}>
        {submitting ? 'Creating...' : 'Create profile'}
      </button>
      {showCancel && (
        <button className='secondary' onClick={onCancel}>
          Back
        </button>
      )}
    </div>
  )
}

function TeacherDashboard ({ teacher, onSwitch }) {
  const [tab, setTab] = useState('roster') // roster | materials | overview

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <h2 style={{ margin: 0 }}>{teacher.schoolName}</h2>
        <button
          className='secondary'
          style={{ width: 'auto', padding: '6px 12px' }}
          onClick={onSwitch}
        >
          Switch teacher
        </button>
      </div>
      <p className='muted'>Logged in as {teacher.name}</p>

      <div className='tab-row'>
        <button
          className={`tab-btn ${tab === 'roster' ? 'active' : ''}`}
          onClick={() => setTab('roster')}
        >
          Students
        </button>
        <button
          className={`tab-btn ${tab === 'overview' ? 'active' : ''}`}
          onClick={() => setTab('overview')}
        >
          Class Overview
        </button>
        <button
          className={`tab-btn ${tab === 'materials' ? 'active' : ''}`}
          onClick={() => setTab('materials')}
        >
          Materials
        </button>
        <button
          className={`tab-btn ${tab === 'settings' ? 'active' : ''}`}
          onClick={() => setTab('settings')}
        >
          Settings
        </button>
      </div>

      {tab === 'roster' && <Roster teacher={teacher} />}
      {tab === 'overview' && <ClassOverview teacher={teacher} />}
      {tab === 'materials' && <ReferenceMaterials teacher={teacher} />}
      {tab === 'settings' && <Settings />}
    </div>
  )
}

function ClassOverview ({ teacher }) {
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .classOverview(teacher.id)
      .then(setOverview)
      .catch(e => setError(e.message))
  }, [teacher.id])

  const colorFor = percent => {
    if (percent >= 80) return '#166534'
    if (percent >= 50) return '#92400e'
    return '#991b1b'
  }

  return (
    <div>
      {error && <div className='error-box'>{error}</div>}
      {!overview && <p className='muted'>Loading class overview...</p>}
      {overview && overview.length === 0 && (
        <p className='muted'>No students yet.</p>
      )}

      {overview &&
        overview.map(s => (
          <div key={s.id} className='card'>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <strong>{s.name}</strong>{' '}
                <span className='muted'>Grade {s.grade}</span>
              </div>
              {s.hasCurriculum ? (
                <span
                  style={{ fontWeight: 700, color: colorFor(s.overallPercent) }}
                >
                  {s.overallPercent}% overall
                </span>
              ) : (
                <span className='muted'>No curriculum yet</span>
              )}
            </div>
            {s.subjects.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {s.subjects.map(subj => {
                  const pct =
                    subj.totalCount > 0
                      ? Math.round((subj.masteredCount / subj.totalCount) * 100)
                      : 0
                  return (
                    <div key={subj.subject} style={{ marginBottom: 6 }}>
                      <span className='subject-badge'>
                        <span
                          className='subject-dot'
                          style={{ background: subjectColor(subj.subject) }}
                        />
                        {subj.subjectLabel}
                      </span>
                      <div className='progress-track' style={{ height: 6 }}>
                        <div
                          className='progress-fill'
                          style={{
                            width: `${pct}%`,
                            background: subjectColor(subj.subject)
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
    </div>
  )
}

function Roster ({ teacher }) {
  const [students, setStudents] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const refresh = () =>
    api
      .listStudents(teacher.id)
      .then(setStudents)
      .catch(e => setError(e.message))
  useEffect(() => {
    refresh()
  }, [teacher.id])

  return (
    <div>
      {error && <div className='error-box'>{error}</div>}
      <div className='card'>
        {students.length === 0 && <p className='muted'>No students yet.</p>}
        {students.map(s => (
          <div key={s.id}>
            <div className='student-row'>
              <div
                style={{ cursor: 'pointer', flex: 1 }}
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
              >
                <div>
                  {s.name} {expandedId === s.id ? '▲' : '▼'}
                </div>
                <div className='muted'>
                  Grade {s.grade} · age {s.age}
                </div>
              </div>
              <button
                className='secondary'
                style={{ width: 'auto', padding: '6px 12px' }}
                onClick={async () => {
                  await api.deleteStudent(s.id)
                  refresh()
                }}
              >
                Remove
              </button>
            </div>
            {expandedId === s.id && <CurriculumOverview student={s} />}
          </div>
        ))}
      </div>

      {!showAdd ? (
        <button className='primary' onClick={() => setShowAdd(true)}>
          + Add student
        </button>
      ) : (
        <AddStudentForm
          teacherId={teacher.id}
          onAdded={() => {
            setShowAdd(false)
            refresh()
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

function AddStudentForm ({ teacherId, onAdded, onCancel }) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [grade, setGrade] = useState('1')
  const [pin, setPin] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentPin, setParentPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!name.trim() || !age || pin.length < 4) {
      setError(
        'Please fill in the student name, age, and a student PIN of at least 4 digits.'
      )
      return
    }
    if (parentName.trim() && parentPin.length < 4) {
      setError(
        'Parent PIN must be at least 4 digits (or leave both parent fields empty to add one later).'
      )
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await api.addStudent(
        teacherId,
        name.trim(),
        Number(age),
        Number(grade),
        pin,
        parentName.trim() || null,
        parentName.trim() ? parentPin : null
      )
      onAdded()
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='card'>
      <h2 style={{ marginTop: 0 }}>Add a student</h2>
      {error && <div className='error-box'>{error}</div>}
      <div className='field'>
        <label>Name</label>
        <input value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className='field'>
        <label>Age</label>
        <input
          type='number'
          min='5'
          max='14'
          value={age}
          onChange={e => setAge(e.target.value)}
        />
      </div>
      <div className='field'>
        <label>Grade</label>
        <select value={grade} onChange={e => setGrade(e.target.value)}>
          {[1, 2, 3, 4, 5, 6].map(g => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
      </div>
      <div className='field'>
        <label>Student PIN (4+ digits — the student uses this to log in)</label>
        <input
          type='password'
          inputMode='numeric'
          value={pin}
          onChange={e => setPin(e.target.value)}
        />
      </div>
      <div className='field'>
        <label>Parent name (optional, can add later)</label>
        <input
          value={parentName}
          onChange={e => setParentName(e.target.value)}
        />
      </div>
      <div className='field'>
        <label>Parent PIN (required if parent name is filled in)</label>
        <input
          type='password'
          inputMode='numeric'
          value={parentPin}
          onChange={e => setParentPin(e.target.value)}
        />
      </div>
      <button className='primary' disabled={submitting} onClick={submit}>
        {submitting ? 'Adding...' : 'Add student'}
      </button>
      <button className='secondary' onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}

function CurriculumOverview ({ student }) {
  const [curriculum, setCurriculum] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [openSubject, setOpenSubject] = useState(null)
  const [lastGenInfo, setLastGenInfo] = useState(null)
  const [showTeacherForm, setShowTeacherForm] = useState(false)

  const load = () =>
    api
      .getCurriculum(student.id)
      .then(setCurriculum)
      .catch(e => setError(e.message))
  useEffect(() => {
    load()
  }, [student.id])

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    setLastGenInfo(null)
    try {
      const { results } = await api.generateCurriculum(student.id)
      const failed = results.filter(r => r.error)
      if (failed.length > 0) {
        setError(
          `MINA couldn't generate: ${failed.map(f => f.subject).join(', ')}. ${
            failed[0].error || ''
          }`
        )
      }
      setLastGenInfo(results)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  if (!curriculum)
    return (
      <p className='muted' style={{ padding: '0 4px' }}>
        Loading curriculum...
      </p>
    )

  return (
    <div
      style={{
        background: '#fafafa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8
      }}
    >
      {error && <div className='error-box'>{error}</div>}

      {lastGenInfo && (
        <div
          style={{
            fontSize: 12,
            padding: '6px 10px',
            borderRadius: 6,
            marginBottom: 8,
            background: lastGenInfo.some(r => r.usedMaterials?.length > 0)
              ? '#dcfce7'
              : '#f3f4f6',
            color: lastGenInfo.some(r => r.usedMaterials?.length > 0)
              ? '#166534'
              : '#555'
          }}
        >
          {lastGenInfo.some(r => r.usedMaterials?.length > 0)
            ? `✅ MINA used these reference materials: ${[
                ...new Set(lastGenInfo.flatMap(r => r.usedMaterials || []))
              ].join(', ')}`
            : 'ℹ️ No reference materials were used (none uploaded yet, or none exist for this teacher). Add some in the "Reference Materials" tab.'}
        </div>
      )}

      {curriculum.length === 0 && !generating && !showTeacherForm && (
        <div>
          <p className='muted'>
            No curriculum yet for {student.name}. MINA can build one
            automatically, or you can write your own and have MINA review it.
          </p>
          <button className='primary' onClick={handleGenerate}>
            Generate curriculum with MINA
          </button>
          <button
            className='secondary'
            onClick={() => setShowTeacherForm(true)}
          >
            ✏️ Write my own curriculum instead
          </button>
        </div>
      )}

      {showTeacherForm && (
        <TeacherCurriculumForm
          student={student}
          onDone={() => {
            setShowTeacherForm(false)
            load()
          }}
          onCancel={() => setShowTeacherForm(false)}
        />
      )}

      {generating && (
        <p className='muted'>
          MINA is building {student.name}'s curriculum — this can take a minute
          or two.
        </p>
      )}

      {curriculum.length > 0 && !showTeacherForm && (
        <div>
          {curriculum.map(subj => (
            <div key={subj.subject} style={{ marginBottom: 8 }}>
              <div
                style={{ cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
                onClick={() =>
                  setOpenSubject(
                    openSubject === subj.subject ? null : subj.subject
                  )
                }
              >
                {subj.subjectLabel} — {subj.masteredCount}/{subj.totalCount}{' '}
                mastered{' '}
                {subj.source === 'teacher' && (
                  <span className='muted'>(your draft, AI-reviewed)</span>
                )}{' '}
                {openSubject === subj.subject ? '▲' : '▼'}
              </div>
              {openSubject === subj.subject && (
                <div>
                  {subj.usedMaterials?.length > 0 && (
                    <p
                      className='muted'
                      style={{ fontSize: 12, margin: '4px 0' }}
                    >
                      📎 Built using: {subj.usedMaterials.join(', ')}
                    </p>
                  )}
                  {subj.reviewNotes && (
                    <p
                      className='muted'
                      style={{
                        fontSize: 12,
                        margin: '4px 0',
                        fontStyle: 'italic'
                      }}
                    >
                      💬 MINA's review: {subj.reviewNotes}
                    </p>
                  )}
                  <ol
                    style={{ margin: '6px 0', paddingLeft: 20, fontSize: 13 }}
                  >
                    {subj.topics.map(t => (
                      <li key={t.competencyCode} style={{ marginBottom: 6 }}>
                        <strong>{t.title}</strong>{' '}
                        <span className='muted'>
                          (difficulty {t.difficulty}, mastery {t.masteryScore}
                          /100)
                        </span>
                        <div className='muted'>{t.description}</div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}
          <button
            className='secondary'
            disabled={generating}
            onClick={handleGenerate}
          >
            Regenerate curriculum
          </button>
          <button
            className='secondary'
            onClick={() => setShowTeacherForm(true)}
          >
            ✏️ Write my own for a subject
          </button>
        </div>
      )}
    </div>
  )
}

function TeacherCurriculumForm ({ student, onDone, onCancel }) {
  const [subjects, setSubjects] = useState([])
  const [subject, setSubject] = useState('')
  const [draftText, setDraftText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [reviewNotes, setReviewNotes] = useState(null)

  useEffect(() => {
    api
      .getSubjectsForGrade(student.grade)
      .then(list => {
        setSubjects(list)
        if (list.length > 0) setSubject(list[0].code)
      })
      .catch(e => setError(e.message))
  }, [student.grade])

  const submit = async () => {
    if (!draftText.trim()) {
      setError('Write at least a rough outline before submitting.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const result = await api.submitTeacherCurriculum(
        student.id,
        subject,
        draftText
      )
      setReviewNotes(result.reviewNotes)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (reviewNotes !== null) {
    return (
      <div className='card'>
        <h2 style={{ marginTop: 0 }}>Saved ✔</h2>
        <p className='muted' style={{ fontStyle: 'italic' }}>
          MINA's review: {reviewNotes}
        </p>
        <button className='primary' onClick={onDone}>
          Done
        </button>
      </div>
    )
  }

  return (
    <div className='card'>
      <h2 style={{ marginTop: 0 }}>Write your own curriculum</h2>
      <p className='muted'>
        Type your own topic outline for one subject (one idea per line is fine —
        rough notes are OK). MINA will organize it into ordered topics and
        review it for gaps, without replacing your content.
      </p>
      {error && <div className='error-box'>{error}</div>}
      <div className='field'>
        <label>Subject</label>
        <select value={subject} onChange={e => setSubject(e.target.value)}>
          {subjects.map(s => (
            <option key={s.code} value={s.code}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className='field'>
        <label>Your draft curriculum</label>
        <textarea
          rows={8}
          placeholder={
            'e.g.\nAddition and subtraction within 100\nMultiplication tables 2-5\nSimple word problems with money\n...'
          }
          value={draftText}
          onChange={e => setDraftText(e.target.value)}
        />
      </div>
      <button className='primary' disabled={submitting} onClick={submit}>
        {submitting ? 'MINA is reviewing...' : 'Submit for MINA to review'}
      </button>
      <button className='secondary' onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}

function ReferenceMaterials ({ teacher }) {
  const [materials, setMaterials] = useState([])
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const refresh = () =>
    api
      .listMaterials(teacher.id)
      .then(setMaterials)
      .catch(e => setError(e.message))
  useEffect(() => {
    refresh()
  }, [teacher.id])

  return (
    <div>
      <p className='muted'>
        These materials aren't tied to any one student — MINA uses them as extra
        context when it builds curricula on its own. PDF and DOC files are read
        in full; for a link, MINA can't browse the internet, so add a short note
        about what's there instead.
      </p>
      {error && <div className='error-box'>{error}</div>}
      <div className='card'>
        {materials.length === 0 && (
          <p className='muted'>No reference materials yet.</p>
        )}
        {materials.map(m => (
          <div className='student-row' key={m.id}>
            <div>
              <div>
                {m.title} <span className='muted'>({m.materialType})</span>
              </div>
              {m.preview && <div className='muted'>{m.preview}...</div>}
            </div>
            <button
              className='secondary'
              style={{ width: 'auto', padding: '6px 12px' }}
              onClick={async () => {
                await api.deleteMaterial(m.id)
                refresh()
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {!showAdd ? (
        <button className='primary' onClick={() => setShowAdd(true)}>
          + Add reference material
        </button>
      ) : (
        <AddMaterialForm
          teacherId={teacher.id}
          onAdded={() => {
            setShowAdd(false)
            refresh()
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

function AddMaterialForm ({ teacherId, onAdded, onCancel }) {
  const [title, setTitle] = useState('')
  const [materialType, setMaterialType] = useState('pdf')
  const [file, setFile] = useState(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [textNotes, setTextNotes] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const needsFile = materialType === 'pdf' || materialType === 'doc'
  const unsupported = materialType === 'image' || materialType === 'video'

  const submit = async () => {
    if (!title.trim()) {
      setError('Please give this material a title.')
      return
    }
    if (needsFile && !file) {
      setError('Please choose a file to upload.')
      return
    }
    if (unsupported) {
      setError(
        "MINA can't read image or video content yet in this version. Please use PDF, DOC, a text note, or a link with a description instead."
      )
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('teacherId', teacherId)
      formData.append('title', title.trim())
      formData.append('materialType', materialType)
      if (file) formData.append('file', file)
      if (sourceUrl) formData.append('sourceUrl', sourceUrl)
      if (textNotes) formData.append('textNotes', textNotes)
      await api.addMaterial(formData)
      onAdded()
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='card'>
      <h2 style={{ marginTop: 0 }}>Add reference material</h2>
      {error && <div className='error-box'>{error}</div>}
      <div className='field'>
        <label>Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div className='field'>
        <label>Type</label>
        <select
          value={materialType}
          onChange={e => setMaterialType(e.target.value)}
        >
          <option value='pdf'>PDF</option>
          <option value='doc'>Word document (.docx)</option>
          <option value='text_notes'>Text notes</option>
          <option value='link'>Link</option>
          <option value='image'>Image (not yet supported)</option>
          <option value='video'>Video (not yet supported)</option>
        </select>
      </div>
      {unsupported && (
        <div className='error-box'>
          MINA can't read image or video content yet — this offline model only
          reads text. Try a text note describing it, or a PDF/DOC version
          instead.
        </div>
      )}
      {needsFile && (
        <div className='field'>
          <label>File</label>
          <input
            type='file'
            accept={materialType === 'pdf' ? '.pdf' : '.doc,.docx'}
            onChange={e => setFile(e.target.files[0])}
          />
        </div>
      )}
      {materialType === 'link' && (
        <div className='field'>
          <label>URL</label>
          <input
            value={sourceUrl}
            onChange={e => setSourceUrl(e.target.value)}
          />
        </div>
      )}
      {(materialType === 'text_notes' || materialType === 'link') && (
        <div className='field'>
          <label>
            {materialType === 'link'
              ? "Note about what's at this link"
              : 'Notes'}
          </label>
          <textarea
            rows={4}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 8,
              border: '1px solid #ccc',
              fontSize: 15
            }}
            value={textNotes}
            onChange={e => setTextNotes(e.target.value)}
          />
        </div>
      )}
      <button
        className='primary'
        disabled={submitting || unsupported}
        onClick={submit}
      >
        {submitting ? 'Uploading...' : 'Add material'}
      </button>
      <button className='secondary' onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}
function Settings () {
  return (
    <div>
      <div className='card'>
        <h2 style={{ marginTop: 0 }}>Backup</h2>
        <p className='muted'>
          Downloads the entire school's data — all teachers, students,
          curricula, mastery scores, lessons, and reports — as one file. Keep it
          somewhere safe. If this server's PC is ever replaced, copy this file
          into the new server's <code>apps/server/data/</code> folder to restore
          everything.
        </p>
        <a href={api.backupUrl()} style={{ textDecoration: 'none' }}>
          <button className='primary'>⬇️ Download backup</button>
        </a>
      </div>
    </div>
  )
}
