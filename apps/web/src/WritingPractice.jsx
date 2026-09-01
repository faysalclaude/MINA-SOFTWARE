import { useEffect, useState } from 'react'
import { api } from './api.js'

export default function WritingPractice ({
  student,
  subject,
  subjectLabel,
  onClose
}) {
  const [state, setState] = useState('loading') // loading | writing | result | done | error
  const [promptData, setPromptData] = useState(null)
  const [submission, setSubmission] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const loadPrompt = () => {
    setState('loading')
    setError('')
    setSubmission('')
    setResult(null)
    api
      .getWritingPrompt(student.id, subject)
      .then(data => {
        if (data.done) {
          setState('done')
        } else {
          setPromptData(data)
          setState('writing')
        }
      })
      .catch(e => {
        setError(e.message)
        setState('error')
      })
  }

  useEffect(() => {
    loadPrompt()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject])

  const submit = async () => {
    try {
      const res = await api.evaluateWriting(
        student.id,
        promptData.topicId,
        promptData.prompt,
        submission
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
          <h2 style={{ margin: 0 }}>✍️ {subjectLabel} Writing</h2>
          <button
            className='secondary'
            style={{ width: 'auto', padding: '4px 10px', margin: 0 }}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {state === 'loading' && (
          <p className='muted'>MINA is preparing a prompt...</p>
        )}
        {state === 'error' && <div className='error-box'>{error}</div>}
        {state === 'done' && (
          <p>
            🎉 {student.name} has mastered every topic currently in this
            subject!
          </p>
        )}

        {state === 'writing' && promptData && (
          <div>
            <p className='muted'>Topic: {promptData.topicTitle}</p>
            <div className='card'>{promptData.prompt}</div>
            <div className='field'>
              <label>Your answer</label>
              <textarea
                rows={6}
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid #ccc',
                  fontSize: 15
                }}
                value={submission}
                onChange={e => setSubmission(e.target.value)}
              />
            </div>
            <button
              className='primary'
              onClick={submit}
              disabled={!submission.trim()}
            >
              Submit
            </button>
          </div>
        )}

        {state === 'result' && result && (
          <div>
            <h3>
              Score: {result.score !== null ? `${result.score}/100` : 'N/A'}
            </h3>
            {result.grammarFeedback && (
              <p>
                <strong>문법:</strong> {result.grammarFeedback}
              </p>
            )}
            {result.vocabularyFeedback && (
              <p>
                <strong>어휘:</strong> {result.vocabularyFeedback}
              </p>
            )}
            {result.structureFeedback && (
              <p>
                <strong>구성:</strong> {result.structureFeedback}
              </p>
            )}
            {result.overallFeedback && (
              <p className='muted'>{result.overallFeedback}</p>
            )}
            <button className='primary' onClick={loadPrompt}>
              Next prompt
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
