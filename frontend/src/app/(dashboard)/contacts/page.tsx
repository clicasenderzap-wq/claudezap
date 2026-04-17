'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, Trash2, Search, Ban } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatPhone } from '@/lib/utils';
import Modal from '@/components/Modal';

const schema = z.object({
  name: z.string().min(1, 'Obrigatório'),
  phone: z.string().min(8, 'Telefone inválido'),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function ContactsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', search, page],
    queryFn: () => api.get('/contacts', { params: { search, page, limit: 20 } }).then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (d: FormData) => api.post('/contacts', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contato adicionado');
      reset(); setOpen(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); toast.success('Removido'); },
  });

  const optOutMutation = useMutation({
    mutationFn: ({ id, opt_out }: { id: string; opt_out: boolean }) =>
      api.put(`/contacts/${id}`, { opt_out }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await api.post('/contacts/import', form);
      qc.invalidateQueries({ queryKey: ['contacts'] });
      toast.success(`${res.data.imported} contatos importados`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro na importação');
    }
    e.target.value = '';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Contatos</h1>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} className="btn-secondary">
            <Upload size={16} /> Importar CSV
          </button>
          <button onClick={() => setOpen(true)} className="btn-primary">
            <Plus size={16} /> Novo contato
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por nome ou telefone..."
          className="input pl-9"
        />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Nome', 'Telefone', 'Observações', 'Status', 'Ações'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
            )}
            {!isLoading && !data?.data?.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum contato encontrado</td></tr>
            )}
            {data?.data?.map((c: any) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{formatPhone(c.phone)}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{c.notes || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${c.opt_out ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {c.opt_out ? 'Opt-out' : 'Ativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => optOutMutation.mutate({ id: c.id, opt_out: !c.opt_out })}
                      title={c.opt_out ? 'Reativar' : 'Opt-out'}
                      className="text-gray-400 hover:text-orange-500 transition-colors"
                    >
                      <Ban size={16} />
                    </button>
                    <button
                      onClick={() => { if (confirm('Remover contato?')) deleteMutation.mutate(c.id); }}
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

        {data?.total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
            <span>{data.total} contatos no total</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary py-1 px-3">Anterior</button>
              <button disabled={page * 20 >= data.total} onClick={() => setPage((p) => p + 1)} className="btn-secondary py-1 px-3">Próxima</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => { setOpen(false); reset(); }} title="Novo contato">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input {...register('name')} className="input" placeholder="Nome completo" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Telefone *</label>
            <input {...register('phone')} className="input" placeholder="5511999999999" />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea {...register('notes')} className="input resize-none" rows={3} placeholder="Anotações opcionais" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setOpen(false); reset(); }} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">Salvar</button>
          </div>
        </form>
      </Modal>

      <p className="text-xs text-gray-400">
        CSV esperado: colunas <code>nome</code>, <code>telefone</code>, <code>observacoes</code> (opcional)
      </p>
    </div>
  );
}
