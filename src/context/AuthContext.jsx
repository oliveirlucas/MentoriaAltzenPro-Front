import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, setCsrfToken } from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [enrollmentFormArchives, setEnrollmentFormArchives] = useState([])
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    try {
      const d = await api('/me')
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
    refreshMe()
  }, [refreshMe])

  const login = async (email, password) => {
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

  const value = {
    user,
    profile,
    enrollments,
    enrollmentFormArchives,
    role: profile?.role || (user && user.id ? (user.role || 'student') : null),
    loading,
    login,
    logout,
    refreshMe,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
