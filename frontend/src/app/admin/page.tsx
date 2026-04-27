'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, ShieldCheck, Search, Check, X, RefreshCw, ArrowLeft,
  Clock, CheckCircle2, XCircle, Smartphone, WifiOff, Trash2,
  ChevronDown, ChevronRight, TrendingUp, DollarSign,
  Activity, Server, Database, Monitor, Zap, BarChart2, Edit3, Save,
  Mail, Cloud, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  starter_cortesia: 'Básico Cortesia',
  pro_cortesia: 'Pro Cortesia',
  admin: 'Admin',
};
const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo', trial: 'Trial', inactive: 'Inativo', pending: 'Pendente',
};
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-red-100 text-red-600',
  pending: 'bg-purple-100 text-purple-700',
};
const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-700',
  pro: 'bg-brand-100 text-brand-700',
  starter_cortesia: 'bg-teal-100 text-teal-700',
  pro_cortesia: 'bg-violet-100 text-violet-700',
  admin: 'bg-orange-100 text-orange-700',
};
const COURTESY_PLANS = new Set(['starter_cortesia', 'pro_cortesia', 'admin']);
const WA_STATUS_DOT: Record<string, string> = {
  connected: 'bg-green-500',
  connecting: 'bg-yellow-400 animate-pulse',
  disconnected: 'bg-gray-300',
};
const WA_STATUS_BADGE: Record<string, string> = {
  connected: 'bg-green-100 text-green-700',
  connecting: 'bg-yellow-100 text-yellow-700',
  disconnected: 'bg-gray-100 text-gray-500',
};
const WA_STATUS_LABEL: Record<string, string> = {
  connected: 'Conectado',
  connecting: 'Conectando',
  disconnected: 'Desconectado',
};

type Tab = 'overview' | 'users' | 'prices' | 'infra';

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ stats, pendingUsers, approveMutation, rejectMutation }: {
  stats: any;
  pendingUsers: any[];
  approveMutation: any;
  rejectMutation: any;
}) {
  const [revPeriod, setRevPeriod] = useState<'month' | 'quarter' | 'year' | 'all'>('month');
  const { data: rev, isLoading: revLoading } = useQuery({
    queryKey: ['admin-revenue', revPeriod],
    queryFn: () => api.get('/admin/revenue', { params: { period: revPeriod } }).then((r) => r.data),
  });

  const periodLabel: Record<string, string> = {
    month: 'Este mês',
    quarter: 'Este trimestre',
    year: 'Este ano',
    all: 'Todos os tempos',
  };

  const maxSignups = rev?.monthly_signups
    ? Math.max(1, ...rev.monthly_signups.map((m: any) => m.count))
    : 1;

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-700' },
            { label: 'Ativos', value: stats.active, color: 'text-green-600' },
            { label: 'Trial', value: stats.trial, color: 'text-yellow-600' },
            { label: 'Inativos', value: stats.inactive, color: 'text-red-500' },
            { label: 'Trial expirado', value: stats.trial_expired, color: 'text-orange-500' },
            { label: 'Novos (mês)', value: stats.new_this_month, color: 'text-brand-600' },
            {
              label: 'Pendentes',
              value: stats.pending,
              color: 'text-purple-600',
              ring: (stats.pending ?? 0) > 0,
            },
          ].map((s: any) => (
            <div
              key={s.label}
              className={`bg-white rounded-xl border p-4 text-center ${s.ring ? 'border-purple-400 ring-2 ring-purple-200' : 'border-gray-200'}`}
            >
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Plan breakdown */}
      {stats?.by_plan && (
        <div className="space-y-2">
          <div className="flex gap-3 flex-wrap items-center">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pagantes:</span>
            {Object.entries(stats.by_plan)
              .filter(([plan]) => !COURTESY_PLANS.has(plan))
              .map(([plan, count]: any) => (
                <div key={plan} className="bg-white rounded-xl border border-gray-200 px-4 py-2 flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[plan] ?? 'bg-gray-100 text-gray-700'}`}>
                    {PLAN_LABELS[plan] ?? plan}
                  </span>
                  <span className="text-sm font-bold text-gray-800">{count} usuários</span>
                </div>
              ))}
          </div>
          {Object.entries(stats.by_plan).some(([plan]) => COURTESY_PLANS.has(plan)) && (
            <div className="flex gap-3 flex-wrap items-center">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cortesia (R$0):</span>
              {Object.entries(stats.by_plan)
                .filter(([plan]) => COURTESY_PLANS.has(plan))
                .map(([plan, count]: any) => (
                  <div key={plan} className="bg-white rounded-xl border border-dashed border-teal-300 px-4 py-2 flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[plan]}`}>
                      {PLAN_LABELS[plan] ?? plan}
                    </span>
                    <span className="text-sm font-bold text-gray-800">{count} usuários</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Revenue section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg"><DollarSign size={16} className="text-green-600" /></div>
            <div>
              <h2 className="font-bold text-gray-800">Receita</h2>
              <p className="text-xs text-gray-400">Baseada em usuários ativos pagantes</p>
            </div>
          </div>
          <div className="flex gap-1">
            {(['month', 'quarter', 'year', 'all'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setRevPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  revPeriod === p ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {periodLabel[p]}
              </button>
            ))}
          </div>
        </div>

        {revLoading ? (
          <p className="text-center py-8 text-gray-400 text-sm">Carregando...</p>
        ) : rev ? (
          <div className="space-y-5">
            {/* MRR card */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-xs text-green-600 font-semibold uppercase tracking-wider mb-1">MRR (Receita mensal)</p>
                <p className="text-3xl font-black text-green-700">
                  R$ {parseFloat(rev.mrr).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">
                  Novos usuários ({periodLabel[revPeriod]})
                </p>
                <p className="text-3xl font-black text-blue-700">{rev.new_users_period}</p>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Projeção anual</p>
                <p className="text-3xl font-black text-gray-700">
                  R$ {(parseFloat(rev.mrr) * 12).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {/* Revenue by plan */}
            {Object.entries(rev.revenue_by_plan).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Breakdown por plano</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {Object.entries(rev.revenue_by_plan).map(([plan, data]: any) => (
                    <div key={plan} className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[plan] ?? 'bg-gray-100 text-gray-700'}`}>
                          {PLAN_LABELS[plan] ?? plan}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">{data.count} usuários × R$ {data.price}</p>
                      </div>
                      <p className="text-lg font-black text-gray-800">
                        R$ {parseFloat(data.revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly signups mini-chart */}
            {rev.monthly_signups?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Novos cadastros (últimos 6 meses)</p>
                <div className="flex items-end gap-2 h-24">
                  {rev.monthly_signups.map((m: any) => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-gray-600">{m.count}</span>
                      <div
                        className="w-full bg-brand-500 rounded-t-md transition-all"
                        style={{ height: `${Math.round((m.count / maxSignups) * 56) + 4}px` }}
                      />
                      <span className="text-[10px] text-gray-400 capitalize">{m.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center py-8 text-gray-400 text-sm">Erro ao carregar dados de receita</p>
        )}
      </div>

      {/* Pending approvals */}
      {pendingUsers.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-purple-300 overflow-hidden">
          <div className="px-5 py-3 bg-purple-50 border-b border-purple-200 flex items-center gap-2">
            <Clock size={16} className="text-purple-600" />
            <h2 className="font-semibold text-purple-800">Aguardando Aprovação</h2>
            <span className="ml-auto bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingUsers.length}
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingUsers.map((user: any) => (
              <div key={user.id} className="px-5 py-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{user.name}</p>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  {user.whatsapp && <p className="text-xs text-gray-400 mt-0.5">WhatsApp: {user.whatsapp}</p>}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {user.email_verified ? (
                    <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={12} /> Email verificado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                      <XCircle size={12} /> Email não verificado
                    </span>
                  )}
                  <span className="text-gray-400">{formatDate(user.created_at)}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveMutation.mutate(user.id)}
                    disabled={approveMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Check size={13} /> Aprovar
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate(user.id)}
                    disabled={rejectMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                  >
                    <X size={13} /> Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', search, filterStatus, filterPlan],
    queryFn: () =>
      api.get('/admin/users', { params: { search, status: filterStatus, plan: filterPlan, limit: 50 } }).then((r) => r.data),
  });

  const { data: waAccounts = [], refetch: refetchWA } = useQuery<any[]>({
    queryKey: ['admin-wa-accounts'],
    queryFn: () => api.get('/admin/whatsapp-accounts').then((r) => r.data),
    refetchInterval: 8000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api.put(`/admin/users/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      setEditing(null);
      toast.success('Usuário atualizado!');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao atualizar'),
  });

  const disconnectWAMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/whatsapp-accounts/${id}/disconnect`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-wa-accounts'] }); toast.success('Número desconectado.'); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao desconectar'),
  });

  const removeWAMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/whatsapp-accounts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-wa-accounts'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Número removido.');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao remover'),
  });

  function toggleExpand(userId: string) {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  }

  function startEdit(user: any) {
    setEditing(user.id);
    setEditForm({ plan: user.plan, status: user.status, whatsapp_support: user.whatsapp_support || '' });
  }

  const users = data?.data ?? [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Buscar por email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="active">Ativo</option>
          <option value="trial">Trial</option>
          <option value="inactive">Inativo</option>
        </select>
        <select className="input w-auto" value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)}>
          <option value="">Todos os planos</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="starter_cortesia">Básico Cortesia</option>
          <option value="pro_cortesia">Pro Cortesia</option>
          <option value="admin">Admin</option>
        </select>
        <button onClick={() => { refetch(); refetchWA(); }} className="btn btn-secondary gap-2">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider grid grid-cols-12 gap-2">
          <span className="col-span-3">Usuário</span>
          <span className="col-span-2">Plano</span>
          <span className="col-span-2">Status</span>
          <span className="col-span-2">Trial até</span>
          <span className="col-span-1 text-center">WA</span>
          <span className="col-span-2 text-right">Ações</span>
        </div>

        {isLoading && <p className="text-center py-10 text-gray-400">Carregando...</p>}
        {!isLoading && users.length === 0 && <p className="text-center py-10 text-gray-400">Nenhum usuário encontrado</p>}

        <div className="divide-y divide-gray-100">
          {users.map((user: any) => {
            const userWA = waAccounts.filter((a: any) => a.user_id === user.id);
            const connectedCount = userWA.filter((a: any) => a.live_status === 'connected').length;
            const isExpanded = expandedUsers.has(user.id);

            return (
              <div key={user.id}>
                <div className="grid grid-cols-12 gap-2 px-5 py-3 items-center text-sm hover:bg-gray-50">
                  {editing === user.id ? (
                    <>
                      <div className="col-span-3">
                        <p className="font-medium text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                        <input
                          className="input mt-1 text-xs"
                          placeholder="WhatsApp suporte (opcional)"
                          value={editForm.whatsapp_support}
                          onChange={(e) => setEditForm({ ...editForm, whatsapp_support: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2">
                        <select className="input text-xs" value={editForm.plan} onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}>
                          <optgroup label="Planos pagos">
                            <option value="starter">Starter</option>
                            <option value="pro">Pro</option>
                          </optgroup>
                          <optgroup label="Cortesia (R$0)">
                            <option value="starter_cortesia">Básico Cortesia</option>
                            <option value="pro_cortesia">Pro Cortesia</option>
                          </optgroup>
                          <optgroup label="Interno">
                            <option value="admin">Admin</option>
                          </optgroup>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <select className="input text-xs" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                          <option value="pending">Pendente</option>
                          <option value="trial">Trial</option>
                          <option value="active">Ativo</option>
                          <option value="inactive">Inativo</option>
                        </select>
                      </div>
                      <div className="col-span-2 text-xs text-gray-400">{formatDate(user.trial_ends_at)}</div>
                      <div className="col-span-1 text-center text-gray-600">{user.whatsapp_count}</div>
                      <div className="col-span-2 flex justify-end gap-2">
                        <button onClick={() => updateMutation.mutate({ id: user.id, body: editForm })} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Salvar">
                          <Check size={15} />
                        </button>
                        <button onClick={() => setEditing(null)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Cancelar">
                          <X size={15} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="col-span-3">
                        <p className="font-medium text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                      <div className="col-span-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[user.plan]}`}>
                          {PLAN_LABELS[user.plan] ?? user.plan}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[user.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[user.status] ?? user.status}
                        </span>
                      </div>
                      <div className="col-span-2 text-xs text-gray-500">{user.trial_ends_at ? formatDate(user.trial_ends_at) : '—'}</div>
                      <div className="col-span-1 text-center">
                        {user.whatsapp_count > 0 ? (
                          <button
                            onClick={() => toggleExpand(user.id)}
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
                              connectedCount > 0 ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <Smartphone size={11} />
                            {user.whatsapp_count}
                            {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <button onClick={() => startEdit(user)} className="btn btn-secondary text-xs py-1 px-3">
                          Editar
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {isExpanded && userWA.length > 0 && (
                  <div className="bg-gray-50 border-t border-gray-100 px-5 py-3 space-y-2">
                    {userWA.map((wa: any) => (
                      <div key={wa.id} className="flex items-center gap-3 bg-white rounded-lg px-4 py-2.5 border border-gray-200 text-sm">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${WA_STATUS_DOT[wa.live_status] ?? 'bg-gray-300'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800">{wa.label}</p>
                          <p className="text-xs text-gray-400">{wa.phone ? `+${wa.phone}` : 'Número não identificado'}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${WA_STATUS_BADGE[wa.live_status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {WA_STATUS_LABEL[wa.live_status] ?? wa.live_status}
                        </span>
                        {wa.live_status !== 'disconnected' && (
                          <button
                            onClick={() => disconnectWAMutation.mutate(wa.id)}
                            disabled={disconnectWAMutation.isPending}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 text-orange-600 text-xs font-semibold rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 flex-shrink-0"
                          >
                            <WifiOff size={12} /> Desconectar
                          </button>
                        )}
                        <button
                          onClick={() => { if (confirm(`Remover "${wa.label}" permanentemente?`)) removeWAMutation.mutate(wa.id); }}
                          disabled={removeWAMutation.isPending}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 flex-shrink-0"
                        >
                          <Trash2 size={12} /> Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Prices Tab ───────────────────────────────────────────────────────────────

function PricesTab() {
  const qc = useQueryClient();
  const { data: prices, isLoading } = useQuery({
    queryKey: ['admin-plan-prices'],
    queryFn: () => api.get('/admin/plan-prices').then((r) => r.data),
  });

  const [form, setForm] = useState({ starter: '67.90', pro: '117.90' });

  useEffect(() => {
    if (prices) {
      setForm({
        starter: prices.starter?.price || '67.90',
        pro: prices.pro?.price || '117.90',
      });
    }
  }, [prices]);

  const saveMutation = useMutation({
    mutationFn: () => api.put('/admin/plan-prices', {
      starter: { price: form.starter },
      pro: { price: form.pro },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-plan-prices'] });
      toast.success('Preços atualizados! A página principal sincroniza automaticamente.');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao salvar preços'),
  });

  if (isLoading) return <p className="text-center py-10 text-gray-400">Carregando...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 rounded-lg"><DollarSign size={18} className="text-green-600" /></div>
          <div>
            <h2 className="font-bold text-lg text-gray-800">Gestão de Preços</h2>
            <p className="text-sm text-gray-500">Alterações refletem automaticamente na página principal</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Starter */}
          <div className="border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-gray-800">Plano Starter</p>
                <p className="text-xs text-gray-500 mt-0.5">Até 3 números · 5.000 contatos</p>
              </div>
              <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">Starter</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-500">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input flex-1"
                value={form.starter}
                onChange={(e) => setForm({ ...form, starter: e.target.value })}
                placeholder="67.90"
              />
              <span className="text-sm text-gray-400">/mês</span>
            </div>
          </div>

          {/* Pro */}
          <div className="border-2 border-brand-300 bg-brand-50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-gray-800">Plano Pro</p>
                <p className="text-xs text-gray-500 mt-0.5">Até 6 números · Contatos ilimitados · Bot IA</p>
              </div>
              <span className="text-xs font-semibold bg-brand-100 text-brand-700 px-2.5 py-1 rounded-full">Pro · Mais popular</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-500">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input flex-1"
                value={form.pro}
                onChange={(e) => setForm({ ...form, pro: e.target.value })}
                placeholder="117.90"
              />
              <span className="text-sm text-gray-400">/mês</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
            Os planos <strong>Cortesia</strong> (R$0) são concedidos manualmente na aba Usuários — não possuem preço configurável aqui.
          </div>

          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full btn bg-green-600 hover:bg-green-700 text-white font-bold gap-2 py-3 disabled:opacity-50"
          >
            <Save size={16} /> {saveMutation.isPending ? 'Salvando...' : 'Salvar Preços'}
          </button>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        <strong>Como funciona a sincronização:</strong> A página principal ({' '}
        <code className="bg-yellow-100 px-1 rounded text-xs">clicaai.ia.br</code>
        ) busca os preços via API a cada carregamento. Ao salvar aqui, a próxima visita ao site já mostrará os novos valores.
      </div>
    </div>
  );
}

// ─── Infrastructure Tab ───────────────────────────────────────────────────────

function CostRow({ icon, bg, service, detail, usd, brl, type, note, link }: {
  icon: React.ReactNode; bg: string; service: string; detail: string;
  usd: string; brl: string; type: 'free' | 'fixed' | 'variable'; note?: string; link: string;
}) {
  const badge = type === 'free'
    ? 'bg-gray-100 text-gray-500'
    : type === 'fixed'
    ? 'bg-blue-100 text-blue-700'
    : 'bg-orange-100 text-orange-700';
  const label = type === 'free' ? 'Grátis' : type === 'fixed' ? 'Fixo' : 'Variável';
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className={`p-2 rounded-lg ${bg} shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-800">{service}</p>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badge}`}>{label}</span>
        </div>
        <p className="text-xs text-gray-400">{detail}</p>
        {note && <p className="text-xs text-gray-400 mt-0.5 italic">{note}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-gray-800">{usd}<span className="text-xs font-normal text-gray-400">/mês</span></p>
        <p className="text-xs text-gray-400">{type !== 'free' ? `≈ ${brl}` : ''}</p>
      </div>
      <a href={link} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-gray-500 shrink-0">
        <ExternalLink size={13} />
      </a>
    </div>
  );
}

function InfraTab({ stats }: { stats: any }) {
  const backendBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

  const { data: health, isLoading: healthLoading, error: healthError } = useQuery({
    queryKey: ['admin-health'],
    queryFn: () => fetch(`${backendBase}/health`).then((r) => r.ok ? r.json() : Promise.reject(r)),
    staleTime: 30000,
    retry: 1,
  });

  const serviceOk = !healthError && !healthLoading && health?.status === 'ok';

  return (
    <div className="space-y-6">
      {/* Service status */}
      <div>
        <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Activity size={18} className="text-brand-600" /> Status dos Serviços
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Backend */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Server size={16} className="text-blue-600" /></div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${serviceOk ? 'bg-green-100 text-green-700' : healthLoading ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
                {serviceOk ? 'Online' : healthLoading ? 'Verificando...' : 'Offline'}
              </span>
            </div>
            <p className="font-bold text-gray-800 text-sm">Backend API</p>
            <p className="text-xs text-gray-400 mt-0.5">Render · Node.js</p>
            {health?.timestamp && (
              <p className="text-xs text-gray-400 mt-2">
                Última resposta: {new Date(health.timestamp).toLocaleTimeString('pt-BR')}
              </p>
            )}
          </div>

          {/* Database */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-indigo-100 rounded-lg"><Database size={16} className="text-indigo-600" /></div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${stats ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {stats ? 'Conectado' : 'Verificando...'}
              </span>
            </div>
            <p className="font-bold text-gray-800 text-sm">Banco de Dados</p>
            <p className="text-xs text-gray-400 mt-0.5">PostgreSQL · Render</p>
            {stats && (
              <p className="text-xs text-gray-400 mt-2">{stats.total} usuários registrados</p>
            )}
          </div>

          {/* Frontend */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-gray-100 rounded-lg"><Monitor size={16} className="text-gray-600" /></div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">Online</span>
            </div>
            <p className="font-bold text-gray-800 text-sm">Frontend Web</p>
            <p className="text-xs text-gray-400 mt-0.5">Vercel · Next.js</p>
            <p className="text-xs text-gray-400 mt-2">clicaai.ia.br</p>
          </div>

          {/* WhatsApp */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-green-100 rounded-lg"><Smartphone size={16} className="text-green-600" /></div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${(health?.whatsapp?.connected ?? 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {health?.whatsapp?.connected ?? '—'} conectados
              </span>
            </div>
            <p className="font-bold text-gray-800 text-sm">Contas WhatsApp</p>
            <p className="text-xs text-gray-400 mt-0.5">Via app desktop</p>
            {health?.whatsapp && (
              <p className="text-xs text-gray-400 mt-2">
                {health.whatsapp.connected} conectadas · {health.whatsapp.connecting ?? 0} conectando
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Desktop App */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Zap size={16} className="text-brand-600" /> App Desktop
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Versão atual</p>
            <p className="font-black text-xl text-gray-800">v1.0.6</p>
            <p className="text-xs text-gray-400 mt-1">Windows x64</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Atualização</p>
            <p className="font-bold text-sm text-green-700">Auto-update ativo</p>
            <p className="text-xs text-gray-400 mt-1">GitHub Releases</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-1">Distribuição</p>
            <p className="font-bold text-sm text-gray-700">NSIS Installer</p>
            <p className="text-xs text-gray-400 mt-1">Clica.Ai.Setup.exe</p>
          </div>
        </div>
      </div>

      {/* Cost Dashboard */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
          <DollarSign size={18} className="text-emerald-600" /> Custos Mensais da Infraestrutura
        </h2>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs text-blue-500 font-medium mb-1">Custos fixos</p>
            <p className="text-xl font-black text-blue-700">$14 <span className="text-sm font-semibold">USD</span></p>
            <p className="text-xs text-blue-400 mt-0.5">≈ R$ 84/mês</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
            <p className="text-xs text-orange-500 font-medium mb-1">Custos variáveis</p>
            <p className="text-xl font-black text-orange-700">$0–28 <span className="text-sm font-semibold">USD</span></p>
            <p className="text-xs text-orange-400 mt-0.5">conforme uso</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
            <p className="text-xs text-emerald-600 font-medium mb-1">Total estimado</p>
            <p className="text-xl font-black text-emerald-700">$14–42 <span className="text-sm font-semibold">USD</span></p>
            <p className="text-xs text-emerald-500 mt-0.5">≈ R$ 84–252/mês</p>
          </div>
        </div>

        {/* Services table */}
        <div className="space-y-1">

          {/* Group: Servidor */}
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-2 pb-1">Servidor</p>
          {[
            {
              icon: <Server size={14} className="text-blue-600" />,
              bg: 'bg-blue-50',
              service: 'Render — Backend API',
              detail: 'Node.js · Starter Plan',
              usd: '$7',
              brl: 'R$ 42',
              type: 'fixed' as const,
              link: 'https://dashboard.render.com',
            },
            {
              icon: <Database size={14} className="text-indigo-600" />,
              bg: 'bg-indigo-50',
              service: 'Render — PostgreSQL',
              detail: 'Banco de dados · Starter',
              usd: '$7',
              brl: 'R$ 42',
              type: 'fixed' as const,
              link: 'https://dashboard.render.com',
            },
          ].map((item) => <CostRow key={item.service} {...item} />)}

          {/* Group: Fila & Cache */}
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-3 pb-1">Fila & Cache</p>
          {[
            {
              icon: <Zap size={14} className="text-yellow-600" />,
              bg: 'bg-yellow-50',
              service: 'Upstash Redis',
              detail: 'BullMQ · Pay as you go',
              usd: '$0–3',
              brl: 'R$ 0–18',
              type: 'variable' as const,
              note: '10k req/dia grátis; $0,20 por 100k extras',
              link: 'https://console.upstash.com',
            },
          ].map((item) => <CostRow key={item.service} {...item} />)}

          {/* Group: Email */}
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-3 pb-1">Email</p>
          {[
            {
              icon: <Mail size={14} className="text-violet-600" />,
              bg: 'bg-violet-50',
              service: 'Resend',
              detail: 'Envio de emails · Free/Pro',
              usd: '$0–20',
              brl: 'R$ 0–120',
              type: 'variable' as const,
              note: '3.000 emails/mês grátis; Pro $20 = 50k emails',
              link: 'https://resend.com/overview',
            },
          ].map((item) => <CostRow key={item.service} {...item} />)}

          {/* Group: Armazenamento & Outros */}
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-3 pb-1">Armazenamento & Outros</p>
          {[
            {
              icon: <Cloud size={14} className="text-orange-500" />,
              bg: 'bg-orange-50',
              service: 'Cloudflare R2',
              detail: 'Mídia enviada pelos clientes',
              usd: '$0–5',
              brl: 'R$ 0–30',
              type: 'variable' as const,
              note: '10 GB/mês grátis; $0,015/GB extra',
              link: 'https://dash.cloudflare.com',
            },
            {
              icon: <Monitor size={14} className="text-gray-500" />,
              bg: 'bg-gray-50',
              service: 'Vercel — Frontend',
              detail: 'Next.js · Hobby Plan',
              usd: '$0',
              brl: 'Grátis',
              type: 'free' as const,
              link: 'https://vercel.com/dashboard',
            },
            {
              icon: <Monitor size={14} className="text-gray-500" />,
              bg: 'bg-gray-50',
              service: 'GitHub',
              detail: 'Repositório + Releases',
              usd: '$0',
              brl: 'Grátis',
              type: 'free' as const,
              link: 'https://github.com',
            },
          ].map((item) => <CostRow key={item.service} {...item} />)}
        </div>

        {/* Visual bar */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Distribuição dos custos fixos</p>
          <div className="flex rounded-full overflow-hidden h-3 gap-0.5">
            <div className="bg-blue-500 flex-1" title="Render Backend $7" />
            <div className="bg-indigo-500 flex-1" title="Render PostgreSQL $7" />
          </div>
          <div className="flex gap-4 mt-2">
            <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Render Backend ($7)</span>
            <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> PostgreSQL ($7)</span>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-4">* Câmbio aproximado: USD 1 = R$ 6. Custos variáveis dependem do volume de uso mensal.</p>
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then((r) => r.data),
  });

  const { data: pendingData } = useQuery({
    queryKey: ['admin-pending'],
    queryFn: () => api.get('/admin/users', { params: { status: 'pending', limit: 50 } }).then((r) => r.data),
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/users/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      qc.invalidateQueries({ queryKey: ['admin-pending'] });
      toast.success('Conta aprovada! Email de boas-vindas enviado.');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao aprovar'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/users/${id}/reject`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      qc.invalidateQueries({ queryKey: ['admin-pending'] });
      toast.success('Conta rejeitada.');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao rejeitar'),
  });

  const pendingUsers = pendingData?.data ?? [];
  const pendingCount = pendingUsers.length;

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Visão Geral' },
    { id: 'users', label: 'Usuários', badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'prices', label: 'Preços' },
    { id: 'infra', label: 'Infraestrutura' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-100 rounded-xl">
            <ShieldCheck size={22} className="text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
            <p className="text-sm text-gray-500">Gerencie usuários, preços e infraestrutura</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { qc.invalidateQueries(); refetchStats(); }} className="btn btn-secondary gap-2 text-sm">
            <RefreshCw size={14} /> Atualizar
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={16} /> Voltar ao sistema
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.badge != null && (
              <span className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab
          stats={stats}
          pendingUsers={pendingUsers}
          approveMutation={approveMutation}
          rejectMutation={rejectMutation}
        />
      )}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'prices' && <PricesTab />}
      {activeTab === 'infra' && <InfraTab stats={stats} />}
    </div>
  );
}
