import { useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowRight,
  Bath,
  BedDouble,
  Check,
  ChevronDown,
  CircleHelp,
  Droplets,
  House,
  MapPin,
  Menu,
  ParkingSquare,
  Phone,
  Search,
  Shield,
  SlidersHorizontal,
  UserRound,
  X,
} from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router'
import { useAuth } from '../../contexts/use-auth'
import { formatMeticais } from '../../data/demo-properties'
import { apiPropertyTypeFromQuery, imageSrcSet, type PublicListing } from '../../utils/public-utils'
import '../../pages/public.css'

export function DemoNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`demo-notice ${compact ? 'demo-notice--compact' : ''}`} role="note">
      <CircleHelp size={15} aria-hidden="true" />
      <span>
        <strong>Modo demonstração.</strong> Os imóveis, fotografias, anunciantes e valores são
        ilustrativos; não há anúncios ou contactos reais.
      </span>
    </div>
  )
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { status, user } = useAuth()
  const accountPath =
    status === 'authenticated' && user?.role === 'ADVERTISER'
      ? '/anunciante'
      : status === 'authenticated' && user?.role === 'ADMIN'
        ? '/administracao'
        : '/conta'
  return (
    <>
      <header className="public-header">
        <div className="public-header__inner">
          <Link className="public-brand" to="/" aria-label="Roof Tech, início">
            <span className="public-brand__mark" aria-hidden="true">
              <House size={20} strokeWidth={1.7} />
            </span>
            <span className="public-brand__text">
              <b>ROOF TECH</b>
              <small>IMÓVEIS COM CLAREZA</small>
            </span>
          </Link>
          <nav
            className={`public-nav ${menuOpen ? 'public-nav--open' : ''}`}
            aria-label="Navegação principal"
          >
            <NavLink to="/pesquisa" onClick={() => setMenuOpen(false)}>
              Encontrar imóvel
            </NavLink>
            <a href="#como-funciona" onClick={() => setMenuOpen(false)}>
              Como funciona
            </a>
            <span className="nav-demo-label">Pré-visualização</span>
          </nav>
          <button
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link className="header-search-link" to="/pesquisa">
            <Search size={16} /> Pesquisar
          </Link>
          <Link
            className="header-account-link"
            to={status === 'authenticated' ? accountPath : '/entrar'}
          >
            {status === 'authenticated' && user?.role === 'ADVERTISER'
              ? 'Painel do anunciante'
              : status === 'authenticated' && user?.role === 'ADMIN'
                ? 'Painel administrativo'
                : status === 'authenticated'
                  ? 'A minha conta'
                  : 'Entrar'}
          </Link>
        </div>
      </header>
      {menuOpen && (
        <button
          className="menu-scrim"
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  )
}

export function SiteFooter() {
  return (
    <footer className="public-footer">
      <Link className="public-brand public-brand--footer" to="/">
        <span className="public-brand__mark" aria-hidden="true">
          <House size={18} />
        </span>
        <span className="public-brand__text">
          <b>ROOF TECH</b>
          <small>IMÓVEIS COM CLAREZA</small>
        </span>
      </Link>
      <span>Maputo, Moçambique · Experiência pública em demonstração</span>
      <Link to="/design-system">Sistema visual</Link>
    </footer>
  )
}

export function MobileNav() {
  const { status, user } = useAuth()
  return (
    <nav className="mobile-bottom-nav" aria-label="Navegação móvel">
      <NavLink to="/" end>
        <House size={18} />
        <span>Início</span>
      </NavLink>
      <NavLink to="/pesquisa">
        <Search size={18} />
        <span>Pesquisar</span>
      </NavLink>
      <NavLink
        to={
          status === 'authenticated' && user?.role === 'ADVERTISER'
            ? '/anunciante'
            : status === 'authenticated' && user?.role === 'ADMIN'
              ? '/administracao'
              : status === 'authenticated'
                ? '/conta'
                : '/entrar'
        }
      >
        <UserRound size={18} />
        <span>Conta</span>
      </NavLink>
    </nav>
  )
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-app">
      <SiteHeader />
      {children}
      <SiteFooter />
      <MobileNav />
    </div>
  )
}

export function SearchBar({
  initialQuery = '',
  compact = false,
}: {
  initialQuery?: string
  compact?: boolean
}) {
  const [query, setQuery] = useState(initialQuery)
  const navigate = useNavigate()
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    navigate(`/pesquisa${params.size ? `?${params.toString()}` : ''}`)
  }

  return (
    <form
      className={`public-search ${compact ? 'public-search--compact' : ''}`}
      onSubmit={submit}
      role="search"
    >
      <label className="public-search__field">
        <MapPin size={18} aria-hidden="true" />
        <span className="sr-only">Bairro ou zona</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Bairro ou zona em Maputo"
          aria-label="Bairro ou zona"
        />
      </label>
      {!compact && (
        <label className="public-search__select">
          <span>Tipo</span>
          <select
            aria-label="Tipo de imóvel"
            onChange={(event) => {
              if (event.target.value)
                navigate(
                  `/pesquisa?type=${encodeURIComponent(event.target.value)}${query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ''}`,
                )
            }}
            defaultValue=""
          >
            <option value="">Todos os tipos</option>
            <option value="APARTMENT">Apartamento</option>
            <option value="HOUSE">Moradia</option>
            <option value="ROOM">Quarto</option>
            <option value="ANNEX">Dependência</option>
          </select>
          <ChevronDown size={15} aria-hidden="true" />
        </label>
      )}
      <button className="public-search__submit" type="submit">
        <Search size={17} aria-hidden="true" />
        <span>Pesquisar imóveis</span>
      </button>
    </form>
  )
}

export function PropertyCard({
  property,
  featured = false,
}: {
  property: PublicListing
  featured?: boolean
}) {
  return (
    <article className={`property-card ${featured ? 'property-card--featured' : ''}`}>
      <Link
        className="property-card__image-link"
        to={`/imoveis/${property.slug}`}
        aria-label={`Ver detalhes: ${property.title}`}
      >
        <img
          src={property.images[0]?.src}
          srcSet={property.images[0] ? imageSrcSet(property.images[0].src) : undefined}
          sizes="(max-width: 760px) 42vw, (max-width: 1000px) 38vw, 34vw"
          alt={property.images[0]?.alt ?? `Fotografia de ${property.title}`}
          loading="lazy"
          decoding="async"
        />
        {property.isDemo && <span className="image-demo-chip">Imagem ilustrativa</span>}
        <span
          className={`availability-chip ${property.available ? 'availability-chip--available' : 'availability-chip--unavailable'}`}
        >
          <span />
          {property.availabilityStatus === 'AVAILABLE'
            ? 'Disponível'
            : property.availabilityStatus === 'UNAVAILABLE'
              ? 'Indisponível'
              : 'Por confirmar'}
        </span>
      </Link>
      <div className="property-card__body">
        <div className="property-card__topline">
          <span>
            {property.type} <i aria-hidden="true">·</i> {property.neighborhood}
          </span>
          <span className="property-reference">{property.reference}</span>
        </div>
        <Link to={`/imoveis/${property.slug}`} className="property-card__title">
          {property.title}
        </Link>
        <div className="property-card__facts">
          <span>
            <BedDouble size={15} aria-hidden="true" />
            {property.bedrooms} {property.bedrooms === 1 ? 'quarto' : 'quartos'}
          </span>
          <span>
            <Bath size={14} aria-hidden="true" />
            {property.bathrooms} {property.bathrooms === 1 ? 'WC' : 'WCs'}
          </span>
          {property.parkingSpaces > 0 && (
            <span>
              <ParkingSquare size={15} aria-hidden="true" />
              {property.parkingSpaces} vaga{property.parkingSpaces > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="property-card__bottom">
          <span className="property-price">
            {formatMeticais(property.monthlyRent)}
            <small>/ mês</small>
          </span>
          <Link
            className="card-arrow"
            to={`/imoveis/${property.slug}`}
            aria-label={`Abrir ${property.title}`}
          >
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </article>
  )
}

export function PropertyGrid({
  properties,
  featured = false,
}: {
  properties: PublicListing[]
  featured?: boolean
}) {
  return (
    <div className={`property-grid ${featured ? 'property-grid--featured' : ''}`}>
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} featured={featured} />
      ))}
    </div>
  )
}

export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="page-intro">
      <span className="public-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  )
}

export function PropertyFilterPanel({
  params,
  onChange,
  onClear,
}: {
  params: URLSearchParams
  onChange: (key: string, value: string) => void
  onClear: () => void
}) {
  return (
    <div className="filter-panel">
      <div className="filter-panel__heading">
        <span>
          <SlidersHorizontal size={16} /> Refinar pesquisa
        </span>
        <button type="button" onClick={onClear}>
          Limpar filtros
        </button>
      </div>
      <label className="filter-control">
        <span>Bairro ou zona</span>
        <input
          value={params.get('q') ?? ''}
          onChange={(event) => onChange('q', event.target.value)}
          placeholder="Ex.: Polana"
        />
      </label>
      <label className="filter-control">
        <span>Tipo de imóvel</span>
        <select
          value={apiPropertyTypeFromQuery(params.get('type')) ?? ''}
          onChange={(event) => onChange('type', event.target.value)}
        >
          <option value="">Todos</option>
          <option value="APARTMENT">Apartamento</option>
          <option value="HOUSE">Moradia</option>
          <option value="ROOM">Quarto</option>
          <option value="ANNEX">Dependência</option>
        </select>
      </label>
      <label className="filter-control">
        <span>Renda máxima</span>
        <div className="input-suffix">
          <input
            inputMode="numeric"
            type="number"
            min="0"
            step="5000"
            value={params.get('max') ?? ''}
            onChange={(event) => onChange('max', event.target.value)}
            placeholder="Sem limite"
          />
          <span>MT</span>
        </div>
      </label>
      <label className="filter-control">
        <span>Número mínimo de quartos</span>
        <select
          value={params.get('rooms') ?? ''}
          onChange={(event) => onChange('rooms', event.target.value)}
        >
          <option value="">Qualquer</option>
          <option value="1">1+ quarto</option>
          <option value="2">2+ quartos</option>
          <option value="3">3+ quartos</option>
          <option value="4">4+ quartos</option>
        </select>
      </label>
      <fieldset className="filter-checks">
        <legend>Características</legend>
        <label>
          <input
            type="checkbox"
            checked={params.get('water') === '1'}
            onChange={(event) => onChange('water', event.target.checked ? '1' : '')}
          />
          <Droplets size={16} /> Água
        </label>
        <label>
          <input
            type="checkbox"
            checked={params.get('parking') === '1'}
            onChange={(event) => onChange('parking', event.target.checked ? '1' : '')}
          />
          <ParkingSquare size={16} /> Estacionamento
        </label>
        <label>
          <input
            type="checkbox"
            checked={params.get('security') === '1'}
            onChange={(event) => onChange('security', event.target.checked ? '1' : '')}
          />
          <Shield size={16} /> Segurança
        </label>
      </fieldset>
      <label className="filter-check filter-check--availability">
        <input
          type="checkbox"
          checked={params.get('available') === '1'}
          onChange={(event) => onChange('available', event.target.checked ? '1' : '')}
        />
        <span>Apenas disponíveis</span>
      </label>
    </div>
  )
}

export function DemoContactModal({
  mode,
  property,
  onClose,
}: {
  mode: 'contact' | 'report'
  property: PublicListing
  onClose: () => void
}) {
  const [submitted, setSubmitted] = useState(false)
  const handleReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
  }
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="demo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-modal-title"
      >
        <button className="modal-close" type="button" aria-label="Fechar" onClick={onClose}>
          <X size={19} />
        </button>
        {mode === 'contact' ? (
          <>
            <span className="modal-icon">
              <Phone size={20} />
            </span>
            <span className="public-eyebrow">Contacto demonstrativo · {property.reference}</span>
            <h2 id="demo-modal-title">Este anunciante é fictício.</h2>
            <p>
              Não existe um número de telefone ou WhatsApp real associado a este anúncio. Nenhuma
              mensagem será enviada.
            </p>
            <div className="modal-person">
              <span>{property.advertiser.name}</span>
              <small>{property.advertiser.kind} · não verificado</small>
            </div>
            <button className="button-primary button-full" type="button" onClick={onClose}>
              Entendi
            </button>
          </>
        ) : submitted ? (
          <>
            <span className="modal-icon">
              <Check size={20} />
            </span>
            <span className="public-eyebrow">Registo local</span>
            <h2 id="demo-modal-title">Obrigado pelo feedback.</h2>
            <p>Este formulário é demonstrativo. A denúncia não foi enviada nem guardada.</p>
            <button className="button-primary button-full" type="button" onClick={onClose}>
              Fechar
            </button>
          </>
        ) : (
          <>
            <span className="public-eyebrow">Anúncio {property.reference}</span>
            <h2 id="demo-modal-title">Sinalizar este anúncio</h2>
            <p>
              Este é um exemplo de interface. Não envie informação pessoal; a denúncia ficará apenas
              nesta demonstração.
            </p>
            <form className="report-form" onSubmit={handleReport}>
              <label className="filter-control">
                <span>Motivo</span>
                <select required defaultValue="">
                  <option value="" disabled>
                    Seleccione um motivo
                  </option>
                  <option>Informação incorrecta</option>
                  <option>Possível fraude</option>
                  <option>Imóvel indisponível</option>
                  <option>Outro</option>
                </select>
              </label>
              <label className="filter-control">
                <span>Descrição (opcional)</span>
                <textarea rows={3} maxLength={300} placeholder="Descreva o que observou" />
              </label>
              <button className="button-primary button-full" type="submit">
                Pré-visualizar denúncia
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
