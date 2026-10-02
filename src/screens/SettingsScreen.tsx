import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useStock } from '../context/StockContext';
import { Header } from '../components/Header';
import { UpdateModal, CURRENT_VERSION } from '../components/UpdateModal';
import {
  Shield,
  Moon,
  Sun,
  RefreshCw,
  DownloadCloud,
  LogOut,
  ChevronRight,
  User,
  IdCard,
  Briefcase,
  Phone,
  Mail,
  CheckCircle2,
} from 'lucide-react-native';

export const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, mode, setMode, isDark, toggleTheme } = useTheme();
  const { lastSync, syncData, isSyncing } = useStock();

  const [updateModalVisible, setUpdateModalVisible] = useState<boolean>(false);

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

  const formatLastSync = (ts: number | null) => {
    if (!ts) return 'Nunca sincronizado';
    const date = new Date(ts);
    return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Configurações" subtitle="Perfil & Preferências" showSync={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Card Detalhado do Usuário / Militar */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PERFIL & CONTA</Text>
        <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.profileTopRow}>
            <View style={[styles.profileAvatar, { backgroundColor: theme.badgeBg }]}>
              <Shield size={28} color={theme.primary} />
            </View>
            <View style={styles.profileMainInfo}>
              <Text style={[styles.profileName, { color: theme.text }]}>{displayName}</Text>
              <Text style={[styles.profileUsername, { color: theme.textMuted }]}>
                Login: @{user?.username}
              </Text>
            </View>
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
                {user?.admin ? 'ADMIN' : 'OPERADOR'}
              </Text>
            </View>
          </View>

          {/* Dados Militares Completos */}
          {militar ? (
            <View style={[styles.militaryDetailsBox, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
              <View style={styles.detailRow}>
                <IdCard size={15} color={theme.primary} />
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>SARAM:</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{militar.saram}</Text>
              </View>

              <View style={styles.detailRow}>
                <User size={15} color={theme.primary} />
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Nome Completo:</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{militar.nome_completo}</Text>
              </View>

              <View style={styles.detailRow}>
                <Briefcase size={15} color={theme.primary} />
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Posto / Graduação:</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{militar.posto_graduacao}</Text>
              </View>

              <View style={styles.detailRow}>
                <Briefcase size={15} color={theme.primary} />
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Seção:</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{militar.secao || 'Informática'}</Text>
              </View>

              {militar.quadro_especialidade && (
                <View style={styles.detailRow}>
                  <Briefcase size={15} color={theme.primary} />
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Quadro/Espec.:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{militar.quadro_especialidade}</Text>
                </View>
              )}

              {militar.email && (
                <View style={styles.detailRow}>
                  <Mail size={15} color={theme.primary} />
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>E-mail:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{militar.email}</Text>
                </View>
              )}

              {militar.telefone && (
                <View style={styles.detailRow}>
                  <Phone size={15} color={theme.primary} />
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Telefone:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{militar.telefone}</Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <CheckCircle2 size={15} color={theme.success} />
                <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Status da Conta:</Text>
                <Text style={[styles.detailValue, { color: theme.success, fontWeight: '700' }]}>
                  {user?.ativo ? 'Ativa & Habilitada' : 'Inativa'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.militaryDetailsBox, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
              <Text style={[styles.detailValue, { color: theme.textSecondary }]}>
                Conta de operador geral sem militar vinculado diretamente.
              </Text>
            </View>
          )}
        </View>

        {/* 2. Seção: Aparência e Tema */}
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

        {/* 3. Seção: Sincronização Silenciosa Local */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SINCRONIZAÇÃO</Text>
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
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

        {/* 4. Seção: Atualização do Aplicativo */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>VERSÃO & ATUALIZAÇÕES</Text>
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
                  Versão instalada: v{CURRENT_VERSION} • Verificar atualizações
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>
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
          Binfae Mobile v{CURRENT_VERSION} • Sistema Nativo Offline-First
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  profileCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 18,
    gap: 14,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMainInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
  },
  profileUsername: {
    fontSize: 12,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  militaryDetailsBox: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 100,
  },
  detailValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
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
