import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { SecurityProvider } from './src/context/SecurityContext';
import { StockProvider } from './src/context/StockContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SecurityLockModal } from './src/components/SecurityLockModal';
import { ErrorBoundary } from './src/components/ErrorBoundary';

const Main: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
      <SecurityLockModal />
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary fallbackMessage="Ocorreu uma falha no aplicativo. Toque abaixo para tentar recarregar.">
        <ThemeProvider>
          <AuthProvider>
            <SecurityProvider>
              <StockProvider>
                <Main />
              </StockProvider>
            </SecurityProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
