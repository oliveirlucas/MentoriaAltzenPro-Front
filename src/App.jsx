import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import Home from './pages/Home.jsx'
import DiagnosticoPage from './pages/DiagnosticoPage.jsx'
import Plano90DiasPage from './pages/Plano90DiasPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminStudentDetail from './pages/AdminStudentDetail.jsx'
import AdminStudentInternalNotesPage from './pages/AdminStudentInternalNotesPage.jsx'
import AdminCalendarPage from './pages/AdminCalendarPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import ResourcesPage from './pages/ResourcesPage.jsx'

/** /login continua a funcionar (links antigos) e repassa ?from= para a home. */
function LoginLegacyRedirect() {
  const { search } = useLocation()
  return <Navigate to={{ pathname: '/', search }} replace />
}

function Landing() {
  const { user, profile, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        Carregando…
      </div>
    )
  }
  if (user) {
    if (profile?.role === 'admin') return <Navigate to="/admin" replace />
    return <Navigate to="/dashboard" replace />
  }
  return <Home />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<LoginLegacyRedirect />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/recursos" element={<ResourcesPage />} />
            <Route path="/diagnostico" element={<DiagnosticoPage />} />
            <Route path="/plano-90-dias" element={<Plano90DiasPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/calendario" element={<AdminCalendarPage />} />
            <Route path="/admin/alunos/:id" element={<AdminStudentDetail />} />
            <Route path="/admin/alunos/:id/anotacoes-internas" element={<AdminStudentInternalNotesPage />} />
            <Route path="/admin/alunos/:id/diagnostico" element={<DiagnosticoPage />} />
            <Route path="/admin/alunos/:id/plano-90-dias" element={<Plano90DiasPage />} />
          </Route>
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
