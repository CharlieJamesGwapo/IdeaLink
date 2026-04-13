import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { me } from '../api/auth'

export interface CurrentUser {
  id: number
  education_level: string | null
  college_department: string | null
}

interface AuthContextValue {
  currentUser: CurrentUser | null
  role: string | null
  isLoading: boolean
  setAuth: (user: CurrentUser | null, role: string | null) => void
  clearAuth: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ── localStorage cache so the app renders instantly on reload ──────────────
const CACHE_KEY = 'idealink_auth'

function readCache(): { user: CurrentUser; role: string } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as { user: CurrentUser; role: string }) : null
  } catch { return null }
}

function writeCache(user: CurrentUser | null, role: string | null) {
  try {
    if (user && role) localStorage.setItem(CACHE_KEY, JSON.stringify({ user, role }))
    else localStorage.removeItem(CACHE_KEY)
  } catch { /* storage unavailable */ }
}

const TIMEOUT_MS = 10_000 // bail out after 10 s if backend is still cold

export function AuthProvider({ children }: { children: ReactNode }) {
  const cached = readCache()

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(cached?.user ?? null)
  const [role, setRole]               = useState<string | null>(cached?.role ?? null)
  const [isLoading, setIsLoading]     = useState(!cached)

  useEffect(() => {
    let cancelled = false
    let timerId: ReturnType<typeof setTimeout>

    const finish = (user: CurrentUser | null, roleVal: string | null) => {
      if (cancelled) return
      cancelled = true
      clearTimeout(timerId)
      setCurrentUser(user)
      setRole(roleVal)
      writeCache(user, roleVal)
      setIsLoading(false)
    }

    timerId = setTimeout(() => finish(null, null), TIMEOUT_MS)

    me()
      .then(res => {
        const userId = res.data?.user_id
        const roleVal = res.data?.role
        if (typeof userId === 'number' && typeof roleVal === 'string') {
          finish({
            id: userId,
            education_level: (res.data?.education_level as string | null | undefined) ?? null,
            college_department: (res.data?.college_department as string | null | undefined) ?? null,
          }, roleVal)
        } else {
          finish(null, null)
        }
      })
      .catch(() => finish(null, null))

    return () => { cancelled = true; clearTimeout(timerId) }
  }, [])

  const setAuth = (user: CurrentUser | null, newRole: string | null) => {
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
