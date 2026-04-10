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
      <Toaster
        position="top-right"
        richColors
        toastOptions={{ duration: 3500 }}
        closeButton
      />
    </AuthProvider>
  </StrictMode>
)
