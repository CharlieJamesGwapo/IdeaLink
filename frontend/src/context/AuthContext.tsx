import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { me } from '../api/auth'

export interface CurrentUser {
  id: number
  education_level: string | null
  college_department: string | null
  grade_level: string | null
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

    // stopLoading: end the loading state without overwriting cached auth.
    // Used when /me fails for a transient reason (network error, 5xx, etc.)
    // — we have no fresh signal, so the cached values stay authoritative.
    const stopLoading = () => {
      if (cancelled) return
      cancelled = true
      clearTimeout(timerId)
      setIsLoading(false)
    }

    timerId = setTimeout(() => stopLoading(), TIMEOUT_MS)

    me()
      .then(res => {
        const userId = res.data?.user_id
        const roleVal = res.data?.role
        if (typeof userId === 'number' && typeof roleVal === 'string') {
          const data = (res.data ?? {}) as unknown as Record<string, unknown>
          const hasEducation = 'education_level' in data
          const hasDept = 'college_department' in data
          const hasGrade = 'grade_level' in data
          finish({
            id: userId,
            education_level: hasEducation
              ? (data.education_level as string | null | undefined) ?? null
              : cached?.user.education_level ?? null,
            college_department: hasDept
              ? (data.college_department as string | null | undefined) ?? null
              : cached?.user.college_department ?? null,
            grade_level: hasGrade
              ? (data.grade_level as string | null | undefined) ?? null
              : cached?.user.grade_level ?? null,
          }, roleVal)
        } else {
          // Server replied 200 OK but with no auth payload — treat as logged out.
          finish(null, null)
        }
      })
      .catch((err: unknown) => {
        // Only an explicit 401 from the server means "you are logged out."
        // Network errors and 5xx are transient — keep the cached auth so a
        // flaky backend doesn't kick the user out (B1 regression).
        const status =
          (err as { response?: { status?: number } } | null | undefined)?.response?.status
        if (status === 401) {
          finish(null, null)
        } else {
          // eslint-disable-next-line no-console
          console.warn('[auth] /me failed; retaining cached auth', err)
          stopLoading()
        }
      })

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
