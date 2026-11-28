# Progresso do Auto-Resgate de Pontos (`resgateProgress.md`)

Documento de continuidade para finalizar a funcionalidade de **Resgate Automático de Pontos (Twitch & Kick)** na aba **Contas**.

---

## 1. O que já foi implementado nesta sessão

### 1.1 Modelos de Dados e Regras de Negócio
- **Rust:**
  - `AutoRedeemConfig` e campo `auto_redeems: Vec<AutoRedeemConfig>` adicionados em `src-tauri/src/config/models.rs` (com `#[serde(default)]` para retrocompatibilidade e helper `matches_channel(&self, slug: &str)`).
  - Fallback leniente de leitura em `src-tauri/src/config/store.rs` preservando `auto_redeems`.
  - Validador de regras de negócio `apply_add_auto_redeem_rules` em `src-tauri/src/auto_redeem/models.rs`.
- **TypeScript:**
  - `AutoRedeemConfig`, `AutoRedeemExecutedPayload`, `AutoRedeemErrorPayload` e `AppConfig.auto_redeems` em `src/types/index.ts`.
  - Helpers puros de validação, checagem de limite e redução de eventos em `src/utils/autoRedeem.ts`.

#### Regras de Negócio implementadas (`RN-01` a `RN-04`)
- **RN-01 (`all_channels = true`):** Permite no máximo **1** configuração global por `account_id`.
- **RN-02 (`all_channels = false`):** Permite múltiplas configurações para a mesma conta, desde que em canais (`channel_slug`) distintos.
- **RN-03 (Substituição para Global):** Ao criar uma configuração global em uma conta que já possui configurações específicas por canal, o frontend exige confirmação e o backend remove as específicas atomicamente.
- **RN-04 (Resolução Dinâmica de Streams):** O engine itera em tempo de execução sobre as streams vinculadas à conta (`AppState.statuses`), cobrindo novas streams adicionadas à conta automaticamente.

---

### 1.2 Backend Rust (`src-tauri/src/auto_redeem/`)
- `src-tauri/src/auto_redeem/mod.rs`: declaração do módulo.
- `src-tauri/src/auto_redeem/models.rs`: `RedeemResult`, `RedeemError`, payloads de eventos Tauri e `apply_add_auto_redeem_rules`.
- `src-tauri/src/auto_redeem/executor.rs`:
  - `execute_twitch_redeem`: mutação GraphQL `RedeemCustomReward` em `https://gql.twitch.tv/gql` (com fallback para `TWITCH_ANDROID_CLIENT_ID` em caso de erro de integridade) e `resolve_twitch_channel_id`.
  - `execute_kick_redeem`: `POST https://kick.com/api/v2/channels/{slug}/rewards/{reward_id}/redeem` usando `kick_http_request` (`curl.exe` no Windows / `OkHttp` no Android) e `decode_kick_bearer` (`%7C` → `|`).
  - Parsers: `parse_twitch_redeem_response` e `parse_kick_redeem_response`.
- `src-tauri/src/auto_redeem/engine.rs`:
  - `start_auto_redeem_loop`: loop assíncrono (`tokio::spawn`, intervalo de 30s + jitter inicial) que lê o saldo em `AppState.statuses` (`account_points`), verifica `should_attempt_redeem`, executa o resgate, deduz `cost` do saldo em memória para evitar dupla tentativa com saldo stale, respeita cooldowns (`next_available_at`, `COOLDOWN_ACTIVE`, `LimitReached` e timeout mínimo de 5s entre resgates), persiste estatísticas no `config.json` e emite os eventos `auto-redeem-executed` e `auto-redeem-error`.
  - Encerra o loop automaticamente em caso de `RedeemError::AuthError`.
- Integração IPC e Startup:
  - `src-tauri/src/state.rs`: campo `auto_redeem_handles` + `start_auto_redeem_loop_for`, `stop_auto_redeem_loop_for` e `sync_auto_redeem_loops`.
  - `src-tauri/src/commands.rs`: comandos `list_auto_redeems`, `add_auto_redeem`, `update_auto_redeem`, `remove_auto_redeem` e `test_auto_redeem`.
  - `src-tauri/src/lib.rs`: módulo registrado, comandos adicionados ao `invoke_handler!` e restauração dos loops ativos 2s após o startup.

---

### 1.3 Frontend (`src/`)
- `src/stores/appStore.ts`: actions `addAutoRedeem`, `updateAutoRedeem`, `removeAutoRedeem`, `testAutoRedeem` e listeners para `auto-redeem-executed` e `auto-redeem-error`.
- `src/components/AutoRedeemModal.tsx`: modal para criar/editar auto-resgate com checkbox **"Aplicar em todos os canais desta conta"**, seletor de canal específico, guia inline de captura de ID, custo, texto opcional (Twitch) e status inicial.
- `src/components/AccountManager.tsx`: seção **Auto-Resgates** em cada card de conta com listagem, badges de status/contagem, toggle ativar/pausar, botão **Testar agora**, editar e excluir.

---

### 1.4 Testes e Build Validados
- **Rust:** `cargo test --manifest-path c:\Projetos\Chatter\src-tauri\Cargo.toml auto_redeem -- --nocapture` → **17 passed; 0 failed** (`src-tauri/src/auto_redeem/tests.rs`).
- **TypeScript:** `npm run test:auto-redeem` (`scripts/test-auto-redeem.ts`) → **todos os testes passaram**.
- **Build:** `npm run build` (`tsc && vite build`) → **exit code 0**.

---

## 2. O que falta implementar na próxima sessão

### 2.1 Problema identificado durante os testes/alinhamento
Cada streamer (tanto na Twitch quanto na Kick) possui um **`reward_id` diferente** para a mesma recompensa. Porém, **o nome exato e o custo das recompensas são padronizados** entre todos os streamers da mesma plataforma.

Portanto, usar um `reward_id` fixo no modo **"Todos os canais desta conta"** (`all_channels: true`) não funciona para múltiplos streamers.

### 2.2 Próximos passos planejados
1. **Receber do usuário a lista oficial de recompensas** (separada por Twitch e Kick), contendo:
   - Nome exato (`reward_title`)
   - Custo (`cost`)
   - Se exige `text_input` ou não
2. **Criar catálogo pré-definido de recompensas**:
   - Adicionar a lista pronta no frontend (`src/utils/autoRedeemCatalog.ts` ou similar) para seleção com 1 clique em `AutoRedeemModal.tsx` (mantendo uma opção *"Personalizada"* como fallback).
3. **Resolução automática de `reward_id` por `reward_title` (+ `cost`) no backend**:
   - Tornar `reward_id` opcional em `AutoRedeemConfig` (quando vazio/modo catálogo, o backend resolve automaticamente por canal).
   - **Twitch (`executor.rs` / `engine.rs`):** Consultar as recompensas personalizadas do canal via GQL (`ChannelPointsContext` ou `communityPointsSettings.customRewards`) para obter `(channel_id, reward_id, cost)` pelo título exato (case-insensitive) e cachear em memória por `(channel_slug, reward_title)`.
   - **Kick (`executor.rs` / `engine.rs`):** Consultar `GET https://kick.com/api/v2/channels/{channel_slug}/rewards` via `kick_http_request` para obter `(reward_id, cost)` pelo título exato e cachear em memória.
   - Atualizar validações (`apply_add_auto_redeem_rules` e `validateAutoRedeemForm`) para aceitar `reward_id` vazio quando o modo de resolução por nome estiver ativo.
4. **Atualizar testes e validar em produção**:
   - Adicionar testes unitários Rust para os parsers de listagem de recompensas (Twitch GQL `customRewards` e Kick `GET /rewards`) e resolução por nome.
   - Atualizar `scripts/test-auto-redeem.ts` para o seletor de catálogo.
   - Rodar `cargo test auto_redeem`, `npm run test:auto-redeem`, `npm run build` e testar manualmente com contas reais Twitch e Kick.
