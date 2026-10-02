import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSecurity } from '../context/SecurityContext';
import { Shield, Fingerprint, Delete, LogOut } from 'lucide-react-native';

export const SecurityLockModal: React.FC = () => {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    isLocked,
    securityMode,
    unlockWithPin,
    unlockWithBiometrics,
  } = useSecurity();

  const [enteredPin, setEnteredPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Bloqueia qualquer tentativa do botão voltar físico do Android fechar a tela de bloqueio
  useEffect(() => {
    if (!isLocked) return;

    const backAction = () => {
      return true; // impede o fechamento
    };

    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [isLocked]);

  // Se for biometria, dispara prompt quando abrir
  useEffect(() => {
    if (isLocked && securityMode === 'BIOMETRICS') {
      unlockWithBiometrics();
    }
  }, [isLocked, securityMode]);

  // Limpa o PIN digitado ao fechar
  useEffect(() => {
    if (!isLocked) {
      setEnteredPin('');
      setErrorMessage(null);
    }
  }, [isLocked]);

  if (!isLocked || securityMode === 'NONE') return null;

  const handleKeyPress = async (num: string) => {
    if (enteredPin.length >= 4) return;

    const nextPin = enteredPin + num;
    setEnteredPin(nextPin);
    setErrorMessage(null);

    // Quando completa 4 dígitos, valida automaticamente
    if (nextPin.length === 4) {
      const success = await unlockWithPin(nextPin);
      if (!success) {
        setErrorMessage('PIN incorreto. Tente novamente.');
        setTimeout(() => {
          setEnteredPin('');
        }, 500);
      }
    }
  };

  const handleDelete = () => {
    if (enteredPin.length > 0) {
      setEnteredPin(enteredPin.slice(0, -1));
      setErrorMessage(null);
    }
  };

  const handleLogout = () => {
    Alert.alert('Encerrar Sessão', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const militar = user?.militar;
  const displayName = militar
    ? `${militar.posto_graduacao} ${militar.nome_guerra}`
    : user?.username || 'Militar';

  return (
    <Modal visible={isLocked} transparent={false} animationType="fade" onRequestClose={() => {}}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        {/* Topo / Identificação */}
        <View style={styles.topSection}>
          <View style={[styles.logoCircle, { backgroundColor: theme.badgeBg }]}>
            <Shield size={36} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Binfae Mobile</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {displayName} • Autenticação Necessária
          </Text>
        </View>

        {/* Modo 1: Biometria */}
        {securityMode === 'BIOMETRICS' && (
          <View style={styles.biometricsContent}>
            <View style={[styles.fingerprintCircle, { backgroundColor: theme.surfaceVariant }]}>
              <Fingerprint size={64} color={theme.primary} />
            </View>

            <Text style={[styles.promptText, { color: theme.text }]}>
              Toque no sensor para autenticar
            </Text>
            <Text style={[styles.promptSub, { color: theme.textSecondary }]}>
              Use sua impressão digital ou Face ID para continuar utilizando o aplicativo.
            </Text>

            <TouchableOpacity
              style={[styles.retryBioBtn, { backgroundColor: theme.primary }]}
              onPress={() => unlockWithBiometrics()}
              activeOpacity={0.8}
            >
              <Fingerprint size={18} color="#FFFFFF" />
              <Text style={styles.retryBioBtnText}>Autenticar com Biometria</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Modo 2: PIN Numérico */}
        {securityMode === 'PIN' && (
          <View style={styles.pinContent}>
            <Text style={[styles.pinPromptTitle, { color: theme.text }]}>
              Digite seu PIN de 4 dígitos
            </Text>

            {/* Indicador de Bolinhas (Dots) */}
            <View style={styles.dotsRow}>
              {[0, 1, 2, 3].map((idx) => {
                const filled = enteredPin.length > idx;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: filled ? theme.primary : theme.inputBorder,
                        borderColor: filled ? theme.primary : theme.border,
                      },
                    ]}
                  />
                );
              })}
            </View>

            {errorMessage && (
              <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
            )}

            {/* Teclado Numérico Nativo da UI */}
            <View style={styles.keypad}>
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['', '0', 'delete'],
              ].map((row, rIdx) => (
                <View key={rIdx} style={styles.keypadRow}>
                  {row.map((key, kIdx) => {
                    if (key === '') {
                      return <View key={kIdx} style={styles.keyEmpty} />;
                    }

                    if (key === 'delete') {
                      return (
                        <TouchableOpacity
                          key={kIdx}
                          style={[styles.keyButton, { backgroundColor: theme.surfaceVariant }]}
                          onPress={handleDelete}
                          activeOpacity={0.7}
                        >
                          <Delete size={22} color={theme.text} />
                        </TouchableOpacity>
                      );
                    }

                    return (
                      <TouchableOpacity
                        key={kIdx}
                        style={[styles.keyButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => handleKeyPress(key)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.keyText, { color: theme.text }]}>{key}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Rodapé com botão de emergência para encerrar sessão */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={16} color={theme.danger} />
          <Text style={[styles.logoutText, { color: theme.danger }]}>Encerrar Sessão</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  topSection: {
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
  },
  biometricsContent: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  fingerprintCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  promptText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  promptSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
  },
  retryBioBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pinContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  pinPromptTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  keypad: {
    width: '100%',
    gap: 12,
    marginTop: 10,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  keyButton: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  keyEmpty: {
    flex: 1,
    height: 60,
  },
  keyText: {
    fontSize: 22,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
