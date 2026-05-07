export interface AuthUser {
  id: number
  email?: string
  role?: string
}

export interface AuthProfile extends Record<string, unknown> {
  role?: 'admin' | 'student'
  full_name?: string | null
  portal_diagnostico_enabled?: boolean
  portal_plano_90_enabled?: boolean
}

export interface MeResponse {
  user: AuthUser | null
  profile: AuthProfile | null
  /** Tipagem ampla até alinhar DTOs com o backend. */
  enrollments?: any[]
  enrollment_form_archives?: any[]
}
