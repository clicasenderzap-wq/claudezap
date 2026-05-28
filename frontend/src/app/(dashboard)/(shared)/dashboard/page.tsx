'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, MessageSquare, CheckCircle, Megaphone, Mail, Send, Eye, BarChart2, UserMinus, AlertTriangle, TrendingUp, Plus } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

function StatCard({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="card p-6 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-yellow-100 text-yellow-700',
  running: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
};
const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho', scheduled: 'Agendada', running: 'Enviando',
  completed: 'Concluída', failed: 'Falhou',
};

function EmailDashboard({ email }: { email: any }) {
  const openRate = email?.open_rate ?? '0%';
  const sent = email?.sent_total ?? 0;
  const opened = email?.opened_total ?? 0;
  const campaigns = email?.campaigns_total ?? 0;
  const unsubscribed = email?.unsubscribed ?? 0;
  const bounced = email?.bounced ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Email</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral de todas as suas campanhas</p>
        </div>
        <Link href="/email/nova" className="btn btn-primary gap-2">
          <Plus size={15} /> Nova campanha
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard label="Campanhas enviadas" value={campaigns} icon={Mail} color="bg-indigo-500" />
        <StatCard label="Emails entregues" value={sent} icon={Send} color="bg-violet-500" />
        <StatCard label="Emails abertos" value={opened} icon={Eye} color="bg-blue-500" />
        <StatCard label="Taxa de abertura" value={openRate} icon={BarChart2} color="bg-teal-500" sub="de todos os enviados" />
        <StatCard label="Descadastros" value={unsubscribed} icon={UserMinus} color="bg-orange-400" sub={<Link href="/email/descadastrados" className="text-orange-500 hover:underline">Ver lista</Link>} />
        <StatCard label="Bounces" value={bounced} icon={AlertTriangle} color="bg-red-400" sub="endereços inválidos" />
      </div>

      {email?.recent_campaigns?.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">Campanhas recentes</h2>
            <Link href="/email" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Ver todas →</Link>
          </div>
          <div className="space-y-2">
            {email.recent_campaigns.map((c: any) => {
              const sentCount = c.sent_count ?? 0;
              const openCount = c.open_count ?? 0;
              const rate = sentCount > 0 ? Math.round((openCount / sentCount) * 100) : 0;
              return (
                <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">{formatDate(c.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500 shrink-0 ml-4">
                    <p className="font-medium">{sentCount}/{c.total_contacts} enviados</p>
                    {sentCount > 0 && <p className="text-indigo-500">{rate}% abertos</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {email?.recent_campaigns?.length === 0 && (
        <div className="card p-12 flex flex-col items-center gap-4 text-center">
          <div className="p-4 bg-indigo-50 rounded-2xl"><TrendingUp size={32} className="text-indigo-400" /></div>
          <h2 className="text-lg font-bold text-gray-800">Nenhuma campanha enviada ainda</h2>
          <p className="text-sm text-gray-500 max-w-sm">Crie sua primeira campanha para começar a acompanhar as métricas aqui.</p>
          <Link href="/email/nova" className="btn btn-primary gap-2"><Plus size={15} /> Criar campanha</Link>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [hostname, setHostname] = useState('');
  useEffect(() => { setHostname(window.location.hostname); }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
  });

  if (isLoading) return <div className="text-gray-400 text-sm">Carregando...</div>;

  const isEmailSubdomain = hostname.startsWith('email.');
  if (isEmailSubdomain) return <EmailDashboard email={data?.email} />;

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
        {(email?.unsubscribed > 0 || email?.bounced > 0) && (
          <div className="flex gap-4 mt-3">
            {email?.unsubscribed > 0 && (
              <Link href="/email/descadastrados" className="text-xs text-orange-600 hover:text-orange-800 flex items-center gap-1">
                <UserMinus size={12} /> {email.unsubscribed} descadastro{email.unsubscribed !== 1 ? 's' : ''}
              </Link>
            )}
            {email?.bounced > 0 && (
              <span className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle size={12} /> {email.bounced} bounce{email.bounced !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
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
