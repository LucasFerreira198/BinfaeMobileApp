import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from './AuthContext';

export type SecurityMode = 'NONE' | 'BIOMETRICS' | 'PIN';

interface SecurityContextType {
  securityMode: SecurityMode;
  isLocked: boolean;
  isBiometricsSupported: boolean;
  hasPinSet: boolean;
  setSecurityMode: (mode: SecurityMode) => Promise<void>;
  savePin: (newPin: string) => Promise<void>;
  unlockWithPin: (inputPin: string) => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
  lockNow: () => void;
}

const STORAGE_KEY_SECURITY_MODE = '@binfae_security_mode';
const STORAGE_KEY_PIN = '@binfae_security_pin';

const SecurityContext = createContext<SecurityContextType>({
  securityMode: 'NONE',
  isLocked: false,
  isBiometricsSupported: false,
  hasPinSet: false,
  setSecurityMode: async () => {},
  savePin: async () => {},
  unlockWithPin: async () => false,
  unlockWithBiometrics: async () => false,
  lockNow: () => {},
});

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [securityMode, setSecurityModeState] = useState<SecurityMode>('NONE');
  const [storedPin, setStoredPin] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isBiometricsSupported, setIsBiometricsSupported] = useState<boolean>(false);

  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Inicializa preferências de segurança e verifica hardware de biometria
  useEffect(() => {
    bootstrapSecurity();
  }, []);

  const bootstrapSecurity = async () => {
    try {
      // 1. Checa suporte a biometria no dispositivo
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricsSupported(hasHardware && isEnrolled);

      // 2. Carrega modo salvo e PIN
      const [savedMode, savedPin] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_SECURITY_MODE),
        AsyncStorage.getItem(STORAGE_KEY_PIN),
      ]);

      if (savedPin) {
        setStoredPin(savedPin);
      }

      if (savedMode === 'BIOMETRICS' || savedMode === 'PIN' || savedMode === 'NONE') {
        setSecurityModeState(savedMode as SecurityMode);
      }
    } catch (err) {
      console.warn('Erro ao carregar preferências de segurança:', err);
    }
  };

  // Monitora transições de AppState (background -> foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // Quando o app sai do primeiro plano (vai para background ou fica inativo)
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        if (isAuthenticated && securityMode !== 'NONE') {
          setIsLocked(true);
        }
      }

      // Quando o app retorna para primeiro plano (foreground)
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (isAuthenticated && securityMode !== 'NONE') {
          setIsLocked(true);

          // Se o modo for biometria, dispara automaticamente o prompt biométrico
          if (securityMode === 'BIOMETRICS') {
            await unlockWithBiometrics();
          }
        }
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [securityMode, isAuthenticated]);

  const setSecurityMode = async (mode: SecurityMode) => {
    setSecurityModeState(mode);
    await AsyncStorage.setItem(STORAGE_KEY_SECURITY_MODE, mode);
  };

  const savePin = async (newPin: string) => {
    setStoredPin(newPin);
    await AsyncStorage.setItem(STORAGE_KEY_PIN, newPin);
    await setSecurityMode('PIN');
  };

  const unlockWithPin = async (inputPin: string): Promise<boolean> => {
    if (storedPin && inputPin === storedPin) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const unlockWithBiometrics = async (): Promise<boolean> => {
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autenticação Biométrica - Binfae Mobile',
        fallbackLabel: 'Usar Senha',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (res.success) {
        setIsLocked(false);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Erro no desbloqueio biométrico:', err);
      return false;
    }
  };

  const lockNow = () => {
    if (securityMode !== 'NONE') {
      setIsLocked(true);
    }
  };

  return (
    <SecurityContext.Provider
      value={{
        securityMode,
        isLocked,
        isBiometricsSupported,
        hasPinSet: !!storedPin,
        setSecurityMode,
        savePin,
        unlockWithPin,
        unlockWithBiometrics,
        lockNow,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => useContext(SecurityContext);
