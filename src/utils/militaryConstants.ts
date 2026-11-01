/**
 * Constantes e Validações Padronizadas para Dados Militares da Força Aérea Brasileira (FAB)
 * Centraliza regras de SARAM, Postos/Graduações, E-mail e Telefones para evitar duplicação.
 */

export const COMMON_RANKS = [
  'S2',
  'S1',
  'CB',
  '3S',
  '2S',
  '1S',
  'SO',
  'ASP',
  '2T',
  '1T',
  'CAP',
  'MAJ',
  'TC',
  'CEL',
] as const;

export type MilitaryRank = (typeof COMMON_RANKS)[number] | string;

/**
 * Validação estrita de SARAM Militar.
 * O SARAM é composto exclusivamente por dígitos numéricos (entre 5 e 7 dígitos).
 */
export function isValidSaram(saram: string | number | null | undefined): boolean {
  if (saram === null || saram === undefined) return false;
  const cleaned = String(saram).trim().replace(/\D/g, '');
  if (cleaned.length < 5 || cleaned.length > 7) return false;
  const num = parseInt(cleaned, 10);
  return !isNaN(num) && num > 0;
}

/**
 * Higieniza o SARAM removendo caracteres não numéricos.
 */
export function cleanSaram(saram: string): string {
  return saram.replace(/\D/g, '');
}

/**
 * Formata o SARAM garantindo a representação padrão com 7 dígitos (zeros à esquerda se necessário).
 */
export function formatSaram(saram: string | number): string {
  const cleaned = cleanSaram(String(saram));
  if (!cleaned) return '';
  return cleaned.length <= 7 ? cleaned.padStart(7, '0') : cleaned;
}

/**
 * Validação de e-mail institucional ou civil com Regex RFC 5322 simplificada.
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validação de telefone brasileiro (DDD + 8 ou 9 dígitos).
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11;
}

/**
 * Formatação de telefone para exibição: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX.
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}
