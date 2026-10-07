import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  Item,
  Group,
  Subgroup,
  Location,
  ItemMovement,
  ItemCreateInput,
  Military,
  Cautela,
  CautelaItem,
  Pendencia,
  EscalaMensal,
  RelatorioDiario,
} from '../types';

export const DEFAULT_API_BASE = 'https://backend-info-binfae.vercel.app';
const API_URL_KEY = '@binfae_api_url';
const TOKEN_KEY = '@binfae_token';
const REFRESH_TOKEN_KEY = '@binfae_refresh_token';
const LOGIN_TIMESTAMP_KEY = '@binfae_login_timestamp';

let currentApiBase = DEFAULT_API_BASE;
let currentToken: string | null = null;
let currentRefreshToken: string | null = null;
let currentLoginTimestamp: string | null = null;

export const clearAuthSession = async (): Promise<void> => {
  currentToken = null;
  currentRefreshToken = null;
  currentLoginTimestamp = null;
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, LOGIN_TIMESTAMP_KEY, '@binfae_auth_user']);
};

export const initApiClient = async (): Promise<void> => {
  try {
    const savedUrl = await AsyncStorage.getItem(API_URL_KEY);
    if (savedUrl && savedUrl.trim().length > 0 && !savedUrl.includes('onrender.com')) {
      currentApiBase = savedUrl.trim().replace(/\/+$/, '');
    } else {
      currentApiBase = DEFAULT_API_BASE;
      if (savedUrl && savedUrl.includes('onrender.com')) {
        await AsyncStorage.setItem(API_URL_KEY, DEFAULT_API_BASE);
      }
    }
    currentLoginTimestamp = await AsyncStorage.getItem(LOGIN_TIMESTAMP_KEY);

    // Validação estrita de 24 horas no mobile
    if (currentLoginTimestamp) {
      const diffHours = (Date.now() - new Date(currentLoginTimestamp).getTime()) / (1000 * 60 * 60);
      if (diffHours >= 24) {
        await clearAuthSession();
        return;
      }
    }

    currentToken = await AsyncStorage.getItem(TOKEN_KEY);
    currentRefreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (err) {
    console.warn('Erro ao inicializar client API:', err);
  }
};

export const getApiBaseUrl = (): string => currentApiBase;

export const setApiBaseUrl = async (url: string): Promise<void> => {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  currentApiBase = cleanUrl;
  await AsyncStorage.setItem(API_URL_KEY, cleanUrl);
};

export const setAuthTokens = async (token: string | null, refreshToken?: string | null): Promise<void> => {
  currentToken = token;
  currentRefreshToken = refreshToken ?? null;

  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    if (!currentLoginTimestamp) {
      const nowStr = new Date().toISOString();
      currentLoginTimestamp = nowStr;
      await AsyncStorage.setItem(LOGIN_TIMESTAMP_KEY, nowStr);
    }
  } else {
    await clearAuthSession();
  }
};

export const setAuthToken = async (token: string | null): Promise<void> => {
  await setAuthTokens(token, currentRefreshToken);
};

export const getAuthToken = (): string | null => currentToken;
export const getRefreshToken = (): string | null => currentRefreshToken;

const refreshAccessToken = async (): Promise<boolean> => {
  if (!currentRefreshToken) return false;

  // Se tiver passado mais de 24 horas desde o login, não permite refresh
  if (currentLoginTimestamp) {
    const diffHours = (Date.now() - new Date(currentLoginTimestamp).getTime()) / (1000 * 60 * 60);
    if (diffHours >= 24) {
      await clearAuthSession();
      return false;
    }
  }

  try {
    const res = await fetch(`${currentApiBase}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ refresh_token: currentRefreshToken }),
    });

    if (res.ok) {
      const data = await res.json();
      currentToken = data.access_token;
      if (data.refresh_token) {
        currentRefreshToken = data.refresh_token;
      }
      await AsyncStorage.setItem(TOKEN_KEY, currentToken!);
      if (currentRefreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, currentRefreshToken);
      }
      return true;
    }
  } catch {}

  await clearAuthSession();
  return false;
};

const request = async <T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> => {
  const url = `${currentApiBase}${path.startsWith('/') ? path : '/' + path}`;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (currentToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 18000); // 18s timeout

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 401 && !isRetry) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return await request<T>(path, options, true);
      }
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    if (!response.ok) {
      let errorMsg = `Erro ${response.status}`;
      try {
        const errorJson = await response.json();
        errorMsg = errorJson.detail || errorJson.message || errorMsg;
      } catch {
        const text = await response.text();
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return await response.json() as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Tempo de requisição esgotado. Verifique sua conexão com a internet.');
    }
    throw err;
  }
};

export const api = {
  checkHealth: async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${currentApiBase}/`, { signal: controller.signal });
      clearTimeout(timeout);
      return res.status < 500;
    } catch {
      return false;
    }
  },

  login: async (identifier: string, password: string): Promise<{ access_token: string; refresh_token?: string; token_type: string }> => {
    const body = new URLSearchParams();
    body.append('username', identifier.trim());
    body.append('password', password);

    const res = await fetch(`${currentApiBase}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      let detail = 'SARAM/usuário ou senha incorretos.';
      try {
        const data = await res.json();
        if (data.detail) detail = data.detail;
      } catch {}
      throw new Error(detail);
    }

    return await res.json();
  },

  getMe: async (): Promise<User> => {
    return await request<User>('/auth/me');
  },

  updateMe: async (data: {
    foto_url?: string | null;
    password?: string | null;
    celular?: string | null;
    email?: string | null;
    nome_guerra?: string | null;
    secao?: string | null;
  }): Promise<User> => {
    return await request<User>('/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  fetchItems: async (): Promise<Item[]> => {
    return await request<Item[]>('/stock/items');
  },

  fetchGroups: async (): Promise<Group[]> => {
    return await request<Group[]>('/stock/groups');
  },

  fetchSubgroups: async (): Promise<Subgroup[]> => {
    return await request<Subgroup[]>('/stock/subgroups');
  },

  fetchLocations: async (): Promise<Location[]> => {
    return await request<Location[]>('/stock/locations');
  },

  createLocation: async (data: {
    nome: string;
    tipo?: string;
    descricao?: string;
    parent_id?: number | null;
  }): Promise<Location> => {
    return await request<Location>('/stock/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  updateLocation: async (
    id: number,
    data: {
      nome?: string;
      tipo?: string;
      descricao?: string;
      parent_id?: number | null;
    }
  ): Promise<Location> => {
    return await request<Location>(`/stock/locations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  fetchMovements: async (itemId?: number): Promise<ItemMovement[]> => {
    const path = itemId ? `/stock/movements?item_id=${itemId}` : '/stock/movements';
    return await request<ItemMovement[]>(path);
  },

  createItem: async (data: ItemCreateInput): Promise<Item> => {
    return await request<Item>('/stock/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  listUsers: async (): Promise<User[]> => {
    return await request<User[]>('/users/listUsers');
  },

  createUser: async (data: {
    username?: string;
    saram?: number;
    password: string;
    admin?: boolean;
    ativo?: boolean;
  }): Promise<User> => {
    return await request<User>('/users/createUser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  updateUser: async (
    identifier: number | string,
    data: {
      username?: string;
      password?: string;
      admin?: boolean;
      ativo?: boolean;
    }
  ): Promise<User> => {
    return await request<User>(`/users/update/${identifier}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  deleteUser: async (identifier: number | string): Promise<void> => {
    return await request<void>(`/users/delete/${identifier}`, {
      method: 'DELETE',
    });
  },

  listMilitary: async (): Promise<Military[]> => {
    return await request<Military[]>('/military/list');
  },

  createMilitary: async (data: {
    saram: number;
    nome_completo: string;
    posto_graduacao: string;
    nome_guerra: string;
    secao?: string;
    email?: string;
    celular?: string;
  }): Promise<Military> => {
    return await request<Military>('/military/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  updateMilitary: async (
    saram: number,
    data: {
      nome_completo?: string;
      posto_graduacao?: string;
      nome_guerra?: string;
      secao?: string;
      email?: string;
      celular?: string;
    }
  ): Promise<Military> => {
    return await request<Military>(`/military/update/${saram}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  createGroup: async (data: { nome: string; descricao?: string }): Promise<Group> => {
    return await request<Group>('/stock/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  updateGroup: async (
    groupId: number,
    data: { nome: string; descricao?: string }
  ): Promise<Group> => {
    return await request<Group>(`/stock/groups/${groupId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  deleteGroup: async (groupId: number): Promise<void> => {
    return await request<void>(`/stock/groups/${groupId}`, {
      method: 'DELETE',
    });
  },

  createSubgroup: async (data: {
    grupo_id: number;
    nome: string;
    descricao?: string;
  }): Promise<Subgroup> => {
    return await request<Subgroup>('/stock/subgroups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  updateSubgroup: async (
    subgroupId: number,
    data: { nome: string; grupo_id?: number; descricao?: string }
  ): Promise<Subgroup> => {
    return await request<Subgroup>(`/stock/subgroups/${subgroupId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  deleteSubgroup: async (subgroupId: number): Promise<void> => {
    return await request<void>(`/stock/subgroups/${subgroupId}`, {
      method: 'DELETE',
    });
  },

  getItemById: async (id: number): Promise<Item> => {
    return await request<Item>(`/stock/items/${id}`);
  },

  getItemQrCodeUrl: (itemId: number, includeLabel = false): string => {
    return `${currentApiBase}/stock/items/${itemId}/qrcode?include_label=${includeLabel}`;
  },

  moveItem: async (itemId: number, data: {
    destino_local_id?: number | null;
    tipo_movimentacao: string;
    quantidade_movimentada: number;
    motivo?: string;
  }): Promise<Item> => {
    return await request<Item>(`/stock/items/${itemId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  adjustStock: async (itemId: number, data: {
    nova_quantidade: number;
    motivo: string;
  }): Promise<Item> => {
    return await request<Item>(`/stock/items/${itemId}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // --- Cautelas de Materiais e Missões ---
  listCautelas: async (status?: string, tipo?: string): Promise<Cautela[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (tipo) params.append('tipo', tipo);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await request<Cautela[]>(`/cautelas${qs}`);
  },

  getCautela: async (id: number): Promise<Cautela> => {
    return await request<Cautela>(`/cautelas/${id}`);
  },

  createCautela: async (data: { nome: string; tipo?: 'MISSAO' | 'FIXA'; observacoes?: string }): Promise<Cautela> => {
    return await request<Cautela>('/cautelas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  addItemToCautela: async (cautelaId: number, data: {
    item_id?: number;
    item_code?: string;
    militar_saram: number;
    telefone_contato?: string;
    condicao_saida?: string;
    observacoes?: string;
  }): Promise<CautelaItem> => {
    return await request<CautelaItem>(`/cautelas/${cautelaId}/itens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  addBatchItemsToCautela: async (cautelaId: number, data: {
    militar_saram: number;
    telefone_contato?: string;
    itens_ids?: number[];
    itens_codes?: string[];
    condicao_saida?: string;
    observacoes?: string;
  }): Promise<CautelaItem[]> => {
    return await request<CautelaItem[]>(`/cautelas/${cautelaId}/itens/lote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  devolverItemCautela: async (cautelaId: number, itemId: number, data?: {
    condicao_retorno?: string;
    observacoes?: string;
  }): Promise<CautelaItem> => {
    return await request<CautelaItem>(`/cautelas/${cautelaId}/itens/${itemId}/devolver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    });
  },

  scanDevolverItem: async (code: string): Promise<CautelaItem> => {
    const encoded = encodeURIComponent(code.trim());
    return await request<CautelaItem>(`/cautelas/devolver/scan/${encoded}`, {
      method: 'POST',
    });
  },

  checkItemCautelaStatus: async (code: string): Promise<{
    item?: Item | null;
    cautelado: boolean;
    cautela?: any;
    militar?: any;
    militar_responsavel?: any;
    militar_saram?: number | null;
    telefone_contato?: string | null;
    data_cautela?: string | null;
    detalhes?: any;
  }> => {
    const encoded = encodeURIComponent(code.trim());
    return await request<any>(`/cautelas/item/${encoded}/status`);
  },

  getSyncStatus: async (): Promise<{
    status: string;
    stock_version: number;
    cautelas_version: number;
    version_token: string;
  }> => {
    return await request<any>('/system/sync-status');
  },

  // --- MÓDULO PENDÊNCIAS E METAS ---
  getPendencias: async (status?: string): Promise<Pendencia[]> => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return await request<Pendencia[]>(`/pendencias/list${query}`);
  },

  createPendencia: async (data: {
    titulo: string;
    descricao?: string | null;
    tipo?: string;
    prioridade?: string;
    prazo?: string | null;
    responsavel_saram?: number | null;
  }): Promise<Pendencia> => {
    return await request<Pendencia>('/pendencias/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  concluirPendencia: async (id: number, laudo?: string): Promise<Pendencia> => {
    return await request<Pendencia>(`/pendencias/${id}/concluir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resolucao: laudo || 'Concluído com sucesso',
        laudo_resolucao: laudo || 'Concluído com sucesso',
      }),
    });
  },

  baixarItemManutencao: async (pendenciaId: number, motivo: string): Promise<any> => {
    return await request<any>(`/pendencias/${pendenciaId}/baixar-item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        justificativa_baixa: motivo || 'Baixa por quebra/defeito irrecuperável',
        motivo: motivo || 'Baixa por quebra/defeito irrecuperável',
      }),
    });
  },

  // --- MÓDULO ESCALA DE SERVIÇO ---
  getEscalaMensal: async (mes: number, ano: number): Promise<EscalaMensal> => {
    return await request<EscalaMensal>(`/escalas/mensal?mes=${mes}&ano=${ano}`);
  },

  salvarEscalaMensal: async (data: {
    mes: number;
    ano: number;
    titulo?: string;
    dias: any[];
  }): Promise<EscalaMensal> => {
    return await request<EscalaMensal>('/escalas/salvar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  getMilitaresInformatica: async (): Promise<Military[]> => {
    return await request<Military[]>('/escalas/militares');
  },

  // --- MÓDULO RELATÓRIO DIÁRIO (24H) ---
  getRelatorioDiario: async (dataRef?: string): Promise<RelatorioDiario> => {
    const query = dataRef ? `?data_ref=${encodeURIComponent(dataRef)}` : '';
    return await request<RelatorioDiario>(`/relatorios-diarios/hoje${query}`);
  },

  salvarRascunhoRelatorio: async (id: number, ocorrencias: string): Promise<RelatorioDiario> => {
    return await request<RelatorioDiario>(`/relatorios-diarios/${id}/rascunho`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ocorrencias_militar: ocorrencias }),
    });
  },

  lancarRelatorioDiario: async (id: number, data: {
    ocorrencias_militar?: string;
    militar_servico_id?: number | null;
  }): Promise<RelatorioDiario> => {
    return await request<RelatorioDiario>(`/relatorios-diarios/${id}/lancar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
};
