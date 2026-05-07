import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { ProtectedRoute } from '@/features/layout-shell/components/ProtectedRoute'
import { AdminRoute } from '@/features/layout-shell/components/AdminRoute'
import Home from '@/features/landing/pages/Home'
import DiagnosticoPage from '@/features/diagnostico/pages/DiagnosticoPage'
import Plano90DiasPage from '@/features/plano-90-dias/pages/Plano90DiasPage'
import Dashboard from '@/features/student-dashboard/pages/Dashboard'
import AdminDashboard from '@/features/admin-students/pages/AdminDashboard'
import AdminStudentDetail from '@/features/admin-students/pages/AdminStudentDetail'
import AdminStudentInternalNotesPage from '@/features/admin-internal-notes/pages/AdminStudentInternalNotesPage'
import AdminCalendarPage from '@/features/admin-calendar/pages/AdminCalendarPage'
import ProfilePage from '@/features/profile/pages/ProfilePage'
import ResourcesPage from '@/features/resources/pages/ResourcesPage'
import StudentSelfNotesPage from '@/features/student-notes/pages/StudentSelfNotesPage'

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

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<LoginLegacyRedirect />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/perfil" element={<ProfilePage />} />
        <Route path="/recursos" element={<ResourcesPage />} />
        <Route path="/anotacoes" element={<StudentSelfNotesPage />} />
        <Route path="/diagnostico" element={<DiagnosticoPage />} />
        <Route path="/plano-90-dias" element={<Plano90DiasPage />} />

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/calendario" element={<AdminCalendarPage />} />
          <Route path="/admin/alunos/:id" element={<AdminStudentDetail />} />
          <Route path="/admin/alunos/:id/anotacoes-internas" element={<AdminStudentInternalNotesPage />} />
          <Route path="/admin/alunos/:id/diagnostico" element={<DiagnosticoPage />} />
          <Route path="/admin/alunos/:id/plano-90-dias" element={<Plano90DiasPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
