import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { DrawerProvider, useDrawer, ScreenType } from '../context/DrawerContext';
import { StockScreen } from '../screens/StockScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { CautelasScreen } from '../screens/CautelasScreen';
import { MovementsScreen } from '../screens/MovementsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AdminScreen } from '../screens/AdminScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { DrawerMenu } from '../components/DrawerMenu';
import { LocationsModal } from '../components/LocationsModal';
import { GroupsModal } from '../components/GroupsModal';
import { UpdateModal, compareVersions, CURRENT_VERSION, extractReleaseVersion } from '../components/UpdateModal';
import { Box, QrCode, ClipboardList, Settings } from 'lucide-react-native';

const AppNavigatorInner: React.FC<{
  activeScreen: ScreenType;
  setActiveScreen: (screen: ScreenType) => void;
}> = ({ activeScreen, setActiveScreen }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    locationsModalOpen,
    closeLocationsModal,
    groupsModalOpen,
    closeGroupsModal,
  } = useDrawer();

  // Abas da barra inferior solicitadas pelo usuário:
  // "deixando embaixo a de materiais de scanear, cautelas (em breve) e ajustes"
  const bottomTabs: Array<{ id: ScreenType; label: string; icon: any; badge?: string }> = [
    { id: 'stock', label: 'Materiais', icon: Box },
    { id: 'scanner', label: 'Escanear', icon: QrCode },
    { id: 'cautelas', label: 'Cautelas', icon: ClipboardList },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {/* Conteúdo da Tela Ativa */}
      <View style={styles.screenContent}>
        {activeScreen === 'stock' && <StockScreen />}
        {activeScreen === 'scanner' && <ScannerScreen />}
        {activeScreen === 'cautelas' && (
          <CautelasScreen
            onGoToStock={() => setActiveScreen('stock')}
            onGoToScanner={() => setActiveScreen('scanner')}
          />
        )}
        {activeScreen === 'settings' && <SettingsScreen />}
        {activeScreen === 'movements' && <MovementsScreen />}
        {activeScreen === 'admin' && user?.admin && <AdminScreen />}
      </View>

      {/* Bottom Navigation Bar Nativa */}
      <View
        style={[
          styles.bottomNav,
          {
            backgroundColor: theme.tabBarBg,
            borderTopColor: theme.tabBarBorder,
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        {bottomTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeScreen === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveScreen(tab.id)}
              style={styles.navItem}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.navIconWrap,
                  {
                    backgroundColor: isActive ? theme.badgeBg : 'transparent',
                  },
                ]}
              >
                <Icon
                  size={20}
                  color={isActive ? theme.primary : theme.textMuted}
                />
              </View>

              <View style={styles.labelContainer}>
                <Text
                  style={[
                    styles.navLabel,
                    {
                      color: isActive ? theme.primary : theme.textMuted,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {tab.label}
                </Text>

                {tab.badge && (
                  <View style={[styles.badgePill, { backgroundColor: isActive ? theme.badgeBg : theme.surfaceVariant }]}>
                    <Text
                      style={[
                        styles.badgeText,
                        { color: isActive ? theme.primary : theme.textMuted },
                      ]}
                    >
                      {tab.badge}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Menu Lateral (Drawer) */}
      <DrawerMenu />

      {/* Modal Hierárquico de Locais Físicos acionado pelo Menu Lateral */}
      <LocationsModal
        visible={locationsModalOpen}
        onClose={closeLocationsModal}
        onSelectLocation={() => {
          setActiveScreen('stock');
        }}
      />

      {/* Modal de Gestão de Grupos e Subgrupos acionado pelo Menu Lateral */}
      <GroupsModal
        visible={groupsModalOpen}
        onClose={closeGroupsModal}
      />
    </View>
  );
};

export const AppNavigator: React.FC = () => {
  const { theme } = useTheme();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeScreen, setActiveScreen] = useState<ScreenType>('stock');
  const [mandatoryUpdateVisible, setMandatoryUpdateVisible] = useState<boolean>(false);

  // Verificação Crítica de Inicialização (Hard Update Obrigatório)
  useEffect(() => {
    const checkCriticalUpdate = async () => {
      try {
        const res = await fetch('https://api.github.com/repos/LucasFerreira198/BinfaeMobileApp/releases/latest', {
          headers: { Accept: 'application/vnd.github.v3+json' },
        });
        if (!res.ok) return;
        const data = await res.json();
        const rawTag = (data.tag_name || '').trim();
        const rawName = (data.name || '').trim();
        const rawBody = (data.body || '').trim();

        const remoteVer = extractReleaseVersion(rawTag, rawName, rawBody);

        if (remoteVer && compareVersions(remoteVer, CURRENT_VERSION) > 0) {
          setMandatoryUpdateVisible(true);
        }
      } catch (err) {
        console.warn('Erro ao verificar atualização crítica inicial:', err);
      }
    };

    checkCriticalUpdate();
  }, []);

  // Se o usuário perder privilégios admin e estiver na tela admin, volta para stock
  useEffect(() => {
    if (activeScreen === 'admin' && !user?.admin) {
      setActiveScreen('stock');
    }
  }, [user?.admin, activeScreen]);

  // Gerenciamento completo do botão de voltar físico do Android
  useEffect(() => {
    if (!isAuthenticated) return;

    const backAction = () => {
      if (mandatoryUpdateVisible) return true;

      // Se estiver em outra tela, volta para a tela inicial de Materiais
      if (activeScreen !== 'stock') {
        setActiveScreen('stock');
        return true; // interceptou o evento
      }

      // Se já estiver na tela inicial, confirma antes de sair
      Alert.alert('Sair do Aplicativo', 'Deseja realmente fechar o Binfae Mobile?', [
        { text: 'Não', style: 'cancel' },
        { text: 'Sim', onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    };

    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [activeScreen, isAuthenticated, mandatoryUpdateVisible]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Carregando Binfae Mobile...
        </Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <DrawerProvider activeScreen={activeScreen} onNavigate={setActiveScreen}>
      <AppNavigatorInner activeScreen={activeScreen} setActiveScreen={setActiveScreen} />

      {/* Modal de Atualização Obrigatória (Hard Update) */}
      <UpdateModal
        visible={mandatoryUpdateVisible}
        onClose={() => setMandatoryUpdateVisible(false)}
        isMandatory={true}
      />
    </DrawerProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  screenContent: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navIconWrap: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  labelContainer: {
    alignItems: 'center',
    gap: 1,
  },
  navLabel: {
    fontSize: 11,
  },
  badgePill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 1,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
