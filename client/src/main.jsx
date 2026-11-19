import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider, FeedbackProvider, ThemeProvider } from './context.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <FeedbackProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </FeedbackProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
