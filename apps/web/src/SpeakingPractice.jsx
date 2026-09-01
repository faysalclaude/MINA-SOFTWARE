import { useEffect, useRef, useState } from 'react'
import { api } from './api.js'

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition

export default function SpeakingPractice ({
  student,
  subject,
  subjectLabel,
  onClose
}) {
  const [state, setState] = useState('loading') // loading | ready | recording | result | done | error | unsupported
  const [promptData, setPromptData] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)

  useEffect(() => {
    if (!SpeechRecognition) {
      setState('unsupported')
      return
    }
    loadPrompt()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject])

  const loadPrompt = () => {
    setState('loading')
    setError('')
    setTranscript('')
    setResult(null)
    api
      .getSpeakingPrompt(student.id, subject)
      .then(data => {
        if (data.done) {
          setState('done')
        } else {
          setPromptData(data)
          setState('ready')
        }
      })
      .catch(e => {
        setError(e.message)
        setState('error')
      })
  }

  const startRecording = () => {
    const recognition = new SpeechRecognition()
    recognition.lang = 'ko-KR'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = event => {
      const text = event.results[0][0].transcript
      setTranscript(text)
    }
    recognition.onerror = event => {
      setError(`Microphone/recognition error: ${event.error}`)
      setState('ready')
    }
    recognition.onend = () => {
      setState('reviewing')
    }

    recognitionRef.current = recognition
    setState('recording')
    setTranscript('')
    recognition.start()
  }

  const submit = async () => {
    try {
      const res = await api.evaluateSpeaking(
        student.id,
        promptData.topicId,
        promptData.phrase,
        transcript
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
          <h2 style={{ margin: 0 }}>🎤 {subjectLabel} Speaking</h2>
          <button
            className='secondary'
            style={{ width: 'auto', padding: '4px 10px', margin: 0 }}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {state === 'unsupported' && (
          <div className='error-box'>
            Speech recognition isn't supported in this browser. Try Chrome or
            Edge on desktop, or Chrome on Android.
          </div>
        )}

        {state === 'loading' && (
          <p className='muted'>MINA is preparing a phrase...</p>
        )}
        {state === 'error' && <div className='error-box'>{error}</div>}
        {state === 'done' && (
          <p>
            🎉 {student.name} has mastered every topic currently in this
            subject!
          </p>
        )}

        {(state === 'ready' ||
          state === 'recording' ||
          state === 'reviewing') &&
          promptData && (
            <div>
              <p className='muted'>Topic: {promptData.topicTitle}</p>
              <div
                className='card'
                style={{ fontSize: 20, textAlign: 'center', padding: 24 }}
              >
                {promptData.phrase}
              </div>

              {state === 'ready' && (
                <button className='primary' onClick={startRecording}>
                  🎤 Tap and read it aloud
                </button>
              )}
              {state === 'recording' && (
                <p className='muted' style={{ textAlign: 'center' }}>
                  Listening...
                </p>
              )}
              {state === 'reviewing' && (
                <div>
                  <p className='muted'>
                    MINA heard: "{transcript || '(nothing recognized)'}"
                  </p>
                  <button className='secondary' onClick={startRecording}>
                    Try again
                  </button>
                  <button
                    className='primary'
                    onClick={submit}
                    disabled={!transcript}
                  >
                    Submit
                  </button>
                </div>
              )}
            </div>
          )}

        {state === 'result' && result && (
          <div>
            <h3>Score: {result.score}/100</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{result.feedback}</p>
            <button className='primary' onClick={loadPrompt}>
              Next phrase
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
