'use client';

import { useQuery } from '@tanstack/react-query';
import { WifiOff, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import CampaignFinishedDialog, { type CampaignSummary } from './CampaignFinishedDialog';

// Campanhas vistas "enviando" ficam guardadas para avisar do término mesmo após recarregar a página
const SEEN_KEY = 'clicaai:campanhas-enviando';
const NOTIFY_WINDOW_MS = 24 * 3_600_000;

function readSeen(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function writeSeen(ids: string[]) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids)); } catch {}
}

export default function RunningCampaignBanner() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState<CampaignSummary[]>([]);
  const checking = useRef<Set<string>>(new Set());

  const { data: waAccounts = [] } = useQuery<any[]>({
    queryKey: ['wa-accounts-global'],
    queryFn: () => api.get('/whatsapp/accounts').then((r) => r.data),
    refetchInterval: 60_000,
    staleTime: 10_000,
  });

  const { data } = useQuery<{ data: any[] }>({
    queryKey: ['running-campaigns-banner'],
    queryFn: () =>
      api.get('/campaigns', { params: { status: 'running', limit: 5 } }).then((r) => r.data),
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  // Campanha que saiu da lista de "enviando": confere se foi concluída e mostra o aviso
  useEffect(() => {
    if (!data) return;
    const current = (data.data ?? []).map((c: any) => c.id as string);
    const gone = readSeen().filter((id) => !current.includes(id));
    writeSeen(current);
    for (const id of gone) {
      if (checking.current.has(id)) continue;
      checking.current.add(id);
      api.get(`/campaigns/${id}/summary`)
        .then((r) => {
          const s = r.data as CampaignSummary;
          const endedAt = s.finished_at ? new Date(s.finished_at).getTime() : Date.now();
          if (s.campaign?.status === 'completed' && Date.now() - endedAt < NOTIFY_WINDOW_MS) {
            setFinished((q) => (q.some((x) => x.campaign.id === id) ? q : [...q, s]));
          }
        })
        .catch(() => {})
        .finally(() => checking.current.delete(id));
    }
  }, [data]);

  const closeFinished = useCallback(() => setFinished((q) => q.slice(1)), []);
  const openCampaign = useCallback((id: string) => {
    setFinished((q) => q.slice(1));
    if (window.location.pathname.startsWith('/campaigns')) {
      window.dispatchEvent(new CustomEvent('clicaai:abrir-campanha', { detail: id }));
    } else {
      router.push(`/campaigns?abrir=${id}`);
    }
  }, [router]);

  const dialog = finished[0] ? (
    <CampaignFinishedDialog
      summary={finished[0]}
      remaining={finished.length - 1}
      onClose={closeFinished}
      onOpen={openCampaign}
    />
  ) : null;

  const running = (data?.data ?? []).filter((c: any) => !dismissed.has(c.id));
  const anyConnected = waAccounts.some((a: any) => a.status === 'connected');

  if (!running.length) return dialog;

  return (
    <>
      {dialog}
      <div className="border-b border-gray-200 divide-y divide-gray-100">
        {running.map((c: any) => {
          const total = c.total_contacts ?? 0;
          const done = (c.sent_count ?? 0) + (c.failed_count ?? 0);
          const queued = Math.max(0, total - done);
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const waDisconnected = !anyConnected && queued > 0;

          return (
            <div
              key={c.id}
              className={`flex items-center gap-4 px-6 py-2.5 text-sm ${
                waDisconnected ? 'bg-amber-50' : 'bg-blue-50'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${
                  waDisconnected ? 'bg-amber-400' : 'bg-blue-500'
                }`}
              />

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800 truncate max-w-[180px]">{c.name}</span>
                  {waDisconnected ? (
                    <span className="flex items-center gap-1 text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-medium shrink-0">
                      <WifiOff size={10} /> WhatsApp desconectado — mensagens aguardando reconexão
                    </span>
                  ) : (
                    <span className="text-xs text-blue-600 font-medium shrink-0">disparando…</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-28 bg-white/60 rounded-full h-1.5 shrink-0 border border-gray-200">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        waDisconnected ? 'bg-amber-400' : 'bg-blue-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">
                    {c.sent_count}/{total} enviadas · {c.failed_count} falhas · {queued} na fila
                  </span>
                </div>
              </div>

              {waDisconnected && (
                <Link
                  href="/whatsapp"
                  className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline shrink-0"
                >
                  Reconectar
                </Link>
              )}

              <button
                onClick={() => setDismissed((p) => new Set([...p, c.id]))}
                className="text-gray-400 hover:text-gray-600 shrink-0"
                title="Ocultar"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
