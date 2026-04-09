import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { Sidebar } from './components/layout/Sidebar'

import { HomePage } from './pages/public/HomePage'
import { LoginPage } from './pages/public/LoginPage'
import { SignupPage } from './pages/public/SignupPage'

import { SubmitPage } from './pages/user/SubmitPage'
import { SubmissionsPage } from './pages/user/SubmissionsPage'
import { AnnouncementsPage } from './pages/user/AnnouncementsPage'

import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminSuggestions } from './pages/admin/AdminSuggestions'
import { AdminAnnouncements } from './pages/admin/AdminAnnouncements'
import { AdminTestimonials } from './pages/admin/AdminTestimonials'

import { RegistrarLoginPage } from './pages/registrar/RegistrarLoginPage'
import { RegistrarSuggestions } from './pages/registrar/RegistrarSuggestions'

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
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/registrar/login" element={<RegistrarLoginPage />} />
          <Route path="/accounting/login" element={<AccountingLoginPage />} />
        </Route>

        <Route element={<RequireAuth role="user" />}>
          <Route element={<PublicLayout />}>
            <Route path="/user/submit" element={<SubmitPage />} />
            <Route path="/user/submissions" element={<SubmissionsPage />} />
            <Route path="/user/announcements" element={<AnnouncementsPage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth role="admin" />}>
          <Route element={<StaffLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/suggestions" element={<AdminSuggestions />} />
            <Route path="/admin/announcements" element={<AdminAnnouncements />} />
            <Route path="/admin/testimonials" element={<AdminTestimonials />} />
          </Route>
        </Route>

        <Route element={<RequireAuth role="registrar" />}>
          <Route element={<StaffLayout />}>
            <Route path="/registrar/suggestions" element={<RegistrarSuggestions />} />
          </Route>
        </Route>

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
