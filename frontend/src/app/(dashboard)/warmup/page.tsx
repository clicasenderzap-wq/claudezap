'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Flame, Power, Calendar, Clock, Zap, ArrowRight, Info, CheckSquare, Square, Moon, Smartphone, TrendingUp, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface AccountStat {
  id: string;
  label: string;
  phone: string;
  connected: boolean;
  first_activity: string | null;
  days_since_first: number;
  total_messages: number;
  messages_7d: number;
  active_days_30: number;
  score: number;
}

function readinessInfo(score: number) {
  if (score < 20) return {
    label: 'Recente demais',
    sub: 'Continue aquecendo por pelo menos 2 semanas antes de disparar',
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    bar: 'bg-red-400',
    icon: <ShieldAlert size={15} className="text-red-500" />,
  };
  if (score < 45) return {
    label: 'Em aquecimento',
    sub: 'Ainda em processo — evite campanhas grandes',
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
    bar: 'bg-orange-400',
    icon: <Flame size={15} className="text-orange-500" />,
  };
  if (score < 70) return {
    label: 'Pronto para campanhas pequenas',
    sub: 'Pode disparar em lotes menores com delays longos (10s+)',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50 border-yellow-200',
    bar: 'bg-yellow-400',
    icon: <TrendingUp size={15} className="text-yellow-600" />,
  };
  return {
    label: 'Aquecido',
    sub: 'Boa maturidade — use com responsabilidade',
    color: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
    bar: 'bg-green-500',
    icon: <CheckCircle2 size={15} className="text-green-600" />,
  };
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const fmt = (h: number) => `${String(h).padStart(2, '0')}:00`;

export default function WarmupPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['warmup'],
    queryFn: () => api.get('/warmup').then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['warmup-stats'],
    queryFn: () => api.get('/warmup/stats').then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: accountStats, isLoading: loadingAccountStats } = useQuery<AccountStat[]>({
    queryKey: ['warmup-account-stats'],
    queryFn: () => api.get('/warmup/account-stats').then((r) => r.data),
    refetchInterval: 60000,
  });

  const [form, setForm] = useState<{
    start_hour: number;
    end_hour: number;
    night_enabled?: boolean;
    night_start_hour?: number;
    night_end_hour?: number;
  } | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);

  const config = data?.config;
  const accounts: { id: string; label: string; phone: string }[] = data?.accounts ?? [];
  const liveForm = form ?? {
    start_hour: config?.start_hour ?? 8,
    end_hour: config?.end_hour ?? 22,
    night_enabled: config?.night_enabled ?? false,
    night_start_hour: config?.night_start_hour ?? 23,
    night_end_hour: config?.night_end_hour ?? 7,
  };

  const liveSelectedIds = selectedIds ?? (config?.account_ids ?? []);

  function toggleAccount(id: string) {
    const current = liveSelectedIds as string[];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    setSelectedIds(next);
    updateMutation.mutate({ account_ids: next });
  }

  function selectAllAccounts() {
    const all = accounts.map((a) => a.id);
    setSelectedIds(all);
    updateMutation.mutate({ account_ids: all });
  }

  function selectNoAccounts() {
    setSelectedIds([]);
    updateMutation.mutate({ account_ids: [] });
  }

  const updateMutation = useMutation({
    mutationFn: (body: object) => api.put('/warmup', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warmup'] });
      qc.invalidateQueries({ queryKey: ['warmup-stats'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao salvar'),
  });

  const saveMutation = useMutation({
    mutationFn: (body: object) => api.put('/warmup', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warmup'] });
      setForm(null);
      toast.success('Configurações salvas!');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao salvar'),
  });

  function toggleEnabled() {
    const next = !config?.enabled;
    updateMutation.mutate({ enabled: next });
    toast.success(next ? 'Aquecimento ativado!' : 'Aquecimento pausado');
  }

  function saveSettings() {
    saveMutation.mutate(liveForm);
  }

  const connectedCount = accounts.length;
  const isEnabled = config?.enabled ?? false;

  const weekTotal = stats?.week ?? 0;
  // Score médio dos chips (se disponível), senão placeholder
  const avgScore = accountStats?.length
    ? Math.round(accountStats.reduce((s, a) => s + a.score, 0) / accountStats.length)
    : null;
  const warmthColor = avgScore === null ? 'bg-gray-300' : avgScore < 20 ? 'bg-red-400' : avgScore < 45 ? 'bg-orange-400' : avgScore < 70 ? 'bg-yellow-400' : 'bg-green-500';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Aquecimento de Números</h1>
        <p className="text-sm text-gray-500 mt-0.5">Troca mensagens automáticas entre seus números para maturar as contas e reduzir risco de banimento — sem limite diário, funciona continuamente dentro do horário configurado</p>
      </div>

      {connectedCount < 2 && (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>Você precisa ter pelo menos <strong>2 números WhatsApp conectados</strong> para usar o aquecimento. <a href="/whatsapp" className="underline font-medium">Conectar números</a></p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Card principal — ativar/desativar */}
        <div className="lg:col-span-1 card p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isEnabled ? 'bg-orange-100' : 'bg-gray-100'}`}>
              <Flame size={22} className={isEnabled ? 'text-orange-500' : 'text-gray-400'} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Status</p>
              <p className={`text-sm font-medium ${isEnabled ? 'text-orange-500' : 'text-gray-400'}`}>
                {isLoading ? '...' : isEnabled ? 'Ativo' : 'Inativo'}
              </p>
            </div>
          </div>

          {/* Score médio dos chips */}
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Score médio dos números</span>
              <span className="font-semibold text-gray-700">
                {avgScore === null ? '—' : `${avgScore}/100`}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div className={`h-3 rounded-full transition-all duration-700 ${warmthColor}`} style={{ width: `${avgScore ?? 0}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{weekTotal} mensagens nos últimos 7 dias · veja detalhes por chip abaixo</p>
          </div>

          <button
            onClick={toggleEnabled}
            disabled={connectedCount < 2 || updateMutation.isPending}
            className={`btn w-full ${isEnabled ? 'btn-secondary' : 'btn-primary'} ${connectedCount < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Power size={16} />
            {isEnabled ? 'Pausar aquecimento' : 'Ativar aquecimento'}
          </button>

          {isEnabled && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700">
              <Zap size={12} className="inline mr-1" />
              Enviando conversas a cada 4–9 minutos entre {fmt(liveForm.start_hour)} e {fmt(liveForm.end_hour)}
            </div>
          )}
        </div>

        {/* Configurações */}
        <div className="lg:col-span-2 card p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Configurações</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label flex items-center gap-1.5"><Clock size={13} /> Início</label>
              <select
                value={liveForm.start_hour}
                onChange={(e) => setForm({ ...liveForm, start_hour: Number(e.target.value) })}
                className="input"
              >
                {HOURS.filter((h) => h < liveForm.end_hour).map((h) => (
                  <option key={h} value={h}>{fmt(h)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><Clock size={13} /> Fim</label>
              <select
                value={liveForm.end_hour}
                onChange={(e) => setForm({ ...liveForm, end_hour: Number(e.target.value) })}
                className="input"
              >
                {HOURS.filter((h) => h > liveForm.start_hour).map((h) => (
                  <option key={h} value={h}>{fmt(h)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Seleção de números */}
          {accounts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Números participantes</label>
                <div className="flex gap-3 text-xs text-brand-600">
                  <button onClick={selectAllAccounts} className="hover:underline">Todos</button>
                  <button onClick={selectNoAccounts} className="hover:underline">Nenhum</button>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-2">Sem seleção = todos os números conectados participam</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {accounts.map((acc) => {
                  const checked = (liveSelectedIds as string[]).length === 0 || (liveSelectedIds as string[]).includes(acc.id);
                  const explicitly = (liveSelectedIds as string[]).length > 0;
                  return (
                    <button
                      key={acc.id}
                      onClick={() => {
                        if (!explicitly) {
                          const next = [acc.id];
                          setSelectedIds(next);
                          updateMutation.mutate({ account_ids: next });
                        } else {
                          toggleAccount(acc.id);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-colors ${
                        checked
                          ? 'border-brand-300 bg-brand-50 text-brand-700'
                          : 'border-gray-200 bg-white text-gray-500'
                      }`}
                    >
                      {checked ? <CheckSquare size={15} className="shrink-0" /> : <Square size={15} className="shrink-0" />}
                      <span className="font-medium flex-1 text-left">{acc.label}</span>
                      <span className="text-xs text-gray-400">{acc.phone}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {form && (
            <button onClick={saveSettings} disabled={saveMutation.isPending} className="btn-primary w-full">
              {saveMutation.isPending ? 'Salvando...' : 'Salvar configurações'}
            </button>
          )}
        </div>
      </div>

      {/* ── Aquecimento Noturno ─────────────────────────────────── */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${liveForm.night_enabled ? 'bg-indigo-100' : 'bg-gray-100'}`}>
              <Moon size={18} className={liveForm.night_enabled ? 'text-indigo-500' : 'text-gray-400'} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Aquecimento Noturno</p>
              <p className="text-xs text-gray-500">Continua enviando durante a madrugada com o mesmo intervalo natural</p>
            </div>
          </div>
          <button
            onClick={() => {
              const next = { ...liveForm, night_enabled: !liveForm.night_enabled };
              setForm(next);
              updateMutation.mutate({ night_enabled: next.night_enabled });
              toast.success(next.night_enabled ? 'Aquecimento noturno ativado!' : 'Aquecimento noturno desativado');
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${liveForm.night_enabled ? 'bg-indigo-500' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${liveForm.night_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {liveForm.night_enabled && (
          <div className="space-y-5 pt-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-1.5"><Clock size={13} /> Início (noite)</label>
                <select
                  value={liveForm.night_start_hour ?? 23}
                  onChange={(e) => setForm({ ...liveForm, night_start_hour: Number(e.target.value) })}
                  className="input"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{fmt(h)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label flex items-center gap-1.5"><Clock size={13} /> Fim (manhã)</label>
                <select
                  value={liveForm.night_end_hour ?? 7}
                  onChange={(e) => setForm({ ...liveForm, night_end_hour: Number(e.target.value) })}
                  className="input"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{fmt(h)}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
              <Moon size={12} className="inline mr-1" />
              O horário noturno pode cruzar a meia-noite — ex: 23:00 até 07:00. Isso é tratado corretamente pelo sistema.
            </p>

            {form && (
              <button onClick={saveSettings} disabled={saveMutation.isPending} className="btn-primary w-full">
                {saveMutation.isPending ? 'Salvando...' : 'Salvar configurações noturnas'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats do dia */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Hoje', value: stats?.today ?? 0, icon: <Zap size={16} />, color: 'text-orange-500 bg-orange-100' },
          { label: 'Esta semana', value: stats?.week ?? 0, icon: <Calendar size={16} />, color: 'text-brand-600 bg-brand-100' },
          { label: 'Score médio (chips)', value: avgScore !== null ? `${avgScore}/100` : '—', icon: <Flame size={16} />, color: avgScore !== null && avgScore >= 70 ? 'text-green-600 bg-green-100' : avgScore !== null && avgScore >= 45 ? 'text-yellow-600 bg-yellow-100' : 'text-orange-600 bg-orange-100' },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${s.color} mb-2`}>{s.icon}</div>
            <p className="text-2xl font-bold text-gray-900">{loadingStats ? '—' : s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Feed de atividade recente */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Atividade recente</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {loadingStats && <p className="px-5 py-8 text-center text-gray-400 text-sm">Carregando...</p>}
          {!loadingStats && !stats?.recent?.length && (
            <p className="px-5 py-8 text-center text-gray-400 text-sm">
              {isEnabled ? 'Aguardando primeiro ciclo de aquecimento...' : 'Nenhuma atividade ainda. Ative o aquecimento para começar.'}
            </p>
          )}
          {stats?.recent?.map((log: any) => (
            <div key={log.id} className="px-5 py-3 flex items-center gap-3 text-sm">
              <Flame size={14} className="text-orange-400 shrink-0" />
              <span className="font-medium text-gray-800">{log.from_label}</span>
              <ArrowRight size={13} className="text-gray-400 shrink-0" />
              <span className="font-medium text-gray-800">{log.to_label}</span>
              <span className="text-gray-500 flex-1 truncate">"{log.message}"</span>
              <span className="text-xs text-gray-400 shrink-0">{formatDate(log.sent_at)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Nível de aquecimento por chip ─────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
          <Smartphone size={16} className="text-gray-500" />
          <h3 className="font-semibold text-gray-800">Nível de aquecimento por número</h3>
          <span className="ml-auto text-xs text-gray-400">Estimativa baseada em histórico do sistema</span>
        </div>

        {loadingAccountStats && (
          <p className="px-5 py-8 text-center text-gray-400 text-sm">Calculando...</p>
        )}

        {!loadingAccountStats && !accountStats?.length && (
          <p className="px-5 py-8 text-center text-gray-400 text-sm">Nenhum número encontrado.</p>
        )}

        <div className="divide-y divide-gray-100">
          {accountStats?.map((acc) => {
            const info = readinessInfo(acc.score);
            return (
              <div key={acc.id} className={`px-5 py-4 space-y-3 ${!acc.connected ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Smartphone size={15} className="text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{acc.label}</p>
                      <p className="text-xs text-gray-400">{acc.phone}{!acc.connected && ' · desconectado'}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${info.bg} ${info.color} shrink-0`}>
                    {info.icon}
                    {info.label}
                  </div>
                </div>

                {/* Barra de progresso */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Score de aquecimento</span>
                    <span className="font-bold text-gray-700">{acc.score}/100</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-700 ${info.bar}`}
                      style={{ width: `${acc.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{info.sub}</p>
                </div>

                {/* Métricas detalhadas */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    {
                      label: 'Maturidade',
                      value: acc.first_activity ? `${acc.days_since_first}d` : '—',
                      sub: acc.first_activity ? 'desde 1º aquecimento' : 'sem histórico',
                    },
                    {
                      label: 'Consistência',
                      value: `${acc.active_days_30}/30`,
                      sub: 'dias ativos (30d)',
                    },
                    {
                      label: 'Atividade recente',
                      value: acc.messages_7d,
                      sub: 'msgs nos últimos 7d',
                    },
                  ].map((m) => (
                    <div key={m.label} className="bg-gray-50 rounded-lg px-2 py-2">
                      <p className="text-xs text-gray-500 mb-0.5">{m.label}</p>
                      <p className="text-base font-bold text-gray-800">{m.value}</p>
                      <p className="text-[10px] text-gray-400 leading-tight">{m.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400 flex items-start gap-1.5">
            <AlertTriangle size={11} className="mt-0.5 shrink-0 text-gray-400" />
            O score é uma estimativa baseada nos dados do sistema (maturidade 50%, consistência 30%, atividade recente 20%). O WhatsApp não expõe o nível real internamente.
          </p>
        </div>
      </div>

      {/* Dicas */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Como funciona o aquecimento</h3>
        <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-600">
          {[
            'Os números conectados enviam mensagens naturais entre si, simulando conversas reais.',
            'Cada mensagem tem uma resposta automática após 15–90 segundos, criando histórico bidirecional.',
            'Os envios acontecem a cada 4–9 minutos em intervalos aleatórios dentro da janela configurada.',
            'Não há limite diário — o sistema funciona continuamente como um WhatsApp normal.',
            'Números com histórico de conversas têm menor risco de serem marcados como spam.',
            'Use junto com delays longos nas campanhas (5s+) para máxima proteção contra banimentos.',
          ].map((tip, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-brand-600 font-bold shrink-0">·</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
