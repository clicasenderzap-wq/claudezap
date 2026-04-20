'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Megaphone, Check, RefreshCw, Trash2, Plus, History, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate, statusColor, statusLabel } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(1, 'Obrigatório'),
  message_template: z.string().min(1, 'Obrigatório'),
  delay_ms: z.number().min(1000).default(3000),
});
type FormData = z.infer<typeof schema>;

type Tab = 'history' | 'new';

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('history');
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [histPage, setHistPage] = useState(1);
  const [detailCampaign, setDetailCampaign] = useState<any>(null);

  const { data: contacts } = useQuery({
    queryKey: ['contacts-all'],
    queryFn: () => api.get('/contacts', { params: { limit: 1000 } }).then((r) => r.data.data),
  });

  const { data: campaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['campaigns', histPage],
    queryFn: () => api.get('/campaigns', { params: { page: histPage, limit: 10 } }).then((r) => r.data),
  });

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { delay_ms: 3000 },
  });

  const template = watch('message_template', '');

  const sendMutation = useMutation({
    mutationFn: (d: FormData & { contact_ids: string[] }) => api.post('/messages/campaign', d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`Campanha criada! ${res.data.queued} mensagens na fila.`);
      reset(); setSelected([]); setTab('history');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao criar campanha'),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/campaigns/${id}/resend`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(`Reenvio iniciado! ${res.data.queued} mensagens na fila.`);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao reenviar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campanha removida'); },
  });

  const { data: campaignMessages, isLoading: loadingMessages } = useQuery({
    queryKey: ['campaign-messages', detailCampaign?.id],
    queryFn: () => api.get(`/campaigns/${detailCampaign!.id}/messages`).then((r) => r.data),
    enabled: !!detailCampaign,
  });

  function toggleContact(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleAll() {
    const active = filtered.filter((c: any) => !c.opt_out).map((c: any) => c.id);
    setSelected(selected.length === active.length ? [] : active);
  }

  function onSubmit(data: FormData) {
    if (!selected.length) return toast.error('Selecione pelo menos um contato');
    sendMutation.mutate({ ...data, contact_ids: selected });
  }

  const filtered = (contacts ?? []).filter(
    (c: any) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );
  const activeFiltered = filtered.filter((c: any) => !c.opt_out);
  const previewName = contacts?.find((c: any) => selected[0] === c.id)?.name ?? 'João';
  const preview = template.replace(/\{\{nome\}\}/gi, previewName).replace(/\{\{name\}\}/gi, previewName);

  const CAMPAIGN_STATUS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    running: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
  };
  const CAMPAIGN_LABEL: Record<string, string> = {
    draft: 'Rascunho', running: 'Enviando', completed: 'Concluída',
    paused: 'Pausada', failed: 'Falhou',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('history')}
            className={`btn ${tab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <History size={16} /> Histórico
          </button>
          <button
            onClick={() => setTab('new')}
            className={`btn ${tab === 'new' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Plus size={16} /> Nova campanha
          </button>
        </div>
      </div>

      {/* ── ABA HISTÓRICO ── */}
      {tab === 'history' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Nome', 'Data', 'Contatos', 'Enviados', 'Falhas', 'Status', 'Ações'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingCampaigns && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
              )}
              {!loadingCampaigns && !campaigns?.data?.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="text-gray-400 mb-3">Nenhuma campanha ainda</p>
                    <button onClick={() => setTab('new')} className="btn-primary">
                      <Plus size={16} /> Criar primeira campanha
                    </button>
                  </td>
                </tr>
              )}
              {campaigns?.data?.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{c.total_contacts}</td>
                  <td className="px-4 py-3 text-center text-green-600 font-medium">{c.sent_count}</td>
                  <td className="px-4 py-3 text-center text-red-500">{c.failed_count}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${CAMPAIGN_STATUS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {CAMPAIGN_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {c.failed_count > 0 && (
                        <button
                          onClick={() => setDetailCampaign(c)}
                          title="Ver erros"
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <AlertCircle size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm(`Reenviar campanha "${c.name}"?`)) resendMutation.mutate(c.id); }}
                        title="Reenviar para os mesmos contatos"
                        className="text-gray-400 hover:text-brand-600 transition-colors"
                        disabled={resendMutation.isPending}
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button
                        onClick={() => { if (confirm('Remover campanha?')) deleteMutation.mutate(c.id); }}
                        title="Remover"
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {campaigns?.total > 10 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
              <span>Página {histPage} de {Math.ceil(campaigns.total / 10)}</span>
              <div className="flex gap-2">
                <button disabled={histPage === 1} onClick={() => setHistPage((p) => p - 1)} className="btn-secondary py-1 px-3">Anterior</button>
                <button disabled={histPage * 10 >= campaigns.total} onClick={() => setHistPage((p) => p + 1)} className="btn-secondary py-1 px-3">Próxima</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ABA NOVA CAMPANHA ── */}
      {tab === 'new' && (
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="card p-6 space-y-4">
              <h2 className="text-base font-semibold text-gray-800">Configuração</h2>
              <div>
                <label className="label">Nome da campanha *</label>
                <input {...register('name')} className="input" placeholder="Ex: Prospecção Abril" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Mensagem *</label>
                <textarea
                  {...register('message_template')}
                  className="input resize-none" rows={5}
                  placeholder="Olá {{nome}}, temos uma novidade para você!"
                />
                {errors.message_template && <p className="text-red-500 text-xs mt-1">{errors.message_template.message}</p>}
                <p className="text-xs text-gray-400 mt-1">Variáveis: <code className="bg-gray-100 px-1 rounded">{'{{nome}}'}</code></p>
              </div>
              <div>
                <label className="label">Delay entre mensagens (ms)</label>
                <input {...register('delay_ms', { valueAsNumber: true })} type="number" min={1000} step={500} className="input" />
                <p className="text-xs text-gray-400 mt-1">Mínimo: 1000ms. Recomendado: 3000ms+</p>
              </div>
              {preview && (
                <div className="bg-brand-50 border border-brand-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-brand-700 mb-1">Preview</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{preview}</p>
                </div>
              )}
            </div>
            <button type="submit" disabled={isSubmitting || !selected.length} className="btn-primary w-full">
              <Megaphone size={16} />
              {isSubmitting ? 'Criando...' : `Disparar para ${selected.length} contatos`}
            </button>
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-gray-800">{selected.length} selecionados</span>
              <button type="button" onClick={toggleAll} className="btn-secondary py-1 px-3 text-xs">
                {selected.length === activeFiltered.length ? 'Desmarcar todos' : 'Marcar todos'}
              </button>
            </div>
            <div className="px-3 py-2 border-b border-gray-100">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="input py-1.5 text-sm" />
            </div>
            <div className="overflow-y-auto max-h-[420px] divide-y divide-gray-100">
              {filtered.map((c: any) => (
                <label key={c.id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 ${c.opt_out ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected.includes(c.id) ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`}
                    onClick={() => !c.opt_out && toggleContact(c.id)}
                  >
                    {selected.includes(c.id) && <Check size={10} className="text-white" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.phone}</p>
                  </div>
                  {c.opt_out && <span className="badge bg-red-100 text-red-600 ml-auto">Opt-out</span>}
                </label>
              ))}
              {!filtered.length && <p className="px-4 py-8 text-center text-sm text-gray-400">Nenhum contato</p>}
            </div>
          </div>
        </form>
      )}
      {/* Modal — detalhes da campanha */}
      {detailCampaign && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">{detailCampaign.name} — mensagens com falha</h2>
              <button onClick={() => setDetailCampaign(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100 text-sm">
              {loadingMessages && <p className="px-5 py-6 text-gray-400 text-center">Carregando...</p>}
              {campaignMessages?.filter((m: any) => m.status === 'failed').map((m: any) => (
                <div key={m.id} className="px-5 py-3">
                  <p className="font-medium text-gray-800">{m.Contact?.name ?? '—'} <span className="font-normal text-gray-500">{m.Contact?.phone}</span></p>
                  <p className="text-red-500 text-xs mt-0.5">{m.error_message || 'Erro desconhecido'}</p>
                </div>
              ))}
              {!loadingMessages && campaignMessages?.filter((m: any) => m.status === 'failed').length === 0 && (
                <p className="px-5 py-6 text-gray-400 text-center">Nenhuma falha registrada</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
