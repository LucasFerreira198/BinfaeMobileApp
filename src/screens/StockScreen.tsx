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
import { formatLocationFriendlyName } from '../storage/db';
import { PackageOpen, Plus, MapPin, Search, X } from 'lucide-react-native';

export const StockScreen: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    items,
    isManualRefreshing,
    syncData,
    filters,
    clearFilters,
    locations,
    setLocationFilter,
  } = useStock();

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const [movementVisible, setMovementVisible] = useState<boolean>(false);
  const [addItemVisible, setAddItemVisible] = useState<boolean>(false);
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);
  const [locationsModalVisible, setLocationsModalVisible] = useState<boolean>(false);

  // Local ativo para contextualizar mensagem de vazio e barra de filtro
  const activeLocation =
    filters.locationId !== null ? locations.find((l) => l.id === filters.locationId) : null;
  const activeLocationName = activeLocation
    ? formatLocationFriendlyName(activeLocation, locations)
    : null;

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

      {/* Indicador de Filtro por Local Físico Ativo */}
      {filters.locationId !== null && activeLocation && (
        <View style={[styles.activeLocBar, { backgroundColor: theme.badgeBg, borderColor: theme.primary }]}>
          <MapPin size={15} color={theme.primary} />
          <Text style={[styles.activeLocText, { color: theme.text }]} numberOfLines={1}>
            Filtrando em: <Text style={{ fontWeight: '700', color: theme.primary }}>{activeLocationName}</Text>
          </Text>
          <TouchableOpacity
            onPress={() => setLocationFilter(null)}
            style={[styles.activeLocCloseBtn, { backgroundColor: theme.surfaceVariant }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={13} color={theme.text} />
          </TouchableOpacity>
        </View>
      )}

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
          filters.locationId !== null ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconWrap, { backgroundColor: theme.badgeBg }]}>
                <MapPin size={38} color={theme.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {`Nenhum material encontrado no(a) ${activeLocationName || 'local selecionado'}`}
              </Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                {filters.search.trim().length > 0
                  ? `Não há itens com o termo "${filters.search}" nesta localização.`
                  : 'Nenhum material cadastrado neste local ou em suas ramificações.'}
              </Text>
              <TouchableOpacity
                style={[styles.searchAllBtn, { backgroundColor: theme.primary }]}
                onPress={() => setLocationFilter(null)}
                activeOpacity={0.8}
              >
                <Search size={16} color="#FFFFFF" />
                <Text style={styles.searchAllBtnText}>Sair deste local e pesquisar em todos</Text>
              </TouchableOpacity>
            </View>
          ) : (
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
          )
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
  activeLocBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  activeLocText: {
    flex: 1,
    fontSize: 12,
  },
  activeLocCloseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 18,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  searchAllBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
