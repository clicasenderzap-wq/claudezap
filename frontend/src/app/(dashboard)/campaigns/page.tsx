'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Megaphone, Check, RefreshCw, Trash2, Plus, History,
  X, Smartphone, BarChart2, Send, CheckCircle2, XCircle, Clock,
  ChevronRight, Timer, Repeat2, Tag, Users, CalendarClock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(1, 'Obrigatório'),
  message_template: z.string().min(1, 'Obrigatório'),
  delay_ms: z.number().min(1000).default(5000),
  rotate_every: z.number().min(1).default(10),
  include_optout: z.boolean().default(true),
  scheduled_for: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const DELAY_PRESETS = [
  { label: '3s', value: 3000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '15s', value: 15000 },
  { label: '30s', value: 30000 },
  { label: '60s', value: 60000 },
];

type Tab = 'history' | 'new';

const STATUS_STYLE: Record<string, string> = {
  sent: 'bg-green-100 text-green-700',
  delivered: 'bg-brand-100 text-brand-700',
  failed: 'bg-red-100 text-red-700',
  queued: 'bg-blue-100 text-blue-700',
  pending: 'bg-gray-100 text-gray-600',
};
const STATUS_LABEL: Record<string, string> = {
  sent: 'Enviado', delivered: 'Entregue', failed: 'Falhou',
  queued: 'Na fila', pending: 'Pendente',
};
const CAMPAIGN_STATUS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', running: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700', paused: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
};
const CAMPAIGN_LABEL: Record<string, string> = {
  draft: 'Rascunho', running: 'Enviando', scheduled: 'Agendada',
  completed: 'Concluída', paused: 'Pausada', failed: 'Falhou',
};

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('history');
  const [contactMode, setContactMode] = useState<'individual' | 'tag'>('individual');
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [histPage, setHistPage] = useState(1);
  const [detailCampaign, setDetailCampaign] = useState<any>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [msgFilter, setMsgFilter] = useState<string>('all');

  const { data: waAccounts = [] } = useQuery<any[]>({
    queryKey: ['wa-accounts'],
    queryFn: () => api.get('/whatsapp/accounts').then((r) => r.data),
    refetchInterval: 10000,
  });
  const connectedAccounts = waAccounts.filter((a: any) => a.status === 'connected');

  const { data: contacts } = useQuery({
    queryKey: ['contacts-all'],
    queryFn: () => api.get('/contacts', { params: { limit: 1000 } }).then((r) => r.data.data),
  });

  const { data: tagsData = [] } = useQuery<{ tag: string; count: number }[]>({
    queryKey: ['contact-tags'],
    queryFn: () => api.get('/contacts/tags').then((r) => r.data),
  });

  const { data: campaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['campaigns', histPage],
    queryFn: () => api.get('/campaigns', { params: { page: histPage, limit: 10 } }).then((r) => r.data),
  });

  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { delay_ms: 5000, rotate_every: 10, include_optout: true },
  });

  const template = watch('message_template', '');
  const includeOptout = watch('include_optout', true);
  const delayMs = watch('delay_ms', 5000);
  const rotateEvery = watch('rotate_every', 10);

  const sendMutation = useMutation({
    mutationFn: (d: FormData & { contact_ids?: string[]; tags?: string[]; account_ids: string[] }) =>
      api.post('/messages/campaign', d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      const isScheduled = res.data.campaign?.status === 'scheduled';
      if (isScheduled) {
        toast.success(`Campanha agendada! ${res.data.queued} mensagens serão enviadas no horário configurado.`);
      } else {
        toast.success(`Campanha criada! ${res.data.queued} mensagens na fila.`);
      }
      reset(); setSelected([]); setSelectedTags([]); setSelectedAccounts([]); setTab('history');
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

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ['campaign-detail', detailCampaign?.id],
    queryFn: () => api.get(`/campaigns/${detailCampaign!.id}/messages`).then((r) => r.data),
    enabled: !!detailCampaign,
    refetchInterval: detailCampaign ? 5000 : false,
  });

  function toggleContact(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }
  function toggleAll() {
    const active = filtered.filter((c: any) => !c.opt_out).map((c: any) => c.id);
    setSelected(selected.length === active.length ? [] : active);
  }
  function toggleTag(tag: string) {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }
  function toggleAccount(id: string) {
    setSelectedAccounts((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  const tagContactCount = selectedTags.reduce((sum, tag) => {
    const t = tagsData.find((d) => d.tag === tag);
    return sum + (t?.count ?? 0);
  }, 0);

  function onSubmit(data: FormData) {
    if (contactMode === 'tag') {
      if (!selectedTags.length) return toast.error('Selecione pelo menos uma tag');
    } else {
      if (!selected.length) return toast.error('Selecione pelo menos um contato');
    }
    if (!connectedAccounts.length) return toast.error('Nenhum número WhatsApp conectado.');
    if (data.scheduled_for && new Date(data.scheduled_for) <= new Date()) {
      return toast.error('O horário agendado deve ser no futuro');
    }
    const payload =
      contactMode === 'tag'
        ? { ...data, tags: selectedTags, account_ids: selectedAccounts, rotate_every: data.rotate_every }
        : { ...data, contact_ids: selected, account_ids: selectedAccounts, rotate_every: data.rotate_every };
    sendMutation.mutate(payload);
  }

  const filtered = (contacts ?? []).filter(
    (c: any) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );
  const activeFiltered = filtered.filter((c: any) => !c.opt_out);
  const previewName = contacts?.find((c: any) => selected[0] === c.id)?.name ?? 'João';
  const preview = template
    .replace(/\{\{nome\}\}/gi, previewName)
    .replace(/\{\{name\}\}/gi, previewName)
    + (includeOptout ? '\n\nPara sair desta lista, responda: SAIR' : '');

  const filteredMessages = (detail?.messages ?? []).filter((m: any) =>
    msgFilter === 'all' ? true : m.status === msgFilter
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
        <div className="flex gap-2">
          <button onClick={() => setTab('history')} className={`btn ${tab === 'history' ? 'btn-primary' : 'btn-secondary'}`}>
            <History size={16} /> Histórico
          </button>
          <button onClick={() => setTab('new')} className={`btn ${tab === 'new' ? 'btn-primary' : 'btn-secondary'}`}>
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
                  <td className="px-4 py-3 max-w-[160px]">
                    <button
                      onClick={() => { setDetailCampaign(c); setMsgFilter('all'); }}
                      className="font-medium text-brand-600 hover:text-brand-800 truncate flex items-center gap-1 text-left"
                    >
                      {c.name} <ChevronRight size={13} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {c.status === 'scheduled' && c.scheduled_for
                      ? <span className="flex items-center gap-1 text-purple-600 font-medium"><CalendarClock size={12} />{formatDate(c.scheduled_for)}</span>
                      : formatDate(c.createdAt ?? c.created_at)}
                  </td>
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
                      <button
                        onClick={() => { if (confirm(`Reenviar campanha "${c.name}"?`)) resendMutation.mutate(c.id); }}
                        title="Reenviar"
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
              {/* Delay entre mensagens */}
              <div>
                <label className="label flex items-center gap-1.5"><Timer size={13} /> Tempo entre mensagens</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {DELAY_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setValue('delay_ms', p.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${delayMs === p.value ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <input
                      {...register('delay_ms', { valueAsNumber: true })}
                      type="number" min={1000} step={500}
                      className="input w-24 py-1.5 text-sm"
                      placeholder="custom"
                    />
                    <span className="text-xs text-gray-400">ms</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Atual: <strong>{(delayMs / 1000).toFixed(1)}s</strong> entre cada mensagem. Recomendado: 5s+
                </p>
              </div>

              {/* Rotação de número */}
              {connectedAccounts.length > 1 && (
                <div>
                  <label className="label flex items-center gap-1.5"><Repeat2 size={13} /> Trocar número a cada</label>
                  <div className="flex items-center gap-3 mt-1">
                    <input
                      {...register('rotate_every', { valueAsNumber: true })}
                      type="range" min={1} max={50} step={1}
                      className="flex-1 accent-brand-600"
                    />
                    <span className="font-semibold text-gray-800 w-28 text-sm">
                      {rotateEvery === 1 ? 'cada msg' : `${rotateEvery} mensagens`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {rotateEvery === 1
                      ? 'Alterna o número a cada mensagem enviada'
                      : `Envia ${rotateEvery} mensagens pelo mesmo número antes de trocar`}
                  </p>
                </div>
              )}

              {/* Agendamento */}
              <div>
                <label className="label flex items-center gap-1.5"><CalendarClock size={13} /> Agendar disparo (opcional)</label>
                <input
                  type="datetime-local"
                  {...register('scheduled_for')}
                  className="input"
                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Deixe em branco para disparar imediatamente. Se preencher, a campanha ficará com status <strong>Agendada</strong> e disparará automaticamente no horário escolhido.
                </p>
              </div>

              {/* Opt-out */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" {...register('include_optout')} className="w-4 h-4 accent-brand-600" />
                <span className="text-sm text-gray-700">Incluir opção de saída da lista</span>
              </label>
              {includeOptout && (
                <p className="text-xs text-gray-400 -mt-2 ml-6">Será adicionado ao final: <em>"Para sair desta lista, responda: SAIR"</em></p>
              )}

              {/* Números */}
              <div>
                <label className="label flex items-center gap-1.5"><Smartphone size={13} /> Números para envio</label>
                {connectedAccounts.length === 0 ? (
                  <p className="text-xs text-red-500 mt-1">Nenhum número conectado. <a href="/whatsapp" className="underline">Conectar agora</a></p>
                ) : (
                  <div className="space-y-1.5 mt-1">
                    {connectedAccounts.map((a: any) => (
                      <label key={a.id} className="flex items-center gap-2.5 cursor-pointer text-sm">
                        <div
                          onClick={() => toggleAccount(a.id)}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer ${selectedAccounts.includes(a.id) ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`}
                        >
                          {selectedAccounts.includes(a.id) && <Check size={10} className="text-white" />}
                        </div>
                        <span className="text-gray-700 font-medium">{a.label}</span>
                        {a.phone && <span className="text-gray-400 text-xs">+{a.phone}</span>}
                        <span className="ml-auto text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Conectado</span>
                      </label>
                    ))}
                    {connectedAccounts.length > 1 && selectedAccounts.length === 0 && (
                      <p className="text-xs text-gray-400 pt-1">Nenhum selecionado = alterna entre todos automaticamente</p>
                    )}
                  </div>
                )}
              </div>

              {preview && (
                <div className="bg-brand-50 border border-brand-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-brand-700 mb-1">Preview</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{preview}</p>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isSubmitting || (contactMode === 'individual' ? !selected.length : !selectedTags.length)}
              className="btn-primary w-full"
            >
              <Megaphone size={16} />
              {isSubmitting
                ? 'Criando...'
                : contactMode === 'tag'
                  ? `Disparar para ~${tagContactCount} contatos (${selectedTags.length} tag${selectedTags.length !== 1 ? 's' : ''})`
                  : `Disparar para ${selected.length} contatos`}
            </button>
          </div>

          <div className="card overflow-hidden">
            {/* Mode toggle */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => setContactMode('individual')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 font-medium transition-colors ${contactMode === 'individual' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <Users size={14} /> Individual
                </button>
                <button
                  type="button"
                  onClick={() => setContactMode('tag')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 font-medium transition-colors ${contactMode === 'tag' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <Tag size={14} /> Por tag
                </button>
              </div>
            </div>

            {/* Tag mode */}
            {contactMode === 'tag' && (
              <div className="p-4 space-y-2">
                {tagsData.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">Nenhuma tag cadastrada nos contatos</p>
                )}
                {tagsData.map((t) => (
                  <label key={t.tag} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-all hover:bg-gray-50 border-gray-200">
                    <div
                      onClick={() => toggleTag(t.tag)}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer ${selectedTags.includes(t.tag) ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`}
                    >
                      {selectedTags.includes(t.tag) && <Check size={10} className="text-white" />}
                    </div>
                    <span className="text-sm font-semibold text-gray-800 flex-1">{t.tag}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{t.count} contatos</span>
                  </label>
                ))}
                {selectedTags.length > 0 && (
                  <p className="text-xs text-brand-600 font-semibold pt-1">
                    ~{tagContactCount} contatos selecionados via {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {/* Individual mode */}
            {contactMode === 'individual' && (
              <>
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
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.phone}</p>
                      </div>
                      {(c.tags || []).length > 0 && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full shrink-0 max-w-[80px] truncate">
                          {c.tags[0]}
                        </span>
                      )}
                      {c.opt_out && <span className="badge bg-red-100 text-red-600 ml-auto">Opt-out</span>}
                    </label>
                  ))}
                  {!filtered.length && <p className="px-4 py-8 text-center text-sm text-gray-400">Nenhum contato</p>}
                </div>
              </>
            )}
          </div>
        </form>
      )}

      {/* ── DASHBOARD DA CAMPANHA ── */}
      {detailCampaign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <BarChart2 size={20} className="text-brand-600" />
                <div>
                  <h2 className="font-semibold text-gray-900">{detailCampaign.name}</h2>
                  <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                <span>{formatDate(detailCampaign.createdAt ?? detailCampaign.created_at)}</span>
                {detailCampaign.delay_ms && <span className="flex items-center gap-1"><Timer size={11} /> {(detailCampaign.delay_ms / 1000).toFixed(0)}s entre msgs</span>}
                {detailCampaign.rotate_every > 1 && <span className="flex items-center gap-1"><Repeat2 size={11} /> troca a cada {detailCampaign.rotate_every} msgs</span>}
              </div>
                </div>
              </div>
              <button onClick={() => setDetailCampaign(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {loadingDetail ? (
              <p className="px-6 py-12 text-center text-gray-400">Carregando...</p>
            ) : (
              <>
                {/* Cards de estatísticas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-4 border-b border-gray-100">
                  {[
                    { label: 'Total', value: detail?.stats?.total ?? 0, icon: <Send size={16} />, color: 'text-gray-600 bg-gray-100' },
                    { label: 'Enviados', value: detail?.stats?.sent ?? 0, icon: <CheckCircle2 size={16} />, color: 'text-green-600 bg-green-100' },
                    { label: 'Entregues', value: detail?.stats?.delivered ?? 0, icon: <CheckCircle2 size={16} />, color: 'text-brand-600 bg-brand-100' },
                    { label: 'Falhas', value: detail?.stats?.failed ?? 0, icon: <XCircle size={16} />, color: 'text-red-600 bg-red-100' },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${s.color} mb-2`}>{s.icon}</div>
                      <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                      <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Barra de progresso */}
                {(detail?.stats?.total ?? 0) > 0 && (
                  <div className="px-6 py-3 border-b border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Taxa de entrega</span>
                      <span>{Math.round(((detail.stats.sent + detail.stats.delivered) / detail.stats.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.round(((detail.stats.sent + detail.stats.delivered) / detail.stats.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Filtros */}
                <div className="flex gap-2 px-6 py-3 border-b border-gray-100 overflow-x-auto">
                  {[
                    { key: 'all', label: `Todos (${detail?.stats?.total ?? 0})` },
                    { key: 'sent', label: `Enviados (${detail?.stats?.sent ?? 0})` },
                    { key: 'delivered', label: `Entregues (${detail?.stats?.delivered ?? 0})` },
                    { key: 'failed', label: `Falhas (${detail?.stats?.failed ?? 0})` },
                    { key: 'queued', label: `Na fila (${detail?.stats?.queued ?? 0})` },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setMsgFilter(f.key)}
                      className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap border transition-colors ${msgFilter === f.key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Tabela de mensagens */}
                <div className="overflow-y-auto flex-1 divide-y divide-gray-100 text-sm">
                  {filteredMessages.length === 0 && (
                    <p className="px-6 py-10 text-center text-gray-400">Nenhuma mensagem neste filtro</p>
                  )}
                  {filteredMessages.map((m: any) => (
                    <div key={m.id} className="px-6 py-3 flex items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-800">{m.Contact?.name ?? '—'}</p>
                        <p className="text-xs text-gray-500">{m.Contact?.phone}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`badge text-xs ${STATUS_STYLE[m.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABEL[m.status] ?? m.status}
                        </span>
                        {m.sent_at && <p className="text-xs text-gray-400 mt-0.5">{formatDate(m.sent_at)}</p>}
                        {m.status === 'failed' && m.error_message && (
                          <p className="text-xs text-red-500 mt-0.5 max-w-[200px] text-right">{m.error_message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
