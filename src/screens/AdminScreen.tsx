import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
  Switch,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { api } from '../api/client';
import { User, Military, InformaticaConfig } from '../types';
import { Header } from '../components/Header';
import { CreateUserModal } from '../components/CreateUserModal';
import { EditUserModal } from '../components/EditUserModal';
import { CreateMilitaryModal } from '../components/CreateMilitaryModal';
import { EditMilitaryModal } from '../components/EditMilitaryModal';
import { loadLocalConfigTI, persistLocalConfigTI, getLocalConfigTI } from '../storage/db';
import {
  ShieldAlert,
  Users,
  Search,
  X,
  Phone,
  Mail,
  Briefcase,
  UserPlus,
  UserCog,
  Plus,
  Trash2,
  Settings,
  Lock,
  Save,
  Send,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react-native';

export const AdminScreen: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { keyboardHeight } = useKeyboardHeight();

  const [activeTab, setActiveTab] = useState<'users' | 'military' | 'config'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [militaryList, setMilitaryList] = useState<Military[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

  // Modais de Usuário e Militar
  const [createUserVisible, setCreateUserVisible] = useState<boolean>(false);
  const [editUserVisible, setEditUserVisible] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [createMilitaryVisible, setCreateMilitaryVisible] = useState<boolean>(false);
  const [editMilitaryVisible, setEditMilitaryVisible] = useState<boolean>(false);
  const [selectedMilitary, setSelectedMilitary] = useState<Military | null>(null);

  // Estados de Configuração TI & SMTP
  const [configTI, setConfigTI] = useState<InformaticaConfig | null>(() => getLocalConfigTI());
  const [smtpHost, setSmtpHost] = useState<string>('');
  const [smtpPort, setSmtpPort] = useState<string>('587');
  const [smtpUser, setSmtpUser] = useState<string>('');
  const [smtpPass, setSmtpPass] = useState<string>('');
  const [smtpFrom, setSmtpFrom] = useState<string>('');
  const [showPass, setShowPass] = useState<boolean>(false);
  const [notificarEmail, setNotificarEmail] = useState<boolean>(true);
  const [notificarWhatsapp, setNotificarWhatsapp] = useState<boolean>(false);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  // Modais de E-mail
  const [testModalVisible, setTestModalVisible] = useState<boolean>(false);
  const [testEmailDest, setTestEmailDest] = useState<string>('');
  const [testingEmail, setTestingEmail] = useState<boolean>(false);

  const [sendEmailModalVisible, setSendEmailModalVisible] = useState<boolean>(false);
  const [emailAssunto, setEmailAssunto] = useState<string>('');
  const [emailMensagem, setEmailMensagem] = useState<string>('');
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);

  const applyConfigToFields = (cfg: InformaticaConfig) => {
    setSmtpHost(cfg.smtp_host || '');
    setSmtpPort(cfg.smtp_port ? cfg.smtp_port.toString() : '587');
    setSmtpUser(cfg.smtp_user || '');
    setSmtpPass(cfg.has_smtp_password ? '••••••••' : (cfg.smtp_password || ''));
    setSmtpFrom(cfg.smtp_from || '');
    setNotificarEmail(cfg.notificar_email_ativo !== false);
    setNotificarWhatsapp(cfg.notificar_whatsapp_ativo === true);
  };

  const loadData = useCallback(async () => {
    try {
      const [userRes, milRes, cfgRes] = await Promise.all([
        api.listUsers().catch((err) => {
          console.warn('Erro ao listar usuários:', err);
          return [] as User[];
        }),
        api.listMilitary().catch((err) => {
          console.warn('Erro ao listar efetivo:', err);
          return [] as Military[];
        }),
        api.getConfigTI().catch((err) => {
          console.warn('Erro ao buscar configs TI:', err);
          return null;
        }),
      ]);

      setUsers(userRes);
      setMilitaryList(milRes);

      if (cfgRes) {
        setConfigTI(cfgRes);
        persistLocalConfigTI(cfgRes);
        applyConfigToFields(cfgRes);
      }
    } catch (err) {
      console.warn('Erro ao carregar dados administrativos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // 0ms Cache-First: carrega configurações imediatamente da memória
    loadLocalConfigTI().then((cached) => {
      if (cached) {
        setConfigTI(cached);
        applyConfigToFields(cached);
      }
    });
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const updated = await api.updateConfigTI({
        smtp_host: smtpHost.trim(),
        smtp_port: parseInt(smtpPort, 10) || 587,
        smtp_user: smtpUser.trim(),
        smtp_password: smtpPass.trim() !== '••••••••' ? smtpPass.trim() : undefined,
        smtp_from: smtpFrom.trim(),
        notificar_email_ativo: notificarEmail,
        notificar_whatsapp_ativo: notificarWhatsapp,
      });
      setConfigTI(updated);
      persistLocalConfigTI(updated);
      applyConfigToFields(updated);
      Alert.alert('Sucesso', 'Configurações de TI salvas com sucesso!');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao salvar configurações.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailDest.trim()) {
      Alert.alert('Atenção', 'Informe um e-mail de destino para o teste.');
      return;
    }
    setTestingEmail(true);
    try {
      const res = await api.testarEmail({
        destinatario: testEmailDest.trim(),
        smtp_host: smtpHost.trim(),
        smtp_port: parseInt(smtpPort, 10) || 587,
        smtp_user: smtpUser.trim(),
        smtp_password: (smtpPass.trim() !== '••••••••' && smtpPass.trim() !== '********') ? smtpPass.trim() : undefined,
        smtp_from: smtpFrom.trim(),
      });
      setTestModalVisible(false);
      Alert.alert(
        res.sucesso ? 'Sucesso!' : 'Falha no Teste',
        res.mensagem || 'Teste concluído.'
      );
    } catch (err: any) {
      Alert.alert('Erro no Teste', err.message || 'Falha na conexão SMTP.');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleSendEmailUsers = async () => {
    if (!emailAssunto.trim() || !emailMensagem.trim()) {
      Alert.alert('Atenção', 'Preencha o assunto e a mensagem do comunicado.');
      return;
    }
    setSendingEmail(true);
    try {
      const res = await api.enviarEmailUsuarios({
        assunto: emailAssunto.trim(),
        mensagem: emailMensagem.trim(),
        smtp_host: smtpHost.trim(),
        smtp_port: parseInt(smtpPort, 10) || 587,
        smtp_user: smtpUser.trim(),
        smtp_password: (smtpPass.trim() !== '••••••••' && smtpPass.trim() !== '********') ? smtpPass.trim() : undefined,
        smtp_from: smtpFrom.trim(),
      });
      setSendEmailModalVisible(false);
      setEmailAssunto('');
      setEmailMensagem('');
      Alert.alert(
        res.sucesso ? 'E-mails Enviados!' : 'Falha no Envio',
        res.mensagem || `Total entregues: ${res.total_enviados}`
      );
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao disparar e-mails.');
    } finally {
      setSendingEmail(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.militar?.nome_guerra && u.militar.nome_guerra.toLowerCase().includes(q)) ||
      (u.militar?.nome_completo && u.militar.nome_completo.toLowerCase().includes(q)) ||
      (u.militar?.saram && u.militar.saram.toString().includes(q))
    );
  });

  const filteredMilitary = militaryList.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.nome_guerra.toLowerCase().includes(q) ||
      m.nome_completo.toLowerCase().includes(q) ||
      m.saram.toString().includes(q) ||
      (m.secao && m.secao.toLowerCase().includes(q))
    );
  });

  const renderUserItem = ({ item }: { item: User }) => {
    const mil = item.militar;
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.userTitleWrap}>
            <Text style={[styles.userName, { color: theme.text }]}>@{item.username}</Text>
            {mil && (
              <Text style={[styles.userMilInfo, { color: theme.textSecondary }]}>
                {mil.posto_graduacao} {mil.nome_guerra} (SARAM {mil.saram})
              </Text>
            )}
          </View>

          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: item.admin ? theme.primary : theme.surfaceVariant,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: item.admin ? '#FFFFFF' : theme.textSecondary },
                ]}
              >
                {item.admin ? 'ADMIN' : 'OPERADOR'}
              </Text>
            </View>

            <View
              style={[
                styles.badge,
                {
                  backgroundColor: item.ativo ? theme.successBg : theme.dangerBg,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: item.ativo ? theme.success : theme.danger },
                ]}
              >
                {item.ativo ? 'ATIVO' : 'INATIVO'}
              </Text>
            </View>
          </View>
        </View>

        {mil?.secao && (
          <View style={styles.footerRow}>
            <Briefcase size={13} color={theme.textMuted} />
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Seção: {mil.secao}
            </Text>
          </View>
        )}

        <View style={[styles.userCardActions, { borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.manageBtn, { backgroundColor: theme.surfaceVariant, flex: 1, marginRight: 8 }]}
            onPress={() => {
              setSelectedUser(item);
              setEditUserVisible(true);
            }}
            activeOpacity={0.7}
          >
            <UserCog size={14} color={theme.primary} />
            <Text style={[styles.manageBtnText, { color: theme.primary }]}>
              Editar Usuário
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMilitaryItem = ({ item }: { item: Military }) => {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.userTitleWrap}>
            <Text style={[styles.userName, { color: theme.text }]}>
              {item.posto_graduacao} {item.nome_guerra}
            </Text>
            <Text style={[styles.userMilInfo, { color: theme.textSecondary }]}>
              {item.nome_completo}
            </Text>
          </View>

          <View style={[styles.saramPill, { backgroundColor: theme.surfaceVariant }]}>
            <Text style={[styles.saramText, { color: theme.textSecondary }]}>
              SARAM {item.saram}
            </Text>
          </View>
        </View>

        <View style={styles.milDetailsWrap}>
          {item.secao && (
            <View style={styles.footerRow}>
              <Briefcase size={13} color={theme.textMuted} />
              <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                Seção: {item.secao}
              </Text>
            </View>
          )}

          {item.celular && (
            <View style={styles.footerRow}>
              <Phone size={13} color={theme.textMuted} />
              <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                {item.celular}
              </Text>
            </View>
          )}

          {item.email && (
            <View style={styles.footerRow}>
              <Mail size={13} color={theme.textMuted} />
              <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                {item.email}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.userCardActions, { borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.manageBtn, { backgroundColor: theme.surfaceVariant, flex: 1 }]}
            onPress={() => {
              setSelectedMilitary(item);
              setEditMilitaryVisible(true);
            }}
            activeOpacity={0.7}
          >
            <UserCog size={14} color={theme.primary} />
            <Text style={[styles.manageBtnText, { color: theme.primary }]}>
              Editar Militar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Painel Admin" subtitle="Gestão de Usuários, Efetivo & TI" showSync={false} />

      {/* Seletor de Abas no Topo */}
      <View style={[styles.tabSelector, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'users' && {
              borderBottomColor: theme.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab('users')}
        >
          <Users size={15} color={activeTab === 'users' ? theme.primary : theme.textMuted} />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'users' ? theme.primary : theme.textMuted,
                fontWeight: activeTab === 'users' ? '700' : '500',
              },
            ]}
          >
            Usuários ({users.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'military' && {
              borderBottomColor: theme.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab('military')}
        >
          <ShieldAlert size={15} color={activeTab === 'military' ? theme.primary : theme.textMuted} />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'military' ? theme.primary : theme.textMuted,
                fontWeight: activeTab === 'military' ? '700' : '500',
              },
            ]}
          >
            Efetivo ({militaryList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === 'config' && {
              borderBottomColor: theme.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setActiveTab('config')}
        >
          <Settings size={15} color={activeTab === 'config' ? theme.primary : theme.textMuted} />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'config' ? theme.primary : theme.textMuted,
                fontWeight: activeTab === 'config' ? '700' : '500',
              },
            ]}
          >
            Configurações TI
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo Aba Configurações TI */}
      {activeTab === 'config' ? (
        <ScrollView
          contentContainerStyle={[
            styles.configScroll,
            { paddingBottom: Math.max(insets.bottom, 16) + 40 },
          ]}
        >
          {/* Card Servidor SMTP */}
          <View style={[styles.configCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.configCardHeader}>
              <Mail size={18} color={theme.primary} />
              <Text style={[styles.configCardTitle, { color: theme.text }]}>Servidor de E-mail (SMTP)</Text>
            </View>

            <View style={{ backgroundColor: theme.primary + '15', padding: 10, borderRadius: 8, marginBottom: 14 }}>
              <Text style={{ fontSize: 11, color: theme.text, lineHeight: 16 }}>
                Configuração Universal: os dados salvos aqui são aplicados centralmente para todas as plataformas (Relatórios Diários 24h, Desktop e Mobile). Para Gmail, utilize uma Senha de Aplicativo de 16 letras gerada na Conta Google.
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Host do Servidor SMTP</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="Ex.: smtp.gmail.com ou mail.fab.mil.br"
                placeholderTextColor={theme.textMuted}
                value={smtpHost}
                onChangeText={setSmtpHost}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Porta</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="587 ou 465"
                  placeholderTextColor={theme.textMuted}
                  value={smtpPort}
                  onChangeText={setSmtpPort}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, { flex: 2 }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>E-mail de Origem (From)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  placeholder="exemplo@gmail.com"
                  placeholderTextColor={theme.textMuted}
                  value={smtpFrom}
                  onChangeText={setSmtpFrom}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Usuário / E-mail de Autenticação</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                placeholder="usuario@gmail.com"
                placeholderTextColor={theme.textMuted}
                value={smtpUser}
                onChangeText={setSmtpUser}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Senha SMTP / Senha de Aplicativo</Text>
                {configTI?.has_smtp_password && (
                  <View style={styles.savedBadge}>
                    <CheckCircle2 size={11} color={theme.success} />
                    <Text style={[styles.savedBadgeText, { color: theme.success }]}>Salva no Servidor</Text>
                  </View>
                )}
              </View>

              <View style={styles.passInputWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text, flex: 1, paddingRight: 40 },
                  ]}
                  placeholder="Senha de app gerada"
                  placeholderTextColor={theme.textMuted}
                  value={smtpPass}
                  onChangeText={setSmtpPass}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff size={16} color={theme.textMuted} /> : <Eye size={16} color={theme.textMuted} />}
                </TouchableOpacity>
              </View>
              {configTI?.has_smtp_password && (
                <Text style={[styles.helperNote, { color: theme.textMuted }]}>
                  Mantenha os pontos para preservar a senha atual cadastrada.
                </Text>
              )}
            </View>

            <View style={styles.emailActionsRow}>
              <TouchableOpacity
                style={[styles.testEmailBtn, { borderColor: theme.primary }]}
                onPress={() => setTestModalVisible(true)}
                activeOpacity={0.8}
              >
                <Send size={14} color={theme.primary} />
                <Text style={[styles.testEmailBtnText, { color: theme.primary }]}>Testar Conexão SMTP</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sendEmailBtn, { backgroundColor: theme.surfaceVariant }]}
                onPress={() => setSendEmailModalVisible(true)}
                activeOpacity={0.8}
              >
                <Mail size={14} color={theme.text} />
                <Text style={[styles.sendEmailBtnText, { color: theme.text }]}>Enviar Comunicado</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Card Notificações */}
          <View style={[styles.configCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.configCardHeader}>
              <ShieldAlert size={18} color={theme.primary} />
              <Text style={[styles.configCardTitle, { color: theme.text }]}>Notificações Automáticas</Text>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchTextWrap}>
                <Text style={[styles.switchTitle, { color: theme.text }]}>Notificações por E-mail</Text>
                <Text style={[styles.switchSubtitle, { color: theme.textMuted }]}>
                  Envia o Relatório Diário e alertas aos chefes da Seção de TI
                </Text>
              </View>
              <Switch
                value={notificarEmail}
                onValueChange={setNotificarEmail}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>
          </View>

          {/* Botão Salvar Configurações */}
          <TouchableOpacity
            style={[styles.saveConfigBtn, { backgroundColor: theme.primary }]}
            onPress={handleSaveConfig}
            disabled={savingConfig}
            activeOpacity={0.8}
          >
            {savingConfig ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Save size={16} color="#FFFFFF" />
                <Text style={styles.saveConfigBtnText}>Salvar Configurações TI</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <>
          {/* Campo de Busca */}
          <View style={styles.searchWrapper}>
            <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <Search size={16} color={theme.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder={
                  activeTab === 'users'
                    ? 'Buscar por usuário, militar, SARAM...'
                    : 'Buscar por nome de guerra, SARAM, seção...'
                }
                placeholderTextColor={theme.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <X size={16} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Barra de Ações: Botão Novo Usuário / Novo Militar */}
          <View style={styles.actionsBar}>
            <Text style={[styles.countLabel, { color: theme.textMuted }]}>
              {activeTab === 'users'
                ? `${filteredUsers.length} usuários cadastrados`
                : `${filteredMilitary.length} militares no efetivo`}
            </Text>

            {activeTab === 'users' ? (
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: theme.primary }]}
                onPress={() => setCreateUserVisible(true)}
                activeOpacity={0.8}
              >
                <UserPlus size={15} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Novo Usuário</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: theme.primary }]}
                onPress={() => setCreateMilitaryVisible(true)}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Cadastrar Militar</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Conteúdo Principal */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Carregando base administrativa...
              </Text>
            </View>
          ) : activeTab === 'users' ? (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderUserItem}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: Math.max(insets.bottom, 16) + 20 + keyboardHeight },
              ]}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Users size={36} color={theme.textMuted} />
                  <Text style={[styles.emptyText, { color: theme.text }]}>Nenhum usuário encontrado</Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={filteredMilitary}
              keyExtractor={(item) => item.saram.toString()}
              renderItem={renderMilitaryItem}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: Math.max(insets.bottom, 16) + 20 + keyboardHeight },
              ]}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <ShieldAlert size={36} color={theme.textMuted} />
                  <Text style={[styles.emptyText, { color: theme.text }]}>Nenhum militar encontrado</Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* Modal de Teste de E-mail */}
      <Modal visible={testModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Testar Servidor SMTP</Text>
            <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
              Digite o e-mail de destino para receber a mensagem de teste.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text, marginTop: 12 }]}
              placeholder="seuemail@fab.mil.br"
              placeholderTextColor={theme.textMuted}
              value={testEmailDest}
              onChangeText={setTestEmailDest}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.border }]}
                onPress={() => setTestModalVisible(false)}
              >
                <Text style={{ color: theme.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: theme.primary }]}
                onPress={handleTestEmail}
                disabled={testingEmail}
              >
                {testingEmail ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Enviar Teste</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Envio de Comunicado */}
      <Modal visible={sendEmailModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Enviar Comunicado por E-mail</Text>
            <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
              Dispara uma mensagem para todos os usuários cadastrados que possuem e-mail válido.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text, marginTop: 12 }]}
              placeholder="Assunto do comunicado *"
              placeholderTextColor={theme.textMuted}
              value={emailAssunto}
              onChangeText={setEmailAssunto}
            />
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text, marginTop: 8, height: 90, textAlignVertical: 'top' },
              ]}
              placeholder="Corpo da mensagem *"
              placeholderTextColor={theme.textMuted}
              value={emailMensagem}
              onChangeText={setEmailMensagem}
              multiline
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.border }]}
                onPress={() => setSendEmailModalVisible(false)}
              >
                <Text style={{ color: theme.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: theme.primary }]}
                onPress={handleSendEmailUsers}
                disabled={sendingEmail}
              >
                {sendingEmail ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Disparar E-mails</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modais de Usuário */}
      <CreateUserModal
        visible={createUserVisible}
        onClose={() => setCreateUserVisible(false)}
        onSuccess={() => loadData()}
        militaryList={militaryList}
      />

      {selectedUser && (
        <EditUserModal
          visible={editUserVisible}
          user={selectedUser}
          onClose={() => {
            setEditUserVisible(false);
            setSelectedUser(null);
          }}
          onSuccess={() => loadData()}
        />
      )}

      {/* Modais de Militar */}
      <CreateMilitaryModal
        visible={createMilitaryVisible}
        onClose={() => setCreateMilitaryVisible(false)}
        onSuccess={() => loadData()}
      />

      {selectedMilitary && (
        <EditMilitaryModal
          visible={editMilitaryVisible}
          military={selectedMilitary}
          onClose={() => {
            setEditMilitaryVisible(false);
            setSelectedMilitary(null);
          }}
          onSuccess={() => loadData()}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabSelector: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabText: {
    fontSize: 13,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  countLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 12,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  userTitleWrap: {
    flex: 1,
    marginRight: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
  },
  userMilInfo: {
    fontSize: 12,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  saramPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  saramText: {
    fontSize: 11,
    fontWeight: '700',
  },
  milDetailsWrap: {
    gap: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
  },
  userCardActions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    marginTop: 2,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 8,
  },
  manageBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
  },
  configScroll: {
    padding: 16,
    gap: 14,
  },
  configCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  configCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  configCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  formGroup: {
    gap: 4,
  },
  formRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  savedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  passInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  helperNote: {
    fontSize: 11,
    marginTop: 2,
  },
  emailActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  testEmailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  testEmailBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sendEmailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  sendEmailBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  switchSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  saveConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  saveConfigBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
