import { House } from 'lucide-react'
import { Link } from 'react-router'

export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Roof Tech, início da pré-visualização">
      <span className="brand-mark" aria-hidden="true">
        <House size={19} strokeWidth={1.8} />
      </span>
      <span className="brand-name">
        <span>ROOF TECH</span>
        <span>IMÓVEIS COM CLAREZA</span>
      </span>
    </Link>
  )
}
