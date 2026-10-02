import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { api } from '../api/client';
import { CURRENT_VERSION } from '../components/UpdateModal';
import { Shield, User, Lock, Eye, EyeOff } from 'lucide-react-native';

export const LoginScreen: React.FC = () => {
  const { login, isLoading } = useAuth();
  const { theme } = useTheme();
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    checkServer();
  }, []);

  const checkServer = async () => {
    try {
      const ok = await api.checkHealth();
      setServerOnline(ok);
    } catch {
      setServerOnline(false);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Campos obrigatórios', 'Por favor, informe o SARAM/usuário e a senha.');
      return;
    }

    setSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      Alert.alert('Falha na autenticação', err.message || 'Verifique seus dados de acesso.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingBottom: keyboardHeight,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isKeyboardVisible && styles.scrollContentWithKeyboard,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Brand Hero */}
        <View style={[styles.heroSection, isKeyboardVisible && styles.heroSectionCompact]}>
          <View
            style={[
              styles.logoCircle,
              { backgroundColor: theme.primary },
              isKeyboardVisible && styles.logoCircleCompact,
            ]}
          >
            <Shield size={isKeyboardVisible ? 28 : 44} color="#FFFFFF" />
          </View>

          <Text
            style={[
              styles.brandTitle,
              { color: theme.text },
              isKeyboardVisible && styles.brandTitleCompact,
            ]}
          >
            Binfae Mobile
          </Text>

          {!isKeyboardVisible && (
            <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>
              Gestão Inteligente de Materiais e TI
            </Text>
          )}

          {/* Status do Servidor */}
          {!isKeyboardVisible && (
            <View style={[styles.serverBadge, { backgroundColor: theme.surfaceVariant }]}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      serverOnline === true
                        ? theme.success
                        : serverOnline === false
                        ? theme.danger
                        : theme.warning,
                  },
                ]}
              />
              <Text style={[styles.serverBadgeText, { color: theme.textSecondary }]}>
                {serverOnline === true
                  ? 'Servidor Conectado'
                  : serverOnline === false
                  ? 'Servidor Offline'
                  : 'Verificando Servidor...'}
              </Text>
            </View>
          )}
        </View>

        {/* Card de Login */}
        <View style={[styles.loginCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.formTitle, { color: theme.text }]}>Acesso ao Sistema</Text>
          <Text style={[styles.formSub, { color: theme.textMuted }]}>
            Identifique-se com seu SARAM ou nome de usuário
          </Text>

          {/* Input de Usuário / SARAM */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              SARAM ou Usuário
            </Text>
            <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <User size={18} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Ex: 6891234 ou admin"
                placeholderTextColor={theme.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Input de Senha */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Senha</Text>
            <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <Lock size={18} color={theme.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Digite sua senha"
                placeholderTextColor={theme.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                {showPassword ? (
                  <EyeOff size={18} color={theme.textMuted} />
                ) : (
                  <Eye size={18} color={theme.textMuted} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Botão Entrar */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.primary }]}
            onPress={handleLogin}
            disabled={submitting || isLoading}
            activeOpacity={0.8}
          >
            {submitting || isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Entrar no Aplicativo</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.copyright, { color: theme.textMuted }]}>
          Binfae Mobile v{CURRENT_VERSION} • Sistema Nativo Offline-First
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 36,
  },
  scrollContentWithKeyboard: {
    justifyContent: 'flex-start',
    paddingTop: 16,
    paddingBottom: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroSectionCompact: {
    marginBottom: 12,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  logoCircleCompact: {
    width: 52,
    height: 52,
    borderRadius: 16,
    marginBottom: 6,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandTitleCompact: {
    fontSize: 19,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  serverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  serverBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  loginCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  formSub: {
    fontSize: 12,
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  copyright: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 24,
  },
});
