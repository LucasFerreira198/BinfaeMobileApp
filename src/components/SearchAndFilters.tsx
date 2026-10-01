import React from 'react';
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
import { Search, X } from 'lucide-react-native';

export const SearchAndFilters: React.FC = () => {
  const { theme } = useTheme();
  const {
    filters,
    setSearch,
    setStatusFilter,
    groups,
    setSubgroupFilter,
    clearFilters,
    items,
  } = useStock();

  const isAnyFilterActive =
    filters.search.length > 0 ||
    filters.status !== null ||
    filters.subgroupId !== null ||
    filters.locationId !== null ||
    filters.lowStockOnly;

  const statusChips = [
    { id: null, label: 'Todos' },
    { id: 'DISPONIVEL', label: 'Disponíveis' },
    { id: 'CAUTELADO', label: 'Cautelados' },
    { id: 'EM_MANUTENCAO', label: 'Manutenção' },
  ];

  return (
    <View style={styles.container}>
      {/* Barra de Busca com Resposta em 0ms */}
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
          value={filters.search}
          onChangeText={setSearch}
          style={[styles.input, { color: theme.text }]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {filters.search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            style={styles.clearIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={16} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Chips Rápidos de Status e Grupos */}
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
                      color: active ? '#FFFFFF' : theme.textSecondary,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Chips para grupos rápidos */}
          {groups.slice(0, 4).map((g) => {
            const active = filters.subgroupId === g.id; // quick group indicator
            return (
              <TouchableOpacity
                key={`grp-${g.id}`}
                onPress={() => setSubgroupFilter(active ? null : g.id)}
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
                      color: active ? '#FFFFFF' : theme.textSecondary,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {g.nome}
                </Text>
              </TouchableOpacity>
            );
          })}

          {isAnyFilterActive && (
            <TouchableOpacity
              onPress={clearFilters}
              style={[styles.chip, { backgroundColor: theme.dangerBg, borderColor: theme.danger }]}
            >
              <Text style={[styles.chipText, { color: theme.danger, fontWeight: '600' }]}>
                Limpar Filtros
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Contagem de resultados discreta */}
      <View style={styles.resultBar}>
        <Text style={[styles.resultText, { color: theme.textMuted }]}>
          {items.length} {items.length === 1 ? 'material encontrado' : 'materiais encontrados'}
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
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
    padding: 4,
  },
  chipsWrapper: {
    marginTop: 10,
  },
  chipsScroll: {
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontSize: 12,
  },
  resultBar: {
    marginTop: 8,
    marginBottom: 4,
  },
  resultText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
