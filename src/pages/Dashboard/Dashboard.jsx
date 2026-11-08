import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bookmark,
  History,
  MessageSquareQuote,
  Mic,
  Siren,
  Sparkles,
} from 'lucide-react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import EmptyState from '../../components/common/EmptyState'
import StatusBadge from '../../components/common/StatusBadge'
import SectionTitle from '../../components/common/SectionTitle'
import Mascot from '../../components/brand/Mascot'
import DecorativeRings from '../../components/brand/DecorativeRings'
import { DeviceRow } from '../../components/devices/DeviceCard'
import { useDevices } from '../../context/deviceContext.js'
import { formatLongDate } from '../../utils/format.js'

const QUICK_ACTIONS = [
  {
    to: '/traducir',
    label: 'Traducir gestos',
    description: 'Convierte tus gestos en texto y voz.',
    icon: Sparkles,
    iconClasses: 'bg-brand-100 text-brand-700',
  },
  {
    to: '/voz',
    label: 'Hablar por voz',
    description: 'Tu voz se escribe en pantalla.',
    icon: Mic,
    iconClasses: 'bg-sky text-brand-800',
  },
  {
    to: '/frases',
    label: 'Frases rápidas',
    description: 'Di lo necesario en un toque.',
    icon: MessageSquareQuote,
    iconClasses: 'bg-butter text-brand-800',
  },
  {
    to: '/emergencia',
    label: 'Emergencia',
    description: 'SOS con confirmación previa.',
    icon: Siren,
    iconClasses: 'bg-danger-soft text-danger',
  },
]

export default function Dashboard() {
  const { gloves, mode } = useDevices()
  const connected = gloves.filter((glove) => glove.status === 'conectado').length

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Saludo */}
      <Card tone="lilac" padding="lg" className="relative overflow-hidden">
        <DecorativeRings className="-top-24 -right-20 size-72" opacity={0.7} />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-600">{formatLongDate()}</p>
            <h1 className="mt-1.5 font-display text-[1.6rem] leading-tight font-extrabold text-brand-800 sm:text-3xl">
              Hola, ¿qué necesitas comunicar hoy?
            </h1>
            <p className="mt-2 max-w-prose text-sm text-ink-soft sm:text-base">
              Tienes {connected} de {gloves.length} guantes conectados.
              {mode === 'demo' && ' Los datos de esta sesión son simulados.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status="demo" size="sm" />
              <Link
                to="/dispositivos"
                className="inline-flex min-h-8 items-center gap-1 rounded-full px-1 text-sm font-semibold text-brand-700 underline underline-offset-2"
              >
                Ver dispositivos
              </Link>
            </div>
          </div>
          <Mascot size={120} className="hidden shrink-0 sm:block" />
        </div>
      </Card>

      {/* Estado de los guantes */}
      <section aria-labelledby="guantes-titulo">
        <SectionTitle
          id="guantes-titulo"
          title="Tus guantes"
          description="Estado de los dos guantes ESP32 vinculados a tu cuenta."
          action={
            <Button as={Link} to="/dispositivos" variant="ghost" size="sm" iconRight={ArrowRight}>
              Detalles
            </Button>
          }
        />
        <Card className="mt-3 divide-y divide-brand-100" padding="none">
          <div className="px-5">
            {gloves.map((glove) => (
              <DeviceRow key={glove.id} glove={glove} />
            ))}
          </div>
        </Card>
      </section>

      {/* Acciones principales */}
      <section aria-labelledby="acciones-titulo">
        <SectionTitle
          id="acciones-titulo"
          title="¿Cómo quieres comunicarte?"
          description="Cuatro formas de empezar una conversación."
        />
        <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {QUICK_ACTIONS.map(({ to, label, description, icon: Icon, iconClasses }) => (
            <li key={to}>
              <Link
                to={to}
                className="k-card group flex h-full flex-col gap-3 rounded-lg bg-white p-4 shadow-soft transition-shadow hover:shadow-card focus-visible:shadow-card"
              >
                <span
                  className={`flex size-11 items-center justify-center rounded-md ${iconClasses}`}
                  aria-hidden="true"
                >
                  <Icon className="size-5" />
                </span>
                <span className="font-display font-extrabold text-brand-800">{label}</span>
                <span className="text-xs leading-snug text-ink-soft">{description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Historial reciente */}
      <section aria-labelledby="historial-titulo">
        <SectionTitle
          id="historial-titulo"
          title="Actividad reciente"
          description="Las traducciones y mensajes de esta sesión aparecerán aquí."
          action={
            <Button as={Link} to="/historial" variant="ghost" size="sm" iconRight={ArrowRight}>
              Historial
            </Button>
          }
        />
        <div className="mt-3">
          <EmptyState
            icon={History}
            title="Todavía no hay actividad"
            description="Cuando traduzcas un gesto o envíes un mensaje, lo encontrarás en este espacio para copiarlo o reproducirlo."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button as={Link} to="/traducir" size="sm" icon={Sparkles}>
                  Probar traducción
                </Button>
                <Button as={Link} to="/frases" size="sm" variant="secondary" icon={Bookmark}>
                  Ver frases rápidas
                </Button>
              </div>
            }
          />
        </div>
      </section>
    </div>
  )
}
