'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Plus, Trash2, BarChart2, Send, Clock, XCircle, Eye, Pencil } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho', scheduled: 'Agendada', running: 'Enviando',
  completed: 'Concluída', failed: 'Falhou',
};
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-yellow-100 text-yellow-700',
  running: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
};

function StatsModal({ campaign, onClose }: { campaign: any; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['email-stats', campaign.id],
    queryFn: () => api.get(`/email/campaigns/${campaign.id}/stats`).then((r) => r.data),
  });

  const msgs = data?.messages ?? [];
  const sent = msgs.filter((m: any) => ['sent', 'opened'].includes(m.status)).length;
  const opened = msgs.filter((m: any) => m.status === 'opened').length;
  const failed = msgs.filter((m: any) => m.status === 'failed').length;
  const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">{campaign.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        {isLoading ? (
          <p className="text-center py-10 text-gray-400">Carregando...</p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4 p-6">
              {[
                { label: 'Total', value: campaign.total_contacts, icon: Mail, color: 'text-gray-600' },
                { label: 'Entregues', value: sent, icon: CheckCircle2, color: 'text-green-600' },
                { label: 'Abertos', value: opened, icon: Eye, color: 'text-blue-600' },
                { label: 'Taxa abertura', value: `${openRate}%`, icon: BarChart2, color: 'text-indigo-600' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="text-center">
                  <Icon size={20} className={`mx-auto mb-1 ${color}`} />
                  <p className="text-2xl font-black text-gray-900">{value}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>
            <div className="overflow-y-auto flex-1 px-6 pb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                    <th className="text-left pb-2">Email</th>
                    <th className="text-left pb-2">Status</th>
                    <th className="text-left pb-2">Enviado</th>
                    <th className="text-left pb-2">Aberto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {msgs.map((m: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2 text-gray-700">{m.to_name ? `${m.to_name} <${m.to_email}>` : m.to_email}</td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[m.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {STATUS_LABELS[m.status] ?? m.status}
                        </span>
                      </td>
                      <td className="py-2 text-gray-400 text-xs">{m.sent_at ? formatDate(m.sent_at) : '—'}</td>
                      <td className="py-2 text-gray-400 text-xs">{m.opened_at ? formatDate(m.opened_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function EmailPage() {
  const qc = useQueryClient();
  const [statsFor, setStatsFor] = useState<any>(null);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: () => api.get('/email/campaigns').then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/email/campaigns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['email-campaigns'] }); toast.success('Campanha excluída'); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao excluir'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campanhas de Email</h1>
          <p className="text-sm text-gray-500 mt-0.5">Envie emails para seus contatos com rastreamento de abertura</p>
        </div>
        <Link href="/email/nova" className="btn btn-primary gap-2">
          <Plus size={16} /> Nova campanha
        </Link>
      </div>

      {isLoading && <p className="text-center py-10 text-gray-400">Carregando...</p>}
      {!isLoading && campaigns.length === 0 && (
        <div className="card p-12 flex flex-col items-center gap-4 text-center">
          <div className="p-4 bg-indigo-50 rounded-2xl"><Mail size={32} className="text-indigo-400" /></div>
          <h2 className="text-lg font-bold text-gray-800">Nenhuma campanha ainda</h2>
          <p className="text-sm text-gray-500 max-w-sm">Crie sua primeira campanha de email para enviar mensagens personalizadas para seus contatos.</p>
          <Link href="/email/nova" className="btn btn-primary gap-2"><Plus size={15} /> Criar campanha</Link>
        </div>
      )}

      <div className="space-y-3">
        {campaigns.map((c: any) => (
          <div key={c.id} className="card px-5 py-4 flex items-center gap-4">
            <div className="p-2.5 bg-indigo-50 rounded-xl shrink-0">
              <Mail size={18} className="text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[c.status]}`}>
                  {STATUS_LABELS[c.status]}
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5">Assunto: {c.subject}</p>
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                {c.total_contacts > 0 && (
                  <>
                    <span className="flex items-center gap-1"><Send size={11} /> {c.sent_count}/{c.total_contacts}</span>
                    <span className="flex items-center gap-1"><Eye size={11} /> {c.open_count} abertos</span>
                    {c.failed_count > 0 && <span className="flex items-center gap-1 text-red-400"><XCircle size={11} /> {c.failed_count} falhas</span>}
                  </>
                )}
                {c.scheduled_for && c.status === 'scheduled' && (
                  <span className="flex items-center gap-1"><Clock size={11} /> {formatDate(c.scheduled_for)}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {c.total_contacts > 0 && (
                <button onClick={() => setStatsFor(c)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Ver relatório">
                  <BarChart2 size={16} />
                </button>
              )}
              {c.status === 'draft' && (
                <Link href={`/email/nova?id=${c.id}`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                  <Pencil size={16} />
                </Link>
              )}
              {['draft', 'completed', 'failed'].includes(c.status) && (
                <button onClick={() => deleteMutation.mutate(c.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Excluir">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {statsFor && <StatsModal campaign={statsFor} onClose={() => setStatsFor(null)} />}
    </div>
  );
}
