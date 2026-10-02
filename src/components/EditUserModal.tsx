import React, { useState, useEffect } from 'react';
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
import { User } from '../types';
import { X, UserCog, Shield, Lock, Trash2 } from 'lucide-react-native';

interface EditUserModalProps {
  user: User | null;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  visible,
  onClose,
  onSuccess,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();
  const { height: screenHeight } = useWindowDimensions();

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [newPassword, setNewPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (user && visible) {
      setIsAdmin(user.admin);
      setIsActive(user.ativo);
      setNewPassword('');
      setSubmitting(false);
      setDeleting(false);
    }
  }, [user, visible]);

  useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      onClose();
      return true;
    };
    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [visible, onClose]);

  if (!visible || !user) return null;

  const identifier = user.militar?.saram || user.username || user.id;

  const handleSave = async () => {
    if (newPassword.trim().length > 0 && newPassword.trim().length < 6) {
      Alert.alert('Senha Inválida', 'A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: { admin?: boolean; ativo?: boolean; password?: string } = {
        admin: isAdmin,
        ativo: isActive,
      };

      if (newPassword.trim().length >= 6) {
        payload.password = newPassword.trim();
      }

      await api.updateUser(identifier, payload);
      Alert.alert('Sucesso', 'Permissões do usuário atualizadas com sucesso!');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Erro ao Atualizar', err.message || 'Falha ao salvar alterações.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Conta',
      `Deseja realmente excluir permanentemente o acesso do usuário @${user.username}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.deleteUser(identifier);
              Alert.alert('Conta Removida', 'O usuário foi excluído com sucesso.');
              onSuccess();
              onClose();
            } catch (err: any) {
              Alert.alert('Erro ao Excluir', err.message || 'Não foi possível excluir o usuário.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
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
                : '88%',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.iconWrap, { backgroundColor: theme.badgeBg }]}>
                <UserCog size={20} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.text }]}>Gerenciar Permissões</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  @{user.username} {user.militar ? `• ${user.militar.posto_graduacao} ${user.militar.nome_guerra}` : ''}
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
            {/* Toggle Administrador */}
            <View style={[styles.toggleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.toggleLeft}>
                <View style={[styles.toggleIconWrap, { backgroundColor: isAdmin ? theme.primary : theme.surfaceVariant }]}>
                  <Shield size={18} color={isAdmin ? '#FFFFFF' : theme.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleTitle, { color: theme.text }]}>
                    Nível Administrador
                  </Text>
                  <Text style={[styles.toggleSub, { color: theme.textSecondary }]}>
                    {isAdmin
                      ? 'Conta com acesso total (gestão de usuários, efetivo, relatórios).'
                      : 'Conta de Operador padrão (apenas movimentações de materiais).'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isAdmin}
                onValueChange={setIsAdmin}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Toggle Status da Conta */}
            <View style={[styles.toggleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.toggleLeft}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleTitle, { color: theme.text }]}>Status da Conta</Text>
                  <Text style={[styles.toggleSub, { color: theme.textSecondary }]}>
                    {isActive ? 'Habilitada para login e uso' : 'Bloqueada / Desativada'}
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

            {/* Redefinição de Senha */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Redefinir Senha (Opcional)
              </Text>
              <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <Lock size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Deixe em branco para manter a atual"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry={true}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
              </View>
            </View>

            {/* Botão Salvar Alterações */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.primary }]}
              onPress={handleSave}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Salvar Permissões</Text>
              )}
            </TouchableOpacity>

            {/* Botão Excluir Usuário */}
            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: theme.dangerBg, borderColor: theme.danger }]}
              onPress={handleDelete}
              disabled={deleting}
              activeOpacity={0.7}
            >
              <Trash2 size={16} color={theme.danger} />
              <Text style={[styles.deleteBtnText, { color: theme.danger }]}>
                {deleting ? 'Excluindo...' : 'Excluir Conta de Usuário'}
              </Text>
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
    maxHeight: '88%',
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
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
