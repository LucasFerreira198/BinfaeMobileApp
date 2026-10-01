import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useStock } from '../context/StockContext';
import { Header } from '../components/Header';
import { MetricCards } from '../components/MetricCards';
import { SearchAndFilters } from '../components/SearchAndFilters';
import { ItemCard } from '../components/ItemCard';
import { ItemDetailModal } from '../components/ItemDetailModal';
import { MovementModal } from '../components/MovementModal';
import { Item } from '../types';
import { PackageOpen } from 'lucide-react-native';

export const StockScreen: React.FC = () => {
  const { theme } = useTheme();
  const { items, isSyncing, syncData, filters, clearFilters } = useStock();

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const [movementVisible, setMovementVisible] = useState<boolean>(false);

  // Tratamento do botão voltar nativo para limpar filtros antes de sair
  useEffect(() => {
    const isFiltered =
      filters.search.length > 0 ||
      filters.status !== null ||
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
      <SearchAndFilters />

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={15}
        windowSize={7}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={() => syncData(true)}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {isSyncing ? (
              <ActivityIndicator size="large" color={theme.primary} />
            ) : (
              <>
                <View style={[styles.emptyIconWrap, { backgroundColor: theme.surfaceVariant }]}>
                  <PackageOpen size={40} color={theme.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  Nenhum material encontrado
                </Text>
                <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                  Tente alterar os termos da busca ou limpar os filtros selecionados.
                </Text>
              </>
            )}
          </View>
        }
      />

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
    paddingBottom: 24,
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
});
