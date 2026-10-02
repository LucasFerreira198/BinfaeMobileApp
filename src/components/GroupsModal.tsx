import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  BackHandler,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useStock } from '../context/StockContext';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { Group, Subgroup } from '../types';
import {
  X,
  Layers,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Check,
} from 'lucide-react-native';

interface GroupsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const GroupsModal: React.FC<GroupsModalProps> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();
  const { height: screenHeight } = useWindowDimensions();

  const {
    groups,
    subgroups,
    allItems,
    createGroup,
    updateGroup,
    deleteGroup,
    createSubgroup,
    updateSubgroup,
    deleteSubgroup,
  } = useStock();

  const [search, setSearch] = useState<string>('');
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<number>>(new Set());

  // Estado para Criar/Editar Grupo
  const [groupFormVisible, setGroupFormVisible] = useState<boolean>(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState<string>('');
  const [groupDesc, setGroupDesc] = useState<string>('');
  const [isSubmittingGroup, setIsSubmittingGroup] = useState<boolean>(false);

  // Estado para Criar/Editar Subgrupo
  const [subgroupFormVisible, setSubgroupFormVisible] = useState<boolean>(false);
  const [editingSubgroup, setEditingSubgroup] = useState<Subgroup | null>(null);
  const [selectedParentGroupId, setSelectedParentGroupId] = useState<number | null>(null);
  const [subgroupName, setSubgroupName] = useState<string>('');
  const [subgroupDesc, setSubgroupDesc] = useState<string>('');
  const [isSubmittingSubgroup, setIsSubmittingSubgroup] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setSearch('');
      // Inicializa com todos os grupos expandidos por conveniência
      setExpandedGroupIds(new Set(groups.map((g) => g.id)));
    }
  }, [visible, groups]);

  // Tratamento do botão voltar físico do Android
  useEffect(() => {
    if (!visible) return;

    const backAction = () => {
      if (subgroupFormVisible) {
        setSubgroupFormVisible(false);
        return true;
      }
      if (groupFormVisible) {
        setGroupFormVisible(false);
        return true;
      }
      onClose();
      return true;
    };

    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [visible, groupFormVisible, subgroupFormVisible, onClose]);

  if (!visible) return null;

  const toggleGroupExpand = (groupId: number) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Filtragem
  const filteredGroups = groups.filter((g) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const groupMatches =
      g.nome.toLowerCase().includes(q) || (g.descricao && g.descricao.toLowerCase().includes(q));
    const subs = subgroups.filter((s) => s.grupo_id === g.id);
    const subMatches = subs.some(
      (s) =>
        s.nome.toLowerCase().includes(q) || (s.descricao && s.descricao.toLowerCase().includes(q))
    );
    return groupMatches || subMatches;
  });

  // Ações de Grupo
  const handleOpenCreateGroup = () => {
    setEditingGroup(null);
    setGroupName('');
    setGroupDesc('');
    setGroupFormVisible(true);
  };

  const handleOpenEditGroup = (group: Group) => {
    setEditingGroup(group);
    setGroupName(group.nome);
    setGroupDesc(group.descricao || '');
    setGroupFormVisible(true);
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Nome obrigatório', 'Informe o nome do grupo.');
      return;
    }

    setIsSubmittingGroup(true);
    try {
      if (editingGroup) {
        await updateGroup(editingGroup.id, {
          nome: groupName.trim(),
          descricao: groupDesc.trim() || undefined,
        });
        Alert.alert('Sucesso', 'Grupo atualizado com sucesso!');
      } else {
        await createGroup({
          nome: groupName.trim(),
          descricao: groupDesc.trim() || undefined,
        });
        Alert.alert('Sucesso', 'Novo grupo cadastrado com sucesso!');
      }
      setGroupFormVisible(false);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao salvar grupo.');
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  const handleDeleteGroup = (group: Group) => {
    const subs = subgroups.filter((s) => s.grupo_id === group.id);
    const itemsCount = allItems.filter((i) => i.subgrupo?.grupo_id === group.id).length;

    let warning = `Deseja realmente excluir o grupo "${group.nome}"?`;
    if (subs.length > 0 || itemsCount > 0) {
      warning += `\n\nAtenção: Existem ${subs.length} subgrupos e ${itemsCount} materiais vinculados.`;
    }

    Alert.alert('Excluir Grupo', warning, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGroup(group.id);
            Alert.alert('Sucesso', 'Grupo excluído com sucesso.');
          } catch (err: any) {
            Alert.alert('Erro ao Excluir', err.message || 'Não foi possível excluir o grupo.');
          }
        },
      },
    ]);
  };

  // Ações de Subgrupo
  const handleOpenCreateSubgroup = (parentGroupId?: number) => {
    setEditingSubgroup(null);
    setSelectedParentGroupId(parentGroupId || (groups.length > 0 ? groups[0].id : null));
    setSubgroupName('');
    setSubgroupDesc('');
    setSubgroupFormVisible(true);
  };

  const handleOpenEditSubgroup = (subgroup: Subgroup) => {
    setEditingSubgroup(subgroup);
    setSelectedParentGroupId(subgroup.grupo_id);
    setSubgroupName(subgroup.nome);
    setSubgroupDesc(subgroup.descricao || '');
    setSubgroupFormVisible(true);
  };

  const handleSaveSubgroup = async () => {
    if (!subgroupName.trim()) {
      Alert.alert('Nome obrigatório', 'Informe o nome do subgrupo.');
      return;
    }
    if (!selectedParentGroupId) {
      Alert.alert('Grupo obrigatório', 'Selecione o grupo pai do subgrupo.');
      return;
    }

    setIsSubmittingSubgroup(true);
    try {
      if (editingSubgroup) {
        await updateSubgroup(editingSubgroup.id, {
          nome: subgroupName.trim(),
          grupo_id: selectedParentGroupId,
          descricao: subgroupDesc.trim() || undefined,
        });
        Alert.alert('Sucesso', 'Subgrupo atualizado com sucesso!');
      } else {
        await createSubgroup({
          grupo_id: selectedParentGroupId,
          nome: subgroupName.trim(),
          descricao: subgroupDesc.trim() || undefined,
        });
        Alert.alert('Sucesso', 'Novo subgrupo cadastrado com sucesso!');
      }
      setSubgroupFormVisible(false);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao salvar subgrupo.');
    } finally {
      setIsSubmittingSubgroup(false);
    }
  };

  const handleDeleteSubgroup = (subgroup: Subgroup) => {
    const itemsCount = allItems.filter((i) => i.subgrupo_id === subgroup.id).length;

    let warning = `Deseja realmente excluir o subgrupo "${subgroup.nome}"?`;
    if (itemsCount > 0) {
      warning += `\n\nAtenção: Existem ${itemsCount} materiais classificados neste subgrupo.`;
    }

    Alert.alert('Excluir Subgrupo', warning, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSubgroup(subgroup.id);
            Alert.alert('Sucesso', 'Subgrupo excluído com sucesso.');
          } catch (err: any) {
            Alert.alert('Erro ao Excluir', err.message || 'Não foi possível excluir o subgrupo.');
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingBottom: keyboardHeight }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              maxHeight: isKeyboardVisible
                ? Math.max(300, screenHeight - keyboardHeight - (insets.top || 24) - 10)
                : '92%',
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.titleWrap}>
              <View style={[styles.iconWrap, { backgroundColor: theme.badgeBg }]}>
                <Layers size={20} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.text }]}>Grupos & Subgrupos</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  {groups.length} grupos • {subgroups.length} subgrupos
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.surfaceVariant }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Barra de Ações e Busca */}
          <View style={styles.topActions}>
            <View
              style={[
                styles.searchBox,
                { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
              ]}
            >
              <Search size={16} color={theme.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Buscar grupo ou subgrupo..."
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

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                onPress={handleOpenCreateGroup}
                activeOpacity={0.8}
              >
                <Plus size={15} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Novo Grupo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 },
                ]}
                onPress={() => handleOpenCreateSubgroup()}
                activeOpacity={0.8}
              >
                <FolderPlus size={15} color={theme.primary} />
                <Text style={[styles.actionBtnText, { color: theme.primary }]}>Novo Subgrupo</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Lista de Grupos e Subgrupos */}
          <FlatList
            data={filteredGroups}
            keyExtractor={(g) => g.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Layers size={36} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  Nenhum grupo encontrado
                </Text>
                <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                  Toque em "Novo Grupo" acima para cadastrar a primeira categoria de materiais.
                </Text>
              </View>
            }
            renderItem={({ item: group }) => {
              const isExpanded = expandedGroupIds.has(group.id);
              const groupSubs = subgroups.filter((s) => s.grupo_id === group.id);
              const totalItemsInGroup = allItems.filter(
                (i) => i.subgrupo?.grupo_id === group.id
              ).length;

              return (
                <View
                  style={[
                    styles.groupCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  {/* Cabeçalho do Grupo */}
                  <TouchableOpacity
                    style={styles.groupHeader}
                    onPress={() => toggleGroupExpand(group.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.groupHeaderLeft}>
                      {isExpanded ? (
                        <ChevronDown size={18} color={theme.primary} />
                      ) : (
                        <ChevronRight size={18} color={theme.textMuted} />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.groupTitle, { color: theme.text }]} numberOfLines={1}>
                          {group.nome}
                        </Text>
                        <Text style={[styles.groupSubtitle, { color: theme.textSecondary }]}>
                          {groupSubs.length} subgrupos • {totalItemsInGroup} itens
                          {group.descricao ? ` • ${group.descricao}` : ''}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.groupActions}>
                      <TouchableOpacity
                        onPress={() => handleOpenCreateSubgroup(group.id)}
                        style={[styles.iconButton, { backgroundColor: theme.surfaceVariant }]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Plus size={14} color={theme.primary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleOpenEditGroup(group)}
                        style={[styles.iconButton, { backgroundColor: theme.surfaceVariant }]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Edit2 size={14} color={theme.text} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDeleteGroup(group)}
                        style={[styles.iconButton, { backgroundColor: theme.dangerBg }]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={14} color={theme.danger} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>

                  {/* Subgrupos Retráteis */}
                  {isExpanded && (
                    <View style={[styles.subgroupsWrap, { borderTopColor: theme.border }]}>
                      {groupSubs.length === 0 ? (
                        <View style={styles.emptySubgroups}>
                          <Text style={[styles.emptySubgroupsText, { color: theme.textMuted }]}>
                            Nenhum subgrupo cadastrado neste grupo.
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleOpenCreateSubgroup(group.id)}
                            style={styles.addSubgroupLink}
                          >
                            <Text style={[styles.addSubgroupLinkText, { color: theme.primary }]}>
                              + Adicionar Subgrupo
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        groupSubs.map((sub) => {
                          const subItemsCount = allItems.filter(
                            (i) => i.subgrupo_id === sub.id
                          ).length;
                          return (
                            <View
                              key={sub.id}
                              style={[
                                styles.subgroupItem,
                                {
                                  backgroundColor: theme.surfaceVariant,
                                  borderColor: theme.border,
                                },
                              ]}
                            >
                              <View style={styles.subgroupInfo}>
                                <Text
                                  style={[styles.subgroupTitle, { color: theme.text }]}
                                  numberOfLines={1}
                                >
                                  {sub.nome}
                                </Text>
                                <Text
                                  style={[styles.subgroupMeta, { color: theme.textSecondary }]}
                                >
                                  {subItemsCount} itens cadastrados
                                  {sub.descricao ? ` • ${sub.descricao}` : ''}
                                </Text>
                              </View>

                              <View style={styles.subgroupActions}>
                                <TouchableOpacity
                                  onPress={() => handleOpenEditSubgroup(sub)}
                                  style={[
                                    styles.iconButtonSmall,
                                    { backgroundColor: theme.card },
                                  ]}
                                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                >
                                  <Edit2 size={12} color={theme.text} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() => handleDeleteSubgroup(sub)}
                                  style={[
                                    styles.iconButtonSmall,
                                    { backgroundColor: theme.dangerBg },
                                  ]}
                                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                >
                                  <Trash2 size={12} color={theme.danger} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>
              );
            }}
          />
        </View>

        {/* Modal / Sheet Interno para Cadastrar/Editar Grupo */}
        <Modal
          visible={groupFormVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setGroupFormVisible(false)}
        >
          <View style={styles.formBackdrop}>
            <View
              style={[
                styles.formCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <View style={styles.formHeader}>
                <Text style={[styles.formTitle, { color: theme.text }]}>
                  {editingGroup ? 'Editar Grupo' : 'Novo Grupo'}
                </Text>
                <TouchableOpacity onPress={() => setGroupFormVisible(false)}>
                  <X size={18} color={theme.text} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Nome do Grupo *
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                    color: theme.text,
                  },
                ]}
                placeholder="Ex: Equipamentos de TI, Ferramentas..."
                placeholderTextColor={theme.textMuted}
                value={groupName}
                onChangeText={setGroupName}
                autoFocus
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Descrição (Opcional)
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  styles.formTextArea,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                    color: theme.text,
                  },
                ]}
                placeholder="Observações sobre a categoria..."
                placeholderTextColor={theme.textMuted}
                value={groupDesc}
                onChangeText={setGroupDesc}
                multiline
                numberOfLines={2}
              />

              <View style={styles.formButtonRow}>
                <TouchableOpacity
                  style={[
                    styles.formBtn,
                    styles.cancelBtn,
                    { backgroundColor: theme.surfaceVariant },
                  ]}
                  onPress={() => setGroupFormVisible(false)}
                >
                  <Text style={[styles.formBtnText, { color: theme.text }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formBtn, styles.saveBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSaveGroup}
                  disabled={isSubmittingGroup}
                >
                  {isSubmittingGroup ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Check size={16} color="#FFFFFF" />
                      <Text style={[styles.formBtnText, { color: '#FFFFFF' }]}>
                        {editingGroup ? 'Atualizar' : 'Cadastrar'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal / Sheet Interno para Cadastrar/Editar Subgrupo */}
        <Modal
          visible={subgroupFormVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSubgroupFormVisible(false)}
        >
          <View style={styles.formBackdrop}>
            <View
              style={[
                styles.formCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <View style={styles.formHeader}>
                <Text style={[styles.formTitle, { color: theme.text }]}>
                  {editingSubgroup ? 'Editar Subgrupo' : 'Novo Subgrupo'}
                </Text>
                <TouchableOpacity onPress={() => setSubgroupFormVisible(false)}>
                  <X size={18} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Seletor de Grupo Pai */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Grupo Pai *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.parentGroupScroll}
              >
                {groups.map((g) => {
                  const selected = selectedParentGroupId === g.id;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[
                        styles.parentGroupChip,
                        {
                          backgroundColor: selected ? theme.primary : theme.surfaceVariant,
                          borderColor: selected ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setSelectedParentGroupId(g.id)}
                    >
                      <Text
                        style={[
                          styles.parentGroupChipText,
                          { color: selected ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        {g.nome}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Nome do Subgrupo *
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                    color: theme.text,
                  },
                ]}
                placeholder="Ex: Monitores, Teclados, Furadeiras..."
                placeholderTextColor={theme.textMuted}
                value={subgroupName}
                onChangeText={setSubgroupName}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Descrição (Opcional)
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  styles.formTextArea,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                    color: theme.text,
                  },
                ]}
                placeholder="Observações sobre o subgrupo..."
                placeholderTextColor={theme.textMuted}
                value={subgroupDesc}
                onChangeText={setSubgroupDesc}
                multiline
                numberOfLines={2}
              />

              <View style={styles.formButtonRow}>
                <TouchableOpacity
                  style={[
                    styles.formBtn,
                    styles.cancelBtn,
                    { backgroundColor: theme.surfaceVariant },
                  ]}
                  onPress={() => setSubgroupFormVisible(false)}
                >
                  <Text style={[styles.formBtnText, { color: theme.text }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formBtn, styles.saveBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSaveSubgroup}
                  disabled={isSubmittingSubgroup}
                >
                  {isSubmittingSubgroup ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Check size={16} color="#FFFFFF" />
                      <Text style={[styles.formBtnText, { color: '#FFFFFF' }]}>
                        {editingSubgroup ? 'Atualizar' : 'Cadastrar'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
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
    height: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  groupSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  groupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonSmall: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subgroupsWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  subgroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  subgroupInfo: {
    flex: 1,
    marginRight: 8,
  },
  subgroupTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  subgroupMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  subgroupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptySubgroups: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  emptySubgroupsText: {
    fontSize: 12,
  },
  addSubgroupLink: {
    marginTop: 4,
    padding: 4,
  },
  addSubgroupLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
  },
  formBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  formCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  formInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  formTextArea: {
    height: 64,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  parentGroupScroll: {
    maxHeight: 40,
    marginBottom: 4,
  },
  parentGroupChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  parentGroupChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  formButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  formBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cancelBtn: {},
  saveBtn: {},
  formBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
