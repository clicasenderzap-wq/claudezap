'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Power, MessageSquare, Settings, ChevronDown, ChevronUp, Clock, Users, AlertCircle, CheckCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  escalated: 'bg-orange-100 text-orange-700',
  closed: 'bg-gray-100 text-gray-500',
};
const STATUS_LABELS: Record<string, string> = { active: 'Em andamento', escalated: 'Aguarda humano', closed: 'Encerrada' };

function BotAccountCard({ account }: { account: any }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [convTab, setConvTab] = useState<'active' | 'escalated' | 'closed'>('active');

  const { data: config, isLoading: loadingConfig } = useQuery({
    queryKey: ['bot-config', account.id],
    queryFn: () => api.get(`/bot/accounts/${account.id}/config`).then((r) => r.data),
    enabled: open,
  });

  const { data: conversations, isLoading: loadingConv } = useQuery({
    queryKey: ['bot-conversations', account.id, convTab],
    queryFn: () => api.get(`/bot/accounts/${account.id}/conversations`, { params: { status: convTab } }).then((r) => r.data),
    enabled: open,
    refetchInterval: 15000,
  });

  const [form, setForm] = useState<Record<string, any> | null>(null);
  const liveForm = form ?? config ?? {};

  const updateMutation = useMutation({
    mutationFn: (body: object) => api.put(`/bot/accounts/${account.id}/config`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bot-config', account.id] });
      setForm(null);
      toast.success('Configuração salva!');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao salvar'),
  });

  const convMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'close' | 'reopen' }) =>
      api.put(`/bot/conversations/${id}/${action}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bot-conversations', account.id] }),
  });

  function toggleBot() {
    updateMutation.mutate({ enabled: !config?.enabled });
    toast.success(!config?.enabled ? 'Bot ativado!' : 'Bot pausado');
  }

  const isEnabled = config?.enabled ?? false;

  return (
    <div className="card overflow-hidden">
      {/* Header do número */}
      <div className="px-5 py-4 flex items-center gap-3 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className={`p-2.5 rounded-xl ${isEnabled ? 'bg-brand-100' : 'bg-gray-100'}`}>
          <Bot size={18} className={isEnabled ? 'text-brand-600' : 'text-gray-400'} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-800">{account.label}</p>
          <p className="text-xs text-gray-400">{account.phone || 'Sem número identificado'}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {isEnabled ? 'Bot ativo' : 'Bot inativo'}
        </span>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </div>

      {open && (
        <div className="border-t border-gray-100">
          {loadingConfig ? (
            <p className="p-6 text-center text-gray-400 text-sm">Carregando configuração...</p>
          ) : (
            <div className="p-5 space-y-5">
              {/* Toggle */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Bot de atendimento automático</p>
                <button onClick={toggleBot} disabled={updateMutation.isPending} className={`btn ${isEnabled ? 'btn-secondary' : 'btn-primary'} gap-2`}>
                  <Power size={14} /> {isEnabled ? 'Desativar' : 'Ativar bot'}
                </button>
              </div>

              {/* Campos de configuração */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="label">Provedor de IA</label>
                  <select className="input" value={liveForm.ai_provider ?? 'anthropic'} onChange={(e) => setForm({ ...liveForm, ai_provider: e.target.value })}>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="openai">OpenAI (GPT)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Modelo</label>
                  <select className="input" value={liveForm.ai_model ?? ''} onChange={(e) => setForm({ ...liveForm, ai_model: e.target.value })}>
                    {(liveForm.ai_provider ?? 'anthropic') === 'anthropic' ? (
                      <>
                        <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (rápido, barato)</option>
                        <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (melhor qualidade)</option>
                      </>
                    ) : (
                      <>
                        <option value="gpt-4o-mini">GPT-4o Mini (rápido, barato)</option>
                        <option value="gpt-4o">GPT-4o (melhor qualidade)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Chave de API</label>
                <input
                  type="password"
                  className="input"
                  placeholder={liveForm.ai_api_key ? '••••••••••••••••' : 'sk-ant-... ou sk-...'}
                  onChange={(e) => setForm({ ...liveForm, ai_api_key: e.target.value })}
                />
                <p className="text-xs text-gray-400 mt-1">A chave fica armazenada de forma segura e nunca é exibida completa</p>
              </div>

              <div>
                <label className="label">Prompt do sistema (personalidade do bot)</label>
                <textarea
                  className="input min-h-24 resize-none"
                  value={liveForm.system_prompt ?? ''}
                  onChange={(e) => setForm({ ...liveForm, system_prompt: e.target.value })}
                  placeholder="Você é a assistente virtual da empresa X. Seja cordial e objetivo..."
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="label">Mensagem de boas-vindas</label>
                  <textarea
                    className="input min-h-16 resize-none"
                    value={liveForm.welcome_message ?? ''}
                    onChange={(e) => setForm({ ...liveForm, welcome_message: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Mensagem ao escalar para humano</label>
                  <textarea
                    className="input min-h-16 resize-none"
                    value={liveForm.escalation_message ?? ''}
                    onChange={(e) => setForm({ ...liveForm, escalation_message: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="label">Máx. turnos antes de escalar</label>
                  <input type="number" min={1} max={50} className="input" value={liveForm.max_turns ?? 10}
                    onChange={(e) => setForm({ ...liveForm, max_turns: Number(e.target.value) })} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-brand-600" checked={liveForm.business_hours_only ?? false}
                      onChange={(e) => setForm({ ...liveForm, business_hours_only: e.target.checked })} />
                    <span className="text-sm text-gray-700">Só em horário comercial</span>
                  </label>
                </div>
                {liveForm.business_hours_only && (
                  <>
                    <div>
                      <label className="label">Início</label>
                      <select className="input" value={liveForm.start_hour ?? 8} onChange={(e) => setForm({ ...liveForm, start_hour: Number(e.target.value) })}>
                        {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Fim</label>
                      <select className="input" value={liveForm.end_hour ?? 22} onChange={(e) => setForm({ ...liveForm, end_hour: Number(e.target.value) })}>
                        {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {form && (
                <button onClick={() => updateMutation.mutate(liveForm)} disabled={updateMutation.isPending} className="btn-primary w-full">
                  Salvar configurações
                </button>
              )}

              {/* Conversas */}
              <div className="border-t border-gray-100 pt-4">
                <p className="font-semibold text-gray-800 mb-3">Conversas</p>
                <div className="flex gap-2 mb-3">
                  {(['active', 'escalated', 'closed'] as const).map((tab) => (
                    <button key={tab} onClick={() => setConvTab(tab)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${convTab === tab ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {STATUS_LABELS[tab]}
                    </button>
                  ))}
                </div>

                {loadingConv && <p className="text-sm text-gray-400 py-4 text-center">Carregando...</p>}
                {!loadingConv && (!conversations || conversations.length === 0) && (
                  <p className="text-sm text-gray-400 py-4 text-center">Nenhuma conversa {STATUS_LABELS[convTab].toLowerCase()}</p>
                )}

                <div className="space-y-2">
                  {conversations?.map((conv: any) => (
                    <div key={conv.id} className="border border-gray-200 rounded-xl p-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-800">{conv.contact_phone}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[conv.status]}`}>
                            {STATUS_LABELS[conv.status]}
                          </span>
                        </div>
                        {conv.messages?.length > 0 && (
                          <p className="text-xs text-gray-500 truncate">
                            {conv.messages[conv.messages.length - 1]?.content}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(conv.last_message_at)} · {conv.messages?.length ?? 0} mensagens</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {conv.status !== 'closed' && (
                          <button onClick={() => convMutation.mutate({ id: conv.id, action: 'close' })}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Encerrar">
                            <AlertCircle size={14} />
                          </button>
                        )}
                        {conv.status === 'closed' && (
                          <button onClick={() => convMutation.mutate({ id: conv.id, action: 'reopen' })}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Reabrir">
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BotsPage() {
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: () => api.get('/whatsapp/accounts').then((r) => r.data),
    refetchInterval: 20000,
  });

  const connected = (accounts ?? []).filter((a: any) => a.status === 'connected');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bot de Atendimento</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure um bot com IA para responder automaticamente os clientes que entrarem em contato</p>
      </div>

      {!isLoading && connected.length === 0 && (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p>Nenhum número WhatsApp conectado. <a href="/whatsapp" className="underline font-medium">Conecte um número</a> para configurar o bot.</p>
        </div>
      )}

      {isLoading && <p className="text-center py-10 text-gray-400">Carregando contas...</p>}

      <div className="space-y-4">
        {connected.map((account: any) => (
          <BotAccountCard key={account.id} account={account} />
        ))}
      </div>

      {/* Como funciona */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Como funciona o bot de atendimento</h3>
        <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-600">
          {[
            'Quando um cliente manda mensagem para o número, o bot responde automaticamente usando IA.',
            'Você define a personalidade do bot com um prompt: ele pode ser atendente de uma empresa, suporte técnico, vendas, etc.',
            'O bot mantém o histórico da conversa para responder com contexto, como um atendente humano faria.',
            'Se o cliente pedir para falar com humano, ou após o limite de turnos, o bot encaminha e avisa o operador.',
            'Você precisa de uma chave de API da Anthropic (Claude) ou OpenAI — o custo por conversa é muito baixo.',
            'O bot funciona 24h ou apenas no horário comercial configurado — você escolhe.',
          ].map((tip, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-brand-600 font-bold shrink-0">·</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
