import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Item, ItemMovement } from '../types';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import {
  X,
  MapPin,
  Folder,
  Layers,
  ArrowRightLeft,
  Info,
  FileText,
  History,
  Calendar,
  User,
} from 'lucide-react-native';

interface ItemDetailModalProps {
  item: Item | null;
  visible: boolean;
  onClose: () => void;
  onOpenMovement: (item: Item) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  visible,
  onClose,
  onOpenMovement,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const [historyMovements, setHistoryMovements] = useState<ItemMovement[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Tratamento nativo do botão Voltar do Android
  useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [visible, onClose]);

  // Carrega histórico específico do item ao abrir ou alternar de aba
  useEffect(() => {
    if (visible && item) {
      setActiveTab('info');
      loadItemHistory(item.id);
    }
  }, [visible, item]);

  const loadItemHistory = async (itemId: number) => {
    setLoadingHistory(true);
    try {
      const movements = await api.fetchMovements(itemId);
      setHistoryMovements(movements);
    } catch (err) {
      console.warn('Erro ao carregar histórico do material:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!item) return null;

  const locationPath = item.local?.caminho_completo || item.local?.nome || 'Não definido';
  const subCategory = item.subgrupo?.nome || 'Geral';

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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
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
            <View style={styles.titleWrap}>
              <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
                {item.nome}
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                ID #{item.id} {item.bmp ? `• BMP ${item.bmp}` : ''}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.surfaceVariant }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Abas Superiores: Informações vs Histórico Específico */}
          <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'info' && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => setActiveTab('info')}
            >
              <Info size={16} color={activeTab === 'info' ? theme.primary : theme.textMuted} />
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color: activeTab === 'info' ? theme.primary : theme.textMuted,
                    fontWeight: activeTab === 'info' ? '700' : '500',
                  },
                ]}
              >
                Detalhes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'history' && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => {
                setActiveTab('history');
                loadItemHistory(item.id);
              }}
            >
              <History size={16} color={activeTab === 'history' ? theme.primary : theme.textMuted} />
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color: activeTab === 'history' ? theme.primary : theme.textMuted,
                    fontWeight: activeTab === 'history' ? '700' : '500',
                  },
                ]}
              >
                Histórico ({historyMovements.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Conteúdo da Aba */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'info' ? (
              <>
                {/* Cartão de Título e Status */}
                <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.badgeRow}>
                    {item.bmp && (
                      <View style={[styles.pill, { backgroundColor: theme.badgeBg }]}>
                        <Text style={[styles.pillText, { color: theme.primary }]}>
                          BMP {item.bmp}
                        </Text>
                      </View>
                    )}
                    {item.codigo_interno && (
                      <View style={[styles.pill, { backgroundColor: theme.surfaceVariant }]}>
                        <Text style={[styles.pillText, { color: theme.textSecondary }]}>
                          CÓD: {item.codigo_interno}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.pill, { backgroundColor: theme.infoBg }]}>
                      <Text style={[styles.pillText, { color: theme.info }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.itemName, { color: theme.text }]}>
                    {item.nome}
                  </Text>
                </View>

                {/* Grid de Especificações */}
                <View style={[styles.specGrid, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: theme.textMuted }]}>Saldo Atual</Text>
                    <Text style={[styles.gridValue, { color: theme.text }]}>
                      {item.quantidade} {item.unidade_medida}
                    </Text>
                  </View>

                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: theme.textMuted }]}>Conservação</Text>
                    <Text style={[styles.gridValue, { color: theme.text }]}>
                      {item.estado_conservacao}
                    </Text>
                  </View>

                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: theme.textMuted }]}>Controle</Text>
                    <Text style={[styles.gridValue, { color: theme.text }]}>
                      {item.tipo_controle}
                    </Text>
                  </View>

                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: theme.textMuted }]}>Estoque Mínimo</Text>
                    <Text style={[styles.gridValue, { color: theme.text }]}>
                      {item.quantidade_minima} {item.unidade_medida}
                    </Text>
                  </View>
                </View>

                {/* Localização e Subgrupo */}
                <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.sectionRow}>
                    <MapPin size={18} color={theme.primary} />
                    <View style={styles.sectionInfo}>
                      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Local Físico</Text>
                      <Text style={[styles.sectionValue, { color: theme.text }]}>{locationPath}</Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: theme.border }]} />

                  <View style={styles.sectionRow}>
                    <Folder size={18} color={theme.accent} />
                    <View style={styles.sectionInfo}>
                      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Categoria / Subgrupo</Text>
                      <Text style={[styles.sectionValue, { color: theme.text }]}>{subCategory}</Text>
                    </View>
                  </View>

                  {item.numero_serie && (
                    <>
                      <View style={[styles.divider, { backgroundColor: theme.border }]} />
                      <View style={styles.sectionRow}>
                        <FileText size={18} color={theme.textMuted} />
                        <View style={styles.sectionInfo}>
                          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Número de Série</Text>
                          <Text style={[styles.sectionValue, { color: theme.text }]}>{item.numero_serie}</Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>

                {/* Observações */}
                {item.observacoes && (
                  <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.sectionRow}>
                      <Info size={18} color={theme.info} />
                      <View style={styles.sectionInfo}>
                        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Observações</Text>
                        <Text style={[styles.sectionValue, { color: theme.text }]}>{item.observacoes}</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Componentes Instalados */}
                {item.componentes && item.componentes.length > 0 && (
                  <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.sectionRow}>
                      <Layers size={18} color={theme.warning} />
                      <View style={styles.sectionInfo}>
                        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
                          Componentes Instalados ({item.componentes.length})
                        </Text>
                        {item.componentes.map((c) => (
                          <Text key={c.id} style={[styles.subComponentText, { color: theme.text }]}>
                            • {c.nome} {c.bmp ? `(BMP: ${c.bmp})` : ''}
                          </Text>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </>
            ) : (
              /* Aba de Histórico Específico */
              <View style={styles.historyContainer}>
                {loadingHistory ? (
                  <View style={styles.centerLoading}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                      Carregando histórico deste material...
                    </Text>
                  </View>
                ) : historyMovements.length === 0 ? (
                  <View style={styles.emptyHistory}>
                    <History size={36} color={theme.textMuted} />
                    <Text style={[styles.emptyHistoryTitle, { color: theme.text }]}>
                      Sem movimentações registradas
                    </Text>
                    <Text style={[styles.emptyHistorySub, { color: theme.textMuted }]}>
                      As cautelas, devoluções e transferências deste item aparecerão aqui.
                    </Text>
                  </View>
                ) : (
                  historyMovements.map((m) => {
                    const badge = getMovementBadge(m.tipo_movimentacao);
                    return (
                      <View
                        key={m.id}
                        style={[
                          styles.historyCard,
                          { backgroundColor: theme.card, borderColor: theme.border },
                        ]}
                      >
                        <View style={styles.historyTopRow}>
                          <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.typeText, { color: badge.color }]}>
                              {badge.label}
                            </Text>
                          </View>
                          <Text style={[styles.historyDate, { color: theme.textMuted }]}>
                            {formatDate(m.data_hora || m.criado_em)}
                          </Text>
                        </View>

                        {m.motivo && (
                          <Text style={[styles.historyReason, { color: theme.text }]}>
                            "{m.motivo}"
                          </Text>
                        )}

                        <View style={styles.historyBottomRow}>
                          <View style={styles.historyUserWrap}>
                            <User size={12} color={theme.textMuted} />
                            <Text style={[styles.historyUser, { color: theme.textSecondary }]}>
                              {m.usuario_nome || 'Operador'}
                            </Text>
                          </View>
                          <Text style={[styles.historyQty, { color: theme.text }]}>
                            Qtd: {m.quantidade_movimentada}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </ScrollView>

          {/* Rodapé com botão de Movimentação e Safe Area Padding adequado */}
          <View
            style={[
              styles.footer,
              {
                backgroundColor: theme.surface,
                borderTopColor: theme.border,
                paddingBottom: Math.max(insets.bottom, 16) + 12,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.moveButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                onClose();
                onOpenMovement(item);
              }}
              activeOpacity={0.8}
            >
              <ArrowRightLeft size={18} color="#FFFFFF" />
              <Text style={styles.moveButtonText}>Movimentar / Cautelar</Text>
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
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  titleWrap: {
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  tabBtnText: {
    fontSize: 13,
  },
  body: {
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingVertical: 14,
    gap: 12,
  },
  infoCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemName: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  gridItem: {
    width: '50%',
    padding: 6,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  sectionValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  subComponentText: {
    fontSize: 12,
    marginTop: 4,
  },
  historyContainer: {
    gap: 10,
  },
  centerLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyHistoryTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyHistorySub: {
    fontSize: 12,
    textAlign: 'center',
  },
  historyCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  historyDate: {
    fontSize: 11,
  },
  historyReason: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  historyBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  historyUserWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyUser: {
    fontSize: 11,
  },
  historyQty: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  moveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  moveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
