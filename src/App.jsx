import { Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell.jsx'
import Welcome from './pages/Welcome/Welcome.jsx'
import Dashboard from './pages/Dashboard/Dashboard.jsx'
import Translation from './pages/Translation/Translation.jsx'
import Voice from './pages/Voice/Voice.jsx'
import Phrases from './pages/Phrases/Phrases.jsx'
import History from './pages/History/History.jsx'
import Emergency from './pages/Emergency/Emergency.jsx'
import Devices from './pages/Devices/Devices.jsx'
import Settings from './pages/Settings/Settings.jsx'
import ComingSoon from './pages/ComingSoon/ComingSoon.jsx'
import NotFound from './pages/NotFound/NotFound.jsx'
import { PENDING_PAGES } from './pages/ComingSoon/pendingPages.js'

/**
 * Mapa de rutas de KLAPS.
 * Este archivo solo compone: cada pantalla vive en su propia carpeta.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />

      <Route element={<AppShell />}>
        <Route path="/inicio" element={<Dashboard />} />
        <Route path="/traducir" element={<Translation />} />
        <Route path="/voz" element={<Voice />} />
        <Route path="/frases" element={<Phrases />} />
        <Route path="/historial" element={<History />} />
        <Route path="/emergencia" element={<Emergency />} />
        <Route path="/dispositivos" element={<Devices />} />
        <Route path="/ajustes" element={<Settings />} />

        {PENDING_PAGES.map(({ path, ...pageProps }) => (
          <Route key={path} path={path} element={<ComingSoon {...pageProps} />} />
        ))}

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
