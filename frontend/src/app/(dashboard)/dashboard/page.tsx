'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, MessageSquare, CheckCircle, Megaphone } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="card p-6 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
  });

  if (isLoading) return <div className="text-gray-400 text-sm">Carregando...</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Contatos" value={data?.contacts} icon={Users} color="bg-blue-500" />
        <StatCard label="Mensagens (30 dias)" value={data?.messages_last_30d} icon={MessageSquare} color="bg-brand-600" />
        <StatCard label="Taxa de sucesso" value={data?.success_rate} icon={CheckCircle} color="bg-emerald-500" />
        <StatCard label="Campanhas recentes" value={data?.recent_campaigns?.length} icon={Megaphone} color="bg-purple-500" />
      </div>

      {data?.by_status && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Status das mensagens (30 dias)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(data.by_status).map(([status, count]) => (
              <div key={status} className="text-center">
                <p className="text-xl font-bold text-gray-900">{count as number}</p>
                <p className="text-xs text-gray-500 capitalize">{status}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data?.recent_campaigns?.length > 0 && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Campanhas recentes</h2>
          <div className="space-y-2">
            {data.recent_campaigns.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{c.name}</p>
                  <p className="text-xs text-gray-500">{formatDate(c.created_at)}</p>
                </div>
                <div className="text-right text-xs text-gray-600">
                  <p>{c.sent_count}/{c.total_contacts} enviados</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
