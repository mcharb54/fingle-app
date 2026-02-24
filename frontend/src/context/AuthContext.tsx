import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User } from '../types'
import { authApi } from '../api'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('fingle_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    authApi
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => {
        localStorage.removeItem('fingle_token')
        setToken(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  function login(newToken: string, newUser: User) {
    localStorage.setItem('fingle_token', newToken)
    setToken(newToken)
    setUser(newUser)
  }

  function logout() {
    localStorage.removeItem('fingle_token')
    setToken(null)
    setUser(null)
  }

  async function refreshUser() {
    try {
      const { user } = await authApi.me()
      setUser(user)
    } catch {
      // silently ignore — token may have expired
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
