'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Check, MessageSquare, Smartphone, Flame, Clock, Users, Zap } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const SUPPORT_WA = '5535999153639';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://claudezap-api.onrender.com';
const DEFAULT_PRO_PRICE = 197;

const PRO_FEATURES = [
  { icon: Bot, text: 'Bot de atendimento com IA (GPT-4o-mini) — até 500 conversas/mês incluídas' },
  { icon: Smartphone, text: 'Até 6 números WhatsApp conectados simultaneamente' },
  { icon: Users, text: 'Contatos ilimitados' },
  { icon: MessageSquare, text: '5.000 mensagens/dia por conta' },
  { icon: Flame, text: 'Aquecimento automático de números' },
  { icon: Clock, text: 'Envios agendados e campanhas em lote' },
  { icon: Zap, text: 'Suporte prioritário via WhatsApp' },
];

export default function PlanosPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const plan = (user as any)?.plan ?? 'starter';
  const [proPrice, setProPrice] = useState<number>(DEFAULT_PRO_PRICE);

  useEffect(() => {
    fetch(`${API_BASE}/api/plans/prices`)
      .then((r) => r.json())
      .then((d) => { if (d?.pro) setProPrice(Number(d.pro)); })
      .catch(() => {});
  }, []);

  // Já tem acesso ao bot — redireciona direto para a página de bots
  if (['pro', 'pro_cortesia', 'admin'].includes(plan)) {
    router.replace('/bots');
    return null;
  }

  const waMsg = encodeURIComponent(
    `Olá! Tenho uma conta no Clica Aí no plano Básico e quero fazer upgrade para o plano Pro (R$${proPrice}/mês). Pode me ajudar?`
  );
  const waUrl = `https://wa.me/${SUPPORT_WA}?text=${waMsg}`;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fazer upgrade para Pro</h1>
        <p className="text-sm text-gray-500 mt-0.5">Desbloqueie o bot de atendimento com IA e todos os recursos avançados</p>
      </div>

      <div className="card p-6 space-y-5">
        {/* Preço */}
        <div className="text-center pb-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-1">Plano Pro</p>
          <div className="flex items-end justify-center gap-1">
            <span className="text-sm text-gray-400 mb-1">R$</span>
            <span className="text-5xl font-black text-gray-900">{proPrice}</span>
            <span className="text-sm text-gray-400 mb-1">/mês</span>
          </div>
        </div>

        {/* Funcionalidades */}
        <ul className="space-y-3">
          {PRO_FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-sm text-gray-700">
              <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
              <span>{text}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-6 rounded-xl transition-colors text-base"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.535 5.858L.057 23.776a.5.5 0 0 0 .614.63l6.094-1.598A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.655-.502-5.18-1.382l-.37-.219-3.818 1.002.964-3.72-.24-.384A9.962 9.962 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
          </svg>
          Assinar Pro — R${proPrice}/mês
        </a>

        <p className="text-xs text-center text-gray-400">
          Você será atendido via WhatsApp para confirmar e ativar seu plano.
        </p>
      </div>

      <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
        ← Voltar
      </button>
    </div>
  );
}
