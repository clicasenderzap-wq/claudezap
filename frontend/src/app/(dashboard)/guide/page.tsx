'use client';

import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Users, Megaphone, Smartphone, Flame, Bot,
  MessageSquare, BookOpen, ChevronRight, Info, AlertTriangle,
  CheckCircle, Lightbulb, ArrowRight, Key, Clock, Zap, Shield,
  FileSpreadsheet, Send, BarChart2, RefreshCw, Settings, Star, Tag, Moon,
  UserCheck, MailCheck, Paperclip, Package, Target, CalendarClock,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Section {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

// ─── Sections index ───────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  { id: 'getting-started', label: 'Primeiros Passos',       icon: UserCheck,       color: 'text-teal-600 bg-teal-100' },
  { id: 'dashboard',       label: 'Dashboard',              icon: LayoutDashboard, color: 'text-blue-600 bg-blue-100' },
  { id: 'contacts',        label: 'Importar Contatos',      icon: Users,           color: 'text-green-600 bg-green-100' },
  { id: 'campaigns',       label: 'Mensagens e Campanhas',  icon: Megaphone,       color: 'text-purple-600 bg-purple-100' },
  { id: 'batch-files',     label: 'Lotes e Arquivos',       icon: Package,         color: 'text-orange-600 bg-orange-100' },
  { id: 'scheduled',       label: 'Agendamentos',           icon: CalendarClock,   color: 'text-blue-600 bg-blue-100' },
  { id: 'whatsapp',        label: 'Conectar WhatsApp',      icon: Smartphone,      color: 'text-emerald-600 bg-emerald-100' },
  { id: 'warmup',          label: 'Aquecimento',            icon: Flame,           color: 'text-orange-600 bg-orange-100' },
  { id: 'bots',            label: 'Bot de Atendimento',     icon: Bot,             color: 'text-indigo-600 bg-indigo-100' },
];

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

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-5">
      <div className="w-8 h-8 rounded-full bg-brand-600 text-white font-black text-sm flex items-center justify-center shrink-0 mt-0.5">
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

// ─── Content Sections ─────────────────────────────────────────────────────────

function GettingStartedSection() {
  return (
    <div id="getting-started">
      <SectionTitle
        icon={UserCheck}
        color="text-teal-600 bg-teal-100"
        title="Primeiros Passos"
        subtitle="Como criar sua conta, verificar o email e acessar a plataforma."
      />

      <p className="text-gray-600 text-sm leading-relaxed mb-6">
        O acesso ao Clica Aí é controlado em duas etapas de segurança: confirmação de email e aprovação manual pela equipe.
        Isso garante que apenas usuários reais e legítimos utilizem a plataforma.
      </p>

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Fluxo de cadastro</h3>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {[
          { num: '1', icon: MailCheck, color: 'bg-teal-100 text-teal-600', title: 'Cadastre-se', desc: 'Preencha nome completo, email, WhatsApp e senha. Aceite os Termos de Uso.' },
          { num: '2', icon: MailCheck, color: 'bg-blue-100 text-blue-600', title: 'Confirme o email', desc: 'Você receberá um link por email. Clique para confirmar sua identidade.' },
          { num: '3', icon: UserCheck, color: 'bg-green-100 text-green-600', title: 'Aguarde aprovação', desc: 'Nossa equipe analisa o cadastro e libera o acesso em até 24h. Você será notificado por email.' },
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

      <Success>
        <strong>Conta aprovada!</strong> Você receberá um email com as instruções de acesso e começa automaticamente com <strong>7 dias de trial gratuito</strong> para explorar todas as funcionalidades.
      </Success>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-6">O que cada status significa</h3>
      <div className="space-y-3 mb-6">
        {[
          { status: 'Pendente', color: 'bg-purple-100 text-purple-700', desc: 'Conta criada, aguardando análise da equipe. Email deve estar verificado.' },
          { status: 'Trial', color: 'bg-yellow-100 text-yellow-700', desc: 'Conta aprovada — você tem 7 dias para testar todas as funcionalidades.' },
          { status: 'Ativo', color: 'bg-green-100 text-green-700', desc: 'Plano ativo e pago. Acesso completo conforme o plano contratado.' },
          { status: 'Inativo', color: 'bg-red-100 text-red-600', desc: 'Acesso suspenso. Entre em contato com o suporte.' },
        ].map((s) => (
          <div key={s.status} className="flex items-center gap-3 text-sm">
            <span className={`px-2.5 py-0.5 rounded-full font-semibold text-xs whitespace-nowrap ${s.color}`}>{s.status}</span>
            <span className="text-gray-600">{s.desc}</span>
          </div>
        ))}
      </div>

      <Warning>
        <strong>Email não confirmado?</strong> Se você não encontrar o email de verificação, verifique a pasta de spam. O link expira em 24h — se necessário, entre em contato com o suporte para reenvio.
      </Warning>

      <Tip>
        <strong>Dica de segurança:</strong> Use uma senha forte (mínimo 8 caracteres, misture letras, números e símbolos). Nunca compartilhe suas credenciais de acesso.
      </Tip>
    </div>
  );
}

function DashboardSection() {
  return (
    <div id="dashboard">
      <SectionTitle icon={LayoutDashboard} color="text-blue-600 bg-blue-100" title="Dashboard" subtitle="Visão geral do seu desempenho em tempo real" />

      <p className="text-gray-600 mb-6 leading-relaxed">
        O Dashboard é a página inicial do sistema e mostra os principais indicadores da sua operação num único painel, atualizado automaticamente.
      </p>

      <h3 className="font-bold text-gray-800 mb-3 text-lg">Cards de estatísticas</h3>
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {[
          { icon: Users,        label: 'Total de Contatos',      desc: 'Quantidade total de contatos cadastrados na sua base, excluindo os que fizeram opt-out.' },
          { icon: Send,         label: 'Mensagens Hoje',         desc: 'Total de mensagens enviadas no dia atual, incluindo individuais e campanhas.' },
          { icon: Megaphone,    label: 'Campanhas Ativas',       desc: 'Campanhas com status "running" — disparando mensagens neste momento.' },
          { icon: Smartphone,   label: 'Números Conectados',     desc: 'Contas WhatsApp com status "conectado" e prontas para enviar mensagens.' },
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

      <h3 className="font-bold text-gray-800 mb-3 text-lg">Histórico de atividade</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        Abaixo dos cards aparece o histórico das últimas mensagens enviadas com data, contato, status e qual número enviou. Use para monitorar se os envios estão funcionando corretamente.
      </p>

      <h3 className="font-bold text-gray-800 mb-3 text-lg">Status das campanhas</h3>
      <div className="space-y-2 mb-6">
        {[
          { status: 'running',   color: 'bg-blue-100 text-blue-700',   desc: 'Campanha em andamento, mensagens sendo enviadas.' },
          { status: 'completed', color: 'bg-green-100 text-green-700',  desc: 'Todos os envios concluídos.' },
          { status: 'paused',    color: 'bg-yellow-100 text-yellow-700',desc: 'Pausada manualmente ou por erro.' },
          { status: 'failed',    color: 'bg-red-100 text-red-600',      desc: 'Houve falha crítica no processo de envio.' },
        ].map((s) => (
          <div key={s.status} className="flex items-center gap-3 text-sm">
            <span className={`px-2.5 py-0.5 rounded-full font-semibold text-xs ${s.color}`}>{s.status}</span>
            <span className="text-gray-600">{s.desc}</span>
          </div>
        ))}
      </div>

      <Tip>O Dashboard atualiza automaticamente a cada 30 segundos. Não precisa recarregar a página para ver os dados mais recentes.</Tip>
    </div>
  );
}

function ContactsSection() {
  return (
    <div id="contacts">
      <SectionTitle icon={Users} color="text-green-600 bg-green-100" title="Importar Contatos" subtitle="Construa, organize e gerencie sua base de contatos" />

      <p className="text-gray-600 mb-6 leading-relaxed">
        Você pode adicionar contatos manualmente ou importar em massa por planilha. O sistema aceita arquivos Excel (.xlsx, .xls) e CSV.
      </p>

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Importar por planilha (recomendado)</h3>
      <Step num={1} title="Prepare sua planilha">
        A planilha deve ter as colunas <Code>nome</Code> e <Code>telefone</Code> (ou <Code>name</Code> e <Code>phone</Code> em inglês).
        A coluna <Code>observacoes</Code> é opcional. O telefone deve estar no formato <Code>5511999999999</Code> (código do país + DDD + número) ou apenas <Code>11999999999</Code> — o sistema aceita ambos.
      </Step>
      <Step num={2} title="Adicione uma coluna de tag (opcional, mas muito útil)">
        Para classificar seus contatos na importação, adicione uma coluna chamada <Code>tag</Code>, <Code>tipo</Code>, <Code>grupo</Code> ou <Code>etiqueta</Code>. O sistema lê qualquer uma delas. Exemplos de valores: <Code>DEVEDOR</Code>, <Code>CLIENTE</Code>, <Code>LEAD</Code>, <Code>VIP</Code>.
        <Tip>
          Importar com tag já resolve 90% das segmentações. Se você tem uma lista de devedores, coloque "DEVEDOR" na coluna de tag — assim já chegam organizados no sistema.
        </Tip>
      </Step>
      <Step num={3} title="Acesse a página de Contatos e importe">
        No menu lateral clique em <strong>Contatos</strong> e depois no botão <strong>Importar CSV / Excel</strong> no canto superior direito.
      </Step>
      <Step num={4} title="Aguarde o processamento">
        O sistema importa os contatos e informa quantos foram adicionados, quantos já existiam (duplicatas têm as tags mescladas) e quantos tiveram erro de formato.
      </Step>

      <Warning>
        <strong>Formato do telefone:</strong> Sempre inclua o código do país (55 para Brasil) e o DDD. Exemplo: <Code>5511987654321</Code>. Telefones com formatação incorreta são descartados na importação.
      </Warning>

      {/* Tags section */}
      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-10 flex items-center gap-2">
        <Tag size={18} className="text-green-600" /> Tags (etiquetas de contatos)
      </h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        Tags são etiquetas coloridas que classificam seus contatos. Um contato pode ter várias tags ao mesmo tempo. As tags são sempre salvas em maiúsculo (<Code>CLIENTE</Code>, não <Code>cliente</Code>).
      </p>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {[
          { title: 'Filtrar por tag', desc: 'Na lista de contatos, clique em uma tag para ver apenas os contatos daquele grupo.' },
          { title: 'Editar em massa', desc: 'Selecione vários contatos com as caixas de seleção e use "Alterar tag" para mudar todos de uma vez.' },
          { title: 'Disparar por tag', desc: 'Na hora de criar uma campanha, selecione contatos pelo modo "Por tag" em vez de escolher um por um.' },
        ].map((c) => (
          <div key={c.title} className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="font-semibold text-sm text-green-800 mb-1">{c.title}</p>
            <p className="text-xs text-green-700 leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>

      <h3 className="font-bold text-gray-800 mb-3 text-base mt-6">Como editar tags em massa (exemplo prático)</h3>
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-sm text-gray-700 space-y-3 mb-6">
        <p className="font-semibold text-gray-800">Cenário: você tem 50 contatos com tag DEVEDOR e 10 deles pagaram. Quer mudar esses 10 para CLIENTE.</p>
        <div className="flex gap-2.5">
          <span className="w-5 h-5 bg-brand-600 rounded-full text-white text-xs font-black flex items-center justify-center shrink-0">1</span>
          <span>Clique na tag <strong>DEVEDOR</strong> na barra de filtros para ver só esses contatos.</span>
        </div>
        <div className="flex gap-2.5">
          <span className="w-5 h-5 bg-brand-600 rounded-full text-white text-xs font-black flex items-center justify-center shrink-0">2</span>
          <span>Marque as caixas de seleção dos 10 que pagaram.</span>
        </div>
        <div className="flex gap-2.5">
          <span className="w-5 h-5 bg-brand-600 rounded-full text-white text-xs font-black flex items-center justify-center shrink-0">3</span>
          <span>Clique no botão <strong>Alterar tag</strong> que aparece na barra de ação.</span>
        </div>
        <div className="flex gap-2.5">
          <span className="w-5 h-5 bg-brand-600 rounded-full text-white text-xs font-black flex items-center justify-center shrink-0">4</span>
          <span>Digite <Code>CLIENTE</Code>, escolha o modo <strong>Substituir</strong> e clique em Aplicar.</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="border-2 border-gray-200 rounded-xl p-4">
          <p className="font-bold text-sm text-gray-800 mb-1">Modo Substituir</p>
          <p className="text-xs text-gray-600 leading-relaxed">Remove todas as tags atuais e coloca apenas as novas. Use quando quiser reclassificar o contato completamente.</p>
        </div>
        <div className="border-2 border-brand-200 bg-brand-50 rounded-xl p-4">
          <p className="font-bold text-sm text-brand-800 mb-1">Modo Adicionar</p>
          <p className="text-xs text-brand-700 leading-relaxed">Mantém as tags existentes e adiciona as novas. Use quando quiser acumular classificações (ex: é DEVEDOR e também CAMPANHA2024).</p>
        </div>
      </div>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8">Adicionar contato manualmente</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        Clique em <strong>Novo contato</strong> na página de Contatos. Preencha nome, telefone, tags (separadas por vírgula) e observações (opcional).
      </p>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8">Opt-out (remoção da lista)</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        Quando um contato responde <Code>SAIR</Code>, <Code>STOP</Code>, <Code>PARAR</Code> ou palavras similares, o sistema marca automaticamente o contato como opt-out. Esses contatos ficam visíveis na lista mas não recebem mais mensagens de campanhas.
      </p>
      <Success>
        O opt-out automático protege você de enviar mensagens para quem não quer receber, reduzindo o risco de banimento e estando em conformidade com a LGPD.
      </Success>

      {/* ── Rastreamento de Contactados ── */}
      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-10 flex items-center gap-2">
        <Target size={18} className="text-teal-600" /> Rastreamento de Contactados
        <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">Novo</span>
      </h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        O sistema registra automaticamente quando um contato foi incluído em uma campanha. Isso permite evitar enviar para as mesmas pessoas repetidamente, reduzindo reclamações e risco de bloqueio.
      </p>
      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        {[
          { icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200', title: 'Badge "Enviado"', desc: 'Contatos que já receberam uma campanha mostram um indicador verde ao lado do nome na lista.' },
          { icon: Tag, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', title: 'Filtro "Não contactados"', desc: 'Use o filtro na lista de contatos para ver apenas quem ainda não recebeu nenhuma campanha.' },
          { icon: RefreshCw, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', title: 'Limpar histórico', desc: 'Quer enviar novamente para alguém? Acesse o contato e clique em "Limpar histórico de campanhas".' },
        ].map((c) => (
          <div key={c.title} className={`border rounded-xl p-4 ${c.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <c.icon size={15} className={c.color} />
              <p className={`font-semibold text-sm ${c.color.replace('text-', 'text-').replace('600', '900')}`}>{c.title}</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>
      <Tip>
        <strong>Estratégia recomendada:</strong> Ative <strong>"Excluir já contactados"</strong> em todas as campanhas. Assim cada pessoa recebe a mensagem uma única vez, e o sistema vai gradualmente consumindo a lista sem repetições — você trabalha com eficiência e sem irritar seus contatos.
      </Tip>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8">Plano e limites de contatos</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { plan: 'Starter', limit: '5.000 contatos', color: 'border-gray-200 bg-gray-50' },
          { plan: 'Pro',     limit: 'Ilimitado',       color: 'border-green-200 bg-green-50' },
        ].map((p) => (
          <div key={p.plan} className={`border rounded-xl p-4 ${p.color}`}>
            <p className="font-bold text-gray-800">{p.plan}</p>
            <p className="text-sm text-gray-600 mt-1">{p.limit}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CampaignsSection() {
  return (
    <div id="campaigns">
      <SectionTitle icon={Megaphone} color="text-purple-600 bg-purple-100" title="Mensagens e Campanhas" subtitle="Envie mensagens individuais ou em massa para sua base" />

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Mensagem individual</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        Para enviar uma mensagem avulsa para um contato específico, vá em <strong>Mensagens</strong> no menu e clique em <strong>Nova mensagem</strong>. Escolha o contato, o número de WhatsApp que vai enviar e escreva o texto.
      </p>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8">Criar uma campanha</h3>
      <Step num={1} title="Acesse Campanhas e clique em Nova campanha">
        No menu lateral clique em <strong>Campanhas</strong>, depois no botão <strong>Nova campanha</strong>.
      </Step>
      <Step num={2} title="Dê um nome para a campanha">
        Use um nome descritivo para facilitar a identificação depois (ex: "Promoção Black Friday", "Follow-up Leads Nov").
      </Step>
      <Step num={3} title="Escreva o template da mensagem">
        Use as variáveis <Code>{'{{nome}}'}</Code> e <Code>{'{{telefone}}'}</Code> para personalizar a mensagem para cada contato. Exemplo:
        <div className="mt-2 bg-gray-100 rounded-lg p-3 text-xs font-mono text-gray-700 leading-relaxed">
          Olá, {'{{nome}}'}! Temos uma oferta exclusiva para você. 😊
        </div>
      </Step>
      <Step num={4} title="Configure o delay entre mensagens">
        Escolha o intervalo entre cada envio. Opções disponíveis: 3s, 5s, 10s, 15s, 30s, 60s ou valor personalizado em milissegundos.
        <Tip>Use no mínimo 5 segundos entre mensagens. Delays maiores (10s–30s) reduzem muito o risco de banimento em listas grandes.</Tip>
      </Step>
      <Step num={5} title="Agende o disparo (opcional)">
        Use o campo <strong>Agendar disparo</strong> para definir uma data e hora futura. Se preencher, a campanha ficará com status <strong>Agendada</strong> (roxo) e disparará automaticamente no horário marcado — sem precisar estar logado. Se deixar em branco, dispara imediatamente.
        <div className="mt-2 bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-800">
          <strong>Exemplo:</strong> Crie duas campanhas agora mesmo — uma sem agendamento (dispara já com 200 contatos) e outra agendada para amanhã às 10h (mais 200 contatos). Assim você divide o volume sem precisar voltar ao sistema.
        </div>
      </Step>
      <Step num={6} title="Selecione os números de WhatsApp">
        Escolha quais números conectados vão enviar as mensagens. Para múltiplos números, configure o <strong>Rotacionar a cada N mensagens</strong> — por exemplo, "10" significa que o sistema alterna de número a cada 10 envios.
      </Step>
      <Step num={7} title="Escolha os contatos e dispare">
        No painel direito, você pode selecionar contatos de duas formas:
        <div className="mt-3 space-y-3">
          <div className="flex gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
            <div className="font-semibold text-sm text-gray-800 min-w-24 flex items-center gap-1.5">
              <Users size={13} className="text-gray-500" /> Individual
            </div>
            <div className="text-sm text-gray-600">Busque e marque os contatos um a um, ou clique em <strong>Marcar todos</strong>. Ideal para listas pequenas ou contatos específicos.</div>
          </div>
          <div className="flex gap-3 bg-brand-50 rounded-xl p-3 border border-brand-200">
            <div className="font-semibold text-sm text-brand-800 min-w-24 flex items-center gap-1.5">
              <Tag size={13} className="text-brand-600" /> Por tag
            </div>
            <div className="text-sm text-brand-700">Selecione uma ou mais tags. O sistema mostra quantos contatos cada tag tem e calcula automaticamente o total de destinatários. Contatos com opt-out são sempre excluídos.</div>
          </div>
        </div>
        <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
          <strong>Dica — Excluir já contactados:</strong> Marque a opção <strong>"Excluir já contactados"</strong> para o sistema pular automaticamente contatos que já receberam alguma campanha anterior. Ótimo para não repetir o mesmo contato em disparos consecutivos.
        </div>
        <p className="mt-3 text-sm text-gray-600">Clique em <strong>Disparar</strong> para criar a campanha e colocar as mensagens na fila.</p>
      </Step>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8">Acompanhar uma campanha</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        Clique no nome da campanha na lista para abrir o painel de detalhes. Você verá os cards de enviadas, entregues, falhas e em fila, além do progresso em tempo real.
      </p>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-6">Status das mensagens</h3>
      <div className="space-y-2 mb-6">
        {[
          { s: 'queued',    c: 'bg-gray-100 text-gray-600',   d: 'Na fila, aguardando envio.' },
          { s: 'sent',      c: 'bg-blue-100 text-blue-700',   d: 'Enviada — apareceu com um ✓ no WhatsApp.' },
          { s: 'delivered', c: 'bg-green-100 text-green-700', d: 'Entregue — apareceu com dois ✓✓ no WhatsApp.' },
          { s: 'failed',    c: 'bg-red-100 text-red-600',     d: 'Falha no envio — verifique o número ou a conexão.' },
        ].map((s) => (
          <div key={s.s} className="flex items-center gap-3 text-sm">
            <span className={`px-2.5 py-0.5 rounded-full font-semibold text-xs min-w-20 text-center ${s.c}`}>{s.s}</span>
            <span className="text-gray-600">{s.d}</span>
          </div>
        ))}
      </div>

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Reenvio de campanha</h3>
      <p className="text-gray-600 text-sm leading-relaxed">
        Na lista de campanhas, clique em <strong>Reenviar</strong> ao lado de uma campanha concluída para criar uma nova campanha com os mesmos contatos e configurações originais.
      </p>

      <Warning>
        Toda campanha inclui automaticamente ao final da mensagem a instrução: <em>"Para sair desta lista, responda: SAIR"</em>. Isso é obrigatório e não pode ser removido — protege você e seus contatos.
      </Warning>

      <div id="batch-files">
      {/* ── Envio em Lotes ── */}
      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-10 flex items-center gap-2">
        <Package size={18} className="text-orange-500" /> Envio em Lotes Anti-Bloqueio
        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">Novo</span>
      </h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        O WhatsApp pode restringir números que enviam muitas mensagens de forma contínua para contatos diferentes. O <strong>modo de envio em lotes</strong> divide sua campanha em grupos menores com intervalo de horas entre cada grupo — imitando um comportamento mais natural e reduzindo drasticamente o risco de bloqueio.
      </p>
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-5 text-sm text-orange-900 space-y-2">
        <p className="font-semibold">Como ativar:</p>
        {[
          'Na criação de campanha, role até "Configurações de Envio".',
          'Ative a chave "Envio em Lotes".',
          'Defina o Tamanho do lote — recomendamos entre 30 e 50 mensagens por vez.',
          'Defina o Intervalo entre lotes — recomendamos 8 horas para máxima segurança.',
          'Crie a campanha normalmente. O 1º lote dispara imediatamente; os demais aguardam o intervalo.',
        ].map((s, i) => (
          <div key={i} className="flex gap-2.5">
            <span className="w-5 h-5 bg-orange-200 rounded-full text-orange-800 text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>
      <Tip>
        <strong>Exemplo prático:</strong> 200 contatos, lote de 50, intervalo de 8h → 50 mensagens agora + 50 daqui a 8h + 50 daqui a 16h + 50 daqui a 24h. Muito mais seguro do que enviar tudo de uma vez!
      </Tip>

      {/* ── Envio de Arquivos ── */}
      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-10 flex items-center gap-2">
        <Paperclip size={18} className="text-blue-500" /> Envio de Arquivos (Imagens, PDFs, Documentos)
        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">Novo</span>
      </h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        Você pode anexar um arquivo à mensagem individual ou à campanha. Todos os destinatários receberão o mesmo arquivo via WhatsApp — ideal para catálogos, boletos, cardápios, contratos e muito mais.
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {['Imagem (JPG, PNG, WebP)', 'PDF', 'Word (.docx)', 'Excel (.xlsx)', 'PowerPoint', 'Vídeo (MP4)', 'Áudio (MP3, OGG)'].map((t) => (
          <span key={t} className="bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">{t}</span>
        ))}
      </div>
      <div className="space-y-2 mb-4">
        {[
          'Na tela de mensagem ou campanha, clique no ícone de clipe 📎 (Anexar arquivo).',
          'Selecione o arquivo no seu computador (limite: 10 MB por arquivo).',
          'Aguarde o upload. Quando a confirmação aparecer, o arquivo está salvo na nuvem.',
          'Escreva normalmente o texto da mensagem. O arquivo será enviado junto.',
          'Envie. Cada destinatário receberá o texto + o arquivo pelo WhatsApp.',
        ].map((s, i) => (
          <div key={i} className="flex gap-2.5 text-sm text-gray-700">
            <span className="w-5 h-5 bg-blue-100 rounded-full text-blue-700 text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>
      <Warning>
        <strong>Importante:</strong> O arquivo precisa estar configurado no servidor (Cloudflare R2) para o envio funcionar. Se você for o dono da plataforma, consulte o Guia de Deploy para configurar o armazenamento de arquivos.
      </Warning>
      </div>{/* end batch-files */}
    </div>
  );
}

function ScheduledSection() {
  return (
    <div id="scheduled">
      <SectionTitle
        icon={CalendarClock}
        color="text-blue-600 bg-blue-100"
        title="Agendamentos"
        subtitle="Programe follow-ups e nunca perca uma venda por falta de contato"
      />

      <p className="text-gray-600 text-sm leading-relaxed mb-6">
        Com os <strong>Agendamentos</strong> você programa uma mensagem para ser enviada automaticamente em qualquer data e horário — mesmo sem estar logado no sistema. Ideal para follow-ups de vendas, lembretes, confirmações de consulta e muito mais.
      </p>

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Criar um agendamento manual</h3>
      <Step num={1} title="Acesse a página Agendamentos no menu lateral">
        Clique em <strong>Agendamentos</strong> no menu. Você verá a lista de todos os agendamentos criados.
      </Step>
      <Step num={2} title='Clique em "Novo agendamento"'>
        O formulário de criação vai abrir no topo da página.
      </Step>
      <Step num={3} title="Preencha os dados">
        <div className="space-y-2 mt-1">
          <div className="flex gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200 text-sm text-gray-700">
            <strong className="min-w-32 text-gray-800">Contato</strong>
            Escolha para quem a mensagem vai ser enviada. Apenas contatos ativos (sem opt-out) aparecem na lista.
          </div>
          <div className="flex gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200 text-sm text-gray-700">
            <strong className="min-w-32 text-gray-800">Número de envio</strong>
            Escolha qual número WhatsApp vai enviar (ou deixe "Automático" para usar o primeiro conectado).
          </div>
          <div className="flex gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200 text-sm text-gray-700">
            <strong className="min-w-32 text-gray-800">Data e hora</strong>
            Escolha o momento exato do envio. Deve ser no futuro — o sistema não aceita horários passados.
          </div>
          <div className="flex gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200 text-sm text-gray-700">
            <strong className="min-w-32 text-gray-800">Mensagem</strong>
            Escreva o texto. Use <Code>{'{{nome}}'}</Code> para personalizar com o nome do contato.
          </div>
        </div>
      </Step>
      <Step num={4} title='Clique em "Agendar mensagem"'>
        Pronto! A mensagem aparece na lista com o status <strong>Agendado</strong> em azul e será enviada automaticamente no horário marcado.
      </Step>

      <h3 className="font-bold text-gray-800 mb-3 text-lg mt-8">Status dos agendamentos</h3>
      <div className="space-y-2 mb-6">
        {[
          { s: 'Agendado', c: 'bg-blue-100 text-blue-700',   d: 'Aguardando o horário marcado para ser enviado.' },
          { s: 'Enviado',  c: 'bg-green-100 text-green-700', d: 'Mensagem enviada com sucesso no horário programado.' },
          { s: 'Cancelado',c: 'bg-gray-100 text-gray-500',   d: 'Você cancelou este agendamento antes do horário.' },
          { s: 'Falhou',   c: 'bg-red-100 text-red-600',     d: 'Ocorreu um erro no envio (ex: WhatsApp desconectado no momento).' },
        ].map((s) => (
          <div key={s.s} className="flex items-center gap-3 text-sm">
            <span className={`px-2.5 py-0.5 rounded-full font-semibold text-xs min-w-20 text-center ${s.c}`}>{s.s}</span>
            <span className="text-gray-600">{s.d}</span>
          </div>
        ))}
      </div>

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Cancelar um agendamento</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        Enquanto o agendamento tiver status <strong>Agendado</strong>, você pode cancelá-lo clicando no ícone de lixeira ao lado da mensagem na lista. Após o horário do envio ou após ser enviado, não é mais possível cancelar.
      </p>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8 flex items-center gap-2">
        <Bot size={17} className="text-indigo-500" /> Agendamento via Bot (automático)
      </h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        O Bot de Atendimento pode criar agendamentos automaticamente durante uma conversa com o cliente — sem intervenção humana. Para isso, instrua o bot no prompt de sistema a agendar mensagens quando necessário.
      </p>
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-5 text-sm text-indigo-900">
        <p className="font-semibold mb-3">Como instruir o bot a fazer agendamentos:</p>
        <p className="mb-2">Adicione no prompt de sistema do bot uma instrução como:</p>
        <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs text-gray-300 leading-relaxed">
          <p className="text-gray-500 mb-2">// Exemplo de instrução no prompt do bot</p>
          <p>Se o cliente demonstrar interesse mas não quiser fechar agora,</p>
          <p>agende um follow-up para 3 dias depois às 10h usando a tag:</p>
          <p className="text-yellow-300 mt-1">{'[[AGENDAR:AAAA-MM-DD 10:00:Olá {{nome}}, só passando para ver se você conseguiu pensar na nossa proposta! 😊]]'}</p>
          <p className="text-gray-500 mt-2">// A data deve estar no formato AAAA-MM-DD HH:mm</p>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        {[
          'O bot inclui a tag [[AGENDAR:...]] na resposta internamente — o cliente não vê a tag.',
          'O sistema detecta a tag e cria automaticamente o agendamento na data e hora indicadas.',
          'O agendamento aparece na página Agendamentos com o status "Agendado".',
          'No dia e hora marcados, a mensagem é enviada automaticamente pelo número conectado.',
        ].map((s, i) => (
          <div key={i} className="flex gap-2.5 text-sm text-gray-700">
            <span className="w-5 h-5 bg-indigo-100 rounded-full text-indigo-700 text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>

      <Success>
        <strong>Caso de uso real:</strong> Cliente conversa com o bot às 14h e diz "vou pensar". O bot agenda automaticamente uma mensagem para daqui a 3 dias às 10h: <em>"Olá João, só passando para ver se você conseguiu pensar na nossa proposta! 😊"</em> — sem o vendedor precisar lembrar.
      </Success>

      <Warning>
        <strong>Atenção ao WhatsApp conectado:</strong> No momento do envio, o número de WhatsApp precisa estar conectado ao sistema. Se o servidor estiver inativo (plano gratuito do Render dorme após 15 min), a mensagem pode falhar. Para uso crítico de follow-ups, considere o plano pago do Render que mantém o servidor sempre ativo.
      </Warning>
    </div>
  );
}

function WhatsappSection() {
  return (
    <div id="whatsapp">
      <SectionTitle icon={Smartphone} color="text-emerald-600 bg-emerald-100" title="Conectar WhatsApp" subtitle="Gerencie seus números e conexões" />

      <p className="text-gray-600 mb-6 leading-relaxed">
        O Clica Aí suporta múltiplos números WhatsApp simultâneos. Cada número é gerenciado de forma independente e pode ser configurado com um nome (label) para facilitar a identificação.
      </p>

      <h3 className="font-bold text-gray-800 mb-3 text-lg">Limite de números por plano</h3>
      <div className="grid sm:grid-cols-2 gap-3 mb-8">
        <div className="border-2 border-gray-200 rounded-2xl p-5">
          <p className="font-black text-xl text-gray-800 mb-1">Starter</p>
          <p className="text-4xl font-black text-gray-400 mb-2">3</p>
          <p className="text-sm text-gray-500">números WhatsApp conectados simultaneamente</p>
        </div>
        <div className="border-2 border-green-300 bg-green-50 rounded-2xl p-5">
          <p className="font-black text-xl text-green-800 mb-1">Pro</p>
          <p className="text-4xl font-black text-green-600 mb-2">6</p>
          <p className="text-sm text-green-700">números WhatsApp conectados simultaneamente</p>
        </div>
      </div>

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Conectar um novo número</h3>
      <Step num={1} title="Vá em WhatsApp no menu lateral">
        Clique em <strong>WhatsApp</strong> no menu. Você verá a lista de números já cadastrados.
      </Step>
      <Step num={2} title="Clique em Adicionar número">
        Clique no botão <strong>+ Adicionar número</strong> e dê um nome (label) para identificar esse número (ex: "Vendas", "Suporte", "Número Principal").
      </Step>
      <Step num={3} title="Aguarde o QR Code aparecer">
        Clique em <strong>Conectar</strong> ao lado do número criado. O QR Code aparecerá em alguns segundos.
      </Step>
      <Step num={4} title="Escaneie pelo WhatsApp no celular">
        No celular, abra o WhatsApp → toque nos três pontinhos (⋮) → <strong>Dispositivos vinculados</strong> → <strong>Vincular dispositivo</strong> → aponte a câmera para o QR Code.
      </Step>
      <Step num={5} title="Aguarde a confirmação">
        O status do número mudará de <em>conectando</em> para <strong>conectado</strong> em alguns segundos. O número de telefone será identificado automaticamente.
      </Step>

      <Warning>
        <strong>Use números dedicados ao negócio.</strong> Não recomendamos usar o número pessoal principal para disparos em massa. Se possível, use um chip de operadora diferente ou WhatsApp Business.
      </Warning>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8">Reconectar após reinicialização</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        O sistema salva a sessão de cada número no banco de dados e tenta reconectar automaticamente quando o servidor reinicia. Se um número aparecer como <em>desconectado</em>, clique em <strong>Conectar</strong> e refaça o QR Code.
      </p>

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Boas práticas por número</h3>
      <div className="space-y-2">
        {[
          'Números novos: comece com poucos envios (50–100/dia) e aumente gradualmente.',
          'Números com mais de 6 meses de uso têm menor risco de bloqueio.',
          'Ative o aquecimento para todos os números antes de iniciar campanhas.',
          'Mantenha uma proporção de mensagens recebidas/enviadas saudável.',
          'Nunca envie para uma lista comprada — use apenas contatos que conhecem seu número.',
        ].map((tip) => (
          <div key={tip} className="flex gap-2.5 text-sm text-gray-700">
            <CheckCircle size={15} className="text-green-500 mt-0.5 shrink-0" />
            <span>{tip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WarmupSection() {
  return (
    <div id="warmup">
      <SectionTitle icon={Flame} color="text-orange-600 bg-orange-100" title="Aquecimento de Números" subtitle="Proteja seus chips e reduza o risco de banimento" />

      <p className="text-gray-600 mb-6 leading-relaxed">
        O aquecimento (warmup) faz seus números WhatsApp trocarem mensagens naturais entre si, simulando conversas reais. Isso constrói histórico de uso, aumenta a reputação do número perante o WhatsApp e reduz drasticamente o risco de banimento ao fazer disparos em massa.
      </p>

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Como funciona tecnicamente</h3>
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-6 space-y-3 text-sm text-orange-900">
        {[
          'A cada 4 a 9 minutos (intervalo aleatório), o sistema escolhe 2 números conectados.',
          'Um número envia uma mensagem casual para o outro (ex: "Oi! Tudo bem?").',
          'Após 15 a 90 segundos, o segundo número responde naturalmente.',
          'Os intervalos aleatórios evitam padrões detectáveis pelo WhatsApp.',
          'O sistema respeita a janela de horário configurada e a cota diária.',
        ].map((s, i) => (
          <div key={i} className="flex gap-2.5">
            <span className="w-5 h-5 bg-orange-200 rounded-full text-orange-800 text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Configurar o aquecimento</h3>
      <Step num={1} title="Acesse a página Aquecimento">
        Clique em <strong>Aquecimento</strong> no menu lateral.
      </Step>
      <Step num={2} title="Selecione os números participantes">
        Marque quais números conectados vão participar do aquecimento. Sem seleção = todos os números conectados participam. <strong>Mínimo: 2 números.</strong>
      </Step>
      <Step num={3} title="Configure as mensagens por dia">
        Use o slider para definir quantas mensagens de aquecimento serão enviadas por dia. Recomendação de início: 15 a 20 mensagens.
      </Step>
      <Step num={4} title="Defina o horário de funcionamento">
        Configure o horário de início e fim (ex: 08:00 às 22:00) para que o aquecimento aconteça apenas em horários naturais.
      </Step>
      <Step num={5} title="Ative o aquecimento">
        Clique no botão <strong>Ativar aquecimento</strong>. O sistema começa a funcionar imediatamente.
      </Step>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8">Nível de aquecimento</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        O indicador de nível calcula a quantidade de mensagens trocadas nos últimos 7 dias em relação à meta semanal. Os níveis são:
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Frio',      range: '0–19%',  color: 'bg-blue-100 text-blue-700' },
          { label: 'Morno',     range: '20–49%', color: 'bg-yellow-100 text-yellow-700' },
          { label: 'Quente',    range: '50–79%', color: 'bg-orange-100 text-orange-700' },
          { label: 'Aquecido',  range: '80–100%',color: 'bg-red-100 text-red-700' },
        ].map((l) => (
          <div key={l.label} className={`rounded-xl p-3 text-center ${l.color}`}>
            <p className="font-bold text-sm">{l.label}</p>
            <p className="text-xs mt-0.5 opacity-75">{l.range}</p>
          </div>
        ))}
      </div>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8 flex items-center gap-2">
        <Moon size={18} className="text-indigo-500" /> Aquecimento Noturno
      </h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        O aquecimento noturno funciona em paralelo ao diurno, com seu próprio período de horário e cota de mensagens. É ideal para aproveitar a madrugada — quando ninguém está usando os chips para atender clientes — e acelerar o processo de aquecimento.
      </p>
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="border border-orange-200 bg-orange-50 rounded-xl p-4">
          <p className="font-bold text-sm text-orange-800 mb-1 flex items-center gap-1.5"><Flame size={14} /> Aquecimento Diurno</p>
          <p className="text-xs text-orange-700 leading-relaxed">Funciona dentro do seu horário comercial (ex: 08:00–22:00). Cota separada para não interferir no ritmo de trabalho.</p>
        </div>
        <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-4">
          <p className="font-bold text-sm text-indigo-800 mb-1 flex items-center gap-1.5"><Moon size={14} /> Aquecimento Noturno</p>
          <p className="text-xs text-indigo-700 leading-relaxed">Roda durante a madrugada (ex: 23:00–07:00). Pode ter cota maior pois não há risco de confundir com conversas reais.</p>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
        Para ativar, acesse <strong>Aquecimento</strong> no menu e role até a seção <strong>Aquecimento Noturno</strong>. Clique no toggle para ativar, configure o horário e a cota, e salve. Os dois períodos são somados na cota diária total.
      </p>
      <Success>
        <strong>Exemplo prático:</strong> Diurno com 20 mensagens/dia (08:00–22:00) + Noturno com 40 mensagens/dia (23:00–07:00) = 60 mensagens/dia total. Isso acelera significativamente o aquecimento sem precisar aumentar a frequência durante o horário comercial.
      </Success>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8">Recomendações importantes</h3>
      <div className="space-y-2">
        {[
          { tip: 'Número novo: comece com 10–15 mensagens/dia na primeira semana.' },
          { tip: 'Aumente gradualmente a cada semana — não duplique de uma vez.' },
          { tip: 'Mantenha o aquecimento ativo mesmo quando não tiver campanhas rodando.' },
          { tip: 'Números com nível "Aquecido" têm risco muito menor ao fazer disparos.' },
          { tip: 'Para contas Pro com 6 números, selecione quais vão aquecer entre si para não misturar grupos de uso diferente.' },
          { tip: 'Use o aquecimento noturno para acelerar o processo sem aumentar o risco durante o horário de uso real.' },
        ].map(({ tip }) => (
          <div key={tip} className="flex gap-2.5 text-sm text-gray-700">
            <Flame size={14} className="text-orange-400 mt-0.5 shrink-0" />
            <span>{tip}</span>
          </div>
        ))}
      </div>

      <Warning>
        O aquecimento precisa de <strong>no mínimo 2 números conectados</strong> com número de telefone identificado. Se houver apenas 1 número, o aquecimento fica inativo até que um segundo número seja conectado.
      </Warning>
    </div>
  );
}

function BotsSection() {
  return (
    <div id="bots">
      <SectionTitle icon={Bot} color="text-indigo-600 bg-indigo-100" title="Bot de Atendimento" subtitle="Atenda clientes automaticamente com inteligência artificial" />

      <div className="flex items-center gap-2 mb-4">
        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">Exclusivo Plano Pro</span>
        <span className="text-xs text-gray-500">Custos de IA incluídos · até 500 conversas/mês</span>
      </div>

      <p className="text-gray-600 mb-4 leading-relaxed">
        O bot de atendimento usa <strong>GPT-4o-mini</strong> para responder automaticamente os clientes que entram em contato com seus números WhatsApp. Os custos de IA ficam por conta da plataforma — nenhuma chave de API necessária. Cada número pode ter <strong>um bot configurado</strong> com personalidade, comportamento e horários próprios.
      </p>

      <Success>
        <strong>Incluído no plano Pro:</strong> Até 500 novas conversas por mês cobertas pela plataforma. O contador reinicia todo dia 1º. Conversas já abertas continuam sendo atendidas normalmente.
      </Success>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-6">Como funciona</h3>
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-6 space-y-3 text-sm text-indigo-900">
        {[
          'Cliente envia mensagem para o número → bot verifica se está ativo e no horário configurado.',
          'Bot carrega o histórico da conversa com esse cliente (contexto completo).',
          'Envia o histórico + sua mensagem para o GPT-4o-mini com o seu prompt de identidade.',
          'IA gera resposta contextualizada e o bot envia automaticamente ao cliente.',
          'Se o cliente pedir humano, ou após o limite de turnos, o bot escala e avisa o operador.',
        ].map((s, i) => (
          <div key={i} className="flex gap-2.5">
            <span className="w-5 h-5 bg-indigo-200 rounded-full text-indigo-800 text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Configurar um bot</h3>
      <Step num={1} title="Acesse a página Bot de Atendimento">
        Clique em <strong>Bot de Atendimento</strong> no menu. Você verá um card para cada número conectado.
      </Step>
      <Step num={2} title="Clique no número e expanda as configurações">
        Clique no card do número desejado para expandir a configuração completa do bot.
      </Step>
      <Step num={3} title="Escreva o Prompt do sistema (o mais importante)">
        O prompt define a personalidade e o conhecimento do bot. Quanto mais detalhado, melhor a qualidade das respostas.
      </Step>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-6">Como escrever um bom prompt</h3>
      <p className="text-gray-600 text-sm mb-3">O prompt deve incluir:</p>
      <div className="space-y-2 mb-4">
        {[
          'Quem é o bot (nome, empresa, função)',
          'O que a empresa faz / vende',
          'Produtos ou serviços principais com preços (se possível)',
          'Tom de voz (formal, descontraído, jovem, etc.)',
          'O que o bot pode e não pode resolver',
          'Como perguntar se o cliente já é cliente ou não',
        ].map((item) => (
          <div key={item} className="flex gap-2 text-sm text-gray-700">
            <ChevronRight size={14} className="text-indigo-500 mt-0.5 shrink-0" />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-2xl p-5 text-sm font-mono text-gray-300 leading-relaxed mb-6">
        <p className="text-gray-500 text-xs mb-3 font-sans">// Exemplo de prompt para loja de roupas</p>
        <p>Você é a <span className="text-green-400">Bia</span>, assistente virtual da <span className="text-green-400">Loja Bella Moda</span>.</p>
        <p className="mt-2">A Bella Moda é uma loja de roupas femininas em São Paulo, especializada em moda casual e executiva. Atendemos de seg a sáb, 9h às 18h.</p>
        <p className="mt-2">Seus produtos principais:</p>
        <p>- Blusas: R$79 a R$149</p>
        <p>- Calças: R$129 a R$199</p>
        <p>- Vestidos: R$159 a R$299</p>
        <p className="mt-2">Sempre pergunte primeiro se o cliente já comprou antes conosco. Seja simpática, use emojis com moderação e fique focada em ajudar a encontrar o produto ideal.</p>
        <p className="mt-2">Se o cliente quiser trocar ou tiver problema com pedido, informe que vai transferir para nossa equipe.</p>
      </div>

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Mensagens de boas-vindas e escalação</h3>
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="font-semibold text-sm text-gray-800 mb-2 flex items-center gap-1.5"><MessageSquare size={14} className="text-green-500" /> Mensagem de boas-vindas</p>
          <p className="text-xs text-gray-600 leading-relaxed">Enviada automaticamente quando um cliente entra em contato pela primeira vez. Configure algo acolhedor que apresente o bot.</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="font-semibold text-sm text-gray-800 mb-2 flex items-center gap-1.5"><ArrowRight size={14} className="text-orange-500" /> Mensagem de escalação</p>
          <p className="text-xs text-gray-600 leading-relaxed">Enviada quando o bot não consegue resolver e precisa chamar um humano. Configure algo como: "Vou te transferir para nosso atendente. Aguarde!"</p>
        </div>
      </div>

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Quando o bot escala para humano</h3>
      <div className="space-y-2 mb-6">
        {[
          'O cliente escreve "quero falar com humano", "atendente", "pessoa" ou similar.',
          'O bot não consegue responder e inclui [[ESCALAR]] na resposta internamente.',
          'O número de turnos da conversa ultrapassa o limite configurado (padrão: 10).',
        ].map((c) => (
          <div key={c} className="flex gap-2.5 text-sm text-gray-700">
            <AlertTriangle size={14} className="text-orange-400 mt-0.5 shrink-0" />
            <span>{c}</span>
          </div>
        ))}
      </div>

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Gerenciar conversas</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        Na página <strong>Bot de Atendimento</strong>, expanda o número desejado e acesse a aba <strong>Conversas</strong>. Você verá as conversas filtradas por status:
      </p>
      <div className="space-y-2 mb-4">
        {[
          { s: 'Em andamento', c: 'bg-green-100 text-green-700',  d: 'O bot está respondendo automaticamente.' },
          { s: 'Aguarda humano', c: 'bg-orange-100 text-orange-700', d: 'Bot escalou — alguém precisa responder manualmente.' },
          { s: 'Encerrada', c: 'bg-gray-100 text-gray-600',     d: 'Conversa finalizada. Pode ser reaberta se necessário.' },
        ].map((s) => (
          <div key={s.s} className="flex items-center gap-3 text-sm">
            <span className={`px-2.5 py-0.5 rounded-full font-semibold text-xs whitespace-nowrap ${s.c}`}>{s.s}</span>
            <span className="text-gray-600">{s.d}</span>
          </div>
        ))}
      </div>

      <Tip>
        <strong>Limite mensal:</strong> O plano Pro cobre até 500 novas conversas por mês. Você pode acompanhar o uso na própria página do Bot de Atendimento — há um contador no canto superior direito. Quando o limite é atingido, o bot para de iniciar novas conversas até o dia 1º do mês seguinte.
      </Tip>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-6">Horário de funcionamento do bot</h3>
      <p className="text-gray-600 text-sm leading-relaxed">
        Ative a opção <strong>Só em horário comercial</strong> para que o bot responda apenas dentro do horário configurado. Fora desse horário, mensagens são ignoradas pelo bot (o humano pode responder normalmente pelo WhatsApp no celular).
      </p>

      <Warning>
        <strong>Atenção:</strong> O bot e o aquecimento <strong>não conflitam</strong> — eles usam a mesma conta WhatsApp de formas diferentes. O aquecimento troca mensagens entre seus próprios números; o bot responde mensagens de clientes externos.
      </Warning>
    </div>
  );
}

// ─── Main Guide Page ──────────────────────────────────────────────────────────

export default function GuidePage() {
  const [active, setActive] = useState('dashboard');
  const contentRef = useRef<HTMLDivElement>(null);

  function scrollTo(id: string) {
    setActive(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Spy on scroll to update active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-brand-100 rounded-2xl">
          <BookOpen size={24} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Guia de Utilização</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tudo que você precisa saber para usar o Clica Aí</p>
        </div>
      </div>

      <div className="flex gap-6 items-start">

        {/* Sticky nav */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-8">
          <nav className="card p-3 space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 pb-2">Seções</p>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  active === s.id
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100'
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

        {/* Content */}
        <div ref={contentRef} className="flex-1 min-w-0 space-y-16">
          <div className="card p-8">
            <GettingStartedSection />
          </div>
          <div className="card p-8">
            <DashboardSection />
          </div>
          <div className="card p-8">
            <ContactsSection />
          </div>
          <div className="card p-8">
            <CampaignsSection />
          </div>
          <div className="card p-8">
            <ScheduledSection />
          </div>
          <div className="card p-8">
            <WhatsappSection />
          </div>
          <div className="card p-8">
            <WarmupSection />
          </div>
          <div className="card p-8">
            <BotsSection />
          </div>
        </div>
      </div>
    </div>
  );
}
