'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban, Plus, Trash2, Search, ShieldOff, MessageCircleX, UserMinus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface OptoutEntry {
  id: string;
  phone: string;
  source: 'reply' | 'manual';
  notes: string | null;
  created_at: string;
}

interface OptoutStats {
  total: number;
  from_reply: number;
  manual: number;
}

export default function OptoutsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const { data: stats } = useQuery<OptoutStats>({
    queryKey: ['optout-stats'],
    queryFn: () => api.get('/optouts/stats').then((r) => r.data),
  });

  const { data, isLoading } = useQuery<{ total: number; page: number; data: OptoutEntry[] }>({
    queryKey: ['optouts', page, search],
    queryFn: () =>
      api.get('/optouts', { params: { page, limit: 50, search: search || undefined } }).then((r) => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (body: { phone: string; notes?: string }) => api.post('/optouts', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['optouts'] });
      qc.invalidateQueries({ queryKey: ['optout-stats'] });
      setNewPhone('');
      setNewNotes('');
      setShowAdd(false);
      toast.success('Número adicionado à lista negra');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao adicionar'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/optouts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['optouts'] });
      qc.invalidateQueries({ queryKey: ['optout-stats'] });
      toast.success('Número removido da lista negra');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao remover'),
  });

  function handleAdd() {
    if (!newPhone.trim()) return toast.error('Informe o número de telefone');
    addMutation.mutate({ phone: newPhone.trim(), notes: newNotes.trim() || undefined });
  }

  const totalPages = Math.ceil((data?.total ?? 0) / 50);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lista Negra Permanente</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Números que solicitaram descadastro. Nunca receberão mensagens, mesmo após reimportação de contatos.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={16} /> Adicionar número
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total bloqueados', value: stats?.total ?? 0, icon: <Ban size={18} />, color: 'text-red-600 bg-red-100' },
          { label: 'Enviaram SAIR', value: stats?.from_reply ?? 0, icon: <MessageCircleX size={18} />, color: 'text-orange-600 bg-orange-100' },
          { label: 'Adicionados manualmente', value: stats?.manual ?? 0, icon: <UserMinus size={18} />, color: 'text-gray-600 bg-gray-100' },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal adicionar */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-xl"><ShieldOff size={20} className="text-red-600" /></div>
              <h2 className="text-lg font-semibold text-gray-900">Adicionar à Lista Negra</h2>
            </div>
            <div>
              <label className="label">Número de telefone</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: 11999990000 ou 5511999990000"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">O código do país (55) será adicionado automaticamente se necessário.</p>
            </div>
            <div>
              <label className="label">Observação (opcional)</label>
              <input
                type="text"
                className="input"
                placeholder="Motivo do bloqueio..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowAdd(false); setNewPhone(''); setNewNotes(''); }} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button onClick={handleAdd} disabled={addMutation.isPending} className="btn-primary flex-1">
                {addMutation.isPending ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          className="input pl-9"
          placeholder="Buscar por telefone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Lista */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">
            {data?.total ?? 0} número{(data?.total ?? 0) !== 1 ? 's' : ''} bloqueado{(data?.total ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        {isLoading && <p className="px-5 py-10 text-center text-gray-400 text-sm">Carregando...</p>}
        {!isLoading && !data?.data?.length && (
          <div className="px-5 py-10 text-center">
            <Ban size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Nenhum número bloqueado ainda.</p>
            <p className="text-gray-400 text-xs mt-1">Números que enviarem SAIR serão adicionados automaticamente.</p>
          </div>
        )}
        <div className="divide-y divide-gray-100">
          {data?.data?.map((entry) => (
            <div key={entry.id} className="px-5 py-3.5 flex items-center gap-4">
              <div className={`p-1.5 rounded-lg ${entry.source === 'reply' ? 'bg-orange-100' : 'bg-gray-100'}`}>
                {entry.source === 'reply'
                  ? <MessageCircleX size={14} className="text-orange-600" />
                  : <UserMinus size={14} className="text-gray-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-medium text-gray-800">{entry.phone}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    entry.source === 'reply' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {entry.source === 'reply' ? 'Enviou SAIR' : 'Manual'}
                  </span>
                  {entry.notes && <span className="text-xs text-gray-400 truncate">{entry.notes}</span>}
                </div>
              </div>
              <span className="text-xs text-gray-400 shrink-0">{formatDate(entry.created_at)}</span>
              <button
                onClick={() => removeMutation.mutate(entry.id)}
                disabled={removeMutation.isPending}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Remover da lista negra"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn-secondary px-3 py-1.5 text-sm">
            Anterior
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="btn-secondary px-3 py-1.5 text-sm">
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
