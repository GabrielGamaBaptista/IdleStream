---
id: "DOC-09-SISTEMA-DE-VOTOS"
title: "Sistema de Votos Diários TopIdle (WebView Sob Demanda, Perfis Google & Alertas 24h 01m)"
category: "feature"
tags: [idlestream, votes, topidle, webview, captcha, notifications, alarm-manager, google-oauth]
related_code:
  - "src-tauri/src/votes/mod.rs"
  - "src-tauri/src/votes/policy.rs"
  - "src-tauri/src/votes/manager.rs"
  - "src-tauri/src/votes/notifier.rs"
  - "src-tauri/src/votes/commands.rs"
  - "src-tauri/src/votes/vote_observer.js"
  - "src-tauri/gen/android/app/src/main/java/com/idlestream/app/VoteUrlPolicy.kt"
  - "src-tauri/gen/android/app/src/main/java/com/idlestream/app/VoteWebViewManager.kt"
  - "src-tauri/gen/android/app/src/main/java/com/idlestream/app/VoteNotificationHelper.kt"
  - "src-tauri/gen/android/app/src/main/java/com/idlestream/app/VoteAlarmReceiver.kt"
  - "src/components/votes/VoteWorkspace.tsx"
  - "src/services/votePlatformService.ts"
  - "scripts/test-votes.ts"
wiki_links:
  - "[[README]]"
  - "[[01-arquitetura]]"
  - "[[04-games-engine]]"
  - "[[05-backend-core]]"
  - "[[06-frontend]]"
  - "[[07-multiplataforma-android]]"
  - "[[08-operacao-e-scripts]]"
status: "completed"
version: "4.0.0"
last_updated: "2026-11-10"
summary: "Especificação técnica da seção Votos do IdleStream v4.0.0 para votação diária no TopIdle com WebView interativa sob demanda (0 MB em repouso), whitelist estrita, reuso dos 4 perfis Google de Idle Games e notificações exatas após 24h 01m em Desktop e Android."
---

# Sistema de Votos Diários TopIdle (`v4.0.0`)

Este documento descreve a arquitetura, segurança e operação da seção **Votos**, introduzida na versão **4.0.0** para gerenciar votos diários no TopIdle (`https://topidle.com/jogo/pokeidle-io-5f9969?playerIdentifier=<ID>`) com total interatividade humana (suportando CAPTCHA) e notificação automática após **24 horas e 1 minuto** (`86.460` segundos).

---

## 1. Contas Padrão e Vínculo com Perfis Google (`config/models.rs`)

Por padrão, na inicialização e migração v3 → v4 via [`ConfigStore::load()`](file:///c:/Projetos/Chatter/src-tauri/src/config/store.rs), o IdleStream cria 4 contas pré-vinculadas aos 4 perfis do módulo `Idle Games`:

| ID Interno | Nome / `playerIdentifier` | Slot Vinculado (`share_game_profile: true`) | Pasta / Perfil de Sessão Compartilhado |
| :--- | :--- | :--- | :--- |
| `vote-1` | `GGB2006` | `slot-1` | Desktop: `game_profiles/slot-1` • Android: `slot_slot-1` |
| `vote-2` | `GGB2006_2` | `slot-2` | Desktop: `game_profiles/slot-2` • Android: `slot_slot-2` |
| `vote-3` | `GGB2006_3` | `slot-3` | Desktop: `game_profiles/slot-3` • Android: `slot_slot-3` |
| `vote-4` | `GGB2006_4` | `slot-4` | Desktop: `game_profiles/slot-4` • Android: `slot_slot-4` |

> [!TIP]
> Compartilhar o diretório/perfil com `slot-1`..`slot-4` permite usar exatamente a **mesma conta Google** e o **mesmo jogador** já autenticados no PokeIdle, sem necessidade de refazer login sempre que abrir o TopIdle. O botão **"Limpar Sessão TopIdle"** remove apenas cookies e storage de `topidle.com`, mantendo o login Google e a sessão do PokeIdle intactos.

---

## 2. Política de Navegação Estrita e Ciclo Sob Demanda (0 MB em Repouso)

A WebView da seção **Votos** segue o princípio de alocação estritamente sob demanda:

```mermaid
flowchart TD
    Dashboard["Aba Votos em Repouso (0 WebView criada = 0 MB RAM)"]
    ClickVote["Clique em 'Abrir TopIdle & Votar'"]
    PolicyCheck{"URL passa em is_allowed_vote_navigation?"}
    SpawnWV["Cria WebView única 'vote-active' + Observer passivo"]
    TopIdleFlow["Interação Humana no TopIdle + Google OAuth Popup + CAPTCHA"]
    ExternalClick["Tentativa de navegação externa"]
    BlockedEvt["Bloqueia e emite 'vote-navigation-blocked'"]
    CloseOrTab["Fecha WebView ou muda de aba"]
    DestroyWV["Destrói Child WebView (wv.close / destroy -> 0 MB RAM)"]

    Dashboard --> ClickVote --> PolicyCheck
    PolicyCheck -- Sim --> SpawnWV --> TopIdleFlow
    TopIdleFlow -- "Fora da whitelist" --> ExternalClick --> BlockedEvt
    TopIdleFlow -- Concluído --> CloseOrTab --> DestroyWV --> Dashboard
```

### 2.1 Whitelist Rigorosa (`votes/policy.rs` & `VoteUrlPolicy.kt`)
Somente URLs `https://` pertencentes aos seguintes escopos são autorizadas no navegador da seção **Votos**:
1. **Site oficial TopIdle**: `topidle.com` e `*.topidle.com`.
2. **Autenticação Google OAuth**: `accounts.google.com`, `accounts.youtube.com`, `myaccount.google.com`, `gds.google.com`, `apis.google.com`, `consent.google.com`, `consent.youtube.com` (com injeção não-invasiva de `prompt=select_account`).
3. **Infraestrutura de CAPTCHA interativo**: `challenges.cloudflare.com`, `*.hcaptcha.com`, `*.recaptcha.net`, `*.gstatic.com` e `google.com/recaptcha*`.

O script `vote_observer.js` atua **exclusivamente em modo somente leitura**, sem nunca preencher formulários ou clicar em widgets anti-bot — apenas exibe um atalho visual na barra superior caso o site apresente confirmação de voto concluído.

---

## 3. Notificador de 24h 01m (`86.460s`) e Confiabilidade Android/Desktop

```mermaid
sequenceDiagram
    autonumber
    participant UI as "VoteWorkspace (React)"
    participant Rust as "Vote Commands & Notifier"
    participant WinOS as "Windows WinRT Toast"
    participant AndOS as "Android AlarmManager + NotificationManager"

    UI->>Rust: "invoke('vote_mark_completed', accountId)"
    Rust->>Rust: "Salva last_voted_at e zera last_notified_for_vote_at"
    UI->>AndOS: "syncVoteAlarms (agenda RTC_WAKEUP para +86.460s)"
    Note over Rust,AndOS: "Aguarda exatamente 24h 01m (86.460 segundos)"
    Rust->>Rust: "Scheduler 15s detecta now >= last_voted_at + 86460"
    Rust->>UI: "emit('vote-ready-notification')"
    Rust->>WinOS: "Exibe Windows Toast Notifier (Desktop)"
    Rust->>AndOS: "JNI sendVoteAlertNotification (Android + deduplicação)"
    AndOS-->>UI: "Ao tocar na notificação, abre direto a aba 'Votos'"
```

### Deduplicação entre Scheduler Rust e `AlarmManager`
Para impedir alertas duplicados quando o app está ativo no Android e também possui um alarme `AlarmManager.setAndAllowWhileIdle` programado para o mesmo instante, tanto [`VoteAlarmReceiver`](file:///c:/Projetos/Chatter/src-tauri/gen/android/app/src/main/java/com/idlestream/app/VoteAlarmReceiver.kt) quanto a chamada JNI do Rust passam por [`VoteNotificationHelper.showVoteAlert()`](file:///c:/Projetos/Chatter/src-tauri/gen/android/app/src/main/java/com/idlestream/app/VoteNotificationHelper.kt), que valida o carimbo `last_voted_at` em `SharedPreferences` (`idlestream_vote_alerts`).

---

## 4. Comandos IPC e Cobertura de Testes

Comandos registrados no módulo `votes::commands`:
- `vote_update_account`, `vote_open_webview`, `vote_close_webview`, `vote_update_bounds`, `vote_hide_webview`, `vote_reload_webview`, `vote_clear_topidle_session`, `vote_get_active`, `vote_mark_completed`, `vote_reset_timer`, `vote_test_notification`.

Baterias de testes automatizados:
- **Rust (`votes::tests`)**: `cargo test --lib`
- **TypeScript (`scripts/test-votes.ts`)**: `npm run test:votes`
- **Android JUnit (`VoteUrlPolicyTest`)**: `.\gradlew.bat testArm64DebugUnitTest`
