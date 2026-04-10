import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { Sidebar } from './components/layout/Sidebar'

import { HomePage } from './pages/public/HomePage'
import { StudentLoginPage } from './pages/public/StudentLoginPage'
import { StaffLoginPage } from './pages/public/StaffLoginPage'
import { SignupPage } from './pages/public/SignupPage'

import { SubmitPage } from './pages/user/SubmitPage'
import { SubmissionsPage } from './pages/user/SubmissionsPage'
import { AnnouncementsPage } from './pages/user/AnnouncementsPage'

import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminSuggestions } from './pages/admin/AdminSuggestions'
import { AdminAnnouncements } from './pages/admin/AdminAnnouncements'
import { AdminTestimonials } from './pages/admin/AdminTestimonials'

import { RegistrarSuggestions } from './pages/registrar/RegistrarSuggestions'
import { RegistrarDashboard } from './pages/registrar/RegistrarDashboard'

import { AccountingSuggestions } from './pages/accounting/AccountingSuggestions'
import { AccountingDashboard } from './pages/accounting/AccountingDashboard'

// Scroll to top on every route change
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  return null
}

// Fade-in wrapper — remounts on route change to replay animation
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
        <PageTransition><Outlet /></PageTransition>
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
          <PageTransition><Outlet /></PageTransition>
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
  if (isLoading) return null
  if (currentUser) {
    const dest =
      role === 'admin'      ? '/admin/dashboard'
      : role === 'registrar'  ? '/registrar/dashboard'
      : role === 'accounting' ? '/accounting/dashboard'
      : '/user/submit'
    return <Navigate to={dest} replace />
  }
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
