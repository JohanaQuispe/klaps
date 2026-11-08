import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import AccessibilityProvider from './context/AccessibilityProvider.jsx'
import DeviceProvider from './context/DeviceProvider.jsx'
import HistoryProvider from './context/HistoryProvider.jsx'
import './styles/index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AccessibilityProvider>
        <DeviceProvider>
          <HistoryProvider>
            <App />
          </HistoryProvider>
        </DeviceProvider>
      </AccessibilityProvider>
    </BrowserRouter>
  </StrictMode>,
)
