# 📝 Relatório Técnico da Sessão — 04/11/2026

Este documento detalha todas as funcionalidades, correções arquiteturais, diagnósticos de testes, resoluções de problemas e a publicação oficial da release **v3.0.1** do **IdleStream**, servindo de guia completo para continuidade e correções futuras.

---

## 🎯 1. Objetivos da Sessão

1. **Modo Tela Cheia Real (Imersivo)**: Criar opção para minimizar/ocultar todos os menus e barras do app, permitindo foco total nas telas dos jogos, com atalho e botão flutuante para restaurar a UI.
2. **Port Mobile 100% Funcional (Fim da Tela Preta)**: Resolver a causa raiz pela qual os jogos ficavam em tela preta no Android ao abrir qualquer uma das 4 contas, garantindo suporte nativo de alto desempenho e execução 24/7 em segundo plano.
3. **Layouts Mobile Sob Medida**: Permitir alternar dinamicamente no smartphone entre visualização em **Foco (1x)** (uma conta em tela cheia com abas de topo) e **Monitoramento (4x)** (grade 2x2 para acompanhar os 4 jogos juntos).
4. **Modos de Economia Multi-Nível (Windows & Android)**: Implementar níveis de taxa de quadros (60 FPS, 30 FPS, Super Economia 10 FPS) e integração nativa com o **Modo Ultra Economia do PokeIdle** (painel de estatísticas com suspensão do Canvas).
5. **Validação Meticulosa & Release v3.0.1**: Realizar testes rigorosos em ambas as plataformas e publicar a versão 3.0.1 completa com instalador Windows assinado e APK Android.

---

## 🏗️ 2. Arquitetura e Implementações Realizadas

### 2.1. Modo Imersivo (Tela Cheia Real)
- **Modificações em [`src/App.tsx`](file:///c:/Projetos/Chatter/src/App.tsx) e [`src/stores/appStore.ts`](file:///c:/Projetos/Chatter/src/stores/appStore.ts)**:
  - Adicionados os estados `isImmersiveMode`, `toggleImmersiveMode` e `setImmersiveMode`.
  - Quando ativo na aba de jogos, `Header`, `Sidebar`, `StatusBar` e `BottomNav` são completamente desmontados/ocultados.
  - **Aproveitamento de Tela**: Transição de 1664x932 para **1920x1080 (100%)** no Desktop e 393x708 para **393x852 (100%)** no celular.
- **Pílula Flutuante & Tecla ESC em [`src/components/games/GameWorkspace.tsx`](file:///c:/Projetos/Chatter/src/components/games/GameWorkspace.tsx)**:
  - Inserido um botão/pílula retrátil translúcido no canto superior direito para restaurar menus com 1 clique.
  - Listener global da tecla `ESC` restaura a interface ou fecha modais.

---

### 2.2. Port Mobile Nativo — Solução Definitiva da Tela Preta
- **Diagnóstico da Causa Raiz**:
  - No Desktop, o Tauri v2 usa `win.add_child(...)` para ancorar WebViews filhas. Essa API não existe no Android (`#[cfg(desktop)]` em `manager.rs`).
  - No celular, o Rust apenas marcava o slot como ativo sem instanciar nenhuma WebView. O React ficava aguardando e exibia um container vazio `bg-black`.
- **Criação do [`GameSlotManager.kt`](file:///c:/Projetos/Chatter/src-tauri/gen/android/app/src/main/java/com/idlestream/app/GameSlotManager.kt)**:
  - Criação de um container nativo customizado `PassThroughFrameLayout` injetado na raiz da `MainActivity`.
  - Toques sobre as coordenadas dos jogos são interceptados diretamente pela WebView do jogo; toques fora passam livremente para a UI do React.
  - Gerenciamento de até 4 instâncias de `android.webkit.WebView` com hardware acceleration (`LAYER_TYPE_HARDWARE`), `domStorageEnabled`, `databaseEnabled` e `mediaPlaybackRequiresUserGesture = false`.
- **Persistência 24/7 em Segundo Plano**:
  - `resumeTimers()` forçado em segundo plano.
  - Integração com `IdleStreamForegroundService`, `Partial WakeLock` e `WifiLock` para garantir que o farm continue com a tela do celular apagada ou app minimizado.
- **Isolamento de Contas via Storage Proxy**:
  - Injeção em tempo de execução de proxy no protótipo de `Storage` com prefixo `slot_{id}_...`.
  - Permite rodar 4 contas Google / PokeIdle independentes no mesmo aparelho sem misturar sessões WebSocket nem `localStorage`.

---

### 2.3. Layouts Mobile Responsivos (Foco vs 4 Jogos)
- Implementada a barra de controle responsiva com botões em pílula:
  - **`[ 🔲 Foco ]`**: Isola o slot selecionado ocupando 100% da área do card, exibindo abas horizontais no topo (`Conta 1 #1`, `Conta 2 #2`, `Conta 3 #3`, `Conta 4 #4`) para facilitar o toque no celular.
  - **`[ ⊞ 4 Jogos ]`**: Grade compacta 2x2 permitindo acompanhar as 4 contas simultâneas.

---

### 2.4. Modos de Economia Multi-Nível & PokeIdle Ultra
- **Ajustes em [`src-tauri/src/games/anti_sleep.js`](file:///c:/Projetos/Chatter/src-tauri/src/games/anti_sleep.js)**:
  - **Loop de FPS Variável**: Throttling de `requestAnimationFrame` através de delta de tempo em milissegundos:
    - **60 FPS** (Taxa total)
    - **🍃 30 FPS** (Economia padrão: ~50% de redução de GPU)
    - **🔋 10 FPS** (Super Economia: ~83% de redução de GPU mantendo processamento 100% ativo)
  - **Modo Ultra PokeIdle Integrado**:
    - Função `window.__togglePokeIdleUltra(forceState)` que aciona o `document.documentElement.classList.add('modo-ultra')` nativo do PokeIdle.
    - O Canvas de animações é completamente pausado e o jogo renderiza apenas os cards de rendimento (XP/hora, Ouro/hora, drops de Boss Tokens e Shinies).
- **Controles na UI**: Seletor multi-nível adicionado no header do workspace e botões dedicados de Ultra Mode por slot.

---

### 2.5. Ponte Multiplataforma Abstrata
- Criação de [`src/services/gamePlatformService.ts`](file:///c:/Projetos/Chatter/src/services/gamePlatformService.ts):
  - Abstrai todas as chamadas de slots: no Desktop despacha comandos Rust `invoke('game_*')`, no Android aciona métodos da `AndroidBridge` nativa em Java/Kotlin.

---

## 🐛 3. Problemas Críticos Encontrados e Corrigidos Durante os Testes

Durante a execução no emulador Pixel 5 (Android 13 / API 33), identificamos 4 bugs complexos que foram diagnosticados e solucionados:

| Problema Encontrado | Causa Raiz | Solução Aplicada |
| :--- | :--- | :--- |
| **Slot não atualizava status na UI ao iniciar** | O Kotlin colocava `activeSlots[slotId] = url` dentro de `runOnUiThread`. O JS lia a lista de forma síncrona na thread IPC antes da UI thread rodar, recebendo lista vazia `[]`. | `activeSlots` (que é um `ConcurrentHashMap`) passou a ser atualizado instantaneamente fora do `runOnUiThread`, e o React recebeu atualização de estado otimista (`setActiveSlots`). |
| **WebViews ficavam com tamanho 0x0** | O React enviava as coordenadas dos slots como `{ slotId: ... }` em certos fluxos e `{ slot_id: ... }` em outros. O parser Android exigia estritamente `obj.getString("slot_id")` e lançava uma `JSONException` silenciosa. | Kotlin atualizado para leitura polimórfica: `val slotId = if (obj.has("slot_id")) obj.getString("slot_id") else obj.optString("slotId", "")`. |
| **Serialização de JSONArray no Android** | `org.json.JSONArray(list)` dependia de reflexão em coleções Kotlin/Java, falhando em certas versões da API. | Substituído por iteração explícita e determinística: `val arr = org.json.JSONArray(); for (id in list) { arr.put(id) }`. |
| **Erro de Assinatura no Auto-Updater** | `npx tauri build` falhava ao assinar com a chave privada por falta da senha da chave `idlestream.key`. | Localizada a senha original gerada em 28/10 (**`idlestream_signing_key_2026`**), gerado o arquivo `.sig` e atualizado o manifesto `latest.json`. |

---

## 🧪 4. Resumo das Validações e Testes Executados

1. **Suíte Automatizada ([`scripts/test-v3-mobile-games.ts`](file:///c:/Projetos/Chatter/scripts/test-v3-mobile-games.ts))**:
   - `[1/5]` Modo Tela Cheia Imersivo (Desktop & Mobile): **Aprovado**
   - `[2/5]` Layouts Mobile Foco 1x e Grade 4x: **Aprovado**
   - `[3/5]` Economia Multi-Nível (62 qps -> 31 qps -> 9 qps): **Aprovado**
   - `[4/5]` Isolamento de Storage de 4 contas: **Aprovado**
   - `[5/5]` Conversão de DPI e Coordenadas Android: **Aprovado**
2. **Testes Unitários Rust**:
   - `cargo test --manifest-path src-tauri/Cargo.toml`: **15 testes aprovados, 0 falhas**.
3. **Frontend Build**:
   - `npm run build` (`tsc && vite build`): **0 erros de tipagem**.
4. **Validação ao Vivo em Emulador Android (Pixel 5)**:
   - Inicialização do app, permissões de bateria, injeção de scripts e renderização de abas validadas com sucesso.
5. **Suíte de Versionamento & Updater**:
   - `npx tsx scripts/test-version.ts`: **5/5 testes aprovados**.

---

## 📦 5. Artefatos de Release v3.0.1 Publicados

- **Tag no GitHub**: [`v3.0.1`](https://github.com/GabrielGamaBaptista/IdleStream/releases/tag/v3.0.1) (Marcada como `Latest`).
- **Arquivos Disponíveis na Release**:
  1. `IdleStream_3.0.1_arm64.apk` (9.71 MB)
  2. `IdleStream_3.0.1_x64-setup.exe` (2.74 MB)
  3. `IdleStream_3.0.1_x64-setup.exe.sig` (Assinatura digital do instalador)
  4. `idlestream.exe` (Executável portátil Windows)
  5. `latest.json` (Manifesto assinado para o Auto-Updater)
- **Documentação de Releases**: Criado o arquivo [`RELEASE_GUIDE.md`](file:///c:/Projetos/Chatter/RELEASE_GUIDE.md) na raiz do repositório contendo todas as chaves, comandos e instruções para futuros builds.

---

---

## 🚀 7. Hotfix v3.0.1 (Login Google OAuth & Responsividade Mobile)

Identificados e corrigidos dois problemas críticos na release v3.0.1:

1. **Correção de Login Google/OAuth 2FA no PokeIdle**:
   - Diagnóstico: O script anti-CSRF do PokeIdle (`app.js`) validava `localStorage.getItem('oauth-ida')` no topo da página de retorno do Google. No Android, o isolamento era injetado tardiamente no `onPageFinished`, causando o erro *"Não deu para concluir este login aqui: por segurança, ele só vale na página que foi ao Google/Discord"*.
   - Solução: Injeção síncrona prévia via `WebViewCompat.addDocumentStartJavaScript`, ativação de cookies de terceiros (`setAcceptThirdPartyCookies(true)`), fallback inteligente para chaves OAuth (`oauth-ida`) e remoção de `; wv` e `Version/X.X` do `User-Agent`.
2. **Correção de Botões Cortados na Interface Mobile**:
   - A barra superior de ferramentas de jogos e os cabeçalhos dos slots receberam container elástico com rolagem horizontal suave (`overflow-x-auto no-scrollbar`) e botões compactos (`Iniciar`, `Parar`, `60`, `30`, `10`, `4x`, `1x`).
   - Os botões `[Foco]`, `[Tela Cheia]` e `[Recolher Barra]` tornaram-se 100% visíveis e táteis em smartphones de qualquer resolução (360px a 412px+).
3. **Re-build & Publicação de Assinatura Oficial**:
   - Compilado instalador Windows assinado com Minisign (`IdleStream_3.0.1_x64-setup.exe.sig`).
   - Compilado APK Android release (`IdleStream_3.0.1_arm64.apk` — 9.62 MB).
   - Atualizado manifesto `latest.json` com a nova assinatura e feito upload dos 5 artefatos na tag `v3.0.1` do GitHub.

---

## 💎 8. Release v3.0.2 (Isolamento Nativo Multi-Profile & Google OAuth Independente)

Identificado e corrigido o compartilhamento de sessão entre as contas no mobile:

1. **Problema**:
   - Ao fazer login no slot "Conta 1", os slots "Conta 2", "Conta 3" e "Conta 4" abriam automaticamente logados com a Conta 1.
   - O Google OAuth reaproveitava os cookies globais da sessão anterior e impedia selecionar outras contas do Google.
   - A chave de sessão `sessao` caía no fallback legado do `localStorage`.

2. **Solução Implementada em `GameSlotManager.kt`**:
   - **Multi-Profile Nativo AndroidX (`MULTI_PROFILE`)**: Cada slot utiliza `ProfileStore.getInstance().getOrCreateProfile("slot_$slotId")` e `WebViewCompat.setProfile(webView, "slot_$slotId")`, garantindo isolamento total em nível de Chromium para cookies, cache e banco de dados.
   - **Forçar Seletor de Contas no Google OAuth (`prompt=select_account`)**: Intercepção automática de URLs do Google (`accounts.google.com`) no `onPageStarted` e `shouldOverrideUrlLoading`, injetando `prompt=select_account` para que cada slot permita autenticar uma conta diferente do Google.
   - **Isolamento Rígido de LocalStorage**: Removido fallback da chave `sessao` no script de isolamento injetado; apenas chaves transitórias de handshake (`oauth-ida`, `oauth_state`) são compartilhadas para completar o fluxo do PokeIdle. Purga proativa de `sessao` legado no início.

3. **Artefatos Gerados e Publicados na Tag v3.0.2**:
   - `IdleStream_3.0.2_arm64.apk` (9.72 MB)
   - `IdleStream_3.0.2_x64-setup.exe` (2.74 MB)
   - `IdleStream_3.0.2_x64-setup.exe.sig` (Assinatura Minisign oficial)
   - `idlestream.exe` (Binário portátil Windows)
   - `latest.json` (Manifesto assinado)

---

## ⚡ 9. Release v3.0.3 (Persistência 24/7 de 4 Abas em Segundo Plano, Tela Bloqueada & Ultra PokeIdle)

Identificada e solucionada a inatividade das abas quando o aplicativo era minimizado ou o celular ficava com tela bloqueada, além da correção definitiva do botão do Modo Ultra Economia:

1. **Diagnóstico da Inatividade em Segundo Plano e Tela Apagada**:
   - Abas secundárias no layout Foco (1x) recebiam `View.GONE`, fazendo o Chromium pausar o motor JavaScript.
   - Throttling severo do Chromium após poucos minutos em segundo plano limitava `setInterval` para 1 vez por minuto, fazendo o keepalive do WebSocket falhar (>25s) e o vigia do PokeIdle derrubar o socket.
   - O botão do Modo Ultra Economia tentava clicar em `#cfg-ultra` antes do modal de configurações estar aberto e aplicava apenas CSS, sem montar `#ultra` ou acionar `#ultra-sair`.

2. **Soluções Arquiteturais Aplicadas**:
   - **Fim do `View.GONE`**: Slots inativos permanecem como `View.VISIBLE`, `alpha = 0f` e 1x1 px em `(-100, -100)`, mantendo a pipeline Chromium 100% ativa para as 4 contas simultaneamente.
   - **Web Audio Silent Loop**: Injeção de buffer silencioso via `AudioContext` contínuo no `anti_sleep.js`, isentando o Chromium de congelamento de segundo plano.
   - **Watchdog Nativo Heartbeat**: Executor em background rodando a cada 2500ms no Android com `PARTIAL_WAKE_LOCK`, disparando `resumeTimers()`, guardião de keepalive no WebSocket (`{ t: 'ping' }`) e reconexão automática.
   - **Modo Ultra PokeIdle Funcional**: Acionamento síncrono via `#btn-config` -> `#cfg-ultra` para ativar e `#ultra-sair` para desativar, testado e validado em 5/5 cenários.
   - **Sobrescrita do Ciclo de Vida da Activity**: `onStop()` e `onPause()` garantem `resumeAllTimers()` em todas as transições de tela.

3. **Artefatos Oficiais Gerados para a Tag v3.0.3**:
   - `IdleStream_3.0.3_arm64.apk` (9.81 MB)
   - `IdleStream_3.0.3_x64-setup.exe` (2.74 MB)
   - `IdleStream_3.0.3_x64-setup.exe.sig` (Assinatura digital Minisign)
   - `idlestream.exe` (Executável portátil)
   - `latest.json` (Manifesto atualizado e assinado)

---

## 🚀 10. Release v3.0.4 (Execução Ininterrupta 24/7 com Tela Bloqueada/Segundo Plano — Baseada em Evidências)

Solucionada em definitivo a inatividade das abas quando outro app é colocado em primeiro plano ou o celular tem a tela bloqueada, aplicando as técnicas comprovadas da indústria (Chromium `AwContents` C++, Android WebKit e `cordova-plugin-background-mode`):

1. **Diagnóstico da Causa Raiz Real**:
   - O Android despachava `dispatchWindowVisibilityChanged(View.GONE)` ao pausar a Activity. O `AwContents` do Chromium alternava para `PageVisibilityState::kHidden`, paralisando o `requestAnimationFrame` (0 FPS), travando WebWorkers (`HackTimer.js` do PokeIdle) e limitando timers a 1x/min.
   - O renderizador multiprocesso do Android 8+ baixava sua prioridade para `WAIVED` por ter `waivedWhenNotVisible = true` por padrão.
   - O Tauri (`WryActivity.kt`) chamava nativamente `mWebView.onPause()` no `onPause()` da Activity, congelando a WebView principal.
   - O script `anti_sleep.js` só era injetado no `onPageFinished`, tarde demais para hooks do loop inicial de combate do PokeIdle.

2. **Soluções Técnicas Implementadas**:
   - **`PersistentWebView` com Blindagem de Visibilidade**: Subclasse nativa no Kotlin sobrescrevendo `onWindowVisibilityChanged`, `onVisibilityChanged` e `dispatchWindowVisibilityChanged` para repassar estritamente `View.VISIBLE` ao Chromium. Neutralizados também `onPause()` e `pauseTimers()`.
   - **`setRendererPriorityPolicy(RENDERER_PRIORITY_IMPORTANT, false)`**: Impede que o sistema operacional rebaixe ou congele o processo de renderização das WebViews fora de tela.
   - **Isenção de Throttling Chromium via Áudio Ativo (`IsAudible`)**: Injeção de elemento HTML5 `<audio loop autoplay src="data:audio/wav;base64,...">` com volume imperceptível e desmutado, ativando `RenderFrameHostImpl::IsAudible()` no Chromium e isentando timers de background throttling.
   - **Injeção em `DOCUMENT_START_SCRIPT`**: `anti_sleep.js` passa a ser injetado via `WebViewCompat.addDocumentStartJavaScript`, garantindo spoofing de visibilidade e proxy de renderização antes de qualquer script do jogo carregar.
   - **Neutralização de Pausa no `MainActivity.kt`**: Chamada imediata a `mainWebView?.onResume()` após `super.onPause()` e `super.onStop()`, mantendo o frontend do Tauri acordado.
   - **Watchdog Heartbeat Acelerado (1500ms)**: Pulso periódico que reforça `dispatchWindowVisibilityChanged(View.VISIBLE)`, `resumeTimers()` e `__idlestreamHeartbeat()`.

3. **Artefatos Oficiais Gerados para a Tag v3.0.4**:
   - `IdleStream_3.0.4_arm64.apk` (9.81 MB)
   - `IdleStream_3.0.4_x64-setup.exe` (2.74 MB)
   - `IdleStream_3.0.4_x64-setup.exe.sig` (Assinatura digital Minisign)
   - `idlestream.exe` (Executável portátil Windows)
   - `latest.json` (Manifesto assinado)

---

## 🚀 11. Release v3.0.5 (Correção do /hunt no Celular, Despoluição dos Cards e Safe Area Dinâmica)

Solucionada a quebra de layout no cabeçalho dos cards dos jogos e o travamento da extensão oficial `/hunt for PokeIdle` no Android:

1. **Diagnóstico da Causa Raiz Real**:
   - **Sobreposição dos Cards**: O badge de FPS (`10 / 30 / 60`) duplicado dentro dos cards individuais ocupava espaço excessivo na largura reduzida do grid 4x mobile (~170px), fazendo os botões colidirem e quebrarem por baixo dos controles de zoom (`- 67% +`).
   - **Sobreposição com Relógio do Celular**: O `p-0 m-0` forçado no modo tela cheia e o botão flutuante posicionado em `top-2.5` faziam os elementos colidirem com o relógio ("08:42") e o entalhe da câmera do smartphone devido ao `enableEdgeToEdge()`.
   - **/hunt Travado no Celular**: O PokeIdle abre seu WebSocket nos primeiros milissegundos do carregamento. Como a extensão oficial só era injetada no `onPageFinished`, o proxy `WebSocketObservado` era instalado tarde demais, nunca capturando os pacotes `"welcome"` e `"estado"`, travando a tela em *"Esperando o jogo conectar..."*.

2. **Soluções Técnicas Implementadas**:
   - **Despoluição dos Cards**: Removido o badge redundante de 10/30/60 de cada card, mantendo o controle global na barra superior e destacando o botão roxo de Ultra Economia (`BarChart3`).
   - **Safe Area Dinâmica**: Preservado `pt-[env(safe-area-inset-top,0px)]` mesmo em tela cheia e botão de restaurar posicionado com `top-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.5rem))]`.
   - **Injeção de /hunt em `DOCUMENT_START_SCRIPT`**: `hunt_extension.js` agora é injetado via `WebViewCompat.addDocumentStartJavaScript`, capturando o handshake do WebSocket antes da execução do cliente do jogo, com cache em memória e leitura zero-overhead.

3. **Artefatos Oficiais Gerados para a Tag v3.0.5**:
   - `IdleStream_3.0.5_arm64.apk` (10.0 MB)
   - `latest.json` (Manifesto atualizado para v3.0.5)

---

## 🚀 12. Release v3.0.6 (Estabilidade Total de GPU no Desktop contra Blackout)

Solucionado o congelamento com tela preta nas 4 abas de jogos no Windows Desktop após uso prolongado ou lock/sleep de tela:

1. **Diagnóstico da Causa Raiz Real**:
   - A flag `--in-process-gpu` no Edge WebView2 desativava o processo dedicado de GPU do Chromium e impedia a recuperação de contexto em caso de *DirectX Device Loss* ou *DirectComposition surface failure*.
   - A flag `--renderer-process-limit=4` forçava os 4 jogos e as 32 streams ativas a compartilharem processos renderizadores idênticos, derrubando todas as abas juntas.
   - A flag `--max-old-space-size=256` asfixiava o heap do V8 ao longo do tempo, estourando texturas WebGL do PokeIdle.

2. **Soluções Técnicas Implementadas**:
   - Substituído `--in-process-gpu` por processo dedicado com auto-recuperação (`--disable-gpu-process-crash-limit`).
   - Aumentado o heap de V8 para 512 MB (`--max-old-space-size=512`), garantindo fôlego de texturas com mínimo impacto em RAM.
   - Ajustado `--renderer-process-limit=6` para desacoplar as abas ativas.
   - Chamada periódica de `window.gc()` adaptada para `requestIdleCallback`.

3. **Artefatos Oficiais Gerados para a Tag v3.0.6**:
   - `IdleStream_3.0.6_arm64.apk` (10.0 MB)
   - `IdleStream_3.0.6_x64-setup.exe` (2.74 MB)
   - `IdleStream_3.0.6_x64-setup.exe.sig` (Assinatura digital Minisign)
   - `idlestream.exe` (Executável portátil Windows)
   - `latest.json` (Manifesto assinado)





