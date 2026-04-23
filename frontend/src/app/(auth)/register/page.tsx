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
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const [done, setDone] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { accepted_terms: false },
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
      <div className="card w-full max-w-sm p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 bg-green-100 rounded-full">
            <CheckCircle2 size={36} className="text-green-600" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Verifique seu email!</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          Enviamos um link de confirmação para <strong>{submittedEmail}</strong>.
          Clique no link para ativar sua conta.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left text-xs text-green-800 leading-relaxed">
          Após confirmar o email, você já poderá fazer login e usar a plataforma com <strong>7 dias grátis</strong>.
        </div>
        <p className="text-sm text-gray-500">
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

        <label className="flex items-start gap-2.5 cursor-pointer pt-1">
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
        {errors.accepted_terms && <p className="text-red-500 text-xs -mt-2">{errors.accepted_terms.message}</p>}

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
