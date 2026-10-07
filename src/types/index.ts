export interface Military {
  saram: number;
  nome_completo: string;
  nome_guerra: string;
  posto_graduacao: string;
  quadro_especialidade?: string | null;
  secao?: string | null;
  email?: string | null;
  emails?: string[];
  telefone?: string | null;
  celular?: string | null;
  ativo?: boolean;
  foto_url?: string | null;
  is_informatica?: boolean;
}

export interface User {
  id: number;
  username: string;
  admin: boolean;
  ativo: boolean;
  foto_url?: string | null;
  militar?: Military | null;
}

export interface Group {
  id: number;
  nome: string;
  descricao?: string | null;
}

export interface Subgroup {
  id: number;
  nome: string;
  descricao?: string | null;
  grupo_id: number;
  grupo?: Group | null;
}

export interface Location {
  id: number;
  nome: string;
  tipo?: string | null;
  descricao?: string | null;
  parent_id?: number | null;
  caminho_completo?: string | null;
}

export type ItemStatus = 'DISPONIVEL' | 'EM_USO' | 'EM_MANUTENCAO' | 'CAUTELADO' | 'BAIXADO';
export type ItemCondition = 'NOVO' | 'BOM' | 'REGULAR' | 'COM_DEFEITO' | 'SUCATA';
export type ControlType = 'UNITARIO' | 'GRANEL';

export interface ItemCautelaAtiva {
  id: number;
  cautela_id: number;
  missao_nome: string;
  tipo: 'MISSAO' | 'FIXA';
  militar_responsavel_saram: number;
  militar_nome_guerra: string;
  militar_posto_graduacao: string;
  militar_celular?: string | null;
  data_cautela: string;
}

export interface Item {
  id: number;
  uuid?: string | null;
  nome: string;
  bmp?: string | null;
  codigo_interno?: string | null;
  numero_serie?: string | null;
  tipo_controle: ControlType;
  quantidade: number;
  quantidade_minima: number;
  unidade_medida: string;
  estado_conservacao: ItemCondition;
  status: ItemStatus;
  observacoes?: string | null;
  caracteristicas?: Record<string, any>;
  subgrupo_id?: number | null;
  local_id?: number | null;
  parent_id?: number | null;
  local?: Location | null;
  subgrupo?: Subgroup | null;
  parent?: Item | null;
  componentes?: Item[];
  cautela_ativa?: ItemCautelaAtiva | null;
  criado_em?: string;
  atualizado_em?: string;
}

export interface CautelaItem {
  id: number;
  cautela_id: number;
  item_id: number;
  militar_saram: number;
  telefone_contato?: string | null;
  data_cautela: string;
  data_saida?: string;
  condicao_saida: string;
  data_devolucao?: string | null;
  condicao_retorno?: string | null;
  status: 'CAUTELADO' | 'EM_USO' | 'DEVOLVIDO' | string;
  recebido_por_id?: number | null;
  observacoes?: string | null;
  item?: Item | null;
  militar?: Military | null;
  militar_responsavel?: Military | null;
  usuario_entrega?: User | null;
  usuario_devolucao?: User | null;
  recebedor?: User | null;
}

export interface Cautela {
  id: number;
  nome: string;
  tipo: 'MISSAO' | 'FIXA';
  status: 'ATIVA' | 'CONCLUIDA';
  criado_por_id: number;
  data_inicio: string;
  data_fim?: string | null;
  observacoes?: string | null;
  criado_em?: string;
  criador?: User | null;
  itens: CautelaItem[];
  total_itens: number;
  itens_devolvidos: number;
  itens_pendentes: number;
}

export interface ItemCreateInput {
  nome: string;
  subgrupo_id: number;
  local_id?: number | null;
  parent_id?: number | null;
  bmp?: string | null;
  codigo_interno?: string | null;
  numero_serie?: string | null;
  tipo_controle?: ControlType;
  quantidade?: number;
  quantidade_minima?: number;
  unidade_medida?: string;
  estado_conservacao?: ItemCondition;
  status?: ItemStatus;
  observacoes?: string | null;
}

export interface ItemMovement {
  id: number;
  item_id: number;
  origem_local_id?: number | null;
  destino_local_id?: number | null;
  usuario_id?: number | null;
  tipo_movimentacao: string;
  quantidade_movimentada: number;
  data_hora?: string;
  motivo?: string | null;
  criado_em?: string;
  item_nome?: string;
  usuario_nome?: string;
  origem?: Location | null;
  destino?: Location | null;
  origem_nome?: string;
  destino_nome?: string;
}

export interface StockMetrics {
  total: number;
  disponivel: number;
  cautelado: number;
  manutencao: number;
  baixoEstoque: number;
}

export interface FilterState {
  search: string;
  status: string | null;
  groupId: number | null;
  subgroupId: number | null;
  locationId: number | null;
  lowStockOnly: boolean;
}

// --- MÓDULO PENDÊNCIAS & METAS ---
export type PendenciaStatus = 'PENDENTE' | 'CONCLUIDA' | 'CANCELADA';
export type PendenciaTipo = 'GERAL' | 'MANUTENCAO' | 'META' | 'INVENTARIO';
export type PendenciaPrioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export interface Pendencia {
  id: number;
  titulo: string;
  descricao?: string | null;
  tipo: PendenciaTipo;
  prioridade: PendenciaPrioridade;
  status: PendenciaStatus;
  item_id?: number | null;
  item_codigo?: string | null;
  item_nome?: string | null;
  responsavel_saram?: number | null;
  responsavel_nome?: string | null;
  prazo?: string | null;
  criado_por_id?: number | null;
  criado_por_nome?: string | null;
  laudo_resolucao?: string | null;
  concluido_por_nome?: string | null;
  concluido_em?: string | null;
  is_baixa_definitiva?: boolean;
  criado_em?: string;
  atualizado_em?: string;
}

// --- MÓDULO ESCALA DE SERVIÇO ---
export interface EscalaDia {
  id?: number;
  dia: number;
  dia_semana: string;
  is_weekend: boolean;
  is_feriado: boolean;
  feriado_nome?: string | null;
  militar_sv_id?: number | null;
  militar_sv_saram?: number | null;
  militar_sv_nome?: string | null;
  militar_sv_posto?: string | null;
  militar_expd_1_id?: number | null;
  militar_expd_1_nome?: string | null;
  militar_expd_2_id?: number | null;
  militar_expd_2_nome?: string | null;
}

export interface EstatisticaMilitar {
  militar_id: number;
  saram: number;
  nome_guerra: string;
  posto_graduacao: string;
  total_sv: number;
  total_expd: number;
  semana_1_sv: number;
  semana_2_sv: number;
  semana_3_sv: number;
  semana_4_sv: number;
  semana_5_sv: number;
}

export interface EscalaMensal {
  id?: number;
  mes: number;
  ano: number;
  titulo: string;
  status: string;
  dias: EscalaDia[];
  estatisticas?: EstatisticaMilitar[];
}

// --- MÓDULO RELATÓRIO DIÁRIO (PASSAGEM 24H) ---
export interface RelatorioDiario {
  id?: number;
  data_referencia: string;
  periodo_inicio: string;
  periodo_fim: string;
  militar_servico_id?: number | null;
  militar_servico_nome?: string | null;
  militar_servico_posto?: string | null;
  status: 'RASCUNHO' | 'LANCADO';
  ocorrencias_militar?: string | null;
  dados_automaticos: {
    itens_manutencao?: any[];
    itens_consertados?: any[];
    itens_baixados?: any[];
    missoes_cautelas?: any[];
    cautelas_periodo?: any[];
    devolucoes_periodo?: any[];
    pendencias_criadas?: any[];
    pendencias_resolvidas?: any[];
    total_itens_manutencao?: number;
    total_itens_consertados?: number;
    total_itens_baixados?: number;
    total_missoes?: number;
    total_cautelas?: number;
    total_devolucoes?: number;
    total_pendencias_criadas?: number;
    total_pendencias_resolvidas?: number;
    // Compatibilidade com chaves legadas
    manutencoes_abertas?: any[];
    cautelas_abertas?: any[];
    cautelas_devolvidas?: any[];
    pendencias_concluidas?: any[];
    [key: string]: any;
  };
  lancado_em?: string | null;
  criado_em?: string;
}

