import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createRecognition,
  describeRecognitionError,
  isRecognitionSupported,
} from '../services/speech/recognition.js'

/**
 * Escucha del micrófono y transcripción en vivo.
 *
 * - `transcript` acumula el texto ya confirmado.
 * - `interim` muestra lo que el navegador está procesando ahora.
 * - `error` contiene un mensaje comprensible (nunca solo un código).
 */
export function useSpeechRecognition() {
  const supported = isRecognitionSupported()
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)
  const manualStop = useRef(false)

  const stop = useCallback(() => {
    manualStop.current = true
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setInterim('')
    setError('')
  }, [])

  const start = useCallback(() => {
    if (!supported) {
      setError('Este navegador no admite el reconocimiento de voz.')
      return
    }
    setError('')
    setInterim('')
    manualStop.current = false

    const recognition = createRecognition()
    if (!recognition) return
    recognitionRef.current = recognition

    recognition.onstart = () => setListening(true)

    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) finalText += result[0].transcript
        else interimText += result[0].transcript
      }
      if (finalText) {
        setTranscript((prev) => `${prev}${prev ? ' ' : ''}${finalText.trim()}`)
      }
      setInterim(interimText)
    }

    recognition.onerror = (event) => {
      if (event.error === 'aborted' && manualStop.current) return
      setError(describeRecognitionError(event.error))
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
      setInterim('')
    }

    try {
      recognition.start()
    } catch {
      setError('No se pudo iniciar el micrófono. Espera un momento y vuelve a intentarlo.')
      setListening(false)
    }
  }, [supported])

  useEffect(() => () => recognitionRef.current?.abort(), [])

  return { supported, listening, transcript, interim, error, start, stop, reset, setTranscript }
}
