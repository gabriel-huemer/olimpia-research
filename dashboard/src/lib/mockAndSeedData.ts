export interface AnalyticsFilters {
  periodo?: string;
  genero?: string;
  faixaIdade?: string;
  cidade?: string;
  hospedagem?: string;
  transporte?: string;
  localPesquisa?: string;
}

export interface PerguntaItem {
  id: number;
  codigo: string;
  enunciado: string;
  tipo: string;
  opcoes?: string[];
  obrigatoria: boolean;
  condicaoExibicao: string;
  regraAlerta: string;
  rotuloIndicador: string;
}

export interface SecaoFormulario {
  id: number;
  ordem: number;
  titulo: string;
  perguntas: PerguntaItem[];
}

export interface FormularioItem {
  id: number;
  nome: string;
  versao: string;
  numeroVersao: number;
  status: "Ativo" | "Encerrada" | "Rascunho" | "Agendado";
  respostas: number;
  vigencia: string;
  atualizado: string;
  secoes: SecaoFormulario[];
}

export interface PesquisaColetada {
  id: string;
  protocolo: string;
  origem: string;
  operador: string;
  local: string;
  coletada: string;
  periodo: string;
  situacao:
    | "Na fila do app"
    | "Sinalizada"
    | "Sincronizada"
    | "Aprovada"
    | "Corrigida"
    | "Inserida manualmente"
    | "Excluída";
}

export interface OperadorCampo {
  id: string;
  nome: string;
  codigo: string;
  coletas7Dias: number;
  coletas30Dias: number;
  alertas7Dias: number;
  taxaAlerta: number;
  ultimoEnvio: string;
  statusEnvio: "normal" | "offline";
  localHabitual: string;
  mediaDiaria: number;
  serieDiaria: number[];
  ativo: boolean;
}

export interface ItemRevisao {
  id: number;
  protocolo: string;
  resumoMotivo: string;
  operador: string;
  dataCurta: string;
  cidadeOrigem: string;
  motivoDetalhado: string;
  campoSuspeito: string;
  valorSuspeito: string;
  dadosColeta: {
    idade: string;
    genero: string;
    estadoCivil: string;
    gastoDiario: string;
    coletadaEm: string;
  };
  status: "PENDENTE" | "APROVADA" | "CORRIGIDA" | "EXCLUIDA";
}

export interface ItemPublicacao {
  id: string;
  indicador: string;
  aba: string;
  tagDados: "agregado" | "pode identificar pessoa" | "revisar texto";
  publico: boolean;
}

export interface ProblemaImportacao {
  id: number;
  linha: number;
  problema: string;
  acaoTexto: string;
  resolvido: boolean;
  resolucao?: string;
}

export interface UsuarioSistema {
  id: string;
  nome: string;
  email: string;
  perfil: "Administrador" | "Gestor" | "Editor" | "Pesquisador" | "Visualizador";
  status: "Ativo" | "Inativo";
}

export interface RegistroAuditoria {
  id: number;
  dataHora: string;
  usuario: string;
  acao: "Corrigiu" | "Sincronizou" | "Publicou" | "Inseriu" | "Excluiu";
  item: string;
  protocoloBadge?: string;
  alteracao: string;
}

const SECOES_PADRAO: SecaoFormulario[] = [
  {
    id: 1,
    ordem: 1,
    titulo: "Origem",
    perguntas: [
      {
        id: 101,
        codigo: "estado_origem",
        enunciado: "Qual seu estado (UF) de residência?",
        tipo: "escolha única",
        opcoes: ["SP", "MG", "PR", "RJ", "GO", "SC", "Reside no exterior"],
        obrigatoria: true,
        condicaoExibicao: "Sempre visível",
        regraAlerta: "Nenhuma",
        rotuloIndicador: "uf_origem",
      },
      {
        id: 102,
        codigo: "cidade_origem",
        enunciado: "Qual sua cidade de residência (lista IBGE)?",
        tipo: "cidade (IBGE)",
        opcoes: ["São Paulo", "Campinas", "Ribeirão Preto", "Belo Horizonte", "Uberlândia"],
        obrigatoria: true,
        condicaoExibicao: "UF ≠ Reside no exterior",
        regraAlerta: "Nenhuma",
        rotuloIndicador: "municipio_origem",
      },
    ],
  },
  {
    id: 2,
    ordem: 2,
    titulo: "Estadia",
    perguntas: [
      {
        id: 201,
        codigo: "data_chegada",
        enunciado: "Data de chegada em Olímpia",
        tipo: "data",
        obrigatoria: true,
        condicaoExibicao: "Sempre visível",
        regraAlerta: "pernoites > 30 → sinalizar como suspeita",
        rotuloIndicador: "permanencia_media",
      },
      {
        id: 202,
        codigo: "visitante_recorrente",
        enunciado: "Já visitou Olímpia anteriormente?",
        tipo: "escolha única",
        opcoes: ["Sim", "Não"],
        obrigatoria: true,
        condicaoExibicao: "Sempre visível",
        regraAlerta: "Nenhuma",
        rotuloIndicador: "visitante_recorrente",
      },
    ],
  },
  {
    id: 3,
    ordem: 3,
    titulo: "Decisão da viagem",
    perguntas: [
      {
        id: 301,
        codigo: "como_conheceu",
        enunciado: "Como tomou conhecimento de Olímpia?",
        tipo: "escolha única",
        opcoes: ["Internet", "Amigos", "Agência", "TV/Rádio", "Outro"],
        obrigatoria: true,
        condicaoExibicao: "Sempre visível",
        regraAlerta: "Nenhuma",
        rotuloIndicador: "canal_aquisicao",
      },
      {
        id: 302,
        codigo: "antecedencia_reserva",
        enunciado: "Com qual antecedência reservou a viagem?",
        tipo: "escolha única",
        opcoes: ["< 1 semana", "1 a 2 semanas", "15 dias a 3 m", "> 3 meses"],
        obrigatoria: true,
        condicaoExibicao: "Sempre visível",
        regraAlerta: "Nenhuma",
        rotuloIndicador: "antecedencia_reserva",
      },
    ],
  },
  {
    id: 4,
    ordem: 4,
    titulo: "Transporte",
    perguntas: [
      {
        id: 401,
        codigo: "meio_transporte",
        enunciado: "Qual meio de transporte utilizado?",
        tipo: "escolha única",
        opcoes: [
          "Veículo próprio",
          "Ônibus de linha",
          "Ônibus/Van de excursão",
          "Aéreo",
          "Veículo alugado",
          "Outro",
        ],
        obrigatoria: true,
        condicaoExibicao: "Sempre visível",
        regraAlerta: "Nenhuma",
        rotuloIndicador: "meio_transporte",
      },
      {
        id: 402,
        codigo: "transporte_aeroporto",
        enunciado: "Como chegou do aeroporto a Olímpia?",
        tipo: "escolha única",
        opcoes: [
          "Táxi",
          "Aplicativo",
          "Ônibus de linha",
          "Transfer",
          "Veículo alugado",
          "Outro",
        ],
        obrigatoria: true,
        condicaoExibicao: "Transporte = Aéreo",
        regraAlerta: "Nenhuma",
        rotuloIndicador: "transporte_aeroporto",
      },
    ],
  },
  {
    id: 5,
    ordem: 5,
    titulo: "Grupo de viagem",
    perguntas: [
      {
        id: 501,
        codigo: "composicao_grupo",
        enunciado: "Com quem você está viajando?",
        tipo: "escolha única",
        opcoes: ["Sozinho(a)", "Casal", "Família com crianças", "Amigos", "Excursão"],
        obrigatoria: true,
        condicaoExibicao: "Sempre visível",
        regraAlerta: "Sozinho(a) e acompanhantes > 0 → sinalizar como suspeita",
        rotuloIndicador: "perfil_grupo",
      },
      {
        id: 502,
        codigo: "grupo_pcd",
        enunciado: "Há pessoas com deficiência (PcD) ou mobilidade reduzida no grupo?",
        tipo: "múltipla",
        opcoes: ["Não possui", "Deficiência motora", "Deficiência visual", "Autismo", "Outra"],
        obrigatoria: true,
        condicaoExibicao: "Sempre visível",
        regraAlerta: "Nenhuma",
        rotuloIndicador: "grupos_pcd",
      },
    ],
  },
  {
    id: 6,
    ordem: 6,
    titulo: "Hospedagem e refeições",
    perguntas: [
      {
        id: 601,
        codigo: "tipo_hospedagem",
        enunciado: "Qual o meio de hospedagem utilizado em Olímpia?",
        tipo: "escolha única",
        opcoes: ["Hotéis", "Resorts", "Aluguel", "Parentes", "Day use (sem pernoite)"],
        obrigatoria: true,
        condicaoExibicao: "Sempre visível",
        regraAlerta: "Nenhuma",
        rotuloIndicador: "tipo_hospedagem",
      },
      {
        id: 602,
        codigo: "local_refeicoes",
        enunciado: "Onde faz as principais refeições?",
        tipo: "múltipla",
        opcoes: ["Restaurantes", "Hotel", "Parques", "Fast-food / lanchonetes"],
        obrigatoria: true,
        condicaoExibicao: "Sempre visível",
        regraAlerta: "Nenhuma",
        rotuloIndicador: "onde_refeicoes",
      },
      {
        id: 603,
        codigo: "gasto_diario",
        enunciado: "Qual o gasto diário médio estimado por pessoa (R$)?",
        tipo: "número",
        obrigatoria: true,
        condicaoExibicao: "Sempre visível",
        regraAlerta: "gasto > 5000 → sinalizar como suspeita",
        rotuloIndicador: "gasto_diario_medio",
      },
    ],
  },
  {
    id: 7,
    ordem: 7,
    titulo: "Avaliação de serviços",
    perguntas: [
      {
        id: 701,
        codigo: "matriz_servicos",
        enunciado: "Avalie os serviços urbanos e infraestrutura da cidade (1 a 5)",
        tipo: "lista de avaliação",
        opcoes: [
          "Hospitalidade",
          "Segurança",
          "Informações turísticas",
          "Limpeza",
          "Sinalização",
          "Condições das vias",
          "Acessibilidade",
        ],
        obrigatoria: true,
        condicaoExibicao: "Sempre visível",
        regraAlerta: "Nenhuma",
        rotuloIndicador: "avaliacao_servicos",
      },
    ],
  },
  {
    id: 8,
    ordem: 8,
    titulo: "Avaliação de atrativos",
    perguntas: [
      {
        id: 801,
        codigo: "matriz_atrativos",
        enunciado: "Avalie os atrativos visitados em Olímpia (0 a 5 ou Não utilizei)",
        tipo: "lista de avaliação",
        opcoes: ["Parque A*", "Praça central*", "Museu municipal*", "Thermas dos Laranjais", "Hot Beach"],
        obrigatoria: true,
        condicaoExibicao: "Sempre visível",
        regraAlerta: "Nenhuma",
        rotuloIndicador: "avaliacao_atrativos",
      },
    ],
  },
  {
    id: 9,
    ordem: 9,
    titulo: "Satisfação",
    perguntas: [
      {
        id: 901,
        codigo: "nps_destino",
        enunciado: "De 0 a 10, o quanto você recomendaria Olímpia a amigos e familiares?",
        tipo: "escala 0–10",
        obrigatoria: true,
        condicaoExibicao: "Sempre visível",
        regraAlerta: "Nenhuma",
        rotuloIndicador: "nps",
      },
      {
        id: 902,
        codigo: "o_que_falta",
        enunciado: "O que falta em Olímpia para melhorar sua experiência?",
        tipo: "texto",
        obrigatoria: false,
        condicaoExibicao: "Sempre visível",
        regraAlerta: "Texto livre → revisar antes de publicar",
        rotuloIndicador: "sentimento_texto_livre",
      },
    ],
  },
  {
    id: 10,
    ordem: 10,
    titulo: "Perfil",
    perguntas: [
      {
        id: 1001,
        codigo: "idade_respondente",
        enunciado: "Qual a sua idade?",
        tipo: "número",
        obrigatoria: true,
        condicaoExibicao: "Sempre visível",
        regraAlerta: "idade > 110 → sinalizar como suspeita",
        rotuloIndicador: "faixa_etaria",
      },
      {
        id: 1002,
        codigo: "genero_respondente",
        enunciado: "Com qual gênero você se identifica?",
        tipo: "escolha única",
        opcoes: ["Feminino", "Masculino", "Não-binário / Outro", "Prefiro não responder"],
        obrigatoria: true,
        condicaoExibicao: "Sempre visível",
        regraAlerta: "Nenhuma",
        rotuloIndicador: "genero",
      },
      {
        id: 1003,
        codigo: "escolaridade",
        enunciado: "Qual seu nível de escolaridade?",
        tipo: "escolha única",
        opcoes: ["Graduação", "Médio", "Pós"],
        obrigatoria: true,
        condicaoExibicao: "Sempre visível",
        regraAlerta: "Nenhuma",
        rotuloIndicador: "escolaridade",
      },
    ],
  },
];

interface AppDataStore {
  formularios: FormularioItem[];
  pesquisas: PesquisaColetada[];
  operadores: OperadorCampo[];
  revisao: ItemRevisao[];
  publicacaoItens: ItemPublicacao[];
  ultimaPublicacao: string;
  metodoPublicacao: string;
  problemasImportacao: ProblemaImportacao[];
  importacaoConcluida: boolean;
  usuarios: UsuarioSistema[];
  auditoria: RegistroAuditoria[];
}

function buildFormularioSeed(
  id: number,
  nome: string,
  numeroVersao: number,
  status: FormularioItem["status"],
  respostas: number,
  vigencia: string,
  atualizado: string,
  qtdSecoes = SECOES_PADRAO.length
): FormularioItem {
  return {
    id,
    nome,
    versao: `v${numeroVersao}`,
    numeroVersao,
    status,
    respostas,
    vigencia,
    atualizado,
    secoes: structuredClone(SECOES_PADRAO.slice(0, qtdSecoes)),
  };
}

function buildPesquisaSeed(
  num: string,
  origem: string,
  operador: string,
  local: string,
  coletada: string,
  situacao: PesquisaColetada["situacao"]
): PesquisaColetada {
  return {
    id: `p-${num}`,
    protocolo: `${num}/26`,
    origem,
    operador,
    local,
    coletada,
    periodo: "Out/2026",
    situacao,
  };
}

const initialStore: AppDataStore = {
  formularios: [
    buildFormularioSeed(1, "Pesquisa de Demanda Turística", 3, "Ativo", 5012, "01/01/2026 a 31/12/2026", "12/10/2026"),
    buildFormularioSeed(2, "Pesquisa de Demanda Turística", 2, "Encerrada", 3870, "01/01/2025 a 31/12/2025", "20/12/2025"),
    buildFormularioSeed(3, "Ocupação Hoteleira e Diária Média", 1, "Rascunho", 0, "não definida", "22/10/2026", 4),
    buildFormularioSeed(4, "Expectativa de Feriados", 1, "Agendado", 0, "a partir de 06/11/2026", "18/10/2026", 5),
  ],
  pesquisas: [
    buildPesquisaSeed("0047", "Ribeirão Preto, SP", "Ana Souza", "Thermas dos Laranjais", "26/10 10:42", "Na fila do app"),
    buildPesquisaSeed("0045", "Uberlândia, MG", "Ana Souza", "Thermas dos Laranjais", "26/10 10:12", "Sinalizada"),
    buildPesquisaSeed("0044", "Campinas, SP", "Carlos Lima", "Hot Beach", "26/10 09:50", "Sincronizada"),
    buildPesquisaSeed("0043", "Goiânia, GO", "Carlos Lima", "Hot Beach", "26/10 09:20", "Aprovada"),
    buildPesquisaSeed("0042", "Barretos, SP", "Marina Alves", "Praça da Matriz", "25/10 16:05", "Aprovada"),
    buildPesquisaSeed("0041", "— (telefone)", "Gestão (manual)", "—", "25/10 11:30", "Inserida manualmente"),
  ],
  operadores: [
    {
      id: "op-1",
      nome: "Ana Souza",
      codigo: "OTO-482",
      coletas7Dias: 142,
      coletas30Dias: 412,
      alertas7Dias: 3,
      taxaAlerta: 2.9,
      ultimoEnvio: "hoje 10:44",
      statusEnvio: "normal",
      localHabitual: "Thermas dos Laranjais",
      mediaDiaria: 14,
      serieDiaria: [11, 16, 13, 18, 19, 12, 15],
      ativo: true,
    },
    {
      id: "op-2",
      nome: "Carlos Lima",
      codigo: "OTO-377",
      coletas7Dias: 116,
      coletas30Dias: 356,
      alertas7Dias: 0,
      taxaAlerta: 1.1,
      ultimoEnvio: "hoje 09:41",
      statusEnvio: "normal",
      localHabitual: "Hot Beach",
      mediaDiaria: 12,
      serieDiaria: [10, 12, 14, 15, 13, 11, 12],
      ativo: true,
    },
    {
      id: "op-3",
      nome: "Marina Alves",
      codigo: "OTO-519",
      coletas7Dias: 88,
      coletas30Dias: 301,
      alertas7Dias: 1,
      taxaAlerta: 6.3,
      ultimoEnvio: "ontem",
      statusEnvio: "normal",
      localHabitual: "Praça da Matriz",
      mediaDiaria: 10,
      serieDiaria: [8, 11, 10, 12, 14, 9, 10],
      ativo: true,
    },
    {
      id: "op-4",
      nome: "João Pereira",
      codigo: "OTO-264",
      coletas7Dias: 47,
      coletas30Dias: 188,
      alertas7Dias: 2,
      taxaAlerta: 12.8,
      ultimoEnvio: "há 2 dias",
      statusEnvio: "offline",
      localHabitual: "Thermas dos Laranjais",
      mediaDiaria: 6,
      serieDiaria: [7, 8, 9, 6, 7, 0, 0],
      ativo: true,
    },
  ],
  revisao: [
    {
      id: 1,
      protocolo: "0038/26",
      resumoMotivo: "idade 500",
      operador: "Ana Souza",
      dataCurta: "23/10",
      cidadeOrigem: "Ribeirão Preto, SP",
      motivoDetalhado:
        'Idade fora do esperado. Informado: 500 anos. O operador escolheu "Manter e sinalizar".',
      campoSuspeito: "Idade",
      valorSuspeito: "500",
      dadosColeta: {
        idade: "500",
        genero: "Feminino",
        estadoCivil: "Casado(a)",
        gastoDiario: "R$ 450,00",
        coletadaEm: "23/10/2026 14:12 · Ana Souza",
      },
      status: "PENDENTE",
    },
    {
      id: 2,
      protocolo: "0045/26",
      resumoMotivo: "grupo incoerente",
      operador: "Ana Souza",
      dataCurta: "26/10",
      cidadeOrigem: "Uberlândia, MG",
      motivoDetalhado:
        'Grupo marcado como "Sozinho(a)", mas informou 2 acompanhantes crianças. O operador escolheu "Manter e sinalizar".',
      campoSuspeito: "Grupo de viagem",
      valorSuspeito: "Sozinho(a) + 2 acompanhantes",
      dadosColeta: {
        idade: "38",
        genero: "Masculino",
        estadoCivil: "Casado(a)",
        gastoDiario: "R$ 380,00",
        coletadaEm: "26/10/2026 10:12 · Ana Souza",
      },
      status: "PENDENTE",
    },
    {
      id: 3,
      protocolo: "0040/26",
      resumoMotivo: "gasto alto",
      operador: "Marina Alves",
      dataCurta: "24/10",
      cidadeOrigem: "São Paulo, SP",
      motivoDetalhado:
        'Gasto diário informado (R$ 8.500,00) incompatível com a faixa de renda (Até 2 salários). O operador escolheu "Manter e sinalizar".',
      campoSuspeito: "Gasto diário",
      valorSuspeito: "R$ 8.500,00",
      dadosColeta: {
        idade: "29",
        genero: "Feminino",
        estadoCivil: "Solteiro(a)",
        gastoDiario: "R$ 8.500,00",
        coletadaEm: "24/10/2026 15:30 · Marina Alves",
      },
      status: "PENDENTE",
    },
    {
      id: 4,
      protocolo: "0044/26",
      resumoMotivo: "idade 3 anos, solteiro",
      operador: "João Pereira",
      dataCurta: "24/10",
      cidadeOrigem: "Campinas, SP",
      motivoDetalhado:
        'Idade do respondente principal informada como 3 anos. O operador escolheu "Manter e sinalizar".',
      campoSuspeito: "Idade",
      valorSuspeito: "3",
      dadosColeta: {
        idade: "3",
        genero: "Masculino",
        estadoCivil: "Solteiro(a)",
        gastoDiario: "R$ 310,00",
        coletadaEm: "24/10/2026 11:05 · João Pereira",
      },
      status: "PENDENTE",
    },
    {
      id: 5,
      protocolo: "0035/26",
      resumoMotivo: "permanência 65 noites",
      operador: "Carlos Lima",
      dataCurta: "22/10",
      cidadeOrigem: "Belo Horizonte, MG",
      motivoDetalhado:
        'Pernoites calculados (65 noites) acima do limite esperado de 30 noites. O operador escolheu "Manter e sinalizar".',
      campoSuspeito: "Permanência",
      valorSuspeito: "65 noites",
      dadosColeta: {
        idade: "44",
        genero: "Feminino",
        estadoCivil: "Casado(a)",
        gastoDiario: "R$ 340,00",
        coletadaEm: "22/10/2026 16:40 · Carlos Lima",
      },
      status: "PENDENTE",
    },
    {
      id: 6,
      protocolo: "0032/26",
      resumoMotivo: "cidade inválida (importação)",
      operador: "Importação Excel",
      dataCurta: "21/10",
      cidadeOrigem: "Rib. Preto, SP",
      motivoDetalhado:
        "Linha importada da planilha histórica como sinalizada para revisão de município IBGE.",
      campoSuspeito: "Cidade",
      valorSuspeito: "Rib. Preto",
      dadosColeta: {
        idade: "51",
        genero: "Masculino",
        estadoCivil: "Casado(a)",
        gastoDiario: "R$ 400,00",
        coletadaEm: "21/10/2026 09:15 · Importação",
      },
      status: "PENDENTE",
    },
    {
      id: 7,
      protocolo: "0030/26",
      resumoMotivo: "idade vazia (importação)",
      operador: "Importação Excel",
      dataCurta: "21/10",
      cidadeOrigem: "São Paulo, SP",
      motivoDetalhado:
        "Linha 519 da planilha demanda_2024.xlsx importada sem idade preenchida.",
      campoSuspeito: "Idade",
      valorSuspeito: "Vazio",
      dadosColeta: {
        idade: "—",
        genero: "Feminino",
        estadoCivil: "Solteiro(a)",
        gastoDiario: "R$ 350,00",
        coletadaEm: "21/10/2026 09:15 · Importação",
      },
      status: "PENDENTE",
    },
  ],
  publicacaoItens: [
    {
      id: "pub-1",
      indicador: "Respondentes por faixa de idade",
      aba: "Perfil",
      tagDados: "agregado",
      publico: true,
    },
    {
      id: "pub-2",
      indicador: "Fluxo de turistas por mês",
      aba: "Fluxo",
      tagDados: "agregado",
      publico: true,
    },
    {
      id: "pub-3",
      indicador: "NPS",
      aba: "Percepção",
      tagDados: "agregado",
      publico: true,
    },
    {
      id: "pub-4",
      indicador: "Origem por cidade pequena (menos de 5 respostas)",
      aba: "Perfil",
      tagDados: "pode identificar pessoa",
      publico: false,
    },
    {
      id: "pub-5",
      indicador: "Nuvem de palavras (texto livre)",
      aba: "Percepção",
      tagDados: "revisar texto",
      publico: false,
    },
  ],
  ultimaPublicacao: "Nenhuma",
  metodoPublicacao: "Incorporar no site (iframe/link)",
  problemasImportacao: [
    {
      id: 1,
      linha: 204,
      problema: 'Cidade não encontrada: "Rib. Preto"',
      acaoTexto: "Corrigir para Ribeirão Preto",
      resolvido: false,
    },
    {
      id: 2,
      linha: 519,
      problema: "Idade vazia",
      acaoTexto: "Importar como sinalizada",
      resolvido: false,
    },
  ],
  importacaoConcluida: false,
  usuarios: [
    {
      id: "u-1",
      nome: "Hugo Zanni",
      email: "hugo.zanni@olimpia.sp.gov.br",
      perfil: "Administrador",
      status: "Ativo",
    },
    {
      id: "u-2",
      nome: "Coordenação OTO",
      email: "coordenacao@oto.olimpia.sp.gov.br",
      perfil: "Gestor",
      status: "Ativo",
    },
    {
      id: "u-3",
      nome: "Estagiária",
      email: "estagio@oto.olimpia.sp.gov.br",
      perfil: "Editor",
      status: "Ativo",
    },
    {
      id: "u-4",
      nome: "Ana Souza",
      email: "ana.souza@campo.oto.br",
      perfil: "Pesquisador",
      status: "Ativo",
    },
  ],
  auditoria: [
    {
      id: 1,
      dataHora: "26/10 11:02",
      usuario: "Coordenação OTO",
      acao: "Corrigiu",
      item: "Pesquisa",
      protocoloBadge: "0038/26",
      alteracao: "idade: 500 → 50 · motivo: erro de digitação",
    },
    {
      id: 2,
      dataHora: "26/10 10:44",
      usuario: "Ana Souza (app)",
      acao: "Sincronizou",
      item: "Pesquisas 0041 a 0046",
      alteracao: "6 pesquisas enviadas",
    },
    {
      id: 3,
      dataHora: "25/10 17:20",
      usuario: "Hugo Zanni",
      acao: "Publicou",
      item: "Formulário v3",
      alteracao: "status: rascunho → ativo",
    },
    {
      id: 4,
      dataHora: "25/10 11:30",
      usuario: "Estagiária",
      acao: "Inseriu",
      item: "Pesquisa",
      protocoloBadge: "0041/26",
      alteracao: "resposta recebida por telefone",
    },
    {
      id: 5,
      dataHora: "24/10 09:12",
      usuario: "Coordenação OTO",
      acao: "Excluiu",
      item: "Pesquisa",
      protocoloBadge: "0029/26",
      alteracao: "duplicada · motivo registrado",
    },
  ],
};

// Global singleton in Node.js dev/prod runtime so mutations persist across requests
const globalForStore = globalThis as unknown as { __otoStore?: AppDataStore };
if (!globalForStore.__otoStore) {
  globalForStore.__otoStore = JSON.parse(JSON.stringify(initialStore));
}

export function getStore(): AppDataStore {
  return globalForStore.__otoStore!;
}

/**
 * Calcula um fator determinístico de filtro para que todos os gráficos e KPIs das 5 abas
 * de Análises respondam dinamicamente quando o usuário aplica filtros na barra superior (RF14),
 * preservando exatamente os números do PDF quando os filtros estão em "Todos"/"Todas".
 */
export function getFilteredAnalytics(filters: AnalyticsFilters) {
  let factor = 1.0;
  let offset = 0;

  if (filters.genero && filters.genero !== "Todos") {
    factor *= filters.genero === "Feminino" ? 0.54 : 0.46;
    offset += 2;
  }
  if (filters.faixaIdade && filters.faixaIdade !== "Todas") {
    const map: Record<string, number> = {
      "0 a 12": 0.08,
      "13 a 17": 0.12,
      "18 a 29": 0.3,
      "30 a 44": 0.35,
      "45+": 0.15,
    };
    factor *= map[filters.faixaIdade] || 0.25;
    offset += 3;
  }
  if (filters.cidade && filters.cidade !== "Todas") {
    const map: Record<string, number> = {
      "São Paulo, SP": 0.54,
      "Campinas, SP": 0.12,
      "Ribeirão Preto, SP": 0.08,
      "Belo Horizonte, MG": 0.06,
    };
    factor *= map[filters.cidade] || 0.2;
    offset += 4;
  }
  if (filters.hospedagem && filters.hospedagem !== "Todas") {
    const map: Record<string, number> = {
      Hotéis: 0.48,
      Resorts: 0.22,
      Aluguel: 0.15,
      Parentes: 0.07,
    };
    factor *= map[filters.hospedagem] || 0.25;
    offset += 2;
  }
  if (filters.transporte && filters.transporte !== "Todos") {
    const map: Record<string, number> = {
      Carro: 0.72,
      Ônibus: 0.18,
      Avião: 0.1,
    };
    factor *= map[filters.transporte] || 0.3;
    offset += 3;
  }
  if (filters.localPesquisa && filters.localPesquisa !== "Todos") {
    const map: Record<string, number> = {
      "Thermas dos Laranjais": 0.52,
      "Hot Beach": 0.31,
      "Praça da Matriz": 0.17,
    };
    factor *= map[filters.localPesquisa] || 0.35;
    offset += 1;
  }
  if (filters.periodo && filters.periodo !== "Jan a out 2026" && filters.periodo !== "Outubro de 2026") {
    if (filters.periodo === "Últimos 30 dias") factor *= 0.18;
    if (filters.periodo === "Ano 2025") factor *= 1.58;
  }

  const isDefault = factor === 1.0 && offset === 0;
  const pesquisasColetadas = isDefault ? 2450 : Math.max(18, Math.round(2450 * factor));
  const permanenciaMedia = isDefault
    ? "3,2"
    : (3.2 + ((offset % 5) - 2) * 0.2).toFixed(1).replace(".", ",");
  const nps = isDefault ? 60 : Math.min(85, Math.max(35, 60 + ((offset % 7) - 3) * 2));
  const promotores = isDefault ? 70 : Math.min(88, Math.max(50, nps + 10));
  const detratores = isDefault ? 10 : Math.max(4, promotores - nps);
  const neutros = Math.max(0, 100 - promotores - detratores);

  const gastoMedio = isDefault ? 350 : Math.round(350 * (1 + ((offset % 5) - 2) * 0.06));

  return {
    isDefault,
    panorama: {
      pesquisasColetadas,
      crescimentoMes: isDefault ? "+5% neste mês" : `+${3 + (offset % 6)}% no recorte`,
      permanenciaMedia,
      nps,
      promotores,
      neutros,
      detratores,
      sazonalidade: [
        { mes: "Jan", valor: Math.round(42 * (isDefault ? 1 : 0.7 + (offset % 4) * 0.1)) },
        { mes: "Fev", valor: Math.round(46 * (isDefault ? 1 : 0.7 + (offset % 4) * 0.1)) },
        { mes: "Mar", valor: Math.round(52 * (isDefault ? 1 : 0.7 + (offset % 4) * 0.1)) },
        { mes: "Abr", valor: Math.round(56 * (isDefault ? 1 : 0.7 + (offset % 4) * 0.1)) },
        { mes: "Mai", valor: Math.round(64 * (isDefault ? 1 : 0.7 + (offset % 4) * 0.1)) },
        { mes: "Jun", valor: Math.round(69 * (isDefault ? 1 : 0.7 + (offset % 4) * 0.1)) },
        { mes: "Jul", valor: Math.round(92 * (isDefault ? 1 : 0.7 + (offset % 4) * 0.1)) },
        { mes: "Ago", valor: Math.round(98 * (isDefault ? 1 : 0.7 + (offset % 4) * 0.1)) },
        { mes: "Set", valor: Math.round(78 * (isDefault ? 1 : 0.7 + (offset % 4) * 0.1)) },
        { mes: "Out", valor: Math.round(70 * (isDefault ? 1 : 0.7 + (offset % 4) * 0.1)) },
        { mes: "Nov", valor: Math.round(55 * (isDefault ? 1 : 0.7 + (offset % 4) * 0.1)) },
        { mes: "Dez", valor: Math.round(47 * (isDefault ? 1 : 0.7 + (offset % 4) * 0.1)) },
      ],
      origensEstados: [
        { uf: "SP", percentual: isDefault ? 42 : Math.min(75, 42 + (offset % 8)) },
        { uf: "MG", percentual: isDefault ? 20 : Math.max(10, 20 - (offset % 5)) },
        { uf: "PR", percentual: isDefault ? 12 : Math.max(6, 12 - (offset % 4)) },
        { uf: "RJ · GO · SC", detalhe: "8% · 6% · 4%", percentual: 10 },
      ],
      visitanteRecorrente: {
        sim: isDefault ? 58 : Math.min(78, 58 + (offset % 9)),
        nao: isDefault ? 42 : Math.max(22, 42 - (offset % 9)),
      },
      intencaoRetorno: isDefault ? 82 : Math.min(94, 82 + (offset % 7)),
    },
    infraestrutura: {
      servicos: [
        { nome: "Hospitalidade", nota: 4.7, cor: "teal" },
        { nome: "Segurança", nota: 4.2, cor: "teal" },
        { nome: "Informações turísticas", nota: 4.0, cor: "teal" },
        { nome: "Limpeza", nota: 3.9, cor: "teal" },
        { nome: "Sinalização", nota: 3.5, cor: "teal" },
        { nome: "Condições das vias", nota: 3.3, cor: "amber" },
        { nome: "Acessibilidade", nota: 2.8, cor: "red" },
      ],
      expectativa: {
        superou: 18,
        atendeu: 64,
        naoAtendeu: 18,
      },
      gruposPcd: isDefault ? 12 : Math.max(6, 12 + ((offset % 5) - 2)),
      sentimentos: [
        {
          tipo: "Positivo",
          texto: '"A hospitalidade foi o ponto alto."',
          cor: "green",
        },
        {
          tipo: "Neutro",
          texto: '"Faltam opções de Wi-Fi em alguns pontos."',
          cor: "slate",
        },
        {
          tipo: "Negativo",
          texto: '"Calçadas irregulares dificultaram a circulação."',
          cor: "red",
        },
      ],
    },
    impactoEconomico: {
      gastoDiarioMedio: gastoMedio,
      rendaMaisComum: "3 a 5 salários",
      percentualRendaMaisComum: isDefault ? 40 : 38 + (offset % 6),
      antecedenciaMediaDias: isDefault ? 30 : 25 + (offset % 10),
      gastoPorRenda: [
        { faixa: "Até 2 salários", valor: Math.round(225 * (gastoMedio / 350)), percentualBarra: 24 },
        { faixa: "2 a 3 salários", valor: Math.round(325 * (gastoMedio / 350)), percentualBarra: 36 },
        { faixa: "3 a 5 salários", valor: Math.round(450 * (gastoMedio / 350)), percentualBarra: 52 },
        { faixa: "5 a 10 salários", valor: Math.round(700 * (gastoMedio / 350)), percentualBarra: 74 },
      ],
      antecedenciaDistribuicao: [
        { faixa: "< 1 semana", percentual: 35 },
        { faixa: "1 a 2 semanas", percentual: 30 },
        { faixa: "15 dias a 3 m", percentual: 25 },
        { faixa: "> 3 meses", percentual: 10 },
      ],
      tipoHospedagem: [
        { rotulo: "Hotéis", percentual: 48 },
        { rotulo: "Resorts", percentual: 22 },
        { rotulo: "Aluguel", percentual: 15 },
        { rotulo: "Parentes", percentual: 7 },
      ],
      ondeRefeicoes: [
        { rotulo: "Restaurantes", percentual: 58 },
        { rotulo: "Hotel", percentual: 22 },
        { rotulo: "Parques", percentual: 20 },
      ],
    },
    perfilTurista: {
      composicaoEtaria: [
        { faixa: "0 a 12", percentual: 8 },
        { faixa: "13 a 17", percentual: 12 },
        { faixa: "18 a 29", percentual: 30 },
        { faixa: "30 a 44", percentual: 35 },
        { faixa: "45+", percentual: 15 },
      ],
      origensCidades: [
        {
          cidadeUf: "São Paulo, SP",
          respostas: isDefault ? 1323 : Math.max(10, Math.round(1323 * factor)),
          percentual: "54%",
          diariaMedia: "R$ 396",
        },
        {
          cidadeUf: "Campinas, SP",
          respostas: isDefault ? 294 : Math.max(4, Math.round(294 * factor)),
          percentual: "12%",
          diariaMedia: "R$ 312",
        },
        {
          cidadeUf: "Ribeirão Preto, SP",
          respostas: isDefault ? 196 : Math.max(3, Math.round(196 * factor)),
          percentual: "8%",
          diariaMedia: "R$ 360",
        },
        {
          cidadeUf: "Belo Horizonte, MG",
          respostas: isDefault ? 147 : Math.max(2, Math.round(147 * factor)),
          percentual: "6%",
          diariaMedia: "R$ 340",
        },
      ],
      escolaridade: [
        { nivel: "Graduação", percentual: 44 },
        { nivel: "Médio", percentual: 38 },
        { nivel: "Pós", percentual: 18 },
      ],
      estadoCivil: [
        { estado: "Casado", percentual: 58 },
        { estado: "Solteiro", percentual: 32 },
        { estado: "Outros", percentual: 10 },
      ],
      comoConheceu: [
        { canal: "Internet", percentual: 62 },
        { canal: "Amigos", percentual: 21 },
        { canal: "Agência", percentual: 7 },
      ],
      motivacoes: [
        { motivo: "Parques", percentual: 78 },
        { motivo: "Descanso", percentual: 58 },
        { motivo: "Familiares", percentual: 24 },
      ],
      concorrencia: ["Caldas Novas", "Ubatuba", "Praia Grande", "Porto Seguro"],
    },
    atracoes: {
      pontosQuadrante: [
        { nome: "Parque A*", visitas: 360, nota: 4.8, x: 86, y: 20, cor: "teal" },
        { nome: "Praça central*", visitas: 210, nota: 4.6, x: 61, y: 28, cor: "teal" },
        { nome: "Museu municipal*", visitas: 185, nota: 4.5, x: 34, y: 26, cor: "teal" },
        { nome: "Feira Gastronômica*", visitas: 285, nota: 3.9, x: 69, y: 54, cor: "teal" },
        { nome: "Mirante Municipal*", visitas: 195, nota: 4.1, x: 45, y: 44, cor: "teal" },
        { nome: "Centro de Artesanato*", visitas: 120, nota: 3.4, x: 23, y: 56, cor: "amber" },
        { nome: "Terminal Turístico*", visitas: 80, nota: 2.5, x: 14, y: 78, cor: "red" },
      ],
      maisBemAvaliadas: [
        { nome: "Parque A*", nota: "4,8", visitas: isDefault ? 360 : Math.max(15, Math.round(360 * factor)) },
        { nome: "Praça central*", nota: "4,6", visitas: isDefault ? 210 : Math.max(10, Math.round(210 * factor)) },
        { nome: "Museu municipal*", nota: "4,5", visitas: isDefault ? 185 : Math.max(8, Math.round(185 * factor)) },
      ],
      meioChegar: [
        { meio: "Carro", percentual: 72 },
        { meio: "Ônibus", percentual: 18 },
        { meio: "Avião", percentual: 10 },
      ],
      doAeroporto: ["Transfer", "Aplicativo", "Táxi", "Veículo alugado"],
    },
  };
}
