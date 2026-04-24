import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { LayoutDashboard, FileText, Calendar, CalendarDays, User, BookOpen, LogOut, Shield } from 'lucide-react'
import StudentNotesBell from './StudentNotesBell.jsx'

export default function AppShell({ children }) {
  const { user, profile, logout } = useAuth()
  const nav = useNavigate()
  const isAdmin = profile?.role === 'admin'
  const isStudent = profile?.role === 'student'
  const portalDiag = profile?.portal_diagnostico_enabled === true
  const portalPlano = profile?.portal_plano_90_enabled === true

  const handleLogout = () => {
    logout()
    nav('/')
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            to={isAdmin ? '/admin' : '/dashboard'}
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900"
          >
            <img
              src="/altzenpro-symbol.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 object-contain"
              decoding="async"
              aria-hidden
            />
            <span>AltzenPro</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {!isAdmin && (
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `flex items-center gap-1 rounded-md px-3 py-2 ${isActive ? 'bg-blue-100 text-blue-900' : 'text-slate-600 hover:bg-slate-50'}`
                  }
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Início
                </NavLink>
                {portalDiag && (
                  <NavLink
                    to="/diagnostico"
                    className={({ isActive }) =>
                      `flex items-center gap-1 rounded-md px-3 py-2 ${isActive ? 'bg-blue-100 text-blue-900' : 'text-slate-600 hover:bg-slate-50'}`
                    }
                  >
                    <FileText className="h-4 w-4" />
                    Diagnóstico
                  </NavLink>
                )}
                {portalPlano && (
                  <NavLink
                    to="/plano-90-dias"
                    className={({ isActive }) =>
                      `flex items-center gap-1 rounded-md px-3 py-2 ${isActive ? 'bg-blue-100 text-blue-900' : 'text-slate-600 hover:bg-slate-50'}`
                    }
                  >
                    <Calendar className="h-4 w-4" />
                    Plano 90d
                  </NavLink>
                )}
                <NavLink
                  to="/recursos"
                  className={({ isActive }) =>
                    `flex items-center gap-1 rounded-md px-3 py-2 ${isActive ? 'bg-blue-100 text-blue-900' : 'text-slate-600 hover:bg-slate-50'}`
                  }
                >
                  <BookOpen className="h-4 w-4" />
                  Recursos
                </NavLink>
                <NavLink
                  to="/perfil"
                  className={({ isActive }) =>
                    `flex items-center gap-1 rounded-md px-3 py-2 ${isActive ? 'bg-blue-100 text-blue-900' : 'text-slate-600 hover:bg-slate-50'}`
                  }
                >
                  <User className="h-4 w-4" />
                  Perfil
                </NavLink>
              </>
            )}
            {isAdmin && (
              <>
                <NavLink
                  to="/admin"
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-1 rounded-md px-3 py-2 ${isActive ? 'bg-indigo-100 text-indigo-900' : 'text-slate-600 hover:bg-slate-50'}`
                  }
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </NavLink>
                <NavLink
                  to="/admin/calendario"
                  className={({ isActive }) =>
                    `flex items-center gap-1 rounded-md px-3 py-2 ${isActive ? 'bg-indigo-100 text-indigo-900' : 'text-slate-600 hover:bg-slate-50'}`
                  }
                >
                  <CalendarDays className="h-4 w-4" />
                  Calendário
                </NavLink>
                <NavLink
                  to="/perfil"
                  className={({ isActive }) =>
                    `flex items-center gap-1 rounded-md px-3 py-2 ${isActive ? 'bg-slate-200' : 'text-slate-600 hover:bg-slate-50'}`
                  }
                >
                  <User className="h-4 w-4" />
                  Perfil
                </NavLink>
              </>
            )}
            {isStudent && <StudentNotesBell />}
            <span className="pl-2 text-xs text-slate-400">
              {user?.email}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="ml-2 flex items-center gap-1 rounded-md px-3 py-2 text-slate-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto min-w-0 max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
