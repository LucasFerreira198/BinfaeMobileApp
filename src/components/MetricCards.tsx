import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useStock } from '../context/StockContext';
import { Box, CheckCircle2, Clock, AlertTriangle, AlertCircle } from 'lucide-react-native';

const HIT_SLOP_METRIC = { top: 8, bottom: 8, left: 4, right: 4 };

export const MetricCards: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { metrics, filters, setStatusFilter, toggleLowStockOnly, clearFilters } = useStock();

  const cards = [
    {
      id: 'ALL',
      label: 'Total',
      count: metrics.total,
      icon: Box,
      color: theme.primary,
      bgColor: isDark ? 'rgba(0, 229, 192, 0.15)' : 'rgba(0, 137, 123, 0.12)',
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
      label: 'Baixo Estoque',
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
              activeOpacity={0.75}
              onPress={card.onPress}
              hitSlop={HIT_SLOP_METRIC}
              style={[
                styles.card,
                {
                  backgroundColor: card.active
                    ? (isDark ? 'rgba(0, 229, 192, 0.08)' : 'rgba(0, 137, 123, 0.06)')
                    : theme.card,
                  borderColor: card.active ? card.color : theme.border,
                  borderWidth: card.active ? 1.5 : 1,
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: card.bgColor }]}>
                <Icon size={14} color={card.color} strokeWidth={2.5} />
              </View>
              <View style={styles.info}>
                <Text style={[styles.count, { color: theme.text }]}>
                  {card.count}
                </Text>
                <Text
                  style={[
                    styles.label,
                    {
                      color: card.active ? card.color : theme.textSecondary,
                      fontWeight: card.active ? '700' : '500',
                    },
                  ]}
                  numberOfLines={1}
                >
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    minWidth: 108,
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
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
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 19,
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 10.5,
    marginTop: 1,
  },
});
