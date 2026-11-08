import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Copy, Mic, Save, Square, Trash2, Volume2 } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import ErrorMessage from '../../components/common/ErrorMessage'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition.js'
import { useAppSpeech } from '../../hooks/useAppSpeech.js'
import { useClipboard } from '../../hooks/useClipboard.js'
import { useHistory } from '../../context/historyContext.js'

export default function Voice() {
  const { supported, listening, transcript, interim, error, start, stop, reset, setTranscript } =
    useSpeechRecognition()
  const { supported: speechSupported, speak, speaking, stop: stopSpeech } = useAppSpeech()
  const { copied, copy, error: copyError } = useClipboard()
  const { addEntry } = useHistory()

  const [saved, setSaved] = useState(false)

  const fullText = [transcript, interim].filter(Boolean).join(' ').trim()

  const handleSave = () => {
    if (!transcript.trim()) return
    addEntry({ type: 'voz', text: transcript.trim(), source: 'Micrófono' })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Comunicación"
        title="Comunicación por voz"
        description="Habla y KLAPS escribirá lo que dices para que la otra persona pueda leerlo."
      />

      {!supported ? (
        <ErrorMessage
          title="Este navegador no admite el reconocimiento de voz"
          description="La Web Speech API solo está disponible en algunos navegadores (Chrome y Edge en escritorio, Chrome en Android). Puedes seguir comunicándote con las frases rápidas o con la traducción de gestos."
        />
      ) : (
        <Card padding="lg" className="text-center">
          <div className="flex flex-col items-center">
            <button
              type="button"
              aria-pressed={listening}
              onClick={() => (listening ? stop() : start())}
              className={`relative flex size-28 items-center justify-center rounded-full text-white shadow-lift transition-colors ${
                listening ? 'bg-danger' : 'bg-brand-600 hover:bg-brand-700'
              }`}
            >
              {listening && (
                <span
                  className="absolute inset-0 animate-pulse-soft rounded-full bg-danger/30"
                  aria-hidden="true"
                />
              )}
              {listening ? (
                <Square className="size-9" aria-hidden="true" />
              ) : (
                <Mic className="size-10" aria-hidden="true" />
              )}
              <span className="sr-only">{listening ? 'Detener micrófono' : 'Activar micrófono'}</span>
            </button>

            <p className="mt-4 font-display text-lg font-extrabold text-brand-800">
              {listening ? 'Escuchando…' : 'Micrófono detenido'}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {listening
                ? 'Habla con claridad. Puedes detener la escucha cuando quieras.'
                : 'Pulsa el micrófono para empezar. El navegador pedirá permiso la primera vez.'}
            </p>
          </div>

          <div className="mt-6 rounded-md bg-brand-50 px-4 py-5 text-left">
            <p className="text-xs font-semibold tracking-[0.14em] text-brand-600 uppercase">
              Texto reconocido
            </p>
            <p
              aria-live="polite"
              className="mt-2 min-h-20 font-display text-xl leading-snug font-bold text-brand-800 sm:text-2xl"
            >
              {transcript || (
                <span className="font-sans text-base font-normal text-ink-soft">
                  Lo que digas aparecerá aquí.
                </span>
              )}
              {interim && <span className="text-ink-soft"> {interim}</span>}
            </p>
          </div>

          {error && <ErrorMessage className="mt-4" title="No se pudo escuchar" description={error} />}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button icon={Save} onClick={handleSave} disabled={!transcript.trim()}>
              Guardar en el historial
            </Button>
            <Button
              variant="secondary"
              icon={Volume2}
              onClick={() => (speaking ? stopSpeech() : speak(transcript))}
              disabled={!transcript || !speechSupported}
            >
              {speaking ? 'Detener voz' : 'Reproducir'}
            </Button>
            <Button variant="ghost" icon={Copy} onClick={() => copy(fullText)} disabled={!fullText}>
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            <Button
              variant="ghost"
              icon={Trash2}
              onClick={() => {
                reset()
                setTranscript('')
              }}
              disabled={!fullText}
            >
              Limpiar
            </Button>
          </div>

          <p aria-live="polite" className="mt-3 min-h-5 text-sm font-semibold text-success">
            {saved ? 'Guardado en el historial.' : ''}
          </p>
          {copyError && <ErrorMessage className="mt-2" title="No se pudo copiar" description={copyError} />}
        </Card>
      )}

      <Card className="mt-5 flex flex-wrap items-center justify-between gap-3" padding="md">
        <p className="max-w-prose text-sm text-ink-soft">
          El reconocimiento usa el servicio de voz del navegador: en algunos casos envía el audio a
          un servidor externo. KLAPS no almacena el audio, solo el texto que decidas guardar.
        </p>
        <Button as={Link} to="/historial" variant="ghost" size="sm" iconRight={ArrowRight}>
          Ver historial
        </Button>
      </Card>
    </div>
  )
}
