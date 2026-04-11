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

// ── localStorage cache so the app renders instantly on reload ──────────────
const CACHE_KEY = 'idealink_auth'

function readCache(): { user: { id: number }; role: string } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as { user: { id: number }; role: string }) : null
  } catch { return null }
}

function writeCache(user: { id: number } | null, role: string | null) {
  try {
    if (user && role) localStorage.setItem(CACHE_KEY, JSON.stringify({ user, role }))
    else localStorage.removeItem(CACHE_KEY)
  } catch { /* storage unavailable */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const cached = readCache()

  // Initialise from cache → no blank-screen flash while me() is in-flight
  const [currentUser, setCurrentUser] = useState<{ id: number } | null>(cached?.user ?? null)
  const [role, setRole] = useState<string | null>(cached?.role ?? null)
  // Only show a loading state when there is no cached session to display
  const [isLoading, setIsLoading] = useState(!cached)

  useEffect(() => {
    me()
      .then((res) => {
        const user = { id: res.data.user_id }
        setCurrentUser(user)
        setRole(res.data.role)
        writeCache(user, res.data.role)
      })
      .catch(() => {
        // Session expired / invalid — clear everything
        setCurrentUser(null)
        setRole(null)
        writeCache(null, null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const setAuth = (user: { id: number } | null, newRole: string | null) => {
    setCurrentUser(user)
    setRole(newRole)
    writeCache(user, newRole)
  }

  const clearAuth = () => {
    setCurrentUser(null)
    setRole(null)
    writeCache(null, null)
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
