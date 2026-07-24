import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './ui/App'
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
