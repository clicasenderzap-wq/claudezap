'use client';

import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Users, Megaphone, Smartphone, Flame, Bot,
  MessageSquare, BookOpen, ChevronRight, Info, AlertTriangle,
  CheckCircle, Lightbulb, ArrowRight, Key, Clock, Zap, Shield,
  FileSpreadsheet, Send, BarChart2, RefreshCw, Settings, Star, Tag, Moon,
  UserCheck, MailCheck, Paperclip, Package, Target, CalendarClock,
  Mail, Eye, Copy, CalendarX, RotateCcw, UserMinus, Layout, Palette,
  MonitorSmartphone, TestTube2, PenLine,
} from 'lucide-react';

// ─── Helper Components ────────────────────────────────────────────────────────

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 my-4">
      <Lightbulb size={16} className="text-blue-500 mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 my-4">
      <AlertTriangle size={16} className="text-yellow-500 mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function Success({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 my-4">
      <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function Step({ num, title, children, color = 'bg-brand-600' }: { num: number; title: string; children?: React.ReactNode; color?: string }) {
  return (
    <div className="flex gap-4 mb-5">
      <div className={`w-8 h-8 rounded-full ${color} text-white font-black text-sm flex items-center justify-center shrink-0 mt-0.5`}>
        {num}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-gray-800 mb-1">{title}</p>
        <div className="text-sm text-gray-600 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-gray-100 text-brand-700 font-mono text-xs px-2 py-0.5 rounded-md border border-gray-200">
      {children}
    </code>
  );
}

function SectionTitle({ icon: Icon, color, title, subtitle }: { icon: React.ElementType; color: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-4 mb-8 pb-6 border-b border-gray-200">
      <div className={`p-3 rounded-2xl ${color} shrink-0`}>
        <Icon size={24} />
      </div>
      <div>
        <h2 className="text-2xl font-black text-gray-900">{title}</h2>
        <p className="text-gray-500 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── WhatsApp Sections ────────────────────────────────────────────────────────

function WA_GettingStartedSection() {
  return (
    <div id="wa-getting-started">
      <SectionTitle icon={UserCheck} color="text-teal-600 bg-teal-100" title="Primeiros Passos" subtitle="Como criar sua conta, verificar o email e acessar a plataforma." />

      <p className="text-gray-600 text-sm leading-relaxed mb-6">
        O acesso ao Clica Aí é controlado em duas etapas de segurança: confirmação de email e aprovação manual pela equipe. Isso garante que apenas usuários reais e legítimos utilizem a plataforma.
      </p>

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Fluxo de cadastro</h3>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {[
          { num: '1', color: 'bg-teal-100 text-teal-600', title: 'Cadastre-se', desc: 'Preencha nome, email, WhatsApp e senha. Aceite os Termos de Uso.' },
          { num: '2', color: 'bg-blue-100 text-blue-600', title: 'Confirme o email', desc: 'Você receberá um link por email. Clique para confirmar sua identidade.' },
          { num: '3', color: 'bg-green-100 text-green-600', title: 'Aguarde aprovação', desc: 'Nossa equipe analisa o cadastro e libera em até 24h. Você será notificado por email.' },
        ].map((step) => (
          <div key={step.num} className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
            <div className={`w-10 h-10 rounded-full ${step.color} flex items-center justify-center mx-auto mb-3`}>
              <span className="font-black text-sm">{step.num}</span>
            </div>
            <p className="font-semibold text-gray-800 text-sm mb-1.5">{step.title}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>

      <Success><strong>Conta aprovada!</strong> Você começa automaticamente com <strong>7 dias de trial gratuito</strong> para explorar todas as funcionalidades.</Success>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8 flex items-center gap-2">
        <Smartphone size={18} className="text-brand-600" /> Instalação e uso do App Desktop
      </h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-5">
        O Clica Aí funciona por meio de um aplicativo instalado no seu computador Windows. Ele mantém seus números WhatsApp conectados e processa os envios em segundo plano.
      </p>

      <Step num={1} title="Baixe o instalador">
        Acesse <strong>Guia → Instalação do App</strong> ou clique no botão na tela de confirmação de cadastro. O arquivo é um <Code>.exe</Code> para Windows.
      </Step>
      <Step num={2} title="Execute e instale">
        Abra o arquivo e siga as instruções. A instalação leva menos de 1 minuto.
      </Step>
      <Step num={3} title="Abra o app e faça login">
        Entre com o mesmo email e senha da plataforma web.
      </Step>
      <Step num={4} title="Use o navegador integrado do app — não o Chrome comum">
        Quando o Clica Aí estiver em execução, ele abre uma janela de navegador integrada. <strong>O sistema de envio de mensagens só funciona nessa janela</strong> — não no Chrome, Firefox ou qualquer outro navegador externo. Sempre acesse o painel pelo navegador que o próprio app abre.
      </Step>
      <Step num={5} title="Conecte seus números WhatsApp">
        No painel, acesse <strong>WhatsApp → Adicionar número</strong> e escaneie o QR Code com o celular.
      </Step>

      <Warning>
        <strong>App fechado = sem envios.</strong> Mantenha o Clica Aí aberto (pode ficar minimizado na bandeja do sistema) durante toda a operação. Agendamentos e campanhas falham se o app estiver fechado no momento do disparo.
      </Warning>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8 flex items-center gap-2">
        <RefreshCw size={18} className="text-blue-500" /> Atualização do App
      </h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        O app verifica automaticamente se há nova versão ao conectar ao servidor. Quando necessário, baixa, instala e reinicia sozinho — sem ação da sua parte.
      </p>

      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 mt-4 mb-2">
        <p className="font-bold text-yellow-800 mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-yellow-600" /> Instalação travou? App não fechou sozinho?</p>
        <p className="text-sm text-yellow-800 leading-relaxed mb-3">O instalador precisa que o app esteja completamente fechado. Procure o ícone do Clica Aí na bandeja do sistema (próximo ao relógio, canto inferior direito).</p>
        <div className="space-y-2">
          {['Olhe no canto inferior direito da barra de tarefas. Se houver o ícone do Clica Aí, o app ainda está rodando.',
            'Clique com o botão direito sobre o ícone.',
            'Clique em "Sair" para encerrar completamente.',
            'Execute o instalador novamente (.exe baixado). A instalação vai completar normalmente.',
          ].map((s, i) => (
            <div key={i} className="flex gap-2.5 text-sm text-yellow-900">
              <span className="w-5 h-5 bg-yellow-200 rounded-full text-yellow-800 text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WA_DashboardSection() {
  return (
    <div id="wa-dashboard">
      <SectionTitle icon={LayoutDashboard} color="text-blue-600 bg-blue-100" title="Dashboard" subtitle="Visão geral do seu desempenho em tempo real" />
      <p className="text-gray-600 mb-6 leading-relaxed">O Dashboard é a página inicial e mostra os principais indicadores da operação num único painel, atualizado automaticamente.</p>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {[
          { icon: Users, label: 'Total de Contatos', desc: 'Quantidade total de contatos cadastrados, excluindo opt-outs.' },
          { icon: Send, label: 'Mensagens Hoje', desc: 'Total de mensagens enviadas no dia, incluindo individuais e campanhas.' },
          { icon: Megaphone, label: 'Campanhas Ativas', desc: 'Campanhas com status "running" — disparando neste momento.' },
          { icon: Smartphone, label: 'Números Conectados', desc: 'Contas WhatsApp com status "conectado" e prontas para enviar.' },
        ].map((c) => (
          <div key={c.label} className="flex gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="p-2 bg-brand-100 rounded-lg shrink-0"><c.icon size={16} className="text-brand-600" /></div>
            <div>
              <p className="font-semibold text-sm text-gray-800">{c.label}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <Tip>O Dashboard atualiza automaticamente. Não precisa recarregar a página para ver os dados mais recentes.</Tip>
    </div>
  );
}

function WA_ContactsSection() {
  return (
    <div id="wa-contacts">
      <SectionTitle icon={Users} color="text-green-600 bg-green-100" title="Importar Contatos" subtitle="Construa, organize e gerencie sua base de contatos" />

      <p className="text-gray-600 mb-6 leading-relaxed">Você pode adicionar contatos manualmente ou importar em massa por planilha Excel (.xlsx, .xls) ou CSV.</p>

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Importar por planilha</h3>
      <Step num={1} title="Prepare a planilha">
        Colunas obrigatórias: <Code>nome</Code> e <Code>telefone</Code> (ou <Code>name</Code>/<Code>phone</Code>). O telefone deve estar no formato <Code>5511999999999</Code>. Coluna opcional: <Code>tag</Code> para classificar na importação.
      </Step>
      <Step num={2} title="Importe em Contatos">
        No menu, clique em <strong>Contatos</strong> → <strong>Importar CSV / Excel</strong>. Duplicatas têm as tags mescladas automaticamente.
      </Step>

      <Warning><strong>Formato do telefone:</strong> Sempre inclua código do país (55 para Brasil) + DDD. Exemplo: <Code>5511987654321</Code>. Telefones incorretos são descartados.</Warning>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8 flex items-center gap-2"><Tag size={18} className="text-green-600" /> Tags</h3>
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {[
          { title: 'Filtrar por tag', desc: 'Na lista de contatos, clique em uma tag para ver apenas aquele grupo.' },
          { title: 'Editar em massa', desc: 'Selecione vários contatos e use "Alterar tag" para mudar todos de uma vez.' },
          { title: 'Disparar por tag', desc: 'Na criação da campanha, selecione contatos pelo modo "Por tag".' },
        ].map((c) => (
          <div key={c.title} className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="font-semibold text-sm text-green-800 mb-1">{c.title}</p>
            <p className="text-xs text-green-700 leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8 flex items-center gap-2"><Target size={18} className="text-teal-600" /> Rastreamento de Contactados</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">O sistema registra automaticamente quando um contato foi incluído em uma campanha. Use o filtro <strong>"Não contactados"</strong> para ver quem ainda não recebeu nenhuma mensagem.</p>
      <Tip><strong>Estratégia recomendada:</strong> Ative <strong>"Excluir já contactados"</strong> em todas as campanhas para nunca enviar duas vezes para a mesma pessoa.</Tip>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8">Opt-out automático</h3>
      <p className="text-gray-600 text-sm leading-relaxed">Quando um contato responde <Code>SAIR</Code>, <Code>STOP</Code> ou similares, o sistema o marca automaticamente como opt-out e ele deixa de receber campanhas.</p>
    </div>
  );
}

function WA_CampaignsSection() {
  return (
    <div id="wa-campaigns">
      <SectionTitle icon={Megaphone} color="text-purple-600 bg-purple-100" title="Mensagens e Campanhas" subtitle="Envie mensagens individuais ou em massa para sua base" />

      <Step num={1} title="Acesse Campanhas → Nova campanha" color="bg-purple-600" />
      <Step num={2} title="Dê um nome descritivo" color="bg-purple-600">Ex: "Promoção Maio", "Follow-up Leads".</Step>
      <Step num={3} title="Escreva o template" color="bg-purple-600">
        Use <Code>{'{{nome}}'}</Code> e <Code>{'{{telefone}}'}</Code> para personalizar. Exemplo:
        <div className="mt-2 bg-gray-100 rounded-lg p-3 text-xs font-mono text-gray-700">Olá, {'{{nome}}'}! Temos uma oferta exclusiva para você. 😊</div>
      </Step>
      <Step num={4} title="Configure o delay entre mensagens" color="bg-purple-600">
        Opções: 3s, 5s, 10s, 15s, 30s, 60s ou valor personalizado.
        <Tip>Use no mínimo 5 segundos. Delays de 10s–30s reduzem muito o risco de banimento.</Tip>
      </Step>
      <Step num={5} title="Agende (opcional) ou dispare imediatamente" color="bg-purple-600">
        Use o campo <strong>Agendar disparo</strong> para uma data/hora futura. A campanha ficará com status <strong>Agendada</strong> e disparará automaticamente.
      </Step>
      <Step num={6} title="Selecione os números e os contatos" color="bg-purple-600">
        Escolha quais números vão enviar e selecione contatos individualmente ou por tag. Clique em <strong>Disparar</strong>.
      </Step>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8 flex items-center gap-2"><Package size={18} className="text-orange-500" /> Envio em Lotes Anti-Bloqueio</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">Divide a campanha em grupos menores com intervalo de horas entre cada grupo — imita comportamento natural e reduz risco de bloqueio.</p>
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-5 text-sm text-orange-900 space-y-2">
        {['Na criação de campanha, ative "Envio em Lotes".',
          'Defina o Tamanho do lote (recomendado: 30–50 mensagens).',
          'Defina o Intervalo entre lotes (recomendado: 8 horas).',
          'O 1º lote dispara imediatamente; os demais aguardam o intervalo configurado.',
        ].map((s, i) => (
          <div key={i} className="flex gap-2.5">
            <span className="w-5 h-5 bg-orange-200 rounded-full text-orange-800 text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8 flex items-center gap-2"><Paperclip size={18} className="text-blue-500" /> Envio de Arquivos</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-3">Anexe imagens, PDFs, Word, Excel, vídeos ou áudios à mensagem. Todos os destinatários recebem o mesmo arquivo.</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {['Imagem (JPG, PNG)', 'PDF', 'Word (.docx)', 'Excel (.xlsx)', 'Vídeo (MP4)', 'Áudio (MP3)'].map((t) => (
          <span key={t} className="bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">{t}</span>
        ))}
      </div>
      <Warning><strong>Limite:</strong> 10 MB por arquivo. O armazenamento precisa estar configurado no servidor (Cloudflare R2).</Warning>
    </div>
  );
}

function WA_ScheduledSection() {
  return (
    <div id="wa-scheduled">
      <SectionTitle icon={CalendarClock} color="text-blue-600 bg-blue-100" title="Agendamentos" subtitle="Programe follow-ups e nunca perca uma venda por falta de contato" />
      <Step num={1} title="Acesse Agendamentos no menu" color="bg-blue-600" />
      <Step num={2} title="Clique em Novo agendamento" color="bg-blue-600" />
      <Step num={3} title="Preencha contato, número, data/hora e mensagem" color="bg-blue-600">Use <Code>{'{{nome}}'}</Code> para personalizar.</Step>
      <Step num={4} title="Clique em Agendar mensagem" color="bg-blue-600">A mensagem será enviada automaticamente no horário marcado — mesmo sem você estar logado.</Step>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8 flex items-center gap-2"><Bot size={17} className="text-indigo-500" /> Agendamento via Bot</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">O bot pode criar agendamentos automaticamente durante a conversa. Instrua-o no prompt de sistema com a tag:</p>
      <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs text-gray-300 leading-relaxed mb-4">
        <p className="text-yellow-300">{'[[AGENDAR:AAAA-MM-DD 10:00:Olá {{nome}}, passando para falar sobre nossa proposta!]]'}</p>
      </div>
      <Warning><strong>App precisa estar aberto</strong> no momento do envio. Agendamentos falham se o Clica Aí estiver fechado.</Warning>
    </div>
  );
}

function WA_WhatsappSection() {
  return (
    <div id="wa-whatsapp">
      <SectionTitle icon={Smartphone} color="text-emerald-600 bg-emerald-100" title="Conectar WhatsApp" subtitle="Gerencie seus números e conexões" />
      <div className="grid sm:grid-cols-2 gap-3 mb-8">
        <div className="border-2 border-gray-200 rounded-2xl p-5 text-center">
          <p className="font-black text-xl text-gray-800 mb-1">Starter</p>
          <p className="text-4xl font-black text-gray-400 mb-2">3</p>
          <p className="text-sm text-gray-500">números simultâneos</p>
        </div>
        <div className="border-2 border-green-300 bg-green-50 rounded-2xl p-5 text-center">
          <p className="font-black text-xl text-green-800 mb-1">Pro</p>
          <p className="text-4xl font-black text-green-600 mb-2">6</p>
          <p className="text-sm text-green-700">números simultâneos</p>
        </div>
      </div>
      <Step num={1} title="Vá em WhatsApp → Adicionar número" color="bg-emerald-600">Dê um nome (label) para identificar: "Vendas", "Suporte", etc.</Step>
      <Step num={2} title="Clique em Conectar" color="bg-emerald-600">O QR Code aparecerá em alguns segundos.</Step>
      <Step num={3} title="Escaneie pelo celular" color="bg-emerald-600">WhatsApp → ⋮ → Dispositivos vinculados → Vincular dispositivo → aponte para o QR Code.</Step>
      <Step num={4} title="Aguarde confirmação" color="bg-emerald-600">Status muda para <strong>conectado</strong> automaticamente.</Step>
      <Warning><strong>Use números dedicados ao negócio.</strong> Não recomendamos o número pessoal principal para disparos em massa.</Warning>
    </div>
  );
}

function WA_WarmupSection() {
  return (
    <div id="wa-warmup">
      <SectionTitle icon={Flame} color="text-orange-600 bg-orange-100" title="Aquecimento de Números" subtitle="Proteja seus chips e reduza o risco de banimento" />
      <p className="text-gray-600 mb-6 leading-relaxed">O aquecimento faz seus números WhatsApp trocarem mensagens naturais entre si, simulando conversas reais. Isso aumenta a reputação do número perante o WhatsApp.</p>

      <Step num={1} title="Acesse Aquecimento no menu" color="bg-orange-600" />
      <Step num={2} title="Selecione os números participantes" color="bg-orange-600">Mínimo: 2 números conectados.</Step>
      <Step num={3} title="Configure mensagens por dia e horário" color="bg-orange-600">Início recomendado: 15–20 mensagens/dia. Defina o horário comercial (ex: 08:00–22:00).</Step>
      <Step num={4} title="Ative o aquecimento" color="bg-orange-600" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 mt-6">
        {[
          { label: 'Frio', range: '0–19%', color: 'bg-blue-100 text-blue-700' },
          { label: 'Morno', range: '20–49%', color: 'bg-yellow-100 text-yellow-700' },
          { label: 'Quente', range: '50–79%', color: 'bg-orange-100 text-orange-700' },
          { label: 'Aquecido', range: '80–100%', color: 'bg-red-100 text-red-700' },
        ].map((l) => (
          <div key={l.label} className={`rounded-xl p-3 text-center ${l.color}`}>
            <p className="font-bold text-sm">{l.label}</p>
            <p className="text-xs mt-0.5 opacity-75">{l.range}</p>
          </div>
        ))}
      </div>

      <h3 className="font-bold text-gray-800 mb-4 text-lg flex items-center gap-2"><Moon size={18} className="text-indigo-500" /> Aquecimento Noturno</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">Funciona em paralelo ao diurno, com horário e cota próprios (ex: 23:00–07:00 com 40 mensagens/dia). Acelera o aquecimento sem interferir no horário comercial.</p>
      <Success><strong>Exemplo:</strong> Diurno 20 msg/dia + Noturno 40 msg/dia = 60 msg/dia total.</Success>
    </div>
  );
}

function WA_BotsSection() {
  return (
    <div id="wa-bots">
      <SectionTitle icon={Bot} color="text-indigo-600 bg-indigo-100" title="Bot de Atendimento" subtitle="Atenda clientes automaticamente com inteligência artificial" />
      <div className="flex items-center gap-2 mb-4">
        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">Exclusivo Plano Pro</span>
        <span className="text-xs text-gray-500">GPT-4o-mini incluído · até 500 conversas/mês</span>
      </div>
      <p className="text-gray-600 mb-6 leading-relaxed">O bot usa GPT-4o-mini para responder automaticamente clientes que entram em contato. Cada número pode ter um bot com personalidade, comportamento e horários próprios.</p>

      <Step num={1} title="Acesse Bot de Atendimento no menu" color="bg-indigo-600" />
      <Step num={2} title="Expanda o card do número desejado" color="bg-indigo-600" />
      <Step num={3} title="Escreva o Prompt do sistema" color="bg-indigo-600">
        Defina nome do bot, empresa, produtos, tom de voz e limites de atuação.
        <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs text-gray-300 leading-relaxed mt-3">
          <p>Você é a <span className="text-green-400">Bia</span>, assistente da <span className="text-green-400">Bella Moda</span>.</p>
          <p className="mt-1">Loja de roupas femininas em SP. Atendemos seg–sáb, 9h–18h.</p>
          <p className="mt-1">Blusas R$79–149 | Calças R$129–199 | Vestidos R$159–299</p>
          <p className="mt-1">Seja simpática, use emojis com moderação. Se o cliente quiser trocar, transfira para a equipe.</p>
        </div>
      </Step>
      <Step num={4} title="Configure mensagem de boas-vindas e escalação" color="bg-indigo-600" />
      <Step num={5} title="Ative o bot" color="bg-indigo-600" />

      <Warning><strong>Atenção:</strong> O bot e o aquecimento não conflitam — usam a mesma conta WhatsApp de formas diferentes.</Warning>
    </div>
  );
}

// ─── Email Sections ───────────────────────────────────────────────────────────

function EMAIL_OverviewSection() {
  return (
    <div id="email-overview">
      <SectionTitle icon={Mail} color="text-indigo-600 bg-indigo-100" title="Sistema de Email" subtitle="Envie campanhas de email com rastreamento de abertura em tempo real" />

      <p className="text-gray-600 text-sm leading-relaxed mb-6">
        O sistema de email do Clica Aí permite criar campanhas HTML profissionais com templates prontos, rastrear quantas pessoas abriram o email, agendar disparos e gerenciar descadastros automaticamente.
      </p>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {[
          { icon: Layout, color: 'bg-indigo-50 border-indigo-200', textColor: 'text-indigo-700', title: '6 templates prontos', desc: 'Newsletter, Promoção, Boas-vindas, Evento, Novidade e Minimalista — prontos para editar.' },
          { icon: Eye, color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700', title: 'Rastreamento de abertura', desc: 'Saiba exatamente quem abriu seu email e quando, com taxa de abertura em tempo real.' },
          { icon: CalendarClock, color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-700', title: 'Agendamento', desc: 'Programe o envio para data e hora específicas — dispara automaticamente.' },
          { icon: RotateCcw, color: 'bg-teal-50 border-teal-200', textColor: 'text-teal-700', title: 'Reenvio para não abertos', desc: 'Crie automaticamente uma nova campanha só para quem recebeu mas não abriu.' },
          { icon: UserMinus, color: 'bg-orange-50 border-orange-200', textColor: 'text-orange-700', title: 'Descadastros automáticos', desc: 'Link de descadastro em todo email. Contatos que clicam saem da lista imediatamente.' },
          { icon: AlertTriangle, color: 'bg-red-50 border-red-200', textColor: 'text-red-700', title: 'Tratamento de bounces', desc: 'Emails inválidos (bounce) são detectados automaticamente e o contato é marcado como opt-out.' },
        ].map((c) => (
          <div key={c.title} className={`border rounded-xl p-4 ${c.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <c.icon size={16} className={c.textColor} />
              <p className={`font-semibold text-sm ${c.textColor}`}>{c.title}</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>

      <Tip>O sistema de email <strong>não precisa do app Electron</strong> — funciona direto no navegador, em qualquer dispositivo.</Tip>
    </div>
  );
}

function EMAIL_DashboardSection() {
  return (
    <div id="email-dashboard">
      <SectionTitle icon={LayoutDashboard} color="text-blue-600 bg-blue-100" title="Dashboard Email" subtitle="Acompanhe o desempenho geral das suas campanhas" />

      <p className="text-gray-600 text-sm leading-relaxed mb-5">
        Acesse o <strong>Dashboard</strong> no menu para ver as métricas gerais de todas as suas campanhas de email.
      </p>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
        {[
          { icon: Mail, label: 'Campanhas enviadas', desc: 'Total de campanhas criadas e disparadas (todos os tempos).' },
          { icon: Send, label: 'Emails entregues', desc: 'Total de emails que chegaram à caixa de entrada dos destinatários.' },
          { icon: Eye, label: 'Emails abertos', desc: 'Total de aberturas únicas rastreadas pelo pixel de rastreamento.' },
          { icon: BarChart2, label: 'Taxa de abertura', desc: 'Porcentagem de emails entregues que foram abertos.' },
          { icon: UserMinus, label: 'Descadastros', desc: 'Contatos que clicaram em "Cancelar inscrição" em algum email.' },
          { icon: AlertTriangle, label: 'Bounces', desc: 'Emails que retornaram por endereço inválido ou caixa cheia.' },
        ].map((c) => (
          <div key={c.label} className="flex gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="p-2 bg-indigo-100 rounded-lg shrink-0"><c.icon size={16} className="text-indigo-600" /></div>
            <div>
              <p className="font-semibold text-sm text-gray-800">{c.label}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-600 leading-relaxed">
        O dashboard também mostra as <strong>5 campanhas mais recentes</strong> com status, contagem de enviados e taxa de abertura individual. Clique em <strong>Ver todas</strong> para ir à lista completa.
      </p>
    </div>
  );
}

function EMAIL_CampaignSection() {
  return (
    <div id="email-campaign">
      <SectionTitle icon={Megaphone} color="text-purple-600 bg-purple-100" title="Criar Campanha de Email" subtitle="Passo a passo para criar e enviar sua campanha" />

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Etapa 1 — Configuração básica</h3>
      <Step num={1} title="Acesse Email → Nova campanha" color="bg-purple-600" />
      <Step num={2} title="Escolha um template ou comece do zero" color="bg-purple-600">
        Um seletor com <strong>6 templates prontos</strong> abre automaticamente para novas campanhas:
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
          {['Newsletter', 'Promoção', 'Boas-vindas', 'Evento', 'Novidade', 'Minimalista'].map((t) => (
            <div key={t} className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center">
              <p className="text-xs font-semibold text-purple-700">{t}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-2">Ou clique em <strong>Em branco</strong> para começar do zero.</p>
      </Step>
      <Step num={3} title="Dê um nome para a campanha" color="bg-purple-600">Nome interno para identificação — não aparece para o destinatário.</Step>
      <Step num={4} title="Preencha Assunto e Nome do remetente" color="bg-purple-600">
        O <strong>assunto</strong> aparece na caixa de entrada do destinatário. O <strong>nome do remetente</strong> substitui o endereço de email padrão (ex: "Clica Aí" em vez de "noreply@clicaai.ia.br").
      </Step>
      <Step num={5} title="Configure o delay entre envios" color="bg-purple-600">
        Intervalo em milissegundos entre cada email enviado. Padrão: 1000ms (1 segundo). Para listas grandes, use 2000–3000ms para evitar limitações do servidor de email.
      </Step>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8 flex items-center gap-2">
        <PenLine size={18} className="text-purple-600" /> Etapa 2 — Editor Visual
      </h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        O editor visual permite formatar o email com botões de formatação, inserir elementos especiais e pré-visualizar no mobile e desktop.
      </p>

      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        {[
          { icon: PenLine, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', title: 'Formatação básica', desc: 'Negrito, itálico, sublinhado, listas, alinhamento, links e muito mais.' },
          { icon: Palette, color: 'text-pink-600', bg: 'bg-pink-50 border-pink-200', title: 'Cor do texto', desc: 'Selecione qualquer cor para o texto com o seletor de cores nativo.' },
          { icon: Layout, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', title: 'Bloco de destaque', desc: 'Insere um bloco colorido de atenção — ideal para promoções, avisos ou CTAs.' },
          { icon: RotateCcw, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200', title: 'Desfazer / Refazer', desc: 'Botões Ctrl+Z e Ctrl+Y visuais para desfazer alterações no editor.' },
          { icon: MonitorSmartphone, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', title: 'Preview mobile / desktop', desc: 'Alterne entre visualização desktop e mobile para ver como o email ficará em cada dispositivo.' },
          { icon: Layout, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', title: 'Trocar template', desc: 'Clique em "Usar template" a qualquer momento para substituir o conteúdo por um template diferente.' },
        ].map((c) => (
          <div key={c.title} className={`border rounded-xl p-4 ${c.bg}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <c.icon size={15} className={c.color} />
              <p className={`font-semibold text-sm ${c.color}`}>{c.title}</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-5 text-sm text-indigo-800">
        <p className="font-semibold mb-2">Variáveis disponíveis no email:</p>
        <div className="flex flex-wrap gap-2">
          {[['{{name}}', 'Nome do contato'], ['{{email}}', 'Email do contato'], ['{{unsubscribe_url}}', 'Link de descadastro (gerado automaticamente)']].map(([code, desc]) => (
            <div key={code} className="flex items-center gap-1.5 bg-white border border-indigo-200 rounded-lg px-2 py-1">
              <Code>{code}</Code>
              <span className="text-xs text-indigo-600">{desc}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-indigo-600 mt-2">O link de descadastro e o pixel de rastreamento são inseridos automaticamente em todos os emails — não precisa adicionar manualmente.</p>
      </div>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8 flex items-center gap-2">
        <Send size={18} className="text-indigo-600" /> Etapa 3 — Configurar o envio
      </h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">Clique em <strong>Próximo: Envio</strong> para configurar os destinatários e revisar antes de disparar.</p>

      <div className="space-y-3 mb-5">
        {[
          { title: 'Todos os contatos', desc: 'Envia para todos os contatos que têm email cadastrado e não fizeram opt-out.' },
          { title: 'Por tag', desc: 'Selecione uma tag específica. O sistema mostra a contagem de destinatários em tempo real antes de enviar.' },
          { title: 'Seleção de contatos', desc: 'Escolha manualmente quais contatos recebem esta campanha.' },
          { title: 'Emails avulsos', desc: 'Digite endereços de email separados por vírgula — útil para enviar para pessoas que não são contatos cadastrados.' },
        ].map((s) => (
          <div key={s.title} className="flex gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm">
            <CheckCircle size={15} className="text-indigo-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-gray-800">{s.title}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Tip>
        <strong>Contagem em tempo real:</strong> Ao selecionar "Por tag", o sistema exibe automaticamente quantos contatos receberão o email antes de você disparar — evitando surpresas.
      </Tip>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8 flex items-center gap-2">
        <TestTube2 size={18} className="text-green-600" /> Email de teste
      </h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        Antes de disparar para toda a lista, use o botão <strong>Enviar teste</strong> (visível na etapa de envio) para receber uma cópia do email no seu endereço. O email de teste inclui um <strong>banner amarelo de aviso</strong> indicando que é apenas um teste — não é enviado para contatos reais.
      </p>
      <Success>Sempre envie um teste para verificar formatação, links e variáveis antes do disparo real.</Success>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8 flex items-center gap-2">
        <CalendarClock size={18} className="text-yellow-600" /> Agendamento
      </h3>
      <p className="text-gray-600 text-sm leading-relaxed">
        Ative a opção <strong>Agendar para</strong> e defina a data e hora. A campanha ficará com status <strong>Agendada</strong> e disparará automaticamente — sem precisar estar logado. Para cancelar o agendamento, use o botão de cancelamento (ícone de calendário com X) na lista de campanhas; a campanha volta para rascunho sem perder o conteúdo.
      </p>
    </div>
  );
}

function EMAIL_ManagementSection() {
  return (
    <div id="email-management">
      <SectionTitle icon={Settings} color="text-gray-600 bg-gray-100" title="Gerenciar Campanhas" subtitle="Duplicar, reenviar, cancelar e acompanhar resultados" />

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Ações disponíveis na lista de campanhas</h3>
      <div className="space-y-3 mb-6">
        {[
          { icon: BarChart2, color: 'text-indigo-600', title: 'Ver relatório', desc: 'Abre o modal de estatísticas: total, na fila, entregues, abertos e taxa de abertura. Inclui lista de cada destinatário com status individual.' },
          { icon: Copy, color: 'text-purple-600', title: 'Duplicar campanha', desc: 'Cria uma cópia da campanha como rascunho com o prefixo "Cópia de". Abre automaticamente no editor para você ajustar e reenviar.' },
          { icon: RotateCcw, color: 'text-teal-600', title: 'Reenviar para quem não abriu', desc: 'Aparece em campanhas concluídas onde enviados > abertos. Cria e dispara automaticamente uma nova campanha "Reenvio: [nome]" apenas para os contatos que receberam mas não abriram.' },
          { icon: CalendarX, color: 'text-yellow-600', title: 'Cancelar agendamento', desc: 'Disponível apenas para campanhas agendadas. Cancela os jobs da fila e reverte para rascunho — sem perder o conteúdo.' },
        ].map((c) => (
          <div key={c.title} className="flex gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <c.icon size={18} className={`${c.color} shrink-0 mt-0.5`} />
            <div>
              <p className="font-semibold text-sm text-gray-800">{c.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Status das campanhas</h3>
      <div className="space-y-2 mb-6">
        {[
          { s: 'Rascunho', c: 'bg-gray-100 text-gray-600', d: 'Em edição. Pode ser modificada, enviada ou excluída.' },
          { s: 'Agendada', c: 'bg-yellow-100 text-yellow-700', d: 'Aguardando a data/hora programada para disparar.' },
          { s: 'Enviando', c: 'bg-blue-100 text-blue-700', d: 'Em andamento. Jobs na fila sendo processados.' },
          { s: 'Concluída', c: 'bg-green-100 text-green-700', d: 'Todos os envios processados (com ou sem falhas).' },
          { s: 'Falhou', c: 'bg-red-100 text-red-600', d: 'Erro crítico no processo de envio.' },
        ].map((s) => (
          <div key={s.s} className="flex items-center gap-3 text-sm">
            <span className={`px-2.5 py-0.5 rounded-full font-semibold text-xs min-w-24 text-center ${s.c}`}>{s.s}</span>
            <span className="text-gray-600">{s.d}</span>
          </div>
        ))}
      </div>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-6 flex items-center gap-2">
        <RefreshCw size={18} className="text-blue-500" /> Auto-atualização da lista
      </h3>
      <p className="text-gray-600 text-sm leading-relaxed">
        A lista de campanhas atualiza automaticamente a cada 5 segundos enquanto houver alguma campanha com status <strong>Enviando</strong> ou <strong>Agendada</strong>. Assim você acompanha o progresso em tempo real sem precisar recarregar a página.
      </p>
    </div>
  );
}

function EMAIL_UnsubscribeSection() {
  return (
    <div id="email-unsubscribe">
      <SectionTitle icon={UserMinus} color="text-orange-600 bg-orange-100" title="Descadastros e Bounces" subtitle="Gerencie contatos que não recebem mais emails" />

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Descadastro automático (opt-out)</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        Todo email enviado pelo sistema inclui automaticamente um rodapé com o link <strong>"Cancelar inscrição"</strong>. Quando um contato clica nesse link:
      </p>
      <div className="space-y-2 mb-5">
        {[
          'O contato é marcado como opt-out imediatamente.',
          'Ele para de aparecer nos próximos disparos de campanha.',
          'Uma página de confirmação é exibida ao contato.',
          'O contador de descadastros no Dashboard é atualizado.',
        ].map((s, i) => (
          <div key={i} className="flex gap-2.5 text-sm text-gray-700">
            <CheckCircle size={14} className="text-orange-500 mt-0.5 shrink-0" />
            <span>{s}</span>
          </div>
        ))}
      </div>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8">Ver lista de descadastrados</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        Acesse <strong>Email → Descadastros</strong> no menu para ver todos os contatos com opt-out de email. A lista mostra nome, endereço de email e data do descadastro.
      </p>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        Se um contato pediu para ser reativado (ex: descadastrou por engano), clique em <strong>Reativar</strong> ao lado do contato. Ele voltará a receber campanhas normalmente.
      </p>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8 flex items-center gap-2">
        <AlertTriangle size={18} className="text-red-500" /> Bounces automáticos
      </h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        Quando o servidor de email do destinatário rejeita uma mensagem (endereço inválido, caixa cheia permanente, domínio inexistente), o Resend notifica o sistema automaticamente via webhook. O sistema então:
      </p>
      <div className="space-y-2 mb-5">
        {[
          'Marca a mensagem como "bounced" no relatório da campanha.',
          'Atualiza os contadores de falha da campanha.',
          'Define email_opt_out = true no contato — evitando futuros envios para um endereço inválido.',
        ].map((s, i) => (
          <div key={i} className="flex gap-2.5 text-sm text-gray-700">
            <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <span>{s}</span>
          </div>
        ))}
      </div>
      <Tip>O tratamento de bounces é automático. Não há nada que você precise fazer manualmente — o sistema cuida disso via webhook configurado no Resend.</Tip>

      <Warning>
        <strong>LGPD e boas práticas:</strong> Nunca tente forçar o reenvio para contatos que descadastraram. Respeite a opção de descadastro — isso protege sua reputação como remetente e evita que seus emails caiam em spam.
      </Warning>
    </div>
  );
}

// ─── Section Configs ──────────────────────────────────────────────────────────

const WA_SECTIONS = [
  { id: 'wa-getting-started', label: 'Primeiros Passos',      icon: UserCheck,       color: 'text-teal-600 bg-teal-100' },
  { id: 'wa-dashboard',       label: 'Dashboard',             icon: LayoutDashboard, color: 'text-blue-600 bg-blue-100' },
  { id: 'wa-contacts',        label: 'Contatos',              icon: Users,           color: 'text-green-600 bg-green-100' },
  { id: 'wa-campaigns',       label: 'Campanhas',             icon: Megaphone,       color: 'text-purple-600 bg-purple-100' },
  { id: 'wa-scheduled',       label: 'Agendamentos',          icon: CalendarClock,   color: 'text-blue-600 bg-blue-100' },
  { id: 'wa-whatsapp',        label: 'Conectar WhatsApp',     icon: Smartphone,      color: 'text-emerald-600 bg-emerald-100' },
  { id: 'wa-warmup',          label: 'Aquecimento',           icon: Flame,           color: 'text-orange-600 bg-orange-100' },
  { id: 'wa-bots',            label: 'Bot de Atendimento',    icon: Bot,             color: 'text-indigo-600 bg-indigo-100' },
];

const EMAIL_SECTIONS = [
  { id: 'email-overview',     label: 'Visão Geral',           icon: Mail,            color: 'text-indigo-600 bg-indigo-100' },
  { id: 'email-dashboard',    label: 'Dashboard',             icon: LayoutDashboard, color: 'text-blue-600 bg-blue-100' },
  { id: 'email-campaign',     label: 'Criar Campanha',        icon: Megaphone,       color: 'text-purple-600 bg-purple-100' },
  { id: 'email-management',   label: 'Gerenciar Campanhas',   icon: Settings,        color: 'text-gray-600 bg-gray-100' },
  { id: 'email-unsubscribe',  label: 'Descadastros',          icon: UserMinus,       color: 'text-orange-600 bg-orange-100' },
];

// ─── Guide Layout ─────────────────────────────────────────────────────────────

function GuideLayout({ sections, children, accentColor = 'text-brand-700 bg-brand-50' }: {
  sections: typeof WA_SECTIONS;
  children: React.ReactNode;
  accentColor?: string;
}) {
  const [active, setActive] = useState(sections[0]?.id ?? '');

  function scrollTo(id: string) {
    setActive(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }); },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    sections.forEach((s) => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="flex gap-6 items-start">
      <aside className="hidden lg:block w-56 shrink-0 sticky top-8">
        <nav className="card p-3 space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 pb-2">Seções</p>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                active === s.id ? accentColor : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${active === s.id ? s.color : 'bg-gray-100 text-gray-400'}`}>
                <s.icon size={13} />
              </div>
              {s.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0 space-y-16">{children}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const [hostname, setHostname] = useState('');
  const [tab, setTab] = useState<'whatsapp' | 'email'>('whatsapp');

  useEffect(() => { setHostname(window.location.hostname); }, []);

  const isEmailSubdomain = hostname.startsWith('email.');
  const isZapSubdomain = hostname.startsWith('zap.') || hostname.startsWith('app.');
  const showWhatsApp = !isEmailSubdomain;
  const showEmail = !isZapSubdomain;

  const showTabs = !isEmailSubdomain && !isZapSubdomain && hostname !== '';

  const waContent = (
    <GuideLayout sections={WA_SECTIONS} accentColor="text-brand-700 bg-brand-50">
      <div className="card p-8"><WA_GettingStartedSection /></div>
      <div className="card p-8"><WA_DashboardSection /></div>
      <div className="card p-8"><WA_ContactsSection /></div>
      <div className="card p-8"><WA_CampaignsSection /></div>
      <div className="card p-8"><WA_ScheduledSection /></div>
      <div className="card p-8"><WA_WhatsappSection /></div>
      <div className="card p-8"><WA_WarmupSection /></div>
      <div className="card p-8"><WA_BotsSection /></div>
    </GuideLayout>
  );

  const emailContent = (
    <GuideLayout sections={EMAIL_SECTIONS} accentColor="text-indigo-700 bg-indigo-50">
      <div className="card p-8"><EMAIL_OverviewSection /></div>
      <div className="card p-8"><EMAIL_DashboardSection /></div>
      <div className="card p-8"><EMAIL_CampaignSection /></div>
      <div className="card p-8"><EMAIL_ManagementSection /></div>
      <div className="card p-8"><EMAIL_UnsubscribeSection /></div>
    </GuideLayout>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl ${isEmailSubdomain ? 'bg-indigo-100' : 'bg-brand-100'}`}>
          <BookOpen size={24} className={isEmailSubdomain ? 'text-indigo-600' : 'text-brand-600'} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            {isEmailSubdomain ? 'Guia de Email' : isZapSubdomain ? 'Guia de WhatsApp' : 'Guia de Utilização'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEmailSubdomain ? 'Tudo sobre o sistema de campanhas de email' : isZapSubdomain ? 'Tudo sobre o sistema de envio WhatsApp' : 'Selecione o sistema que deseja consultar'}
          </p>
        </div>
      </div>

      {/* Tab switcher — only on main domain */}
      {showTabs && (
        <div className="flex gap-2 border-b border-gray-200 pb-0">
          <button
            onClick={() => setTab('whatsapp')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl border border-b-0 transition-colors ${
              tab === 'whatsapp' ? 'bg-white border-gray-200 text-brand-700 -mb-px' : 'bg-gray-50 border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Smartphone size={15} /> WhatsApp
          </button>
          <button
            onClick={() => setTab('email')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl border border-b-0 transition-colors ${
              tab === 'email' ? 'bg-white border-gray-200 text-indigo-700 -mb-px' : 'bg-gray-50 border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Mail size={15} /> Email
          </button>
        </div>
      )}

      {/* Content */}
      {isEmailSubdomain && emailContent}
      {isZapSubdomain && waContent}
      {showTabs && tab === 'whatsapp' && waContent}
      {showTabs && tab === 'email' && emailContent}
      {/* fallback while hostname resolves */}
      {!hostname && <div className="text-gray-400 text-sm py-10 text-center">Carregando...</div>}
    </div>
  );
}
