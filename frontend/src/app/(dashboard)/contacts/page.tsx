'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, Trash2, Search, Ban, Pencil, Download, Tag, X, CheckSquare } from 'lucide-react';
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
  tags: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Contact {
  id: string;
  name: string;
  phone: string;
  notes?: string;
  opt_out: boolean;
  tags: string[];
}

const TAG_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-yellow-100 text-yellow-700',
  'bg-pink-100 text-pink-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
  'bg-cyan-100 text-cyan-700',
];

function tagColor(tag: string) {
  let hash = 0;
  for (const ch of tag) hash = (hash * 31 + ch.charCodeAt(0)) % TAG_COLORS.length;
  return TAG_COLORS[hash];
}

function parseTags(raw: string): string[] {
  return raw
    .split(/[,;]+/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
}

export default function ContactsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [activeTag, setActiveTag] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkTags, setBulkTags] = useState('');
  const [bulkMode, setBulkMode] = useState<'replace' | 'add'>('replace');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', search, page, activeTag],
    queryFn: () =>
      api
        .get('/contacts', { params: { search, page, limit: 20, tag: activeTag || undefined } })
        .then((r) => r.data),
  });

  const { data: tagsData } = useQuery({
    queryKey: ['contact-tags'],
    queryFn: () => api.get('/contacts/tags').then((r) => r.data),
  });

  const createForm = useForm<FormData>({ resolver: zodResolver(schema) });
  const editForm = useForm<FormData>({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: (d: FormData) =>
      api.post('/contacts', { ...d, tags: parseTags(d.tags || '') }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['contact-tags'] });
      toast.success('Contato adicionado');
      createForm.reset();
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      api.put(`/contacts/${id}`, { ...data, tags: parseTags(data.tags || '') }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['contact-tags'] });
      toast.success('Contato atualizado');
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao atualizar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['contact-tags'] });
      toast.success('Removido');
    },
  });

  const optOutMutation = useMutation({
    mutationFn: ({ id, opt_out }: { id: string; opt_out: boolean }) =>
      api.put(`/contacts/${id}`, { opt_out }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });

  const bulkTagMutation = useMutation({
    mutationFn: () =>
      api.put('/contacts/bulk-tags', {
        ids: [...selected],
        tags: parseTags(bulkTags),
        mode: bulkMode,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['contact-tags'] });
      toast.success(`${res.data.updated} contatos atualizados`);
      setSelected(new Set());
      setBulkModal(false);
      setBulkTags('');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (payload: { ids?: string[]; tag?: string }) =>
      api.delete('/contacts/bulk', { data: payload }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['contact-tags'] });
      toast.success(`${res.data.deleted} contato${res.data.deleted !== 1 ? 's' : ''} excluído${res.data.deleted !== 1 ? 's' : ''}`);
      setSelected(new Set());
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao excluir'),
  });

  function openEdit(contact: Contact) {
    setEditing(contact);
    editForm.reset({
      name: contact.name,
      phone: contact.phone,
      notes: contact.notes ?? '',
      tags: (contact.tags || []).join(', '),
    });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const ids = (data?.data ?? []).map((c: Contact) => c.id);
    if (ids.every((id: string) => selected.has(id))) {
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id: string) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id: string) => next.add(id));
        return next;
      });
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await api.post('/contacts/import', form);
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['contact-tags'] });
      const { imported, skipped, duplicates } = res.data;
      if (imported === 0 && skipped === 0) {
        toast.error('Nenhum contato encontrado. Verifique se as colunas se chamam "nome" e "telefone".');
      } else {
        const parts = [`${imported} contatos importados`];
        if (duplicates) parts.push(`${duplicates} atualizados`);
        if (skipped) parts.push(`${skipped} ignorados`);
        toast.success(parts.join(', '));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro na importação');
    }
    e.target.value = '';
  }

  const contacts: Contact[] = data?.data ?? [];
  const allPageSelected = contacts.length > 0 && contacts.every((c) => selected.has(c.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Contatos</h1>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
          <a href="/contatos_modelo.xlsx" download className="btn-secondary">
            <Download size={16} /> Baixar modelo Excel
          </a>
          <button onClick={() => fileRef.current?.click()} className="btn-secondary">
            <Upload size={16} /> Importar CSV / Excel
          </button>
          <button onClick={() => setOpen(true)} className="btn-primary">
            <Plus size={16} /> Novo contato
          </button>
        </div>
      </div>

      {/* Search + tag filter row */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nome ou telefone..."
            className="input pl-9"
          />
        </div>

        {/* Tag pills */}
        {tagsData && tagsData.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {activeTag && (
              <button
                onClick={() => { setActiveTag(''); setPage(1); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                <X size={12} /> Limpar filtro
              </button>
            )}
            {tagsData.map((t: { tag: string; count: number }) => (
              <button
                key={t.tag}
                onClick={() => { setActiveTag(activeTag === t.tag ? '' : t.tag); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  activeTag === t.tag
                    ? 'bg-brand-600 text-white border-brand-600'
                    : `${tagColor(t.tag)} border-transparent hover:opacity-80`
                }`}
              >
                <Tag size={11} />
                {t.tag}
                <span className="opacity-70">({t.count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 flex-wrap bg-brand-50 border border-brand-200 rounded-xl px-4 py-3">
          <CheckSquare size={18} className="text-brand-600 shrink-0" />
          <span className="text-sm font-semibold text-brand-700 shrink-0">
            {selected.size} contato{selected.size !== 1 ? 's' : ''} selecionado{selected.size !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setBulkModal(true)}
            className="flex items-center gap-1.5 btn-primary py-1.5 text-xs"
          >
            <Tag size={14} /> Alterar tag
          </button>
          <button
            onClick={() => {
              if (confirm(`Excluir ${selected.size} contato${selected.size !== 1 ? 's' : ''} permanentemente?`)) {
                bulkDeleteMutation.mutate({ ids: [...selected] });
              }
            }}
            disabled={bulkDeleteMutation.isPending}
            className="flex items-center gap-1.5 py-1.5 text-xs px-3 rounded-lg border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 transition-colors font-medium"
          >
            <Trash2 size={14} /> Excluir selecionados
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <X size={13} /> Desmarcar todos
          </button>
        </div>
      )}

      {/* Delete by tag button */}
      {activeTag && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const tagName = activeTag;
              if (confirm(`Excluir TODOS os contatos com a tag "${tagName}"? Esta ação não pode ser desfeita.`)) {
                bulkDeleteMutation.mutate({ tag: tagName });
              }
            }}
            disabled={bulkDeleteMutation.isPending}
            className="flex items-center gap-1.5 py-1.5 text-xs px-3 rounded-lg border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 transition-colors font-medium"
          >
            <Trash2 size={14} /> Excluir todos com tag "{activeTag}"
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
              </th>
              {['Nome', 'Telefone', 'Tags', 'Observações', 'Status', 'Ações'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
            )}
            {!isLoading && !contacts.length && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum contato encontrado</td></tr>
            )}
            {contacts.map((c) => (
              <tr key={c.id} className={`hover:bg-gray-50 ${selected.has(c.id) ? 'bg-brand-50' : ''}`}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{formatPhone(c.phone)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(c.tags || []).length === 0 && <span className="text-gray-300">—</span>}
                    {(c.tags || []).map((t) => (
                      <span key={t} className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tagColor(t)}`}>{t}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{c.notes || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${c.opt_out ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {c.opt_out ? 'Opt-out' : 'Ativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(c)} title="Editar" className="text-gray-400 hover:text-blue-500 transition-colors">
                      <Pencil size={16} />
                    </button>
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

        {(data?.total ?? 0) > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
            <span>{data.total} contatos no total</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary py-1 px-3">Anterior</button>
              <button disabled={page * 20 >= data.total} onClick={() => setPage((p) => p + 1)} className="btn-secondary py-1 px-3">Próxima</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal — Novo contato */}
      <Modal open={open} onClose={() => { setOpen(false); createForm.reset(); }} title="Novo contato">
        <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input {...createForm.register('name')} className="input" placeholder="Nome completo" />
            {createForm.formState.errors.name && <p className="text-red-500 text-xs mt-1">{createForm.formState.errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Telefone *</label>
            <input {...createForm.register('phone')} className="input" placeholder="11999999999 (sem o 55)" />
            <p className="text-xs text-gray-400 mt-1">O código do Brasil (55) é adicionado automaticamente.</p>
            {createForm.formState.errors.phone && <p className="text-red-500 text-xs mt-1">{createForm.formState.errors.phone.message}</p>}
          </div>
          <div>
            <label className="label">Tags</label>
            <input {...createForm.register('tags')} className="input" placeholder="CLIENTE, VIP (separadas por vírgula)" />
            <p className="text-xs text-gray-400 mt-1">Separe por vírgula. Ex: DEVEDOR, CAMPANHA2024</p>
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea {...createForm.register('notes')} className="input resize-none" rows={3} placeholder="Anotações opcionais" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setOpen(false); createForm.reset(); }} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={createForm.formState.isSubmitting} className="btn-primary">Salvar</button>
          </div>
        </form>
      </Modal>

      {/* Modal — Editar contato */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar contato">
        <form onSubmit={editForm.handleSubmit((d) => updateMutation.mutate({ id: editing!.id, data: d }))} className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input {...editForm.register('name')} className="input" placeholder="Nome completo" />
            {editForm.formState.errors.name && <p className="text-red-500 text-xs mt-1">{editForm.formState.errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Telefone *</label>
            <input {...editForm.register('phone')} className="input" placeholder="5511999999999" />
          </div>
          <div>
            <label className="label">Tags</label>
            <input {...editForm.register('tags')} className="input" placeholder="CLIENTE, VIP" />
            <p className="text-xs text-gray-400 mt-1">Separe por vírgula.</p>
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea {...editForm.register('notes')} className="input resize-none" rows={3} placeholder="Anotações opcionais" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setEditing(null)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={editForm.formState.isSubmitting} className="btn-primary">Salvar alterações</button>
          </div>
        </form>
      </Modal>

      {/* Modal — Alterar tag em massa */}
      <Modal open={bulkModal} onClose={() => { setBulkModal(false); setBulkTags(''); }} title={`Alterar tag — ${selected.size} contato${selected.size !== 1 ? 's' : ''}`}>
        <div className="space-y-4">
          <div>
            <label className="label">Tags</label>
            <input
              value={bulkTags}
              onChange={(e) => setBulkTags(e.target.value)}
              className="input"
              placeholder="CLIENTE, PREMIUM (separadas por vírgula)"
              autoFocus
            />
          </div>

          <div>
            <label className="label">Modo</label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                type="button"
                onClick={() => setBulkMode('replace')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  bulkMode === 'replace' ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-semibold text-gray-800">Substituir</p>
                <p className="text-xs text-gray-500 mt-0.5">Remove as tags atuais e coloca as novas</p>
              </button>
              <button
                type="button"
                onClick={() => setBulkMode('add')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  bulkMode === 'add' ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-semibold text-gray-800">Adicionar</p>
                <p className="text-xs text-gray-500 mt-0.5">Mantém as existentes e adiciona as novas</p>
              </button>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setBulkModal(false); setBulkTags(''); }} className="btn-secondary">Cancelar</button>
            <button
              onClick={() => bulkTagMutation.mutate()}
              disabled={bulkTagMutation.isPending}
              className="btn-primary"
            >
              Aplicar
            </button>
          </div>
        </div>
      </Modal>

      <p className="text-xs text-gray-400">
        Aceita Excel (.xlsx) ou CSV. Colunas: <code>nome</code>, <code>telefone</code>, <code>tag</code> (ou <code>tipo</code> / <code>grupo</code>), <code>observacoes</code>. Baixe o modelo para começar.
      </p>
    </div>
  );
}
