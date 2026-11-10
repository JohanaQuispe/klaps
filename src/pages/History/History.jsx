import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Copy,
  MessageSquareQuote,
  Mic,
  Sparkles,
  Star,
  Trash2,
  Volume2,
} from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import EmptyState from '../../components/common/EmptyState'
import { useHistory } from '../../context/historyContext.js'
import { useAppSpeech } from '../../hooks/useAppSpeech.js'
import { useClipboard } from '../../hooks/useClipboard.js'
import { formatRelativeTime } from '../../utils/format.js'
import { cn } from '../../utils/cn'

const TYPES = {
  gesto: { label: 'Gesto traducido', icon: Sparkles, classes: 'bg-brand-100 text-brand-700' },
  voz: { label: 'Mensaje de voz', icon: Mic, classes: 'bg-sky text-brand-800' },
  frase: { label: 'Frase rápida', icon: MessageSquareQuote, classes: 'bg-butter text-brand-800' },
}

const FILTERS = [
  { value: 'todas', label: 'Todas' },
  { value: 'gesto', label: 'Gestos' },
  { value: 'voz', label: 'Voz' },
  { value: 'frase', label: 'Frases' },
  { value: 'favoritas', label: 'Favoritas' },
]

export default function History() {
  const { entries, removeEntry, clearHistory, toggleEntryFavorite } = useHistory()
  const { supported: speechSupported, speak, speaking, stop } = useAppSpeech()
  const { copied, copy, error: copyError } = useClipboard()

  const [filter, setFilter] = useState('todas')
  const [confirmClear, setConfirmClear] = useState(false)

  const visible = entries.filter((entry) => {
    if (filter === 'todas') return true
    if (filter === 'favoritas') return entry.favorite
    return entry.type === filter
  })

  const handleSpeak = (text) => {
    if (speaking) stop()
    else speak(text)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Historial"
        title="Historial"
        description="Todo lo que has comunicado en este dispositivo. Puedes escucharlo, copiarlo o eliminarlo."
        actions={
          entries.length > 0 ? (
            <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setConfirmClear(true)}>
              Vaciar
            </Button>
          ) : null
        }
      />

      {/* Filtros */}
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={cn(
              'min-h-11 shrink-0 rounded-full border px-4 font-display text-sm font-bold transition-colors',
              filter === option.value
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-brand-200 bg-white text-brand-700 hover:bg-brand-50',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            image="/illustrations/mascota-feliz.webp"
            imageAlt="Mascota de KLAPS celebrando"
            title={entries.length === 0 ? 'Todavía no hay actividad' : 'Sin resultados en este filtro'}
            description={
              entries.length === 0
                ? 'Cuando traduzcas un gesto, dictes un mensaje o uses una frase rápida, aparecerá aquí.'
                : 'Cambia de filtro para ver el resto de mensajes.'
            }
            action={
              entries.length === 0 ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button as={Link} to="/traducir" size="sm" icon={Sparkles}>
                    Traducir gestos
                  </Button>
                  <Button as={Link} to="/frases" size="sm" variant="secondary">
                    Ver frases
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setFilter('todas')}>
                  Ver todas
                </Button>
              )
            }
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {visible.map((entry) => {
            const type = TYPES[entry.type] ?? TYPES.frase
            const Icon = type.icon
            return (
              <li key={entry.id}>
                <Card padding="md" className="flex items-start gap-3">
                  <span
                    className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', type.classes)}
                    aria-hidden="true"
                  >
                    <Icon className="size-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed font-semibold text-ink">{entry.text}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {type.label}
                      {entry.source ? ` · ${entry.source}` : ''} · {formatRelativeTime(entry.createdAt)}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Volume2}
                        onClick={() => handleSpeak(entry.text)}
                        disabled={!speechSupported}
                        aria-label={`Escuchar: ${entry.text}`}
                      >
                        {speaking ? 'Detener' : 'Escuchar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Copy}
                        onClick={() => copy(entry.text)}
                        aria-label={`Copiar: ${entry.text}`}
                      >
                        {copied ? 'Copiado' : 'Copiar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Star}
                        aria-pressed={entry.favorite}
                        onClick={() => toggleEntryFavorite(entry.id)}
                        aria-label={entry.favorite ? 'Quitar de favoritas' : 'Marcar como favorita'}
                        className={entry.favorite ? 'text-warning' : undefined}
                      >
                        Favorita
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        onClick={() => removeEntry(entry.id)}
                        aria-label={`Eliminar: ${entry.text}`}
                        className="ml-auto text-danger hover:bg-danger-soft"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {copyError && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {copyError}
        </p>
      )}

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="¿Vaciar el historial?"
        description="Se eliminarán todos los mensajes guardados en este dispositivo. Las frases favoritas se mantienen."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmClear(false)} className="sm:mr-auto">
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                clearHistory()
                setConfirmClear(false)
              }}
            >
              Vaciar historial
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          Esta acción no se puede deshacer. Si quieres conservar un mensaje, márcalo como favorito
          antes de continuar.
        </p>
      </Modal>
    </div>
  )
}
