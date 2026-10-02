import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useStock } from '../context/StockContext';
import { X, Filter, Check, RotateCcw } from 'lucide-react-native';

interface AdvancedFilterModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AdvancedFilterModal: React.FC<AdvancedFilterModalProps> = ({
  visible,
  onClose,
}) => {
  const { theme } = useTheme();
  const {
    groups,
    subgroups,
    locations,
    filters,
    setGroupFilter,
    setSubgroupFilter,
    setLocationFilter,
    setStatusFilter,
    toggleLowStockOnly,
    clearFilters,
  } = useStock();
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      onClose();
      return true;
    };
    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [visible, onClose]);

  const statuses = [
    { id: null, label: 'Todos os Status' },
    { id: 'DISPONIVEL', label: 'Disponível' },
    { id: 'CAUTELADO', label: 'Cautelado' },
    { id: 'EM_MANUTENCAO', label: 'Em Manutenção' },
    { id: 'EM_USO', label: 'Em Uso' },
    { id: 'BAIXADO', label: 'Baixado' },
  ];

  // Filtra subgrupos pelo grupo selecionado (se houver)
  const availableSubgroups = filters.groupId
    ? subgroups.filter((s) => s.grupo_id === filters.groupId)
    : subgroups;

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
              <Filter size={18} color={theme.primary} />
              <Text style={[styles.title, { color: theme.text }]}>Filtros Avançados</Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.surfaceVariant }]}
            >
              <X size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 1. Status do Material */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>STATUS DO MATERIAL</Text>
            <View style={styles.chipGrid}>
              {statuses.map((s) => {
                const active = filters.status === s.id;
                return (
                  <TouchableOpacity
                    key={s.label}
                    onPress={() => setStatusFilter(s.id)}
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
                        { color: active ? '#FFFFFF' : theme.text, fontWeight: active ? '700' : '500' },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 2. Grupos de Materiais */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>GRUPOS PRINCIPAIS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              <TouchableOpacity
                onPress={() => setGroupFilter(null)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: filters.groupId === null ? theme.primary : theme.surfaceVariant,
                    borderColor: filters.groupId === null ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: filters.groupId === null ? '#FFFFFF' : theme.text, fontWeight: filters.groupId === null ? '700' : '500' },
                  ]}
                >
                  Todos os Grupos
                </Text>
              </TouchableOpacity>
              {groups.map((g) => {
                const active = filters.groupId === g.id;
                return (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => setGroupFilter(active ? null : g.id)}
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
                        { color: active ? '#FFFFFF' : theme.text, fontWeight: active ? '700' : '500' },
                      ]}
                    >
                      {g.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 3. Subgrupos / Categorias */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SUBGRUPOS / CATEGORIAS</Text>
            <View style={styles.chipGrid}>
              <TouchableOpacity
                onPress={() => setSubgroupFilter(null)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: filters.subgroupId === null ? theme.primary : theme.surfaceVariant,
                    borderColor: filters.subgroupId === null ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: filters.subgroupId === null ? '#FFFFFF' : theme.text, fontWeight: filters.subgroupId === null ? '700' : '500' },
                  ]}
                >
                  Todos
                </Text>
              </TouchableOpacity>
              {availableSubgroups.map((sg) => {
                const active = filters.subgroupId === sg.id;
                return (
                  <TouchableOpacity
                    key={sg.id}
                    onPress={() => setSubgroupFilter(active ? null : sg.id)}
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
                        { color: active ? '#FFFFFF' : theme.text, fontWeight: active ? '700' : '500' },
                      ]}
                    >
                      {sg.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 4. Locais Físicos */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>LOCAL FÍSICO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              <TouchableOpacity
                onPress={() => setLocationFilter(null)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: filters.locationId === null ? theme.primary : theme.surfaceVariant,
                    borderColor: filters.locationId === null ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: filters.locationId === null ? '#FFFFFF' : theme.text, fontWeight: filters.locationId === null ? '700' : '500' },
                  ]}
                >
                  Todos os Locais
                </Text>
              </TouchableOpacity>
              {locations.map((loc) => {
                const active = filters.locationId === loc.id;
                return (
                  <TouchableOpacity
                    key={loc.id}
                    onPress={() => setLocationFilter(active ? null : loc.id)}
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
                        { color: active ? '#FFFFFF' : theme.text, fontWeight: active ? '700' : '500' },
                      ]}
                    >
                      {loc.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 5. Alerta de Estoque Baixo */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ALERTAS</Text>
            <TouchableOpacity
              onPress={toggleLowStockOnly}
              style={[
                styles.alertOption,
                {
                  backgroundColor: filters.lowStockOnly ? theme.dangerBg : theme.surfaceVariant,
                  borderColor: filters.lowStockOnly ? theme.danger : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.alertOptionText,
                  {
                    color: filters.lowStockOnly ? theme.danger : theme.text,
                    fontWeight: filters.lowStockOnly ? '700' : '500',
                  },
                ]}
              >
                {filters.lowStockOnly
                  ? '✓ Exibindo apenas materiais com Estoque Baixo'
                  : 'Mostrar apenas materiais com Estoque Baixo (Alerta de Segurança)'}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Rodapé com Ações */}
          <View
            style={[
              styles.footer,
              {
                borderTopColor: theme.border,
                paddingBottom: Math.max(insets.bottom, 16) + 12,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.clearBtn, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
              onPress={clearFilters}
            >
              <RotateCcw size={16} color={theme.textSecondary} />
              <Text style={[styles.clearBtnText, { color: theme.textSecondary }]}>Limpar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: theme.primary }]}
              onPress={onClose}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.applyBtnText}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </View>
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
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingVertical: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 6,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  horizontalScroll: {
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
  },
  alertOption: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  alertOptionText: {
    fontSize: 12,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
