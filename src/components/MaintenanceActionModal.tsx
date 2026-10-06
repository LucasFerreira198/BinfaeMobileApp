import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Item, Location } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useStock } from '../context/StockContext';
import { formatLocationFriendlyName } from '../storage/db';
import {
  X,
  Wrench,
  CheckCircle2,
  RotateCcw,
  MapPin,
  Search,
  Check,
  AlertTriangle,
  FileText,
  Building,
} from 'lucide-react-native';

export type MaintenanceActionType =
  | 'SEND_TO_MAINTENANCE'
  | 'COMPLETE_REPAIR'
  | 'RETURN_FROM_MAINTENANCE';

interface MaintenanceActionModalProps {
  item: Item | null;
  actionType: MaintenanceActionType;
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const MaintenanceActionModal: React.FC<MaintenanceActionModalProps> = ({
  item,
  actionType,
  visible,
  onClose,
  onSuccess,
}) => {
  const { theme } = useTheme();
  const { locations, moveItem, syncData } = useStock();
  const insets = useSafeAreaInsets();

  const [motivo, setMotivo] = useState<string>('');
  const [destinoLocalId, setDestinoLocalId] = useState<number | null>(null);
  const [searchLocation, setSearchLocation] = useState<string>('');
  const [useOriginalLocation, setUseOriginalLocation] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (visible && item) {
      setMotivo('');
      setSearchLocation('');
      setDestinoLocalId(item.local_id || null);
      setUseOriginalLocation(true);
    }
  }, [visible, item]);

  const originalLocationObj = useMemo(() => {
    if (!item?.local_id) return null;
    return locations.find((l) => l.id === item.local_id) || null;
  }, [item, locations]);

  const originalLocationName = useMemo(() => {
    if (originalLocationObj) {
      return formatLocationFriendlyName(originalLocationObj, locations);
    }
    return item?.local?.caminho_completo || item?.local?.nome || 'Local Não Definido';
  }, [originalLocationObj, item, locations]);

  const filteredLocations = useMemo(() => {
    if (!searchLocation.trim()) return locations;
    const q = searchLocation.toLowerCase().trim();
    return locations.filter((l) => {
      const friendly = formatLocationFriendlyName(l, locations).toLowerCase();
      const name = l.nome.toLowerCase();
      return friendly.includes(q) || name.includes(q);
    });
  }, [locations, searchLocation]);

  const handleSubmit = async () => {
    if (!item) return;

    if (actionType === 'SEND_TO_MAINTENANCE') {
      if (!motivo.trim()) {
        Alert.alert('Defeito Obrigatório', 'Por favor, descreva o defeito ou erro apresentado.');
        return;
      }
    } else if (actionType === 'COMPLETE_REPAIR') {
      if (!motivo.trim()) {
        Alert.alert('Laudo Obrigatório', 'Por favor, descreva o laudo técnico ou reparo realizado.');
        return;
      }
    } else if (actionType === 'RETURN_FROM_MAINTENANCE') {
      const finalDestinoId = useOriginalLocation ? item.local_id : destinoLocalId;
      if (!finalDestinoId) {
        Alert.alert('Local Obrigatório', 'Selecione o local para onde o material será devolvido.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (actionType === 'SEND_TO_MAINTENANCE') {
        await moveItem(item.id, {
          tipo_movimentacao: 'MANUTENCAO',
          quantidade_movimentada: item.tipo_controle === 'UNITARIO' ? 1 : item.quantidade,
          motivo: motivo.trim(),
        });
        Alert.alert('Sucesso', 'Material enviado para manutenção com sucesso!');
      } else if (actionType === 'COMPLETE_REPAIR') {
        await moveItem(item.id, {
          tipo_movimentacao: 'CONCLUIR_REPARO',
          quantidade_movimentada: item.tipo_controle === 'UNITARIO' ? 1 : item.quantidade,
          motivo: motivo.trim(),
        });
        Alert.alert('Reparo Concluído', 'Material marcado como consertado (aguardando devolução)!');
      } else if (actionType === 'RETURN_FROM_MAINTENANCE') {
        const targetId = useOriginalLocation ? item.local_id : destinoLocalId;
        await moveItem(item.id, {
          tipo_movimentacao: 'RETORNO_MANUTENCAO',
          destino_local_id: targetId,
          quantidade_movimentada: item.tipo_controle === 'UNITARIO' ? 1 : item.quantidade,
          motivo: motivo.trim() || 'Retorno ao estoque após conclusão de reparo',
        });
        Alert.alert('Material Devolvido', 'Material retornado ao estoque com sucesso!');
      }

      await syncData(true);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      Alert.alert('Erro ao processar', err.message || 'Não foi possível completar a operação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible || !item) return null;

  const getHeaderInfo = () => {
    switch (actionType) {
      case 'SEND_TO_MAINTENANCE':
        return {
          title: 'Enviar para Manutenção',
          subtitle: 'Descreva o defeito apresentado para a bancada técnica',
          icon: Wrench,
          color: theme.danger,
          btnText: 'Confirmar Envio',
        };
      case 'COMPLETE_REPAIR':
        return {
          title: 'Concluir Reparo / Laudo',
          subtitle: 'Registre o procedimento efetuado para devolução',
          icon: CheckCircle2,
          color: theme.success,
          btnText: 'Concluir Reparo',
        };
      case 'RETURN_FROM_MAINTENANCE':
        return {
          title: 'Confirmar Devolução',
          subtitle: 'Retorne o material consertado ao estoque ou setor',
          icon: RotateCcw,
          color: theme.primary,
          btnText: 'Confirmar Devolução',
        };
    }
  };

  const info = getHeaderInfo();
  const HeaderIcon = info.icon;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <View style={styles.headerLeft}>
                <View style={[styles.iconWrap, { backgroundColor: theme.badgeBg }]}>
                  <HeaderIcon size={20} color={info.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: theme.text }]}>{info.title}</Text>
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

            {/* Conteúdo */}
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Card Resumo do Material */}
              <View
                style={[
                  styles.itemSummaryCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={2}>
                  {item.nome}
                </Text>
                <View style={styles.summaryMetaRow}>
                  {item.bmp ? (
                    <Text style={[styles.metaPill, { color: theme.primary }]}>
                      BMP: {item.bmp}
                    </Text>
                  ) : item.codigo_interno ? (
                    <Text style={[styles.metaPill, { color: theme.textSecondary }]}>
                      Cód: {item.codigo_interno}
                    </Text>
                  ) : null}
                  <Text style={[styles.metaPill, { color: theme.textSecondary }]}>
                    Local Atual: {originalLocationName}
                  </Text>
                </View>
              </View>

              {/* 1. Modo Enviar para Manutenção */}
              {actionType === 'SEND_TO_MAINTENANCE' && (
                <View style={styles.sectionWrap}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>
                    Relato do Defeito / Problema Identificado *
                  </Text>
                  <TextInput
                    style={[
                      styles.multilineInput,
                      {
                        backgroundColor: theme.surfaceVariant,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    placeholder="Descreva detalhadamente o erro ou dano apresentado (ex: tela não liga, cabo rompido, conector oxidado)..."
                    placeholderTextColor={theme.textMuted}
                    value={motivo}
                    onChangeText={setMotivo}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <Text style={[styles.hintText, { color: theme.textMuted }]}>
                    Este texto ficará gravado no material e na aba de manutenção da bancada.
                  </Text>
                </View>
              )}

              {/* 2. Modo Concluir Reparo */}
              {actionType === 'COMPLETE_REPAIR' && (
                <View style={styles.sectionWrap}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>
                    Laudo Técnico do Reparo Efetuado *
                  </Text>
                  <TextInput
                    style={[
                      styles.multilineInput,
                      {
                        backgroundColor: theme.surfaceVariant,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    placeholder="Descreva a solução aplicada (ex: substituição da fonte, troca de pasta térmica, formatação)..."
                    placeholderTextColor={theme.textMuted}
                    value={motivo}
                    onChangeText={setMotivo}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <Text style={[styles.hintText, { color: theme.textMuted }]}>
                    O material passará para a fase de aguardando devolução com este laudo gravado.
                  </Text>
                </View>
              )}

              {/* 3. Modo Retorno / Devolução de Manutenção */}
              {actionType === 'RETURN_FROM_MAINTENANCE' && (
                <View style={styles.sectionWrap}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>
                    Para onde o material deve retornar?
                  </Text>

                  {/* Opção 1: Voltar ao Local Original */}
                  <TouchableOpacity
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: useOriginalLocation ? theme.badgeBg : theme.card,
                        borderColor: useOriginalLocation ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setUseOriginalLocation(true)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.optionRadio}>
                      <View
                        style={[
                          styles.radioDot,
                          { backgroundColor: useOriginalLocation ? theme.primary : 'transparent' },
                        ]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, { color: theme.text }]}>
                        Retornar ao Local Anterior
                      </Text>
                      <Text style={[styles.optionSub, { color: theme.textSecondary }]}>
                        {originalLocationName}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Opção 2: Escolher Novo Local */}
                  <TouchableOpacity
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: !useOriginalLocation ? theme.badgeBg : theme.card,
                        borderColor: !useOriginalLocation ? theme.primary : theme.border,
                        marginTop: 8,
                      },
                    ]}
                    onPress={() => setUseOriginalLocation(false)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.optionRadio}>
                      <View
                        style={[
                          styles.radioDot,
                          { backgroundColor: !useOriginalLocation ? theme.primary : 'transparent' },
                        ]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, { color: theme.text }]}>
                        Escolher Novo Local de Destino
                      </Text>
                      <Text style={[styles.optionSub, { color: theme.textSecondary }]}>
                        Transferir para outro depósito, armário ou setor
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Lista de Seleção de Novo Local se Opção 2 estiver ativa */}
                  {!useOriginalLocation && (
                    <View style={styles.locationSelectorBlock}>
                      <View style={[styles.searchBox, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                        <Search size={15} color={theme.textMuted} />
                        <TextInput
                          style={[styles.searchInput, { color: theme.text }]}
                          placeholder="Buscar depósito, prateleira ou setor..."
                          placeholderTextColor={theme.textMuted}
                          value={searchLocation}
                          onChangeText={setSearchLocation}
                        />
                      </View>

                      <ScrollView style={styles.locationsListScroll} nestedScrollEnabled>
                        {filteredLocations.slice(0, 30).map((loc) => {
                          const isSelected = destinoLocalId === loc.id;
                          const friendly = formatLocationFriendlyName(loc, locations);
                          return (
                            <TouchableOpacity
                              key={loc.id}
                              style={[
                                styles.locationRow,
                                {
                                  backgroundColor: isSelected ? theme.badgeBg : 'transparent',
                                  borderBottomColor: theme.border,
                                },
                              ]}
                              onPress={() => setDestinoLocalId(loc.id)}
                            >
                              <MapPin size={14} color={isSelected ? theme.primary : theme.textMuted} />
                              <Text
                                style={[
                                  styles.locationRowText,
                                  {
                                    color: isSelected ? theme.primary : theme.text,
                                    fontWeight: isSelected ? '700' : '400',
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {friendly}
                              </Text>
                              {isSelected && <Check size={14} color={theme.primary} />}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  <Text style={[styles.inputLabel, { color: theme.text, marginTop: 14 }]}>
                    Observações de Devolução (Opcional)
                  </Text>
                  <TextInput
                    style={[
                      styles.singleInput,
                      {
                        backgroundColor: theme.surfaceVariant,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    placeholder="Ex: Testado e operando perfeitamente..."
                    placeholderTextColor={theme.textMuted}
                    value={motivo}
                    onChangeText={setMotivo}
                  />
                </View>
              )}
            </ScrollView>

            {/* Rodapé com Botão de Confirmação */}
            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.border }]}
                onPress={onClose}
                disabled={isSubmitting}
              >
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: info.color }]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <>
                    <Check size={18} color="#000000" />
                    <Text style={styles.confirmBtnText}>{info.btnText}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
    maxHeight: '94%',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  itemSummaryCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    fontSize: 11,
    fontWeight: '600',
  },
  sectionWrap: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  multilineInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    minHeight: 90,
  },
  singleInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
  },
  hintText: {
    fontSize: 11,
    marginTop: 4,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  optionRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  locationSelectorBlock: {
    marginTop: 10,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
  },
  locationsListScroll: {
    maxHeight: 160,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  locationRowText: {
    flex: 1,
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 6,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
});
