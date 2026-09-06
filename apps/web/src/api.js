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
  backupUrl: () => BASE + '/backup',
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
  addStudent: (
    teacherId,
    name,
    age,
    grade,
    pin,
    parentName,
    parentPin,
    paceHint
  ) =>
    request('/students', {
      method: 'POST',
      body: JSON.stringify({
        teacherId,
        name,
        age,
        grade,
        pin,
        parentName,
        parentPin,
        paceHint
      })
    }),
  loginStudent: (id, pin) =>
    request(`/students/${id}/login`, {
      method: 'POST',
      body: JSON.stringify({ pin })
    }),
  deleteStudent: id => request(`/students/${id}`, { method: 'DELETE' }),

  loginParent: (studentId, pin) =>
    request('/parents/login', {
      method: 'POST',
      body: JSON.stringify({ studentId, pin })
    }),

  getCurriculum: studentId => request(`/curriculum?studentId=${studentId}`),
  generateCurriculum: studentId =>
    request('/curriculum/generate', {
      method: 'POST',
      body: JSON.stringify({ studentId })
    }),
  getSubjectsForGrade: grade => request(`/curriculum/subjects?grade=${grade}`),
  submitTeacherCurriculum: (studentId, subject, draftText) =>
    request('/curriculum/teacher-submit', {
      method: 'POST',
      body: JSON.stringify({ studentId, subject, draftText })
    }),

  getNextLesson: (studentId, subject) =>
    request(`/lessons/next?studentId=${studentId}&subject=${subject}`),
  submitLesson: (lessonId, studentId, answers) =>
    request(`/lessons/${lessonId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ studentId, answers })
    }),

  getSpeakingPrompt: (studentId, subject) =>
    request(`/speaking/prompt?studentId=${studentId}&subject=${subject}`),
  evaluateSpeaking: (studentId, topicId, phrase, transcript) =>
    request('/speaking/evaluate', {
      method: 'POST',
      body: JSON.stringify({ studentId, topicId, phrase, transcript })
    }),

  getWritingPrompt: (studentId, subject) =>
    request(`/writing/prompt?studentId=${studentId}&subject=${subject}`),
  evaluateWriting: (studentId, topicId, prompt, submission) =>
    request('/writing/evaluate', {
      method: 'POST',
      body: JSON.stringify({ studentId, topicId, prompt, submission })
    }),

  listMaterials: teacherId => request(`/materials?teacherId=${teacherId}`),
  addMaterial: async formData => {
    const res = await fetch(BASE + '/materials', {
      method: 'POST',
      body: formData
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Request failed: HTTP ${res.status}`)
    }
    return res.json()
  },
  deleteMaterial: id => request(`/materials/${id}`, { method: 'DELETE' }),
  generateReport: studentId =>
    request('/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ studentId })
    }),
  listReports: studentId => request(`/reports?studentId=${studentId}`),

  classOverview: teacherId =>
    request(`/analytics/class-overview?teacherId=${teacherId}`)
}
