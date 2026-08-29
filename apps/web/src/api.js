// All requests go through the same origin (the server serves this app too),
// so this works whether you're on the server PC itself or another device
// on the WiFi hitting http://<server-lan-ip>:4000.
const BASE = '/api'

async function request (path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'content-type': 'application/json' },
    ...options
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: HTTP ${res.status}`)
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  health: () => request('/system/health'),

  createTeacher: (name, schoolName, pin) =>
    request('/teachers', {
      method: 'POST',
      body: JSON.stringify({ name, schoolName, pin })
    }),

  listTeachers: () => request('/teachers'),

  loginTeacher: (id, pin) =>
    request(`/teachers/${id}/login`, {
      method: 'POST',
      body: JSON.stringify({ pin })
    }),

  listStudents: teacherId => request(`/students?teacherId=${teacherId}`),

  addStudent: (teacherId, name, age, grade, paceHint) =>
    request('/students', {
      method: 'POST',
      body: JSON.stringify({ teacherId, name, age, grade, paceHint })
    }),

  deleteStudent: id => request(`/students/${id}`, { method: 'DELETE' }),

  getCurriculum: studentId => request(`/curriculum?studentId=${studentId}`),

  generateCurriculum: studentId =>
    request('/curriculum/generate', {
      method: 'POST',
      body: JSON.stringify({ studentId })
    })
}
