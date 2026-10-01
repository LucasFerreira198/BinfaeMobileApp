import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  BackHandler,
  Linking,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { useTheme } from '../context/ThemeContext';
import { DownloadCloud, CheckCircle2, AlertCircle, X, ExternalLink } from 'lucide-react-native';

const CURRENT_VERSION = '1.0.0';
const GITHUB_REPO = 'LucasFerreira198/BinfaeMobileApp';

interface UpdateModalProps {
  visible: boolean;
  onClose: () => void;
  manualTrigger?: boolean;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  visible,
  onClose,
  manualTrigger = false,
}) => {
  const { theme } = useTheme();

  const [checking, setChecking] = useState<boolean>(true);
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [latestVersion, setLatestVersion] = useState<string>(CURRENT_VERSION);
  const [releaseNotes, setReleaseNotes] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadComplete, setDownloadComplete] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Android Back Button handler
  useEffect(() => {
    if (!visible) return;
    const backAction = () => {
      if (!isDownloading) {
        onClose();
      }
      return true;
    };
    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [visible, onClose, isDownloading]);

  useEffect(() => {
    if (visible) {
      checkForUpdates();
    }
  }, [visible]);

  const checkForUpdates = async () => {
    setChecking(true);
    setErrorMsg(null);
    setDownloadProgress(0);
    setDownloadComplete(false);

    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: { 'Accept': 'application/vnd.github.v3+json' },
      });

      if (!res.ok) {
        if (res.status === 404) {
          setUpdateAvailable(false);
          setChecking(false);
          return;
        }
        throw new Error('Falha ao verificar atualizações no GitHub.');
      }

      const data = await res.json();
      const tagName = (data.tag_name || '').replace(/^v/, '').trim();
      setLatestVersion(tagName);
      setReleaseNotes(data.body || 'Correções e melhorias de desempenho.');

      // Procura asset .apk nos releases
      let apkAsset = (data.assets || []).find((a: any) =>
        a.name && a.name.toLowerCase().endsWith('.apk')
      );

      if (apkAsset && apkAsset.browser_download_url) {
        setDownloadUrl(apkAsset.browser_download_url);
      } else {
        // Fallback: URL direta de releases
        setDownloadUrl(data.html_url);
      }

      // Comparação simples de versão
      if (tagName && tagName !== CURRENT_VERSION) {
        setUpdateAvailable(true);
      } else {
        setUpdateAvailable(false);
      }
    } catch (err: any) {
      console.warn('Erro ao checar atualizações:', err);
      setErrorMsg(err.message || 'Não foi possível buscar a versão mais recente.');
    } finally {
      setChecking(false);
    }
  };

  const handleDownloadAndInstall = async () => {
    if (!downloadUrl) return;

    // Se for URL web em vez de arquivo .apk direto, abre no navegador
    if (!downloadUrl.endsWith('.apk')) {
      Linking.openURL(downloadUrl);
      onClose();
      return;
    }

    if (Platform.OS !== 'android') {
      Linking.openURL(downloadUrl);
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const localApkPath = `${FileSystem.documentDirectory}binfae-update.apk`;

      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        localApkPath,
        {},
        (progress) => {
          if (progress.totalBytesExpectedToWrite > 0) {
            const pct = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
            setDownloadProgress(Math.min(pct, 1));
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result || !result.uri) {
        throw new Error('Download do instalador falhou.');
      }

      setDownloadComplete(true);
      setIsDownloading(false);

      // Converte URI para content:// compatível com Android PackageInstaller
      const contentUri = await FileSystem.getContentUriAsync(result.uri);

      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/vnd.android.package-archive',
      });

      onClose();
    } catch (err: any) {
      console.warn('Erro na instalação:', err);
      setIsDownloading(false);
      Alert.alert(
        'Erro na instalação automática',
        'Deseja abrir o arquivo pelo navegador para instalar manualmente?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir no Navegador', onPress: () => Linking.openURL(downloadUrl) },
        ]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.topRow}>
            <View style={[styles.iconWrap, { backgroundColor: theme.badgeBg }]}>
              <DownloadCloud size={24} color={theme.primary} />
            </View>
            {!isDownloading && (
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: theme.surfaceVariant }]}
              >
                <X size={18} color={theme.text} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Atualização do Aplicativo</Text>
          <Text style={[styles.versionLabel, { color: theme.textSecondary }]}>
            Versão instalada: <Text style={{ fontWeight: '700', color: theme.text }}>v{CURRENT_VERSION}</Text>
          </Text>

          {checking ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                Verificando novas versões...
              </Text>
            </View>
          ) : errorMsg ? (
            <View style={styles.centerBox}>
              <AlertCircle size={32} color={theme.danger} />
              <Text style={[styles.errorText, { color: theme.danger }]}>{errorMsg}</Text>
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: theme.surfaceVariant }]}
                onPress={checkForUpdates}
              >
                <Text style={[styles.retryText, { color: theme.text }]}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : updateAvailable ? (
            <View style={styles.contentBox}>
              <View style={[styles.newVersionBadge, { backgroundColor: theme.successBg }]}>
                <CheckCircle2 size={16} color={theme.success} />
                <Text style={[styles.newVersionText, { color: theme.success }]}>
                  Nova versão disponível: v{latestVersion}
                </Text>
              </View>

              <Text style={[styles.notesTitle, { color: theme.text }]}>Novidades:</Text>
              <Text style={[styles.notesBody, { color: theme.textSecondary }]} numberOfLines={4}>
                {releaseNotes}
              </Text>

              {isDownloading ? (
                <View style={styles.progressWrap}>
                  <Text style={[styles.progressText, { color: theme.text }]}>
                    Baixando atualização... {Math.round(downloadProgress * 100)}%
                  </Text>
                  <View style={[styles.progressBarBg, { backgroundColor: theme.surfaceVariant }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          backgroundColor: theme.primary,
                          width: `${Math.round(downloadProgress * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.installBtn, { backgroundColor: theme.primary }]}
                  onPress={handleDownloadAndInstall}
                >
                  <DownloadCloud size={18} color="#FFFFFF" />
                  <Text style={styles.installBtnText}>Baixar e Atualizar Agora</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.centerBox}>
              <CheckCircle2 size={36} color={theme.success} />
              <Text style={[styles.uptodateTitle, { color: theme.text }]}>
                Você está na versão mais recente!
              </Text>
              <Text style={[styles.uptodateSub, { color: theme.textMuted }]}>
                O aplicativo Binfae Mobile já possui todas as melhorias e correções.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  versionLabel: {
    fontSize: 13,
    marginBottom: 16,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  statusText: {
    fontSize: 13,
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  contentBox: {
    gap: 12,
  },
  newVersionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newVersionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  notesBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  progressWrap: {
    marginTop: 10,
    gap: 8,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  installBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  installBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  uptodateTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  uptodateSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});
