import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, getToken, setToken } from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [enrollmentFormArchives, setEnrollmentFormArchives] = useState([])
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    const t = getToken()
    if (!t) {
      setUser(null)
      setProfile(null)
      setEnrollments([])
      setEnrollmentFormArchives([])
      setLoading(false)
      return
    }
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
    setToken(d.token)
    await refreshMe()
    return d
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setProfile(null)
    setEnrollments([])
    setEnrollmentFormArchives([])
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
