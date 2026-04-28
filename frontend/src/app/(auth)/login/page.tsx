'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { MailWarning, Send } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resentOk, setResentOk] = useState(false);

  useEffect(() => {
    const notice = sessionStorage.getItem('auth_notice');
    if (notice) {
      sessionStorage.removeItem('auth_notice');
      toast.error(notice, { duration: 6000 });
    }
  }, []);

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    try {
      const res = await api.post('/auth/login', data);
      setAuth(res.data.token, res.data.user);
      toast.success(`Bem-vindo, ${res.data.user.name}!`);
      router.push('/dashboard');
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === 'EMAIL_UNVERIFIED') {
        setUnverifiedEmail(data.email);
      } else {
        toast.error(err.response?.data?.error || 'Erro ao entrar');
      }
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      const email = unverifiedEmail || getValues('email');
      await api.post('/auth/resend-verification', { email });
      setResentOk(true);
      toast.success('Email reenviado! Verifique sua caixa de entrada.');
    } catch {
      toast.error('Erro ao reenviar. Tente novamente.');
    } finally {
      setResending(false);
    }
  }

  if (unverifiedEmail) {
    return (
      <div className="card w-full max-w-sm p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 bg-orange-100 rounded-full">
            <MailWarning size={36} className="text-orange-500" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Confirme seu email</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          Sua conta ainda não foi verificada. Enviamos um link para <strong>{unverifiedEmail}</strong>.
        </p>
        {resentOk ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
            Link reenviado! Verifique sua caixa de entrada e o spam.
          </div>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Send size={15} />
            {resending ? 'Reenviando…' : 'Reenviar email de verificação'}
          </button>
        )}
        <button
          onClick={() => { setUnverifiedEmail(''); setResentOk(false); }}
          className="text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Voltar ao login
        </button>
      </div>
    );
  }

  return (
    <div className="card w-full max-w-sm p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-brand-600">Clica Aí</h1>
        <p className="text-gray-500 text-sm mt-1">Entre na sua conta</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input {...register('email')} type="email" placeholder="seu@email.com" className="input" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="label">Senha</label>
          <input {...register('password')} type="password" placeholder="••••••••" className="input" />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2">
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Não tem conta?{' '}
        <Link href="/register" className="text-brand-600 font-medium hover:underline">
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}
