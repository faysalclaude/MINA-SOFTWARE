import { useRef, useState } from 'react'
import { api } from './api.js'

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition

export default function AskMina ({ student, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [recording, setRecording] = useState(false)
  const [voiceLang, setVoiceLang] = useState('ko-KR') // ko-KR | en-US
  const recognitionRef = useRef(null)
  const scrollRef = useRef(null)

  const scrollToBottom = () => {
    setTimeout(
      () => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }),
      50
    )
  }

  const send = async textOverride => {
    const text = (textOverride ?? input).trim()
    if (!text || sending) return

    const history = messages.map(m => ({ role: m.role, text: m.text }))
    setMessages(prev => [...prev, { role: 'student', text }])
    setInput('')
    setSending(true)
    setError('')
    scrollToBottom()

    try {
      const res = await api.askTutor(student.id, text, history)
      setMessages(prev => [
        ...prev,
        {
          role: 'mina',
          text: res.answer,
          lookupTitle: res.usedWebLookup ? res.lookupTitle : null
        }
      ])
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
      scrollToBottom()
    }
  }

  const startRecording = () => {
    if (!SpeechRecognition) {
      setError(
        "Voice input isn't supported in this browser. Try Chrome or Edge."
      )
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = voiceLang
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = event => {
      const text = event.results[0][0].transcript
      send(text)
    }
    recognition.onerror = event => {
      setError(`Microphone error: ${event.error}`)
      setRecording(false)
    }
    recognition.onend = () => setRecording(false)

    recognitionRef.current = recognition
    setRecording(true)
    recognition.start()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 70
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          height: '75vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px 16px 0 0'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 16px 8px'
          }}
        >
          <h2 style={{ margin: 0 }}>❓ Ask MINA</h2>
          <button
            className='secondary'
            style={{ width: 'auto', padding: '4px 10px', margin: 0 }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <p className='muted' style={{ padding: '0 16px', margin: '0 0 8px' }}>
          Ask about anything you don't understand — in English or Korean, typed
          or spoken.
        </p>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
          {messages.length === 0 && (
            <p className='muted' style={{ textAlign: 'center', marginTop: 40 }}>
              Type a question below, or tap the microphone to speak.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent:
                  m.role === 'student' ? 'flex-end' : 'flex-start',
                marginBottom: 10
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius: 14,
                  background:
                    m.role === 'student'
                      ? 'var(--accent)'
                      : 'var(--surface-sunken)',
                  color:
                    m.role === 'student' ? 'var(--accent-ink)' : 'var(--ink)',
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {m.text}
                {m.lookupTitle && (
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>
                    🌐 Looked up: {m.lookupTitle}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && <p className='muted'>MINA is thinking...</p>}
          {error && <div className='error-box'>{error}</div>}
          <div ref={scrollRef} />
        </div>

        <div style={{ padding: 16, borderTop: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{
                flex: 1,
                padding: '10px 13px',
                border: '1.5px solid var(--line)',
                borderRadius: 10,
                fontSize: 15
              }}
              value={input}
              placeholder='Type your question...'
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
            />
            <button
              className='secondary'
              style={{
                width: 48,
                margin: 0,
                padding: 0,
                flexShrink: 0,
                background: recording ? 'var(--danger-bg)' : undefined
              }}
              onClick={startRecording}
              disabled={recording}
              title='Speak your question'
            >
              🎤
            </button>
            <button
              className='primary'
              style={{
                width: 'auto',
                padding: '0 16px',
                margin: 0,
                flexShrink: 0
              }}
              onClick={() => send()}
              disabled={sending || !input.trim()}
            >
              Send
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button
              className={voiceLang === 'ko-KR' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setVoiceLang('ko-KR')}
            >
              🎤 한국어
            </button>
            <button
              className={voiceLang === 'en-US' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setVoiceLang('en-US')}
            >
              🎤 English
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
