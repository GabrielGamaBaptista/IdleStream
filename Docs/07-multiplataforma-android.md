---
id: "DOC-07-MULTIPLATAFORMA-ANDROID"
title: "Multiplataforma, Interoperabilidade JNI, Android Foreground Service e Pipeline de Build"
category: "mobile"
tags: [idlestream, android, jni, foreground-service, wakelock, battery-optimization, ndk, gradle]
related_code:
  - "src-tauri/gen/android/app/src/main/java/com/idlestream/app/IdleStreamApplication.kt"
  - "src-tauri/gen/android/app/src/main/java/com/idlestream/app/MainActivity.kt"
  - "src-tauri/gen/android/app/src/main/java/com/idlestream/app/GameSlotManager.kt"
  - "src-tauri/gen/android/app/src/main/java/com/idlestream/app/IdleStreamForegroundService.kt"
  - "src-tauri/gen/android/app/src/main/java/com/idlestream/app/ServiceWatchdogReceiver.kt"
  - "src-tauri/gen/android/app/src/main/java/com/idlestream/app/BootReceiver.kt"
  - "src-tauri/gen/android/app/src/main/java/com/idlestream/app/LifecycleLogger.kt"
  - "src-tauri/gen/android/app/src/main/java/com/idlestream/app/KickHttpBridge.kt"
  - "src-tauri/gen/android/app/src/main/java/com/idlestream/app/BatteryOptimizationHelper.kt"
  - "src-tauri/gen/android/app/src/main/java/com/idlestream/app/VoteWebViewManager.kt"
  - "src-tauri/gen/android/app/src/main/java/com/idlestream/app/VoteNotificationHelper.kt"
  - "src-tauri/gen/android/app/src/main/java/com/idlestream/app/VoteAlarmReceiver.kt"
  - "src-tauri/gen/android/app/src/test/java/com/idlestream/app/BackgroundResilienceTest.kt"
  - "scripts/build-android.ps1"
wiki_links:
  - "[[README]]"
  - "[[00-visao-geral]]"
  - "[[01-arquitetura]]"
  - "[[03-kick-engine]]"
  - "[[05-backend-core]]"
  - "[[06-frontend]]"
  - "[[08-operacao-e-scripts]]"
  - "[[09-sistema-de-votos]]"
  - "[[11-resiliencia-segundo-plano]]"
status: "completed"
version: "4.1.2"
last_updated: "2026-11-12"
summary: "Engenharia profunda do ecossistema Android: persistência nativa de sessões PokeIdle em SharedPreferences, pontes JNI e JavaScript, Foreground Service com WakeLock, rastreamento de toques anti-sleep e pipeline NDK/Gradle."
---

# Multiplataforma, Interoperabilidade JNI, Android Foreground Service e Pipeline de Build

Este documento especifica a engenharia do **IdleStream** no ecossistema **Android** (API 24+ / Android 7.0 a 15+), detalhando a integração entre o runtime Rust compilado como biblioteca dinâmica (`.so`), as activities Kotlin, a proteção contra suspensão de processos (*Doze Mode*) e a esteira de build automatizada.

---

## 1. Divergências Arquiteturais: Desktop (Windows) vs Mobile (Android)

Para operar de forma transparente em ambas as plataformas, o código-fonte adapta seus mecanismos em tempo de compilação (`#[cfg(target_os = "android")]` vs `#[cfg(desktop)]`):

| Funcionalidade | Implementação Desktop (Windows) | Implementação Mobile (Android) |
| :--- | :--- | :--- |
| **Janelas e WebViews** | Processo Win32 + WebView2 com Child Webviews Wry | `MainActivity` (`TauriActivity`) + `GameSlotManager` em WebViews nativas |
| **Ciclo de Segundo Plano** | Minimização na Bandeja do Sistema (`System Tray`) | `IdleStreamForegroundService` com notificação persistente |
| **Bypass TLS Cloudflare** | Subprocesso assíncrono `curl.exe` (`CREATE_NO_WINDOW`) | Chamada JNI delegando ao cliente **OkHttp 4.12** nativo |
| **Execução Anti-Sleep** | Flags de inicialização Chromium (`--disable-background-*`) | `PowerManager.WakeLock` parcial + `WifiLock` de alta performance |
| **Mecanismo de Update** | Plugin oficial Tauri Updater com delta assinado Minisign | Download de APK via GitHub Releases + `AppUpdateHelper` nativo |
| **Autenticação OAuth** | Servidor HTTP temporário `tiny_http` em `localhost:3000` | Interceptação de redirecionamento via `TwitchLoginActivity` |

---

## 2. Camada JNI & Pontes de Comunicação

A comunicação multiplataforma opera em duas vias distintas:

```mermaid
flowchart TB
    subgraph Frontend_JS ["Frontend JavaScript (React)"]
        UI["Interface React"]
        JS_Bridge["window.AndroidBridge"]
    end

    subgraph Native_Kotlin ["Android Runtime (Kotlin / Java)"]
        MainAct["MainActivity.kt (@JavascriptInterface)"]
        HttpBridgeJava["KickHttpBridge.kt"]
        FgService["IdleStreamForegroundService.kt"]
    end

    subgraph Native_Rust ["Rust Core (libidlestream_lib.so)"]
        JNI_Reg["Java_com_idlestream_app_KickHttpBridge_registerNativeBridge"]
        RustKickHttp["kick/http.rs (kick_http_request)"]
        RustAppState["AppState::emit_status()"]
    end

    UI -->|Chamadas Diretas| JS_Bridge
    JS_Bridge -->|Invocação Nativa| MainAct
    MainAct --> FgService

    HttpBridgeJava -->|Registra JVM no Boot| JNI_Reg
    RustKickHttp -->|JNI: CallStaticObjectMethod| HttpBridgeJava
    RustAppState -->|update_android_notification| RustKickHttp
    RustKickHttp -->|JNI: updateNotification| FgService
```

### 2.1 Interface JavaScript Injetada (`window.AndroidBridge`)
Disponibilizada no WebView via `@JavascriptInterface` na classe `MainActivity.kt`:
- **Isenção de Bateria, Sobreposição & OEM**: `isBatteryOptimizationIgnored()`, `requestIgnoreBatteryOptimization()`, `openAppSettings()`, `canDrawOverlays()`, `requestOverlayPermission()`, `hasNotificationPermission()` e `getOemGuidanceJson()`.
- **Serviço de Segundo Plano & Farm Ativo**: `startForegroundService()`, `stopForegroundService()`, `setFarmingActive(active)`, `updateNotification(title, text)`.
- **Slots de Jogos (Nível de Processo)**: `startGameSlot()`, `stopGameSlot()`, `reloadGameSlot()`, `updateGameSlotBounds()`, `setGameSlotZoom()`, `setGameSlotFps()`, `togglePokeIdleUltra()`, `hideAllGameSlots()`, `getActiveGameSlots()`. O `GameSlotManager` reside em `IdleStreamApplication` (nível de processo) com `MutableContextWrapper` e isolamento de crash (`onRenderProcessGone`), mantendo os jogos vivos mesmo se a `MainActivity` for recriada.
- **Votos TopIdle & Alarmes**: `openVoteWebView()`, `closeVoteWebView()`, `updateVoteWebViewBounds()`, `reloadVoteWebView()`, `clearVoteTopIdleSession()`, `syncVoteAlarms()`, `sendVoteTestNotification()` e `consumePendingOpenTab()`.
- **Diagnóstico & Atualização**: `getDiagnosticReport()`, `getCrashLog()`, `clearCrashLog()`, `canInstallPackages()`, `requestInstallPermission()`, `downloadAndInstallApk()`.
- **Login OAuth Seguro**: `openTwitchLogin(accountId, label)` e `openKickLogin(accountId, label)` abrem activities separadas, evitando poluição de cookies no WebView principal.

### 2.2 Callback JNI Rust $\leftrightarrow$ OkHttp (`KickHttpBridge.kt` & `kick/http.rs`)
1. **Registro Inicial**: Ao carregar a aplicação, `KickHttpBridge.kt` invoca o método C nativo:
   ```rust
   #[no_mangle]
   pub extern "system" fn Java_com_idlestream_app_KickHttpBridge_registerNativeBridge(
       mut env: JNIEnv,
       class: JClass,
   ) {
       let _ = JVM.set(env.get_java_vm().unwrap());
       let _ = BRIDGE_CLASS.set(env.new_global_ref(class).unwrap());
   }
   ```
2. **Execução de Chamada**: Quando o Rust precisa fazer requisições na API Kick:
   - Obtém o ponteiro da JVM (`JVM.get()`).
   - Anexa a thread atual à JVM (`jvm.attach_current_thread()`).
   - Invoca o método Kotlin `KickHttpBridge.request(method, url, headersJson, body, timeoutSecs)`.
   - O OkHttp processa a conexão e retorna o envelope JSON com status code e corpo.

### 2.3 Persistência de Sessão PokeIdle & Rastreamento de Toques (`GameSlotBridge`)
No Android, o fechamento completo do aplicativo pelo usuário ou o encerramento da Activity pelo sistema descartava o cache LevelDB e cookies não sincronizados das WebViews secundárias. A versão 3.2.8 introduziu uma camada de blindagem:
- **`GameSlotBridge` (`IdleStreamSlotBridge`)**: Injetada em cada WebView via `addJavascriptInterface`. Permite comunicação direta entre o JavaScript do jogo e o runtime Android.
- **Persistência Atômica em `SharedPreferences`**: Sempre que o PokeIdle grava sua chave de autenticação (`localStorage.setItem('sessao', ...)`), o script de isolamento espelha o JSON completo no arquivo nativo `idlestream_game_sessions` sob a chave `slot_{slotId}_sessao` e aciona `CookieManager.getInstance().flush()`.
- **Restauração Transparente no Boot**: No carregamento inicial do slot (`onPageStarted` e `DOCUMENT_START_SCRIPT`), se o localStorage estiver limpo, a sessão salva é resgatada de `IdleStreamSlotBridge.getSavedSession()` e re-injetada antes de `app.js` rodar, abrindo o jogo já autenticado sem exigir login do Google ou e-mail/senha.
- **Rastreamento de Toques (`MainActivity.dispatchTouchEvent`)**: Intercepta eventos físicos de toque na tela, atualizando `lastUserInteractionTime` e disparando `window.__onUserActivity()` para impedir suspensão indevida por inatividade.

### 2.4 WebView de Votos e Alarmes `24h 01m` (`VoteWebViewManager` & `VoteAlarmReceiver`)
- **`VoteWebViewManager`**: Cria uma única WebView interativa sob demanda quando o usuário entra para votar em uma conta, compartilhando o `ProfileStore` (`slot_slot-X`) dos Idle Games para aproveitar as 4 contas Google sem interferir em popups OAuth (`onCreateWindow`) ou CAPTCHAs. Destrói completamente a WebView (`destroy()`) ao sair.
- **`VoteAlarmReceiver` & `VoteNotificationHelper`**: Usa `AlarmManager.setAndAllowWhileIdle` (`RTC_WAKEUP`) em conjunto com `VoteNotificationHelper` (deduplicado via `SharedPreferences`) e re-agendamento pós-boot no `BootReceiver.kt`, garantindo alertas exatos de **24h 01m** mesmo em Doze Mode e abrindo a aba `Votos` ao tocar na notificação.

---

## 3. Resiliência em Segundo Plano: `IdleStreamForegroundService`

O sistema operacional Android impõe restrições severas a processos em segundo plano a partir do Android 8.0 (Oreo) e Android 14+ (Upside Down Cake). Sem um serviço apropriado, a conexão WebSocket com Twitch e Kick é encerrada após 60 segundos de tela apagada.

```mermaid
stateDiagram-v2
    [*] --> ServicoIniciado: ContextCompat.startForegroundService()
    
    state ServicoIniciado {
        [*] --> SetupNotification: NotificationCompat.Builder
        SetupNotification --> AdquireLocks: WakeLock + WifiLock
        AdquireLocks --> MonitorandoAtivo: FOREGROUND_SERVICE_TYPE_SPECIAL_USE
    }

    MonitorandoAtivo --> AtualizaNotificacao: Rust emite novo status/pontos
    AtualizaNotificacao --> MonitorandoAtivo

    MonitorandoAtivo --> [*]: ACTION_STOP ou onTaskRemoved (Manual)
```

### 3.1 Mecanismos de Proteção Ativos (`v4.1.1` / `v4.1.2`):
1. **Notificação Persistente & Contrato `START_STICKY`**:
   - Registrada no canal `idlestream_vigilance_channel` com `startForeground(...)` garantido em todas as ações não-parada (incluindo `ACTION_UPDATE` e reinicializações `START_STICKY` com `intent == null`) usando `ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE` (Android 14+).
   - Supervisor periódico (30s) mantém `WakeLock`/`WifiLock` e chama `CookieManager.getInstance().flush()`.
2. **Modo 1 FPS + Liberação de GPU na Tela Apagada e após 10s em Fundo**:
   - Listener dinâmico para `ACTION_SCREEN_OFF` (imediato) e timer de **10 segundos** em `MainActivity.onStop()` alternam os WebViews de jogos para **1 FPS** + `View.LAYER_TYPE_NONE`, mantendo WebSockets, `HackTimer` e `/hunt` ativos.
3. **Partial WakeLock (`PowerManager.PARTIAL_WAKE_LOCK`) e `WifiLock`**:
   - Mantêm CPU e Wi-Fi (`WIFI_MODE_FULL_LOW_LATENCY` no Android 10+) ativos mesmo com tela bloqueada.
4. **Watchdog de 3 Minutos vs. Fechamento Manual**:
   - [`ServiceWatchdogReceiver`](file:///C:/Projetos/Chatter/src-tauri/gen/android/app/src/main/java/com/idlestream/app/ServiceWatchdogReceiver.kt) (`AlarmManager.setAndAllowWhileIdle`) verifica a cada 3 minutos se o serviço caiu involuntariamente (LMK/OEM) com `farming_active == true`.
   - Fechamentos manuais (`onTaskRemoved` nos Apps Recentes, botão **"Parar"** ou `ApplicationExitInfo` com `REASON_USER_REQUESTED` / `REASON_USER_STOPPED` / `REASON_EXIT_SELF`) executam `performManualShutdown()`, gravam `farming_active = false` com `.commit()` e desarmam qualquer auto-reabertura. (Veja detalhes completos em **[[11-resiliencia-segundo-plano]]**.)

### 3.2 Bypass das Otimizações Agressivas de Bateria OEM
Fabricantes como Xiaomi (MIUI/HyperOS), Samsung (OneUI), Motorola e Realme/Oppo implementam "Battery Killers" proprietários.
- `BatteryOptimizationHelper` verifica isenção do *Doze Mode*, permissão `POST_NOTIFICATIONS`, permissão opcional de auto-recuperação em segundo plano (`SYSTEM_ALERT_WINDOW`) e fornece o checklist específico por fabricante exibido em `BatteryBanner.tsx`.

---

## 4. Pipeline de Compilação Automatizada (`scripts/build-android.ps1`)

O build do IdleStream para Android é orquestrado pelo script PowerShell [`scripts/build-android.ps1`](file:///C:/Projetos/Chatter/scripts/build-android.ps1), dividido em 5 etapas determinísticas:

```mermaid
flowchart TD
    S1["[1/5] Compilação do Frontend (npm run build -> dist/)"]
    S2["[2/5] Configuração de Ambiente NDK & Toolchains LLVM"]
    S3["[3/5] Cross-Compilation Rust (cargo build --target aarch64-linux-android --release)"]
    S4["[4/5] Cópia de Binários (.so) e Assets Web para gen/android/"]
    S5["[5/5] Montagem do APK via Gradle (assembleArm64Release)"]

    S1 --> S2 --> S3 --> S4 --> S5 --> FinalAPK["APK Final: IdleStream_4.1.2_arm64.apk"]
```

### Análise das Etapas do Script:
1. **Passo 1 (Frontend)**: Executa `npm run build` gerando o bundle otimizado em `dist/`.
2. **Passo 2 (Ambiente NDK)**: Configura as variáveis de ambiente do compilador cruzado:
   - Linker: `aarch64-linux-android24-clang.cmd`.
   - Sysroot e binários NDK: `Android/Sdk/ndk/27.1.12297006/...`.
3. **Passo 3 (Rust Core)**: Compila a biblioteca dinâmica:
   ```powershell
   cargo build --manifest-path src-tauri/Cargo.toml --target aarch64-linux-android --release --lib --features custom-protocol
   ```
4. **Passo 4 (Distribuição de Assets)**:
   - Copia `libidlestream_lib.so` para `src-tauri/gen/android/app/src/main/jniLibs/arm64-v8a/`.
   - Copia o frontend compilado (`dist/*`) para `src-tauri/gen/android/app/src/main/assets/`.
   - Copia os scripts `anti_sleep.js` e `hunt_extension.js` para `assets/games/` e `vote_observer.js` para `assets/votes/`.
5. **Passo 5 (Gradle Packaging)**:
   - Invoca `.\gradlew.bat assembleArm64Release`.
   - Gera o binário standalone assinado e otimizado com ProGuard/R8 para distribuição.

---

## 5. Próximos Passos & Documentos Relacionados

Para compreender a esteira de testes automatizados, assinatura criptográfica de releases e diagnóstico de falhas em produção:
👉 Prossiga para: **[[08-operacao-e-scripts]] — Operação, Suíte de Testes e Guia de Release**.
