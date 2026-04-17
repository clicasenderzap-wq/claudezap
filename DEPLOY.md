# Guia de Deploy — ClaudeZap

Stack gratuita: **Vercel** (frontend) + **Render** (backend) + **Neon** (PostgreSQL) + **Upstash** (Redis)

---

## 1. Banco de dados — Neon (PostgreSQL gratuito)

1. Acesse [neon.tech](https://neon.tech) e crie uma conta
2. Crie um novo projeto chamado `claudezap`
3. Na aba **Connection Details**, copie a **Connection String** (começa com `postgresql://...`)
4. Guarde essa string — ela será a `DATABASE_URL`

---

## 2. Redis — Upstash (gratuito)

1. Acesse [upstash.com](https://upstash.com) e crie uma conta
2. Crie um novo banco Redis na região **South America (São Paulo)** se disponível, senão **US-East**
3. Na aba do banco, clique em **Connect** → copie a **Redis URL** (começa com `rediss://...`)
4. Guarde essa string — ela será a `REDIS_URL`

---

## 3. Backend — Render

1. Acesse [render.com](https://render.com) e conecte com sua conta GitHub
2. Clique em **New → Web Service**
3. Selecione o repositório `claudezap`
4. Render vai detectar o `render.yaml` automaticamente e preencher as configurações
5. Antes de fazer deploy, clique em **Environment** e adicione as variáveis:

   | Variável | Valor |
   |----------|-------|
   | `DATABASE_URL` | connection string do Neon |
   | `REDIS_URL` | Redis URL do Upstash |
   | `CORS_ORIGIN` | URL do frontend Vercel (preencher depois) |

6. Clique em **Create Web Service**
7. Aguarde o build (3–5 min). A URL será algo como `https://claudezap-api.onrender.com`
8. Teste acessando `https://claudezap-api.onrender.com/health` — deve retornar `{"status":"ok"}`

---

## 4. Frontend — Vercel

1. Acesse [vercel.com](https://vercel.com) e conecte com sua conta GitHub
2. Clique em **Add New → Project**
3. Selecione o repositório `claudezap`
4. Vercel vai detectar o `vercel.json` com `rootDirectory: frontend`
5. Em **Environment Variables**, adicione:

   | Variável | Valor |
   |----------|-------|
   | `NEXT_PUBLIC_API_URL` | URL do backend Render + `/api` (ex: `https://claudezap-api.onrender.com/api`) |

6. Clique em **Deploy**
7. A URL será algo como `https://claudezap.vercel.app`

---

## 5. Atualizar CORS no Render

Após obter a URL do Vercel:
1. Volte no painel do Render → seu serviço → **Environment**
2. Atualize `CORS_ORIGIN` com a URL do Vercel (ex: `https://claudezap.vercel.app`)
3. O serviço irá reiniciar automaticamente

---

## 6. Domínio personalizado (clicaai.ai.br)

### Frontend — Vercel
1. No painel do Vercel → seu projeto → **Settings → Domains**
2. Adicione `clicaai.ai.br`
3. Vercel vai mostrar os registros DNS a configurar

### Backend — Render
1. No painel do Render → seu serviço → **Settings → Custom Domains**
2. Adicione `api.clicaai.ai.br`
3. Render vai mostrar o registro CNAME a configurar

### DNS — Hostinger
1. Acesse [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Vá em **Domínios → clicaai.ai.br → Gerenciar → DNS / Nameservers**
3. Adicione os registros que Vercel e Render indicarem:

   | Tipo | Nome | Valor |
   |------|------|-------|
   | `CNAME` | `@` ou `www` | `cname.vercel-dns.com` (Vercel indicará) |
   | `CNAME` | `api` | valor que o Render indicar |

4. Aguarde propagação: 5 min a 24h

---

## ⚠️ Limitações do plano gratuito

| Serviço | Limitação |
|---------|-----------|
| Render | Serviço dorme após 15 min sem requisições (1ª req demora ~30s) |
| Render | Filesystem efêmero — sessão WhatsApp é perdida ao reiniciar (reescanear QR) |
| Neon | 0.5 GB de armazenamento |
| Upstash | 10.000 comandos Redis por dia |
| Vercel | 100 GB de bandwidth/mês |

Para uso em produção real (sem limitações), o próximo passo é migrar o Render para um plano pago ($7/mês) com disco persistente para as sessões WhatsApp.
