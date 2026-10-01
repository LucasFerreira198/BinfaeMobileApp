import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useStock } from '../context/StockContext';
import { Box, CheckCircle2, Clock, AlertTriangle, AlertCircle } from 'lucide-react-native';

export const MetricCards: React.FC = () => {
  const { theme } = useTheme();
  const { metrics, filters, setStatusFilter, toggleLowStockOnly, clearFilters } = useStock();

  const cards = [
    {
      id: 'ALL',
      label: 'Total',
      count: metrics.total,
      icon: Box,
      color: theme.primary,
      bgColor: theme.badgeBg,
      active: filters.status === null && !filters.lowStockOnly,
      onPress: () => clearFilters(),
    },
    {
      id: 'DISPONIVEL',
      label: 'Disponível',
      count: metrics.disponivel,
      icon: CheckCircle2,
      color: theme.success,
      bgColor: theme.successBg,
      active: filters.status === 'DISPONIVEL',
      onPress: () => setStatusFilter('DISPONIVEL'),
    },
    {
      id: 'CAUTELADO',
      label: 'Cautelado',
      count: metrics.cautelado,
      icon: Clock,
      color: theme.warning,
      bgColor: theme.warningBg,
      active: filters.status === 'CAUTELADO',
      onPress: () => setStatusFilter('CAUTELADO'),
    },
    {
      id: 'EM_MANUTENCAO',
      label: 'Manutenção',
      count: metrics.manutencao,
      icon: AlertTriangle,
      color: theme.danger,
      bgColor: theme.dangerBg,
      active: filters.status === 'EM_MANUTENCAO',
      onPress: () => setStatusFilter('EM_MANUTENCAO'),
    },
    {
      id: 'BAIXO_ESTOQUE',
      label: 'Estoque Baixo',
      count: metrics.baixoEstoque,
      icon: AlertCircle,
      color: '#EC4899',
      bgColor: 'rgba(236, 72, 153, 0.15)',
      active: filters.lowStockOnly,
      onPress: () => toggleLowStockOnly(),
    },
  ];

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <TouchableOpacity
              key={card.id}
              activeOpacity={0.7}
              onPress={card.onPress}
              style={[
                styles.card,
                {
                  backgroundColor: theme.card,
                  borderColor: card.active ? card.color : theme.border,
                  borderWidth: card.active ? 1.5 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: card.bgColor }]}>
                <Icon size={14} color={card.color} />
              </View>
              <View style={styles.info}>
                <Text style={[styles.count, { color: theme.text }]}>
                  {card.count}
                </Text>
                <Text style={[styles.label, { color: theme.textSecondary }]} numberOfLines={1}>
                  {card.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 105,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  info: {
    flex: 1,
  },
  count: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
});
