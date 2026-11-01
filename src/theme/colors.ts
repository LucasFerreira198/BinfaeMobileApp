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
  background: '#070A0F',
  surface: '#0E1422',
  surfaceVariant: '#151E30',
  card: '#151E30',
  border: '#222E46',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  primary: '#00E5C0',
  primaryLight: '#34F5D3',
  primaryDark: '#00B395',
  accent: '#38BDF8',
  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  info: '#8B5CF6',
  infoBg: 'rgba(139, 92, 246, 0.15)',
  headerBg: '#070A0F',
  tabBarBg: '#0A0E18',
  tabBarBorder: '#1A2338',
  inputBg: '#0E1422',
  inputBorder: '#222E46',
  badgeBg: 'rgba(0, 229, 192, 0.15)',
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
  primary: '#00796B',
  primaryLight: '#00897B',
  primaryDark: '#004D40',
  accent: '#0284C7',
  success: '#059669',
  successBg: 'rgba(5, 150, 105, 0.1)',
  warning: '#D97706',
  warningBg: 'rgba(217, 119, 6, 0.1)',
  danger: '#DC2626',
  dangerBg: 'rgba(220, 38, 38, 0.1)',
  info: '#6D28D9',
  infoBg: 'rgba(109, 40, 217, 0.1)',
  headerBg: '#FFFFFF',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  inputBg: '#F8FAFC',
  inputBorder: '#CBD5E1',
  badgeBg: 'rgba(0, 137, 123, 0.12)',
};
