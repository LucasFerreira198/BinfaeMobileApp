import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('ErrorBoundary capturou erro:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const errorText = this.state.error
        ? `${this.state.error.name}: ${this.state.error.message}`
        : (this.props.fallbackMessage || 'Falha ao processar componente.');

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Ops! Ocorreu um erro ao exibir estes dados</Text>
          <Text style={styles.message}>{errorText}</Text>

          {this.state.error?.stack ? (
            <ScrollView
              style={styles.stackBox}
              contentContainerStyle={{ padding: 8 }}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.stackText}>
                {this.state.error.stack}
              </Text>
            </ScrollView>
          ) : null}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={this.resetError} activeOpacity={0.8}>
              <Text style={styles.buttonText}>Tentar Novamente</Text>
            </TouchableOpacity>

            {this.props.onReset ? (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={this.props.onReset}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, { color: '#E2E8F0' }]}>Fechar / Voltar</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: '#F87171',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  stackBox: {
    maxHeight: 140,
    width: '100%',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  stackText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#6366F1',
    borderRadius: 8,
  },
  secondaryButton: {
    backgroundColor: '#334155',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
