import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  BackHandler,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useStock } from '../context/StockContext';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { Location } from '../types';
import { formatLocationFriendlyName, getDescendantLocationIds } from '../storage/db';
import { ErrorBoundary } from './ErrorBoundary';
import {
  X,
  MapPin,
  Search,
  ChevronRight,
  Package,
  Check,
  ArrowLeft,
  FolderTree,
  CornerDownRight,
  Filter,
  Plus,
  Pencil,
  Layers,
} from 'lucide-react-native';

const LOCATION_TYPES = [
  { value: 'DEPOSITO', label: 'Depósito' },
  { value: 'ARMARIO', label: 'Armário' },
  { value: 'PRATELEIRA', label: 'Prateleira' },
  { value: 'GAVETA', label: 'Gaveta' },
  { value: 'SALA', label: 'Sala' },
  { value: 'BANCADA', label: 'Bancada' },
  { value: 'SETOR', label: 'Setor' },
];

interface LocationsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation?: (locationId: number | null) => void;
}

const LocationsModalContent: React.FC<LocationsModalProps> = ({
  visible,
  onClose,
  onSelectLocation,
}) => {
  const { theme } = useTheme();
  const { locations, allItems, filters, setLocationFilter, createLocation, updateLocation } = useStock();
  const insets = useSafeAreaInsets();
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();
  const { height: screenHeight } = useWindowDimensions();

  const [search, setSearch] = useState<string>('');
  const [currentParentId, setCurrentParentId] = useState<number | null>(null);
  const [historyStack, setHistoryStack] = useState<number[]>([]);

  // Estado para Criar / Editar Local
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formNome, setFormNome] = useState<string>('');
  const [formTipo, setFormTipo] = useState<string>('DEPOSITO');
  const [formDescricao, setFormDescricao] = useState<string>('');
  const [formParentId, setFormParentId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Reseta a navegação ao abrir o modal
  useEffect(() => {
    if (visible) {
      setSearch('');
      setCurrentParentId(null);
      setHistoryStack([]);
      setIsFormOpen(false);
      setEditingLocation(null);
    }
  }, [visible]);

  // Gerenciamento do botão voltar físico do Android
  useEffect(() => {
    if (!visible) return;

    const backAction = () => {
      if (isFormOpen) {
        setIsFormOpen(false);
        return true;
      }

      if (search.trim().length > 0) {
        setSearch('');
        return true;
      }

      if (historyStack.length > 0) {
        handleGoBackOneLevel();
        return true;
      }

      onClose();
      return true;
    };

    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [visible, onClose, historyStack, search, isFormOpen]);

  const handleGoBackOneLevel = () => {
    setHistoryStack((prev) => {
      const nextStack = [...prev];
      nextStack.pop();
      const previousParent = nextStack.length > 0 ? nextStack[nextStack.length - 1] : null;
      setCurrentParentId(previousParent);
      return nextStack;
    });
  };

  const handleNavigateToChild = (locId: number) => {
    setHistoryStack((prev) => [...prev, locId]);
    setCurrentParentId(locId);
  };

  const handleSelect = (locId: number | null) => {
    setLocationFilter(locId);
    if (onSelectLocation) onSelectLocation(locId);
    onClose();
  };

  // Abrir formulário para criar
  const handleOpenCreate = () => {
    setEditingLocation(null);
    setFormNome('');
    setFormTipo(currentParentId ? 'ARMARIO' : 'DEPOSITO');
    setFormDescricao('');
    setFormParentId(currentParentId);
    setIsFormOpen(true);
  };

  // Abrir formulário para editar
  const handleOpenEdit = (loc: Location) => {
    setEditingLocation(loc);
    setFormNome(loc.nome);
    setFormTipo(loc.tipo || 'DEPOSITO');
    setFormDescricao(loc.descricao || '');
    setFormParentId(loc.parent_id ?? null);
    setIsFormOpen(true);
  };

  // Salvar criação ou edição
  const handleSaveLocation = async () => {
    if (!formNome.trim()) {
      Alert.alert('Nome obrigatório', 'Informe o nome do local físico.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingLocation) {
        await updateLocation(editingLocation.id, {
          nome: formNome.trim(),
          tipo: formTipo,
          descricao: formDescricao.trim() || undefined,
          parent_id: formParentId,
        });
        Alert.alert('Sucesso', 'Local físico atualizado com sucesso!');
      } else {
        await createLocation({
          nome: formNome.trim(),
          tipo: formTipo,
          descricao: formDescricao.trim() || undefined,
          parent_id: formParentId,
        });
        Alert.alert('Sucesso', 'Novo local físico cadastrado com sucesso!');
      }
      setIsFormOpen(false);
    } catch (err: any) {
      Alert.alert('Erro ao salvar local', err.message || 'Não foi possível salvar o local físico.');
    } finally {
      setIsSaving(false);
    }
  };

  // Contagem de itens no local e em todas as suas ramificações
  const getItemCount = (locationId: number) => {
    const descendantIds = getDescendantLocationIds(locationId, locations);
    return allItems.filter((i) => i.local_id && descendantIds.has(i.local_id)).length;
  };

  // Identifica o local atual ativo no drill-down
  const currentLocation = currentParentId !== null ? locations.find((l) => l.id === currentParentId) : null;

  // Filhos do local atual (ou raízes se currentParentId for null)
  const currentLevelLocations = locations.filter((loc) => {
    if (currentParentId === null) {
      return loc.parent_id === null || !loc.parent_id || !locations.some((p) => p.id === loc.parent_id);
    }
    return loc.parent_id === currentParentId;
  });

  // Busca global quando o usuário digita na barra de pesquisa
  const searchResults = locations.filter((loc) => {
    if (!search.trim()) return false;
    const q = search.toLowerCase();
    const friendlyPath = (formatLocationFriendlyName(loc, locations) || '').toLowerCase();
    return (
      (loc.nome || '').toLowerCase().includes(q) ||
      friendlyPath.includes(q) ||
      (loc.caminho_completo && loc.caminho_completo.toLowerCase().includes(q))
    );
  });

  // Locais disponíveis para serem selecionados como pai (evitando ciclos)
  const availableParents = useMemo(() => {
    if (!editingLocation) return locations;
    const descendantIds = getDescendantLocationIds(editingLocation.id, locations);
    return locations.filter((l) => l.id !== editingLocation.id && !descendantIds.has(l.id));
  }, [locations, editingLocation]);

  // Renderização de cada card da árvore
  const renderLocationCard = ({ item }: { item: Location }) => {
    const isSelected = filters.locationId === item.id;
    const sublocations = locations.filter((l) => l.parent_id === item.id);
    const hasChildren = sublocations.length > 0;
    const totalItems = getItemCount(item.id);

    return (
      <View
        style={[
          styles.locCard,
          {
            backgroundColor: theme.card,
            borderColor: isSelected ? theme.primary : theme.border,
            borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.cardMainClickable}
          onPress={() => {
            if (hasChildren) {
              handleNavigateToChild(item.id);
            } else {
              handleSelect(isSelected ? null : item.id);
            }
          }}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: isSelected
                  ? theme.primary
                  : hasChildren
                  ? theme.surfaceVariant
                  : theme.badgeBg,
              },
            ]}
          >
            {hasChildren ? (
              <FolderTree size={18} color={isSelected ? '#FFFFFF' : theme.primary} />
            ) : (
              <MapPin size={18} color={isSelected ? '#FFFFFF' : theme.primary} />
            )}
          </View>

          <View style={styles.infoWrap}>
            <Text style={[styles.locName, { color: theme.text }]}>{item.nome}</Text>
            <Text style={[styles.locSub, { color: theme.textSecondary }]} numberOfLines={1}>
              {hasChildren
                ? `${sublocations.length} ramificações internas`
                : formatLocationFriendlyName(item, locations)}
            </Text>
          </View>

          <View style={styles.rightSide}>
            {/* Botão de Editar Local */}
            <TouchableOpacity
              style={[styles.actionIconBtn, { backgroundColor: theme.surfaceVariant }]}
              onPress={(e) => {
                e.stopPropagation();
                handleOpenEdit(item);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={`Editar ${item.nome}`}
            >
              <Pencil size={13} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.countBadge, { backgroundColor: theme.surfaceVariant }]}>
              <Package size={12} color={theme.textMuted} />
              <Text style={[styles.countText, { color: theme.text }]}>{totalItems}</Text>
            </View>

            {hasChildren ? (
              <ChevronRight size={18} color={theme.textMuted} />
            ) : isSelected ? (
              <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
                <Check size={12} color="#FFFFFF" />
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        {/* Botão de Filtrar diretamente aqui se o item tiver filhos */}
        {hasChildren && (
          <View style={[styles.cardActionRow, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[
                styles.filterDirectBtn,
                {
                  backgroundColor: isSelected ? theme.primary : theme.surfaceVariant,
                },
              ]}
              onPress={() => handleSelect(isSelected ? null : item.id)}
            >
              <Filter size={13} color={isSelected ? '#FFFFFF' : theme.primary} />
              <Text
                style={[
                  styles.filterDirectText,
                  { color: isSelected ? '#FFFFFF' : theme.primary },
                ]}
              >
                {isSelected ? 'Filtrando por este local' : 'Filtrar por este depósito'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Renderização de resultado de busca global
  const renderSearchResultCard = ({ item }: { item: Location }) => {
    const isSelected = filters.locationId === item.id;
    const fullPath = formatLocationFriendlyName(item, locations);
    const count = getItemCount(item.id);

    return (
      <View
        style={[
          styles.locCard,
          {
            backgroundColor: theme.card,
            borderColor: isSelected ? theme.primary : theme.border,
            borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.cardMainClickable}
          onPress={() => handleSelect(isSelected ? null : item.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrap, { backgroundColor: isSelected ? theme.primary : theme.badgeBg }]}>
            <MapPin size={18} color={isSelected ? '#FFFFFF' : theme.primary} />
          </View>

          <View style={styles.infoWrap}>
            <Text style={[styles.locName, { color: theme.text }]}>{item.nome}</Text>
            <Text style={[styles.locSub, { color: theme.textSecondary }]} numberOfLines={2}>
              {fullPath}
            </Text>
          </View>

          <View style={styles.rightSide}>
            {/* Botão de Editar Local */}
            <TouchableOpacity
              style={[styles.actionIconBtn, { backgroundColor: theme.surfaceVariant }]}
              onPress={(e) => {
                e.stopPropagation();
                handleOpenEdit(item);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={`Editar ${item.nome}`}
            >
              <Pencil size={13} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.countBadge, { backgroundColor: theme.surfaceVariant }]}>
              <Package size={12} color={theme.textMuted} />
              <Text style={[styles.countText, { color: theme.text }]}>{count}</Text>
            </View>

            {isSelected && (
              <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
                <Check size={12} color="#FFFFFF" />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View
        style={[
          styles.backdrop,
          {
            paddingBottom: keyboardHeight,
          },
        ]}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              maxHeight: isKeyboardVisible
                ? Math.max(280, screenHeight - keyboardHeight - (insets.top || 24) - 10)
                : '90%',
            },
          ]}
        >
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.headerIconWrap, { backgroundColor: theme.badgeBg }]}>
                <MapPin size={20} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.text }]}>Locais Físicos</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  {locations.length} depósitos, armários e prateleiras
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleOpenCreate}
                style={[styles.addBtn, { backgroundColor: theme.primary }]}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Novo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: theme.surfaceVariant }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Barra de Busca Rápida */}
          <View style={styles.searchWrapper}>
            <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <Search size={16} color={theme.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Buscar depósito, prateleira, armário..."
                placeholderTextColor={theme.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <X size={14} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Banner de Filtro Ativo */}
          {filters.locationId !== null && (
            <View style={[styles.activeFilterBanner, { backgroundColor: theme.badgeBg, borderColor: theme.primary }]}>
              <View style={styles.activeFilterLeft}>
                <MapPin size={15} color={theme.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.activeFilterLabel, { color: theme.textMuted }]}>
                    Filtro de Local Ativo:
                  </Text>
                  <Text style={[styles.activeFilterValue, { color: theme.primary }]} numberOfLines={1}>
                    {locations.find((l) => l.id === filters.locationId)?.nome || 'Local selecionado'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setLocationFilter(null)}
                style={[styles.clearFilterBtn, { backgroundColor: theme.surfaceVariant }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={13} color={theme.text} />
                <Text style={[styles.clearFilterText, { color: theme.text }]}>Remover Filtro</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Barra de Navegação Hierárquica (Breadcrumb / Voltar) */}
          {currentParentId !== null && search.trim().length === 0 && (
            <View style={[styles.breadcrumbBar, { borderBottomColor: theme.border, backgroundColor: theme.surfaceVariant }]}>
              <TouchableOpacity
                onPress={handleGoBackOneLevel}
                style={[styles.backLevelBtn, { backgroundColor: theme.card }]}
                activeOpacity={0.7}
              >
                <ArrowLeft size={16} color={theme.primary} />
                <Text style={[styles.backLevelText, { color: theme.primary }]}>Voltar nível</Text>
              </TouchableOpacity>

              <View style={styles.currentLocIndicator}>
                <CornerDownRight size={15} color={theme.textMuted} />
                <Text style={[styles.currentLocTitle, { color: theme.text }]} numberOfLines={1}>
                  {currentLocation?.nome || 'Local atual'}
                </Text>
              </View>

              {currentLocation && (
                <TouchableOpacity
                  style={[
                    styles.selectCurrentLocBtn,
                    {
                      backgroundColor:
                        filters.locationId === currentLocation.id ? theme.primary : theme.badgeBg,
                    },
                  ]}
                  onPress={() => handleSelect(filters.locationId === currentLocation.id ? null : currentLocation.id)}
                >
                  <Check
                    size={14}
                    color={filters.locationId === currentLocation.id ? '#FFFFFF' : theme.primary}
                  />
                  <Text
                    style={[
                      styles.selectCurrentLocText,
                      {
                        color:
                          filters.locationId === currentLocation.id ? '#FFFFFF' : theme.primary,
                      },
                    ]}
                  >
                    {filters.locationId === currentLocation.id ? 'Selecionado' : 'Filtrar aqui'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Lista de Locais: Hierárquica ou Resultado de Busca */}
          {search.trim().length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => `search-${item.id}`}
              renderItem={renderSearchResultCard}
              contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <MapPin size={36} color={theme.textMuted} />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>Nenhum local encontrado</Text>
                  <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                    Nenhum depósito ou prateleira corresponde à busca "{search}".
                  </Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={currentLevelLocations}
              keyExtractor={(item) => `tree-${item.id}`}
              renderItem={renderLocationCard}
              contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                currentParentId === null ? (
                  <Text style={[styles.sectionHint, { color: theme.textMuted }]}>
                    Selecione um depósito para ver as ramificações internas (armários, prateleiras):
                  </Text>
                ) : (
                  <Text style={[styles.sectionHint, { color: theme.textMuted }]}>
                    Ramificações dentro de "{currentLocation?.nome}":
                  </Text>
                )
              }
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Package size={36} color={theme.textMuted} />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>Sem mais ramificações</Text>
                  <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                    Não há outros sublocais dentro de "{currentLocation?.nome}".
                  </Text>
                  <TouchableOpacity
                    style={[styles.selectThisEmptyBtn, { backgroundColor: theme.primary }]}
                    onPress={() => currentLocation && handleSelect(currentLocation.id)}
                  >
                    <Text style={styles.selectThisEmptyText}>
                      Filtrar por "{currentLocation?.nome}"
                    </Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}

          {/* Formulário de Adicionar / Editar Local Sobreposto na Sheet */}
          {isFormOpen && (
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.formOverlay,
                { backgroundColor: theme.surface },
              ]}
            >
              <View style={[styles.formHeader, { borderBottomColor: theme.border }]}>
                <View style={styles.formHeaderLeft}>
                  <View style={[styles.headerIconWrap, { backgroundColor: theme.badgeBg }]}>
                    <MapPin size={20} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: theme.text }]}>
                      {editingLocation ? 'Editar Local Físico' : 'Novo Local Físico'}
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                      {editingLocation
                        ? `Atualizando "${editingLocation.nome}"`
                        : currentParentId
                        ? `Criando dentro de "${currentLocation?.nome}"`
                        : 'Cadastrar depósito principal'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setIsFormOpen(false)}
                  style={[styles.closeBtn, { backgroundColor: theme.surfaceVariant }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={18} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.formBody}
                contentContainerStyle={styles.formContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Nome do Local */}
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Nome do Local *
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.inputBorder,
                      color: theme.text,
                    },
                  ]}
                  placeholder="Ex: Depósito A, Armário 1, Prateleira 2"
                  placeholderTextColor={theme.textMuted}
                  value={formNome}
                  onChangeText={setFormNome}
                />

                {/* Tipo de Local (Pills) */}
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Tipo de Estrutura
                </Text>
                <View style={styles.pillsRow}>
                  {LOCATION_TYPES.map((t) => {
                    const isSelected = formTipo === t.value;
                    return (
                      <TouchableOpacity
                        key={t.value}
                        style={[
                          styles.typePill,
                          {
                            backgroundColor: isSelected ? theme.primary : theme.surfaceVariant,
                            borderColor: isSelected ? theme.primary : theme.border,
                          },
                        ]}
                        onPress={() => setFormTipo(t.value)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.typePillText,
                            {
                              color: isSelected ? '#FFFFFF' : theme.textSecondary,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Local Superior / Pai (Hierarquia) */}
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Local Superior (Hierarquia)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.parentsScroll}>
                  <TouchableOpacity
                    style={[
                      styles.parentPill,
                      {
                        backgroundColor: formParentId === null ? theme.badgeBg : theme.surfaceVariant,
                        borderColor: formParentId === null ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setFormParentId(null)}
                    activeOpacity={0.7}
                  >
                    <FolderTree
                      size={14}
                      color={formParentId === null ? theme.primary : theme.textMuted}
                    />
                    <Text
                      style={[
                        styles.parentPillText,
                        {
                          color: formParentId === null ? theme.primary : theme.textSecondary,
                          fontWeight: formParentId === null ? '700' : '500',
                        },
                      ]}
                    >
                      Raiz (Depósito Principal)
                    </Text>
                  </TouchableOpacity>

                  {availableParents.map((p) => {
                    const isSelected = formParentId === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.parentPill,
                          {
                            backgroundColor: isSelected ? theme.badgeBg : theme.surfaceVariant,
                            borderColor: isSelected ? theme.primary : theme.border,
                          },
                        ]}
                        onPress={() => setFormParentId(p.id)}
                        activeOpacity={0.7}
                      >
                        <MapPin
                          size={14}
                          color={isSelected ? theme.primary : theme.textMuted}
                        />
                        <Text
                          style={[
                            styles.parentPillText,
                            {
                              color: isSelected ? theme.primary : theme.textSecondary,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                        >
                          {p.nome}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Descrição Opcional */}
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Descrição / Observações (Opcional)
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.textArea,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.inputBorder,
                      color: theme.text,
                    },
                  ]}
                  placeholder="Informações adicionais sobre o local ou acesso..."
                  placeholderTextColor={theme.textMuted}
                  value={formDescricao}
                  onChangeText={setFormDescricao}
                  multiline
                  numberOfLines={3}
                />
              </ScrollView>

              {/* Rodapé do Formulário */}
              <View style={[styles.formFooter, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: theme.border }]}
                  onPress={() => setIsFormOpen(false)}
                  disabled={isSaving}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSaveLocation}
                  disabled={isSaving}
                  activeOpacity={0.8}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Check size={18} color="#FFFFFF" />
                      <Text style={styles.saveBtnText}>
                        {editingLocation ? 'Salvar Alterações' : 'Cadastrar Local'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export const LocationsModal: React.FC<LocationsModalProps> = (props) => {
  if (!props.visible) return null;

  return (
    <ErrorBoundary
      fallbackMessage="Não foi possível carregar os locais físicos."
      onReset={props.onClose}
    >
      <LocationsModalContent {...props} />
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  activeFilterBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeFilterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  activeFilterLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeFilterValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearFilterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  breadcrumbBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backLevelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backLevelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  currentLocIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentLocTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  selectCurrentLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectCurrentLocText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  locCard: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardMainClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoWrap: {
    flex: 1,
  },
  locName: {
    fontSize: 14,
    fontWeight: '700',
  },
  locSub: {
    fontSize: 12,
    marginTop: 2,
  },
  rightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActionRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  filterDirectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterDirectText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  selectThisEmptyBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  selectThisEmptyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // Formulário Sobreposto
  formOverlay: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 999,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  formHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  formBody: {
    flex: 1,
  },
  formContent: {
    padding: 20,
    gap: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: -6,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  typePillText: {
    fontSize: 12,
  },
  parentsScroll: {
    flexDirection: 'row',
  },
  parentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  parentPillText: {
    fontSize: 12,
  },
  formFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
