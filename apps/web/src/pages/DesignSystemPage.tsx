import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  CircleCheck,
  CircleX,
  Droplets,
  House,
  Info,
  LoaderCircle,
  ParkingSquare,
  Search,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { apiUrl } from '../services/api-url'
import type { ApiHealthResponse } from '@roof-tech/shared'
import { Brand } from '../components/Brand'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import './design-system.css'

const apiHealthSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('roof-tech-api'),
})

const neighborhoodSchema = z.object({
  neighborhood: z
    .string()
    .trim()
    .min(2, 'Escreva pelo menos duas letras.')
    .max(50, 'O texto deve ter até 50 caracteres.'),
})

type NeighborhoodForm = z.infer<typeof neighborhoodSchema>

const brandColors = [
  { name: 'Terracota', value: '#B65F45' },
  { name: 'Areia', value: '#F5EFE5' },
  { name: 'Grafite', value: '#262626' },
  { name: 'Bege secundário', value: '#E3D5C5' },
  { name: 'Branco', value: '#FFFFFF' },
]

const semanticColors = [
  { name: 'Sucesso', value: '#2D7055' },
  { name: 'Erro', value: '#A13F37' },
  { name: 'Aviso', value: '#936018' },
  { name: 'Informação', value: '#38647E' },
  { name: 'Desactivado', value: '#77716B' },
]

function ApiStatus() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['api-health'],
    queryFn: async () => {
      const response = await fetch(apiUrl('/health'), {
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        throw new Error('A API não respondeu correctamente.')
      }

      return apiHealthSchema.parse(await response.json()) satisfies ApiHealthResponse
    },
    retry: false,
    refetchInterval: 30_000,
  })

  const label = data ? 'API disponível' : isPending ? 'A verificar API' : 'API indisponível'
  const dotClass = data ? 'status-dot--online' : isError ? 'status-dot--error' : ''

  return (
    <div className="api-status" role="status" aria-live="polite">
      <span className={`status-dot ${dotClass}`} aria-hidden="true" />
      {label}
    </div>
  )
}

function SectionHeading({
  number,
  title,
  description,
  id,
}: {
  number: string
  title: string
  description: string
  id: string
}) {
  return (
    <div className="section-heading">
      <div className="section-title-wrap">
        <span className="section-number">{number}</span>
        <h2 className="section-title" id={id}>
          {title}
        </h2>
      </div>
      <p className="section-description">{description}</p>
    </div>
  )
}

export function DesignSystemPage() {
  const [toast, setToast] = useState('')
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NeighborhoodForm>({
    resolver: zodResolver(neighborhoodSchema),
    defaultValues: { neighborhood: '' },
  })

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const submitDemo = handleSubmit(({ neighborhood }) => {
    setToast(`Validação concluída para “${neighborhood}”. Esta é apenas uma demonstração visual.`)
    reset()
  })

  return (
    <>
      <a className="skip-link" href="#main-content">
        Saltar para o conteúdo
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <div className="header-meta">
            <span className="header-label">Fundação · Terra Living</span>
            <ApiStatus />
          </div>
        </div>
      </header>

      <main className="page-shell" id="main-content">
        <motion.section
          className="hero-row"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div>
            <span className="eyebrow">
              <span className="eyebrow-line" aria-hidden="true" />
              Pré-visualização do sistema visual
            </span>
            <h1 className="hero-title">
              Uma base visual <em>clara</em> e acolhedora.
            </h1>
          </div>
          <div className="hero-copy">
            <p>
              <strong>Terra Living</strong> combina tons naturais, composição editorial e controlos
              simples para a experiência Roof Tech.
            </p>
            <p>Fase 1 · tokens, componentes acessíveis e ligação de saúde à API.</p>
          </div>
        </motion.section>

        <section className="section-block" id="cores" aria-labelledby="colors-heading">
          <SectionHeading
            id="colors-heading"
            number="01"
            title="Paleta"
            description="Cores base e estados semânticos do produto."
          />
          <div className="swatch-grid">
            {brandColors.map((color) => (
              <div className="swatch-card" key={color.name}>
                <div className="swatch-color" style={{ backgroundColor: color.value }} />
                <div className="swatch-copy">
                  <span className="swatch-name">{color.name}</span>
                  <span className="swatch-value">{color.value}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="semantic-grid" aria-label="Cores semânticas">
            {semanticColors.map((color) => (
              <div className="semantic-token" key={color.name}>
                <span className="semantic-chip" style={{ backgroundColor: color.value }} />
                <span>{color.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section-block" id="tipografia" aria-labelledby="type-heading">
          <SectionHeading
            id="type-heading"
            number="02"
            title="Tipografia"
            description="Contraste entre títulos editoriais e texto de interface."
          />
          <div className="type-layout">
            <article className="type-card type-card--editorial">
              <div className="spec-label">
                <span>Editorial</span>
                <span>Clash Display · Light 300</span>
              </div>
              <p className="type-sample-heading">Um lugar para chamar de seu.</p>
              <p className="type-sample-body">
                Títulos com presença, acompanhados por descrições curtas que deixam a informação
                respirar.
              </p>
            </article>
            <article className="type-card">
              <div className="spec-label">
                <span>Interface</span>
                <span>System sans · 400–700</span>
              </div>
              <p className="type-sample-ui">Informação fácil de comparar.</p>
              <p className="type-sample-body">
                Texto de interface prioriza leitura rápida, hierarquia clara e bom contraste em
                ecrãs pequenos.
              </p>
              <div className="type-meta">
                <span>Label · 11px / 700</span>
                <span>Corpo · 14px / 400</span>
                <span>Botão · 12px / 700</span>
              </div>
            </article>
          </div>
        </section>

        <section className="section-block" id="componentes" aria-labelledby="components-heading">
          <SectionHeading
            id="components-heading"
            number="03"
            title="Componentes"
            description="Controlos base com estados e feedback definidos."
          />
          <div className="component-grid">
            <article className="component-card">
              <div className="spec-label">
                <span>Botões</span>
                <span>44px · área de toque</span>
              </div>
              <div className="button-row">
                <Button
                  type="button"
                  icon={<ArrowUpRight size={15} aria-hidden="true" />}
                  onClick={() => setToast('Botão principal activo: pronto para receber uma acção.')}
                >
                  Principal
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setToast('Botão secundário activo.')}
                >
                  Secundário
                </Button>
                <Button type="button" variant="quiet" disabled>
                  Desactivado
                </Button>
              </div>
              <p className="component-note">
                Cada botão tem uma acção definida ou apresenta-se desactivado.
              </p>
            </article>

            <article className="component-card">
              <div className="spec-label">
                <span>Estados</span>
                <span>Texto + cor</span>
              </div>
              <div className="badge-row">
                <Badge variant="success" icon={<CircleCheck size={13} aria-hidden="true" />}>
                  Disponível
                </Badge>
                <Badge variant="warning" icon={<AlertCircle size={13} aria-hidden="true" />}>
                  Pendente
                </Badge>
                <Badge variant="error" icon={<CircleX size={13} aria-hidden="true" />}>
                  Rejeitado
                </Badge>
                <Badge>Rascunho</Badge>
              </div>
              <p className="component-note">
                Os estados são comunicados por rótulo e não apenas pela cor.
              </p>
            </article>

            <article className="component-card component-card--wide">
              <div className="spec-label">
                <span>Campo + validação</span>
                <span>React Hook Form · Zod</span>
              </div>
              <form className="field-demo" onSubmit={submitDemo} noValidate>
                <TextField
                  label="Bairro ou zona"
                  placeholder="Ex.: Polana, Sommerschield…"
                  autoComplete="off"
                  error={errors.neighborhood?.message}
                  hint="Demonstração de validação local."
                  {...register('neighborhood')}
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  icon={<Search size={15} aria-hidden="true" />}
                >
                  Validar exemplo
                </Button>
              </form>
              <p className="component-note">
                O formulário valida o texto localmente e não envia nem pesquisa dados.
              </p>
            </article>

            <article className="component-card">
              <div className="spec-label">
                <span>Avisos</span>
                <span>Feedback contextual</span>
              </div>
              <div className="notice-stack">
                <div className="notice">
                  <Check size={15} aria-hidden="true" />
                  <span>
                    <strong>Acção concluída</strong>A confirmação aparece junto à informação
                    relevante.
                  </span>
                </div>
                <div className="notice notice--info">
                  <Info size={15} aria-hidden="true" />
                  <span>
                    <strong>Nota informativa</strong>
                    Os custos apresentados dependem dos valores declarados.
                  </span>
                </div>
                <div className="notice notice--warning">
                  <TriangleAlert size={15} aria-hidden="true" />
                  <span>
                    <strong>Confirme os detalhes</strong>
                    Verifique as condições antes de organizar uma visita.
                  </span>
                </div>
              </div>
            </article>

            <article className="component-card">
              <div className="spec-label">
                <span>Cartão de imóvel</span>
                <span>Bloco de estrutura</span>
              </div>
              <div className="preview-card">
                <div
                  className="preview-image-placeholder"
                  aria-label="Espaço reservado para fotografia"
                >
                  <HousePlaceholderIcon />
                </div>
                <div className="preview-card-copy">
                  <Badge variant="neutral">Pré-visualização</Badge>
                  <h3>Título do imóvel</h3>
                  <p>Bairro · tipologia · preço mensal</p>
                </div>
              </div>
              <p className="component-note">
                Estrutura demonstrativa sem imóvel, preço ou localização reais.
              </p>
            </article>
          </div>
        </section>

        <section
          className="section-block"
          id="acessibilidade"
          aria-labelledby="accessibility-heading"
        >
          <SectionHeading
            id="accessibility-heading"
            number="04"
            title="Acessibilidade e ritmo"
            description="Estados visíveis, movimento leve e foco por teclado."
          />
          <div className="component-grid">
            <article className="component-card">
              <div className="spec-label">
                <span>Leitura clara</span>
                <span>Contraste + rótulos</span>
              </div>
              <div className="notice notice--info">
                <ShieldCheck size={16} aria-hidden="true" />
                <span>
                  <strong>Identificação transparente</strong>O estado acompanha sempre um texto
                  legível e compreensível.
                </span>
              </div>
              <p className="component-note">
                Use Tab para navegar e Enter para activar os controlos.
              </p>
            </article>
            <article className="component-card">
              <div className="spec-label">
                <span>Conectividade</span>
                <span>Estrutura leve</span>
              </div>
              <div className="badge-row">
                <Badge variant="success" icon={<Droplets size={13} aria-hidden="true" />}>
                  Água
                </Badge>
                <Badge variant="neutral" icon={<ParkingSquare size={13} aria-hidden="true" />}>
                  Estacionamento
                </Badge>
                <Badge variant="neutral" icon={<LoaderCircle size={13} aria-hidden="true" />}>
                  Carregamento
                </Badge>
              </div>
              <p className="component-note">
                Fotografias e animações serão optimizadas nas páginas públicas da fase seguinte.
              </p>
            </article>
          </div>
        </section>

        <footer className="site-footer">
          <span>
            <strong>ROOF TECH</strong> · Fundação técnica e sistema visual
          </span>
          <span>Pré-visualização de componentes · sem anúncios reais</span>
        </footer>
      </main>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  )
}

function HousePlaceholderIcon() {
  return (
    <span aria-hidden="true">
      <House size={26} strokeWidth={1.4} />
    </span>
  )
}
