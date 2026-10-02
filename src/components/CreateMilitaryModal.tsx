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
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { X, UserPlus, IdCard, User, Briefcase, Mail, Phone } from 'lucide-react-native';

interface CreateMilitaryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_RANKS = ['SD', 'CB', '3S', '2S', '1S', 'SO', '2T', '1T', 'CAP', 'MAJ', 'TC', 'CEL'];

export const CreateMilitaryModal: React.FC<CreateMilitaryModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { theme } = useTheme();

  const [saram, setSaram] = useState<string>('');
  const [nomeCompleto, setNomeCompleto] = useState<string>('');
  const [postoGraduacao, setPostoGraduacao] = useState<string>('3S');
  const [nomeGuerra, setNomeGuerra] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [celular, setCelular] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setSaram('');
      setNomeCompleto('');
      setPostoGraduacao('3S');
      setNomeGuerra('');
      setEmail('');
      setCelular('');
      setSubmitting(false);
    }
  }, [visible]);

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
    const saramNum = parseInt(saram.trim(), 10);
    if (!saram.trim() || isNaN(saramNum)) {
      Alert.alert('SARAM Obrigatório', 'Por favor, informe um número de SARAM válido.');
      return;
    }

    if (!nomeCompleto.trim() || nomeCompleto.trim().length < 5) {
      Alert.alert('Nome Completo Inválido', 'O nome completo deve ter no mínimo 5 caracteres.');
      return;
    }

    if (!postoGraduacao.trim()) {
      Alert.alert('Posto/Graduação Obrigatório', 'Selecione ou informe a graduação do militar.');
      return;
    }

    if (!nomeGuerra.trim() || nomeGuerra.trim().length < 2) {
      Alert.alert('Nome de Guerra Obrigatório', 'O nome de guerra deve ter no mínimo 2 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createMilitary({
        saram: saramNum,
        nome_completo: nomeCompleto.trim(),
        posto_graduacao: postoGraduacao.trim().toUpperCase(),
        nome_guerra: nomeGuerra.trim().toUpperCase(),
        email: email.trim() ? email.trim() : undefined,
        celular: celular.trim() ? celular.trim() : undefined,
      });

      Alert.alert('Sucesso', 'Militar cadastrado com sucesso no efetivo!');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Erro ao Cadastrar', err.message || 'Falha ao salvar dados do militar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.iconWrap, { backgroundColor: theme.badgeBg }]}>
                <UserPlus size={20} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.text }]}>Cadastrar Militar</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Inclusão no efetivo geral do quartel
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
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* SARAM */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>SARAM (Obrigatório) *</Text>
              <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <IdCard size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Ex: 6891234"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  value={saram}
                  onChangeText={setSaram}
                />
              </View>
            </View>

            {/* Posto / Graduação */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Posto ou Graduação *
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ranksRow}>
                {COMMON_RANKS.map((r) => {
                  const active = postoGraduacao === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.rankChip,
                        {
                          backgroundColor: active ? theme.primary : theme.surfaceVariant,
                          borderColor: active ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setPostoGraduacao(r)}
                    >
                      <Text
                        style={[
                          styles.rankText,
                          { color: active ? '#FFFFFF' : theme.text, fontWeight: active ? '700' : '500' },
                        ]}
                      >
                        {r}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, marginTop: 4 }]}>
                <Briefcase size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Ou digite o posto (ex: 3S, Ten, Cel)"
                  placeholderTextColor={theme.textMuted}
                  value={postoGraduacao}
                  onChangeText={setPostoGraduacao}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Nome de Guerra */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Nome de Guerra *
              </Text>
              <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <User size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Ex: SILVA"
                  placeholderTextColor={theme.textMuted}
                  value={nomeGuerra}
                  onChangeText={setNomeGuerra}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Nome Completo */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Nome Completo *
              </Text>
              <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <User size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Ex: João da Silva Santos"
                  placeholderTextColor={theme.textMuted}
                  value={nomeCompleto}
                  onChangeText={setNomeCompleto}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* E-mail */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                E-mail (Opcional)
              </Text>
              <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <Mail size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Ex: silvajss@fab.mil.br"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Celular */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Celular / Contato (Opcional)
              </Text>
              <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <Phone size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Ex: (61) 98765-4321"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="phone-pad"
                  value={celular}
                  onChangeText={setCelular}
                />
              </View>
            </View>

            {/* Botão Cadastrar */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.primary }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Cadastrar no Efetivo</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    gap: 14,
    paddingBottom: 36,
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
  ranksRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  rankChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rankText: {
    fontSize: 12,
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
});
