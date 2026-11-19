import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownUp, Search, SlidersHorizontal } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { publicPropertyApi } from '../services/public-property-api'
import { toApiSearchParams, toPublicListing } from '../utils/public-utils'
import {
  DemoNotice,
  PageIntro,
  PropertyFilterPanel,
  PropertyGrid,
  PublicShell,
} from '../components/public/PublicSite'

export function PropertySearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const params = useMemo(() => new URLSearchParams(searchParams), [searchParams])
  const requestQuery = toApiSearchParams(params).toString()
  const [debouncedRequest, setDebouncedRequest] = useState(requestQuery)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedRequest(requestQuery), 250)
    return () => window.clearTimeout(timer)
  }, [requestQuery])

  const isDebouncing = requestQuery !== debouncedRequest
  const query = useQuery({
    queryKey: ['public-properties', debouncedRequest],
    queryFn: () => publicPropertyApi.search(new URLSearchParams(debouncedRequest)),
    enabled: !isDebouncing,
  })
  const listings = query.data?.items.map(toPublicListing) ?? []
  const pagination = query.data?.pagination

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setSearchParams(next, { replace: true })
  }
  const clearFilters = () => setSearchParams({}, { replace: true })
  const onlyDemo = listings.length > 0 && listings.every((property) => property.isDemo)

  return (
    <PublicShell>
      <main className="search-page">
        <div className="search-page__inner">
          <PageIntro
            eyebrow="Pesquisar imóveis · Maputo"
            title="Encontre o seu próximo lugar."
            description="Pesquise anúncios aprovados, compare custos e combine filtros sem criar uma conta."
          />
          {onlyDemo && <DemoNotice compact />}
          <div className="results-toolbar">
            <div>
              <span className="results-count">
                {pagination?.totalItems ?? (query.isPending ? '…' : 0)}
              </span>
              <span>
                {(pagination?.totalItems ?? 0) === 1
                  ? ' imóvel encontrado'
                  : ' imóveis encontrados'}
              </span>
              <small>
                {pagination && onlyDemo
                  ? 'Os resultados desta página são demonstrativos.'
                  : pagination
                    ? 'Os resultados são anúncios aprovados pela Roof Tech.'
                    : 'A carregar anúncios…'}
              </small>
            </div>
            <label className="sort-select">
              <ArrowDownUp size={15} />
              <span className="sr-only">Ordenar resultados</span>
              <select
                value={searchParams.get('sort') ?? 'newest'}
                onChange={(event) => updateParam('sort', event.target.value)}
              >
                <option value="newest">Mais recentes</option>
                <option value="asc">Menor renda</option>
                <option value="desc">Maior renda</option>
              </select>
            </label>
            <button
              className="mobile-filter-toggle"
              type="button"
              aria-expanded={mobileFiltersOpen}
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            >
              <SlidersHorizontal size={16} /> Filtros
            </button>
          </div>
          <div className="search-layout">
            <aside
              className={`search-sidebar ${mobileFiltersOpen ? 'search-sidebar--open' : ''}`}
              aria-label="Filtros de pesquisa"
            >
              <PropertyFilterPanel params={params} onChange={updateParam} onClear={clearFilters} />
            </aside>
            <section
              className="search-results"
              aria-label="Resultados da pesquisa"
              aria-live="polite"
            >
              {query.isError ? (
                <div className="empty-results" role="alert">
                  <span>
                    <Search size={21} />
                  </span>
                  <h2>Não foi possível carregar os anúncios.</h2>
                  <p>
                    {query.error instanceof Error
                      ? query.error.message
                      : 'Verifique a ligação e tente novamente.'}
                  </p>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() => void query.refetch()}
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : isDebouncing || query.isPending ? (
                <div className="empty-results" role="status">
                  <span>
                    <Search size={21} />
                  </span>
                  <h2>A procurar anúncios…</h2>
                  <p>Os resultados são actualizados quando altera os filtros.</p>
                </div>
              ) : listings.length > 0 ? (
                <PropertyGrid properties={listings} />
              ) : (
                <div className="empty-results">
                  <span>
                    <Search size={21} />
                  </span>
                  <h2>Não encontrámos imóveis com estes filtros.</h2>
                  <p>Experimente alargar a renda máxima ou remover algum critério.</p>
                  <button type="button" className="button-primary" onClick={clearFilters}>
                    Limpar pesquisa
                  </button>
                </div>
              )}
            </section>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <nav className="search-pagination" aria-label="Paginação dos resultados">
              <button
                className="button-secondary"
                type="button"
                disabled={pagination.page <= 1 || isDebouncing}
                onClick={() => updateParam('page', String(pagination.page - 1))}
              >
                Anterior
              </button>
              <span>
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <button
                className="button-secondary"
                type="button"
                disabled={pagination.page >= pagination.totalPages || isDebouncing}
                onClick={() => updateParam('page', String(pagination.page + 1))}
              >
                Seguinte
              </button>
            </nav>
          )}
        </div>
      </main>
    </PublicShell>
  )
}
