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
  const [tab, setTab] = useState('progress') // progress | reports

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

      <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <button
          className={tab === 'progress' ? 'primary' : 'secondary'}
          style={{ width: 'auto', padding: '6px 14px', margin: 0 }}
          onClick={() => setTab('progress')}
        >
          Progress
        </button>
        <button
          className={tab === 'reports' ? 'primary' : 'secondary'}
          style={{ width: 'auto', padding: '6px 14px', margin: 0 }}
          onClick={() => setTab('reports')}
        >
          Reports
        </button>
      </div>

      {error && <div className='error-box'>{error}</div>}

      {tab === 'progress' && (
        <div>
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
      )}

      {tab === 'reports' && <ReportsTab student={student} />}
    </div>
  )
}

function ReportsTab ({ student }) {
  const [reports, setReports] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const load = () =>
    api
      .listReports(student.id)
      .then(setReports)
      .catch(e => setError(e.message))
  useEffect(() => {
    load()
  }, [student.id])

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    try {
      await api.generateReport(student.id)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div>
      {error && <div className='error-box'>{error}</div>}
      <button
        className='primary'
        disabled={generating}
        onClick={handleGenerate}
      >
        {generating
          ? 'MINA is writing a report...'
          : '📝 Generate a new report'}
      </button>

      {reports === null && <p className='muted'>Loading reports...</p>}
      {reports && reports.length === 0 && !generating && (
        <p className='muted'>No reports yet. Generate the first one above.</p>
      )}

      {reports &&
        reports.map(r => (
          <div key={r.id} className='card'>
            <div className='muted' style={{ marginBottom: 8 }}>
              {r.periodStart} ~ {r.periodEnd}
            </div>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {r.content}
            </p>
          </div>
        ))}
    </div>
  )
}
