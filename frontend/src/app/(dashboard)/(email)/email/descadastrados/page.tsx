'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserMinus, RotateCcw, Mail } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function DescadastradasPage() {
  const qc = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery<any[]>({
    queryKey: ['email-unsubscribed'],
    queryFn: () => api.get('/email/campaigns/unsubscribed').then((r) => r.data),
  });

  const resubscribeMutation = useMutation({
    mutationFn: (contactId: string) => api.post(`/email/campaigns/resubscribe/${contactId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-unsubscribed'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Contato reativado para receber emails');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao reativar'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Descadastros de Email</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Contatos que cancelaram a inscrição ou tiveram bounce — não recebem mais emails de campanha
          </p>
        </div>
        <Link href="/email" className="btn btn-secondary gap-2 text-sm">
          ← Voltar para campanhas
        </Link>
      </div>

      {isLoading && <p className="text-center py-10 text-gray-400">Carregando...</p>}

      {!isLoading && contacts.length === 0 && (
        <div className="card p-12 flex flex-col items-center gap-4 text-center">
          <div className="p-4 bg-green-50 rounded-2xl"><Mail size={32} className="text-green-400" /></div>
          <h2 className="text-lg font-bold text-gray-800">Nenhum descadastro</h2>
          <p className="text-sm text-gray-500 max-w-sm">Todos os seus contatos com email estão ativos e podem receber campanhas.</p>
        </div>
      )}

      {!isLoading && contacts.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 text-sm text-gray-500">
            <UserMinus size={14} />
            <span>{contacts.length} contato{contacts.length !== 1 ? 's' : ''} descadastrado{contacts.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3">Nome</th>
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-5 py-3">Data</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contacts.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">{c.name || '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{c.email}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{c.updated_at ? formatDate(c.updated_at) : '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Reativar "${c.name || c.email}" para receber emails?`)) {
                            resubscribeMutation.mutate(c.id);
                          }
                        }}
                        disabled={resubscribeMutation.isPending}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                        title="Reativar inscrição"
                      >
                        <RotateCcw size={13} /> Reativar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
