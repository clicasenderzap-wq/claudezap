'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Mail, Send, Clock, Users, ChevronLeft, Check, Search,
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Link2, Image as ImageIcon, Minus,
  RotateCcw, RotateCw, Palette, Highlighter, Eraser, LayoutTemplate, FlaskConical, Users2, AlertTriangle, Settings,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';

// ── Templates ──────────────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: 'newsletter',
    name: 'Newsletter',
    desc: 'Layout com artigos e destaques',
    color: '#16a34a',
    html: `<div style="background:#f3f4f6;padding:32px 16px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:600px;margin:0 auto"><div style="background:#16a34a;border-radius:12px 12px 0 0;padding:36px 40px;text-align:center"><h1 style="color:#ffffff;font-size:26px;font-weight:900;margin:0;letter-spacing:-0.5px">Newsletter</h1><p style="color:#bbf7d0;font-size:13px;margin:8px 0 0">Novidades selecionadas para você</p></div><div style="background:#ffffff;padding:40px"><p style="font-size:16px;color:#1f2937;margin:0 0 16px">Olá, <strong>{{name}}</strong>!</p><p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 28px">Confira as principais novidades desta semana que separamos especialmente para você.</p><div style="border-left:4px solid #16a34a;padding:0 0 0 20px;margin:0 0 28px"><h2 style="font-size:17px;color:#111827;margin:0 0 8px;font-weight:700">Título do assunto principal</h2><p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 12px">Descreva o conteúdo principal aqui. Seja claro e objetivo sobre o que o leitor vai encontrar ao clicar.</p><a href="#" style="font-size:13px;color:#16a34a;font-weight:700;text-decoration:none">Leia mais →</a></div><div style="border-left:4px solid #e5e7eb;padding:0 0 0 20px;margin:0 0 32px"><h2 style="font-size:17px;color:#111827;margin:0 0 8px;font-weight:700">Segundo assunto em destaque</h2><p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 12px">Mais um conteúdo relevante para seu leitor. Edite conforme necessário.</p><a href="#" style="font-size:13px;color:#16a34a;font-weight:700;text-decoration:none">Leia mais →</a></div><table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr><td align="center" style="background:#16a34a;border-radius:10px;padding:14px 32px"><a href="#" style="color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;font-family:Arial,sans-serif">Ver todas as novidades →</a></td></tr></table></div><div style="background:#f9fafb;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb"><p style="font-size:12px;color:#9ca3af;margin:0">Você recebeu este email porque está inscrito em nossa lista.<br><a href="{{unsubscribe_url}}" style="color:#6b7280;text-decoration:underline">Cancelar inscrição</a></p></div></div></div>`,
  },
  {
    id: 'promocao',
    name: 'Promoção',
    desc: 'Oferta com destaque de desconto',
    color: '#dc2626',
    html: `<div style="background:#fff7ed;padding:32px 16px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:600px;margin:0 auto"><div style="background:#dc2626;border-radius:12px 12px 0 0;padding:40px;text-align:center"><p style="color:#fecaca;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px">Oferta especial</p><div style="background:rgba(255,255,255,0.15);border-radius:100px;display:inline-block;padding:12px 32px;margin:0 0 16px"><span style="color:#fff;font-size:48px;font-weight:900;line-height:1">30%</span><span style="color:#fca5a5;font-size:20px;font-weight:700"> OFF</span></div><p style="color:#ffffff;font-size:18px;font-weight:700;margin:0">Somente hoje!</p></div><div style="background:#ffffff;padding:40px"><p style="font-size:16px;color:#1f2937;margin:0 0 16px">Olá, <strong>{{name}}</strong>!</p><p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px">Preparamos uma oferta exclusiva especialmente para você. Aproveite antes que acabe!</p><div style="background:#fff7ed;border-radius:12px;padding:24px;margin:0 0 28px;text-align:center;border:2px dashed #fca5a5"><p style="font-size:13px;color:#9a3412;font-weight:700;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">Em destaque</p><h2 style="font-size:20px;color:#111827;margin:0 0 8px">Nome do produto ou serviço</h2><p style="font-size:14px;color:#6b7280;margin:0 0 16px">Descrição breve do produto ou benefício principal aqui.</p><p style="font-size:13px;color:#9ca3af;margin:0;text-decoration:line-through">De R$ 197,00</p><p style="font-size:28px;color:#dc2626;font-weight:900;margin:4px 0">R$ 137,90</p></div><table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px"><tr><td align="center" style="background:#dc2626;border-radius:10px;padding:16px 40px"><a href="#" style="color:#ffffff;font-weight:900;font-size:16px;text-decoration:none;font-family:Arial,sans-serif">QUERO APROVEITAR →</a></td></tr></table><p style="font-size:12px;color:#9ca3af;text-align:center;margin:0">⏰ Oferta válida por tempo limitado</p></div><div style="background:#fff7ed;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;border-top:1px solid #fca5a5"><p style="font-size:12px;color:#9ca3af;margin:0"><a href="{{unsubscribe_url}}" style="color:#6b7280;text-decoration:underline">Cancelar inscrição</a></p></div></div></div>`,
  },
  {
    id: 'boas_vindas',
    name: 'Boas-vindas',
    desc: 'Email de boas-vindas com próximos passos',
    color: '#15803d',
    html: `<div style="background:#f0fdf4;padding:32px 16px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:600px;margin:0 auto"><div style="background:#15803d;border-radius:12px 12px 0 0;padding:48px 40px;text-align:center"><p style="font-size:40px;margin:0 0 16px">👋</p><h1 style="color:#ffffff;font-size:28px;font-weight:900;margin:0 0 8px">Bem-vindo!</h1><p style="color:#bbf7d0;font-size:14px;margin:0">Estamos muito felizes em ter você aqui</p></div><div style="background:#ffffff;padding:40px"><p style="font-size:17px;color:#1f2937;font-weight:600;margin:0 0 16px">Olá, {{name}}! 🎉</p><p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px">Seja muito bem-vindo(a)! Ficamos felizes em ter você com a gente. Preparamos tudo para que você tenha a melhor experiência possível.</p><div style="background:#f9fafb;border-radius:12px;padding:24px;margin:0 0 28px"><p style="font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px">Próximos passos:</p><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="vertical-align:top;width:36px;padding:0 12px 16px 0"><div style="width:28px;height:28px;background:#16a34a;border-radius:50%;text-align:center;line-height:28px;color:#fff;font-weight:700;font-size:13px">1</div></td><td style="padding:0 0 16px"><p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 4px">Complete seu perfil</p><p style="font-size:13px;color:#6b7280;margin:0">Adicione suas informações para personalizar sua experiência.</p></td></tr><tr><td style="vertical-align:top;width:36px;padding:0 12px 16px 0"><div style="width:28px;height:28px;background:#16a34a;border-radius:50%;text-align:center;line-height:28px;color:#fff;font-weight:700;font-size:13px">2</div></td><td style="padding:0 0 16px"><p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 4px">Explore os recursos</p><p style="font-size:13px;color:#6b7280;margin:0">Descubra tudo que preparamos para você.</p></td></tr><tr><td style="vertical-align:top;width:36px"><div style="width:28px;height:28px;background:#16a34a;border-radius:50%;text-align:center;line-height:28px;color:#fff;font-weight:700;font-size:13px">3</div></td><td><p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 4px">Fale com a gente</p><p style="font-size:13px;color:#6b7280;margin:0">Estamos disponíveis sempre que precisar de ajuda.</p></td></tr></table></div><table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr><td align="center" style="background:#16a34a;border-radius:10px;padding:14px 32px"><a href="#" style="color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;font-family:Arial,sans-serif">Começar agora →</a></td></tr></table></div><div style="background:#f0fdf4;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;border-top:1px solid #bbf7d0"><p style="font-size:12px;color:#9ca3af;margin:0"><a href="{{unsubscribe_url}}" style="color:#6b7280;text-decoration:underline">Cancelar inscrição</a></p></div></div></div>`,
  },
  {
    id: 'evento',
    name: 'Evento',
    desc: 'Convite para evento com data e local',
    color: '#1d4ed8',
    html: `<div style="background:#eff6ff;padding:32px 16px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:600px;margin:0 auto"><div style="background:#1d4ed8;border-radius:12px 12px 0 0;padding:40px;text-align:center"><p style="color:#bfdbfe;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px">Você está convidado</p><h1 style="color:#ffffff;font-size:26px;font-weight:900;margin:0 0 12px">Nome do Evento</h1><p style="color:#c4b5fd;font-size:14px;margin:0">Uma experiência que você não pode perder</p></div><div style="background:#ffffff;padding:40px"><p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 28px">Olá, <strong>{{name}}</strong>! Temos um convite especial para você. Confira os detalhes do evento abaixo.</p><div style="background:#eff6ff;border-radius:12px;padding:24px;margin:0 0 28px;border:1px solid #bfdbfe"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="padding:0 0 16px"><p style="font-size:12px;color:#3b82f6;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px">📅 Data</p><p style="font-size:15px;color:#1e40af;font-weight:700;margin:0">DD de Mês de 2026</p></td></tr><tr><td style="padding:0 0 16px"><p style="font-size:12px;color:#3b82f6;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px">🕐 Horário</p><p style="font-size:15px;color:#1e40af;font-weight:700;margin:0">19h às 22h (horário de Brasília)</p></td></tr><tr><td><p style="font-size:12px;color:#3b82f6;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px">📍 Local</p><p style="font-size:15px;color:#1e40af;font-weight:700;margin:0">Online — link enviado após inscrição</p></td></tr></table></div><p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 28px">Descreva o que o participante vai aprender, quem são os palestrantes e por que vale a pena participar.</p><table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr><td align="center" style="background:#1d4ed8;border-radius:10px;padding:15px 36px"><a href="#" style="color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;font-family:Arial,sans-serif">Garantir minha vaga →</a></td></tr></table></div><div style="background:#eff6ff;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;border-top:1px solid #bfdbfe"><p style="font-size:12px;color:#9ca3af;margin:0"><a href="{{unsubscribe_url}}" style="color:#6b7280;text-decoration:underline">Cancelar inscrição</a></p></div></div></div>`,
  },
  {
    id: 'atualizacao',
    name: 'Novidade/Produto',
    desc: 'Anúncio de atualização ou lançamento',
    color: '#111827',
    html: `<div style="background:#fafafa;padding:32px 16px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb"><div style="padding:28px 40px;border-bottom:1px solid #f3f4f6;text-align:center"><span style="font-size:20px;font-weight:900;color:#111">Sua <span style="color:#16a34a">Empresa</span></span></div><div style="background:#f0fdf4;padding:40px;text-align:center;border-bottom:1px solid #f3f4f6"><div style="background:#16a34a;border-radius:12px;display:inline-block;padding:14px 20px;margin:0 0 20px"><span style="font-size:28px">🚀</span></div><h1 style="font-size:22px;color:#111827;font-weight:900;margin:0 0 8px">Nova Atualização Disponível!</h1><p style="font-size:14px;color:#6b7280;margin:0">Confira o que mudou e como isso beneficia você</p></div><div style="padding:40px"><p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px">Olá, <strong>{{name}}</strong>! Temos novidades incríveis para compartilhar com você.</p><p style="font-size:14px;font-weight:700;color:#111827;margin:0 0 16px">O que há de novo:</p><div style="margin:0 0 14px;padding:16px;background:#f9fafb;border-radius:8px;border-left:3px solid #16a34a"><p style="font-size:14px;font-weight:700;color:#111827;margin:0 0 4px">✅ Nova funcionalidade 1</p><p style="font-size:13px;color:#6b7280;margin:0">Descrição do benefício para o usuário.</p></div><div style="margin:0 0 14px;padding:16px;background:#f9fafb;border-radius:8px;border-left:3px solid #3b82f6"><p style="font-size:14px;font-weight:700;color:#111827;margin:0 0 4px">✅ Nova funcionalidade 2</p><p style="font-size:13px;color:#6b7280;margin:0">Descrição do benefício para o usuário.</p></div><div style="margin:0 0 28px;padding:16px;background:#f9fafb;border-radius:8px;border-left:3px solid #8b5cf6"><p style="font-size:14px;font-weight:700;color:#111827;margin:0 0 4px">✅ Nova funcionalidade 3</p><p style="font-size:13px;color:#6b7280;margin:0">Descrição do benefício para o usuário.</p></div><table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr><td align="center" style="background:#111827;border-radius:10px;padding:14px 32px"><a href="#" style="color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;font-family:Arial,sans-serif">Ver todas as novidades →</a></td></tr></table></div><div style="padding:24px 40px;text-align:center;border-top:1px solid #f3f4f6"><p style="font-size:12px;color:#9ca3af;margin:0"><a href="{{unsubscribe_url}}" style="color:#6b7280;text-decoration:underline">Cancelar inscrição</a></p></div></div></div>`,
  },
  {
    id: 'minimalista',
    name: 'Minimalista',
    desc: 'Texto limpo, estilo carta pessoal',
    color: '#6b7280',
    html: `<div style="background:#ffffff;padding:48px 24px;font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto"><div style="border-bottom:2px solid #111827;padding-bottom:24px;margin-bottom:32px"><p style="font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#6b7280;margin:0">Sua Empresa</p></div><p style="font-size:16px;color:#374151;margin:0 0 24px;line-height:1.5">Olá, {{name}},</p><h1 style="font-size:26px;color:#111827;font-weight:700;margin:0 0 20px;line-height:1.3">Assunto principal do seu email aqui</h1><p style="font-size:16px;color:#374151;line-height:1.8;margin:0 0 20px">Parágrafo introdutório. Comece com o ponto mais importante. Seja direto e claro sobre o que você quer comunicar.</p><p style="font-size:16px;color:#374151;line-height:1.8;margin:0 0 32px">Continue com mais detalhes aqui. Este template é ideal para comunicações pessoais, textos longos ou quando você quer um visual mais sério e profissional.</p><table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px"><tr><td style="border:2px solid #111827;border-radius:6px;padding:12px 28px"><a href="#" style="color:#111827;font-weight:700;font-size:14px;text-decoration:none;letter-spacing:0.5px">CLIQUE AQUI →</a></td></tr></table><p style="font-size:15px;color:#374151;line-height:1.8;margin:0 0 40px">Atenciosamente,<br><strong>Seu nome</strong><br><span style="color:#6b7280;font-size:14px">Cargo — Empresa</span></p><div style="border-top:1px solid #e5e7eb;padding-top:24px"><p style="font-size:12px;color:#9ca3af;margin:0"><a href="{{unsubscribe_url}}" style="color:#9ca3af;text-decoration:underline">Cancelar inscrição</a></p></div></div>`,
  },
];

const DEFAULT_HTML = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
  <h1 style="color:#111827;font-size:24px;margin-bottom:8px">Olá, {{name}}!</h1>
  <p style="color:#374151;line-height:1.7">Escreva sua mensagem aqui.</p>
  <p style="color:#374151;line-height:1.7">Use <strong>{{name}}</strong> e <strong>{{email}}</strong> para personalizar.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
  <p style="color:#9ca3af;font-size:12px">
    <a href="{{unsubscribe_url}}" style="color:#6b7280">Cancelar inscrição</a>
  </p>
</div>`;

type EditorMode = 'visual' | 'html' | 'preview';

// ── Template Picker ────────────────────────────────────────────────────────────

function TemplatePickerModal({ onSelect, onClose }: { onSelect: (html: string) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">Escolher template</h2>
            <p className="text-sm text-gray-500 mt-0.5">Selecione um ponto de partida — você pode editar tudo depois</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => { onSelect(t.html); onClose(); }}
              className="group text-left border-2 border-gray-100 hover:border-indigo-400 rounded-xl overflow-hidden transition-all hover:shadow-lg focus:outline-none"
            >
              <div className="h-20 flex items-center justify-center text-white font-black text-2xl" style={{ background: t.color }}>
                {t.name.charAt(0)}
              </div>
              <div className="p-3">
                <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{t.desc}</p>
              </div>
            </button>
          ))}
          <button
            onClick={() => { onSelect(DEFAULT_HTML); onClose(); }}
            className="text-left border-2 border-dashed border-gray-200 hover:border-indigo-300 rounded-xl overflow-hidden transition-all focus:outline-none"
          >
            <div className="h-20 flex items-center justify-center text-gray-300 text-4xl">+</div>
            <div className="p-3">
              <p className="font-semibold text-gray-700 text-sm">Em branco</p>
              <p className="text-xs text-gray-400 mt-0.5">Comece do zero</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Test Email Modal ───────────────────────────────────────────────────────────

function TestEmailModal({ onClose, onSend, isSending }: { onClose: () => void; onSend: (email: string) => void; isSending: boolean }) {
  const [email, setEmail] = useState('');
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Enviar email de teste</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            O email será enviado com o assunto <strong>[TESTE]</strong> e as variáveis preenchidas com dados de exemplo.
          </p>
          <div>
            <label className="label">Endereço de email para teste</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && email) onSend(email); }}
            />
          </div>
          <button
            onClick={() => onSend(email)}
            disabled={!email || isSending}
            className="btn btn-primary w-full gap-2 disabled:opacity-50"
          >
            <FlaskConical size={15} />
            {isSending ? 'Enviando...' : 'Enviar teste'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Visual Editor ──────────────────────────────────────────────────────────────

const FONT_SIZES = ['10','11','12','13','14','15','16','18','20','22','24','28','32','36','40','48'];
const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
  { label: 'Courier New', value: "'Courier New', monospace" },
];
const BLOCK_TYPES = [
  { label: 'Parágrafo', value: 'p' },
  { label: 'Título 1', value: 'h1' },
  { label: 'Título 2', value: 'h2' },
  { label: 'Título 3', value: 'h3' },
  { label: 'Citação', value: 'blockquote' },
];

const BLOCK_TAGS = ['P','H1','H2','H3','H4','H5','H6','LI','DIV','BLOCKQUOTE','PRE','TD'];

function VisualEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const lastBlockRef = useRef<HTMLElement | null>(null);
  const [mode, setMode] = useState<EditorMode>('visual');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    if (mode === 'visual' && editorRef.current) {
      editorRef.current.innerHTML = value;
    }
  }, [mode]);

  // Salva range e bloco atual sempre que o usuário interage com o editor
  function trackEditorState() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    try {
      const range = sel.getRangeAt(0);
      savedRangeRef.current = range.cloneRange();
      // Sobe até o primeiro elemento de bloco
      let node: Node | null = range.startContainer;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.includes((node as Element).tagName)) {
          lastBlockRef.current = node as HTMLElement;
          return;
        }
        node = node.parentNode;
      }
    } catch {}
  }

  function exec(command: string, val?: string) {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, val);
    onChange(editorRef.current.innerHTML);
  }

  function applySpanStyle(styleProp: string, styleVal: string) {
    if (!editorRef.current) return;

    const sel = window.getSelection();
    if (!sel) return;

    // Tenta restaurar o range salvo antes do foco sair do editor
    if (savedRangeRef.current) {
      editorRef.current.focus();
      try {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      } catch {}
    } else {
      editorRef.current.focus();
    }

    const hasSelection = sel.rangeCount > 0 && !sel.isCollapsed;

    if (!hasSelection) {
      // SEM seleção: aplica diretamente no elemento de bloco rastreado
      const target = lastBlockRef.current;
      if (target && editorRef.current.contains(target)) {
        (target.style as any)[styleProp] = styleVal;
        onChange(editorRef.current.innerHTML);
      }
      return;
    }

    // COM seleção: envolve em <span> com o estilo inline
    try {
      const range = sel.getRangeAt(0);
      const frag = range.extractContents();
      const span = document.createElement('span');
      (span.style as any)[styleProp] = styleVal;
      span.appendChild(frag);
      range.insertNode(span);
      const r = document.createRange();
      r.selectNodeContents(span);
      sel.removeAllRanges();
      sel.addRange(r);
      onChange(editorRef.current.innerHTML);
    } catch {}
  }

  function switchMode(next: EditorMode) {
    if (mode === 'visual' && editorRef.current) onChange(editorRef.current.innerHTML);
    setMode(next);
  }

  function insertLink() {
    const url = window.prompt('URL do link (ex: https://seusite.com):');
    if (url) exec('createLink', url);
  }

  function insertImage() {
    const url = window.prompt('URL da imagem:');
    if (!url) return;
    exec('insertHTML', `<img src="${url}" alt="" style="max-width:100%;height:auto;display:block;margin:12px 0" />`);
  }

  function insertButton() {
    const text = window.prompt('Texto do botão:', 'Saiba mais');
    if (!text) return;
    const url = window.prompt('URL do botão:');
    if (!url) return;
    exec('insertHTML',
      `<table cellpadding="0" cellspacing="0" style="margin:16px 0">` +
      `<tr><td style="background:#16a34a;border-radius:8px;padding:13px 28px;text-align:center">` +
      `<a href="${url}" target="_blank" style="color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;font-family:Arial,sans-serif">${text}</a></td></tr></table>`
    );
  }

  function insertCallout() {
    exec('insertHTML',
      `<div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:0 8px 8px 0;padding:16px 20px;margin:16px 0;font-family:Arial,sans-serif">` +
      `<p style="font-size:14px;font-weight:700;color:#166534;margin:0 0 6px">💡 Dica importante</p>` +
      `<p style="font-size:14px;color:#374151;margin:0;line-height:1.6">Escreva sua mensagem de destaque aqui.</p></div>`
    );
  }

  function insertDivider() {
    exec('insertHTML', `<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0" />`);
  }

  const Sep = () => <span className="w-px h-5 bg-gray-200 mx-1 self-center shrink-0" />;

  function Btn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
    return (
      <button
        type="button"
        title={title}
        onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        className="p-1.5 rounded transition-colors hover:bg-gray-200 text-gray-600 hover:text-gray-900 shrink-0"
      >
        {children}
      </button>
    );
  }

  const selectCls = "h-7 text-xs border border-gray-200 rounded-md bg-white text-gray-700 px-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer hover:border-gray-300 transition-colors";

  const previewHtml = value
    .replace(/\{\{name\}\}/gi, 'João Silva')
    .replace(/\{\{email\}\}/gi, 'joao@exemplo.com')
    .replace(/\{\{unsubscribe_url\}\}/gi, '#');

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Mode tabs */}
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200">
        {(['visual', 'html', 'preview'] as EditorMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
              mode === m ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {m === 'visual' ? 'Visual' : m === 'html' ? 'HTML' : 'Pré-visualizar'}
          </button>
        ))}
        {mode === 'preview' && (
          <div className="ml-auto flex gap-1">
            <button type="button" onClick={() => setPreviewDevice('desktop')}
              className={`text-xs px-2 py-1 rounded font-medium transition-colors ${previewDevice === 'desktop' ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
            >🖥 Desktop</button>
            <button type="button" onClick={() => setPreviewDevice('mobile')}
              className={`text-xs px-2 py-1 rounded font-medium transition-colors ${previewDevice === 'mobile' ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
            >📱 Mobile</button>
          </div>
        )}
      </div>

      {/* Toolbar — visual only */}
      {mode === 'visual' && (
        <div className="border-b border-gray-200 bg-gray-50 divide-y divide-gray-100">

          {/* ── Fileira 1: Histórico · Bloco · Fonte · Tamanho · Formatação · Cores ── */}
          <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
            <Btn onClick={() => exec('undo')} title="Desfazer (Ctrl+Z)"><RotateCcw size={14} /></Btn>
            <Btn onClick={() => exec('redo')} title="Refazer (Ctrl+Y)"><RotateCw size={14} /></Btn>
            <Sep />

            {/* Bloco */}
            <select className={selectCls} defaultValue="p" title="Formato do bloco"
              onMouseDown={trackEditorState}
              onChange={(e) => { if (savedRangeRef.current) { editorRef.current?.focus(); try { const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(savedRangeRef.current); } catch {} } exec('formatBlock', e.target.value); }}>
              {BLOCK_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
            <Sep />

            {/* Fonte */}
            <select className={`${selectCls} max-w-[108px]`} defaultValue="Arial, Helvetica, sans-serif" title="Fonte"
              onMouseDown={trackEditorState}
              onChange={(e) => applySpanStyle('fontFamily', e.target.value)}>
              {FONT_FAMILIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>

            {/* Tamanho */}
            <select className={`${selectCls} w-[68px]`} defaultValue="" title="Tamanho da fonte (selecione o texto primeiro)"
              onMouseDown={trackEditorState}
              onChange={(e) => {
                if (e.target.value) { applySpanStyle('fontSize', e.target.value + 'px'); (e.target as HTMLSelectElement).value = ''; }
              }}>
              <option value="" disabled>Tam.</option>
              {FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
            </select>
            <Sep />

            {/* Formatação de texto */}
            <Btn onClick={() => exec('bold')} title="Negrito (Ctrl+B)"><Bold size={14} /></Btn>
            <Btn onClick={() => exec('italic')} title="Itálico (Ctrl+I)"><Italic size={14} /></Btn>
            <Btn onClick={() => exec('underline')} title="Sublinhado (Ctrl+U)"><Underline size={14} /></Btn>
            <Btn onClick={() => exec('strikeThrough')} title="Tachado"><Strikethrough size={14} /></Btn>
            <Sep />

            {/* Cor do texto */}
            <label title="Cor do texto (selecione o texto primeiro)" className="relative p-1.5 rounded hover:bg-gray-200 cursor-pointer flex items-center text-gray-600 shrink-0">
              <Palette size={14} />
              <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                onMouseDown={trackEditorState}
                onChange={(e) => { exec('foreColor', e.target.value); }} />
            </label>

            {/* Cor de fundo */}
            <label title="Cor de fundo do texto (selecione o texto primeiro)" className="relative p-1.5 rounded hover:bg-gray-200 cursor-pointer flex items-center text-gray-600 shrink-0">
              <Highlighter size={14} />
              <input type="color" defaultValue="#fef08a" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                onMouseDown={trackEditorState}
                onChange={(e) => { exec('hiliteColor', e.target.value); }} />
            </label>
          </div>

          {/* ── Fileira 2: Alinhamento · Listas · Inserir · Limpar ── */}
          <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
            <Btn onClick={() => exec('justifyLeft')} title="Alinhar à esquerda"><AlignLeft size={14} /></Btn>
            <Btn onClick={() => exec('justifyCenter')} title="Centralizar"><AlignCenter size={14} /></Btn>
            <Btn onClick={() => exec('justifyRight')} title="Alinhar à direita"><AlignRight size={14} /></Btn>
            <Btn onClick={() => exec('justifyFull')} title="Justificar"><AlignJustify size={14} /></Btn>
            <Sep />
            <Btn onClick={() => exec('insertUnorderedList')} title="Lista com marcadores"><List size={14} /></Btn>
            <Btn onClick={() => exec('insertOrderedList')} title="Lista numerada"><ListOrdered size={14} /></Btn>
            <Sep />
            <Btn onClick={insertLink} title="Inserir link"><Link2 size={14} /></Btn>
            <Btn onClick={insertImage} title="Inserir imagem por URL"><ImageIcon size={14} /></Btn>
            <Btn onClick={insertButton} title="Inserir botão CTA">
              <span className="text-[9px] font-black px-1.5 py-0.5 bg-green-600 text-white rounded leading-none">BTN</span>
            </Btn>
            <Btn onClick={insertCallout} title="Inserir caixa de destaque">
              <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded leading-none">💡</span>
            </Btn>
            <Btn onClick={insertDivider} title="Linha divisória"><Minus size={14} /></Btn>
            <Sep />
            <Btn onClick={() => exec('removeFormat')} title="Remover toda formatação do texto selecionado"><Eraser size={14} /></Btn>
          </div>
        </div>
      )}

      {/* Dica de uso */}
      {mode === 'visual' && (
        <div className="px-3 py-1.5 bg-indigo-50 border-b border-indigo-100 text-[11px] text-indigo-500">
          💡 <strong>Fonte e tamanho:</strong> clique no parágrafo para aplicar ao bloco inteiro, ou selecione o texto para aplicar só na seleção.
        </div>
      )}

      {/* Área de edição */}
      {mode === 'visual' && (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => editorRef.current && onChange(editorRef.current.innerHTML)}
          onMouseUp={trackEditorState}
          onKeyUp={trackEditorState}
          onClick={trackEditorState}
          onBlur={trackEditorState}
          className="min-h-[520px] p-6 focus:outline-none leading-relaxed overflow-y-auto bg-white"
          style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '14px', color: '#374151', lineHeight: '1.75' }}
        />
      )}
      {mode === 'html' && (
        <textarea
          className="w-full min-h-[520px] p-4 font-mono text-xs focus:outline-none resize-none bg-gray-50 text-gray-700"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {mode === 'preview' && (
        <div className="bg-gray-100 p-6 flex justify-center min-h-[520px]">
          <iframe
            srcDoc={previewHtml}
            className={`bg-white rounded-lg shadow-md transition-all ${previewDevice === 'mobile' ? 'w-80' : 'w-full max-w-2xl'}`}
            style={{ minHeight: '480px', border: 'none' }}
            sandbox="allow-same-origin"
          />
        </div>
      )}
    </div>
  );
}

// ── Main Form ──────────────────────────────────────────────────────────────────

function NovaCampanhaForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('id');

  const [form, setForm] = useState({
    name: '', subject: '', from_name: '', html_body: DEFAULT_HTML, delay_ms: 1500,
  });
  const [sendOpts, setSendOpts] = useState({ tag_filter: '', scheduled_for: '' });
  const [manualEmails, setManualEmails] = useState('');
  const [recipientMode, setRecipientMode] = useState<'manual' | 'all' | 'tag' | 'contacts'>('all');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [showExtraEmails, setShowExtraEmails] = useState(false);
  const [step, setStep] = useState<'edit' | 'send'>('edit');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(!editId);
  const [showTestModal, setShowTestModal] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const { data: existingCampaign } = useQuery({
    queryKey: ['email-campaign-edit', editId],
    queryFn: () => api.get(`/email/campaigns/${editId}`).then((r) => r.data),
    enabled: !!editId,
  });

  useEffect(() => {
    if (existingCampaign) {
      setForm({
        name: existingCampaign.name ?? '',
        subject: existingCampaign.subject ?? '',
        from_name: existingCampaign.from_name ?? '',
        html_body: existingCampaign.html_body ?? DEFAULT_HTML,
        delay_ms: existingCampaign.delay_ms ?? 1500,
      });
      setSavedId(existingCampaign.id);
      setShowTemplates(false);
    }
  }, [existingCampaign]);

  const { data: tagsData } = useQuery({
    queryKey: ['contact-tags'],
    queryFn: () => api.get('/contacts/tags').then((r) => r.data).catch(() => []),
  });
  const tags: string[] = Array.isArray(tagsData)
    ? tagsData.map((t: any) => (typeof t === 'string' ? t : t.tag ?? ''))
    : [];

  const { data: pickerData } = useQuery({
    queryKey: ['contacts-email-picker', contactSearch],
    queryFn: () => api.get(`/contacts?search=${encodeURIComponent(contactSearch)}&limit=100`).then((r) => r.data),
    enabled: recipientMode === 'contacts',
    staleTime: 60_000,
  });
  const pickerContacts: { id: string; name: string; email: string | null; phone: string }[] = pickerData?.data ?? [];

  const { data: recipientCountData } = useQuery<{ count: number | null }>({
    queryKey: ['email-recipient-count', recipientMode, sendOpts.tag_filter, selectedContactIds.join(',')],
    queryFn: () => {
      const p: Record<string, any> = { recipient_source: recipientMode };
      if (recipientMode === 'tag' && sendOpts.tag_filter) p.tag_filter = sendOpts.tag_filter;
      if (recipientMode === 'contacts' && selectedContactIds.length > 0) p.contact_ids = selectedContactIds.join(',');
      return api.get('/email/recipient-count', { params: p }).then((r) => r.data);
    },
    enabled: step === 'send' && recipientMode !== 'manual',
    staleTime: 30_000,
  });

  const { data: senderData } = useQuery<{ sender_email: string | null; sender_email_verified: boolean }>({
    queryKey: ['sender-email'],
    queryFn: () => api.get('/auth/sender-email').then((r) => r.data),
  });
  const senderOk = senderData?.sender_email_verified === true;

  const saveMutation = useMutation({
    mutationFn: (body: object) =>
      savedId
        ? api.put(`/email/campaigns/${savedId}`, body).then((r) => r.data)
        : api.post('/email/campaigns', body).then((r) => r.data),
    onSuccess: (data: any) => {
      setSavedId(data.id);
      toast.success('Campanha salva!');
      setStep('send');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao salvar'),
  });

  const sendMutation = useMutation({
    mutationFn: (body: object) =>
      api.post(`/email/campaigns/${savedId}/send`, body).then((r) => r.data),
    onSuccess: (data: any) => {
      toast.success(`${data.total} emails enfileirados com sucesso!`);
      router.push('/email');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao enviar'),
  });

  const testMutation = useMutation({
    mutationFn: (test_email: string) =>
      api.post(`/email/campaigns/${savedId}/test`, { test_email }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Email de teste enviado! Verifique sua caixa de entrada.');
      setShowTestModal(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erro ao enviar teste'),
  });

  function handleSave() {
    if (!form.name.trim() || !form.subject.trim() || !form.html_body.trim()) {
      toast.error('Preencha nome, assunto e conteúdo');
      return;
    }
    saveMutation.mutate(form);
  }

  function parseEmails(raw: string) {
    return raw.split(/[\n,;]+/).map((e) => e.trim().toLowerCase()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  }

  function handleSend() {
    if (!savedId) return;
    if (recipientMode === 'manual' && parseEmails(manualEmails).length === 0) {
      toast.error('Adicione pelo menos um email válido');
      return;
    }
    if (recipientMode === 'contacts' && selectedContactIds.length === 0) {
      toast.error('Selecione pelo menos um contato');
      return;
    }
    if (recipientMode === 'tag' && !sendOpts.tag_filter) {
      toast.error('Selecione uma tag');
      return;
    }
    const manualParsed = parseEmails(manualEmails);
    const includeManual = recipientMode === 'manual' || (showExtraEmails && manualParsed.length > 0);
    sendMutation.mutate({
      recipient_source: recipientMode,
      tag_filter: recipientMode === 'tag' ? sendOpts.tag_filter || undefined : undefined,
      contact_ids: recipientMode === 'contacts' ? selectedContactIds : undefined,
      manual_emails: includeManual ? manualParsed : undefined,
      scheduled_for: sendOpts.scheduled_for || undefined,
    });
  }

  const recipientCount = recipientCountData?.count;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Modals */}
      {showTemplates && (
        <TemplatePickerModal
          onSelect={(html) => { setForm((f) => ({ ...f, html_body: html })); setEditorKey((k) => k + 1); }}
          onClose={() => setShowTemplates(false)}
        />
      )}
      {showTestModal && savedId && (
        <TestEmailModal
          onClose={() => setShowTestModal(false)}
          onSend={(email) => testMutation.mutate(email)}
          isSending={testMutation.isPending}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/email')} className="text-gray-400 hover:text-gray-600">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {editId ? 'Editar campanha' : 'Nova campanha de email'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure e envie emails personalizados para seus contatos</p>
        </div>
        {step === 'send' && savedId && (
          <button
            onClick={() => setShowTestModal(true)}
            className="btn btn-secondary gap-2 text-sm"
          >
            <FlaskConical size={14} /> Enviar teste
          </button>
        )}
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        <div className="h-1 flex-1 rounded-full bg-indigo-500" />
        <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'send' ? 'bg-indigo-500' : 'bg-gray-200'}`} />
      </div>

      {/* ── Step 1: Edit ── */}
      {step === 'edit' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: settings */}
          <div className="space-y-4">
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Mail size={16} /> Configurações
                </h2>
              </div>
              <div>
                <label className="label">Nome da campanha (interno)</label>
                <input className="input" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Newsletter Maio 2026" />
              </div>
              <div>
                <label className="label">Assunto do email</label>
                <input className="input" value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Ex: Novidades exclusivas para você!" />
              </div>
              <div>
                <label className="label">Nome do remetente (opcional)</label>
                <input className="input" value={form.from_name}
                  onChange={(e) => setForm({ ...form, from_name: e.target.value })}
                  placeholder="Ex: João da Empresa" />
                <p className="text-xs text-gray-400 mt-1">
                  Aparece como: <em>{form.from_name || 'Clica Aí'} &lt;noreply@clicaai.ia.br&gt;</em>
                </p>
              </div>
              <div>
                <label className="label">Intervalo entre envios</label>
                <select className="input" value={form.delay_ms}
                  onChange={(e) => setForm({ ...form, delay_ms: Number(e.target.value) })}>
                  <option value={500}>500ms — mais rápido</option>
                  <option value={1000}>1 segundo</option>
                  <option value={1500}>1,5 segundos (recomendado)</option>
                  <option value={3000}>3 segundos — mais seguro</option>
                </select>
              </div>
            </div>

            <div className="card p-4 bg-indigo-50 border border-indigo-100 text-sm text-indigo-800 space-y-1">
              <p className="font-semibold">Variáveis disponíveis</p>
              <p><code className="bg-indigo-100 px-1 rounded text-xs">{`{{name}}`}</code> — Nome do contato</p>
              <p><code className="bg-indigo-100 px-1 rounded text-xs">{`{{email}}`}</code> — Email do contato</p>
              <p><code className="bg-indigo-100 px-1 rounded text-xs">{`{{unsubscribe_url}}`}</code> — Link de descadastro</p>
            </div>
          </div>

          {/* Right: editor */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Conteúdo do email</h2>
              <button
                type="button"
                onClick={() => setShowTemplates(true)}
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold border border-indigo-200 hover:border-indigo-400 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <LayoutTemplate size={13} /> Usar template
              </button>
            </div>
            <VisualEditor
              key={editorKey}
              value={form.html_body}
              onChange={(v) => setForm({ ...form, html_body: v })}
            />
          </div>
        </div>
      )}

      {/* ── Step 2: Send ── */}
      {step === 'send' && (
        <div className="max-w-lg space-y-4">
          {/* Bloqueio: email de remetente não verificado */}
          {!senderOk && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-amber-800">Email de remetente não verificado</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {senderData?.sender_email
                    ? `Confirme o email ${senderData.sender_email} clicando no link enviado para sua caixa de entrada.`
                    : 'Configure um email de remetente antes de enviar campanhas.'}
                </p>
              </div>
              <Link
                href="/email/configuracoes"
                className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Settings size={12} /> Configurar
              </Link>
            </div>
          )}

          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Users size={16} /> Destinatários
            </h2>

            <div className="space-y-2">
              <label className="label">Para quem enviar?</label>
              {(
                [
                  { value: 'manual', label: 'Apenas emails manuais', desc: 'Somente os endereços que você digitar — ideal para testes' },
                  { value: 'all', label: 'Todos os contatos com email', desc: 'Todos os contatos com email cadastrado e sem opt-out' },
                  { value: 'tag', label: 'Filtrar por tag', desc: 'Contatos de uma tag específica' },
                  { value: 'contacts', label: 'Contatos específicos', desc: 'Selecione contatos individualmente' },
                ] as { value: 'manual' | 'all' | 'tag' | 'contacts'; label: string; desc: string }[]
              ).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    recipientMode === opt.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="recipientMode"
                    value={opt.value}
                    checked={recipientMode === opt.value}
                    onChange={() => { setRecipientMode(opt.value); setSelectedContactIds([]); setContactSearch(''); }}
                    className="mt-0.5 accent-indigo-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Recipient count badge */}
            {recipientMode !== 'manual' && recipientCount != null && (
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-800">
                <Users2 size={14} className="text-indigo-500 shrink-0" />
                <span><strong>{recipientCount.toLocaleString('pt-BR')}</strong> contato{recipientCount !== 1 ? 's' : ''} receberá este email</span>
              </div>
            )}
            {recipientMode !== 'manual' && recipientCount === 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                ⚠️ Nenhum contato encontrado com email válido para este filtro
              </div>
            )}

            {/* Tag selector */}
            {recipientMode === 'tag' && (
              <div>
                <label className="label">Tag</label>
                <select className="input" value={sendOpts.tag_filter}
                  onChange={(e) => setSendOpts({ ...sendOpts, tag_filter: e.target.value })}>
                  <option value="">Selecione uma tag...</option>
                  {tags.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}

            {/* Contact picker */}
            {recipientMode === 'contacts' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="label mb-0 flex-1">Selecionar contatos</label>
                  {selectedContactIds.length > 0 && (
                    <button type="button" onClick={() => setSelectedContactIds([])} className="text-xs text-red-500 hover:text-red-700">
                      Limpar ({selectedContactIds.length})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    className="input pl-8 text-sm"
                    placeholder="Buscar por nome..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                  />
                </div>
                <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-100">
                  {pickerContacts.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-5">
                      {contactSearch ? 'Nenhum contato encontrado' : 'Carregando...'}
                    </p>
                  )}
                  {pickerContacts.map((c) => {
                    const checked = selectedContactIds.includes(c.id);
                    const hasEmail = !!c.email;
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-3 px-3 py-2 transition-colors ${
                          hasEmail ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
                        } ${checked ? 'bg-indigo-50' : hasEmail ? 'hover:bg-gray-50' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!hasEmail}
                          onChange={() => {
                            if (!hasEmail) return;
                            setSelectedContactIds((prev) =>
                              checked ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                            );
                          }}
                          className="accent-indigo-600 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                          <p className="text-xs truncate">
                            {c.email
                              ? <span className="text-gray-400">{c.email}</span>
                              : <span className="text-amber-600 italic">sem email</span>}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {selectedContactIds.length > 0 && (
                  <p className="text-xs text-indigo-600 font-medium">
                    {selectedContactIds.length} contato{selectedContactIds.length !== 1 ? 's' : ''} selecionado{selectedContactIds.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {/* Manual emails */}
            {recipientMode === 'manual' ? (
              <div>
                <label className="label">Endereços de email</label>
                <textarea
                  className="input font-mono text-xs min-h-24 resize-none"
                  value={manualEmails}
                  onChange={(e) => setManualEmails(e.target.value)}
                  placeholder={'joao@exemplo.com\nmaria@empresa.com\ncliente@gmail.com'}
                />
                <p className="text-xs text-gray-400 mt-1">Um por linha ou separados por vírgula.</p>
              </div>
            ) : (
              <div className="pt-1 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showExtraEmails}
                    onChange={(e) => setShowExtraEmails(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700">Também enviar para emails adicionais</span>
                </label>
                {showExtraEmails && (
                  <div className="mt-2">
                    <textarea
                      className="input font-mono text-xs min-h-20 resize-none"
                      value={manualEmails}
                      onChange={(e) => setManualEmails(e.target.value)}
                      placeholder={'joao@exemplo.com\nmaria@empresa.com'}
                    />
                    <p className="text-xs text-gray-400 mt-1">Um por linha ou separados por vírgula.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Clock size={16} /> Agendamento
            </h2>
            <div>
              <label className="label">Enviar em (deixe em branco para enviar agora)</label>
              <input type="datetime-local" className="input" value={sendOpts.scheduled_for}
                onChange={(e) => setSendOpts({ ...sendOpts, scheduled_for: e.target.value })} />
            </div>
          </div>

          <div className="card p-4 bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <p className="font-semibold mb-1">Antes de enviar</p>
            <ul className="space-y-0.5">
              <li>· Inclua <code className="bg-amber-100 px-1 rounded text-xs">{`{{unsubscribe_url}}`}</code> no conteúdo (obrigatório por lei)</li>
              <li>· Use o botão <strong>Enviar teste</strong> acima para ver como o email chega na caixa de entrada</li>
            </ul>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        {step === 'send' && (
          <button onClick={() => setStep('edit')} className="btn btn-secondary">
            ← Voltar ao editor
          </button>
        )}
        {step === 'edit' && (
          <button onClick={handleSave} disabled={saveMutation.isPending} className="btn btn-primary gap-2">
            <Check size={15} />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar e configurar envio'}
          </button>
        )}
        {step === 'send' && (
          <button onClick={handleSend} disabled={sendMutation.isPending || !senderOk} className="btn btn-primary gap-2 disabled:opacity-40">
            <Send size={15} />
            {sendMutation.isPending
              ? 'Enfileirando...'
              : sendOpts.scheduled_for ? 'Agendar envio' : 'Enviar agora'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function NovaCampanhaPage() {
  return (
    <Suspense fallback={<p className="text-gray-400 py-10 text-center">Carregando...</p>}>
      <NovaCampanhaForm />
    </Suspense>
  );
}
