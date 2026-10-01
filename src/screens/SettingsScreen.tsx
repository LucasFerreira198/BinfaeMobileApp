import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useStock } from '../context/StockContext';
import { getApiBaseUrl, setApiBaseUrl } from '../api/client';
import { Header } from '../components/Header';
import { UpdateModal } from '../components/UpdateModal';
import {
  User,
  Shield,
  Moon,
  Sun,
  Database,
  RefreshCw,
  DownloadCloud,
  Server,
  LogOut,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';

export const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, mode, setMode, isDark, toggleTheme } = useTheme();
  const { allItems, lastSync, syncData, isSyncing } = useStock();

  const [updateModalVisible, setUpdateModalVisible] = useState<boolean>(false);
  const [editingServer, setEditingServer] = useState<boolean>(false);
  const [serverUrl, setServerUrl] = useState<string>(getApiBaseUrl());

  const militar = user?.militar;
  const displayName = militar
    ? `${militar.posto_graduacao} ${militar.nome_guerra}`
    : user?.username || 'Usuário';

  const handleLogout = () => {
    Alert.alert(
      'Encerrar Sessão',
      'Deseja realmente sair da sua conta no aplicativo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleSaveServer = async () => {
    try {
      await setApiBaseUrl(serverUrl);
      setEditingServer(false);
      Alert.alert('Sucesso', 'Endereço do servidor atualizado.');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o endereço.');
    }
  };

  const formatLastSync = (ts: number | null) => {
    if (!ts) return 'Nunca sincronizado';
    const date = new Date(ts);
    return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Configurações" subtitle="Perfil & Preferências" showSync={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Card do Militar */}
        <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.profileAvatar, { backgroundColor: theme.badgeBg }]}>
            <Shield size={32} color={theme.primary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.text }]}>{displayName}</Text>
            {militar ? (
              <>
                <Text style={[styles.profileDetails, { color: theme.textSecondary }]}>
                  SARAM: {militar.saram} • {militar.secao || 'Informática'}
                </Text>
                <Text style={[styles.profileRole, { color: theme.primary }]}>
                  {user?.admin ? 'Administrador do Sistema' : 'Operador'}
                </Text>
              </>
            ) : (
              <Text style={[styles.profileDetails, { color: theme.textSecondary }]}>
                {user?.admin ? 'Administrador Geral' : 'Usuário Padrão'}
              </Text>
            )}
          </View>
        </View>

        {/* Seção: Aparência e Tema */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>APARÊNCIA</Text>
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: isDark ? '#312E81' : '#FEF3C7' }]}>
                {isDark ? <Moon size={18} color="#818CF8" /> : <Sun size={18} color="#F59E0B" />}
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: theme.text }]}>Tema Escuro</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>
                  {isDark ? 'Ativado (visual escuro moderno)' : 'Desativado (visual claro)'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Opções de Tema */}
          <View style={styles.themeOptions}>
            {(['dark', 'light', 'system'] as const).map((m) => {
              const active = mode === m;
              const labels = { dark: 'Escuro', light: 'Claro', system: 'Automático' };
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMode(m)}
                  style={[
                    styles.themeOptionBtn,
                    {
                      backgroundColor: active ? theme.primary : theme.surfaceVariant,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: active ? '#FFFFFF' : theme.text, fontWeight: active ? '700' : '500' },
                    ]}
                  >
                    {labels[m]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Seção: Banco de Dados Local & Sincronização */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>BANCO LOCAL NO CELULAR (0MS)</Text>
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: theme.badgeBg }]}>
                <Database size={18} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: theme.text }]}>Itens em Memória</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>
                  {allItems.length} materiais indexados localmente
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: theme.successBg }]}>
                <RefreshCw size={18} color={theme.success} />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: theme.text }]}>Última Sincronização</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>
                  {formatLastSync(lastSync)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: theme.primary }]}
              onPress={() => syncData(true)}
              disabled={isSyncing}
            >
              <Text style={styles.smallBtnText}>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Seção: Atualização do Aplicativo */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ATUALIZAÇÕES</Text>
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setUpdateModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <DownloadCloud size={18} color="#38BDF8" />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: theme.text }]}>Atualizar Aplicativo</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]}>
                  Versão instalada: v1.0.0 • Verificar novos releases
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Seção: Servidor Backend */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SERVIDOR</Text>
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: theme.surfaceVariant }]}>
                <Server size={18} color={theme.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>Endereço do Servidor</Text>
                <Text style={[styles.rowSub, { color: theme.textMuted }]} numberOfLines={1}>
                  {serverUrl}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setEditingServer(!editingServer)}
              style={[styles.smallBtn, { backgroundColor: theme.surfaceVariant }]}
            >
              <Text style={[styles.smallBtnText, { color: theme.text }]}>
                {editingServer ? 'Cancelar' : 'Alterar'}
              </Text>
            </TouchableOpacity>
          </View>

          {editingServer && (
            <View style={{ marginTop: 12 }}>
              <TextInput
                style={[styles.serverInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.inputBorder }]}
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.serverSaveBtn, { backgroundColor: theme.primary }]}
                onPress={handleSaveServer}
              >
                <Text style={styles.serverSaveText}>Salvar Endereço</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Botão de Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: theme.dangerBg, borderColor: theme.danger }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={18} color={theme.danger} />
          <Text style={[styles.logoutText, { color: theme.danger }]}>Encerrar Sessão</Text>
        </TouchableOpacity>

        <Text style={[styles.versionFoot, { color: theme.textMuted }]}>
          Binfae Mobile v1.0.0 • Feito sob medida para Android
        </Text>
      </ScrollView>

      {/* Modal de Atualização */}
      <UpdateModal
        visible={updateModalVisible}
        onClose={() => setUpdateModalVisible(false)}
        manualTrigger={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 20,
    gap: 14,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
  },
  profileDetails: {
    fontSize: 12,
    marginTop: 2,
  },
  profileRole: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOptionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  themeOptionText: {
    fontSize: 12,
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  smallBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  serverInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 12,
    marginBottom: 8,
  },
  serverSaveBtn: {
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  serverSaveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginTop: 6,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
  },
  versionFoot: {
    fontSize: 11,
    textAlign: 'center',
  },
});
