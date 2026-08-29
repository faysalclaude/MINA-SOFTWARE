import { useEffect, useState } from 'react'
import { api } from './api.js'

export default function App () {
  const [health, setHealth] = useState(null)
  const [teacher, setTeacher] = useState(null)

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch(() => setHealth({ error: true }))
    const interval = setInterval(() => {
      api
        .health()
        .then(setHealth)
        .catch(() => setHealth({ error: true }))
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className='app-shell'>
      <h1>MINA TEACHER</h1>
      <p className='subtitle'>
        Phase 3 — Teaching, Testing &amp; Adaptive Difficulty
      </p>

      <HealthBanner health={health} />

      {!teacher ? (
        <TeacherAuth onLoggedIn={setTeacher} />
      ) : (
        <Roster teacher={teacher} onSwitchTeacher={() => setTeacher(null)} />
      )}
    </div>
  )
}

function HealthBanner ({ health }) {
  if (!health) return null
  if (health.error) {
    return (
      <div className='error-box'>
        Cannot reach the MINA TEACHER server. Is it running?
      </div>
    )
  }

  const ollamaOk = health.ollama?.reachable && health.ollama?.modelPulled

  return (
    <div className='card'>
      <div style={{ marginBottom: 6 }}>
        Ollama AI engine:{' '}
        <span
          className={`status-pill ${ollamaOk ? 'status-ok' : 'status-bad'}`}
        >
          {ollamaOk ? 'ready' : 'not ready'}
        </span>
      </div>
      {!health.ollama?.reachable && (
        <p className='muted'>
          Ollama isn't running on the server. Start it, then refresh.
        </p>
      )}
      {health.ollama?.reachable && !health.ollama?.modelPulled && (
        <p className='muted'>
          Ollama is running but the model "{health.ollama.currentModel}" isn't
          pulled yet.
        </p>
      )}
      {health.network?.lanAddresses?.length > 0 && (
        <p className='muted'>
          Network address: {health.network.lanAddresses[0]}:4000 — other devices
          on the same WiFi can open this.
        </p>
      )}
    </div>
  )
}

function TeacherAuth ({ onLoggedIn }) {
  const [teachers, setTeachers] = useState([])
  const [mode, setMode] = useState('loading') // loading | pickOrCreate | create | login
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

  // mode === 'create'
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

function Roster ({ teacher, onSwitchTeacher }) {
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
          onClick={onSwitchTeacher}
        >
          Switch teacher
        </button>
      </div>
      <p className='muted'>Logged in as {teacher.name}</p>

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
            {expandedId === s.id && <CurriculumPanel student={s} />}
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
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!name.trim() || !age) {
      setError('Please fill in the student name and age.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await api.addStudent(teacherId, name.trim(), Number(age), Number(grade))
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
      <button className='primary' disabled={submitting} onClick={submit}>
        {submitting ? 'Adding...' : 'Add student'}
      </button>
      <button className='secondary' onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}

function CurriculumPanel ({ student }) {
  const [curriculum, setCurriculum] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [openSubject, setOpenSubject] = useState(null)
  const [practiceSubject, setPracticeSubject] = useState(null)

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
    try {
      const { results } = await api.generateCurriculum(student.id)
      const failed = results.filter(r => r.error)
      if (failed.length > 0) {
        setError(
          `MINA couldn't generate: ${failed.map(f => f.subject).join(', ')}. ` +
            (failed[0].error || '')
        )
      }
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

      {curriculum.length === 0 && !generating && (
        <div>
          <p className='muted'>No curriculum yet for {student.name}.</p>
          <button className='primary' onClick={handleGenerate}>
            Generate curriculum
          </button>
        </div>
      )}

      {generating && (
        <p className='muted'>
          MINA is building {student.name}'s curriculum across all subjects —
          this can take a minute or two on first run. Don't close this page.
        </p>
      )}

      {curriculum.length > 0 && (
        <div>
          {curriculum.map(subj => (
            <div key={subj.subject} style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div
                  style={{ cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
                  onClick={() =>
                    setOpenSubject(
                      openSubject === subj.subject ? null : subj.subject
                    )
                  }
                >
                  {subj.subjectLabel} ({subj.topics.length} topics){' '}
                  {openSubject === subj.subject ? '▲' : '▼'}
                </div>
                <button
                  className='secondary'
                  style={{ width: 'auto', padding: '4px 10px', margin: 0 }}
                  onClick={() => setPracticeSubject(subj.subject)}
                >
                  Practice
                </button>
              </div>
              {openSubject === subj.subject && (
                <ol style={{ margin: '6px 0', paddingLeft: 20, fontSize: 13 }}>
                  {subj.topics.map(t => (
                    <li key={t.competencyCode} style={{ marginBottom: 6 }}>
                      <strong>{t.title}</strong>{' '}
                      <span className='muted'>(difficulty {t.difficulty})</span>
                      <div className='muted'>{t.description}</div>
                    </li>
                  ))}
                </ol>
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
        </div>
      )}

      {practiceSubject && (
        <LessonPlayer
          student={student}
          subject={practiceSubject}
          subjectLabel={
            curriculum.find(s => s.subject === practiceSubject)?.subjectLabel ||
            practiceSubject
          }
          onClose={() => setPracticeSubject(null)}
        />
      )}
    </div>
  )
}

function LessonPlayer ({ student, subject, subjectLabel, onClose }) {
  const [state, setState] = useState('loading') // loading | lesson | result | done | error
  const [lessonData, setLessonData] = useState(null)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const loadNext = () => {
    setState('loading')
    setError('')
    setAnswers({})
    setResult(null)
    api
      .getNextLesson(student.id, subject)
      .then(data => {
        if (data.done) {
          setState('done')
        } else {
          setLessonData(data)
          setState('lesson')
        }
      })
      .catch(e => {
        setError(e.message)
        setState('error')
      })
  }

  useEffect(() => {
    loadNext()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject])

  const submit = async () => {
    const answerList = lessonData.lesson.quiz.map(q => ({
      questionId: q.id,
      answer: answers[q.id] || ''
    }))
    try {
      const res = await api.submitLesson(
        lessonData.lesson.id,
        student.id,
        answerList
      )
      setResult(res)
      setState('result')
    } catch (e) {
      setError(e.message)
      setState('error')
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 50
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          maxHeight: '85vh',
          overflowY: 'auto',
          borderRadius: '16px 16px 0 0',
          padding: 20
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <h2 style={{ margin: 0 }}>{subjectLabel}</h2>
          <button
            className='secondary'
            style={{ width: 'auto', padding: '4px 10px', margin: 0 }}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {state === 'loading' && (
          <p className='muted'>
            MINA is preparing a lesson for {student.name}...
          </p>
        )}

        {state === 'error' && <div className='error-box'>{error}</div>}

        {state === 'done' && (
          <div>
            <p>
              🎉 {student.name} has mastered every topic currently in this
              subject!
            </p>
          </div>
        )}

        {state === 'lesson' && lessonData && (
          <div>
            <h3 style={{ marginBottom: 4 }}>{lessonData.lesson.title}</h3>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {lessonData.lesson.teaching}
            </p>

            <h3>Quiz</h3>
            {lessonData.lesson.quiz.map((q, i) => (
              <div key={q.id} className='field'>
                <label>
                  {i + 1}. {q.question}
                </label>
                {q.questionType === 'multiple_choice' && q.options ? (
                  q.options.map(opt => (
                    <label
                      key={opt}
                      style={{
                        display: 'block',
                        fontWeight: 400,
                        fontSize: 14,
                        marginBottom: 4
                      }}
                    >
                      <input
                        type='radio'
                        name={q.id}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                        style={{ marginRight: 6 }}
                      />
                      {opt}
                    </label>
                  ))
                ) : (
                  <input
                    value={answers[q.id] || ''}
                    onChange={e =>
                      setAnswers({ ...answers, [q.id]: e.target.value })
                    }
                  />
                )}
              </div>
            ))}
            <button className='primary' onClick={submit}>
              Submit
            </button>
          </div>
        )}

        {state === 'result' && result && (
          <div>
            <h3>
              Score: {result.scorePercent}% ({result.correctCount}/
              {result.total})
            </h3>
            {result.newMastery !== null && (
              <p className='muted'>
                Mastery for this topic is now {result.newMastery}/100.
              </p>
            )}
            <ul style={{ paddingLeft: 20, fontSize: 13 }}>
              {result.feedback.map(f => (
                <li
                  key={f.questionId}
                  style={{ color: f.correct ? '#166534' : '#991b1b' }}
                >
                  {f.correct
                    ? '✔ Correct'
                    : `✘ Correct answer: ${f.correctAnswer}`}
                </li>
              ))}
            </ul>
            <button className='primary' onClick={loadNext}>
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
