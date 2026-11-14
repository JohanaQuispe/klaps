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
import Diagnostics from './pages/Devices/Diagnostics.jsx'
import Training from './pages/Training/Training.jsx'
import Settings from './pages/Settings/Settings.jsx'
import NotFound from './pages/NotFound/NotFound.jsx'

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
        <Route path="/dispositivos/diagnostico" element={<Diagnostics />} />
        <Route path="/entrenamiento" element={<Training />} />
        <Route path="/ajustes" element={<Settings />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
