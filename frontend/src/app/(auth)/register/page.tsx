'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CheckCircle2, Smartphone } from 'lucide-react';
import api from '@/lib/api';

const schema = z.object({
  name: z.string().min(4, 'Informe nome e sobrenome').refine(
    (v) => v.trim().split(/\s+/).length >= 2,
    'Informe nome e sobrenome completo'
  ),
  email: z.string().email('Email inválido'),
  whatsapp: z.string().min(10, 'WhatsApp obrigatório'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  accepted_terms: z.boolean().refine((v) => v === true, 'Aceite os Termos de Uso para continuar'),
  accepted_consent: z.boolean().refine((v) => v === true, 'Confirme que possui consentimento dos seus contatos'),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const [done, setDone] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { accepted_terms: false, accepted_consent: false },
  });

  async function onSubmit(data: FormData) {
    try {
      await api.post('/auth/register', {
        ...data,
        accepted_terms: String(data.accepted_terms),
      });
      setSubmittedEmail(data.email);
      setDone(true);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Erro ao cadastrar';
      toast.error(msg);
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-lg space-y-4">

        {/* Step 1 — Verificar email */}
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full shrink-0">
              <CheckCircle2 size={28} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Passo 1 — Confirme seu email</h2>
              <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                Enviamos um link de confirmação para <strong>{submittedEmail}</strong>.
                Clique no link para ativar sua conta e ganhar <strong>7 dias grátis</strong>.
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 pl-1">Não encontrou? Verifique a pasta de spam.</p>
        </div>

        {/* Step 2 — Instalar o app */}
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-100 rounded-full shrink-0">
              <Smartphone size={28} className="text-brand-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Passo 2 — Instale o Clica Aí</h2>
              <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                O Clica Aí é um aplicativo instalado no seu computador que mantém seus números WhatsApp
                conectados e prontos para enviar mensagens a qualquer momento — funcionando em segundo
                plano de forma silenciosa, sem precisar deixar o navegador aberto.
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3 pt-1">
            {[
              { n: 1, title: 'Baixe o instalador', desc: 'Clique no botão abaixo para baixar o arquivo de instalação (.exe para Windows).' },
              { n: 2, title: 'Execute e instale', desc: 'Abra o arquivo baixado e siga as instruções da instalação. Leva menos de 1 minuto.' },
              { n: 3, title: 'Faça login no app', desc: 'Abra o Clica Aí no computador e entre com seu email e senha.' },
              { n: 4, title: 'Conecte seu WhatsApp', desc: 'Acesse a plataforma web → WhatsApp → Adicionar número → escaneie o QR Code pelo celular.' },
            ].map((s) => (
              <div key={s.n} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-brand-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {s.n}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-800">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <a
            href="https://github.com/clicasenderzap-wq/claudezap/releases/latest/download/ClicaAi-Setup.exe"
            className="btn-primary w-full flex items-center justify-center gap-2 no-underline"
            download
          >
            <Smartphone size={16} />
            Baixar Clica Aí para Windows
          </a>

          <p className="text-xs text-gray-400 text-center">
            Windows 10 ou superior · gratuito · atualização automática
          </p>
        </div>

        <p className="text-center text-sm text-gray-500">
          Já tem conta?{' '}
          <Link href="/login" className="text-brand-600 font-medium hover:underline">Entrar</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="card w-full max-w-sm p-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-brand-600">Clica Aí</h1>
        <p className="text-gray-500 text-sm mt-1">Crie sua conta gratuitamente</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Nome completo *</label>
          <input {...register('name')} placeholder="João da Silva" className="input" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="label">Email *</label>
          <input {...register('email')} type="email" placeholder="seu@email.com" className="input" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="label flex items-center gap-1.5"><Smartphone size={13} /> WhatsApp *</label>
          <input {...register('whatsapp')} placeholder="(11) 99999-9999" className="input" />
          <p className="text-xs text-gray-400 mt-1">Usado para verificar sua identidade</p>
          {errors.whatsapp && <p className="text-red-500 text-xs mt-1">{errors.whatsapp.message}</p>}
        </div>

        <div>
          <label className="label">Senha *</label>
          <input {...register('password')} type="password" placeholder="Mínimo 8 caracteres" className="input" />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              {...register('accepted_terms')}
              className="mt-0.5 w-4 h-4 accent-brand-600 shrink-0"
            />
            <span className="text-xs text-gray-600 leading-relaxed">
              Li e aceito os{' '}
              <Link href="/termos" target="_blank" className="text-brand-600 font-medium hover:underline">Termos de Uso</Link>
              {' '}e a{' '}
              <Link href="/privacidade" target="_blank" className="text-brand-600 font-medium hover:underline">Política de Privacidade</Link>
            </span>
          </label>
          {errors.accepted_terms && <p className="text-red-500 text-xs">{errors.accepted_terms.message}</p>}

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              {...register('accepted_consent')}
              className="mt-0.5 w-4 h-4 accent-brand-600 shrink-0"
            />
            <span className="text-xs text-gray-600 leading-relaxed">
              Declaro que utilizarei a plataforma <strong>apenas para contatos que autorizaram</strong> receber
              minhas mensagens, conforme exigido pela LGPD e pelo Código de Defesa do Consumidor.
            </span>
          </label>
          {errors.accepted_consent && <p className="text-red-500 text-xs">{errors.accepted_consent.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2">
          {isSubmitting ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Já tem conta?{' '}
        <Link href="/login" className="text-brand-600 font-medium hover:underline">Entrar</Link>
      </p>
    </div>
  );
}
