'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Inbox, UserMinus, RefreshCw, Phone, Smartphone, Filter } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function InboxPage() {
  const [page, setPage] = useState(1);
  const [filterAccount, setFilterAccount] = useState('');
  const [onlyOptout, setOnlyOptout] = useState(false);

  const { data: accounts } = useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: () => api.get('/whatsapp/accounts').then((r) => r.data),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['inbox', page, filterAccount, onlyOptout],
    queryFn: () =>
      api.get('/whatsapp/inbox', {
        params: { page, limit: 50, account_id: filterAccount || undefined, only_optout: onlyOptout || undefined },
      }).then((r) => r.data),
    refetchInterval: 30000,
  });

  const messages = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-100 rounded-xl">
            <Inbox size={22} className="text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Caixa de Entrada</h1>
            <p className="text-sm text-gray-500">Respostas recebidas nos seus números WhatsApp</p>
          </div>
        </div>
        <button onClick={() => refetch()} className="btn btn-secondary gap-2 text-sm">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <Filter size={15} className="text-gray-400" />
        <select
          className="input w-auto"
          value={filterAccount}
          onChange={(e) => { setFilterAccount(e.target.value); setPage(1); }}
        >
          <option value="">Todos os números</option>
          {(accounts ?? []).map((a: any) => (
            <option key={a.id} value={a.id}>{a.label || a.phone || a.id.slice(0, 8)}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyOptout}
            onChange={(e) => { setOnlyOptout(e.target.checked); setPage(1); }}
            className="w-4 h-4 accent-red-500"
          />
          <UserMinus size={14} className="text-red-500" />
          Somente solicitações de saída (SAIR)
        </label>
        <span className="ml-auto text-xs text-gray-400">{total} mensagem{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Lista */}
      <div className="card overflow-hidden">
        {isLoading && <p className="text-center py-12 text-gray-400">Carregando...</p>}
        {!isLoading && messages.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Inbox size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma mensagem recebida ainda</p>
            <p className="text-sm mt-1">As respostas dos seus contatos aparecerão aqui</p>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {messages.map((msg: any) => (
            <div key={msg.id} className={`px-5 py-4 flex items-start gap-4 hover:bg-gray-50 ${msg.is_optout ? 'bg-red-50/40' : ''}`}>
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                msg.is_optout ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {msg.from_name ? msg.from_name[0].toUpperCase() : <Phone size={16} />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800 text-sm">
                    {msg.from_name || 'Desconhecido'}
                  </span>
                  <span className="text-xs text-gray-400">{msg.from_phone}</span>
                  {msg.is_optout && (
                    <span className="flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                      <UserMinus size={11} /> Saiu da lista
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-0.5 truncate">{msg.text}</p>
                <div className="flex items-center gap-3 mt-1">
                  {msg.account && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Smartphone size={11} />
                      {msg.account.label || msg.account.phone || '—'}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{formatDate(msg.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Paginação */}
      {total > 50 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary text-sm disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">Página {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * 50 >= total}
            className="btn btn-secondary text-sm disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
