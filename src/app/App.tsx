import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/features/auth'
import { ToastProvider } from '@/shared/ui/ToastContext'
import { AppRoutes } from '@/app/router'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
