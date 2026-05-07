import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { X, Send, Loader2, Sparkles, Terminal } from 'lucide-react'
import { api } from '@/shared/api/client'
import mentorXHeader from '@/assets/mentorX.png'

function buildMentorXWelcome(firstName: string): string {
  const n = firstName && String(firstName).trim() ? firstName.trim() : 'aluno'
  return `E aí, **${n}**, **Mentor X** na área. Sou conhecido por ter acesso exclusivo aos corredores da AltzenPro. Manda sua pergunta ai que eu tento te devolver na mão. Se eu não tiver a informação, já dou o papo reto. *Agora namoral, se quer saber detalhe demais melhor perguntar o teu mentor de carne e osso.*
        o que cê precisa desenrolar aí?`
}

function buildMentorXAdminWelcome(adminFirstName: string, studentLabel: string): string {
  const a = adminFirstName && String(adminFirstName).trim() ? adminFirstName.trim() : 'mentor'
  const s = studentLabel && String(studentLabel).trim() ? String(studentLabel).trim() : 'esse aluno'
  return `Fechou, **${a}**. Tô em **modo mentor/admin** olhando o contexto do aluno: **${s}**.\n\nManda aí o que tu quer destrinchar (diagnóstico, plano 90d, ciclo, notas, agenda, contratos) que eu te devolvo um resumo e próximos passos.`
}

function getMarkdownComponents(darkBubble: boolean): Components {
  const t = darkBubble
    ? {
        p: 'text-[0.875rem] leading-relaxed text-slate-100',
        li: 'text-slate-100',
        base: 'text-slate-200',
        strong: 'text-white',
        block: 'border-cyan-500/30',
        a: 'text-cyan-300',
        codeBg: 'bg-slate-700/90 text-slate-100',
        codeInline: 'bg-slate-700/80 text-cyan-100',
        hr: 'border-slate-600',
      }
    : {
        p: 'text-[0.875rem] leading-relaxed text-slate-800',
        li: 'text-slate-800',
        base: 'text-slate-800',
        strong: 'text-slate-900',
        block: 'border-indigo-200',
        a: 'text-indigo-600',
        codeBg: 'bg-slate-200/90 text-slate-800',
        codeInline: 'bg-slate-200/80',
        hr: 'border-slate-200',
      }
  return {
    p: ({ children }) => <p className={`mb-2 last:mb-0 ${t.p}`}>{children}</p>,
    ul: ({ children }) => (
      <ul
        className={`my-2 list-outside list-disc pl-4 text-[0.875rem] marker:text-slate-500 [&>li]:pl-0.5 ${t.base}`}
      >
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className={`my-2 list-outside list-decimal pl-4 text-[0.875rem] marker:text-slate-500 ${t.base}`}>
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className={`mb-1.5 leading-relaxed last:mb-0 [&>p]:mb-1 [&>p]:last:mb-0 ${t.li}`}>{children}</li>
    ),
    strong: ({ children }) => <strong className={`font-semibold ${t.strong}`}>{children}</strong>,
    em: ({ children }) => <em className={`italic ${t.base}`}>{children}</em>,
    h1: ({ children }) => <p className={`mb-2 text-sm font-bold last:mb-0 ${t.strong}`}>{children}</p>,
    h2: ({ children }) => <p className={`mb-1.5 text-sm font-bold last:mb-0 ${t.strong}`}>{children}</p>,
    h3: ({ children }) => <p className={`mb-1 text-sm font-semibold last:mb-0 ${t.strong}`}>{children}</p>,
    blockquote: ({ children }) => (
      <blockquote
        className={`my-2 border-l-2 pl-2 [&>p]:mb-0 ${
          darkBubble ? 'border-cyan-400/40 text-slate-200' : 'text-slate-700'
        } ${t.block}`}
      >
        {children}
      </blockquote>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        className={`${t.a} underline decoration-cyan-500/40 underline-offset-2 hover:opacity-90`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    code: ({ className, children, ...props }) => {
      const isBlock = /language-/.test(String(className || ''))
      if (isBlock) {
        return (
          <code
            className={`my-2 block overflow-x-auto rounded-md p-2 font-mono text-xs ${t.codeBg}`}
            {...props}
          >
            {children}
          </code>
        )
      }
      return (
        <code className={`rounded px-1 py-0.5 font-mono text-xs ${t.codeInline}`} {...props}>
          {children}
        </code>
      )
    },
    pre: ({ children }) => <pre className="my-2 max-w-full overflow-x-auto text-[0.8125rem]">{children}</pre>,
    hr: () => <hr className={`my-3 ${t.hr}`} />,
  }
}

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export default function StudentAssistantWidget({
  firstName: firstNameProp = 'aluno',
  adminStudentId: adminStudentIdProp = null,
  adminStudentLabel: adminStudentLabelProp = null,
}: {
  firstName?: string
  adminStudentId?: number | null
  adminStudentLabel?: string | null
}) {
  const firstName = (firstNameProp && String(firstNameProp).trim()) || 'aluno'
  const adminStudentId = adminStudentIdProp != null ? Number(adminStudentIdProp) : null
  const isAdminMode = Number.isInteger(adminStudentId) && adminStudentId > 0
  const adminStudentLabel = adminStudentLabelProp != null ? String(adminStudentLabelProp) : ''
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [headerImgError, setHeaderImgError] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mdUser = useMemo(() => getMarkdownComponents(false), [])
  const mdMentor = useMemo(() => getMarkdownComponents(true), [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, open])

  useEffect(() => {
    if (!open) return
    setMessages((m) => {
      if (m.length > 0) return m
      return [
        {
          role: 'assistant',
          content: isAdminMode ? buildMentorXAdminWelcome(firstName, adminStudentLabel) : buildMentorXWelcome(firstName),
        },
      ]
    })
  }, [open, firstName, isAdminMode, adminStudentLabel])

  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(id)
  }, [open])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const history = messages.map(({ role, content }) => ({ role, content }))
    setMessages((m) => [...m, { role: 'user', content: text }])
    setLoading(true)
    try {
      const path = isAdminMode ? '/admin/assistant' : '/me/assistant'
      const payload = isAdminMode
        ? { student_id: adminStudentId, message: text, history }
        : { message: text, history }
      const data = await api<{ reply?: string }>(path, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const reply = typeof data.reply === 'string' ? data.reply : 'Nada voltou do servidor, estranho.'
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Não deu certo de enviar. Dá outra tentada aí.'
      setMessages((m) => [...m, { role: 'assistant', content: msg }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, isAdminMode, adminStudentId])

  const ui = (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="print:hidden group fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-cyan-500/40 bg-gradient-to-br from-slate-900 to-slate-950 text-cyan-100 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30 transition hover:ring-cyan-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-100"
        aria-expanded={open}
        aria-label={open ? 'Fechar o chat do Mentor X' : 'Abrir o chat do Mentor X, teu resumo do portal na AltzenPro'}
      >
        {open ? <X className="h-7 w-7" /> : <Terminal className="h-7 w-7" />}
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-4 z-[60] flex h-[min(600px,78vh)] w-[min(100vw-1.5rem,480px)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-cyan-500/25 bg-slate-950 shadow-2xl shadow-cyan-500/10 sm:right-5 print:hidden"
          role="dialog"
          aria-label="Mentor X, chat que cruza teus dados do portal na AltzenPro"
        >
          <div className="relative overflow-hidden border-b border-cyan-500/20 bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-950 text-white">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_20%_0%,rgba(6,182,212,0.18),transparent_55%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-4 top-0 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl"
              aria-hidden
            />
            <div className="relative flex items-start gap-3 px-3 py-3 sm:px-4 sm:py-3.5">
              <div className="relative shrink-0">
                <div
                  className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-cyan-400/50 to-blue-600/30 opacity-80 blur-[2px]"
                  aria-hidden
                />
                {headerImgError ? (
                  <div className="relative flex h-[5.5rem] w-[5.5rem] items-center justify-center overflow-hidden rounded-xl border border-cyan-500/30 bg-slate-800">
                    <Sparkles className="h-10 w-10 text-cyan-300/80" />
                  </div>
                ) : (
                  <img
                    src={mentorXHeader}
                    alt="Mentor X"
                    width={88}
                    height={88}
                    className="relative h-[5.5rem] w-[5.5rem] rounded-xl object-cover object-top ring-1 ring-cyan-400/35 shadow-lg shadow-cyan-900/50"
                    decoding="async"
                    onError={() => setHeaderImgError(true)}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h2 className="text-lg font-bold tracking-tight sm:text-xl">
                    <span className="bg-gradient-to-r from-cyan-200 via-cyan-100 to-blue-200 bg-clip-text text-transparent">
                      Mentor X
                    </span>
                  </h2>
                  <span className="text-[0.7rem] font-medium uppercase tracking-widest text-cyan-200/50">no pique</span>
                </div>
                <p className="mt-0.5 text-xs leading-snug text-cyan-100/80">
                  Eu sei tudo sobre você, seu diagnóstico, plano, nota do mentor, agenda, teu perfil. Na mão, na lata,
                  sem firula.
                </p>
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-100/95 px-3 py-3">
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user'
              const isAssistant = msg.role === 'assistant'
              const md = isUser ? mdUser : mdMentor
              return (
                <div
                  key={i}
                  className={`max-w-[95%] rounded-xl px-3 py-2 text-sm shadow-sm ${
                    isUser
                      ? 'ml-auto border border-indigo-200/60 bg-indigo-50 text-slate-900'
                      : 'mr-auto border border-slate-600/40 bg-slate-800/95 text-slate-100'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap text-[0.875rem] leading-relaxed text-slate-900">{msg.content}</p>
                  ) : isAssistant ? (
                    <div className="assistant-md min-w-0 text-left text-slate-100 [&_ol]:list-decimal">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>
                        {msg.content || ''}
                      </ReactMarkdown>
                    </div>
                  ) : null}
                </div>
              )
            })}
            {loading && (
              <div className="flex items-center gap-2 pl-1 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-cyan-600" />
                <span className="text-slate-600">Calma, tô pensando, as vezes o TDAH bate forte…</span>
              </div>
            )}
            <div />
          </div>

          <div className="border-t border-slate-800/50 bg-slate-900 p-2.5">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                className={`min-h-[2.75rem] flex-1 resize-none rounded-lg border border-slate-600/80 bg-slate-800/80 px-2.5 py-2 text-sm text-slate-100 shadow-inner outline-none ring-cyan-500/20 placeholder:text-slate-500 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 ${
                  loading ? 'cursor-wait opacity-70' : ''
                }`}
                rows={2}
                placeholder="Descreve aí, qual é a tua dúvida…"
                value={input}
                readOnly={loading}
                aria-busy={loading}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send()
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={loading || !input.trim()}
                className="self-end rounded-lg border border-cyan-500/40 bg-gradient-to-br from-cyan-600 to-indigo-700 p-2.5 text-white shadow-sm hover:from-cyan-500 hover:to-indigo-600 disabled:opacity-50"
                aria-label="Enviar pergunta"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )

  if (typeof document !== 'undefined') {
    return createPortal(ui, document.body)
  }
  return ui
}
