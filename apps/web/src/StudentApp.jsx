import { useEffect, useState } from 'react'
import { api } from './api.js'
import PersonPicker from './PersonPicker.jsx'
import LessonPlayer from './LessonPlayer.jsx'
import SpeakingPractice from './SpeakingPractice.jsx'
import WritingPractice from './WritingPractice.jsx'
import { subjectColor, subjectIcon } from './subjectMeta.js'
import DiagnosticQuiz from './DiagnosticQuiz.jsx'

export default function StudentApp ({ onBack }) {
  const [picked, setPicked] = useState(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [student, setStudent] = useState(null)
  const [diagnosticSubject, setDiagnosticSubject] = useState(null)

  if (student) {
    return (
      <StudentDashboard
        student={student}
        onLogout={() => {
          setStudent(null)
          setPicked(null)
          setPin('')
        }}
      />
    )
  }

  if (!picked) {
    return (
      <PersonPicker
        onPicked={(teacher, s) => setPicked({ teacher, student: s })}
        onBack={onBack}
      />
    )
  }

  return (
    <div>
      <h2>Hi {picked.student.name}! Enter your PIN</h2>
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
            const s = await api.loginStudent(picked.student.id, pin)
            setStudent(s)
          } catch (e) {
            setError(e.message)
          }
        }}
      >
        Log in
      </button>
      <button className='secondary' onClick={() => setPicked(null)}>
        Back
      </button>
    </div>
  )
}

function StudentDashboard ({ student, onLogout }) {
  const [curriculum, setCurriculum] = useState(null)
  const [error, setError] = useState('')
  const [practiceSubject, setPracticeSubject] = useState(null)
  const [speakingSubject, setSpeakingSubject] = useState(null)
  const [writingSubject, setWritingSubject] = useState(null)
  const [diagnosticSubject, setDiagnosticSubject] = useState(null)

  useEffect(() => {
    api
      .getCurriculum(student.id)
      .then(setCurriculum)
      .catch(e => setError(e.message))
  }, [student.id])

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <h2 style={{ margin: 0 }}>Hi {student.name}!</h2>
        <button
          className='secondary'
          style={{ width: 'auto', padding: '6px 12px' }}
          onClick={onLogout}
        >
          Log out
        </button>
      </div>

      {error && <div className='error-box'>{error}</div>}
      {!curriculum && <p className='muted'>Loading your subjects...</p>}
      {curriculum && curriculum.length === 0 && (
        <p className='muted'>
          Your teacher hasn't set up your lessons yet. Check back soon!
        </p>
      )}

      {curriculum &&
        curriculum.map(subj => (
          <div
            key={subj.subject}
            className='card subject-card'
            style={{ borderLeftColor: subjectColor(subj.subject) }}
          >
            <div>
              <span className='subject-badge'>
                <span aria-hidden='true'>{subjectIcon(subj.subject)}</span>{' '}
                {subj.subjectLabel}
              </span>
              <div className='progress-track'>
                <div
                  className='progress-fill'
                  style={{
                    width: `${
                      subj.totalCount
                        ? Math.round(
                            (subj.masteredCount / subj.totalCount) * 100
                          )
                        : 0
                    }%`,
                    background: subjectColor(subj.subject)
                  }}
                />
              </div>
              <div className='muted' style={{ marginTop: 6 }}>
                {subj.masteredCount}/{subj.totalCount} topics mastered
              </div>
            </div>
            <button
              className='primary'
              style={{ marginTop: 12 }}
              onClick={() => setPracticeSubject(subj.subject)}
            >
              📖 Start learning
            </button>
            {subj.masteredCount === 0 && (
              <button
                className='secondary'
                style={{ marginTop: 8 }}
                onClick={() => setDiagnosticSubject(subj.subject)}
              >
                ⚡ Already know some of this? Take a quick check
              </button>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                className='secondary'
                style={{ flex: 1, margin: 0 }}
                onClick={() => setSpeakingSubject(subj.subject)}
              >
                🎤 Speaking
              </button>
              <button
                className='secondary'
                style={{ flex: 1, margin: 0 }}
                onClick={() => setWritingSubject(subj.subject)}
              >
                ✍️ Writing
              </button>
            </div>
          </div>
        ))}

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
      {speakingSubject && (
        <SpeakingPractice
          student={student}
          subject={speakingSubject}
          subjectLabel={
            curriculum.find(s => s.subject === speakingSubject)?.subjectLabel ||
            speakingSubject
          }
          onClose={() => setSpeakingSubject(null)}
        />
      )}
      {writingSubject && (
        <WritingPractice
          student={student}
          subject={writingSubject}
          subjectLabel={
            curriculum.find(s => s.subject === writingSubject)?.subjectLabel ||
            writingSubject
          }
          onClose={() => setWritingSubject(null)}
        />
      )}
      {diagnosticSubject && (
        <DiagnosticQuiz
          student={student}
          subject={diagnosticSubject}
          subjectLabel={
            curriculum.find(s => s.subject === diagnosticSubject)
              ?.subjectLabel || diagnosticSubject
          }
          onClose={() => {
            setDiagnosticSubject(null)
            api
              .getCurriculum(student.id)
              .then(setCurriculum)
              .catch(() => {})
          }}
        />
      )}
    </div>
  )
}
