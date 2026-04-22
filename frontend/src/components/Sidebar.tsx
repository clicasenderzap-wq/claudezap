'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, MessageSquare, Megaphone, Smartphone, Flame, Bot, ShieldCheck, LogOut, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contacts', label: 'Contatos', icon: Users },
  { href: '/messages', label: 'Mensagens', icon: MessageSquare },
  { href: '/campaigns', label: 'Campanhas', icon: Megaphone },
  { href: '/whatsapp', label: 'WhatsApp', icon: Smartphone },
  { href: '/warmup', label: 'Aquecimento', icon: Flame },
  { href: '/bots', label: 'Bot de Atendimento', icon: Bot },
];

const PLAN_LABELS: Record<string, string> = { starter: 'Starter', pro: 'Pro' };
const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-600',
  pro: 'bg-brand-100 text-brand-700',
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const plan = (user as any)?.plan ?? 'starter';
  const status = (user as any)?.status ?? 'trial';
  const trialEndsAt = (user as any)?.trial_ends_at;
  const isAdmin = user?.email === 'clicasenderzap@gmail.com';

  const trialDaysLeft = trialEndsAt
    ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const trialExpired = status === 'trial' && trialDaysLeft !== null && trialDaysLeft <= 0;
  const trialWarning = status === 'trial' && trialDaysLeft !== null && trialDaysLeft > 0 && trialDaysLeft <= 3;

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xl font-bold text-brand-600">ClaudeZap</span>
        {plan && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[plan]}`}>
            {PLAN_LABELS[plan] ?? plan}
          </span>
        )}
      </div>

      {/* Banner trial */}
      {trialExpired && (
        <div className="mx-3 mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 flex items-start gap-1.5">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>Seu período de teste <strong>expirou</strong>. Entre em contato para ativar seu plano.</span>
        </div>
      )}
      {trialWarning && (
        <div className="mx-3 mt-3 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700 flex items-start gap-1.5">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>Teste expira em <strong>{trialDaysLeft} dia{trialDaysLeft !== 1 ? 's' : ''}</strong>. Assine para continuar.</span>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}

      </nav>

      <div className="px-3 py-4 border-t border-gray-200 space-y-1">
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            <ShieldCheck size={16} />
            Painel Admin
          </Link>
        )}
        <div className="px-3 py-2">
          <p className="text-xs text-gray-500">Logado como</p>
          <p className="text-sm font-medium text-gray-800 truncate">{user?.name}</p>
          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}
