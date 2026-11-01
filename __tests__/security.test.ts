import { _testCipher } from '../src/storage/secureStorage';
import { hashPinWithSalt } from '../src/context/SecurityContext';
import {
  isValidSaram,
  cleanSaram,
  formatSaram,
  isValidEmail,
  isValidPhone,
  COMMON_RANKS,
} from '../src/utils/militaryConstants';
import { getApiBaseUrl, setApiBaseUrl } from '../src/api/client';

describe('Binfae Mobile Security & Production Verification Suite', () => {
  describe('1. Criptografia em Repouso (Secure Storage)', () => {
    test('deve cifrar texto e produzir payload protegido prefixado com ENC:', () => {
      const plainText = 'jwt_token_militar_fab_segredo_2026';
      const encrypted = _testCipher.encrypt(plainText);

      expect(encrypted).toBeDefined();
      expect(encrypted.startsWith('ENC:')).toBe(true);
      expect(encrypted).not.toContain(plainText);
      expect(encrypted.length).toBeGreaterThan(plainText.length);
    });

    test('deve produzir cifras distintas para o mesmo texto devido ao nonce dinâmico', () => {
      const text = 'SessaoOperacionalMilitar';
      const enc1 = _testCipher.encrypt(text);
      const enc2 = _testCipher.encrypt(text);

      expect(enc1).not.toBe(enc2);
      expect(_testCipher.decrypt(enc1)).toBe(text);
      expect(_testCipher.decrypt(enc2)).toBe(text);
    });

    test('deve preservar integridade de caracteres UTF-8 e nomes militares brasileiros', () => {
      const militaryData = JSON.stringify({
        posto: '1º Tenente',
        nome_guerra: 'Araújo',
        secao: 'Comunicação & Eletrônica',
        obs: 'Atenção: Ação de manutenção concluída!',
      });

      const encrypted = _testCipher.encrypt(militaryData);
      const decrypted = _testCipher.decrypt(encrypted);

      expect(decrypted).toBe(militaryData);
      const parsed = JSON.parse(decrypted!);
      expect(parsed.nome_guerra).toBe('Araújo');
      expect(parsed.secao).toBe('Comunicação & Eletrônica');
    });

    test('deve rejeitar payloads corrompidos ou truncados com segurança', () => {
      expect(_testCipher.decrypt('ENC:00')).toBeNull();
      expect(_testCipher.decrypt('')).toBeNull();
    });
  });

  describe('2. Proteção Criptográfica de PIN de Segurança', () => {
    test('deve gerar hash SHA-256 de 64 caracteres hexadecimais sem expor o PIN', () => {
      const pin = '8492';
      const salt = 'FAB_DEVICE_TEST_SALT_XYZ';
      const hash1 = hashPinWithSalt(pin, salt);
      const hash2 = hashPinWithSalt(pin, salt);

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
      expect(hash1).not.toContain(pin);
    });

    test('deve gerar hashes completamente diferentes quando o salt for alterado', () => {
      const pin = '1234';
      const hashA = hashPinWithSalt(pin, 'DEVICE_SALT_A');
      const hashB = hashPinWithSalt(pin, 'DEVICE_SALT_B');

      expect(hashA).not.toBe(hashB);
    });
  });

  describe('3. Validações Militares e de Entrada', () => {
    test('deve validar SARAM da FAB (5 a 7 dígitos)', () => {
      expect(isValidSaram('6891234')).toBe(true);
      expect(isValidSaram('745123')).toBe(true);
      expect(isValidSaram(6891234)).toBe(true);
      expect(isValidSaram('0745123')).toBe(true);

      // Inválidos
      expect(isValidSaram('')).toBe(false);
      expect(isValidSaram(null)).toBe(false);
      expect(isValidSaram('abc')).toBe(false);
      expect(isValidSaram('123')).toBe(false); // menos de 5 dígitos
      expect(isValidSaram('123456789')).toBe(false); // mais de 7 dígitos
      expect(isValidSaram('-500000')).toBe(false);
    });

    test('deve higienizar e formatar SARAM para exibição padronizada', () => {
      expect(cleanSaram('689-1234')).toBe('6891234');
      expect(formatSaram('745123')).toBe('0745123');
      expect(formatSaram('6891234')).toBe('6891234');
    });

    test('deve validar e-mails com rigor', () => {
      expect(isValidEmail('militar@fab.mil.br')).toBe(true);
      expect(isValidEmail('usuario.ti@gmail.com')).toBe(true);

      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('militar@')).toBe(false);
      expect(isValidEmail('militar.fab.mil.br')).toBe(false);
      expect(isValidEmail('@fab.mil.br')).toBe(false);
    });

    test('deve validar telefones com DDD brasileiro', () => {
      expect(isValidPhone('61988887777')).toBe(true);
      expect(isValidPhone('(61) 98888-7777')).toBe(true);
      expect(isValidPhone('(61) 3333-2222')).toBe(true);

      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone('12345')).toBe(false);
    });

    test('deve conter graduações oficiais da FAB na lista de postos', () => {
      expect(COMMON_RANKS).toContain('3S');
      expect(COMMON_RANKS).toContain('2T');
      expect(COMMON_RANKS).toContain('CAP');
      expect(COMMON_RANKS).toContain('CEL');
    });
  });

  describe('4. Validação de Endpoint da API', () => {
    test('deve rejeitar conexões HTTP inseguras em domínios públicos', async () => {
      await expect(setApiBaseUrl('http://servidor-publico.fab.mil.br/api')).rejects.toThrow(
        /Apenas conexões criptografadas \(HTTPS\)/
      );
    });

    test('deve aceitar conexões HTTPS válidas', async () => {
      const secureUrl = 'https://binfae.fab.mil.br/api';
      await setApiBaseUrl(secureUrl);
      expect(getApiBaseUrl()).toBe(secureUrl);
    });

    test('deve autorizar IPs de rede local e loopback para testes em ambiente militar fechado', async () => {
      await setApiBaseUrl('http://10.0.2.2:8000');
      expect(getApiBaseUrl()).toBe('http://10.0.2.2:8000');

      await setApiBaseUrl('http://localhost:8000');
      expect(getApiBaseUrl()).toBe('http://localhost:8000');
    });
  });
});
