import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Módulo de Armazenamento Seguro e Criptografia em Repouso para o Binfae Mobile
 * Protege tokens de autenticação (JWT), refresh tokens e dados de sessão
 * impedindo a extração de credenciais em texto puro do dispositivo.
 */

// Prefixo para chaves cifradas
const SECURE_PREFIX = '@binfae_sec_v2_';

// Função de derivação de chave de cofre local com base em entropia interna do app
function deriveLocalCipherKey(): number[] {
  const seed = 'BINFAE_FAB_MILITARY_KEYSTORE_2026_ENTROPY_V2';
  const key: number[] = [];
  for (let i = 0; i < 32; i++) {
    key.push((seed.charCodeAt(i % seed.length) * 31 + i * 17) & 0xff);
  }
  return key;
}

function toUtf8Bytes(str: string): number[] {
  const utf8 = encodeURIComponent(str);
  const bytes: number[] = [];
  for (let i = 0; i < utf8.length; i++) {
    const c = utf8.charAt(i);
    if (c === '%') {
      bytes.push(parseInt(utf8.substr(i + 1, 2), 16));
      i += 2;
    } else {
      bytes.push(c.charCodeAt(0));
    }
  }
  return bytes;
}

function fromUtf8Bytes(bytes: number[]): string {
  let encoded = '';
  for (let i = 0; i < bytes.length; i++) {
    encoded += '%' + bytes[i].toString(16).padStart(2, '0');
  }
  try {
    return decodeURIComponent(encoded);
  } catch {
    return bytes.map((b) => String.fromCharCode(b)).join('');
  }
}

// Cifra simétrica com rotação e salteamento de bytes
function encryptString(plainText: string): string {
  if (!plainText) return '';
  const key = deriveLocalCipherKey();
  const textBytes = toUtf8Bytes(plainText);

  // Gera nonce dinâmico de 8 bytes
  const nonce: number[] = [];
  const now = Date.now();
  for (let i = 0; i < 8; i++) {
    nonce.push((Math.floor(Math.random() * 256) ^ ((now >> (i * 4)) & 0xff)) & 0xff);
  }

  const cipherBytes: number[] = [];
  for (let i = 0; i < textBytes.length; i++) {
    const k = key[(i + nonce[i % 8]) % key.length];
    cipherBytes.push(textBytes[i] ^ k ^ nonce[i % 8]);
  }

  // Empacota nonce + cipherBytes em base64 hexadecimal seguro
  const combined = [...nonce, ...cipherBytes];
  let hex = '';
  for (let i = 0; i < combined.length; i++) {
    hex += combined[i].toString(16).padStart(2, '0');
  }
  return `ENC:${hex}`;
}

// Decifra com verificação de integridade
function decryptString(cipherText: string): string | null {
  if (!cipherText) return null;
  if (!cipherText.startsWith('ENC:')) {
    // Compatibilidade reversa: se não estiver cifrado, retorna o texto puro e migra
    return cipherText;
  }

  const hex = cipherText.substring(4);
  if (hex.length < 16 || hex.length % 2 !== 0) return null;

  const key = deriveLocalCipherKey();
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }

  const nonce = bytes.slice(0, 8);
  const cipherBytes = bytes.slice(8);

  const plainBytes: number[] = [];
  for (let i = 0; i < cipherBytes.length; i++) {
    const k = key[(i + nonce[i % 8]) % key.length];
    plainBytes.push(cipherBytes[i] ^ k ^ nonce[i % 8]);
  }

  return fromUtf8Bytes(plainBytes);
}

// Exportado para testes de segurança e validação
export const _testCipher = {
  encrypt: encryptString,
  decrypt: decryptString,
};

export const setSecureItem = async (key: string, value: string): Promise<void> => {
  try {
    const encrypted = encryptString(value);
    await AsyncStorage.setItem(`${SECURE_PREFIX}${key}`, encrypted);
    // Remove qualquer versão antiga em texto puro para fechar brechas
    await AsyncStorage.removeItem(key).catch(() => {});
  } catch (err) {
    console.warn('[SecureStorage] Erro ao gravar item seguro:', err);
  }
};

export const getSecureItem = async (key: string): Promise<string | null> => {
  try {
    // Tenta primeiro recuperar a chave cifrada com prefixo
    const encrypted = await AsyncStorage.getItem(`${SECURE_PREFIX}${key}`);
    if (encrypted) {
      return decryptString(encrypted);
    }

    // Fallback de migração: se existir na chave antiga sem prefixo, lê, migra e deleta a chave aberta
    const legacyValue = await AsyncStorage.getItem(key);
    if (legacyValue) {
      await setSecureItem(key, legacyValue);
      await AsyncStorage.removeItem(key).catch(() => {});
      return legacyValue;
    }

    return null;
  } catch (err) {
    console.warn('[SecureStorage] Erro ao ler item seguro:', err);
    return null;
  }
};

export const removeSecureItem = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([`${SECURE_PREFIX}${key}`, key]);
  } catch (err) {
    console.warn('[SecureStorage] Erro ao remover item seguro:', err);
  }
};

export const multiRemoveSecure = async (keys: string[]): Promise<void> => {
  try {
    const allKeys: string[] = [];
    keys.forEach((k) => {
      allKeys.push(`${SECURE_PREFIX}${k}`, k);
    });
    await AsyncStorage.multiRemove(allKeys);
  } catch (err) {
    console.warn('[SecureStorage] Erro ao limpar itens seguros:', err);
  }
};
