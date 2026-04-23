'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Send, Flame, Bot, Smartphone, BarChart2, Check, ChevronDown, ChevronUp,
  Zap, Shield, Users, Star, ArrowRight, Menu, X, Sparkles,
  AlertTriangle, Lock, ShieldCheck, FileText, Link2, ClipboardCheck,
  Layers, Paperclip, UserCheck,
} from 'lucide-react';

// ─── Contato WhatsApp ─────────────────────────────────────────────────────────
const WA = (msg: string) => `https://wa.me/5535999153639?text=${encodeURIComponent(msg)}`;
const WA_PLANS   = WA('Olá! Tenho interesse em contratar o Clica Aí. Pode me ajudar?');
const WA_SUPPORT = WA('Olá! Preciso de suporte com o Clica Aí.');
const WA_START   = WA('Olá! Quero começar a usar o Clica Aí. Como funciona?');
const WA_INFO    = WA('Olá! Vim pelo site do Clica Aí e gostaria de mais informações.');

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Send,
    title: 'Disparos em massa',
    desc: 'Envie campanhas para milhares de contatos com delay inteligente entre mensagens — com texto, imagens, PDFs ou qualquer arquivo.',
    color: 'bg-green-100 text-green-600',
    badge: null,
  },
  {
    icon: Layers,
    title: 'Envio em Lotes Anti-Bloqueio',
    desc: 'Divida campanhas grandes em grupos de 50 com intervalo de horas entre eles. O Meta restringe quem envia demais de uma vez — aqui você fica protegido.',
    color: 'bg-orange-100 text-orange-600',
    badge: 'Novo',
  },
  {
    icon: Paperclip,
    title: 'Envio de arquivos',
    desc: 'Anexe fotos, PDFs, planilhas Excel, documentos Word e vídeos direto na campanha. Todos os destinatários recebem o arquivo via WhatsApp.',
    color: 'bg-teal-100 text-teal-600',
    badge: 'Novo',
  },
  {
    icon: Flame,
    title: 'Aquecimento inteligente',
    desc: 'Seus números simulam conversas reais sobre músicas, filmes, livros e mais — construindo reputação no WhatsApp sem padrões repetitivos.',
    color: 'bg-red-100 text-red-600',
    badge: null,
  },
  {
    icon: UserCheck,
    title: 'Rastreamento de contactados',
    desc: 'O sistema marca quem já recebeu sua mensagem. Crie novas campanhas filtrando apenas quem ainda não foi atingido — zero reenvio acidental.',
    color: 'bg-indigo-100 text-indigo-600',
    badge: 'Novo',
  },
  {
    icon: Bot,
    title: 'Bot de atendimento com IA',
    desc: 'Configure um assistente virtual que responde clientes 24h por dia, entende o contexto e sabe quando chamar um humano.',
    color: 'bg-blue-100 text-blue-600',
    badge: null,
  },
  {
    icon: Smartphone,
    title: 'Múltiplos números',
    desc: 'Conecte até 6 números WhatsApp e distribua envios automaticamente entre eles para escalar sem pausas.',
    color: 'bg-purple-100 text-purple-600',
    badge: null,
  },
  {
    icon: BarChart2,
    title: 'Relatórios em tempo real',
    desc: 'Acompanhe enviadas, entregues, falhas e opt-outs de cada campanha — inclusive progresso de cada lote de envio.',
    color: 'bg-yellow-100 text-yellow-600',
    badge: null,
  },
  {
    icon: Users,
    title: 'Gestão de contatos',
    desc: 'Importe planilhas Excel ou CSV, filtre por tags, visualize quem foi contactado e mantenha sua base sempre limpa e atualizada.',
    color: 'bg-pink-100 text-pink-600',
    badge: null,
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Crie e confirme sua conta',
    desc: 'Cadastre-se com nome, email e WhatsApp. Confirme seu email e aguarde a aprovação da equipe Clica Aí — geralmente em até 24h.',
  },
  {
    num: '02',
    title: 'Conecte e aqueça seus números',
    desc: 'Escaneie o QR code para conectar seu WhatsApp. Ative o aquecimento automático para construir reputação antes de disparar.',
  },
  {
    num: '03',
    title: 'Importe, dispare e acompanhe',
    desc: 'Suba uma planilha de contatos, crie sua campanha e monitore entregues, falhas e opt-outs em tempo real.',
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: 'R$ 67,90',
    period: '/mês',
    desc: 'Ideal para começar a automatizar',
    highlight: false,
    features: [
      'Até 3 números WhatsApp',
      'Disparos em massa ilimitados',
      'Aquecimento de números',
      'Bot de IA (chave de API própria)',
      'Até 5.000 contatos',
      'Dashboard e relatórios completos',
      '7 dias grátis para testar',
    ],
    cta: 'Começar grátis',
  },
  {
    name: 'Pro',
    price: 'R$ 117,90',
    period: '/mês',
    desc: 'Para quem precisa de mais escala',
    highlight: true,
    features: [
      'Até 6 números WhatsApp',
      'Disparos em massa ilimitados',
      'Aquecimento de números',
      'Bot de IA (chave de API própria)',
      'Contatos ilimitados',
      'Dashboard e relatórios completos',
      'Suporte prioritário via WhatsApp',
      '7 dias grátis para testar',
    ],
    cta: 'Começar grátis',
  },
];

const FAQS = [
  {
    q: 'Meu número pode ser bloqueado pelo WhatsApp?',
    a: 'O risco existe em qualquer ferramenta de automação. Por isso o Clica Aí tem delays configuráveis entre mensagens, sistema de aquecimento de números e limite de disparos diários — tudo para imitar comportamento humano e reduzir ao máximo esse risco.',
  },
  {
    q: 'O sistema funciona com qualquer número de WhatsApp?',
    a: 'Sim, funciona com WhatsApp pessoal e WhatsApp Business. Recomendamos usar números dedicados ao negócio e não o número pessoal principal.',
  },
  {
    q: 'Como funciona o bot de atendimento com IA?',
    a: 'Você configura um "prompt de identidade" para o bot (ex: "Você é o assistente da loja X...") e insere sua chave de API da Anthropic (Claude) ou OpenAI. O bot mantém o histórico da conversa, entende o contexto e sabe quando escalar para um atendente humano.',
  },
  {
    q: 'Preciso pagar pela IA do bot separado?',
    a: 'Sim. O bot usa sua própria chave de API (Anthropic ou OpenAI). O custo é muito baixo — cerca de R$0,01 a R$0,07 por conversa completa — e você paga diretamente ao provedor de IA, sem taxas adicionais da nossa parte.',
  },
  {
    q: 'O que é o envio em lotes e por que evita bloqueios?',
    a: 'O Meta (WhatsApp) restringe números que enviam muitas mensagens para contatos diferentes de forma rápida — o número pode ficar limitado por 24h. O modo de envio em lotes divide a campanha em grupos (ex: 50 por vez) com um intervalo de horas entre cada grupo. Assim o comportamento parece mais natural e o risco de restrição cai drasticamente.',
  },
  {
    q: 'Que tipos de arquivo posso enviar em uma campanha?',
    a: 'Você pode anexar imagens (JPG, PNG, WebP), PDFs, documentos Word (.docx), planilhas Excel (.xlsx), apresentações PowerPoint, vídeos (MP4, AVI) e áudios (MP3, OGG). Os arquivos são hospedados em nuvem e entregues via WhatsApp para todos os destinatários da campanha.',
  },
  {
    q: 'Posso cancelar a qualquer momento?',
    a: 'Sim, sem fidelidade e sem multa. Você começa com 7 dias grátis sem precisar de cartão. Se decidir cancelar, basta falar com a gente pelo WhatsApp e o acesso é encerrado no fim do período pago.',
  },
  {
    q: 'Posso usar o sistema para qualquer tipo de mensagem?',
    a: 'Não. O uso é restrito a comunicações legítimas com pessoas que consentiram receber suas mensagens. Spam, golpes, mensagens ofensivas e qualquer uso ilegal são estritamente proibidos e resultam no cancelamento imediato da conta.',
  },
  {
    q: 'A plataforma me ajuda a estar em conformidade com a LGPD?',
    a: 'Sim. O Clica Aí possui ferramentas nativas de conformidade com a LGPD (Lei 13.709/2018): registro da origem do consentimento de cada contato, link público de opt-in para coleta de consentimento explícito e documentado, declaração obrigatória antes de cada campanha e opt-out automático quando o contato responde "SAIR". Além disso, publicamos nossos Termos de Uso e Política de Privacidade detalhados.',
  },
  {
    q: 'O que é o link de opt-in e por que devo usar?',
    a: 'É uma página pública única gerada para a sua conta (ex: clicaai.ia.br/optin/seu-id) onde seus leads preenchem nome, telefone e marcam uma caixa confirmando que querem receber suas mensagens. Esse registro com data e hora é a prova de consentimento mais sólida exigida pela LGPD — muito mais seguro do que planilhas importadas sem comprovação.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Fernanda Costa',
    role: 'Dona de e-commerce de moda',
    text: 'Antes eu ficava horas mandando mensagem uma por uma para avisar sobre promoções. Agora configuro a campanha em 5 minutos e durmo enquanto os pedidos chegam.',
    stars: 5,
  },
  {
    name: 'Rafael Mendes',
    role: 'Gestor de tráfego pago',
    text: 'Uso o Clica Aí para follow-up dos leads dos meus clientes. A taxa de resposta no WhatsApp é 10x maior que e-mail. O bot de IA foi a cereja do bolo.',
    stars: 5,
  },
  {
    name: 'Patrícia Alves',
    role: 'Clínica estética',
    text: 'O aquecimento de números salvou minha operação. Tive 3 números bloqueados antes de descobrir o sistema. Desde que ativei o aquecimento, zero bloqueios.',
    stars: 5,
  },
];

// ─── Phone Mockup ─────────────────────────────────────────────────────────────

function PhoneMockup() {
  return (
    <div className="relative w-64 mx-auto select-none">
      <div className="absolute inset-0 bg-green-400/20 blur-3xl rounded-full scale-110" />
      <div className="relative bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl border border-gray-700">
        <div className="bg-white rounded-[2rem] overflow-hidden">
          {/* Header */}
          <div className="bg-green-600 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center text-white text-xs font-bold">CA</div>
            <div>
              <p className="text-white text-xs font-semibold">Clica Aí Bot</p>
              <p className="text-green-200 text-[10px]">online agora</p>
            </div>
          </div>
          {/* Chat */}
          <div className="bg-[#e5ddd5] px-3 py-3 space-y-2 min-h-[280px]">
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%] shadow-sm">
                <p className="text-[11px] text-gray-800">Oi! Vi que vocês têm promoção hoje 👀</p>
                <p className="text-[9px] text-gray-400 text-right mt-0.5">09:14</p>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-3 py-2 max-w-[80%] shadow-sm">
                <p className="text-[11px] text-gray-800">Olá! Sim, 30% OFF hoje! 🎉 Posso te ajudar a escolher?</p>
                <p className="text-[9px] text-green-600 text-right mt-0.5">09:14 ✓✓</p>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%] shadow-sm">
                <p className="text-[11px] text-gray-800">Que ótimo! Quero ver as blusas 😍</p>
                <p className="text-[9px] text-gray-400 text-right mt-0.5">09:15</p>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-3 py-2 max-w-[80%] shadow-sm">
                <p className="text-[11px] text-gray-800">Perfeito! Temos novidades incríveis 🛍️ Clique para ver o catálogo 👇</p>
                <p className="text-[9px] text-green-600 text-right mt-0.5">09:15 ✓✓</p>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm flex gap-1 items-center">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
          {/* Input */}
          <div className="bg-[#f0f0f0] px-3 py-2 flex items-center gap-2">
            <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-[10px] text-gray-400">Mensagem</div>
            <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center">
              <Send size={11} className="text-white" />
            </div>
          </div>
        </div>
      </div>
      {/* Floating badges */}
      <div className="absolute -right-8 top-8 bg-white rounded-xl shadow-lg px-3 py-2 flex items-center gap-1.5 text-xs font-bold text-green-700 border border-green-100 whitespace-nowrap">
        <Zap size={11} className="text-green-500" /> 1.240 enviadas
      </div>
      <div className="absolute -left-10 bottom-20 bg-white rounded-xl shadow-lg px-3 py-2 flex items-center gap-1.5 text-xs font-bold text-blue-700 border border-blue-100 whitespace-nowrap">
        <Bot size={11} className="text-blue-500" /> Bot ativo 24h
      </div>
      <div className="absolute -right-6 bottom-10 bg-white rounded-xl shadow-lg px-3 py-2 flex items-center gap-1.5 text-xs font-bold text-orange-600 border border-orange-100 whitespace-nowrap">
        <Flame size={11} className="text-orange-500" /> Aquecido
      </div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center shadow-sm">
            <Zap size={15} className="text-white" />
          </div>
          <span className="text-xl font-black text-gray-900">Clica <span className="text-green-600">Aí</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <a href="#funcionalidades" className="hover:text-green-600 transition-colors">Funcionalidades</a>
          <a href="#precos" className="hover:text-green-600 transition-colors">Preços</a>
          <a href="#faq" className="hover:text-green-600 transition-colors">FAQ</a>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 transition-colors">Entrar</Link>
          <Link href="/register" className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm">
            Começar grátis
          </Link>
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-1">
          {[['#funcionalidades', 'Funcionalidades'], ['#precos', 'Preços'], ['#faq', 'FAQ']].map(([h, l]) => (
            <a key={h} href={h} onClick={() => setOpen(false)} className="block text-sm font-medium text-gray-600 hover:text-green-600 py-2.5">{l}</a>
          ))}
          <div className="pt-3 flex flex-col gap-2 border-t border-gray-100 mt-2">
            <Link href="/login" className="text-center text-sm font-medium text-gray-700 border border-gray-200 rounded-xl py-2.5">Entrar</Link>
            <Link href="/register" className="text-center bg-green-600 text-white text-sm font-bold rounded-xl py-2.5">Começar grátis</Link>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── FAQ Item ─────────────────────────────────────────────────────────────────

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-2xl overflow-hidden transition-colors ${open ? 'border-green-200' : 'border-gray-200'}`}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors gap-4">
        <span className="font-semibold text-gray-800 text-sm">{q}</span>
        {open
          ? <ChevronUp size={18} className="text-green-600 shrink-0" />
          : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3 bg-green-50/30">
          {a}
        </div>
      )}
    </div>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white text-gray-900 overflow-x-hidden">

        {/* ── HERO ── */}
        <section className="relative min-h-screen flex items-center pt-16">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-emerald-50/60" />
          <div className="absolute top-20 right-0 w-[700px] h-[700px] bg-green-300/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-200/10 rounded-full blur-3xl" />

          <div className="relative max-w-6xl mx-auto px-4 py-24 grid lg:grid-cols-2 gap-16 items-center w-full">
            <div>
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-xs font-bold px-4 py-1.5 rounded-full mb-7 border border-green-200">
                <Sparkles size={11} />
                7 dias grátis · Sem cartão de crédito
              </div>

              {/* BAB: BEFORE */}
              <h1 className="text-5xl lg:text-6xl font-black tracking-tight text-gray-900 leading-[1.05] mb-6">
                Pare de perder<br />
                <span className="text-green-600">vendas</span> por falta<br />
                de atendimento<br />
                no WhatsApp
              </h1>

              {/* BAB: BRIDGE */}
              <p className="text-xl text-gray-500 mb-8 leading-relaxed">
                Automatize disparos em massa, aqueça seus números e atenda clientes 24h com IA —
                tudo em uma plataforma só, sem risco de banimento.
              </p>

              {/* BAB: AFTER (bullets) */}
              <ul className="space-y-3 mb-10">
                {[
                  'Envios em lotes anti-bloqueio — até 50 por vez com intervalo configurável',
                  'Envie fotos, PDFs, planilhas e documentos Word para toda a lista',
                  'Bot de IA que vende e atende enquanto você dorme',
                  'Rastreamento de quem já recebeu — nunca reenvie acidentalmente',
                ].map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-gray-700">
                    <span className="mt-0.5 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center shrink-0">
                      <Check size={11} className="text-white" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/register"
                  className="bg-green-600 hover:bg-green-700 text-white font-black px-8 py-4 rounded-2xl text-base transition-all shadow-xl shadow-green-200/60 flex items-center justify-center gap-2 hover:scale-[1.02]">
                  Começar 7 dias grátis <ArrowRight size={18} />
                </Link>
                <a href="#funcionalidades"
                  className="border-2 border-gray-200 hover:border-green-300 text-gray-700 font-semibold px-8 py-4 rounded-2xl text-base transition-colors flex items-center justify-center gap-2">
                  Ver funcionalidades
                </a>
              </div>
              <p className="text-xs text-gray-400 mt-4">Sem contrato · Cancele quando quiser · Suporte incluso</p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <PhoneMockup />
            </div>
          </div>
        </section>

        {/* ── STATS BAR ── */}
        <section className="bg-green-600 py-14">
          <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '+500', label: 'empresas usando' },
              { value: '+10M', label: 'mensagens enviadas' },
              { value: '99,9%', label: 'uptime garantido' },
              { value: '8h/sem', label: 'economizadas por cliente' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-4xl font-black text-white">{s.value}</p>
                <p className="text-green-200 text-sm mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── PROBLEM SECTION ── */}
        <section className="py-24 bg-gray-950 text-white">
          <div className="max-w-5xl mx-auto px-4 text-center mb-14">
            <h2 className="text-4xl font-black tracking-tight mb-4">Você se reconhece nisso?</h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">Se sim, você está perdendo dinheiro todos os dias enquanto seus concorrentes estão automatizados.</p>
          </div>
          <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-3 gap-6">
            {[
              { emoji: '😩', title: 'Mandando mensagem um por um', desc: 'Horas copiando e colando para cada contato. Enquanto você faz isso na mão, quem automatizou já fechou 10 vendas.' },
              { emoji: '🚫', title: 'Número bloqueado pelo WhatsApp', desc: 'Investiu em uma base de contatos, disparou sem cuidado e perdeu o número. Recomeçar do zero é frustrante e caro.' },
              { emoji: '⌛', title: 'Sem tempo para responder todos', desc: 'Lead entra, você demora, ele vai para o concorrente. No WhatsApp, velocidade de resposta é a diferença entre vender e perder.' },
            ].map((p) => (
              <div key={p.title} className="bg-gray-900 border border-gray-800 rounded-3xl p-7 hover:border-gray-700 transition-colors">
                <p className="text-5xl mb-5">{p.emoji}</p>
                <h3 className="text-lg font-bold mb-3">{p.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/register"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-4 rounded-2xl transition-colors shadow-lg shadow-green-900/30">
              Resolver esses problemas agora <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="funcionalidades" className="py-24 bg-white scroll-mt-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <span className="text-green-600 font-bold text-sm uppercase tracking-widest">Funcionalidades</span>
              <h2 className="text-4xl font-black tracking-tight mt-3 mb-4">
                Tudo que você precisa para vender<br className="hidden sm:block" /> pelo WhatsApp
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">Uma plataforma completa. Sem precisar de 5 ferramentas diferentes.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div key={f.title} className="relative bg-white border border-gray-100 rounded-3xl p-7 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                  {f.badge && (
                    <span className="absolute top-5 right-5 bg-green-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                      {f.badge}
                    </span>
                  )}
                  <div className={`w-12 h-12 rounded-2xl ${f.color} flex items-center justify-center mb-5`}>
                    <f.icon size={22} />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-gray-900">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="py-24 bg-gradient-to-b from-green-50 to-white">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-16">
              <span className="text-green-600 font-bold text-sm uppercase tracking-widest">Como funciona</span>
              <h2 className="text-4xl font-black tracking-tight mt-3 mb-4">Simples assim</h2>
              <p className="text-gray-500 text-lg">Em menos de 15 minutos você já está disparando.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-10">
              {STEPS.map((s, i) => (
                <div key={s.num} className="text-center relative">
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-full h-0.5 bg-gradient-to-r from-green-300 to-green-100" />
                  )}
                  <div className="relative z-10">
                    <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-green-200">
                      <span className="text-2xl font-black text-white">{s.num}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TRUST / SECURITY ── */}
        <section className="py-24 bg-gray-950 text-white">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-14">
              <span className="text-green-400 font-bold text-sm uppercase tracking-widest">Segurança & Confiança</span>
              <h2 className="text-4xl font-black tracking-tight mt-3 mb-4">
                Sua conta protegida<br />desde o cadastro
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Acesso controlado e auditado — apenas usuários verificados e aprovados operam na plataforma.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  emoji: '✉️',
                  title: 'Confirmação de email',
                  desc: 'Todo cadastro exige verificação por email antes de qualquer acesso à plataforma.',
                },
                {
                  emoji: '🔍',
                  title: 'Aprovação manual',
                  desc: 'Nossa equipe analisa cada conta antes de liberar o acesso. Sem bots, sem abuso.',
                },
                {
                  emoji: '🛡️',
                  title: 'Conformidade LGPD',
                  desc: 'Registro de consentimento por contato, opt-out automático, Termos de Uso e Política de Privacidade publicados conforme a Lei 13.709/2018.',
                },
                {
                  emoji: '📋',
                  title: 'Auditoria completa',
                  desc: 'Todas as ações administrativas ficam registradas com data, hora e IP de origem.',
                },
              ].map((item) => (
                <div key={item.title} className="bg-gray-900 border border-gray-800 rounded-3xl p-6 hover:border-green-800 transition-colors text-center">
                  <p className="text-4xl mb-4">{item.emoji}</p>
                  <h3 className="font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 bg-green-900/30 border border-green-800/50 rounded-2xl p-6 text-center">
              <p className="text-green-200 text-sm leading-relaxed">
                Ao se cadastrar você aceita os <Link href="/termos" target="_blank" className="text-green-400 font-semibold hover:underline">Termos de Uso</Link>{' '}
                e a <Link href="/privacidade" target="_blank" className="text-green-400 font-semibold hover:underline">Política de Privacidade</Link>.
                O acesso é liberado apenas após verificação de email e aprovação da equipe.
              </p>
            </div>
          </div>
        </section>

        {/* ── LGPD / COMPLIANCE ── */}
        <section className="py-24 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-14">
              <span className="text-green-600 font-bold text-sm uppercase tracking-widest">Conformidade Legal</span>
              <h2 className="text-4xl font-black tracking-tight mt-3 mb-4">
                Opere dentro da lei —<br className="hidden sm:block" /> proteção LGPD nativa
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                A maioria das ferramentas de WhatsApp ignora a legislação. O Clica Aí foi construído com
                ferramentas reais de conformidade para proteger você e seus clientes.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
              {[
                {
                  icon: Link2,
                  color: 'bg-green-100 text-green-600',
                  title: 'Link de opt-in público',
                  desc: 'Gere um link para seus leads confirmarem o consentimento antes de entrar na sua lista. Registro com data e hora.',
                },
                {
                  icon: ShieldCheck,
                  color: 'bg-blue-100 text-blue-600',
                  title: 'Origem do consentimento',
                  desc: 'Cada contato tem registrado como e quando autorizou receber suas mensagens — dado exigível pela ANPD.',
                },
                {
                  icon: ClipboardCheck,
                  color: 'bg-purple-100 text-purple-600',
                  title: 'Declaração por campanha',
                  desc: 'Antes de todo disparo, você confirma que os destinatários autorizaram. Prova de boa-fé em caso de questionamento.',
                },
                {
                  icon: FileText,
                  color: 'bg-orange-100 text-orange-600',
                  title: 'Termos e Privacidade',
                  desc: 'Documentos legais completos, em português, em conformidade com LGPD, Marco Civil e Código de Defesa do Consumidor.',
                },
              ].map((item) => (
                <div key={item.title} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow text-center">
                  <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center mb-4 mx-auto`}>
                    <item.icon size={22} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 text-sm">{item.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Fluxo de consentimento */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-3xl p-8">
              <p className="text-center text-sm font-bold text-green-800 mb-6 uppercase tracking-widest">Como funciona a prova de consentimento</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0 text-center">
                {[
                  { step: '1', label: 'Você compartilha', sub: 'o link de opt-in nas redes sociais ou WhatsApp pessoal' },
                  { step: '2', label: 'Contato preenche', sub: 'nome, telefone e marca "autorizo receber mensagens"' },
                  { step: '3', label: 'Registro automático', sub: 'data, hora e IP ficam salvos como prova de consentimento' },
                  { step: '4', label: 'Disparo seguro', sub: 'campanha com declaração LGPD confirmada antes do envio' },
                ].map((s, i) => (
                  <div key={s.step} className="flex sm:flex-row items-center w-full sm:w-auto">
                    <div className="flex flex-col items-center sm:max-w-[130px]">
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-black text-sm mb-2 shrink-0">
                        {s.step}
                      </div>
                      <p className="text-xs font-bold text-gray-800">{s.label}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{s.sub}</p>
                    </div>
                    {i < 3 && (
                      <div className="hidden sm:block w-8 h-0.5 bg-green-300 mx-2 mt-[-20px] shrink-0" />
                    )}
                    {i < 3 && (
                      <div className="sm:hidden h-6 w-0.5 bg-green-300 my-1" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <Link href="/termos" target="_blank"
                className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors border border-gray-200 hover:border-green-300 rounded-xl px-4 py-2.5">
                <FileText size={15} /> Ler os Termos de Uso
              </Link>
              <Link href="/privacidade" target="_blank"
                className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors border border-gray-200 hover:border-green-300 rounded-xl px-4 py-2.5">
                <ShieldCheck size={15} /> Ver Política de Privacidade
              </Link>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-14">
              <span className="text-green-600 font-bold text-sm uppercase tracking-widest">Depoimentos</span>
              <h2 className="text-4xl font-black tracking-tight mt-3">O que nossos clientes dizem</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className="bg-gray-50 border border-gray-100 rounded-3xl p-7 hover:shadow-md transition-shadow">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} size={15} className="text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed mb-6">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0">
                      {t.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="precos" className="py-24 bg-gray-950 text-white scroll-mt-16">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-14">
              <span className="text-green-400 font-bold text-sm uppercase tracking-widest">Preços</span>
              <h2 className="text-4xl font-black tracking-tight mt-3 mb-4">Simples e transparente</h2>
              <p className="text-gray-400 text-lg">7 dias grátis em qualquer plano. Sem cartão de crédito.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {PLANS.map((plan) => (
                <div key={plan.name} className={`rounded-3xl p-8 relative ${
                  plan.highlight
                    ? 'bg-green-600 border-2 border-green-400 ring-4 ring-green-500/20'
                    : 'bg-gray-900 border border-gray-800'
                }`}>
                  {plan.highlight && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-black px-5 py-1.5 rounded-full tracking-wide">
                      MAIS POPULAR
                    </div>
                  )}
                  <p className={`text-sm font-bold mb-1 ${plan.highlight ? 'text-green-100' : 'text-gray-400'}`}>{plan.name}</p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    <span className={`text-sm mb-1.5 ${plan.highlight ? 'text-green-200' : 'text-gray-500'}`}>{plan.period}</span>
                  </div>
                  <p className={`text-sm mb-7 ${plan.highlight ? 'text-green-100' : 'text-gray-500'}`}>{plan.desc}</p>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.highlight ? 'bg-white/25' : 'bg-green-900'}`}>
                          <Check size={11} className={plan.highlight ? 'text-white' : 'text-green-400'} />
                        </span>
                        <span className={plan.highlight ? 'text-white' : 'text-gray-300'}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/register"
                    className={`block text-center font-black py-4 rounded-2xl transition-all hover:scale-[1.02] ${
                      plan.highlight
                        ? 'bg-white text-green-700 hover:bg-green-50'
                        : 'bg-green-600 text-white hover:bg-green-500'
                    }`}>
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>

            <p className="text-center text-gray-500 text-sm mt-8">
              Tem dúvidas sobre qual plano escolher?{' '}
              <a href={WA_PLANS} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">
                Fale com a gente no WhatsApp
              </a>
            </p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="py-24 bg-white scroll-mt-16">
          <div className="max-w-3xl mx-auto px-4">
            <div className="text-center mb-14">
              <span className="text-green-600 font-bold text-sm uppercase tracking-widest">FAQ</span>
              <h2 className="text-4xl font-black tracking-tight mt-3 mb-4">Dúvidas frequentes</h2>
            </div>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'FAQPage',
                  mainEntity: FAQS.map((f) => ({
                    '@type': 'Question',
                    name: f.q,
                    acceptedAnswer: { '@type': 'Answer', text: f.a },
                  })),
                }),
              }}
            />
            <div className="space-y-3">
              {FAQS.map((f) => <FAQItem key={f.q} q={f.q} a={f.a} />)}
            </div>
            <div className="mt-10 bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
              <p className="text-gray-700 font-semibold mb-1">Não encontrou sua resposta?</p>
              <p className="text-gray-500 text-sm mb-4">Nossa equipe responde rapidamente pelo WhatsApp.</p>
              <a href={WA_SUPPORT} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm">
                <Smartphone size={16} /> Falar com o suporte agora
              </a>
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section className="py-28 bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/5 rounded-full blur-3xl" />
          <div className="relative max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-5xl font-black text-white tracking-tight mb-5">
              Comece a vender mais<br />pelo WhatsApp hoje
            </h2>
            <p className="text-green-100 text-xl mb-10 leading-relaxed">
              7 dias grátis. Sem cartão de crédito. Cancele quando quiser.<br />
              Mais de 500 empresas já automatizaram suas vendas com o Clica Aí.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register"
                className="inline-flex items-center gap-2 bg-white text-green-700 font-black px-12 py-5 rounded-2xl text-lg hover:bg-green-50 transition-all shadow-2xl hover:scale-[1.03]">
                Criar minha conta grátis <ArrowRight size={20} />
              </Link>
              <a href={WA_START} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border-2 border-white/40 text-white font-bold px-8 py-5 rounded-2xl text-base hover:bg-white/10 transition-all">
                <Smartphone size={18} /> Falar no WhatsApp primeiro
              </a>
            </div>
            <p className="text-green-200/70 text-xs mt-6">Sem contrato · Suporte via WhatsApp · Cancele quando quiser</p>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="bg-gray-950 text-gray-400 pt-16 pb-10">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-gray-800">

              {/* Brand */}
              <div className="lg:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <Zap size={15} className="text-white" />
                  </div>
                  <span className="text-xl font-black text-white">Clica <span className="text-green-500">Aí</span></span>
                </div>
                <p className="text-sm leading-relaxed text-gray-500">
                  Plataforma de automação para WhatsApp — disparos inteligentes, aquecimento de números e atendimento com IA.
                </p>
              </div>

              {/* Links */}
              <div>
                <p className="text-white font-bold text-sm mb-4">Produto</p>
                <ul className="space-y-2.5 text-sm">
                  {[['#funcionalidades', 'Funcionalidades'], ['#precos', 'Preços'], ['#faq', 'Perguntas frequentes']].map(([h, l]) => (
                    <li key={h}><a href={h} className="hover:text-green-400 transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-white font-bold text-sm mb-4">Acesso</p>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/login" className="hover:text-green-400 transition-colors">Entrar na plataforma</Link></li>
                  <li><Link href="/register" className="hover:text-green-400 transition-colors">Criar conta grátis</Link></li>
                </ul>
                <p className="text-white font-bold text-sm mb-3 mt-6">Contato</p>
                <ul className="space-y-2.5 text-sm">
                  <li>
                    <a href={WA_PLANS} target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors flex items-center gap-1.5">
                      <Smartphone size={13} className="text-green-500 shrink-0" /> Quero assinar
                    </a>
                  </li>
                  <li>
                    <a href={WA_SUPPORT} target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors flex items-center gap-1.5">
                      <Smartphone size={13} className="text-green-500 shrink-0" /> Suporte via WhatsApp
                    </a>
                  </li>
                </ul>
                <p className="text-white font-bold text-sm mb-3 mt-6 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-green-400" /> Legal & Privacidade
                </p>
                <ul className="space-y-2.5 text-sm">
                  <li>
                    <Link href="/termos" target="_blank" className="hover:text-green-400 transition-colors flex items-center gap-1.5">
                      <FileText size={13} className="text-gray-500 shrink-0" /> Termos de Uso
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacidade" target="_blank" className="hover:text-green-400 transition-colors flex items-center gap-1.5">
                      <FileText size={13} className="text-gray-500 shrink-0" /> Política de Privacidade
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Uso responsável */}
              <div>
                <p className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                  <Shield size={14} className="text-yellow-400" /> Uso responsável
                </p>
                <ul className="space-y-3 text-xs text-gray-500 leading-relaxed">
                  <li className="flex gap-2">
                    <AlertTriangle size={12} className="text-yellow-400 mt-0.5 shrink-0" />
                    <span><strong className="text-gray-400">Spam proibido.</strong> É estritamente proibido o envio de mensagens não solicitadas ou em massa sem consentimento.</span>
                  </li>
                  <li className="flex gap-2">
                    <Lock size={12} className="text-red-400 mt-0.5 shrink-0" />
                    <span><strong className="text-gray-400">Uso legal apenas.</strong> É proibida a utilização para qualquer finalidade ilegal ou que viole a legislação vigente no Brasil.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Legal disclaimer */}
            <div className="py-8 border-b border-gray-800/50">
              <div className="flex items-start gap-3 bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                <AlertTriangle size={16} className="text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-xs text-gray-500 leading-relaxed">
                  <strong className="text-gray-400">Isenção de responsabilidade:</strong> A Clica Aí é uma plataforma tecnológica e{' '}
                  <strong className="text-gray-400">não se responsabiliza pelo conteúdo das mensagens enviadas pelos usuários</strong>.
                  Cada usuário é integralmente responsável pelas mensagens enviadas, pela base de contatos utilizada e pelo cumprimento
                  das legislações aplicáveis, incluindo o{' '}
                  <strong className="text-gray-400">Marco Civil da Internet (Lei nº 12.965/2014)</strong>, a{' '}
                  <strong className="text-gray-400">Lei Geral de Proteção de Dados — LGPD (Lei nº 13.709/2018)</strong> e o{' '}
                  <strong className="text-gray-400">Código de Defesa do Consumidor</strong>.
                  O uso indevido resultará no cancelamento imediato da conta, sem direito a reembolso.
                </p>
              </div>
            </div>

            <div className="pt-8 text-center text-xs text-gray-600 leading-relaxed">
              © {new Date().getFullYear()} Clica Aí — Empresa da Clica Rede e Marketing — Todos os Direitos Reservados
              <br />
              CNPJ 30.925.376/0001-78 ·{' '}
              <a href={WA_INFO} target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition-colors">
                Fale conosco via WhatsApp
              </a>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
