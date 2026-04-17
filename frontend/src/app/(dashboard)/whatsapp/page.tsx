'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Smartphone, RefreshCw, LogOut, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import api from '@/lib/api';

export default function WhatsAppPage() {
  const qc = useQueryClient();
  const [loadingQR, setLoadingQR] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);

  const { data: statusData, refetch } = useQuery({
    queryKey: ['wa-status'],
    queryFn: () => api.get('/whatsapp/status').then((r) => r.data),
    refetchInterval: 5000,
  });

  const status = statusData?.status ?? 'disconnected';

  async function requestQR() {
    setLoadingQR(true);
    setQrData(null);
    try {
      const res = await api.get('/whatsapp/qr');
      if (res.data.status === 'connected') {
        toast.success('WhatsApp já está conectado!');
        refetch();
      } else if (res.data.qr) {
        setQrData(res.data.qr);
      } else {
        toast('Gerando QR code, tente novamente em instantes...', { icon: '⏳' });
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao obter QR code');
    } finally {
      setLoadingQR(false);
    }
  }

  const disconnectMutation = useMutation({
    mutationFn: () => api.delete('/whatsapp/session'),
    onSuccess: () => {
      setQrData(null);
      qc.invalidateQueries({ queryKey: ['wa-status'] });
      toast.success('Desconectado com sucesso');
    },
  });

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Conexão WhatsApp</h1>

      <div className="max-w-lg space-y-6">
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className={`p-3 rounded-xl ${isConnected ? 'bg-brand-600' : 'bg-gray-200'}`}>
              <Smartphone size={22} className={isConnected ? 'text-white' : 'text-gray-500'} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Status da conexão</p>
              <div className="flex items-center gap-2">
                {isConnected && <CheckCircle size={16} className="text-brand-600" />}
                {isConnecting && <Loader2 size={16} className="text-blue-500 animate-spin" />}
                {!isConnected && !isConnecting && <XCircle size={16} className="text-gray-400" />}
                <span className={`font-semibold ${isConnected ? 'text-brand-600' : isConnecting ? 'text-blue-500' : 'text-gray-500'}`}>
                  {isConnected ? 'Conectado' : isConnecting ? 'Conectando...' : 'Desconectado'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {!isConnected && (
              <button onClick={requestQR} disabled={loadingQR} className="btn-primary flex-1">
                {loadingQR ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                {loadingQR ? 'Aguardando QR...' : 'Conectar WhatsApp'}
              </button>
            )}
            {isConnected && (
              <button
                onClick={() => { if (confirm('Desconectar WhatsApp?')) disconnectMutation.mutate(); }}
                className="btn-danger flex-1"
              >
                <LogOut size={16} /> Desconectar
              </button>
            )}
          </div>
        </div>

        {qrData && !isConnected && (
          <div className="card p-6 text-center space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Escaneie o QR Code</h2>
            <div className="flex justify-center">
              <div className="border-4 border-brand-600 rounded-xl p-2 inline-block">
                <Image src={qrData} alt="QR Code WhatsApp" width={220} height={220} unoptimized />
              </div>
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              <p>1. Abra o WhatsApp no celular</p>
              <p>2. Vá em <strong>Dispositivos conectados</strong></p>
              <p>3. Escaneie o QR code acima</p>
            </div>
            <p className="text-xs text-gray-400">O QR code expira em alguns minutos</p>
          </div>
        )}

        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Boas práticas para evitar bloqueios</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2"><span className="text-brand-600 font-bold">·</span> Mantenha o delay entre mensagens acima de 3 segundos</li>
            <li className="flex gap-2"><span className="text-brand-600 font-bold">·</span> Limite a 20 mensagens por minuto</li>
            <li className="flex gap-2"><span className="text-brand-600 font-bold">·</span> Envie apenas para contatos que autorizaram receber</li>
            <li className="flex gap-2"><span className="text-brand-600 font-bold">·</span> Varie o conteúdo das mensagens nas campanhas</li>
            <li className="flex gap-2"><span className="text-brand-600 font-bold">·</span> Use um número exclusivo para disparos</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
