export interface Military {
  saram: number;
  nome_completo: string;
  nome_guerra: string;
  posto_graduacao: string;
  quadro_especialidade?: string | null;
  secao?: string | null;
  email?: string | null;
  telefone?: string | null;
  celular?: string | null;
  ativo?: boolean;
}

export interface User {
  id: number;
  username: string;
  admin: boolean;
  ativo: boolean;
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
  condicao_saida: string;
  data_devolucao?: string | null;
  condicao_retorno?: string | null;
  status: 'EM_USO' | 'DEVOLVIDO';
  recebido_por_id?: number | null;
  observacoes?: string | null;
  item?: Item | null;
  militar?: Military | null;
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

