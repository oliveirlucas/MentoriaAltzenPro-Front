import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, setCsrfToken } from '@/shared/api/client'
import type { AuthProfile, AuthUser, MeResponse } from '../model/types'

interface AuthContextValue {
  user: AuthUser | null
  profile: AuthProfile | null
  enrollments: any[]
  enrollmentFormArchives: any[]
  role: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<unknown>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [enrollments, setEnrollments] = useState<unknown[]>([])
  const [enrollmentFormArchives, setEnrollmentFormArchives] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    try {
      const d = await api<MeResponse>('/me')
      setUser(d.user)
      setProfile(d.profile)
      setEnrollments(d.enrollments || [])
      setEnrollmentFormArchives(d.enrollment_form_archives || [])
    } catch {
      setUser(null)
      setProfile(null)
      setEnrollments([])
      setEnrollmentFormArchives([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshMe()
  }, [refreshMe])

  const login = async (email: string, password: string) => {
    const d = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    await refreshMe()
    return d
  }

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {
      /* */
    } finally {
      setCsrfToken(null)
      setUser(null)
      setProfile(null)
      setEnrollments([])
      setEnrollmentFormArchives([])
    }
  }

  const value: AuthContextValue = {
    user,
    profile,
    enrollments,
    enrollmentFormArchives,
    role: profile?.role || (user && user.id ? user.role || 'student' : null),
    loading,
    login,
    logout,
    refreshMe,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
