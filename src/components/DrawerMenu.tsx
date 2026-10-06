import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  BackHandler,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useStock } from '../context/StockContext';
import { useDrawer, ScreenType } from '../context/DrawerContext';
import { CURRENT_VERSION } from './UpdateModal';
import { UserAvatar } from './UserAvatar';
import {
  X,
  Shield,
  MapPin,
  ArrowRightLeft,
  ShieldAlert,
  Moon,
  Sun,
  RefreshCw,
  LogOut,
  ChevronRight,
  FolderTree,
  Layers,
} from 'lucide-react-native';

export const DrawerMenu: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { syncData, isSyncing } = useStock();
  const insets = useSafeAreaInsets();
  const {
    isDrawerOpen,
    closeDrawer,
    activeScreen,
    navigateTo,
    openLocationsModal,
    openGroupsModal,
  } = useDrawer();

  // Tratamento do botão voltar físico do Android para fechar o Drawer
  useEffect(() => {
    if (!isDrawerOpen) return;

    const backAction = () => {
      closeDrawer();
      return true;
    };

    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [isDrawerOpen, closeDrawer]);

  if (!isDrawerOpen) return null;

  const militar = user?.militar;
  const displayName = militar
    ? `${militar.posto_graduacao} ${militar.nome_guerra}`
    : user?.username || 'Militar';

  const saramOrUsername = militar?.saram
    ? `SARAM: ${militar.saram} • ${militar.secao || 'BINF-AE'}`
    : `@${user?.username}`;

  const handleLogout = () => {
    closeDrawer();
    Alert.alert('Encerrar Sessão', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <Modal
      visible={isDrawerOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={closeDrawer}
    >
      <View style={styles.modalBackdrop}>
        {/* Painel Lateral (Drawer) à Esquerda */}
        <View
          style={[
            styles.drawerPanel,
            {
              backgroundColor: theme.surface,
              borderRightColor: theme.border,
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Topo do Usuário / Militar */}
          <View style={[styles.userSection, { borderBottomColor: theme.border }]}>
            <View style={styles.userTopRow}>
              <TouchableOpacity
                onPress={() => {
                  closeDrawer();
                  navigateTo('settings');
                }}
                activeOpacity={0.8}
              >
                <UserAvatar user={user} militar={militar} size={46} showBorder={true} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={closeDrawer}
                style={[styles.closeBtn, { backgroundColor: theme.surfaceVariant }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color={theme.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.userInfo}
              onPress={() => {
                closeDrawer();
                navigateTo('settings');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={[styles.userSaram, { color: theme.textSecondary }]} numberOfLines={1}>
                {saramOrUsername}
              </Text>

              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor: user?.admin ? theme.primary : theme.surfaceVariant,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.roleBadgeText,
                    { color: user?.admin ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  {user?.admin ? 'ADMINISTRADOR' : 'OPERADOR MILITAR'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Navegação Principal do Menu Lateral */}
          <ScrollView
            style={styles.menuScroll}
            contentContainerStyle={styles.menuScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.sectionHeading, { color: theme.textMuted }]}>
              NAVEGAÇÃO PRINCIPAL
            </Text>

            {/* 1. Locais Físicos */}
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={openLocationsModal}
              activeOpacity={0.7}
            >
              <View style={[styles.menuItemIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <FolderTree size={20} color="#10B981" />
              </View>
              <View style={styles.menuItemInfo}>
                <Text style={[styles.menuItemTitle, { color: theme.text }]}>Locais Físicos</Text>
                <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>
                  Depósitos, salas, armários e prateleiras
                </Text>
              </View>
              <ChevronRight size={18} color={theme.textMuted} />
            </TouchableOpacity>

            {/* 2. Grupos & Subgrupos */}
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={openGroupsModal}
              activeOpacity={0.7}
            >
              <View style={[styles.menuItemIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                <Layers size={20} color="#A855F7" />
              </View>
              <View style={styles.menuItemInfo}>
                <Text style={[styles.menuItemTitle, { color: theme.text }]}>Grupos & Subgrupos</Text>
                <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>
                  Categorias, classificações e itens
                </Text>
              </View>
              <ChevronRight size={18} color={theme.textMuted} />
            </TouchableOpacity>

            {/* 3. Histórico Geral de Movimentações */}
            <TouchableOpacity
              style={[
                styles.menuItem,
                {
                  backgroundColor: activeScreen === 'movements' ? theme.badgeBg : theme.card,
                  borderColor: activeScreen === 'movements' ? theme.primary : theme.border,
                },
              ]}
              onPress={() => navigateTo('movements')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuItemIcon, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <ArrowRightLeft size={20} color="#38BDF8" />
              </View>
              <View style={styles.menuItemInfo}>
                <Text style={[styles.menuItemTitle, { color: theme.text }]}>Histórico Geral</Text>
                <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>
                  Auditoria e registro de movimentações
                </Text>
              </View>
              <ChevronRight size={18} color={theme.textMuted} />
            </TouchableOpacity>

            {/* 3. Painel Administrativo (Apenas Admin) */}
            {user?.admin && (
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  {
                    backgroundColor: activeScreen === 'admin' ? theme.badgeBg : theme.card,
                    borderColor: activeScreen === 'admin' ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => navigateTo('admin')}
                activeOpacity={0.7}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <ShieldAlert size={20} color="#EF4444" />
                </View>
                <View style={styles.menuItemInfo}>
                  <Text style={[styles.menuItemTitle, { color: theme.text }]}>Painel Admin</Text>
                  <Text style={[styles.menuItemSub, { color: theme.textSecondary }]}>
                    Gestão de usuários e efetivo militar
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.textMuted} />
              </TouchableOpacity>
            )}

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <Text style={[styles.sectionHeading, { color: theme.textMuted }]}>
              PREFERÊNCIAS & SISTEMA
            </Text>

            {/* Alternar Tema */}
            <TouchableOpacity
              style={[styles.smallMenuItem, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <View style={styles.smallItemLeft}>
                {isDark ? <Sun size={18} color="#FBBF24" /> : <Moon size={18} color="#6366F1" />}
                <Text style={[styles.smallItemTitle, { color: theme.text }]}>
                  {isDark ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Sincronização */}
            <TouchableOpacity
              style={[styles.smallMenuItem, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => syncData(true)}
              disabled={isSyncing}
              activeOpacity={0.7}
            >
              <View style={styles.smallItemLeft}>
                <RefreshCw size={18} color={theme.primary} />
                <Text style={[styles.smallItemTitle, { color: theme.text }]}>
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar Banco Agora'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Logout */}
            <TouchableOpacity
              style={[styles.logoutMenuItem, { backgroundColor: theme.dangerBg, borderColor: theme.danger }]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <LogOut size={18} color={theme.danger} />
              <Text style={[styles.logoutTitle, { color: theme.danger }]}>Encerrar Sessão</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Rodapé */}
          <View style={[styles.drawerFooter, { borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
            <Text style={[styles.footerText, { color: theme.textMuted }]}>
              Binfae Mobile v{CURRENT_VERSION}
            </Text>
          </View>
        </View>

        {/* Clique fora para fechar o menu à Direita */}
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <View style={styles.outsideOverlay} />
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  outsideOverlay: {
    flex: 1,
  },
  drawerPanel: {
    width: '82%',
    maxWidth: 320,
    height: '100%',
    borderRightWidth: 1,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  userSection: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    gap: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
  },
  userSaram: {
    fontSize: 12,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  menuScroll: {
    flex: 1,
  },
  menuScrollContent: {
    padding: 16,
    gap: 10,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginLeft: 4,
    marginTop: 4,
    marginBottom: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuItemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
  },
  smallMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  smallItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  smallItemTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  logoutMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  logoutTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  drawerFooter: {
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
