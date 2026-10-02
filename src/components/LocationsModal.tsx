import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useStock } from '../context/StockContext';
import { Location } from '../types';
import { X, MapPin, Search, ChevronRight, Package, Check } from 'lucide-react-native';

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
  const [search, setSearch] = useState<string>('');

  React.useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      onClose();
      return true;
    };
    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [visible, onClose]);

  const filteredLocations = locations.filter((loc) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      loc.nome.toLowerCase().includes(q) ||
      (loc.caminho_completo && loc.caminho_completo.toLowerCase().includes(q)) ||
      (loc.tipo && loc.tipo.toLowerCase().includes(q))
    );
  });

  const getItemCount = (locationId: number) => {
    return allItems.filter((i) => i.local_id === locationId).length;
  };

  const handleSelect = (locId: number | null) => {
    setLocationFilter(locId);
    if (onSelectLocation) onSelectLocation(locId);
    onClose();
  };

  const renderLocationItem = ({ item }: { item: Location }) => {
    const isSelected = filters.locationId === item.id;
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
          <Text style={[styles.locPath, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.caminho_completo || item.tipo || 'Localização Geral'}
          </Text>
        </View>

        <View style={styles.badgeWrap}>
          <View style={[styles.countBadge, { backgroundColor: theme.surfaceVariant }]}>
            <Package size={12} color={theme.textMuted} />
            <Text style={[styles.countText, { color: theme.text }]}>
              {count} {count === 1 ? 'item' : 'itens'}
            </Text>
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <MapPin size={20} color={theme.primary} />
              <View>
                <Text style={[styles.title, { color: theme.text }]}>Locais Físicos</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  {locations.length} depósitos, salas e prateleiras
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

          {/* Barra de Busca de Locais */}
          <View style={styles.searchWrapper}>
            <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <Search size={16} color={theme.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Buscar depósito, sala, armário..."
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

          {/* Opção para Ver Todos / Limpar Filtro de Local */}
          {filters.locationId !== null && (
            <View style={styles.activeFilterRow}>
              <Text style={[styles.activeFilterText, { color: theme.primary }]}>
                Filtro de local ativo no momento
              </Text>
              <TouchableOpacity
                onPress={() => handleSelect(null)}
                style={[styles.clearLocBtn, { backgroundColor: theme.surfaceVariant }]}
              >
                <Text style={[styles.clearLocText, { color: theme.danger }]}>Remover Filtro</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Lista de Locais */}
          <FlatList
            data={filteredLocations}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderLocationItem}
            contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <MapPin size={36} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.text }]}>Nenhum local encontrado</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '85%',
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
  title: {
    fontSize: 18,
    fontWeight: '700',
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
  activeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  activeFilterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearLocBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clearLocText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  locCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
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
  locPath: {
    fontSize: 11,
    marginTop: 2,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
  },
});
