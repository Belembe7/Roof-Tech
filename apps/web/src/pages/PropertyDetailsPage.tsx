import { useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  BedDouble,
  Check,
  ChevronRight,
  Droplets,
  MapPin,
  ParkingSquare,
  Phone,
  Shield,
  TriangleAlert,
} from 'lucide-react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { formatMeticais } from '../data/demo-properties'
import {
  formatInitialCosts,
  imageSrcSet,
  toApiSearchParams,
  toPublicListing,
  type PublicListing,
} from '../utils/public-utils'
import { publicPropertyApi, PublicPropertyApiError } from '../services/public-property-api'
import {
  DemoContactModal,
  DemoNotice,
  PublicShell,
  PropertyGrid,
} from '../components/public/PublicSite'

export function PropertyDetailsPage() {
  const { slug } = useParams()
  return <PropertyDetailsContent key={slug} slug={slug ?? ''} />
}

function PropertyDetailsContent({ slug }: { slug: string }) {
  const [activeImage, setActiveImage] = useState(0)
  const [modalMode, setModalMode] = useState<'contact' | 'report' | null>(null)
  const propertyQuery = useQuery({
    queryKey: ['public-property', slug],
    queryFn: () => publicPropertyApi.getBySlug(slug),
    enabled: Boolean(slug),
  })
  const relatedQuery = useQuery({
    queryKey: ['public-related', slug],
    queryFn: () =>
      publicPropertyApi.search(
        toApiSearchParams(new URLSearchParams('available=1&sort=newest&page=1')),
      ),
    enabled: Boolean(propertyQuery.data),
  })
  if (propertyQuery.isPending) {
    return (
      <PublicShell>
        <main className="not-found" role="status">
          A carregar o anúncio…
        </main>
      </PublicShell>
    )
  }
  if (propertyQuery.error) {
    if (
      propertyQuery.error instanceof PublicPropertyApiError &&
      propertyQuery.error.status === 404
    ) {
      return <NotFoundProperty />
    }
    return (
      <PublicShell>
        <main className="not-found">
          <span className="public-eyebrow">Pesquisa temporariamente indisponível</span>
          <h1>Não foi possível carregar este anúncio.</h1>
          <p>
            {propertyQuery.error instanceof Error
              ? propertyQuery.error.message
              : 'Tente novamente.'}
          </p>
          <button
            className="button-primary"
            type="button"
            onClick={() => void propertyQuery.refetch()}
          >
            Tentar novamente
          </button>
        </main>
      </PublicShell>
    )
  }
  if (!propertyQuery.data) return <NotFoundProperty />
  const property = toPublicListing(propertyQuery.data)
  const costs = formatInitialCosts(property)
  const related = (relatedQuery.data?.items ?? [])
    .filter((item) => item.slug !== property.slug)
    .slice(0, 2)
    .map(toPublicListing)
  const changeImage = (step: number) =>
    setActiveImage((current) => (current + step + property.images.length) % property.images.length)
  const activePhoto = property.images[activeImage]

  return (
    <PublicShell>
      <main className="details-page">
        <div className="details-page__inner">
          <div className="breadcrumbs">
            <Link to="/pesquisa">
              <ArrowLeft size={15} /> Voltar à pesquisa
            </Link>
            <span aria-hidden="true">/</span>
            <span>{property.neighborhood}</span>
          </div>
          {property.isDemo && <DemoNotice compact />}
          <section className="details-gallery" aria-label="Galeria de fotografias do imóvel">
            <div className="details-gallery__main">
              {activePhoto ? (
                <img
                  src={activePhoto.src}
                  srcSet={imageSrcSet(activePhoto.src)}
                  sizes="(max-width: 760px) 100vw, 82vw"
                  alt={activePhoto.alt}
                  fetchPriority="high"
                />
              ) : (
                <div className="details-gallery__placeholder">Fotografias indisponíveis</div>
              )}
              {property.isDemo && <span className="image-demo-chip">Imagem ilustrativa</span>}
              {property.images.length > 1 && (
                <div className="gallery-controls">
                  <button
                    type="button"
                    onClick={() => changeImage(-1)}
                    aria-label="Fotografia anterior"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <span>
                    {activeImage + 1} / {property.images.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeImage(1)}
                    aria-label="Fotografia seguinte"
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </div>
            {property.images.length > 1 && (
              <div className="details-gallery__thumbs">
                {property.images.map((image, index) => (
                  <button
                    type="button"
                    key={image.src + index}
                    className={index === activeImage ? 'is-active' : ''}
                    onClick={() => setActiveImage(index)}
                    aria-label={`Ver fotografia ${index + 1}`}
                    aria-pressed={index === activeImage}
                  >
                    <img
                      src={
                        image.src.includes('w=1200')
                          ? image.src.replace('w=1200', 'w=260')
                          : image.src
                      }
                      alt=""
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          <div className="details-columns">
            <div className="details-main-column">
              <section className="details-heading">
                <div className="details-heading__eyebrow">
                  <span>{property.type}</span>
                  <span>Ref. {property.reference}</span>
                  <span className={`availability-text ${property.available ? 'is-available' : ''}`}>
                    <i />
                    {property.availabilityStatus === 'AVAILABLE'
                      ? 'Disponível'
                      : property.availabilityStatus === 'UNAVAILABLE'
                        ? 'Indisponível'
                        : 'Por confirmar'}
                  </span>
                </div>
                <h1>{property.title}</h1>
                <p className="details-location">
                  <MapPin size={16} /> {property.neighborhood}, {property.city}{' '}
                  {property.isDemo && <span>· localização aproximada</span>}
                </p>
                <div className="details-price">
                  {formatMeticais(property.monthlyRent)} <small>/ mês</small>
                </div>
              </section>

              <section className="detail-facts" aria-label="Resumo do imóvel">
                <div>
                  <BedDouble size={18} />
                  <strong>{property.bedrooms}</strong>
                  <span>{property.bedrooms === 1 ? 'quarto' : 'quartos'}</span>
                </div>
                <div>
                  <Bath size={18} />
                  <strong>{property.bathrooms}</strong>
                  <span>{property.bathrooms === 1 ? 'WC' : 'WCs'}</span>
                </div>
                <div>
                  <ParkingSquare size={18} />
                  <strong>{property.parkingSpaces}</strong>
                  <span>estacionamento</span>
                </div>
                <div>
                  <span className="area-icon">m²</span>
                  <strong>{property.areaM2 ?? '—'}</strong>
                  <span>{property.areaM2 === null ? 'área não indicada' : 'área indicativa'}</span>
                </div>
              </section>

              <section className="details-section">
                <span className="public-eyebrow">
                  {property.isDemo ? 'Sobre o imóvel · demonstração' : 'Sobre o imóvel'}
                </span>
                <h2>Um espaço para o seu dia a dia.</h2>
                <p>{property.description}</p>
              </section>

              <section className="details-section">
                <span className="public-eyebrow">Características</span>
                <h2>
                  {property.isDemo ? 'O que este exemplo inclui' : 'Características do imóvel'}
                </h2>
                <ul className="feature-list">
                  {property.features.map((feature) => (
                    <li key={feature}>
                      <Check size={16} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="details-feature-pills">
                  <span
                    className={property.water ? 'feature-pill feature-pill--yes' : 'feature-pill'}
                  >
                    <Droplets size={15} />
                    Água {property.water ? 'indicada' : 'não indicada'}
                  </span>
                  <span
                    className={
                      property.security ? 'feature-pill feature-pill--yes' : 'feature-pill'
                    }
                  >
                    <Shield size={15} />
                    Segurança {property.security ? 'indicada' : 'não indicada'}
                  </span>
                </div>
              </section>

              <section className="advertiser-card">
                <span className="avatar-demo">{property.advertiser.name.slice(-1)}</span>
                <div>
                  <span className="public-eyebrow">
                    {property.isDemo ? 'Anunciante demonstrativo' : 'Anunciante'}
                  </span>
                  <strong>{property.advertiser.name}</strong>
                  <small>
                    {property.advertiser.kind} · identidade{' '}
                    {property.advertiser.verificationStatus === 'APPROVED'
                      ? 'verificada'
                      : 'não verificada'}
                  </small>
                </div>
                <span className="no-verify">
                  {property.advertiser.verificationStatus === 'APPROVED'
                    ? 'Identidade verificada'
                    : 'Sem verificação'}
                </span>
              </section>
            </div>

            <aside className="details-side-column">
              <section className="cost-card" aria-labelledby="cost-heading">
                <span className="public-eyebrow">Transparência nos valores</span>
                <h2 id="cost-heading">Custos iniciais declarados</h2>
                <div className="cost-list">
                  {costs.parts.map((part) => (
                    <div className="cost-row" key={part.label}>
                      <span>{part.label}</span>
                      <strong>
                        {part.value === undefined ? 'Não indicado' : formatMeticais(part.value)}
                      </strong>
                    </div>
                  ))}
                </div>
                {costs.missing ? (
                  <div className="cost-total">
                    <span>Subtotal dos valores declarados</span>
                    <strong>{formatMeticais(costs.total)}</strong>
                  </div>
                ) : (
                  <div className="cost-total">
                    <span>Total estimado para ocupar</span>
                    <strong>{formatMeticais(costs.total)}</strong>
                  </div>
                )}
                <p className="cost-note">
                  {costs.missing
                    ? 'O subtotal exclui custos que não foram indicados.'
                    : 'Inclui o primeiro mês de renda e apenas os valores acima.'}{' '}
                  {property.isDemo
                    ? 'Os valores são fictícios.'
                    : 'Valores declarados pelo anunciante; confirme os detalhes antes de pagar.'}
                </p>
                {property.costs.visitFee !== undefined && (
                  <div className="visit-fee">
                    <span>
                      Taxa de visita <small>separada do custo de ocupação</small>
                    </span>
                    <strong>{formatMeticais(property.costs.visitFee)}</strong>
                  </div>
                )}
              </section>
              <section className="contact-card">
                <h2>{property.isDemo ? 'Tem interesse?' : 'Contacto do anunciante'}</h2>
                <p>
                  {property.isDemo
                    ? 'Os dados de contacto deste exemplo não são reais.'
                    : 'O contacto directo ainda não está disponível. Os dados pessoais do anunciante não são publicados nesta página.'}
                </p>
                {property.isDemo && (
                  <>
                    <button
                      className="button-primary button-full"
                      type="button"
                      onClick={() => setModalMode('contact')}
                    >
                      <Phone size={16} /> Contactar anunciante
                    </button>
                    <button
                      className="button-secondary button-full"
                      type="button"
                      onClick={() => setModalMode('contact')}
                    >
                      Ver número de telefone
                    </button>
                  </>
                )}
                <button
                  className="report-link"
                  type="button"
                  onClick={() => setModalMode('report')}
                >
                  <TriangleAlert size={14} /> Sinalizar anúncio
                </button>
              </section>
            </aside>
          </div>

          {related.length > 0 && (
            <section className="related-section">
              <div className="section-heading-row">
                <div>
                  <span className="public-eyebrow">Continue a explorar</span>
                  <h2>
                    {property.isDemo ? 'Outros exemplos disponíveis' : 'Outros imóveis disponíveis'}
                  </h2>
                </div>
                <Link to="/pesquisa" className="text-link">
                  Todos os imóveis <ChevronRight size={16} />
                </Link>
              </div>
              <PropertyGrid properties={related} />
            </section>
          )}
        </div>
      </main>
      {modalMode && property.isDemo && (
        <DemoContactModal mode={modalMode} property={property} onClose={() => setModalMode(null)} />
      )}
      {modalMode === 'report' && !property.isDemo && (
        <PublicReportModal property={property} onClose={() => setModalMode(null)} />
      )}
    </PublicShell>
  )
}

function NotFoundProperty() {
  return (
    <PublicShell>
      <main className="not-found">
        <span className="public-eyebrow">Imóvel não encontrado</span>
        <h1>Este anúncio não está disponível.</h1>
        <p>Volte à pesquisa para explorar os anúncios disponíveis.</p>
        <Link className="button-primary" to="/pesquisa">
          Explorar imóveis
        </Link>
      </main>
    </PublicShell>
  )
}

function PublicReportModal({
  property,
  onClose,
}: {
  property: PublicListing
  onClose: () => void
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const reason = String(form.get('reason')) as
      | 'INCORRECT_INFORMATION'
      | 'POSSIBLE_FRAUD'
      | 'UNAVAILABLE_PROPERTY'
      | 'UNAUTHORIZED_LISTING'
      | 'OTHER'
    const description = String(form.get('description') ?? '').trim()
    setPending(true)
    try {
      await publicPropertyApi.submitReport(property.slug, {
        reason,
        ...(description ? { description } : {}),
      })
      setSubmitted(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível enviar a denúncia.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose()
      }}
    >
      <section
        className="demo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        <button
          className="modal-close"
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          disabled={pending}
        >
          ×
        </button>
        {submitted ? (
          <>
            <span className="modal-icon">
              <Check size={20} />
            </span>
            <span className="public-eyebrow">Denúncia registada · {property.reference}</span>
            <h2 id="report-modal-title">Obrigado por nos avisar.</h2>
            <p>A equipa Roof Tech vai rever esta denúncia.</p>
            <button className="button-primary button-full" type="button" onClick={onClose}>
              Fechar
            </button>
          </>
        ) : (
          <>
            <span className="public-eyebrow">Anúncio {property.reference}</span>
            <h2 id="report-modal-title">Sinalizar este anúncio</h2>
            <p>Descreva apenas o problema relacionado com o anúncio. Não inclua dados pessoais.</p>
            <form className="report-form" onSubmit={(event) => void submit(event)}>
              <label className="filter-control">
                <span>Motivo</span>
                <select name="reason" required defaultValue="">
                  <option value="" disabled>
                    Seleccione um motivo
                  </option>
                  <option value="INCORRECT_INFORMATION">Informação incorrecta</option>
                  <option value="POSSIBLE_FRAUD">Possível fraude</option>
                  <option value="UNAVAILABLE_PROPERTY">Imóvel indisponível</option>
                  <option value="UNAUTHORIZED_LISTING">Sem autorização para anunciar</option>
                  <option value="OTHER">Outro</option>
                </select>
              </label>
              <label className="filter-control">
                <span>
                  Descrição <small>opcional</small>
                </span>
                <textarea
                  name="description"
                  rows={3}
                  maxLength={1000}
                  placeholder="Descreva o que observou"
                />
              </label>
              {error && (
                <div className="auth-alert" role="alert">
                  {error}
                </div>
              )}
              <button className="button-primary button-full" type="submit" disabled={pending}>
                {pending ? 'A enviar…' : 'Enviar denúncia'}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
