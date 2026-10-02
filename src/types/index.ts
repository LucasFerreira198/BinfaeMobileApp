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

export interface Item {
  id: number;
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
  criado_em?: string;
  atualizado_em?: string;
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
