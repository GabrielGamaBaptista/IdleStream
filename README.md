# ⚡ IdleStream

**IdleStream** é um aplicativo desktop ultra-leve construído em **Tauri 2 (Rust) + React 19 + TypeScript + TailwindCSS** para gerenciar presença em livestreams, farm de tempo assistido (watch time) e acúmulo de pontos de canal na **Twitch** e na **Kick**, com suporte nativo a **múltiplas contas simultâneas** e **modo vigília** com consumo zero de memória quando as transmissões estão offline.

---

## ✨ Recursos

- 👥 **Multi-Contas Simultâneas por Stream**:
  - Vincule múltiplas contas a uma única stream sem duplicar cards na tela.
  - **Twitch**: Conexão simultânea ao chat IRC (`wss://irc-ws.chat.twitch.tv`) para cada conta (~1 MB RAM por conta).
  - **Kick**: Instâncias isoladas em segundo plano com perfis de sessão e cookies dedicados (`kick_profiles/{account_id}`).
- 👑 **Kick Resgate Seletivo**:
  - Todas as contas Kick rodam em background acumulando pontos.
  - Alterne a qualquer momento com **1 clique** qual conta é a ativa para abrir o botão de resgate de recompensas.
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

- **Backend Desktop**: [Tauri 2.0](https://tauri.app/) (Rust)
- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [TailwindCSS 4](https://tailwindcss.com/)
- **Gerenciamento de Estado**: [Zustand](https://github.com/pmndrs/zustand)
- **Ícones**: [Lucide React](https://lucide.dev/)

---

## 📦 Instalação

Baixe o instalador mais recente na aba [Releases](https://github.com/GabrielGamaBaptista/IdleStream/releases) (`IdleStream_0.1.0_x64-setup.exe` ou `SetupIdleStream.exe`).

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
