import React, { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import {
  LayoutDashboard,
  FileText,
  Calendar,
  CalendarDays,
  User,
  BookOpen,
  ScrollText,
  LogOut,
  Shield,
  Menu,
  X,
} from 'lucide-react'
import StudentNotesBell from '@/features/student-notes/components/StudentNotesBell'
import StudentAssistantWidget from '@/shared/components/StudentAssistantWidget'
import mentorEsquerda from '@/assets/MentorEsquerda.png'
import mentorDireita from '@/assets/MentorDireita.png'

/** Largura lógica máxima para alinhar faixas ao main em ultra-wide (comportamento tipo 1920px). */
const STUDENT_SHELL_MAX_PX = 1920

const studentShellSideWidth = `calc((min(100vw, ${STUDENT_SHELL_MAX_PX}px) - min(min(100vw, ${STUDENT_SHELL_MAX_PX}px), 72rem)) / 2)`
const studentShellSideInset = `calc((100vw - min(100vw, ${STUDENT_SHELL_MAX_PX}px)) / 2)`

/** Mesmas dimensões/escala nas duas faixas; só varia object-position (espelho em X). */
const studentMentorImgShared =
  'h-full w-full min-h-0 max-h-full max-w-full object-cover min-[1921px]:h-auto min-[1921px]:w-auto min-[1921px]:max-h-[min(100%,max-content)] min-[1921px]:max-w-[min(100%,max-content)] min-[1921px]:object-contain'

/** Deve bater com o `pt-16` do conteúdo (altura reservada ao header fixo). */
const SHELL_HEADER_TOP_CLASS = 'top-16'

export default function AppShell({ children }) {
  const { user, profile, logout } = useAuth()
  const nav = useNavigate()
  const isAdmin = profile?.role === 'admin'
  const isStudent = profile?.role === 'student'
  const studentMentorXName = (() => {
    const full = profile?.full_name && String(profile.full_name).trim()
    if (full) return full.split(/\s+/)[0] || 'aluno'
    const em = user?.email
    if (em && em.includes('@')) return em.split('@')[0] || 'aluno'
    return 'aluno'
  })()

  /** Nome no cabeçalho (aluno ou admin); fallback se ainda não houver nome no perfil. */
  const headerDisplayName = (() => {
    const full = profile?.full_name && String(profile.full_name).trim()
    if (full) return full
    const em = user?.email
    if (em && em.includes('@')) return em.split('@')[0]
    return isAdmin ? 'Administrador' : 'Aluno'
  })()
  const portalDiag = profile?.portal_diagnostico_enabled === true
  const portalPlano = profile?.portal_plano_90_enabled === true

  const handleLogout = () => {
    logout()
    nav('/')
  }

  const { pathname: routePath } = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [routePath])

  const studentLinkClass = ({ isActive }) =>
    `flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm md:w-auto md:py-2 ${
      isActive ? 'bg-blue-100 text-blue-900' : 'text-slate-600 active:bg-slate-100 md:hover:bg-slate-50'
    }`

  const adminLinkClass = (item) => ({ isActive }) => {
    if (isActive) {
      if (item.to === '/perfil') {
        return 'flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm md:w-auto md:py-2 bg-slate-200 text-slate-800'
      }
      return 'flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm md:w-auto md:py-2 bg-indigo-100 text-indigo-900'
    }
    return 'flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm text-slate-600 active:bg-slate-100 md:w-auto md:py-2 md:hover:bg-slate-50'
  }

  const studentNavItems = (() => {
    const list = [
      { to: '/dashboard', label: 'Início', icon: LayoutDashboard, end: false, admin: false },
    ]
    if (portalDiag) {
      list.push({ to: '/diagnostico', label: 'Diagnóstico', icon: FileText, end: false, admin: false })
    }
    if (portalPlano) {
      list.push({ to: '/plano-90-dias', label: 'Plano 90d', icon: Calendar, end: false, admin: false })
    }
    list.push(
      { to: '/recursos', label: 'Recursos', icon: BookOpen, end: false, admin: false },
      { to: '/anotacoes', label: 'Anotações', icon: ScrollText, end: false, admin: false },
      { to: '/perfil', label: 'Perfil', icon: User, end: false, admin: false },
    )
    return list
  })()

  const adminNavItems = [
    { to: '/admin', label: 'Admin', icon: Shield, end: true, admin: true },
    { to: '/admin/calendario', label: 'Calendário', icon: CalendarDays, end: false, admin: true },
    { to: '/perfil', label: 'Perfil', icon: User, end: false, admin: true },
  ]

  return (
    <div className={`min-h-screen bg-slate-100 ${isStudent ? 'overflow-x-hidden' : ''}`}>
      <header
        className="fixed top-0 left-0 right-0 z-40 border-b border-slate-200 bg-white pt-[max(0.5rem,env(safe-area-inset-top,0px))]"
      >
        <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-2 py-2.5 pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] sm:px-4 sm:py-3 md:min-h-0">
          <Link
            to={isAdmin ? '/admin' : '/dashboard'}
            className="flex min-w-0 items-center gap-2 sm:gap-2.5"
          >
            <img
              src="/altzenpro-symbol.png"
              alt=""
              width={36}
              height={36}
              className="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9"
              decoding="async"
              aria-hidden
            />
            <span className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              AltzenPro
            </span>
          </Link>
          <nav
            className="hidden min-w-0 flex-wrap items-center justify-end gap-1 text-sm md:flex"
            aria-label="Navegação principal"
          >
            {!isAdmin &&
              studentNavItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink key={item.to} to={item.to} className={studentLinkClass}>
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </NavLink>
                )
              })}
            {isAdmin &&
              adminNavItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={`${item.to}-${String(item.end)}`}
                    to={item.to}
                    end={item.end}
                    className={adminLinkClass(item)}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </NavLink>
                )
              })}
            {isStudent && <StudentNotesBell />}
            <span
              className="hidden max-w-[14rem] truncate pl-1 text-sm font-medium text-slate-700 sm:max-w-[18rem] md:inline"
              title={user?.email || undefined}
            >
              {headerDisplayName}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="ml-1 flex shrink-0 items-center gap-1 rounded-md px-3 py-2 text-slate-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </nav>
          <div className="flex items-center gap-1.5 md:hidden">
            {isStudent && <StudentNotesBell />}
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 active:bg-slate-200"
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-expanded={mobileMenuOpen}
              aria-controls="app-mobile-menu"
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-[35] top-16 bg-slate-900/25 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />
          <div
            id="app-mobile-menu"
            className="fixed left-0 right-0 z-[36] top-16 max-h-[min(100dvh-4rem,90vh)] overflow-y-auto overscroll-y-contain border-b border-slate-200 bg-white shadow-lg md:hidden"
          >
            <div className="mx-auto max-w-6xl px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] sm:px-4">
              <nav className="flex flex-col gap-0.5" aria-label="Navegação (telefone)">
                {!isAdmin &&
                  studentNavItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <NavLink
                        key={`m-${item.to}`}
                        to={item.to}
                        className={studentLinkClass}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </NavLink>
                    )
                  })}
                {isAdmin &&
                  adminNavItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <NavLink
                        key={`m-${item.to}-${String(item.end)}`}
                        to={item.to}
                        end={item.end}
                        className={adminLinkClass(item)}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </NavLink>
                    )
                  })}
              </nav>
              <p className="mt-3 break-words border-t border-slate-200 pt-3 text-sm font-medium text-slate-800" title={user?.email || undefined}>
                {headerDisplayName}
              </p>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleLogout()
                }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm font-medium text-red-800 active:bg-red-100"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        </>
      )}
      <div className="pt-16 min-h-0">
      {isStudent ? (
        <>
          {/* Faixas com a mesma largura; imagens com a mesma escala (studentMentorImgShared + espelho em object-position). */}
          <div
            aria-hidden
            className={`pointer-events-none fixed ${SHELL_HEADER_TOP_CLASS} bottom-0 z-0 hidden overflow-hidden lg:flex lg:items-end lg:justify-end`}
            style={{ left: studentShellSideInset, width: studentShellSideWidth }}
          >
            <img
              src={mentorEsquerda}
              alt=""
              className={`${studentMentorImgShared} [object-position:right_top]`}
              loading="lazy"
              decoding="async"
            />
          </div>
          <div
            aria-hidden
            className={`pointer-events-none fixed ${SHELL_HEADER_TOP_CLASS} bottom-0 z-0 hidden overflow-hidden lg:flex lg:items-end lg:justify-start`}
            style={{ right: studentShellSideInset, width: studentShellSideWidth }}
          >
            <img
              src={mentorDireita}
              alt=""
              className={`${studentMentorImgShared} [object-position:left_top]`}
              loading="lazy"
              decoding="async"
            />
          </div>
          <main className="relative z-10 mx-auto min-w-0 w-full max-w-6xl px-4 py-6">
            {children}
          </main>
        </>
      ) : (
        <main className="mx-auto min-w-0 max-w-6xl px-4 py-6">{children}</main>
      )}
      </div>
      {isStudent && user && <StudentAssistantWidget firstName={studentMentorXName} />}
    </div>
  )
}
