import { Link } from 'react-router'
import { PublicShell } from '../components/public/PublicSite'

export function NotFoundPage() {
  return (
    <PublicShell>
      <main className="not-found">
        <span className="public-eyebrow">Página não encontrada</span>
        <h1>Não encontrámos este caminho.</h1>
        <p>Explore os imóveis de demonstração em Maputo.</p>
        <Link className="button-primary" to="/pesquisa">
          Pesquisar imóveis
        </Link>
      </main>
    </PublicShell>
  )
}
