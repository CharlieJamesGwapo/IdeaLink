import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { me } from '../api/auth'

interface AuthContextValue {
  currentUser: { id: number } | null
  role: string | null
  isLoading: boolean
  setAuth: (user: { id: number } | null, role: string | null) => void
  clearAuth: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<{ id: number } | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    me()
      .then((res) => {
        setCurrentUser({ id: res.data.user_id })
        setRole(res.data.role)
      })
      .catch(() => {
        setCurrentUser(null)
        setRole(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const setAuth = (user: { id: number } | null, newRole: string | null) => {
    setCurrentUser(user)
    setRole(newRole)
  }

  const clearAuth = () => {
    setCurrentUser(null)
    setRole(null)
  }

  return (
    <AuthContext.Provider value={{ currentUser, role, isLoading, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider')
  return ctx
}
