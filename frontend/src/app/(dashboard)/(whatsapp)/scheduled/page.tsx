'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarClock, Clock, Trash2, CheckCircle, XCircle, AlertCircle, Send, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  contact_id: z.string().uuid('Selecione um contato'),
  content: z.string().min(1, 'Mensagem obrigatória'),
  scheduled_for: z.string().min(1, 'Data/hora obrigatória'),
  account_id: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(msg: any) {
  const isFuture = msg.scheduled_for && new Date(msg.scheduled_for) > new Date();
  if (msg.status === 'queued' && isFuture) {
    return <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full"><Clock size={11} /> Agendado</span>;
  }
  if (msg.status === 'sent' || msg.status === 'delivered') {
    return <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-0.5 rounded-full"><CheckCircle size={11} /> Enviado</span>;
  }
  if (msg.status === 'failed') {
    const cancelled = msg.error_message === 'Cancelado pelo usuário';
    return <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${cancelled ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-600'}`}>
      <XCircle size={11} /> {cancelled ? 'Cancelado' : 'Falhou'}
    </span>;
  }
  return <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-semibold px-2.5 py-0.5 rounded-full"><AlertCircle size={11} /> {msg.status}</span>;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Min datetime for the input (now + 5 min, in local ISO without seconds)
function minDatetime() {
  const d = new Date(Date.now() + 5 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ScheduledPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);

  const { data: contacts } = useQuery({
    queryKey: ['contacts-all'],
    queryFn: () => api.get('/contacts', { params: { limit: 500 } }).then((r) => r.data.data),
  });

  const { data: accounts } = useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: () => api.get('/whatsapp').then((r) => r.data),
  });

  const { data: scheduled, isLoading } = useQuery({
    queryKey: ['scheduled', page],
    queryFn: () => api.get('/messages/scheduled', { params: { page, limit: 20 } }).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const content = watch('content', '');

  const createMutation = useMutation({
    mutationFn: (d: FormData) => api.post('/messages/schedule', {
      ...d,
      // Convert local datetime-local string to ISO
      scheduled_for: new Date(d.scheduled_for).toISOString(),
      account_id: d.account_id || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduled'] });
      toast.success('Mensagem agendada com sucesso!');
      reset();
      setShowForm(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao agendar'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/messages/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduled'] });
      toast.success('Agendamento cancelado.');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao cancelar'),
  });

  const connectedAccounts = (accounts as any[])?.filter((a: any) => a.status === 'connected') ?? [];
  const pendingCount = scheduled?.data?.filter((m: any) => m.status === 'queued' && new Date(m.scheduled_for) > new Date()).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-2xl">
            <CalendarClock size={24} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Agendamentos</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {pendingCount > 0 ? `${pendingCount} mensagem${pendingCount !== 1 ? 's' : ''} aguardando envio` : 'Programa follow-ups e não perde mais uma venda'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={16} />
          Novo agendamento
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <CalendarClock size={16} className="text-blue-600" /> Agendar nova mensagem
          </h2>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Contato *</label>
                <select {...register('contact_id')} className="input">
                  <option value="">Selecione um contato...</option>
                  {(contacts as any[])?.filter((c: any) => !c.opt_out).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                  ))}
                </select>
                {errors.contact_id && <p className="text-red-500 text-xs mt-1">{errors.contact_id.message}</p>}
              </div>

              <div>
                <label className="label">Número de envio</label>
                <select {...register('account_id')} className="input">
                  <option value="">Automático (primeiro conectado)</option>
                  {connectedAccounts.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.label}{a.phone ? ` — ${a.phone}` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Data e hora do envio *</label>
              <input
                {...register('scheduled_for')}
                type="datetime-local"
                className="input"
                min={minDatetime()}
              />
              {errors.scheduled_for && <p className="text-red-500 text-xs mt-1">{errors.scheduled_for.message}</p>}
            </div>

            <div>
              <label className="label">Mensagem *</label>
              <textarea
                {...register('content')}
                className="input resize-none"
                rows={4}
                placeholder="Digite sua mensagem... Use {{nome}} para personalizar com o nome do contato"
              />
              <div className="flex justify-between mt-1">
                {errors.content
                  ? <p className="text-red-500 text-xs">{errors.content.message}</p>
                  : <span className="text-xs text-gray-400">Use {'{{nome}}'} e {'{{telefone}}'} para personalizar</span>}
                <span className="text-xs text-gray-400">{content.length} caracteres</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                <CalendarClock size={15} />
                {isSubmitting ? 'Agendando...' : 'Agendar mensagem'}
              </button>
              <button
                type="button"
                onClick={() => { reset(); setShowForm(false); }}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Todos os agendamentos</h2>
          <span className="text-xs text-gray-400">{scheduled?.total ?? 0} no total</span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Carregando...</div>
        ) : !scheduled?.data?.length ? (
          <div className="py-16 text-center">
            <CalendarClock size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum agendamento ainda</p>
            <p className="text-gray-400 text-sm mt-1">Clique em "Novo agendamento" para começar</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {scheduled.data.map((msg: any) => {
                const isPending = msg.status === 'queued' && new Date(msg.scheduled_for) > new Date();
                return (
                  <div key={msg.id} className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        {statusBadge(msg)}
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={11} />
                          {fmtDate(msg.scheduled_for)}
                        </span>
                      </div>
                      <p className="font-semibold text-sm text-gray-800">
                        {msg.Contact?.name ?? '—'}
                        <span className="font-normal text-gray-400 ml-2">{msg.Contact?.phone}</span>
                      </p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{msg.content}</p>
                      {msg.status === 'failed' && msg.error_message && msg.error_message !== 'Cancelado pelo usuário' && (
                        <p className="text-xs text-red-500 mt-1">Erro: {msg.error_message}</p>
                      )}
                    </div>
                    {isPending && (
                      <button
                        onClick={() => {
                          if (confirm('Cancelar este agendamento?')) cancelMutation.mutate(msg.id);
                        }}
                        className="shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Cancelar agendamento"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {scheduled.total > 20 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-sm">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-gray-500 disabled:opacity-40 hover:text-gray-700"
                >← Anterior</button>
                <span className="text-gray-400">Página {page} de {Math.ceil(scheduled.total / 20)}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(scheduled.total / 20)}
                  className="text-gray-500 disabled:opacity-40 hover:text-gray-700"
                >Próxima →</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-sm text-blue-800 space-y-2">
        <p className="font-semibold flex items-center gap-2"><Send size={14} /> Como funciona</p>
        <ul className="space-y-1 text-blue-700 list-disc list-inside">
          <li>A mensagem é enviada automaticamente no horário marcado — sem precisar estar logado.</li>
          <li>Use <code className="bg-blue-100 px-1 rounded">{'{{nome}}'}</code> na mensagem para personalizar com o nome do contato.</li>
          <li>Você pode cancelar um agendamento pendente a qualquer momento antes do horário.</li>
          <li>O bot de atendimento também pode criar agendamentos automaticamente durante conversas.</li>
        </ul>
      </div>
    </div>
  );
}
