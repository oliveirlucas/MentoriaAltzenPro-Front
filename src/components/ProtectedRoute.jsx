import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import AppShell from './AppShell.jsx'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        Carregando…
      </div>
    )
  }
  if (!user) {
    const ret = loc.pathname + loc.search
    return <Navigate to={`/?from=${encodeURIComponent(ret)}`} replace />
  }
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export function PublicOnlyWhenLoggedOut({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        Carregando…
      </div>
    )
  }
  if (user) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}
