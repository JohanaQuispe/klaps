import { Link } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'

/**
 * Pantalla honesta para los módulos que todavía no están implementados.
 * No simula la función: explica qué falta y qué incluirá.
 */
export default function ComingSoon({ icon: Icon, eyebrow, title, description, planned = [] }) {
  return (
    <div>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <Card padding="lg">
        <div className="flex items-start gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-brand-100 text-brand-700">
            {Icon ? <Icon className="size-6" aria-hidden="true" /> : null}
          </span>
          <div>
            <p className="font-display text-lg font-extrabold text-brand-800">En construcción</p>
            <p className="mt-1 text-sm text-ink-soft">
              Este módulo se desarrolla en la siguiente etapa. Nada de lo que veas aquí simula una
              función real.
            </p>
          </div>
        </div>

        {planned.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold tracking-[0.14em] text-brand-600 uppercase">
              Incluirá
            </p>
            <ul className="mt-3 space-y-2.5">
              {planned.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-ink">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-7 flex flex-wrap gap-2">
          <Button as={Link} to="/inicio" variant="secondary" icon={ArrowLeft}>
            Volver al inicio
          </Button>
          <Button as={Link} to="/dispositivos" variant="ghost">
            Ver guantes
          </Button>
        </div>
      </Card>
    </div>
  )
}
