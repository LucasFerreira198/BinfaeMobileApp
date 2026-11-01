import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
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

// Algoritmo criptográfico SHA-256 com salt seguro para armazenar PIN sem texto puro
function hashPinWithSalt(pin: string, salt = 'BINFAE_MILITARY_PIN_SALT_v1'): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const str = salt + pin + salt;
  const words: number[] = [];
  for (let i = 0; i < str.length * 8; i += 8) {
    words[i >> 5] |= (str.charCodeAt(i / 8) & 0xff) << (24 - (i % 32));
  }
  words[str.length >> 2] |= 0x80 << (24 - ((str.length * 8) % 32));
  words[(((str.length + 8) >> 6) << 4) + 15] = str.length * 8;

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  let [h0, h1, h2, h3, h4, h5, h6, h7] = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const w = new Array(64);
  for (let i = 0; i < words.length; i += 16) {
    for (let j = 0; j < 16; j++) w[j] = words[i + j] | 0;
    for (let j = 16; j < 64; j++) {
      const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = [h0, h1, h2, h3, h4, h5, h6, h7];
    for (let j = 0; j < 64; j++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[j] + w[j]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + temp1) | 0; d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map(v => ((v >>> 0).toString(16).padStart(8, '0'))).join('');
}

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
  const failedAttemptsRef = useRef<number>(0);
  const lockoutUntilRef = useRef<number>(0);

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
    const hashed = hashPinWithSalt(newPin);
    setStoredPin(hashed);
    await AsyncStorage.setItem(STORAGE_KEY_PIN, hashed);
    await setSecurityMode('PIN');
    failedAttemptsRef.current = 0;
    lockoutUntilRef.current = 0;
    lastUnlockTimeRef.current = Date.now();
  };

  const unlockWithPin = async (inputPin: string): Promise<boolean> => {
    if (Date.now() < lockoutUntilRef.current) {
      const remainingSeconds = Math.ceil((lockoutUntilRef.current - Date.now()) / 1000);
      Alert.alert(
        'Bloqueio de Segurança',
        `Muitas tentativas incorretas. Aguarde ${remainingSeconds} segundos para tentar novamente.`
      );
      return false;
    }

    if (!storedPin) return false;

    // Validação comparando hash com suporte a migração de PIN antigo em plaintext
    const inputHash = hashPinWithSalt(inputPin);
    const isValid = storedPin === inputHash || storedPin === inputPin;

    if (isValid) {
      if (storedPin === inputPin) {
        // Migra automaticamente de texto puro para hash
        await savePin(inputPin);
      }
      failedAttemptsRef.current = 0;
      lockoutUntilRef.current = 0;
      lastUnlockTimeRef.current = Date.now();
      setIsLocked(false);
      return true;
    }

    failedAttemptsRef.current += 1;
    if (failedAttemptsRef.current >= 5) {
      lockoutUntilRef.current = Date.now() + 5 * 60 * 1000; // 5 minutos de lockout
      Alert.alert(
        'Bloqueio Temporário',
        'Limite de 5 tentativas atingido. O aplicativo foi bloqueado por 5 minutos por segurança.'
      );
    } else {
      const remaining = 5 - failedAttemptsRef.current;
      Alert.alert(
        'PIN Incorreto',
        `PIN incorreto. Você tem mais ${remaining} tentativa(s) antes do bloqueio.`
      );
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
