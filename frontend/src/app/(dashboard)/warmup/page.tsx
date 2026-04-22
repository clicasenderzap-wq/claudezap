'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Flame, Power, MessageSquare, Calendar, Clock, Zap, ArrowRight, Info, CheckSquare, Square, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const fmt = (h: number) => `${String(h).padStart(2, '0')}:00`;

export default function WarmupPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['warmup'],
    queryFn: () => api.get('/warmup').then((r) => r.data),
    refetchInterval: 10000,
  });

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['warmup-stats'],
    queryFn: () => api.get('/warmup/stats').then((r) => r.data),
    refetchInterval: 15000,
  });

  const [form, setForm] = useState<{
    messages_per_day: number;
    start_hour: number;
    end_hour: number;
    night_enabled?: boolean;
    night_start_hour?: number;
    night_end_hour?: number;
    night_messages_per_day?: number;
  } | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);

  const config = data?.config;
  const accounts: { id: string; label: string; phone: string }[] = data?.accounts ?? [];
  const liveForm = form ?? {
    messages_per_day: config?.messages_per_day ?? 20,
    start_hour: config?.start_hour ?? 8,
    end_hour: config?.end_hour ?? 22,
    night_enabled: config?.night_enabled ?? false,
    night_start_hour: config?.night_start_hour ?? 23,
    night_end_hour: config?.night_end_hour ?? 7,
    night_messages_per_day: config?.night_messages_per_day ?? 30,
  };

  // Initialize selectedIds from config once loaded
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

  function toggleEnabled() {
    const next = !config?.enabled;
    updateMutation.mutate({ enabled: next });
    toast.success(next ? 'Aquecimento ativado!' : 'Aquecimento pausado');
  }

  function saveSettings() {
    updateMutation.mutate(liveForm);
    setForm(null);
    toast.success('Configurações salvas!');
  }

  const connectedCount = accounts.length;
  const participatingCount = (liveSelectedIds as string[]).length || connectedCount;
  const isEnabled = config?.enabled ?? false;
  const activeHours = Math.max(1, liveForm.end_hour - liveForm.start_hour);
  const msgPerHour = (liveForm.messages_per_day / activeHours).toFixed(1);
  const nightActiveHours = (() => {
    const ns = liveForm.night_start_hour ?? 23;
    const ne = liveForm.night_end_hour ?? 7;
    return ns > ne ? (24 - ns + ne) : Math.max(1, ne - ns);
  })();
  const nightMsgPerHour = ((liveForm.night_messages_per_day ?? 30) / nightActiveHours).toFixed(1);
  const totalDailyQuota = liveForm.messages_per_day + (liveForm.night_enabled ? (liveForm.night_messages_per_day ?? 30) : 0);

  // Nível de aquecimento baseado em mensagens da semana
  const weekTotal = stats?.week ?? 0;
  const warmthLevel = Math.min(100, Math.round((weekTotal / 140) * 100)); // 140 = 20/dia × 7 dias
  const warmthLabel = warmthLevel < 20 ? 'Frio' : warmthLevel < 50 ? 'Morno' : warmthLevel < 80 ? 'Quente' : 'Aquecido';
  const warmthColor = warmthLevel < 20 ? 'bg-blue-400' : warmthLevel < 50 ? 'bg-yellow-400' : warmthLevel < 80 ? 'bg-orange-400' : 'bg-red-500';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Aquecimento de Números</h1>
        <p className="text-sm text-gray-500 mt-0.5">Troca mensagens automáticas entre seus números para maturar as contas e reduzir risco de banimento</p>
      </div>

      {/* Aviso se menos de 2 contas */}
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

          {/* Nível de aquecimento */}
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Nível de aquecimento (7 dias)</span>
              <span className="font-semibold text-gray-700">{warmthLabel} — {warmthLevel}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div className={`h-3 rounded-full transition-all duration-700 ${warmthColor}`} style={{ width: `${warmthLevel}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{weekTotal} mensagens nos últimos 7 dias</p>
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
              Enviando ~{msgPerHour} mensagens/hora entre {fmt(liveForm.start_hour)} e {fmt(liveForm.end_hour)}
            </div>
          )}
        </div>

        {/* Configurações */}
        <div className="lg:col-span-2 card p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Configurações</h2>

          <div>
            <label className="label flex items-center gap-1.5">
              <MessageSquare size={13} /> Mensagens por dia
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range" min={5} max={100} step={5}
                value={liveForm.messages_per_day}
                onChange={(e) => setForm({ ...liveForm, messages_per_day: Number(e.target.value) })}
                className="flex-1 accent-brand-600"
              />
              <span className="w-12 text-center font-semibold text-gray-800">{liveForm.messages_per_day}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Recomendado: 15–30/dia no início, aumente gradualmente. Máximo: 100/dia.
            </p>
          </div>

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
                          // First click: select only this one
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

          {/* Preview do plano */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-2">
            <p className="font-medium text-gray-700">Resumo do plano</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Por hora', value: msgPerHour },
                { label: 'Por dia', value: liveForm.messages_per_day },
                { label: 'Por semana', value: liveForm.messages_per_day * 7 },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-lg p-2 border border-gray-100">
                  <p className="text-xl font-bold text-brand-600">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {form && (
            <button onClick={saveSettings} className="btn-primary w-full">
              Salvar configurações
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
              <p className="text-xs text-gray-500">Funciona em paralelo ao aquecimento diurno, com cota própria</p>
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
            <div>
              <label className="label flex items-center gap-1.5">
                <MessageSquare size={13} /> Mensagens por noite
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range" min={5} max={100} step={5}
                  value={liveForm.night_messages_per_day ?? 30}
                  onChange={(e) => setForm({ ...liveForm, night_messages_per_day: Number(e.target.value) })}
                  className="flex-1 accent-indigo-500"
                />
                <span className="w-12 text-center font-semibold text-gray-800">{liveForm.night_messages_per_day ?? 30}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                ~{nightMsgPerHour} mensagens/hora durante o período noturno. Total diário combinado: <strong>{totalDailyQuota}</strong>/dia.
              </p>
            </div>

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
              <button onClick={saveSettings} className="btn-primary w-full">
                Salvar configurações noturnas
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats do dia */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Hoje', value: stats?.today ?? 0, icon: <Zap size={16} />, color: 'text-orange-500 bg-orange-100' },
          { label: 'Esta semana', value: stats?.week ?? 0, icon: <Calendar size={16} />, color: 'text-brand-600 bg-brand-100' },
          { label: `Cota diária${liveForm.night_enabled ? ' (dia+noite)' : ''}`, value: totalDailyQuota, icon: <MessageSquare size={16} />, color: 'text-indigo-600 bg-indigo-100' },
          { label: 'Nível de aquecimento', value: `${warmthLevel}%`, icon: <Flame size={16} />, color: `${warmthLevel > 50 ? 'text-orange-600 bg-orange-100' : 'text-blue-600 bg-blue-100'}` },
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

      {/* Dicas */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Como funciona o aquecimento</h3>
        <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-600">
          {[
            'Os números conectados enviam mensagens naturais entre si, simulando conversas reais.',
            'Cada mensagem tem uma resposta automática após 15–90 segundos, criando histórico de conversa bidirecional.',
            'Os envios acontecem em horários aleatórios dentro da janela configurada para não parecer automatizado.',
            'Comece com 10–20 mensagens/dia e aumente gradualmente a cada semana.',
            'Números com histórico de conversas têm menor risco de serem marcados como spam pelo WhatsApp.',
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
