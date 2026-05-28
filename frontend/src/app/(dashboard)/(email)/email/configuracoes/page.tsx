'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Mail, CheckCircle2, AlertTriangle, Send, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function EmailConfiguracoesPage() {
  const qc = useQueryClient();
  const [newEmail, setNewEmail] = useState('');

  const { data, isLoading } = useQuery<{ sender_email: string | null; sender_email_verified: boolean }>({
    queryKey: ['sender-email'],
    queryFn: () => api.get('/auth/sender-email').then((r) => r.data),
  });

  const setEmailMutation = useMutation({
    mutationFn: (email: string) => api.post('/auth/sender-email', { email }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sender-email'] });
      setNewEmail('');
      toast.success('Email de verificação enviado! Verifique sua caixa de entrada.');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao salvar email'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setEmailMutation.mutate(newEmail.trim());
  }

  const verified = data?.sender_email_verified === true;
  const pending = data?.sender_email && !verified;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações de Email</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure o email de remetente para suas campanhas</p>
        </div>
        <Link href="/email" className="btn btn-secondary gap-2 text-sm">
          ← Voltar para campanhas
        </Link>
      </div>

      {/* Status atual */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl shrink-0">
            <Settings size={20} className="text-indigo-500" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Email de remetente</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Aparece no campo <strong>Reply-To</strong> de todas as suas campanhas, identificando você como remetente
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400">Carregando...</p>
        ) : (
          <>
            {/* Status badge */}
            {data?.sender_email ? (
              <div className={`flex items-start gap-3 p-4 rounded-xl border ${verified ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                <div className="shrink-0 mt-0.5">
                  {verified
                    ? <CheckCircle2 size={18} className="text-green-600" />
                    : <AlertTriangle size={18} className="text-amber-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${verified ? 'text-green-800' : 'text-amber-800'}`}>
                    {verified ? 'Email verificado' : 'Aguardando verificação'}
                  </p>
                  <p className="text-sm font-mono mt-0.5 text-gray-700 truncate">{data.sender_email}</p>
                  {pending && (
                    <p className="text-xs text-amber-600 mt-1">
                      Verifique sua caixa de entrada e clique no link enviado para confirmar.
                    </p>
                  )}
                </div>
                {pending && (
                  <button
                    onClick={() => setEmailMutation.mutate(data.sender_email!)}
                    disabled={setEmailMutation.isPending}
                    className="shrink-0 flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                    title="Reenviar email de verificação"
                  >
                    <RefreshCw size={12} /> Reenviar
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
                <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-red-800">Nenhum email configurado</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Você não poderá enviar campanhas até configurar e verificar um email de remetente.
                  </p>
                </div>
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                {data?.sender_email ? 'Alterar email de remetente' : 'Cadastrar email de remetente'}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="input pl-9 w-full"
                  />
                </div>
                <button
                  type="submit"
                  disabled={setEmailMutation.isPending || !newEmail.trim()}
                  className="btn btn-primary gap-2 shrink-0 disabled:opacity-40"
                >
                  <Send size={14} />
                  {setEmailMutation.isPending ? 'Enviando...' : 'Verificar'}
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Um email de confirmação será enviado para este endereço. Clique no link para verificar.
              </p>
            </form>
          </>
        )}
      </div>

      {/* Explicação */}
      <div className="card p-5 space-y-3">
        <h3 className="font-semibold text-gray-800 text-sm">Por que isso é necessário?</h3>
        <ul className="space-y-2 text-sm text-gray-500">
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
            <span>Identifica você como responsável pelos emails enviados pela plataforma</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
            <span>Aparece no campo <strong className="text-gray-700">Reply-To</strong> — quando o destinatário responder, a resposta chegará para você</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
            <span>Aumenta a credibilidade das suas campanhas e reduz a taxa de spam</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
            <span>Obrigatório para garantir rastreabilidade e evitar uso indevido da plataforma</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
