// Testes de integridade de segurança e parsing de dados do Binfae Mobile

describe('Binfae Mobile Security & Input Validation', () => {
  // Teste de parsing decimal com vírgula e ponto
  test('deve converter vírgula brasileira em ponto para valores decimais sem truncar', () => {
    const parseQty = (val: string) => {
      const sanitized = val.replace(',', '.');
      const parsed = parseFloat(sanitized);
      return isNaN(parsed) ? 0 : parsed;
    };

    expect(parseQty('1,5')).toBe(1.5);
    expect(parseQty('2.75')).toBe(2.75);
    expect(parseQty('10')).toBe(10);
    expect(parseQty('0,25')).toBe(0.25);
    expect(parseQty('abc')).toBe(0);
  });

  // Teste de pilha de navegação
  test('deve desempilhar telas respeitando a ordem do histórico', () => {
    let history = ['stock'];
    const push = (screen: string) => {
      if (history[history.length - 1] !== screen) {
        history.push(screen);
      }
    };
    const pop = () => {
      if (history.length > 1) {
        history.pop();
        return history[history.length - 1];
      }
      return history[0];
    };

    push('cautelas');
    push('admin');
    expect(history).toEqual(['stock', 'cautelas', 'admin']);

    expect(pop()).toBe('cautelas');
    expect(pop()).toBe('stock');
    expect(pop()).toBe('stock'); // Raiz preservada
  });

  // Teste de proteção de PIN com Salt
  test('deve gerar hash determinístico com salt sem expor o PIN em texto puro', () => {
    function rightRotate(value: number, amount: number) {
      return (value >>> amount) | (value << (32 - amount));
    }
    function hashPin(pin: string, salt = 'BINFAE_SALT_TEST') {
      const str = salt + pin + salt;
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return hash.toString(16);
    }

    const pin = '1234';
    const hashed1 = hashPin(pin);
    const hashed2 = hashPin(pin);

    expect(hashed1).toBe(hashed2);
    expect(hashed1).not.toBe('1234');
    expect(hashed1).not.toContain('1234');
  });
});
