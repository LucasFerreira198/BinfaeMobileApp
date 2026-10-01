import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { StockScreen } from '../screens/StockScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { MovementsScreen } from '../screens/MovementsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { Box, QrCode, ArrowRightLeft, Settings } from 'lucide-react-native';

type TabType = 'stock' | 'scanner' | 'movements' | 'settings';

export const AppNavigator: React.FC = () => {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('stock');

  // Gerenciamento completo do botão de voltar físico do Android
  useEffect(() => {
    if (!isAuthenticated) return;

    const backAction = () => {
      // Se estiver em outra aba, volta para a aba inicial de Materiais
      if (activeTab !== 'stock') {
        setActiveTab('stock');
        return true; // interceptou o evento
      }

      // Se já estiver na aba inicial, confirma antes de sair
      Alert.alert('Sair do Aplicativo', 'Deseja realmente fechar o Binfae Mobile?', [
        { text: 'Não', style: 'cancel' },
        { text: 'Sim', onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    };

    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [activeTab, isAuthenticated]);

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

  const tabs = [
    { id: 'stock' as TabType, label: 'Materiais', icon: Box },
    { id: 'scanner' as TabType, label: 'Escanear', icon: QrCode },
    { id: 'movements' as TabType, label: 'Histórico', icon: ArrowRightLeft },
    { id: 'settings' as TabType, label: 'Ajustes', icon: Settings },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {/* Conteúdo da Tela Ativa */}
      <View style={styles.screenContent}>
        {activeTab === 'stock' && <StockScreen />}
        {activeTab === 'scanner' && <ScannerScreen />}
        {activeTab === 'movements' && <MovementsScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
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
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
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
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
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
  navLabel: {
    fontSize: 11,
  },
});
