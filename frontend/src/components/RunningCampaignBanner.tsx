'use client';

import { useQuery } from '@tanstack/react-query';
import { WifiOff, X } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function RunningCampaignBanner() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data: waAccounts = [] } = useQuery<any[]>({
    queryKey: ['wa-accounts-global'],
    queryFn: () => api.get('/whatsapp/accounts').then((r) => r.data),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const { data } = useQuery<{ data: any[] }>({
    queryKey: ['running-campaigns-banner'],
    queryFn: () =>
      api.get('/campaigns', { params: { status: 'running', limit: 5 } }).then((r) => r.data),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const running = (data?.data ?? []).filter((c: any) => !dismissed.has(c.id));
  const anyConnected = waAccounts.some((a: any) => a.status === 'connected');

  if (!running.length) return null;

  return (
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
  );
}
