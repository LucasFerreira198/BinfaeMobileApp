# Binfae Mobile App 📱🛡️

Aplicativo móvel Android nativo oficial (**`.apk`**) do sistema de gestão de estoque, materiais, patrimônio, efetivo militar e cautelas operacionais do **BINFAE-GL**, desenvolvido em **React Native** com **Expo** e **TypeScript**.

---

## ✨ Principais Módulos e Diferenciais

### 1. ⚡ Arquitetura Offline-First (Tempo de Resposta em 0ms)
- **Cache Local Inteligente:** Espelhamento automático de dados na memória do dispositivo e armazenamento persistente com `AsyncStorage`.
- **Busca Instantânea a 60 FPS:** Pesquisa textual e filtros por status, categoria, BMP, número de série e localização física com resposta em **0ms**, operando de forma fluida mesmo em áreas de quartel com sinal de rede fraco ou inexistente.
- **Sincronização em Segundo Plano:** Comunicação assíncrona com o backend no Render (`https://systeminformaticabinfae.onrender.com`), mantendo os dados atualizados com o sistema Desktop em tempo real.

---

### 2. 🎯 Cautela de Materiais e Missões Operacionais (Sincronismo Total com Desktop)
Totalmente integrado ao novo ecossistema de cautelas do BINFAE, permitindo que operadores no celular e no computador trabalhem simultaneamente:
- **Dois Tipos de Cautela:**
  - **Missões Operacionais:** Abertura rápida informando apenas o nome da missão (início automático `now()`, sem exigir destino nem previsão de retorno).
  - **Cautelas Fixas:** Materiais destinados a permanência prolongada em postos externos ou seções da OM.
- **Painel de Acompanhamento:** Abas comutáveis **"Ativas"** e **"Concluídas"**, exibindo métricas de materiais totais, devolvidos e pendentes, acompanhadas de barra de progresso visual.
- **Fluxo Operacional Blindado:**
  - **Passo 1 (Militar Primeiro):** Seleção do militar recebedor por pesquisa de SARAM, nome de guerra ou nome completo.
  - **Passo 2 (Telefone em Destaque):** Exibição proeminente do **número de telefone no canto do card**. Caso não exista ou tenha mudado, permite edição imediata na tela de cautela, atualizando o cadastro militar no banco de dados.
  - **Passo 3 (Seleção do Material):**
    - **Modo Individual (Unitário):** Cautela pontual de um material para o militar selecionado.
    - **Modo Conjunto / Em Lote:** Cautela consecutiva de múltiplos materiais para o mesmo militar de forma ágil.
- **Descautelação por Câmera QR Code:**
  - O operador aciona a câmera do celular para ler o QR Code ou código de barras do material.
  - O app consulta o status do item: se estiver cautelado, exibe modal de confirmação informando o nome da missão, militar responsável e telefone, permitindo descautelar o item com 1 toque.
- **Conclusão Automática da Missão:** Ao devolver o último material pendente, a missão é finalizada instantaneamente com `data_fim = now()`, recebendo o status `CONCLUIDA` e migrando automaticamente para a aba de histórico.

---

### 3. 📷 Leitor de QR Code & Código de Barras Integrado
- Módulo de câmera de alta sensibilidade desenvolvido com `expo-camera`.
- **Controle de Lanterna/Flash:** Facilita a leitura em galpões, armários e depósitos escuros.
- **Mira Visual e Feedback Háptico:** Vibração ao detectar códigos para confirmação imediata.
- **Busca Imediata:** Localiza o material no acervo geral, permitindo visualização de detalhes, histórico de movimentações ou devolução rápida.

---

### 4. 🏷️ Identificação de Cautela no Estoque Geral
- Tanto na listagem do acervo (`ItemCard`) quanto na janela detalhada do material (`ItemDetailModal`), qualquer item sob cautela ativa exibe uma tarja informativa em destaque contendo:
  - Nome da Missão Operacional / Cautela Fixa.
  - Nome de guerra e SARAM do militar que retirou o item.
  - Telefone de contato atualizado do responsável.

---

### 5. 🔒 Sessão Estrita de 24h & Refresh Token Criptográfico
- **Persistência de Sessão:** O operador não é deslogado ao fechar o aplicativo. O token JWT e os dados do usuário ficam salvos com segurança localmente.
- **Limite Máximo de 24 Horas:** Para cumprir as normas de segurança da informação militar, a sessão expira compulsoriamente após 24 horas contadas a partir do login (`login_timestamp`), redirecionando para a tela de autenticação.
- **Renovação Automática (Refresh Token):** Renovação transparente de tokens em segundo plano via endpoint `/auth/refresh` sem interromper as atividades do usuário.

---

### 6. 📱 In-App Auto-Updater & Assinatura de Release Fixa
- **Keystore de Release Oficial (`release.keystore`):** Todas as compilações utilizam a mesma assinatura digital SHA-256. Atualizações subsequentes são instaladas diretamente sobre a versão existente sem perda de dados locais.
- **Atualização em 1 Toque:** O app verifica releases oficiais no GitHub. Havendo versão mais recente, exibe modal com notas de lançamento, realiza o download com barra de progresso e dispara o instalador de pacotes nativo do Android (`PackageInstaller`).

---

### 7. 🎨 Design Moderno & Experiência de Uso
- **Paleta Operacional Limpa:** Interface nos tons Slate, Indigo e Emerald, eliminando temas escuros ofuscantes ou contrastes ilegíveis.
- **Tema Escuro & Tema Claro:** Suporte completo e dinâmico com persistência de preferência.
- **Navegação Nativa Android:** Integração com o botão físico de voltar (`BackHandler`), fechando modais e folhas inferiores de forma previsível e natural.

---

## 🛠️ Tecnologias Utilizadas

| Componente | Tecnologia | Detalhes |
| :--- | :--- | :--- |
| **Framework Base** | React Native + Expo SDK 52/57 | TypeScript estrito, compilação nativa Android |
| **Câmera & Scanner** | `expo-camera` | Leitura de QR Code e Código de Barras com lanterna |
| **Persistência Local** | `@react-native-async-storage/async-storage` | Cache offline-first e persistência de sessão |
| **Sistema de Arquivos** | `expo-file-system` | Download de APKs para auto-update |
| **Ícones Vetoriais** | `lucide-react-native` + `react-native-svg` | Ícones SVG nítidos e escaláveis |
| **CI/CD** | GitHub Actions + Gradle | Build automatizado de APK assinado |

---

## 📂 Estrutura do Projeto

```
src/
├── api/
│   └── client.ts            # Cliente HTTP Axios com interceptors, refresh token e rotas
├── components/              # Modais, cards e componentes reutilizáveis de interface
│   ├── AddItemModal.tsx     # Cadastro de novo material
│   ├── CreateMilitaryModal.tsx # Cadastro de militares com validação de SARAM
│   ├── CreateUserModal.tsx  # Criação de usuários do sistema
│   ├── ItemCard.tsx         # Card de material com badge de cautela
│   ├── ItemDetailModal.tsx  # Detalhes, histórico, QR Code e status de cautela
│   ├── UpdateModal.tsx      # Modal de auto-update do APK com progresso
│   └── ...
├── context/                 # Context API do React para estado global
│   ├── AuthContext.tsx      # Sessão de usuário, 24h timeout e refresh token
│   ├── StockContext.tsx     # Gerenciamento de estoque offline-first
│   └── ThemeContext.tsx     # Alternância de tema claro/escuro
├── navigation/
│   └── AppNavigator.tsx     # Navegação por rotas e proteção de telas autenticadas
├── screens/                 # Telas principais do aplicativo
│   ├── AdminScreen.tsx      # Gestão de militares e usuários
│   ├── CautelasScreen.tsx   # Painel completo de Missões, Cautelas e Descautelação
│   ├── LoginScreen.tsx      # Autenticação com SARAM e senha
│   ├── MovementsScreen.tsx  # Histórico de movimentações de estoque
│   ├── ScannerScreen.tsx    # Câmera com mira, lanterna e descautelação rápida
│   ├── SettingsScreen.tsx   # Configurações de tema, PIN e servidor
│   └── StockScreen.tsx      # Acervo de materiais com busca instantânea
├── storage/
│   └── db.ts                # Camada de abstração e cache local com AsyncStorage
├── theme/
│   └── colors.ts            # Paleta de cores para temas claro e escuro
└── types/
    └── index.ts             # Tipagens TypeScript para itens, militares e cautelas
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- **Node.js** (v20 ou superior)
- **npm** ou **yarn**
- Dispositivo Android com depuração USB habilitada ou Emulador Android Studio

### Passo a Passo
```bash
# 1. Instalar as dependências do projeto
npm install

# 2. Iniciar o servidor de desenvolvimento Expo
npm start

# 3. Executar diretamente no dispositivo conectado ou emulador
npm run android
```

---

## 📦 Compilação do APK Release Oficial

### Via GitHub Actions (Automático)
Qualquer `push` na branch `main` ou publicação de tag/release dispara o workflow `.github/workflows/build-apk.yml`, que compila e gera o artefato `BinfaeMobile-release.apk` assinado e pronto para distribuição.

### Localmente via Gradle
```bash
# Navegar até a pasta android
cd android

# Compilar o APK release assinado
./gradlew assembleRelease
```
O arquivo APK gerado estará disponível no caminho:
`android/app/build/outputs/apk/release/app-release.apk`
