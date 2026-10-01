import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, setAuthToken, getAuthToken, initApiClient } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
}

const USER_STORAGE_KEY = '@binfae_auth_user';

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  reloadUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    bootstrapAuth();
  }, []);

  const bootstrapAuth = async () => {
    try {
      await initApiClient();
      const storedToken = getAuthToken();
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);

      if (storedToken && storedUser) {
        setTokenState(storedToken);
        setUser(JSON.parse(storedUser));

        // Revalida em segundo plano sem travar a interface
        api.getMe()
          .then((freshUser) => {
            setUser(freshUser);
            AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(freshUser));
          })
          .catch((err) => {
            console.warn('Erro ao revalidar sessão:', err);
            // Se for 401, faz logout
            if (err.message?.includes('Sessão expirada')) {
              logout();
            }
          });
      }
    } catch (err) {
      console.warn('Erro ao inicializar autenticação:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (identifier: string, pass: string) => {
    setIsLoading(true);
    try {
      const data = await api.login(identifier, pass);
      await setAuthToken(data.access_token);
      setTokenState(data.access_token);

      const me = await api.getMe();
      setUser(me);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(me));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await setAuthToken(null);
    setTokenState(null);
    setUser(null);
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  };

  const reloadUser = async () => {
    try {
      const me = await api.getMe();
      setUser(me);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(me));
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        reloadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
