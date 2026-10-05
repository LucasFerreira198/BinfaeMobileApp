import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Item, Group, Subgroup, Location, StockMetrics, FilterState, ItemCreateInput } from '../types';
import {
  loadLocalDatabase,
  persistLocalDatabase,
  filterLocalItems,
  calculateMetrics,
} from '../storage/db';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

interface StockContextType {
  items: Item[];
  allItems: Item[];
  groups: Group[];
  subgroups: Subgroup[];
  locations: Location[];
  metrics: StockMetrics;
  filters: FilterState;
  isSyncing: boolean;
  isManualRefreshing: boolean;
  lastSync: number | null;
  stockVersion: number | null;
  cautelasVersion: number | null;
  error: string | null;
  setSearch: (search: string) => void;
  setStatusFilter: (status: string | null) => void;
  setGroupFilter: (groupId: number | null) => void;
  setSubgroupFilter: (subgroupId: number | null) => void;
  setLocationFilter: (locationId: number | null) => void;
  toggleLowStockOnly: () => void;
  clearFilters: () => void;
  syncData: (manual?: boolean) => Promise<void>;
  createItem: (data: ItemCreateInput) => Promise<Item>;
  moveItem: (itemId: number, data: { destino_local_id?: number | null; tipo_movimentacao: string; quantidade_movimentada: number; motivo?: string }) => Promise<void>;
  createGroup: (data: { nome: string; descricao?: string }) => Promise<Group>;
  updateGroup: (groupId: number, data: { nome: string; descricao?: string }) => Promise<Group>;
  deleteGroup: (groupId: number) => Promise<void>;
  createSubgroup: (data: { grupo_id: number; nome: string; descricao?: string }) => Promise<Subgroup>;
  updateSubgroup: (subgroupId: number, data: { nome: string; grupo_id?: number; descricao?: string }) => Promise<Subgroup>;
  deleteSubgroup: (subgroupId: number) => Promise<void>;
  createLocation: (data: { nome: string; tipo?: string; descricao?: string; parent_id?: number | null }) => Promise<Location>;
  updateLocation: (id: number, data: { nome?: string; tipo?: string; descricao?: string; parent_id?: number | null }) => Promise<Location>;
}

const defaultFilters: FilterState = {
  search: '',
  status: null,
  groupId: null,
  subgroupId: null,
  locationId: null,
  lowStockOnly: false,
};

const StockContext = createContext<StockContextType>({
  items: [],
  allItems: [],
  groups: [],
  subgroups: [],
  locations: [],
  metrics: { total: 0, disponivel: 0, cautelado: 0, manutencao: 0, baixoEstoque: 0 },
  filters: defaultFilters,
  isSyncing: false,
  isManualRefreshing: false,
  lastSync: null,
  stockVersion: null,
  cautelasVersion: null,
  error: null,
  setSearch: () => {},
  setStatusFilter: () => {},
  setGroupFilter: () => {},
  setSubgroupFilter: () => {},
  setLocationFilter: () => {},
  toggleLowStockOnly: () => {},
  clearFilters: () => {},
  syncData: async () => {},
  createItem: async () => ({} as Item),
  moveItem: async () => {},
  createGroup: async () => ({} as Group),
  updateGroup: async () => ({} as Group),
  deleteGroup: async () => {},
  createSubgroup: async () => ({} as Subgroup),
  updateSubgroup: async () => ({} as Subgroup),
  deleteSubgroup: async () => {},
  createLocation: async () => ({} as Location),
  updateLocation: async () => ({} as Location),
});

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [stockVersion, setStockVersion] = useState<number | null>(null);
  const [cautelasVersion, setCautelasVersion] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const stockVersionRef = useRef<number | null>(null);
  const cautelasVersionRef = useRef<number | null>(null);
  const isAutoSyncingRef = useRef<boolean>(false);
  const isSyncingRef = useRef<boolean>(false);

  useEffect(() => {
    isSyncingRef.current = isSyncing;
  }, [isSyncing]);

  // 1. Carrega dados do armazenamento local em 0ms na inicialização
  useEffect(() => {
    loadLocalDatabase().then((local) => {
      if (local.items.length > 0) setAllItems(local.items);
      if (local.groups.length > 0) setGroups(local.groups);
      if (local.subgroups.length > 0) setSubgroups(local.subgroups);
      if (local.locations.length > 0) setLocations(local.locations);
      setLastSync(local.lastSync);
    });
  }, []);

  // Sincronização silenciosa em tempo real via versão atômica do servidor
  const checkAndSyncSilently = useCallback(async () => {
    if (!isAuthenticated || isSyncingRef.current || isAutoSyncingRef.current) return;
    isAutoSyncingRef.current = true;

    try {
      const status = await api.getSyncStatus();
      if (status && status.status === 'success') {
        const remoteStock = status.stock_version;
        const remoteCautelas = status.cautelas_version;

        let shouldFetchItems = false;
        if (stockVersionRef.current === null) {
          stockVersionRef.current = remoteStock;
          setStockVersion(remoteStock);
        } else if (remoteStock > stockVersionRef.current) {
          stockVersionRef.current = remoteStock;
          setStockVersion(remoteStock);
          shouldFetchItems = true;
        }

        if (cautelasVersionRef.current === null) {
          cautelasVersionRef.current = remoteCautelas;
          setCautelasVersion(remoteCautelas);
        } else if (remoteCautelas > cautelasVersionRef.current) {
          cautelasVersionRef.current = remoteCautelas;
          setCautelasVersion(remoteCautelas);
        }

        if (shouldFetchItems) {
          const remoteItems = await api.fetchItems();
          setAllItems((prev) => {
            if (
              prev.length === remoteItems.length &&
              JSON.stringify(prev.map((i) => i.id + i.status + i.quantidade)) ===
                JSON.stringify(remoteItems.map((i) => i.id + i.status + i.quantidade))
            ) {
              return prev;
            }
            return remoteItems;
          });
          const now = Date.now();
          setLastSync(now);
          await persistLocalDatabase(remoteItems);
        }
      }
    } catch (e) {
      // Falha transitória em segundo plano
    } finally {
      isAutoSyncingRef.current = false;
    }
  }, [isAuthenticated]);

  // Polling em tempo real a cada 2 segundos quando o app está em primeiro plano
  useEffect(() => {
    if (!isAuthenticated) return;

    let intervalId: any = null;

    const startPolling = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        checkAndSyncSilently();
      }, 2000);
      checkAndSyncSilently();
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        startPolling();
      } else {
        stopPolling();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    startPolling();

    return () => {
      stopPolling();
      sub.remove();
    };
  }, [isAuthenticated, checkAndSyncSilently]);

  // 2. Sincronização inteligente completa
  const syncData = useCallback(async (manual = false) => {
    if (!isAuthenticated) return;
    if (manual) {
      setIsManualRefreshing(true);
    }
    setIsSyncing(true);
    setError(null);

    try {
      const [remoteItems, remoteGroups, remoteSubgroups, remoteLocations] = await Promise.all([
        api.fetchItems(),
        api.fetchGroups().catch(() => []),
        api.fetchSubgroups().catch(() => []),
        api.fetchLocations().catch(() => []),
      ]);

      // Atualiza os dados de forma fluida sem limpar o estado prévio
      setAllItems((prev) => {
        // Se a lista remota for idêntica, preserva referência para não causar re-render desnecessário
        if (
          prev.length === remoteItems.length &&
          JSON.stringify(prev.map((i) => i.id + i.status + i.quantidade)) ===
            JSON.stringify(remoteItems.map((i) => i.id + i.status + i.quantidade))
        ) {
          return prev;
        }
        return remoteItems;
      });

      if (remoteGroups.length > 0) setGroups(remoteGroups);
      if (remoteSubgroups.length > 0) setSubgroups(remoteSubgroups);
      if (remoteLocations.length > 0) setLocations(remoteLocations);

      const now = Date.now();
      setLastSync(now);
      await persistLocalDatabase(remoteItems, remoteGroups, remoteLocations, remoteSubgroups);

      api.getSyncStatus().then((status) => {
        if (status && status.status === 'success') {
          stockVersionRef.current = status.stock_version;
          cautelasVersionRef.current = status.cautelas_version;
          setStockVersion(status.stock_version);
          setCautelasVersion(status.cautelas_version);
        }
      }).catch(() => {});
    } catch (err: any) {
      console.warn('Erro ao sincronizar com servidor:', err);
      setError(err.message || 'Falha na conexão com o servidor');
    } finally {
      setIsSyncing(false);
      setIsManualRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      syncData(false);
    }
  }, [isAuthenticated, syncData]);

  // 3. Aplicação instantânea dos filtros em 0ms
  const filteredItems = useMemo(() => {
    return filterLocalItems(filters);
  }, [allItems, filters]);

  // 4. Métricas calculadas em 0ms
  const metrics = useMemo(() => {
    return calculateMetrics(allItems);
  }, [allItems]);

  // Handlers de filtro
  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const setStatusFilter = useCallback((status: string | null) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status === status ? null : status,
    }));
  }, []);

  const setGroupFilter = useCallback((groupId: number | null) => {
    setFilters((prev) => ({
      ...prev,
      groupId: prev.groupId === groupId ? null : groupId,
      // Ao mudar de grupo, limpa o subgrupo caso ele não pertença mais ao grupo
      subgroupId: null,
    }));
  }, []);

  const setSubgroupFilter = useCallback((subgroupId: number | null) => {
    setFilters((prev) => ({
      ...prev,
      subgroupId: prev.subgroupId === subgroupId ? null : subgroupId,
    }));
  }, []);

  const setLocationFilter = useCallback((locationId: number | null) => {
    setFilters((prev) => ({
      ...prev,
      locationId: prev.locationId === locationId ? null : locationId,
    }));
  }, []);

  const toggleLowStockOnly = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      lowStockOnly: !prev.lowStockOnly,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Criar novo material e atualizar localmente em tempo real
  const createItem = async (data: ItemCreateInput): Promise<Item> => {
    const created = await api.createItem(data);
    const updated = [created, ...allItems];
    setAllItems(updated);
    await persistLocalDatabase(updated);
    return created;
  };

  const moveItem = async (
    itemId: number,
    data: { destino_local_id?: number | null; tipo_movimentacao: string; quantidade_movimentada: number; motivo?: string }
  ) => {
    const updated = await api.moveItem(itemId, data);
    // Atualiza imediatamente em memória e persiste
    const updatedAll = allItems.map((item) => (item.id === itemId ? updated : item));
    setAllItems(updatedAll);
    await persistLocalDatabase(updatedAll);
  };

  const createGroup = async (data: { nome: string; descricao?: string }): Promise<Group> => {
    const created = await api.createGroup(data);
    const updated = [...groups, created].sort((a, b) => a.nome.localeCompare(b.nome));
    setGroups(updated);
    await persistLocalDatabase(allItems, updated, locations, subgroups);
    return created;
  };

  const updateGroup = async (
    groupId: number,
    data: { nome: string; descricao?: string }
  ): Promise<Group> => {
    const updatedItem = await api.updateGroup(groupId, data);
    const updated = groups.map((g) => (g.id === groupId ? updatedItem : g)).sort((a, b) => a.nome.localeCompare(b.nome));
    setGroups(updated);
    await persistLocalDatabase(allItems, updated, locations, subgroups);
    return updatedItem;
  };

  const deleteGroup = async (groupId: number): Promise<void> => {
    await api.deleteGroup(groupId);
    const updated = groups.filter((g) => g.id !== groupId);
    const updatedSubs = subgroups.filter((s) => s.grupo_id !== groupId);
    setGroups(updated);
    setSubgroups(updatedSubs);
    await persistLocalDatabase(allItems, updated, locations, updatedSubs);
  };

  const createSubgroup = async (data: {
    grupo_id: number;
    nome: string;
    descricao?: string;
  }): Promise<Subgroup> => {
    const created = await api.createSubgroup(data);
    const updated = [...subgroups, created].sort((a, b) => a.nome.localeCompare(b.nome));
    setSubgroups(updated);
    await persistLocalDatabase(allItems, groups, locations, updated);
    return created;
  };

  const updateSubgroup = async (
    subgroupId: number,
    data: { nome: string; grupo_id?: number; descricao?: string }
  ): Promise<Subgroup> => {
    const updatedItem = await api.updateSubgroup(subgroupId, data);
    const updated = subgroups.map((s) => (s.id === subgroupId ? updatedItem : s)).sort((a, b) => a.nome.localeCompare(b.nome));
    setSubgroups(updated);
    await persistLocalDatabase(allItems, groups, locations, updated);
    return updatedItem;
  };

  const deleteSubgroup = async (subgroupId: number): Promise<void> => {
    await api.deleteSubgroup(subgroupId);
    const updated = subgroups.filter((s) => s.id !== subgroupId);
    setSubgroups(updated);
    await persistLocalDatabase(allItems, groups, locations, updated);
  };

  const createLocation = async (data: {
    nome: string;
    tipo?: string;
    descricao?: string;
    parent_id?: number | null;
  }): Promise<Location> => {
    const newLoc = await api.createLocation(data);
    const updated = [...locations, newLoc].sort((a, b) => a.nome.localeCompare(b.nome));
    setLocations(updated);
    await persistLocalDatabase(allItems, groups, updated, subgroups);
    return newLoc;
  };

  const updateLocation = async (
    id: number,
    data: {
      nome?: string;
      tipo?: string;
      descricao?: string;
      parent_id?: number | null;
    }
  ): Promise<Location> => {
    const updatedLoc = await api.updateLocation(id, data);
    const updated = locations
      .map((l) => (l.id === id ? updatedLoc : l))
      .sort((a, b) => a.nome.localeCompare(b.nome));
    setLocations(updated);
    await persistLocalDatabase(allItems, groups, updated, subgroups);
    return updatedLoc;
  };

  return (
    <StockContext.Provider
      value={{
        items: filteredItems,
        allItems,
        groups,
        subgroups,
        locations,
        metrics,
        filters,
        isSyncing,
        isManualRefreshing,
        lastSync,
        stockVersion,
        cautelasVersion,
        error,
        setSearch,
        setStatusFilter,
        setGroupFilter,
        setSubgroupFilter,
        setLocationFilter,
        toggleLowStockOnly,
        clearFilters,
        syncData,
        createItem,
        moveItem,
        createGroup,
        updateGroup,
        deleteGroup,
        createSubgroup,
        updateSubgroup,
        deleteSubgroup,
        createLocation,
        updateLocation,
      }}
    >
      {children}
    </StockContext.Provider>
  );
};

export const useStock = () => useContext(StockContext);
