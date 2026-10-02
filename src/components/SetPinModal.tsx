import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useSecurity } from '../context/SecurityContext';
import { X, Lock, Delete } from 'lucide-react-native';

interface SetPinModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SetPinModal: React.FC<SetPinModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { theme } = useTheme();
  const { savePin } = useSecurity();

  const [step, setStep] = useState<1 | 2>(1); // 1 = Digitar PIN, 2 = Confirmar PIN
  const [firstPin, setFirstPin] = useState<string>('');
  const [secondPin, setSecondPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setStep(1);
      setFirstPin('');
      setSecondPin('');
      setErrorMsg(null);
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

  const currentPin = step === 1 ? firstPin : secondPin;

  const handleKeyPress = async (num: string) => {
    if (currentPin.length >= 4) return;

    const next = currentPin + num;
    setErrorMsg(null);

    if (step === 1) {
      setFirstPin(next);
      if (next.length === 4) {
        setTimeout(() => {
          setStep(2);
        }, 300);
      }
    } else {
      setSecondPin(next);
      if (next.length === 4) {
        if (next === firstPin) {
          await savePin(next);
          if (onSuccess) onSuccess();
          onClose();
        } else {
          setErrorMsg('Os PINs não conferem. Comece novamente.');
          setTimeout(() => {
            setStep(1);
            setFirstPin('');
            setSecondPin('');
          }, 800);
        }
      }
    }
  };

  const handleDelete = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (firstPin.length > 0) setFirstPin(firstPin.slice(0, -1));
    } else {
      if (secondPin.length > 0) setSecondPin(secondPin.slice(0, -1));
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.iconWrap, { backgroundColor: theme.badgeBg }]}>
                <Lock size={18} color={theme.primary} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                {step === 1 ? 'Cadastrar Novo PIN' : 'Confirmar Novo PIN'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.surfaceVariant }]}
            >
              <X size={16} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.instruction, { color: theme.textSecondary }]}>
            {step === 1
              ? 'Digite um código numérico de 4 dígitos para bloqueio do app:'
              : 'Digite novamente o mesmo PIN para confirmar:'}
          </Text>

          {/* Dots */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((idx) => {
              const filled = currentPin.length > idx;
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

          {errorMsg && (
            <Text style={[styles.errorText, { color: theme.danger }]}>{errorMsg}</Text>
          )}

          {/* Keypad */}
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
                        <Delete size={20} color={theme.text} />
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
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 24,
    paddingBottom: 36,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instruction: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
    gap: 10,
    marginTop: 8,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  keyButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  keyEmpty: {
    flex: 1,
    height: 52,
  },
  keyText: {
    fontSize: 20,
    fontWeight: '700',
  },
});
