import { useEffect, useState } from 'react'
import { api } from './api.js'

/**
 * Shared "pick your school/teacher, then pick your name" flow used by both
 * the Student and Parent login screens. Calls onPicked(teacher, student)
 * once both are chosen; the PIN step itself is role-specific and handled
 * by the caller.
 */
export default function PersonPicker ({ onPicked, onBack }) {
  const [teachers, setTeachers] = useState([])
  const [teacher, setTeacher] = useState(null)
  const [students, setStudents] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .listTeachers()
      .then(setTeachers)
      .catch(e => setError(e.message))
  }, [])

  useEffect(() => {
    if (teacher) {
      api
        .listStudents(teacher.id)
        .then(setStudents)
        .catch(e => setError(e.message))
    }
  }, [teacher])

  if (error) return <div className='error-box'>{error}</div>

  if (!teacher) {
    return (
      <div>
        <h2>Select your school/teacher</h2>
        {teachers.length === 0 && (
          <p className='muted'>No teachers set up on this server yet.</p>
        )}
        {teachers.map(t => (
          <button
            key={t.id}
            className='secondary'
            onClick={() => setTeacher(t)}
          >
            {t.name} — {t.schoolName}
          </button>
        ))}
        <button className='secondary' onClick={onBack}>
          Back
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2>Select your name</h2>
      {students.length === 0 && (
        <p className='muted'>No students under this teacher yet.</p>
      )}
      {students.map(s => (
        <button
          key={s.id}
          className='secondary'
          onClick={() => onPicked(teacher, s)}
        >
          {s.name} (Grade {s.grade})
        </button>
      ))}
      <button className='secondary' onClick={() => setTeacher(null)}>
        Back
      </button>
    </div>
  )
}
