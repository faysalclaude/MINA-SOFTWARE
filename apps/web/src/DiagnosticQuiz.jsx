import { useEffect, useState } from 'react'
import { api } from './api.js'

export default function DiagnosticQuiz ({
  student,
  subject,
  subjectLabel,
  onClose
}) {
  const [state, setState] = useState('loading') // loading | quiz | result | error
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .getDiagnosticQuiz(student.id, subject)
      .then(data => {
        setQuiz(data)
        setState('quiz')
      })
      .catch(e => {
        setError(e.message)
        setState('error')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject])

  const submit = async () => {
    const answerList = quiz.questions.map(q => ({
      questionId: q.id,
      answer: answers[q.id] || ''
    }))
    try {
      const res = await api.submitDiagnosticQuiz(
        quiz.diagnosticId,
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
          <h2 style={{ margin: 0 }}>⚡ {subjectLabel} Quick Check</h2>
          <button
            className='secondary'
            style={{ width: 'auto', padding: '4px 10px', margin: 0 }}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {state === 'loading' && (
          <p className='muted'>MINA is preparing a few quick questions...</p>
        )}
        {state === 'error' && <div className='error-box'>{error}</div>}

        {state === 'quiz' && quiz && (
          <div>
            <p className='muted'>
              A few quick questions across easy to hard, so MINA knows what you
              already know before starting lessons.
            </p>
            {quiz.questions.map((q, i) => (
              <div key={q.id} className='field'>
                <label>
                  {i + 1}. {q.question}
                </label>
                {q.options?.map(opt => (
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
                ))}
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
              {result.correctCount}/{result.total} correct
            </h3>
            <p className='muted'>
              MINA set your starting point based on this — lessons will begin at
              the right level instead of from scratch.
            </p>
            <button className='primary' onClick={onClose}>
              Start learning
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
