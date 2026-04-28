import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, Navigate, useParams, useLocation } from 'react-router-dom';
import { User, Briefcase, Code, LineChart, Printer, CheckCircle2, ArrowLeft, Target, MessageSquareText } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { useFormAutosave } from '../hooks/useFormAutosave.js';

const FORM_TYPE = 'altzen-diagnostico-carreira';

const PROFILE_OPTIONS = [
  { id: 'A', label: 'transição para dev' },
  { id: 'B', label: 'júnior consolidando base' },
  { id: 'C', label: 'pleno buscando senioridade' },
  { id: 'D', label: 'outro', isOther: true },
  { id: 'E', label: 'Estagiário, iniciando a carreira' },
  { id: 'F', label: 'Ainda pensando em entrar pra área' },
]

const defaultBasicData = { name: '', city: '', linkedin: '', github: '' };
const defaultProfessionalData = { role: '', bond: '', sector: '', otherRole: '', otherSector: '' };
const defaultStrengths = ['', '', ''];
const defaultFocuses = ['', '', ''];
const defaultCommitment = { current: '', target: '' };

/** Grupos do diagnóstico técnico (escala 1–5 por item). Ordem e textos estáveis = chaves em `techScores`. */
const TECH_DIAGNOSTIC_GROUPS = [
  {
    title: '1) Fundamentos',
    items: [
      'Lógica, decomposição de problemas e noção de complexidade (ex.: ordem de grandeza)',
      'Abstração e organização (funções, módulos, camadas, OOP/procedural conforme o contexto)',
      'Compreensão, instrumentação e depuração de código alheio ou legado',
    ],
  },
  {
    title: '2) Backend',
    items: [
      'APIs (HTTP/REST ou equivalente), contratos, códigos de status e desenho de recursos',
      'Autenticação, autorização, validação de entrada e boas práticas de dados sensíveis',
      'Falhas, retentativas, logs e rastreio em serviço (erros, observabilidade, idempotência quando fizer sentido)',
    ],
  },
  {
    title: '3) Banco de dados',
    items: [
      'Modelagem relacional: entidades, chaves, relacionamentos e regras de integridade',
      'SQL (ou equivalente declarativo): consultas, filtros, junções e agregações',
      'Transações, consistência, e leitura eficiente (índices, plano de consulta) em situações reais',
    ],
  },
  {
    title: '4) Front-end (se aplicável)',
    items: [
      'Estrutura de documento, estilos e layout acessíveis e responsivos (base Web)',
      'Linguagem e runtime no cliente: módulos, assincronia, manipulação de DOM/estado',
      'Composição de interface: componentes, fluxo de dados, roteamento (independente de framework)',
    ],
  },
  {
    title: '5) Qualidade',
    items: [
      'Testes automatizados (unidade, integração) e pirâmide/estratégia de teste',
      'Teste exploratório, critérios de aceite, regressão e evidências de defeito',
      'Análise estática, cobertura e “portões” de qualidade no repositório/pipeline',
    ],
  },
  {
    title: '6) Entrega/DevOps',
    items: [
      'Controle de versão e colaboração (branches, integração, revisão de mudança)',
      'CI/CD: compilar, testar, publicar e promover entre ambientes de forma repetível',
      'Empacotamento, contêineres, configuração por ambiente e implantação/operar com segurança básica',
    ],
  },
  {
    title: '7) Agilidade, fluxo e operação',
    items: [
      'Histórias, critérios de aceite, DoR/DoD e refinamento de backlog',
      'Quadro Kanban ou Scrum (fluxo, priorização, WIP quando aplicável)',
      'Estimativas e planejamento de iteração (capacidade, dependências, riscos)',
      'Métricas de fluxo ou de entrega (throughput, lead time, velocity) para melhorar o trabalho',
      'Colaboração produto–engenharia (discovery, quebra de épicos, alinhamento de valor)',
    ],
  },
  {
    title: '8) IA no desenvolvimento',
    items: [
      'Assistentes de código (Copilot, Cursor, etc.) no dia a dia',
      'Engenharia de prompt para tarefas técnicas (debug, refatoração, documentação)',
      'Revisão crítica de código ou saídas de IA (testes, segurança, licenças, exatidão)',
      'Automação com IA no pipeline (CI, revisão assistida, análise estática)',
      'APIs de modelos, RAG ou agentes integrados ao produto (quando aplicável)',
    ],
  },
];

function countDiagnosticGroupItems(groups) {
  return groups.reduce((n, g) => n + g.items.length, 0);
}

const TECH_DIAGNOSTIC_ITEM_COUNT = countDiagnosticGroupItems(TECH_DIAGNOSTIC_GROUPS);
const TECH_DIAGNOSTIC_MAX_SCORE = TECH_DIAGNOSTIC_ITEM_COUNT * 5;

/** Grupos Carreira e Comportamento (escala 1–5; chaves em `careerScores`). */
const CAREER_DIAGNOSTIC_GROUPS = [
  {
    title: '1) Vivência real (entrega, negócio e contexto)',
    items: [
      'Entrego mudanças a ambientes reais (produção, homologação com usuário ou clientes) com cuidado e previsibilidade',
      'Explico para negócio/produto o que muda para o usuário, o risco da mudança e o critério de sucesso',
      'Navego em legado, integrações e restrições do mundo real sem perder o foco do que importa agora',
      'Acompanho pós-entrega (erros, suporte, métricas, feedback) e ajusto quando o resultado não é o esperado',
      'Negocio prazo e escopo alinhado a prioridade, dependências e riscos visíveis para o time (evito “surpresa de última hora”)',
    ],
  },
  {
    title: '2) Trabalho em time (comunicação e colaboração)',
    items: [
      'Comunico bloqueios, incertezas e progresso com clareza, contexto suficiente e no timing certo',
      'Participo de ritos e alinhamentos de forma ativa (não só presença física ou no calendário)',
      'Dou e recebo code review de modo objetivo, respeitoso e focado em aprender e elevar a qualidade',
      'Interajo com produto, suporte, QA ou outras áreas com informação acionável, em linguagem acessível',
      'Contribuo para desbloquear o time: dependências, dúvidas, documentação mínima para o próximo passo',
    ],
  },
  {
    title: '3) Postura profissional (dono, melhoria e transparência)',
    items: [
      'Assumo de ponta a ponta o que me comprometo a entregar, incluindo acompanhamento pós-entrega quando aplicável',
      'Proponho melhorias (técnica, processo, UX interna) com impacto, trade-offs e alternativas, não só reclamação',
      'Registro contexto, decisões e status de forma que outra pessoa consiga retomar o trabalho sem adivinhar',
      'Reconheço erros, limitações e lacunas; corrijo rota e comunico o que muda, inclusive o que ainda estou aprendendo',
      'Equilibro autonomia e alinhamento: avanço sozinho(a) quando o risco é baixo; escalo quando o impacto é alto',
    ],
  },
  {
    title: '4) Evolução contínua (aprendizado, constância e carreira)',
    items: [
      'Mantenho rotina consciente de aprendizado ou prática (mesmo modesta) além só do “ticket do dia”',
      'Concluo iniciativas que inicio (curso, refactor, branch, experimento) ou replanejo/encerro de forma explícita',
      'Reviso periodicamente metas e plano de carreira (próximos passos, prazos, competências a desenvolver)',
      'Peço feedback, interpreto com maturidade e ajusto comportamento, comunicação e forma de entregar',
      'Cuido de ritmo, energia e saúde para manter constância, rejeito normalizar exaustão como padrão de sucesso',
    ],
  },
];

const CAREER_DIAGNOSTIC_ITEM_COUNT = countDiagnosticGroupItems(CAREER_DIAGNOSTIC_GROUPS);
const CAREER_DIAGNOSTIC_MAX_SCORE = CAREER_DIAGNOSTIC_ITEM_COUNT * 5;

/** Aproveitamento em relação ao teto: pontos / (N itens × 5). Itens em branco contam 0. */
function pctOfMax(partialSum, maxScore) {
  if (maxScore <= 0) return 0
  return Math.min(100, (partialSum / maxScore) * 100)
}

/**
 * Mapeia % do máximo possível em rótulo de nível 0–5 alinhado à escala das perguntas (faixas de ~20%).
 */
function strategicBandFromPct(pct) {
  if (pct < 1e-6) {
    return {
      level: 0,
      name: '—',
      hint: 'Preencha as perguntas (notas 1 a 5) do bloco acima.',
    }
  }
  if (pct >= 100) {
    return {
      level: 5,
      name: 'Muito alto no geral',
      hint: 'Pense em aprofundar, manter padrão e ajudar o time.',
    }
  }
  const bands = [
    { level: 1, name: 'Começando', hint: 'Ainda dá para crescer bastante neste bloco.' },
    { level: 2, name: 'No caminho', hint: 'Tem base; vale focar e praticar de forma intencional.' },
    { level: 3, name: 'No meio do caminho', hint: 'Bom equilíbrio. Escolha 1–2 temas para aprofundar.' },
    { level: 4, name: 'Bem resolvido', hint: 'Só ajustes finos e bons exemplos pro time.' },
  ]
  const bucket = Math.min(4, Math.floor(pct / 20))
  if (bucket >= 4) {
    return { level: 5, name: 'Muito forte aqui', hint: 'Aprofunde e seja referência pro time.' }
  }
  return { level: bands[bucket].level, name: bands[bucket].name, hint: bands[bucket].hint }
}

/** Agrega notas por grupo, totais e média 1–5 nas questões respondidas. */
function aggregateGroupScores(diagnosticGroups, scoreMap) {
  const byGroup = []
  let sum = 0
  let answered = 0
  for (const g of diagnosticGroups) {
    let gSum = 0
    let gCount = 0
    for (const item of g.items) {
      const v = scoreMap[item]
      if (v == null || v === '') continue
      const n = Number(v)
      if (!Number.isFinite(n)) continue
      gSum += n
      gCount += 1
    }
    sum += gSum
    answered += gCount
    byGroup.push({
      title: g.title,
      shortTitle: g.title.split(')')[0] ? g.title.split(')')[0] + ')' : g.title,
      sum: gSum,
      count: gCount,
      avg: gCount > 0 ? gSum / gCount : null,
    })
  }
  const totalItems = countDiagnosticGroupItems(diagnosticGroups)
  const avgOnAnswered = answered > 0 ? sum / answered : null
  return { byGroup, sum, answered, totalItems, avgOnAnswered, maxScore: totalItems * 5 }
}

function buildMomentSummary(tech, career, bandTech, bandCareer) {
  if (tech.answered === 0 && career.answered === 0) {
    return [
      'Nenhuma nota 1 a 5 ainda. Preencha o Diagnóstico técnico e Carreira e comportamento para ver o resumo aqui.',
    ]
  }

  const out = []
  const fmt = (x) => (x != null ? x.toFixed(1).replace('.', ',') : '—')
  const techG = tech.byGroup.filter((g) => g.count > 0 && g.avg != null)
  const carG = career.byGroup.filter((g) => g.count > 0 && g.avg != null)

  const tMin = techG.length ? techG.reduce((a, g) => (a.avg < g.avg ? a : g), techG[0]) : null
  const tMax = techG.length ? techG.reduce((a, g) => (a.avg > g.avg ? a : g), techG[0]) : null
  const cMin = carG.length ? carG.reduce((a, g) => (a.avg < g.avg ? a : g), carG[0]) : null
  const cMax = carG.length ? carG.reduce((a, g) => (a.avg > g.avg ? a : g), carG[0]) : null

  if (tech.answered > 0) {
    const incomplete =
      tech.answered < tech.totalItems
        ? ' Essa média é só com o que você já respondeu; ainda dá para preencher o restante do bloco.'
        : ''
    out.push(
      `No bloco de diagnóstico técnico, a média ficou em ${fmt(tech.avgOnAnswered)} (de 1 a 5).${incomplete} Dá cerca de ${tech.pctToMax.toFixed(0)}% do teto, o que, numa leitura geral, cai no nível ${bandTech.level} (${bandTech.name.toLowerCase()}).`
    )
  }
  if (career.answered > 0) {
    const incomplete =
      career.answered < career.totalItems
        ? ' Atenção: essa média é só o que você já respondeu; ainda dá para preencher o restante do bloco.'
        : ''
    out.push(
      `No bloco de carreira e comportamento, a média ficou em ${fmt(career.avgOnAnswered)} (de 1 a 5).${incomplete} Isso representa cerca de ${career.pctToMax.toFixed(0)}% do teto, com leitura geral no nível ${bandCareer.level} (${bandCareer.name.toLowerCase()}).`
    )
  }

  if (tech.avgOnAnswered != null && career.avgOnAnswered != null) {
    const d = tech.avgOnAnswered - career.avgOnAnswered
    if (d > 0.4) {
      out.push(
        'Pelo que você respondeu, o técnico está um pouco à frente do de carreira. Que tal investir de propósito em alinhamento, conversa e fechar ciclo, sem abrir mão de treinar a base que já puxa bem?'
      )
    } else if (d < -0.4) {
      out.push(
        'Pelo que você respondeu, o de carreira (time, entrega) está um pouco à frente do técnico. Vale aproveitar essa força e, no técnico, atacar de um a dois assuntos de cada vez, em vez de muita coisa ao mesmo tempo.'
      )
    } else {
      out.push(
        'As duas médias estão perto uma da outra. Dá para ir afinando o técnico e a carreira aos pouquinhos, sem pular etapa.'
      )
    }
  }

  if (tMin && tMax && tMin.title !== tMax.title) {
    out.push(
      `Dentro do bloco técnico, a média mais baixa apareceu em “${tMin.title}” e a mais alta em “${tMax.title}”, dá para usar isso no que estudar em seguida ou com quem pedir apoio.`
    )
  } else if (tMax) {
    out.push(`Dentro do bloco técnico, o destaque fica com “${tMax.title}”.`)
  }

  if (cMin && cMax && cMin.title !== cMax.title) {
    out.push(
      `Na carreira, quem puxa menos a média hoje seria “${cMin.title}” e o que puxa mais, “${cMax.title}”.`
    )
  } else if (cMax) {
    out.push(
      `No bloco de carreira, a média mais alta ficou com “${cMax.title}”,vale manter o que tem funcionado aí.`
    )
  }

  out.push(
    'Esse resumo mostra o que você marcou agora, não nota de prova. Fale com o mentor, aproveite os três focos e a frase de compromisso para bater o próximo passo.'
  )
  return out
}

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
    profileOther: raw.profileOther != null ? String(raw.profileOther) : '',
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
  const toast = useToast();
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
  const [archiveLoadFailed, setArchiveLoadFailed] = useState(false);

  // Contexto Atual
  const [basicData, setBasicData] = useState({ ...defaultBasicData });
  const [professionalData, setProfessionalData] = useState({ ...defaultProfessionalData });
  const [goals, setGoals] = useState([]);

  // Diagnóstico Técnico — itens em TECH_DIAGNOSTIC_GROUPS
  const [techScores, setTechScores] = useState({});

  // Carreira e Comportamento — itens em CAREER_DIAGNOSTIC_GROUPS
  const [careerScores, setCareerScores] = useState({});

  // Resultados
  const [profile, setProfile] = useState('');
  const [profileOther, setProfileOther] = useState('');
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
      profileOther,
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
      profileOther,
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
    setProfileOther(typeof data.profileOther === 'string' ? data.profileOther : '');
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
    userProfile?.role,
    userProfile?.portal_diagnostico_enabled,
    toast,
  ]);

  // Cálculo de totais (técnico: só itens atuais do formulário, para bater com o denominador)
  const techTotal = useMemo(() => {
    let acc = 0;
    for (const g of TECH_DIAGNOSTIC_GROUPS) {
      for (const item of g.items) {
        const v = techScores[item];
        if (v == null || v === '') continue;
        const n = Number(v);
        acc += Number.isFinite(n) ? n : 0;
      }
    }
    return acc;
  }, [techScores]);
  const careerTotal = useMemo(() => {
    let acc = 0;
    for (const g of CAREER_DIAGNOSTIC_GROUPS) {
      for (const item of g.items) {
        const v = careerScores[item];
        if (v == null || v === '') continue;
        const n = Number(v);
        acc += Number.isFinite(n) ? n : 0;
      }
    }
    return acc;
  }, [careerScores]);

  const diagnosticStrategic = useMemo(() => {
    const techAgg = aggregateGroupScores(TECH_DIAGNOSTIC_GROUPS, techScores)
    const careerAgg = aggregateGroupScores(CAREER_DIAGNOSTIC_GROUPS, careerScores)
    const techPct = pctOfMax(techAgg.sum, TECH_DIAGNOSTIC_MAX_SCORE)
    const careerPct = pctOfMax(careerAgg.sum, CAREER_DIAGNOSTIC_MAX_SCORE)
    const bandTech = strategicBandFromPct(techPct)
    const bandCareer = strategicBandFromPct(careerPct)
    const combinedSum = techAgg.sum + careerAgg.sum
    const combinedMax = TECH_DIAGNOSTIC_MAX_SCORE + CAREER_DIAGNOSTIC_MAX_SCORE
    const combinedPct = pctOfMax(combinedSum, combinedMax)
    const combinedBand = strategicBandFromPct(combinedPct)
    const momentParagraphs = buildMomentSummary(
      { ...techAgg, pctToMax: techPct },
      { ...careerAgg, pctToMax: careerPct },
      bandTech,
      bandCareer
    )
    return {
      tech: { ...techAgg, pctToMax: techPct, band: bandTech },
      career: { ...careerAgg, pctToMax: careerPct, band: bandCareer },
      combined: {
        sum: combinedSum,
        max: combinedMax,
        pct: combinedPct,
        band: combinedBand,
        answered: techAgg.answered + careerAgg.answered,
        totalItems: techAgg.totalItems + careerAgg.totalItems,
      },
      momentParagraphs,
    }
  }, [techScores, careerScores])

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
    <div className="w-full min-w-0 font-sans text-slate-800 print:bg-white">
      <div className="mx-auto min-w-0 max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl print:rounded-none print:shadow-none">
        
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

        <div className="min-w-0 space-y-10 p-8 print:space-y-6 print:p-0 print:pt-4">
          {archiveMode && !archiveLoadFailed && hydrated && (
            <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-950 print:hidden">
              <p>
                {isAdminForm ? (
                  <>
                    Este é o registro salvo quando o ciclo passou a <strong>concluída</strong> ou{' '}
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
                  {['Migrar de outra função para Dev', 'Sair de Júnior para Pleno', 'Sair de Pleno para Sênior', 'Conseguir primeira vaga', 'Mudar de empresa', 'Empreender'].map(opt => (
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

            <p className="mb-4 text-sm text-gray-600 print:text-xs">
              Os blocos <strong>Agilidade, fluxo e operação</strong> e <strong>IA no desenvolvimento</strong> usam a mesma
              escala 1–5: prática real no trabalho (não só teoria).
            </p>

            <div className="space-y-6">
              {TECH_DIAGNOSTIC_GROUPS.map((group) => (
                <div key={group.title} className="bg-white border rounded-xl p-5 shadow-sm print:shadow-none print:p-0 print:border-none print:mb-4">
                  <h4 className="text-lg font-bold text-blue-900 border-b pb-2 mb-4 print:text-base print:border-gray-300 print:mb-1">{group.title}</h4>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <ScoreRow key={item} label={item} stateKey={item} type="tech" />
                    ))}
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

            <p className="mb-4 text-sm text-gray-600 print:text-xs">
              Cada pergunta descreve <strong>comportamento no trabalho</strong>. Use a escala: 1 = isso quase
              nunca acontece comigo; 3 = acontece de forma irregular ou preciso de apoio; 5 = é recorrente e
              com qualidade. Seja honesto(a): a meta é clareza para o seu plano de evolução, não nota de
              desempenho para o currículo.
            </p>

            <div className="space-y-6">
              {CAREER_DIAGNOSTIC_GROUPS.map((group) => (
                <div key={group.title} className="bg-white border rounded-xl p-5 shadow-sm print:shadow-none print:p-0 print:border-none print:mb-4">
                  <h4 className="text-lg font-bold text-blue-900 border-b pb-2 mb-4 print:text-base print:border-gray-300 print:mb-1">{group.title}</h4>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <ScoreRow key={item} label={item} stateKey={item} type="career" />
                    ))}
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
              <div className="space-y-6">
                <h4 className="text-lg font-bold text-gray-700 border-l-4 border-blue-500 pl-3">
                  1) Pontuação (opcional)
                </h4>

                {/* Análise estratégica */}
                <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-5 shadow-sm print:border-gray-300 print:bg-white print:shadow-none">
                  <h5 className="mb-1 flex items-center gap-2 text-base font-bold text-indigo-950 print:text-sm">
                    <Target className="h-5 w-5 shrink-0 text-indigo-600" aria-hidden />
                    Análise estratégica
                  </h5>
                  <p className="mb-4 text-sm text-slate-600 print:text-xs">
                    <strong>Percentual:</strong> seus pontos no bloco ÷ teto do bloco (não preenchido conta 0).{' '}
                    <strong>Média (1 a 5):</strong> só o que você já respondeu. <strong>Nível:</strong> leitura
                    geral a partir do percentual.
                  </p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {['tech', 'career'].map((axis) => {
                      const pack = axis === 'tech' ? diagnosticStrategic.tech : diagnosticStrategic.career
                      const label = axis === 'tech' ? 'Diagnóstico técnico' : 'Carreira e comportamento'
                      const maxS = axis === 'tech' ? TECH_DIAGNOSTIC_MAX_SCORE : CAREER_DIAGNOSTIC_MAX_SCORE
                      return (
                        <div
                          key={axis}
                          className="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm print:border-gray-300"
                        >
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                          <p className="mt-1 text-2xl font-extrabold text-indigo-700 print:text-xl">
                            {pack.sum} <span className="text-lg font-medium text-slate-400">/ {maxS}</span>
                            <span className="ml-2 text-sm font-normal text-slate-500"> ({pack.pctToMax.toFixed(0)}%)</span>
                          </p>
                          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-indigo-500 transition-[width] print:bg-indigo-800"
                              style={{ width: `${Math.min(100, pack.pctToMax)}%` }}
                            />
                          </div>
                          <p className="mt-2 text-sm text-slate-700 print:text-xs">
                            <span className="font-semibold text-slate-900">Nível geral:</span>{' '}
                            {pack.band.level === 0
                              ? 'preencha o bloco (notas 1 a 5) acima.'
                              : `nível ${pack.band.level} — ${pack.band.name}`}
                          </p>
                          {pack.band.level !== 0 && (
                            <p className="mt-1 text-xs text-slate-500 print:text-[0.7rem]">{pack.band.hint}</p>
                          )}
                          <p className="mt-2 text-xs text-slate-500 print:text-[0.7rem]">
                            Média: {pack.avgOnAnswered != null ? pack.avgOnAnswered.toFixed(1).replace('.', ',') : '—'} (1
                            a 5) &middot; {pack.answered} de {pack.totalItems} itens
                          </p>
                        </div>
                      )
                    })}
                  </div>
                  {diagnosticStrategic.combined.answered > 0 && (
                    <div className="mt-4 rounded-xl border border-slate-200/90 bg-slate-50/90 p-4 print:border-gray-300 print:bg-slate-50">
                      <p className="text-sm font-semibold text-slate-800 print:text-xs">Técnico + carreira (junto)</p>
                      <p className="text-base text-slate-700 print:text-sm">
                        {diagnosticStrategic.combined.sum} / {diagnosticStrategic.combined.max} (
                        {diagnosticStrategic.combined.pct.toFixed(0)}%) · {diagnosticStrategic.combined.answered} de{' '}
                        {diagnosticStrategic.combined.totalItems} itens com nota
                        {diagnosticStrategic.combined.band.level !== 0 && (
                          <> · Nível geral: {diagnosticStrategic.combined.band.level} ({diagnosticStrategic.combined.band.name})</>
                        )}
                        .
                      </p>
                    </div>
                  )}
                </div>

                {/* Resumo do momento (texto) */}
                <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-b from-slate-50/90 to-white p-5 print:border-gray-300 print:shadow-none">
                  <h5 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900 print:text-sm">
                    <MessageSquareText className="h-5 w-5 shrink-0 text-blue-600" aria-hidden />
                    Resumo
                  </h5>
                  <div className="space-y-3 text-sm leading-relaxed text-slate-700 print:text-xs">
                    {diagnosticStrategic.momentParagraphs.map((p, i) => (
                      <p key={i} className="[&:not(:last-child)]:mb-0">
                        {p}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Totais compactos (referência rápida) */}
                <div>
                  <h5 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 print:text-xs">
                    Totais
                  </h5>
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="flex flex-1 items-center justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm print:border-gray-300 print:p-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Total Técnico</p>
                        <p className="mt-1 text-xs text-gray-400">({TECH_DIAGNOSTIC_ITEM_COUNT} itens)</p>
                      </div>
                      <div className="text-right">
                        <span className="text-4xl font-extrabold text-blue-600">{techTotal}</span>
                        <span className="text-xl font-medium text-gray-400"> / {TECH_DIAGNOSTIC_MAX_SCORE}</span>
                      </div>
                    </div>
                    <div className="flex flex-1 items-center justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm print:border-gray-300 print:p-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Total Carreira</p>
                        <p className="mt-1 text-xs text-gray-400">({CAREER_DIAGNOSTIC_ITEM_COUNT} itens)</p>
                      </div>
                      <div className="text-right">
                        <span className="text-4xl font-extrabold text-blue-600">{careerTotal}</span>
                        <span className="text-xl font-medium text-gray-400"> / {CAREER_DIAGNOSTIC_MAX_SCORE}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Perfil Atual */}
              <div>
                <h4 className="text-lg font-bold text-gray-700 mb-4 border-l-4 border-blue-500 pl-3">2) Perfil atual (marcar o mais aderente)</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {PROFILE_OPTIONS.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center p-4 border rounded-xl cursor-pointer transition print:p-2 print:border-gray-300 ${
                        profile === opt.id
                          ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-500 ring-opacity-50 print:bg-transparent print:ring-0 print:border-black'
                          : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="profile"
                        value={opt.id}
                        checked={profile === opt.id}
                        onChange={() => setProfile(opt.id)}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 print:h-4 print:w-4"
                      />
                      <span className="ml-3 font-medium text-gray-700 print:text-sm">
                        Perfil {opt.id}: {opt.isOther ? 'outro' : opt.label}
                        {opt.isOther && (
                          <span className="ml-1 font-normal text-slate-500 print:text-xs"> (especifique abaixo)</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
                {profile === 'D' && (
                  <div className="mt-3 rounded-xl border border-blue-200/80 bg-blue-50/40 p-4 print:border-gray-300 print:bg-white">
                    <label htmlFor="diagnostico-profile-outro" className="mb-1 block text-sm font-medium text-gray-700">
                      Qual seria, no seu caso? (aberto)
                    </label>
                    <input
                      id="diagnostico-profile-outro"
                      type="text"
                      value={profileOther}
                      onChange={(e) => setProfileOther(e.target.value)}
                      placeholder="Ex.: saindo de outra carreira, migrando de stack, outro contexto…"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 print:border-gray-400"
                    />
                  </div>
                )}
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