'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, ShieldCheck, TrendingUp, Search, ChevronDown, Check, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

const PLAN_LABELS: Record<string, string> = { starter: 'Starter', pro: 'Pro' };
const STATUS_LABELS: Record<string, string> = { active: 'Ativo', trial: 'Trial', inactive: 'Inativo' };
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-red-100 text-red-600',
};
const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-700',
  pro: 'bg-brand-100 text-brand-700',
};

export default function AdminPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then((r) => r.data),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', search, filterStatus, filterPlan],
    queryFn: () =>
      api.get('/admin/users', { params: { search, status: filterStatus, plan: filterPlan, limit: 50 } }).then((r) => r.data),
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

  function startEdit(user: any) {
    setEditing(user.id);
    setEditForm({ plan: user.plan, status: user.status, whatsapp_support: user.whatsapp_support || '' });
  }

  function saveEdit(id: string) {
    updateMutation.mutate({ id, body: editForm });
  }

  const users = data?.data ?? [];

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-brand-100 rounded-xl">
          <ShieldCheck size={22} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
          <p className="text-sm text-gray-500">Gerencie usuários e planos da plataforma</p>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-700' },
            { label: 'Ativos', value: stats.active, color: 'text-green-600' },
            { label: 'Trial', value: stats.trial, color: 'text-yellow-600' },
            { label: 'Inativos', value: stats.inactive, color: 'text-red-500' },
            { label: 'Trial expirado', value: stats.trial_expired, color: 'text-orange-500' },
            { label: 'Novos (mês)', value: stats.new_this_month, color: 'text-brand-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Planos */}
      {stats?.by_plan && (
        <div className="flex gap-4 flex-wrap">
          {Object.entries(stats.by_plan).map(([plan, count]: any) => (
            <div key={plan} className="bg-white rounded-xl border border-gray-200 px-4 py-2.5 flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[plan]}`}>{PLAN_LABELS[plan] ?? plan}</span>
              <span className="text-sm font-bold text-gray-800">{count} usuários</span>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
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
          <option value="active">Ativo</option>
          <option value="trial">Trial</option>
          <option value="inactive">Inativo</option>
        </select>
        <select className="input w-auto" value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)}>
          <option value="">Todos os planos</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
        </select>
        <button onClick={() => refetch()} className="btn btn-secondary gap-2">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider grid grid-cols-12 gap-2">
          <span className="col-span-3">Usuário</span>
          <span className="col-span-2">Plano</span>
          <span className="col-span-2">Status</span>
          <span className="col-span-2">Trial até</span>
          <span className="col-span-1 text-center">Numbers</span>
          <span className="col-span-2 text-right">Ações</span>
        </div>

        {isLoading && <p className="text-center py-10 text-gray-400">Carregando...</p>}
        {!isLoading && users.length === 0 && <p className="text-center py-10 text-gray-400">Nenhum usuário encontrado</p>}

        <div className="divide-y divide-gray-100">
          {users.map((user: any) => (
            <div key={user.id} className="grid grid-cols-12 gap-2 px-5 py-3 items-center text-sm hover:bg-gray-50">
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
                      <option value="starter">Starter — R$67,90</option>
                      <option value="pro">Pro — R$117,90</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <select className="input text-xs" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                      <option value="trial">Trial</option>
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </div>
                  <div className="col-span-2 text-xs text-gray-400">{formatDate(user.trial_ends_at)}</div>
                  <div className="col-span-1 text-center text-gray-600">{user.whatsapp_count}</div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <button onClick={() => saveEdit(user.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Salvar">
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
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[user.status]}`}>
                      {STATUS_LABELS[user.status] ?? user.status}
                    </span>
                  </div>
                  <div className="col-span-2 text-xs text-gray-500">{user.trial_ends_at ? formatDate(user.trial_ends_at) : '—'}</div>
                  <div className="col-span-1 text-center text-gray-600">{user.whatsapp_count}</div>
                  <div className="col-span-2 flex justify-end">
                    <button onClick={() => startEdit(user)} className="btn btn-secondary text-xs py-1 px-3">
                      Editar
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
