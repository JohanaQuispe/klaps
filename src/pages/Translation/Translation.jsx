import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bluetooth,
  Copy,
  GraduationCap,
  History,
  Pause,
  Play,
  Save,
  Sparkles,
  Trash2,
  Volume2,
  Wand2,
} from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import StatusBadge from '../../components/common/StatusBadge'
import ErrorMessage from '../../components/common/ErrorMessage'
import SectionTitle from '../../components/common/SectionTitle'
import ProgressBar from '../../components/common/ProgressBar'
import { useDevices } from '../../context/deviceContext.js'
import { useHistory } from '../../context/historyContext.js'
import { useAppSpeech } from '../../hooks/useAppSpeech.js'
import { useClipboard } from '../../hooks/useClipboard.js'
import { useGestureRecognition } from '../../hooks/useGestureRecognition.js'
import { CONFIDENCE_THRESHOLD } from '../../services/gesture/knnClassifier.js'
import { improveSentence } from '../../services/gesture/sentence.js'
import { loadTraining } from '../../services/gesture/trainingStore.js'
import { formatRelativeTime } from '../../utils/format.js'

/** Etiquetas que disparan el flujo de emergencia. */
const SOS_LABELS = /^(sos|emergencia|auxilio)$/i

export default function Translation() {
  const { entries, addEntry } = useHistory()
  const { supported: speechSupported, speak, speaking, stop: stopSpeech } = useAppSpeech()
  const { copied, error: copyError, copy } = useClipboard()
  const { featureVector, hasReadings, protocolConfigured, gloves } = useDevices()

  const [training, setTraining] = useState(loadTraining)
  const [listening, setListening] = useState(false)
  const [words, setWords] = useState([])
  const [lastMatch, setLastMatch] = useState(null)
  const [corrected, setCorrected] = useState(null)
  const [correctionNotes, setCorrectionNotes] = useState([])
  const [sosSign, setSosSign] = useState(null)

  const signs = training.signs
  const connected = gloves.filter((glove) => glove.status === 'conectado').length
  const text = words.join(' ')
  const displayText = corrected ?? text
  const sessionEntries = entries.filter((entry) => entry.type === 'gesto').slice(0, 5)

  // El entrenamiento puede cambiar en otra pestaña o pantalla.
  useEffect(() => {
    // Se relee al volver de la pantalla de entrenamiento o desde otra pestaña.
    const refresh = () => setTraining(loadTraining())
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const handleRecognize = useCallback(
    (result) => {
      const label = result.label.trim()
      if (!label) return

      setLastMatch({ label, confidence: result.confidence, at: Date.now() })
      setCorrected(null)
      setCorrectionNotes([])

      if (SOS_LABELS.test(label)) {
        setSosSign({ label, at: Date.now() })
        speak('Emergencia')
        return
      }

      setWords((previous) => [...previous, label])
      speak(label)
    },
    [speak],
  )

  const { live } = useGestureRecognition({
    vector: featureVector,
    signs,
    enabled: listening,
    onRecognize: handleRecognize,
  })

  const applyCorrection = () => {
    const { text: improved, applied } = improveSentence(text)
    setCorrected(improved)
    setCorrectionNotes(applied)
  }

  const clearText = () => {
    setWords([])
    setCorrected(null)
    setCorrectionNotes([])
    setLastMatch(null)
    setListening(false)
  }

  const saveToHistory = () => {
    if (!displayText) return
    addEntry({ type: 'gesto', text: displayText, source: 'Guantes BLE' })
  }

  const status = useMemo(() => {
    if (!protocolConfigured) return { status: 'pendiente', label: 'Falta configurar UUID' }
    if (connected === 0) return { status: 'desconectado', label: 'Sin guantes conectados' }
    if (!hasReadings) return { status: 'conectando', label: 'Esperando tramas' }
    if (listening) return { status: 'conectado', label: 'Reconociendo' }
    return { status: 'pendiente', label: 'Listo para reconocer' }
  }, [protocolConfigured, connected, hasReadings, listening])

  return (
    <div>
      <PageHeader
        eyebrow="Traducción"
        title="Traducción de gestos"
        description="Tus guantes leen la postura de las dos manos y KLAPS la convierte en texto y voz en tiempo real."
        actions={<StatusBadge status={status.status} label={status.label} />}
      />

      {!protocolConfigured && (
        <ErrorMessage
          className="mb-5"
          title="Falta configurar los UUID del firmware"
          description="La app necesita el UUID del servicio y de la característica de sensores para leer la trama de 34 bytes. Los configuras en la pantalla de entrenamiento y se guardan en este navegador."
        />
      )}

      {protocolConfigured && signs.length === 0 && (
        <Card tone="butter" padding="md" className="mb-5 flex items-start gap-3">
          <GraduationCap className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
          <div>
            <p className="font-display font-bold text-brand-800">Todavía no hay señas entrenadas</p>
            <p className="mt-1 text-sm text-ink">
              El reconocimiento necesita muestras. Graba cada seña 20 veces con las manos en la
              postura correcta desde el{' '}
              <Link to="/entrenamiento" className="font-semibold text-brand-700 underline underline-offset-2">
                panel de entrenamiento
              </Link>
              .
            </p>
          </div>
        </Card>
      )}

      <Card padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold tracking-[0.14em] text-brand-600 uppercase">
            Texto reconocido
          </p>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft">
            <span
              className={`inline-block size-2.5 rounded-full ${listening ? 'bg-success animate-pulse-soft' : 'bg-brand-200'}`}
              aria-hidden="true"
            />
            {listening ? 'Escuchando a tus guantes…' : 'En espera'}
          </span>
        </div>

        <p
          aria-live="polite"
          className="mt-4 min-h-32 rounded-md bg-brand-50 px-4 py-5 font-display text-2xl leading-snug font-extrabold text-brand-800 sm:min-h-36 sm:px-6 sm:text-3xl"
        >
          {displayText || (
            <span className="font-sans text-base font-normal text-ink-soft sm:text-lg">
              Aquí aparecerán las palabras que reconozcan tus guantes.
            </span>
          )}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-4 text-brand-600" aria-hidden="true" />
            Última seña:{' '}
            <strong className="font-semibold text-ink">{lastMatch?.label ?? '—'}</strong>
            {lastMatch && ` · ${Math.round(lastMatch.confidence * 100)} %`}
          </span>
          <span className="hidden sm:inline">·</span>
          <span>
            {words.length} {words.length === 1 ? 'palabra' : 'palabras'}
          </span>
        </div>

        {/* Señal en vivo: etiqueta, confianza y tiempo estabilizado */}
        <div className="mt-5 rounded-md border border-brand-100 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-semibold text-ink">
              {live ? `Candidata: ${live.label}` : 'Sin seña estable'}
            </span>
            <span className="text-ink-soft">
              Confianza{' '}
              <strong className="font-semibold text-ink">
                {live ? `${Math.round(live.confidence * 100)} %` : '—'}
              </strong>{' '}
              · umbral {Math.round(CONFIDENCE_THRESHOLD * 100)} %
            </span>
          </div>
          <ProgressBar
            className="mt-2"
            value={(live?.progress ?? 0) * 100}
            label="Estabilización"
            valueLabel={`${Math.round((live?.progress ?? 0) * 100)} % de 0,6 s`}
            tone={live?.stable ? 'success' : 'brand'}
            size="sm"
          />
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {listening ? (
            <Button size="lg" variant="secondary" icon={Pause} onClick={() => setListening(false)}>
              Detener
            </Button>
          ) : (
            <Button
              size="lg"
              icon={Play}
              onClick={() => setListening(true)}
              disabled={!hasReadings || signs.length === 0}
            >
              Iniciar detección
            </Button>
          )}

          <Button
            size="lg"
            variant="secondary"
            icon={Volume2}
            onClick={() => (speaking ? stopSpeech() : speak(displayText))}
            disabled={!displayText || !speechSupported}
          >
            {speaking ? 'Detener voz' : 'Reproducir'}
          </Button>

          <Button
            size="lg"
            variant="secondary"
            icon={Wand2}
            onClick={applyCorrection}
            disabled={!text}
          >
            Corregir sintaxis
          </Button>

          <Button size="lg" variant="ghost" icon={Copy} onClick={() => copy(displayText)} disabled={!displayText}>
            {copied ? 'Copiado' : 'Copiar'}
          </Button>

          <Button size="lg" variant="ghost" icon={Save} onClick={saveToHistory} disabled={!displayText}>
            Guardar
          </Button>

          <Button size="lg" variant="ghost" icon={Trash2} onClick={clearText} disabled={!text && !corrected}>
            Limpiar
          </Button>
        </div>

        {corrected && (
          <div className="mt-4 rounded-md bg-mint px-4 py-3">
            <p className="text-sm font-semibold text-brand-800">Frase corregida</p>
            <p className="mt-1 text-sm text-ink">{corrected}</p>
            <p className="mt-2 text-xs text-ink-soft">
              Reglas aplicadas:{' '}
              {correctionNotes.length > 0 ? correctionNotes.join(' · ') : 'nada que corregir'}
            </p>
          </div>
        )}

        {!speechSupported && (
          <p className="mt-3 text-sm text-ink-soft">
            Este navegador no admite la síntesis de voz: el texto seguirá disponible en pantalla.
          </p>
        )}
        {copyError && <ErrorMessage className="mt-4" title="No se pudo copiar" description={copyError} />}
      </Card>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md bg-brand-50 px-4 py-3">
        <p className="text-sm text-ink-soft">
          <strong className="font-semibold text-ink">{signs.length}</strong>{' '}
          {signs.length === 1 ? 'seña entrenada' : 'señas entrenadas'} ·{' '}
          <strong className="font-semibold text-ink">{connected}</strong> de 2 guantes conectados
        </p>
        <Button as={Link} to="/entrenamiento" variant="secondary" size="sm" icon={Bluetooth}>
          Calibrar y entrenar
        </Button>
      </div>

      {/* Emergencia detectada por una seña */}
      {sosSign && (
        <Card tone="danger" padding="md" className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display font-bold text-danger">Seña de emergencia detectada</p>
              <p className="mt-1 text-sm text-ink">
                Se reconoció «{sosSign.label}». La alerta no se envía sola: confírmala en la pantalla
                de emergencia.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSosSign(null)}>
                Ignorar
              </Button>
              <Button as={Link} to="/emergencia" variant="danger" size="sm">
                Abrir emergencia
              </Button>
            </div>
          </div>
        </Card>
      )}

      <section aria-labelledby="sesion-titulo" className="mt-6">
        <SectionTitle
          id="sesion-titulo"
          title="Traducciones de esta sesión"
          description="Puedes guardar cada frase en tu historial."
          action={
            <Button as={Link} to="/historial" variant="ghost" size="sm" iconRight={ArrowRight}>
              Historial
            </Button>
          }
        />

        <div className="mt-3">
          {sessionEntries.length === 0 ? (
            <p className="flex items-center gap-2 rounded-md border border-dashed border-brand-200 bg-white/70 px-4 py-5 text-sm text-ink-soft">
              <History className="size-4 shrink-0" aria-hidden="true" />
              Todavía no has traducido ningún gesto en esta sesión.
            </p>
          ) : (
            <ul className="space-y-2">
              {sessionEntries.map((entry) => (
                <li key={entry.id}>
                  <Card padding="sm" className="flex items-center justify-between gap-3">
                    <p className="min-w-0 text-sm font-semibold text-ink">{entry.text}</p>
                    <span className="shrink-0 text-xs text-ink-soft">
                      {formatRelativeTime(entry.createdAt)}
                    </span>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
