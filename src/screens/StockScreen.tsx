import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  BackHandler,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useStock } from '../context/StockContext';
import { Header } from '../components/Header';
import { MetricCards } from '../components/MetricCards';
import { SearchAndFilters } from '../components/SearchAndFilters';
import { ItemCard } from '../components/ItemCard';
import { ItemDetailModal } from '../components/ItemDetailModal';
import { MovementModal } from '../components/MovementModal';
import { AddItemModal } from '../components/AddItemModal';
import { AdvancedFilterModal } from '../components/AdvancedFilterModal';
import { LocationsModal } from '../components/LocationsModal';
import { Item } from '../types';
import { PackageOpen, Plus } from 'lucide-react-native';

export const StockScreen: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, isManualRefreshing, syncData, filters, clearFilters } = useStock();

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const [movementVisible, setMovementVisible] = useState<boolean>(false);
  const [addItemVisible, setAddItemVisible] = useState<boolean>(false);
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);
  const [locationsModalVisible, setLocationsModalVisible] = useState<boolean>(false);

  // Tratamento do botão voltar nativo para limpar filtros antes de sair
  useEffect(() => {
    const isFiltered =
      filters.search.length > 0 ||
      filters.status !== null ||
      filters.groupId !== null ||
      filters.subgroupId !== null ||
      filters.locationId !== null ||
      filters.lowStockOnly;

    if (!isFiltered) return;

    const backAction = () => {
      clearFilters();
      return true; // consumiu o evento de voltar limpando o filtro
    };

    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [filters, clearFilters]);

  const handleOpenDetail = useCallback((item: Item) => {
    setSelectedItem(item);
    setDetailVisible(true);
  }, []);

  const handleOpenMovement = useCallback((item: Item) => {
    setSelectedItem(item);
    setMovementVisible(true);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Item }) => (
      <ItemCard item={item} onPress={() => handleOpenDetail(item)} />
    ),
    [handleOpenDetail]
  );

  const keyExtractor = useCallback((item: Item) => item.id.toString(), []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header />
      <MetricCards />
      <SearchAndFilters
        onOpenAdvancedFilters={() => setFilterModalVisible(true)}
        onOpenLocations={() => setLocationsModalVisible(true)}
        onOpenAddItem={() => setAddItemVisible(true)}
      />

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[styles.listContent, { paddingBottom: 80 }]}
        initialNumToRender={10}
        maxToRenderPerBatch={15}
        windowSize={7}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl
            refreshing={isManualRefreshing}
            onRefresh={() => syncData(true)}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, { backgroundColor: theme.surfaceVariant }]}>
              <PackageOpen size={40} color={theme.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Nenhum material encontrado
            </Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
              Tente alterar os termos da busca ou limpar os filtros selecionados.
            </Text>
          </View>
        }
      />

      {/* Botão Flutuante (FAB) para Adicionar Material */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: theme.primary,
            bottom: Math.max(insets.bottom, 16) + 16,
          },
        ]}
        onPress={() => setAddItemVisible(true)}
        activeOpacity={0.85}
        accessibilityLabel="Adicionar novo material"
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Modal de Detalhes Completo */}
      <ItemDetailModal
        item={selectedItem}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onOpenMovement={(item) => handleOpenMovement(item)}
      />

      {/* Modal de Movimentação e Cautela */}
      <MovementModal
        item={selectedItem}
        visible={movementVisible}
        onClose={() => setMovementVisible(false)}
      />

      {/* Modal de Adicionar Novo Material */}
      <AddItemModal
        visible={addItemVisible}
        onClose={() => setAddItemVisible(false)}
      />

      {/* Modal de Filtros Avançados */}
      <AdvancedFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
      />

      {/* Modal de Visualização de Locais Físicos */}
      <LocationsModal
        visible={locationsModalVisible}
        onClose={() => setLocationsModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  listContent: {
    paddingTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
