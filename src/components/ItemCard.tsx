import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Item, ItemStatus } from '../types';
import { useTheme } from '../context/ThemeContext';
import { MapPin, Folder, ChevronRight, Hash } from 'lucide-react-native';

interface ItemCardProps {
  item: Item;
  onPress: () => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onPress }) => {
  const { theme } = useTheme();

  const getStatusBadge = (status: ItemStatus) => {
    switch (status) {
      case 'DISPONIVEL':
        return { label: 'Disponível', color: theme.success, bg: theme.successBg };
      case 'CAUTELADO':
        return { label: 'Cautelado', color: theme.warning, bg: theme.warningBg };
      case 'EM_MANUTENCAO':
        return { label: 'Manutenção', color: theme.danger, bg: theme.dangerBg };
      case 'EM_USO':
        return { label: 'Em Uso', color: theme.info, bg: theme.infoBg };
      case 'BAIXADO':
        return { label: 'Baixado', color: theme.textMuted, bg: theme.surfaceVariant };
      default:
        return { label: status, color: theme.textSecondary, bg: theme.surfaceVariant };
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

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      {/* Linha Superior: BMP / Código e Status */}
      <View style={styles.topRow}>
        <View style={styles.identifiers}>
          {item.bmp ? (
            <View style={[styles.bmpBadge, { backgroundColor: theme.badgeBg }]}>
              <Text style={[styles.bmpText, { color: theme.primary }]}>
                BMP: {item.bmp}
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
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
      </View>

      {/* Nome do Material */}
      <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
        {item.nome}
      </Text>

      {item.cautela_ativa ? (
        <View style={[styles.cautelaCardBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
          <Text style={[styles.cautelaCardBadgeText, { color: '#D97706' }]} numberOfLines={1}>
            CAUTELADO: {item.cautela_ativa.missao_nome} • {item.cautela_ativa.militar_posto_graduacao} {item.cautela_ativa.militar_nome_guerra}{item.cautela_ativa.militar_celular ? ` (${item.cautela_ativa.militar_celular})` : ''}
          </Text>
        </View>
      ) : null}

      {item.status === 'EM_MANUTENCAO' && (item.caracteristicas as any)?.manutencao ? (
        <View
          style={[
            styles.maintCardBadge,
            {
              backgroundColor:
                (item.caracteristicas as any)?.manutencao?.status_etapa === 'CONSERTADO'
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'rgba(239, 68, 68, 0.12)',
              borderColor:
                (item.caracteristicas as any)?.manutencao?.status_etapa === 'CONSERTADO'
                  ? 'rgba(16, 185, 129, 0.3)'
                  : 'rgba(239, 68, 68, 0.3)',
            },
          ]}
        >
          <Text
            style={[
              styles.maintCardBadgeText,
              {
                color:
                  (item.caracteristicas as any)?.manutencao?.status_etapa === 'CONSERTADO'
                    ? '#10B981'
                    : '#EF4444',
              },
            ]}
            numberOfLines={1}
          >
            {(item.caracteristicas as any)?.manutencao?.status_etapa === 'CONSERTADO'
              ? `CONSERTADO: ${(item.caracteristicas as any)?.manutencao?.laudo_reparo || 'Aguardando devolução'}`
              : `DEFEITO: ${(item.caracteristicas as any)?.manutencao?.defeito || 'Em bancada de reparo'}`}
          </Text>
        </View>
      ) : null}

      {/* Meta Informações: Categoria e Localização */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Folder size={12} color={theme.textMuted} />
          <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
            {subgroupName}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <MapPin size={12} color={theme.textMuted} />
          <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
            {locationName}
          </Text>
        </View>
      </View>

      {/* Rodapé: Quantidade e Ação */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <View style={styles.quantityWrap}>
          <Text style={[styles.qtyLabel, { color: theme.textMuted }]}>Qtd:</Text>
          <Text style={[styles.qtyValue, { color: theme.text }]}>
            {item.quantidade} {item.unidade_medida?.toLowerCase() || 'un'}
          </Text>
          {item.tipo_controle === 'GRANEL' && item.quantidade <= item.quantidade_minima && (
            <Text style={[styles.lowStockBadge, { color: theme.danger }]}>
              Estoque Baixo
            </Text>
          )}
        </View>

        <View style={styles.actionWrap}>
          <Text style={[styles.detailsText, { color: theme.primary }]}>Detalhes</Text>
          <ChevronRight size={14} color={theme.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
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
  },
  bmpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bmpText: {
    fontSize: 11,
    fontWeight: '700',
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
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '48%',
  },
  metaText: {
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  quantityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyLabel: {
    fontSize: 12,
  },
  qtyValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  lowStockBadge: {
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  actionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cautelaCardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 2,
    marginBottom: 4,
  },
  cautelaCardBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  maintCardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 2,
    marginBottom: 4,
  },
  maintCardBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
