import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { api } from '../api/client';
import { Military } from '../types';
import { X, UserPlus, Shield, User, Lock, IdCard, Search, Check } from 'lucide-react-native';

interface CreateUserModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  militaryList: Military[];
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  visible,
  onClose,
  onSuccess,
  militaryList,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();
  const { height: screenHeight } = useWindowDimensions();

  const [mode, setMode] = useState<'militar' | 'avulso'>('militar');
  const [selectedSaram, setSelectedSaram] = useState<string>('');
  const [militarySearch, setMilitarySearch] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setMode('militar');
      setSelectedSaram('');
      setMilitarySearch('');
      setUsername('');
      setPassword('');
      setIsAdmin(false);
      setIsActive(true);
      setSubmitting(false);
    }
  }, [visible]);

  const filteredMilitaries = useMemo(() => {
    if (!militaryList || militaryList.length === 0) return [];
    const q = militarySearch.trim().toLowerCase();
    if (!q) return militaryList.slice(0, 30);
    return militaryList.filter((m) => {
      const nomeGuerra = (m.nome_guerra || '').toLowerCase();
      const nomeCompleto = (m.nome_completo || '').toLowerCase();
      const saramStr = m.saram ? m.saram.toString() : '';
      const secaoStr = (m.secao || '').toLowerCase();
      return (
        nomeGuerra.includes(q) ||
        nomeCompleto.includes(q) ||
        saramStr.includes(q) ||
        secaoStr.includes(q)
      );
    });
  }, [militaryList, militarySearch]);

  const selectedMilitary = useMemo(() => {
    if (!selectedSaram || !militaryList) return null;
    return militaryList.find((m) => m.saram.toString() === selectedSaram) || null;
  }, [militaryList, selectedSaram]);

  useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      onClose();
      return true;
    };
    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  const handleSubmit = async () => {
    if (mode === 'militar' && !selectedSaram.trim()) {
      Alert.alert('SARAM Obrigatório', 'Por favor, informe o SARAM do militar para vincular.');
      return;
    }

    if (mode === 'avulso' && !username.trim()) {
      Alert.alert('Usuário Obrigatório', 'Por favor, informe o nome de usuário (username).');
      return;
    }

    if (!password.trim() || password.length < 6) {
      Alert.alert('Senha Inválida', 'A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'militar') {
        const saramNum = parseInt(selectedSaram.trim(), 10);
        if (isNaN(saramNum)) {
          Alert.alert('SARAM Inválido', 'O SARAM deve ser um número válido.');
          setSubmitting(false);
          return;
        }

        await api.createUser({
          saram: saramNum,
          password: password.trim(),
          admin: isAdmin,
          ativo: isActive,
        });
      } else {
        await api.createUser({
          username: username.trim(),
          password: password.trim(),
          admin: true, // admin avulso sempre é admin
          ativo: isActive,
        });
      }

      Alert.alert('Sucesso', 'Conta de usuário criada com sucesso!');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Erro ao Criar Usuário', err.message || 'Falha ao salvar a nova conta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
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
                : '90%',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.iconWrap, { backgroundColor: theme.badgeBg }]}>
                <UserPlus size={20} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.text }]}>Criar Novo Usuário</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Cadastro de credenciais e permissões
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.surfaceVariant }]}
            >
              <X size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom: isKeyboardVisible ? 20 : Math.max(insets.bottom, 20) + 16,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Seletor de Tipo de Conta */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor: mode === 'militar' ? theme.primary : theme.surfaceVariant,
                    borderColor: mode === 'militar' ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setMode('militar')}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    { color: mode === 'militar' ? '#FFFFFF' : theme.text },
                  ]}
                >
                  Vincular a Militar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor: mode === 'avulso' ? theme.primary : theme.surfaceVariant,
                    borderColor: mode === 'avulso' ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => {
                  setMode('avulso');
                  setIsAdmin(true); // avulso é admin
                }}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    { color: mode === 'avulso' ? '#FFFFFF' : theme.text },
                  ]}
                >
                  Admin do Sistema
                </Text>
              </TouchableOpacity>
            </View>

            {/* Campos condicionados ao modo */}
            {mode === 'militar' ? (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Militar a Vincular *
                </Text>

                {/* Card do Militar Selecionado */}
                {selectedMilitary && (
                  <View
                    style={[
                      styles.selectedMilCard,
                      {
                        backgroundColor: theme.surfaceVariant,
                        borderColor: theme.primary,
                      },
                    ]}
                  >
                    <View style={styles.selectedMilInfo}>
                      <View style={styles.selectedMilHeader}>
                        <View style={[styles.selectedCheckBadge, { backgroundColor: theme.primary }]}>
                          <Check size={12} color="#FFFFFF" />
                        </View>
                        <Text style={[styles.selectedMilName, { color: theme.text }]}>
                          {selectedMilitary.posto_graduacao} {selectedMilitary.nome_guerra}
                        </Text>
                      </View>
                      <Text style={[styles.selectedMilDetails, { color: theme.textSecondary }]}>
                        SARAM: {selectedMilitary.saram} • {selectedMilitary.nome_completo}
                      </Text>
                      {selectedMilitary.secao && (
                        <Text style={[styles.selectedMilSecao, { color: theme.primary }]}>
                          Seção: {selectedMilitary.secao}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelectedSaram('')}
                      style={[styles.clearMilBtn, { backgroundColor: theme.dangerBg }]}
                    >
                      <X size={14} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Barra de Busca de Militares */}
                <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                  <Search size={18} color={theme.textMuted} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Buscar por guerra, nome completo ou SARAM..."
                    placeholderTextColor={theme.textMuted}
                    value={militarySearch}
                    onChangeText={setMilitarySearch}
                    autoCapitalize="none"
                  />
                  {militarySearch.length > 0 && (
                    <TouchableOpacity onPress={() => setMilitarySearch('')}>
                      <X size={16} color={theme.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Lista com scroll mostrando ~5 militares */}
                <View
                  style={[
                    styles.milListContainer,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <ScrollView
                    nestedScrollEnabled={true}
                    style={styles.milListScroll}
                    showsVerticalScrollIndicator={true}
                  >
                    {filteredMilitaries.length === 0 ? (
                      <View style={styles.milEmptyBox}>
                        <Text style={[styles.milEmptyText, { color: theme.textMuted }]}>
                          Nenhum militar encontrado
                        </Text>
                      </View>
                    ) : (
                      filteredMilitaries.map((m) => {
                        const isSelected = selectedSaram === m.saram.toString();
                        return (
                          <TouchableOpacity
                            key={m.saram}
                            style={[
                              styles.milItemRow,
                              {
                                borderBottomColor: theme.border,
                                backgroundColor: isSelected ? theme.badgeBg : 'transparent',
                              },
                            ]}
                            onPress={() => setSelectedSaram(m.saram.toString())}
                            activeOpacity={0.7}
                          >
                            <View style={styles.milItemLeft}>
                              <View style={styles.milItemTitleRow}>
                                <Text
                                  style={[
                                    styles.milItemRank,
                                    { color: isSelected ? theme.primary : theme.text },
                                  ]}
                                >
                                  {m.posto_graduacao} {m.nome_guerra}
                                </Text>
                                <Text style={[styles.milItemSaram, { color: theme.textMuted }]}>
                                  SARAM: {m.saram}
                                </Text>
                              </View>
                              <Text
                                style={[styles.milItemFull, { color: theme.textSecondary }]}
                                numberOfLines={1}
                              >
                                {m.nome_completo}
                                {m.secao ? ` • ${m.secao}` : ''}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.milRadio,
                                {
                                  borderColor: isSelected ? theme.primary : theme.border,
                                  backgroundColor: isSelected ? theme.primary : 'transparent',
                                },
                              ]}
                            >
                              {isSelected && <Check size={11} color="#FFFFFF" />}
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </View>

                <Text style={[styles.hint, { color: theme.textMuted }]}>
                  {filteredMilitaries.length} militares listados (clique para selecionar)
                </Text>
              </View>
            ) : (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Nome de Usuário (Username) *
                </Text>
                <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                  <User size={18} color={theme.textMuted} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Ex: admin_secao"
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="none"
                    value={username}
                    onChangeText={setUsername}
                  />
                </View>
              </View>
            )}

            {/* Senha Inicial */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Senha de Acesso (Mínimo 6 dígitos) *
              </Text>
              <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <Lock size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Digite a senha inicial"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry={true}
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            {/* Controle de Permissões: Toggle Administrador */}
            <View style={[styles.toggleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.toggleLeft}>
                <View style={[styles.toggleIconWrap, { backgroundColor: isAdmin ? theme.primary : theme.surfaceVariant }]}>
                  <Shield size={18} color={isAdmin ? '#FFFFFF' : theme.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleTitle, { color: theme.text }]}>
                    Nível Administrador (Admin)
                  </Text>
                  <Text style={[styles.toggleSub, { color: theme.textSecondary }]}>
                    {isAdmin
                      ? 'Acesso irrestrito a gestão de usuários, efetivo e configurações.'
                      : 'Usuário padrão (Operador com acesso a estoque e cautelas).'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isAdmin}
                onValueChange={setIsAdmin}
                disabled={mode === 'avulso'} // conta avulsa é obrigatoriamente admin
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Toggle Status da Conta: Ativo / Inativo */}
            <View style={[styles.toggleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.toggleLeft}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleTitle, { color: theme.text }]}>Conta Ativa</Text>
                  <Text style={[styles.toggleSub, { color: theme.textSecondary }]}>
                    Permite que o militar realize login e use o aplicativo.
                  </Text>
                </View>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: theme.border, true: theme.success }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Botão de Criação */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.primary }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Cadastrar Conta de Usuário</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
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
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 36,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  hint: {
    fontSize: 11,
    marginLeft: 4,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  toggleSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  selectedMilCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 4,
  },
  selectedMilInfo: {
    flex: 1,
    gap: 2,
  },
  selectedMilHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedCheckBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMilName: {
    fontSize: 14,
    fontWeight: '800',
  },
  selectedMilDetails: {
    fontSize: 12,
  },
  selectedMilSecao: {
    fontSize: 11,
    fontWeight: '700',
  },
  clearMilBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  milListContainer: {
    height: 220,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  milListScroll: {
    flex: 1,
  },
  milEmptyBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milEmptyText: {
    fontSize: 13,
  },
  milItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  milItemLeft: {
    flex: 1,
    gap: 2,
    marginRight: 8,
  },
  milItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  milItemRank: {
    fontSize: 13,
    fontWeight: '700',
  },
  milItemSaram: {
    fontSize: 11,
    fontWeight: '600',
  },
  milItemFull: {
    fontSize: 11,
  },
  milRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
