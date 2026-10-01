import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Item, Location } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useStock } from '../context/StockContext';
import { X, Check } from 'lucide-react-native';

interface MovementModalProps {
  item: Item | null;
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type MovementType = 'CAUTELA' | 'DEVOLUCAO' | 'TRANSFERENCIA' | 'MANUTENCAO';

export const MovementModal: React.FC<MovementModalProps> = ({
  item,
  visible,
  onClose,
  onSuccess,
}) => {
  const { theme } = useTheme();
  const { locations, moveItem } = useStock();

  const [tipo, setTipo] = useState<MovementType>('CAUTELA');
  const [quantidade, setQuantidade] = useState<string>('1');
  const [destinoLocalId, setDestinoLocalId] = useState<number | null>(null);
  const [motivo, setMotivo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (item) {
      setQuantidade('1');
      setMotivo('');
      setDestinoLocalId(item.local_id || null);
      if (item.status === 'CAUTELADO') {
        setTipo('DEVOLUCAO');
      } else {
        setTipo('CAUTELA');
      }
    }
  }, [item, visible]);

  // Android Back Button handler
  useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      onClose();
      return true;
    };
    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [visible, onClose]);

  if (!item) return null;

  const handleSubmit = async () => {
    const qty = parseFloat(quantidade);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Quantidade inválida', 'Informe uma quantidade maior que zero.');
      return;
    }

    if (qty > item.quantidade && item.tipo_controle === 'UNITARIO') {
      Alert.alert('Quantidade indisponível', `O saldo atual deste material é ${item.quantidade}.`);
      return;
    }

    if (!motivo.trim()) {
      Alert.alert('Motivo obrigatório', 'Por favor, informe a justificativa ou militar responsável.');
      return;
    }

    setIsSubmitting(true);
    try {
      await moveItem(item.id, {
        tipo_movimentacao: tipo,
        quantidade_movimentada: qty,
        destino_local_id: tipo === 'TRANSFERENCIA' ? destinoLocalId : item.local_id,
        motivo: motivo.trim(),
      });

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      Alert.alert('Sucesso', 'Movimentação registrada com sucesso!');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      Alert.alert('Erro na movimentação', err.message || 'Não foi possível registrar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const types = [
    { id: 'CAUTELADO', label: 'Cautela', value: 'CAUTELA' },
    { id: 'DISPONIVEL', label: 'Devolução', value: 'DEVOLUCAO' },
    { id: 'TRANSFERENCIA', label: 'Transferir Local', value: 'TRANSFERENCIA' },
    { id: 'EM_MANUTENCAO', label: 'Manutenção', value: 'MANUTENCAO' },
  ];

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
            <View>
              <Text style={[styles.title, { color: theme.text }]}>Registrar Movimentação</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.nome}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.surfaceVariant }]}
            >
              <X size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.scrollContent}>
            {/* Tipo de Movimentação */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Tipo de Operação</Text>
            <View style={styles.typeGrid}>
              {types.map((t) => {
                const active = tipo === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setTipo(t.value as MovementType)}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: active ? theme.primary : theme.surfaceVariant,
                        borderColor: active ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        {
                          color: active ? '#FFFFFF' : theme.text,
                          fontWeight: active ? '700' : '500',
                        },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quantidade */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Quantidade ({item.unidade_medida})
            </Text>
            <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                keyboardType="numeric"
                value={quantidade}
                onChangeText={setQuantidade}
                placeholder="Ex: 1"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            {/* Seleção de Local (apenas se for transferência) */}
            {tipo === 'TRANSFERENCIA' && (
              <>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Novo Local Físico</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.locScroll}>
                  {locations.map((loc) => {
                    const selected = destinoLocalId === loc.id;
                    return (
                      <TouchableOpacity
                        key={loc.id}
                        onPress={() => setDestinoLocalId(loc.id)}
                        style={[
                          styles.locChip,
                          {
                            backgroundColor: selected ? theme.primary : theme.surfaceVariant,
                            borderColor: selected ? theme.primary : theme.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.locChipText,
                            { color: selected ? '#FFFFFF' : theme.text },
                          ]}
                        >
                          {loc.nome}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* Motivo / Responsável */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {tipo === 'CAUTELA' ? 'Militar Responsável / Motivo' : 'Justificativa / Observação'}
            </Text>
            <View style={[styles.inputBox, styles.textAreaBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <TextInput
                style={[styles.input, styles.textArea, { color: theme.text }]}
                multiline
                numberOfLines={3}
                value={motivo}
                onChangeText={setMotivo}
                placeholder={tipo === 'CAUTELA' ? 'Ex: 3S Silva - Operação Ágata' : 'Ex: Material devolvido limpo e revisado'}
                placeholderTextColor={theme.textMuted}
              />
            </View>
          </ScrollView>

          {/* Botão de Enviar */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.primary }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Check size={18} color="#FFFFFF" />
                  <Text style={styles.submitText}>Confirmar Operação</Text>
                </>
              )}
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
    maxHeight: '85%',
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
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    maxWidth: 260,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingVertical: 14,
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 4,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  typeChipText: {
    fontSize: 13,
  },
  inputBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
    justifyContent: 'center',
  },
  textAreaBox: {
    height: 90,
    paddingVertical: 8,
  },
  input: {
    fontSize: 14,
  },
  textArea: {
    textAlignVertical: 'top',
    height: '100%',
  },
  locScroll: {
    marginBottom: 8,
  },
  locChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 8,
  },
  locChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
