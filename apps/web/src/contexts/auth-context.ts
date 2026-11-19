import { createContext } from 'react'
import type { ApiAuthUser } from '@roof-tech/shared'
import type { authApi } from '../services/auth-api'

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'unavailable'
type RegisterInput = Parameters<typeof authApi.register>[0]
type ProfileInput = { name?: string; phone?: string | null }

export type AuthContextValue = {
  status: AuthStatus
  user: ApiAuthUser | null
  csrfToken: string | null
  error: string | null
  refreshSession: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (input: ProfileInput) => Promise<ApiAuthUser>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
