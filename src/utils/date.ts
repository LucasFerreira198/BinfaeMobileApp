/**
 * Utilitário para conversão e formatação de datas no fuso horário brasileiro (Brasília UTC-3).
 * Garante que datas salvas em UTC no banco de dados sejam exibidas no horário correto local.
 */

export const parseToLocalDate = (value?: string | number | null): Date => {
  if (!value) return new Date();
  if (typeof value === 'number') return new Date(value);
  
  let s = value.toString().trim();
  if (!s) return new Date();

  // Se a string não contém indicador de timezone (nem Z, nem +, nem -XX:XX no final),
  // como o backend persiste em UTC, garante sufixo Z para o JS converter ao fuso local.
  if (!s.endsWith('Z') && !s.includes('+') && !/-\d{2}:\d{2}$/.test(s)) {
    s = s.replace(' ', 'T') + 'Z';
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
};

export const formatDateTime = (value?: string | number | null): string => {
  if (!value) return '';
  const d = parseToLocalDate(value);
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

export const formatShortDateTime = (value?: string | number | null): string => {
  if (!value) return '';
  const d = parseToLocalDate(value);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month} ${hours}:${mins}`;
};

export const formatDate = (value?: string | number | null): string => {
  if (!value) return '';
  const d = parseToLocalDate(value);
  return d.toLocaleDateString('pt-BR');
};
