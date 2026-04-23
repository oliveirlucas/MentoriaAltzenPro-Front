/** Disparado após criar aluno (ou outras ações admin) para refrescar listas. */
export const ADMIN_STUDENTS_REFRESH = 'altzen:admin-students-refresh'

export function emitAdminStudentsRefresh() {
  window.dispatchEvent(new CustomEvent(ADMIN_STUDENTS_REFRESH))
}
