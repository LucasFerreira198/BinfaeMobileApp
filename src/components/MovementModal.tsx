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
import { api } from '../api/client';
import {
  X,
  Check,
  MapPin,
  Search,
  ChevronRight,
  ArrowLeft,
  ArrowRightLeft,
  FolderTree,
  Package,
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
  const { locations, moveItem, syncData } = useStock();
  const insets = useSafeAreaInsets();
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();
  const { height: screenHeight } = useWindowDimensions();

  const [viewMode, setViewMode] = useState<'form' | 'picker'>('form');
  const [quantidade, setQuantidade] = useState<string>('1');
  const [destinoLocalId, setDestinoLocalId] = useState<number | null>(null);
  const [motivo, setMotivo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Estado para Busca e Filtros do Seletor
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string | null>(null);
  const [freshLocations, setFreshLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState<boolean>(false);

  // Lista consolidada de locais (contexto ou busca direta na API)
  const allLocations = useMemo(() => {
    if (freshLocations.length > 0) return freshLocations;
    return locations;
  }, [freshLocations, locations]);

  // Se a lista de locais estiver vazia ao abrir, busca diretamente da API
  useEffect(() => {
    if (visible && (!locations || locations.length === 0)) {
      setLoadingLocations(true);
      api
        .fetchLocations()
        .then((locs) => {
          if (Array.isArray(locs) && locs.length > 0) {
            setFreshLocations(locs);
          }
        })
        .catch((err) => {
          console.warn('Erro ao carregar locais em MovementModal:', err);
        })
        .finally(() => {
          setLoadingLocations(false);
        });
    }
  }, [visible, locations]);

  useEffect(() => {
    if (item && visible) {
      setQuantidade(item.tipo_controle === 'UNITARIO' ? '1' : item.quantidade.toString());
      setMotivo('');
      setDestinoLocalId(null);
      setViewMode('form');
      setPickerSearch('');
      setSelectedTypeFilter(null);
    }
  }, [item, visible]);

  // Android Back Button handler
  useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      if (viewMode === 'picker') {
        if (pickerSearch.trim().length > 0) {
          setPickerSearch('');
          return true;
        }
        setViewMode('form');
        return true;
      }
      onClose();
      return true;
    };
    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [visible, viewMode, pickerSearch, onClose]);

  if (!visible || !item) return null;

  const currentLocObj = allLocations.find((l) => l.id === item.local_id);
  const currentLocName = currentLocObj
    ? formatLocationFriendlyName(currentLocObj, allLocations)
    : item.local?.caminho_completo || item.local?.nome || 'Não definido';

  const selectedDestLocObj = allLocations.find((l) => l.id === destinoLocalId);
  const selectedDestLocName = selectedDestLocObj
    ? formatLocationFriendlyName(selectedDestLocObj, allLocations)
    : 'Toque para selecionar o local de destino';

  // Locais filtrados para o Seletor
  const filteredLocations = useMemo(() => {
    let list = allLocations;

    if (selectedTypeFilter) {
      list = list.filter((l) => l.tipo === selectedTypeFilter);
    }

    if (pickerSearch.trim().length > 0) {
      const q = pickerSearch.toLowerCase().trim();
      list = list.filter((l) => {
        const friendly = formatLocationFriendlyName(l, allLocations).toLowerCase();
        const full = (l.caminho_completo || '').toLowerCase();
        const name = (l.nome || '').toLowerCase();
        const type = (l.tipo || '').toLowerCase();
        return friendly.includes(q) || full.includes(q) || name.includes(q) || type.includes(q);
      });
    }

    // Ordena de forma hierárquica e alfabética
    return [...list].sort((a, b) => {
      const pathA = a.caminho_completo || a.nome;
      const pathB = b.caminho_completo || b.nome;
      return pathA.localeCompare(pathB, 'pt-BR');
    });
  }, [allLocations, selectedTypeFilter, pickerSearch]);

  // Tipos únicos presentes na lista de locais para os chips de filtro rápido
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    allLocations.forEach((l) => {
      if (l.tipo) types.add(l.tipo);
    });
    return Array.from(types);
  }, [allLocations]);

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
        'O material já se encontra neste local de origem. Escolha um local de destino diferente.'
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
              height: viewMode === 'picker' ? '92%' : undefined,
              maxHeight: isKeyboardVisible
                ? Math.max(280, screenHeight - keyboardHeight - (insets.top || 24) - 10)
                : '92%',
            },
          ]}
        >
          {viewMode === 'picker' ? (
            /* ========================================================
               TELA DO SELETOR DE LOCAL DE DESTINO
               ======================================================== */
            <View style={styles.pickerContainer}>
              {/* Header do Seletor */}
              <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <View style={styles.headerLeft}>
                  <TouchableOpacity
                    onPress={() => setViewMode('form')}
                    style={[styles.backBtn, { backgroundColor: theme.surfaceVariant }]}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <ArrowLeft size={18} color={theme.text} />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: theme.text }]}>
                      Selecionar Destino
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                      {filteredLocations.length} locais disponíveis
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setViewMode('form')}
                  style={[styles.closeBtn, { backgroundColor: theme.surfaceVariant }]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Barra de Pesquisa */}
              <View style={styles.searchWrapper}>
                <View
                  style={[
                    styles.searchBox,
                    { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                  ]}
                >
                  <Search size={16} color={theme.textMuted} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Buscar depósito, armário, prateleira..."
                    placeholderTextColor={theme.textMuted}
                    value={pickerSearch}
                    onChangeText={setPickerSearch}
                    autoFocus={false}
                  />
                  {pickerSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setPickerSearch('')}>
                      <X size={14} color={theme.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Chips de Filtro por Tipo */}
              {availableTypes.length > 1 && (
                <View style={styles.filterChipsRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScrollContent}>
                    <TouchableOpacity
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selectedTypeFilter === null ? theme.primary : theme.surfaceVariant,
                          borderColor: selectedTypeFilter === null ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setSelectedTypeFilter(null)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: selectedTypeFilter === null ? '#FFFFFF' : theme.textSecondary,
                            fontWeight: selectedTypeFilter === null ? '700' : '500',
                          },
                        ]}
                      >
                        Todos ({allLocations.length})
                      </Text>
                    </TouchableOpacity>

                    {availableTypes.map((type) => {
                      const count = allLocations.filter((l) => l.tipo === type).length;
                      const isSelected = selectedTypeFilter === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: isSelected ? theme.primary : theme.surfaceVariant,
                              borderColor: isSelected ? theme.primary : theme.border,
                            },
                          ]}
                          onPress={() => setSelectedTypeFilter(isSelected ? null : type)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              {
                                color: isSelected ? '#FFFFFF' : theme.textSecondary,
                                fontWeight: isSelected ? '700' : '500',
                              },
                            ]}
                          >
                            {type} ({count})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Lista Completa e Rolável de Locais */}
              {loadingLocations ? (
                <View style={styles.pickerLoading}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={[styles.pickerLoadingText, { color: theme.textSecondary }]}>
                    Carregando locais de estoque...
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredLocations}
                  keyExtractor={(loc) => loc.id.toString()}
                  style={{ flex: 1 }}
                  contentContainerStyle={[
                    styles.pickerListContent,
                    { paddingBottom: Math.max(insets.bottom, 16) + 32 },
                  ]}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.pickerEmpty}>
                      <MapPin size={38} color={theme.textMuted} />
                      <Text style={[styles.pickerEmptyTitle, { color: theme.text }]}>
                        Nenhum local encontrado
                      </Text>
                      <Text style={[styles.pickerEmptySub, { color: theme.textSecondary }]}>
                        {pickerSearch
                          ? `Nenhum depósito ou prateleira corresponde à busca "${pickerSearch}".`
                          : 'Nenhum local de armazenamento cadastrado no sistema.'}
                      </Text>
                      {pickerSearch.length > 0 && (
                        <TouchableOpacity
                          onPress={() => {
                            setPickerSearch('');
                            setSelectedTypeFilter(null);
                          }}
                          style={[styles.clearSearchBtn, { backgroundColor: theme.surfaceVariant }]}
                        >
                          <Text style={[styles.clearSearchText, { color: theme.primary }]}>
                            Limpar Filtro de Busca
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  }
                  renderItem={({ item: loc }) => {
                    const isCurrentLoc = loc.id === item.local_id;
                    const isSelected = loc.id === destinoLocalId;
                    const friendlyName = formatLocationFriendlyName(loc, allLocations);
                    const fullPath = loc.caminho_completo || friendlyName;

                    return (
                      <TouchableOpacity
                        style={[
                          styles.pickerCard,
                          {
                            backgroundColor: isSelected
                              ? theme.badgeBg
                              : isCurrentLoc
                              ? theme.surfaceVariant
                              : theme.card,
                            borderColor: isSelected
                              ? theme.primary
                              : isCurrentLoc
                              ? theme.warning
                              : theme.border,
                            borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
                          },
                        ]}
                        onPress={() => {
                          if (isCurrentLoc) {
                            Alert.alert(
                              'Local Atual',
                              'O material já se encontra neste local. Escolha outro local como destino da transferência.'
                            );
                            return;
                          }
                          setDestinoLocalId(loc.id);
                          setViewMode('form');
                          try {
                            Haptics.selectionAsync();
                          } catch {}
                        }}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.pickerIconWrap,
                            {
                              backgroundColor: isSelected
                                ? theme.primary
                                : isCurrentLoc
                                ? 'rgba(245, 158, 11, 0.2)'
                                : theme.badgeBg,
                            },
                          ]}
                        >
                          <MapPin
                            size={18}
                            color={
                              isSelected
                                ? '#FFFFFF'
                                : isCurrentLoc
                                ? theme.warning
                                : theme.primary
                            }
                          />
                        </View>

                        <View style={styles.pickerInfo}>
                          <View style={styles.pickerTitleRow}>
                            <Text
                              style={[
                                styles.pickerLocName,
                                {
                                  color: isSelected
                                    ? theme.primary
                                    : theme.text,
                                },
                              ]}
                            >
                              {loc.nome}
                            </Text>
                            {loc.tipo ? (
                              <View
                                style={[
                                  styles.typeBadge,
                                  { backgroundColor: theme.surfaceVariant },
                                ]}
                              >
                                <Text style={[styles.typeBadgeText, { color: theme.textSecondary }]}>
                                  {loc.tipo}
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          <Text
                            style={[styles.pickerLocPath, { color: theme.textSecondary }]}
                            numberOfLines={2}
                          >
                            {fullPath}
                          </Text>

                          {isCurrentLoc && (
                            <View style={styles.currentLocPill}>
                              <Text style={[styles.currentLocPillText, { color: theme.warning }]}>
                                • Local de Origem Atual (Material está aqui)
                              </Text>
                            </View>
                          )}
                        </View>

                        {isSelected && (
                          <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
                            <Check size={14} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>
          ) : (
            /* ========================================================
               FORMULÁRIO PRINCIPAL DE TRANSFERÊNCIA
               ======================================================== */
            <>
              {/* Header do Formulário */}
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
                  <View style={[styles.locIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <MapPin size={18} color={theme.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.currentLocText, { color: theme.text }]}>
                      {currentLocName}
                    </Text>
                    <Text style={[styles.currentLocSub, { color: theme.textSecondary }]}>
                      Saldo disponível: {item.quantidade} {item.unidade_medida}
                    </Text>
                  </View>
                </View>

                {/* Novo Local de Destino */}
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
                  onPress={() => setViewMode('picker')}
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
                        {destinoLocalId
                          ? 'Toque para alterar o local de destino'
                          : 'Toque para escolher entre todos os depósitos e prateleiras'}
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

                {/* Justificativa / Motivo (OPCIONAL) */}
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
                    placeholder="Ex: Realocado para melhor organização ou inventário (opcional)"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </ScrollView>

              {/* Rodapé com botão de Confirmação que respeita Safe Area e Barra do Android */}
              <View
                style={[
                  styles.footer,
                  {
                    backgroundColor: theme.surface,
                    borderTopColor: theme.border,
                    paddingBottom: isKeyboardVisible ? 12 : Math.max(insets.bottom, 16) + 16,
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
            </>
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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  locIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Estilos do Seletor de Locais
  pickerContainer: {
    flex: 1,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
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
  filterChipsRow: {
    paddingBottom: 8,
  },
  chipsScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  pickerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  pickerLoadingText: {
    fontSize: 13,
  },
  pickerListContent: {
    padding: 16,
    gap: 10,
  },
  pickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  pickerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerInfo: {
    flex: 1,
  },
  pickerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pickerLocName: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  pickerLocPath: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  currentLocPill: {
    marginTop: 4,
  },
  currentLocPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
    gap: 8,
  },
  pickerEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  pickerEmptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  clearSearchBtn: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  clearSearchText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
