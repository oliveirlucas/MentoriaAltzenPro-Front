import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, Navigate, useParams, useLocation } from 'react-router-dom';
import { User, Briefcase, Code, LineChart, Printer, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { useFormAutosave } from '../hooks/useFormAutosave.js';

const FORM_TYPE = 'altzen-diagnostico-carreira';

const defaultBasicData = { name: '', city: '', linkedin: '', github: '' };
const defaultProfessionalData = { role: '', bond: '', sector: '', otherRole: '', otherSector: '' };
const defaultStrengths = ['', '', ''];
const defaultFocuses = ['', '', ''];
const defaultCommitment = { current: '', target: '' };

function padStringArray(arr, len) {
  const a = Array.isArray(arr) ? arr.map((x) => String(x ?? '')) : [];
  while (a.length < len) a.push('');
  return a.slice(0, len);
}

function mergeImportedForm(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    basicData: { ...defaultBasicData, ...(raw.basicData && typeof raw.basicData === 'object' ? raw.basicData : {}) },
    professionalData: {
      ...defaultProfessionalData,
      ...(raw.professionalData && typeof raw.professionalData === 'object' ? raw.professionalData : {}),
    },
    goals: Array.isArray(raw.goals)
      ? raw.goals.filter((g) => typeof g === 'string').slice(0, 2)
      : [],
    techScores: raw.techScores && typeof raw.techScores === 'object' ? raw.techScores : {},
    careerScores: raw.careerScores && typeof raw.careerScores === 'object' ? raw.careerScores : {},
    profile: typeof raw.profile === 'string' ? raw.profile : '',
    strengths: padStringArray(raw.strengths, 3),
    focuses: padStringArray(raw.focuses, 3),
    commitment: {
      current: raw.commitment?.current != null ? String(raw.commitment.current) : '',
      target: raw.commitment?.target != null ? String(raw.commitment.target) : '',
    },
  };
}

export default function DiagnosticoPage() {
  const { id: alunoId } = useParams();
  const loc = useLocation();
  const { user, profile: userProfile, loading: authLoading } = useAuth();
  const isAdminForm = userProfile?.role === 'admin' && alunoId != null && alunoId !== '';
  const arquivoEnrollmentId = useMemo(() => {
    const raw = new URLSearchParams(loc.search).get('arquivo')
    if (!raw || !/^\d+$/.test(raw)) return null
    return Number(raw)
  }, [loc.search])
  const isStudentArchive = Boolean(!isAdminForm && arquivoEnrollmentId != null)
  const archiveMode = Boolean((isAdminForm && arquivoEnrollmentId != null) || isStudentArchive)
  const targetFormUserId = isAdminForm ? Number(alunoId) : user?.id;
  const studentPortalBlocked =
    userProfile?.role === 'student' && userProfile?.portal_diagnostico_enabled !== true
  const [adminStudentLabel, setAdminStudentLabel] = useState('');
  const [archiveErr, setArchiveErr] = useState('');

  // Contexto Atual
  const [basicData, setBasicData] = useState({ ...defaultBasicData });
  const [professionalData, setProfessionalData] = useState({ ...defaultProfessionalData });
  const [goals, setGoals] = useState([]);

  // Diagnóstico Técnico (18 itens)
  const [techScores, setTechScores] = useState({});

  // Carreira e Comportamento (12 itens)
  const [careerScores, setCareerScores] = useState({});

  // Resultados
  const [profile, setProfile] = useState('');
  const [strengths, setStrengths] = useState([...defaultStrengths]);
  const [focuses, setFocuses] = useState([...defaultFocuses]);
  const [commitment, setCommitment] = useState({ ...defaultCommitment });

  const [hydrated, setHydrated] = useState(false);

  const buildPayload = useCallback(
    () => ({
      version: 1,
      basicData,
      professionalData,
      goals,
      techScores,
      careerScores,
      profile,
      strengths,
      focuses,
      commitment,
    }),
    [
      basicData,
      professionalData,
      goals,
      techScores,
      careerScores,
      profile,
      strengths,
      focuses,
      commitment,
    ]
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

  const applyFormData = (data) => {
    setBasicData(data.basicData);
    setProfessionalData(data.professionalData);
    setGoals(data.goals);
    setTechScores(data.techScores);
    setCareerScores(data.careerScores);
    setProfile(data.profile);
    setStrengths(data.strengths);
    setFocuses(data.focuses);
    setCommitment(data.commitment);
  };

  useEffect(() => {
    if (authLoading || !user) return;
    if (!isAdminForm && userProfile?.role === 'student' && userProfile?.portal_diagnostico_enabled !== true) {
      setHydrated(true)
      return undefined
    }
    if (!targetFormUserId) return;
    setHydrated(false);
    setArchiveErr('');
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
          const merged = mergeImportedForm(d.payload);
          if (merged) applyFormData(merged);
        } else {
          try {
            const raw = localStorage.getItem(draftKey);
            if (raw) {
              const { payload } = JSON.parse(raw);
              if (payload) {
                const merged = mergeImportedForm(payload);
                if (merged) applyFormData(merged);
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
              const merged = mergeImportedForm(payload);
              if (merged) applyFormData(merged);
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
          const merged = mergeImportedForm(d.payload);
          if (merged) applyFormData(merged);
        }
      } catch (e) {
        if (!cancelled) setArchiveErr(e?.message || 'Não foi possível carregar o arquivo deste ciclo.');
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
    userProfile?.role,
    userProfile?.portal_diagnostico_enabled,
  ]);

  // Cálculo de totais
  const techTotal = Object.values(techScores).reduce((acc, curr) => acc + Number(curr), 0);
  const careerTotal = Object.values(careerScores).reduce((acc, curr) => acc + Number(curr), 0);

  const handleGoalChange = (goal) => {
    if (goals.includes(goal)) {
      setGoals(goals.filter(g => g !== goal));
    } else if (goals.length < 2) {
      setGoals([...goals, goal]);
    }
  };

  const handleScoreChange = (type, key, value) => {
    if (type === 'tech') setTechScores(prev => ({ ...prev, [key]: value }));
    if (type === 'career') setCareerScores(prev => ({ ...prev, [key]: value }));
  };

  const updateArrayState = (setter, index, value) => {
    setter(prev => {
      const newArr = [...prev];
      newArr[index] = value;
      return newArr;
    });
  };

  const ScoreRow = ({ label, stateKey, type }) => {
    const currentValue = type === 'tech' ? techScores[stateKey] : careerScores[stateKey];
    
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-slate-50 transition-colors print:py-1 print:border-b-gray-300">
        <span className="text-gray-700 font-medium mb-2 sm:mb-0 sm:w-1/2 print:text-sm">{label}</span>
        <div className="flex w-full min-w-0 max-w-full justify-between gap-1 px-1 sm:w-1/2 sm:max-w-sm sm:gap-0 sm:px-4">
          {[1, 2, 3, 4, 5].map(num => (
            <label key={num} className="flex flex-col items-center cursor-pointer group">
              <span className="text-xs text-gray-400 mb-1 sm:hidden">{num}</span>
              <div className="relative flex items-center justify-center">
                <input
                  type="radio"
                  name={stateKey}
                  value={num}
                  checked={currentValue === num}
                  onChange={() => handleScoreChange(type, stateKey, num)}
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 cursor-pointer print:w-4 print:h-4"
                />
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const SectionHeader = ({ icon: Icon, title, subtitle }) => (
    <div className="flex items-center mb-6 print:mb-2 border-b pb-4 print:pb-1">
      <div className="bg-blue-100 p-2 rounded-lg mr-4 print:bg-transparent print:p-0 print:text-blue-800">
        <Icon className="w-6 h-6 text-blue-600 print:w-5 print:h-5" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-800 print:text-xl">{title}</h2>
        {subtitle && <p className="text-gray-500 print:text-sm">{subtitle}</p>}
      </div>
    </div>
  );

  if (authLoading) {
    return <div className="p-8 text-center text-slate-500">Carregando…</div>;
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (alunoId && userProfile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  if (userProfile?.role === 'admin' && !alunoId && loc.pathname === '/diagnostico') {
    return <Navigate to="/admin" replace />;
  }
  if (isAdminForm && (!Number.isFinite(targetFormUserId) || targetFormUserId <= 0)) {
    return <Navigate to="/admin" replace />;
  }
  if (studentPortalBlocked) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">Diagnóstico indisponível</h1>
        <p className="mt-3 text-slate-600">
          O acesso ao diagnóstico ainda não foi liberado pelo mentor. Quando estiver ativo, o formulário aparece no menu
          e nesta página.
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
    <div className="w-full min-w-0 print:bg-white font-sans text-gray-800">
      <div className="mx-auto min-w-0 max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl print:rounded-none print:shadow-none">
        
        {/* Header */}
        <div className="bg-blue-900 p-8 text-white print:border-b-4 print:border-blue-900 print:bg-white print:text-blue-900">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight print:text-2xl">Diagnóstico de Carreira em Desenvolvimento de Software</h1>
              <p className="text-blue-200 mt-2 text-lg print:text-gray-600">Do Suporte/QA ao Dev Pleno/Sênior</p>
              <p className="text-blue-300 mt-4 font-medium print:text-gray-500">AltzenPro</p>
              <p className="text-blue-200/90 text-sm mt-3 max-w-2xl print:hidden">
                {archiveMode
                  ? 'Arquivo de ciclo encerrado — só leitura. Use Imprimir / PDF para exportar.'
                  : 'Os dados são salvos no portal (servidor). Se a conexão falhar, um rascunho fica no dispositivo até sincronizar de novo.'}
              </p>
              {isAdminForm && adminStudentLabel && !archiveMode && (
                <p className="mt-3 max-w-2xl rounded-lg border border-amber-300/50 bg-amber-900/50 px-3 py-2 text-sm text-amber-100 print:hidden">
                  A editar o diagnóstico de: <span className="font-semibold">{adminStudentLabel}</span>
                </p>
              )}
              {archiveMode && (
                <p className="mt-3 max-w-2xl rounded-lg border border-teal-300/50 bg-teal-900/40 px-3 py-2 text-sm text-teal-50 print:hidden">
                  Inscrição <span className="font-mono">#{arquivoEnrollmentId}</span> — arquivo do ciclo (só leitura).
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Link
                to={isAdminForm ? `/admin/alunos/${alunoId}` : '/dashboard'}
                className="inline-flex items-center border border-white/30 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm transition"
              >
                <ArrowLeft className="w-4 h-4 mr-2 shrink-0" />
                {isAdminForm ? 'Ficha do aluno' : 'Painel'}
              </Link>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center bg-blue-700 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm transition"
              >
                <Printer className="w-4 h-4 mr-2 shrink-0" />
                Imprimir / PDF
              </button>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-12 p-8 print:space-y-6 print:p-0 print:pt-4">
          {archiveMode && archiveErr && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {archiveErr}
            </div>
          )}
          {archiveMode && !archiveErr && hydrated && (
            <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-950 print:hidden">
              <p>
                {isAdminForm ? (
                  <>
                    Este é o registo guardado quando o ciclo passou a <strong>concluída</strong> ou{' '}
                    <strong>encerrada</strong>.{' '}
                    <Link className="font-medium text-teal-800 underline" to={`/admin/alunos/${alunoId}/diagnostico`}>
                      Abrir o formulário atual (edição)
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    Consulta do arquivo desta inscrição (só leitura). Para editar o diagnóstico do{' '}
                    <strong>ciclo atual</strong>,{' '}
                    <Link className="font-medium text-teal-800 underline" to="/diagnostico">
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
                ? 'pointer-events-none select-text space-y-12 print:space-y-6'
                : 'min-w-0 space-y-12 print:space-y-6'
            }
          >
          {/* Instruções */}
          <section className="bg-blue-50 p-6 rounded-xl border border-blue-100 print:bg-transparent print:border-none print:p-0">
            <h3 className="text-xl font-bold text-blue-900 mb-4 print:text-lg">Introdução e Instruções</h3>
            <div className="grid md:grid-cols-2 gap-6 print:block print:space-y-4">
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">1) Por que este diagnóstico existe?</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1 print:text-sm">
                  <li>Dar clareza do momento atual.</li>
                  <li>Identificar pontos fortes e lacunas.</li>
                  <li>Definir foco de 90 dias sem dispersão.</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">2) Como usar?</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1 print:text-sm">
                  <li>Reserve 15 a 20 minutos.</li>
                  <li>Responda com sinceridade.</li>
                  <li>O preenchimento sincroniza com sua conta no portal.</li>
                  <li>Use o resultado para montar seu plano de 90 dias.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Contexto Atual */}
          <section>
            <SectionHeader icon={User} title="Contexto Atual" />
            
            <div className="space-y-8 print:space-y-4">
              <div>
                <h4 className="text-lg font-bold text-gray-700 mb-4 print:text-base border-l-4 border-blue-500 pl-3">1) Dados básicos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.keys(basicData).map((key) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-600 mb-1 capitalize">
                        {key === 'name' ? 'Nome' : key === 'city' ? 'Cidade/Estado' : key}
                      </label>
                      <input 
                        type="text" 
                        value={basicData[key]}
                        onChange={(e) => setBasicData({...basicData, [key]: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none print:border-b print:border-gray-400 print:rounded-none print:px-0 print:py-1 print:bg-transparent" 
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-bold text-gray-700 mb-4 print:text-base border-l-4 border-blue-500 pl-3">2) Situação profissional</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Função */}
                  <div className="bg-gray-50 p-4 rounded-lg border print:bg-transparent print:border-none print:p-0">
                    <label className="block font-semibold text-gray-700 mb-3">Função atual:</label>
                    <div className="space-y-2">
                      {['Suporte / Service Desk', 'QA / Qualidade', 'Estagiário de TI / Dev', 'Dev Júnior', 'Dev Pleno', 'Dev Sênior / Engineer', 'Outro'].map(opt => (
                        <label key={opt} className="flex items-center space-x-2 cursor-pointer print:text-sm">
                          <input type="radio" name="role" value={opt} checked={professionalData.role === opt} onChange={(e) => setProfessionalData({...professionalData, role: e.target.value})} className="text-blue-600" />
                          <span className="text-gray-700">{opt}</span>
                        </label>
                      ))}
                      {professionalData.role === 'Outro' && (
                        <input type="text" placeholder="Qual?" value={professionalData.otherRole} onChange={(e) => setProfessionalData({...professionalData, otherRole: e.target.value})} className="mt-2 w-full px-3 py-1 text-sm border rounded print:border-b print:rounded-none print:px-0" />
                      )}
                    </div>
                  </div>

                  {/* Vínculo */}
                  <div className="bg-gray-50 p-4 rounded-lg border print:bg-transparent print:border-none print:p-0">
                    <label className="block font-semibold text-gray-700 mb-3">Vínculo atual:</label>
                    <div className="space-y-2">
                      {['CLT/PJ em tecnologia', 'Empresa de outro setor com TI', 'Freelancer/autônomo', 'Em transição'].map(opt => (
                        <label key={opt} className="flex items-center space-x-2 cursor-pointer print:text-sm">
                          <input type="radio" name="bond" value={opt} checked={professionalData.bond === opt} onChange={(e) => setProfessionalData({...professionalData, bond: e.target.value})} className="text-blue-600" />
                          <span className="text-gray-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Setor */}
                  <div className="bg-gray-50 p-4 rounded-lg border print:bg-transparent print:border-none print:p-0">
                    <label className="block font-semibold text-gray-700 mb-3">Setor de atuação:</label>
                    <div className="space-y-2">
                      {['Educação', 'Financeiro', 'Saúde', 'Varejo/e-commerce', 'Outro'].map(opt => (
                        <label key={opt} className="flex items-center space-x-2 cursor-pointer print:text-sm">
                          <input type="radio" name="sector" value={opt} checked={professionalData.sector === opt} onChange={(e) => setProfessionalData({...professionalData, sector: e.target.value})} className="text-blue-600" />
                          <span className="text-gray-700">{opt}</span>
                        </label>
                      ))}
                      {professionalData.sector === 'Outro' && (
                        <input type="text" placeholder="Qual?" value={professionalData.otherSector} onChange={(e) => setProfessionalData({...professionalData, otherSector: e.target.value})} className="mt-2 w-full px-3 py-1 text-sm border rounded print:border-b print:rounded-none print:px-0" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-bold text-gray-700 mb-4 print:text-base border-l-4 border-blue-500 pl-3 flex items-center justify-between">
                  3) Objetivo em 12 meses <span className="text-sm font-normal text-gray-500">(marcar até 2)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {['Migrar de Suporte/QA para Dev', 'Sair de Júnior para Pleno', 'Sair de Pleno para Sênior', 'Conseguir primeira vaga', 'Mudar de empresa', 'Empreender'].map(opt => (
                    <label key={opt} className={`flex items-center space-x-3 p-3 rounded-lg border transition cursor-pointer print:p-1 print:border-none ${goals.includes(opt) ? 'bg-blue-50 border-blue-200 print:bg-transparent' : 'bg-white hover:bg-gray-50'}`}>
                      <input 
                        type="checkbox" 
                        checked={goals.includes(opt)} 
                        onChange={() => handleGoalChange(opt)} 
                        disabled={!goals.includes(opt) && goals.length >= 2}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50" 
                      />
                      <span className={`text-gray-700 font-medium print:text-sm ${!goals.includes(opt) && goals.length >= 2 ? 'opacity-50' : ''}`}>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Divisor Visual para Impressão */}
          <div className="hidden print:block print:break-before-page"></div>

          {/* Diagnóstico Técnico */}
          <section>
            <SectionHeader icon={Code} title="Diagnóstico Técnico" subtitle="Escala 1 a 5" />
            
            <div className="bg-slate-800 text-white rounded-lg p-4 mb-6 flex flex-wrap justify-center sm:justify-between text-sm shadow-inner print:bg-gray-100 print:text-gray-800 print:shadow-none print:border print:border-gray-300">
              <span className="px-2 py-1"><strong>1</strong> = não sei</span>
              <span className="px-2 py-1"><strong>2</strong> = básico inseguro</span>
              <span className="px-2 py-1"><strong>3</strong> = executo com ajuda</span>
              <span className="px-2 py-1"><strong>4</strong> = executo com segurança</span>
              <span className="px-2 py-1 text-blue-300 print:text-blue-700"><strong>5</strong> = sou referência</span>
            </div>

            <div className="hidden sm:flex justify-end mb-2 px-4 print:flex">
              <div className="flex justify-between w-1/2 max-w-sm px-4 text-xs font-bold text-gray-500">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
            </div>

            <div className="space-y-6">
              {[
                { title: '1) Fundamentos', items: ['Lógica de programação', 'POO', 'Leitura de código legado'] },
                { title: '2) Backend', items: ['C# / .NET', 'APIs REST', 'Tratamento de erros e logging'] },
                { title: '3) Banco de dados', items: ['Modelagem relacional', 'SQL (SELECT/JOIN/FILTROS)', 'CRUD/transações'] },
                { title: '4) Front-end (se aplicável)', items: ['HTML/CSS', 'JavaScript/TypeScript', 'Vue/React'] },
                { title: '5) Qualidade', items: ['Teste unitário', 'Teste manual com cenários', 'Ferramentas de qualidade (Sonar, etc.)'] },
                { title: '6) Entrega/DevOps', items: ['Git no dia a dia', 'CI/CD', 'Docker/Kubernetes'] },
              ].map((group, i) => (
                <div key={i} className="bg-white border rounded-xl p-5 shadow-sm print:shadow-none print:p-0 print:border-none print:mb-4">
                  <h4 className="text-lg font-bold text-blue-900 border-b pb-2 mb-4 print:text-base print:border-gray-300 print:mb-1">{group.title}</h4>
                  <div className="space-y-1">
                    {group.items.map(item => <ScoreRow key={item} label={item} stateKey={item} type="tech" />)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Divisor Visual para Impressão */}
          <div className="hidden print:block print:break-before-page"></div>

          {/* Carreira e Comportamento */}
          <section>
            <SectionHeader icon={Briefcase} title="Carreira e Comportamento" subtitle="Escala 1 a 5" />

            <div className="bg-slate-800 text-white rounded-lg p-4 mb-6 flex flex-wrap justify-center sm:justify-between text-sm shadow-inner print:bg-gray-100 print:text-gray-800 print:shadow-none print:border print:border-gray-300">
              <span className="px-2 py-1"><strong>1</strong> = nunca / não sei</span>
              <span className="px-2 py-1"><strong>2</strong> = raramente / inseguro</span>
              <span className="px-2 py-1"><strong>3</strong> = às vezes / com ajuda</span>
              <span className="px-2 py-1"><strong>4</strong> = freq. / com segurança</span>
              <span className="px-2 py-1 text-blue-300 print:text-blue-700"><strong>5</strong> = sempre / referência</span>
            </div>

            <div className="hidden sm:flex justify-end mb-2 px-4 print:flex">
              <div className="flex justify-between w-1/2 max-w-sm px-4 text-xs font-bold text-gray-500">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
            </div>

            <div className="space-y-6">
              {[
                { title: '1) Vivência real', items: ['Já entreguei para produção', 'Entendo impacto no negócio', 'Já trabalhei com legado'] },
                { title: '2) Trabalho em time', items: ['Peço ajuda com clareza', 'Participo de ritos ágeis', 'Faço/recebo code review'] },
                { title: '3) Postura', items: ['Responsabilidade ponta a ponta', 'Proponho melhorias', 'Registro e comunico resultados'] },
                { title: '4) Evolução', items: ['Rotina de estudo semanal', 'Termino o que começo', 'Tenho plano de evolução'] },
              ].map((group, i) => (
                <div key={i} className="bg-white border rounded-xl p-5 shadow-sm print:shadow-none print:p-0 print:border-none print:mb-4">
                  <h4 className="text-lg font-bold text-blue-900 border-b pb-2 mb-4 print:text-base print:border-gray-300 print:mb-1">{group.title}</h4>
                  <div className="space-y-1">
                    {group.items.map(item => <ScoreRow key={item} label={item} stateKey={item} type="career" />)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Resultado e Interpretação */}
          <section className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl border border-blue-100 shadow-md print:bg-none print:shadow-none print:border-gray-300 print:p-6 print:break-before-page">
            <SectionHeader icon={LineChart} title="Resultado e Interpretação" />

            <div className="space-y-8">
              
              {/* Pontuação */}
              <div>
                <h4 className="text-lg font-bold text-gray-700 mb-4 border-l-4 border-blue-500 pl-3">1) Pontuação (Opcional)</h4>
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex-1 bg-white p-6 rounded-xl border border-gray-200 flex items-center justify-between shadow-sm print:p-4 print:border-gray-300">
                    <div>
                      <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider">Total Técnico</p>
                      <p className="text-xs text-gray-400 mt-1">(18 itens)</p>
                    </div>
                    <div className="text-right">
                      <span className="text-4xl font-extrabold text-blue-600">{techTotal}</span>
                      <span className="text-xl text-gray-400 font-medium"> / 90</span>
                    </div>
                  </div>
                  <div className="flex-1 bg-white p-6 rounded-xl border border-gray-200 flex items-center justify-between shadow-sm print:p-4 print:border-gray-300">
                    <div>
                      <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider">Total Carreira</p>
                      <p className="text-xs text-gray-400 mt-1">(12 itens)</p>
                    </div>
                    <div className="text-right">
                      <span className="text-4xl font-extrabold text-blue-600">{careerTotal}</span>
                      <span className="text-xl text-gray-400 font-medium"> / 60</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Perfil Atual */}
              <div>
                <h4 className="text-lg font-bold text-gray-700 mb-4 border-l-4 border-blue-500 pl-3">2) Perfil atual (marcar o mais aderente)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'A', label: 'transição para dev' },
                    { id: 'B', label: 'júnior consolidando base' },
                    { id: 'C', label: 'pleno buscando senioridade' },
                    { id: 'D', label: 'outro' }
                  ].map(opt => (
                    <label key={opt.id} className={`flex items-center p-4 border rounded-xl cursor-pointer transition print:p-2 print:border-gray-300 ${profile === opt.id ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-500 ring-opacity-50 print:bg-transparent print:ring-0 print:border-black' : 'bg-white hover:bg-gray-50'}`}>
                      <input type="radio" name="profile" value={opt.id} checked={profile === opt.id} onChange={() => setProfile(opt.id)} className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300 print:w-4 print:h-4" />
                      <span className="ml-3 font-medium text-gray-700 print:text-sm">Perfil {opt.id}: {opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Pontos Fortes e Focos */}
              <div className="grid md:grid-cols-2 gap-8 print:block print:space-y-6">
                <div>
                  <h4 className="text-lg font-bold text-gray-700 mb-4 border-l-4 border-blue-500 pl-3">3) Meus 3 pontos fortes</h4>
                  <div className="space-y-3">
                    {[0, 1, 2].map(i => (
                      <div key={`strength-${i}`} className="flex items-center">
                        <span className="text-blue-500 font-bold mr-3">{i + 1}.</span>
                        <input type="text" value={strengths[i]} onChange={(e) => updateArrayState(setStrengths, i, e.target.value)} className="w-full border-b border-gray-300 py-2 focus:border-blue-500 outline-none bg-transparent print:py-1 print:text-sm" placeholder="O que você domina?" />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-700 mb-4 border-l-4 border-blue-500 pl-3">4) Meus 3 focos para os próximos 90 dias</h4>
                  <div className="space-y-3">
                    {[0, 1, 2].map(i => (
                      <div key={`focus-${i}`} className="flex items-center">
                        <span className="text-red-400 font-bold mr-3">{i + 1}.</span>
                        <input type="text" value={focuses[i]} onChange={(e) => updateArrayState(setFocuses, i, e.target.value)} className="w-full border-b border-gray-300 py-2 focus:border-red-400 outline-none bg-transparent print:py-1 print:text-sm" placeholder="O que precisa melhorar?" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Frase de compromisso */}
              <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm print:border-gray-400 print:shadow-none print:p-4 print:mt-6">
                <h4 className="text-lg font-bold text-gray-700 mb-4 flex items-center">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mr-2" />
                  5) Frase de compromisso
                </h4>
                <div className="flex flex-wrap items-end text-lg font-medium text-gray-700 leading-relaxed print:text-base">
                  <span className="mr-2 mb-2">"Hoje estou em</span>
                  <input 
                    type="text" 
                    value={commitment.current}
                    onChange={(e) => setCommitment({...commitment, current: e.target.value})}
                    placeholder="sua situação atual..."
                    className="flex-1 min-w-[200px] border-b-2 border-gray-400 bg-gray-50 px-2 py-1 mx-2 mb-2 focus:border-blue-500 focus:bg-white outline-none print:bg-transparent print:border-b print:py-0 text-blue-700 text-center" 
                  />
                  <span className="mx-2 mb-2">e quero chegar em</span>
                  <input 
                    type="text" 
                    value={commitment.target}
                    onChange={(e) => setCommitment({...commitment, target: e.target.value})}
                    placeholder="seu objetivo..."
                    className="flex-1 min-w-[200px] border-b-2 border-gray-400 bg-gray-50 px-2 py-1 mx-2 mb-2 focus:border-blue-500 focus:bg-white outline-none print:bg-transparent print:border-b print:py-0 text-blue-700 text-center" 
                  />
                  <span className="mb-2">nos próximos 90 dias."</span>
                </div>
              </div>

            </div>
          </section>

          </div>

        </div>
        
        {/* Footer print-only */}
        <div className="hidden print:block text-center text-gray-400 text-xs py-4 border-t mt-4">
          Gerado a partir do Diagnóstico de Carreira - AltzenPro
        </div>

      </div>
    </div>
  );
}