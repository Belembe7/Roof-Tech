import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ClipboardList,
  FileCheck2,
  FileText,
  Flag,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router'
import type {
  ApiAdminAuditEntry,
  ApiAdminProperty,
  ApiAdminReport,
  ApiAdminVerificationRequest,
} from '@roof-tech/shared'
import { PublicShell } from '../components/public/PublicSite'
import { useAuth } from '../contexts/use-auth'
import { adminApi } from '../services/admin-api'
import { apiAssetUrl } from '../services/api-url'
import '../pages/admin.css'

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível concluir o pedido.'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-MZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatMoney(value: string) {
  return `${new Intl.NumberFormat('pt-MZ', { maximumFractionDigits: 0 }).format(Number(value))} MT / mês`
}

function formatBytes(value: number) {
  return value < 1024 * 1024
    ? `${Math.ceil(value / 1024)} KB`
    : `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function AdminHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <div className="admin-heading">
      <div>
        <span className="public-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{children}</p>
      </div>
    </div>
  )
}

function QueryState({
  pending,
  error,
  empty,
}: {
  pending: boolean
  error: unknown
  empty?: boolean
}) {
  if (pending)
    return (
      <div className="admin-empty" role="status">
        A carregar…
      </div>
    )
  if (error)
    return (
      <div className="admin-error" role="alert">
        {messageFor(error)}
      </div>
    )
  if (empty) return <div className="admin-empty">Não há pedidos pendentes nesta fila.</div>
  return null
}

export function ProtectedAdminRoute() {
  const { status, user, error, refreshSession } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="route-fallback" role="status">
        A verificar a sua sessão…
      </div>
    )
  }
  if (status === 'unavailable') {
    return (
      <main className="admin-guard">
        <h1>Área administrativa indisponível</h1>
        <p>{error ?? 'Não foi possível verificar a sua sessão.'}</p>
        <button className="button-primary" type="button" onClick={() => void refreshSession()}>
          Tentar novamente
        </button>
      </main>
    )
  }
  if (!user) {
    return (
      <Navigate
        to={`/entrar?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    )
  }
  if (user.role !== 'ADMIN') return <Navigate to="/conta" replace />
  return <Outlet />
}

export function AdminLayout() {
  return (
    <PublicShell>
      <main className="admin-page">
        <div className="admin-layout">
          <aside className="admin-sidebar" aria-label="Menu administrativo">
            <div className="admin-sidebar__heading">
              <ShieldCheck size={18} /> Administração
            </div>
            <NavLink to="/administracao" end>
              <ClipboardList size={16} /> Visão geral
            </NavLink>
            <NavLink to="/administracao/imoveis">
              <Building2 size={16} /> Anúncios
            </NavLink>
            <NavLink to="/administracao/verificacao">
              <BadgeCheck size={16} /> Verificações
            </NavLink>
            <NavLink to="/administracao/denuncias">
              <Flag size={16} /> Denúncias
            </NavLink>
            <NavLink to="/administracao/utilizadores">
              <Users size={16} /> Utilizadores
            </NavLink>
            <NavLink to="/administracao/auditoria">
              <FileText size={16} /> Auditoria
            </NavLink>
          </aside>
          <div className="admin-content">
            <Outlet />
          </div>
        </div>
      </main>
    </PublicShell>
  )
}

export function AdminDashboardPage() {
  const { data, isPending, error } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: adminApi.getOverview,
  })
  const cards = [
    {
      label: 'Anúncios por rever',
      value: data?.summary.pendingProperties ?? 0,
      to: '/administracao/imoveis',
      icon: <Building2 size={18} />,
    },
    {
      label: 'Verificações pendentes',
      value: data?.summary.pendingVerifications ?? 0,
      to: '/administracao/verificacao',
      icon: <BadgeCheck size={18} />,
    },
    {
      label: 'Denúncias abertas',
      value: data?.summary.openReports ?? 0,
      to: '/administracao/denuncias',
      icon: <Flag size={18} />,
    },
    {
      label: 'Contas activas',
      value: data?.summary.activeUsers ?? 0,
      to: '/administracao/utilizadores',
      icon: <Users size={18} />,
    },
  ]
  return (
    <section className="admin-section">
      <AdminHeading eyebrow="Controlo da plataforma" title="Visão geral">
        Reveja anúncios, documentos e denúncias enviados à Roof Tech.
      </AdminHeading>
      <QueryState pending={isPending} error={error} />
      {data && (
        <>
          <div className="admin-stat-grid">
            {cards.map((card) => (
              <Link className="admin-stat-card" to={card.to} key={card.label}>
                <span className="admin-stat-card__icon">{card.icon}</span>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </Link>
            ))}
          </div>
          <section className="admin-panel">
            <div className="admin-panel__heading">
              <div>
                <h2>Actividade administrativa</h2>
                <p>Alterações recentes registadas no sistema.</p>
              </div>
              <Link to="/administracao/auditoria">
                Abrir auditoria <ArrowRight size={14} />
              </Link>
            </div>
            <AuditList items={data.recentActivity} />
          </section>
          <p className="admin-footnote">
            Contas activas: {data.summary.activeUsers} · suspensas: {data.summary.suspendedUsers}
          </p>
        </>
      )}
    </section>
  )
}

function ReviewReason({
  value,
  onChange,
  id,
}: {
  value: string
  onChange: (value: string) => void
  id: string
}) {
  return (
    <label className="admin-field" htmlFor={id}>
      Motivo da rejeição <span>(obrigatório)</span>
      <textarea
        id={id}
        rows={3}
        maxLength={1000}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Explique o que precisa de ser corrigido"
      />
    </label>
  )
}

export function AdminPropertiesPage() {
  const { csrfToken } = useAuth()
  const client = useQueryClient()
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const query = useQuery({ queryKey: ['admin', 'properties'], queryFn: adminApi.getProperties })
  const review = useMutation({
    mutationFn: ({
      property,
      decision,
    }: {
      property: ApiAdminProperty
      decision: 'APPROVE' | 'REJECT'
    }) => {
      if (!csrfToken) throw new Error('Actualize a sessão antes de continuar.')
      return adminApi.reviewProperty(csrfToken, property.id, {
        decision,
        ...(decision === 'REJECT' ? { reason: reasons[property.id]?.trim() } : {}),
      })
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['admin'] })
    },
  })
  return (
    <section className="admin-section">
      <AdminHeading eyebrow="Moderação" title="Anúncios pendentes">
        Confirme informação e fotografias antes de publicar um anúncio.
      </AdminHeading>
      {review.error && (
        <div className="admin-error" role="alert">
          {messageFor(review.error)}
        </div>
      )}
      <QueryState
        pending={query.isPending}
        error={query.error}
        empty={!query.isPending && !query.error && query.data?.length === 0}
      />
      {query.data?.map((property) => (
        <article className="admin-review-card" key={property.id}>
          <div className="admin-review-card__visual">
            {property.images[0] ? (
              <img
                src={apiAssetUrl(property.images[0].imageUrl)}
                alt={property.images[0].altText ?? property.title}
              />
            ) : (
              <Building2 size={28} />
            )}
          </div>
          <div className="admin-review-card__body">
            <div className="admin-card-eyebrow">
              Ref. {property.reference} · recebido {formatDate(property.createdAt)}
            </div>
            <h2>{property.title}</h2>
            <p className="admin-property-facts">
              {property.neighborhood.name}, {property.neighborhood.city} ·{' '}
              {formatMoney(property.monthlyRent)} · {property.bedrooms} quartos ·{' '}
              {property.bathrooms} WCs
            </p>
            <p className="admin-description">{property.description}</p>
            <div className="admin-feature-list">
              {property.features.map((feature) => (
                <span key={feature.slug}>{feature.name}</span>
              ))}
            </div>
            <div className="admin-advertiser">
              <strong>{property.advertiser.name}</strong>
              <span>
                {property.advertiser.email}
                {property.advertiser.phone ? ` · ${property.advertiser.phone}` : ''}
              </span>
              <small>
                {property.advertiser.type === 'OWNER' ? 'Proprietário' : 'Agente'} · identidade{' '}
                {property.advertiser.verificationStatus === 'APPROVED'
                  ? 'verificada'
                  : 'por verificar'}
              </small>
            </div>
            <ReviewReason
              id={`property-reason-${property.id}`}
              value={reasons[property.id] ?? ''}
              onChange={(value) => setReasons((current) => ({ ...current, [property.id]: value }))}
            />
            <div className="admin-actions">
              <button
                className="button-primary"
                type="button"
                disabled={review.isPending}
                onClick={() => review.mutate({ property, decision: 'APPROVE' })}
              >
                <Check size={15} /> Aprovar anúncio
              </button>
              <button
                className="button-secondary"
                type="button"
                disabled={review.isPending || (reasons[property.id]?.trim().length ?? 0) < 10}
                onClick={() => review.mutate({ property, decision: 'REJECT' })}
              >
                <X size={15} /> Rejeitar com motivo
              </button>
            </div>
          </div>
        </article>
      ))}
    </section>
  )
}

export function AdminVerificationPage() {
  const { csrfToken } = useAuth()
  const client = useQueryClient()
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['admin', 'verifications'],
    queryFn: adminApi.getVerificationRequests,
  })
  const review = useMutation({
    mutationFn: ({
      item,
      decision,
    }: {
      item: ApiAdminVerificationRequest
      decision: 'APPROVE' | 'REJECT'
    }) => {
      if (!csrfToken) throw new Error('Actualize a sessão antes de continuar.')
      return adminApi.reviewVerification(csrfToken, item.id, {
        decision,
        ...(decision === 'REJECT' ? { reason: reasons[item.id]?.trim() } : {}),
      })
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['admin'] })
    },
  })
  return (
    <section className="admin-section">
      <AdminHeading eyebrow="Identidade e autorização" title="Verificações pendentes">
        Consulte os documentos privados e registe a decisão de revisão.
      </AdminHeading>
      {review.error && (
        <div className="admin-error" role="alert">
          {messageFor(review.error)}
        </div>
      )}
      {downloadError && (
        <div className="admin-error" role="alert">
          {downloadError}
        </div>
      )}
      <QueryState
        pending={query.isPending}
        error={query.error}
        empty={!query.isPending && !query.error && query.data?.length === 0}
      />
      {query.data?.map((item) => (
        <article className="admin-review-card admin-review-card--compact" key={item.id}>
          <div className="admin-review-card__icon">
            <FileCheck2 size={22} />
          </div>
          <div className="admin-review-card__body">
            <div className="admin-card-eyebrow">
              {formatDate(item.createdAt)} · {item.documents.length} documento(s)
            </div>
            <h2>
              {item.verificationType === 'IDENTITY' ? 'Identidade' : 'Autorização para anunciar'}
            </h2>
            <p className="admin-property-facts">
              {item.advertiser.name} · {item.advertiser.email} ·{' '}
              {item.advertiser.type === 'OWNER' ? 'Proprietário' : 'Agente'}
            </p>
            <div className="admin-documents">
              {item.documents.map((document) => (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => {
                    setDownloadError(null)
                    void adminApi
                      .downloadVerificationDocument(item.id, document.id)
                      .catch((error: unknown) => setDownloadError(messageFor(error)))
                  }}
                >
                  <FileText size={15} />
                  <span>
                    {document.documentType === 'IDENTITY_DOCUMENT'
                      ? 'Documento de identidade'
                      : 'Autorização'}{' '}
                    · {document.mimeType === 'application/pdf' ? 'PDF' : 'Imagem'} ·{' '}
                    {formatBytes(document.fileSize)}
                  </span>
                </button>
              ))}
            </div>
            <ReviewReason
              id={`verification-reason-${item.id}`}
              value={reasons[item.id] ?? ''}
              onChange={(value) => setReasons((current) => ({ ...current, [item.id]: value }))}
            />
            <div className="admin-actions">
              <button
                className="button-primary"
                type="button"
                disabled={review.isPending}
                onClick={() => review.mutate({ item, decision: 'APPROVE' })}
              >
                <Check size={15} /> Aprovar verificação
              </button>
              <button
                className="button-secondary"
                type="button"
                disabled={review.isPending || (reasons[item.id]?.trim().length ?? 0) < 10}
                onClick={() => review.mutate({ item, decision: 'REJECT' })}
              >
                <X size={15} /> Rejeitar com motivo
              </button>
            </div>
          </div>
        </article>
      ))}
    </section>
  )
}

const reportLabels: Record<ApiAdminReport['reason'], string> = {
  INCORRECT_INFORMATION: 'Informação incorrecta',
  POSSIBLE_FRAUD: 'Possível fraude',
  UNAVAILABLE_PROPERTY: 'Imóvel indisponível',
  UNAUTHORIZED_LISTING: 'Sem autorização para anunciar',
  OTHER: 'Outro motivo',
}

export function AdminReportsPage() {
  const { csrfToken } = useAuth()
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin', 'reports'], queryFn: adminApi.getReports })
  const update = useMutation({
    mutationFn: ({
      report,
      status,
    }: {
      report: ApiAdminReport
      status: ApiAdminReport['status']
    }) => {
      if (!csrfToken) throw new Error('Actualize a sessão antes de continuar.')
      return adminApi.updateReport(csrfToken, report.id, status)
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['admin'] })
    },
  })
  return (
    <section className="admin-section">
      <AdminHeading eyebrow="Segurança e confiança" title="Denúncias">
        Acompanhe os relatos sobre anúncios reais e registe o resultado.
      </AdminHeading>
      {update.error && (
        <div className="admin-error" role="alert">
          {messageFor(update.error)}
        </div>
      )}
      <QueryState
        pending={query.isPending}
        error={query.error}
        empty={!query.isPending && !query.error && query.data?.length === 0}
      />
      {query.data?.map((report) => (
        <article className="admin-report-card" key={report.id}>
          <div className="admin-card-eyebrow">
            Recebida {formatDate(report.createdAt)} · {report.status.replaceAll('_', ' ')}
          </div>
          <h2>
            {report.property.title} <small>Ref. {report.property.reference}</small>
          </h2>
          <strong>{reportLabels[report.reason]}</strong>
          <p>{report.description || 'Sem descrição adicional.'}</p>
          <small>
            Reportado por{' '}
            {report.reporter
              ? `${report.reporter.name} · ${report.reporter.email}`
              : 'visitante sem conta'}
          </small>
          <div className="admin-actions">
            <button
              className="button-secondary"
              type="button"
              disabled={update.isPending}
              onClick={() => update.mutate({ report, status: 'UNDER_REVIEW' })}
            >
              Em análise
            </button>
            <button
              className="button-secondary"
              type="button"
              disabled={update.isPending}
              onClick={() => update.mutate({ report, status: 'NEEDS_INFORMATION' })}
            >
              Pedir informação
            </button>
            <button
              className="button-primary"
              type="button"
              disabled={update.isPending}
              onClick={() => update.mutate({ report, status: 'RESOLVED' })}
            >
              Resolver
            </button>
            <button
              className="button-quiet"
              type="button"
              disabled={update.isPending}
              onClick={() => update.mutate({ report, status: 'DISMISSED' })}
            >
              Arquivar
            </button>
          </div>
        </article>
      ))}
    </section>
  )
}

export function AdminUsersPage() {
  const { user: actor, csrfToken } = useAuth()
  const client = useQueryClient()
  const [search, setSearch] = useState('')
  const query = useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: () => adminApi.getUsers(search),
  })
  const update = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'ACTIVE' | 'SUSPENDED' }) => {
      if (!csrfToken) throw new Error('Actualize a sessão antes de continuar.')
      return adminApi.setUserStatus(csrfToken, userId, status)
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['admin'] })
    },
  })
  return (
    <section className="admin-section">
      <AdminHeading eyebrow="Contas Roof Tech" title="Utilizadores">
        Consulte contas registadas e suspenda ou reactive o acesso.
      </AdminHeading>
      <label className="admin-search">
        Pesquisar por nome ou e-mail
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Ex.: nome@dominio.com"
        />
      </label>
      {update.error && (
        <div className="admin-error" role="alert">
          {messageFor(update.error)}
        </div>
      )}
      <QueryState
        pending={query.isPending}
        error={query.error}
        empty={!query.isPending && !query.error && query.data?.length === 0}
      />
      {query.data && query.data.length > 0 && (
        <div className="admin-user-list">
          {query.data.map((item) => (
            <article className="admin-user-row" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span>
                  {item.email}
                  {item.phone ? ` · ${item.phone}` : ''}
                </span>
                <small>
                  {item.role === 'ADMIN'
                    ? 'Administrador'
                    : item.role === 'ADVERTISER'
                      ? `Anunciante${item.advertiserType ? ` · ${item.advertiserType === 'OWNER' ? 'proprietário' : 'agente'}` : ''}`
                      : 'Cliente'}{' '}
                  · registado {formatDate(item.createdAt)}
                </small>
              </div>
              <div className="admin-user-row__actions">
                <span
                  className={`admin-user-status admin-user-status--${item.status.toLowerCase()}`}
                >
                  {item.status === 'ACTIVE'
                    ? 'Activa'
                    : item.status === 'SUSPENDED'
                      ? 'Suspensa'
                      : 'Pendente'}
                </span>
                <button
                  className={item.status === 'SUSPENDED' ? 'button-primary' : 'button-secondary'}
                  type="button"
                  disabled={update.isPending || item.id === actor?.id || item.status === 'PENDING'}
                  onClick={() =>
                    update.mutate({
                      userId: item.id,
                      status: item.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED',
                    })
                  }
                >
                  {item.status === 'SUSPENDED' ? 'Reactivar' : 'Suspender'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export function AdminAuditPage() {
  const query = useQuery({ queryKey: ['admin', 'audit'], queryFn: adminApi.getAuditLogs })
  return (
    <section className="admin-section">
      <AdminHeading eyebrow="Rastreabilidade" title="Auditoria">
        Registo cronológico das decisões e alterações feitas na plataforma.
      </AdminHeading>
      <QueryState
        pending={query.isPending}
        error={query.error}
        empty={!query.isPending && !query.error && query.data?.length === 0}
      />
      {query.data && <AuditList items={query.data} />}
    </section>
  )
}

function AuditList({ items }: { items: ApiAdminAuditEntry[] }) {
  if (!items.length) return <div className="admin-empty">Ainda não há actividade registada.</div>
  return (
    <div className="admin-audit-list">
      {items.map((item) => (
        <article className="admin-audit-row" key={item.id}>
          <span className="admin-audit-row__icon">
            <ClipboardList size={16} />
          </span>
          <div>
            <strong>{item.action.replaceAll('.', ' ').replaceAll('_', ' ')}</strong>
            <small>
              {item.actor ? `${item.actor.name} · ${item.actor.email}` : 'Sistema / visitante'} ·{' '}
              {item.entityType} {item.entityId}
            </small>
            {item.metadata && (
              <details>
                <summary>Ver detalhes</summary>
                <pre>{JSON.stringify(item.metadata, null, 2)}</pre>
              </details>
            )}
          </div>
          <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
        </article>
      ))}
    </div>
  )
}
