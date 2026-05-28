'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Plus, Trash2, BarChart2, Send, Clock, CheckCircle2, XCircle, Eye, Pencil, Copy, CalendarX, RotateCcw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
    refetchInterval: campaign.status === 'running' ? 5000 : false,
  });

  const msgs = data?.messages ?? [];
  const sent = msgs.filter((m: any) => ['sent', 'opened'].includes(m.status)).length;
  const opened = msgs.filter((m: any) => m.status === 'opened').length;
  const failed = msgs.filter((m: any) => m.status === 'failed').length;
  const queued = msgs.filter((m: any) => m.status === 'queued').length;
  const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">{campaign.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Assunto: {campaign.subject}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        {isLoading ? (
          <p className="text-center py-10 text-gray-400">Carregando...</p>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-3 p-5">
              {[
                { label: 'Total', value: campaign.total_contacts, icon: Mail, color: 'text-gray-600', bg: 'bg-gray-50' },
                { label: 'Na fila', value: queued, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                { label: 'Entregues', value: sent, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Abertos', value: opened, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Taxa abertura', value: `${openRate}%`, icon: BarChart2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                  <Icon size={18} className={`mx-auto mb-1 ${color}`} />
                  <p className="text-xl font-black text-gray-900">{value}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>
            {failed > 0 && (
              <div className="mx-5 mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 flex items-center gap-2">
                <XCircle size={13} /> {failed} falha{failed !== 1 ? 's' : ''} de entrega
              </div>
            )}
            <div className="overflow-y-auto flex-1 px-5 pb-5">
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
                      <td className="py-2 text-gray-700 text-xs">{m.to_name ? `${m.to_name} <${m.to_email}>` : m.to_email}</td>
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
  const router = useRouter();
  const [statsFor, setStatsFor] = useState<any>(null);

  const { data: senderData } = useQuery<{ sender_email: string | null; sender_email_verified: boolean }>({
    queryKey: ['sender-email'],
    queryFn: () => api.get('/auth/sender-email').then((r) => r.data),
  });

  const senderOk = senderData?.sender_email_verified === true;

  const { data: campaigns = [], isLoading } = useQuery<any[]>({
    queryKey: ['email-campaigns'],
    queryFn: () => api.get('/email/campaigns').then((r) => r.data),
    refetchInterval: (query) => {
      const data = query.state.data as any[] | undefined;
      if (!data) return false;
      return data.some((c) => ['running', 'scheduled'].includes(c.status)) ? 5000 : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/email/campaigns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['email-campaigns'] }); toast.success('Campanha excluída'); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao excluir'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/email/campaigns/${id}/duplicate`).then((r) => r.data),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success('Campanha duplicada!');
      router.push(`/email/nova?id=${data.id}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao duplicar'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/email/campaigns/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['email-campaigns'] }); toast.success('Agendamento cancelado — campanha voltou para rascunho'); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao cancelar'),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/email/campaigns/${id}/resend-unopened`).then((r) => r.data),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success(`Reenvio iniciado para ${data.total} contatos que não abriram!`);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao reenviar'),
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

      {/* Banner: email de remetente não verificado */}
      {senderData !== undefined && !senderOk && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-amber-800">Email de remetente não configurado</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {senderData.sender_email
                ? `O email ${senderData.sender_email} ainda não foi verificado. Verifique sua caixa de entrada ou reenvie o link.`
                : 'Configure e verifique um email de remetente antes de enviar campanhas.'}
            </p>
          </div>
          <Link
            href="/email/configuracoes"
            className="shrink-0 text-xs font-semibold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            Configurar
          </Link>
        </div>
      )}

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
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[c.status]}`}>
                  {STATUS_LABELS[c.status]}
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5">Assunto: {c.subject}</p>
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-400 flex-wrap">
                {c.total_contacts > 0 && (
                  <>
                    <span className="flex items-center gap-1"><Send size={11} /> {c.sent_count}/{c.total_contacts} enviados</span>
                    <span className="flex items-center gap-1"><Eye size={11} /> {c.open_count} abertos</span>
                    {c.failed_count > 0 && <span className="flex items-center gap-1 text-red-400"><XCircle size={11} /> {c.failed_count} falhas</span>}
                  </>
                )}
                {c.scheduled_for && c.status === 'scheduled' && (
                  <span className="flex items-center gap-1 text-yellow-600"><Clock size={11} /> Agendado: {formatDate(c.scheduled_for)}</span>
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
              {c.status === 'scheduled' && (
                <button
                  onClick={() => { if (confirm('Cancelar agendamento e voltar para rascunho?')) cancelMutation.mutate(c.id); }}
                  disabled={cancelMutation.isPending}
                  className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg disabled:opacity-40"
                  title="Cancelar agendamento"
                >
                  <CalendarX size={16} />
                </button>
              )}
              {c.status === 'completed' && c.sent_count > c.open_count && (
                <button
                  onClick={() => {
                    const notOpened = c.sent_count - c.open_count;
                    if (confirm(`Reenviar para ${notOpened} contato${notOpened !== 1 ? 's' : ''} que não abriram este email?`)) {
                      resendMutation.mutate(c.id);
                    }
                  }}
                  disabled={resendMutation.isPending}
                  className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg disabled:opacity-40"
                  title="Reenviar para quem não abriu"
                >
                  <RotateCcw size={16} />
                </button>
              )}
              {!['running'].includes(c.status) && (
                <button
                  onClick={() => duplicateMutation.mutate(c.id)}
                  disabled={duplicateMutation.isPending}
                  className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg disabled:opacity-40"
                  title="Duplicar campanha"
                >
                  <Copy size={16} />
                </button>
              )}
              {['draft', 'completed', 'failed'].includes(c.status) && (
                <button
                  onClick={() => { if (confirm(`Excluir "${c.name}"?`)) deleteMutation.mutate(c.id); }}
                  disabled={deleteMutation.isPending}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  title="Excluir"
                >
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
