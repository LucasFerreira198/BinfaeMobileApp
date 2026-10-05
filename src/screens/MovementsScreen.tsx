import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { Header } from '../components/Header';
import { ItemMovement } from '../types';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { History, ArrowRightLeft, User, Calendar, Search, X, MapPin } from 'lucide-react-native';
import { formatDateTime } from '../utils/date';

export const MovementsScreen: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { keyboardHeight } = useKeyboardHeight();
  const [movements, setMovements] = useState<ItemMovement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

  const loadMovements = useCallback(async () => {
    try {
      const [remoteMovements, items] = await Promise.all([
        api.fetchMovements().catch((err) => {
          console.warn('Erro ao buscar histórico remoto:', err);
          return [] as ItemMovement[];
        }),
        api.fetchItems().catch(() => []),
      ]);

      const itemsMap = new Map(items.map((i) => [i.id, i.nome]));

      // 1. Processa movimentações vindas da API
      const enriched: ItemMovement[] = remoteMovements.map((m) => ({
        ...m,
        item_nome: m.item_nome || itemsMap.get(m.item_id) || `Material #${m.item_id}`,
        origem_nome: m.origem?.caminho_completo || m.origem?.nome,
        destino_nome: m.destino?.caminho_completo || m.destino?.nome,
      }));

      // 2. Se a API de movimentações ainda não tiver registros (banco novo), deriva itens cautelados
      if (enriched.length === 0) {
        items.forEach((item) => {
          if (item.status === 'CAUTELADO') {
            enriched.push({
              id: item.id * 1000,
              item_id: item.id,
              tipo_movimentacao: 'CAUTELA',
              quantidade_movimentada: item.quantidade,
              motivo: item.observacoes || 'Material sob cautela operacional',
              criado_em: item.atualizado_em || item.criado_em || new Date().toISOString(),
              item_nome: item.nome,
              usuario_nome: 'Operador Logístico',
            });
          }
        });
      }

      setMovements(enriched);
    } catch (err) {
      console.warn('Erro ao carregar movimentações:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMovements();
  };

  const filtered = movements.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.item_nome?.toLowerCase().includes(q) ||
      m.motivo?.toLowerCase().includes(q) ||
      m.tipo_movimentacao?.toLowerCase().includes(q) ||
      m.usuario_nome?.toLowerCase().includes(q) ||
      m.origem_nome?.toLowerCase().includes(q) ||
      m.destino_nome?.toLowerCase().includes(q)
    );
  });

  const getMovementBadge = (tipo: string) => {
    switch (tipo) {
      case 'CAUTELA':
        return { label: 'Cautela', color: theme.warning, bg: theme.warningBg };
      case 'DEVOLUCAO':
        return { label: 'Devolução', color: theme.success, bg: theme.successBg };
      case 'TRANSFERENCIA':
        return { label: 'Transferência', color: theme.primary, bg: theme.badgeBg };
      case 'MANUTENCAO':
        return { label: 'Manutenção', color: theme.danger, bg: theme.dangerBg };
      default:
        return { label: tipo, color: theme.info, bg: theme.infoBg };
    }
  };

  const renderMovementItem = ({ item }: { item: ItemMovement }) => {
    const badge = getMovementBadge(item.tipo_movimentacao);

    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.topRow}>
          <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.typeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
          <Text style={[styles.dateText, { color: theme.textMuted }]}>
            {formatDateTime(item.data_hora || item.criado_em)}
          </Text>
        </View>

        <Text style={[styles.itemName, { color: theme.text }]}>
          {item.item_nome || `Material #${item.item_id}`}
        </Text>

        {item.motivo && (
          <Text style={[styles.reason, { color: theme.textSecondary }]}>
            "{item.motivo}"
          </Text>
        )}

        {(item.origem_nome || item.destino_nome) && (
          <View style={styles.locationTransferRow}>
            <MapPin size={12} color={theme.textMuted} />
            <Text style={[styles.locationTransferText, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.origem_nome || 'Origem'} ➔ {item.destino_nome || 'Destino'}
            </Text>
          </View>
        )}

        <View style={[styles.footerRow, { borderTopColor: theme.border }]}>
          <View style={styles.footerInfo}>
            <User size={12} color={theme.textMuted} />
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              {item.usuario_nome || 'Sistema'}
            </Text>
          </View>

          <Text style={[styles.qtyText, { color: theme.text }]}>
            Qtd: {item.quantidade_movimentada}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Histórico" subtitle="Auditoria de Movimentações" showSync={false} />

      <View style={styles.searchWrapper}>
        <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
          <Search size={16} color={theme.textMuted} />
          <TextInput
            placeholder="Buscar por material, motivo, militar..."
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingSub, { color: theme.textSecondary }]}>
            Consultando registros de auditoria...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMovementItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 20 + keyboardHeight },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <History size={40} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                Nenhuma movimentação registrada
              </Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                As cautelas, devoluções e transferências salvas aparecerão aqui.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingSub: {
    fontSize: 12,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  reason: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  locationTransferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  locationTransferText: {
    fontSize: 11,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 11,
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
  },
});
