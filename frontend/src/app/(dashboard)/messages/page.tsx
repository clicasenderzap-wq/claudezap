'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate, statusColor, statusLabel } from '@/lib/utils';

const schema = z.object({
  contact_id: z.string().uuid('Selecione um contato'),
  content: z.string().min(1, 'Mensagem obrigatória'),
});
type FormData = z.infer<typeof schema>;

export default function MessagesPage() {
  const qc = useQueryClient();
  const [histPage, setHistPage] = useState(1);

  const { data: contacts } = useQuery({
    queryKey: ['contacts-all'],
    queryFn: () => api.get('/contacts', { params: { limit: 500 } }).then((r) => r.data.data),
  });

  const { data: history, isLoading } = useQuery({
    queryKey: ['messages', histPage],
    queryFn: () => api.get('/messages', { params: { page: histPage, limit: 20 } }).then((r) => r.data),
  });

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const content = watch('content', '');

  const sendMutation = useMutation({
    mutationFn: (d: FormData) => api.post('/messages/send', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Mensagem adicionada à fila!');
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao enviar'),
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Mensagens</h1>

      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Enviar mensagem individual</h2>
        <form onSubmit={handleSubmit((d) => sendMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Contato</label>
            <select {...register('contact_id')} className="input">
              <option value="">Selecione um contato...</option>
              {contacts?.filter((c: any) => !c.opt_out).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
              ))}
            </select>
            {errors.contact_id && <p className="text-red-500 text-xs mt-1">{errors.contact_id.message}</p>}
          </div>

          <div>
            <label className="label">Mensagem</label>
            <textarea
              {...register('content')}
              className="input resize-none"
              rows={4}
              placeholder="Digite sua mensagem... Use {{nome}} para personalizar"
            />
            <div className="flex justify-between mt-1">
              {errors.content
                ? <p className="text-red-500 text-xs">{errors.content.message}</p>
                : <span />}
              <span className="text-xs text-gray-400">{content.length} caracteres</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Variáveis disponíveis: <code className="bg-gray-100 px-1 rounded">{'{{nome}}'}</code>{' '}
              <code className="bg-gray-100 px-1 rounded">{'{{telefone}}'}</code>
            </p>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary">
            <Send size={16} /> {isSubmitting ? 'Enviando…' : 'Enviar'}
          </button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">Histórico</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Contato', 'Mensagem', 'Status', 'Data'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
            )}
            {!isLoading && !history?.data?.length && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Nenhuma mensagem ainda</td></tr>
            )}
            {history?.data?.map((m: any) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{m.Contact?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{m.content}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${statusColor(m.status)}`}>{statusLabel(m.status)}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(m.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {history?.total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
            <span>Página {histPage} de {Math.ceil(history.total / 20)}</span>
            <div className="flex gap-2">
              <button disabled={histPage === 1} onClick={() => setHistPage((p) => p - 1)} className="btn-secondary py-1 px-3">Anterior</button>
              <button disabled={histPage * 20 >= history.total} onClick={() => setHistPage((p) => p + 1)} className="btn-secondary py-1 px-3">Próxima</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
