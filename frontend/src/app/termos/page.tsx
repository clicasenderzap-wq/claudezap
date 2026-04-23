import Link from 'next/link';

export const metadata = {
  title: 'Termos de Uso — Clica Aí',
  description: 'Termos de Uso da plataforma Clica Aí.',
};

export default function TermosPage() {
  const updated = '22 de abril de 2026';
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-sm text-brand-600 hover:underline">← Voltar ao início</Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Termos de Uso</h1>
          <p className="text-sm text-gray-500 mt-2">Última atualização: {updated}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8 text-gray-700 text-sm leading-relaxed">

          {/* 1 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">1. Identificação</h2>
            <p>
              A plataforma <strong>Clica Aí</strong> é um serviço de automação de mensagens via WhatsApp operado por{' '}
              <strong>Clica Rede e Marketing</strong>, inscrita no CNPJ sob o nº <strong>30.925.376/0001-78</strong>,
              acessível em <strong>clicaai.ia.br</strong> (doravante &quot;Plataforma&quot; ou &quot;Clica Aí&quot;).
            </p>
            <p>
              Ao criar uma conta, o usuário (<strong>&quot;Cliente&quot;</strong>) declara ter lido, compreendido e
              concordado integralmente com estes Termos. Caso não concorde, não utilize a Plataforma.
            </p>
          </section>

          {/* 2 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">2. Objeto</h2>
            <p>
              A Clica Aí oferece ao Cliente ferramentas para: (i) envio programado de mensagens via WhatsApp para listas
              de contatos; (ii) gestão de múltiplos números WhatsApp; (iii) aquecimento automatizado de contas;
              (iv) atendimento automatizado via bot; (v) caixa de entrada unificada de respostas.
            </p>
            <p>
              A Plataforma atua como <strong>Operadora de Dados</strong>, conforme a Lei Geral de Proteção de Dados
              (LGPD — Lei 13.709/2018), processando os dados de contatos fornecidos pelo Cliente. O Cliente é o{' '}
              <strong>Controlador</strong> e responsável pela licitude do tratamento.
            </p>
          </section>

          {/* 3 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">3. Cadastro e Acesso</h2>
            <p>
              O acesso à Plataforma exige cadastro com nome completo, e-mail válido e número de WhatsApp. O Cliente
              deve fornecer informações verdadeiras e mantê-las atualizadas.
            </p>
            <p>
              A Clica Aí pode recusar, suspender ou cancelar cadastros que violem estes Termos, sem obrigação de
              aviso prévio em casos de uso abusivo ou ilegal.
            </p>
            <p>
              Menores de 18 anos não podem utilizar a Plataforma sem representação ou assistência legal.
            </p>
          </section>

          {/* 4 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">4. Obrigações e Responsabilidades do Cliente</h2>
            <p>O Cliente concorda em:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Obter consentimento prévio e expresso</strong> de todos os destinatários antes de enviar
                qualquer mensagem por meio da Plataforma, conforme exigido pela LGPD (Art. 7º, I) e pelo Código de
                Defesa do Consumidor;
              </li>
              <li>
                Manter registros do consentimento dos contatos (data, canal, finalidade), disponibilizando-os à
                Clica Aí ou a autoridades competentes quando solicitado;
              </li>
              <li>
                Respeitar imediatamente todas as solicitações de cancelamento de recebimento de mensagens (&quot;opt-out&quot;),
                inclusive as enviadas com a palavra <strong>SAIR</strong>;
              </li>
              <li>
                Identificar-se claramente nas mensagens enviadas, informando o nome da empresa ou pessoa responsável
                pelo envio;
              </li>
              <li>
                Não enviar conteúdo ofensivo, discriminatório, fraudulento, enganoso, difamatório, pornográfico ou
                qualquer material que viole leis brasileiras ou internacionais;
              </li>
              <li>
                Responsabilizar-se por todos os custos, multas, indenizações ou processos decorrentes do conteúdo
                por ele enviado ou da forma de uso da Plataforma.
              </li>
            </ul>
          </section>

          {/* 5 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">5. Usos Expressamente Proibidos</h2>
            <p>É vedado utilizar a Plataforma para:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Envio de SPAM ou mensagens não solicitadas em massa;</li>
              <li>Disseminação de desinformação, &quot;fake news&quot; ou conteúdo político partidário em massa;</li>
              <li>Fraudes, golpes, phishing ou qualquer atividade ilícita;</li>
              <li>Assédio, ameaças ou constrangimento a qualquer pessoa;</li>
              <li>Coleta ilegal de dados pessoais;</li>
              <li>Violação de direitos de propriedade intelectual de terceiros;</li>
              <li>Revenda ou sublicenciamento não autorizado da Plataforma;</li>
              <li>Qualquer finalidade que viole a legislação brasileira vigente.</li>
            </ul>
            <p>
              A violação de qualquer item acima resulta em suspensão imediata da conta, sem direito a reembolso, e
              pode ensejar responsabilização civil e criminal do Cliente.
            </p>
          </section>

          {/* 6 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">6. Consentimento dos Contatos — Responsabilidade do Cliente</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800">
              <strong>Cláusula essencial:</strong> A Clica Aí processa mensagens exclusivamente como intermediária
              técnica. O <strong>Cliente é o único responsável</strong> por garantir que todos os destinatários das
              mensagens autorizaram previamente o recebimento de comunicações.
            </div>
            <p>
              O envio de mensagens para contatos que não consentiram constitui infração à LGPD, podendo sujeitar o
              Cliente a multas da Autoridade Nacional de Proteção de Dados (ANPD) de até{' '}
              <strong>2% do faturamento</strong>, limitadas a R$ 50 milhões por infração (Art. 52, LGPD).
            </p>
            <p>
              A Clica Aí disponibiliza ferramentas de opt-out e registro de consentimento, mas não tem controle
              sobre as listas de contatos fornecidas pelo Cliente e não pode verificar se o consentimento foi
              obtido. Em caso de autuação, reclamação ou processo judicial relacionado ao conteúdo ou destinatários
              das mensagens, a responsabilidade recai exclusivamente sobre o Cliente.
            </p>
          </section>

          {/* 7 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">7. Planos, Pagamento e Cancelamento</h2>
            <p>
              Os planos e preços vigentes estão disponíveis em <strong>clicaai.ia.br/#planos</strong>. A Clica Aí
              reserva-se o direito de alterar preços mediante aviso prévio de 30 dias.
            </p>
            <p>
              O período de teste gratuito de <strong>7 dias</strong> não exige cartão de crédito. Após o período de
              teste, o acesso à Plataforma requer contratação de um plano pago.
            </p>
            <p>
              O cancelamento pode ser solicitado a qualquer momento. Não haverá reembolso proporcional de períodos
              pagos não utilizados, salvo disposição legal em contrário.
            </p>
          </section>

          {/* 8 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">8. Disponibilidade e Limitação de Responsabilidade</h2>
            <p>
              A Clica Aí emprega esforços razoáveis para manter a Plataforma disponível 24 horas por dia, 7 dias
              por semana, mas não garante disponibilidade ininterrupta. Manutenções programadas serão comunicadas
              com antecedência.
            </p>
            <p>
              A Clica Aí <strong>não se responsabiliza</strong> por: (i) bloqueio ou banimento de números WhatsApp
              pelos mecanismos de detecção da Meta Platforms; (ii) interrupções causadas por terceiros (provedores,
              Meta, Upstash, Neon, Render); (iii) danos indiretos, perda de receita ou lucros cessantes.
            </p>
            <p>
              A responsabilidade total da Clica Aí em qualquer hipótese fica limitada ao valor pago pelo Cliente
              nos últimos 3 meses de contrato.
            </p>
          </section>

          {/* 9 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">9. Privacidade e Proteção de Dados</h2>
            <p>
              O tratamento de dados pessoais dos Clientes e de seus contatos é regido pela nossa{' '}
              <Link href="/privacidade" className="text-brand-600 hover:underline font-medium">
                Política de Privacidade
              </Link>
              , parte integrante destes Termos.
            </p>
          </section>

          {/* 10 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">10. Propriedade Intelectual</h2>
            <p>
              Todos os direitos sobre a Plataforma, incluindo código-fonte, design, marca &quot;Clica Aí&quot;, logotipos e
              conteúdo, são de propriedade exclusiva da Clica Rede e Marketing. É vedada a cópia, reprodução,
              modificação ou distribuição sem autorização prévia por escrito.
            </p>
          </section>

          {/* 11 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">11. Alterações nos Termos</h2>
            <p>
              A Clica Aí pode atualizar estes Termos a qualquer momento. Alterações relevantes serão comunicadas
              por e-mail com antecedência mínima de 15 dias. O uso continuado da Plataforma após a vigência das
              alterações implica aceitação tácita.
            </p>
          </section>

          {/* 12 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-gray-900">12. Disposições Gerais</h2>
            <p>
              Estes Termos são regidos pelas leis brasileiras, especialmente pela Lei 13.709/2018 (LGPD), Lei
              12.965/2014 (Marco Civil da Internet) e Lei 8.078/1990 (CDC).
            </p>
            <p>
              Fica eleito o foro da Comarca de <strong>Três Corações/MG</strong> para dirimir quaisquer controvérsias
              decorrentes destes Termos, com renúncia a qualquer outro, por mais privilegiado que seja.
            </p>
            <p>
              Dúvidas e solicitações:{' '}
              <a href="https://wa.me/5535999153639" target="_blank" rel="noreferrer" className="text-brand-600 hover:underline font-medium">
                WhatsApp (35) 99915-3639
              </a>
            </p>
          </section>

        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Clica Aí — Clica Rede e Marketing — CNPJ 30.925.376/0001-78 · {updated}
        </p>
      </div>
    </div>
  );
}
