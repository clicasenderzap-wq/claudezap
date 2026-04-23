const { WarmupConfig, WarmupLog, WhatsappAccount } = require('../models');
const { Op } = require('sequelize');
const whatsapp = require('./whatsappService');

// ── Biblioteca de conversas humanizadas ─────────────────────────────────────
// Cada par tem opener + reply contextualmente relacionados.
// Cobre livros, música, séries, comida, clima, esportes, viagens, humor etc.

const CONVERSATIONS = [
  // Livros
  { opener: 'Você leu algum livro bom ultimamente? Preciso de uma indicação 📚', reply: 'Acabei de terminar o "O Alquimista" de novo, sempre que releio me pega de um jeito diferente. Recomendo demais!' },
  { opener: 'Estou procurando um livro novo pra ler, alguma sugestão?', reply: 'Depende do seu gosto haha, mas se curte suspense, "O Código Da Vinci" é certeiro. Se preferir algo mais leve, vai de "O Pequeno Príncipe" 😄' },
  { opener: 'Já leu "Sapiens" do Yuval Harari? Comecei ontem e não consigo parar', reply: 'Sim! Esse livro muda a forma de enxergar o mundo mesmo. A parte sobre a revolução agrícola me deixou de queixo caído' },
  { opener: 'Tenho livros empilhados aqui que ainda não li rs, você tem esse problema também?', reply: 'Demais! Compro um atrás do outro e a pilha só cresce 😂 A gente vai com fé que um dia termina tudo' },
  { opener: 'Qual foi o último livro que você não conseguiu parar de ler?', reply: '"A Menina que Roubava Livros". Li em dois dias, chorei no final e não me arrependo nada 😅' },

  // Música
  { opener: 'Que música você tá ouvindo muito essa semana?', reply: 'Fiquei travado num álbum do Djavan que descobri faz uns dias. Ele é impressionante, cada música é uma obra 🎵' },
  { opener: 'Você viu que vai ter show aqui na cidade esse mês?', reply: 'Vi sim! Já tô de olho nos ingressos. Saudade de show ao vivo, pandemia bagunçou tudo isso né' },
  { opener: 'Tenho ouvido muito sertanejo ultimamente, não sei se envergonho ou me assumo rs', reply: 'Ahahaha se gostar é isso! Tem muita coisa boa no sertanejo atual. Xororó jovem era outro nível também 😂' },
  { opener: 'Você tem uma playlist boa pra trabalhar concentrado? Preciso de uma dica', reply: 'Uso muito lo-fi no Spotify, aquelas playlists de estudo. Coloca qualquer coisa de "lofi hip hop" que resolve 🎧' },
  { opener: 'Acabei de descobrir uma banda incrível: Terno Rei. Você conhece?', reply: 'Conheço sim! "Mesão" e "Morango" são hits demais. Esse indie brasileiro tá muito forte ultimamente 🎶' },
  { opener: 'Qual música você mais ouviu esse ano até agora?', reply: 'Sem dúvida alguma coisa do Raul Seixas que não sai da minha cabeça. "Metamorfose Ambulante" é eterno' },

  // Séries e filmes
  { opener: 'Você assistiu a última temporada de Stranger Things? Sem spoiler rs', reply: 'Assisti sim! Fica tranquilo, não vou estragar. Mas posso dizer que valeu a espera 😄 Você já foi até onde?' },
  { opener: 'Tô sem série pra assistir, me recomenda alguma?', reply: 'Assiste "Dark" da Netflix se não viu! Alemã, viagem total de mente, mas viciante do início ao fim. Pode confiar' },
  { opener: 'Fui ao cinema ontem pela primeira vez em meses. Que sensação boa', reply: 'Que saudade de cinema! Qual filme você foi ver? Faz tempo que não vou, preciso me animar pra isso' },
  { opener: 'Você viu o último filme do Studio Ghibli? "O Menino e a Garça"', reply: 'Vi! É daqueles filmes que você termina sem saber bem o que sentiu, mas sabe que foi especial. Miyazaki é único' },
  { opener: 'Estou revendo Breaking Bad pela terceira vez rs parece que sempre tem algo novo', reply: 'Isso é sinal de série boa de verdade! Eu revi também e percebi detalhes que não tinha notado antes. Walter White é um personagem muito bem construído' },
  { opener: 'Você prefere série ou filme quando vai relaxar à noite?', reply: 'Depende do humor rs, se tô muito cansado prefiro filme que acaba logo. Se tô disposto, série com vários episódios é melhor' },

  // Comida e culinária
  { opener: 'Fiz uma receita nova ontem e ficou surpreendentemente boa 😄', reply: 'Conta qual foi! Adoro quando isso acontece, a gente improvisa e vira uma maravilha haha' },
  { opener: 'Você tem uma receita fácil de algo pra jantar? Preciso de inspiração', reply: 'Macarrão alho e azeite com manjericão é rápido, gostoso e impressiona qualquer um haha. Literalmente 20 minutos' },
  { opener: 'Fui num restaurante novo aqui perto e fiquei impressionado com a qualidade', reply: 'Que bom! Como se chama? Adoro descobrir lugar bom perto de casa, fica a dica 😋' },
  { opener: 'Tô tentando comer mais saudável mas a pizza me chama todo dia rs', reply: 'Ahaha a pizza é irresistível mesmo. Vai de pizza uma vez por semana como recompensa, assim fica mais fácil na dieta 😂' },
  { opener: 'Você sabe fazer pão caseiro? Tô com vontade de tentar mas parece difícil', reply: 'Fiz uma vez! É mais fácil do que parece, o difícil é esperar o pão crescer sem ficar abrindo o forno a cada 5 minutos 😅' },
  { opener: 'Descobri um café incrível pertinho aqui, capuccino dos deuses', reply: 'Que inveja! Me passa o endereço, adoro um café bem feito. Tem coisa melhor que um capuccino numa tarde tranquila?' },

  // Fim de semana e lazer
  { opener: 'Que planos pro final de semana? Eu tô sem ideia ainda', reply: 'Ainda não decidi mas tô com vontade de fazer um churrasco lá em casa. Já faz um tempo que não junta a galera' },
  { opener: 'Fui numa trilha ontem e fiquei lembrando como é gostoso sair da rotina', reply: 'Verdade! Natureza faz bem demais. Teve cachoeira no caminho ou foi só mata? Dá pra ir no próximo final de semana?' },
  { opener: 'Você costuma aproveitar o domingo pra relaxar ou sempre acaba trabalhando?', reply: 'Tento parar no domingo, mas não é sempre que consigo rs. Mas quando consigo, só livro, seriado e comida boa. Tem que ter esse dia' },
  { opener: 'Tive um final de semana tão corrido que parece que precisava de um descanso do descanso', reply: 'Isso acontece demais né! Quando a gente percebe, segunda chegou e a bateria tá no vermelho. Precisa de um feriado do feriado 😂' },
  { opener: 'Fui pescar com o pessoal sábado cedo. Nada como silêncio e natureza pra recarregar', reply: 'Que programa perfeito! Pegou algum peixe ou só ficou no esquema filosófico olhando pro rio? 😄' },

  // Esportes e academia
  { opener: 'Voltei à academia depois de meses parado. Primeira semana foi um sofrimento só rs', reply: 'Ahahaha a dor muscular dos primeiros dias é cruel! Mas depois de duas semanas o corpo agradece, fica firme aí 💪' },
  { opener: 'Você acompanhou o jogo ontem? Que partida maluca', reply: 'Assisti sim! Não esperava aquela virada no segundo tempo. O time tava tão apagado no primeiro que achei que ia dar ruim' },
  { opener: 'Comecei a correr de manhã essa semana. Tô sofrendo mas me sentindo bem ao mesmo tempo', reply: 'Isso! A corrida matinal é um nível diferente. Depois que vira hábito você não troca por nada, principalmente a sensação depois que termina' },
  { opener: 'Você pratica algum esporte ou exercício? Tô tentando criar o hábito', reply: 'Caminhada todo dia, simples assim. Comecei com 20 minutos e hoje faço uma hora sem perceber. Começa pequeno e vai aumentando' },

  // Clima e estações
  { opener: 'Que calor absurdo hoje, tô derretendo aqui 🥵', reply: 'Aqui também tá um horror! Essa onda de calor não tá tendo dó. Tô vivendo no ventilador e bebendo água o dia inteiro' },
  { opener: 'Finalmente esfriou um pouco! Esse tempo de outono é o melhor do ano', reply: 'Com certeza! Esse friozinho gostoso pede cobertor, chocolate quente e uma série boa. Melhor combinação do mundo 😌' },
  { opener: 'Choveu muito aqui hoje, daquelas chuvas que prendem você em casa', reply: 'Aqui também! Mas confesso que esses dias de chuva presa em casa são ótimos pra ler ou ver série. Uma benção disfarçada haha' },
  { opener: 'Esse tempo cinzento tá me deixando com preguiça de tudo', reply: 'Entendo demais. Dia nublado chama o cobertor com uma força que não tem como resistir 😂 Aproveita e descansa então!' },

  // Trabalho e rotina (leve)
  { opener: 'Finalmente terminei aquele projeto que tava me consumindo faz semanas', reply: 'Que alívio né! Aquela sensação de riscar um item grande da lista não tem preço. Merecido descanso esse final de semana!' },
  { opener: 'Dia produtivo hoje, consegui fazer tudo que estava atrasado 💪', reply: 'Esses dias são ótimos! Quando o foco vem, não tem o que pare. Aproveita o pique enquanto dura haha' },
  { opener: 'Tô testando trabalhar num café pra mudar o ambiente. Funcionou bem demais', reply: 'Café tem um poder mágico de produtividade rs. Acho que é o ruído ambiente, não fica nem silêncio demais nem barulho demais' },
  { opener: 'Você usa algum método de organização? Tô tentando ser mais produtivo', reply: 'Uso muito o método Pomodoro: 25 minutos focado, 5 de pausa. Parece bobo mas muda bastante a concentração. Tenta aí!' },

  // Viagens
  { opener: 'Tô planejando uma viagem pra praia esse ano. Empolgado demais!', reply: 'Que ótimo! Já definiu o destino? Tem uns lugares incríveis no litoral brasileiro que muita gente não conhece ainda' },
  { opener: 'Saudade de viajar. Faz quanto tempo que você não vai a algum lugar novo?', reply: 'Faz um bom tempo! A correria do dia a dia vai engolindo. Mas é essencial sair da rotina de vez em quando, né? Muda tudo' },
  { opener: 'Você conhece Gramado? Fui uma vez e não consigo parar de recomendar', reply: 'Conheço! O clima lá é outro mundo. Aquela combinação de frio, fondue e arquitetura europeia é demais. Tô com saudade agora 😄' },
  { opener: 'Dica de viagem nacional barata? Quero viajar mas sem gastar muito', reply: 'Chapada Diamantina na Bahia! Trilhas, cachoeiras, grutas... barato e simplesmente espetacular. Uma das melhores viagens que fiz' },

  // Tecnologia e gadgets
  { opener: 'Você trocou de celular recentemente? Qual tá usando?', reply: 'Troquei faz uns 6 meses. Fui de Android pra iPhone pela primeira vez e tô me adaptando ainda haha. E você, tá satisfeito com o seu?' },
  { opener: 'Tô viciado num jogo no celular que não deveria existir rs', reply: 'Conta qual é! Jogos de celular têm esse poder absurdo de vício né. Minha produtividade agradece quando consigo resistir 😂' },
  { opener: 'Você usa algum aplicativo de meditação? Tô tentando criar esse hábito', reply: 'Uso o Headspace às vezes! Tem sessões curtas de 5 minutinhos que funcionam bem pra quem tá começando. Recomendo' },
  { opener: 'Inteligência artificial tá evoluindo assustadoramente rápido né?', reply: 'É impressionante mesmo! Parece que a cada semana tem algo novo. A gente que acompanha de perto sente que é outro mundo comparado a 3 anos atrás' },

  // Curiosidades e cultura geral
  { opener: 'Você sabia que polvos têm três corações? Fiquei impressionado quando li isso', reply: 'Sabia não! E ainda são azul? O mundo animal é cheio de coisas que parecem ficção científica. Fiquei curioso agora 🐙' },
  { opener: 'Tava lendo sobre o universo e cada vez mais fico com a cabeça girando de quão grande é tudo', reply: 'Astronomia faz isso mesmo com a gente. A distância em anos-luz entre galáxias é tão absurda que o cérebro não consegue processar direito' },
  { opener: 'Você sabia que as abelhas podem reconhecer rostos humanos? Li isso hoje e não consigo parar de pensar', reply: 'Que incrível isso! A natureza não para de surpreender. Agora vou ficar olhando diferente pra cada abelha que aparecer rs' },
  { opener: 'Descobri que Beethoven era surdo quando compôs algumas das suas maiores obras. Como isso é possível?', reply: 'Isso me impressiona toda vez que lembro. A mente humana consegue criar o que a biologia não permite mais. Genialidade pura mesmo' },

  // Humor leve
  { opener: 'Você tem alguma habilidade inútil mas que te faz sentir especial rs?', reply: 'Consigo comer inteiro um pacote de biscoito sem culpa nenhuma 😂 Habilidade inútil? Talvez. Especial? Com certeza' },
  { opener: 'Hoje acordei com aquela música na cabeça que fica o dia inteiro. Suplício', reply: 'Ahahaha as músicas grudentas são implacáveis! Sabia que a ciência chama isso de "earworm"? Não ajuda em nada mas pelo menos tem nome 😄' },
  { opener: 'Sonhei que sabia voar essa noite. Fiquei com uma sensação estranha o dia todo', reply: 'Sonho de voar é o melhor! Tem aquela sensação de leveza que dura um tempo depois de acordar. Deveria ser permitido na vida real rs' },
  { opener: 'Meu cachorro decidiu latir pras 3h da manhã sem motivo aparente. Obrigado pelo sono', reply: 'Ahahahaha pets têm um timing perfeito pra isso! Misteriosamente sempre escolhem o horário mais inconveniente possível 😂' },
  { opener: 'Você também sente que segunda-feira chega na velocidade da luz e sexta no passo de lesma?', reply: 'Fenômeno físico inexplicável esse! Domingo à noite já tem aquele pressentimento, e na sexta parece que a semana durou dois meses 😅' },

  // Gastronomia regional
  { opener: 'Comi um pastel de feira hoje e me lembrei que comida simples boa bate qualquer restaurante chique', reply: 'Pastel de feira com caldo de cana é patrimônio cultural! Concordo 100%. Às vezes o mais simples é o que tem mais sabor mesmo' },
  { opener: 'Você prefere churrasco ou pizza? Essa discussão nunca tem um vencedor rs', reply: 'Difícil demais escolher! Se tiver de domingo com a família, churrasco. Se for sexta à noite sem vontade de cozinhar, pizza. Os dois têm seu momento' },
  { opener: 'Fiz brigadeiro hoje pra ninguém, só pra mim mesmo. Sem arrependimento', reply: 'Isso é saúde mental! Às vezes a gente merece só o próprio mimo sem ter que dividir com ninguém 😄 Ficou no ponto?' },

  // Plantas e natureza
  { opener: 'Comprei mais uma planta pra casa e meu cônjuge me olhou com aquele olhar rs', reply: 'Ahahaha o olhar que diz "mais uma?" 😂 Mas plantas deixam o ambiente completamente diferente. É um vício que não faz mal' },
  { opener: 'Minha horta finalmente produziu tomates de verdade! Primeiro ano e deu certo', reply: 'Que conquista! Tomate do quintal tem um sabor que não tem comparação com o de supermercado. Parabéns pela paciência!' },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Serviço principal ────────────────────────────────────────────────────────

class WarmupService {
  constructor() {
    this.timer = null;
  }

  start() {
    console.log('[Warmup] serviço iniciado');
    this._scheduleNext();
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
  }

  _scheduleNext() {
    // Intervalo aleatório entre 4 e 9 minutos para não parecer automático
    const delay = (4 + Math.random() * 5) * 60 * 1000;
    this.timer = setTimeout(() => this._tick(), delay);
  }

  async _tick() {
    try {
      await this._processAll();
    } catch (err) {
      console.error('[Warmup] erro no tick:', err.message);
    } finally {
      this._scheduleNext();
    }
  }

  async _processAll() {
    const configs = await WarmupConfig.findAll({ where: { enabled: true } });
    for (const config of configs) {
      await this._processUser(config).catch((e) =>
        console.error(`[Warmup] erro para user ${config.user_id}:`, e.message)
      );
    }
  }

  _isInWindow(config) {
    const hour = new Date().getHours();
    const inDay = hour >= config.start_hour && hour < config.end_hour;
    if (inDay) return true;
    if (!config.night_enabled) return false;
    const ns = config.night_start_hour;
    const ne = config.night_end_hour;
    // Cross-midnight range (e.g. 23 → 07)
    return ns > ne ? (hour >= ns || hour < ne) : (hour >= ns && hour < ne);
  }

  _getDailyQuota(config) {
    return config.messages_per_day + (config.night_enabled ? (config.night_messages_per_day ?? 30) : 0);
  }

  async _processUser(config) {
    if (!this._isInWindow(config)) return;

    // Verifica cota diária combinada (dia + noite)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const sentToday = await WarmupLog.count({
      where: { user_id: config.user_id, sent_at: { [Op.gte]: startOfDay } },
    });
    if (sentToday >= this._getDailyQuota(config)) return;

    // Contas conectadas com número identificado (filtra pelas selecionadas se houver)
    const selectedIds = config.account_ids || [];
    const where = { user_id: config.user_id };
    if (selectedIds.length) where.id = selectedIds;
    const accounts = await WhatsappAccount.findAll({ where });
    const connected = accounts.filter((a) => whatsapp.getStatus(a.id) === 'connected' && a.phone);

    if (connected.length < 2) {
      console.log(`[Warmup] user ${config.user_id}: menos de 2 contas conectadas com número, pulando`);
      return;
    }

    // Escolhe remetente e destinatário aleatórios
    const shuffled = [...connected].sort(() => Math.random() - 0.5);
    const sender = shuffled[0];
    const receiver = shuffled[1];

    const conv = pick(CONVERSATIONS);
    const initMsg = conv.opener;
    await whatsapp.sendText(sender.id, receiver.phone, initMsg);
    await WarmupLog.create({
      user_id: config.user_id,
      from_account_id: sender.id,
      to_account_id: receiver.id,
      from_label: sender.label,
      to_label: receiver.label,
      message: initMsg,
    });

    console.log(`[Warmup] ${sender.label} → ${receiver.label}: "${initMsg}"`);

    // Resposta após 15–90 segundos
    if (sentToday + 1 < this._getDailyQuota(config)) {
      const replyDelay = (15 + Math.random() * 75) * 1000;
      setTimeout(async () => {
        try {
          const replyMsg = conv.reply;
          await whatsapp.sendText(receiver.id, sender.phone, replyMsg);
          await WarmupLog.create({
            user_id: config.user_id,
            from_account_id: receiver.id,
            to_account_id: sender.id,
            from_label: receiver.label,
            to_label: sender.label,
            message: replyMsg,
          });
          console.log(`[Warmup] ${receiver.label} → ${sender.label}: "${replyMsg}"`);
        } catch (e) {
          console.error('[Warmup] erro na resposta:', e.message);
        }
      }, replyDelay);
    }
  }

  // Chamado externamente para forçar um ciclo imediato (ex: ao ativar)
  async runNow(userId) {
    const config = await WarmupConfig.findOne({ where: { user_id: userId, enabled: true } });
    if (config) await this._processUser(config);
  }

  async getStats(userId) {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - 7); startOfWeek.setHours(0, 0, 0, 0);

    const [today, week, recent] = await Promise.all([
      WarmupLog.count({ where: { user_id: userId, sent_at: { [Op.gte]: startOfDay } } }),
      WarmupLog.count({ where: { user_id: userId, sent_at: { [Op.gte]: startOfWeek } } }),
      WarmupLog.findAll({
        where: { user_id: userId },
        order: [['sent_at', 'DESC']],
        limit: 20,
      }),
    ]);

    return { today, week, recent };
  }
}

module.exports = new WarmupService();
