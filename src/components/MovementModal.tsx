import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  BackHandler,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Item, Location } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useStock } from '../context/StockContext';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { formatLocationFriendlyName } from '../storage/db';
import {
  X,
  Check,
  MapPin,
  Search,
  ChevronRight,
  ArrowLeft,
  ArrowRightLeft,
  FolderTree,
} from 'lucide-react-native';
import { ErrorBoundary } from './ErrorBoundary';

interface MovementModalProps {
  item: Item | null;
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MovementModalContent: React.FC<MovementModalProps> = ({
  item,
  visible,
  onClose,
  onSuccess,
}) => {
  const { theme } = useTheme();
  const { locations, moveItem } = useStock();
  const insets = useSafeAreaInsets();
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();
  const { height: screenHeight } = useWindowDimensions();

  const [quantidade, setQuantidade] = useState<string>('1');
  const [destinoLocalId, setDestinoLocalId] = useState<number | null>(null);
  const [motivo, setMotivo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Estado para Seletor Hierárquico de Locais
  const [pickerVisible, setPickerVisible] = useState<boolean>(false);
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [currentParentId, setCurrentParentId] = useState<number | null>(null);
  const [historyStack, setHistoryStack] = useState<number[]>([]);

  useEffect(() => {
    if (item && visible) {
      setQuantidade(item.tipo_controle === 'UNITARIO' ? '1' : item.quantidade.toString());
      setMotivo('');
      setDestinoLocalId(null);
      setPickerVisible(false);
      setPickerSearch('');
      setCurrentParentId(null);
      setHistoryStack([]);
    }
  }, [item, visible]);

  // Android Back Button handler
  useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      if (pickerVisible) {
        if (pickerSearch.length > 0) {
          setPickerSearch('');
          return true;
        }
        if (historyStack.length > 0) {
          handlePickerGoBack();
          return true;
        }
        setPickerVisible(false);
        return true;
      }
      onClose();
      return true;
    };
    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [visible, pickerVisible, historyStack, pickerSearch, onClose]);

  if (!visible || !item) return null;

  const currentLocObj = locations.find((l) => l.id === item.local_id);
  const currentLocName = currentLocObj
    ? formatLocationFriendlyName(currentLocObj, locations)
    : item.local?.caminho_completo || item.local?.nome || 'Não definido';

  const selectedDestLocObj = locations.find((l) => l.id === destinoLocalId);
  const selectedDestLocName = selectedDestLocObj
    ? formatLocationFriendlyName(selectedDestLocObj, locations)
    : 'Toque para selecionar o local de destino';

  // Navegação do Seletor
  const handlePickerGoBack = () => {
    setHistoryStack((prev) => {
      const next = [...prev];
      next.pop();
      const prevParent = next.length > 0 ? next[next.length - 1] : null;
      setCurrentParentId(prevParent);
      return next;
    });
  };

  const handlePickerNavigateChild = (locId: number) => {
    setHistoryStack((prev) => [...prev, locId]);
    setCurrentParentId(locId);
  };

  // Locais a exibir no Seletor
  const activePickerLocations = useMemo(() => {
    if (pickerSearch.trim().length > 0) {
      const q = pickerSearch.toLowerCase().trim();
      return locations.filter((l) => {
        const friendly = formatLocationFriendlyName(l, locations).toLowerCase();
        const full = (l.caminho_completo || '').toLowerCase();
        const name = l.nome.toLowerCase();
        return friendly.includes(q) || full.includes(q) || name.includes(q);
      });
    }

    return locations.filter((l) => {
      if (currentParentId === null) {
        return !l.parent_id;
      }
      return l.parent_id === currentParentId;
    });
  }, [locations, pickerSearch, currentParentId]);

  const currentParentObj = locations.find((l) => l.id === currentParentId);

  const handleSubmit = async () => {
    const qty = parseFloat(quantidade);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Quantidade inválida', 'Informe uma quantidade válida maior que zero.');
      return;
    }

    if (qty > item.quantidade && item.tipo_controle === 'UNITARIO') {
      Alert.alert('Quantidade indisponível', `O saldo atual deste material é ${item.quantidade}.`);
      return;
    }

    if (!destinoLocalId) {
      Alert.alert('Local Obrigatório', 'Selecione o local físico de destino da transferência.');
      return;
    }

    if (destinoLocalId === item.local_id) {
      Alert.alert(
        'Local Idêntico',
        'O material já se encontra neste local. Escolha um local de destino diferente.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await moveItem(item.id, {
        tipo_movimentacao: 'TRANSFERENCIA',
        quantidade_movimentada: qty,
        destino_local_id: destinoLocalId,
        motivo: motivo.trim() || 'Transferência de local',
      });

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      Alert.alert('Sucesso', 'Transferência de local registrada com sucesso!');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      Alert.alert('Erro na transferência', err.message || 'Não foi possível registrar a transferência.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingBottom: keyboardHeight }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              maxHeight: isKeyboardVisible
                ? Math.max(280, screenHeight - keyboardHeight - (insets.top || 24) - 10)
                : '90%',
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconWrap, { backgroundColor: theme.badgeBg }]}>
                <ArrowRightLeft size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: theme.text }]}>Transferir Local</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                  {item.nome}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.surfaceVariant }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Local Atual (Origem) */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Local Atual de Origem</Text>
            <View
              style={[
                styles.currentLocCard,
                { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
              ]}
            >
              <MapPin size={18} color={theme.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.currentLocText, { color: theme.text }]}>
                  {currentLocName}
                </Text>
                <Text style={[styles.currentLocSub, { color: theme.textSecondary }]}>
                  Saldo disponível: {item.quantidade} {item.unidade_medida}
                </Text>
              </View>
            </View>

            {/* Novo Local de Destino (Botão / Seletor Hierárquico) */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Novo Local de Destino *
            </Text>
            <TouchableOpacity
              style={[
                styles.destinationCard,
                {
                  backgroundColor: destinoLocalId ? theme.badgeBg : theme.inputBg,
                  borderColor: destinoLocalId ? theme.primary : theme.inputBorder,
                },
              ]}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.destCardLeft}>
                <View
                  style={[
                    styles.destIconWrap,
                    {
                      backgroundColor: destinoLocalId
                        ? 'rgba(56, 189, 248, 0.2)'
                        : theme.surfaceVariant,
                    },
                  ]}
                >
                  <MapPin size={20} color={destinoLocalId ? theme.primary : theme.textMuted} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.destTitle,
                      { color: destinoLocalId ? theme.text : theme.textMuted },
                    ]}
                    numberOfLines={2}
                  >
                    {selectedDestLocName}
                  </Text>
                  <Text style={[styles.destSub, { color: theme.textSecondary }]}>
                    Toque para explorar depósitos, armários e prateleiras
                  </Text>
                </View>
              </View>

              <ChevronRight size={18} color={theme.textMuted} />
            </TouchableOpacity>

            {/* Quantidade a Transferir */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Quantidade ({item.unidade_medida})
            </Text>
            <View
              style={[
                styles.inputBox,
                { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
              ]}
            >
              <TextInput
                style={[styles.input, { color: theme.text }]}
                keyboardType="numeric"
                value={quantidade}
                onChangeText={setQuantidade}
                placeholder="Ex: 1"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            {/* Justificativa / Observação (OPCIONAL) */}
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Justificativa / Motivo
              </Text>
              <Text style={[styles.optionalTag, { color: theme.textMuted }]}>Opcional</Text>
            </View>

            <View
              style={[
                styles.inputBox,
                styles.textAreaBox,
                { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
              ]}
            >
              <TextInput
                style={[styles.input, styles.textArea, { color: theme.text }]}
                multiline
                numberOfLines={3}
                value={motivo}
                onChangeText={setMotivo}
                placeholder="Ex: Realocado para organização ou inventário (opcional)"
                placeholderTextColor={theme.textMuted}
              />
            </View>
          </ScrollView>

          {/* Rodapé com botão de Confirmação */}
          <View
            style={[
              styles.footer,
              {
                borderTopColor: theme.border,
                paddingBottom: isKeyboardVisible ? 12 : Math.max(insets.bottom, 16) + 12,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.primary }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Check size={18} color="#FFFFFF" />
                  <Text style={styles.submitText}>Confirmar Transferência</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Seletor Hierárquico Sobreposto na Sheet */}
          {pickerVisible && (
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.pickerOverlay,
                { backgroundColor: theme.surface },
              ]}
            >
              {/* Header do Seletor */}
              <View style={[styles.pickerHeader, { borderBottomColor: theme.border }]}>
                <View style={styles.pickerHeaderLeft}>
                  {historyStack.length > 0 && !pickerSearch ? (
                    <TouchableOpacity
                      onPress={handlePickerGoBack}
                      style={[styles.pickerBackBtn, { backgroundColor: theme.surfaceVariant }]}
                    >
                      <ArrowLeft size={18} color={theme.text} />
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.pickerIconWrap, { backgroundColor: theme.badgeBg }]}>
                      <FolderTree size={18} color={theme.primary} />
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickerTitle, { color: theme.text }]} numberOfLines={1}>
                      {pickerSearch
                        ? 'Resultados da Busca'
                        : currentParentObj
                        ? currentParentObj.nome
                        : 'Selecionar Local de Destino'}
                    </Text>
                    <Text style={[styles.pickerSub, { color: theme.textSecondary }]}>
                      {pickerSearch
                        ? `${activePickerLocations.length} locais encontrados`
                        : currentParentObj
                        ? 'Navegando dentro deste local'
                        : 'Depósitos principais'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setPickerVisible(false)}
                  style={[styles.closeBtn, { backgroundColor: theme.surfaceVariant }]}
                >
                  <X size={18} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Barra de Pesquisa de Locais */}
              <View style={styles.pickerSearchWrap}>
                <View
                  style={[
                    styles.searchBox,
                    { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                  ]}
                >
                  <Search size={16} color={theme.textMuted} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Pesquisar depósito, armário, prateleira..."
                    placeholderTextColor={theme.textMuted}
                    value={pickerSearch}
                    onChangeText={setPickerSearch}
                  />
                  {pickerSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setPickerSearch('')}>
                      <X size={14} color={theme.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Lista de Locais */}
              <FlatList
                data={activePickerLocations}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.pickerListContent}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.pickerEmpty}>
                    <MapPin size={32} color={theme.textMuted} />
                    <Text style={[styles.pickerEmptyTitle, { color: theme.text }]}>
                      Nenhum local encontrado
                    </Text>
                  </View>
                }
                renderItem={({ item: loc }) => {
                  const hasChildren = locations.some((child) => child.parent_id === loc.id);
                  const isCurrentLoc = loc.id === item.local_id;
                  const isSelected = loc.id === destinoLocalId;
                  const friendlyName = formatLocationFriendlyName(loc, locations);

                  return (
                    <View
                      style={[
                        styles.pickerItem,
                        {
                          backgroundColor: isSelected
                            ? theme.badgeBg
                            : theme.card,
                          borderColor: isSelected ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.pickerItemMain}
                        onPress={() => {
                          if (isCurrentLoc) {
                            Alert.alert('Aviso', 'O material já se encontra neste local.');
                            return;
                          }
                          setDestinoLocalId(loc.id);
                          setPickerVisible(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.pickerItemIconWrap}>
                          <MapPin
                            size={18}
                            color={
                              isSelected
                                ? theme.primary
                                : isCurrentLoc
                                ? theme.warning
                                : theme.textSecondary
                            }
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.pickerItemTitle,
                              { color: isSelected ? theme.primary : theme.text },
                            ]}
                          >
                            {loc.nome}
                          </Text>
                          <Text
                            style={[styles.pickerItemPath, { color: theme.textSecondary }]}
                            numberOfLines={1}
                          >
                            {friendlyName}
                          </Text>

                          {isCurrentLoc && (
                            <Text style={[styles.currentTag, { color: theme.warning }]}>
                              • Local Atual do Item
                            </Text>
                          )}
                        </View>

                        {isSelected && (
                          <View
                            style={[styles.checkBadge, { backgroundColor: theme.primary }]}
                          >
                            <Check size={14} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>

                      {/* Botão para entrar na ramificação (se houver sublocais e não estiver pesquisando) */}
                      {hasChildren && !pickerSearch && (
                        <TouchableOpacity
                          style={[
                            styles.enterBranchBtn,
                            { borderLeftColor: theme.border, backgroundColor: theme.surfaceVariant },
                          ]}
                          onPress={() => handlePickerNavigateChild(loc.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <ChevronRight size={18} color={theme.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export const MovementModal: React.FC<MovementModalProps> = (props) => {
  if (!props.visible || !props.item) return null;

  return (
    <ErrorBoundary
      fallbackMessage="Não foi possível abrir o formulário de movimentação."
      onReset={props.onClose}
    >
      <MovementModalContent {...props} />
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionalTag: {
    fontSize: 11,
    fontWeight: '500',
  },
  currentLocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  currentLocText: {
    fontSize: 14,
    fontWeight: '700',
  },
  currentLocSub: {
    fontSize: 12,
    marginTop: 2,
  },
  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  destCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  destIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  destSub: {
    fontSize: 11,
    marginTop: 2,
  },
  inputBox: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  input: {
    fontSize: 15,
    padding: 0,
  },
  textAreaBox: {
    minHeight: 76,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Estilos do Seletor Sobreposto
  pickerOverlay: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 999,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  pickerBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  pickerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  pickerSearchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  pickerListContent: {
    padding: 16,
    gap: 10,
  },
  pickerItem: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pickerItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  pickerItemIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  pickerItemPath: {
    fontSize: 11,
    marginTop: 2,
  },
  currentTag: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enterBranchBtn: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  pickerEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 8,
  },
  pickerEmptyTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
});
