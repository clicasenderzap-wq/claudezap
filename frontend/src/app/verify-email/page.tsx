'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Token de verificação ausente.'); return; }
    api.get(`/auth/verify-email?token=${token}`)
      .then((r) => { setMessage(r.data.message); setStatus('success'); })
      .catch((e) => { setMessage(e.response?.data?.error || 'Link inválido ou expirado.'); setStatus('error'); });
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm w-full text-center space-y-4">
        <div className="text-xl font-black text-gray-900">Clica <span className="text-green-600">Aí</span></div>

        {status === 'loading' && (
          <>
            <Loader2 size={40} className="animate-spin text-brand-600 mx-auto" />
            <p className="text-gray-600">Verificando seu email…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center">
              <div className="p-4 bg-green-100 rounded-full">
                <CheckCircle2 size={36} className="text-green-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Email confirmado!</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
            <Link href="/login" className="block btn-primary text-center mt-2">
              Ir para o login
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center">
              <div className="p-4 bg-red-100 rounded-full">
                <XCircle size={36} className="text-red-500" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Link inválido</h2>
            <p className="text-gray-600 text-sm">{message}</p>
            <Link href="/register" className="block btn-secondary text-center mt-2">
              Fazer novo cadastro
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
