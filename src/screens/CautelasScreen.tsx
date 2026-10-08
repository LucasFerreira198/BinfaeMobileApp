import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useStock } from '../context/StockContext';
import { Header } from '../components/Header';
import { UserAvatar } from '../components/UserAvatar';
import { api } from '../api/client';
import { loadLocalCautelas, persistLocalCautelas, getLocalCautelas } from '../storage/db';
import { Cautela, CautelaItem, Military, Item } from '../types';
import {
  Rocket,
  Lock,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  Phone,
  QrCode,
  X,
  RotateCcw,
  Package,
  Layers,
  ChevronRight,
  ShieldCheck,
  Check,
  AlertCircle,
} from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { formatDateTime } from '../utils/date';

interface CautelasScreenProps {
  onGoToStock?: () => void;
  onGoToScanner?: () => void;
}

export const CautelasScreen: React.FC<CautelasScreenProps> = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { allItems, syncData, cautelasVersion } = useStock();
  const prevCautelasVersionRef = useRef<number | null>(null);

  // Auto-refresh silencioso instantâneo quando cautelasVersion muda no servidor
  useEffect(() => {
    if (cautelasVersion !== null) {
      if (prevCautelasVersionRef.current !== null && cautelasVersion !== prevCautelasVersionRef.current) {
        prevCautelasVersionRef.current = cautelasVersion;
        api.listCautelas().then((list) => {
          persistLocalCautelas(list);
          setCautelas(list);
        }).catch(() => {});
      } else if (prevCautelasVersionRef.current === null) {
        prevCautelasVersionRef.current = cautelasVersion;
      }
    }
  }, [cautelasVersion]);

  // Abas e Filtros
  const [activeTab, setActiveTab] = useState<'MISSAO' | 'FIXA'>('MISSAO');
  const [statusFilter, setStatusFilter] = useState<'ATIVA' | 'CONCLUIDA'>('ATIVA');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 0ms Cache-First: carrega dados locais instantaneamente da memória RAM
  const [cautelas, setCautelas] = useState<Cautela[]>(() => getLocalCautelas());
  const [isLoading, setIsLoading] = useState<boolean>(() => getLocalCautelas().length === 0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Modais
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [newCautelaNome, setNewCautelaNome] = useState<string>('');
  const [newCautelaObs, setNewCautelaObs] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Modal de Detalhes da Cautela
  const [selectedCautela, setSelectedCautela] = useState<Cautela | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Modal de Adição de Material
  const [addMaterialModalVisible, setAddMaterialModalVisible] = useState<boolean>(false);
  const [militaries, setMilitaries] = useState<Military[]>([]);
  const [selectedMilitary, setSelectedMilitary] = useState<Military | null>(null);
  const [militarySearch, setMilitarySearch] = useState<string>('');
  const [militaryPhone, setMilitaryPhone] = useState<string>('');
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [batchItems, setBatchItems] = useState<Item[]>([]);
  const [selectedSingleItem, setSelectedSingleItem] = useState<Item | null>(null);
  const [itemSearchText, setItemSearchText] = useState<string>('');
  const [isSubmittingCautela, setIsSubmittingCautela] = useState<boolean>(false);

  // Scanner Câmera Modal para Adicionar ou Devolver
  const [cameraModalVisible, setCameraModalVisible] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'ADD' | 'RETURN'>('RETURN');
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedLock, setScannedLock] = useState<boolean>(false);

  // Ações específicas de material (Descautelação Manual ou Câmera Direcionada)
  const [selectedItemForOptions, setSelectedItemForOptions] = useState<CautelaItem | null>(null);
  const [itemOptionsModalVisible, setItemOptionsModalVisible] = useState<boolean>(false);
  const [targetedItemForReturn, setTargetedItemForReturn] = useState<CautelaItem | null>(null);

  const loadCautelas = useCallback(async () => {
    try {
      if (getLocalCautelas().length === 0) {
        setIsLoading(true);
      }
      const list = await api.listCautelas();
      persistLocalCautelas(list);
      setCautelas(list);
    } catch (e: any) {
      console.warn('Erro ao carregar cautelas:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Se o cache de memória ainda não estiver preenchido, busca assincronamente do AsyncStorage
    loadLocalCautelas().then((cached) => {
      if (cached && cached.length > 0) {
        setCautelas(cached);
        setIsLoading(false);
      }
    });
    loadCautelas();
  }, [loadCautelas]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadCautelas();
  };

  const handleCreateCautela = async () => {
    if (!newCautelaNome.trim()) {
      Alert.alert('Atenção', 'Informe o nome da missão ou identificação da cautela fixa.');
      return;
    }

    try {
      setIsCreating(true);
      await api.createCautela({
        nome: newCautelaNome.trim(),
        tipo: activeTab,
        observacoes: newCautelaObs.trim() || undefined,
      });

      setCreateModalVisible(false);
      setNewCautelaNome('');
      setNewCautelaObs('');
      await loadCautelas();
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      Alert.alert('Sucesso', activeTab === 'MISSAO' ? 'Missão criada com sucesso!' : 'Cautela fixa criada com sucesso!');
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Falha ao criar cautela.');
    } finally {
      setIsCreating(false);
    }
  };

  const openCautelaDetails = async (cautela: Cautela) => {
    setSelectedCautela(cautela);
    setDetailModalVisible(true);
    try {
      setIsLoadingDetail(true);
      const fresh = await api.getCautela(cautela.id);
      setSelectedCautela(fresh);
    } catch (_) {
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const refreshSelectedCautela = async (cautelaId: number) => {
    try {
      const fresh = await api.getCautela(cautelaId);
      setSelectedCautela(fresh);
      loadCautelas();
    } catch (_) {}
  };

  // Abrir Modal de Cautelar Materiais
  const openAddMaterialModal = async () => {
    try {
      const mils = await api.listMilitary();
      setMilitaries(mils);
    } catch (_) {}
    setSelectedMilitary(null);
    setMilitarySearch('');
    setMilitaryPhone('');
    setIsBatchMode(false);
    setBatchItems([]);
    setSelectedSingleItem(null);
    setItemSearchText('');
    setAddMaterialModalVisible(true);
  };

  // Ação de Devolver Material Manualmente
  const handleDevolverItem = (item: CautelaItem) => {
    const mil = (item as any).militar_responsavel || item.militar;
    const milName = mil ? `${mil.posto_graduacao || ''} ${mil.nome_guerra || ''}`.trim() : 'Militar';
    Alert.alert(
      'Confirmar Devolução Manual',
      `Deseja registrar a devolução manual do material "${item.item?.nome || 'Item'}" entregue a ${milName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar Devolução',
          style: 'default',
          onPress: async () => {
            if (!selectedCautela) return;
            try {
              await api.devolverItemCautela(selectedCautela.id, item.item_id);
              await syncData();
              await refreshSelectedCautela(selectedCautela.id);
              try {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch {}
              Alert.alert('Sucesso', 'Material devolvido com sucesso!');
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Falha ao devolver material.');
            }
          },
        },
      ]
    );
  };

  // Iniciar scanner de câmera direcionado especificamente a este material
  const startTargetedScanForItem = async (item: CautelaItem) => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Acesso à Câmera', 'É necessário permitir o acesso à câmera para escanear.');
        return;
      }
    }
    setTargetedItemForReturn(item);
    setCameraMode('RETURN');
    setScannedLock(false);
    setCameraModalVisible(true);
  };

  // Scanner Câmera Handler
  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scannedLock) return;
    setScannedLock(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const cleanData = data.trim();
    let searchCode = cleanData;
    try {
      const parsed = JSON.parse(cleanData);
      if (parsed.bmp) searchCode = parsed.bmp.toString();
      else if (parsed.id) searchCode = parsed.id.toString();
      else if (parsed.codigo) searchCode = parsed.codigo.toString();
    } catch {}

    if (cameraMode === 'RETURN') {
      // 1. MODO DIRECIONADO A UM MATERIAL ESPECÍFICO
      if (targetedItemForReturn) {
        const itemObj = targetedItemForReturn.item;
        const validCodes: string[] = [
          targetedItemForReturn.item_id.toString().toLowerCase(),
          targetedItemForReturn.id.toString().toLowerCase(),
        ];
        if (itemObj?.bmp) validCodes.push(itemObj.bmp.trim().toLowerCase());
        if (itemObj?.codigo_interno) validCodes.push(itemObj.codigo_interno.trim().toLowerCase());
        if (itemObj?.numero_serie) validCodes.push(itemObj.numero_serie.trim().toLowerCase());
        if (itemObj?.id) validCodes.push(itemObj.id.toString().toLowerCase());

        const isMatch = validCodes.includes(searchCode.toLowerCase());
        if (!isMatch) {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } catch {}
          Alert.alert(
            'Código Inválido',
            `O código escaneado "${searchCode}" NÃO pertence ao material selecionado "${itemObj?.nome || 'Item'}" (BMP esperado: ${itemObj?.bmp || 'S/N'}).\n\nPor favor, aponte a câmera para a etiqueta correta deste material.`,
            [{ text: 'OK', onPress: () => setScannedLock(false) }]
          );
          return;
        }

        const mil = (targetedItemForReturn as any).militar_responsavel || targetedItemForReturn.militar;
        const milName = mil ? `${mil.posto_graduacao || ''} ${mil.nome_guerra || ''}`.trim() : 'Militar';
        const saram = targetedItemForReturn.militar_saram || mil?.saram;

        Alert.alert(
          'Confirmar Descautelação',
          `Material: ${itemObj?.nome || 'Item'}\n` +
          `Missão: ${selectedCautela?.nome || 'Missão Ativa'}\n` +
          `Responsável: ${milName} (SARAM ${saram || 'N/A'})\n\n` +
          'Deseja descautelar este material agora?',
          [
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => setScannedLock(false),
            },
            {
              text: 'Confirmar Descautelação',
              style: 'default',
              onPress: async () => {
                try {
                  if (selectedCautela) {
                    await api.devolverItemCautela(selectedCautela.id, targetedItemForReturn.item_id);
                    await refreshSelectedCautela(selectedCautela.id);
                  } else {
                    await api.scanDevolverItem(searchCode);
                    await loadCautelas();
                  }
                  await syncData();
                  setCameraModalVisible(false);
                  setTargetedItemForReturn(null);
                  setScannedLock(false);
                  try {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  } catch {}
                  Alert.alert('Sucesso', `Material "${itemObj?.nome || 'Item'}" descautelado com sucesso!`);
                } catch (err: any) {
                  Alert.alert('Erro', err.message || 'Falha ao descautelar material.', [
                    { text: 'OK', onPress: () => setScannedLock(false) },
                  ]);
                }
              },
            },
          ]
        );
        return;
      }

      // 2. MODO GERAL: Lê QR de retorno, identifica cautela ativa e pede confirmação
      try {
        const cautelaStatus = await api.checkItemCautelaStatus(searchCode);
        if (!cautelaStatus || !cautelaStatus.cautelado) {
          Alert.alert(
            'Material Não Cautelado',
            `O material com código "${searchCode}" não está atualmente em nenhuma cautela ativa.`,
            [{ text: 'OK', onPress: () => setScannedLock(false) }]
          );
          return;
        }

        const c = cautelaStatus.cautela;
        const mil = cautelaStatus.militar || c?.militar || (cautelaStatus as any).militar_responsavel;
        const it = cautelaStatus.item;
        const itName = it?.nome || searchCode;
        const missaoNome = c?.nome || (cautelaStatus as any).missao_nome || 'Cautela Ativa';
        const milName = mil ? `${mil.posto_graduacao || ''} ${mil.nome_guerra || ''}`.trim() : 'Militar Responsável';
        const saram = cautelaStatus.militar_saram || mil?.saram;
        const fone = cautelaStatus.telefone_contato || mil?.celular;

        Alert.alert(
          'Confirmar Descautelação',
          `Material Identificado: ${itName}\n` +
          `Missão / Cautela: ${missaoNome}\n` +
          `Responsável: ${milName} (SARAM ${saram || 'N/A'})\n` +
          (fone ? `Contato: ${fone}\n\n` : '\n') +
          'Deseja descautelar este material agora?',
          [
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => setScannedLock(false),
            },
            {
              text: 'Confirmar Descautelação',
              style: 'default',
              onPress: async () => {
                try {
                  const res = await api.scanDevolverItem(searchCode);
                  await syncData();
                  if (selectedCautela) {
                    await refreshSelectedCautela(selectedCautela.id);
                  } else {
                    await loadCautelas();
                  }
                  setCameraModalVisible(false);
                  setScannedLock(false);
                  try {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  } catch {}
                  Alert.alert('Sucesso', `Material "${res.item?.nome || itName}" descautelado com sucesso!`);
                } catch (err: any) {
                  Alert.alert('Erro', err.message || 'Falha ao descautelar material.', [
                    { text: 'OK', onPress: () => setScannedLock(false) },
                  ]);
                }
              },
            },
          ]
        );
      } catch (err: any) {
        Alert.alert(
          'Aviso',
          err.message || 'Material não encontrado em cautelas ativas.',
          [{ text: 'OK', onPress: () => setScannedLock(false) }]
        );
      }
    } else {
      // Modo ADD: localiza o item no estoque e adiciona à seleção
      const found = allItems.find((i) => {
        if (i.status === 'CAUTELADO') return false;
        if (i.bmp && i.bmp.toLowerCase() === searchCode.toLowerCase()) return true;
        if (i.codigo_interno && i.codigo_interno.toLowerCase() === searchCode.toLowerCase()) return true;
        if (i.id.toString() === searchCode) return true;
        return false;
      });

      if (found) {
        if (isBatchMode) {
          if (!batchItems.some((b) => b.id === found.id)) {
            setBatchItems((prev) => [...prev, found]);
          }
        } else {
          setSelectedSingleItem(found);
        }
        setCameraModalVisible(false);
        setScannedLock(false);
      } else {
        Alert.alert(
          'Material Não Encontrado',
          `Nenhum material disponível com o código "${searchCode}".`,
          [{ text: 'OK', onPress: () => setScannedLock(false) }]
        );
      }
    }
  };

  // Submissão do formulário de cautela
  const submitAddMaterials = async () => {
    if (!selectedCautela || !selectedMilitary) {
      Alert.alert('Atenção', 'Selecione o militar responsável pelo material.');
      return;
    }

    const phone = militaryPhone.trim();
    if (!phone) {
      Alert.alert('Telefone Obrigatório', 'Por favor, informe o telefone de contato do militar no canto destacado.');
      return;
    }

    if (!isBatchMode && !selectedSingleItem) {
      Alert.alert('Atenção', 'Escolha ou escaneie o material a ser cautelado.');
      return;
    }

    if (isBatchMode && batchItems.length === 0) {
      Alert.alert('Atenção', 'Adicione pelo menos um material ao lote.');
      return;
    }

    try {
      setIsSubmittingCautela(true);
      if (isBatchMode) {
        await api.addBatchItemsToCautela(selectedCautela.id, {
          militar_saram: selectedMilitary.saram,
          telefone_contato: phone,
          itens_ids: batchItems.map((b) => b.id),
        });
      } else {
        await api.addItemToCautela(selectedCautela.id, {
          militar_saram: selectedMilitary.saram,
          telefone_contato: phone,
          item_id: selectedSingleItem!.id,
        });
      }

      await syncData();
      await refreshSelectedCautela(selectedCautela.id);
      setAddMaterialModalVisible(false);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      Alert.alert('Sucesso', 'Material cautelado com sucesso!');
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Falha ao cautelar material.');
    } finally {
      setIsSubmittingCautela(false);
    }
  };

  // Filtros da lista
  const filteredCautelas = cautelas.filter((c) => {
    if (c.tipo !== activeTab) return false;
    if (c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNome = c.nome.toLowerCase().includes(q);
      const matchCriador = (c.criador?.militar?.nome_guerra || '').toLowerCase().includes(q);
      return matchNome || matchCriador;
    }
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        title="Cautelas"
        subtitle={activeTab === 'MISSAO' ? 'Missões Operacionais' : 'Cautelas Fixas'}
        showSync={false}
      />

      {/* Barra de Ações Superiores: Tabs Principais + Botão Nova */}
      <View style={[styles.topControls, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'MISSAO' && { backgroundColor: theme.badgeBg, borderColor: theme.primary },
            ]}
            onPress={() => setActiveTab('MISSAO')}
            activeOpacity={0.7}
          >
            <Rocket size={16} color={activeTab === 'MISSAO' ? theme.primary : theme.textSecondary} />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'MISSAO' ? theme.primary : theme.textSecondary },
              ]}
            >
              Missões
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'FIXA' && { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#F59E0B' },
            ]}
            onPress={() => setActiveTab('FIXA')}
            activeOpacity={0.7}
          >
            <Lock size={16} color={activeTab === 'FIXA' ? '#F59E0B' : theme.textSecondary} />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'FIXA' ? '#F59E0B' : theme.textSecondary },
              ]}
            >
              Cautelas Fixas
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.cameraActionBtn, { backgroundColor: theme.surfaceVariant }]}
            onPress={async () => {
              if (!permission?.granted) await requestPermission();
              setCameraMode('RETURN');
              setScannedLock(false);
              setCameraModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <QrCode size={16} color={theme.primary} />
            <Text style={[styles.cameraActionText, { color: theme.primary }]}>Descautelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.newBtn,
              { backgroundColor: activeTab === 'MISSAO' ? theme.primary : '#F59E0B' },
            ]}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.newBtnText}>
              {activeTab === 'MISSAO' ? 'Nova Missão' : 'Nova Fixa'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sub-filtro de Status (Ativas / Concluídas) e Busca */}
      <View style={styles.filterSection}>
        <View style={[styles.statusToggleWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[
              styles.statusToggleBtn,
              statusFilter === 'ATIVA' && { backgroundColor: theme.primary },
            ]}
            onPress={() => setStatusFilter('ATIVA')}
          >
            <Text
              style={[
                styles.statusToggleText,
                { color: statusFilter === 'ATIVA' ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              Ativas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.statusToggleBtn,
              statusFilter === 'CONCLUIDA' && { backgroundColor: theme.textSecondary },
            ]}
            onPress={() => setStatusFilter('CONCLUIDA')}
          >
            <Text
              style={[
                styles.statusToggleText,
                { color: statusFilter === 'CONCLUIDA' ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              Concluídas
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Search size={16} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Buscar missão por nome ou militar..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Lista de Cautelas */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Carregando cautelas...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCautelas}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Layers size={48} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {statusFilter === 'ATIVA' ? 'Nenhuma cautela ativa' : 'Nenhuma cautela concluída'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                {statusFilter === 'ATIVA'
                  ? 'Toque no botão "+ Nova" acima para abrir uma missão operacional ou cautela fixa.'
                  : 'Quando todos os materiais de uma missão forem devolvidos, ela aparecerá aqui arquivada.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isConcluded = item.status === 'CONCLUIDA';
            const progress = item.total_itens > 0 ? item.itens_devolvidos / item.total_itens : 0;

            return (
              <TouchableOpacity
                style={[styles.cautelaCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                activeOpacity={0.7}
                onPress={() => openCautelaDetails(item)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleWrap}>
                    <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                      {item.nome}
                    </Text>
                    <Text style={[styles.cardCreator, { color: theme.textSecondary }]}>
                      Aberta por: {item.criador?.militar?.posto_graduacao || ''}{' '}
                      {item.criador?.militar?.nome_guerra || item.criador?.username || 'Oficial'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.cardBadge,
                      {
                        backgroundColor: isConcluded
                          ? 'rgba(100, 116, 139, 0.15)'
                          : 'rgba(16, 185, 129, 0.15)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cardBadgeText,
                        { color: isConcluded ? '#64748B' : theme.success },
                      ]}
                    >
                      {isConcluded ? 'CONCLUÍDA' : 'ATIVA'}
                    </Text>
                  </View>
                </View>

                {/* Datas */}
                <View style={styles.datesRow}>
                  <View style={styles.dateItem}>
                    <Clock size={12} color={theme.textMuted} />
                    <Text style={[styles.dateText, { color: theme.textMuted }]}>
                      Início: {formatDateTime(item.data_inicio)}
                    </Text>
                  </View>
                  {item.data_fim && (
                    <View style={styles.dateItem}>
                      <CheckCircle2 size={12} color={theme.success} />
                      <Text style={[styles.dateText, { color: theme.success }]}>
                        Conclusão: {formatDateTime(item.data_fim)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Barra de Progresso de Devolução */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressLabels}>
                    <Text style={[styles.progressCountText, { color: theme.text }]}>
                      {item.total_itens} materiais • {item.itens_pendentes} pendentes
                    </Text>
                    <Text
                      style={[
                        styles.progressPercentText,
                        { color: isConcluded ? theme.success : theme.primary },
                      ]}
                    >
                      {Math.round(progress * 100)}% devolvido
                    </Text>
                  </View>
                  <View style={[styles.progressBarTrack, { backgroundColor: theme.surfaceVariant }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.round(progress * 100)}%`,
                          backgroundColor: isConcluded ? theme.success : theme.primary,
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={[styles.openDetailText, { color: theme.primary }]}>
                    Ver materiais e gerenciar
                  </Text>
                  <ChevronRight size={14} color={theme.primary} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modal: Nova Missão / Cautela Fixa */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {activeTab === 'MISSAO' ? 'Criar Nova Missão' : 'Criar Cautela Fixa'}
              </Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <X size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
              {activeTab === 'MISSAO'
                ? 'A data e hora de início serão registradas automaticamente agora. Ao devolver todos os materiais, a missão concluirá automaticamente.'
                : 'Defina o nome da cautela fixa para materiais de permanência contínua em locais externos.'}
            </Text>

            <Text style={[styles.inputLabel, { color: theme.text }]}>Nome da Missão / Cautela:</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: theme.surfaceVariant, color: theme.text }]}
              placeholder={activeTab === 'MISSAO' ? 'Ex: Missão Escolta VIP...' : 'Ex: Cautela Posto Médico...'}
              placeholderTextColor={theme.textMuted}
              value={newCautelaNome}
              onChangeText={setNewCautelaNome}
            />

            <Text style={[styles.inputLabel, { color: theme.text }]}>Observações (Opcional):</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: theme.surfaceVariant, color: theme.text, height: 70 }]}
              placeholder="Instruções ou detalhes operacionais..."
              placeholderTextColor={theme.textMuted}
              value={newCautelaObs}
              onChangeText={setNewCautelaObs}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: theme.surfaceVariant }]}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.text }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  { backgroundColor: activeTab === 'MISSAO' ? theme.primary : '#F59E0B' },
                ]}
                onPress={handleCreateCautela}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Criar e Abrir</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: Detalhes da Cautela Selecionada */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.fullModalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {selectedCautela && (
              <>
                {/* Header do Modal de Detalhe */}
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.detailTypeBadge}>
                      <Text style={[styles.detailTypeBadgeText, { color: theme.primary }]}>
                        {selectedCautela.tipo === 'MISSAO' ? 'MISSÃO OPERACIONAL' : 'CAUTELA FIXA'}
                      </Text>
                      <View
                        style={[
                          styles.miniStatus,
                          {
                            backgroundColor:
                              selectedCautela.status === 'CONCLUIDA'
                                ? 'rgba(100,116,139,0.2)'
                                : 'rgba(16,185,129,0.2)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.miniStatusText,
                            {
                              color:
                                selectedCautela.status === 'CONCLUIDA' ? '#64748B' : theme.success,
                            },
                          ]}
                        >
                          {selectedCautela.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.detailModalTitle, { color: theme.text }]}>
                      {selectedCautela.nome}
                    </Text>
                    <Text style={[styles.detailModalSub, { color: theme.textSecondary }]}>
                      Aberta em {formatDateTime(selectedCautela.data_inicio)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                    <X size={22} color={theme.text} />
                  </TouchableOpacity>
                </View>

                {/* Barra de Ações Rápidas dentro da Missão */}
                {selectedCautela.status === 'ATIVA' && (
                  <View style={styles.detailActionsBar}>
                    <TouchableOpacity
                      style={[styles.detailActionBtn, { backgroundColor: theme.primary }]}
                      onPress={openAddMaterialModal}
                    >
                      <Plus size={16} color="#FFFFFF" />
                      <Text style={styles.detailActionBtnText}>Cautelar Material</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.detailActionBtn, { backgroundColor: theme.surfaceVariant }]}
                      onPress={async () => {
                        if (!permission?.granted) await requestPermission();
                        setCameraMode('RETURN');
                        setScannedLock(false);
                        setCameraModalVisible(true);
                      }}
                    >
                      <QrCode size={16} color={theme.primary} />
                      <Text style={[styles.detailActionBtnText, { color: theme.primary }]}>
                        Ler QR Devolução
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Lista de Materiais da Cautela */}
                <Text style={[styles.sectionHeaderTitle, { color: theme.textSecondary }]}>
                  MATERIAIS NA CAUTELA ({selectedCautela.itens?.length || 0})
                </Text>

                {isLoadingDetail ? (
                  <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} />
                ) : (
                  <FlatList
                    data={selectedCautela.itens || []}
                    keyExtractor={(it) => it.id.toString()}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={
                      <View style={styles.emptyDetailList}>
                        <Package size={36} color={theme.textMuted} />
                        <Text style={[styles.emptyDetailText, { color: theme.textMuted }]}>
                          Nenhum material adicionado nesta missão ainda.
                        </Text>
                      </View>
                    }
                    renderItem={({ item }) => {
                      const isEmUso = item.status === 'CAUTELADO' || item.status === 'EM_USO';
                      const mil = (item as any).militar_responsavel || item.militar;
                      const saram = item.militar_saram || mil?.saram || 'N/A';
                      const phone = item.telefone_contato || mil?.celular || mil?.telefone;
                      const milNome = mil
                        ? `${mil.posto_graduacao || ''} ${mil.nome_guerra || ''}`.trim()
                        : 'Militar Responsável';

                      return (
                        <TouchableOpacity
                          style={[
                            styles.materialItemCard,
                            { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
                          ]}
                          activeOpacity={isEmUso ? 0.7 : 1}
                          onPress={() => {
                            if (isEmUso) {
                              setSelectedItemForOptions(item);
                              setItemOptionsModalVisible(true);
                            }
                          }}
                        >
                          <View style={styles.materialItemTop}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.materialItemName, { color: theme.text }]}>
                                {item.item?.nome || `Material #${item.item_id}`}
                              </Text>
                              {item.item?.bmp && (
                                <Text style={[styles.materialItemBmp, { color: theme.primary }]}>
                                  BMP: {item.item.bmp}
                                </Text>
                              )}
                            </View>

                            <View
                              style={[
                                styles.itemStatusPill,
                                {
                                  backgroundColor: isEmUso
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : 'rgba(16, 185, 129, 0.15)',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.itemStatusPillText,
                                  { color: isEmUso ? '#F59E0B' : theme.success },
                                ]}
                              >
                                {isEmUso ? 'EM USO' : 'DEVOLVIDO'}
                              </Text>
                            </View>
                          </View>

                          {/* Dados do Militar Responsável e Telefone em Destaque */}
                          <View style={styles.militarResponsavelRow}>
                            <UserAvatar militar={mil} size={22} />
                            <Text style={[styles.militarText, { color: theme.text }]}>
                              {milNome} (SARAM {saram})
                            </Text>
                          </View>

                          {phone ? (
                            <View style={styles.phoneBadgeRow}>
                              <Phone size={12} color={theme.success} />
                              <Text style={[styles.phoneBadgeText, { color: theme.success }]}>
                                Contato: {phone}
                              </Text>
                            </View>
                          ) : null}

                          {isEmUso && (
                            <TouchableOpacity
                              style={[styles.devolverBtn, { backgroundColor: theme.success }]}
                              onPress={() => {
                                setSelectedItemForOptions(item);
                                setItemOptionsModalVisible(true);
                              }}
                            >
                              <RotateCcw size={14} color="#FFFFFF" />
                              <Text style={styles.devolverBtnText}>Opções de Devolução</Text>
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal: Adicionar Materiais (Fluxo Militar Primeiro -> Checar Telefone -> Escolher Material) */}
      <Modal visible={addMaterialModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.fullModalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Cautelar na Missão</Text>
              <TouchableOpacity onPress={() => setAddMaterialModalVisible(false)}>
                <X size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* PASSO 1: Selecionar Militar Responsável */}
              <Text style={[styles.stepTitle, { color: theme.text }]}>
                1. Militar Responsável (quem pegou emprestado):
              </Text>

              {selectedMilitary ? (
                <View
                  style={[
                    styles.selectedMilitarCard,
                    { backgroundColor: theme.surfaceVariant, borderColor: theme.primary },
                  ]}
                >
                  <UserAvatar militar={selectedMilitary} size={42} showBorder={true} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.selectedMilitarName, { color: theme.text }]}>
                      {selectedMilitary.posto_graduacao} {selectedMilitary.nome_guerra}
                    </Text>
                    <Text style={[styles.selectedMilitarSub, { color: theme.textSecondary }]}>
                      SARAM: {selectedMilitary.saram} • {selectedMilitary.nome_completo}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedMilitary(null)}
                    style={styles.changeMilitarBtn}
                  >
                    <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 12 }}>Trocar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.militarSelectorWrap}>
                  <View
                    style={[styles.militarSearchField, { backgroundColor: theme.surfaceVariant }]}
                  >
                    <Search size={14} color={theme.textMuted} />
                    <TextInput
                      style={[styles.militarInput, { color: theme.text }]}
                      placeholder="Pesquisar militar por guerra, SARAM..."
                      placeholderTextColor={theme.textMuted}
                      value={militarySearch}
                      onChangeText={setMilitarySearch}
                    />
                  </View>

                  <ScrollView style={styles.militaryListMaxHeight} nestedScrollEnabled>
                    {militaries
                      .filter((m) => {
                        if (!militarySearch.trim()) return true;
                        const q = militarySearch.toLowerCase();
                        return (
                          m.nome_guerra.toLowerCase().includes(q) ||
                          m.nome_completo.toLowerCase().includes(q) ||
                          m.saram.toString().includes(q)
                        );
                      })
                      .slice(0, 6)
                      .map((mil) => (
                        <TouchableOpacity
                          key={mil.saram}
                          style={[styles.militarOptionRow, { borderBottomColor: theme.border }]}
                          onPress={() => {
                            setSelectedMilitary(mil);
                            setMilitaryPhone(mil.celular || mil.telefone || '');
                          }}
                        >
                          <UserAvatar militar={mil} size={32} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.militarOptionName, { color: theme.text }]}>
                              {mil.posto_graduacao} {mil.nome_guerra}
                            </Text>
                            <Text style={[styles.militarOptionSaram, { color: theme.textSecondary }]}>
                              SARAM: {mil.saram}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              )}

              {/* TELEFONE DE CONTATO NO CANTO COM DESTAQUE */}
              <View style={[styles.phoneHighlightBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: theme.success }]}>
                <View style={styles.phoneLabelRow}>
                  <Phone size={14} color={theme.success} />
                  <Text style={[styles.phoneHighlightLabel, { color: theme.success }]}>
                    Telefone de Contato (Obrigatório para Cautela):
                  </Text>
                </View>
                <TextInput
                  style={[styles.phoneInputField, { backgroundColor: theme.surfaceVariant, color: theme.text }]}
                  placeholder="Ex: (21) 98765-4321"
                  placeholderTextColor={theme.textMuted}
                  value={militaryPhone}
                  onChangeText={setMilitaryPhone}
                  keyboardType="phone-pad"
                />
                <Text style={[styles.phoneHelpText, { color: theme.textSecondary }]}>
                  Caso o militar tenha mudado de número, ele será atualizado no registro militar.
                </Text>
              </View>

              {/* PASSO 2: Modo Unitário vs Conjunto / Lote */}
              <Text style={[styles.stepTitle, { color: theme.text, marginTop: 16 }]}>
                2. Materiais a Cautelar:
              </Text>

              <View style={styles.modeToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.modeToggleBtn,
                    !isBatchMode && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => setIsBatchMode(false)}
                >
                  <Text style={[styles.modeToggleText, !isBatchMode && { color: '#FFFFFF' }]}>
                    Individual (1 Material)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeToggleBtn,
                    isBatchMode && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => setIsBatchMode(true)}
                >
                  <Text style={[styles.modeToggleText, isBatchMode && { color: '#FFFFFF' }]}>
                    Conjunto / Lote
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Busca / Escaneamento de Materiais */}
              <View style={styles.itemSearchContainer}>
                <View style={[styles.searchItemBar, { backgroundColor: theme.surfaceVariant }]}>
                  <Search size={14} color={theme.textMuted} />
                  <TextInput
                    style={[styles.searchItemInput, { color: theme.text }]}
                    placeholder="Digite BMP, serial ou nome do material..."
                    placeholderTextColor={theme.textMuted}
                    value={itemSearchText}
                    onChangeText={setItemSearchText}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.cameraScanBtn, { backgroundColor: theme.badgeBg }]}
                  onPress={async () => {
                    if (!permission?.granted) await requestPermission();
                    setCameraMode('ADD');
                    setScannedLock(false);
                    setCameraModalVisible(true);
                  }}
                >
                  <QrCode size={18} color={theme.primary} />
                </TouchableOpacity>
              </View>

              {/* Sugestões de materiais disponíveis */}
              {itemSearchText.trim().length > 1 && (
                <View style={styles.suggestionsBox}>
                  {allItems
                    .filter((it) => {
                      if (it.status === 'CAUTELADO') return false;
                      const q = itemSearchText.toLowerCase();
                      return (
                        it.nome.toLowerCase().includes(q) ||
                        (it.bmp && it.bmp.toLowerCase().includes(q)) ||
                        (it.codigo_interno && it.codigo_interno.toLowerCase().includes(q))
                      );
                    })
                    .slice(0, 5)
                    .map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.itemSuggestionRow, { borderBottomColor: theme.border }]}
                        onPress={() => {
                          if (isBatchMode) {
                            if (!batchItems.some((b) => b.id === item.id)) {
                              setBatchItems((prev) => [...prev, item]);
                            }
                          } else {
                            setSelectedSingleItem(item);
                          }
                          setItemSearchText('');
                        }}
                      >
                        <Text style={[styles.itemSugName, { color: theme.text }]}>{item.nome}</Text>
                        <Text style={[styles.itemSugBmp, { color: theme.primary }]}>
                          BMP: {item.bmp || 'S/N'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              )}

              {/* Visualização de Seleção: Unitário vs Lote */}
              {!isBatchMode && selectedSingleItem && (
                <View style={[styles.selectedItemCard, { backgroundColor: theme.surfaceVariant }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.selectedItemCardName, { color: theme.text }]}>
                      {selectedSingleItem.nome}
                    </Text>
                    <Text style={[styles.selectedItemCardBmp, { color: theme.primary }]}>
                      BMP: {selectedSingleItem.bmp || 'S/N'} • Local: {selectedSingleItem.local?.tipo === 'SETOR' ? `Setor: ${selectedSingleItem.local.nome}` : (selectedSingleItem.local?.nome || 'Sem local')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedSingleItem(null)}>
                    <X size={16} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              )}

              {isBatchMode && (
                <View style={styles.batchItemsList}>
                  <Text style={[styles.batchCountText, { color: theme.textSecondary }]}>
                    Materiais no lote ({batchItems.length}):
                  </Text>
                  {batchItems.map((b, idx) => (
                    <View
                      key={b.id}
                      style={[styles.batchItemChip, { backgroundColor: theme.surfaceVariant }]}
                    >
                      <Text style={[styles.batchChipText, { color: theme.text }]}>
                        {b.nome} (BMP {b.bmp || 'S/N'})
                      </Text>
                      <TouchableOpacity
                        onPress={() => setBatchItems((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <X size={14} color={theme.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.modalButtonsBottom}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: theme.surfaceVariant }]}
                  onPress={() => setAddMaterialModalVisible(false)}
                >
                  <Text style={[styles.modalCancelText, { color: theme.text }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalConfirmBtn, { backgroundColor: theme.primary }]}
                  onPress={submitAddMaterials}
                  disabled={isSubmittingCautela}
                >
                  {isSubmittingCautela ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Confirmar Cautela</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: Opções do Material Selecionado (Descautelação Manual ou Câmera Específica) */}
      <Modal visible={itemOptionsModalVisible} animationType="slide" transparent>
        <View style={styles.optionsModalOverlay}>
          <View style={[styles.optionsModalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {selectedItemForOptions && (
              <>
                <View style={styles.optionsModalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionsModalTitle, { color: theme.text }]}>
                      {selectedItemForOptions.item?.nome || `Material #${selectedItemForOptions.item_id}`}
                    </Text>
                    <Text style={[styles.optionsModalSubtitle, { color: theme.textSecondary }]}>
                      {selectedItemForOptions.item?.bmp ? `BMP ${selectedItemForOptions.item.bmp} • ` : ''}
                      Responsável: {
                        ((selectedItemForOptions as any).militar_responsavel || selectedItemForOptions.militar)?.nome_guerra ||
                        'Militar'
                      }
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setItemOptionsModalVisible(false)}>
                    <X size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Opção 1: Câmera Direcionada */}
                <TouchableOpacity
                  style={[
                    styles.optionsButtonRow,
                    { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    const item = selectedItemForOptions;
                    setItemOptionsModalVisible(false);
                    startTargetedScanForItem(item);
                  }}
                >
                  <View style={[styles.optionIconCircle, { backgroundColor: theme.badgeBg }]}>
                    <QrCode size={20} color={theme.primary} />
                  </View>
                  <View style={styles.optionsButtonTextWrap}>
                    <Text style={[styles.optionsButtonTitle, { color: theme.text }]}>
                      Escanear QR Code deste Material
                    </Text>
                    <Text style={[styles.optionsButtonDesc, { color: theme.textSecondary }]}>
                      Lê a câmera exclusivamente para este item. Rejeita se outro QR for lido.
                    </Text>
                  </View>
                  <ChevronRight size={16} color={theme.textSecondary} />
                </TouchableOpacity>

                {/* Opção 2: Descautelar Manualmente */}
                <TouchableOpacity
                  style={[
                    styles.optionsButtonRow,
                    { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    const item = selectedItemForOptions;
                    setItemOptionsModalVisible(false);
                    handleDevolverItem(item);
                  }}
                >
                  <View style={[styles.optionIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <RotateCcw size={20} color={theme.success} />
                  </View>
                  <View style={styles.optionsButtonTextWrap}>
                    <Text style={[styles.optionsButtonTitle, { color: theme.text }]}>
                      Descautelar Manualmente
                    </Text>
                    <Text style={[styles.optionsButtonDesc, { color: theme.textSecondary }]}>
                      Confirma a devolução e retorno do material sem precisar usar a câmera.
                    </Text>
                  </View>
                  <ChevronRight size={16} color={theme.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionsModalCloseBtn, { backgroundColor: theme.surfaceVariant }]}
                  onPress={() => setItemOptionsModalVisible(false)}
                >
                  <Text style={[styles.optionsModalCloseText, { color: theme.text }]}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal: Scanner Câmera (Para Descautelar ou Ler Código) */}
      <Modal visible={cameraModalVisible} animationType="fade" transparent>
        <View style={styles.cameraOverlay}>
          <View style={styles.cameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{
                barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'pdf417'],
              }}
              onBarcodeScanned={scannedLock ? undefined : handleBarcodeScanned}
            />

            <View style={styles.cameraTopHeader}>
              <Text style={styles.cameraTitle}>
                {targetedItemForReturn
                  ? `Escanear: ${targetedItemForReturn.item?.nome || 'Material'}`
                  : cameraMode === 'RETURN'
                  ? 'Aponte para o QR Code para Descautelar'
                  : 'Aponte para o QR Code do Material'}
              </Text>
              <TouchableOpacity
                style={styles.cameraCloseBtn}
                onPress={() => {
                  setCameraModalVisible(false);
                  setTargetedItemForReturn(null);
                  setScannedLock(false);
                }}
              >
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.cameraTargetBox} />

            <View style={styles.cameraFooter}>
              <Text style={styles.cameraHelpText}>
                {targetedItemForReturn
                  ? `Apenas a etiqueta ou QR deste material (BMP: ${targetedItemForReturn.item?.bmp || 'S/N'}) será aceita.`
                  : cameraMode === 'RETURN'
                  ? 'O sistema identificará a missão e solicitará confirmação antes de descautelar.'
                  : 'O material será adicionado à cautela em andamento.'}
              </Text>
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
  topControls: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cameraActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cameraActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  newBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  newBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  filterSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    alignItems: 'center',
  },
  statusToggleWrap: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  statusToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 10,
    height: 38,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  cautelaCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleWrap: {
    flex: 1,
    paddingRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardCreator: {
    fontSize: 12,
    marginTop: 2,
  },
  cardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  datesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
  },
  progressContainer: {
    gap: 6,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressCountText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  progressPercentText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  openDetailText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  fullModalContent: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalDesc: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  inputField: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButtonsBottom: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  detailTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailTypeBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  miniStatus: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  detailModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  detailModalSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  detailActionsBar: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 12,
  },
  detailActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  detailActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginVertical: 8,
  },
  emptyDetailList: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyDetailText: {
    fontSize: 12,
    textAlign: 'center',
  },
  materialItemCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 6,
  },
  materialItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  materialItemName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  materialItemBmp: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  itemStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  militarResponsavelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  militarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  phoneBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phoneBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  devolverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  devolverBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginVertical: 6,
  },
  selectedMilitarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  selectedMilitarName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  selectedMilitarSub: {
    fontSize: 11,
    marginTop: 2,
  },
  changeMilitarBtn: {
    padding: 6,
  },
  militarSelectorWrap: {
    gap: 8,
  },
  militarSearchField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
    height: 36,
    gap: 6,
  },
  militarInput: {
    flex: 1,
    fontSize: 12,
  },
  militaryListMaxHeight: {
    maxHeight: 120,
  },
  militarOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  militarOptionName: {
    fontSize: 12,
    fontWeight: '700',
  },
  militarOptionSaram: {
    fontSize: 11,
  },
  phoneHighlightBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  phoneLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phoneHighlightLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  phoneInputField: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  phoneHelpText: {
    fontSize: 10,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 6,
  },
  modeToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(100,116,139,0.15)',
  },
  modeToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  itemSearchContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  searchItemBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
    height: 40,
    gap: 6,
  },
  searchItemInput: {
    flex: 1,
    fontSize: 12,
  },
  cameraScanBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsBox: {
    marginTop: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#94A3B8',
    paddingHorizontal: 8,
  },
  itemSuggestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemSugName: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemSugBmp: {
    fontSize: 11,
    fontWeight: '700',
  },
  selectedItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  selectedItemCardName: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectedItemCardBmp: {
    fontSize: 11,
    marginTop: 2,
  },
  batchItemsList: {
    marginTop: 8,
    gap: 4,
  },
  batchCountText: {
    fontSize: 11,
    fontWeight: '600',
  },
  batchItemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  batchChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  cameraTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  cameraTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  cameraCloseBtn: {
    padding: 8,
  },
  cameraTargetBox: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: '#38BDF8',
    borderRadius: 16,
    alignSelf: 'center',
  },
  cameraFooter: {
    alignItems: 'center',
    marginBottom: 30,
  },
  cameraHelpText: {
    color: '#E2E8F0',
    fontSize: 12,
    textAlign: 'center',
  },
  optionsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  optionsModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  optionsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  optionsModalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  optionsModalSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  optionsButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  optionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsButtonTextWrap: {
    flex: 1,
  },
  optionsButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionsButtonDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  optionsModalCloseBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  optionsModalCloseText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
