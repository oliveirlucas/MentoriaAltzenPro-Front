import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth'

/** Rotas filhas só para `profile.role === 'admin'`. */
export function AdminRoute() {
  const { profile } = useAuth()
  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <Outlet />
}
