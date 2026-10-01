import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Item, Group, Location, StockMetrics, FilterState } from '../types';
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
  locations: Location[];
  metrics: StockMetrics;
  filters: FilterState;
  isSyncing: boolean;
  lastSync: number | null;
  error: string | null;
  setSearch: (search: string) => void;
  setStatusFilter: (status: string | null) => void;
  setSubgroupFilter: (subgroupId: number | null) => void;
  setLocationFilter: (locationId: number | null) => void;
  toggleLowStockOnly: () => void;
  clearFilters: () => void;
  syncData: (force?: boolean) => Promise<void>;
  moveItem: (itemId: number, data: { destino_local_id?: number | null; tipo_movimentacao: string; quantidade_movimentada: number; motivo?: string }) => Promise<void>;
}

const defaultFilters: FilterState = {
  search: '',
  status: null,
  subgroupId: null,
  locationId: null,
  lowStockOnly: false,
};

const StockContext = createContext<StockContextType>({
  items: [],
  allItems: [],
  groups: [],
  locations: [],
  metrics: { total: 0, disponivel: 0, cautelado: 0, manutencao: 0, baixoEstoque: 0 },
  filters: defaultFilters,
  isSyncing: false,
  lastSync: null,
  error: null,
  setSearch: () => {},
  setStatusFilter: () => {},
  setSubgroupFilter: () => {},
  setLocationFilter: () => {},
  toggleLowStockOnly: () => {},
  clearFilters: () => {},
  syncData: async () => {},
  moveItem: async () => {},
});

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  // 1. Carrega dados do armazenamento local em 0ms na inicialização
  useEffect(() => {
    loadLocalDatabase().then((local) => {
      if (local.items.length > 0) {
        setAllItems(local.items);
      }
      if (local.groups.length > 0) {
        setGroups(local.groups);
      }
      if (local.locations.length > 0) {
        setLocations(local.locations);
      }
      setLastSync(local.lastSync);
    });
  }, []);

  // 2. Sincroniza dados com o servidor quando autenticado
  const syncData = useCallback(async (force = false) => {
    if (!isAuthenticated) return;
    setIsSyncing(true);
    setError(null);

    try {
      const [remoteItems, remoteGroups, remoteLocations] = await Promise.all([
        api.fetchItems(),
        api.fetchGroups().catch(() => []),
        api.fetchLocations().catch(() => []),
      ]);

      setAllItems(remoteItems);
      if (remoteGroups.length > 0) setGroups(remoteGroups);
      if (remoteLocations.length > 0) setLocations(remoteLocations);

      const now = Date.now();
      setLastSync(now);
      await persistLocalDatabase(remoteItems, remoteGroups, remoteLocations);
    } catch (err: any) {
      console.warn('Erro ao sincronizar com servidor:', err);
      setError(err.message || 'Falha na conexão com o servidor');
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      syncData();
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

  const moveItem = async (itemId: number, data: { destino_local_id?: number | null; tipo_movimentacao: string; quantidade_movimentada: number; motivo?: string }) => {
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
        locations,
        metrics,
        filters,
        isSyncing,
        lastSync,
        error,
        setSearch,
        setStatusFilter,
        setSubgroupFilter,
        setLocationFilter,
        toggleLowStockOnly,
        clearFilters,
        syncData,
        moveItem,
      }}
    >
      {children}
    </StockContext.Provider>
  );
};

export const useStock = () => useContext(StockContext);
