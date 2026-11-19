import { useEffect, useState, type FormEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  Building2,
  Camera,
  Check,
  CircleAlert,
  CircleHelp,
  Clock3,
  FileCheck2,
  FileText,
  House,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react'
import { useForm, useWatch, type FieldPath } from 'react-hook-form'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router'
import { z } from 'zod'
import type { ApiAdvertiserProperty, ApiAdvertiserVerificationRequest } from '@roof-tech/shared'
import { useAuth } from '../contexts/use-auth'
import { apiAssetUrl } from '../services/api-url'
import {
  advertiserApi,
  AdvertiserApiError,
  type PropertyDraftPayload,
} from '../services/advertiser-api'
import { PublicShell } from '../components/public/PublicSite'
import '../pages/advertiser.css'

const moderationLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  SUSPENDED: 'Suspenso',
  ARCHIVED: 'Arquivado',
}

const availabilityLabels: Record<string, string> = {
  UNCONFIRMED: 'Por confirmar',
  AVAILABLE: 'Disponível',
  UNAVAILABLE: 'Indisponível',
}

const verificationLabels: Record<string, string> = {
  NOT_SUBMITTED: 'Por iniciar',
  PENDING: 'Em análise',
  APPROVED: 'Verificado',
  REJECTED: 'Precisa de atenção',
}

const verificationTypeLabels: Record<string, string> = {
  IDENTITY: 'Identidade',
  LISTING_AUTHORIZATION: 'Autorização para anunciar',
}

const propertyTypeLabels: Record<string, string> = {
  HOUSE: 'Moradia',
  APARTMENT: 'Apartamento',
  ROOM: 'Quarto',
  ANNEX: 'Dependência',
}

const propertyFormSchema = z.object({
  title: z.string().trim().min(6, 'Use pelo menos 6 caracteres.').max(160),
  description: z
    .string()
    .trim()
    .min(30, 'Descreva o imóvel em pelo menos 30 caracteres.')
    .max(5000),
  propertyType: z.enum(['HOUSE', 'APARTMENT', 'ROOM', 'ANNEX']),
  neighborhoodId: z.uuid('Seleccione um bairro.'),
  monthlyRent: z
    .string()
    .regex(/^\d{1,10}(?:\.\d{1,2})?$/, 'Indique um valor até duas casas decimais.')
    .refine((value) => !/^0(?:\.0{1,2})?$/.test(value), 'A renda deve ser superior a zero.'),
  depositAmount: z
    .string()
    .refine((value) => value === '' || /^\d{1,10}(?:\.\d{1,2})?$/.test(value), 'Valor inválido.'),
  visitFee: z
    .string()
    .refine((value) => value === '' || /^\d{1,10}(?:\.\d{1,2})?$/.test(value), 'Valor inválido.'),
  otherInitialCost: z
    .string()
    .refine((value) => value === '' || /^\d{1,10}(?:\.\d{1,2})?$/.test(value), 'Valor inválido.'),
  bedrooms: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((value) => value <= 20, 'Máximo de 20 quartos.'),
  bathrooms: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((value) => value >= 1 && value <= 20, 'Indique entre 1 e 20 WCs.'),
  parkingSpaces: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((value) => value <= 20, 'Máximo de 20 vagas.'),
  areaM2: z
    .string()
    .refine(
      (value) => value === '' || /^\d{1,6}(?:\.\d{1,2})?$/.test(value),
      'Indique a área em m².',
    ),
  featureSlugs: z.array(z.string()),
})

type PropertyFormInput = z.input<typeof propertyFormSchema>
type PropertyFormOutput = z.output<typeof propertyFormSchema>

const defaultPropertyValues: PropertyFormInput = {
  title: '',
  description: '',
  propertyType: 'HOUSE',
  neighborhoodId: '',
  monthlyRent: '',
  depositAmount: '',
  visitFee: '',
  otherInitialCost: '',
  bedrooms: '0',
  bathrooms: '1',
  parkingSpaces: '0',
  areaM2: '',
  featureSlugs: [],
}

const propertySteps: { label: string; fields: FieldPath<PropertyFormInput>[] }[] = [
  { label: 'Imóvel', fields: ['propertyType', 'title', 'description'] },
  { label: 'Localização', fields: ['neighborhoodId'] },
  {
    label: 'Características',
    fields: ['bedrooms', 'bathrooms', 'parkingSpaces', 'areaM2', 'featureSlugs'],
  },
  { label: 'Preço', fields: ['monthlyRent', 'depositAmount', 'visitFee', 'otherInitialCost'] },
  { label: 'Fotografias', fields: [] },
  { label: 'Revisão', fields: [] },
]

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Não foi possível concluir o pedido. Tente novamente.'
}

function formatMoney(value: string | null) {
  if (value === null) return 'Não indicado'
  return `${new Intl.NumberFormat('pt-MZ', { maximumFractionDigits: 2 }).format(Number(value))} MT`
}

function StatusTag({ status }: { status: string }) {
  return (
    <span className={`advertiser-status advertiser-status--${status.toLowerCase()}`}>
      {moderationLabels[status] ?? status}
    </span>
  )
}

export function ProtectedAdvertiserRoute() {
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
      <main className="advertiser-guard">
        <CircleAlert size={22} />
        <h1>Painel indisponível</h1>
        <p>{error ?? 'Não foi possível verificar a sua sessão.'}</p>
        <button className="button-primary" type="button" onClick={() => void refreshSession()}>
          Tentar novamente
        </button>
      </main>
    )
  }
  if (!user)
    return (
      <Navigate
        to={`/entrar?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    )
  if (user.role !== 'ADVERTISER') return <Navigate to="/conta" replace />
  return <Outlet />
}

export function AdvertiserLayout() {
  return (
    <PublicShell>
      <main className="advertiser-page">
        <div className="advertiser-layout">
          <aside className="advertiser-sidebar" aria-label="Menu do anunciante">
            <div className="advertiser-sidebar__heading">
              <Building2 size={18} />
              <span>Painel do anunciante</span>
            </div>
            <NavLink to="/anunciante" end>
              <House size={16} />
              Visão geral
            </NavLink>
            <NavLink to="/anunciante/imoveis">
              <Building2 size={16} />
              Os meus imóveis
            </NavLink>
            <NavLink to="/anunciante/verificacao">
              <ShieldCheck size={16} />
              Verificação
            </NavLink>
            <Link className="advertiser-sidebar__new" to="/anunciante/imoveis/novo">
              <Plus size={16} />
              Novo anúncio
            </Link>
          </aside>
          <div className="advertiser-content">
            <Outlet />
          </div>
        </div>
      </main>
    </PublicShell>
  )
}

export function AdvertiserDashboardPage() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['advertiser', 'dashboard'],
    queryFn: advertiserApi.getDashboard,
  })
  const summary = data?.summary
  const statCards = [
    { label: 'Anúncios activos', value: summary?.active ?? 0, tone: 'green' },
    { label: 'Pendentes de análise', value: summary?.pending ?? 0, tone: 'amber' },
    { label: 'Indisponíveis', value: summary?.unavailable ?? 0, tone: 'neutral' },
    { label: 'Rascunhos', value: summary?.drafts ?? 0, tone: 'neutral' },
    { label: 'Rejeitados', value: summary?.rejected ?? 0, tone: 'amber' },
    { label: 'Suspensos', value: summary?.suspended ?? 0, tone: 'neutral' },
  ]

  return (
    <section className="advertiser-section">
      <div className="advertiser-heading-row">
        <div>
          <span className="public-eyebrow">Área do anunciante</span>
          <h1>Visão geral</h1>
          <p>Acompanhe os seus imóveis e os pedidos que precisam de atenção.</p>
        </div>
        <Link className="button-primary advertiser-cta" to="/anunciante/imoveis/novo">
          <Plus size={16} />
          Criar anúncio
        </Link>
      </div>
      {isPending && (
        <div className="advertiser-loading" role="status">
          A carregar os seus dados…
        </div>
      )}
      {isError && (
        <div className="advertiser-error" role="alert">
          {errorMessage(error)}{' '}
          <button type="button" onClick={() => void refetch()}>
            Tentar novamente
          </button>
        </div>
      )}
      {data && (
        <>
          <div className="advertiser-stat-grid">
            {statCards.map((card) => (
              <div className={`advertiser-stat advertiser-stat--${card.tone}`} key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </div>
            ))}
          </div>
          <div className="advertiser-attention-grid">
            <Link className="advertiser-attention-card" to="/anunciante/verificacao">
              <span className="advertiser-attention-card__icon">
                <ShieldCheck size={18} />
              </span>
              <span>
                <strong>Verificação de identidade</strong>
                <small>{verificationLabels[data.verification.identity] ?? 'Por iniciar'}</small>
              </span>
              <ArrowRight size={16} />
            </Link>
            <Link className="advertiser-attention-card" to="/anunciante/verificacao">
              <span className="advertiser-attention-card__icon">
                <FileCheck2 size={18} />
              </span>
              <span>
                <strong>Autorização para anunciar</strong>
                <small>
                  {verificationLabels[data.verification.listingAuthorization] ?? 'Por iniciar'}
                </small>
              </span>
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="advertiser-panel">
            <div className="advertiser-panel__heading">
              <div>
                <h2>Actividade recente</h2>
                <p>{summary?.total ?? 0} anúncios no total</p>
              </div>
              <Link to="/anunciante/imoveis">
                Ver todos <ArrowRight size={14} />
              </Link>
            </div>
            {data.recentProperties.length > 0 ? (
              <div className="advertiser-recent-list">
                {data.recentProperties.map((property) => (
                  <PropertyRow key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <div className="advertiser-empty">
                <Building2 size={24} />
                <strong>Ainda não criou anúncios</strong>
                <p>Comece por guardar um rascunho e adicionar fotografias.</p>
                <Link className="button-secondary" to="/anunciante/imoveis/novo">
                  Criar o primeiro anúncio
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function PropertyRow({ property }: { property: ApiAdvertiserProperty }) {
  return (
    <article className="advertiser-property-row">
      <div className="advertiser-property-row__image">
        {property.images[0] ? (
          <img
            src={apiAssetUrl(property.images[0].imageUrl)}
            alt={property.images[0].altText ?? property.title}
          />
        ) : (
          <Camera size={20} />
        )}
      </div>
      <div className="advertiser-property-row__main">
        <strong>{property.title || 'Rascunho sem título'}</strong>
        <span>
          {property.location.neighborhood} · {propertyTypeLabels[property.propertyType]}
        </span>
        <small>{property.reference}</small>
      </div>
      <div className="advertiser-property-row__meta">
        <strong>
          {formatMoney(property.monthlyRent)}
          <small>/ mês</small>
        </strong>
        <StatusTag status={property.moderationStatus} />
      </div>
      <Link
        className="advertiser-icon-link"
        to={`/anunciante/imoveis/${property.id}/editar`}
        aria-label={`Editar ${property.title}`}
      >
        <ArrowRight size={17} />
      </Link>
    </article>
  )
}

export function AdvertiserPropertiesPage() {
  const queryClient = useQueryClient()
  const { csrfToken } = useAuth()
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['advertiser', 'properties'],
    queryFn: advertiserApi.getProperties,
  })
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['advertiser', 'properties'] }),
      queryClient.invalidateQueries({ queryKey: ['advertiser', 'dashboard'] }),
    ])
  }
  const submitMutation = useMutation({
    mutationFn: (id: string) => advertiserApi.submitProperty(csrfToken ?? '', id),
    onSuccess: refresh,
  })
  const availabilityMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'AVAILABLE' | 'UNAVAILABLE' }) =>
      advertiserApi.setAvailability(csrfToken ?? '', id, status),
    onSuccess: refresh,
  })
  const archiveMutation = useMutation({
    mutationFn: (id: string) => advertiserApi.archiveProperty(csrfToken ?? '', id),
    onSuccess: refresh,
  })
  const [actionError, setActionError] = useState<string | null>(null)

  const runAction = async (action: () => Promise<unknown>) => {
    setActionError(null)
    try {
      await action()
    } catch (cause) {
      setActionError(errorMessage(cause))
    }
  }

  return (
    <section className="advertiser-section">
      <div className="advertiser-heading-row">
        <div>
          <span className="public-eyebrow">Gestão de anúncios</span>
          <h1>Os meus imóveis</h1>
          <p>Edite rascunhos, acompanhe a análise e actualize a disponibilidade.</p>
        </div>
        <Link className="button-primary advertiser-cta" to="/anunciante/imoveis/novo">
          <Plus size={16} />
          Novo anúncio
        </Link>
      </div>
      {isPending && (
        <div className="advertiser-loading" role="status">
          A carregar os seus imóveis…
        </div>
      )}
      {isError && (
        <div className="advertiser-error" role="alert">
          {errorMessage(error)}{' '}
          <button type="button" onClick={() => void refetch()}>
            Tentar novamente
          </button>
        </div>
      )}
      {actionError && (
        <div className="advertiser-error" role="alert">
          {actionError}
        </div>
      )}
      {submitMutation.isPending || availabilityMutation.isPending || archiveMutation.isPending ? (
        <div className="advertiser-inline-progress" role="status">
          A guardar a alteração…
        </div>
      ) : null}
      {data && data.items.length > 0 && (
        <div className="advertiser-property-list">
          {data.items.map((property) => {
            const canEdit =
              property.moderationStatus !== 'SUSPENDED' && property.moderationStatus !== 'ARCHIVED'
            return (
              <article className="advertiser-listing-card" key={property.id}>
                <div className="advertiser-listing-card__visual">
                  {property.images[0] ? (
                    <img
                      src={apiAssetUrl(property.images[0].imageUrl)}
                      alt={property.images[0].altText ?? property.title}
                    />
                  ) : (
                    <Camera size={25} />
                  )}
                  <span>{availabilityLabels[property.availabilityStatus]}</span>
                </div>
                <div className="advertiser-listing-card__content">
                  <div className="advertiser-listing-card__top">
                    <div>
                      <span className="advertiser-reference">
                        {property.reference} · {property.location.neighborhood}
                      </span>
                      <h2>{property.title || 'Rascunho sem título'}</h2>
                    </div>
                    <StatusTag status={property.moderationStatus} />
                  </div>
                  <div className="advertiser-listing-card__facts">
                    <span>{propertyTypeLabels[property.propertyType]}</span>
                    <span>{property.bedrooms} quartos</span>
                    <span>{property.images.length} fotografias</span>
                    <strong>
                      {formatMoney(property.monthlyRent)}
                      <small>/ mês</small>
                    </strong>
                  </div>
                  {property.moderationStatus === 'REJECTED' && property.moderationNote && (
                    <div className="advertiser-note" role="status">
                      Motivo da rejeição: {property.moderationNote}
                    </div>
                  )}
                  <div className="advertiser-listing-card__actions">
                    {canEdit && (
                      <Link
                        className="button-secondary"
                        to={`/anunciante/imoveis/${property.id}/editar`}
                      >
                        Editar anúncio
                      </Link>
                    )}
                    {(property.moderationStatus === 'DRAFT' ||
                      property.moderationStatus === 'REJECTED') && (
                      <button
                        className="button-primary"
                        type="button"
                        disabled={submitMutation.isPending || property.images.length === 0}
                        title={
                          property.images.length === 0
                            ? 'Adicione uma fotografia antes de submeter.'
                            : undefined
                        }
                        onClick={() =>
                          void runAction(() => submitMutation.mutateAsync(property.id))
                        }
                      >
                        Submeter para análise
                      </button>
                    )}
                    {property.moderationStatus === 'APPROVED' && (
                      <button
                        className="button-secondary"
                        type="button"
                        onClick={() =>
                          void runAction(() =>
                            availabilityMutation.mutateAsync({
                              id: property.id,
                              status:
                                property.availabilityStatus === 'AVAILABLE'
                                  ? 'UNAVAILABLE'
                                  : 'AVAILABLE',
                            }),
                          )
                        }
                      >
                        {property.availabilityStatus === 'AVAILABLE'
                          ? 'Marcar arrendado / indisponível'
                          : 'Marcar disponível'}
                      </button>
                    )}
                    {property.moderationStatus !== 'ARCHIVED' &&
                      property.moderationStatus !== 'SUSPENDED' && (
                        <button
                          className="button-quiet-danger"
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                'Arquivar este anúncio? Deixará de aparecer nos resultados públicos.',
                              )
                            )
                              void runAction(() => archiveMutation.mutateAsync(property.id))
                          }}
                        >
                          Arquivar
                        </button>
                      )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
      {data && data.items.length === 0 && (
        <div className="advertiser-empty">
          <Building2 size={25} />
          <strong>Nenhum anúncio ainda</strong>
          <p>Os anúncios ficam privados enquanto são rascunhos.</p>
          <Link className="button-primary" to="/anunciante/imoveis/novo">
            Criar anúncio
          </Link>
        </div>
      )}
    </section>
  )
}

export function AdvertiserPropertyFormPage() {
  const { propertyId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { csrfToken } = useAuth()
  const [step, setStep] = useState(0)
  const [savedProperty, setSavedProperty] = useState<ApiAdvertiserProperty | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const {
    data: existingProperty,
    isPending: loadingProperty,
    isError: propertyError,
  } = useQuery({
    queryKey: ['advertiser', 'property', propertyId],
    queryFn: () => advertiserApi.getProperty(propertyId!),
    enabled: Boolean(propertyId),
  })
  const { data: neighborhoods = [], isPending: loadingNeighborhoods } = useQuery({
    queryKey: ['neighborhoods', 'maputo'],
    queryFn: advertiserApi.getNeighborhoods,
  })
  const { data: features = [] } = useQuery({
    queryKey: ['advertiser', 'features'],
    queryFn: advertiserApi.getFeatures,
  })

  const form = useForm<PropertyFormInput, unknown, PropertyFormOutput>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: defaultPropertyValues,
    mode: 'onBlur',
  })
  const {
    register,
    handleSubmit,
    trigger,
    reset,
    control,
    setValue,
    formState: { errors },
  } = form
  const watchedValues = useWatch({ control })
  const featureSlugs = watchedValues.featureSlugs ?? []
  const activeProperty = savedProperty ?? existingProperty ?? null
  const restricted =
    activeProperty?.moderationStatus === 'SUSPENDED' ||
    activeProperty?.moderationStatus === 'ARCHIVED'

  useEffect(() => {
    if (!existingProperty) return
    reset({
      title: existingProperty.title,
      description: existingProperty.description,
      propertyType: existingProperty.propertyType,
      neighborhoodId: existingProperty.location.neighborhoodId,
      monthlyRent: existingProperty.monthlyRent,
      depositAmount: existingProperty.depositAmount ?? '',
      visitFee: existingProperty.visitFee ?? '',
      otherInitialCost: existingProperty.otherInitialCost ?? '',
      bedrooms: String(existingProperty.bedrooms),
      bathrooms: String(existingProperty.bathrooms),
      parkingSpaces: String(existingProperty.parkingSpaces),
      areaM2: existingProperty.areaM2 ?? '',
      featureSlugs: existingProperty.features.map((feature) => feature.slug),
    })
  }, [existingProperty, reset])

  const refreshData = async (property: ApiAdvertiserProperty) => {
    setSavedProperty(property)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['advertiser', 'properties'] }),
      queryClient.invalidateQueries({ queryKey: ['advertiser', 'dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['advertiser', 'property', property.id] }),
    ])
  }

  const persistDraft = async (): Promise<ApiAdvertiserProperty | null> => {
    setError(null)
    setNotice(null)
    let result: ApiAdvertiserProperty | null = null
    setSaving(true)
    await handleSubmit(
      async (values) => {
        try {
          if (!csrfToken) throw new AdvertiserApiError('Actualize a sessão antes de guardar.', 403)
          const payload: PropertyDraftPayload = values
          const currentId = propertyId ?? savedProperty?.id
          const property = currentId
            ? await advertiserApi.updateProperty(csrfToken, currentId, payload)
            : await advertiserApi.createDraft(csrfToken, payload)
          result = property
          await refreshData(property)
          setNotice(
            property.moderationStatus === 'PENDING'
              ? 'Alterações guardadas e enviadas para análise.'
              : 'Rascunho guardado.',
          )
        } catch (cause) {
          setError(errorMessage(cause))
        } finally {
          setSaving(false)
        }
      },
      () => {
        setSaving(false)
        setError('Revise os campos assinalados antes de continuar.')
      },
    )()
    return result
  }

  const nextStep = async () => {
    setError(null)
    const fields = propertySteps[step]?.fields ?? []
    if (fields.length > 0 && !(await trigger(fields))) {
      setError('Revise os campos assinalados antes de continuar.')
      return
    }
    if (step === 3) {
      const saved = await persistDraft()
      if (!saved) return
    } else if (step === 4 && !(await persistDraft())) {
      return
    }
    setStep((current) => Math.min(current + 1, propertySteps.length - 1))
  }

  const previousStep = () => setStep((current) => Math.max(current - 1, 0))

  const uploadSelectedFiles = async () => {
    const id = propertyId ?? savedProperty?.id
    if (!id || !csrfToken) {
      setError('Guarde o rascunho antes de carregar fotografias.')
      return
    }
    const existingCount = activeProperty?.images.length ?? 0
    if (existingCount + selectedFiles.length > 10) {
      setError('Cada anúncio pode ter no máximo 10 fotografias.')
      return
    }
    if (selectedFiles.some((file) => file.size > 8 * 1024 * 1024)) {
      setError('Cada fotografia deve ter no máximo 8 MB.')
      return
    }
    setError(null)
    setNotice(null)
    setUploading(true)
    const filesToUpload = selectedFiles
    try {
      let current = activeProperty
      for (const [index, file] of filesToUpload.entries()) {
        current = await advertiserApi.uploadImage(csrfToken, id, file)
        setSavedProperty(current)
        setSelectedFiles(filesToUpload.slice(index + 1))
      }
      setSelectedFiles([])
      await refreshData(current!)
      setNotice('Fotografias optimizadas e guardadas.')
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setUploading(false)
    }
  }

  const submitForReview = async () => {
    const id = propertyId ?? savedProperty?.id
    if (!id || !csrfToken) return
    const saved = await persistDraft()
    if (!saved) return
    if (saved.images.length === 0) {
      setError('Adicione pelo menos uma fotografia antes de submeter.')
      return
    }
    if (saved.moderationStatus === 'PENDING') {
      await queryClient.invalidateQueries({ queryKey: ['advertiser'] })
      navigate('/anunciante/imoveis')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await advertiserApi.submitProperty(csrfToken, id)
      await queryClient.invalidateQueries({ queryKey: ['advertiser'] })
      navigate('/anunciante/imoveis')
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  const deleteImage = async (imageId: string) => {
    const id = propertyId ?? savedProperty?.id
    if (!id || !csrfToken) return
    if (!window.confirm('Remover esta fotografia do anúncio?')) return
    setError(null)
    try {
      const property = await advertiserApi.deleteImage(csrfToken, id, imageId)
      await refreshData(property)
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  const moveImage = async (imageIndex: number, direction: -1 | 1) => {
    const id = propertyId ?? savedProperty?.id
    const images = activeProperty?.images ?? []
    const otherIndex = imageIndex + direction
    if (!id || !csrfToken || otherIndex < 0 || otherIndex >= images.length) return
    const imageIds = images.map((image) => image.id)
    ;[imageIds[imageIndex], imageIds[otherIndex]] = [imageIds[otherIndex]!, imageIds[imageIndex]!]
    try {
      const property = await advertiserApi.reorderImages(csrfToken, id, imageIds)
      await refreshData(property)
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  if (propertyId && loadingProperty)
    return (
      <section className="advertiser-section">
        <div className="advertiser-loading" role="status">
          A carregar o anúncio…
        </div>
      </section>
    )
  if (propertyId && (propertyError || !existingProperty))
    return (
      <section className="advertiser-section">
        <div className="advertiser-error" role="alert">
          Não foi possível abrir este anúncio.{' '}
          <Link to="/anunciante/imoveis">Voltar aos imóveis</Link>
        </div>
      </section>
    )
  if (restricted)
    return (
      <section className="advertiser-section">
        <div className="advertiser-error" role="alert">
          Este anúncio está arquivado ou suspenso e não pode ser editado.
          <Link to="/anunciante/imoveis">Voltar aos imóveis</Link>
        </div>
      </section>
    )

  return (
    <section className="advertiser-section advertiser-form-page">
      <div className="advertiser-heading-row advertiser-heading-row--form">
        <div>
          <span className="public-eyebrow">{propertyId ? 'Editar anúncio' : 'Novo anúncio'}</span>
          <h1>{propertyId ? activeProperty?.title || 'Editar rascunho' : 'Criar anúncio'}</h1>
          <p>
            {activeProperty?.moderationStatus === 'APPROVED' ||
            activeProperty?.moderationStatus === 'PENDING'
              ? 'As alterações ficam pendentes até à revisão de um administrador.'
              : 'Preencha os dados e guarde o anúncio como rascunho antes da revisão.'}
          </p>
        </div>
        <Link className="advertiser-back-link" to="/anunciante/imoveis">
          <ArrowLeft size={15} />
          Os meus imóveis
        </Link>
      </div>
      <ol className="advertiser-stepper" aria-label="Etapas do anúncio">
        {propertySteps.map((item, index) => (
          <li
            key={item.label}
            className={index === step ? 'active' : index < step ? 'complete' : ''}
          >
            <span>{index < step ? <Check size={13} /> : index + 1}</span>
            <small>{item.label}</small>
          </li>
        ))}
      </ol>
      {notice && (
        <div className="advertiser-success" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="advertiser-error" role="alert">
          {error}
        </div>
      )}

      <form
        className="advertiser-form-card"
        onSubmit={(event) => {
          event.preventDefault()
          void nextStep()
        }}
        noValidate
      >
        {step <= 3 && (
          <fieldset
            disabled={saving || restricted}
            className="advertiser-fields"
            key={`step-${step}`}
          >
            {step === 0 && (
              <>
                <h2>Sobre o imóvel</h2>
                <p className="advertiser-form-help">
                  Comece por identificar o tipo e apresentar o anúncio com clareza.
                </p>
                <label className="advertiser-field">
                  <span>Tipo de imóvel</span>
                  <select {...register('propertyType')}>
                    <option value="HOUSE">Moradia</option>
                    <option value="APARTMENT">Apartamento</option>
                    <option value="ROOM">Quarto</option>
                    <option value="ANNEX">Dependência</option>
                  </select>
                </label>
                <label className="advertiser-field">
                  <span>Título</span>
                  <input
                    {...register('title')}
                    maxLength={160}
                    placeholder="Ex.: Apartamento T2 com varanda"
                  />
                  {errors.title && <small className="field-error">{errors.title.message}</small>}
                </label>
                <label className="advertiser-field">
                  <span>Descrição</span>
                  <textarea
                    {...register('description')}
                    rows={6}
                    maxLength={5000}
                    placeholder="Descreva o espaço, as condições e o que o torna especial."
                  />
                  {errors.description && (
                    <small className="field-error">{errors.description.message}</small>
                  )}
                </label>
              </>
            )}
            {step === 1 && (
              <>
                <h2>Localização aproximada</h2>
                <p className="advertiser-form-help">
                  A página pública mostra o bairro. Não introduza uma morada residencial exacta.
                </p>
                <label className="advertiser-field">
                  <span>Bairro em Maputo</span>
                  <select {...register('neighborhoodId')} disabled={loadingNeighborhoods}>
                    <option value="">Seleccione um bairro</option>
                    {neighborhoods.map((neighborhood) => (
                      <option value={neighborhood.id} key={neighborhood.id}>
                        {neighborhood.name}
                      </option>
                    ))}
                  </select>
                  {errors.neighborhoodId && (
                    <small className="field-error">Seleccione um bairro.</small>
                  )}
                </label>
              </>
            )}
            {step === 2 && (
              <>
                <h2>Características do imóvel</h2>
                <div className="advertiser-number-grid">
                  <label className="advertiser-field">
                    <span>Quartos</span>
                    <input type="number" min="0" max="20" {...register('bedrooms')} />
                    {errors.bedrooms && (
                      <small className="field-error">{errors.bedrooms.message}</small>
                    )}
                  </label>
                  <label className="advertiser-field">
                    <span>Casas de banho</span>
                    <input type="number" min="1" max="20" {...register('bathrooms')} />
                    {errors.bathrooms && (
                      <small className="field-error">{errors.bathrooms.message}</small>
                    )}
                  </label>
                  <label className="advertiser-field">
                    <span>Vagas de estacionamento</span>
                    <input type="number" min="0" max="20" {...register('parkingSpaces')} />
                  </label>
                  <label className="advertiser-field">
                    <span>
                      Área em m² <small>opcional</small>
                    </span>
                    <input inputMode="decimal" {...register('areaM2')} placeholder="Ex.: 90" />
                    {errors.areaM2 && (
                      <small className="field-error">{errors.areaM2.message}</small>
                    )}
                  </label>
                </div>
                <fieldset className="advertiser-feature-grid">
                  <legend>Características disponíveis</legend>
                  {features.length ? (
                    features.map((feature) => (
                      <label key={feature.slug}>
                        <input
                          type="checkbox"
                          checked={featureSlugs.includes(feature.slug)}
                          onChange={(event) => {
                            const next = event.target.checked
                              ? [...featureSlugs, feature.slug]
                              : featureSlugs.filter((slug) => slug !== feature.slug)
                            setValue('featureSlugs', next, { shouldDirty: true })
                          }}
                        />
                        <span>{feature.name}</span>
                      </label>
                    ))
                  ) : (
                    <small>As características serão configuradas pela equipa.</small>
                  )}
                </fieldset>
              </>
            )}
            {step === 3 && (
              <>
                <h2>Renda e custos iniciais</h2>
                <p className="advertiser-form-help">
                  Só indique valores reais. Campos vazios não aparecem no anúncio.
                </p>
                <div className="advertiser-number-grid">
                  <label className="advertiser-field">
                    <span>Renda mensal (MT)</span>
                    <input
                      inputMode="decimal"
                      {...register('monthlyRent')}
                      placeholder="Ex.: 45000"
                    />
                    {errors.monthlyRent && (
                      <small className="field-error">{errors.monthlyRent.message}</small>
                    )}
                  </label>
                  <label className="advertiser-field">
                    <span>
                      Caução (MT) <small>opcional</small>
                    </span>
                    <input
                      inputMode="decimal"
                      {...register('depositAmount')}
                      placeholder="Não indicado"
                    />
                    {errors.depositAmount && (
                      <small className="field-error">{errors.depositAmount.message}</small>
                    )}
                  </label>
                  <label className="advertiser-field">
                    <span>
                      Taxa de visita (MT) <small>opcional</small>
                    </span>
                    <input
                      inputMode="decimal"
                      {...register('visitFee')}
                      placeholder="Não indicado"
                    />
                    {errors.visitFee && (
                      <small className="field-error">{errors.visitFee.message}</small>
                    )}
                  </label>
                  <label className="advertiser-field">
                    <span>
                      Outro custo inicial (MT) <small>opcional</small>
                    </span>
                    <input
                      inputMode="decimal"
                      {...register('otherInitialCost')}
                      placeholder="Não indicado"
                    />
                    {errors.otherInitialCost && (
                      <small className="field-error">{errors.otherInitialCost.message}</small>
                    )}
                  </label>
                </div>
              </>
            )}
          </fieldset>
        )}

        {step === 4 && (
          <section className="advertiser-fields" aria-labelledby="photos-title">
            <h2 id="photos-title">Fotografias</h2>
            <p className="advertiser-form-help">
              Carregue até 10 fotografias JPEG, PNG ou WebP. Cada ficheiro deve ter até 8 MB; a
              plataforma optimiza as imagens para WebP.
            </p>
            <label className="advertiser-upload-zone">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
              />
              <span className="advertiser-upload-zone__icon">
                <Upload size={20} />
              </span>
              <strong>Escolher fotografias</strong>
              <small>JPEG, PNG ou WebP · máximo 8 MB por fotografia</small>
            </label>
            {selectedFiles.length > 0 && (
              <div className="advertiser-selected-files">
                <strong>{selectedFiles.length} ficheiros seleccionados</strong>
                {selectedFiles.map((file) => (
                  <span key={`${file.name}-${file.size}`}>
                    {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                ))}
                <button
                  className="button-primary"
                  type="button"
                  onClick={() => void uploadSelectedFiles()}
                  disabled={uploading}
                >
                  {uploading ? 'A carregar…' : 'Carregar fotografias'}
                </button>
              </div>
            )}
            <div className="advertiser-photo-grid">
              {activeProperty?.images.map((image, index) => (
                <figure key={image.id}>
                  <img
                    src={apiAssetUrl(image.imageUrl)}
                    alt={image.altText ?? activeProperty.title}
                  />
                  <figcaption>
                    <span>
                      Fotografia {index + 1}
                      {index === 0 ? ' · principal' : ''}
                    </span>
                    <div>
                      <button
                        type="button"
                        aria-label="Mover para cima"
                        title="Mover para cima"
                        disabled={index === 0}
                        onClick={() => void moveImage(index, -1)}
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label="Mover para baixo"
                        title="Mover para baixo"
                        disabled={index === (activeProperty?.images.length ?? 0) - 1}
                        onClick={() => void moveImage(index, 1)}
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label="Remover fotografia"
                        title="Remover fotografia"
                        onClick={() => void deleteImage(image.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
            {activeProperty?.images.length === 0 && (
              <div className="advertiser-note">
                <CircleHelp size={16} />
                Adicione pelo menos uma fotografia antes de submeter para análise.
              </div>
            )}
          </section>
        )}

        {step === 5 && (
          <section className="advertiser-fields advertiser-review" aria-labelledby="review-title">
            <h2 id="review-title">Reveja o anúncio</h2>
            <p className="advertiser-form-help">
              Ao submeter, o anúncio fica pendente e será revisto por um administrador.
            </p>
            <div className="advertiser-review-box">
              <span>{propertyTypeLabels[watchedValues.propertyType ?? 'HOUSE']}</span>
              <h3>{watchedValues.title || 'Sem título'}</h3>
              <p>{watchedValues.description}</p>
              <strong>{formatMoney(watchedValues.monthlyRent ?? '')} / mês</strong>
              <dl>
                <div>
                  <dt>Bairro</dt>
                  <dd>
                    {neighborhoods.find((item) => item.id === watchedValues.neighborhoodId)?.name ??
                      'Não seleccionado'}
                  </dd>
                </div>
                <div>
                  <dt>Quartos</dt>
                  <dd>{watchedValues.bedrooms}</dd>
                </div>
                <div>
                  <dt>Casas de banho</dt>
                  <dd>{watchedValues.bathrooms}</dd>
                </div>
                <div>
                  <dt>Caução</dt>
                  <dd>
                    {watchedValues.depositAmount
                      ? formatMoney(watchedValues.depositAmount)
                      : 'Não indicada'}
                  </dd>
                </div>
                <div>
                  <dt>Fotografias</dt>
                  <dd>{activeProperty?.images.length ?? 0}</dd>
                </div>
              </dl>
            </div>
            {activeProperty?.moderationStatus === 'PENDING' && (
              <div className="advertiser-note">
                <Clock3 size={16} />
                Este anúncio já está pendente de análise.
              </div>
            )}
          </section>
        )}

        <div className="advertiser-form-actions">
          {step > 0 ? (
            <button
              className="button-secondary"
              type="button"
              onClick={previousStep}
              disabled={saving || uploading}
            >
              <ArrowLeft size={15} />
              Anterior
            </button>
          ) : (
            <span />
          )}
          <div>
            {step === 3 && (
              <button
                className="button-secondary"
                type="button"
                onClick={() => void persistDraft()}
                disabled={saving}
              >
                {saving ? 'A guardar…' : 'Guardar rascunho'}
              </button>
            )}
            {step < 5 ? (
              <button className="button-primary" type="submit" disabled={saving || uploading}>
                {saving ? 'A guardar…' : 'Continuar'}
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                className="button-primary"
                type="button"
                onClick={() => void submitForReview()}
                disabled={
                  saving ||
                  activeProperty?.moderationStatus === 'PENDING' ||
                  (activeProperty?.images.length ?? 0) === 0
                }
              >
                {saving
                  ? 'A submeter…'
                  : activeProperty?.moderationStatus === 'PENDING'
                    ? 'Em análise'
                    : 'Submeter para análise'}
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </form>
    </section>
  )
}

export function AdvertiserVerificationPage() {
  const { csrfToken } = useAuth()
  const queryClient = useQueryClient()
  const [type, setType] = useState<'IDENTITY' | 'LISTING_AUTHORIZATION'>('IDENTITY')
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const {
    data: requests = [],
    isPending,
    isError,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['advertiser', 'verification'],
    queryFn: advertiserApi.getVerificationRequests,
  })
  const busy = requests.some((item) => item.verificationType === type && item.status === 'PENDING')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    if (!csrfToken) {
      setError('Actualize a sessão antes de continuar.')
      return
    }
    if (busy) {
      setError('Já existe um pedido deste tipo em análise.')
      return
    }
    if (files.length < 1 || files.length > 3) {
      setError('Seleccione entre 1 e 3 documentos.')
      return
    }
    if (files.some((file) => file.size > 8 * 1024 * 1024)) {
      setError('Cada documento deve ter até 8 MB.')
      return
    }
    setPending(true)
    try {
      await advertiserApi.createVerificationRequest(csrfToken, type, files)
      setFiles([])
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['advertiser', 'verification'] }),
        queryClient.invalidateQueries({ queryKey: ['advertiser', 'dashboard'] }),
      ])
      setSuccess('Pedido enviado. A documentação fica privada enquanto aguarda revisão.')
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setPending(false)
    }
  }

  const download = async (request: ApiAdvertiserVerificationRequest, documentId: string) => {
    try {
      const file = await advertiserApi.getVerificationDocument(request.id, documentId)
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = `roof-tech-documento-${documentId}.${file.type === 'application/pdf' ? 'pdf' : 'webp'}`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  return (
    <section className="advertiser-section">
      <div className="advertiser-heading-row">
        <div>
          <span className="public-eyebrow">Segurança do perfil</span>
          <h1>Verificação</h1>
          <p>Envie documentos para validar a sua identidade e a autorização para anunciar.</p>
        </div>
        <span className="advertiser-private-chip">
          <ShieldCheck size={15} />
          Documentos privados
        </span>
      </div>
      {isPending && (
        <div className="advertiser-loading" role="status">
          A carregar pedidos…
        </div>
      )}
      {isError && (
        <div className="advertiser-error" role="alert">
          {errorMessage(queryError)}{' '}
          <button type="button" onClick={() => void refetch()}>
            Tentar novamente
          </button>
        </div>
      )}
      {requests.length > 0 && (
        <div className="verification-request-grid">
          {requests.map((request) => (
            <article className="verification-request-card" key={request.id}>
              <div>
                <span className="verification-request-card__icon">
                  {request.verificationType === 'IDENTITY' ? (
                    <BadgeCheck size={19} />
                  ) : (
                    <FileCheck2 size={19} />
                  )}
                </span>
                <div>
                  <h2>{verificationTypeLabels[request.verificationType]}</h2>
                  <small>Pedido de {new Date(request.createdAt).toLocaleDateString('pt-MZ')}</small>
                </div>
              </div>
              <span
                className={`verification-status verification-status--${request.status.toLowerCase()}`}
              >
                {verificationLabels[request.status]}
              </span>
              <p>
                {request.documents.length}{' '}
                {request.documents.length === 1 ? 'documento protegido' : 'documentos protegidos'}
              </p>
              {request.status === 'REJECTED' && request.reviewNote && (
                <div className="advertiser-note" role="status">
                  Motivo da rejeição: {request.reviewNote}
                </div>
              )}
              {request.documents.map((document) => (
                <button
                  className="verification-download"
                  type="button"
                  key={document.id}
                  onClick={() => void download(request, document.id)}
                >
                  <FileText size={14} />
                  Descarregar {document.mimeType === 'application/pdf' ? 'PDF' : 'imagem'}
                  <ArrowRight size={14} />
                </button>
              ))}
            </article>
          ))}
        </div>
      )}
      <div className="advertiser-panel verification-panel">
        <div className="advertiser-panel__heading">
          <div>
            <h2>Enviar um pedido</h2>
            <p>Use apenas documentos relacionados com este processo.</p>
          </div>
        </div>
        <form className="verification-form" onSubmit={(event) => void submit(event)}>
          <label className="advertiser-field">
            <span>Tipo de verificação</span>
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as 'IDENTITY' | 'LISTING_AUTHORIZATION')
              }
            >
              <option value="IDENTITY">Verificação de identidade</option>
              <option value="LISTING_AUTHORIZATION">Autorização para anunciar</option>
            </select>
          </label>
          <div className="verification-guidance">
            {type === 'IDENTITY'
              ? 'Inclua documento de identificação legível. Pode enviar frente e verso.'
              : 'Inclua autorização do proprietário ou documento que comprove o direito de anunciar o imóvel.'}
          </div>
          {busy && (
            <div className="advertiser-note">
              <Clock3 size={16} />
              Já existe um pedido deste tipo em análise. Aguarde a resposta antes de enviar outro.
            </div>
          )}
          <label className="advertiser-upload-zone advertiser-upload-zone--compact">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            />
            <span className="advertiser-upload-zone__icon">
              <Upload size={18} />
            </span>
            <strong>Escolher documentos</strong>
            <small>PDF, JPEG, PNG ou WebP · até 3 ficheiros, 8 MB cada</small>
          </label>
          {files.length > 0 && (
            <div className="verification-file-list">
              {files.map((file) => (
                <span key={`${file.name}-${file.size}`}>
                  <FileText size={14} />
                  {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>
              ))}
            </div>
          )}
          {error && (
            <div className="advertiser-error" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="advertiser-success" role="status">
              {success}
            </div>
          )}
          <button className="button-primary" type="submit" disabled={pending || busy}>
            {pending ? 'A enviar documentos…' : 'Enviar pedido de verificação'}
          </button>
          <p className="verification-privacy">
            <ShieldCheck size={14} />
            Os documentos não são publicados. Só o anunciante e a equipa autorizada os podem
            consultar.
          </p>
        </form>
      </div>
      <div className="advertiser-note advertiser-note--bottom">
        <CircleHelp size={16} />A identidade verificada não prova, por si só, a propriedade legal do
        imóvel.
      </div>
    </section>
  )
}
