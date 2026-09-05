import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Registers the service worker so the app is installable ("Add to Home
// Screen" on phone, "Install app" on desktop Chrome/Edge) and loads fast on
// a spotty school WiFi. API calls are excluded from caching in sw.js, so
// this never causes stale student/teacher/parent data.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('Service worker registration failed:', err)
    })
  })
}
