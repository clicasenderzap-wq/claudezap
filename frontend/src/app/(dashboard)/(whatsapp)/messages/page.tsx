'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Send, RefreshCw, Search, X, User, Phone, WifiOff, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate, statusColor, statusLabel } from '@/lib/utils';

const schema = z.object({
  contact_id: z.string().optional(),
  phone: z.string().optional(),
  content: z.string().min(1, 'Mensagem obrigatória'),
});
type FormData = z.infer<typeof schema>;

type Mode = 'contact' | 'phone';

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
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('contact');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const { data: waAccounts = [] } = useQuery<any[]>({
    queryKey: ['wa-accounts'],
    queryFn: () => api.get('/whatsapp/accounts').then((r) => r.data),
    refetchInterval: 8000,
  });

  const connectedAccounts = (waAccounts as any[]).filter((a) => a.status === 'connected');

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-all'],
    queryFn: () => api.get('/contacts', { params: { limit: 500 } }).then((r) => r.data.data),
  });

  const { data: desktopStatus } = useQuery<{ desktop_connected: boolean }>({
    queryKey: ['desktop-status'],
    queryFn: () => api.get('/whatsapp/desktop-status').then((r) => r.data),
    refetchInterval: 8000,
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
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const contactId = watch('contact_id', '');
  const content = watch('content', '');

  const activeContacts = (contacts as any[]).filter((c: any) => !c.opt_out);

  function switchMode(next: Mode) {
    setMode(next);
    setValue('contact_id', '');
    setValue('phone', '');
  }

  const sendMutation = useMutation({
    mutationFn: (payload: object) => api.post('/messages/send', payload),
    onSuccess: (resp: any) => {
      qc.invalidateQueries({ queryKey: ['messages'] });
      const count = resp?.data?.queued;
      toast.success(count > 1 ? `${count} mensagens adicionadas à fila!` : 'Mensagem adicionada à fila!');
      reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao enviar'),
  });

  function onSubmit(data: FormData) {
    const accountPayload = selectedAccountId ? { account_id: selectedAccountId } : {};
    if (mode === 'contact') {
      if (!data.contact_id) {
        setError('contact_id', { message: 'Selecione um contato' });
        return;
      }
      sendMutation.mutate({ contact_id: data.contact_id, content: data.content, ...accountPayload });
    } else {
      const raw = data.phone || '';
      const parts = raw.split(';').map((p) => p.trim()).filter(Boolean);
      const hasValid = parts.some((p) => p.replace(/\D/g, '').length >= 10);
      if (!parts.length || !hasValid) {
        setError('phone', { message: 'Informe o número com DDD (ex: 11999990000)' });
        return;
      }
      sendMutation.mutate({ phone: raw, content: data.content, ...accountPayload });
    }
  }

  async function retryMessage(msg: any) {
    setRetryingId(msg.id);
    try {
      await api.post(`/messages/${msg.id}/retry`);
      qc.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Mensagem reenfileirada para reenvio!');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao reenviar');
    } finally {
      setRetryingId(null);
    }
  }

  const [retryingAll, setRetryingAll] = useState(false);
  async function retryAllStuck() {
    setRetryingAll(true);
    try {
      const resp = await api.post('/messages/retry-stuck');
      qc.invalidateQueries({ queryKey: ['messages'] });
      const n = resp.data.retried;
      toast.success(n > 0 ? `${n} mensagem${n !== 1 ? 's' : ''} reenfileirada${n !== 1 ? 's' : ''} para reenvio!` : 'Nenhuma mensagem travada encontrada.');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao reenviar mensagens');
    } finally {
      setRetryingAll(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Mensagens</h1>

      {desktopStatus && !desktopStatus.desktop_connected && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <WifiOff size={18} className="text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">App "Clica Aí" desconectado</p>
            <p className="text-xs text-red-700 mt-0.5">
              Mensagens serão enfileiradas mas <strong>não enviadas</strong> enquanto o app não estiver aberto e conectado.
            </p>
          </div>
        </div>
      )}

      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Enviar mensagem individual</h2>

        {/* Toggle de modo */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit mb-5">
          <button
            type="button"
            onClick={() => switchMode('contact')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'contact'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <User size={14} /> Selecionar contato
          </button>
          <button
            type="button"
            onClick={() => switchMode('phone')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${
              mode === 'phone'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Phone size={14} /> Digitar número
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Seletor de número remetente — só aparece quando há 2+ números conectados */}
          {connectedAccounts.length >= 2 && (
            <div>
              <label className="label">Enviar de qual número</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAccountId('')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    selectedAccountId === ''
                      ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300 hover:text-gray-900'
                  }`}
                >
                  <Smartphone size={13} />
                  Qualquer conectado
                </button>
                {connectedAccounts.map((acc: any) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      selectedAccountId === acc.id
                        ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300 hover:text-gray-900'
                    }`}
                  >
                    <Smartphone size={13} />
                    <span>{acc.label}</span>
                    {acc.phone && <span className={`text-xs ${selectedAccountId === acc.id ? 'text-primary-100' : 'text-gray-400'}`}>+{acc.phone}</span>}
                  </button>
                ))}
              </div>
              {selectedAccountId === '' && (
                <p className="text-xs text-gray-400 mt-1">O sistema vai escolher automaticamente um número disponível.</p>
              )}
            </div>
          )}

          {mode === 'contact' ? (
            <div>
              <label className="label">Contato</label>
              <input type="hidden" {...register('contact_id')} />
              <ContactPicker
                contacts={activeContacts}
                value={contactId || ''}
                onChange={(id) => setValue('contact_id', id, { shouldValidate: true })}
                error={errors.contact_id?.message}
              />
              {errors.contact_id && (
                <p className="text-red-500 text-xs mt-1">{errors.contact_id.message}</p>
              )}
            </div>
          ) : (
            <div>
              <label className="label">Número de telefone</label>
              <input
                {...register('phone')}
                type="text"
                className={`input ${errors.phone ? 'border-red-400' : ''}`}
                placeholder="Ex: 11999990000 ou vários separados por ; (11999990000; 21888880000)"
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Separe múltiplos números com <strong>;</strong> (ponto e vírgula). Código do país opcional — Brasil (+55) é assumido automaticamente.
              </p>
            </div>
          )}

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
            {mode === 'contact' && (
              <p className="text-xs text-gray-400 mt-1">
                Variáveis disponíveis:{' '}
                <code className="bg-gray-100 px-1 rounded">{'{{nome}}'}</code>{' '}
                <code className="bg-gray-100 px-1 rounded">{'{{telefone}}'}</code>
              </p>
            )}
          </div>

          <button type="submit" disabled={isSubmitting || sendMutation.isPending} className="btn-primary">
            <Send size={16} /> {isSubmitting || sendMutation.isPending ? 'Enviando…' : 'Enviar'}
          </button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Histórico</h2>
          <button
            onClick={retryAllStuck}
            disabled={retryingAll}
            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
            title="Reenfileira todas as mensagens individuais travadas em queued ou failed"
          >
            <RefreshCw size={13} className={retryingAll ? 'animate-spin' : ''} />
            {retryingAll ? 'Reenviando...' : 'Reenviar todas travadas'}
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Destinatário', 'Mensagem', 'Status', 'Data', ''].map((h, i) => (
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
                <td className="px-4 py-3 font-medium text-gray-900">
                  {m.Contact?.name ?? (m.to_phone ? (
                    <span className="text-gray-500 font-normal flex items-center gap-1">
                      <Phone size={12} className="inline" /> {m.to_phone}
                    </span>
                  ) : '—')}
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{m.content}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${statusColor(m.status)}`}>{statusLabel(m.status)}</span>
                  {m.status === 'failed' && m.error_message && (
                    <p className="text-xs text-red-500 mt-1 max-w-[160px] truncate" title={m.error_message}>
                      {m.error_message}
                    </p>
                  )}
                  {m.status === 'queued' && !m.campaign_id && (
                    <p className="text-xs text-gray-400 mt-1">Aguardando envio</p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {formatDate(m.created_at)}
                </td>
                <td className="px-4 py-3">
                  {(m.status === 'failed' || m.status === 'queued') && !m.campaign_id && (m.contact_id || m.to_phone) && (
                    <button
                      onClick={() => retryMessage(m)}
                      disabled={retryingId === m.id}
                      title={m.status === 'queued' ? 'Forçar reenvio agora' : 'Tentar novamente'}
                      className="btn-secondary py-1 px-2 text-xs flex items-center gap-1 whitespace-nowrap"
                    >
                      <RefreshCw size={12} className={retryingId === m.id ? 'animate-spin' : ''} />
                      {retryingId === m.id ? 'Reenviando…' : 'Reenviar'}
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
