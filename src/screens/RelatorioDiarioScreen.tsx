import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useDrawer } from '../context/DrawerContext';
import { api } from '../api/client';
import {
  loadLocalRelatorio,
  persistLocalRelatorio,
  getLocalRelatorio,
  loadLocalMilitares,
  persistLocalMilitares,
  getLocalMilitares,
} from '../storage/db';
import { RelatorioDiario, Military } from '../types';
import {
  Clock,
  Send,
  Save,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  PackageCheck,
  ClipboardList,
  ListTodo,
  Trash2,
  Calendar,
  UserCheck,
  FileCheck2,
  Mail,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react-native';

export const RelatorioDiarioScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { navigateTo } = useDrawer();
  const insets = useSafeAreaInsets();

  const [dataRef, setDataRef] = useState<Date>(new Date());
  // 0ms Cache-First: renderiza instantaneamente o último relatório e militares em memória
  const [relatorio, setRelatorio] = useState<RelatorioDiario | null>(() => getLocalRelatorio());
  const [ocorrencias, setOcorrencias] = useState<string>(() => getLocalRelatorio()?.ocorrencias_militar || '');
  const [loading, setLoading] = useState<boolean>(() => !getLocalRelatorio());
  const [savingDraft, setSavingDraft] = useState<boolean>(false);
  const [submittingLancar, setSubmittingLancar] = useState<boolean>(false);
  const [militaresInfo, setMilitaresInfo] = useState<Military[]>(() => getLocalMilitares());
  const [militarSvModal, setMilitarSvModal] = useState<boolean>(false);

  const formatDateYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const loadRelatorio = useCallback(async () => {
    if (!relatorio && militaresInfo.length === 0) {
      setLoading(true);
    }
    try {
      const dataStr = formatDateYMD(dataRef);
      const [rel, mils] = await Promise.all([
        api.getRelatorioDiario(dataStr),
        api.getMilitaresInformatica(),
      ]);
      persistLocalRelatorio(rel);
      persistLocalMilitares(mils);
      setRelatorio(rel);
      setOcorrencias(rel.ocorrencias_militar || '');
      setMilitaresInfo(mils);
    } catch (err: any) {
      console.warn('Erro ao carregar relatório diário:', err);
      if (!relatorio) {
        Alert.alert('Erro', err.message || 'Falha ao buscar relatório diário.');
      }
    } finally {
      setLoading(false);
    }
  }, [dataRef, relatorio, militaresInfo.length]);

  useEffect(() => {
    // Busca do cache persistente em disco se a memória ainda não estava preenchida
    Promise.all([loadLocalRelatorio(), loadLocalMilitares()]).then(([cachedRel, cachedMils]) => {
      if (cachedRel) {
        setRelatorio(cachedRel);
        setOcorrencias(cachedRel.ocorrencias_militar || '');
      }
      if (cachedMils && cachedMils.length > 0) {
        setMilitaresInfo(cachedMils);
      }
      if (cachedRel || (cachedMils && cachedMils.length > 0)) {
        setLoading(false);
      }
    });
    loadRelatorio();
  }, [loadRelatorio]);

  const handlePrevDay = () => {
    const prev = new Date(dataRef);
    prev.setDate(prev.getDate() - 1);
    setDataRef(prev);
  };

  const handleNextDay = () => {
    const next = new Date(dataRef);
    next.setDate(next.getDate() + 1);
    setDataRef(next);
  };

  const handleSalvarRascunho = async () => {
    if (!relatorio?.id) return;
    setSavingDraft(true);
    try {
      const updated = await api.salvarRascunhoRelatorio(relatorio.id, ocorrencias);
      setRelatorio(updated);
      Alert.alert('Rascunho Salvo', 'Ocorrências do plantão salvas com sucesso!');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao salvar rascunho.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleLancarRelatorio = () => {
    if (!relatorio?.id) return;

    Alert.alert(
      'Lançar Relatório Oficial (24h)',
      'Esta ação consolidará o relatório do plantão e disparará automaticamente e-mails para o militar de serviço e para a chefia da Seção de Informática. Deseja prosseguir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Lançar e Enviar E-mails',
          style: 'default',
          onPress: async () => {
            setSubmittingLancar(true);
            try {
              const lancado = await api.lancarRelatorioDiario(relatorio.id!, {
                ocorrencias_militar: ocorrencias,
                militar_servico_id: relatorio.militar_servico_id,
              });
              setRelatorio(lancado);
              Alert.alert(
                'Relatório Lançado!',
                'O relatório das 24h foi oficialmente registrado e os e-mails de notificação foram disparados com sucesso!'
              );
            } catch (err: any) {
              Alert.alert('Erro ao Lançar', err.message || 'Falha ao consolidar relatório.');
            } finally {
              setSubmittingLancar(false);
            }
          },
        },
      ]
    );
  };

  const isLancado = relatorio?.status === 'LANCADO';
  const autoData = relatorio?.dados_automaticos || {};
  const itensManutencao = autoData.itens_manutencao || autoData.manutencoes_abertas || [];
  const itensEntradosManut = autoData.itens_entrados_manutencao || [];
  const itensConsertados = autoData.itens_consertados || [];
  const missoesEmAberto = autoData.missoes_em_aberto || [];
  const missoesConcluidas = autoData.missoes_concluidas_dia || [];
  const missoesCautelas = autoData.missoes_cautelas || [];
  const listaMissoesExibir = missoesEmAberto.length > 0 ? missoesEmAberto : missoesCautelas;
  const cautelasPeriodo = autoData.cautelas_periodo || autoData.cautelas_abertas || [];
  const devolucoesPeriodo = autoData.devolucoes_periodo || autoData.cautelas_devolvidas || [];
  const pendenciasEmAberto = autoData.pendencias_em_aberto || [];
  const pendenciasCriadas = autoData.pendencias_criadas || [];
  const pendenciasResolvidas = autoData.pendencias_resolvidas || autoData.pendencias_concluidas || [];
  const itensBaixados = autoData.itens_baixados || [];

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
          <Clock size={22} color={theme.primary} />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Relatório Diário (24h)</Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]} numberOfLines={1}>
              Passagem de Plantão 07:30
            </Text>
          </View>
        </View>

        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isLancado ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)',
            },
          ]}
        >
          {isLancado ? (
            <ShieldCheck size={14} color="#10B981" style={{ marginRight: 4 }} />
          ) : (
            <Clock size={14} color="#EAB308" style={{ marginRight: 4 }} />
          )}
          <Text style={[styles.statusBadgeText, { color: isLancado ? '#10B981' : '#EAB308' }]}>
            {isLancado ? 'LANÇADO' : 'RASCUNHO'}
          </Text>
        </View>
      </View>

      {/* Navegador de Data */}
      <View style={[styles.dateNav, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.btnNavDate} onPress={handlePrevDay}>
          <ChevronLeft size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.dateNavText, { color: theme.text }]}>
            {dataRef.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </Text>
          <Text style={[styles.periodText, { color: theme.textMuted }]}>
            {relatorio?.periodo_inicio ? new Date(relatorio.periodo_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '07:30'}
            {' às '}
            {relatorio?.periodo_fim ? new Date(relatorio.periodo_fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '07:30'}
          </Text>
        </View>

        <TouchableOpacity style={styles.btnNavDate} onPress={handleNextDay}>
          <ChevronRight size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Consolidando dados das 24 horas...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 70 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Card Militar de Serviço */}
          <View style={[styles.militarCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.militarCardHeader}>
              <UserCheck size={18} color={theme.primary} />
              <Text style={[styles.militarCardTitle, { color: theme.text }]}>Militar de Serviço do Plantão</Text>
              {relatorio?.militar_servico_id ? (
                <View style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ color: '#38BDF8', fontSize: 11, fontWeight: '700' }}>Definido pela Escala</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={[
                styles.selectMilitarBtn,
                {
                  backgroundColor: theme.surfaceVariant,
                  borderColor: !relatorio?.militar_servico_id ? '#F59E0B' : theme.border,
                },
              ]}
              onPress={() => !isLancado && setMilitarSvModal(true)}
              disabled={isLancado}
            >
              <Text style={[styles.militarNomeText, { color: !relatorio?.militar_servico_id ? '#F59E0B' : theme.text }]}>
                {relatorio?.militar_servico_nome
                  ? `${relatorio.militar_servico_posto || ''} ${relatorio.militar_servico_nome}`
                  : '⚠️ Nenhum militar escalado nesta data. Toque para escolher.'}
              </Text>
              {!isLancado ? (
                <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>
                  {relatorio?.militar_servico_id ? 'Toque para alterar manualmente se necessário' : 'Toque para selecionar quem está de serviço'}
                </Text>
              ) : null}
            </TouchableOpacity>
          </View>

          {/* Cards de Resumo Automático */}
          <Text style={[styles.sectionHeading, { color: theme.textMuted }]}>
            ATIVIDADES AUTOMÁTICAS (ÚLTIMAS 24H)
          </Text>

          {/* 1. Computadores Consertados / Saídos da Manutenção */}
          <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: '#10B981' }]}>
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <CheckCircle2 size={18} color="#10B981" />
              </View>
              <Text style={[styles.summaryTitle, { color: '#10B981' }]}>
                Computadores Consertados ({itensConsertados.length})
              </Text>
            </View>

            {itensConsertados.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                Nenhum equipamento finalizou manutenção nas últimas 24h.
              </Text>
            ) : (
              itensConsertados.map((c: any, idx: number) => (
                <View key={`cons-${idx}`} style={[styles.itemDetailRow, { borderTopColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.itemDetailTitle, { color: theme.text, flex: 1 }]}>
                      • {c.nome} (BMP: {c.bmp || 'S/N'}{c.numero_serie ? ` | Série: ${c.numero_serie}` : ''})
                    </Text>
                    <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '700' }}>CONSERTADO</Text>
                    </View>
                  </View>
                  <Text style={[styles.itemDetailSub, { color: '#10B981', marginTop: 2 }]}>
                    ✔ Resolução: {c.resolucao || 'Reparo concluído com êxito'}
                  </Text>
                  {c.defeito ? (
                    <Text style={[styles.itemDetailSub, { color: theme.textMuted }]}>
                      Defeito inicial: {c.defeito}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </View>

          {/* 2. Oficina & Manutenção de Equipamentos */}
          <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
                <Wrench size={18} color="#EAB308" />
              </View>
              <Text style={[styles.summaryTitle, { color: theme.text }]}>
                Oficina & Manutenção ({itensManutencao.length} em bancada)
              </Text>
            </View>

            {/* 2.1 Entradas no Plantão */}
            {itensEntradosManut.length > 0 && (
              <View style={{ marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#F59E0B', marginBottom: 4 }}>
                  📥 Entradas para Reparo no Plantão ({itensEntradosManut.length}):
                </Text>
                {itensEntradosManut.map((em: any, idx: number) => (
                  <View key={`ent-${idx}`} style={{ marginBottom: 4 }}>
                    <Text style={[styles.itemDetailTitle, { color: theme.text }]}>
                      • {em.nome} (BMP: {em.bmp || 'S/N'}{em.numero_serie ? ` | Série: ${em.numero_serie}` : ''})
                    </Text>
                    <Text style={[styles.itemDetailSub, { color: '#F59E0B' }]}>
                      Defeito: {em.defeito || 'Recolhido para reparo'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* 2.2 Bancada Atual */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 }}>
              Equipamentos na Bancada Atualmente ({itensManutencao.length}):
            </Text>
            {itensManutencao.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>Nenhum equipamento aguardando manutenção na bancada.</Text>
            ) : (
              itensManutencao.map((m: any, idx: number) => (
                <View key={`man-${idx}`} style={[styles.itemDetailRow, { borderTopColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.itemDetailTitle, { color: theme.text, flex: 1 }]}>
                      • {m.nome} (BMP: {m.bmp || 'S/N'}{m.numero_serie ? ` | Série: ${m.numero_serie}` : ''})
                    </Text>
                    {m.status_etapa ? (
                      <View style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ color: '#EAB308', fontSize: 10, fontWeight: '700' }}>{m.status_etapa}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.itemDetailSub, { color: '#F59E0B' }]}>
                    Defeito: {m.defeito || 'Em processo de reparo'}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* 3. Missões e Cautelas Detalhadas */}
          <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <ClipboardList size={18} color="#38BDF8" />
              </View>
              <Text style={[styles.summaryTitle, { color: theme.text }]}>
                Missões e Cautelas de Materiais
              </Text>
            </View>

            <Text style={[styles.subCount, { color: theme.textSecondary }]}>
              {listaMissoesExibir.length} Missão(ões) em aberto • {cautelasPeriodo.length} materiais cautelados • {devolucoesPeriodo.length} devoluções
            </Text>

            {/* 3.1 Missões em Aberto / Em Andamento */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#38BDF8', marginTop: 6, marginBottom: 4 }}>
              🚀 Missões e Cautelas Ativas / Em Andamento ({listaMissoesExibir.length}):
            </Text>

            {listaMissoesExibir.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>Nenhuma missão ou cautela de material atualmente em aberto.</Text>
            ) : (
              listaMissoesExibir.map((m: any, idx: number) => {
                const isMissao = m.tipo === 'Missão';
                const materiais = m.materiais || [];
                const statusTag = m.status_relatorio || m.status || 'ATIVA';
                return (
                  <View key={`mis-${idx}`} style={[styles.itemDetailRow, { borderTopColor: theme.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.itemDetailTitle, { color: theme.text, fontWeight: '700', flex: 1 }]}>
                        {m.missao_nome}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <View style={{ backgroundColor: isMissao ? 'rgba(56, 189, 248, 0.15)' : 'rgba(168, 85, 247, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: isMissao ? '#38BDF8' : '#A855F7', fontSize: 10, fontWeight: '700' }}>
                            {m.tipo || 'Missão'}
                          </Text>
                        </View>
                        <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '700' }}>
                            {statusTag}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text style={[styles.itemDetailSub, { color: theme.textSecondary, marginTop: 2 }]}>
                      Responsável: {m.militar_responsavel} • Total: {m.total_materiais || materiais.length} material(is)
                    </Text>
                    {materiais.map((mat: any, mIdx: number) => (
                      <View key={`mat-${mIdx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 8, marginTop: 2 }}>
                        <Text style={[styles.itemDetailSub, { color: theme.text, flex: 1 }]}>
                          ↳ {mat.nome} (BMP: {mat.bmp || 'S/N'}{mat.numero_serie ? ` | Série: ${mat.numero_serie}` : ''}) - {mat.condicao_saida || 'Bom estado'}
                        </Text>
                        {mat.status === 'DEVOLVIDO' && (
                          <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '700' }}>[DEVOLVIDO]</Text>
                        )}
                      </View>
                    ))}
                  </View>
                );
              })
            )}

            {/* 3.2 Missões Concluídas no Plantão */}
            {missoesConcluidas.length > 0 && (
              <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.border }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981', marginBottom: 4 }}>
                  🏁 Missões Concluídas no Plantão ({missoesConcluidas.length}):
                </Text>
                {missoesConcluidas.map((mc: any, idx: number) => (
                  <View key={`mconc-${idx}`} style={{ marginBottom: 4 }}>
                    <Text style={[styles.itemDetailTitle, { color: theme.text, fontWeight: '700' }]}>
                      ✔ {mc.missao_nome} ({mc.tipo})
                    </Text>
                    <Text style={[styles.itemDetailSub, { color: theme.textSecondary }]}>
                      Responsável: {mc.militar_responsavel} • Total: {mc.total_materiais} materiais devolvidos
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* 3.3 Devoluções Avulsas */}
            {devolucoesPeriodo.length > 0 && (
              <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981', marginBottom: 4 }}>
                  Devoluções Realizadas no Plantão ({devolucoesPeriodo.length}):
                </Text>
                {devolucoesPeriodo.map((d: any, idx: number) => (
                  <Text key={`dev-${idx}`} style={[styles.itemDetailSub, { color: theme.text, marginBottom: 2 }]}>
                    • {d.item_nome || d.material} (BMP: {d.bmp || 'S/N'}) - Devolvido por {d.militar_nome || 'Militar'} ({d.missao_nome || 'Missão'})
                  </Text>
                ))}
              </View>
            )}
          </View>

          {/* 4. Pendências do Plantão & Passagem de Serviço */}
          <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <ListTodo size={18} color="#6366F1" />
              </View>
              <Text style={[styles.summaryTitle, { color: theme.text }]}>
                Pendências & Passagem de Serviço
              </Text>
            </View>

            {/* 4.1 Pendências em Aberto para Passagem de Serviço */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#F59E0B', marginTop: 4 }}>
              📌 Pendências em Aberto para o Próximo Serviço ({pendenciasEmAberto.length}):
            </Text>
            {pendenciasEmAberto.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>Nenhuma pendência em aberto na Seção.</Text>
            ) : (
              pendenciasEmAberto.map((p: any, idx: number) => (
                <View key={`pab-${idx}`} style={[styles.itemDetailRow, { borderTopColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.itemDetailTitle, { color: theme.text, flex: 1 }]}>
                      • [{p.tipo || 'GERAL'}] {p.titulo}
                    </Text>
                    {p.prioridade ? (
                      <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700' }}>{p.prioridade}</Text>
                      </View>
                    ) : null}
                  </View>
                  {p.descricao ? (
                    <Text style={[styles.itemDetailSub, { color: theme.textSecondary, marginTop: 2 }]}>
                      {p.descricao}
                    </Text>
                  ) : null}
                  {p.responsavel ? (
                    <Text style={[styles.itemDetailSub, { color: theme.textMuted }]}>
                      Responsável: {p.responsavel}
                    </Text>
                  ) : null}
                </View>
              ))
            )}

            {/* 4.2 Solucionadas */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981', marginTop: 10 }}>
              ✔ Solucionadas no Plantão ({pendenciasResolvidas.length}):
            </Text>
            {pendenciasResolvidas.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>Nenhuma pendência finalizada no período.</Text>
            ) : (
              pendenciasResolvidas.map((p: any, idx: number) => (
                <View key={`pres-${idx}`} style={[styles.itemDetailRow, { borderTopColor: theme.border }]}>
                  <Text style={[styles.itemDetailTitle, { color: '#10B981' }]}>
                    ✓ [{p.tipo || 'GERAL'}] {p.titulo}
                  </Text>
                  <Text style={[styles.itemDetailSub, { color: theme.text }]}>
                    Resolução: {p.resolucao || p.laudo || 'Concluída com sucesso'}
                  </Text>
                  {p.responsavel ? (
                    <Text style={[styles.itemDetailSub, { color: theme.textMuted }]}>
                      Responsável: {p.responsavel}
                    </Text>
                  ) : null}
                </View>
              ))
            )}

            {/* 4.3 Novas Criadas */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#F59E0B', marginTop: 10 }}>
              ⚠️ Novas Pendências Registradas ({pendenciasCriadas.length}):
            </Text>
            {pendenciasCriadas.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>Nenhuma nova pendência aberta no plantão.</Text>
            ) : (
              pendenciasCriadas.map((p: any, idx: number) => (
                <View key={`pcri-${idx}`} style={[styles.itemDetailRow, { borderTopColor: theme.border }]}>
                  <Text style={[styles.itemDetailTitle, { color: '#F59E0B' }]}>
                    • [{p.tipo || 'GERAL'}] {p.titulo} {p.prioridade ? `(${p.prioridade})` : ''}
                  </Text>
                  {p.descricao ? (
                    <Text style={[styles.itemDetailSub, { color: theme.text }]}>
                      {p.descricao}
                    </Text>
                  ) : null}
                  {p.responsavel ? (
                    <Text style={[styles.itemDetailSub, { color: theme.textMuted }]}>
                      Responsável: {p.responsavel}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </View>

          {/* 5. Baixas Patrimoniais */}
          {itensBaixados && itensBaixados.length > 0 && (
            <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: '#EF4444' }]}>
              <View style={styles.summaryHeader}>
                <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Trash2 size={18} color="#EF4444" />
                </View>
                <Text style={[styles.summaryTitle, { color: '#EF4444' }]}>
                  Equipamentos Baixados ({itensBaixados.length})
                </Text>
              </View>
              {itensBaixados.map((b: any, idx: number) => (
                <View key={`b-${idx}`} style={[styles.itemDetailRow, { borderTopColor: theme.border }]}>
                  <Text style={[styles.itemDetailTitle, { color: '#EF4444' }]}>
                    • {b.nome || b.item_nome}
                  </Text>
                  <Text style={[styles.itemDetailSub, { color: theme.textSecondary }]}>Motivo: {b.motivo || 'Perda total'}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Campo Editável de Ocorrências */}
          <Text style={[styles.sectionHeading, { color: theme.textMuted }]}>
            OCORRÊNCIAS REGISTRADAS PELO MILITAR DE SERVIÇO
          </Text>

          <View style={[styles.ocorrenciasBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <TextInput
              style={[styles.ocorrenciasInput, { color: theme.text }]}
              placeholder={isLancado ? 'Sem ocorrências adicionais registradas.' : 'Digite aqui as ocorrências do quarto de serviço, vistorias, chamados atendidos ou observações da Seção...'}
              placeholderTextColor={theme.textMuted}
              multiline
              editable={!isLancado}
              value={ocorrencias}
              onChangeText={setOcorrencias}
            />
          </View>

          {/* Botões de Ação */}
          {!isLancado ? (
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.btnDraft, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
                onPress={handleSalvarRascunho}
                disabled={savingDraft || submittingLancar}
              >
                {savingDraft ? (
                  <ActivityIndicator size="small" color={theme.text} />
                ) : (
                  <>
                    <Save size={16} color={theme.text} />
                    <Text style={[styles.btnDraftText, { color: theme.text }]}>Salvar Rascunho</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnLancar, { backgroundColor: theme.primary }]}
                onPress={handleLancarRelatorio}
                disabled={submittingLancar || savingDraft}
              >
                {submittingLancar ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <>
                    <Send size={16} color="#000000" />
                    <Text style={styles.btnLancarText}>Lançar Relatório</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.lancadoInfoBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Mail size={18} color="#10B981" />
              <Text style={styles.lancadoInfoText}>
                Este relatório foi oficialmente concluído e enviado por e-mail para o militar de SV e chefia da TI.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL SELETOR DE MILITAR DE SV */}
      <Modal visible={militarSvModal} animationType="fade" transparent onRequestClose={() => setMilitarSvModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Militar de Serviço do Plantão</Text>
            <FlatList
              data={militaresInfo}
              keyExtractor={(m) => String(m.saram)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.militarSelectItem, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    if (relatorio) {
                      setRelatorio({
                        ...relatorio,
                        militar_servico_id: (item as any).id,
                        militar_servico_nome: item.nome_guerra,
                        militar_servico_posto: item.posto_graduacao,
                      });
                    }
                    setMilitarSvModal(false);
                  }}
                >
                  <Text style={[styles.militarSelectText, { color: theme.text }]}>
                    {item.posto_graduacao} {item.nome_guerra}
                  </Text>
                  <Text style={[styles.militarSelectSub, { color: theme.textSecondary }]}>
                    SARAM: {item.saram}
                  </Text>
                </TouchableOpacity>
              )}
            />
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  btnNavDate: {
    padding: 6,
  },
  dateNavText: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  periodText: {
    fontSize: 11,
    marginTop: 2,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  militarCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  militarCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  militarCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  selectMilitarBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  militarNomeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  subCount: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 8,
  },
  itemDetailRow: {
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
  },
  itemDetailTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemDetailSub: {
    fontSize: 12,
    marginTop: 2,
  },
  ocorrenciasBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 120,
    marginBottom: 16,
  },
  ocorrenciasInput: {
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
    padding: 0,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btnDraft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  btnDraftText: {
    fontSize: 14,
    fontWeight: '600',
  },
  btnLancar: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  btnLancarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  lancadoInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 10,
  },
  lancadoInfoText: {
    fontSize: 12,
    color: '#10B981',
    flex: 1,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  militarSelectItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  militarSelectText: {
    fontSize: 14,
    fontWeight: '600',
  },
  militarSelectSub: {
    fontSize: 12,
  },
});
