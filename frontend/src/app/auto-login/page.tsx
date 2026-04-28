'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

function AutoLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const t = searchParams.get('t');
    if (!t) {
      router.replace('/login');
      return;
    }

    // Fetch user info with this token (validates it without creating a new session)
    localStorage.setItem('token', t);
    api.get('/auth/me', { headers: { Authorization: `Bearer ${t}` } })
      .then((res) => {
        setAuth(t, res.data.user);
        router.replace('/dashboard');
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('auth');
        router.replace('/login');
      });
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <Loader2 size={36} className="animate-spin text-green-600" />
      <p className="text-gray-500 text-sm">Entrando na sua conta…</p>
    </div>
  );
}

export default function AutoLoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm w-full text-center space-y-4">
        <div className="text-xl font-black text-gray-900">Clica <span className="text-green-600">Aí</span></div>
        <Suspense fallback={
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={36} className="animate-spin text-green-600" />
            <p className="text-gray-500 text-sm">Carregando…</p>
          </div>
        }>
          <AutoLoginContent />
        </Suspense>
      </div>
    </div>
  );
}
