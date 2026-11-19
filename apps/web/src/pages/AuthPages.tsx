import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { useAuth } from '../contexts/use-auth'
import { AuthApiError } from '../services/auth-api'
import { PublicShell } from '../components/public/PublicSite'
import '../pages/auth.css'

const loginFormSchema = z.object({
  email: z
    .email()
    .trim()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
})

const registerFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Indique o seu nome.').max(120),
    email: z
      .email('Indique um e-mail válido.')
      .trim()
      .max(254)
      .transform((value) => value.toLowerCase()),
    password: z.string().min(12, 'Use pelo menos 12 caracteres.').max(128),
    phone: z.string().trim().optional(),
    accountType: z.enum(['CLIENT', 'ADVERTISER']),
    advertiserType: z.enum(['OWNER', 'AGENT']).optional(),
  })
  .superRefine((value, context) => {
    if (value.accountType === 'ADVERTISER' && !value.advertiserType) {
      context.addIssue({
        code: 'custom',
        path: ['advertiserType'],
        message: 'Seleccione o seu perfil.',
      })
    }
    if (
      value.phone &&
      (value.phone.length < 7 ||
        value.phone.length > 32 ||
        !/^[+0-9() -]+$/.test(value.phone) ||
        value.phone.replace(/\D/g, '').length < 7)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['phone'],
        message: 'Indique um número de telefone válido.',
      })
    }
  })

function destinationFrom(location: ReturnType<typeof useLocation>) {
  const requested = new URLSearchParams(location.search).get('next')
  return requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/conta'
}

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { status, login, register } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const registering = mode === 'register'
  const authSwitchPath = registering ? '/entrar' : '/registar'
  const authSwitchHref = `${authSwitchPath}${location.search}`
  const [accountType, setAccountType] = useState<'CLIENT' | 'ADVERTISER'>('CLIENT')
  const [advertiserType, setAdvertiserType] = useState<'OWNER' | 'AGENT'>('OWNER')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'authenticated') return <Navigate to={destinationFrom(location)} replace />

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    setPending(true)
    try {
      if (registering) {
        const parsed = registerFormSchema.safeParse({
          name: form.get('name'),
          email: form.get('email'),
          password: form.get('password'),
          phone: String(form.get('phone') ?? '').trim() || undefined,
          accountType,
          ...(accountType === 'ADVERTISER' ? { advertiserType } : {}),
        })
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? 'Verifique os dados e tente novamente.')
          return
        }
        await register(parsed.data)
      } else {
        const parsed = loginFormSchema.safeParse({
          email: form.get('email'),
          password: form.get('password'),
        })
        if (!parsed.success) {
          setError('Indique um e-mail e uma palavra-passe válidos.')
          return
        }
        await login(parsed.data.email, parsed.data.password)
      }
      navigate(destinationFrom(location), { replace: true })
    } catch (cause) {
      if (cause instanceof AuthApiError) setError(cause.message)
      else setError('Não foi possível concluir o pedido. Tente novamente.')
    } finally {
      setPending(false)
    }
  }

  return (
    <PublicShell>
      <main className="auth-main">
        <section className="auth-card" aria-labelledby="auth-title">
          <span className="public-eyebrow">A sua conta Roof Tech</span>
          <h1 id="auth-title">{registering ? 'Crie a sua conta' : 'Bem-vindo de volta'}</h1>
          <p className="auth-intro">
            {registering
              ? 'Guarde os seus dados e acompanhe a sua experiência imobiliária.'
              : 'Entre para aceder ao seu perfil.'}
          </p>

          {status === 'unavailable' && (
            <div className="auth-alert" role="alert">
              O serviço de conta está temporariamente indisponível. Actualize a página e tente
              novamente.
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {registering && (
              <>
                <label className="auth-field">
                  <span>Nome completo</span>
                  <input name="name" autoComplete="name" required minLength={2} maxLength={120} />
                </label>
                <fieldset className="auth-choice-group">
                  <legend>Quero usar a Roof Tech como</legend>
                  <label>
                    <input
                      type="radio"
                      name="accountType"
                      checked={accountType === 'CLIENT'}
                      onChange={() => setAccountType('CLIENT')}
                    />{' '}
                    Cliente
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="accountType"
                      checked={accountType === 'ADVERTISER'}
                      onChange={() => setAccountType('ADVERTISER')}
                    />{' '}
                    Anunciante
                  </label>
                </fieldset>
                {accountType === 'ADVERTISER' && (
                  <label className="auth-field">
                    <span>Perfil de anunciante</span>
                    <select
                      value={advertiserType}
                      onChange={(event) =>
                        setAdvertiserType(event.target.value as 'OWNER' | 'AGENT')
                      }
                    >
                      <option value="OWNER">Proprietário</option>
                      <option value="AGENT">Agente imobiliário</option>
                    </select>
                  </label>
                )}
              </>
            )}
            <label className="auth-field">
              <span>E-mail</span>
              <input name="email" type="email" autoComplete="email" required maxLength={254} />
            </label>
            {registering && (
              <label className="auth-field">
                <span>
                  Telefone <small>opcional</small>
                </span>
                <input name="phone" type="tel" autoComplete="tel" placeholder="+258 …" />
              </label>
            )}
            <label className="auth-field">
              <span>Palavra-passe</span>
              <input
                name="password"
                type="password"
                autoComplete={registering ? 'new-password' : 'current-password'}
                required
                minLength={registering ? 12 : 1}
                maxLength={128}
              />
              {registering && <small>Use pelo menos 12 caracteres.</small>}
            </label>
            {error && (
              <div className="auth-alert" role="alert">
                {error}
              </div>
            )}
            <button
              className="button-primary button-full auth-submit"
              type="submit"
              disabled={pending || status === 'loading' || status === 'unavailable'}
            >
              {pending ? 'A processar…' : registering ? 'Criar conta' : 'Entrar'}
            </button>
          </form>
          <p className="auth-switch">
            {registering ? 'Já tem uma conta?' : 'Ainda não tem conta?'}{' '}
            <Link to={authSwitchHref}>{registering ? 'Entrar' : 'Registar-se'}</Link>
          </p>
          <p className="auth-privacy">
            A sua sessão é protegida e não fica guardada no armazenamento do navegador.
          </p>
        </section>
      </main>
    </PublicShell>
  )
}

export function LoginPage() {
  return <AuthPage mode="login" />
}

export function RegisterPage() {
  return <AuthPage mode="register" />
}

export function AccountPage() {
  const { user, logout, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    if (name.trim().length < 2 || name.trim().length > 120) {
      setError('O nome deve ter entre 2 e 120 caracteres.')
      return
    }
    if (
      phone.trim() &&
      (phone.trim().length < 7 ||
        !/^[+0-9() -]+$/.test(phone.trim()) ||
        phone.replace(/\D/g, '').length < 7)
    ) {
      setError('Indique um número de telefone válido ou deixe o campo vazio.')
      return
    }
    setPending(true)
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() || null })
      setMessage('Os dados do perfil foram actualizados.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível guardar as alterações.')
    } finally {
      setPending(false)
    }
  }

  const signOut = async () => {
    setPending(true)
    setError(null)
    try {
      await logout()
      navigate('/', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível terminar a sessão.')
    } finally {
      setPending(false)
    }
  }

  return (
    <PublicShell>
      <main className="auth-main auth-main--account">
        <section className="auth-card auth-card--wide" aria-labelledby="account-title">
          <span className="public-eyebrow">Conta pessoal</span>
          <h1 id="account-title">Olá, {user?.name.split(' ')[0]}</h1>
          <p className="auth-intro">Consulte e actualize os seus dados de perfil.</p>
          <div className="account-role">
            {user?.role === 'ADVERTISER'
              ? 'Anunciante'
              : user?.role === 'ADMIN'
                ? 'Administrador'
                : 'Cliente'}
          </div>
          {user?.role === 'ADMIN' && (
            <Link className="button-primary button-full" to="/administracao">
              Abrir painel administrativo
            </Link>
          )}
          <form className="auth-form" onSubmit={saveProfile}>
            <label className="auth-field">
              <span>Nome completo</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                required
              />
            </label>
            <label className="auth-field">
              <span>E-mail</span>
              <input value={user?.email ?? ''} type="email" readOnly />
            </label>
            <label className="auth-field">
              <span>Telefone</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                type="tel"
                maxLength={32}
              />
            </label>
            {user?.advertiserProfile && (
              <div className="account-advertiser">
                <strong>
                  {user.advertiserProfile.type === 'OWNER' ? 'Proprietário' : 'Agente imobiliário'}
                </strong>
                <span>
                  Verificação:{' '}
                  {user.advertiserProfile.verificationStatus === 'NOT_SUBMITTED'
                    ? 'por iniciar'
                    : user.advertiserProfile.verificationStatus.toLowerCase()}
                </span>
              </div>
            )}
            {message && (
              <div className="auth-success" role="status">
                {message}
              </div>
            )}
            {error && (
              <div className="auth-alert" role="alert">
                {error}
              </div>
            )}
            <button
              className="button-primary button-full auth-submit"
              type="submit"
              disabled={pending}
            >
              Guardar alterações
            </button>
          </form>
          <button
            className="auth-signout"
            type="button"
            onClick={() => void signOut()}
            disabled={pending}
          >
            Terminar sessão
          </button>
        </section>
      </main>
    </PublicShell>
  )
}

export function ProtectedRoute() {
  const { status, error, refreshSession } = useAuth()
  const location = useLocation()

  if (status === 'loading')
    return (
      <div className="route-fallback" role="status">
        A verificar a sua sessão…
      </div>
    )
  if (status === 'unavailable') {
    return (
      <main className="auth-main">
        <section className="auth-card">
          <span className="public-eyebrow">Roof Tech</span>
          <h1>Conta indisponível</h1>
          <p className="auth-intro">{error ?? 'Não foi possível verificar a sua sessão.'}</p>
          <button
            className="button-primary button-full"
            type="button"
            onClick={() => void refreshSession()}
          >
            Tentar novamente
          </button>
        </section>
      </main>
    )
  }
  if (status !== 'authenticated')
    return (
      <Navigate
        to={`/entrar?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    )
  return <AccountPage />
}
