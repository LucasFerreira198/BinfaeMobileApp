import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
});

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

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

  // 2. Sincronização inteligente sem flickering
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
      }}
    >
      {children}
    </StockContext.Provider>
  );
};

export const useStock = () => useContext(StockContext);
