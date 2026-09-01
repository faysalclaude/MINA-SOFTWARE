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
      <h1>MINA TEACHER</h1>
      <p className='subtitle'>Teacher / Student / Parent Portals</p>

      <HealthBanner health={health} />

      {!role && <RoleSelect onSelect={setRole} />}
      {role === 'teacher' && <TeacherApp onBack={() => setRole(null)} />}
      {role === 'student' && <StudentApp onBack={() => setRole(null)} />}
      {role === 'parent' && <ParentApp onBack={() => setRole(null)} />}
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

function RoleSelect ({ onSelect }) {
  return (
    <div>
      <h2>Who are you?</h2>
      <button className='primary' onClick={() => onSelect('teacher')}>
        I'm a Teacher
      </button>
      <button
        className='primary'
        style={{ marginTop: 10 }}
        onClick={() => onSelect('student')}
      >
        I'm a Student
      </button>
      <button
        className='primary'
        style={{ marginTop: 10 }}
        onClick={() => onSelect('parent')}
      >
        I'm a Parent
      </button>
    </div>
  )
}
