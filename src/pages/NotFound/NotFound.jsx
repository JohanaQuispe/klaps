import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import EmptyState from '../../components/common/EmptyState'
import Button from '../../components/common/Button'

export default function NotFound() {
  return (
    <EmptyState
      className="mt-8"
      icon={Compass}
      title="No encontramos esta pantalla"
      description="Puede que el enlace esté incompleto. Vuelve al inicio para seguir usando KLAPS."
      action={
        <Button as={Link} to="/inicio">
          Ir al inicio
        </Button>
      }
    />
  )
}
