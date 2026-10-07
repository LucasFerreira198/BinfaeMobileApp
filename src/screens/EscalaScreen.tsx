import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useDrawer } from '../context/DrawerContext';
import { api } from '../api/client';
import { EscalaMensal, EscalaDia, Military, EstatisticaMilitar } from '../types';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Printer,
  Save,
  CheckCircle,
  AlertCircle,
  User,
  Users,
  BarChart3,
  X,
  Share2,
  ArrowLeft,
} from 'lucide-react-native';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const EscalaScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { navigateTo } = useDrawer();
  const insets = useSafeAreaInsets();
  const isAdmin = Boolean(
    user?.admin ||
    user?.militar?.is_informatica ||
    (user?.militar?.secao && user?.militar?.secao.toLowerCase().includes('inform'))
  );

  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [escala, setEscala] = useState<EscalaMensal | null>(null);
  const [militaresInfo, setMilitaresInfo] = useState<Military[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ESCALA' | 'ESTATISTICAS'>('ESCALA');

  // Modal para editar dia
  const [selectedDia, setSelectedDia] = useState<EscalaDia | null>(null);
  const [modalDiaVisible, setModalDiaVisible] = useState<boolean>(false);

  // Modal seletor de militar
  const [selectorTarget, setSelectorTarget] = useState<'SV' | 'EXPD1' | 'EXPD2' | null>(null);
  const [selectorModalVisible, setSelectorModalVisible] = useState<boolean>(false);

  const loadEscala = useCallback(async () => {
    setLoading(true);
    try {
      const [data, mils] = await Promise.all([
        api.getEscalaMensal(mes, ano),
        api.getMilitaresInformatica(),
      ]);
      setEscala(data);
      setMilitaresInfo(mils);
    } catch (err: any) {
      console.warn('Erro ao carregar escala:', err);
      Alert.alert('Erro', err.message || 'Falha ao buscar escala do mês.');
    } finally {
      setLoading(false);
    }
  }, [mes, ano]);

  useEffect(() => {
    loadEscala();
  }, [loadEscala]);

  const handlePrevMonth = () => {
    if (mes === 1) {
      setMes(12);
      setAno(ano - 1);
    } else {
      setMes(mes - 1);
    }
  };

  const handleNextMonth = () => {
    if (mes === 12) {
      setMes(1);
      setAno(ano + 1);
    } else {
      setMes(mes + 1);
    }
  };

  const handleSaveEscala = async () => {
    if (!escala) return;
    setSaving(true);
    try {
      const payload = {
        mes: escala.mes,
        ano: escala.ano,
        titulo: escala.titulo,
        dias: escala.dias.map((d) => ({
          dia: d.dia,
          dia_semana: d.dia_semana,
          is_weekend: d.is_weekend,
          is_feriado: d.is_feriado,
          feriado_nome: d.feriado_nome,
          militar_sv_id: d.militar_sv_id,
          militar_expd_1_id: d.militar_expd_1_id,
          militar_expd_2_id: d.militar_expd_2_id,
        })),
      };
      const saved = await api.salvarEscalaMensal(payload);
      setEscala(saved);
      Alert.alert('Sucesso', 'Escala de serviço do mês salva com sucesso!');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao salvar escala.');
    } finally {
      setSaving(false);
    }
  };

  // Atualizar alocação de militar no dia
  const handleSelectMilitar = (mil: Military | null) => {
    if (!selectedDia || !escala || !selectorTarget) return;

    const updatedDias = escala.dias.map((d) => {
      if (d.dia === selectedDia.dia) {
        if (selectorTarget === 'SV') {
          return {
            ...d,
            militar_sv_id: mil ? (mil as any).id : null,
            militar_sv_saram: mil ? mil.saram : null,
            militar_sv_nome: mil ? mil.nome_guerra : null,
            militar_sv_posto: mil ? mil.posto_graduacao : null,
          };
        } else if (selectorTarget === 'EXPD1') {
          return {
            ...d,
            militar_expd_1_id: mil ? (mil as any).id : null,
            militar_expd_1_nome: mil ? `${mil.posto_graduacao} ${mil.nome_guerra}` : null,
          };
        } else if (selectorTarget === 'EXPD2') {
          return {
            ...d,
            militar_expd_2_id: mil ? (mil as any).id : null,
            militar_expd_2_nome: mil ? `${mil.posto_graduacao} ${mil.nome_guerra}` : null,
          };
        }
      }
      return d;
    });

    const updatedSelected = updatedDias.find((d) => d.dia === selectedDia.dia) || null;
    setSelectedDia(updatedSelected);
    setEscala({ ...escala, dias: updatedDias });
    setSelectorModalVisible(false);
  };

  // Gerar PDF formatado A4 Paisagem idêntico ao modelo da FAB
  const handleExportPdf = async () => {
    if (!escala) return;
    setExportingPdf(true);

    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; font-size: 9pt; }
            .header { text-align: center; background: #1E293B; color: #FFF; padding: 6px; font-weight: bold; font-size: 11pt; border-radius: 4px; margin-bottom: 8px; }
            .container { display: flex; flex-direction: row; gap: 8px; }
            .table-main { width: 62%; border-collapse: collapse; }
            .table-stats { width: 38%; border-collapse: collapse; }
            th, td { border: 1px solid #CBD5E1; padding: 3px 4px; text-align: center; }
            th { background: #334155; color: #FFF; font-weight: bold; font-size: 8pt; }
            .weekend { background-color: #FEE2E2 !important; color: #DC2626 !important; font-weight: bold; }
            .holiday { background-color: #F3E8FF !important; color: #7E22CE !important; font-weight: bold; }
            .name-cell { text-align: left; padding-left: 6px; font-weight: 600; }
            .footer { margin-top: 15px; display: flex; justify-content: space-around; text-align: center; font-size: 8pt; }
            .sign-line { border-top: 1px solid #000; width: 200px; margin: 25px auto 4px auto; }
          </style>
        </head>
        <body>
          <div class="header">${escala.titulo.toUpperCase()}</div>
          <div class="container">
            <table class="table-main">
              <thead>
                <tr>
                  <th style="width: 28px;">DIA</th>
                  <th style="width: 40px;">SEM</th>
                  <th>MILITAR DE SERVIÇO (SV)</th>
                  <th>EXPEDIENTE 1</th>
                  <th>EXPEDIENTE 2</th>
                </tr>
              </thead>
              <tbody>
                ${escala.dias.map(d => {
                  const rowClass = d.is_feriado ? 'holiday' : (d.is_weekend ? 'weekend' : '');
                  const svDisplay = d.militar_sv_nome ? `${d.militar_sv_posto || ''} ${d.militar_sv_nome}` : '-';
                  const exp1Display = d.militar_expd_1_nome || '-';
                  const exp2Display = d.militar_expd_2_nome || '-';
                  return `
                    <tr class="${rowClass}">
                      <td>${d.dia}</td>
                      <td>${d.dia_semana}</td>
                      <td class="name-cell">${svDisplay}</td>
                      <td class="name-cell">${exp1Display}</td>
                      <td class="name-cell">${exp2Display}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <table class="table-stats">
              <thead>
                <tr>
                  <th>MILITAR</th>
                  <th>SV</th>
                  <th>EXP</th>
                  <th>S1</th>
                  <th>S2</th>
                  <th>S3</th>
                  <th>S4</th>
                  <th>S5</th>
                </tr>
              </thead>
              <tbody>
                ${(escala.estatisticas || []).map(st => `
                  <tr>
                    <td class="name-cell">${st.posto_graduacao} ${st.nome_guerra}</td>
                    <td><b>${st.total_sv}</b></td>
                    <td>${st.total_expd}</td>
                    <td>${st.semana_1_sv}</td>
                    <td>${st.semana_2_sv}</td>
                    <td>${st.semana_3_sv}</td>
                    <td>${st.semana_4_sv}</td>
                    <td>${st.semana_5_sv}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="footer">
            <div>
              <div class="sign-line"></div>
              <b>Militar Escalante</b><br>Seção de Informática
            </div>
            <div>
              <div class="sign-line"></div>
              <b>Chefe da Seção de Informática</b><br>BINFAE-GL
            </div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err: any) {
      Alert.alert('Erro ao Exportar', err.message || 'Falha ao gerar arquivo PDF.');
    } finally {
      setExportingPdf(false);
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
          <CalendarDays size={22} color={theme.primary} />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Escala de Serviço</Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]} numberOfLines={1}>
              {MESES[mes - 1]} de {ano} • Seção TI
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.btnHeaderIcon, { backgroundColor: theme.surfaceVariant }]}
            onPress={handleExportPdf}
            disabled={exportingPdf}
          >
            {exportingPdf ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Printer size={18} color={theme.text} />
            )}
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={[styles.btnHeaderSave, { backgroundColor: theme.primary }]}
              onPress={handleSaveEscala}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <>
                  <Save size={16} color="#000000" />
                  <Text style={styles.btnHeaderSaveText}>Salvar</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Navegador de Mês */}
      <View style={[styles.monthNav, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.btnNavMonth} onPress={handlePrevMonth}>
          <ChevronLeft size={20} color={theme.text} />
        </TouchableOpacity>

        <Text style={[styles.monthNavText, { color: theme.text }]}>
          {MESES[mes - 1].toUpperCase()} {ano}
        </Text>

        <TouchableOpacity style={styles.btnNavMonth} onPress={handleNextMonth}>
          <ChevronRight size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs Escala / Estatísticas */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ESCALA' && { borderBottomColor: theme.primary, borderBottomWidth: 3 }]}
          onPress={() => setActiveTab('ESCALA')}
        >
          <CalendarDays size={16} color={activeTab === 'ESCALA' ? theme.primary : theme.textMuted} />
          <Text style={[styles.tabItemText, { color: activeTab === 'ESCALA' ? theme.primary : theme.textMuted }]}>
            Dias do Mês ({escala?.dias.length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ESTATISTICAS' && { borderBottomColor: theme.primary, borderBottomWidth: 3 }]}
          onPress={() => setActiveTab('ESTATISTICAS')}
        >
          <BarChart3 size={16} color={activeTab === 'ESTATISTICAS' ? theme.primary : theme.textMuted} />
          <Text style={[styles.tabItemText, { color: activeTab === 'ESTATISTICAS' ? theme.primary : theme.textMuted }]}>
            Quadro Estatístico (S1 - S5)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo Principal */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Carregando escala do mês...</Text>
        </View>
      ) : activeTab === 'ESCALA' ? (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 70 }]}
          showsVerticalScrollIndicator={false}
        >
          {escala?.dias.map((d) => {
            const isFds = d.is_weekend;
            const isFer = d.is_feriado;

            let badgeBg = 'rgba(56, 189, 248, 0.15)';
            let badgeText = '#38BDF8';
            if (isFer) {
              badgeBg = 'rgba(126, 34, 206, 0.2)';
              badgeText = '#C084FC';
            } else if (isFds) {
              badgeBg = 'rgba(239, 68, 68, 0.2)';
              badgeText = '#F87171';
            }

            return (
              <TouchableOpacity
                key={d.dia}
                style={[
                  styles.diaCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: isFer ? '#7E22CE' : (isFds ? '#EF4444' : theme.border),
                  },
                ]}
                onPress={() => {
                  if (isAdmin) {
                    setSelectedDia(d);
                    setModalDiaVisible(true);
                  }
                }}
                activeOpacity={isAdmin ? 0.7 : 1}
              >
                {/* Coluna do Dia */}
                <View style={[styles.diaIndicator, { backgroundColor: badgeBg }]}>
                  <Text style={[styles.diaNumero, { color: badgeText }]}>{d.dia}</Text>
                  <Text style={[styles.diaSemana, { color: badgeText }]}>{d.dia_semana}</Text>
                </View>

                {/* Conteúdo das Escalações */}
                <View style={styles.diaContent}>
                  {isFer && d.feriado_nome ? (
                    <Text style={styles.feriadoLabel} numberOfLines={1}>
                      ★ {d.feriado_nome}
                    </Text>
                  ) : null}

                  {/* Militar SV */}
                  <View style={styles.escalacaoRow}>
                    <Text style={[styles.cargoLabel, { color: theme.primary }]}>SV:</Text>
                    <Text style={[styles.militarNome, { color: theme.text }]} numberOfLines={1}>
                      {d.militar_sv_nome ? `${d.militar_sv_posto || ''} ${d.militar_sv_nome}` : '(Não escalado)'}
                    </Text>
                  </View>

                  {/* Expedientes (se dia útil) */}
                  {!isFds && !isFer && (
                    <View style={styles.expdContainer}>
                      <Text style={[styles.expdText, { color: theme.textSecondary }]} numberOfLines={1}>
                        EXPD 1: {d.militar_expd_1_nome || '-'}
                      </Text>
                      <Text style={[styles.expdText, { color: theme.textSecondary }]} numberOfLines={1}>
                        EXPD 2: {d.militar_expd_2_nome || '-'}
                      </Text>
                    </View>
                  )}
                </View>

                {isAdmin && <ChevronRight size={18} color={theme.textMuted} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        /* TAB: QUADRO ESTATÍSTICO */
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 70 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.statsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.statsTitle, { color: theme.text }]}>Contagem Mensal & Semanas</Text>
            <Text style={[styles.statsSub, { color: theme.textSecondary }]}>
              Distribuição de serviços e expedientes para a Seção de Informática
            </Text>

            {escala?.estatisticas?.map((st) => (
              <View key={st.militar_id} style={[styles.statRow, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statMilitarNome, { color: theme.text }]}>
                    {st.posto_graduacao} {st.nome_guerra}
                  </Text>
                  <Text style={[styles.statSaram, { color: theme.textMuted }]}>SARAM: {st.saram}</Text>
                </View>

                {/* Totais */}
                <View style={styles.statCounters}>
                  <View style={[styles.counterBadge, { backgroundColor: 'rgba(0, 210, 180, 0.15)' }]}>
                    <Text style={[styles.counterNum, { color: theme.primary }]}>{st.total_sv}</Text>
                    <Text style={styles.counterLabel}>SV</Text>
                  </View>

                  <View style={[styles.counterBadge, { backgroundColor: theme.surfaceVariant, marginLeft: 6 }]}>
                    <Text style={[styles.counterNum, { color: theme.text }]}>{st.total_expd}</Text>
                    <Text style={styles.counterLabel}>EXP</Text>
                  </View>
                </View>

                {/* Semanas */}
                <View style={styles.semanasPills}>
                  <Text style={[styles.semanaText, { color: theme.textMuted }]}>
                    S1:{st.semana_1_sv} S2:{st.semana_2_sv} S3:{st.semana_3_sv} S4:{st.semana_4_sv} S5:{st.semana_5_sv}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* MODAL: EDITAR DIA DA ESCALA */}
      <Modal visible={modalDiaVisible} animationType="slide" transparent onRequestClose={() => setModalDiaVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Escalar Dia {selectedDia?.dia} ({selectedDia?.dia_semana})
              </Text>
              <TouchableOpacity onPress={() => setModalDiaVisible(false)}>
                <X size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {/* Seletor SV */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Militar de Serviço (SV) do Dia</Text>
              <TouchableOpacity
                style={[styles.selectBtn, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
                onPress={() => {
                  setSelectorTarget('SV');
                  setSelectorModalVisible(true);
                }}
              >
                <User size={16} color={theme.primary} />
                <Text style={[styles.selectBtnText, { color: theme.text }]}>
                  {selectedDia?.militar_sv_nome
                    ? `${selectedDia.militar_sv_posto || ''} ${selectedDia.militar_sv_nome}`
                    : 'Selecionar Militar de SV...'}
                </Text>
              </TouchableOpacity>

              {/* Seletor Expediente 1 */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 12 }]}>Expediente 1 (Opcional)</Text>
              <TouchableOpacity
                style={[styles.selectBtn, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
                onPress={() => {
                  setSelectorTarget('EXPD1');
                  setSelectorModalVisible(true);
                }}
              >
                <Users size={16} color={theme.textMuted} />
                <Text style={[styles.selectBtnText, { color: theme.text }]}>
                  {selectedDia?.militar_expd_1_nome || 'Selecionar Expediente 1...'}
                </Text>
              </TouchableOpacity>

              {/* Seletor Expediente 2 */}
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 12 }]}>Expediente 2 (Opcional)</Text>
              <TouchableOpacity
                style={[styles.selectBtn, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
                onPress={() => {
                  setSelectorTarget('EXPD2');
                  setSelectorModalVisible(true);
                }}
              >
                <Users size={16} color={theme.textMuted} />
                <Text style={[styles.selectBtnText, { color: theme.text }]}>
                  {selectedDia?.militar_expd_2_nome || 'Selecionar Expediente 2...'}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.btnModalOk, { backgroundColor: theme.primary }]}
                onPress={() => setModalDiaVisible(false)}
              >
                <Text style={{ color: '#000000', fontWeight: 'bold' }}>Concluir Alteração</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL SELETOR DE MILITAR DA INFORMÁTICA */}
      <Modal visible={selectorModalVisible} animationType="fade" transparent onRequestClose={() => setSelectorModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border, maxHeight: '80%' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Militares da Informática</Text>
              <TouchableOpacity onPress={() => setSelectorModalVisible(false)}>
                <X size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.militarSelectItem, { borderBottomColor: theme.border }]}
              onPress={() => handleSelectMilitar(null)}
            >
              <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>✕ Nenhum / Desescalar</Text>
            </TouchableOpacity>

            <FlatList
              data={militaresInfo}
              keyExtractor={(m) => String(m.saram)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.militarSelectItem, { borderBottomColor: theme.border }]}
                  onPress={() => handleSelectMilitar(item)}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnHeaderSave: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  btnHeaderSaveText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  btnNavMonth: {
    padding: 6,
  },
  monthNavText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  tabItemText: {
    fontSize: 12,
    fontWeight: '600',
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
  diaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  diaIndicator: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  diaNumero: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  diaSemana: {
    fontSize: 10,
    fontWeight: '700',
  },
  diaContent: {
    flex: 1,
  },
  feriadoLabel: {
    color: '#C084FC',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  escalacaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cargoLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  militarNome: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  expdContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 3,
  },
  expdText: {
    fontSize: 11,
  },
  statsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsSub: {
    fontSize: 12,
    marginBottom: 14,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  statMilitarNome: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statSaram: {
    fontSize: 11,
  },
  statCounters: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  counterBadge: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 32,
  },
  counterNum: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  counterLabel: {
    fontSize: 9,
    color: '#94A3B8',
  },
  semanasPills: {
    alignItems: 'flex-end',
  },
  semanaText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  selectBtnText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  modalFooter: {
    marginTop: 18,
  },
  btnModalOk: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
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
