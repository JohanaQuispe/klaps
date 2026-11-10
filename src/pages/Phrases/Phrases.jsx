import { useMemo, useState } from 'react'
import { Copy, Search, Star, Volume2 } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import EmptyState from '../../components/common/EmptyState'
import { CATEGORIES, CATEGORY_BY_ID, PHRASES } from '../../data/phrases.js'
import { useHistory } from '../../context/historyContext.js'
import { useAppSpeech } from '../../hooks/useAppSpeech.js'
import { useClipboard } from '../../hooks/useClipboard.js'
import { cn } from '../../utils/cn'

export default function Phrases() {
  const [category, setCategory] = useState('todas')
  const [query, setQuery] = useState('')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [display, setDisplay] = useState(null)

  const { isPhraseFavorite, togglePhraseFavorite, favoritePhrases, addEntry } = useHistory()
  const { supported: speechSupported, speak, speaking, stop } = useAppSpeech()
  const { copied, copy, error: copyError } = useClipboard()

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()
    return PHRASES.filter((phrase) => {
      if (category !== 'todas' && phrase.category !== category) return false
      if (onlyFavorites && !isPhraseFavorite(phrase.id)) return false
      if (search && !phrase.text.toLowerCase().includes(search)) return false
      return true
    })
  }, [category, query, onlyFavorites, isPhraseFavorite])

  const say = (phrase) => {
    addEntry({ type: 'frase', text: phrase.text, source: CATEGORY_BY_ID[phrase.category]?.label })
    speak(phrase.text)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Frases rápidas"
        title="Frases rápidas"
        description="Frases listas para mostrar, escuchar y guardar. Organizadas por situación."
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={Star}
            aria-pressed={onlyFavorites}
            onClick={() => setOnlyFavorites((value) => !value)}
          >
            Favoritas ({favoritePhrases.length})
          </Button>
        }
      />

      {/* Buscador */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-soft"
          aria-hidden="true"
        />
        <label htmlFor="buscar-frase" className="sr-only">
          Buscar una frase
        </label>
        <input
          id="buscar-frase"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar: médico, baño, precio…"
          className="min-h-12 w-full rounded-full border border-brand-200 bg-white pr-4 pl-12 text-ink placeholder:text-ink-soft/70"
        />
      </div>

      {/* Categorías */}
      <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
        <button
          type="button"
          aria-pressed={category === 'todas'}
          onClick={() => setCategory('todas')}
          className={cn(
            'min-h-11 shrink-0 rounded-full border px-4 font-display text-sm font-bold transition-colors',
            category === 'todas'
              ? 'border-brand-600 bg-brand-600 text-white'
              : 'border-brand-200 bg-white text-brand-700 hover:bg-brand-50',
          )}
        >
          Todas
        </button>

        {CATEGORIES.map((item) => {
          const active = category === item.id
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(item.id)}
              className={cn(
                'flex min-h-11 shrink-0 items-center gap-2 rounded-full border pr-4 pl-1.5 font-display text-sm font-bold transition-colors',
                active
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-brand-200 bg-white text-brand-700 hover:bg-brand-50',
              )}
            >
              <img src={item.icon} alt="" aria-hidden="true" className="size-8 rounded-sm" />
              {item.label}
            </button>
          )
        })}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <EmptyState
          className="mt-5"
          icon={Search}
          title="No encontramos frases"
          description="Prueba con otra palabra o cambia de categoría."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setQuery('')
                setCategory('todas')
                setOnlyFavorites(false)
              }}
            >
              Ver todas
            </Button>
          }
        />
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {filtered.map((phrase) => {
            const favorite = isPhraseFavorite(phrase.id)
            return (
              <li key={phrase.id}>
                <Card padding="md" className="flex h-full flex-col justify-between gap-3">
                  <div>
                    <p className="font-display text-base leading-snug font-bold text-brand-800">
                      {phrase.text}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {CATEGORY_BY_ID[phrase.category]?.label}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button size="sm" variant="soft" onClick={() => setDisplay(phrase)}>
                      Mostrar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Volume2}
                      aria-label={`Escuchar: ${phrase.text}`}
                      onClick={() => say(phrase)}
                      disabled={!speechSupported}
                    >
                      Escuchar
                    </Button>
                    <button
                      type="button"
                      aria-pressed={favorite}
                      aria-label={
                        favorite ? `Quitar de favoritas: ${phrase.text}` : `Guardar en favoritas: ${phrase.text}`
                      }
                      onClick={() => togglePhraseFavorite(phrase.id)}
                      className={cn(
                        'ml-auto flex size-10 items-center justify-center rounded-full transition-colors',
                        favorite
                          ? 'bg-butter text-brand-800'
                          : 'text-ink-soft hover:bg-brand-50 hover:text-brand-700',
                      )}
                    >
                      <Star
                        className={cn('size-5', favorite && 'fill-current')}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {!speechSupported && (
        <p className="mt-4 text-sm text-ink-soft">
          Este navegador no admite síntesis de voz: las frases se pueden mostrar y copiar.
        </p>
      )}

      {/* Frase en grande */}
      <Modal
        open={Boolean(display)}
        onClose={() => setDisplay(null)}
        title="Frase para mostrar"
        description={display ? CATEGORY_BY_ID[display.category]?.label : undefined}
        footer={
          <>
            <Button
              variant="secondary"
              icon={Copy}
              onClick={() => copy(display?.text ?? '')}
              className="sm:mr-auto"
            >
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            <Button
              icon={Volume2}
              onClick={() => (speaking ? stop() : speak(display?.text ?? ''))}
              disabled={!speechSupported}
            >
              {speaking ? 'Detener' : 'Escuchar'}
            </Button>
          </>
        }
      >
        <p className="rounded-md bg-brand-50 px-4 py-8 text-center font-display text-3xl leading-tight font-extrabold text-brand-800 sm:text-4xl">
          {display?.text}
        </p>
        {copyError && (
          <p className="mt-3 text-sm text-danger" role="alert">
            {copyError}
          </p>
        )}
      </Modal>
    </div>
  )
}
