import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Accessibility, ArrowRight, AudioLines, FlaskConical, HandHelping } from 'lucide-react'
import Button from '../../components/common/Button'
import Logo from '../../components/brand/Logo'
import DecorativeRings from '../../components/brand/DecorativeRings'
import AccessibilityPanel from '../../components/accessibility/AccessibilityPanel'

const PILLARS = [
  {
    icon: HandHelping,
    title: 'Guantes inteligentes',
    description: 'Tus gestos se convierten en texto y en voz.',
  },
  {
    icon: AudioLines,
    title: 'Voz y texto',
    description: 'Habla, escribe o escucha en la misma conversación.',
  },
  {
    icon: Accessibility,
    title: 'Accesible por diseño',
    description: 'Contraste, tamaño de letra y teclado desde el inicio.',
  },
]

export default function Welcome() {
  const [panelOpen, setPanelOpen] = useState(false)

  return (
    <div className="klaps-aurora relative min-h-dvh overflow-hidden">
      {/* Halos decorativos (se ocultan en alto contraste) */}
      <div
        aria-hidden="true"
        className="k-decorative pointer-events-none absolute -top-16 -left-24 size-72 rounded-full bg-brand-200/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="k-decorative pointer-events-none absolute -right-20 bottom-0 size-80 rounded-full bg-blush/40 blur-3xl"
      />
      <DecorativeRings
        className="top-[-12%] right-[-18%] hidden size-[680px] lg:block"
        opacity={0.55}
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 pt-5 pb-10 sm:px-6 lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14 lg:px-8 lg:py-10">
        <header className="flex items-center justify-between gap-3 lg:col-span-2 lg:mb-8">
          <Logo size={46} />
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="flex min-h-11 items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-4 font-display text-sm font-bold text-brand-700 transition-colors hover:bg-white"
          >
            <Accessibility className="size-4" aria-hidden="true" />
            Accesibilidad
          </button>
        </header>

        {/* Texto de bienvenida */}
        <div className="order-2 mt-6 lg:order-1 lg:mt-0">
          <p className="text-xs font-semibold tracking-[0.16em] text-brand-600 uppercase">
            Bienvenido a KLAPS
          </p>

          <h1 className="mt-2 font-display text-[2.15rem] leading-[1.08] font-extrabold text-brand-800 sm:text-5xl">
            Comunicación <span className="text-brand-600">sin barreras</span>
          </h1>

          <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-soft sm:text-lg">
            KLAPS conecta a personas con dificultades de audición, habla o movilidad con quienes
            las rodean. Traduce gestos, voz y texto para que la conversación fluya con naturalidad.
          </p>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <Button as={Link} to="/inicio" size="lg" iconRight={ArrowRight} className="w-full sm:w-auto">
              Comenzar
            </Button>
            <Button
              variant="secondary"
              size="lg"
              icon={Accessibility}
              onClick={() => setPanelOpen(true)}
              className="w-full sm:w-auto"
            >
              Ajustar accesibilidad
            </Button>
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-3 rounded-md bg-white/65 p-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold text-brand-800">{title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-ink-soft">{description}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
            <FlaskConical className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <span>
              KLAPS está en desarrollo. Los guantes inteligentes todavía no están conectados: la
              aplicación funciona en <strong className="font-semibold">modo demostración</strong>.
            </span>
          </p>
        </div>

        {/* Ilustración oficial de KLAPS */}
        <figure className="order-1 lg:order-2">
          <div className="k-card overflow-hidden rounded-xl bg-white/60 shadow-lift">
            <img
              src="/illustrations/klaps-hero-1200.webp"
              srcSet="/illustrations/klaps-hero-720.webp 720w, /illustrations/klaps-hero-1200.webp 1200w"
              sizes="(min-width: 1024px) 520px, 92vw"
              width={1200}
              height={1409}
              fetchPriority="high"
              alt="Mascota de KLAPS saludando, rodeada de guantes inteligentes, personas conversando y el símbolo de la marca"
              className="mx-auto h-auto max-h-[38vh] w-full object-contain lg:max-h-[70vh]"
            />
          </div>
        </figure>
      </div>

      <AccessibilityPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </div>
  )
}
