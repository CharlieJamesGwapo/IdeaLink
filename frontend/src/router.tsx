import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { Sidebar } from './components/layout/Sidebar'
import { ErrorBoundary } from './components/shared/ErrorBoundary'

// ── Lazy-loaded pages ──────────────────────────────────────────────────────
const HomePage           = lazy(() => import('./pages/public/HomePage').then(m => ({ default: m.HomePage })))
const StudentLoginPage   = lazy(() => import('./pages/public/StudentLoginPage').then(m => ({ default: m.StudentLoginPage })))
const StaffLoginPage     = lazy(() => import('./pages/public/StaffLoginPage').then(m => ({ default: m.StaffLoginPage })))
const SignupPage          = lazy(() => import('./pages/public/SignupPage').then(m => ({ default: m.SignupPage })))

const SubmitPage         = lazy(() => import('./pages/user/SubmitPage').then(m => ({ default: m.SubmitPage })))
const SubmissionsPage    = lazy(() => import('./pages/user/SubmissionsPage').then(m => ({ default: m.SubmissionsPage })))
const AnnouncementsPage  = lazy(() => import('./pages/user/AnnouncementsPage').then(m => ({ default: m.AnnouncementsPage })))

const AdminDashboard     = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const AdminSuggestions   = lazy(() => import('./pages/admin/AdminSuggestions').then(m => ({ default: m.AdminSuggestions })))
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements').then(m => ({ default: m.AdminAnnouncements })))
const AdminTestimonials  = lazy(() => import('./pages/admin/AdminTestimonials').then(m => ({ default: m.AdminTestimonials })))

const RegistrarDashboard   = lazy(() => import('./pages/registrar/RegistrarDashboard').then(m => ({ default: m.RegistrarDashboard })))
const RegistrarSuggestions = lazy(() => import('./pages/registrar/RegistrarSuggestions').then(m => ({ default: m.RegistrarSuggestions })))

const AccountingDashboard   = lazy(() => import('./pages/accounting/AccountingDashboard').then(m => ({ default: m.AccountingDashboard })))
const AccountingSuggestions = lazy(() => import('./pages/accounting/AccountingSuggestions').then(m => ({ default: m.AccountingSuggestions })))

// ── Page loading fallback ──────────────────────────────────────────────────
function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-8 h-8 rounded-full border-2 border-ascb-orange border-t-transparent animate-spin" />
    </div>
  )
}

// ── Scroll to top on every route change ───────────────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  return null
}

// ── Fade-in wrapper — remounts on route change to replay animation ─────────
function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div key={pathname} className="animate-fade-in">
      {children}
    </div>
  )
}

function PublicLayout() {
  return (
    <div className="min-h-screen bg-ascb-navy-dark flex flex-col">
      <Header />
      <main className="flex-1">
        <ErrorBoundary>
          <PageTransition>
            <Suspense fallback={<PageSpinner />}>
              <Outlet />
            </Suspense>
          </PageTransition>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  )
}

function StaffLayout() {
  return (
    <div className="min-h-screen bg-ascb-navy-dark flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop-only header (hidden on mobile — sidebar has its own mobile top bar) */}
        <div className="hidden md:block">
          <Header />
        </div>
        <main className="flex-1 p-4 md:p-6 pt-[72px] md:pt-6 pb-28 md:pb-6 overflow-auto">
          <ErrorBoundary>
            <PageTransition>
              <Suspense fallback={<PageSpinner />}>
                <Outlet />
              </Suspense>
            </PageTransition>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

function RequireAuth({ role }: { role: string }) {
  const { currentUser, role: userRole, isLoading } = useAuth()
  if (isLoading) return (
    <div className="min-h-screen bg-ascb-navy-dark flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-ascb-orange border-t-transparent animate-spin" />
        <p className="text-gray-400 text-sm font-ui">Loading…</p>
      </div>
    </div>
  )
  if (!currentUser || userRole !== role) {
    // Staff roles get sent to the staff portal, not the student login
    const target = role === 'user' ? '/login' : '/staff-login'
    return <Navigate to={target} replace />
  }
  return <Outlet />
}

// Redirect already-authenticated users away from auth pages
function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { currentUser, role, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && currentUser) {
      const dest =
        role === 'admin'      ? '/admin/dashboard'
        : role === 'registrar'  ? '/registrar/dashboard'
        : role === 'accounting' ? '/accounting/dashboard'
        : '/user/submit'
      navigate(dest, { replace: true })
    }
  }, [isLoading, currentUser, role, navigate])

  // Show spinner while auth is resolving OR while redirect is about to fire
  if (isLoading || currentUser) return <PageSpinner />
  return <>{children}</>
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login"       element={<RedirectIfAuthed><StudentLoginPage /></RedirectIfAuthed>} />
          <Route path="/staff-login" element={<RedirectIfAuthed><StaffLoginPage /></RedirectIfAuthed>} />
          <Route path="/signup"      element={<RedirectIfAuthed><SignupPage /></RedirectIfAuthed>} />
          {/* Legacy login URLs → staff portal */}
          <Route path="/admin/login"      element={<Navigate to="/staff-login" replace />} />
          <Route path="/registrar/login"  element={<Navigate to="/staff-login" replace />} />
          <Route path="/accounting/login" element={<Navigate to="/staff-login" replace />} />
        </Route>

        <Route element={<RequireAuth role="user" />}>
          <Route element={<PublicLayout />}>
            <Route path="/user/submit"        element={<SubmitPage />} />
            <Route path="/user/submissions"   element={<SubmissionsPage />} />
            <Route path="/user/announcements" element={<AnnouncementsPage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth role="admin" />}>
          <Route element={<StaffLayout />}>
            <Route path="/admin/dashboard"    element={<AdminDashboard />} />
            <Route path="/admin/suggestions"  element={<AdminSuggestions />} />
            <Route path="/admin/announcements"element={<AdminAnnouncements />} />
            <Route path="/admin/testimonials" element={<AdminTestimonials />} />
          </Route>
        </Route>

        <Route element={<RequireAuth role="registrar" />}>
          <Route element={<StaffLayout />}>
            <Route path="/registrar/dashboard"   element={<RegistrarDashboard />} />
            <Route path="/registrar/suggestions" element={<RegistrarSuggestions />} />
          </Route>
        </Route>

        <Route element={<RequireAuth role="accounting" />}>
          <Route element={<StaffLayout />}>
            <Route path="/accounting/dashboard"   element={<AccountingDashboard />} />
            <Route path="/accounting/suggestions" element={<AccountingSuggestions />} />
          </Route>
        </Route>

        {/* 404 — redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

    </BrowserRouter>
  )
}
