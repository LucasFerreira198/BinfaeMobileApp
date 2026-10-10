import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Item,
  Group,
  Subgroup,
  Location,
  StockMetrics,
  FilterState,
  Cautela,
  Pendencia,
  Military,
  RelatorioDiario,
  InformaticaConfig,
} from '../types';

const STORAGE_KEY_ITEMS = '@binfae_db_items';
const STORAGE_KEY_GROUPS = '@binfae_db_groups';
const STORAGE_KEY_SUBGROUPS = '@binfae_db_subgroups';
const STORAGE_KEY_LOCATIONS = '@binfae_db_locations';
const STORAGE_KEY_CAUTELAS = '@binfae_db_cautelas';
const STORAGE_KEY_PENDENCIAS = '@binfae_db_pendencias';
const STORAGE_KEY_MILITARES = '@binfae_db_militares';
const STORAGE_KEY_RELATORIO = '@binfae_db_relatorio_diario';
const STORAGE_KEY_RELATORIO_PREFIX = '@binfae_db_relatorio_';
const STORAGE_KEY_DRAFT_PREFIX = '@binfae_draft_ocorrencias_';
const STORAGE_KEY_CONFIG_TI = '@binfae_db_config_ti';
const STORAGE_KEY_LAST_SYNC = '@binfae_db_last_sync';

// Cache em memória de altíssima performance para resposta imediata em 0ms
let memoryItems: Item[] = [];
let memoryGroups: Group[] = [];
let memorySubgroups: Subgroup[] = [];
let memoryLocations: Location[] = [];
let memoryCautelas: Cautela[] = [];
let memoryPendencias: Pendencia[] = [];
let memoryMilitares: Military[] = [];
let memoryRelatorio: RelatorioDiario | null = null;
const memoryRelatoriosPorData: Record<string, RelatorioDiario> = {};
const memoryDraftOcorrencias: Record<string, string> = {};
let memoryConfigTI: InformaticaConfig | null = null;
let lastSyncTimestamp: number | null = null;

export const loadLocalDatabase = async (): Promise<{
  items: Item[];
  groups: Group[];
  subgroups: Subgroup[];
  locations: Location[];
  cautelas: Cautela[];
  pendencias: Pendencia[];
  militares: Military[];
  relatorio: RelatorioDiario | null;
  configTI: InformaticaConfig | null;
  lastSync: number | null;
}> => {
  try {
    const [
      rawItems,
      rawGroups,
      rawSubgroups,
      rawLocations,
      rawSync,
      rawCautelas,
      rawPendencias,
      rawMilitares,
      rawRelatorio,
      rawConfigTI,
    ] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_ITEMS),
      AsyncStorage.getItem(STORAGE_KEY_GROUPS),
      AsyncStorage.getItem(STORAGE_KEY_SUBGROUPS),
      AsyncStorage.getItem(STORAGE_KEY_LOCATIONS),
      AsyncStorage.getItem(STORAGE_KEY_LAST_SYNC),
      AsyncStorage.getItem(STORAGE_KEY_CAUTELAS),
      AsyncStorage.getItem(STORAGE_KEY_PENDENCIAS),
      AsyncStorage.getItem(STORAGE_KEY_MILITARES),
      AsyncStorage.getItem(STORAGE_KEY_RELATORIO),
      AsyncStorage.getItem(STORAGE_KEY_CONFIG_TI),
    ]);

    if (rawItems) memoryItems = JSON.parse(rawItems);
    if (rawGroups) memoryGroups = JSON.parse(rawGroups);
    if (rawSubgroups) memorySubgroups = JSON.parse(rawSubgroups);
    if (rawLocations) memoryLocations = JSON.parse(rawLocations);
    if (rawSync) lastSyncTimestamp = parseInt(rawSync, 10);
    if (rawCautelas) memoryCautelas = JSON.parse(rawCautelas);
    if (rawPendencias) memoryPendencias = JSON.parse(rawPendencias);
    if (rawMilitares) memoryMilitares = JSON.parse(rawMilitares);
    if (rawRelatorio) memoryRelatorio = JSON.parse(rawRelatorio);
    if (rawConfigTI) memoryConfigTI = JSON.parse(rawConfigTI);

    return {
      items: memoryItems,
      groups: memoryGroups,
      subgroups: memorySubgroups,
      locations: memoryLocations,
      cautelas: memoryCautelas,
      pendencias: memoryPendencias,
      militares: memoryMilitares,
      relatorio: memoryRelatorio,
      configTI: memoryConfigTI,
      lastSync: lastSyncTimestamp,
    };
  } catch (err) {
    console.warn('Erro ao carregar banco local do celular:', err);
    return {
      items: memoryItems,
      groups: memoryGroups,
      subgroups: memorySubgroups,
      locations: memoryLocations,
      cautelas: memoryCautelas,
      pendencias: memoryPendencias,
      militares: memoryMilitares,
      relatorio: memoryRelatorio,
      configTI: memoryConfigTI,
      lastSync: lastSyncTimestamp,
    };
  }
};

export const persistLocalDatabase = async (
  items: Item[],
  groups?: Group[],
  locations?: Location[],
  subgroups?: Subgroup[]
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

  if (subgroups) {
    memorySubgroups = subgroups;
    promises.push(AsyncStorage.setItem(STORAGE_KEY_SUBGROUPS, JSON.stringify(subgroups)));
  }

  if (locations) {
    memoryLocations = locations;
    promises.push(AsyncStorage.setItem(STORAGE_KEY_LOCATIONS, JSON.stringify(locations)));
  }

  await Promise.all(promises);
};

export const persistLocalCautelas = async (cautelas: Cautela[]): Promise<void> => {
  memoryCautelas = cautelas;
  try {
    await AsyncStorage.setItem(STORAGE_KEY_CAUTELAS, JSON.stringify(cautelas));
  } catch (_) {}
};

export const loadLocalCautelas = async (): Promise<Cautela[]> => {
  if (memoryCautelas.length > 0) return memoryCautelas;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_CAUTELAS);
    if (raw) memoryCautelas = JSON.parse(raw);
  } catch (_) {}
  return memoryCautelas;
};

export const getLocalCautelas = (): Cautela[] => memoryCautelas;

export const persistLocalPendencias = async (pendencias: Pendencia[]): Promise<void> => {
  memoryPendencias = pendencias;
  try {
    await AsyncStorage.setItem(STORAGE_KEY_PENDENCIAS, JSON.stringify(pendencias));
  } catch (_) {}
};

export const loadLocalPendencias = async (): Promise<Pendencia[]> => {
  if (memoryPendencias.length > 0) return memoryPendencias;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_PENDENCIAS);
    if (raw) memoryPendencias = JSON.parse(raw);
  } catch (_) {}
  return memoryPendencias;
};

export const getLocalPendencias = (): Pendencia[] => memoryPendencias;

export const persistLocalMilitares = async (militares: Military[]): Promise<void> => {
  memoryMilitares = militares;
  try {
    await AsyncStorage.setItem(STORAGE_KEY_MILITARES, JSON.stringify(militares));
  } catch (_) {}
};

export const loadLocalMilitares = async (): Promise<Military[]> => {
  if (memoryMilitares.length > 0) return memoryMilitares;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_MILITARES);
    if (raw) memoryMilitares = JSON.parse(raw);
  } catch (_) {}
  return memoryMilitares;
};

export const getLocalMilitares = (): Military[] => memoryMilitares;

export const persistLocalRelatorio = async (relatorio: RelatorioDiario, dataStr?: string): Promise<void> => {
  memoryRelatorio = relatorio;
  const promises: Promise<any>[] = [];
  try {
    promises.push(AsyncStorage.setItem(STORAGE_KEY_RELATORIO, JSON.stringify(relatorio)));
  } catch (_) {}

  const keyDate = dataStr || (relatorio?.data_referencia ? relatorio.data_referencia.substring(0, 10) : undefined);
  if (keyDate) {
    memoryRelatoriosPorData[keyDate] = relatorio;
    try {
      promises.push(AsyncStorage.setItem(STORAGE_KEY_RELATORIO_PREFIX + keyDate, JSON.stringify(relatorio)));
    } catch (_) {}
  }
  await Promise.all(promises);
};

export const persistLocalRelatorioByDate = async (dataStr: string, relatorio: RelatorioDiario): Promise<void> => {
  return persistLocalRelatorio(relatorio, dataStr);
};

export const getLocalRelatorioByDate = (dataStr: string): RelatorioDiario | null => {
  if (memoryRelatoriosPorData[dataStr]) {
    return memoryRelatoriosPorData[dataStr];
  }
  if (memoryRelatorio && memoryRelatorio.data_referencia && memoryRelatorio.data_referencia.startsWith(dataStr)) {
    return memoryRelatorio;
  }
  return null;
};

export const loadLocalRelatorioByDate = async (dataStr: string): Promise<RelatorioDiario | null> => {
  if (memoryRelatoriosPorData[dataStr]) {
    return memoryRelatoriosPorData[dataStr];
  }
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_RELATORIO_PREFIX + dataStr);
    if (raw) {
      const parsed: RelatorioDiario = JSON.parse(raw);
      memoryRelatoriosPorData[dataStr] = parsed;
      return parsed;
    }
  } catch (_) {}

  if (memoryRelatorio && memoryRelatorio.data_referencia && memoryRelatorio.data_referencia.startsWith(dataStr)) {
    return memoryRelatorio;
  }
  return null;
};

export const invalidateLocalRelatorio = async (dataStr?: string): Promise<void> => {
  if (dataStr) {
    delete memoryRelatoriosPorData[dataStr];
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_RELATORIO_PREFIX + dataStr);
    } catch (_) {}
  } else {
    for (const k in memoryRelatoriosPorData) {
      delete memoryRelatoriosPorData[k];
    }
    memoryRelatorio = null;
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_RELATORIO);
    } catch (_) {}
  }
};

export const loadLocalRelatorio = async (): Promise<RelatorioDiario | null> => {
  if (memoryRelatorio) return memoryRelatorio;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_RELATORIO);
    if (raw) memoryRelatorio = JSON.parse(raw);
  } catch (_) {}
  return memoryRelatorio;
};

export const getLocalRelatorio = (): RelatorioDiario | null => memoryRelatorio;

// --- PERSISTÊNCIA DE RASCUNHO DE OCORRÊNCIAS (DIGITAÇÃO DO MILITAR) ---
export const saveLocalDraftOcorrencias = async (dataStr: string, ocorrencias: string): Promise<void> => {
  memoryDraftOcorrencias[dataStr] = ocorrencias;
  try {
    await AsyncStorage.setItem(STORAGE_KEY_DRAFT_PREFIX + dataStr, ocorrencias);
  } catch (_) {}
};

export const getLocalDraftOcorrencias = (dataStr: string): string | null => {
  return memoryDraftOcorrencias[dataStr] !== undefined ? memoryDraftOcorrencias[dataStr] : null;
};

export const loadLocalDraftOcorrencias = async (dataStr: string): Promise<string | null> => {
  if (memoryDraftOcorrencias[dataStr] !== undefined) {
    return memoryDraftOcorrencias[dataStr];
  }
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_DRAFT_PREFIX + dataStr);
    if (raw !== null) {
      memoryDraftOcorrencias[dataStr] = raw;
      return raw;
    }
  } catch (_) {}
  return null;
};

export const clearLocalDraftOcorrencias = async (dataStr: string): Promise<void> => {
  delete memoryDraftOcorrencias[dataStr];
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_DRAFT_PREFIX + dataStr);
  } catch (_) {}
};

export const persistLocalConfigTI = async (cfg: InformaticaConfig): Promise<void> => {
  memoryConfigTI = cfg;
  try {
    await AsyncStorage.setItem(STORAGE_KEY_CONFIG_TI, JSON.stringify(cfg));
  } catch (_) {}
};

export const loadLocalConfigTI = async (): Promise<InformaticaConfig | null> => {
  if (memoryConfigTI) return memoryConfigTI;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_CONFIG_TI);
    if (raw) memoryConfigTI = JSON.parse(raw);
  } catch (_) {}
  return memoryConfigTI;
};

export const getLocalConfigTI = (): InformaticaConfig | null => memoryConfigTI;

export const getLocalItems = (): Item[] => memoryItems;
export const getLocalGroups = (): Group[] => memoryGroups;
export const getLocalSubgroups = (): Subgroup[] => memorySubgroups;
export const getLocalLocations = (): Location[] => memoryLocations;
export const getLastSyncTime = (): number | null => lastSyncTimestamp;

/**
 * Retorna o conjunto de IDs do local e de todas as suas ramificações (sublocais recursivos)
 */
export const getDescendantLocationIds = (rootId: number, locs: Location[]): Set<number> => {
  const ids = new Set<number>([rootId]);
  const addChildren = (parentId: number) => {
    for (const loc of locs) {
      if (loc.parent_id === parentId && !ids.has(loc.id)) {
        ids.add(loc.id);
        addChildren(loc.id);
      }
    }
  };
  addChildren(rootId);
  return ids;
};

/**
 * Formata o caminho do local em linguagem natural amigável
 * Ex: "Prateleira 1, Armário 1 do Depósito"
 */
export const formatLocationFriendlyName = (
  loc?: Location | null,
  allLocations?: Location[] | null
): string => {
  if (!loc || typeof loc !== 'object') return '';
  const initialName = loc.nome || 'Local';
  const chain: string[] = [initialName];
  let currentParentId = loc.parent_id;
  let safetyCounter = 0;

  if (Array.isArray(allLocations)) {
    while (currentParentId && safetyCounter < 15) {
      safetyCounter++;
      const parent = allLocations.find((l) => l && l.id === currentParentId);
      if (parent && parent.nome) {
        chain.push(parent.nome);
        currentParentId = parent.parent_id;
      } else {
        break;
      }
    }
  }

  if (chain.length === 1) {
    return chain[0];
  }

  const leaf = chain[0];
  const middle = chain.slice(1, -1);
  const root = chain[chain.length - 1];

  if (middle.length === 0) {
    return `${leaf} do ${root}`;
  }
  return `${leaf}, ${middle.join(', ')} do ${root}`;
};

/**
 * Filtro instantâneo em 0ms com busca ampla em RAM
 */
export const filterLocalItems = (filters: FilterState): Item[] => {
  const query = filters.search.trim().toLowerCase();
  const statusFilter = filters.status;
  const groupId = filters.groupId;
  const subgroupId = filters.subgroupId;
  const locationId = filters.locationId;
  const lowStockOnly = filters.lowStockOnly;

  // Se houver filtro de local, obtém o local e todos os seus filhos (ramificações)
  const allowedLocationIds = locationId !== null ? getDescendantLocationIds(locationId, memoryLocations) : null;

  return memoryItems.filter((item) => {
    // 1. Filtro por status
    if (statusFilter && item.status !== statusFilter) {
      return false;
    }

    // 2. Filtro por grupo
    if (groupId !== null) {
      const itemGroupId = item.subgrupo?.grupo_id ?? item.subgrupo?.grupo?.id;
      if (itemGroupId !== groupId) {
        return false;
      }
    }

    // 3. Filtro por subgrupo
    if (subgroupId !== null && item.subgrupo_id !== subgroupId) {
      return false;
    }

    // 4. Filtro por local (local selecionado ou qualquer ramificação dentro dele)
    if (allowedLocationIds !== null) {
      if (!item.local_id || !allowedLocationIds.has(item.local_id)) {
        return false;
      }
    }

    // 5. Filtro por estoque baixo
    if (lowStockOnly) {
      if (item.tipo_controle !== 'GRANEL' || item.quantidade > item.quantidade_minima) {
        return false;
      }
    }

    // 6. Busca textual ampla em 0ms (nome, BMP, código interno, serial, observações)
    if (query.length > 0) {
      const matchName = item.nome?.toLowerCase().includes(query);
      const matchBmp = item.bmp?.toLowerCase().includes(query);
      const matchCode = item.codigo_interno?.toLowerCase().includes(query);
      const matchSerial = item.numero_serie?.toLowerCase().includes(query);
      const matchObs = item.observacoes?.toLowerCase().includes(query);
      const matchLocal = item.local?.nome?.toLowerCase().includes(query) || item.local?.caminho_completo?.toLowerCase().includes(query);
      const matchSub = item.subgrupo?.nome?.toLowerCase().includes(query);
      const matchGroup = item.subgrupo?.grupo?.nome?.toLowerCase().includes(query);

      if (!matchName && !matchBmp && !matchCode && !matchSerial && !matchObs && !matchLocal && !matchSub && !matchGroup) {
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
