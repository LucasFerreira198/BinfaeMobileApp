import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useStock } from '../context/StockContext';
import { api } from '../api/client';
import { ItemDetailModal } from '../components/ItemDetailModal';
import { MovementModal } from '../components/MovementModal';
import { Item } from '../types';
import { Flashlight, RefreshCw, QrCode, AlertTriangle } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const SCANNER_SIZE = width * 0.72;

export const ScannerScreen: React.FC = () => {
  const { theme } = useTheme();
  const { allItems, syncData } = useStock();
  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState<boolean>(false);
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [matchedItem, setMatchedItem] = useState<Item | null>(null);
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const [movementVisible, setMovementVisible] = useState<boolean>(false);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const cleanData = data.trim();

    // 1. Tenta identificar se o payload é JSON (padrão de etiquetas QR do sistema)
    let searchBmp = cleanData;
    let searchId: number | null = null;
    let searchCode = cleanData;

    try {
      const parsed = JSON.parse(cleanData);
      if (parsed.bmp) searchBmp = parsed.bmp.toString();
      if (parsed.id) searchId = Number(parsed.id);
      if (parsed.codigo) searchCode = parsed.codigo.toString();
    } catch {
      // String simples (ex: número de BMP ou serial digitado no leitor)
    }

    // 2. Procura em 0ms no banco em memória local
    const found = allItems.find((item) => {
      if (searchId !== null && item.id === searchId) return true;
      if (item.bmp && item.bmp.toLowerCase() === searchBmp.toLowerCase()) return true;
      if (item.numero_serie && item.numero_serie.toLowerCase() === cleanData.toLowerCase()) return true;
      if (item.codigo_interno && item.codigo_interno.toLowerCase() === searchCode.toLowerCase()) return true;
      return false;
    });

    // 3. Checa se o material está sob cautela ativa
    try {
      const cautelaStatus = await api.checkItemCautelaStatus(cleanData);
      if (cautelaStatus && cautelaStatus.cautelado) {
        const c = cautelaStatus.cautela;
        const mil = cautelaStatus.militar || c?.militar || (cautelaStatus as any).militar_responsavel;
        const itemObj = cautelaStatus.item || found;
        const itemName = itemObj?.nome || cleanData;
        const missaoNome = c?.nome || (cautelaStatus as any).missao_nome || 'Cautela Ativa';
        const missaoTipo = c?.tipo === 'FIXA' ? 'Cautela Fixa' : 'Missão Operacional';
        const milNome = mil ? `${mil.posto_graduacao || ''} ${mil.nome_guerra || mil.nome_completo || ''}`.trim() : 'Militar Responsável';
        const milSaram = cautelaStatus.militar_saram || mil?.saram || 'N/A';
        const milFone = cautelaStatus.telefone_contato || mil?.celular || mil?.telefone;

        Alert.alert(
          'Material Cautelado Identificado',
          `Material: ${itemName}\n` +
          `Missão / Cautela: ${missaoNome} (${missaoTipo})\n` +
          `Responsável: ${milNome} (SARAM ${milSaram})\n` +
          (milFone ? `Telefone: ${milFone}\n\n` : '\n') +
          'Deseja realizar a devolução deste material agora?',
          [
            {
              text: 'Ver Detalhes',
              style: 'cancel',
              onPress: () => {
                if (found) {
                  setMatchedItem(found);
                  setDetailVisible(true);
                } else {
                  setScanned(false);
                }
              },
            },
            {
              text: 'Confirmar Devolução',
              style: 'default',
              onPress: async () => {
                try {
                  await api.scanDevolverItem(cleanData);
                  await syncData();
                  try {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  } catch {}
                  Alert.alert('Sucesso', `Material "${itemName}" devolvido com sucesso! Status atualizado para DISPONÍVEL.`, [
                    { text: 'OK', onPress: () => setScanned(false) },
                  ]);
                } catch (err: any) {
                  Alert.alert('Erro', err.message || 'Falha ao devolver material.', [
                    { text: 'OK', onPress: () => setScanned(false) },
                  ]);
                }
              },
            },
          ]
        );
        return;
      }
    } catch (_) {}

    if (found) {
      setMatchedItem(found);
      setDetailVisible(true);
    } else {
      Alert.alert(
        'Material não encontrado',
        `Nenhum material cadastrado com o código/BMP: "${cleanData}".`,
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    }
  };

  if (!permission) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.permText, { color: theme.textSecondary }]}>
          Carregando permissões da câmera...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.permIconWrap, { backgroundColor: theme.warningBg }]}>
          <AlertTriangle size={36} color={theme.warning} />
        </View>
        <Text style={[styles.permTitle, { color: theme.text }]}>Acesso à Câmera Necessário</Text>
        <Text style={[styles.permDesc, { color: theme.textSecondary }]}>
          Para ler etiquetas e QR Codes dos materiais patrimoniais, o aplicativo precisa de acesso à câmera do seu dispositivo.
        </Text>
        <TouchableOpacity
          style={[styles.permButton, { backgroundColor: theme.primary }]}
          onPress={requestPermission}
        >
          <Text style={styles.permButtonText}>Conceder Permissão</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        enableTorch={torchEnabled}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'pdf417'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* Máscara de foco escurecida */}
      <View style={styles.overlay}>
        <View style={styles.topMask}>
          <Text style={styles.instructionText}>
            Aponte a câmera para o QR Code ou Código de Barras
          </Text>
        </View>

        <View style={styles.centerRow}>
          <View style={styles.sideMask} />
          <View style={styles.scannerBox}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.sideMask} />
        </View>

        <View style={styles.bottomMask}>
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => setTorchEnabled(!torchEnabled)}
            >
              <Flashlight size={22} color={torchEnabled ? '#FBBF24' : '#FFFFFF'} />
              <Text style={styles.controlText}>
                {torchEnabled ? 'Lanterna Ligada' : 'Lanterna'}
              </Text>
            </TouchableOpacity>

            {scanned && (
              <TouchableOpacity
                style={[styles.controlBtn, styles.rescanBtn]}
                onPress={() => setScanned(false)}
              >
                <RefreshCw size={22} color="#FFFFFF" />
                <Text style={styles.controlText}>Escanear Novamente</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Modal de Detalhes do item escaneado */}
      <ItemDetailModal
        item={matchedItem}
        visible={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setScanned(false);
        }}
        onOpenMovement={(item) => {
          setDetailVisible(false);
          setMovementVisible(true);
        }}
      />

      {/* Modal de Movimentação do item escaneado */}
      <MovementModal
        item={matchedItem}
        visible={movementVisible}
        onClose={() => {
          setMovementVisible(false);
          setScanned(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  permDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  permButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  permText: {
    fontSize: 14,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  topMask: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  centerRow: {
    flexDirection: 'row',
    height: SCANNER_SIZE,
  },
  sideMask: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scannerBox: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#6366F1',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  bottomMask: {
    flex: 1.2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  rescanBtn: {
    backgroundColor: '#6366F1',
  },
  controlText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
