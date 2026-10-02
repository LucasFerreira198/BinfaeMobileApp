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
import { useTheme } from '../context/ThemeContext';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { api } from '../api/client';
import { Military } from '../types';
import { X, Check, Shield, User, Mail, Phone, Award } from 'lucide-react-native';

interface EditMilitaryModalProps {
  military: Military | null;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const POSTOS_GRADUACOES = [
  'S2',
  'S1',
  'CB',
  '3S',
  '2S',
  '1S',
  'SO',
  'Asp',
  '2º Ten',
  '1º Ten',
  'Cap',
  'Maj',
  'Ten Cel',
  'Cel',
  'CV',
];

export const EditMilitaryModal: React.FC<EditMilitaryModalProps> = ({
  military,
  visible,
  onClose,
  onSuccess,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();
  const { height: screenHeight } = useWindowDimensions();

  const [postoGraduacao, setPostoGraduacao] = useState<string>('3S');
  const [nomeGuerra, setNomeGuerra] = useState<string>('');
  const [nomeCompleto, setNomeCompleto] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [celular, setCelular] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (military && visible) {
      setPostoGraduacao(military.posto_graduacao || '3S');
      setNomeGuerra(military.nome_guerra || '');
      setNomeCompleto(military.nome_completo || '');
      setEmail(military.email || '');
      setCelular(military.celular || military.telefone || '');
      setIsSubmitting(false);
    }
  }, [military, visible]);

  // Tratamento do botão voltar físico do Android
  useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      onClose();
      return true;
    };
    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [visible, onClose]);

  if (!visible || !military) return null;

  const handleSave = async () => {
    if (!nomeGuerra.trim()) {
      Alert.alert('Nome de Guerra Obrigatório', 'Informe o nome de guerra do militar.');
      return;
    }

    if (!nomeCompleto.trim() || nomeCompleto.trim().length < 5) {
      Alert.alert('Nome Completo Obrigatório', 'Informe o nome completo com pelo menos 5 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.updateMilitary(military.saram, {
        posto_graduacao: postoGraduacao,
        nome_guerra: nomeGuerra.trim().toUpperCase(),
        nome_completo: nomeCompleto.trim(),
        email: email.trim() ? email.trim() : undefined,
        celular: celular.trim() ? celular.trim() : undefined,
      });

      Alert.alert('Sucesso', 'Dados do militar atualizados com sucesso!');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Erro ao Salvar', err.message || 'Falha ao atualizar dados do militar.');
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
                ? Math.max(300, screenHeight - keyboardHeight - (insets.top || 24) - 10)
                : '92%',
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconWrap, { backgroundColor: theme.badgeBg }]}>
                <Shield size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: theme.text }]}>Editar Militar</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  SARAM {military.saram} • {military.secao || 'BINF-AE'}
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
            {/* Posto / Graduação */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Posto / Graduação *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.ranksScroll}
              contentContainerStyle={{ gap: 8 }}
            >
              {POSTOS_GRADUACOES.map((pg) => {
                const isSelected = postoGraduacao === pg;
                return (
                  <TouchableOpacity
                    key={pg}
                    style={[
                      styles.rankChip,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.surfaceVariant,
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setPostoGraduacao(pg)}
                  >
                    <Text
                      style={[
                        styles.rankChipText,
                        { color: isSelected ? '#FFFFFF' : theme.text },
                      ]}
                    >
                      {pg}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Nome de Guerra */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Nome de Guerra *</Text>
            <View
              style={[
                styles.inputBox,
                { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
              ]}
            >
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={nomeGuerra}
                onChangeText={setNomeGuerra}
                placeholder="Ex: SILVA, SANTOS"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="characters"
              />
            </View>

            {/* Nome Completo */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Nome Completo *</Text>
            <View
              style={[
                styles.inputBox,
                { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
              ]}
            >
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={nomeCompleto}
                onChangeText={setNomeCompleto}
                placeholder="Nome completo do militar"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            {/* E-mail */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>E-mail Corporativo</Text>
            <View
              style={[
                styles.inputBox,
                { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
              ]}
            >
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="email@fab.mil.br (opcional)"
                placeholderTextColor={theme.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Celular */}
            <Text style={[styles.label, { color: theme.textSecondary }]}>Celular com DDD</Text>
            <View
              style={[
                styles.inputBox,
                { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
              ]}
            >
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={celular}
                onChangeText={setCelular}
                placeholder="(99) 99999-9999 (opcional)"
                placeholderTextColor={theme.textMuted}
                keyboardType="phone-pad"
              />
            </View>
          </ScrollView>

          {/* Rodapé com botão de Salvar */}
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
              onPress={handleSave}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Check size={18} color="#FFFFFF" />
                  <Text style={styles.submitText}>Salvar Alterações</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    height: '92%',
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
    marginRight: 10,
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
  ranksScroll: {
    maxHeight: 44,
    marginBottom: 4,
  },
  rankChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  rankChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputBox: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    fontSize: 15,
    padding: 0,
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
});
