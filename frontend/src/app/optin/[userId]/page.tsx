'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Smartphone, User, ShieldCheck, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export default function OptinPage() {
  const { userId } = useParams<{ userId: string }>();
  const [userName, setUserName] = useState('');
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [invalid, setInvalid] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/optin/${userId}`)
      .then((r) => setUserName(r.data.userName))
      .catch(() => setInvalid(true))
      .finally(() => setLoadingInfo(false));
  }, [userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) { setError('Você precisa concordar para continuar.'); return; }
    setError('');
    setSubmitting(true);
    try {
      await api.post(`/optin/${userId}`, { name, phone });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao registrar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-600" />
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm w-full text-center space-y-3">
          <p className="text-2xl">🔗</p>
          <h1 className="text-lg font-bold text-gray-900">Link inválido</h1>
          <p className="text-sm text-gray-500">Este link de cadastro não existe ou foi desativado.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm w-full text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-green-100 rounded-full">
              <CheckCircle2 size={36} className="text-green-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Tudo certo, {name.split(' ')[0]}!</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Você foi cadastrado com sucesso na lista de <strong>{userName}</strong> e poderá receber
            mensagens via WhatsApp.
          </p>
          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 text-left">
            Para cancelar o recebimento de mensagens a qualquer momento, responda{' '}
            <strong>SAIR</strong> em qualquer mensagem recebida.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-brand-100 rounded-2xl">
              <Smartphone size={28} className="text-brand-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Receba mensagens de</h1>
          <p className="text-brand-600 font-semibold text-lg">{userName}</p>
          <p className="text-sm text-gray-500">
            Preencha seus dados abaixo para se cadastrar na lista e receber novidades via WhatsApp.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <User size={13} /> Seu nome completo *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="João da Silva"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Smartphone size={13} /> Seu WhatsApp *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">Informe DDD + número. Ex: 11999999999</p>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer bg-green-50 border border-green-200 rounded-xl p-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-green-600 shrink-0"
            />
            <span className="text-xs text-gray-700 leading-relaxed">
              <ShieldCheck size={12} className="inline mr-1 text-green-600" />
              Autorizo receber mensagens de <strong>{userName}</strong> via WhatsApp e entendo que
              posso cancelar a qualquer momento respondendo <strong>SAIR</strong>.
            </span>
          </label>

          {error && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !agreed || !name || !phone}
            className="w-full py-3 bg-brand-600 text-white font-semibold rounded-xl text-sm hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Cadastrando...</> : 'Quero receber mensagens'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 leading-relaxed">
          Seus dados são protegidos pela <strong>LGPD</strong>.
          Nunca compartilharemos seu número com terceiros.
        </p>
      </div>
    </div>
  );
}
