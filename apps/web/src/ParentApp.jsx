import { useEffect, useState } from 'react'
import { api } from './api.js'
import PersonPicker from './PersonPicker.jsx'

export default function ParentApp ({ onBack }) {
  const [picked, setPicked] = useState(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [parent, setParent] = useState(null)

  if (parent) {
    return (
      <ParentDashboard
        student={picked.student}
        onLogout={() => {
          setParent(null)
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
      <h2>Parent PIN for {picked.student.name}</h2>
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
            const p = await api.loginParent(picked.student.id, pin)
            setParent(p)
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

function ParentDashboard ({ student, onLogout }) {
  const [curriculum, setCurriculum] = useState(null)
  const [error, setError] = useState('')
  const [openSubject, setOpenSubject] = useState(null)

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
        <h2 style={{ margin: 0 }}>{student.name}'s Progress</h2>
        <button
          className='secondary'
          style={{ width: 'auto', padding: '6px 12px' }}
          onClick={onLogout}
        >
          Log out
        </button>
      </div>

      {error && <div className='error-box'>{error}</div>}
      {!curriculum && <p className='muted'>Loading...</p>}

      {curriculum &&
        curriculum.map(subj => (
          <div key={subj.subject} className='card'>
            <div
              style={{ cursor: 'pointer' }}
              onClick={() =>
                setOpenSubject(
                  openSubject === subj.subject ? null : subj.subject
                )
              }
            >
              <strong>{subj.subjectLabel}</strong> — {subj.masteredCount}/
              {subj.totalCount} topics mastered{' '}
              {openSubject === subj.subject ? '▲' : '▼'}
            </div>
            {openSubject === subj.subject && (
              <ul style={{ paddingLeft: 20, fontSize: 13, marginTop: 8 }}>
                {subj.topics.map(t => (
                  <li key={t.competencyCode}>
                    {t.title} — mastery {t.masteryScore}/100{' '}
                    {t.masteryScore >= 80 ? '✔' : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
    </div>
  )
}
