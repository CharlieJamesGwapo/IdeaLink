import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { Sidebar } from './components/layout/Sidebar'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { OfficeHoursPage } from './pages/shared/OfficeHoursPage'

// ── Lazy-loaded pages ──────────────────────────────────────────────────────
const HomePage           = lazy(() => import('./pages/public/HomePage').then(m => ({ default: m.HomePage })))
const StudentLoginPage   = lazy(() => import('./pages/public/StudentLoginPage').then(m => ({ default: m.StudentLoginPage })))
const StaffLoginPage     = lazy(() => import('./pages/public/StaffLoginPage').then(m => ({ default: m.StaffLoginPage })))
const ForgotPasswordPage  = lazy(() => import('./pages/public/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage   = lazy(() => import('./pages/public/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const CompleteProfilePage = lazy(() => import('./pages/user/CompleteProfilePage').then(m => ({ default: m.CompleteProfilePage })))

const SubmitPage         = lazy(() => import('./pages/user/SubmitPage').then(m => ({ default: m.SubmitPage })))
const SubmissionsPage    = lazy(() => import('./pages/user/SubmissionsPage').then(m => ({ default: m.SubmissionsPage })))
const AnnouncementsPage  = lazy(() => import('./pages/user/AnnouncementsPage').then(m => ({ default: m.AnnouncementsPage })))
const MyAccountPage      = lazy(() => import('./pages/user/MyAccountPage').then(m => ({ default: m.MyAccountPage })))

const AdminDashboard     = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const AdminSuggestions   = lazy(() => import('./pages/admin/AdminSuggestions').then(m => ({ default: m.AdminSuggestions })))
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements').then(m => ({ default: m.AdminAnnouncements })))
const AdminTestimonials  = lazy(() => import('./pages/admin/AdminTestimonials').then(m => ({ default: m.AdminTestimonials })))
const AdminUsers         = lazy(() => import('./pages/admin/AdminUsers').then(m => ({ default: m.AdminUsers })))
const AdminEmailLogs     = lazy(() => import('./pages/admin/AdminEmailLogs').then(m => ({ default: m.AdminEmailLogs })))
const AdminServicesPage  = lazy(() => import('./pages/admin/AdminServicesPage').then(m => ({ default: m.AdminServicesPage })))

const RegistrarDashboard   = lazy(() => import('./pages/registrar/RegistrarDashboard').then(m => ({ default: m.RegistrarDashboard })))
const RegistrarSuggestions = lazy(() => import('./pages/registrar/RegistrarSuggestions').then(m => ({ default: m.RegistrarSuggestions })))

const AccountingDashboard   = lazy(() => import('./pages/accounting/AccountingDashboard').then(m => ({ default: m.AccountingDashboard })))
const AccountingSuggestions = lazy(() => import('./pages/accounting/AccountingSuggestions').then(m => ({ default: m.AccountingSuggestions })))

// ── Full-screen auth loading screen ───────────────────────────────────────
function AuthLoader() {
  const [slow, setSlow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setSlow(true), 3000); return () => clearTimeout(t) }, [])
  return (
    <div className="min-h-screen bg-ascb-navy-dark flex flex-col items-center justify-center gap-5 px-4">
      <img src="/school_logo.png" alt="ASCB" className="w-16 h-16 object-contain opacity-80" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
      <div className="w-12 h-12 rounded-full border-[3px] border-ascb-orange border-t-transparent animate-spin" />
      <div className="text-center">
        <p className="text-white font-semibold font-ui text-base">
          {slow ? 'Waking up the server…' : 'Loading IdeaLink'}
        </p>
        {slow && (
          <p className="text-gray-400 text-sm font-ui mt-1">
            The server takes a moment on first load. Please wait.
          </p>
        )}
      </div>
    </div>
  )
}

// ── In-page spinner (inside layouts) ──────────────────────────────────────
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
  const location = useLocation()
  if (isLoading) return <AuthLoader />
  if (!currentUser || userRole !== role) {
    const target = role === 'user' ? '/login' : '/staff-login'
    return <Navigate to={target} replace />
  }
  if (
    role === 'user'
    && currentUser.education_level == null
    && location.pathname !== '/user/complete-profile'
  ) {
    return <Navigate to="/user/complete-profile" replace />
  }
  return <Outlet />
}

// Redirect authenticated users away from the login pages only. The homepage
// ("/") is intentionally NOT gated — logged-in users can revisit it from the
// Header's logo link.
function useRedirectIfAuthed() {
  const { currentUser, role, isLoading } = useAuth()
  useEffect(() => {
    if (!isLoading && currentUser && role) {
      const dest =
        role === 'admin'      ? '/admin/dashboard'
        : role === 'registrar'  ? '/registrar/dashboard'
        : role === 'accounting' ? '/accounting/dashboard'
        : '/user/submit'
      window.location.replace(dest)
    }
  }, [isLoading, currentUser, role])
  return { isLoading, currentUser, role }
}

function AuthGatedPage({ children }: { children: React.ReactNode }) {
  const { isLoading, currentUser, role } = useRedirectIfAuthed()
  if (isLoading || (currentUser && role)) return <AuthLoader />
  return <>{children}</>
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Legacy login URLs → staff portal */}
        <Route path="/admin/login"      element={<Navigate to="/staff-login" replace />} />
        <Route path="/registrar/login"  element={<Navigate to="/staff-login" replace />} />
        <Route path="/accounting/login" element={<Navigate to="/staff-login" replace />} />

        {/* Public pages — auth users get redirected to their dashboard */}
        <Route element={<PublicLayout />}>
          <Route path="/"                 element={<HomePage />} />
          <Route path="/login"            element={<AuthGatedPage><StudentLoginPage /></AuthGatedPage>} />
          <Route path="/staff-login"      element={<AuthGatedPage><StaffLoginPage /></AuthGatedPage>} />
          {/* Self-service signup is retired — accounts are provisioned by Admin/Registrar. */}
          <Route path="/signup"           element={<Navigate to="/login" replace />} />
          <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
          <Route path="/reset-password"   element={<ResetPasswordPage />} />
        </Route>

        <Route element={<RequireAuth role="user" />}>
          <Route element={<PublicLayout />}>
            <Route path="/user/complete-profile" element={<CompleteProfilePage />} />
            <Route path="/user/submit"           element={<SubmitPage />} />
            <Route path="/user/submissions"      element={<SubmissionsPage />} />
            <Route path="/user/announcements"    element={<AnnouncementsPage />} />
            <Route path="/user/account"          element={<MyAccountPage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth role="admin" />}>
          <Route element={<StaffLayout />}>
            <Route path="/admin/dashboard"    element={<AdminDashboard />} />
            <Route path="/admin/suggestions"  element={<AdminSuggestions />} />
            <Route path="/admin/announcements"element={<AdminAnnouncements />} />
            <Route path="/admin/testimonials" element={<AdminTestimonials />} />
            <Route path="/admin/services"     element={<AdminServicesPage />} />
            <Route path="/admin/users"        element={<AdminUsers />} />
            <Route path="/admin/email-logs"   element={<AdminEmailLogs />} />
          </Route>
        </Route>

        <Route element={<RequireAuth role="registrar" />}>
          <Route element={<StaffLayout />}>
            <Route path="/registrar/dashboard"    element={<RegistrarDashboard />} />
            <Route path="/registrar/office-hours" element={<OfficeHoursPage office="Registrar Office" />} />
            <Route path="/registrar/suggestions"  element={<RegistrarSuggestions />} />
            <Route path="/registrar/users"        element={<AdminUsers />} />
          </Route>
        </Route>

        <Route element={<RequireAuth role="accounting" />}>
          <Route element={<StaffLayout />}>
            <Route path="/accounting/dashboard"    element={<AccountingDashboard />} />
            <Route path="/accounting/office-hours" element={<OfficeHoursPage office="Finance Office" />} />
            <Route path="/accounting/suggestions"  element={<AccountingSuggestions />} />
          </Route>
        </Route>

        {/* 404 — redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

    </BrowserRouter>
  )
}
