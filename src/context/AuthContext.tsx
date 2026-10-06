import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, setAuthTokens, clearAuthSession, getAuthToken, initApiClient } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
  updateProfile: (data: {
    foto_url?: string | null;
    password?: string | null;
    celular?: string | null;
    email?: string | null;
    nome_guerra?: string | null;
    secao?: string | null;
  }) => Promise<User>;
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
  updateProfile: async () => ({} as User),
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
            if (err.message?.includes('Sessão expirada')) {
              logout();
            }
          });
      } else {
        setTokenState(null);
        setUser(null);
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
      await setAuthTokens(data.access_token, data.refresh_token);
      setTokenState(data.access_token);

      const me = await api.getMe();
      setUser(me);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(me));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await clearAuthSession();
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

  const updateProfile = async (data: {
    foto_url?: string | null;
    password?: string | null;
    celular?: string | null;
    email?: string | null;
    nome_guerra?: string | null;
    secao?: string | null;
  }): Promise<User> => {
    const updated = await api.updateMe(data);
    setUser(updated);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    return updated;
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
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
