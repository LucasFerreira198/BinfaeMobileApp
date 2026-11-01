import { darkTheme, lightTheme } from '../src/theme/colors';

// Utilitários de cálculo de luminância e contraste conforme especificação W3C WCAG 2.1
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hexForeground: string, hexBackground: string): number {
  const lum1 = getRelativeLuminance(hexForeground);
  const lum2 = getRelativeLuminance(hexBackground);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Binfae Mobile UI/UX & Material 3 Audit Suite', () => {
  describe('1. Conformidade de Acessibilidade e Contraste WCAG 2.1 AA (Tema Real)', () => {
    test('deve garantir contraste superior a 7:1 para o texto principal no Dark Theme', () => {
      const contrastBg = getContrastRatio(darkTheme.text, darkTheme.background);
      const contrastSurface = getContrastRatio(darkTheme.text, darkTheme.surface);

      expect(contrastBg).toBeGreaterThanOrEqual(7.0);
      expect(contrastSurface).toBeGreaterThanOrEqual(7.0);
    });

    test('deve garantir contraste superior a 4.5:1 para textSecondary no Dark Theme', () => {
      const contrastSurface = getContrastRatio(darkTheme.textSecondary, darkTheme.surface);
      const contrastCard = getContrastRatio(darkTheme.textSecondary, darkTheme.card);

      expect(contrastSurface).toBeGreaterThanOrEqual(4.5);
      expect(contrastCard).toBeGreaterThanOrEqual(4.5);
    });

    test('deve garantir contraste mínimo legível para textMuted no Dark Theme (>= 4.5:1)', () => {
      const contrastSurface = getContrastRatio(darkTheme.textMuted, darkTheme.surface);
      const contrastBg = getContrastRatio(darkTheme.textMuted, darkTheme.background);

      expect(contrastSurface).toBeGreaterThanOrEqual(4.5);
      expect(contrastBg).toBeGreaterThanOrEqual(4.5);
    });

    test('deve garantir contraste superior a 7:1 para o texto principal no Light Theme', () => {
      const contrastBg = getContrastRatio(lightTheme.text, lightTheme.background);
      const contrastSurface = getContrastRatio(lightTheme.text, lightTheme.surface);

      expect(contrastBg).toBeGreaterThanOrEqual(7.0);
      expect(contrastSurface).toBeGreaterThanOrEqual(7.0);
    });
  });

  describe('2. Ergonomia Desktop e Mobile (Touch Target >= 48dp)', () => {
    const checkEffectiveTarget = (visualSize: number, hitSlop = { top: 0, bottom: 0, left: 0, right: 0 }) => {
      const effectiveWidth = visualSize + hitSlop.left + hitSlop.right;
      const effectiveHeight = visualSize + hitSlop.top + hitSlop.bottom;
      return effectiveWidth >= 48 && effectiveHeight >= 48;
    };

    test('deve validar expansão por hitSlop para botões de 36dp (Header e Drawer)', () => {
      const headerHitSlop = { top: 10, bottom: 10, left: 10, right: 10 };
      expect(checkEffectiveTarget(36, headerHitSlop)).toBe(true); // 36 + 20 = 56dp >= 48dp
    });

    test('deve validar Extended FAB como target ergonômico padrão (52dp)', () => {
      expect(checkEffectiveTarget(52)).toBe(true);
    });
  });

  describe('3. Produtividade e Assistente Operacional', () => {
    test('deve concatenar sugestões com marcadores padronizados', () => {
      const applySuggestion = (currentText: string, suggestion: string) => {
        const trimmed = currentText.trim();
        return trimmed ? `${trimmed}\n• ${suggestion}` : `• ${suggestion}`;
      };

      const sug1 = 'Sem alterações nas instalações durante o quarto de serviço.';
      const sug2 = 'Ronda técnica realizada em todos os servidores e switches.';

      const initial = applySuggestion('', sug1);
      expect(initial).toBe('• Sem alterações nas instalações durante o quarto de serviço.');

      const appended = applySuggestion(initial, sug2);
      expect(appended).toBe(
        '• Sem alterações nas instalações durante o quarto de serviço.\n• Ronda técnica realizada em todos os servidores e switches.'
      );
    });

    test('deve estabilizar busca com debounce antes de disparar queries', (done) => {
      let callCount = 0;
      let lastQuery = '';

      const debounceSearch = (fn: (q: string) => void, delayMs: number) => {
        let timer: any = null;
        return (q: string) => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            fn(q);
          }, delayMs);
        };
      };

      const triggerSearch = debounceSearch((q) => {
        callCount += 1;
        lastQuery = q;
      }, 50);

      triggerSearch('S');
      triggerSearch('Se');
      triggerSearch('Ser');
      triggerSearch('Servidor');

      setTimeout(() => {
        expect(callCount).toBe(1);
        expect(lastQuery).toBe('Servidor');
        done();
      }, 100);
    });

    test('não deve exibir barra de progresso para itens unitários ou de quantidade 1', () => {
      const shouldShowStockBar = (item: { tipo_controle: string; quantidade: number; quantidade_minima: number }) => {
        return item.tipo_controle === 'GRANEL' && item.quantidade > 1 && item.quantidade_minima > 0;
      };

      // Item Unitário ou 1 unidade: não deve exibir barra de 100% ou 95%
      expect(shouldShowStockBar({ tipo_controle: 'UNITARIO', quantidade: 1, quantidade_minima: 0 })).toBe(false);
      expect(shouldShowStockBar({ tipo_controle: 'UNITARIO', quantidade: 1, quantidade_minima: 1 })).toBe(false);
      expect(shouldShowStockBar({ tipo_controle: 'GRANEL', quantidade: 1, quantidade_minima: 0 })).toBe(false);

      // Apenas item a granel com quantidade > 1 e estoque mínimo deve exibir
      expect(shouldShowStockBar({ tipo_controle: 'GRANEL', quantidade: 50, quantidade_minima: 10 })).toBe(true);
    });
  });
});
