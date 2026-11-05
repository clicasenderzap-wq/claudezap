'use client';

import { useEffect, useRef } from 'react';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export interface CampaignSummary {
  campaign: { id: string; name: string; status: string; total_contacts: number };
  stats: { total: number; sent: number; delivered: number; failed: number; queued: number };
  started_at: string | null;
  finished_at: string | null;
}

function formatWhen(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === new Date().toDateString()) return `hoje às ${time}`;
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${time}`;
}

function formatDuration(from: string | null, to: string | null) {
  if (!from || !to) return null;
  const totalMin = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export default function CampaignFinishedDialog({
  summary,
  remaining,
  onClose,
  onOpen,
}: {
  summary: CampaignSummary;
  remaining: number;
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const openRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    openRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { campaign, stats } = summary;
  const when = formatWhen(summary.finished_at);
  const duration = formatDuration(summary.started_at, summary.finished_at);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="campaign-finished-title"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
            <CheckCircle2 size={26} />
          </div>
          <h2 id="campaign-finished-title" className="text-lg font-semibold text-gray-900">Campanha concluída</h2>
          <p className="text-sm text-gray-500 mt-1 break-words">{campaign.name}</p>
        </div>

        <div className="grid grid-cols-3 border-y border-gray-100 divide-x divide-gray-100 text-center">
          {[
            { label: 'Entregues', value: stats.delivered, tone: 'text-green-700' },
            { label: 'Sem confirmação', value: stats.sent, tone: 'text-gray-800' },
            { label: 'Falhas', value: stats.failed, tone: stats.failed ? 'text-red-600' : 'text-gray-800' },
          ].map((s) => (
            <div key={s.label} className="py-3 px-1">
              <p className={`text-2xl font-bold tabular-nums ${s.tone}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 space-y-2 text-sm text-gray-600">
          {when && (
            <p className="flex items-center gap-2">
              <Clock size={14} className="text-gray-400 shrink-0" />
              <span>Terminou {when}{duration ? ` · durou ${duration}` : ''}</span>
            </p>
          )}
          <p>{stats.total} contato{stats.total !== 1 ? 's' : ''} na campanha.</p>
          {stats.failed > 0 && (
            <p className="flex items-start gap-2 text-amber-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>Abra a campanha para ver o motivo de cada falha e reenviar.</span>
            </p>
          )}
          {stats.sent > 0 && (
            <p className="text-xs text-gray-500">
              Sem confirmação: o WhatsApp recebeu a mensagem, mas o celular da pessoa ainda não confirmou o recebimento. A confirmação pode chegar depois.
            </p>
          )}
        </div>

        <div className="px-6 pb-5 flex items-center justify-end gap-2">
          {remaining > 0 && (
            <span className="mr-auto text-xs text-gray-400">
              +{remaining} campanha{remaining !== 1 ? 's' : ''} concluída{remaining !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
          <button
            ref={openRef}
            onClick={() => onOpen(campaign.id)}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            Ver campanha
          </button>
        </div>
      </div>
    </div>
  );
}
