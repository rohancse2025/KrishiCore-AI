import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './ui/App.tsx'
import './styles.css'
import './styles/typography.css'
import { SensorProvider } from './context/SensorContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SensorProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SensorProvider>
  </React.StrictMode>,
)

// Register custom PWA service worker (public/sw.js)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('KrishiCore Service Worker registered on scope:', reg.scope);
      })
      .catch(err => {
        console.error('KrishiCore Service Worker registration failed:', err);
      });
  });
}