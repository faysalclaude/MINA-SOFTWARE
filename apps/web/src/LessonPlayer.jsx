import { useEffect, useState } from 'react'
import { api } from './api.js'

export default function LessonPlayer ({
  student,
  subject,
  subjectLabel,
  onClose
}) {
  const [state, setState] = useState('loading') // loading | teaching | quiz | result | done | error
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
          setState('teaching')
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
          <p>
            🎉 {student.name} has mastered every topic currently in this
            subject!
          </p>
        )}

        {/* Step 1: teach first. No quiz visible here at all. */}
        {state === 'teaching' && lessonData && (
          <div>
            <h3 style={{ marginBottom: 4 }}>{lessonData.lesson.title}</h3>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {lessonData.lesson.teaching}
            </p>
            <button className='primary' onClick={() => setState('quiz')}>
              I'm ready for the quiz
            </button>
          </div>
        )}

        {/* Step 2: quiz only, after the student says they're ready. */}
        {state === 'quiz' && lessonData && (
          <div>
            <h3>Quiz: {lessonData.lesson.title}</h3>
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
            <button className='secondary' onClick={() => setState('teaching')}>
              Back to the lesson
            </button>
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
