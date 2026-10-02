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
import { DownloadCloud, CheckCircle2, AlertCircle, X, ShieldAlert } from 'lucide-react-native';

export const CURRENT_VERSION = '1.2.0';
const GITHUB_REPO = 'LucasFerreira198/BinfaeMobileApp';

/**
 * Compara duas versões no formato semver (ex: "1.1.0" vs "1.0.0")
 * Retorna:
 *   1 se v1 > v2 (nova versão disponível)
 *  -1 se v1 < v2
 *   0 se v1 == v2
 */
export const compareVersions = (v1: string, v2: string): number => {
  const clean1 = (v1 || '').replace(/^v/i, '').trim();
  const clean2 = (v2 || '').replace(/^v/i, '').trim();

  const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);

  const len = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < len; i++) {
    const p1 = parts1[i] ?? 0;
    const p2 = parts2[i] ?? 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};

interface UpdateModalProps {
  visible: boolean;
  onClose: () => void;
  manualTrigger?: boolean;
  isMandatory?: boolean;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  visible,
  onClose,
  manualTrigger = false,
  isMandatory = false,
}) => {
  const { theme } = useTheme();

  const [checking, setChecking] = useState<boolean>(true);
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [latestVersion, setLatestVersion] = useState<string>(CURRENT_VERSION);
  const [releaseNotes, setReleaseNotes] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Android Back Button handler
  useEffect(() => {
    if (!visible) return;

    const backAction = () => {
      if (isDownloading) return true;

      if (isMandatory && updateAvailable) {
        Alert.alert(
          'Atualização Obrigatória',
          'Esta versão é necessária para compatibilidade com o sistema. Por favor, atualize o aplicativo para continuar.',
          [{ text: 'Entendi', style: 'default' }]
        );
        return true; // Bloqueia o fechamento
      }

      onClose();
      return true;
    };

    const handler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => handler.remove();
  }, [visible, onClose, isDownloading, isMandatory, updateAvailable]);

  useEffect(() => {
    if (visible) {
      checkForUpdates();
    }
  }, [visible]);

  const checkForUpdates = async () => {
    setChecking(true);
    setErrorMsg(null);
    setDownloadProgress(0);

    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });

      if (!res.ok) {
        if (res.status === 404) {
          setUpdateAvailable(false);
          setChecking(false);
          return;
        }
        throw new Error('Falha ao verificar atualizações no servidor.');
      }

      const data = await res.json();
      const rawTag = (data.tag_name || '').trim();
      const rawName = (data.name || '').trim();
      const rawBody = (data.body || '').trim();

      // Procura formato semver (ex: v1.1.0 ou 1.1.0)
      const versionMatch = `${rawTag} ${rawName} ${rawBody}`.match(/v?(\d+\.\d+\.\d+)/i);
      const parsedRemoteVersion = versionMatch ? versionMatch[1] : null;

      // Determina a versão remota real
      const remoteVer = parsedRemoteVersion || rawTag.replace(/^v/i, '');
      setLatestVersion(remoteVer || CURRENT_VERSION);
      setReleaseNotes(rawBody || 'Melhorias de desempenho e correções de segurança.');

      // Procura asset .apk nos releases
      const apkAsset = (data.assets || []).find(
        (a: any) => a.name && a.name.toLowerCase().endsWith('.apk')
      );

      if (apkAsset && apkAsset.browser_download_url) {
        setDownloadUrl(apkAsset.browser_download_url);
      } else {
        setDownloadUrl(data.html_url);
      }

      // CORREÇÃO CRÍTICA DO LOOP DE VERSÃO FALSA:
      // Apenas considera atualização disponível se a versão remota for estritamente SUPERIOR
      if (parsedRemoteVersion && compareVersions(parsedRemoteVersion, CURRENT_VERSION) > 0) {
        setUpdateAvailable(true);
      } else {
        // Se a tag for 'latest' sem número maior, estamos na versão mais recente
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

    if (!downloadUrl.endsWith('.apk') || Platform.OS !== 'android') {
      Linking.openURL(downloadUrl);
      if (!isMandatory) onClose();
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
        throw new Error('Falha no download do instalador.');
      }

      setIsDownloading(false);

      // Converte URI para content:// compatível com o instalador do Android
      const contentUri = await FileSystem.getContentUriAsync(result.uri);

      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/vnd.android.package-archive',
      });

      if (!isMandatory) {
        onClose();
      }
    } catch (err: any) {
      console.warn('Erro na instalação:', err);
      setIsDownloading(false);
      Alert.alert(
        'Erro na instalação automática',
        'Deseja abrir o download pelo navegador para instalar o APK?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir no Navegador', onPress: () => Linking.openURL(downloadUrl) },
        ]
      );
    }
  };

  const canDismiss = !isDownloading && (!isMandatory || !updateAvailable);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={() => {
        if (canDismiss) onClose();
      }}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.topRow}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor:
                    isMandatory && updateAvailable ? theme.dangerBg : theme.badgeBg,
                },
              ]}
            >
              {isMandatory && updateAvailable ? (
                <ShieldAlert size={26} color={theme.danger} />
              ) : (
                <DownloadCloud size={24} color={theme.primary} />
              )}
            </View>

            {canDismiss && (
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: theme.surfaceVariant }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color={theme.text} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.title, { color: theme.text }]}>
            {isMandatory && updateAvailable
              ? 'Atualização Obrigatória'
              : 'Atualização do Aplicativo'}
          </Text>

          <Text style={[styles.versionLabel, { color: theme.textSecondary }]}>
            Versão instalada: <Text style={{ fontWeight: '700', color: theme.text }}>v{CURRENT_VERSION}</Text>
          </Text>

          {checking ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                Verificando versões disponíveis...
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
              <View
                style={[
                  styles.newVersionBadge,
                  {
                    backgroundColor:
                      isMandatory ? theme.dangerBg : theme.successBg,
                  },
                ]}
              >
                <CheckCircle2
                  size={16}
                  color={isMandatory ? theme.danger : theme.success}
                />
                <Text
                  style={[
                    styles.newVersionText,
                    { color: isMandatory ? theme.danger : theme.success },
                  ]}
                >
                  Nova versão disponível: v{latestVersion}
                </Text>
              </View>

              {isMandatory && (
                <Text style={[styles.mandatoryWarning, { color: theme.danger }]}>
                  ⚠️ Esta atualização é obrigatória para garantir a compatibilidade com o banco de dados e as rotas do backend.
                </Text>
              )}

              <Text style={[styles.notesTitle, { color: theme.text }]}>Novidades da versão:</Text>
              <Text style={[styles.notesBody, { color: theme.textSecondary }]} numberOfLines={5}>
                {releaseNotes}
              </Text>

              {isDownloading ? (
                <View style={styles.progressWrap}>
                  <Text style={[styles.progressText, { color: theme.text }]}>
                    Baixando instalador... {Math.round(downloadProgress * 100)}%
                  </Text>
                  <View style={[styles.progressBarBg, { backgroundColor: theme.surfaceVariant }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          backgroundColor: isMandatory ? theme.danger : theme.primary,
                          width: `${Math.round(downloadProgress * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.installBtn,
                    {
                      backgroundColor: isMandatory ? theme.danger : theme.primary,
                    },
                  ]}
                  onPress={handleDownloadAndInstall}
                  activeOpacity={0.8}
                >
                  <DownloadCloud size={18} color="#FFFFFF" />
                  <Text style={styles.installBtnText}>
                    {isMandatory ? 'Atualizar Agora (Obrigatório)' : 'Baixar e Atualizar Agora'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.centerBox}>
              <CheckCircle2 size={36} color={theme.success} />
              <Text style={[styles.uptodateTitle, { color: theme.text }]}>
                Você está na versão final!
              </Text>
              <Text style={[styles.uptodateSub, { color: theme.textMuted }]}>
                O Binfae Mobile já possui todas as melhorias e correções disponíveis.
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
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
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 4,
  },
  versionLabel: {
    fontSize: 13,
    marginBottom: 14,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
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
  mandatoryWarning: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
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
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 6,
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
