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
  publicacaoItens: ItemPublicacao[];
  ultimaPublicacao: string;
  metodoPublicacao: string;
  problemasImportacao: ProblemaImportacao[];
  importacaoConcluida: boolean;
  usuarios: UsuarioSistema[];
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

const initialStore: AppDataStore = {
  formularios: [
    buildFormularioSeed(1, "Pesquisa de Demanda Turística", 3, "Ativo", 5012, "01/01/2026 a 31/12/2026", "12/10/2026"),
    buildFormularioSeed(2, "Pesquisa de Demanda Turística", 2, "Encerrada", 3870, "01/01/2025 a 31/12/2025", "20/12/2025"),
    buildFormularioSeed(3, "Ocupação Hoteleira e Diária Média", 1, "Rascunho", 0, "não definida", "22/10/2026", 4),
    buildFormularioSeed(4, "Expectativa de Feriados", 1, "Agendado", 0, "a partir de 06/11/2026", "18/10/2026", 5),
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
};

// Global singleton in Node.js dev/prod runtime so mutations persist across requests
const globalForStore = globalThis as unknown as { __otoStore?: AppDataStore };
if (!globalForStore.__otoStore) {
  globalForStore.__otoStore = JSON.parse(JSON.stringify(initialStore));
}

export function getStore(): AppDataStore {
  return globalForStore.__otoStore!;
}
