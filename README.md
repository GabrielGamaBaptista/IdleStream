# ⚡ IdleStream

**IdleStream** é um aplicativo desktop e mobile ultra-leve construído em **Tauri 2 (Rust) + React 19 + TypeScript + TailwindCSS** para gerenciar presença em livestreams, farm de tempo assistido (watch time) e acúmulo de pontos de canal na **Twitch** e na **Kick**, com suporte nativo a **múltiplas contas simultâneas**, **hub de jogos ociosos (PokeIdle)** e **sistema de votos diários (IdleHub)** com consumo zero de recursos quando inativo.

---

## ✨ Recursos

- 👥 **Multi-Contas Simultâneas por Stream**:
  - Vincule múltiplas contas a uma única stream sem duplicar cards na tela.
  - **Twitch**: Conexão simultânea ao chat IRC (`wss://irc-ws.chat.twitch.tv`) para cada conta (~1 MB RAM por conta).
  - **Kick**: Instâncias isoladas em segundo plano com perfis de sessão e cookies dedicados (`kick_profiles/{account_id}`).
- 👑 **Kick Resgate Seletivo**:
  - Todas as contas Kick rodam em background acumulando pontos.
  - Alterne a qualquer momento com **1 clique** qual conta é a ativa para abrir o botão de resgate de recompensas.
- 🎮 **Hub de Jogos Ociosos (PokeIdle)**:
  - 4 slots concorrentes isolados em pastas de sessão dedicadas (`game_profiles/slot-1`..`slot-4`).
  - Extensão integrada `/hunt` para automação de caça e batalhas.
  - Performance inteligente de 4 patamares: **60 FPS com VSync de hardware** em primeiro plano, **10 FPS** quando sem foco ou ocioso (>30s), e **1 FPS (0% GPU)** quando minimizado ou sleep (>5m).
  - Purga automática de memória física de SO (`game_trim_memory` e `window.gc()`) para sessões ininterruptas de 300+ horas.
- 🗳️ **Sistema de Votos Diários (IdleHub & TopIdle)**:
  - Votação diária na plataforma oficial IdleHub com suporte individual por conta Google (1 conta por slot).
  - Notificação sonora e de sistema (Windows Toast & Android) a cada **24 horas e 1 minuto**.
  - Sincronização bidirecional em nuvem PC $\leftrightarrow$ Celular via QR Code.
- 🌙 **Modo Vigília (Economia Extrema de Recursos)**:
  - Monitoramento contínuo em background (`auto_live_only`).
  - Quando o canal estiver offline, todas as conexões e janelas permanecem desativadas (consumo de **0 MB de RAM**).
  - Assim que a transmissão entra ao vivo, as contas conectam automaticamente.
- 🪙 **Detecção e Leitura Automática de Pontos de Canal**:
  - Saldo de pontos atualizado periodicamente para cada conta vinculada.
- ⚙️ **Configurações Globais**:
  - Minimizar para a bandeja do sistema (System Tray).
  - Inicialização automática com o Windows.
  - Otimizações para Kick: áudio mudo forçado, chat oculto e qualidade 160p automática.

---

## 🛠️ Tecnologias Utilizadas

- **Backend Host**: [Tauri 2.0](https://tauri.app/) (Rust 2021)
- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [TailwindCSS 4](https://tailwindcss.com/)
- **Gerenciamento de Estado**: [Zustand](https://github.com/pmndrs/zustand)
- **Mobile Runtime**: Android NDK (Kotlin + Rust `cdylib`)
- **Segurança & Auto-Update**: Tauri Updater v2 + Minisign (ed25519)
- **Ícones**: [Lucide React](https://lucide.dev/)

---

## 📦 Instalação

Baixe os instaladores oficiais na aba [Releases](https://github.com/GabrielGamaBaptista/IdleStream/releases):
- **Windows (Instalador NSIS)**: `IdleStream_<VERSION>_x64-setup.exe`
- **Windows (Portátil)**: `idlestream.exe`
- **Android**: `IdleStream_<VERSION>_arm64.apk`

---

## 💻 Desenvolvimento Local

### Pré-requisitos
- Node.js (v18+)
- Rust & Cargo (v1.75+)
- WebView2 Runtime (padrão no Windows 10/11)

### Instalação de dependências:
```bash
npm install
```

### Executar em modo desenvolvimento:
```bash
npm run tauri dev
```

### Compilar para Produção (Gerar .exe e instalador NSIS):
```bash
npm run tauri build
```
O executável e o instalador serão gerados em:
- `src-tauri/target/release/idlestream.exe`
- `src-tauri/target/release/bundle/nsis/IdleStream_0.1.0_x64-setup.exe`
