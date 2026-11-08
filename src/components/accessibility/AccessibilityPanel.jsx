import { Link } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Toggle from '../common/Toggle'
import SegmentedControl from '../common/SegmentedControl'
import { useAccessibility } from '../../context/accessibilityContext.js'
import { FONT_SIZES, HAND_OPTIONS, MOTION_OPTIONS } from '../../context/accessibilityOptions.js'

/**
 * Panel rápido de accesibilidad.
 * Cambios inmediatos y visibles; se guardan automáticamente.
 */
export default function AccessibilityPanel({ open, onClose }) {
  const { preferences, updatePreference, resetPreferences } = useAccessibility()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Accesibilidad"
      description="Ajusta KLAPS a tu forma de ver y de usar la pantalla. Los cambios se guardan solos."
      footer={
        <>
          <Button
            variant="ghost"
            icon={RotateCcw}
            onClick={resetPreferences}
            className="sm:mr-auto"
          >
            Restablecer
          </Button>
          <Button onClick={onClose}>Listo</Button>
        </>
      }
    >
      <div className="space-y-6">
        <SegmentedControl
          label="Tamaño del texto"
          description="Afecta a toda la aplicación, no solo a esta ventana."
          options={FONT_SIZES}
          value={preferences.fontSize}
          onChange={(value) => updatePreference('fontSize', value)}
        />

        <Toggle
          label="Alto contraste"
          description="Refuerza textos, bordes y foco. Oculta los adornos decorativos."
          checked={preferences.contrast === 'alto'}
          onChange={(checked) => updatePreference('contrast', checked ? 'alto' : 'normal')}
        />

        <SegmentedControl
          label="Movimiento"
          description="Reduce animaciones si te resultan molestas."
          options={MOTION_OPTIONS}
          value={preferences.motion}
          onChange={(value) => updatePreference('motion', value)}
        />

        <SegmentedControl
          label="Mano dominante"
          description="Define qué guante guía la traducción de gestos."
          options={HAND_OPTIONS}
          value={preferences.dominantHand}
          onChange={(value) => updatePreference('dominantHand', value)}
        />

        <p className="text-sm text-ink-soft">
          ¿Necesitas voz, tamaño de letra por bloques o contrastes personalizados?{' '}
          <Link
            to="/ajustes"
            onClick={onClose}
            className="font-semibold text-brand-700 underline underline-offset-2"
          >
            Abrir todos los ajustes
          </Link>
        </p>
      </div>
    </Modal>
  )
}
