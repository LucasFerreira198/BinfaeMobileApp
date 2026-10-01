# Binfae Mobile App 📱

Aplicativo móvel 100% nativo desenvolvido em **React Native** com **Expo** e **TypeScript** para o sistema de gestão de estoque, materiais e TI do BINFAE.

---

## ✨ Principais Diferenciais e Funcionalidades

1. **Arquitetura Offline-First com Busca Instantânea (0ms):**
   - Cópia sincronizada dos dados em memória e armazenamento local (`AsyncStorage`).
   - Pesquisa textual e filtros por status/categoria com resposta imediata a 60 FPS, eliminando travamentos ou lag de rede.
   - Sincronização automática em segundo plano com a API no Render (`https://systeminformaticabinfae.onrender.com`).

2. **Assinatura Fixa de Release (Atualização Direta sem Desinstalar):**
   - Configurado com Keystore de release oficial (`release.keystore`), garantindo a mesma impressão digital criptográfica (SHA-256) em todas as versões.
   - O Android reconhece versões posteriores e realiza a atualização no mesmo pacote (`com.binfae.mobileapp`) preservando login e configurações locais.

3. **Atualização do APK em 1 Toque (In-App Auto Updater):**
   - O aplicativo verifica automaticamente novos lançamentos no GitHub Releases.
   - Permite baixar o novo `.apk` com barra de progresso visual e aciona o instalador de pacotes nativo do Android (`PackageInstaller`).

4. **Design Moderno e Responsivo (Sem Tema Militar Antigo):**
   - Interface limpa com paleta Slate / Indigo / Emerald.
   - Suporte completo e protegido para **Tema Escuro** e **Tema Claro**, sem fundos ofuscantes ou contrastes quebrados em modais.
   - Cards de métricas compactos em formato de carrossel horizontal, liberando mais de 300px de altura para a lista de materiais.

5. **Navegação Nativa & Botão Voltar Físico do Android:**
   - Tratamento universal de `BackHandler`: pressionar o botão físico de voltar fecha modais abertos ou retorna à tela anterior, em vez de encerrar abruptamente o app.

6. **Leitor de QR Code / Código de Barras Integrado:**
   - Módulo de câmera nativa de alta velocidade com mira visual, controle de lanterna e feedback háptico por vibração.
   - Localização imediata do material no banco de dados e abertura dos detalhes/cautela.

---

## 🛠️ Tecnologias Utilizadas

- **Framework:** React Native + Expo SDK 57 (TypeScript)
- **Câmera:** `expo-camera`
- **Armazenamento:** `@react-native-async-storage/async-storage` & `expo-file-system`
- **Ícones & Interface:** `lucide-react-native` & `react-native-svg`
- **Compilação CI/CD:** GitHub Actions + Gradle (Android Release Signed APK)

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js 20+
- npm ou yarn

### Passos
```bash
# 1. Instalar dependências
npm install

# 2. Iniciar o servidor Expo de desenvolvimento
npm start

# 3. Executar diretamente no dispositivo ou emulador Android
npm run android
```

---

## 📦 Compilação do APK Assinado

### Via GitHub Actions (Automático)
Qualquer push na branch `main` ou criação de Release no GitHub dispara o workflow `.github/workflows/build-apk.yml`, compilando o arquivo `BinfaeMobile-release.apk` pronto para instalação.

### Localmente via Gradle
```bash
cd android
./gradlew assembleRelease
# O APK gerado estará em: android/app/build/outputs/apk/release/app-release.apk
```
