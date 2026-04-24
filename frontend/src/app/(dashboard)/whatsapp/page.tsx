'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Smartphone, Plus, Trash2, CheckCircle, XCircle, Loader2, QrCode, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import api from '@/lib/api';

interface Account {
  id: string;
  label: string;
  phone: string | null;
  status: 'connected' | 'connecting' | 'disconnected';
}

interface QrModal {
  accountId: string;
  qr: string | null;
  qrLoading: boolean;
}

export default function WhatsAppPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<QrModal | null>(null);
  const [editingLabel, setEditingLabel] = useState<{ id: string; label: string } | null>(null);
  const [newLabel, setNewLabel] = useState('');

  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ['wa-accounts'],
    queryFn: () => api.get('/whatsapp/accounts').then((r) => r.data),
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: (label: string) => api.post('/whatsapp/accounts', { label }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['wa-accounts'] });
      openModal(res.data.id);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao criar conta'),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) => api.put(`/whatsapp/accounts/${id}`, { label }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wa-accounts'] }); setEditingLabel(null); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/whatsapp/accounts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wa-accounts'] }); toast.success('Número removido'); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao remover'),
  });

  function openModal(accountId: string) {
    setModal({ accountId, qr: null, qrLoading: false });
    loadQR(accountId);
  }

  async function loadQR(accountId: string) {
    setModal((m) => m ? { ...m, qrLoading: true, qr: null } : null);
    try {
      const res = await api.get(`/whatsapp/accounts/${accountId}/qr`);
      if (res.data.status === 'connected') {
        toast.success('Número já conectado!');
        setModal(null);
        qc.invalidateQueries({ queryKey: ['wa-accounts'] });
      } else if (res.data.qr) {
        setModal((m) => m ? { ...m, qrLoading: false, qr: res.data.qr } : null);
      } else {
        setModal((m) => m ? { ...m, qrLoading: false } : null);
        toast('Gerando QR code, tente novamente...', { icon: '⏳' });
      }
    } catch (e: any) {
      setModal((m) => m ? { ...m, qrLoading: false } : null);
      toast.error(e.response?.data?.error || 'Erro ao obter QR code');
    }
  }

  function handleAdd() {
    const label = newLabel.trim() || `Número ${accounts.length + 1}`;
    setNewLabel('');
    createMutation.mutate(label);
  }

  const connectedCount = accounts.filter((a) => a.status === 'connected').length;

  // Auto-close modal when account becomes connected
  useEffect(() => {
    if (!modal) return;
    const account = accounts.find((a) => a.id === modal.accountId);
    if (account?.status === 'connected') {
      toast.success('Número conectado com sucesso!');
      setModal(null);
    }
  }, [accounts, modal?.accountId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Números WhatsApp</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {connectedCount} de {accounts.length} número{accounts.length !== 1 ? 's' : ''} conectado{connectedCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Adicionar novo número */}
      <div className="card p-4 flex gap-3 items-center">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Nome do número (ex: Vendas, Suporte...)"
          className="input flex-1"
        />
        <button onClick={handleAdd} disabled={createMutation.isPending} className="btn-primary whitespace-nowrap">
          {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Adicionar número
        </button>
      </div>

      {isLoading && <p className="text-gray-400 text-sm text-center py-8">Carregando...</p>}

      {!isLoading && accounts.length === 0 && (
        <div className="card p-10 text-center text-gray-400">
          <Smartphone size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum número conectado</p>
          <p className="text-sm mt-1">Adicione um número acima para começar</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((account) => (
          <div key={account.id} className="card p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${account.status === 'connected' ? 'bg-brand-600' : 'bg-gray-200'}`}>
                  <Smartphone size={18} className={account.status === 'connected' ? 'text-white' : 'text-gray-400'} />
                </div>
                <div className="min-w-0">
                  {editingLabel?.id === account.id ? (
                    <input
                      autoFocus
                      value={editingLabel.label}
                      onChange={(e) => setEditingLabel({ ...editingLabel, label: e.target.value })}
                      onBlur={() => renameMutation.mutate({ id: account.id, label: editingLabel.label })}
                      onKeyDown={(e) => e.key === 'Enter' && renameMutation.mutate({ id: account.id, label: editingLabel.label })}
                      className="input py-0.5 text-sm font-semibold w-full"
                    />
                  ) : (
                    <p className="font-semibold text-gray-900 truncate">{account.label}</p>
                  )}
                  <p className="text-xs text-gray-500">{account.phone ? `+${account.phone}` : 'Número não identificado'}</p>
                </div>
              </div>
              <button onClick={() => setEditingLabel({ id: account.id, label: account.label })} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
                <Pencil size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {account.status === 'connected' && <><CheckCircle size={15} className="text-green-500" /><span className="text-sm text-green-600 font-medium">Conectado</span></>}
              {account.status === 'connecting' && <><Loader2 size={15} className="text-blue-500 animate-spin" /><span className="text-sm text-blue-600 font-medium">Conectando...</span></>}
              {account.status === 'disconnected' && <><XCircle size={15} className="text-gray-400" /><span className="text-sm text-gray-500">Desconectado</span></>}
            </div>

            {account.status !== 'connected' && (
              <div className="flex gap-2 pt-1">
                <button onClick={() => openModal(account.id)} className="btn-primary flex-1 py-1.5 text-sm">
                  <QrCode size={14} /> Conectar via QR
                </button>
                <button
                  onClick={() => { if (confirm(`Remover "${account.label}"?`)) removeMutation.mutate(account.id); }}
                  className="btn-secondary py-1.5 px-3 text-red-500 hover:text-red-600"
                  title="Remover número"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
            {account.status === 'connected' && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { if (confirm(`Remover "${account.label}"?`)) removeMutation.mutate(account.id); }}
                  className="btn-secondary py-1.5 px-3 text-red-500 hover:text-red-600"
                  title="Remover número"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {accounts.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Boas práticas para evitar bloqueios</h3>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <li className="flex gap-2"><span className="text-brand-600 font-bold">·</span> Use múltiplos números para distribuir o volume de envios</li>
            <li className="flex gap-2"><span className="text-brand-600 font-bold">·</span> Mantenha o delay entre mensagens acima de 3 segundos</li>
            <li className="flex gap-2"><span className="text-brand-600 font-bold">·</span> Limite a 20 mensagens por minuto por número</li>
            <li className="flex gap-2"><span className="text-brand-600 font-bold">·</span> Envie apenas para contatos que autorizaram receber</li>
          </ul>
        </div>
      )}

      {/* Modal QR */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 text-center">Conectar WhatsApp</h2>

            {modal.qrLoading ? (
              <div className="py-12 flex flex-col items-center gap-3 text-gray-400">
                <Loader2 size={32} className="animate-spin" />
                <p className="text-sm text-center">Abrindo WhatsApp Web...<br /><span className="text-xs">Aguarde até 30 segundos</span></p>
              </div>
            ) : modal.qr ? (
              <div className="space-y-4 text-center">
                <div className="flex justify-center">
                  <div className="border-4 border-brand-600 rounded-xl p-2 inline-block">
                    <Image src={modal.qr} alt="QR Code" width={220} height={220} unoptimized />
                  </div>
                </div>
                <div className="text-sm text-gray-500 space-y-0.5">
                  <p>1. Abra o WhatsApp no celular</p>
                  <p>2. Vá em <strong>Dispositivos conectados</strong></p>
                  <p>3. Toque em <strong>Conectar dispositivo</strong></p>
                  <p>4. Escaneie o QR code acima</p>
                </div>
                <p className="text-xs text-gray-400">O QR expira em ~60 segundos — clique em "Novo QR" se expirar</p>
                <button onClick={() => loadQR(modal.accountId)} className="btn-secondary w-full text-sm">
                  Novo QR
                </button>
              </div>
            ) : (
              <div className="py-8 text-center">
                <button onClick={() => loadQR(modal.accountId)} className="btn-primary">
                  Gerar QR Code
                </button>
              </div>
            )}

            <button
              onClick={() => { setModal(null); qc.invalidateQueries({ queryKey: ['wa-accounts'] }); }}
              className="btn-secondary w-full"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
