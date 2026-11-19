import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AuthApiError, authApi } from '../services/auth-api'
import type { ApiAuthUser } from '@roof-tech/shared'
import { AuthContext, type AuthStatus } from './auth-context'

type RegisterInput = Parameters<typeof authApi.register>[0]
type ProfileInput = { name?: string; phone?: string | null }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<ApiAuthUser | null>(null)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshSession = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const session = await authApi.getSession()
      setUser(session.user)
      setCsrfToken(session.csrfToken)
      setStatus(session.user ? 'authenticated' : 'anonymous')
    } catch (cause) {
      setUser(null)
      setCsrfToken(null)
      setStatus('unavailable')
      setError(cause instanceof Error ? cause.message : 'Não foi possível verificar a sessão.')
    }
  }, [])

  useEffect(() => {
    let mounted = true
    void authApi
      .getSession()
      .then((session) => {
        if (!mounted) return
        setUser(session.user)
        setCsrfToken(session.csrfToken)
        setStatus(session.user ? 'authenticated' : 'anonymous')
      })
      .catch((cause: unknown) => {
        if (!mounted) return
        setUser(null)
        setCsrfToken(null)
        setStatus('unavailable')
        setError(cause instanceof Error ? cause.message : 'Não foi possível verificar a sessão.')
      })
    return () => {
      mounted = false
    }
  }, [])

  const applyAuthResponse = (result: { user: ApiAuthUser; csrfToken: string }) => {
    setUser(result.user)
    setCsrfToken(result.csrfToken)
    setStatus('authenticated')
    setError(null)
  }

  const login = async (email: string, password: string) => {
    const result = await authApi.login(email, password)
    applyAuthResponse(result)
  }

  const register = async (input: RegisterInput) => {
    const result = await authApi.register(input)
    applyAuthResponse(result)
  }

  const logout = async () => {
    if (!csrfToken) throw new AuthApiError('Actualize a sessão antes de terminar.', 403)
    await authApi.logout(csrfToken)
    setUser(null)
    setCsrfToken(null)
    setStatus('anonymous')
  }

  const updateProfile = async (input: ProfileInput) => {
    if (!csrfToken) throw new AuthApiError('Actualize a sessão antes de guardar.', 403)
    const result = await authApi.updateProfile(csrfToken, input)
    setUser(result.user)
    return result.user
  }

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        csrfToken,
        error,
        refreshSession,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
