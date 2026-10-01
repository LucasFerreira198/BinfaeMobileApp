import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Item, Group, Location, ItemMovement } from '../types';

export const DEFAULT_API_BASE = 'https://systeminformaticabinfae.onrender.com';
const API_URL_KEY = '@binfae_api_url';
const TOKEN_KEY = '@binfae_token';

let currentApiBase = DEFAULT_API_BASE;
let currentToken: string | null = null;

export const initApiClient = async (): Promise<void> => {
  try {
    const savedUrl = await AsyncStorage.getItem(API_URL_KEY);
    if (savedUrl && savedUrl.trim().length > 0) {
      currentApiBase = savedUrl.trim().replace(/\/+$/, '');
    }
    const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      currentToken = savedToken;
    }
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

export const setAuthToken = async (token: string | null): Promise<void> => {
  currentToken = token;
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
};

export const getAuthToken = (): string | null => currentToken;

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
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

    if (response.status === 401) {
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

  login: async (identifier: string, password: string): Promise<{ access_token: string; token_type: string }> => {
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

  fetchItems: async (): Promise<Item[]> => {
    return await request<Item[]>('/stock/items');
  },

  fetchGroups: async (): Promise<Group[]> => {
    return await request<Group[]>('/stock/groups');
  },

  fetchLocations: async (): Promise<Location[]> => {
    return await request<Location[]>('/stock/locations');
  },

  getItemById: async (id: number): Promise<Item> => {
    return await request<Item>(`/stock/items/${id}`);
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
};
