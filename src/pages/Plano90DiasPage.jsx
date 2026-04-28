import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, Navigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Target,
  Table2,
  BarChart3,
  Printer,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { useFormAutosave } from '../hooks/useFormAutosave.js';

const FORM_TYPE = 'altzen-plano-90-dias';

const defaultCapa = {
  title: 'Plano de 90 Dias - Transição e Evolução em Tech',
  subtitle: 'Execução orientada por evidência',
  signature: 'AltzenPro',
};

const defaultMainGoal = {
  objective: '',
  reason: '',
  measurable: '',
};

function emptyWeekRow() {
  return {
    weekObjective: '',
    techFocus: '',
    careerFocus: '',
    entregas: '',
    evidence: '',
    checklist: { ...defaultChecklist },
  };
}

const defaultMonths = () => [
  {
    id: 'm1',
    label: 'Mês 1 (Dias 1-30)',
    sublabel: 'Fundamentos e organização',
    meta: '',
    entregas: ['', '', ''],
  },
  {
    id: 'm2',
    label: 'Mês 2 (Dias 31-60)',
    sublabel: 'Projeto principal',
    meta: '',
    entregas: ['', '', ''],
  },
  {
    id: 'm3',
    label: 'Mês 3 (Dias 61-90)',
    sublabel: 'Consolidação e visibilidade',
    meta: '',
    entregas: ['', '', ''],
  },
];

const defaultChecklist = {
  weekGoal: false,
  timeBlocks: false,
  techEvidence: false,
  sharedEvidence: false,
  reviewedNext: false,
};

const defaultFinal = {
  tech: ['', '', ''],
  career: ['', '', ''],
  next90: ['', '', ''],
};

const checklistLabels = [
  { key: 'weekGoal', text: 'Defini meu objetivo da semana.' },
  { key: 'timeBlocks', text: 'Reservei blocos de tempo na agenda.' },
  { key: 'techEvidence', text: 'Entreguei pelo menos 1 evidência técnica.' },
  { key: 'sharedEvidence', text: 'Publiquei/compartilhei 1 evidência de evolução.' },
  { key: 'reviewedNext', text: 'Revisei o plano e ajustei a próxima semana.' },
];

const WEEK_GUIDE = [
  {
    title: 'Semana 1: Diagnóstico profundo e alinhamento',
    lines: [
      'Foco: entender o momento atual e as travas do aluno.',
      'Ação: aplicar e discutir o diagnóstico (PDF/ formulário).',
      'Saída: perfil e objetivo principal dos 90 dias definidos.',
    ],
  },
  {
    title: 'Semana 2: Mapa de foco e corte de dispersão',
    lines: [
      'Foco: o que estudar e o que ignorar.',
      'Ação: preencher o mapa de foco (prioridade e matriz).',
      'Saída: top 3 de execução e impacto x urgência.',
    ],
  },
  {
    title: 'Semana 3: Construção do plano de ação',
    lines: [
      'Foco: entregas do 1º mês.',
      'Ação: plano de 90 dias (Mês 1) com tarefas claras.',
      'Saída: backlog priorizado (estudo + primeiras tarefas técnicas).',
    ],
  },
  {
    title: 'Semana 4: Primeiro check-in de execução',
    lines: [
      'Foco: primeira semana “mão na massa”.',
      'Ação: revisão básica ou validação de fundamentos.',
      'Saída: correção de rota e fechamento do Mês 1.',
    ],
  },
  {
    title: 'Semana 5: Kick-off do projeto principal',
    lines: [
      'Foco: escopo do projeto que gera evidência.',
      'Ação: atualizar o plano (Mês 2) com escopo e tasks.',
      'Saída: arquitetura desenhada e primeiras entregas mapeadas.',
    ],
  },
  {
    title: 'Semana 6: Aprofundamento técnico (hard skills)',
    lines: [
      'Foco: maior dificuldade técnica individual.',
      'Ação: pair, code review ou desenho de arquitetura.',
      'Saída: desbloqueio para avançar o projeto.',
    ],
  },
  {
    title: 'Semana 7: Aprofundamento estratégico (soft skills)',
    lines: [
      'Foco: comunicação, resolução de problemas, time.',
      'Ação: simulação de ritos, prazos, cenários reais.',
      'Saída: plano de melhoria comportamental.',
    ],
  },
  {
    title: 'Semana 8: Check-in de projeto e correção de rota',
    lines: [
      'Foco: progresso do projeto principal.',
      'Ação: code review do que foi construído.',
      'Saída: ajustes técnicos e fechamento do Mês 2.',
    ],
  },
  {
    title: 'Semana 9: Planejamento de visibilidade',
    lines: [
      'Foco: como mostrar o que foi feito.',
      'Ação: atualizar o plano (Mês 3) com publicação/ evidências.',
      'Saída: estratégia (GitHub, LinkedIn, apresentação interna).',
    ],
  },
  {
    title: 'Semana 10: Posicionamento e mercado',
    lines: [
      'Foco: objetivo final (vaga, promoção, transição).',
      'Ação: CV, LinkedIn ou narrativa com gestor.',
      'Saída: materiais e narrativa atualizados.',
    ],
  },
  {
    title: 'Semana 11: Simulação e refinamento',
    lines: [
      'Foco: teste em cenário real.',
      'Ação: mock interview ou pitch de promoção.',
      'Saída: feedback sobre comunicação e pontos cegos.',
    ],
  },
  {
    title: 'Semana 12: Avaliação final e próximos passos',
    lines: [
      'Foco: medir a evolução em 90 dias.',
      'Ação: comparar com o diagnóstico inicial e revisão final.',
      'Saída: plano 3–6 meses e encerramento do ciclo.',
    ],
  },
];

function normalizeWeekChecklist(obj) {
  const c = { ...defaultChecklist, ...(obj && typeof obj === 'object' ? obj : {}) };
  return {
    weekGoal: !!c.weekGoal,
    timeBlocks: !!c.timeBlocks,
    techEvidence: !!c.techEvidence,
    sharedEvidence: !!c.sharedEvidence,
    reviewedNext: !!c.reviewedNext,
  };
}

function padWeeks(arr) {
  const rows = Array.isArray(arr) ? [...arr] : [];
  while (rows.length < 12) rows.push(emptyWeekRow());
  return rows.slice(0, 12).map((r) => ({
    weekObjective: r?.weekObjective != null ? String(r.weekObjective) : '',
    techFocus: r?.techFocus != null ? String(r.techFocus) : '',
    careerFocus: r?.careerFocus != null ? String(r.careerFocus) : '',
    entregas: r?.entregas != null ? String(r.entregas) : '',
    evidence: r?.evidence != null ? String(r.evidence) : '',
    checklist: normalizeWeekChecklist(r?.checklist),
  }));
}

function applyLegacyTopLevelChecklist(weeks, raw) {
  const hasAnyEmbedded = Array.isArray(raw?.weeks) && raw.weeks.some((w) => w && w.checklist && typeof w.checklist === 'object');
  if (hasAnyEmbedded) return weeks;
  if (!raw?.checklist || typeof raw.checklist !== 'object') return weeks;
  const leg = normalizeWeekChecklist(raw.checklist);
  return weeks.map((w, i) => (i === 0 ? { ...w, checklist: leg } : w));
}

function padDeliveryRow(arr) {
  const a = Array.isArray(arr) ? arr.map((x) => String(x ?? '')) : [];
  while (a.length < 3) a.push('');
  return a.slice(0, 3);
}

function mergePlano(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const baseMonths = defaultMonths();
  const incomingMonths = Array.isArray(raw.months) ? raw.months : [];
  const months = baseMonths.map((m, i) => {
    const inc = incomingMonths[i];
    if (!inc || typeof inc !== 'object') return { ...m };
    return {
      ...m,
      meta: inc.meta != null ? String(inc.meta) : '',
      entregas: padDeliveryRow(inc.entregas),
    };
  });
  const rawMg = raw.mainGoal && typeof raw.mainGoal === 'object' ? raw.mainGoal : {}
  const { startDate: _sd, endDate: _ed, ...mainGoalRest } = { ...defaultMainGoal, ...rawMg }
  const weeks = applyLegacyTopLevelChecklist(padWeeks(raw.weeks), raw);
  return {
    capa: { ...defaultCapa, ...(raw.capa && typeof raw.capa === 'object' ? raw.capa : {}) },
    mainGoal: { ...defaultMainGoal, ...mainGoalRest },
    months,
    weeks,
    finalReview: {
      tech: padDeliveryRow(raw.finalReview?.tech),
      career: padDeliveryRow(raw.finalReview?.career),
      next90: padDeliveryRow(raw.finalReview?.next90),
    },
  };
}

const inputClass =
  'w-full min-h-[2.5rem] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none print:min-h-0 print:py-1 print:border-b print:rounded-none print:px-0';
const textareaClass = `${inputClass} min-h-[4rem] resize-y`;

const Section = ({ icon: Icon, title, children, className = '' }) => (
  <section className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm print:shadow-none print:p-0 print:border-0 print:border-b print:border-slate-300 print:mb-4 ${className}`}>
    <div className="mb-4 flex items-center gap-3 print:mb-2">
      {Icon && (
        <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700 print:bg-transparent print:p-0">
          <Icon className="h-6 w-6 print:h-5 print:w-5" />
        </div>
      )}
      <h2 className="text-xl font-bold text-slate-800 print:text-lg">{title}</h2>
    </div>
    {children}
  </section>
);

export default function Plano90DiasPage() {
  const { id: alunoId } = useParams();
  const loc = useLocation();
  const { user, profile, loading: authLoading } = useAuth();
  const toast = useToast();
  const isAdminForm = profile?.role === 'admin' && alunoId != null && alunoId !== '';
  const arquivoEnrollmentId = useMemo(() => {
    const raw = new URLSearchParams(loc.search).get('arquivo')
    if (!raw || !/^\d+$/.test(raw)) return null
    return Number(raw)
  }, [loc.search])
  const isStudentArchive = Boolean(!isAdminForm && arquivoEnrollmentId != null)
  const archiveMode = Boolean((isAdminForm && arquivoEnrollmentId != null) || isStudentArchive)
  const targetFormUserId = isAdminForm ? Number(alunoId) : user?.id;
  const studentPortalBlocked =
    profile?.role === 'student' && profile?.portal_plano_90_enabled !== true
  const [adminStudentLabel, setAdminStudentLabel] = useState('');
  const [archiveLoadFailed, setArchiveLoadFailed] = useState(false);

  const [capa, setCapa] = useState({ ...defaultCapa });
  const [mainGoal, setMainGoal] = useState({ ...defaultMainGoal });
  const [months, setMonths] = useState(() => defaultMonths());
  const [weeks, setWeeks] = useState(() => Array.from({ length: 12 }, () => emptyWeekRow()));
  const [finalReview, setFinalReview] = useState({ ...defaultFinal });
  const [hydrated, setHydrated] = useState(false);

  const buildPayload = useCallback(
    () => ({ version: 1, capa, mainGoal, months, weeks, finalReview }),
    [capa, mainGoal, months, weeks, finalReview]
  );
  const snapshot = useMemo(() => JSON.stringify(buildPayload()), [buildPayload]);
  useFormAutosave(FORM_TYPE, targetFormUserId, hydrated, snapshot, 1500, {
    isAdmin: isAdminForm,
    skip: archiveMode || (!isAdminForm && studentPortalBlocked),
  });

  useEffect(() => {
    if (!isAdminForm || !alunoId) {
      setAdminStudentLabel('');
      return;
    }
    let ok = true;
    (async () => {
      try {
        const d = await api(`/admin/students/${alunoId}`);
        if (ok && d?.student) {
          const s = d.student;
          setAdminStudentLabel(s.full_name || s.email || `Aluno #${alunoId}`);
        }
      } catch {
        if (ok) setAdminStudentLabel(`Aluno #${alunoId}`);
      }
    })();
    return () => {
      ok = false;
    };
  }, [isAdminForm, alunoId]);

  const applyPlano = (data) => {
    setCapa(data.capa);
    setMainGoal(data.mainGoal);
    setMonths(data.months);
    setWeeks(data.weeks);
    setFinalReview(data.finalReview);
  };

  useEffect(() => {
    if (authLoading || !user) return;
    if (!isAdminForm && profile?.role === 'student' && profile?.portal_plano_90_enabled !== true) {
      setHydrated(true)
      return undefined
    }
    if (!targetFormUserId) return;
    setHydrated(false);
    setArchiveLoadFailed(false);
    const draftKey = isAdminForm
      ? `altzen_draft_${FORM_TYPE}_admin_${targetFormUserId}`
      : `altzen_draft_${FORM_TYPE}_${targetFormUserId}`;
    const formPath = isAdminForm
      ? `/admin/students/${targetFormUserId}/forms/${encodeURIComponent(FORM_TYPE)}`
      : `/forms/${encodeURIComponent(FORM_TYPE)}`;
    let cancelled = false;

    const loadLive = async () => {
      try {
        const d = await api(formPath);
        if (cancelled) return;
        if (d?.cycle_masked) {
          try {
            localStorage.removeItem(draftKey);
          } catch {
            /* */
          }
          if (!cancelled) setHydrated(true);
          return;
        }
        if (d?.payload) {
          const merged = mergePlano(d.payload);
          if (merged) applyPlano(merged);
        } else {
          try {
            const raw = localStorage.getItem(draftKey);
            if (raw) {
              const { payload } = JSON.parse(raw);
              if (payload) {
                const merged = mergePlano(payload);
                if (merged) applyPlano(merged);
              }
            }
          } catch {
            /* */
          }
        }
      } catch {
        try {
          const raw = localStorage.getItem(draftKey);
          if (raw) {
            const { payload } = JSON.parse(raw);
            if (payload) {
              const merged = mergePlano(payload);
              if (merged) applyPlano(merged);
            }
          }
        } catch {
          /* */
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };

    const loadArchive = async () => {
      try {
        const archivePath = isAdminForm
          ? `/admin/students/${alunoId}/enrollments/${arquivoEnrollmentId}/forms/${encodeURIComponent(FORM_TYPE)}/archive`
          : `/me/enrollments/${arquivoEnrollmentId}/forms/${encodeURIComponent(FORM_TYPE)}/archive`;
        const d = await api(archivePath);
        if (cancelled) return;
        if (d?.payload) {
          const merged = mergePlano(d.payload);
          if (merged) applyPlano(merged);
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e?.message || 'Não foi possível carregar o arquivo deste ciclo.');
          setArchiveLoadFailed(true);
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };

    if (archiveMode) {
      loadArchive();
    } else {
      loadLive();
    }
    return () => {
      cancelled = true;
    };
  }, [
    user,
    authLoading,
    targetFormUserId,
    isAdminForm,
    archiveMode,
    arquivoEnrollmentId,
    alunoId,
    profile?.role,
    profile?.portal_plano_90_enabled,
    toast,
  ]);

  const setMonthEntrega = (mIndex, eIndex, value) => {
    setMonths((prev) => {
      const n = prev.map((m) => ({ ...m, entregas: [...m.entregas] }));
      n[mIndex].entregas[eIndex] = value;
      return n;
    });
  };

  const setWeekField = (index, key, value) => {
    setWeeks((prev) => {
      const n = [...prev];
      const row = { ...n[index] };
      row[key] = value;
      n[index] = row;
      return n;
    });
  };

  const setWeekChecklist = (index, key, checked) => {
    setWeeks((prev) => {
      const n = [...prev];
      const row = { ...n[index] };
      row.checklist = normalizeWeekChecklist({ ...row.checklist, [key]: checked });
      n[index] = row;
      return n;
    });
  };

  if (authLoading) {
    return <div className="p-8 text-center text-slate-500">Carregando…</div>;
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (alunoId && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  if (profile?.role === 'admin' && !alunoId && loc.pathname === '/plano-90-dias') {
    return <Navigate to="/admin" replace />;
  }
  if (isAdminForm && (!Number.isFinite(targetFormUserId) || targetFormUserId <= 0)) {
    return <Navigate to="/admin" replace />;
  }
  if (studentPortalBlocked) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">Plano de 90 dias indisponível</h1>
        <p className="mt-3 text-slate-600">
          O acesso ao plano de 90 dias ainda não foi liberado pelo mentor. Quando estiver ativo, o formulário aparece no
          menu e nesta página.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block font-medium text-indigo-700 hover:underline"
        >
          Voltar ao painel
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 font-sans text-slate-800 print:bg-white">
      <div className="mx-auto min-w-0 max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl print:rounded-none print:shadow-none">
        <div className="bg-indigo-950 p-8 text-white print:border-b-4 print:border-indigo-950 print:bg-white print:text-indigo-950">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight print:text-2xl">Plano de 90 dias</h1>
              <p className="mt-2 text-lg text-indigo-200 print:text-slate-600">Mentoria individual — execução e revisão semanal</p>
              <p className="mt-4 font-medium text-indigo-300 print:text-slate-500">AltzenPro</p>
              <p className="mt-3 max-w-2xl text-sm text-indigo-200/90 print:hidden">
                {archiveMode
                  ? 'Arquivo de ciclo encerrado — só leitura. Use Imprimir / PDF para exportar.'
                  : 'Os dados sincronizam com o servidor. Se a conexão falhar, um rascunho local é mantido até enviar de novo.'}
              </p>
              {isAdminForm && adminStudentLabel && !archiveMode && (
                <p className="mt-3 max-w-2xl rounded-lg border border-amber-300/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-100 print:hidden">
                  A editar o plano de: <span className="font-semibold">{adminStudentLabel}</span>
                </p>
              )}
              {archiveMode && (
                <p className="mt-3 max-w-2xl rounded-lg border border-teal-300/50 bg-teal-950/40 px-3 py-2 text-sm text-teal-50 print:hidden">
                  Inscrição <span className="font-mono">#{arquivoEnrollmentId}</span> — arquivo do ciclo (só leitura).
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Link
                to={isAdminForm ? `/admin/alunos/${alunoId}` : '/dashboard'}
                className="inline-flex items-center rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/20"
              >
                <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
                {isAdminForm ? 'Ficha do aluno' : 'Painel'}
              </Link>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center rounded-lg bg-indigo-700 px-3 py-2 text-sm text-white transition hover:bg-indigo-600"
              >
                <Printer className="mr-2 h-4 w-4 shrink-0" />
                Imprimir / PDF
              </button>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-10 p-8 print:space-y-6 print:p-0 print:pt-4">
          {archiveMode && !archiveLoadFailed && hydrated && (
            <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-950 print:hidden">
              <p>
                {isAdminForm ? (
                  <>
                    Registro salvo quando o ciclo passou a <strong>concluída</strong> ou <strong>encerrada</strong>.{' '}
                    <Link className="font-medium text-teal-800 underline" to={`/admin/alunos/${alunoId}/plano-90-dias`}>
                      Abrir o plano atual (edição)
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    Consulta do arquivo desta inscrição (só leitura). Para editar o plano do <strong>ciclo atual</strong>,{' '}
                    <Link className="font-medium text-teal-800 underline" to="/plano-90-dias">
                      abra o formulário sem arquivo
                    </Link>
                    .
                  </>
                )}
              </p>
            </div>
          )}
          <div
            className={
              archiveMode
                ? 'pointer-events-none select-text space-y-10 print:space-y-6'
                : 'min-w-0 space-y-10 print:space-y-6'
            }
          >
          <section className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-6 print:border-0 print:bg-transparent print:p-0">
            <h2 className="text-lg font-bold text-indigo-950">Objetivo principal</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-1">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Título</label>
                <input className={inputClass} value={capa.title} onChange={(e) => setCapa({ ...capa, title: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Subtítulo</label>
                <input className={inputClass} value={capa.subtitle} onChange={(e) => setCapa({ ...capa, subtitle: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Assinatura</label>
                <input className={inputClass} value={capa.signature} onChange={(e) => setCapa({ ...capa, signature: e.target.value })} />
              </div>
            </div>
          </section>

          <Section icon={Info} title="1) Como usar este plano">
            <ul className="list-disc space-y-1 pl-5 text-slate-700 print:text-sm">
              <li>Defina 1 objetivo principal para 90 dias.</li>
              <li>Divida em 3 ciclos de 30 dias.</li>
              <li>Execute com revisão semanal e marque, ao fim de cada semana, os rituais na tabela (coluna específica daquela semana).</li>
              <li>Registre evidências concretas.</li>
            </ul>
          </Section>

          <Section icon={Target} title="2) Meu objetivo principal (90 dias)">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ['objective', 'Objetivo'],
                ['reason', 'Motivo'],
                ['measurable', 'Meta mensurável'],
              ].map(([k, label]) => (
                <div key={k} className={k === 'reason' || k === 'objective' ? 'md:col-span-2' : ''}>
                  <label className="mb-1 block text-sm font-medium capitalize text-slate-600">{label}</label>
                  {k === 'reason' || k === 'objective' ? (
                    <textarea
                      className={textareaClass}
                      rows={3}
                      value={mainGoal[k]}
                      onChange={(e) => setMainGoal({ ...mainGoal, [k]: e.target.value })}
                    />
                  ) : (
                    <input
                      className={inputClass}
                      value={mainGoal[k]}
                      onChange={(e) => setMainGoal({ ...mainGoal, [k]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
          </Section>

          <Section icon={BookOpen} title="3) Estrutura 30/30/30">
            <div className="space-y-8">
              {months.map((m, mi) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/80 p-5 print:border-slate-300 print:bg-white"
                >
                  <h3 className="text-base font-bold text-indigo-900 print:text-sm">
                    {m.label} — {m.sublabel}
                  </h3>
                  <div className="mt-3">
                    <label className="mb-1 block text-sm font-medium text-slate-600">Meta do mês</label>
                    <textarea
                      className={textareaClass}
                      rows={2}
                      value={m.meta}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMonths((prev) => prev.map((x, i) => (i === mi ? { ...x, meta: v } : x)));
                      }}
                    />
                  </div>
                  <p className="mt-4 text-sm font-medium text-slate-600">3 entregas esperadas</p>
                  <ol className="mt-2 space-y-2">
                    {[0, 1, 2].map((i) => (
                      <li key={i} className="flex gap-2 print:text-sm">
                        <span className="w-6 shrink-0 font-semibold text-indigo-600">{i + 1}.</span>
                        <input
                          className={inputClass}
                          value={m.entregas[i]}
                          onChange={(e) => setMonthEntrega(mi, i, e.target.value)}
                        />
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </Section>

          <Section icon={Table2} title="4) Tabela semanal (12 semanas)">
            <p className="mb-3 text-sm text-slate-600 print:text-xs">
              Ao <strong>final de cada semana</strong>, use a última coluna para marcar o que você cumpriu naquela semana
              (não é global).
            </p>
            <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm text-amber-950 print:block">
              <p className="font-semibold">Referência — mentoria 90 dias (fases)</p>
              <p className="mt-1 text-amber-900/90">
                Fase 1: semanas 1–4 (diagnóstico e base). Fase 2: semanas 5–8 (projeto e execução). Fase 3:
                semanas 9–12 (visibilidade e fechamento).
              </p>
            </div>
            <div className="hidden print:block print:break-before-page" />
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-[68rem] border-collapse border border-slate-200 text-left text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-800">
                    <th className="border border-slate-200 p-2 print:p-1">Semana</th>
                    <th className="border border-slate-200 p-2 print:p-1">Objetivo da semana</th>
                    <th className="border border-slate-200 p-2 print:p-1">Foco técnico</th>
                    <th className="border border-slate-200 p-2 print:p-1">Foco carreira / visibilidade</th>
                    <th className="border border-slate-200 p-2 print:p-1">Entregas</th>
                    <th className="border border-slate-200 p-2 print:p-1">Evidências</th>
                    <th className="w-[12rem] border border-slate-200 p-2 print:w-auto print:p-1 print:text-[0.65rem]">
                      Rituais desta semana
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((w, i) => (
                    <tr key={i} className="align-top print:text-xs">
                      <td className="border border-slate-200 p-1 text-center font-semibold text-indigo-800 print:w-10">
                        {i + 1}
                      </td>
                      {['weekObjective', 'techFocus', 'careerFocus', 'entregas', 'evidence'].map((key) => (
                        <td key={key} className="border border-slate-200 p-0">
                          <textarea
                            className="h-full w-full min-h-[4rem] resize-y border-0 bg-transparent p-2 text-sm outline-none print:min-h-[3rem] print:py-1"
                            value={w[key]}
                            onChange={(e) => setWeekField(i, key, e.target.value)}
                          />
                        </td>
                      ))}
                      <td className="border border-slate-200 p-1.5 align-top print:p-1">
                        <ul className="m-0 list-none space-y-1.5 p-0">
                          {checklistLabels.map((item) => (
                            <li key={item.key} className="flex items-start gap-1.5">
                              <input
                                type="checkbox"
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 print:h-3 print:w-3"
                                checked={!!w.checklist?.[item.key]}
                                onChange={(e) => setWeekChecklist(i, item.key, e.target.checked)}
                              />
                              <span className="text-[0.7rem] leading-tight text-slate-700 print:text-[0.6rem]">{item.text}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="hidden print:block print:break-before-page" />

          <details className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 print:hidden open:bg-white">
            <summary className="cursor-pointer text-lg font-bold text-slate-800">Guia sugerido — 12 semanas (mentoria)</summary>
            <p className="mb-4 mt-2 text-sm text-slate-600">
              Referência alinhada ao cronograma de mentoria. Use a tabela acima para o seu plano pessoal.
            </p>
            <ol className="list-decimal space-y-3 pl-5 text-sm text-slate-800">
              {WEEK_GUIDE.map((g, i) => (
                <li key={i} className="pl-1">
                  <p className="font-semibold">{g.title}</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-600">
                    {g.lines.map((l, j) => (
                      <li key={j}>{l}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </details>
          <div className="hidden print:block print:rounded-xl print:border print:border-slate-200 print:p-4">
            <p className="text-sm font-bold text-slate-800">Guia sugerido (resumo)</p>
            <p className="mt-2 text-xs text-slate-600">
              Semanas 1–4: diagnóstico e base. 5–8: projeto. 9–12: visibilidade e fechamento. O detalhe está
              no app (seção colapsável).
            </p>
          </div>

          <Section title="5) Adaptação por perfil" icon={Info}>
            <div className="space-y-6 text-sm text-slate-700 print:text-xs">
              <div>
                <h3 className="font-bold text-indigo-900">Estagiário ou começando a carreira</h3>
                <ul className="mt-1 list-disc pl-5">
                  <li>Priorize rotina, ambiente e uma base sólida (lógica, Git, leitura de código) em vez de muitos temas ao mesmo tempo.</li>
                  <li>Escolha um projeto pequeno, mas do início ao fim, com entregas que você consiga comprovar.</li>
                  <li>Alinhe com o mentor (ou a empresa) expectativas de carga, prazos e o que “entregar com qualidade” significa no seu contexto.</li>
                  <li>Visibilidade: portfólio simples (README, demonstração) e presença mínima coerente (ex.: 1 atualização quinzenal no que for relevante para você).</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-indigo-900">Transição de carreira</h3>
                <ul className="mt-1 list-disc pl-5">
                  <li>Deixe explícito o que vem de experiência anterior (comunicação, domínio de processo) e o que ainda precisa virar prática em tech.</li>
                  <li>Reduza o escopo do projeto: melhor dominar 1–2 assuntos e 1 narrativa de mudança do que espalhar em muitas frentes.</li>
                  <li>Inclua na semana blocos fixos de estudo e de “mão na massa”; transição exige constância, não só intenção.</li>
                  <li>Visibilidade: alinhe LinkedIn, CV e narrativa com a vaga ou caminho que você busca; evidências concretas valem mais que lista longa de cursos.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-indigo-900">Suporte/QA → Dev</h3>
                <ul className="mt-1 list-disc pl-5">
                  <li>Mais foco em fundamentos e API básica.</li>
                  <li>Projeto mais simples, porém completo.</li>
                  <li>Visibilidade: GitHub + 1 post quinzenal.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-indigo-900">Dev Júnior → Pleno</h3>
                <ul className="mt-1 list-disc pl-5">
                  <li>Mais foco em qualidade e regra de negócio.</li>
                  <li>Projeto com fluxo real de ponta a ponta.</li>
                  <li>Visibilidade: narrativa de projeto e resultados.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-indigo-900">Dev Pleno → Sênior</h3>
                <ul className="mt-1 list-disc pl-5">
                  <li>Mais foco em arquitetura e impacto.</li>
                  <li>Melhorias técnicas com critério de negócio.</li>
                  <li>Visibilidade: liderança técnica e mentoria.</li>
                </ul>
              </div>
            </div>
          </Section>

          <Section icon={BarChart3} title="6) Revisão final (Dia 90)">
            <div className="space-y-6">
              {[
                { key: 'tech', label: '3 conquistas técnicas', arr: finalReview.tech, setter: (a) => setFinalReview((f) => ({ ...f, tech: a })) },
                {
                  key: 'career',
                  label: '3 conquistas de carreira',
                  arr: finalReview.career,
                  setter: (a) => setFinalReview((f) => ({ ...f, career: a })),
                },
                {
                  key: 'next90',
                  label: '3 focos dos próximos 90 dias',
                  arr: finalReview.next90,
                  setter: (a) => setFinalReview((f) => ({ ...f, next90: a })),
                },
              ].map((block) => (
                <div key={block.key}>
                  <h3 className="mb-2 border-l-4 border-indigo-500 pl-2 text-base font-bold text-slate-800 print:text-sm">
                    {block.label}
                  </h3>
                  <ol className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <li key={i} className="flex gap-2">
                        <span className="w-5 shrink-0 text-indigo-600">{i + 1}.</span>
                        <input
                          className={inputClass}
                          value={block.arr[i]}
                          onChange={(e) => {
                            const next = [...block.arr];
                            next[i] = e.target.value;
                            block.setter(next);
                          }}
                        />
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </Section>
          </div>
        </div>

        <div className="hidden print:block border-t py-3 text-center text-xs text-slate-400">Plano de 90 dias — AltzenPro</div>
      </div>
    </div>
  );
}
