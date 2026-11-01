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
import { ControlType, ItemCondition, ItemStatus, ItemCreateInput, Item } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useStock } from '../context/StockContext';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { X, Pencil, Check } from 'lucide-react-native';

interface EditItemModalProps {
  item: Item | null;
  visible: boolean;
  onClose: () => void;
  onSuccess?: (updated: Item) => void;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  item,
  visible,
  onClose,
  onSuccess,
}) => {
  const { theme, isDark } = useTheme();
  const { subgroups, locations, updateItem } = useStock();
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

  // Carrega os dados do item selecionado ao abrir
  useEffect(() => {
    if (visible && item) {
      setNome(item.nome || '');
      setSubgroupId(item.subgrupo_id ?? null);
      setLocalId(item.local_id ?? null);
      setBmp(item.bmp || '');
      setCodigoInterno(item.codigo_interno || '');
      setNumeroSerie(item.numero_serie || '');
      setTipoControle(item.tipo_controle || 'UNITARIO');
      setQuantidade(String(item.quantidade ?? 1));
      setQuantidadeMinima(String(item.quantidade_minima ?? 0));
      setUnidadeMedida(item.unidade_medida || 'UNIDADE');
      setEstadoConservacao(item.estado_conservacao || 'BOM');
      setStatus(item.status || 'DISPONIVEL');
      setObservacoes(item.observacoes || '');
    }
  }, [visible, item]);

  // Handler de botão Voltar do Android
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

  const isIndividual = tipoControle === 'UNITARIO' || bmp.trim().length > 0 || numeroSerie.trim().length > 0;

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!nome.trim()) {
      Alert.alert('Campo Obrigatório', 'Informe o nome ou modelo do material.');
      return;
    }

    if (!subgroupId) {
      Alert.alert('Categoria Obrigatória', 'Selecione um subgrupo classificador.');
      return;
    }

    const qty = parseFloat(quantidade.replace(',', '.'));
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Quantidade Inválida', 'Informe uma quantidade válida maior que zero.');
      return;
    }

    if (isIndividual && qty !== 1) {
      Alert.alert(
        'Quantidade Incompatível',
        'Itens com controle Unitário, BMP (Patrimônio) ou Número de Série devem ter quantidade estritamente igual a 1.'
      );
      return;
    }

    const minQty = parseFloat(quantidadeMinima.replace(',', '.')) || 0;

    setIsSubmitting(true);
    try {
      const payload: Partial<ItemCreateInput> = {
        nome: nome.trim(),
        subgrupo_id: subgroupId,
        local_id: localId,
        bmp: bmp.trim() || null,
        codigo_interno: codigoInterno.trim() || null,
        numero_serie: numeroSerie.trim() || null,
        tipo_controle: tipoControle,
        quantidade: isIndividual ? 1 : qty,
        quantidade_minima: minQty,
        unidade_medida: unidadeMedida.trim().toUpperCase() || 'UNIDADE',
        estado_conservacao: estadoConservacao,
        status: status,
        observacoes: observacoes.trim() || null,
      };

      const updated = await updateItem(item.id, payload);

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      Alert.alert('Sucesso', 'Material atualizado com sucesso no estoque!');
      onClose();
      if (onSuccess) onSuccess(updated);
    } catch (err: any) {
      Alert.alert('Erro ao atualizar material', err.message || 'Verifique os dados informados.');
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
  const statusOptions: { id: ItemStatus; label: string }[] = [
    { id: 'DISPONIVEL', label: 'Disponível' },
    { id: 'EM_USO', label: 'Em Uso' },
    { id: 'CAUTELADO', label: 'Cautelado' },
    { id: 'EM_MANUTENCAO', label: 'Em Manutenção' },
    { id: 'BAIXADO', label: 'Baixado' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.surface,
              paddingTop: insets.top > 0 ? insets.top + 8 : 16,
              paddingBottom: isKeyboardVisible
                ? keyboardHeight + 16
                : insets.bottom > 0
                ? insets.bottom + 16
                : 24,
              maxHeight: screenHeight * 0.94,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerTitleWrap}>
              <View style={[styles.headerIconWrap, { backgroundColor: theme.badgeBg }]}>
                <Pencil size={20} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.text }]}>Editar Material</Text>
                <Text style={[styles.subTitle, { color: theme.textMuted }]}>
                  ID #{item.id} {item.bmp ? `• BMP ${item.bmp}` : ''}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.surfaceVariant }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Form Scroll */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
          >
            {/* Nome / Modelo */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Nome / Descrição do Material *
            </Text>
            <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Ex: Switch Cisco Catalyst 2960"
                placeholderTextColor={theme.textMuted}
                value={nome}
                onChangeText={setNome}
              />
            </View>

            {/* Subgrupo / Categoria */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Classificação / Subgrupo *
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

            {/* Identificadores em Linha (BMP, Código) */}
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

            {/* Número de Série */}
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
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Quantidade {isIndividual ? '(Fixo 1)' : ''}
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.inputBorder,
                      opacity: isIndividual ? 0.75 : 1,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    keyboardType="numeric"
                    value={isIndividual ? '1' : quantidade}
                    onChangeText={setQuantidade}
                    editable={!isIndividual}
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

            {/* Status do Material */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Status Operacional</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {statusOptions.map((st) => {
                const selected = status === st.id;
                return (
                  <TouchableOpacity
                    key={st.id}
                    onPress={() => setStatus(st.id)}
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
                      {st.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Observações */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Observações Gerais</Text>
            <View style={[styles.textAreaBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <TextInput
                style={[styles.textArea, { color: theme.text }]}
                placeholder="Detalhes adicionais, tombo patrimonial, histórico ou especificações..."
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
                value={observacoes}
                onChangeText={setObservacoes}
              />
            </View>
          </ScrollView>

          {/* Footer Submit Action */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: theme.border }]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.primary }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Check size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Salvar Alterações</Text>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingVertical: 16,
    paddingBottom: 24,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    justifyContent: 'center',
  },
  input: {
    fontSize: 14,
    height: '100%',
  },
  textAreaBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    marginTop: 4,
  },
  textArea: {
    fontSize: 14,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  flexItem: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnText: {
    fontSize: 12,
  },
  chipScroll: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 12.5,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
