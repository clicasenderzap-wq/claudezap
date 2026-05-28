'use client';

import { useState, useEffect } from 'react';
import { Download, Smartphone, ShieldAlert, CheckCircle2, X, MonitorDown, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const STORAGE_KEY_PREFIX = 'wa_onboarding_v1_';

export default function WhatsAppOnboardingModal() {
  const { user } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const [hostname, setHostname] = useState('');

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  useEffect(() => {
    if (!user?.id || !hostname) return;

    // Only show on WhatsApp context (not email subdomain)
    const isEmailSubdomain = hostname.startsWith('email.');
    if (isEmailSubdomain) return;

    const key = `${STORAGE_KEY_PREFIX}${user.id}`;
    const dismissed = localStorage.getItem(key);
    if (!dismissed) setVisible(true);
  }, [user?.id, hostname]);

  function handleClose() {
    if (dontShow && user?.id) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${user.id}`, '1');
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-xl shrink-0">
              <Smartphone size={22} className="text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg leading-tight">App obrigatório para envio de mensagens</h2>
              <p className="text-xs text-gray-400 mt-0.5">Leia com atenção antes de começar</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-300 hover:text-gray-500 shrink-0 mt-0.5">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 text-sm text-gray-700">

          {/* Por que o app é necessário */}
          <div className="flex gap-3">
            <div className="p-2 bg-blue-50 rounded-lg shrink-0 h-fit">
              <MonitorDown size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">Por que o app Clica Aí é obrigatório?</p>
              <p className="text-gray-500 leading-relaxed">
                O envio de mensagens pelo WhatsApp funciona através do <strong>app Clica Aí para Windows</strong>.
                Ele precisa estar instalado e aberto no seu computador para que os disparos aconteçam —
                sem o app em execução, nenhuma mensagem é enviada.
              </p>
            </div>
          </div>

          {/* Como configurar */}
          <div className="flex gap-3">
            <div className="p-2 bg-green-50 rounded-lg shrink-0 h-fit">
              <CheckCircle2 size={18} className="text-green-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-2">Como configurar em 3 passos</p>
              <ol className="space-y-2 text-gray-500">
                <li className="flex gap-2">
                  <span className="font-bold text-green-600 shrink-0">1.</span>
                  Baixe e instale o app clicando no botão abaixo
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-green-600 shrink-0">2.</span>
                  Abra o app e faça login com o mesmo email e senha deste sistema
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-green-600 shrink-0">3.</span>
                  Mantenha o app aberto (pode ficar minimizado) enquanto realiza envios
                </li>
              </ol>
              <a
                href="https://github.com/clicasenderzap-wq/claudezap/releases/latest/download/ClicaAi-Setup.exe"
                className="mt-3 inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <Download size={14} /> Baixar app Clica Aí (.exe)
              </a>
            </div>
          </div>

          {/* Responsabilidade */}
          <div className="flex gap-3">
            <div className="p-2 bg-amber-50 rounded-lg shrink-0 h-fit">
              <ShieldAlert size={18} className="text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">Uso responsável — leia com atenção</p>
              <ul className="space-y-1.5 text-gray-500">
                <li className="flex gap-2">
                  <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                  Envie mensagens <strong>apenas para contatos que autorizaram</strong> receber suas mensagens
                </li>
                <li className="flex gap-2">
                  <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                  <strong>Spam e disparos em massa para listas compradas são proibidos</strong> e podem banir seu número permanentemente do WhatsApp
                </li>
                <li className="flex gap-2">
                  <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                  Use intervalos entre mensagens para evitar bloqueios automáticos pelo WhatsApp
                </li>
                <li className="flex gap-2">
                  <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                  O usuário é o único responsável pelo conteúdo e pelo uso da plataforma
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-500 hover:text-gray-700">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              className="w-4 h-4 rounded accent-green-600 cursor-pointer"
            />
            Não mostrar novamente
          </label>
          <button
            onClick={handleClose}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-6 py-2 rounded-xl transition-colors"
          >
            Entendi
          </button>
        </div>

      </div>
    </div>
  );
}
