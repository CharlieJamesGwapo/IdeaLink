# IdeaLink Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React + Vite + TypeScript frontend for IdeaLink with 4 role-based portals (user, admin, registrar, accounting), all pages from the spec, and a modernized dark-navy UI using Tailwind CSS.

**Architecture:** Single-page app with React Router v6. `AuthContext` provides current user + role globally. Axios client with `withCredentials: true` talks to the Go backend. Route guards redirect unauthenticated users to the correct login page per role. All API calls go through typed functions in `src/api/`.

**Tech Stack:** React 18 + Vite 5, TypeScript, React Router v6, Axios, Tailwind CSS v4 (Vite plugin), Sonner (toasts), Lucide React (icons), Vitest + React Testing Library

---

## File Map

| File | Responsibility |
|---|---|
| `frontend/vite.config.ts` | Vite config with Tailwind plugin and `/api` proxy |
| `frontend/src/main.tsx` | App entry point, wraps app with AuthProvider + Toaster |
| `frontend/src/router.tsx` | All routes with role-based guards |
| `frontend/src/types.ts` | Shared TypeScript types (User, Suggestion, Announcement, Testimonial, Analytics) |
| `frontend/src/api/client.ts` | Axios instance with baseURL, credentials, 401 interceptor |
| `frontend/src/api/auth.ts` | signup, login, adminLogin, registrarLogin, accountingLogin, logout, me |
| `frontend/src/api/suggestions.ts` | submitSuggestion, getSuggestions, updateStatus, featureSuggestion |
| `frontend/src/api/announcements.ts` | getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement |
| `frontend/src/api/testimonials.ts` | getTestimonials, toggleTestimonial |
| `frontend/src/context/AuthContext.tsx` | currentUser + role state, login/logout helpers, session restore on mount |
| `frontend/src/hooks/useAuth.ts` | Typed hook that consumes AuthContext |
| `frontend/src/hooks/useAnnouncements.ts` | Fetches and returns announcements list |
| `frontend/src/hooks/useSuggestions.ts` | Fetches and returns suggestions list for current role |
| `frontend/src/components/ui/Button.tsx` | Reusable button with variant + size props |
| `frontend/src/components/ui/Badge.tsx` | Status badge (Pending=yellow, Reviewed=green) |
| `frontend/src/components/ui/Modal.tsx` | Generic modal wrapper |
| `frontend/src/components/ui/Toast.tsx` | Re-exports Sonner's `toast` for consistent usage |
| `frontend/src/components/ui/Skeleton.tsx` | Loading skeleton block |
| `frontend/src/components/layout/Header.tsx` | Top nav with logo, links, logout button |
| `frontend/src/components/layout/Sidebar.tsx` | Admin/staff sidebar navigation |
| `frontend/src/components/layout/Footer.tsx` | Simple footer |
| `frontend/src/components/shared/AnnouncementCard.tsx` | Announcement display card |
| `frontend/src/components/shared/SuggestionRow.tsx` | Table row for suggestion with status badge + actions |
| `frontend/src/components/shared/TestimonialCard.tsx` | Testimonial display card |
| `frontend/src/pages/public/HomePage.tsx` | Hero, about, paginated announcements, testimonials carousel |
| `frontend/src/pages/public/LoginPage.tsx` | User login form |
| `frontend/src/pages/public/SignupPage.tsx` | User signup form |
| `frontend/src/pages/user/SubmitPage.tsx` | Suggestion submission form |
| `frontend/src/pages/user/SubmissionsPage.tsx` | User's own submissions with status |
| `frontend/src/pages/user/AnnouncementsPage.tsx` | All announcements (marks read on visit) |
| `frontend/src/pages/admin/AdminLoginPage.tsx` | Admin login form |
| `frontend/src/pages/admin/AdminDashboard.tsx` | Analytics cards + summary stats |
| `frontend/src/pages/admin/AdminSuggestions.tsx` | All suggestions table with filter + feature button |
| `frontend/src/pages/admin/AdminAnnouncements.tsx` | CRUD announcements |
| `frontend/src/pages/admin/AdminTestimonials.tsx` | Toggle testimonial visibility |
| `frontend/src/pages/registrar/RegistrarLoginPage.tsx` | Registrar login |
| `frontend/src/pages/registrar/RegistrarSuggestions.tsx` | Registrar-department suggestions |
| `frontend/src/pages/accounting/AccountingLoginPage.tsx` | Accounting login |
| `frontend/src/pages/accounting/AccountingSuggestions.tsx` | Accounting-department suggestions |

---

### Task 1: Initialize Vite + React + TypeScript + Tailwind

**Files:**
- Create: `frontend/vite.config.ts`
- Create: `frontend/src/index.css`
- Create: `frontend/src/types.ts`

- [ ] **Step 1: Scaffold Vite project**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/IdeaLink
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

- [ ] **Step 2: Install dependencies**

```bash
npm install axios react-router-dom sonner lucide-react
npm install -D @tailwindcss/vite tailwindcss
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 3: Write vite.config.ts**

```ts
// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 4: Write src/index.css**

```css
/* frontend/src/index.css */
@import "tailwindcss";

@theme {
  --color-navy: #1b2b48;
  --color-navy-dark: #0f1d35;
  --color-navy-light: #243a5e;
  --color-accent: #3b82f6;
}
```

- [ ] **Step 5: Write test-setup.ts**

```ts
// frontend/src/test-setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Write src/types.ts**

```ts
// frontend/src/types.ts

export interface User {
  id: number
  email: string
  fullname: string
  last_announcement_view: string
  created_at: string
}

export interface AdminAccount {
  id: number
  email: string
  fullname: string
}

export interface StaffAccount {
  id: number
  username: string
}

export type AuthUser =
  | { role: 'user'; data: User }
  | { role: 'admin'; data: AdminAccount }
  | { role: 'registrar'; data: StaffAccount }
  | { role: 'accounting'; data: StaffAccount }

export interface Suggestion {
  id: number
  user_id: number
  department: string
  user_role: string
  title: string
  description: string
  status: 'Pending' | 'Reviewed'
  anonymous: boolean
  is_read: boolean
  submitted_at: string
  submitter_name?: string
}

export interface Announcement {
  id: number
  admin_id: number
  title: string
  message: string
  date_posted: string
}

export interface Testimonial {
  id: number
  suggestion_id: number | null
  name: string
  department: string
  message: string
  is_active: boolean
  created_at: string
}

export interface Analytics {
  total_users: number
  total_suggestions: number
  this_month_suggestions: number
  unread_suggestions: number
  student_count: number
  faculty_count: number
}
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```
Expected: `VITE ready in XXms` message, app loads at http://localhost:5173

- [ ] **Step 8: Commit**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/IdeaLink
git add frontend/
git commit -m "chore: initialize React + Vite + TypeScript + Tailwind frontend"
```

---

### Task 2: API client + auth API

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/auth.ts`
- Create: `frontend/src/api/suggestions.ts`
- Create: `frontend/src/api/announcements.ts`
- Create: `frontend/src/api/testimonials.ts`

- [ ] **Step 1: Write client.ts**

```ts
// frontend/src/api/client.ts
import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      // Clear any cached auth state and redirect to login
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default client
```

- [ ] **Step 2: Write auth.ts**

```ts
// frontend/src/api/auth.ts
import client from './client'

export const signup = (email: string, password: string, fullname: string) =>
  client.post('/api/auth/signup', { email, password, fullname })

export const login = (email: string, password: string) =>
  client.post('/api/auth/login', { email, password })

export const adminLogin = (email: string, password: string) =>
  client.post('/api/auth/admin/login', { email, password })

export const registrarLogin = (username: string, password: string) =>
  client.post('/api/auth/registrar/login', { username, password })

export const accountingLogin = (username: string, password: string) =>
  client.post('/api/auth/accounting/login', { username, password })

export const logout = () => client.post('/api/auth/logout')

export const me = () => client.get<{ user_id: number; role: string }>('/api/auth/me')
```

- [ ] **Step 3: Write suggestions.ts**

```ts
// frontend/src/api/suggestions.ts
import client from './client'
import type { Suggestion } from '../types'

export interface CreateSuggestionPayload {
  department: string
  user_role: string
  title: string
  description: string
  anonymous: boolean
}

export const getSuggestions = () =>
  client.get<Suggestion[]>('/api/suggestions')

export const submitSuggestion = (payload: CreateSuggestionPayload) =>
  client.post<Suggestion>('/api/suggestions', payload)

export const updateSuggestionStatus = (id: number, status: string) =>
  client.patch(`/api/suggestions/${id}/status`, { status })

export const featureSuggestion = (id: number) =>
  client.post(`/api/suggestions/${id}/feature`)
```

- [ ] **Step 4: Write announcements.ts**

```ts
// frontend/src/api/announcements.ts
import client from './client'
import type { Announcement } from '../types'

export const getAnnouncements = () =>
  client.get<Announcement[]>('/api/announcements')

export const createAnnouncement = (title: string, message: string) =>
  client.post<Announcement>('/api/announcements', { title, message })

export const updateAnnouncement = (id: number, title: string, message: string) =>
  client.put<void>(`/api/announcements/${id}`, { title, message })

export const deleteAnnouncement = (id: number) =>
  client.delete<void>(`/api/announcements/${id}`)
```

- [ ] **Step 5: Write testimonials.ts**

```ts
// frontend/src/api/testimonials.ts
import client from './client'
import type { Testimonial } from '../types'

export const getTestimonials = () =>
  client.get<Testimonial[]>('/api/testimonials')

export const toggleTestimonial = (id: number) =>
  client.patch<Testimonial>(`/api/testimonials/${id}/toggle`)
```

- [ ] **Step 6: Compile check**

```bash
cd frontend
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/IdeaLink
git add frontend/src/api/ frontend/src/types.ts
git commit -m "feat: add typed API client and all API function modules"
```

---

### Task 3: AuthContext + useAuth hook (TDD)

**Files:**
- Create: `frontend/src/context/AuthContext.tsx`
- Create: `frontend/src/hooks/useAuth.ts`
- Create: `frontend/src/context/AuthContext.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// frontend/src/context/AuthContext.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AuthProvider, useAuthContext } from './AuthContext'
import * as authApi from '../api/auth'

vi.mock('../api/auth')

function TestComponent() {
  const { currentUser, role, isLoading } = useAuthContext()
  if (isLoading) return <div>Loading</div>
  if (!currentUser) return <div>Guest</div>
  return <div>Role: {role}</div>
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows Guest when /me returns 401', async () => {
    vi.mocked(authApi.me).mockRejectedValue({ response: { status: 401 } })
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await waitFor(() => expect(screen.getByText('Guest')).toBeInTheDocument())
  })

  it('restores session when /me succeeds', async () => {
    vi.mocked(authApi.me).mockResolvedValue({
      data: { user_id: 1, role: 'user' },
    } as any)
    render(<AuthProvider><TestComponent /></AuthProvider>)
    await waitFor(() => expect(screen.getByText('Role: user')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd frontend
npx vitest run src/context/AuthContext.test.tsx 2>&1 | tail -10
```
Expected: `Cannot find module './AuthContext'`

- [ ] **Step 3: Write AuthContext.tsx**

```tsx
// frontend/src/context/AuthContext.tsx
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
```

- [ ] **Step 4: Write useAuth.ts**

```ts
// frontend/src/hooks/useAuth.ts
export { useAuthContext as useAuth } from '../context/AuthContext'
```

- [ ] **Step 5: Run tests — expect pass**

```bash
cd frontend
npx vitest run src/context/AuthContext.test.tsx
```
Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/IdeaLink
git add frontend/src/context/ frontend/src/hooks/useAuth.ts
git commit -m "feat: add AuthContext with session restore and useAuth hook"
```

---

### Task 4: Data hooks

**Files:**
- Create: `frontend/src/hooks/useAnnouncements.ts`
- Create: `frontend/src/hooks/useSuggestions.ts`

- [ ] **Step 1: Write useAnnouncements.ts**

```ts
// frontend/src/hooks/useAnnouncements.ts
import { useEffect, useState } from 'react'
import { getAnnouncements } from '../api/announcements'
import type { Announcement } from '../types'

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnnouncements = () => {
    setIsLoading(true)
    getAnnouncements()
      .then((res) => setAnnouncements(res.data))
      .catch(() => setError('Failed to load announcements'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  return { announcements, isLoading, error, refetch: fetchAnnouncements }
}
```

- [ ] **Step 2: Write useSuggestions.ts**

```ts
// frontend/src/hooks/useSuggestions.ts
import { useEffect, useState } from 'react'
import { getSuggestions } from '../api/suggestions'
import type { Suggestion } from '../types'

export function useSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSuggestions = () => {
    setIsLoading(true)
    getSuggestions()
      .then((res) => setSuggestions(res.data))
      .catch(() => setError('Failed to load suggestions'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    fetchSuggestions()
  }, [])

  return { suggestions, setSuggestions, isLoading, error, refetch: fetchSuggestions }
}
```

- [ ] **Step 3: Commit**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/IdeaLink
git add frontend/src/hooks/
git commit -m "feat: add useAnnouncements and useSuggestions data hooks"
```

---

### Task 5: UI primitives

**Files:**
- Create: `frontend/src/components/ui/Button.tsx`
- Create: `frontend/src/components/ui/Badge.tsx`
- Create: `frontend/src/components/ui/Modal.tsx`
- Create: `frontend/src/components/ui/Skeleton.tsx`

- [ ] **Step 1: Write Button.tsx**

```tsx
// frontend/src/components/ui/Button.tsx
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'

  const variants = {
    primary: 'bg-accent text-white hover:bg-blue-600 focus:ring-accent disabled:opacity-50',
    secondary: 'bg-navy-light text-white hover:bg-navy focus:ring-navy-light disabled:opacity-50',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600 disabled:opacity-50',
    ghost: 'text-gray-300 hover:bg-navy-light focus:ring-navy-light',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : null}
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Create lib/utils.ts**

```ts
// frontend/src/lib/utils.ts
export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ')
}
```

- [ ] **Step 3: Write Badge.tsx**

```tsx
// frontend/src/components/ui/Badge.tsx
import { cn } from '../../lib/utils'

interface BadgeProps {
  status: 'Pending' | 'Reviewed' | string
  className?: string
}

export function Badge({ status, className }: BadgeProps) {
  const colors = {
    Pending: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    Reviewed: 'bg-green-500/20 text-green-300 border border-green-500/30',
  }
  const color = colors[status as keyof typeof colors] ?? 'bg-gray-500/20 text-gray-300 border border-gray-500/30'

  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', color, className)}>
      {status}
    </span>
  )
}
```

- [ ] **Step 4: Write Modal.tsx**

```tsx
// frontend/src/components/ui/Modal.tsx
import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-navy-light rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write Skeleton.tsx**

```tsx
// frontend/src/components/ui/Skeleton.tsx
import { cn } from '../../lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse rounded bg-navy-light', className)} />
  )
}
```

- [ ] **Step 6: Commit**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/IdeaLink
git add frontend/src/components/ui/ frontend/src/lib/
git commit -m "feat: add UI primitives (Button, Badge, Modal, Skeleton)"
```

---

### Task 6: Layout components

**Files:**
- Create: `frontend/src/components/layout/Header.tsx`
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/Footer.tsx`

- [ ] **Step 1: Write Header.tsx**

```tsx
// frontend/src/components/layout/Header.tsx
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Bell } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { logout } from '../../api/auth'
import { toast } from 'sonner'

export function Header() {
  const { currentUser, role, clearAuth } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      clearAuth()
      navigate('/login')
    } catch {
      toast.error('Logout failed')
    }
  }

  return (
    <header className="bg-navy border-b border-navy-light sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-white">Idea<span className="text-accent">Link</span></span>
        </Link>

        <nav className="flex items-center gap-4">
          {!currentUser && (
            <>
              <Link to="/login" className="text-gray-300 hover:text-white text-sm transition-colors">Login</Link>
              <Link to="/signup" className="bg-accent text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-600 transition-colors">Sign Up</Link>
            </>
          )}
          {currentUser && role === 'user' && (
            <>
              <Link to="/user/announcements" className="text-gray-300 hover:text-white transition-colors">
                <Bell size={18} />
              </Link>
              <Link to="/user/submit" className="text-gray-300 hover:text-white text-sm transition-colors">Submit</Link>
              <Link to="/user/submissions" className="text-gray-300 hover:text-white text-sm transition-colors">My Submissions</Link>
              <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors">
                <LogOut size={18} />
              </button>
            </>
          )}
          {currentUser && role !== 'user' && (
            <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-sm">
              <LogOut size={16} /> Logout
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Write Sidebar.tsx**

```tsx
// frontend/src/components/layout/Sidebar.tsx
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, Megaphone, Star } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  roles: string[]
}

const navItems: NavItem[] = [
  { to: '/admin/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard', roles: ['admin'] },
  { to: '/admin/suggestions', icon: <MessageSquare size={18} />, label: 'Suggestions', roles: ['admin'] },
  { to: '/admin/announcements', icon: <Megaphone size={18} />, label: 'Announcements', roles: ['admin'] },
  { to: '/admin/testimonials', icon: <Star size={18} />, label: 'Testimonials', roles: ['admin'] },
  { to: '/registrar/suggestions', icon: <MessageSquare size={18} />, label: 'Suggestions', roles: ['registrar'] },
  { to: '/accounting/suggestions', icon: <MessageSquare size={18} />, label: 'Suggestions', roles: ['accounting'] },
]

export function Sidebar() {
  const { role } = useAuth()

  const items = navItems.filter((item) => role && item.roles.includes(role))

  return (
    <aside className="w-56 bg-navy-dark border-r border-navy-light min-h-screen p-4 flex flex-col gap-1">
      <p className="text-xs uppercase tracking-widest text-gray-500 px-3 mb-2">
        {role === 'admin' ? 'Admin Panel' : role === 'registrar' ? 'Registrar' : 'Accounting'}
      </p>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-accent text-white'
                : 'text-gray-400 hover:bg-navy-light hover:text-white'
            )
          }
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </aside>
  )
}
```

- [ ] **Step 3: Write Footer.tsx**

```tsx
// frontend/src/components/layout/Footer.tsx
export function Footer() {
  return (
    <footer className="bg-navy-dark border-t border-navy-light py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} IdeaLink — ASCB E-Suggestion Platform
      </div>
    </footer>
  )
}
```

- [ ] **Step 4: Commit**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/IdeaLink
git add frontend/src/components/layout/
git commit -m "feat: add Header, Sidebar, and Footer layout components"
```

---

### Task 7: Shared display components

**Files:**
- Create: `frontend/src/components/shared/AnnouncementCard.tsx`
- Create: `frontend/src/components/shared/SuggestionRow.tsx`
- Create: `frontend/src/components/shared/TestimonialCard.tsx`

- [ ] **Step 1: Write AnnouncementCard.tsx**

```tsx
// frontend/src/components/shared/AnnouncementCard.tsx
import { Megaphone } from 'lucide-react'
import type { Announcement } from '../../types'

interface Props {
  announcement: Announcement
}

export function AnnouncementCard({ announcement }: Props) {
  const date = new Date(announcement.date_posted).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="bg-navy-light rounded-xl p-5 border border-navy hover:border-accent/40 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
          <Megaphone size={18} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm leading-snug">{announcement.title}</h3>
          <p className="mt-1 text-gray-400 text-sm leading-relaxed">{announcement.message}</p>
          <p className="mt-2 text-xs text-gray-500">{date}</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write SuggestionRow.tsx**

```tsx
// frontend/src/components/shared/SuggestionRow.tsx
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import type { Suggestion } from '../../types'

interface Props {
  suggestion: Suggestion
  showActions?: boolean
  showFeature?: boolean
  onStatusChange?: (id: number, status: string) => void
  onFeature?: (id: number) => void
}

export function SuggestionRow({ suggestion, showActions, showFeature, onStatusChange, onFeature }: Props) {
  const date = new Date(suggestion.submitted_at).toLocaleDateString()
  const name = suggestion.anonymous ? 'Anonymous' : (suggestion.submitter_name ?? 'Unknown')

  return (
    <tr className="border-b border-navy-light hover:bg-navy-light/50 transition-colors">
      <td className="px-4 py-3 text-sm text-white font-medium">{suggestion.title}</td>
      <td className="px-4 py-3 text-sm text-gray-400">{suggestion.department}</td>
      <td className="px-4 py-3 text-sm text-gray-400">{name}</td>
      <td className="px-4 py-3 text-sm text-gray-400">{date}</td>
      <td className="px-4 py-3">
        <Badge status={suggestion.status} />
      </td>
      {showActions && (
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onStatusChange?.(suggestion.id, suggestion.status === 'Pending' ? 'Reviewed' : 'Pending')}
            >
              {suggestion.status === 'Pending' ? 'Mark Reviewed' : 'Mark Pending'}
            </Button>
            {showFeature && (
              <Button size="sm" variant="ghost" onClick={() => onFeature?.(suggestion.id)}>
                Feature
              </Button>
            )}
          </div>
        </td>
      )}
    </tr>
  )
}
```

- [ ] **Step 3: Write TestimonialCard.tsx**

```tsx
// frontend/src/components/shared/TestimonialCard.tsx
import { Quote } from 'lucide-react'
import type { Testimonial } from '../../types'

interface Props {
  testimonial: Testimonial
  showToggle?: boolean
  onToggle?: (id: number) => void
}

export function TestimonialCard({ testimonial, showToggle, onToggle }: Props) {
  return (
    <div className="bg-navy-light rounded-xl p-6 border border-navy flex flex-col gap-4">
      <Quote size={20} className="text-accent opacity-60" />
      <p className="text-gray-300 text-sm leading-relaxed italic">"{testimonial.message}"</p>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-sm font-medium">{testimonial.name}</p>
          <p className="text-gray-500 text-xs">{testimonial.department}</p>
        </div>
        {showToggle && (
          <button
            onClick={() => onToggle?.(testimonial.id)}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              testimonial.is_active
                ? 'bg-green-500/20 text-green-300 hover:bg-red-500/20 hover:text-red-300'
                : 'bg-gray-500/20 text-gray-400 hover:bg-green-500/20 hover:text-green-300'
            }`}
          >
            {testimonial.is_active ? 'Active' : 'Hidden'}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/IdeaLink
git add frontend/src/components/shared/
git commit -m "feat: add AnnouncementCard, SuggestionRow, TestimonialCard shared components"
```

---

### Task 8: Router with route guards

**Files:**
- Create: `frontend/src/router.tsx`
- Create: `frontend/src/main.tsx`

- [ ] **Step 1: Write router.tsx**

```tsx
// frontend/src/router.tsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { Sidebar } from './components/layout/Sidebar'

// Public pages
import { HomePage } from './pages/public/HomePage'
import { LoginPage } from './pages/public/LoginPage'
import { SignupPage } from './pages/public/SignupPage'

// User pages
import { SubmitPage } from './pages/user/SubmitPage'
import { SubmissionsPage } from './pages/user/SubmissionsPage'
import { AnnouncementsPage } from './pages/user/AnnouncementsPage'

// Admin pages
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminSuggestions } from './pages/admin/AdminSuggestions'
import { AdminAnnouncements } from './pages/admin/AdminAnnouncements'
import { AdminTestimonials } from './pages/admin/AdminTestimonials'

// Registrar pages
import { RegistrarLoginPage } from './pages/registrar/RegistrarLoginPage'
import { RegistrarSuggestions } from './pages/registrar/RegistrarSuggestions'

// Accounting pages
import { AccountingLoginPage } from './pages/accounting/AccountingLoginPage'
import { AccountingSuggestions } from './pages/accounting/AccountingSuggestions'

function PublicLayout() {
  return (
    <div className="min-h-screen bg-navy-dark flex flex-col">
      <Header />
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  )
}

function StaffLayout() {
  return (
    <div className="min-h-screen bg-navy-dark flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6"><Outlet /></main>
      </div>
    </div>
  )
}

function RequireAuth({ role }: { role: string }) {
  const { currentUser, role: userRole, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen bg-navy-dark flex items-center justify-center text-white">Loading…</div>
  if (!currentUser || userRole !== role) {
    const loginPath = role === 'admin' ? '/admin/login'
      : role === 'registrar' ? '/registrar/login'
      : role === 'accounting' ? '/accounting/login'
      : '/login'
    return <Navigate to={loginPath} replace />
  }
  return <Outlet />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/registrar/login" element={<RegistrarLoginPage />} />
          <Route path="/accounting/login" element={<AccountingLoginPage />} />
        </Route>

        {/* User portal */}
        <Route element={<RequireAuth role="user" />}>
          <Route element={<PublicLayout />}>
            <Route path="/user/submit" element={<SubmitPage />} />
            <Route path="/user/submissions" element={<SubmissionsPage />} />
            <Route path="/user/announcements" element={<AnnouncementsPage />} />
          </Route>
        </Route>

        {/* Admin portal */}
        <Route element={<RequireAuth role="admin" />}>
          <Route element={<StaffLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/suggestions" element={<AdminSuggestions />} />
            <Route path="/admin/announcements" element={<AdminAnnouncements />} />
            <Route path="/admin/testimonials" element={<AdminTestimonials />} />
          </Route>
        </Route>

        {/* Registrar portal */}
        <Route element={<RequireAuth role="registrar" />}>
          <Route element={<StaffLayout />}>
            <Route path="/registrar/suggestions" element={<RegistrarSuggestions />} />
          </Route>
        </Route>

        {/* Accounting portal */}
        <Route element={<RequireAuth role="accounting" />}>
          <Route element={<StaffLayout />}>
            <Route path="/accounting/suggestions" element={<AccountingSuggestions />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Write main.tsx**

```tsx
// frontend/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { AppRouter } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppRouter />
      <Toaster position="top-right" richColors />
    </AuthProvider>
  </StrictMode>
)
```

- [ ] **Step 3: Commit**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/IdeaLink
git add frontend/src/router.tsx frontend/src/main.tsx
git commit -m "feat: add React Router with role-based route guards and layouts"
```

---

### Task 9: Public pages (HomePage, LoginPage, SignupPage)

**Files:**
- Create: `frontend/src/pages/public/HomePage.tsx`
- Create: `frontend/src/pages/public/LoginPage.tsx`
- Create: `frontend/src/pages/public/SignupPage.tsx`

- [ ] **Step 1: Write HomePage.tsx**

```tsx
// frontend/src/pages/public/HomePage.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAnnouncements } from '../../hooks/useAnnouncements'
import { AnnouncementCard } from '../../components/shared/AnnouncementCard'
import { TestimonialCard } from '../../components/shared/TestimonialCard'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { getTestimonials } from '../../api/testimonials'
import { useEffect, type useState as UseState } from 'react'
import type { Testimonial } from '../../types'

const ANNOUNCEMENTS_PER_PAGE = 5

export function HomePage() {
  const { announcements, isLoading } = useAnnouncements()
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [page, setPage] = useState(1)

  useEffect(() => {
    getTestimonials().then((res) => setTestimonials(res.data)).catch(() => {})
  }, [])

  const totalPages = Math.ceil(announcements.length / ANNOUNCEMENTS_PER_PAGE)
  const paged = announcements.slice((page - 1) * ANNOUNCEMENTS_PER_PAGE, page * ANNOUNCEMENTS_PER_PAGE)

  return (
    <div className="text-white">
      {/* Hero */}
      <section className="bg-navy py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Your Voice.<br />
            <span className="text-accent">Heard by Those Who Matter.</span>
          </h1>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            IdeaLink is ASCB's e-suggestion platform. Submit ideas and concerns directly to the Registrar or Accounting departments — anonymously or openly.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/signup">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="secondary">Sign In</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-16 px-4 bg-navy-dark">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">About IdeaLink</h2>
          <p className="text-gray-400 leading-relaxed max-w-2xl mx-auto">
            ASCB's IdeaLink platform empowers students and faculty to share feedback, suggestions, and concerns with school administration. Every submission is reviewed and acted upon.
          </p>
        </div>
      </section>

      {/* Announcements */}
      <section className="py-16 px-4 bg-navy">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Announcements</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : paged.length === 0 ? (
            <p className="text-center text-gray-500">No announcements yet.</p>
          ) : (
            <>
              <div className="space-y-3">
                {paged.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm text-gray-400">{page} / {totalPages}</span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-16 px-4 bg-navy-dark">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 text-center">What People Say</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => <TestimonialCard key={t.id} testimonial={t} />)}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write LoginPage.tsx**

```tsx
// frontend/src/pages/public/LoginPage.tsx
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { login } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'

export function LoginPage() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await login(email, password)
      setAuth({ id: res.data.id }, 'user')
      navigate('/user/submit')
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Welcome back</h1>
        <form onSubmit={handleSubmit} className="bg-navy rounded-xl p-6 border border-navy-light space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-navy-light border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-navy-light border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <Button type="submit" isLoading={isLoading} className="w-full">Sign In</Button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          No account? <Link to="/signup" className="text-accent hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write SignupPage.tsx**

```tsx
// frontend/src/pages/public/SignupPage.tsx
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { signup } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'

export function SignupPage() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullname, setFullname] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await signup(email, password, fullname)
      setAuth({ id: res.data.id }, 'user')
      navigate('/user/submit')
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Signup failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Create an account</h1>
        <form onSubmit={handleSubmit} className="bg-navy rounded-xl p-6 border border-navy-light space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Full Name</label>
            <input
              type="text"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              required
              className="w-full bg-navy-light border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-navy-light border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-navy-light border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <Button type="submit" isLoading={isLoading} className="w-full">Create Account</Button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          Have an account? <Link to="/login" className="text-accent hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/IdeaLink
git add frontend/src/pages/public/
git commit -m "feat: add HomePage, LoginPage, and SignupPage"
```

---

### Task 10: User portal pages

**Files:**
- Create: `frontend/src/pages/user/SubmitPage.tsx`
- Create: `frontend/src/pages/user/SubmissionsPage.tsx`
- Create: `frontend/src/pages/user/AnnouncementsPage.tsx`

- [ ] **Step 1: Write SubmitPage.tsx**

```tsx
// frontend/src/pages/user/SubmitPage.tsx
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { submitSuggestion } from '../../api/suggestions'
import { Button } from '../../components/ui/Button'

export function SubmitPage() {
  const [department, setDepartment] = useState('Registrar')
  const [userRole, setUserRole] = useState('Student')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await submitSuggestion({ department, user_role: userRole, title, description, anonymous })
      toast.success('Suggestion submitted successfully!')
      setTitle('')
      setDescription('')
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Submission failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-white mb-2">Submit a Suggestion</h1>
      <p className="text-gray-400 text-sm mb-8">Your feedback helps improve our school.</p>

      <form onSubmit={handleSubmit} className="bg-navy rounded-xl p-6 border border-navy-light space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-navy-light border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="Registrar">Registrar</option>
              <option value="Accounting Office">Accounting Office</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Your Role</label>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="w-full bg-navy-light border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="Student">Student</option>
              <option value="Faculty Staff">Faculty Staff</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Brief summary of your suggestion"
            className="w-full bg-navy-light border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={5}
            placeholder="Describe your suggestion in detail..."
            className="w-full bg-navy-light border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="rounded border-navy-light"
          />
          <span className="text-sm text-gray-400">Submit anonymously</span>
        </label>
        <Button type="submit" isLoading={isLoading} className="w-full">Submit Suggestion</Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Write SubmissionsPage.tsx**

```tsx
// frontend/src/pages/user/SubmissionsPage.tsx
import { useSuggestions } from '../../hooks/useSuggestions'
import { Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'

export function SubmissionsPage() {
  const { suggestions, isLoading } = useSuggestions()

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-white mb-8">My Submissions</h1>
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p>You haven't submitted any suggestions yet.</p>
        </div>
      ) : (
        <div className="bg-navy rounded-xl border border-navy-light overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-navy-light bg-navy-dark">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s) => (
                <tr key={s.id} className="border-b border-navy-light hover:bg-navy-light/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-white font-medium">{s.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{s.department}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {new Date(s.submitted_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3"><Badge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Write AnnouncementsPage.tsx**

```tsx
// frontend/src/pages/user/AnnouncementsPage.tsx
import { useEffect } from 'react'
import { useAnnouncements } from '../../hooks/useAnnouncements'
import { AnnouncementCard } from '../../components/shared/AnnouncementCard'
import { Skeleton } from '../../components/ui/Skeleton'
import client from '../../api/client'

export function AnnouncementsPage() {
  const { announcements, isLoading } = useAnnouncements()

  // Mark announcements as read on visit (updates last_announcement_view server-side via /api/auth/me re-call)
  useEffect(() => {
    // The backend updates last_announcement_view when calling me() — call it silently
    client.get('/api/auth/me').catch(() => {})
  }, [])

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-white mb-8">Announcements</h1>
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : announcements.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No announcements yet.</p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
        </div>
      )}
    </div>
  )
}
```

> **Note:** For proper "mark as read" support, add a `PATCH /api/auth/mark-read` endpoint that calls `UpdateLastAnnouncementView`. The current implementation calls `/api/auth/me` as a no-op. If the backend implements the endpoint later, update this to use it.

- [ ] **Step 4: Commit**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/IdeaLink
git add frontend/src/pages/user/
git commit -m "feat: add user portal pages (Submit, Submissions, Announcements)"
```

---

### Task 11: Admin portal pages

**Files:**
- Create: `frontend/src/pages/admin/AdminLoginPage.tsx`
- Create: `frontend/src/pages/admin/AdminDashboard.tsx`
- Create: `frontend/src/pages/admin/AdminSuggestions.tsx`
- Create: `frontend/src/pages/admin/AdminAnnouncements.tsx`
- Create: `frontend/src/pages/admin/AdminTestimonials.tsx`

- [ ] **Step 1: Write AdminLoginPage.tsx**

```tsx
// frontend/src/pages/admin/AdminLoginPage.tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { adminLogin } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'

export function AdminLoginPage() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await adminLogin(email, password)
      setAuth({ id: res.data.id }, 'admin')
      navigate('/admin/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Admin Login</h1>
        <p className="text-gray-500 text-sm text-center mb-6">IdeaLink Administration</p>
        <form onSubmit={handleSubmit} className="bg-navy rounded-xl p-6 border border-navy-light space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-navy-light border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-navy-light border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <Button type="submit" isLoading={isLoading} className="w-full">Sign In</Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write AdminDashboard.tsx**

```tsx
// frontend/src/pages/admin/AdminDashboard.tsx
import { useEffect, useState } from 'react'
import { Users, MessageSquare, TrendingUp, Eye } from 'lucide-react'
import { Skeleton } from '../../components/ui/Skeleton'
import client from '../../api/client'
import type { Analytics } from '../../types'

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  color: string
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-navy rounded-xl p-5 border border-navy-light">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${color}`}>{icon}</div>
      <div className="text-3xl font-bold text-white">{value.toLocaleString()}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  )
}

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    client.get<Analytics>('/api/admin/analytics')
      .then((res) => setAnalytics(res.data))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    )
  }

  if (!analytics) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={analytics.total_users} icon={<Users size={18} className="text-blue-400" />} color="bg-blue-500/10" />
        <StatCard label="Total Suggestions" value={analytics.total_suggestions} icon={<MessageSquare size={18} className="text-purple-400" />} color="bg-purple-500/10" />
        <StatCard label="This Month" value={analytics.this_month_suggestions} icon={<TrendingUp size={18} className="text-green-400" />} color="bg-green-500/10" />
        <StatCard label="Unread" value={analytics.unread_suggestions} icon={<Eye size={18} className="text-yellow-400" />} color="bg-yellow-500/10" />
      </div>
      <div className="bg-navy rounded-xl p-5 border border-navy-light">
        <h2 className="font-semibold text-white mb-4">Submissions Breakdown</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-gray-400 text-sm">Students</div>
            <div className="text-2xl font-bold text-white">{analytics.student_count}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Faculty Staff</div>
            <div className="text-2xl font-bold text-white">{analytics.faculty_count}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write AdminSuggestions.tsx**

```tsx
// frontend/src/pages/admin/AdminSuggestions.tsx
import { useState } from 'react'
import { toast } from 'sonner'
import { useSuggestions } from '../../hooks/useSuggestions'
import { SuggestionRow } from '../../components/shared/SuggestionRow'
import { Skeleton } from '../../components/ui/Skeleton'
import { updateSuggestionStatus, featureSuggestion } from '../../api/suggestions'

export function AdminSuggestions() {
  const { suggestions, setSuggestions, isLoading } = useSuggestions()
  const [filter, setFilter] = useState<'all' | 'Pending' | 'Reviewed'>('all')

  const filtered = filter === 'all' ? suggestions : suggestions.filter((s) => s.status === filter)

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await updateSuggestionStatus(id, newStatus)
      setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, status: newStatus as any } : s))
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleFeature = async (id: number) => {
    try {
      await featureSuggestion(id)
      toast.success('Suggestion featured as testimonial!')
    } catch {
      toast.error('Failed to feature suggestion')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Suggestions</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="bg-navy-light border border-navy-light rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
        >
          <option value="all">All</option>
          <option value="Pending">Pending</option>
          <option value="Reviewed">Reviewed</option>
        </select>
      </div>
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No suggestions found.</p>
      ) : (
        <div className="bg-navy rounded-xl border border-navy-light overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-navy-light bg-navy-dark">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dept</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitter</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <SuggestionRow
                  key={s.id}
                  suggestion={s}
                  showActions
                  showFeature
                  onStatusChange={handleStatusChange}
                  onFeature={handleFeature}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Write AdminAnnouncements.tsx**

```tsx
// frontend/src/pages/admin/AdminAnnouncements.tsx
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useAnnouncements } from '../../hooks/useAnnouncements'
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../../api/announcements'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Skeleton } from '../../components/ui/Skeleton'
import type { Announcement } from '../../types'

export function AdminAnnouncements() {
  const { announcements, isLoading, refetch } = useAnnouncements()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const openCreate = () => { setEditing(null); setTitle(''); setMessage(''); setIsModalOpen(true) }
  const openEdit = (a: Announcement) => { setEditing(a); setTitle(a.title); setMessage(a.message); setIsModalOpen(true) }

  const handleSave = async () => {
    if (!title.trim() || !message.trim()) return toast.error('Title and message are required')
    setIsSaving(true)
    try {
      if (editing) {
        await updateAnnouncement(editing.id, title, message)
        toast.success('Announcement updated')
      } else {
        await createAnnouncement(title, message)
        toast.success('Announcement created')
      }
      setIsModalOpen(false)
      refetch()
    } catch {
      toast.error('Failed to save announcement')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this announcement?')) return
    try {
      await deleteAnnouncement(id)
      toast.success('Deleted')
      refetch()
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Announcements</h1>
        <Button size="sm" onClick={openCreate}><Plus size={16} className="mr-1" /> New</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : announcements.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No announcements yet.</p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-navy rounded-xl p-4 border border-navy-light flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium text-white text-sm">{a.title}</h3>
                <p className="text-gray-400 text-sm mt-1 line-clamp-2">{a.message}</p>
                <p className="text-gray-600 text-xs mt-1">{new Date(a.date_posted).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Pencil size={14} /></Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(a.id)}><Trash2 size={14} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Edit Announcement' : 'New Announcement'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-navy-dark border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full bg-navy-dark border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button isLoading={isSaving} onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 5: Write AdminTestimonials.tsx**

```tsx
// frontend/src/pages/admin/AdminTestimonials.tsx
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getTestimonials, toggleTestimonial } from '../../api/testimonials'
import { TestimonialCard } from '../../components/shared/TestimonialCard'
import { Skeleton } from '../../components/ui/Skeleton'
import type { Testimonial } from '../../types'

export function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Admin needs all testimonials (active + inactive) — currently endpoint returns active only
    // Use the same endpoint; active toggle shows all states
    getTestimonials()
      .then((res) => setTestimonials(res.data))
      .finally(() => setIsLoading(false))
  }, [])

  const handleToggle = async (id: number) => {
    try {
      const res = await toggleTestimonial(id)
      setTestimonials((prev) => prev.map((t) => t.id === id ? res.data : t))
      toast.success('Testimonial updated')
    } catch {
      toast.error('Failed to update testimonial')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Testimonials</h1>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : testimonials.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No testimonials yet. Feature a suggestion to create one.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <TestimonialCard key={t.id} testimonial={t} showToggle onToggle={handleToggle} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/IdeaLink
git add frontend/src/pages/admin/
git commit -m "feat: add admin portal (login, dashboard, suggestions, announcements, testimonials)"
```

---

### Task 12: Registrar and Accounting portal pages

**Files:**
- Create: `frontend/src/pages/registrar/RegistrarLoginPage.tsx`
- Create: `frontend/src/pages/registrar/RegistrarSuggestions.tsx`
- Create: `frontend/src/pages/accounting/AccountingLoginPage.tsx`
- Create: `frontend/src/pages/accounting/AccountingSuggestions.tsx`

- [ ] **Step 1: Write RegistrarLoginPage.tsx**

```tsx
// frontend/src/pages/registrar/RegistrarLoginPage.tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { registrarLogin } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'

export function RegistrarLoginPage() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await registrarLogin(username, password)
      setAuth({ id: res.data.id }, 'registrar')
      navigate('/registrar/suggestions')
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Registrar Login</h1>
        <p className="text-gray-500 text-sm text-center mb-6">IdeaLink — Registrar Office</p>
        <form onSubmit={handleSubmit} className="bg-navy rounded-xl p-6 border border-navy-light space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-navy-light border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-navy-light border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <Button type="submit" isLoading={isLoading} className="w-full">Sign In</Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write RegistrarSuggestions.tsx**

```tsx
// frontend/src/pages/registrar/RegistrarSuggestions.tsx
import { toast } from 'sonner'
import { useSuggestions } from '../../hooks/useSuggestions'
import { SuggestionRow } from '../../components/shared/SuggestionRow'
import { Skeleton } from '../../components/ui/Skeleton'
import { updateSuggestionStatus } from '../../api/suggestions'

export function RegistrarSuggestions() {
  const { suggestions, setSuggestions, isLoading } = useSuggestions()

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await updateSuggestionStatus(id, newStatus)
      setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, status: newStatus as any } : s))
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Registrar — Suggestions</h1>
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : suggestions.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No suggestions for Registrar yet.</p>
      ) : (
        <div className="bg-navy rounded-xl border border-navy-light overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-navy-light bg-navy-dark">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dept</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitter</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s) => (
                <SuggestionRow
                  key={s.id}
                  suggestion={s}
                  showActions
                  onStatusChange={handleStatusChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Write AccountingLoginPage.tsx**

```tsx
// frontend/src/pages/accounting/AccountingLoginPage.tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { accountingLogin } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'

export function AccountingLoginPage() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const res = await accountingLogin(username, password)
      setAuth({ id: res.data.id }, 'accounting')
      navigate('/accounting/suggestions')
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Accounting Login</h1>
        <p className="text-gray-500 text-sm text-center mb-6">IdeaLink — Accounting Office</p>
        <form onSubmit={handleSubmit} className="bg-navy rounded-xl p-6 border border-navy-light space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-navy-light border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-navy-light border border-navy-light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <Button type="submit" isLoading={isLoading} className="w-full">Sign In</Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write AccountingSuggestions.tsx**

```tsx
// frontend/src/pages/accounting/AccountingSuggestions.tsx
import { toast } from 'sonner'
import { useSuggestions } from '../../hooks/useSuggestions'
import { SuggestionRow } from '../../components/shared/SuggestionRow'
import { Skeleton } from '../../components/ui/Skeleton'
import { updateSuggestionStatus } from '../../api/suggestions'

export function AccountingSuggestions() {
  const { suggestions, setSuggestions, isLoading } = useSuggestions()

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await updateSuggestionStatus(id, newStatus)
      setSuggestions((prev) => prev.map((s) => s.id === id ? { ...s, status: newStatus as any } : s))
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Accounting — Suggestions</h1>
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : suggestions.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No suggestions for Accounting Office yet.</p>
      ) : (
        <div className="bg-navy rounded-xl border border-navy-light overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-navy-light bg-navy-dark">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dept</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitter</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s) => (
                <SuggestionRow
                  key={s.id}
                  suggestion={s}
                  showActions
                  onStatusChange={handleStatusChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/IdeaLink
git add frontend/src/pages/registrar/ frontend/src/pages/accounting/
git commit -m "feat: add registrar and accounting portal pages"
```

---

### Task 13: Fix HomePage useState import typo + TypeScript compile check

**Files:**
- Modify: `frontend/src/pages/public/HomePage.tsx`

- [ ] **Step 1: Fix the duplicate useState import in HomePage**

The `HomePage.tsx` file in Task 9 has an incorrect import at line:
```ts
import { useEffect, type useState as UseState } from 'react'
```
Replace the entire import block at the top of HomePage.tsx with:

```tsx
// frontend/src/pages/public/HomePage.tsx — top of file only
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAnnouncements } from '../../hooks/useAnnouncements'
import { AnnouncementCard } from '../../components/shared/AnnouncementCard'
import { TestimonialCard } from '../../components/shared/TestimonialCard'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { getTestimonials } from '../../api/testimonials'
import type { Testimonial } from '../../types'
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd frontend
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Run all unit tests**

```bash
npx vitest run
```
Expected: 2 tests pass (AuthContext tests).

- [ ] **Step 4: Start dev server and manually verify all routes load**

```bash
npm run dev
```
Open http://localhost:5173 and verify:
- `/` loads hero section
- `/login` shows login form
- `/signup` shows signup form
- `/admin/login` shows admin login
- `/user/submit` redirects to `/login` (not authenticated)
- `/admin/dashboard` redirects to `/admin/login` (not authenticated)

- [ ] **Step 5: Final commit**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/IdeaLink
git add frontend/src/pages/public/HomePage.tsx
git commit -m "fix: correct useState import in HomePage, verify TypeScript compilation"
```

---

### Task 14: Add .env files and deployment config

**Files:**
- Create: `frontend/.env.example`
- Create: `backend/.env.example`

- [ ] **Step 1: Write frontend .env.example**

```bash
# frontend/.env.example
VITE_API_URL=https://your-backend.onrender.com
```

- [ ] **Step 2: Write backend .env.example**

```bash
# backend/.env.example
DATABASE_URL=postgres://user:pass@host:5432/idealink?sslmode=require
JWT_SECRET=your-long-random-secret-here
PORT=8080
FRONTEND_URL=https://your-frontend.vercel.app
```

- [ ] **Step 3: Add .gitignore entries**

```bash
# In project root
echo ".env" >> .gitignore
echo "backend/.env" >> .gitignore
echo "frontend/.env" >> .gitignore
echo "frontend/.env.local" >> .gitignore
```

- [ ] **Step 4: Commit**

```bash
cd /Applications/XAMPP/xamppfiles/htdocs/IdeaLink
git add frontend/.env.example backend/.env.example .gitignore
git commit -m "chore: add env example files and .gitignore entries"
```
