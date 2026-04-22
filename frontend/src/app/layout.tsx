import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Clica Aí — Automatize seu WhatsApp e venda mais',
  description: 'Plataforma de automação para WhatsApp: disparos em massa, aquecimento de números, bot de atendimento com IA e múltiplos números em um painel. Comece grátis por 7 dias.',
  openGraph: {
    title: 'Clica Aí — Automatize seu WhatsApp e venda mais',
    description: 'Disparos em massa, aquecimento de números e bot de IA. Tudo em uma plataforma.',
    url: 'https://clicaai.ia.br',
    siteName: 'Clica Aí',
    locale: 'pt_BR',
    type: 'website',
  },
  metadataBase: new URL('https://clicaai.ia.br'),
  alternates: { canonical: 'https://clicaai.ia.br' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
