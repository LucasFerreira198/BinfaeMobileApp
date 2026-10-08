import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useDrawer } from '../context/DrawerContext';
import { api } from '../api/client';
import { loadLocalPendencias, persistLocalPendencias, getLocalPendencias } from '../storage/db';
import { Pendencia, PendenciaTipo, PendenciaPrioridade } from '../types';
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Wrench,
  Trash2,
  Calendar,
  UserCheck,
  FileText,
  X,
  Check,
  ChevronRight,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react-native';

export const PendenciasScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { navigateTo } = useDrawer();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'ATIVAS' | 'CONCLUIDAS'>('ATIVAS');
  // 0ms Cache-First: carrega dados locais instantaneamente da memória RAM
  const [pendencias, setPendencias] = useState<Pendencia[]>(() => {
    const all = getLocalPendencias();
    return all.filter((p) => p.status === 'PENDENTE');
  });
  const [loading, setLoading] = useState<boolean>(() => getLocalPendencias().length === 0);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

  // Modais de Ação
  const [modalNovaVisible, setModalNovaVisible] = useState<boolean>(false);
  const [modalConcluirVisible, setModalConcluirVisible] = useState<boolean>(false);
  const [modalBaixaVisible, setModalBaixaVisible] = useState<boolean>(false);
  const [selectedPendencia, setSelectedPendencia] = useState<Pendencia | null>(null);

  // Campos de Criação
  const [novoTitulo, setNovoTitulo] = useState<string>('');
  const [novaDescricao, setNovaDescricao] = useState<string>('');
  const [novoTipo, setNovoTipo] = useState<PendenciaTipo>('GERAL');
  const [novaPrioridade, setNovaPrioridade] = useState<PendenciaPrioridade>('MEDIA');
  const [novoPrazo, setNovoPrazo] = useState<string>('');
  const [novoResponsavelSaram, setNovoResponsavelSaram] = useState<string>('');
  const [savingNova, setSavingNova] = useState<boolean>(false);

  // Campos de Resolução / Baixa
  const [laudoResolucao, setLaudoResolucao] = useState<string>('');
  const [motivoBaixa, setMotivoBaixa] = useState<string>('');
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      const statusQuery = activeTab === 'ATIVAS' ? 'PENDENTE' : 'CONCLUIDA';
      if (pendencias.length === 0) {
        setLoading(true);
      }
      const list = await api.getPendencias(statusQuery);
      persistLocalPendencias(list);
      setPendencias(list);
    } catch (err: any) {
      console.warn('Erro ao carregar pendências:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, pendencias.length]);

  useEffect(() => {
    // Busca do cache persistente de disco se a memória estiver vazia
    loadLocalPendencias().then((all) => {
      if (all && all.length > 0) {
        const expectedStatus = activeTab === 'ATIVAS' ? 'PENDENTE' : 'CONCLUIDA';
        const filtered = all.filter((p) => p.status === expectedStatus);
        if (filtered.length > 0) {
          setPendencias(filtered);
          setLoading(false);
        }
      }
    });
    loadData();
  }, [activeTab, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filtragem local por busca
  const filteredList = pendencias.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.titulo.toLowerCase().includes(q) ||
      (p.descricao && p.descricao.toLowerCase().includes(q)) ||
      (p.item_nome && p.item_nome.toLowerCase().includes(q)) ||
      (p.responsavel_nome && p.responsavel_nome.toLowerCase().includes(q))
    );
  });

  // Criar Nova Pendência
  const handleCriarPendencia = async () => {
    if (!novoTitulo.trim()) {
      Alert.alert('Atenção', 'Informe um título para a pendência ou meta.');
      return;
    }

    setSavingNova(true);
    try {
      await api.createPendencia({
        titulo: novoTitulo.trim(),
        descricao: novaDescricao.trim() || null,
        tipo: novoTipo,
        prioridade: novaPrioridade,
        prazo: novoPrazo.trim() || null,
        responsavel_saram: novoResponsavelSaram.trim() ? parseInt(novoResponsavelSaram.trim()) : null,
      });

      setModalNovaVisible(false);
      setNovoTitulo('');
      setNovaDescricao('');
      setNovoPrazo('');
      setNovoResponsavelSaram('');
      loadData();
      Alert.alert('Sucesso', 'Pendência/Meta cadastrada com sucesso!');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao salvar pendência.');
    } finally {
      setSavingNova(false);
    }
  };

  // Concluir Pendência
  const handleConcluir = async () => {
    if (!selectedPendencia) return;
    setSubmittingAction(true);
    try {
      await api.concluirPendencia(selectedPendencia.id, laudoResolucao.trim());
      setModalConcluirVisible(false);
      setSelectedPendencia(null);
      setLaudoResolucao('');
      loadData();
      Alert.alert(
        'Concluído',
        selectedPendencia.tipo === 'MANUTENCAO'
          ? 'Manutenção finalizada! O computador voltou para o estoque como DISPONÍVEL.'
          : 'Pendência marcada como concluída!'
      );
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao concluir pendência.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Dar Baixa no PC (Perda Total)
  const handleBaixarPC = async () => {
    if (!selectedPendencia) return;
    if (!motivoBaixa.trim()) {
      Alert.alert('Atenção', 'Descreva o motivo técnico ou justificativa da baixa patrimonial.');
      return;
    }

    setSubmittingAction(true);
    try {
      await api.baixarItemManutencao(selectedPendencia.id, motivoBaixa.trim());
      setModalBaixaVisible(false);
      setSelectedPendencia(null);
      setMotivoBaixa('');
      loadData();
      Alert.alert('Baixa Concluída', 'O computador foi dado como BAIXADO definitivamente por perda total/sucata.');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao registrar baixa do equipamento.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const getPrioridadeBadge = (prio: PendenciaPrioridade) => {
    switch (prio) {
      case 'URGENTE':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', label: 'Urgente' };
      case 'ALTA':
        return { bg: 'rgba(249, 115, 22, 0.15)', text: '#F97316', label: 'Alta' };
      case 'MEDIA':
        return { bg: 'rgba(234, 179, 8, 0.15)', text: '#EAB308', label: 'Média' };
      default:
        return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38BDF8', label: 'Baixa' };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={{ padding: 6, marginRight: 8, borderRadius: 8, backgroundColor: theme.surfaceVariant }}
            onPress={() => navigateTo('stock')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={18} color={theme.text} />
          </TouchableOpacity>
          <ListTodo size={22} color={theme.primary} />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Pendências & Metas</Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]} numberOfLines={1}>
              Manutenções e metas operacionais
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btnNovo, { backgroundColor: theme.primary }]}
          onPress={() => setModalNovaVisible(true)}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#000000" />
          <Text style={styles.btnNovoText}>Nova</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ATIVAS' && { borderBottomColor: theme.primary, borderBottomWidth: 3 }]}
          onPress={() => setActiveTab('ATIVAS')}
        >
          <Clock size={16} color={activeTab === 'ATIVAS' ? theme.primary : theme.textMuted} />
          <Text style={[styles.tabText, { color: activeTab === 'ATIVAS' ? theme.primary : theme.textMuted }]}>
            Ativas & Em Aberto
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'CONCLUIDAS' && { borderBottomColor: theme.primary, borderBottomWidth: 3 }]}
          onPress={() => setActiveTab('CONCLUIDAS')}
        >
          <CheckCircle2 size={16} color={activeTab === 'CONCLUIDAS' ? theme.primary : theme.textMuted} />
          <Text style={[styles.tabText, { color: activeTab === 'CONCLUIDAS' ? theme.primary : theme.textMuted }]}>
            Histórico Concluídas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Barra de Pesquisa */}
      <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Search size={18} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Buscar pendência, equipamento ou responsável..."
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

      {/* Lista de Pendências */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Carregando pendências...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 20) + 70 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <CheckCircle2 size={48} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Nenhuma pendência encontrada</Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                {activeTab === 'ATIVAS'
                  ? 'Todas as manutenções e tarefas estão em dia!'
                  : 'Nenhum registro no histórico de concluídas.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const prioBadge = getPrioridadeBadge(item.prioridade);
            const isManutencao = item.tipo === 'MANUTENCAO';

            return (
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {/* Header do Card */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardBadges}>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: isManutencao ? 'rgba(234, 179, 8, 0.2)' : 'rgba(99, 102, 241, 0.15)',
                        },
                      ]}
                    >
                      {isManutencao ? (
                        <Wrench size={13} color="#EAB308" style={{ marginRight: 4 }} />
                      ) : (
                        <FileText size={13} color="#6366F1" style={{ marginRight: 4 }} />
                      )}
                      <Text
                        style={[
                          styles.badgeText,
                          { color: isManutencao ? '#EAB308' : '#818CF8' },
                        ]}
                      >
                        {item.tipo}
                      </Text>
                    </View>

                    <View style={[styles.badge, { backgroundColor: prioBadge.bg, marginLeft: 6 }]}>
                      <Text style={[styles.badgeText, { color: prioBadge.text }]}>{prioBadge.label}</Text>
                    </View>

                    {item.is_baixa_definitiva && (
                      <View style={[styles.badge, { backgroundColor: 'rgba(239, 68, 68, 0.2)', marginLeft: 6 }]}>
                        <Trash2 size={12} color="#EF4444" style={{ marginRight: 4 }} />
                        <Text style={[styles.badgeText, { color: '#EF4444' }]}>Baixa Definitiva</Text>
                      </View>
                    )}
                  </View>

                  {item.prazo && (
                    <View style={styles.prazoRow}>
                      <Calendar size={13} color={theme.textMuted} />
                      <Text style={[styles.prazoText, { color: theme.textMuted }]}>{item.prazo}</Text>
                    </View>
                  )}
                </View>

                {/* Título & Descrição */}
                <Text style={[styles.cardTitle, { color: theme.text }]}>{item.titulo}</Text>

                {item.item_nome && (
                  <View style={[styles.itemRefBox, { backgroundColor: theme.surfaceVariant }]}>
                    <Wrench size={14} color={theme.primary} />
                    <Text style={[styles.itemRefText, { color: theme.text }]} numberOfLines={1}>
                      Equipamento: {item.item_nome} {item.item_codigo ? `(${item.item_codigo})` : ''}
                    </Text>
                  </View>
                )}

                {item.descricao ? (
                  <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{item.descricao}</Text>
                ) : null}

                {/* Rodapé e Responsável */}
                <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
                  <View style={styles.respRow}>
                    <UserCheck size={14} color={theme.textMuted} />
                    <Text style={[styles.respText, { color: theme.textMuted }]}>
                      {item.responsavel_nome ? `Resp: ${item.responsavel_nome}` : 'Sem responsável'}
                    </Text>
                  </View>

                  {/* Ações (se for ativa) */}
                  {item.status === 'PENDENTE' && (
                    <View style={styles.actionButtons}>
                      {isManutencao && (
                        <TouchableOpacity
                          style={[styles.btnAction, { backgroundColor: 'rgba(239, 68, 68, 0.12)', marginRight: 8 }]}
                          onPress={() => {
                            setSelectedPendencia(item);
                            setMotivoBaixa('');
                            setModalBaixaVisible(true);
                          }}
                        >
                          <Trash2 size={14} color="#EF4444" />
                          <Text style={[styles.btnActionText, { color: '#EF4444' }]}>Dar Baixa</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[styles.btnAction, { backgroundColor: theme.primary }]}
                        onPress={() => {
                          setSelectedPendencia(item);
                          setLaudoResolucao('');
                          setModalConcluirVisible(true);
                        }}
                      >
                        <Check size={14} color="#000000" />
                        <Text style={[styles.btnActionText, { color: '#000000', fontWeight: 'bold' }]}>
                          {isManutencao ? 'Concluir Reparo' : 'Concluir'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Informações de Conclusão (se concluída) */}
                  {item.status === 'CONCLUIDA' && (
                    <View style={styles.concluidoInfo}>
                      <Text style={[styles.concluidoText, { color: '#10B981' }]}>
                        ✓ Resolvido em {item.concluido_em ? new Date(item.concluido_em).toLocaleDateString('pt-BR') : ''}
                      </Text>
                      {item.laudo_resolucao ? (
                        <Text style={[styles.laudoText, { color: theme.textSecondary }]} numberOfLines={2}>
                          Laudo: {item.laudo_resolucao}
                        </Text>
                      ) : null}
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* MODAL: NOVA PENDÊNCIA / META */}
      <Modal visible={modalNovaVisible} animationType="slide" transparent onRequestClose={() => setModalNovaVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Nova Pendência / Meta</Text>
              <TouchableOpacity onPress={() => setModalNovaVisible(false)}>
                <X size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Título da Pendência / Meta *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceVariant, color: theme.text, borderColor: theme.border }]}
                placeholder="Ex: Organizar depósito de monitores"
                placeholderTextColor={theme.textMuted}
                value={novoTitulo}
                onChangeText={setNovoTitulo}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Descrição / Escopo</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.surfaceVariant, color: theme.text, borderColor: theme.border, height: 75 },
                ]}
                placeholder="Detalhes do que deve ser executado..."
                placeholderTextColor={theme.textMuted}
                multiline
                value={novaDescricao}
                onChangeText={setNovaDescricao}
              />

              <View style={styles.rowFields}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Tipo</Text>
                  <View style={styles.pillsRow}>
                    {(['GERAL', 'META', 'INVENTARIO'] as PendenciaTipo[]).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.pill,
                          {
                            backgroundColor: novoTipo === t ? theme.primary : theme.surfaceVariant,
                            borderColor: theme.border,
                          },
                        ]}
                        onPress={() => setNovoTipo(t)}
                      >
                        <Text style={[styles.pillText, { color: novoTipo === t ? '#000000' : theme.textSecondary }]}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Prioridade</Text>
                  <View style={styles.pillsRow}>
                    {(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'] as PendenciaPrioridade[]).map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.pill,
                          {
                            backgroundColor: novaPrioridade === p ? theme.primary : theme.surfaceVariant,
                            borderColor: theme.border,
                          },
                        ]}
                        onPress={() => setNovaPrioridade(p)}
                      >
                        <Text
                          style={[styles.pillText, { color: novaPrioridade === p ? '#000000' : theme.textSecondary }]}
                        >
                          {p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Prazo de Conclusão (Opcional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceVariant, color: theme.text, borderColor: theme.border }]}
                placeholder="Ex: 25/10/2026"
                placeholderTextColor={theme.textMuted}
                value={novoPrazo}
                onChangeText={setNovoPrazo}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>SARAM do Militar Responsável (Opcional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceVariant, color: theme.text, borderColor: theme.border }]}
                placeholder="Ex: 7894561"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
                value={novoResponsavelSaram}
                onChangeText={setNovoResponsavelSaram}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.btnModalCancel, { backgroundColor: theme.surfaceVariant }]}
                onPress={() => setModalNovaVisible(false)}
              >
                <Text style={{ color: theme.text }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnModalSave, { backgroundColor: theme.primary }]}
                onPress={handleCriarPendencia}
                disabled={savingNova}
              >
                {savingNova ? (
                  <ActivityIndicator color="#000000" size="small" />
                ) : (
                  <Text style={{ color: '#000000', fontWeight: 'bold' }}>Salvar Pendência</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: CONCLUIR PENDÊNCIA / MANUTENÇÃO */}
      <Modal visible={modalConcluirVisible} animationType="fade" transparent onRequestClose={() => setModalConcluirVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Concluir Pendência</Text>
              <TouchableOpacity onPress={() => setModalConcluirVisible(false)}>
                <X size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              {selectedPendencia?.tipo === 'MANUTENCAO'
                ? `Finalizar manutenção de: "${selectedPendencia?.titulo}". O equipamento voltará automaticamente para o status DISPONÍVEL.`
                : `Marcar a pendência "${selectedPendencia?.titulo}" como resolvida.`}
            </Text>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Laudo Técnico / Resolução</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.surfaceVariant, color: theme.text, borderColor: theme.border, height: 80 },
              ]}
              placeholder="Descreva a solução aplicada, peças trocadas ou testes realizados..."
              placeholderTextColor={theme.textMuted}
              multiline
              value={laudoResolucao}
              onChangeText={setLaudoResolucao}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.btnModalCancel, { backgroundColor: theme.surfaceVariant }]}
                onPress={() => setModalConcluirVisible(false)}
              >
                <Text style={{ color: theme.text }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnModalSave, { backgroundColor: '#10B981' }]}
                onPress={handleConcluir}
                disabled={submittingAction}
              >
                {submittingAction ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Confirmar Conclusão</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: DAR BAIXA DEFINITIVA (PERDA TOTAL) */}
      <Modal visible={modalBaixaVisible} animationType="fade" transparent onRequestClose={() => setModalBaixaVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: '#EF4444' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ShieldAlert size={20} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: '#EF4444' }]}>Dar Baixa no Equipamento</Text>
              </View>
              <TouchableOpacity onPress={() => setModalBaixaVisible(false)}>
                <X size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Esta ação dará <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>BAIXA DEFINITIVA</Text> no patrimônio
              do item "{selectedPendencia?.item_nome}". O item será marcado como sucata/perda total e a pendência encerrada.
            </Text>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Justificativa da Baixa / Sucateamento *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.surfaceVariant, color: theme.text, borderColor: '#EF4444', height: 85 },
              ]}
              placeholder="Ex: Placa-mãe em curto irreparável, custo do reparo inviabiliza recuperação..."
              placeholderTextColor={theme.textMuted}
              multiline
              value={motivoBaixa}
              onChangeText={setMotivoBaixa}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.btnModalCancel, { backgroundColor: theme.surfaceVariant }]}
                onPress={() => setModalBaixaVisible(false)}
              >
                <Text style={{ color: theme.text }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnModalSave, { backgroundColor: '#EF4444' }]}
                onPress={handleBaixarPC}
                disabled={submittingAction}
              >
                {submittingAction ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Dar Baixa Definitiva</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSub: {
    fontSize: 12,
  },
  btnNovo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  btnNovoText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  prazoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  prazoText: {
    fontSize: 11,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  itemRefBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 6,
    gap: 6,
  },
  itemRefText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  respRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  respText: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  btnActionText: {
    fontSize: 12,
  },
  concluidoInfo: {
    alignItems: 'flex-end',
    flex: 1,
    marginLeft: 8,
  },
  concluidoText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  laudoText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  rowFields: {
    flexDirection: 'row',
    marginTop: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  btnModalCancel: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  btnModalSave: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
});
