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
  background: '#0B0F19',
  surface: '#111827',
  surfaceVariant: '#1F293D',
  card: '#151D2F',
  border: '#243049',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  accent: '#38BDF8',
  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  info: '#3B82F6',
  infoBg: 'rgba(59, 130, 246, 0.15)',
  headerBg: '#0E1422',
  tabBarBg: '#0F1626',
  tabBarBorder: '#1E293B',
  inputBg: '#131A2A',
  inputBorder: '#27354F',
  badgeBg: 'rgba(99, 102, 241, 0.15)',
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
  primary: '#4F46E5',
  primaryLight: '#6366F1',
  primaryDark: '#4338CA',
  accent: '#0284C7',
  success: '#059669',
  successBg: 'rgba(5, 150, 105, 0.1)',
  warning: '#D97706',
  warningBg: 'rgba(217, 119, 6, 0.1)',
  danger: '#DC2626',
  dangerBg: 'rgba(220, 38, 38, 0.1)',
  info: '#2563EB',
  infoBg: 'rgba(37, 99, 235, 0.1)',
  headerBg: '#FFFFFF',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  inputBg: '#F8FAFC',
  inputBorder: '#CBD5E1',
  badgeBg: 'rgba(79, 70, 229, 0.1)',
};
