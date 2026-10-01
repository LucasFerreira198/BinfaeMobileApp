import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  BackHandler,
} from 'react-native';
import { Item } from '../types';
import { useTheme } from '../context/ThemeContext';
import {
  X,
  MapPin,
  Folder,
  Layers,
  ArrowRightLeft,
  Info,
  QrCode,
  FileText,
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

  // Tratamento nativo do botão Voltar do Android
  useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      onClose();
      return true; // Impede que o app feche
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [visible, onClose]);

  if (!item) return null;

  const locationPath = item.local?.caminho_completo || item.local?.nome || 'Não definido';
  const subCategory = item.subgrupo?.nome || 'Geral';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Barra superior de arraste / fechar */}
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
                Detalhes do Material
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                ID #{item.id}
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

          <ScrollView style={styles.body} contentContainerStyle={styles.scrollContent}>
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
          </ScrollView>

          {/* Rodapé com botão de Movimentação */}
          <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
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
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  titleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
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
  footer: {
    padding: 16,
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
