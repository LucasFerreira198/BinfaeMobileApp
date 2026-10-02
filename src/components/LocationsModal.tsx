import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  BackHandler,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useStock } from '../context/StockContext';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { Location } from '../types';
import { formatLocationFriendlyName, getDescendantLocationIds } from '../storage/db';
import {
  X,
  MapPin,
  Search,
  ChevronRight,
  Package,
  Check,
  ArrowLeft,
  FolderTree,
  CornerDownRight,
  Filter,
} from 'lucide-react-native';

interface LocationsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation?: (locationId: number | null) => void;
}

export const LocationsModal: React.FC<LocationsModalProps> = ({
  visible,
  onClose,
  onSelectLocation,
}) => {
  const { theme } = useTheme();
  const { locations, allItems, filters, setLocationFilter } = useStock();
  const insets = useSafeAreaInsets();
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();
  const { height: screenHeight } = useWindowDimensions();

  const [search, setSearch] = useState<string>('');
  const [currentParentId, setCurrentParentId] = useState<number | null>(null);
  const [historyStack, setHistoryStack] = useState<number[]>([]);

  // Reseta a navegação ao abrir o modal
  useEffect(() => {
    if (visible) {
      setSearch('');
      setCurrentParentId(null);
      setHistoryStack([]);
    }
  }, [visible]);

  // Gerenciamento do botão voltar físico do Android
  useEffect(() => {
    if (!visible) return;

    const backAction = () => {
      if (search.trim().length > 0) {
        setSearch('');
        return true;
      }

      if (historyStack.length > 0) {
        handleGoBackOneLevel();
        return true;
      }

      onClose();
      return true;
    };

    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [visible, onClose, historyStack, search]);

  const handleGoBackOneLevel = () => {
    setHistoryStack((prev) => {
      const nextStack = [...prev];
      nextStack.pop();
      const previousParent = nextStack.length > 0 ? nextStack[nextStack.length - 1] : null;
      setCurrentParentId(previousParent);
      return nextStack;
    });
  };

  const handleNavigateToChild = (locId: number) => {
    setHistoryStack((prev) => [...prev, locId]);
    setCurrentParentId(locId);
  };

  const handleSelect = (locId: number | null) => {
    setLocationFilter(locId);
    if (onSelectLocation) onSelectLocation(locId);
    onClose();
  };

  // Contagem de itens no local e em todas as suas ramificações
  const getItemCount = (locationId: number) => {
    const descendantIds = getDescendantLocationIds(locationId, locations);
    return allItems.filter((i) => i.local_id && descendantIds.has(i.local_id)).length;
  };

  // Identifica o local atual ativo no drill-down
  const currentLocation = currentParentId !== null ? locations.find((l) => l.id === currentParentId) : null;

  // Filhos do local atual (ou raízes se currentParentId for null)
  const currentLevelLocations = locations.filter((loc) => {
    if (currentParentId === null) {
      // Locais raiz (sem pai ou cujo pai não existe na lista)
      return loc.parent_id === null || !loc.parent_id || !locations.some((p) => p.id === loc.parent_id);
    }
    return loc.parent_id === currentParentId;
  });

  // Busca global quando o usuário digita na barra de pesquisa
  const searchResults = locations.filter((loc) => {
    if (!search.trim()) return false;
    const q = search.toLowerCase();
    const friendlyPath = formatLocationFriendlyName(loc, locations).toLowerCase();
    return (
      loc.nome.toLowerCase().includes(q) ||
      friendlyPath.includes(q) ||
      (loc.caminho_completo && loc.caminho_completo.toLowerCase().includes(q))
    );
  });

  // Renderização de cada local
  const renderLocationCard = ({ item }: { item: Location }) => {
    const isSelected = filters.locationId === item.id;
    const sublocations = locations.filter((l) => l.parent_id === item.id);
    const hasChildren = sublocations.length > 0;
    const totalItems = getItemCount(item.id);

    return (
      <View
        style={[
          styles.locCard,
          {
            backgroundColor: theme.card,
            borderColor: isSelected ? theme.primary : theme.border,
            borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.cardMainClickable}
          onPress={() => {
            if (hasChildren) {
              handleNavigateToChild(item.id);
            } else {
              handleSelect(isSelected ? null : item.id);
            }
          }}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: isSelected
                  ? theme.primary
                  : hasChildren
                  ? theme.surfaceVariant
                  : theme.badgeBg,
              },
            ]}
          >
            {hasChildren ? (
              <FolderTree size={18} color={isSelected ? '#FFFFFF' : theme.primary} />
            ) : (
              <MapPin size={18} color={isSelected ? '#FFFFFF' : theme.primary} />
            )}
          </View>

          <View style={styles.infoWrap}>
            <Text style={[styles.locName, { color: theme.text }]}>{item.nome}</Text>
            <Text style={[styles.locSub, { color: theme.textSecondary }]} numberOfLines={1}>
              {hasChildren
                ? `${sublocations.length} ramificações internas`
                : formatLocationFriendlyName(item, locations)}
            </Text>
          </View>

          <View style={styles.rightSide}>
            <View style={[styles.countBadge, { backgroundColor: theme.surfaceVariant }]}>
              <Package size={12} color={theme.textMuted} />
              <Text style={[styles.countText, { color: theme.text }]}>{totalItems}</Text>
            </View>

            {hasChildren ? (
              <ChevronRight size={18} color={theme.textMuted} />
            ) : isSelected ? (
              <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
                <Check size={12} color="#FFFFFF" />
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        {/* Botão de Filtrar diretamente aqui se o item tiver filhos */}
        {hasChildren && (
          <View style={[styles.cardActionRow, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[
                styles.filterDirectBtn,
                {
                  backgroundColor: isSelected ? theme.primary : theme.surfaceVariant,
                },
              ]}
              onPress={() => handleSelect(isSelected ? null : item.id)}
            >
              <Filter size={13} color={isSelected ? '#FFFFFF' : theme.primary} />
              <Text
                style={[
                  styles.filterDirectText,
                  { color: isSelected ? '#FFFFFF' : theme.primary },
                ]}
              >
                {isSelected ? 'Filtrando por este local' : 'Filtrar por este depósito'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Renderização de resultado de busca global
  const renderSearchResultCard = ({ item }: { item: Location }) => {
    const isSelected = filters.locationId === item.id;
    const fullPath = formatLocationFriendlyName(item, locations);
    const count = getItemCount(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.locCard,
          {
            backgroundColor: theme.card,
            borderColor: isSelected ? theme.primary : theme.border,
            borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
          },
        ]}
        onPress={() => handleSelect(isSelected ? null : item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { backgroundColor: isSelected ? theme.primary : theme.badgeBg }]}>
          <MapPin size={18} color={isSelected ? '#FFFFFF' : theme.primary} />
        </View>

        <View style={styles.infoWrap}>
          <Text style={[styles.locName, { color: theme.text }]}>{item.nome}</Text>
          <Text style={[styles.locSub, { color: theme.textSecondary }]} numberOfLines={2}>
            {fullPath}
          </Text>
        </View>

        <View style={styles.rightSide}>
          <View style={[styles.countBadge, { backgroundColor: theme.surfaceVariant }]}>
            <Package size={12} color={theme.textMuted} />
            <Text style={[styles.countText, { color: theme.text }]}>{count}</Text>
          </View>
          {isSelected && (
            <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
              <Check size={12} color="#FFFFFF" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View
        style={[
          styles.backdrop,
          {
            paddingBottom: keyboardHeight,
          },
        ]}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              maxHeight: isKeyboardVisible
                ? Math.max(280, screenHeight - keyboardHeight - (insets.top || 24) - 10)
                : '88%',
            },
          ]}
        >
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.headerIconWrap, { backgroundColor: theme.badgeBg }]}>
                <MapPin size={20} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.text }]}>Locais Físicos</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  {locations.length} depósitos, armários e prateleiras
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.surfaceVariant }]}
            >
              <X size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Barra de Busca Rápida */}
          <View style={styles.searchWrapper}>
            <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <Search size={16} color={theme.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Buscar depósito, prateleira, armário..."
                placeholderTextColor={theme.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <X size={14} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Banner de Filtro Ativo */}
          {filters.locationId !== null && (
            <View style={[styles.activeFilterBanner, { backgroundColor: theme.badgeBg, borderColor: theme.primary }]}>
              <View style={styles.activeFilterLeft}>
                <MapPin size={15} color={theme.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.activeFilterLabel, { color: theme.primary }]}>
                    Filtrando atualmente por:
                  </Text>
                  <Text style={[styles.activeFilterName, { color: theme.text }]} numberOfLines={1}>
                    {formatLocationFriendlyName(
                      locations.find((l) => l.id === filters.locationId) || { id: 0, nome: 'Local Selecionado' },
                      locations
                    )}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleSelect(null)}
                style={[styles.clearFilterBtn, { backgroundColor: theme.surfaceVariant }]}
              >
                <Text style={[styles.clearFilterText, { color: theme.danger }]}>Remover</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Barra de Navegação Hierárquica (Breadcrumbs e Voltar) quando não estiver buscando */}
          {search.trim().length === 0 && currentParentId !== null && currentLocation && (
            <View style={[styles.breadcrumbBar, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
              <TouchableOpacity style={styles.backBtn} onPress={handleGoBackOneLevel}>
                <ArrowLeft size={16} color={theme.primary} />
                <Text style={[styles.backBtnText, { color: theme.primary }]}>Voltar um nível</Text>
              </TouchableOpacity>

              <View style={styles.currentLocHeader}>
                <CornerDownRight size={15} color={theme.textMuted} />
                <Text style={[styles.currentLocTitle, { color: theme.text }]} numberOfLines={1}>
                  {currentLocation.nome}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.selectCurrentLocBtn,
                  {
                    backgroundColor:
                      filters.locationId === currentLocation.id ? theme.primary : theme.badgeBg,
                  },
                ]}
                onPress={() => handleSelect(filters.locationId === currentLocation.id ? null : currentLocation.id)}
              >
                <Check
                  size={14}
                  color={filters.locationId === currentLocation.id ? '#FFFFFF' : theme.primary}
                />
                <Text
                  style={[
                    styles.selectCurrentLocText,
                    {
                      color:
                        filters.locationId === currentLocation.id ? '#FFFFFF' : theme.primary,
                    },
                  ]}
                >
                  {filters.locationId === currentLocation.id ? 'Selecionado' : 'Selecionar este local'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Lista de Locais: Hierárquica ou Resultado de Busca */}
          {search.trim().length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => `search-${item.id}`}
              renderItem={renderSearchResultCard}
              contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <MapPin size={36} color={theme.textMuted} />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>Nenhum local encontrado</Text>
                  <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                    Nenhum depósito ou prateleira corresponde à busca "{search}".
                  </Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={currentLevelLocations}
              keyExtractor={(item) => `tree-${item.id}`}
              renderItem={renderLocationCard}
              contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                currentParentId === null ? (
                  <Text style={[styles.sectionHint, { color: theme.textMuted }]}>
                    Selecione um depósito para ver as ramificações internas (armários, prateleiras):
                  </Text>
                ) : (
                  <Text style={[styles.sectionHint, { color: theme.textMuted }]}>
                    Ramificações dentro de "{currentLocation?.nome}":
                  </Text>
                )
              }
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Package size={36} color={theme.textMuted} />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>Sem mais ramificações</Text>
                  <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                    Não há outros sublocais dentro de "{currentLocation?.nome}".
                  </Text>
                  <TouchableOpacity
                    style={[styles.selectThisEmptyBtn, { backgroundColor: theme.primary }]}
                    onPress={() => currentLocation && handleSelect(currentLocation.id)}
                  >
                    <Text style={styles.selectThisEmptyText}>
                      Filtrar por "{currentLocation?.nome}"
                    </Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  activeFilterBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  activeFilterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  activeFilterLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeFilterName: {
    fontSize: 13,
    fontWeight: '700',
  },
  clearFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearFilterText: {
    fontSize: 11,
    fontWeight: '700',
  },
  breadcrumbBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  currentLocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentLocTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  selectCurrentLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 2,
  },
  selectCurrentLocText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHint: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  locCard: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardMainClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoWrap: {
    flex: 1,
  },
  locName: {
    fontSize: 15,
    fontWeight: '700',
  },
  locSub: {
    fontSize: 11,
    marginTop: 2,
  },
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActionRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterDirectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterDirectText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 16,
  },
  selectThisEmptyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  selectThisEmptyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
