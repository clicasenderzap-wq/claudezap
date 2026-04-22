'use client';

import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Users, Megaphone, Smartphone, Flame, Bot,
  MessageSquare, BookOpen, ChevronRight, Info, AlertTriangle,
  CheckCircle, Lightbulb, ArrowRight, Key, Clock, Zap, Shield,
  FileSpreadsheet, Send, BarChart2, RefreshCw, Settings, Star,
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
  { id: 'dashboard',  label: 'Dashboard',            icon: LayoutDashboard, color: 'text-blue-600 bg-blue-100' },
  { id: 'contacts',   label: 'Importar Contatos',     icon: Users,           color: 'text-green-600 bg-green-100' },
  { id: 'campaigns',  label: 'Mensagens e Campanhas', icon: Megaphone,       color: 'text-purple-600 bg-purple-100' },
  { id: 'whatsapp',   label: 'Conectar WhatsApp',     icon: Smartphone,      color: 'text-emerald-600 bg-emerald-100' },
  { id: 'warmup',     label: 'Aquecimento',           icon: Flame,           color: 'text-orange-600 bg-orange-100' },
  { id: 'bots',       label: 'Bot de Atendimento',    icon: Bot,             color: 'text-indigo-600 bg-indigo-100' },
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
      <SectionTitle icon={Users} color="text-green-600 bg-green-100" title="Importar Contatos" subtitle="Construa e gerencie sua base de contatos" />

      <p className="text-gray-600 mb-6 leading-relaxed">
        Você pode adicionar contatos manualmente ou importar em massa por planilha. O sistema aceita arquivos Excel (.xlsx, .xls) e CSV.
      </p>

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Importar por planilha (recomendado)</h3>
      <Step num={1} title="Prepare sua planilha">
        A planilha deve ter as colunas <Code>nome</Code> e <Code>telefone</Code> (ou <Code>name</Code> e <Code>phone</Code> em inglês).
        A coluna <Code>observacoes</Code> é opcional. O telefone deve estar no formato <Code>5511999999999</Code> (código do país + DDD + número) ou apenas <Code>11999999999</Code> — o sistema aceita ambos.
      </Step>
      <Step num={2} title="Acesse a página de Contatos">
        No menu lateral clique em <strong>Contatos</strong> e depois no botão <strong>Importar planilha</strong> no canto superior direito.
      </Step>
      <Step num={3} title="Selecione o arquivo">
        Arraste o arquivo ou clique para escolher. O sistema detecta automaticamente o separador do CSV (vírgula ou ponto-e-vírgula) e lê todas as abas do Excel.
      </Step>
      <Step num={4} title="Aguarde o processamento">
        O sistema importa os contatos e informa quantos foram adicionados, quantos já existiam (duplicatas são ignoradas) e quantos tiveram erro de formato.
      </Step>

      <Warning>
        <strong>Formato do telefone:</strong> Sempre inclua o código do país (55 para Brasil) e o DDD. Exemplo: <Code>5511987654321</Code>. Telefones com formatação incorreta são descartados na importação.
      </Warning>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8">Adicionar contato manualmente</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        Clique em <strong>Novo contato</strong> na página de Contatos. Preencha nome, telefone e observações (opcional). Útil para adicionar contatos avulsos sem precisar de planilha.
      </p>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-8">Opt-out (remoção da lista)</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        Quando um contato responde <Code>SAIR</Code>, <Code>STOP</Code>, <Code>PARAR</Code> ou palavras similares, o sistema marca automaticamente o contato como opt-out. Esses contatos ficam visíveis na lista mas não recebem mais mensagens de campanhas.
      </p>
      <Success>
        O opt-out automático protege você de enviar mensagens para quem não quer receber, reduzindo o risco de banimento e estando em conformidade com a LGPD.
      </Success>

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
      <Step num={5} title="Selecione os números de WhatsApp">
        Escolha quais números conectados vão enviar as mensagens. Para múltiplos números, configure o <strong>Rotacionar a cada N mensagens</strong> — por exemplo, "10" significa que o sistema alterna de número a cada 10 envios.
      </Step>
      <Step num={6} title="Escolha os contatos e dispare">
        Selecione os grupos ou contatos que vão receber a campanha. Contatos com opt-out são automaticamente excluídos. Clique em <strong>Iniciar campanha</strong>.
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

      <h3 className="font-bold text-gray-800 mb-4 text-lg">Recomendações importantes</h3>
      <div className="space-y-2">
        {[
          { tip: 'Número novo: comece com 10–15 mensagens/dia na primeira semana.' },
          { tip: 'Aumente gradualmente a cada semana — não duplique de uma vez.' },
          { tip: 'Mantenha o aquecimento ativo mesmo quando não tiver campanhas rodando.' },
          { tip: 'Números com nível "Aquecido" têm risco muito menor ao fazer disparos.' },
          { tip: 'Para contas Pro com 6 números, selecione quais vão aquecer entre si para não misturar grupos de uso diferente.' },
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

      <p className="text-gray-600 mb-4 leading-relaxed">
        O bot de atendimento usa IA para responder automaticamente os clientes que entram em contato com seus números WhatsApp. Cada número pode ter <strong>um bot configurado</strong> — com personalidade, comportamento e horários próprios.
      </p>

      <Success>
        <strong>1 bot por número:</strong> Cada número WhatsApp tem sua própria configuração de bot independente. Configure bots diferentes para vendas, suporte, agendamentos, etc.
      </Success>

      <h3 className="font-bold text-gray-800 mb-4 text-lg mt-6">Como funciona</h3>
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-6 space-y-3 text-sm text-indigo-900">
        {[
          'Cliente envia mensagem para o número → bot verifica se está ativo e no horário configurado.',
          'Bot carrega o histórico da conversa com esse cliente (contexto completo).',
          'Envia o histórico + sua mensagem para a IA (Claude ou GPT) com o prompt de identidade.',
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
      <Step num={3} title="Escolha o provedor de IA">
        <div className="space-y-2 mt-1">
          <div className="flex gap-3 bg-gray-50 rounded-xl p-3">
            <div className="font-semibold text-sm text-gray-800 min-w-28">Anthropic (Claude)</div>
            <div className="text-sm text-gray-600">Melhor para conversas naturais em português. Modelo recomendado: <Code>claude-haiku-4-5</Code> (rápido e barato).</div>
          </div>
          <div className="flex gap-3 bg-gray-50 rounded-xl p-3">
            <div className="font-semibold text-sm text-gray-800 min-w-28">OpenAI (GPT)</div>
            <div className="text-sm text-gray-600">Alternativa popular. Modelo recomendado: <Code>gpt-4o-mini</Code> (equilíbrio custo/qualidade).</div>
          </div>
        </div>
      </Step>
      <Step num={4} title="Insira sua chave de API">
        <div className="space-y-2 mt-1 text-sm text-gray-600">
          <p><strong>Anthropic:</strong> crie em <Code>console.anthropic.com</Code> → API Keys → Create Key. Começa com <Code>sk-ant-</Code>.</p>
          <p><strong>OpenAI:</strong> crie em <Code>platform.openai.com</Code> → API Keys → Create. Começa com <Code>sk-</Code>.</p>
          <p className="text-xs text-gray-400 mt-1">A chave é armazenada de forma segura e nunca é exibida completa após salvar.</p>
        </div>
      </Step>
      <Step num={5} title="Escreva o Prompt do sistema (o mais importante)">
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
        <strong>Custo por conversa:</strong> O custo de IA é muito baixo — entre R$0,01 e R$0,07 por conversa completa (10 trocas). Esse valor é cobrado diretamente pelo provedor de IA (Anthropic ou OpenAI) na sua chave de API, não pela Clica Aí.
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
            <DashboardSection />
          </div>
          <div className="card p-8">
            <ContactsSection />
          </div>
          <div className="card p-8">
            <CampaignsSection />
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
