import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Síntesis de voz (Web Speech API).
 * Detecta soporte, carga las voces del sistema y expone hablar / detener.
 * Si el navegador no soporta la API, `supported` es false y la interfaz
 * debe mostrar un aviso (nunca un botón que no hace nada).
 */
export function useSpeechSynthesis() {
  const supported =
    typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'

  const [voices, setVoices] = useState([])
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    if (!supported) return undefined
    const synth = window.speechSynthesis

    const loadVoices = () => setVoices(synth && synth.getVoices() ? synth.getVoices() : [])
    loadVoices()
    synth.addEventListener('voiceschanged', loadVoices)

    return () => {
      synth.removeEventListener('voiceschanged', loadVoices)
      synth.cancel()
    }
  }, [supported])

  const speak = useCallback(
    (text, { rate = 1, pitch = 1, voiceURI = '' } = {}) => {
      if (!supported || !text) return false
      const synth = window.speechSynthesis
      synth.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'es-ES'
      utterance.rate = rate
      utterance.pitch = pitch

      const voice = voices.find((item) => item.voiceURI === voiceURI)
      if (voice) utterance.voice = voice

      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)

      synth.speak(utterance)
      return true
    },
    [supported, voices],
  )

  const stop = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  const spanishVoices = useMemo(
    () => voices.filter((voice) => voice.lang?.toLowerCase().startsWith('es')),
    [voices],
  )

  return { supported, voices: spanishVoices, allVoices: voices, speaking, speak, stop }
}
