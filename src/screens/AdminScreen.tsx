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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { api } from '../api/client';
import { User, Military } from '../types';
import { Header } from '../components/Header';
import { CreateUserModal } from '../components/CreateUserModal';
import { EditUserModal } from '../components/EditUserModal';
import { CreateMilitaryModal } from '../components/CreateMilitaryModal';
import { EditMilitaryModal } from '../components/EditMilitaryModal';
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
} from 'lucide-react-native';

export const AdminScreen: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { keyboardHeight } = useKeyboardHeight();

  const [activeTab, setActiveTab] = useState<'users' | 'military'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [militaryList, setMilitaryList] = useState<Military[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

  // Modais de Criação e Edição
  const [createUserVisible, setCreateUserVisible] = useState<boolean>(false);
  const [editUserVisible, setEditUserVisible] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [createMilitaryVisible, setCreateMilitaryVisible] = useState<boolean>(false);
  const [editMilitaryVisible, setEditMilitaryVisible] = useState<boolean>(false);
  const [selectedMilitary, setSelectedMilitary] = useState<Military | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [userRes, milRes] = await Promise.all([
        api.listUsers().catch((err) => {
          console.warn('Erro ao listar usuários:', err);
          return [] as User[];
        }),
        api.listMilitary().catch((err) => {
          console.warn('Erro ao listar efetivo:', err);
          return [] as Military[];
        }),
      ]);
      setUsers(userRes);
      setMilitaryList(milRes);
    } catch (err) {
      console.warn('Erro ao carregar dados administrativos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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
      (m.secao && m.secao.toLowerCase().includes(q)) ||
      (m.posto_graduacao && m.posto_graduacao.toLowerCase().includes(q))
    );
  });

  const renderUserItem = ({ item }: { item: User }) => {
    const mil = item.militar;
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
            style={[styles.manageBtn, { backgroundColor: theme.surfaceVariant }]}
            onPress={() => {
              setSelectedUser(item);
              setEditUserVisible(true);
            }}
            activeOpacity={0.7}
          >
            <UserCog size={14} color={theme.primary} />
            <Text style={[styles.manageBtnText, { color: theme.primary }]}>
              Gerenciar Permissões
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMilitaryItem = ({ item }: { item: Military }) => {
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.userTitleWrap}>
            <Text style={[styles.userName, { color: theme.text }]}>
              {item.posto_graduacao} {item.nome_guerra}
            </Text>
            <Text style={[styles.userMilInfo, { color: theme.textSecondary }]}>
              {item.nome_completo}
            </Text>
          </View>

          <View style={[styles.saramPill, { backgroundColor: theme.badgeBg }]}>
            <Text style={[styles.saramText, { color: theme.primary }]}>
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

          {item.email && (
            <View style={styles.footerRow}>
              <Mail size={13} color={theme.textMuted} />
              <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                {item.email}
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
        </View>

        <View style={[styles.userCardActions, { borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.manageBtn, { backgroundColor: theme.surfaceVariant }]}
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
      <Header title="Painel Admin" subtitle="Gestão de Usuários & Efetivo" showSync={false} />

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
          <Users size={16} color={activeTab === 'users' ? theme.primary : theme.textMuted} />
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
          <ShieldAlert size={16} color={activeTab === 'military' ? theme.primary : theme.textMuted} />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'military' ? theme.primary : theme.textMuted,
                fontWeight: activeTab === 'military' ? '700' : '500',
              },
            ]}
          >
            Efetivo Geral ({militaryList.length})
          </Text>
        </TouchableOpacity>
      </View>

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

      {/* Modal de Criação de Usuário */}
      <CreateUserModal
        visible={createUserVisible}
        onClose={() => setCreateUserVisible(false)}
        onSuccess={loadData}
        militaryList={militaryList}
      />

      {/* Modal de Edição de Permissões */}
      <EditUserModal
        user={selectedUser}
        visible={editUserVisible}
        onClose={() => {
          setEditUserVisible(false);
          setSelectedUser(null);
        }}
        onSuccess={loadData}
      />

      {/* Modal de Cadastro de Militar */}
      <CreateMilitaryModal
        visible={createMilitaryVisible}
        onClose={() => setCreateMilitaryVisible(false)}
        onSuccess={loadData}
      />

      {/* Modal de Edição de Militar */}
      <EditMilitaryModal
        military={selectedMilitary}
        visible={editMilitaryVisible}
        onClose={() => {
          setEditMilitaryVisible(false);
          setSelectedMilitary(null);
        }}
        onSuccess={loadData}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabSelector: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  tabText: {
    fontSize: 13,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  countLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
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
    gap: 8,
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
});
