import { useCallback } from 'react'
import { useAccessibility } from '../context/accessibilityContext.js'
import { useSpeechSynthesis } from './useSpeechSynthesis.js'

/**
 * Síntesis de voz con las preferencias del usuario (velocidad, tono y voz).
 * Se usa en Frases, Historias, Traducción y Voz.
 */
export function useAppSpeech() {
  const { preferences } = useAccessibility()
  const synthesis = useSpeechSynthesis()

  const speak = useCallback(
    (text) =>
      synthesis.speak(text, {
        rate: preferences.speechRate,
        pitch: preferences.speechPitch,
        voiceURI: preferences.speechVoice,
      }),
    [synthesis, preferences.speechRate, preferences.speechPitch, preferences.speechVoice],
  )

  return { ...synthesis, speak }
}
