import { useEffect, useState } from 'react'
import { api } from './api.js'
import TeacherApp from './TeacherApp.jsx'
import StudentApp from './StudentApp.jsx'
import ParentApp from './ParentApp.jsx'

export default function App () {
  const [health, setHealth] = useState(null)
  const [role, setRole] = useState(null) // null | 'teacher' | 'student' | 'parent'

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
      <div className='app-header'>
        <div className='mark'>M</div>
        <div>
          <h1>MINA TEACHER</h1>
          <p className='subtitle'>Your personal AI teacher for every subject</p>
        </div>
      </div>

      <div className='app-body'>
        <HealthBanner health={health} />

        {!role && <RoleSelect onSelect={setRole} />}
        {role === 'teacher' && <TeacherApp onBack={() => setRole(null)} />}
        {role === 'student' && <StudentApp onBack={() => setRole(null)} />}
        {role === 'parent' && <ParentApp onBack={() => setRole(null)} />}
      </div>
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
        AI engine:{' '}
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

const ROLES = [
  {
    id: 'teacher',
    icon: '🍎',
    color: 'var(--subject-math)',
    title: "I'm a Teacher",
    desc: 'Manage students, review progress, add materials'
  },
  {
    id: 'student',
    icon: '🎒',
    color: 'var(--subject-korean)',
    title: "I'm a Student",
    desc: 'Learn lessons, practice speaking and writing'
  },
  {
    id: 'parent',
    icon: '🏡',
    color: 'var(--subject-social_studies)',
    title: "I'm a Parent",
    desc: "See your child's progress and reports"
  }
]

function RoleSelect ({ onSelect }) {
  return (
    <div>
      <h2>Who's here today?</h2>
      <div className='role-grid'>
        {ROLES.map(r => (
          <button
            key={r.id}
            className='role-card'
            onClick={() => onSelect(r.id)}
          >
            <div
              className='role-icon'
              style={{ background: r.color, color: '#fff' }}
            >
              {r.icon}
            </div>
            <div className='role-text'>
              <strong>{r.title}</strong>
              <span>{r.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
