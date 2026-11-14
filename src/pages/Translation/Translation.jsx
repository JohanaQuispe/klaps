import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Copy,
  FlaskConical,
  History,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  Volume2,
} from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import StatusBadge from '../../components/common/StatusBadge'
import ErrorMessage from '../../components/common/ErrorMessage'
import SectionTitle from '../../components/common/SectionTitle'
import { useHistory } from '../../context/historyContext.js'
import { useAppSpeech } from '../../hooks/useAppSpeech.js'
import { useClipboard } from '../../hooks/useClipboard.js'
import { GESTURE_LATENCY_MS, pickSequence } from '../../services/gesture/demoGestures.js'
import { formatRelativeTime } from '../../utils/format.js'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default function Translation() {
  const { entries, addEntry } = useHistory()
  const { supported: speechSupported, speak, speaking, stop: stopSpeech } = useAppSpeech()
  const { copied, error: copyError, copy } = useClipboard()

  const [words, setWords] = useState([])
  const [detecting, setDetecting] = useState(false)
  const [lastGesture, setLastGesture] = useState('')
  const runId = useRef(0)
  const lastSequence = useRef(null)

  const text = words.join(' ')
  const sessionEntries = entries.filter((entry) => entry.type === 'gesto').slice(0, 5)

  const runDemo = async (sequence) => {
    const id = ++runId.current
    const current = sequence ?? pickSequence()
    lastSequence.current = current

    setDetecting(true)
    setWords([])
    setLastGesture('')

    const collected = []
    for (const word of current.words) {
      await wait(GESTURE_LATENCY_MS)
      if (runId.current !== id) return
      collected.push(word)
      setWords([...collected])
      setLastGesture(word)
    }

    setDetecting(false)
    addEntry({ type: 'gesto', text: collected.join(' '), source: 'Secuencia de prueba' })
  }

  const stopDemo = () => {
    runId.current += 1
    setDetecting(false)
  }

  const clearText = () => {
    stopDemo()
    setWords([])
    setLastGesture('')
  }

  return (
    <div>
      <PageHeader
        eyebrow="Traducción"
        title="Traducción de gestos"
        description="Tus guantes leen el movimiento de las manos y KLAPS lo convierte en texto y voz."
        actions={<StatusBadge status="pendiente" label="Sin lectura del guante" />}
      />

      <Card tone="butter" padding="md" className="mb-5 flex items-start gap-3">
        <FlaskConical className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
        <div>
          <p className="font-display font-bold text-brand-800">Secuencia de prueba</p>
          <p className="mt-1 text-sm text-ink">
            La lectura de los sensores flex y del MPU6050 todavía no está activada. El texto que
            aparece proviene de una <strong>secuencia de prueba</strong> con el mismo ritmo que
            tendrá la lectura real; no es un gesto detectado por tus guantes.
          </p>
        </div>
      </Card>

      {/* Escenario de traducción */}
      <Card padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold tracking-[0.14em] text-brand-600 uppercase">
            Texto reconocido
          </p>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft">
            <span
              className={`inline-block size-2.5 rounded-full ${detecting ? 'bg-success animate-pulse-soft' : 'bg-brand-200'}`}
              aria-hidden="true"
            />
            {detecting ? 'Detectando gestos…' : 'En espera'}
          </span>
        </div>

        <p
          aria-live="polite"
          className="mt-4 min-h-32 rounded-md bg-brand-50 px-4 py-5 font-display text-2xl leading-snug font-extrabold text-brand-800 sm:min-h-36 sm:px-6 sm:text-3xl"
        >
          {text || (
            <span className="font-sans text-base font-normal text-ink-soft sm:text-lg">
              Aquí aparecerá lo que digan tus guantes. Pulsa «Iniciar detección» para probarlo.
            </span>
          )}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-4 text-brand-600" aria-hidden="true" />
            Último gesto: <strong className="font-semibold text-ink">{lastGesture || '—'}</strong>
          </span>
          <span className="hidden sm:inline">·</span>
          <span>{words.length} {words.length === 1 ? 'palabra' : 'palabras'}</span>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {detecting ? (
            <Button size="lg" variant="secondary" icon={Pause} onClick={stopDemo}>
              Detener
            </Button>
          ) : (
            <Button size="lg" icon={Play} onClick={() => runDemo()}>
              Iniciar detección
            </Button>
          )}

          <Button
            size="lg"
            variant="secondary"
            icon={RotateCcw}
            onClick={() => runDemo(lastSequence.current ?? undefined)}
            disabled={detecting}
          >
            Repetir
          </Button>

          <Button
            size="lg"
            variant="secondary"
            icon={Volume2}
            onClick={() => (speaking ? stopSpeech() : speak(text))}
            disabled={!text || !speechSupported}
          >
            {speaking ? 'Detener voz' : 'Reproducir'}
          </Button>

          <Button
            size="lg"
            variant="ghost"
            icon={Copy}
            onClick={() => copy(text)}
            disabled={!text}
          >
            {copied ? 'Copiado' : 'Copiar'}
          </Button>

          <Button size="lg" variant="ghost" icon={Trash2} onClick={clearText} disabled={!text}>
            Limpiar
          </Button>
        </div>

        {!speechSupported && (
          <p className="mt-3 text-sm text-ink-soft">
            Este navegador no admite la síntesis de voz: el texto seguirá disponible en pantalla.
          </p>
        )}
        {copyError && <ErrorMessage className="mt-4" title="No se pudo copiar" description={copyError} />}
      </Card>

      {/* Traducciones de la sesión */}
      <section aria-labelledby="sesion-titulo" className="mt-6">
        <SectionTitle
          id="sesion-titulo"
          title="Traducciones de esta sesión"
          description="Se guardan automáticamente en tu historial."
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
