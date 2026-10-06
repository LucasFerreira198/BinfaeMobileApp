import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useStock } from '../context/StockContext';
import { useDrawer } from '../context/DrawerContext';
import { RefreshCw, Moon, Sun, Menu, ArrowLeft } from 'lucide-react-native';
import { UserAvatar } from './UserAvatar';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showSync?: boolean;
  showBack?: boolean;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showSync = true,
  showBack = false,
  onBack,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { isSyncing, syncData } = useStock();
  const { openDrawer, navigateTo, activeScreen } = useDrawer();

  const militarInfo = user?.militar
    ? `${user.militar.posto_graduacao} ${user.militar.nome_guerra}`
    : user?.username || 'Militar';

  // Se estiver nas telas acessadas pelo drawer (movements/admin) ou se showBack for true, exibe botão voltar
  const isBackMode = showBack || (activeScreen === 'movements' || activeScreen === 'admin');

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigateTo('stock');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
      <View style={styles.left}>
        {isBackMode ? (
          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: theme.surfaceVariant }]}
            onPress={handleBack}
            accessibilityLabel="Voltar para materiais"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={20} color={theme.text} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: theme.surfaceVariant }]}
            onPress={openDrawer}
            accessibilityLabel="Abrir menu lateral"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Menu size={20} color={theme.text} />
          </TouchableOpacity>
        )}

        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title || 'Binfae Mobile'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
            {subtitle || militarInfo}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        {showSync && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.surfaceVariant }]}
            onPress={() => syncData(true)}
            disabled={isSyncing}
            accessibilityLabel="Sincronizar dados"
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <RefreshCw size={18} color={theme.textSecondary} />
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.surfaceVariant }]}
          onPress={toggleTheme}
          accessibilityLabel="Alternar tema"
        >
          {isDark ? (
            <Sun size={18} color="#FBBF24" />
          ) : (
            <Moon size={18} color="#6366F1" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={openDrawer}
          accessibilityLabel="Abrir perfil e menu"
          activeOpacity={0.8}
          style={{ marginLeft: 2 }}
        >
          <UserAvatar user={user} size={34} showBorder={true} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
