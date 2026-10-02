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
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ControlType, ItemCondition, ItemStatus, ItemCreateInput } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useStock } from '../context/StockContext';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { X, Plus, Check } from 'lucide-react-native';

interface AddItemModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { theme } = useTheme();
  const { subgroups, locations, createItem } = useStock();
  const insets = useSafeAreaInsets();
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();
  const { height: screenHeight } = useWindowDimensions();

  const [nome, setNome] = useState<string>('');
  const [subgroupId, setSubgroupId] = useState<number | null>(null);
  const [localId, setLocalId] = useState<number | null>(null);
  const [bmp, setBmp] = useState<string>('');
  const [codigoInterno, setCodigoInterno] = useState<string>('');
  const [numeroSerie, setNumeroSerie] = useState<string>('');
  const [tipoControle, setTipoControle] = useState<ControlType>('UNITARIO');
  const [quantidade, setQuantidade] = useState<string>('1');
  const [quantidadeMinima, setQuantidadeMinima] = useState<string>('0');
  const [unidadeMedida, setUnidadeMedida] = useState<string>('UNIDADE');
  const [estadoConservacao, setEstadoConservacao] = useState<ItemCondition>('BOM');
  const [status, setStatus] = useState<ItemStatus>('DISPONIVEL');
  const [observacoes, setObservacoes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Inicializa com primeiro subgrupo e local se existirem
  useEffect(() => {
    if (visible) {
      setNome('');
      setBmp('');
      setCodigoInterno('');
      setNumeroSerie('');
      setQuantidade('1');
      setQuantidadeMinima('0');
      setUnidadeMedida('UNIDADE');
      setTipoControle('UNITARIO');
      setEstadoConservacao('BOM');
      setStatus('DISPONIVEL');
      setObservacoes('');

      if (subgroups.length > 0 && !subgroupId) {
        setSubgroupId(subgroups[0].id);
      }
      if (locations.length > 0 && !localId) {
        setLocalId(locations[0].id);
      }
    }
  }, [visible, subgroups, locations]);

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

  const handleSubmit = async () => {
    if (!nome.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome ou modelo do material.');
      return;
    }

    if (!subgroupId) {
      Alert.alert('Categoria obrigatória', 'Selecione um subgrupo classificador.');
      return;
    }

    const qty = parseFloat(quantidade.replace(',', '.'));
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Quantidade inválida', 'Informe uma quantidade válida.');
      return;
    }

    const minQty = parseFloat(quantidadeMinima.replace(',', '.')) || 0;

    setIsSubmitting(true);
    try {
      const payload: ItemCreateInput = {
        nome: nome.trim(),
        subgrupo_id: subgroupId,
        local_id: localId,
        bmp: bmp.trim() || null,
        codigo_interno: codigoInterno.trim() || null,
        numero_serie: numeroSerie.trim() || null,
        tipo_controle: tipoControle,
        quantidade: qty,
        quantidade_minima: minQty,
        unidade_medida: unidadeMedida.trim().toUpperCase() || 'UNIDADE',
        estado_conservacao: estadoConservacao,
        status: status,
        observacoes: observacoes.trim() || null,
      };

      await createItem(payload);

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      Alert.alert('Sucesso', 'Material cadastrado no estoque com sucesso!');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      Alert.alert('Erro ao cadastrar material', err.message || 'Verifique os dados informados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const unidades = ['UNIDADE', 'PECA', 'METRO', 'PACOTE', 'CAIXA', 'ROLO', 'KIT'];
  const condicoes: { id: ItemCondition; label: string }[] = [
    { id: 'NOVO', label: 'Novo' },
    { id: 'BOM', label: 'Bom' },
    { id: 'REGULAR', label: 'Regular' },
    { id: 'COM_DEFEITO', label: 'Com Defeito' },
    { id: 'SUCATA', label: 'Sucata' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.backdrop,
          {
            paddingBottom: keyboardHeight,
          },
        ]}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              maxHeight: isKeyboardVisible
                ? Math.max(280, screenHeight - keyboardHeight - (insets.top || 24) - 10)
                : '92%',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>Novo Material</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Cadastro no acervo de TI & Estoque
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.surfaceVariant }]}
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
            {/* Nome do Material */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Nome do Material / Modelo *
            </Text>
            <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Ex: Switch 24p Gigabit Cisco SG350"
                placeholderTextColor={theme.textMuted}
                value={nome}
                onChangeText={setNome}
              />
            </View>

            {/* Subgrupo / Categoria */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Subgrupo / Categoria *
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {subgroups.map((sg) => {
                const selected = subgroupId === sg.id;
                return (
                  <TouchableOpacity
                    key={sg.id}
                    onPress={() => setSubgroupId(sg.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? theme.primary : theme.surfaceVariant,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? '#FFFFFF' : theme.text, fontWeight: selected ? '700' : '500' },
                      ]}
                    >
                      {sg.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Local Físico */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Local Físico de Armazenamento
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {locations.map((loc) => {
                const selected = localId === loc.id;
                return (
                  <TouchableOpacity
                    key={loc.id}
                    onPress={() => setLocalId(loc.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? theme.primary : theme.surfaceVariant,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? '#FFFFFF' : theme.text, fontWeight: selected ? '700' : '500' },
                      ]}
                    >
                      {loc.caminho_completo || loc.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Identificadores em Linha (BMP, Código, Serial) */}
            <View style={styles.row}>
              <View style={styles.flexItem}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>BMP (Patrimônio)</Text>
                <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Ex: 123456"
                    placeholderTextColor={theme.textMuted}
                    value={bmp}
                    onChangeText={setBmp}
                  />
                </View>
              </View>

              <View style={styles.flexItem}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Cód. Interno</Text>
                <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Ex: TI-042"
                    placeholderTextColor={theme.textMuted}
                    value={codigoInterno}
                    onChangeText={setCodigoInterno}
                  />
                </View>
              </View>
            </View>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Número de Série</Text>
            <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Ex: FOC223401A"
                placeholderTextColor={theme.textMuted}
                value={numeroSerie}
                onChangeText={setNumeroSerie}
              />
            </View>

            {/* Tipo de Controle (Unitário / Granel) */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Tipo de Controle</Text>
            <View style={styles.toggleRow}>
              {(['UNITARIO', 'GRANEL'] as ControlType[]).map((tc) => {
                const active = tipoControle === tc;
                return (
                  <TouchableOpacity
                    key={tc}
                    onPress={() => setTipoControle(tc)}
                    style={[
                      styles.toggleBtn,
                      {
                        backgroundColor: active ? theme.primary : theme.surfaceVariant,
                        borderColor: active ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleBtnText,
                        { color: active ? '#FFFFFF' : theme.text, fontWeight: active ? '700' : '500' },
                      ]}
                    >
                      {tc === 'UNITARIO' ? 'Unitário (Individual/Serial)' : 'A Granel (Saldo contínuo)'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quantidade e Estoque Mínimo */}
            <View style={styles.row}>
              <View style={styles.flexItem}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Quantidade Inicial</Text>
                <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    keyboardType="numeric"
                    value={quantidade}
                    onChangeText={setQuantidade}
                    placeholder="1"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </View>

              <View style={styles.flexItem}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Estoque Mínimo</Text>
                <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    keyboardType="numeric"
                    value={quantidadeMinima}
                    onChangeText={setQuantidadeMinima}
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </View>
            </View>

            {/* Unidade de Medida */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Unidade de Medida</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {unidades.map((u) => {
                const selected = unidadeMedida === u;
                return (
                  <TouchableOpacity
                    key={u}
                    onPress={() => setUnidadeMedida(u)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? theme.primary : theme.surfaceVariant,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? '#FFFFFF' : theme.text, fontWeight: selected ? '700' : '500' },
                      ]}
                    >
                      {u}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Estado de Conservação */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Estado de Conservação</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {condicoes.map((c) => {
                const selected = estadoConservacao === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setEstadoConservacao(c.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? theme.primary : theme.surfaceVariant,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? '#FFFFFF' : theme.text, fontWeight: selected ? '700' : '500' },
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Observações */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Observações</Text>
            <View style={[styles.inputBox, styles.textAreaBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <TextInput
                style={[styles.input, styles.textArea, { color: theme.text }]}
                multiline
                numberOfLines={3}
                placeholder="Observações complementares, número de nota, estado físico..."
                placeholderTextColor={theme.textMuted}
                value={observacoes}
                onChangeText={setObservacoes}
              />
            </View>
          </ScrollView>

          {/* Rodapé com botão de Enviar e Safe Area */}
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
                  <Plus size={18} color="#FFFFFF" />
                  <Text style={styles.submitText}>Cadastrar Material no Estoque</Text>
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
    maxHeight: '92%',
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
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingVertical: 14,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  inputBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
    justifyContent: 'center',
  },
  textAreaBox: {
    height: 80,
    paddingVertical: 8,
    marginBottom: 12,
  },
  input: {
    fontSize: 14,
  },
  textArea: {
    textAlignVertical: 'top',
    height: '100%',
  },
  chipScroll: {
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flexItem: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  toggleBtnText: {
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
