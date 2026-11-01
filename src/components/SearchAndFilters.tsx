import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useStock } from '../context/StockContext';
import { Search, X, SlidersHorizontal, MapPin, Plus } from 'lucide-react-native';

const HIT_SLOP_CHIP = { top: 8, bottom: 8, left: 6, right: 6 };

interface SearchAndFiltersProps {
  onOpenAdvancedFilters?: () => void;
  onOpenLocations?: () => void;
  onOpenAddItem?: () => void;
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  onOpenAdvancedFilters,
  onOpenLocations,
  onOpenAddItem,
}) => {
  const { theme } = useTheme();
  const {
    filters,
    setSearch,
    setStatusFilter,
    clearFilters,
    items,
  } = useStock();

  // Debounce na busca para garantir fluidez a 60/120fps sem jank
  const [localSearch, setLocalSearch] = useState<string>(filters.search);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  const handleSearchChange = (text: string) => {
    setLocalSearch(text);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setSearch(text);
    }, 200);
  };

  const handleClearSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setLocalSearch('');
    setSearch('');
  };

  const isAnyFilterActive =
    filters.search.length > 0 ||
    filters.status !== null ||
    filters.groupId !== null ||
    filters.subgroupId !== null ||
    filters.locationId !== null ||
    filters.lowStockOnly;

  const activeFiltersCount =
    (filters.status !== null ? 1 : 0) +
    (filters.groupId !== null ? 1 : 0) +
    (filters.subgroupId !== null ? 1 : 0) +
    (filters.locationId !== null ? 1 : 0) +
    (filters.lowStockOnly ? 1 : 0);

  const statusChips = [
    { id: null, label: 'Todos' },
    { id: 'DISPONIVEL', label: 'Disponíveis' },
    { id: 'CAUTELADO', label: 'Cautelados' },
    { id: 'EM_MANUTENCAO', label: 'Manutenção' },
  ];

  return (
    <View style={styles.container}>
      {/* Barra de Busca + Botão de Adicionar */}
      <View style={styles.topSearchRow}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
            },
          ]}
        >
          <Search size={18} color={theme.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar material, BMP, serial..."
            placeholderTextColor={theme.textMuted}
            value={localSearch}
            onChangeText={handleSearchChange}
            style={[styles.input, { color: theme.text }]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {localSearch.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              style={styles.clearIcon}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
            >
              <X size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {onOpenAddItem && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: theme.primary }]}
            onPress={onOpenAddItem}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Adicionar novo material"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Plus size={22} color="#0A0F1D" strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>

      {/* Botões de Ação Rápida: Filtros Avançados e Locais Físicos */}
      <View style={styles.actionRow}>
        {onOpenAdvancedFilters && (
          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: activeFiltersCount > 0 ? theme.badgeBg : theme.surfaceVariant,
                borderColor: activeFiltersCount > 0 ? theme.primary : theme.border,
              },
            ]}
            onPress={onOpenAdvancedFilters}
            activeOpacity={0.7}
            hitSlop={HIT_SLOP_CHIP}
            accessibilityRole="button"
          >
            <SlidersHorizontal size={14} color={activeFiltersCount > 0 ? theme.primary : theme.textSecondary} />
            <Text
              style={[
                styles.actionBtnText,
                { color: activeFiltersCount > 0 ? theme.primary : theme.textSecondary, fontWeight: activeFiltersCount > 0 ? '700' : '500' },
              ]}
            >
              Filtros Avançados {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
            </Text>
          </TouchableOpacity>
        )}

        {onOpenLocations && (
          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: filters.locationId !== null ? theme.badgeBg : theme.surfaceVariant,
                borderColor: filters.locationId !== null ? theme.primary : theme.border,
              },
            ]}
            onPress={onOpenLocations}
            activeOpacity={0.7}
            hitSlop={HIT_SLOP_CHIP}
            accessibilityRole="button"
          >
            <MapPin size={14} color={filters.locationId !== null ? theme.primary : theme.textSecondary} />
            <Text
              style={[
                styles.actionBtnText,
                { color: filters.locationId !== null ? theme.primary : theme.textSecondary, fontWeight: filters.locationId !== null ? '700' : '500' },
              ]}
            >
              Locais Físicos {filters.locationId !== null ? '• Ativo' : ''}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Chips Rápidos de Status */}
      <View style={styles.chipsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {statusChips.map((chip) => {
            const active = filters.status === chip.id && !filters.lowStockOnly;
            return (
              <TouchableOpacity
                key={chip.label}
                onPress={() => setStatusFilter(chip.id)}
                hitSlop={HIT_SLOP_CHIP}
                accessibilityRole="button"
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primary : theme.surfaceVariant,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: active ? '#0A0F1D' : theme.textSecondary,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {isAnyFilterActive && (
            <TouchableOpacity
              onPress={clearFilters}
              hitSlop={HIT_SLOP_CHIP}
              accessibilityRole="button"
              style={[styles.chip, { backgroundColor: theme.dangerBg, borderColor: theme.danger }]}
            >
              <Text style={[styles.chipText, { color: theme.danger, fontWeight: '700' }]}>
                Limpar Filtros
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Contagem de resultados discreta */}
      <View style={styles.resultBar}>
        <Text style={[styles.resultText, { color: theme.textMuted }]}>
          {items.length} {items.length === 1 ? 'material encontrado' : 'materiais encontrados'} (0ms)
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  topSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearIcon: {
    padding: 6,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 12,
  },
  chipsWrapper: {
    marginTop: 8,
  },
  chipsScroll: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontSize: 12,
  },
  resultBar: {
    marginTop: 6,
    marginBottom: 2,
  },
  resultText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
