import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidade — Clica Aí',
  description: 'Política de Privacidade da plataforma Clica Aí, em conformidade com a LGPD.',
};

export default function PrivacidadePage() {
  const updated = '22 de abril de 2026';
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-sm text-brand-600 hover:underline">← Voltar ao início</Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Política de Privacidade</h1>
          <p className="text-sm text-gray-500 mt-2">Última atualização: {updated} · Em conformidade com a LGPD (Lei 13.709/2018)</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8 text-gray-700 text-sm leading-relaxed">

          {/* 1 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">1. Quem Somos — Controlador de Dados</h2>
            <p>
              <strong>Clica Rede e Marketing</strong>, CNPJ 30.925.376/0001-78, é a Controladora dos dados pessoais
              coletados nesta Plataforma, responsável pelas decisões sobre o tratamento dos dados de acordo com a
              Lei Geral de Proteção de Dados (LGPD).
            </p>
            <p>
              Contato do Encarregado de Dados (DPO):{' '}
              <a href="https://wa.me/5535999153639" target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                WhatsApp (35) 99915-3639
              </a>
            </p>
          </section>

          {/* 2 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">2. Dados Coletados</h2>
            <p>Coletamos os seguintes dados pessoais:</p>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Dado</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Finalidade</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Base Legal (LGPD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['Nome completo', 'Identificação do Cliente', 'Art. 7º, V (execução de contrato)'],
                    ['E-mail', 'Autenticação, notificações e suporte', 'Art. 7º, V'],
                    ['Número de WhatsApp', 'Verificação de identidade e suporte', 'Art. 7º, V'],
                    ['Senha (hash bcrypt)', 'Autenticação segura', 'Art. 7º, V'],
                    ['Endereço IP', 'Segurança, prevenção a fraudes e LGPD', 'Art. 7º, II (consentimento) e IX (legítimo interesse)'],
                    ['Dados de uso da Plataforma', 'Melhoria do serviço e suporte', 'Art. 7º, IX (legítimo interesse)'],
                    ['Contatos importados pelo Cliente', 'Execução do serviço contratado', 'Art. 7º, V — sob responsabilidade do Cliente Controlador'],
                  ].map(([dado, finalidade, base]) => (
                    <tr key={dado}>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{dado}</td>
                      <td className="px-4 py-2.5 text-gray-600">{finalidade}</td>
                      <td className="px-4 py-2.5 text-gray-500">{base}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 3 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">3. Dados dos Contatos do Cliente</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800">
              <strong>Importante:</strong> Os contatos (nome, telefone, anotações) importados ou cadastrados pelo
              Cliente na Plataforma são de responsabilidade exclusiva do Cliente, que atua como{' '}
              <strong>Controlador</strong> desses dados. A Clica Aí os processa apenas conforme as instruções do
              Cliente, na qualidade de <strong>Operadora</strong>.
            </div>
            <p>
              O Cliente declara, ao utilizar a Plataforma, ter obtido o consentimento expresso dos titulares ou
              possuir outra base legal válida (Art. 7º, LGPD) para tratar os dados de seus contatos.
            </p>
          </section>

          {/* 4 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">4. Compartilhamento de Dados</h2>
            <p>Seus dados <strong>não são vendidos</strong> a terceiros. Compartilhamos dados apenas com:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Neon (banco de dados)</strong> — armazenamento seguro dos dados da Plataforma;</li>
              <li><strong>Render (hospedagem)</strong> — execução do backend da Plataforma;</li>
              <li><strong>Upstash (Redis)</strong> — fila de mensagens e cache;</li>
              <li><strong>Resend (e-mail transacional)</strong> — envio de e-mails de verificação e notificação;</li>
              <li><strong>Vercel (hospedagem frontend)</strong> — entrega da interface da Plataforma;</li>
              <li><strong>Autoridades competentes</strong> — quando exigido por lei ou decisão judicial.</li>
            </ul>
            <p>
              Todos os suboperadores acima são contratados com cláusulas de proteção de dados compatíveis com a LGPD.
            </p>
          </section>

          {/* 5 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">5. Retenção de Dados</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Dados da conta: mantidos enquanto o cadastro estiver ativo;</li>
              <li>Após cancelamento: dados são anonimizados ou excluídos em até <strong>90 dias</strong>, salvo obrigação legal de retenção;</li>
              <li>Logs de auditoria: mantidos por até <strong>5 anos</strong>, conforme Marco Civil da Internet (Art. 15);</li>
              <li>Dados de contatos: excluídos imediatamente ao serem removidos pelo Cliente ou junto com a conta.</li>
            </ul>
          </section>

          {/* 6 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">6. Seus Direitos (LGPD, Art. 18)</h2>
            <p>Como titular de dados, você tem direito a:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                ['Acesso', 'Saber quais dados temos sobre você'],
                ['Correção', 'Corrigir dados incompletos ou desatualizados'],
                ['Eliminação', 'Excluir dados tratados com base em consentimento'],
                ['Portabilidade', 'Receber seus dados em formato estruturado'],
                ['Oposição', 'Opor-se a tratamentos com base em legítimo interesse'],
                ['Revogação', 'Retirar consentimento a qualquer momento'],
                ['Informação', 'Saber com quem compartilhamos seus dados'],
                ['Revisão', 'Solicitar revisão de decisões automatizadas'],
              ].map(([direito, desc]) => (
                <div key={direito} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="font-semibold text-gray-800 text-xs">{direito}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
            <p>
              Para exercer seus direitos, entre em contato via{' '}
              <a href="https://wa.me/5535999153639" target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                WhatsApp (35) 99915-3639
              </a>
              . Responderemos em até <strong>15 dias úteis</strong>.
            </p>
          </section>

          {/* 7 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">7. Segurança</h2>
            <p>Adotamos medidas técnicas e administrativas para proteger seus dados:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Senhas armazenadas com hash bcrypt (salt rounds 10+);</li>
              <li>Comunicação via HTTPS/TLS em todos os endpoints;</li>
              <li>Autenticação via JWT com expiração;</li>
              <li>Rate limiting para prevenção de ataques de força bruta;</li>
              <li>Acesso ao banco de dados restrito por credenciais seguras;</li>
              <li>Logs de auditoria para ações administrativas.</li>
            </ul>
            <p>
              Em caso de incidente de segurança que possa afetar seus dados, notificaremos a ANPD e os titulares
              afetados no prazo máximo de <strong>72 horas</strong> após ciência do incidente, conforme Art. 48 da LGPD.
            </p>
          </section>

          {/* 8 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">8. Cookies</h2>
            <p>
              A Plataforma utiliza cookies essenciais para funcionamento (autenticação via JWT no localStorage) e
              cookies de desempenho para análise de uso. Não utilizamos cookies de rastreamento publicitário de
              terceiros.
            </p>
          </section>

          {/* 9 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">9. Transferência Internacional</h2>
            <p>
              Os dados podem ser processados em servidores localizados nos Estados Unidos (Render, Vercel, Upstash,
              Resend) e na União Europeia (Neon). Garantimos que esses provedores possuem certificações e
              mecanismos de proteção adequados (SCCs, Privacy Shield sucessores ou cláusulas contratuais padrão),
              conforme Art. 33 da LGPD.
            </p>
          </section>

          {/* 10 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">10. Menores de Idade</h2>
            <p>
              A Plataforma não é destinada a menores de 18 anos. Não coletamos intencionalmente dados de menores.
              Se identificarmos dados de menores coletados sem consentimento parental, os excluiremos imediatamente.
            </p>
          </section>

          {/* 11 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">11. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta Política periodicamente. Notificaremos mudanças relevantes por e-mail com
              antecedência mínima de 15 dias. A versão atual estará sempre disponível em{' '}
              <strong>clicaai.ia.br/privacidade</strong>.
            </p>
          </section>

          {/* 12 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">12. Lei Aplicável e Foro</h2>
            <p>
              Esta Política é regida pelas leis brasileiras, especialmente pela LGPD (Lei 13.709/2018) e pelo
              Marco Civil da Internet (Lei 12.965/2014). Foro: Comarca de <strong>Três Corações/MG</strong>.
            </p>
            <p>
              Você também tem o direito de apresentar reclamações à{' '}
              <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong> em <em>gov.br/anpd</em>.
            </p>
          </section>

        </div>

        <div className="text-center mt-8 space-y-2">
          <p className="text-xs text-gray-400">
            Clica Aí — Clica Rede e Marketing — CNPJ 30.925.376/0001-78 · {updated}
          </p>
          <Link href="/termos" className="text-xs text-brand-600 hover:underline">Ver Termos de Uso</Link>
        </div>
      </div>
    </div>
  );
}
