import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  BackHandler,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { ImportMilitaryResponse, ImportMilitaryRowResult } from '../types';
import {
  X,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  UserCheck,
  FileCheck,
} from 'lucide-react-native';

interface ImportMilitaryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportMilitaryModal: React.FC<ImportMilitaryModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [result, setResult] = useState<ImportMilitaryResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'imported' | 'skipped' | 'errors'>('imported');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSelectedFile(null);
      setAnalyzing(false);
      setImporting(false);
      setResult(null);
      setActiveTab('imported');
      setErrorMessage(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      if (importing) return true;
      onClose();
      return true;
    };
    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [visible, onClose, importing]);

  if (!visible) return null;

  const handlePickDocument = async () => {
    try {
      let DocumentPicker: any;
      try {
        DocumentPicker = require('expo-document-picker');
      } catch (err) {
        Alert.alert(
          'Recurso em Atualização',
          'O seletor de documentos nativo requer compilação do APK atualizado. Para importar planilhas corporativas agora, use a versão Desktop Windows.'
        );
        return;
      }

      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'application/octet-stream',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const fileObj = {
          uri: asset.uri,
          name: asset.name || 'militares.xlsx',
          mimeType: asset.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
        setSelectedFile(fileObj);
        await runAnalysis(fileObj);
      }
    } catch (err: any) {
      console.warn('Erro ao selecionar arquivo:', err);
      Alert.alert('Erro ao Selecionar Arquivo', err?.message || 'Não foi possível selecionar o arquivo.');
    }
  };

  const runAnalysis = async (file: { uri: string; name: string; mimeType?: string }) => {
    setAnalyzing(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      } as any);

      const res = await api.importMilitaryExcel(formData, true);
      setResult(res);
      if (res.imported_count === 0 && res.skipped_count > 0) {
        setActiveTab('skipped');
      } else {
        setActiveTab('imported');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao processar arquivo no servidor.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      } as any);

      const res = await api.importMilitaryExcel(formData, false);
      Alert.alert(
        'Importação Concluída com Sucesso! 🛡️',
        `${res.imported_count} novos militares foram cadastrados no efetivo.\n${res.skipped_count} já cadastrados foram identificados e não repetidos.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao persistir importação.');
      Alert.alert('Erro na Importação', err?.message || 'Ocorreu um erro ao salvar os novos militares.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.surface,
              maxHeight: screenHeight * 0.9,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconBox, { backgroundColor: theme.primary + '18' }]}>
                <FileSpreadsheet size={20} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Importar Planilha Excel</Text>
                <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
                  Identifica e adiciona novos militares sem duplicar
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={importing}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Seletor de Arquivo */}
          <View style={styles.pickerArea}>
            <TouchableOpacity
              style={[
                styles.uploadButton,
                {
                  borderColor: selectedFile ? theme.primary : theme.border,
                  backgroundColor: theme.surfaceVariant,
                },
              ]}
              onPress={handlePickDocument}
              disabled={analyzing || importing}
              activeOpacity={0.7}
            >
              <Upload size={20} color={selectedFile ? theme.primary : theme.textMuted} />
              <View style={styles.fileInfo}>
                <Text
                  style={[
                    styles.uploadText,
                    { color: selectedFile ? theme.primary : theme.text, fontWeight: selectedFile ? '700' : '500' },
                  ]}
                  numberOfLines={1}
                >
                  {selectedFile ? selectedFile.name : 'Toque para selecionar arquivo (.xlsx, .xls, .csv)'}
                </Text>
                <Text style={[styles.uploadSubtext, { color: theme.textMuted }]}>
                  {selectedFile ? 'Toque para trocar de arquivo' : 'Planilha contendo SARAM, Posto, Guerra, Nome...'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Estado de Carregamento / Erro / Resultado */}
          {analyzing ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.analyzingText, { color: theme.text }]}>
                Analisando planilha e verificando duplicidades...
              </Text>
              <Text style={[styles.analyzingSubtext, { color: theme.textMuted }]}>
                Consultando o efetivo para não repetir militares já cadastrados.
              </Text>
            </View>
          ) : errorMessage ? (
            <View style={[styles.errorBox, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
              <AlertTriangle size={24} color="#EF4444" />
              <Text style={styles.errorTitle}>Falha ao Analisar Planilha</Text>
              <Text style={[styles.errorDesc, { color: theme.text }]}>{errorMessage}</Text>
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: theme.primary }]}
                onPress={() => selectedFile && runAnalysis(selectedFile)}
              >
                <RefreshCw size={14} color="#FFFFFF" />
                <Text style={styles.retryBtnText}>Tentar Novamente</Text>
              </TouchableOpacity>
            </View>
          ) : result ? (
            <View style={{ flex: 1 }}>
              {/* KPIs de Resumo */}
              <View style={styles.kpiRow}>
                <TouchableOpacity
                  style={[
                    styles.kpiCard,
                    {
                      borderColor: activeTab === 'imported' ? '#10B981' : theme.border,
                      backgroundColor: activeTab === 'imported' ? '#10B98115' : theme.surfaceVariant,
                    },
                  ]}
                  onPress={() => setActiveTab('imported')}
                >
                  <UserCheck size={16} color="#10B981" />
                  <Text style={[styles.kpiNumber, { color: theme.text }]}>{result.imported_count}</Text>
                  <Text style={[styles.kpiLabel, { color: '#10B981' }]}>Novos a Adicionar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.kpiCard,
                    {
                      borderColor: activeTab === 'skipped' ? '#F59E0B' : theme.border,
                      backgroundColor: activeTab === 'skipped' ? '#F59E0B15' : theme.surfaceVariant,
                    },
                  ]}
                  onPress={() => setActiveTab('skipped')}
                >
                  <ShieldCheck size={16} color="#F59E0B" />
                  <Text style={[styles.kpiNumber, { color: theme.text }]}>{result.skipped_count}</Text>
                  <Text style={[styles.kpiLabel, { color: '#F59E0B' }]}>Já no Sistema</Text>
                </TouchableOpacity>

                {result.error_count > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.kpiCard,
                      {
                        borderColor: activeTab === 'errors' ? '#EF4444' : theme.border,
                        backgroundColor: activeTab === 'errors' ? '#EF444415' : theme.surfaceVariant,
                      },
                    ]}
                    onPress={() => setActiveTab('errors')}
                  >
                    <AlertTriangle size={16} color="#EF4444" />
                    <Text style={[styles.kpiNumber, { color: theme.text }]}>{result.error_count}</Text>
                    <Text style={[styles.kpiLabel, { color: '#EF4444' }]}>Inconsistentes</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Lista Detalhada */}
              <ScrollView style={styles.listArea} contentContainerStyle={{ paddingBottom: 16 }}>
                {activeTab === 'imported' && (
                  <>
                    <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
                      Militares que serão incluídos no efetivo ({result.imported.length}):
                    </Text>
                    {result.imported.length === 0 ? (
                      <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                        Nenhum militar novo a adicionar. Todos os militares da planilha já constam no sistema.
                      </Text>
                    ) : (
                      result.imported.map((item, idx) => (
                        <View key={idx} style={[styles.itemCard, { backgroundColor: theme.surfaceVariant }]}>
                          <View style={styles.itemHeader}>
                            <View style={[styles.saramBadge, { backgroundColor: theme.primary + '20' }]}>
                              <Text style={[styles.saramText, { color: theme.primary }]}>{item.saram}</Text>
                            </View>
                            <Text style={[styles.itemRankName, { color: theme.text }]}>
                              {item.posto_graduacao} {item.nome_guerra}
                            </Text>
                          </View>
                          <Text style={[styles.itemFullName, { color: theme.textMuted }]}>
                            {item.nome_completo}
                            {item.secao ? ` • ${item.secao}` : ''}
                          </Text>
                        </View>
                      ))
                    )}
                  </>
                )}

                {activeTab === 'skipped' && (
                  <>
                    <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
                      Militares já cadastrados no sistema — não serão repetidos ({result.skipped.length}):
                    </Text>
                    {result.skipped.length === 0 ? (
                      <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                        Nenhuma duplicidade detectada.
                      </Text>
                    ) : (
                      result.skipped.map((item, idx) => (
                        <View key={idx} style={[styles.itemCard, { backgroundColor: theme.surfaceVariant }]}>
                          <View style={styles.itemHeader}>
                            <View style={[styles.saramBadge, { backgroundColor: '#F59E0B20' }]}>
                              <Text style={[styles.saramText, { color: '#F59E0B' }]}>{item.saram}</Text>
                            </View>
                            <Text style={[styles.itemRankName, { color: theme.text }]}>
                              {item.posto_graduacao} {item.nome_guerra}
                            </Text>
                          </View>
                          <Text style={[styles.skippedReason, { color: '#F59E0B' }]}>{item.reason}</Text>
                        </View>
                      ))
                    )}
                  </>
                )}

                {activeTab === 'errors' && (
                  <>
                    <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
                      Linhas com inconsistência ({result.errors.length}):
                    </Text>
                    {result.errors.map((item, idx) => (
                      <View key={idx} style={[styles.itemCard, { backgroundColor: '#EF444410' }]}>
                        <Text style={[styles.errorReason, { color: '#EF4444' }]}>
                          Linha {item.row}: {item.reason}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.centerBox}>
              <FileCheck size={48} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Selecione uma Planilha</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                O sistema fará a leitura das colunas e identificará os militares já cadastrados para não criar duplicidades.
              </Text>
            </View>
          )}

          {/* Botões de Ação */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: theme.border }]}
              onPress={onClose}
              disabled={importing}
            >
              <Text style={[styles.cancelBtnText, { color: theme.text }]}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                {
                  backgroundColor:
                    result && result.imported_count > 0 && !importing ? theme.primary : theme.surfaceVariant,
                },
              ]}
              onPress={handleConfirmImport}
              disabled={!result || result.imported_count === 0 || importing}
              activeOpacity={0.8}
            >
              {importing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <CheckCircle2 size={16} color={result && result.imported_count > 0 ? '#FFFFFF' : theme.textMuted} />
                  <Text
                    style={[
                      styles.confirmBtnText,
                      { color: result && result.imported_count > 0 ? '#FFFFFF' : theme.textMuted },
                    ]}
                  >
                    Confirmar ({result?.imported_count || 0} Novos)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    padding: 8,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  pickerArea: {
    marginVertical: 14,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  fileInfo: {
    flex: 1,
  },
  uploadText: {
    fontSize: 13,
  },
  uploadSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  centerBox: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  analyzingSubtext: {
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
  },
  errorBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginVertical: 12,
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  errorDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 6,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 280,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  kpiNumber: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  listArea: {
    flex: 1,
    maxHeight: 280,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  itemCard: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saramBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  saramText: {
    fontSize: 10,
    fontWeight: '700',
  },
  itemRankName: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemFullName: {
    fontSize: 11,
    marginTop: 2,
  },
  skippedReason: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  errorReason: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    marginTop: 6,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
