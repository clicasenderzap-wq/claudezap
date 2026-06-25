# Plano Técnico — Transformação em Plataforma de Atendimento (SAC)

**Data:** Junho 2026  
**Versão:** 1.0  
**Projeto:** Clica Aí

---

## 1. Contexto e Motivação

O Clica Aí é hoje uma plataforma de **disparo de mensagens WhatsApp** com suporte a campanhas em massa, bot com IA, e-mail marketing e gestão de contatos. O objetivo deste plano é evoluir o produto para uma **plataforma de atendimento ao cliente (SAC)**, onde agentes humanos podem receber, visualizar e responder mensagens de WhatsApp em tempo real — transformando o sistema em algo similar ao Chatwoot, Zendesk ou Trengo, porém com a infraestrutura já existente.

---

## 2. Estudo de Viabilidade

### 2.1 O que já existe (base sólida)

| Componente | Status atual | Aproveitamento |
|---|---|---|
| Tabela `IncomingMessage` | Existe — log somente leitura | Base para o novo modelo de conversa |
| Tabela `BotConversation` | Existe — threads com status e histórico JSON | Prova de conceito de threading; lógica de escalação já implementada |
| Envio de mensagens individuais | Existe via `/api/messages` | Reutilizar para resposta de agentes |
| Bot com escalação (`status: escalated`) | Existe | Ligar ao painel de atendimento humano |
| Múltiplas contas WhatsApp | Existe | Suporte multi-número no SAC |
| Multi-tenant (`user_id` em tudo) | Existe | Isolar dados por empresa |
| Electron recebendo mensagens em tempo real | Existe (WebSocket Electron → Backend) | Estender para Backend → Frontend |
| Middleware de planos (`planGuard`) | Existe | Controlar acesso ao módulo SAC por plano |

**Conclusão:** ~60% da fundação já está construída. O produto tem base técnica para suportar a evolução sem reescritas.

### 2.2 O que falta construir

**Nível 1 — MVP de Atendimento (4–6 semanas)**

1. Modelo `Conversation` — thread de atendimento unificada
2. Inbox em tempo real com interface de chat (visualizar + responder)
3. WebSocket Backend → Frontend (push de mensagem nova para agentes)
4. Sub-usuários / agentes com papéis por empresa

**Nível 2 — SAC Completo (+ 2–3 semanas)**

5. Atribuição de conversas a agentes
6. Handoff bot → humano (bot escalado abre ticket no painel)
7. Respostas rápidas / templates internos
8. Tags em conversas
9. SLA e alertas de tempo sem resposta
10. Histórico unificado do contato

### 2.3 Riscos e limitações

| Risco | Impacto | Mitigação |
|---|---|---|
| Baileys (não-oficial) pode ser bloqueado pelo WhatsApp | Alto | Manter delays, contas aquecidas; avaliar Cloud API no futuro |
| Electron roda em 1 máquina — SAC com equipe precisa de servidor central | Alto | Mover processamento de mensagens recebidas para o backend ou espelhar via WebSocket |
| Ausência de sub-usuários hoje | Alto | Criar tabela `TeamMember` com roles por `user_id` (empresa) |
| Sem WebSocket Backend → Frontend | Médio | Adicionar `socket.io` ou SSE; fallback: polling de 3s como solução rápida |
| Inbox atual é somente leitura | Médio | Adicionar rota de resposta que chama o serviço de envio existente |

**Risco principal (arquitetural):** Hoje o Baileys roda no Electron (desktop do cliente). Para um SAC com múltiplos agentes, as mensagens recebidas precisam chegar ao servidor e ser distribuídas a todos os agentes conectados — não apenas ao desktop de um único usuário. A solução mais viável a curto prazo é manter o Electron como gateway e garantir que o backend redistribua via WebSocket para todos os clientes web conectados.

### 2.4 Veredicto

**Viável. Estimativas de esforço:**

| Fase | Escopo | Tempo estimado |
|---|---|---|
| Fase 1 — MVP | Inbox com resposta + conversas em tempo real | 3–4 semanas |
| Fase 2 — SAC | Equipe, SLA, handoff bot, tags | + 2–3 semanas |
| Fase 3 — Avançado | Relatórios, CSAT, integrações | + 2–4 semanas |

---

### 2.5 Análise de Infraestrutura — O que Temos Hoje

#### Serviços ativos e seus custos atuais

| Serviço | Função atual | Plano | Custo mensal |
|---|---|---|---|
| **Render.com** | Backend Node.js (API + WebSocket Electron) | Free (dorme em 15 min) | R$ 0 |
| **Vercel** | Frontend Next.js | Free (100 GB banda) | R$ 0 |
| **Neon** | PostgreSQL (banco principal) | Free (0,5 GB) | R$ 0 |
| **Cloudflare R2** | Armazenamento de mídia (imagens, PDFs) | Free até 10 GB | R$ 0 |
| **Resend** | Envio de e-mails marketing | Pago por volume | Variável |
| **OpenAI** | GPT-4o-mini para o bot de IA | Pago por token | Variável |
| **GitHub Actions** | CI/CD + build do Electron | Free (2.000 min/mês) | R$ 0 |
| **Total fixo atual** | | | **~R$ 0/mês** |

> A fila de mensagens já roda sobre o PostgreSQL (PgBoss) — não há Redis, Upstash nem fila externa.

#### Detalhes técnicos relevantes

- **Backend em Render Free:** dorme após 15 minutos sem requisição. O primeiro acesso demora ~30s para "acordar". As conexões WebSocket com o Electron podem cair durante o sono.
- **Neon Free (0,5 GB):** suficiente hoje porque armazena principalmente campanhas e contatos. O volume de dados é baixo no modelo de disparo.
- **WhatsApp via Electron:** toda a sessão WhatsApp roda no computador do cliente. O servidor apenas recebe/roteia os eventos via WebSocket. Isso é o ponto de atenção mais importante para o SAC (detalhado abaixo).

---

### 2.6 O Que Muda na Infra ao Virar Plataforma de Atendimento

#### Problema nº 1 — Render Free não serve para SAC (crítico)

O SAC exige conexões **persistentes e contínuas**: o agente abre o painel e fica aguardando mensagens em tempo real via WebSocket. Com o Render em modo Free:

- O servidor dorme → conexões WebSocket caem → o agente perde mensagens em tempo real
- Mensagens que chegam enquanto o servidor dorme podem ser perdidas ou atrasadas

**Solução obrigatória:** migrar para **Render Starter pago ($7/mês)**, que elimina o sleep e mantém o servidor sempre ativo.

#### Problema nº 2 — O Electron como gateway único (crítico para equipe)

Hoje a arquitetura é:
```
WhatsApp ←→ Electron (computador do cliente) ←→ Backend ←→ Agentes
```

Isso significa que **se o computador do cliente desligar ou o Electron fechar, nenhuma mensagem chega ao backend** — e portanto os agentes não recebem nada. Para um SAC com equipe, isso é um risco operacional sério.

**Opções para resolver:**

| Opção | Como funciona | Custo adicional | Confiabilidade |
|---|---|---|---|
| **A — Manter Electron (atual)** | Cliente mantém o computador ligado 24/7 | R$ 0 | Baixa — depende do cliente |
| **B — VPS com Baileys headless** | Rodar o Baileys num servidor próprio (DigitalOcean, Railway, etc.) | ~$5–10/mês | Alta — servidor nunca desliga |
| **C — WhatsApp Business Cloud API** | API oficial do Meta (sem Baileys) | $0 por mensagem recebida + custo por mensagem enviada | Muito alta — mas requer aprovação Meta |

**Recomendação:** no MVP (Fase 1–2), manter o Electron e orientar o cliente a deixar um computador ligado 24/7 ou usar uma VM. Para a Fase 3, avaliar migração para a Opção B.

#### Problema nº 3 — Banco de dados vai crescer muito mais rápido

No modelo de disparo, cada mensagem enviada ocupa ~200–500 bytes no banco. Com SAC, **cada conversa armazena todas as mensagens trocadas** em ambas as direções.

Estimativa de crescimento:
- 10 conversas/dia × 15 mensagens cada × 30 dias = 4.500 mensagens/mês
- Em texto puro: ~2–4 MB/mês
- Com 10 clientes ativos: ~20–40 MB/mês

O **Neon Free (0,5 GB)** aguenta entre 6 e 12 meses de crescimento moderado antes de precisar de upgrade.

#### O que o socket.io adiciona ao servidor

Para push em tempo real de mensagens aos agentes, vamos adicionar `socket.io` ao backend. Cada agente conectado mantém 1 conexão WebSocket aberta. Impacto:

- 5 agentes simultâneos: ~5 MB RAM adicionais → sem problema
- 50 agentes simultâneos: ~50 MB RAM → ainda dentro do limite do Render Starter (512 MB)
- 200+ agentes: considerar Render Standard (2 GB RAM, $25/mês)

---

### 2.7 Comparativo de Custos: Antes vs. Depois

#### Fase 1 — MVP de Atendimento

| Serviço | Antes | Depois | Motivo da mudança |
|---|---|---|---|
| Render | R$ 0 (Free) | ~R$ 38/mês (Starter $7) | Sleep incompatível com WebSocket contínuo |
| Neon | R$ 0 (Free) | R$ 0 (Free, ainda suporta) | Volume ainda pequeno |
| Vercel | R$ 0 | R$ 0 | Sem mudança |
| R2 | R$ 0 | R$ 0–5 | Leve aumento de mídia em conversas |
| socket.io | R$ 0 | R$ 0 | É uma biblioteca, não um serviço |
| **Total fixo** | **~R$ 0/mês** | **~R$ 38–45/mês** | |

#### Fase 2 — SAC com Equipe (múltiplos agentes)

| Serviço | Custo | Motivo |
|---|---|---|
| Render Starter | ~R$ 38/mês | Servidor persistente |
| Neon Launch (se necessário) | ~R$ 105/mês | Mais armazenamento e conexões simultâneas |
| VPS para Baileys headless (Opção B) | ~R$ 28–55/mês | Independência do computador do cliente |
| **Total fixo estimado** | **~R$ 66–198/mês** | Depende do número de clientes e volume |

> Taxas convertidas na cotação ~R$ 5,50/USD. Atualizar conforme câmbio.

#### Fase 3 — SAC em Escala (Render Standard + crescimento)

| Serviço | Custo |
|---|---|
| Render Standard | ~R$ 138/mês ($25) |
| Neon Launch | ~R$ 105/mês ($19) |
| VPS Baileys headless | ~R$ 28–55/mês |
| **Total fixo estimado** | **~R$ 270–300/mês** |

---

### 2.8 Mudanças Necessárias no render.yaml

O arquivo `render.yaml` atual não precisa de grandes mudanças para o MVP, mas deve ser atualizado para remover o plano free:

```yaml
# render.yaml — mudanças para SAC
services:
  - type: web
    name: clica-ai-api
    runtime: node
    plan: starter        # ← MUDAR de free para starter ($7/mês)
    region: oregon
    rootDir: backend
    buildCommand: npm install
    startCommand: node src/app.js
    healthCheckPath: /health
    # Adicionar variável de ambiente para socket.io
    envVars:
      - key: SOCKET_IO_ENABLED
        value: "true"
```

---

### 2.9 Sequência de Migração de Infra Recomendada

**Antes de começar o desenvolvimento do SAC:**
1. Migrar Render de Free → Starter ($7/mês) — elimina o problema de sleep
2. Configurar domínio customizado no Render (se ainda não feito)

**Durante a Fase 1 (desenvolvimento):**
3. Adicionar `socket.io` ao backend (sem custo)
4. Monitorar crescimento do banco Neon (painel gratuito do Neon mostra uso)

**Ao lançar para primeiros clientes SAC:**
5. Se banco ultrapassar 400 MB → migrar Neon para plano Launch ($19/mês)
6. Avaliar necessidade de VPS para Baileys headless com base no feedback dos clientes

**Escala futura:**
7. Render Standard ($25/mês) se RAM do Starter (512 MB) ficar acima de 80% de uso
8. WhatsApp Business Cloud API — avaliar custo-benefício vs. Baileys

---

## 3. Arquitetura Proposta

### 3.1 Fluxo de mensagem (hoje vs. futuro)

**Hoje:**
```
WhatsApp → Electron/Baileys → WebSocket → Backend → IncomingMessage (salva) → Inbox (lista, leitura)
```

**Futuro:**
```
WhatsApp → Electron/Baileys → WebSocket → Backend → Conversation (cria/atualiza)
                                                    ↓
                                            Socket.io → Agentes web (push em tempo real)
                                                    ↓
                                         Agente responde no painel
                                                    ↓
                                      Backend → Electron → WhatsApp
```

### 3.2 Novos componentes necessários

```
backend/
├── models/
│   ├── Conversation.js        (NOVO — thread de atendimento)
│   ├── ConversationMessage.js (NOVO — mensagem individual na thread)
│   └── TeamMember.js          (NOVO — agente vinculado a um usuário/empresa)
├── routes/
│   └── inbox.js               (NOVO — API de atendimento)
├── services/
│   └── conversationService.js (NOVO — lógica de criação/atualização de threads)
└── socket/
    └── inboxSocket.js         (NOVO — push de eventos para agentes)

frontend/
└── app/
    └── atendimento/           (NOVA — página de SAC)
        ├── page.tsx           (layout split: lista + chat)
        ├── ConversationList.tsx
        ├── ChatWindow.tsx
        └── ReplyBox.tsx
```

---

## 4. Modelo de Dados

### 4.1 Tabela `Conversation`

```sql
CREATE TABLE conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),         -- empresa dona
  account_id    UUID NOT NULL REFERENCES whatsapp_accounts(id), -- número WA
  contact_phone VARCHAR(30) NOT NULL,
  contact_name  VARCHAR(255),
  status        VARCHAR(20) NOT NULL DEFAULT 'open',
  -- 'open' | 'in_progress' | 'waiting' | 'resolved' | 'bot'
  assigned_to   UUID REFERENCES users(id),                  -- agente responsável (futuro: TeamMember)
  unread_count  INT NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  last_message_preview VARCHAR(500),
  tags          JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  -- SLA
  first_response_at TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,

  UNIQUE(account_id, contact_phone)                         -- 1 thread por número por conta
);

CREATE INDEX idx_conversations_user_status   ON conversations(user_id, status);
CREATE INDEX idx_conversations_account       ON conversations(account_id);
CREATE INDEX idx_conversations_last_message  ON conversations(last_message_at DESC);
```

### 4.2 Tabela `ConversationMessage`

```sql
CREATE TABLE conversation_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction       VARCHAR(10) NOT NULL,    -- 'inbound' | 'outbound'
  sender_type     VARCHAR(10) NOT NULL,    -- 'contact' | 'agent' | 'bot'
  sender_id       UUID,                   -- user_id se agente, NULL se contato/bot
  content         TEXT,
  media_url       VARCHAR(1000),
  media_type      VARCHAR(50),
  wa_message_id   VARCHAR(255),           -- ID da mensagem no WhatsApp
  status          VARCHAR(20) DEFAULT 'sent',
  -- 'sent' | 'delivered' | 'read' | 'failed'
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conv_messages_conversation ON conversation_messages(conversation_id, created_at);
```

### 4.3 Tabela `TeamMember` (Fase 2)

```sql
CREATE TABLE team_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES users(id),  -- empresa/dono
  email      VARCHAR(255) NOT NULL UNIQUE,
  name       VARCHAR(255) NOT NULL,
  role       VARCHAR(20) NOT NULL DEFAULT 'agent',
  -- 'agent' | 'supervisor' | 'admin'
  password_hash VARCHAR(255) NOT NULL,
  status     VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.4 Tabela `QuickReply` (Fase 2)

```sql
CREATE TABLE quick_replies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  title      VARCHAR(100) NOT NULL,        -- ex: "Saudação inicial"
  content    TEXT NOT NULL,               -- ex: "Olá! Como posso ajudar?"
  shortcut   VARCHAR(50),                 -- ex: "/oi"
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. API — Rotas de Atendimento

### 5.1 Conversas

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/inbox/conversations` | Lista conversas com filtros (status, conta, agente, não lidas) |
| `GET` | `/api/inbox/conversations/:id` | Detalhes da conversa + mensagens paginadas |
| `PATCH` | `/api/inbox/conversations/:id` | Atualizar status, atribuir agente, adicionar tag |
| `POST` | `/api/inbox/conversations/:id/messages` | Agente envia resposta |
| `POST` | `/api/inbox/conversations/:id/resolve` | Marcar como resolvida |
| `POST` | `/api/inbox/conversations/:id/reopen` | Reabrir conversa resolvida |
| `GET` | `/api/inbox/conversations/:id/contact-history` | Histórico completo do contato (campanhas, tickets) |

### 5.2 Respostas rápidas (Fase 2)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/inbox/quick-replies` | Listar respostas rápidas da empresa |
| `POST` | `/api/inbox/quick-replies` | Criar resposta rápida |
| `DELETE` | `/api/inbox/quick-replies/:id` | Remover |

### 5.3 Métricas (Fase 3)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/inbox/stats` | Total abertos, tempo médio de resposta, resolvidos hoje |
| `GET` | `/api/inbox/stats/agents` | Performance por agente |

---

## 6. WebSocket — Eventos em Tempo Real

Adicionar `socket.io` ao servidor Express (`backend/server.js`):

### 6.1 Eventos do servidor para o cliente (Backend → Frontend)

| Evento | Payload | Quando |
|---|---|---|
| `conversation:new` | `{ conversation }` | Nova conversa criada (primeiro contato) |
| `conversation:updated` | `{ conversationId, changes }` | Status/agente alterado |
| `message:new` | `{ conversationId, message }` | Nova mensagem recebida ou enviada |
| `conversation:unread` | `{ conversationId, count }` | Contagem de não lidas atualizada |

### 6.2 Eventos do cliente para o servidor (Frontend → Backend)

| Evento | Payload | Quando |
|---|---|---|
| `inbox:join` | `{ userId }` | Agente entra no painel |
| `inbox:typing` | `{ conversationId }` | Agente está digitando (opcional) |

### 6.3 Implementação simplificada

```js
// backend/socket/inboxSocket.js
const { Server } = require('socket.io');

function initInboxSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL }
  });

  io.use(authenticateSocket);  // validar JWT

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    socket.join(`user:${userId}`);  // sala isolada por empresa

    socket.on('inbox:join', () => {
      socket.join(`inbox:${userId}`);
    });
  });

  return io;
}

// Para emitir de qualquer lugar no backend:
// io.to(`inbox:${userId}`).emit('message:new', { ... })
```

---

## 7. Interface — Página de Atendimento

### 7.1 Layout da página `/atendimento`

```
┌──────────────────────────────────────────────────────────────┐
│  [Filtros: Todas | Abertas | Aguardando | Resolvidas]  [🔍]  │
├────────────────────┬─────────────────────────────────────────┤
│ LISTA DE CONVERSAS │         JANELA DE CHAT                  │
│                    │                                         │
│ ● João Silva       │  João Silva • +55 11 99999-0000         │
│   Qual o prazo...  │  Conta: Vendas • Status: Em atendimento │
│   há 2 min         │─────────────────────────────────────────│
│                    │                                         │
│ ● Maria Oliveira   │  [contato] Qual o prazo de entrega?     │
│   Quero cancelar.. │                          14:32          │
│   há 15 min  🔴 3  │                                         │
│                    │  [agente] Olá João! O prazo é de 3 dias │
│   Pedro Costa      │  úteis.               14:35  ✓✓         │
│   Obrigado!        │                                         │
│   há 1h   ✓        │  [contato] Perfeito, obrigado!          │
│                    │                          14:36          │
│                    │─────────────────────────────────────────│
│                    │  📎  [ Digite sua resposta...    ] [→]  │
│                    │  ⚡ Respostas rápidas  👤 Atribuir       │
└────────────────────┴─────────────────────────────────────────┘
```

### 7.2 Componentes principais

**`ConversationList.tsx`**
- Lista paginada (infinite scroll)
- Badge vermelho com contagem de não lidas
- Preview da última mensagem + timestamp relativo
- Indicador de status (cor: verde=aberta, amarelo=aguardando, cinza=resolvida)
- Filtros e busca por nome/telefone

**`ChatWindow.tsx`**
- Histórico de mensagens com scroll para baixo automático
- Balões diferenciados: contato (esquerda), agente (direita, azul), bot (direita, roxo)
- Status de entrega (✓ enviado, ✓✓ entregue, ✓✓ lido em azul)
- Header com info do contato, botão de resolução, seletor de agente

**`ReplyBox.tsx`**
- Textarea com atalho `Ctrl+Enter` para enviar
- Botão de anexar mídia (reutiliza upload S3 existente)
- Painel de respostas rápidas (filtra por shortcut `/`)
- Indicador "agente está digitando" (Fase 2)

---

## 8. Integração com Funcionalidades Existentes

### 8.1 Bot → Handoff para humano

Hoje quando o bot detecta escalação, ele apenas muda `BotConversation.status = 'escalated'`. A integração proposta:

```js
// backend/services/botService.js — ajuste na função de escalação
async function escalateToHuman(botConversation) {
  await botConversation.update({ status: 'escalated' });

  // NOVO: criar ou abrir conversa no SAC
  const conversation = await conversationService.findOrCreate({
    account_id: botConversation.account_id,
    contact_phone: botConversation.contact_phone,
    contact_name: botConversation.contact_name,
  });

  await conversation.update({
    status: 'open',
    tags: [...(conversation.tags || []), 'escalado-do-bot']
  });

  // Emitir para agentes via socket
  io.to(`inbox:${conversation.user_id}`).emit('conversation:new', { conversation });
}
```

### 8.2 IncomingMessage → Conversation

Toda mensagem recebida que chega em `whatsappController.handleIncomingMessage()` passa a criar/atualizar uma `Conversation` **além de** continuar salvando em `IncomingMessage` (para não quebrar a inbox atual durante a transição).

```js
// Adaptar handleIncomingMessage para:
// 1. Salvar IncomingMessage (comportamento atual — mantido)
// 2. NOVO: upsert Conversation
// 3. NOVO: inserir ConversationMessage
// 4. NOVO: emitir socket
```

### 8.3 Contato existente

Ao abrir uma conversa, o painel exibe o contato vinculado (pelo telefone) com:
- Tags do contato
- Histórico de campanhas que ele recebeu
- Data do primeiro contato
- Observações do cadastro

---

## 9. Plano de Implementação por Fases

### Fase 1 — MVP de Atendimento (Semanas 1–4)

**Semana 1 — Banco de dados e backend base**
- [ ] Criar migration para tabelas `conversations` e `conversation_messages`
- [ ] Criar models Sequelize para ambas
- [ ] Criar `conversationService.js` com `findOrCreate`, `addMessage`, `updateStatus`
- [ ] Adaptar `handleIncomingMessage` para popular a nova tabela
- [ ] Criar rotas GET `/api/inbox/conversations` e `/api/inbox/conversations/:id`

**Semana 2 — WebSocket e resposta de agente**
- [ ] Instalar e configurar `socket.io` no servidor Express
- [ ] Implementar `inboxSocket.js` com autenticação JWT via socket
- [ ] Emitir eventos `message:new` e `conversation:new` quando mensagem chega
- [ ] Criar rota POST `/api/inbox/conversations/:id/messages` (agente responde)
- [ ] Integrar rota de resposta com o serviço de envio existente (Electron/Baileys)

**Semana 3 — Interface frontend**
- [ ] Criar página `/atendimento` com layout split (lista + chat)
- [ ] Implementar `ConversationList` com react-query + socket.io-client
- [ ] Implementar `ChatWindow` com histórico de mensagens
- [ ] Implementar `ReplyBox` com envio de texto
- [ ] Adicionar link "Atendimento" na sidebar de navegação

**Semana 4 — Ajustes e handoff do bot**
- [ ] Integrar handoff bot → atendimento humano
- [ ] Rota PATCH para atualizar status da conversa (resolver, aguardando)
- [ ] Badge de não lidas na sidebar
- [ ] Atualizar `IncomingMessage` para criar conversa em paralelo (coexistência)
- [ ] Testes manuais ponta a ponta

### Fase 2 — SAC Completo (Semanas 5–7)

**Semana 5 — Agentes e atribuição**
- [ ] Criar tabela `team_members` e sistema de convite por e-mail
- [ ] Adicionar autenticação de agente (login próprio, vinculado ao `owner_id`)
- [ ] Atribuição de conversa a agente específico
- [ ] Filtro "minhas conversas" na inbox

**Semana 6 — Respostas rápidas e tags**
- [ ] Criar tabela `quick_replies` e CRUD
- [ ] Implementar painel de respostas rápidas com busca por shortcut
- [ ] Sistema de tags em conversas (criar, aplicar, filtrar)
- [ ] Pesquisa global na inbox (nome, telefone, conteúdo)

**Semana 7 — SLA e notificações**
- [ ] Cálculo de `first_response_at` e tempo médio de resposta
- [ ] Alerta visual para conversas sem resposta há mais de X minutos (configurável)
- [ ] Notificação push (browser Notification API) para nova conversa
- [ ] Histórico unificado do contato

### Fase 3 — Relatórios e Avançado (Semanas 8–10)

- [ ] Dashboard de SAC: conversas abertas, tempo médio, resolvidas/dia, volume por conta
- [ ] Performance por agente: conversas atendidas, tempo médio, CSAT
- [ ] CSAT — envio automático de pesquisa de satisfação após resolução
- [ ] Exportação de conversas (CSV/PDF)
- [ ] Webhooks de eventos SAC (para integrações externas)
- [ ] API pública para abertura de tickets (Fase 3+)

---

## 10. Considerações sobre Planos e Monetização

O módulo de atendimento pode ser um diferencial de plano:

| Plano | Atendimento |
|---|---|
| Starter | Sem atendimento (só disparo) |
| Pro | Inbox básico (1 agente = o próprio dono) |
| Business (novo) | SAC completo: múltiplos agentes, SLA, relatórios |

Implementar via `planGuard` já existente — adicionar verificação na rota `/api/inbox/*`.

---

## 11. Dependências a Adicionar

```json
// backend/package.json
"socket.io": "^4.7.5"

// frontend/package.json
"socket.io-client": "^4.7.5"
```

Nenhuma outra dependência crítica necessária — a base existente cobre o restante.

---

## 12. Referências de Produtos Similares

Para orientar UX e funcionalidades:

- **Chatwoot** (open source) — referência principal de inbox omnichannel
- **Trengo** — foco em WhatsApp Business
- **Zendesk** — referência de SLA e relatórios
- **JivoChat** — simplicidade de interface

---

*Documento criado em Junho 2026. Revisar prioridades antes do início de cada fase.*
