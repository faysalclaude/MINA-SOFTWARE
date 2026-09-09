import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor (props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError (error) {
    return { error }
  }

  componentDidCatch (error, info) {
    console.error('[ErrorBoundary] Caught a render error:', error, info)
  }

  render () {
    if (this.state.error) {
      return (
        <div
          style={{
            maxWidth: 480,
            margin: '40px auto',
            padding: 20,
            fontFamily: 'sans-serif'
          }}
        >
          <h2 style={{ color: '#B03A24' }}>Something went wrong</h2>
          <p style={{ color: '#5B6B63', lineHeight: 1.6 }}>
            MINA TEACHER hit an unexpected error and couldn't display this
            screen. This is usually caused by a code issue, not something you
            did wrong.
          </p>
          <div
            style={{
              background: '#FBE9E5',
              color: '#B03A24',
              padding: 12,
              borderRadius: 8,
              fontSize: 13,
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              marginBottom: 16
            }}
          >
            {this.state.error.message}
          </div>
          <button
            style={{
              width: '100%',
              padding: 13,
              background: '#1F4B3F',
              color: '#FAF6EC',
              border: 'none',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer'
            }}
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
          <p style={{ color: '#5B6B63', fontSize: 12, marginTop: 16 }}>
            If this keeps happening, check the browser console (F12 → Console
            tab) for the full error and share it for help fixing it.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
