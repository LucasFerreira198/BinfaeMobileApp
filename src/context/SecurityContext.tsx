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
const USER_STORAGE_KEY = '@binfae_auth_user';

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
  const isAuthenticatingRef = useRef<boolean>(false);
  const lastUnlockTimeRef = useRef<number>(0);
  const wasAuthenticatedRef = useRef<boolean>(isAuthenticated);
  const backgroundTimestampRef = useRef<number>(0);

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

      // 2. Carrega modo salvo, PIN e verifica se o usuário está previamente logado (cold start)
      const [savedMode, savedPin, storedUser] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_SECURITY_MODE),
        AsyncStorage.getItem(STORAGE_KEY_PIN),
        AsyncStorage.getItem(USER_STORAGE_KEY),
      ]);

      if (savedPin) {
        setStoredPin(savedPin);
      }

      const activeMode =
        savedMode === 'BIOMETRICS' || savedMode === 'PIN'
          ? (savedMode as SecurityMode)
          : 'NONE';
      setSecurityModeState(activeMode);

      // 3. Se o usuário estiver previamente logado (sessão salva) e configurou segurança (BIOMETRICS ou PIN):
      // BLOQUEIA IMEDIATAMENTE NO COLD START (ao fechar o aplicativo por completo e reabrir)
      if (storedUser && activeMode !== 'NONE') {
        setIsLocked(true);
      } else {
        setIsLocked(false);
      }
    } catch (err) {
      console.warn('Erro ao carregar preferências de segurança:', err);
    }
  };

  // Se o usuário acabou de logar pela LoginScreen (transição false -> true),
  // não bloqueia pois acabou de digitar suas credenciais
  useEffect(() => {
    if (!wasAuthenticatedRef.current && isAuthenticated) {
      lastUnlockTimeRef.current = Date.now();
      setIsLocked(false);
    } else if (wasAuthenticatedRef.current && !isAuthenticated) {
      // Logout realizado
      setIsLocked(false);
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Monitora transições de AppState (background -> foreground com carência de 5s)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // Quando o app sai do primeiro plano (minimizando ou fechando)
      if (appState.current === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
        backgroundTimestampRef.current = Date.now();
        // Não bloqueia imediatamente no momento de fechar para não disparar prompt enquanto sai
      }

      // Quando o app retorna para primeiro plano ativo
      if ((appState.current === 'background' || appState.current === 'inactive') && nextAppState === 'active') {
        if (backgroundTimestampRef.current > 0) {
          const elapsed = Date.now() - backgroundTimestampRef.current;
          backgroundTimestampRef.current = 0;

          // Se ficou em segundo plano por pelo menos 5 segundos (5000ms), exige autenticação
          if (elapsed >= 5000 && isAuthenticated && securityMode !== 'NONE') {
            const timeSinceUnlock = Date.now() - lastUnlockTimeRef.current;
            if (timeSinceUnlock > 1500 && !isAuthenticatingRef.current) {
              setIsLocked(true);
            }
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
    lastUnlockTimeRef.current = Date.now();
  };

  const unlockWithPin = async (inputPin: string): Promise<boolean> => {
    if (storedPin && inputPin === storedPin) {
      lastUnlockTimeRef.current = Date.now();
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const unlockWithBiometrics = async (): Promise<boolean> => {
    if (isAuthenticatingRef.current) {
      return false;
    }

    isAuthenticatingRef.current = true;
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autenticação Biométrica - Binfae Mobile',
        fallbackLabel: 'Usar PIN',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (res.success) {
        lastUnlockTimeRef.current = Date.now();
        setIsLocked(false);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Erro no desbloqueio biométrico:', err);
      return false;
    } finally {
      setTimeout(() => {
        isAuthenticatingRef.current = false;
      }, 500);
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
