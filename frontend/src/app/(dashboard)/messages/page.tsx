'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, RefreshCw, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate, statusColor, statusLabel } from '@/lib/utils';

const schema = z.object({
  contact_id: z.string().uuid('Selecione um contato'),
  content: z.string().min(1, 'Mensagem obrigatória'),
});
type FormData = z.infer<typeof schema>;

function ContactPicker({
  contacts,
  value,
  onChange,
  error,
}: {
  contacts: any[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = contacts.find((c) => c.id === value);

  const filtered = search.trim()
    ? contacts.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search.replace(/\D/g, ''))
      )
    : contacts;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function select(id: string) {
    onChange(id);
    setSearch('');
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setSearch('');
  }

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen((o) => !o)}
        className={`input flex items-center justify-between cursor-pointer gap-2 ${error ? 'border-red-400' : ''}`}
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected ? `${selected.name} — ${selected.phone}` : 'Selecione um contato...'}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selected && (
            <button type="button" onClick={clear} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
          <Search size={14} className="text-gray-400" />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <ul className="max-h-52 overflow-y-auto text-sm">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-gray-400 text-center">Nenhum contato encontrado</li>
            )}
            {filtered.map((c) => (
              <li
                key={c.id}
                onClick={() => select(c.id)}
                className={`px-4 py-2.5 cursor-pointer hover:bg-gray-50 ${value === c.id ? 'bg-primary-50 font-medium' : ''}`}
              >
                <span className="text-gray-900">{c.name}</span>
                <span className="text-gray-400 ml-2 text-xs">{c.phone}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  const qc = useQueryClient();
  const [histPage, setHistPage] = useState(1);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-all'],
    queryFn: () => api.get('/contacts', { params: { limit: 500 } }).then((r) => r.data.data),
  });

  const { data: history, isLoading } = useQuery({
    queryKey: ['messages', histPage],
    queryFn: () => api.get('/messages', { params: { page: histPage, limit: 20 } }).then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const contactId = watch('contact_id', '');
  const content = watch('content', '');

  const activeContacts = (contacts as any[]).filter((c: any) => !c.opt_out);

  const sendMutation = useMutation({
    mutationFn: (d: FormData) => api.post('/messages/send', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Mensagem adicionada à fila!');
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao enviar'),
  });

  async function resendMessage(msg: any) {
    if (!msg.contact_id || !msg.content) return;
    setResendingId(msg.id);
    try {
      await api.post('/messages/send', { contact_id: msg.contact_id, content: msg.content });
      qc.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Mensagem reenviada!');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao reenviar');
    } finally {
      setResendingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Mensagens</h1>

      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Enviar mensagem individual</h2>
        <form onSubmit={handleSubmit((d) => sendMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Contato</label>
            <input type="hidden" {...register('contact_id')} />
            <ContactPicker
              contacts={activeContacts}
              value={contactId}
              onChange={(id) => setValue('contact_id', id, { shouldValidate: true })}
              error={errors.contact_id?.message}
            />
            {errors.contact_id && (
              <p className="text-red-500 text-xs mt-1">{errors.contact_id.message}</p>
            )}
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
              {errors.content ? (
                <p className="text-red-500 text-xs">{errors.content.message}</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-gray-400">{content.length} caracteres</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Variáveis disponíveis:{' '}
              <code className="bg-gray-100 px-1 rounded">{'{{nome}}'}</code>{' '}
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
              {['Contato', 'Mensagem', 'Status', 'Data', ''].map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!isLoading && !history?.data?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Nenhuma mensagem ainda
                </td>
              </tr>
            )}
            {history?.data?.map((m: any) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{m.Contact?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{m.content}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${statusColor(m.status)}`}>{statusLabel(m.status)}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {formatDate(m.created_at)}
                </td>
                <td className="px-4 py-3">
                  {m.status === 'failed' && !m.campaign_id && (
                    <button
                      onClick={() => resendMessage(m)}
                      disabled={resendingId === m.id}
                      title="Reenviar mensagem"
                      className="btn-secondary py-1 px-2 text-xs flex items-center gap-1"
                    >
                      <RefreshCw size={12} className={resendingId === m.id ? 'animate-spin' : ''} />
                      {resendingId === m.id ? 'Reenviando…' : 'Reenviar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {history?.total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
            <span>
              Página {histPage} de {Math.ceil(history.total / 20)}
            </span>
            <div className="flex gap-2">
              <button
                disabled={histPage === 1}
                onClick={() => setHistPage((p) => p - 1)}
                className="btn-secondary py-1 px-3"
              >
                Anterior
              </button>
              <button
                disabled={histPage * 20 >= history.total}
                onClick={() => setHistPage((p) => p + 1)}
                className="btn-secondary py-1 px-3"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
