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

/**
 * Tabela de Pesos de Antiguidade Hierárquica da Força Aérea Brasileira (FAB).
 * Menor peso = mais antigo (primeiro na listagem).
 * Ordem: Oficiais Superiores (TC, MAJ), Oficiais Intermediários (CAP),
 * Oficiais Subalternos (1T, 2T, ASP), Graduados (SO, 1S, 2S, 3S) e Praças (CB, S1, S2).
 */
export const RANK_ANTIQUITY_WEIGHTS: Record<string, number> = {
  TB: 1,
  MB: 1,
  BB: 1,
  BRIG: 1,
  CEL: 2,
  TC: 3,
  'TEN CEL': 3,
  'TEN-CEL': 3,
  'TENENTE CORONEL': 3,
  'TENENTE-CORONEL': 3,
  MAJ: 4,
  MJ: 4,
  MAJOR: 4,
  CAP: 5,
  CP: 5,
  CAPITAO: 5,
  CAPITÃO: 5,
  '1T': 6,
  '1TEN': 6,
  '1º TEN': 6,
  '1 TEN': 6,
  'PRIMEIRO TENENTE': 6,
  '2T': 7,
  '2TEN': 7,
  '2º TEN': 7,
  '2 TEN': 7,
  'SEGUNDO TENENTE': 7,
  ASP: 8,
  ASPIRANTE: 8,
  SO: 9,
  SUBOFICIAL: 9,
  '1S': 10,
  '1SGT': 10,
  '1º SGT': 10,
  '1 SGT': 10,
  'PRIMEIRO SARGENTO': 10,
  '2S': 11,
  '2SGT': 11,
  '2º SGT': 11,
  '2 SGT': 11,
  'SEGUNDO SARGENTO': 11,
  '3S': 12,
  '3SGT': 12,
  '3º SGT': 12,
  '3 SGT': 12,
  'TERCEIRO SARGENTO': 12,
  CB: 13,
  CABO: 13,
  S1: 14,
  'SOLDADO 1ª CLASSE': 14,
  'SOLDADO 1 CLASSE': 14,
  S2: 15,
  'SOLDADO 2ª CLASSE': 15,
  'SOLDADO 2 CLASSE': 15,
  TM: 16,
  T1: 16,
  T2: 16,
  TAIFEIRO: 16,
};

export function getRankAntiquityWeight(posto?: string | null): number {
  if (!posto) return 99;
  const p = posto.trim().toUpperCase();
  if (RANK_ANTIQUITY_WEIGHTS[p] !== undefined) {
    return RANK_ANTIQUITY_WEIGHTS[p];
  }
  for (const [key, weight] of Object.entries(RANK_ANTIQUITY_WEIGHTS)) {
    if (p.startsWith(key)) return weight;
  }
  return 99;
}

export function sortMilitariesByAntiquity<T extends { posto_graduacao?: string | null; id?: number | null; saram: number | string }>(list: T[]): T[] {
  if (!list || !Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const wa = getRankAntiquityWeight(a?.posto_graduacao);
    const wb = getRankAntiquityWeight(b?.posto_graduacao);
    if (wa !== wb) return wa - wb;
    const ida = Number(a?.id ?? a?.saram ?? 0);
    const idb = Number(b?.id ?? b?.saram ?? 0);
    return ida - idb;
  });
}
