import { Link } from 'react-router-dom'
import { Accessibility, ArrowRight, Play, RotateCcw, Volume2 } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Toggle from '../../components/common/Toggle'
import SegmentedControl from '../../components/common/SegmentedControl'
import ErrorMessage from '../../components/common/ErrorMessage'
import Logo from '../../components/brand/Logo'
import { useAccessibility } from '../../context/accessibilityContext.js'
import { FONT_SIZES, HAND_OPTIONS, MOTION_OPTIONS } from '../../context/accessibilityOptions.js'
import { useDevices } from '../../context/deviceContext.js'
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis.js'

function RangeField({ id, label, value, min, max, step, onChange, hint }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="font-display font-bold text-brand-800">
          {label}
        </label>
        <output htmlFor={id} className="text-sm font-semibold text-ink">
          {value.toFixed(1)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-3 w-full cursor-pointer accent-brand-600"
      />
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  )
}

export default function Settings() {
  const { preferences, updatePreference, resetPreferences } = useAccessibility()
  const { mode } = useDevices()
  const { supported, voices, speak, stop, speaking } = useSpeechSynthesis()

  const testVoice = () => {
    if (speaking) {
      stop()
      return
    }
    speak('Hola. Soy KLAPS. Así se escuchará tu mensaje.', {
      rate: preferences.speechRate,
      pitch: preferences.speechPitch,
      voiceURI: preferences.speechVoice,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuración"
        title="Ajustes"
        description="Adapta KLAPS a tus necesidades. Los cambios se guardan en este dispositivo."
        actions={
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetPreferences}>
            Restablecer
          </Button>
        }
      />

      <Card as="section" aria-labelledby="ajustes-accesibilidad" padding="lg">
        <h2 id="ajustes-accesibilidad" className="flex items-center gap-2 font-display text-lg font-extrabold text-brand-800">
          <Accessibility className="size-5 text-brand-600" aria-hidden="true" />
          Accesibilidad
        </h2>
        <div className="mt-5 space-y-6">
          <SegmentedControl
            label="Tamaño del texto"
            description="Escala toda la aplicación, incluidos botones y etiquetas."
            options={FONT_SIZES}
            value={preferences.fontSize}
            onChange={(value) => updatePreference('fontSize', value)}
          />

          <Toggle
            label="Alto contraste"
            description="Aumenta el contraste de textos, bordes y foco; oculta adornos."
            checked={preferences.contrast === 'alto'}
            onChange={(checked) => updatePreference('contrast', checked ? 'alto' : 'normal')}
          />

          <SegmentedControl
            label="Movimiento"
            description="Reduce animaciones si te generan molestias."
            options={MOTION_OPTIONS}
            value={preferences.motion}
            onChange={(value) => updatePreference('motion', value)}
          />

          <SegmentedControl
            label="Mano dominante"
            description="Determina qué guante guía la traducción."
            options={HAND_OPTIONS}
            value={preferences.dominantHand}
            onChange={(value) => updatePreference('dominantHand', value)}
          />
        </div>
      </Card>

      <Card as="section" aria-labelledby="ajustes-voz" padding="lg">
        <h2 id="ajustes-voz" className="flex items-center gap-2 font-display text-lg font-extrabold text-brand-800">
          <Volume2 className="size-5 text-brand-600" aria-hidden="true" />
          Voz
        </h2>

        {!supported ? (
          <ErrorMessage
            className="mt-4"
            title="Este navegador no admite síntesis de voz"
            description="Los mensajes seguirán apareciendo en pantalla. Para escucharlos, prueba con Chrome, Edge o Safari actualizados."
          />
        ) : (
          <div className="mt-5 space-y-6">
            <RangeField
              id="voz-velocidad"
              label="Velocidad de la voz"
              value={preferences.speechRate}
              min={0.5}
              max={1.8}
              step={0.1}
              onChange={(value) => updatePreference('speechRate', value)}
              hint="1,0 es la velocidad normal."
            />

            <RangeField
              id="voz-tono"
              label="Tono de la voz"
              value={preferences.speechPitch}
              min={0.6}
              max={1.6}
              step={0.1}
              onChange={(value) => updatePreference('speechPitch', value)}
            />

            <div>
              <label htmlFor="voz-seleccion" className="font-display font-bold text-brand-800">
                Voz del sistema
              </label>
              <select
                id="voz-seleccion"
                value={preferences.speechVoice}
                onChange={(event) => updatePreference('speechVoice', event.target.value)}
                className="mt-2 min-h-12 w-full rounded-md border border-brand-200 bg-white px-3 text-ink"
              >
                <option value="">Voz predeterminada</option>
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-ink-soft">
                {voices.length === 0
                  ? 'El sistema no ha informado voces en español todavía.'
                  : `${voices.length} voces en español disponibles.`}
              </p>
            </div>

            <Button variant="secondary" icon={Play} onClick={testVoice}>
              {speaking ? 'Detener prueba' : 'Probar la voz'}
            </Button>
          </div>
        )}
      </Card>

      <Card as="section" aria-labelledby="ajustes-dispositivos" padding="lg">
        <h2 id="ajustes-dispositivos" className="font-display text-lg font-extrabold text-brand-800">
          Dispositivos
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Modo actual: <strong className="font-semibold text-ink">{mode}</strong>. Los guantes aún no
          se conectan por Bluetooth; puedes revisar su estado simulado en la pantalla de guantes.
        </p>
        <Button as={Link} to="/dispositivos" variant="secondary" size="sm" className="mt-4" iconRight={ArrowRight}>
          Ver guantes
        </Button>
      </Card>

      <Card as="section" aria-labelledby="ajustes-acerca" tone="lilac" padding="lg">
        <h2 id="ajustes-acerca" className="font-display text-lg font-extrabold text-brand-800">
          Acerca de KLAPS
        </h2>
        <div className="mt-4">
          <Logo size={44} />
        </div>
        <p className="mt-4 max-w-prose text-sm text-ink">
          KLAPS facilita la comunicación entre personas con dificultades de audición, habla o
          movilidad y quienes no conocen la lengua de señas, combinando guantes inteligentes,
          reconocimiento de gestos, voz, texto e inteligencia artificial.
        </p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2 rounded-md bg-white/70 px-3 py-2 sm:block">
            <dt className="text-ink-soft">Versión</dt>
            <dd className="font-semibold text-ink">0.1 · Etapa 3</dd>
          </div>
          <div className="flex justify-between gap-2 rounded-md bg-white/70 px-3 py-2 sm:block">
            <dt className="text-ink-soft">Estado de los guantes</dt>
            <dd className="font-semibold text-ink">Modo demostración</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
