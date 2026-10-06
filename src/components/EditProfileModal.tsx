import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserAvatar } from './UserAvatar';
import {
  X,
  Camera,
  Image as ImageIcon,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  User,
  Shield,
  Phone,
  Mail,
  Building,
  Check,
  Link,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ visible, onClose }) => {
  const { user, updateProfile } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const militar = user?.militar;

  const [fotoUrl, setFotoUrl] = useState<string>('');
  const [nomeGuerra, setNomeGuerra] = useState<string>('');
  const [secao, setSecao] = useState<string>('');
  const [celular, setCelular] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showUrlField, setShowUrlField] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (visible && user) {
      setFotoUrl(user.foto_url || militar?.foto_url || '');
      setNomeGuerra(militar?.nome_guerra || user.username || '');
      setSecao(militar?.secao || 'Informática');
      setCelular(militar?.celular || militar?.telefone || '');
      setEmail(militar?.email || '');
      setPassword('');
      setConfirmPassword('');
      setShowUrlField(false);
    }
  }, [visible, user]);

  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão Necessária',
          'Precisamos de permissão para acessar sua galeria de fotos.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          setFotoUrl(`data:image/jpeg;base64,${asset.base64}`);
        } else if (asset.uri) {
          setFotoUrl(asset.uri);
        }
      }
    } catch (err: any) {
      Alert.alert('Erro ao selecionar foto', err.message || 'Tente novamente.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão Necessária',
          'Precisamos de permissão para utilizar a câmera do dispositivo.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          setFotoUrl(`data:image/jpeg;base64,${asset.base64}`);
        } else if (asset.uri) {
          setFotoUrl(asset.uri);
        }
      }
    } catch (err: any) {
      Alert.alert('Erro ao capturar foto', err.message || 'Tente novamente.');
    }
  };

  const handleRemovePhoto = () => {
    setFotoUrl('');
  };

  const handleSave = async () => {
    if (password.trim().length > 0) {
      if (password.trim().length < 6) {
        Alert.alert('Senha Inválida', 'A nova senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Senhas Diferentes', 'A nova senha e a confirmação não conferem.');
        return;
      }
    }

    setIsSaving(true);
    try {
      await updateProfile({
        foto_url: fotoUrl.trim().length > 0 ? fotoUrl.trim() : '',
        nome_guerra: nomeGuerra.trim().length > 0 ? nomeGuerra.trim() : null,
        secao: secao.trim().length > 0 ? secao.trim() : null,
        celular: celular.trim().length > 0 ? celular.trim() : null,
        email: email.trim().length > 0 ? email.trim() : null,
        password: password.trim().length > 0 ? password.trim() : null,
      });

      Alert.alert('Sucesso', 'Seu perfil foi atualizado com sucesso!');
      onClose();
    } catch (err: any) {
      Alert.alert('Falha ao salvar', err.message || 'Não foi possível salvar as alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!visible) return null;

  const displayName = militar
    ? `${militar.posto_graduacao} ${militar.nome_guerra}`
    : user?.username || 'Militar';

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <View style={styles.headerLeft}>
                <View style={[styles.iconWrap, { backgroundColor: theme.badgeBg }]}>
                  <User size={20} color={theme.primary} />
                </View>
                <View>
                  <Text style={[styles.title, { color: theme.text }]}>Meu Perfil Militar</Text>
                  <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    Atualize sua foto, contatos e credenciais
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

            {/* Conteúdo com Scroll */}
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Seção 1: Foto de Perfil & Avatar */}
              <View
                style={[
                  styles.cardSection,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                  1. FOTO DE PERFIL & IDENTIDADE
                </Text>

                <View style={styles.avatarRow}>
                  {/* Avatar Preview Grande com Badge de Câmera */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handlePickFromGallery}
                    style={styles.avatarWrap}
                  >
                    <UserAvatar
                      fotoUrl={fotoUrl}
                      name={displayName}
                      size={84}
                      borderColor={theme.primary}
                      borderWidth={2.5}
                    />
                    <View style={[styles.cameraBadge, { backgroundColor: theme.primary }]}>
                      <Camera size={14} color="#000000" />
                    </View>
                  </TouchableOpacity>

                  {/* Ações de Foto */}
                  <View style={styles.photoActions}>
                    <TouchableOpacity
                      style={[styles.photoBtn, { backgroundColor: theme.primary }]}
                      onPress={handlePickFromGallery}
                      activeOpacity={0.8}
                    >
                      <ImageIcon size={15} color="#000000" />
                      <Text style={[styles.photoBtnText, { color: '#000000' }]}>
                        Galeria de Fotos
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.photoBtn,
                        { backgroundColor: theme.surfaceVariant, borderColor: theme.border, borderWidth: 1 },
                      ]}
                      onPress={handleTakePhoto}
                      activeOpacity={0.8}
                    >
                      <Camera size={15} color={theme.text} />
                      <Text style={[styles.photoBtnText, { color: theme.text }]}>
                        Tirar Foto
                      </Text>
                    </TouchableOpacity>

                    {fotoUrl.length > 0 && (
                      <TouchableOpacity
                        style={styles.removePhotoBtn}
                        onPress={handleRemovePhoto}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={13} color={theme.danger} />
                        <Text style={[styles.removePhotoText, { color: theme.danger }]}>
                          Remover Foto
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Link URL Direto opcional */}
                <TouchableOpacity
                  onPress={() => setShowUrlField(!showUrlField)}
                  style={styles.urlToggle}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.urlToggleText, { color: theme.textSecondary }]}>
                    {showUrlField ? 'Ocultar link web' : 'Ou colar link direto da imagem...'}
                  </Text>
                  {showUrlField ? (
                    <ChevronUp size={14} color={theme.textSecondary} />
                  ) : (
                    <ChevronDown size={14} color={theme.textSecondary} />
                  )}
                </TouchableOpacity>

                {showUrlField && (
                  <View style={[styles.inputBox, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                    <Link size={16} color={theme.textMuted} />
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="https://.../foto.jpg"
                      placeholderTextColor={theme.textMuted}
                      value={fotoUrl}
                      onChangeText={setFotoUrl}
                      autoCapitalize="none"
                    />
                  </View>
                )}
              </View>

              {/* Seção 2: Dados Militares */}
              <View
                style={[
                  styles.cardSection,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                  2. DADOS DO MILITAR & LOTAÇÃO
                </Text>

                {/* Badges Fixo de Posto e SARAM */}
                {militar && (
                  <View style={styles.fixedInfoRow}>
                    <View style={[styles.pillBadge, { backgroundColor: theme.badgeBg }]}>
                      <Shield size={13} color={theme.primary} />
                      <Text style={[styles.pillText, { color: theme.primary }]}>
                        {militar.posto_graduacao}
                      </Text>
                    </View>

                    <View style={[styles.pillBadge, { backgroundColor: theme.surfaceVariant }]}>
                      <Text style={[styles.pillText, { color: theme.textSecondary }]}>
                        SARAM: {militar.saram}
                      </Text>
                    </View>
                  </View>
                )}

                <Text style={[styles.label, { color: theme.textSecondary }]}>Nome de Guerra</Text>
                <View style={[styles.inputBox, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <User size={16} color={theme.textMuted} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Ex: SILVA, SANTOS..."
                    placeholderTextColor={theme.textMuted}
                    value={nomeGuerra}
                    onChangeText={setNomeGuerra}
                  />
                </View>

                <Text style={[styles.label, { color: theme.textSecondary }]}>Seção de Lotação</Text>
                <View style={[styles.inputBox, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <Building size={16} color={theme.textMuted} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Ex: Informática, Almoxarifado..."
                    placeholderTextColor={theme.textMuted}
                    value={secao}
                    onChangeText={setSecao}
                  />
                </View>

                <Text style={[styles.label, { color: theme.textSecondary }]}>Celular / Ramal</Text>
                <View style={[styles.inputBox, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <Phone size={16} color={theme.textMuted} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="(00) 00000-0000"
                    placeholderTextColor={theme.textMuted}
                    value={celular}
                    onChangeText={setCelular}
                    keyboardType="phone-pad"
                  />
                </View>

                <Text style={[styles.label, { color: theme.textSecondary }]}>E-mail de Contato</Text>
                <View style={[styles.inputBox, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <Mail size={16} color={theme.textMuted} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="militar@fab.mil.br"
                    placeholderTextColor={theme.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Seção 3: Alterar Senha */}
              <View
                style={[
                  styles.cardSection,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                  3. ALTERAR SENHA (OPCIONAL)
                </Text>

                <Text style={[styles.label, { color: theme.textSecondary }]}>Nova Senha</Text>
                <View style={[styles.inputBox, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <Lock size={16} color={theme.textMuted} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Mínimo de 6 caracteres"
                    placeholderTextColor={theme.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? (
                      <EyeOff size={16} color={theme.textMuted} />
                    ) : (
                      <Eye size={16} color={theme.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>

                {password.length > 0 && (
                  <>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>
                      Confirmar Nova Senha
                    </Text>
                    <View style={[styles.inputBox, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                      <Lock size={16} color={theme.textMuted} />
                      <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="Repita a nova senha"
                        placeholderTextColor={theme.textMuted}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showPassword}
                      />
                    </View>
                  </>
                )}
              </View>
            </ScrollView>

            {/* Rodapé com Botão Salvar */}
            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.border }]}
                onPress={onClose}
                disabled={isSaving}
              >
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <>
                    <Check size={18} color="#000000" />
                    <Text style={styles.saveBtnText}>Salvar Alterações</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  keyboardAvoid: {
    width: '100%',
    maxHeight: '94%',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  cardSection: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  photoActions: {
    flex: 1,
    gap: 8,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  photoBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  removePhotoText: {
    fontSize: 11,
    fontWeight: '600',
  },
  urlToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
  },
  urlToggleText: {
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  fixedInfoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 6,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
});
