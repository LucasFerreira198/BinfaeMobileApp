import AsyncStorage from '@react-native-async-storage/async-storage';
import { Item, Group, Location, StockMetrics, FilterState } from '../types';

const STORAGE_KEY_ITEMS = '@binfae_db_items';
const STORAGE_KEY_GROUPS = '@binfae_db_groups';
const STORAGE_KEY_LOCATIONS = '@binfae_db_locations';
const STORAGE_KEY_LAST_SYNC = '@binfae_db_last_sync';

// Cache em memória de alta performance para resposta em 0ms
let memoryItems: Item[] = [];
let memoryGroups: Group[] = [];
let memoryLocations: Location[] = [];
let lastSyncTimestamp: number | null = null;

export const loadLocalDatabase = async (): Promise<{
  items: Item[];
  groups: Group[];
  locations: Location[];
  lastSync: number | null;
}> => {
  try {
    const [rawItems, rawGroups, rawLocations, rawSync] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_ITEMS),
      AsyncStorage.getItem(STORAGE_KEY_GROUPS),
      AsyncStorage.getItem(STORAGE_KEY_LOCATIONS),
      AsyncStorage.getItem(STORAGE_KEY_LAST_SYNC),
    ]);

    if (rawItems) memoryItems = JSON.parse(rawItems);
    if (rawGroups) memoryGroups = JSON.parse(rawGroups);
    if (rawLocations) memoryLocations = JSON.parse(rawLocations);
    if (rawSync) lastSyncTimestamp = parseInt(rawSync, 10);

    return {
      items: memoryItems,
      groups: memoryGroups,
      locations: memoryLocations,
      lastSync: lastSyncTimestamp,
    };
  } catch (err) {
    console.warn('Erro ao carregar banco local do celular:', err);
    return {
      items: memoryItems,
      groups: memoryGroups,
      locations: memoryLocations,
      lastSync: lastSyncTimestamp,
    };
  }
};

export const persistLocalDatabase = async (
  items: Item[],
  groups?: Group[],
  locations?: Location[]
): Promise<void> => {
  memoryItems = items;
  lastSyncTimestamp = Date.now();

  const promises: Promise<any>[] = [
    AsyncStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items)),
    AsyncStorage.setItem(STORAGE_KEY_LAST_SYNC, lastSyncTimestamp.toString()),
  ];

  if (groups) {
    memoryGroups = groups;
    promises.push(AsyncStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(groups)));
  }

  if (locations) {
    memoryLocations = locations;
    promises.push(AsyncStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(locations)));
  }

  await Promise.all(promises);
};

export const getLocalItems = (): Item[] => memoryItems;
export const getLocalGroups = (): Group[] => memoryGroups;
export const getLocalLocations = (): Location[] => memoryLocations;
export const getLastSyncTime = (): number | null => lastSyncTimestamp;

/**
 * Filtro instantâneo em 0ms com busca ampla em RAM
 */
export const filterLocalItems = (filters: FilterState): Item[] => {
  const query = filters.search.trim().toLowerCase();
  const statusFilter = filters.status;
  const subgroupId = filters.subgroupId;
  const locationId = filters.locationId;
  const lowStockOnly = filters.lowStockOnly;

  return memoryItems.filter((item) => {
    // 1. Filtro por status
    if (statusFilter && item.status !== statusFilter) {
      return false;
    }

    // 2. Filtro por subgrupo
    if (subgroupId !== null && item.subgrupo_id !== subgroupId) {
      return false;
    }

    // 3. Filtro por local
    if (locationId !== null && item.local_id !== locationId) {
      return false;
    }

    // 4. Filtro por estoque baixo
    if (lowStockOnly) {
      if (item.tipo_controle !== 'GRANEL' || item.quantidade > item.quantidade_minima) {
        return false;
      }
    }

    // 5. Busca textual ampla em 0ms (nome, BMP, código interno, serial, observações)
    if (query.length > 0) {
      const matchName = item.nome?.toLowerCase().includes(query);
      const matchBmp = item.bmp?.toLowerCase().includes(query);
      const matchCode = item.codigo_interno?.toLowerCase().includes(query);
      const matchSerial = item.numero_serie?.toLowerCase().includes(query);
      const matchObs = item.observacoes?.toLowerCase().includes(query);
      const matchLocal = item.local?.nome?.toLowerCase().includes(query);
      const matchSub = item.subgrupo?.nome?.toLowerCase().includes(query);

      if (!matchName && !matchBmp && !matchCode && !matchSerial && !matchObs && !matchLocal && !matchSub) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Cálculo instantâneo das métricas de estoque a partir da memória
 */
export const calculateMetrics = (items: Item[]): StockMetrics => {
  let total = 0;
  let disponivel = 0;
  let cautelado = 0;
  let manutencao = 0;
  let baixoEstoque = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    total += 1;
    if (item.status === 'DISPONIVEL') disponivel += 1;
    else if (item.status === 'CAUTELADO') cautelado += 1;
    else if (item.status === 'EM_MANUTENCAO') manutencao += 1;

    if (item.tipo_controle === 'GRANEL' && item.quantidade <= item.quantidade_minima) {
      baixoEstoque += 1;
    }
  }

  return { total, disponivel, cautelado, manutencao, baixoEstoque };
};
