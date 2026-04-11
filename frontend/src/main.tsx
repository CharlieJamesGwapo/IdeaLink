import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { AppRouter } from './router'
import { ErrorBoundary } from './components/shared/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AppRouter />
        <Toaster
          position="top-right"
          richColors
          toastOptions={{ duration: 3500 }}
          closeButton
        />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
)
