import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import {
  ClipboardList,
  Sparkles,
  CheckCircle2,
  QrCode,
  Box,
  FileSignature,
  Clock,
  ShieldAlert,
} from 'lucide-react-native';

interface CautelasScreenProps {
  onGoToStock?: () => void;
  onGoToScanner?: () => void;
}

export const CautelasScreen: React.FC<CautelasScreenProps> = ({
  onGoToStock,
  onGoToScanner,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Cautelas" subtitle="Termos de Responsabilidade" showSync={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner de Novidade / Em Breve */}
        <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.badgePill, { backgroundColor: theme.badgeBg }]}>
            <Sparkles size={14} color={theme.primary} />
            <Text style={[styles.badgeText, { color: theme.primary }]}>
              MÓDULO EM HOMOLOGAÇÃO • EM BREVE
            </Text>
          </View>

          <View style={[styles.iconCircle, { backgroundColor: theme.badgeBg }]}>
            <ClipboardList size={40} color={theme.primary} />
          </View>

          <Text style={[styles.heroTitle, { color: theme.text }]}>
            Gestão Digital de Cautelas
          </Text>

          <Text style={[styles.heroSub, { color: theme.textSecondary }]}>
            Estamos finalizando a experiência completa de cautela militar nativa no celular. Em breve, você poderá emitir termos, gerenciar cautelas ativas e dar baixa instantânea de qualquer lugar do quartel.
          </Text>

          <View style={styles.actionRow}>
            {onGoToStock && (
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
                onPress={onGoToStock}
                activeOpacity={0.8}
              >
                <Box size={16} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>Ver Materiais</Text>
              </TouchableOpacity>
            )}

            {onGoToScanner && (
              <TouchableOpacity
                style={[styles.secondaryActionBtn, { backgroundColor: theme.surfaceVariant }]}
                onPress={onGoToScanner}
                activeOpacity={0.8}
              >
                <QrCode size={16} color={theme.text} />
                <Text style={[styles.secondaryActionText, { color: theme.text }]}>Escanear QR Code</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Recursos Que Estão Chegando */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          O QUE VOCÊ PODERÁ FAZER:
        </Text>

        <View style={styles.featureGrid}>
          <View style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.featureIcon, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <FileSignature size={20} color="#38BDF8" />
            </View>
            <Text style={[styles.featureTitle, { color: theme.text }]}>Cautela em Poucos Toques</Text>
            <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>
              Selecione o militar pelo SARAM ou posto e assine digitalmente a entrega de materiais em lote.
            </Text>
          </View>

          <View style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.featureIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <CheckCircle2 size={20} color="#10B981" />
            </View>
            <Text style={[styles.featureTitle, { color: theme.text }]}>Devolução Rápida por QR Code</Text>
            <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>
              Basta apontar a câmera para o código da etiqueta do material para registrar a devolução com conferência automática.
            </Text>
          </View>

          <View style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.featureIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Clock size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.featureTitle, { color: theme.text }]}>Controle de Prazos</Text>
            <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>
              Acompanhamento de prazos de retorno e alertas preventivos para materiais emprestados a outros setores.
            </Text>
          </View>

          <View style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.featureIcon, { backgroundColor: 'rgba(129, 140, 248, 0.15)' }]}>
              <ShieldAlert size={20} color="#818CF8" />
            </View>
            <Text style={[styles.featureTitle, { color: theme.text }]}>Auditoria Militar</Text>
            <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>
              Histórico rastreável e inviolável de cada movimentação para prestação de contas no BINF-AE.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    padding: 22,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 12,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginLeft: 4,
    marginTop: 4,
  },
  featureGrid: {
    gap: 12,
  },
  featureCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
});
