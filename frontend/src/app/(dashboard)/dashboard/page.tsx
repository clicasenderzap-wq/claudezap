'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, MessageSquare, CheckCircle, Megaphone, Mail, Send, Eye, BarChart2 } from 'lucide-react';
import Link from 'next/link';
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

  const email = data?.email;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* WhatsApp */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={16} className="text-brand-600" />
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">WhatsApp</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Contatos" value={data?.contacts} icon={Users} color="bg-blue-500" />
          <StatCard label="Mensagens (30 dias)" value={data?.messages_last_30d} icon={MessageSquare} color="bg-brand-600" />
          <StatCard label="Taxa de sucesso" value={data?.success_rate} icon={CheckCircle} color="bg-emerald-500" />
          <StatCard label="Campanhas recentes" value={data?.recent_campaigns?.length} icon={Megaphone} color="bg-purple-500" />
        </div>
      </div>

      {data?.by_status && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Status das mensagens WhatsApp (30 dias)</h2>
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
          <h2 className="text-base font-semibold text-gray-800 mb-4">Campanhas WhatsApp recentes</h2>
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

      {/* Email */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-indigo-600" />
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Email</h2>
          </div>
          <Link href="/email" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Ver campanhas →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Campanhas (30 dias)" value={email?.campaigns_last_30d ?? 0} icon={Mail} color="bg-indigo-500" />
          <StatCard label="Emails enviados (30 dias)" value={email?.sent_last_30d ?? 0} icon={Send} color="bg-violet-500" />
          <StatCard label="Emails abertos (30 dias)" value={email?.opened_last_30d ?? 0} icon={Eye} color="bg-blue-500" />
          <StatCard label="Taxa de abertura" value={email?.open_rate ?? '0%'} icon={BarChart2} color="bg-teal-500" />
        </div>
      </div>

      {email?.recent_campaigns?.length > 0 && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Campanhas de Email recentes</h2>
          <div className="space-y-2">
            {email.recent_campaigns.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{c.name}</p>
                  <p className="text-xs text-gray-500">{formatDate(c.created_at)}</p>
                </div>
                <div className="text-right text-xs text-gray-600">
                  <p>{c.sent_count}/{c.total_contacts} enviados · {c.open_count} abertos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
