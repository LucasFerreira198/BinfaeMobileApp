import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { PureQrCode } from './PureQrCode';
import { Item, ItemMovement } from '../types';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';
import { ErrorBoundary } from './ErrorBoundary';
import { formatDateTime } from '../utils/date';
import {
  X,
  MapPin,
  Folder,
  Layers,
  ArrowRightLeft,
  Info,
  FileText,
  History,
  User,
  QrCode,
  Printer,
  Share2,
  ShieldCheck,
} from 'lucide-react-native';

interface ItemDetailModalProps {
  item: Item | null;
  visible: boolean;
  onClose: () => void;
  onOpenMovement: (item: Item) => void;
}

/**
 * Gera string SVG pura e autocontida para impressão de etiqueta
 * sem qualquer dependência de Node.js (fs/stream/canvas).
 */
const generateQrSvgString = (payload: string): string => {
  try {
    let QRCodeCore: any;
    try {
      QRCodeCore = require('qrcode/lib/core/qrcode');
    } catch {
      QRCodeCore = require('qrcode');
    }
    const safePayload = (payload ? String(payload).trim() : '') || 'BINFAE';
    const qrData = QRCodeCore.create(safePayload, { errorCorrectionLevel: 'M' });
    const size = qrData.modules.size;
    const data = qrData.modules.data;
    let rects = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (data[r * size + c]) {
          rects += `<rect x="${c}" y="${r}" width="1" height="1" fill="#000000"/>`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="100%" height="100%"><rect width="${size}" height="${size}" fill="#FFFFFF"/>${rects}</svg>`;
  } catch (err) {
    console.warn('Erro ao gerar SVG puro do QR Code:', err);
    return '';
  }
};

const ItemDetailModalContent: React.FC<ItemDetailModalProps> = ({
  item,
  visible,
  onClose,
  onOpenMovement,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'qrcode'>('info');
  const [historyMovements, setHistoryMovements] = useState<ItemMovement[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Tratamento nativo do botão Voltar do Android
  useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [visible, onClose]);

  // Carrega histórico específico do item ao abrir ou alternar de aba
  useEffect(() => {
    if (visible && item) {
      setActiveTab('info');
      loadItemHistory(item.id);
    }
  }, [visible, item]);

  const loadItemHistory = async (itemId: number) => {
    setLoadingHistory(true);
    try {
      const movements = await api.fetchMovements(itemId);
      setHistoryMovements(Array.isArray(movements) ? movements : []);
    } catch (err) {
      console.warn('Erro ao carregar histórico do material:', err);
      setHistoryMovements([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!item) return null;

  const locationPath = item.local?.caminho_completo || item.local?.nome || 'Não definido';
  const subCategory = item.subgrupo?.nome || 'Geral';
  const itemStatus = item.status || 'DISPONIVEL';
  const itemQty = item.quantidade !== undefined && item.quantidade !== null ? item.quantidade : 0;
  const itemUnit = item.unidade_medida || 'UNIDADE';
  const itemCondition = item.estado_conservacao || 'BOM';
  const itemControl = item.tipo_controle || 'UNITARIO';
  const itemMinQty = item.quantidade_minima !== undefined && item.quantidade_minima !== null ? item.quantidade_minima : 0;

  const getMovementBadge = (tipo: string) => {
    switch (tipo) {
      case 'CAUTELA':
        return { label: 'Cautela', color: theme.warning, bg: theme.warningBg };
      case 'DEVOLUCAO':
        return { label: 'Devolução', color: theme.success, bg: theme.successBg };
      case 'TRANSFERENCIA':
        return { label: 'Transferência', color: theme.primary, bg: theme.badgeBg };
      case 'MANUTENCAO':
        return { label: 'Manutenção', color: theme.danger, bg: theme.dangerBg };
      default:
        return { label: tipo, color: theme.info, bg: theme.infoBg };
    }
  };

  const formatDate = (dateStr?: string) => {
    return formatDateTime(dateStr);
  };

  const qrPayload = item ? (item.uuid ? `BINFAE:ITEM:${item.uuid}` : `BINFAE:ITEM:${item.id}`) : '';

  const generateLabelHtml = async (): Promise<string> => {
    if (!item) return '';

    const qrSvg = generateQrSvgString(qrPayload);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page {
            size: 100mm 60mm;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 5mm;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
            background: #ffffff;
            box-sizing: border-box;
          }
          .label-border {
            border: 2px solid #000000;
            border-radius: 6px;
            padding: 4mm;
            height: calc(100% - 8mm);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            border-bottom: 1.5px solid #000000;
            padding-bottom: 2mm;
            margin-bottom: 3mm;
          }
          .fab-title {
            font-size: 11pt;
            font-weight: 900;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .fab-sub {
            font-size: 7.5pt;
            font-weight: 700;
            color: #374151;
            margin-top: 1mm;
          }
          .body-content {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 4mm;
            flex: 1;
          }
          .qr-box {
            width: 32mm;
            height: 32mm;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .qr-box svg {
            width: 100%;
            height: 100%;
          }
          .info-box {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 1.5mm;
            font-size: 8.5pt;
          }
          .mat-name {
            font-size: 10pt;
            font-weight: 900;
            line-height: 1.2;
            text-transform: uppercase;
            margin-bottom: 1mm;
          }
          .prop-row {
            display: flex;
            gap: 2mm;
          }
          .prop-label {
            font-weight: 700;
            color: #4b5563;
          }
          .prop-val {
            font-weight: 800;
            color: #000000;
          }
          .footer {
            border-top: 1px solid #9ca3af;
            padding-top: 1.5mm;
            margin-top: 2mm;
            display: flex;
            justify-content: space-between;
            font-size: 6.5pt;
            color: #4b5563;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="label-border">
          <div class="header">
            <div class="fab-title">FORÇA AÉREA BRASILEIRA • BINF-AE</div>
            <div class="fab-sub">SISTEMA DE CONTROLE DE MATERIAL & PATRIMÔNIO</div>
          </div>
          <div class="body-content">
            <div class="qr-box">
              ${qrSvg}
            </div>
            <div class="info-box">
              <div class="mat-name">${item.nome}</div>
              ${Boolean(item.bmp) ? `<div class="prop-row"><span class="prop-label">BMP:</span><span class="prop-val">${item.bmp}</span></div>` : ''}
              ${Boolean(item.codigo_interno) ? `<div class="prop-row"><span class="prop-label">CÓDIGO:</span><span class="prop-val">${item.codigo_interno}</span></div>` : ''}
              ${Boolean(item.numero_serie) ? `<div class="prop-row"><span class="prop-label">SÉRIE:</span><span class="prop-val">${item.numero_serie}</span></div>` : ''}
              <div class="prop-row"><span class="prop-label">LOCAL:</span><span class="prop-val">${locationPath}</span></div>
              <div class="prop-row"><span class="prop-label">GRUPO:</span><span class="prop-val">${item.subgrupo?.grupo?.nome || item.subgrupo?.nome || 'GERAL'}</span></div>
            </div>
          </div>
          <div class="footer">
            <span>PATRIMÔNIO MILITAR CONTROLADO</span>
            <span>ID: #${item.id} • ${new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const html = await generateLabelHtml();
      await Print.printAsync({ html });
    } catch (err: any) {
      if (err.message && !err.message.includes('canceled') && !err.message.includes('cancelled')) {
        Alert.alert('Erro ao Imprimir', err.message || 'Não foi possível imprimir o QR Code.');
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSharePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const html = await generateLabelHtml();
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Etiqueta QR Code - ${item?.bmp || item?.codigo_interno || item?.id}`,
      });
    } catch (err: any) {
      if (err.message && !err.message.includes('canceled') && !err.message.includes('cancelled')) {
        Alert.alert('Erro ao Gerar PDF', err.message || 'Não foi possível gerar o arquivo PDF.');
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
                {item.nome}
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                ID #{item.id} {Boolean(item.bmp) ? `• BMP ${item.bmp}` : ''}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.surfaceVariant }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {item.cautela_ativa ? (
            <View style={[styles.cautelaAlertCard, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.4)' }]}>
              <View style={styles.cautelaAlertHeader}>
                <ShieldCheck size={16} color="#D97706" />
                <Text style={styles.cautelaAlertTitle}>
                  MATERIAL EM CAUTELA ATIVA ({item.cautela_ativa.tipo === 'MISSAO' ? 'Missão Operacional' : 'Cautela Fixa'})
                </Text>
              </View>
              <Text style={[styles.cautelaAlertMission, { color: theme.text }]}>
                Missão: {item.cautela_ativa.missao_nome}
              </Text>
              <Text style={[styles.cautelaAlertMilitar, { color: theme.textSecondary }]}>
                Responsável: {item.cautela_ativa.militar_posto_graduacao} {item.cautela_ativa.militar_nome_guerra} (SARAM {item.cautela_ativa.militar_responsavel_saram})
              </Text>
              {item.cautela_ativa.militar_celular ? (
                <Text style={[styles.cautelaAlertPhone, { color: theme.success }]}>
                  Telefone: {item.cautela_ativa.militar_celular}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Abas Superiores: Informações vs Histórico Específico vs QR Code */}
          <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'info' && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => setActiveTab('info')}
            >
              <Info size={16} color={activeTab === 'info' ? theme.primary : theme.textMuted} />
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color: activeTab === 'info' ? theme.primary : theme.textMuted,
                    fontWeight: activeTab === 'info' ? '700' : '500',
                  },
                ]}
              >
                Detalhes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'history' && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => {
                setActiveTab('history');
                loadItemHistory(item.id);
              }}
            >
              <History size={16} color={activeTab === 'history' ? theme.primary : theme.textMuted} />
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color: activeTab === 'history' ? theme.primary : theme.textMuted,
                    fontWeight: activeTab === 'history' ? '700' : '500',
                  },
                ]}
              >
                Histórico ({historyMovements.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'qrcode' && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => setActiveTab('qrcode')}
            >
              <QrCode size={16} color={activeTab === 'qrcode' ? theme.primary : theme.textMuted} />
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color: activeTab === 'qrcode' ? theme.primary : theme.textMuted,
                    fontWeight: activeTab === 'qrcode' ? '700' : '500',
                  },
                ]}
              >
                QR Code
              </Text>
            </TouchableOpacity>
          </View>

          {/* Conteúdo da Aba */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'info' ? (
              <>
                {/* Cartão de Título e Status */}
                <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.badgeRow}>
                    {Boolean(item.bmp) ? (
                      <View style={[styles.pill, { backgroundColor: theme.badgeBg }]}>
                        <Text style={[styles.pillText, { color: theme.primary }]}>
                          BMP {item.bmp}
                        </Text>
                      </View>
                    ) : null}
                    {Boolean(item.codigo_interno) ? (
                      <View style={[styles.pill, { backgroundColor: theme.surfaceVariant }]}>
                        <Text style={[styles.pillText, { color: theme.textSecondary }]}>
                          CÓD: {item.codigo_interno}
                        </Text>
                      </View>
                    ) : null}
                    <View style={[styles.pill, { backgroundColor: theme.infoBg }]}>
                      <Text style={[styles.pillText, { color: theme.info }]}>
                        {itemStatus}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.itemName, { color: theme.text }]}>
                    {item.nome || 'Sem identificação'}
                  </Text>
                </View>

                {/* Grid de Especificações */}
                <View style={[styles.specGrid, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: theme.textMuted }]}>Saldo Atual</Text>
                    <Text style={[styles.gridValue, { color: theme.text }]}>
                      {itemQty} {itemUnit}
                    </Text>
                  </View>

                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: theme.textMuted }]}>Conservação</Text>
                    <Text style={[styles.gridValue, { color: theme.text }]}>
                      {itemCondition}
                    </Text>
                  </View>

                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: theme.textMuted }]}>Controle</Text>
                    <Text style={[styles.gridValue, { color: theme.text }]}>
                      {itemControl}
                    </Text>
                  </View>

                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: theme.textMuted }]}>Estoque Mínimo</Text>
                    <Text style={[styles.gridValue, { color: theme.text }]}>
                      {itemMinQty} {itemUnit}
                    </Text>
                  </View>
                </View>

                {/* Localização e Subgrupo */}
                <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.sectionRow}>
                    <MapPin size={18} color={theme.primary} />
                    <View style={styles.sectionInfo}>
                      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Local Físico</Text>
                      <Text style={[styles.sectionValue, { color: theme.text }]}>{locationPath}</Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: theme.border }]} />

                  <View style={styles.sectionRow}>
                    <Folder size={18} color={theme.accent} />
                    <View style={styles.sectionInfo}>
                      <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Categoria / Subgrupo</Text>
                      <Text style={[styles.sectionValue, { color: theme.text }]}>{subCategory}</Text>
                    </View>
                  </View>

                  {Boolean(item.numero_serie) ? (
                    <>
                      <View style={[styles.divider, { backgroundColor: theme.border }]} />
                      <View style={styles.sectionRow}>
                        <FileText size={18} color={theme.textMuted} />
                        <View style={styles.sectionInfo}>
                          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Número de Série</Text>
                          <Text style={[styles.sectionValue, { color: theme.text }]}>{item.numero_serie}</Text>
                        </View>
                      </View>
                    </>
                  ) : null}
                </View>

                {/* Observações */}
                {Boolean(item.observacoes) ? (
                  <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.sectionRow}>
                      <Info size={18} color={theme.info} />
                      <View style={styles.sectionInfo}>
                        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Observações</Text>
                        <Text style={[styles.sectionValue, { color: theme.text }]}>{item.observacoes}</Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                {/* Componentes Instalados */}
                {Array.isArray(item.componentes) && item.componentes.length > 0 ? (
                  <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.sectionRow}>
                      <Layers size={18} color={theme.warning} />
                      <View style={styles.sectionInfo}>
                        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
                          Componentes Instalados ({item.componentes.length})
                        </Text>
                        {item.componentes.map((c: any, index: number) => {
                          if (!c) return null;
                          const name = typeof c === 'string' ? c : (c.nome || 'Componente');
                          const bmp = typeof c === 'object' && c.bmp ? ` (BMP: ${c.bmp})` : '';
                          const key = (typeof c === 'object' && c.id) ? c.id.toString() : index.toString();
                          return (
                            <Text key={key} style={[styles.subComponentText, { color: theme.text }]}>
                              • {name}{bmp}
                            </Text>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                ) : null}
              </>
            ) : activeTab === 'history' ? (
              /* Aba de Histórico Específico */
              <View style={styles.historyContainer}>
                {loadingHistory ? (
                  <View style={styles.centerLoading}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                      Carregando histórico deste material...
                    </Text>
                  </View>
                ) : historyMovements.length === 0 ? (
                  <View style={styles.emptyHistory}>
                    <History size={36} color={theme.textMuted} />
                    <Text style={[styles.emptyHistoryTitle, { color: theme.text }]}>
                      Sem movimentações registradas
                    </Text>
                    <Text style={[styles.emptyHistorySub, { color: theme.textMuted }]}>
                      As cautelas, devoluções e transferências deste item aparecerão aqui.
                    </Text>
                  </View>
                ) : (
                  historyMovements.map((m, index) => {
                    const badge = getMovementBadge(m.tipo_movimentacao);
                    return (
                      <View
                        key={m.id ? m.id.toString() : index.toString()}
                        style={[
                          styles.historyCard,
                          { backgroundColor: theme.card, borderColor: theme.border },
                        ]}
                      >
                        <View style={styles.historyTopRow}>
                          <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.typeText, { color: badge.color }]}>
                              {badge.label}
                            </Text>
                          </View>
                          <Text style={[styles.historyDate, { color: theme.textMuted }]}>
                            {formatDate(m.data_hora || m.criado_em)}
                          </Text>
                        </View>

                        {Boolean(m.motivo) ? (
                          <Text style={[styles.historyReason, { color: theme.text }]}>
                            "{m.motivo}"
                          </Text>
                        ) : null}

                        <View style={styles.historyBottomRow}>
                          <View style={styles.historyUserWrap}>
                            <User size={12} color={theme.textMuted} />
                            <Text style={[styles.historyUser, { color: theme.textSecondary }]}>
                              {m.usuario_nome || 'Operador'}
                            </Text>
                          </View>
                          <Text style={[styles.historyQty, { color: theme.text }]}>
                            Qtd: {m.quantidade_movimentada}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            ) : (
              /* Aba de QR Code & Etiqueta */
              <View style={styles.qrContainer}>
                {/* Visualizador do QR Code Nativo Puro */}
                <View
                  style={[
                    styles.qrCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <View style={styles.qrCodeWrapper}>
                    <PureQrCode
                      value={qrPayload || `BINFAE:${item.id}`}
                      size={200}
                      color="#000000"
                      backgroundColor="#FFFFFF"
                    />
                  </View>
                  <Text style={[styles.qrPayloadText, { color: theme.textSecondary }]}>
                    {qrPayload || `BINFAE:${item.id}`}
                  </Text>
                </View>

                {/* Resumo Patrimonial */}
                <View
                  style={[
                    styles.qrInfoCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.qrInfoHeader, { color: theme.primary }]}>
                    ETIQUETA PATRIMONIAL MILITAR
                  </Text>
                  <View style={styles.qrDetailRow}>
                    <Text style={[styles.qrDetailLabel, { color: theme.textMuted }]}>
                      Material:
                    </Text>
                    <Text style={[styles.qrDetailValue, { color: theme.text }]}>
                      {item.nome}
                    </Text>
                  </View>
                  {Boolean(item.bmp) ? (
                    <View style={styles.qrDetailRow}>
                      <Text style={[styles.qrDetailLabel, { color: theme.textMuted }]}>
                        BMP:
                      </Text>
                      <Text style={[styles.qrDetailValue, { color: theme.text }]}>
                        {item.bmp}
                      </Text>
                    </View>
                  ) : null}
                  {Boolean(item.codigo_interno) ? (
                    <View style={styles.qrDetailRow}>
                      <Text style={[styles.qrDetailLabel, { color: theme.textMuted }]}>
                        Código:
                      </Text>
                      <Text style={[styles.qrDetailValue, { color: theme.text }]}>
                        {item.codigo_interno}
                      </Text>
                    </View>
                  ) : null}
                  {Boolean(item.numero_serie) ? (
                    <View style={styles.qrDetailRow}>
                      <Text style={[styles.qrDetailLabel, { color: theme.textMuted }]}>
                        Série:
                      </Text>
                      <Text style={[styles.qrDetailValue, { color: theme.text }]}>
                        {item.numero_serie}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.qrDetailRow}>
                    <Text style={[styles.qrDetailLabel, { color: theme.textMuted }]}>
                      Local:
                    </Text>
                    <Text style={[styles.qrDetailValue, { color: theme.text }]}>
                      {locationPath}
                    </Text>
                  </View>
                </View>

                {/* Botões de Ação: Imprimir e Baixar PDF */}
                <View style={styles.qrActionButtons}>
                  <TouchableOpacity
                    style={[styles.qrBtn, { backgroundColor: theme.primary }]}
                    onPress={handlePrint}
                    disabled={isPrinting}
                    activeOpacity={0.8}
                  >
                    {isPrinting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Printer size={18} color="#FFFFFF" />
                        <Text style={styles.qrBtnText}>Imprimir Etiqueta</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.qrBtn,
                      {
                        backgroundColor: theme.surfaceVariant,
                        borderColor: theme.border,
                        borderWidth: 1,
                      },
                    ]}
                    onPress={handleSharePdf}
                    disabled={isGeneratingPdf}
                    activeOpacity={0.8}
                  >
                    {isGeneratingPdf ? (
                      <ActivityIndicator size="small" color={theme.text} />
                    ) : (
                      <>
                        <Share2 size={18} color={theme.text} />
                        <Text style={[styles.qrBtnText, { color: theme.text }]}>
                          Baixar / Compartilhar PDF
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Rodapé com botão de Transferência e Safe Area Padding adequado */}
          <View
            style={[
              styles.footer,
              {
                backgroundColor: theme.surface,
                borderTopColor: theme.border,
                paddingBottom: Math.max(insets.bottom, 16) + 12,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.moveButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                onClose();
                onOpenMovement(item);
              }}
              activeOpacity={0.8}
            >
              <ArrowRightLeft size={18} color="#FFFFFF" />
              <Text style={styles.moveButtonText}>Transferir Local</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const ItemDetailModal: React.FC<ItemDetailModalProps> = (props) => {
  if (!props.visible || !props.item) return null;

  return (
    <ErrorBoundary
      fallbackMessage="Não foi possível exibir os detalhes deste material."
      onReset={props.onClose}
    >
      <ItemDetailModalContent {...props} />
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  titleWrap: {
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
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
  tabBtnText: {
    fontSize: 13,
  },
  body: {
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingVertical: 14,
    gap: 12,
  },
  infoCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemName: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  gridItem: {
    width: '50%',
    padding: 6,
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  sectionValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  subComponentText: {
    fontSize: 12,
    marginTop: 4,
  },
  historyContainer: {
    gap: 10,
  },
  centerLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyHistoryTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyHistorySub: {
    fontSize: 12,
    textAlign: 'center',
  },
  historyCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  historyDate: {
    fontSize: 11,
  },
  historyReason: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  historyBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  historyUserWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyUser: {
    fontSize: 11,
  },
  historyQty: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  moveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  moveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  qrContainer: {
    gap: 14,
    paddingBottom: 10,
  },
  qrCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  qrCodeWrapper: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  qrPayloadText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  qrInfoCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  qrInfoHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  qrDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrDetailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  qrDetailValue: {
    fontSize: 13,
    fontWeight: '700',
    maxWidth: '70%',
    textAlign: 'right',
  },
  qrActionButtons: {
    gap: 10,
    marginTop: 4,
  },
  qrBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  qrBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cautelaAlertCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 4,
  },
  cautelaAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  cautelaAlertTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  cautelaAlertMission: {
    fontSize: 13,
    fontWeight: '700',
  },
  cautelaAlertMilitar: {
    fontSize: 11.5,
  },
  cautelaAlertPhone: {
    fontSize: 11.5,
    fontWeight: '600',
  },
});
