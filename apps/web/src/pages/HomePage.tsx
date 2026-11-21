import { ArrowRight, Check, ChevronRight, House, MapPin, ShieldCheck } from 'lucide-react'
import { MotionConfig, motion } from 'motion/react'
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
    <MotionConfig reducedMotion="never">
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
            <motion.div
              className="home-hero__content"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.2, delayChildren: 0.18 } },
              }}
            >
              <motion.span
                className="hero-kicker"
                variants={{
                  hidden: { opacity: 0, x: -30, y: 20 },
                  visible: {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    transition: { duration: 0.75, ease: 'easeOut' },
                  },
                }}
              >
                ARRANDE COM MAIS CLAREZA
              </motion.span>
              <motion.h1
                variants={{
                  hidden: { opacity: 0, x: -24, y: 28 },
                  visible: {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    transition: { duration: 0.8, ease: 'easeOut' },
                  },
                }}
              >
                Encontre o lugar certo para <em>si.</em>
              </motion.h1>
              <motion.p
                variants={{
                  hidden: { opacity: 0, x: -18, y: 24 },
                  visible: {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    transition: { duration: 0.75, ease: 'easeOut' },
                  },
                }}
              >
                Pesquise casas, apartamentos, quartos e dependências em Maputo.
              </motion.p>
              <motion.div
                variants={{
                  hidden: { opacity: 0, x: -16, y: 24 },
                  visible: {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    transition: { duration: 0.75, ease: 'easeOut' },
                  },
                }}
              >
                <SearchBar />
              </motion.div>
              <motion.div
                className="hero-quick-links"
                aria-label="Pesquisas rápidas"
                variants={{
                  hidden: { opacity: 0, x: -14, y: 20 },
                  visible: {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    transition: { duration: 0.7, ease: 'easeOut' },
                  },
                }}
              >
                <span>Explorar:</span>
                {['Apartamento', 'Moradia', 'Quarto'].map((type) => (
                  <Link key={type} to={`/pesquisa?type=${encodeURIComponent(type)}`}>
                    {type}
                    <ChevronRight size={13} />
                  </Link>
                ))}
              </motion.div>
              <motion.small
                className="hero-photo-note"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
                }}
              >
                {!heroImage || featured[0]?.isDemo
                  ? 'Fotografia ilustrativa'
                  : 'Fotografia do anúncio'}
              </motion.small>
            </motion.div>
          </section>

          <div className="home-content">
            {demoOnly && <DemoNotice />}
            <motion.section
              className="home-section home-section--listings"
              aria-labelledby="recent-heading"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
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
            </motion.section>

            <motion.section
              className="home-section category-section"
              aria-labelledby="category-heading"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
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
            </motion.section>

            <motion.section
              className="clarity-panel"
              id="como-funciona"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
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
            </motion.section>
            <p className="home-note">
              <ShieldCheck size={15} /> A página pública mostra o bairro, não a morada exacta.
              Confirme os detalhes e valores com o anunciante antes de qualquer pagamento.
            </p>
          </div>
        </main>
      </PublicShell>
    </MotionConfig>
  )
}
