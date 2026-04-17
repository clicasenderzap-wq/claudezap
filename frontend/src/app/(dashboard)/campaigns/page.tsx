'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Megaphone, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const schema = z.object({
  name: z.string().min(1, 'Obrigatório'),
  message_template: z.string().min(1, 'Obrigatório'),
  delay_ms: z.number().min(1000).default(3000),
});
type FormData = z.infer<typeof schema>;

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const { data: contacts } = useQuery({
    queryKey: ['contacts-all'],
    queryFn: () => api.get('/contacts', { params: { limit: 1000 } }).then((r) => r.data.data),
  });

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { delay_ms: 3000 },
  });

  const template = watch('message_template', '');

  const sendMutation = useMutation({
    mutationFn: (d: FormData & { contact_ids: string[] }) => api.post('/messages/campaign', d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`Campanha criada! ${res.data.queued} mensagens na fila.`);
      reset(); setSelected([]);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao criar campanha'),
  });

  function toggleContact(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleAll() {
    const activeContacts = filtered.filter((c: any) => !c.opt_out).map((c: any) => c.id);
    if (selected.length === activeContacts.length) setSelected([]);
    else setSelected(activeContacts);
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

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="card p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Configuração da campanha</h2>

            <div>
              <label className="label">Nome da campanha *</label>
              <input {...register('name')} className="input" placeholder="Ex: Prospecção Abril" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="label">Mensagem *</label>
              <textarea
                {...register('message_template')}
                className="input resize-none"
                rows={5}
                placeholder="Olá {{nome}}, temos uma novidade para você!"
              />
              {errors.message_template && <p className="text-red-500 text-xs mt-1">{errors.message_template.message}</p>}
              <p className="text-xs text-gray-400 mt-1">
                Variáveis: <code className="bg-gray-100 px-1 rounded">{'{{nome}}'}</code>
              </p>
            </div>

            <div>
              <label className="label">Delay entre mensagens (ms)</label>
              <input
                {...register('delay_ms', { valueAsNumber: true })}
                type="number" min={1000} step={500}
                className="input"
              />
              <p className="text-xs text-gray-400 mt-1">Mínimo: 1000ms. Recomendado: 3000ms+</p>
            </div>

            {preview && (
              <div className="bg-brand-50 border border-brand-200 rounded-lg p-3">
                <p className="text-xs font-medium text-brand-700 mb-1">Preview (1º contato)</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{preview}</p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !selected.length}
            className="btn-primary w-full"
          >
            <Megaphone size={16} />
            {isSubmitting ? 'Criando campanha…' : `Disparar para ${selected.length} contatos`}
          </button>
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-gray-800">
              Selecionar contatos ({selected.length} selecionados)
            </span>
            <button type="button" onClick={toggleAll} className="btn-secondary py-1 px-3 text-xs">
              {selected.length === activeFiltered.length ? 'Desmarcar todos' : 'Marcar todos'}
            </button>
          </div>
          <div className="px-3 py-2 border-b border-gray-100">
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar contato..."
              className="input py-1.5 text-sm"
            />
          </div>
          <div className="overflow-y-auto max-h-[420px] divide-y divide-gray-100">
            {filtered.map((c: any) => (
              <label
                key={c.id}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 ${c.opt_out ? 'opacity-40 pointer-events-none' : ''}`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                  ${selected.includes(c.id) ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`}
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
            {!filtered.length && (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Nenhum contato</p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
