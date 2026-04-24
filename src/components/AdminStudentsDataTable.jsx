import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Eye, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react'
import { formatProgramType } from '../lib/programType.js'
import { computeAdminListAttention } from '../lib/adminStudentInsight.js'

const PAGE_SIZE_OPTIONS = [10, 25, 50]

const BAND_ORDER = { critical: 0, late: 1, watch: 2, info: 3, ok: 4 }

function enrollmentStateLabel(state) {
  switch (state) {
    case 'ativa':
      return 'Ativa'
    case 'agendada':
      return 'Agendada'
    case 'concluida':
      return 'Concluída'
    case 'encerrada':
      return 'Encerrada'
    default:
      return state ? String(state) : '—'
  }
}

function attentionChipClass(band) {
  switch (band) {
    case 'critical':
      return 'border-rose-300 bg-rose-50 text-rose-950'
    case 'late':
      return 'border-orange-300 bg-orange-50 text-orange-950'
    case 'watch':
      return 'border-amber-300 bg-amber-50 text-amber-950'
    case 'info':
      return 'border-sky-300 bg-sky-50 text-sky-950'
    default:
      return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  }
}

function enrollmentStateChipClass(state) {
  switch (state) {
    case 'ativa':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900'
    case 'agendada':
      return 'border-amber-200 bg-amber-50 text-amber-900'
    case 'concluida':
      return 'border-indigo-200 bg-indigo-50 text-indigo-950'
    case 'encerrada':
      return 'border-slate-300 bg-slate-100 text-slate-800'
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600'
  }
}

function stateSortValue(row) {
  if (!row.enrollment_id) return '0'
  const st = row.enrollment_state || ''
  return `1-${st}`
}

function lastActivitySortValue(iso) {
  if (iso == null || String(iso).trim() === '') return null
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? null : t
}

const columnHelper = createColumnHelper()

export default function AdminStudentsDataTable({ students = [] }) {
  const [sorting, setSorting] = useState([{ id: 'name', desc: false }])
  const [searchQuery, setSearchQuery] = useState('')
  const [stateFilter, setStateFilter] = useState('') // '' = todos, 'none', 'ativa', ...
  const [programFilter, setProgramFilter] = useState('')
  const [bandFilter, setBandFilter] = useState('')

  const programOptions = useMemo(() => {
    const set = new Set()
    for (const s of students) {
      const p = s.program_type
      if (p != null && String(p).trim() !== '') set.add(String(p))
    }
    return [...set].sort((a, b) =>
      formatProgramType(a).localeCompare(formatProgramType(b), 'pt', { sensitivity: 'base' })
    )
  }, [students])

  const filteredBase = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return students.filter((s) => {
      if (stateFilter === 'none') {
        if (s.enrollment_id) return false
      } else if (stateFilter) {
        if (!s.enrollment_id || s.enrollment_state !== stateFilter) return false
      }

      if (programFilter) {
        if (String(s.program_type || '') !== programFilter) return false
      }

      if (bandFilter) {
        const att = computeAdminListAttention(s)
        if (att.band !== bandFilter) return false
      }

      if (!q) return true
      const name = (s.full_name || '').toLowerCase()
      const email = (s.email || '').toLowerCase()
      const prog = formatProgramType(s.program_type).toLowerCase()
      const stLabel = !s.enrollment_id
        ? 'sem inscrição'
        : enrollmentStateLabel(s.enrollment_state).toLowerCase()
      return (
        name.includes(q) ||
        email.includes(q) ||
        prog.includes(q) ||
        stLabel.includes(q)
      )
    })
  }, [students, searchQuery, stateFilter, programFilter, bandFilter])

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => (row.full_name || '').toLowerCase(), {
        id: 'name',
        header: 'Nome / E-mail',
        cell: (info) => {
          const s = info.row.original
          return (
            <div>
              <div className="font-medium text-slate-900">{s.full_name || '—'}</div>
              <div className="text-xs text-slate-500">{s.email}</div>
            </div>
          )
        },
        sortingFn: (a, b) => {
          const an = a.getValue('name') || ''
          const bn = b.getValue('name') || ''
          return String(an).localeCompare(String(bn), 'pt', { sensitivity: 'base' })
        },
      }),
      columnHelper.accessor((row) => String(row.program_type || ''), {
        id: 'program',
        header: 'Mentoria',
        cell: (info) => {
          const s = info.row.original
          return (
            <>
              <span className="font-medium text-slate-800">{formatProgramType(s.program_type)}</span>
              {s.enrollment_count > 1 && (
                <span className="ml-1 text-xs font-normal text-slate-500">({s.enrollment_count} inscrições)</span>
              )}
            </>
          )
        },
        sortingFn: (a, b) =>
          String(a.getValue('program')).localeCompare(String(b.getValue('program')), 'pt', { sensitivity: 'base' }),
      }),
      columnHelper.accessor((row) => stateSortValue(row), {
        id: 'estado',
        header: 'Estado',
        cell: (info) => {
          const s = info.row.original
          if (!s.enrollment_id) {
            return (
              <span className="inline-flex rounded-full border border-dashed border-slate-300 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500">
                Sem inscrição
              </span>
            )
          }
          return (
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${enrollmentStateChipClass(
                s.enrollment_state
              )}`}
            >
              {enrollmentStateLabel(s.enrollment_state)}
            </span>
          )
        },
        sortingFn: (a, b) =>
          String(a.getValue('estado')).localeCompare(String(b.getValue('estado')), 'pt', { sensitivity: 'base' }),
      }),
      columnHelper.accessor(
        (row) => {
          const band = computeAdminListAttention(row).band
          return BAND_ORDER[band] ?? 9
        },
        {
          id: 'priority',
          header: 'Prioridade',
          cell: (info) => {
            const s = info.row.original
            const att = computeAdminListAttention(s)
            return (
              <span
                className={`inline-flex max-w-full cursor-default rounded-full border px-2.5 py-0.5 text-xs font-semibold ${attentionChipClass(
                  att.band
                )}`}
                title={att.detail}
              >
                <span className="truncate">{att.label}</span>
              </span>
            )
          },
          sortingFn: (a, b) => Number(a.getValue('priority')) - Number(b.getValue('priority')),
        }
      ),
      columnHelper.accessor((row) => lastActivitySortValue(row.last_form_activity), {
        id: 'last',
        header: 'Último envio',
        sortDescFirst: true,
        cell: (info) => {
          const s = info.row.original
          return (
            <span className="text-slate-600">
              {s.last_form_activity ? new Date(s.last_form_activity).toLocaleString('pt-BR') : '—'}
            </span>
          )
        },
        sortingFn: (a, b) => {
          const av = a.getValue('last')
          const bv = b.getValue('last')
          if (av == null && bv == null) return 0
          if (av == null) return 1
          if (bv == null) return -1
          return av - bv
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            to={`/admin/alunos/${row.original.id}`}
            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-200"
          >
            <Eye className="h-3.5 w-3.5" />
            Detalhe
          </Link>
        ),
      }),
    ],
    []
  )

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  /* TanStack: API com funções instáveis para o React Compiler — uso intencional */
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredBase,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [searchQuery, stateFilter, programFilter, bandFilter, students.length])

  const pageCount = table.getPageCount()
  const totalFiltered = filteredBase.length

  return (
    <div>
      <div className="mt-6 flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
            <label htmlFor="admin-student-search" className="text-xs font-medium uppercase text-slate-500">
              Pesquisa (nome, e-mail, mentoria, estado)
            </label>
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                id="admin-student-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex.: Maria, @gmail, ativa…"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none ring-indigo-500/30 focus:border-indigo-500 focus:ring-2"
                autoComplete="off"
              />
            </div>
          </div>
          <div>
            <label htmlFor="admin-filter-state" className="text-xs font-medium uppercase text-slate-500">
              Estado da inscrição
            </label>
            <div className="relative mt-1">
              <Filter
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <select
                id="admin-filter-state"
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none ring-indigo-500/30 focus:border-indigo-500 focus:ring-2"
              >
                <option value="">Todos</option>
                <option value="none">Sem inscrição</option>
                <option value="ativa">Ativa</option>
                <option value="agendada">Agendada</option>
                <option value="concluida">Concluída</option>
                <option value="encerrada">Encerrada</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="admin-filter-program" className="text-xs font-medium uppercase text-slate-500">
              Mentoria
            </label>
            <div className="relative mt-1">
              <Filter
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <select
                id="admin-filter-program"
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none ring-indigo-500/30 focus:border-indigo-500 focus:ring-2"
              >
                <option value="">Todas</option>
                {programOptions.map((p) => (
                  <option key={p} value={p}>
                    {formatProgramType(p)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="admin-filter-band" className="text-xs font-medium uppercase text-slate-500">
              Prioridade
            </label>
            <div className="relative mt-1">
              <Filter
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <select
                id="admin-filter-band"
                value={bandFilter}
                onChange={(e) => setBandFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none ring-indigo-500/30 focus:border-indigo-500 focus:ring-2"
              >
                <option value="">Todas</option>
                <option value="critical">Crítico</option>
                <option value="late">Atraso / risco</option>
                <option value="watch">Atenção</option>
                <option value="info">Info</option>
                <option value="ok">Sem alerta</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-sm text-slate-600">
            {searchQuery.trim() || stateFilter || programFilter || bandFilter
              ? `${totalFiltered} resultado(s) com os filtros atuais.`
              : `${students.length} aluno(s) no total.`}
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="admin-page-size" className="text-xs text-slate-500">
              Por página
            </label>
            <select
              id="admin-page-size"
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-slate-200 bg-slate-50">
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  return (
                    <th key={header.id} className="p-3 font-semibold text-slate-800">
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-left font-semibold text-slate-800 hover:text-indigo-700"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 shrink-0 text-indigo-600" aria-hidden />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="h-3.5 w-3.5 shrink-0 text-indigo-600" aria-hidden />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                          )}
                        </button>
                      ) : (
                        <span className="font-semibold">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  {students.length === 0
                    ? 'Nenhum aluno cadastrado.'
                    : 'Nenhum aluno corresponde aos filtros. Ajuste a pesquisa ou limpe os filtros.'}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((tr) => (
                <tr key={tr.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                  {tr.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`p-3 ${cell.column.id === 'priority' ? 'max-w-[220px]' : ''}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex flex-col items-stretch justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center">
          <p className="text-sm text-slate-600">
            Página{' '}
            <span className="font-semibold text-slate-900">{table.getState().pagination.pageIndex + 1}</span> de{' '}
            <span className="font-semibold text-slate-900">{pageCount}</span>
            <span className="text-slate-500"> · {totalFiltered} linha(s)</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Anterior
            </button>
            <button
              type="button"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Seguinte
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
