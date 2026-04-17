# PRD - Sistema de Envio de Mensagens via WhatsApp

## 1. Visão Geral

O sistema tem como objetivo permitir o envio de mensagens via WhatsApp de forma simples, organizada e escalável, com foco em uso comercial (prospecção, relacionamento e suporte).

O sistema deve permitir:
- Envio individual de mensagens
- Envio em massa (com controle)
- Gerenciamento de contatos
- Histórico de envios
- Possível integração futura com CRM

---

## 2. Objetivos

- Criar um sistema simples e funcional para envio de mensagens
- Evitar bloqueios do WhatsApp
- Permitir personalização de mensagens
- Ter controle sobre contatos e envios realizados

---

## 3. Escopo

### 3.1 Funcionalidades principais

#### 1. Autenticação
- Login com email e senha
- Recuperação de senha

#### 2. Gestão de Contatos
- Cadastro manual
- Importação via CSV
- Campos:
  - Nome
  - Telefone
  - Observações

#### 3. Envio de Mensagens
- Envio individual
- Envio em massa
- Personalização com variáveis:
  - Ex: "Olá {{nome}}"

#### 4. Integração com WhatsApp
Opções:
- API Oficial (WhatsApp Business API / Meta)
- API não oficial (ex: baileys, venom, etc)

⚠️ Importante:
- Priorizar API oficial para evitar bloqueios vai ser uma parte que veremos depois, por enquanto vamos usar uma api nao oficial  (pode até ser uma api de terceiros que você tenha conhecimento) Veja a melhor forma para termos sempre o menor custo e de facil implementação , depois quando estiver tudo ok a gente faz a migração para oficial


#### 5. Controle de Envio
- Delay entre mensagens
- Limite de envios por minuto
- Fila de envio

#### 6. Histórico
- Registro de mensagens enviadas
- Status:
  - Enviado
  - Entregue
  - Falhou

#### 7. Dashboard
- Quantidade de mensagens enviadas
- Taxa de sucesso
- Logs

---

## 4. Requisitos Não Funcionais

- Segurança básica de dados
- Performance para envio em lote
- Interface simples (web)
- Sistema escalável

---

## 5. Tecnologias Sugeridas

### Backend
- Node.js
- Express

### Integração WhatsApp
- API oficial da Meta (recomendado)
- Alternativa: Baileys

### Frontend
- React ou Next.js

### Banco de Dados
- PostgreSQL ou MongoDB

---

## 6. Riscos

- Bloqueio do número pelo WhatsApp
- Uso de API não oficial
- Envio massivo sem controle

---

## 7. Regras de Negócio

- Não enviar spam
- Respeitar opt-in do usuário
- Limitar envios por minuto
- Permitir descadastro (opt-out)

---

## 8. Roadmap (MVP)

### Fase 1 (MVP)
- Login
- Cadastro de contatos
- Envio manual de mensagens

### Fase 2
- Envio em massa
- Personalização
- Histórico

### Fase 3
- Dashboard
- Integrações externas

---

## 9. Futuro (Melhorias)

- Chatbot automático
- Integração com CRM
- Respostas automáticas
- Templates aprovados (API oficial)

---

## 10. Métricas de Sucesso

- Taxa de entrega
- Taxa de resposta
- Tempo de envio
- Número de mensagens enviadas