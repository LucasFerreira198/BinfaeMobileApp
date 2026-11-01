export interface ThemeColors {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceVariant: string;
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  info: string;
  infoBg: string;
  headerBg: string;
  tabBarBg: string;
  tabBarBorder: string;
  inputBg: string;
  inputBorder: string;
  badgeBg: string;
}

export const darkTheme: ThemeColors = {
  isDark: true,
  background: '#0B0F17',
  surface: '#101520',
  surfaceVariant: '#151D2A',
  card: '#151D2A',
  border: '#232B3E',
  text: '#F9FAFB',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  primary: '#00D2B4',
  primaryLight: '#2DD4BF',
  primaryDark: '#0D9488',
  accent: '#38BDF8',
  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  info: '#38BDF8',
  infoBg: 'rgba(56, 189, 248, 0.15)',
  headerBg: '#0B0F17',
  tabBarBg: '#0D121D',
  tabBarBorder: '#1E2638',
  inputBg: '#0E131E',
  inputBorder: '#232B3E',
  badgeBg: 'rgba(0, 210, 180, 0.15)',
};

export const lightTheme: ThemeColors = {
  isDark: false,
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  card: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  primary: '#0D9488',
  primaryLight: '#00D2B4',
  primaryDark: '#0F766E',
  accent: '#0284C7',
  success: '#059669',
  successBg: 'rgba(5, 150, 105, 0.1)',
  warning: '#D97706',
  warningBg: 'rgba(217, 119, 6, 0.1)',
  danger: '#DC2626',
  dangerBg: 'rgba(220, 38, 38, 0.1)',
  info: '#0284C7',
  infoBg: 'rgba(2, 132, 199, 0.1)',
  headerBg: '#FFFFFF',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  inputBg: '#F8FAFC',
  inputBorder: '#CBD5E1',
  badgeBg: 'rgba(13, 148, 136, 0.12)',
};
