'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Mail, Send, Clock, Eye, Users, ChevronLeft, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const DEFAULT_HTML = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="color:#111827;font-size:24px;margin-bottom:8px">Olá, {{name}}!</h1>
  <p style="color:#374151;line-height:1.6">Escreva sua mensagem aqui.</p>
  <p style="color:#374151;line-height:1.6">Use <strong>{{name}}</strong> e <strong>{{email}}</strong> para personalizar.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
  <p style="color:#9ca3af;font-size:12px">
    <a href="{{unsubscribe_url}}" style="color:#6b7280">Cancelar inscrição</a>
  </p>
</div>`;

function NovaCampanhaForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('id');

  const [form, setForm] = useState({
    name: '', subject: '', from_name: '', html_body: DEFAULT_HTML, delay_ms: 1500,
  });
  const [sendOpts, setSendOpts] = useState({ tag_filter: '', scheduled_for: '' });
  const [preview, setPreview] = useState(false);
  const [step, setStep] = useState<'edit' | 'send'>('edit');
  const [savedId, setSavedId] = useState<string | null>(null);

  // Load existing campaign when editing
  const { data: existingCampaign } = useQuery({
    queryKey: ['email-campaign-edit', editId],
    queryFn: () => api.get(`/email/campaigns/${editId}`).then((r) => r.data),
    enabled: !!editId,
  });

  useEffect(() => {
    if (existingCampaign) {
      setForm({
        name: existingCampaign.name ?? '',
        subject: existingCampaign.subject ?? '',
        from_name: existingCampaign.from_name ?? '',
        html_body: existingCampaign.html_body ?? DEFAULT_HTML,
        delay_ms: existingCampaign.delay_ms ?? 1500,
      });
      setSavedId(existingCampaign.id);
    }
  }, [existingCampaign]);

  const { data: tagsData } = useQuery({
    queryKey: ['contact-tags'],
    queryFn: () => api.get('/contacts/tags').then((r) => r.data).catch(() => []),
  });
  const tags: string[] = Array.isArray(tagsData) ? tagsData : [];

  const saveMutation = useMutation({
    mutationFn: (body: object) =>
      savedId
        ? api.put(`/email/campaigns/${savedId}`, body).then((r) => r.data)
        : api.post('/email/campaigns', body).then((r) => r.data),
    onSuccess: (data: any) => {
      setSavedId(data.id);
      toast.success('Campanha salva!');
      setStep('send');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao salvar'),
  });

  const sendMutation = useMutation({
    mutationFn: (body: object) =>
      api.post(`/email/campaigns/${savedId}/send`, body).then((r) => r.data),
    onSuccess: (data: any) => {
      toast.success(`${data.total} emails enfileirados com sucesso!`);
      router.push('/email');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao enviar'),
  });

  function handleSave() {
    if (!form.name.trim() || !form.subject.trim() || !form.html_body.trim()) {
      toast.error('Preencha nome, assunto e conteúdo');
      return;
    }
    saveMutation.mutate(form);
  }

  function handleSend() {
    if (!savedId) return;
    sendMutation.mutate({
      tag_filter: sendOpts.tag_filter || undefined,
      scheduled_for: sendOpts.scheduled_for || undefined,
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/email')} className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {editId ? 'Editar campanha' : 'Nova campanha de email'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure e envie emails personalizados para seus contatos
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1">
        <div className="h-1 flex-1 rounded-full bg-indigo-500" />
        <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'send' ? 'bg-indigo-500' : 'bg-gray-200'}`} />
      </div>

      {step === 'edit' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: settings */}
          <div className="space-y-4">
            <div className="card p-5 space-y-4">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Mail size={16} /> Configurações
              </h2>
              <div>
                <label className="label">Nome da campanha (interno)</label>
                <input className="input" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Newsletter Maio 2026" />
              </div>
              <div>
                <label className="label">Assunto do email</label>
                <input className="input" value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Ex: Novidades exclusivas para você!" />
              </div>
              <div>
                <label className="label">Nome do remetente (opcional)</label>
                <input className="input" value={form.from_name}
                  onChange={(e) => setForm({ ...form, from_name: e.target.value })}
                  placeholder="Ex: João da Empresa" />
                <p className="text-xs text-gray-400 mt-1">
                  Aparece como: <em>{form.from_name || 'Clica Aí'} &lt;noreply@clicaai.ia.br&gt;</em>
                </p>
              </div>
              <div>
                <label className="label">Intervalo entre envios</label>
                <select className="input" value={form.delay_ms}
                  onChange={(e) => setForm({ ...form, delay_ms: Number(e.target.value) })}>
                  <option value={500}>500ms — mais rápido</option>
                  <option value={1000}>1 segundo</option>
                  <option value={1500}>1,5 segundos (recomendado)</option>
                  <option value={3000}>3 segundos — mais seguro</option>
                </select>
              </div>
            </div>

            <div className="card p-4 bg-indigo-50 border border-indigo-100 text-sm text-indigo-800 space-y-1">
              <p className="font-semibold">Variáveis disponíveis</p>
              <p><code className="bg-indigo-100 px-1 rounded text-xs">{`{{name}}`}</code> — Nome do contato</p>
              <p><code className="bg-indigo-100 px-1 rounded text-xs">{`{{email}}`}</code> — Email do contato</p>
              <p><code className="bg-indigo-100 px-1 rounded text-xs">{`{{unsubscribe_url}}`}</code> — Link de descadastro</p>
            </div>
          </div>

          {/* Right: HTML editor */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Conteúdo HTML</h2>
              <button onClick={() => setPreview(!preview)}
                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium">
                <Eye size={13} /> {preview ? 'Ver código' : 'Pré-visualizar'}
              </button>
            </div>
            {preview ? (
              <iframe
                srcDoc={form.html_body
                  .replace(/\{\{name\}\}/gi, 'João Silva')
                  .replace(/\{\{email\}\}/gi, 'joao@exemplo.com')
                  .replace(/\{\{unsubscribe_url\}\}/gi, '#')}
                className="w-full h-96 border border-gray-200 rounded-lg bg-white"
                sandbox="allow-same-origin"
              />
            ) : (
              <textarea
                className="input font-mono text-xs min-h-96 resize-none"
                value={form.html_body}
                onChange={(e) => setForm({ ...form, html_body: e.target.value })}
              />
            )}
          </div>
        </div>
      )}

      {step === 'send' && (
        <div className="max-w-lg space-y-4">
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Users size={16} /> Destinatários
            </h2>
            <div>
              <label className="label">Filtrar por tag (deixe em branco para todos)</label>
              <select className="input" value={sendOpts.tag_filter}
                onChange={(e) => setSendOpts({ ...sendOpts, tag_filter: e.target.value })}>
                <option value="">Todos os contatos com email</option>
                {tags.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Apenas contatos com email cadastrado e sem opt-out serão incluídos.
              </p>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Clock size={16} /> Agendamento
            </h2>
            <div>
              <label className="label">Enviar em (deixe em branco para enviar agora)</label>
              <input type="datetime-local" className="input" value={sendOpts.scheduled_for}
                onChange={(e) => setSendOpts({ ...sendOpts, scheduled_for: e.target.value })} />
            </div>
          </div>

          <div className="card p-4 bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <p className="font-semibold mb-1">Antes de enviar</p>
            <ul className="space-y-0.5">
              <li>· Inclua <code className="bg-amber-100 px-1 rounded text-xs">{`{{unsubscribe_url}}`}</code> no conteúdo (obrigatório por lei)</li>
              <li>· O domínio clicaai.ia.br precisa estar verificado no Resend para boa entregabilidade</li>
            </ul>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {step === 'send' && (
          <button onClick={() => setStep('edit')} className="btn btn-secondary">
            ← Voltar ao editor
          </button>
        )}
        {step === 'edit' && (
          <button onClick={handleSave} disabled={saveMutation.isPending} className="btn btn-primary gap-2">
            <Check size={15} />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar e configurar envio'}
          </button>
        )}
        {step === 'send' && (
          <button onClick={handleSend} disabled={sendMutation.isPending} className="btn btn-primary gap-2">
            <Send size={15} />
            {sendMutation.isPending
              ? 'Enfileirando...'
              : sendOpts.scheduled_for ? 'Agendar envio' : 'Enviar agora'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function NovaCampanhaPage() {
  return (
    <Suspense fallback={<p className="text-gray-400 py-10 text-center">Carregando...</p>}>
      <NovaCampanhaForm />
    </Suspense>
  );
}
