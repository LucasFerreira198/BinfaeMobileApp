import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Item, ItemStatus } from '../types';
import { useTheme } from '../context/ThemeContext';
import { MapPin, Folder, Hash, ArrowRightLeft, QrCode, Shield, Wrench, ChevronRight } from 'lucide-react-native';

const HIT_SLOP_ACTION = { top: 12, bottom: 12, left: 10, right: 10 };

interface ItemCardProps {
  item: Item;
  onPress: () => void;
  onMovement?: (item: Item) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onPress, onMovement }) => {
  const { theme, isDark } = useTheme();

  const getStatusBadge = (status: ItemStatus) => {
    switch (status) {
      case 'DISPONIVEL':
        return { label: 'Disponível', color: theme.success, bg: theme.successBg, dotColor: '#10B981' };
      case 'CAUTELADO':
        return { label: 'Cautelado', color: theme.warning, bg: theme.warningBg, dotColor: '#F59E0B' };
      case 'EM_MANUTENCAO':
        return { label: 'Manutenção', color: theme.danger, bg: theme.dangerBg, dotColor: '#EF4444' };
      case 'EM_USO':
        return { label: 'No Setor', color: theme.info, bg: theme.infoBg, dotColor: '#8B5CF6' };
      case 'BAIXADO':
        return { label: 'Baixado', color: theme.textMuted, bg: theme.surfaceVariant, dotColor: '#64748B' };
      default:
        return { label: status, color: theme.textSecondary, bg: theme.surfaceVariant, dotColor: '#94A3B8' };
    }
  };

  const statusInfo = getStatusBadge(item.status);
  const isSetor = item.cautela_ativa?.tipo === 'FIXA' || item.local?.tipo === 'SETOR' || item.status === 'EM_USO';
  const locationName = item.cautela_ativa?.tipo === 'FIXA'
    ? `Setor: ${item.cautela_ativa.missao_nome}`
    : item.local?.tipo === 'SETOR'
    ? `Setor: ${item.local.nome}`
    : item.cautela_ativa?.tipo === 'MISSAO'
    ? `Missão: ${item.cautela_ativa.missao_nome}`
    : item.local?.caminho_completo || item.local?.nome || 'Sem Local Definido';
  const subgroupName = item.subgrupo?.nome || 'Geral';

  // Cálculo da taxa de estoque para a mini barra tática
  const stockRatio = item.quantidade_minima > 0
    ? Math.min(1.0, Math.max(0.08, item.quantidade / (item.quantidade_minima * 2.5)))
    : item.quantidade > 0 ? 0.95 : 0.0;
  const isLowStock = item.tipo_controle === 'GRANEL' && item.quantidade <= item.quantidade_minima;
  const manutencao = item.caracteristicas?.manutencao;
  const isConsertado = manutencao?.status_etapa === 'CONSERTADO';

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      {/* 1. Header do Tactical Bento: BMP Mono + Status Pill + Qtd */}
      <View style={styles.topRow}>
        <View style={styles.identifiers}>
          {item.bmp ? (
            <View
              style={[
                styles.bmpBadge,
                {
                  backgroundColor: isDark ? 'rgba(0, 229, 192, 0.12)' : 'rgba(0, 137, 123, 0.1)',
                  borderColor: isDark ? 'rgba(0, 229, 192, 0.3)' : 'rgba(0, 137, 123, 0.25)',
                },
              ]}
            >
              <Text
                style={[
                  styles.bmpText,
                  { color: theme.primary },
                ]}
              >
                BMP-{item.bmp}
              </Text>
            </View>
          ) : item.codigo_interno ? (
            <View style={[styles.codeBadge, { backgroundColor: theme.surfaceVariant }]}>
              <Hash size={10} color={theme.textSecondary} />
              <Text style={[styles.codeText, { color: theme.textSecondary }]}>
                {item.codigo_interno}
              </Text>
            </View>
          ) : null}

          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusInfo.dotColor }]} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* Quantidade em Badge Tático */}
        <View
          style={[
            styles.qtyPill,
            {
              backgroundColor: isLowStock
                ? 'rgba(239, 68, 68, 0.15)'
                : isDark
                ? '#0E1422'
                : '#F1F5F9',
              borderColor: isLowStock ? theme.danger : theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.qtyPillText,
              { color: isLowStock ? theme.danger : theme.text },
            ]}
          >
            {item.quantidade} {item.unidade_medida?.toLowerCase() || 'un'}
          </Text>
        </View>
      </View>

      {/* 2. Nome do Material */}
      <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
        {item.nome}
      </Text>

      {/* Alerta de Cautela Ativa (se aplicável) */}
      {item.cautela_ativa ? (
        <View style={[styles.cautelaCardBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
          <Shield size={12} color="#F59E0B" />
          <Text style={[styles.cautelaCardBadgeText, { color: '#F59E0B' }]} numberOfLines={1}>
            CAUTELADO: {item.cautela_ativa.missao_nome} • {item.cautela_ativa.militar_posto_graduacao} {item.cautela_ativa.militar_nome_guerra}
          </Text>
        </View>
      ) : null}

      {/* Alerta de Manutenção em Andamento (se aplicável) */}
      {item.status === 'EM_MANUTENCAO' && manutencao ? (
        <View
          style={[
            styles.maintCardBadge,
            {
              backgroundColor: isConsertado
                ? 'rgba(16, 185, 129, 0.12)'
                : 'rgba(239, 68, 68, 0.12)',
              borderColor: isConsertado
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(239, 68, 68, 0.3)',
            },
          ]}
        >
          <Wrench
            size={12}
            color={isConsertado ? '#10B981' : '#EF4444'}
          />
          <Text
            style={[
              styles.maintCardBadgeText,
              { color: isConsertado ? '#10B981' : '#EF4444' },
            ]}
            numberOfLines={1}
          >
            {isConsertado
              ? `CONSERTADO: ${manutencao.laudo_reparo || 'Aguardando devolução'}`
              : `DEFEITO: ${manutencao.defeito || 'Em bancada técnica'}`}
          </Text>
        </View>
      ) : null}

      {/* 3. Micro-Bento Grid: Localização, Categoria e Barra de Nível */}
      <View style={[styles.bentoGrid, { backgroundColor: isDark ? '#0E1422' : '#F8FAFC' }]}>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MapPin size={13} color={isSetor ? '#8B5CF6' : theme.primary} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
              {locationName}
            </Text>
          </View>

          <View style={styles.metaItem}>
            <Folder size={13} color={theme.textMuted} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
              {subgroupName}
            </Text>
          </View>
        </View>

        {/* Barra de Nível de Estoque */}
        <View style={styles.stockLevelWrap}>
          <View style={[styles.stockTrack, { backgroundColor: isDark ? '#1C263B' : '#E2E8F0' }]}>
            <View
              style={[
                styles.stockFill,
                {
                  width: `${Math.round(stockRatio * 100)}%`,
                  backgroundColor: isLowStock
                    ? theme.danger
                    : theme.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.stockRatioText, { color: theme.textMuted }]}>
            {isLowStock ? 'Baixo' : `${Math.round(stockRatio * 100)}%`}
          </Text>
        </View>
      </View>

      {/* 4. Barra de Ações Rápidas (1 Toque) */}
      <View style={[styles.quickActionsBar, { borderTopColor: theme.border }]}>
        {onMovement && (
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: isDark ? '#0E1422' : '#F1F5F9' }]}
            onPress={() => onMovement(item)}
            activeOpacity={0.7}
            hitSlop={HIT_SLOP_ACTION}
            accessibilityRole="button"
            accessibilityLabel="Transferir localização deste material"
          >
            <ArrowRightLeft size={13} color={theme.primary} />
            <Text style={[styles.quickActionBtnText, { color: theme.primary }]}>
              Transferir
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: isDark ? '#0E1422' : '#F1F5F9' }]}
          onPress={onPress}
          activeOpacity={0.7}
          hitSlop={HIT_SLOP_ACTION}
          accessibilityRole="button"
          accessibilityLabel="Abrir detalhes e código QR"
        >
          <QrCode size={13} color={theme.textSecondary} />
          <Text style={[styles.quickActionBtnText, { color: theme.textSecondary }]}>
            QR Code
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.detailsChevronBtn}
          onPress={onPress}
          activeOpacity={0.7}
          hitSlop={HIT_SLOP_ACTION}
          accessibilityRole="button"
          accessibilityLabel="Visualizar ficha técnica completa"
        >
          <Text style={[styles.detailsText, { color: theme.primary }]}>Detalhes</Text>
          <ChevronRight size={14} color={theme.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  identifiers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  bmpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  bmpText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 0.3,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  codeText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  qtyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  qtyPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  cautelaCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 2,
    marginBottom: 8,
  },
  cautelaCardBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    flex: 1,
  },
  maintCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 2,
    marginBottom: 8,
  },
  maintCardBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    flex: 1,
  },
  bentoGrid: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  stockLevelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  stockFill: {
    height: '100%',
    borderRadius: 3,
  },
  stockRatioText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'monospace',
    minWidth: 28,
    textAlign: 'right',
  },
  quickActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
    minHeight: 34,
  },
  quickActionBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  detailsChevronBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 8,
    minHeight: 34,
  },
  detailsText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
