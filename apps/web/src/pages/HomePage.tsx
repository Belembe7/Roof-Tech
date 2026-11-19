import { ArrowRight, Check, ChevronRight, House, MapPin, ShieldCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { demoProperties } from '../data/demo-properties'
import { publicPropertyApi } from '../services/public-property-api'
import { imageSrcSet, toApiSearchParams, toPublicListing } from '../utils/public-utils'
import { DemoNotice, PropertyGrid, PublicShell, SearchBar } from '../components/public/PublicSite'

export function HomePage() {
  const featuredQuery = useQuery({
    queryKey: ['public-featured'],
    queryFn: () => {
      const params = toApiSearchParams(new URLSearchParams('available=1'))
      params.set('limit', '3')
      return publicPropertyApi.search(params)
    },
  })
  const featured = featuredQuery.data?.items.map(toPublicListing) ?? []
  const heroImage = featured[0]?.images[0]
  const demoOnly = featured.length > 0 && featured.every((property) => property.isDemo)
  return (
    <PublicShell>
      <main>
        <section className="home-hero">
          <img
            className="home-hero__photo"
            src={heroImage?.src ?? demoProperties[0]?.images[0]?.src}
            srcSet={heroImage ? imageSrcSet(heroImage.src) : undefined}
            sizes="100vw"
            alt={heroImage?.alt ?? 'Interior residencial ilustrativo'}
            fetchPriority="high"
          />
          <div className="home-hero__shade" />
          <div className="home-hero__content">
            <span className="hero-kicker">
              <span /> ARRANDE COM MAIS CLAREZA
            </span>
            <h1>
              Encontre o lugar certo para <em>si.</em>
            </h1>
            <p>Pesquise casas, apartamentos, quartos e dependências em Maputo.</p>
            <SearchBar />
            <div className="hero-quick-links" aria-label="Pesquisas rápidas">
              <span>Explorar:</span>
              {['Apartamento', 'Moradia', 'Quarto'].map((type) => (
                <Link key={type} to={`/pesquisa?type=${encodeURIComponent(type)}`}>
                  {type}
                  <ChevronRight size={13} />
                </Link>
              ))}
            </div>
            <small className="hero-photo-note">
              {!heroImage || featured[0]?.isDemo
                ? 'Fotografia ilustrativa'
                : 'Fotografia do anúncio'}
            </small>
          </div>
        </section>

        <div className="home-content">
          {demoOnly && <DemoNotice />}
          <section className="home-section home-section--listings" aria-labelledby="recent-heading">
            <div className="section-heading-row">
              <div>
                <span className="public-eyebrow">Anúncios recentes</span>
                <h2 id="recent-heading">Imóveis em destaque</h2>
                <p>Consulte anúncios aprovados e a disponibilidade indicada.</p>
              </div>
              <Link className="text-link desktop-only" to="/pesquisa">
                Ver todos <ArrowRight size={16} />
              </Link>
            </div>
            {featuredQuery.isPending ? (
              <div className="home-listing-state" role="status">
                A carregar anúncios…
              </div>
            ) : featuredQuery.isError ? (
              <div className="home-listing-state" role="alert">
                Não foi possível carregar os anúncios.{' '}
                <button type="button" onClick={() => void featuredQuery.refetch()}>
                  Tentar novamente
                </button>
              </div>
            ) : featured.length > 0 ? (
              <PropertyGrid properties={featured} featured />
            ) : (
              <div className="home-listing-state">Ainda não há anúncios disponíveis.</div>
            )}
            <Link className="mobile-see-all" to="/pesquisa">
              Ver todos os imóveis <ArrowRight size={16} />
            </Link>
          </section>

          <section className="home-section category-section" aria-labelledby="category-heading">
            <div className="section-heading-row">
              <div>
                <span className="public-eyebrow">Comece pelo que procura</span>
                <h2 id="category-heading">Explore por categoria</h2>
              </div>
            </div>
            <div className="category-grid">
              {[
                {
                  label: 'Apartamentos',
                  singular: 'APARTMENT',
                  desc: 'Praticidade no dia a dia',
                },
                {
                  label: 'Moradias',
                  singular: 'HOUSE',
                  desc: 'Mais espaço para viver',
                },
                {
                  label: 'Quartos',
                  singular: 'ROOM',
                  desc: 'Uma opção simples e funcional',
                },
                {
                  label: 'Dependências',
                  singular: 'ANNEX',
                  desc: 'Independência com conforto',
                },
              ].map((category) => (
                <Link
                  className="category-tile"
                  to={`/pesquisa?type=${encodeURIComponent(category.singular)}`}
                  key={category.label}
                >
                  <span className="category-tile__icon">
                    <House size={18} strokeWidth={1.5} />
                  </span>
                  <span className="category-tile__count">Explorar anúncios</span>
                  <strong>{category.label}</strong>
                  <small>{category.desc}</small>
                  <ArrowRight className="category-tile__arrow" size={17} />
                </Link>
              ))}
            </div>
          </section>

          <section className="clarity-panel" id="como-funciona">
            <div className="clarity-panel__copy">
              <span className="public-eyebrow">A nossa forma de trabalhar</span>
              <h2>
                Mais informação.
                <br />
                <em>Menos surpresas.</em>
              </h2>
              <p>
                Compare condições e custos declarados antes de combinar uma visita. Cada detalhe é
                pensado para tornar a procura mais simples.
              </p>
              <Link className="button-outline" to="/pesquisa">
                Começar pesquisa <ArrowRight size={16} />
              </Link>
            </div>
            <div className="clarity-points">
              <article>
                <span>
                  <MapPin size={18} />
                </span>
                <div>
                  <strong>Localização aproximada</strong>
                  <p>Consulte o bairro sem expor a morada privada.</p>
                </div>
              </article>
              <article>
                <span>
                  <Check size={18} />
                </span>
                <div>
                  <strong>Custos à vista</strong>
                  <p>Veja a renda, a caução e outros valores indicados.</p>
                </div>
              </article>
              <article>
                <span>
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <strong>Identidade transparente</strong>
                  <p>O perfil e o estado de validação serão comunicados com clareza.</p>
                </div>
              </article>
            </div>
          </section>
          <p className="home-note">
            <ShieldCheck size={15} /> A página pública mostra o bairro, não a morada exacta.
            Confirme os detalhes e valores com o anunciante antes de qualquer pagamento.
          </p>
        </div>
      </main>
    </PublicShell>
  )
}
