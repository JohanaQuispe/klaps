import { useCallback, useEffect, useMemo, useState } from 'react'
import { HistoryContext } from './historyContext.js'

/**
 * Historial de la sesión, persistido en el dispositivo.
 *
 * Cada entrada guarda de dónde viene el mensaje para poder mostrarlo con
 * su icono y su etiqueta: gesto (guantes), voz o frase rápida.
 * Las frases favoritas se guardan aparte, por identificador.
 */
const STORAGE_KEY = 'klaps.history.v1'
const MAX_ENTRIES = 60

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function readStored() {
  if (typeof window === 'undefined') return { entries: [], favoritePhrases: [] }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { entries: [], favoritePhrases: [] }
    const parsed = JSON.parse(raw)
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      favoritePhrases: Array.isArray(parsed.favoritePhrases) ? parsed.favoritePhrases : [],
    }
  } catch {
    return { entries: [], favoritePhrases: [] }
  }
}

export default function HistoryProvider({ children }) {
  const [state, setState] = useState(readStored)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Sin persistencia: el historial vive solo en memoria
    }
  }, [state])

  const addEntry = useCallback(({ type, text, source }) => {
    const clean = (text ?? '').trim()
    if (!clean) return null
    const entry = { id: createId(), type, text: clean, source: source ?? null, createdAt: Date.now(), favorite: false }
    setState((prev) => ({ ...prev, entries: [entry, ...prev.entries].slice(0, MAX_ENTRIES) }))
    return entry
  }, [])

  const removeEntry = useCallback((id) => {
    setState((prev) => ({ ...prev, entries: prev.entries.filter((entry) => entry.id !== id) }))
  }, [])

  const clearHistory = useCallback(() => {
    setState((prev) => ({ ...prev, entries: [] }))
  }, [])

  const toggleEntryFavorite = useCallback((id) => {
    setState((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) =>
        entry.id === id ? { ...entry, favorite: !entry.favorite } : entry,
      ),
    }))
  }, [])

  const togglePhraseFavorite = useCallback((phraseId) => {
    setState((prev) => ({
      ...prev,
      favoritePhrases: prev.favoritePhrases.includes(phraseId)
        ? prev.favoritePhrases.filter((id) => id !== phraseId)
        : [...prev.favoritePhrases, phraseId],
    }))
  }, [])

  const value = useMemo(() => {
    const favoriteSet = new Set(state.favoritePhrases)
    return {
      entries: state.entries,
      favoritePhrases: state.favoritePhrases,
      isPhraseFavorite: (phraseId) => favoriteSet.has(phraseId),
      togglePhraseFavorite,
      addEntry,
      removeEntry,
      clearHistory,
      toggleEntryFavorite,
    }
  }, [state, addEntry, removeEntry, clearHistory, toggleEntryFavorite, togglePhraseFavorite])

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
}
