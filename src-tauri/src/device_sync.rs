use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tauri::{Emitter, Manager};

pub const KEYVAL_API_URL: &str = "https://api.keyval.org";
pub const TIMEOUT_SECONDS: i64 = 180;
pub const POLL_INTERVAL_SECS: u64 = 5;
pub const HEARTBEAT_INTERVAL_SECS: i64 = 30;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DeviceType {
    Desktop,
    Mobile,
}

impl DeviceType {
    pub fn as_str(&self) -> &'static str {
        match self {
            DeviceType::Desktop => "desktop",
            DeviceType::Mobile => "mobile",
        }
    }

    pub fn other(&self) -> Self {
        match self {
            DeviceType::Desktop => DeviceType::Mobile,
            DeviceType::Mobile => DeviceType::Desktop,
        }
    }
}

pub fn current_device_type() -> DeviceType {
    #[cfg(target_os = "android")]
    {
        DeviceType::Mobile
    }
    #[cfg(not(target_os = "android"))]
    {
        DeviceType::Desktop
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DeviceSyncRawData {
    pub active_device: Option<DeviceType>,
    pub device_id: String,
    pub device_type: DeviceType,
    pub updated_at: i64,
    pub claim_nonce: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceSyncRemoteState {
    pub sync_id: String,
    pub active_device: Option<DeviceType>,
    pub last_updated: i64,
    pub is_other_device_active: bool,
    pub is_current_device_active: bool,
    pub other_device_type: DeviceType,
    #[serde(default)]
    pub claim_nonce: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceSyncInfo {
    pub sync_id: Option<String>,
    pub device_id: String,
    pub device_type: DeviceType,
    pub remote_state: Option<DeviceSyncRemoteState>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PollAction {
    None,
    SendHeartbeat { nonce: String },
    TriggerRemoteTakeoverShutdown,
}

pub fn get_cloud_key(sync_id: &str) -> String {
    let clean = sync_id.trim();
    if clean.starts_with("idlestream_") {
        clean.to_string()
    } else {
        format!("idlestream_{}", clean)
    }
}

fn sanitize_pipe_field(s: &str) -> String {
    s.replace('|', "_").trim().to_string()
}

pub fn encode_sync_payload(data: &DeviceSyncRawData) -> String {
    let active = data
        .active_device
        .map(|d| d.as_str())
        .unwrap_or("none");
    let dev_id = sanitize_pipe_field(&data.device_id);
    let dev_type = data.device_type.as_str();
    let nonce = sanitize_pipe_field(&data.claim_nonce);
    if nonce.is_empty() {
        format!("{}|{}|{}|{}", active, dev_id, dev_type, data.updated_at)
    } else {
        format!(
            "{}|{}|{}|{}|{}",
            active, dev_id, dev_type, data.updated_at, nonce
        )
    }
}

fn parse_device_type(s: &str) -> Option<DeviceType> {
    match s.trim().to_lowercase().as_str() {
        "desktop" => Some(DeviceType::Desktop),
        "mobile" => Some(DeviceType::Mobile),
        _ => None,
    }
}

pub fn decode_sync_payload(raw: &str) -> Option<DeviceSyncRawData> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }

    if trimmed.starts_with('{') {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(trimmed) {
            let active_device = val
                .get("active_device")
                .or_else(|| val.get("a"))
                .and_then(|v| v.as_str())
                .and_then(parse_device_type);
            let device_id = val
                .get("device_id")
                .or_else(|| val.get("id"))
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let device_type = val
                .get("device_type")
                .or_else(|| val.get("t"))
                .and_then(|v| v.as_str())
                .and_then(parse_device_type)
                .unwrap_or(DeviceType::Desktop);
            let updated_at = val
                .get("updated_at")
                .or_else(|| val.get("u"))
                .and_then(|v| v.as_i64())
                .unwrap_or(0);
            let claim_nonce = val
                .get("claim_nonce")
                .or_else(|| val.get("n"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .filter(|s| !s.trim().is_empty())
                .unwrap_or_else(|| format!("{}:{}", device_id, updated_at));
            return Some(DeviceSyncRawData {
                active_device,
                device_id,
                device_type,
                updated_at,
                claim_nonce,
            });
        }
        return None;
    }

    let parts: Vec<&str> = trimmed.split('|').collect();
    if parts.len() < 4 {
        return None;
    }

    let active_device = if parts[0].trim().eq_ignore_ascii_case("none") || parts[0].trim().is_empty()
    {
        None
    } else {
        parse_device_type(parts[0])
    };
    let device_id = parts[1].trim().to_string();
    let device_type = parse_device_type(parts[2]).unwrap_or(DeviceType::Desktop);
    let updated_at = parts[3].trim().parse::<i64>().unwrap_or(0);
    let claim_nonce = parts
        .get(4)
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| format!("{}:{}", device_id, updated_at));

    Some(DeviceSyncRawData {
        active_device,
        device_id,
        device_type,
        updated_at,
        claim_nonce,
    })
}

pub fn build_remote_state_view(
    sync_id: &str,
    data: &DeviceSyncRawData,
    my_device_id: &str,
    my_type: DeviceType,
    now_secs: i64,
) -> DeviceSyncRemoteState {
    let is_recent = (now_secs - data.updated_at) < TIMEOUT_SECONDS;
    let has_active = data.active_device.is_some() && is_recent;

    let is_current_active = has_active
        && (data.device_id == my_device_id
            || (data.active_device == Some(my_type) && data.device_id.is_empty()));

    let is_other_active = has_active && !is_current_active;

    DeviceSyncRemoteState {
        sync_id: sync_id.to_string(),
        active_device: if has_active { data.active_device } else { None },
        last_updated: data.updated_at,
        is_other_device_active: is_other_active,
        is_current_device_active: is_current_active,
        other_device_type: my_type.other(),
        claim_nonce: Some(data.claim_nonce.clone()),
    }
}

#[derive(Debug, Clone)]
pub struct DeviceSyncTracker {
    pub device_id: String,
    pub device_type: DeviceType,
    pub initial_remote_nonce: Option<String>,
    pub initial_snapshot_captured: bool,
    pub local_claim_nonce: Option<String>,
    pub last_heartbeat_at: i64,
    pub last_remote_nonce: Option<String>,
    pub pending_claim: bool,
    pub shutdown_triggered: bool,
}

impl DeviceSyncTracker {
    pub fn new(device_id: String, device_type: DeviceType) -> Self {
        Self {
            device_id,
            device_type,
            initial_remote_nonce: None,
            initial_snapshot_captured: false,
            local_claim_nonce: None,
            last_heartbeat_at: 0,
            last_remote_nonce: None,
            pending_claim: false,
            shutdown_triggered: false,
        }
    }

    pub fn reset_for_new_sync_id(&mut self) {
        self.initial_remote_nonce = None;
        self.initial_snapshot_captured = false;
        self.local_claim_nonce = None;
        self.last_heartbeat_at = 0;
        self.last_remote_nonce = None;
        self.pending_claim = false;
        self.shutdown_triggered = false;
    }

    pub fn capture_initial_snapshot(
        &mut self,
        remote: Option<&DeviceSyncRawData>,
        now_secs: i64,
    ) {
        if self.initial_snapshot_captured {
            return;
        }
        self.initial_snapshot_captured = true;
        if let Some(data) = remote {
            let is_recent = data.active_device.is_some()
                && (now_secs - data.updated_at) < TIMEOUT_SECONDS;
            if is_recent && data.device_id != self.device_id {
                self.initial_remote_nonce = Some(data.claim_nonce.clone());
            }
        }
    }

    pub fn prepare_local_claim(&mut self, now_secs: i64) -> String {
        let short_uuid = &uuid::Uuid::new_v4().to_string()[..8];
        let nonce = format!("c_{}_{}", now_secs, short_uuid);
        self.local_claim_nonce = Some(nonce.clone());
        self.last_heartbeat_at = now_secs;
        self.pending_claim = false;
        self.initial_remote_nonce = None;
        self.initial_snapshot_captured = true;
        nonce
    }

    pub fn mark_claim_succeeded(&mut self, nonce: &str, now_secs: i64) {
        self.local_claim_nonce = Some(nonce.to_string());
        self.last_remote_nonce = Some(nonce.to_string());
        self.last_heartbeat_at = now_secs;
        self.pending_claim = false;
        self.initial_remote_nonce = None;
        self.initial_snapshot_captured = true;
    }

    pub fn mark_released(&mut self) {
        self.local_claim_nonce = None;
        self.last_remote_nonce = None;
        self.pending_claim = false;
    }

    pub fn should_release_on_manual_exit(&self) -> bool {
        if self.shutdown_triggered {
            return false;
        }
        match (&self.local_claim_nonce, &self.last_remote_nonce) {
            (Some(local), Some(remote)) => local == remote,
            (Some(_), None) => true,
            _ => false,
        }
    }

    /// Avalia o estado lido da nuvem ANTES de enviar qualquer heartbeat (read-before-write).
    pub fn evaluate_poll(
        &mut self,
        remote: Option<&DeviceSyncRawData>,
        is_locally_farming: bool,
        now_secs: i64,
    ) -> PollAction {
        if self.shutdown_triggered {
            return PollAction::None;
        }

        if !self.initial_snapshot_captured {
            self.capture_initial_snapshot(remote, now_secs);
        }

        if let Some(data) = remote {
            let is_recent = data.active_device.is_some()
                && (now_secs - data.updated_at) < TIMEOUT_SECONDS;

            if is_recent {
                let is_same_device = data.device_id == self.device_id;
                let is_my_nonce =
                    self.local_claim_nonce.as_deref() == Some(data.claim_nonce.as_str());
                let is_initial_preexisting =
                    self.initial_remote_nonce.as_deref() == Some(data.claim_nonce.as_str());

                if !is_same_device && !is_my_nonce {
                    // Se ainda estamos na fila para reivindicar nossa posse neste aparelho,
                    // reivindicamos primeiro em vez de encerrar.
                    if !self.pending_claim
                        && (self.local_claim_nonce.is_some() || !is_initial_preexisting)
                    {
                        self.shutdown_triggered = true;
                        self.last_remote_nonce = Some(data.claim_nonce.clone());
                        return PollAction::TriggerRemoteTakeoverShutdown;
                    }
                } else {
                    self.last_remote_nonce = Some(data.claim_nonce.clone());
                }
            } else {
                self.last_remote_nonce = None;
            }
        } else {
            self.last_remote_nonce = None;
        }

        if self.pending_claim || (is_locally_farming && self.local_claim_nonce.is_none()) {
            let nonce = self.prepare_local_claim(now_secs);
            return PollAction::SendHeartbeat { nonce };
        }

        if is_locally_farming
            && (now_secs - self.last_heartbeat_at) >= HEARTBEAT_INTERVAL_SECS
        {
            let nonce = self
                .local_claim_nonce
                .clone()
                .unwrap_or_else(|| self.prepare_local_claim(now_secs));
            self.last_heartbeat_at = now_secs;
            return PollAction::SendHeartbeat { nonce };
        }

        PollAction::None
    }
}

pub async fn fetch_raw_remote_state(
    client: &reqwest::Client,
    api_base: &str,
    sync_id: &str,
) -> Result<Option<DeviceSyncRawData>, String> {
    let cloud_key = get_cloud_key(sync_id);
    let url = format!("{}/get", api_base.trim_end_matches('/'));
    let resp = client
        .post(&url)
        .timeout(Duration::from_secs(6))
        .json(&serde_json::json!({ "key": cloud_key }))
        .send()
        .await
        .map_err(|e| format!("Erro de rede GET KeyVal: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("HTTP {} ao consultar KeyVal", resp.status()));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("JSON inválido do KeyVal GET: {}", e))?;

    if json.get("status").and_then(|v| v.as_str()) != Some("SUCCESS") {
        return Ok(None);
    }

    let Some(raw_val) = json.get("val").and_then(|v| v.as_str()) else {
        return Ok(None);
    };

    Ok(decode_sync_payload(raw_val))
}

pub async fn post_raw_sync_state(
    client: &reqwest::Client,
    api_base: &str,
    sync_id: &str,
    payload: &DeviceSyncRawData,
) -> Result<(), String> {
    let cloud_key = get_cloud_key(sync_id);
    let url = format!("{}/set", api_base.trim_end_matches('/'));
    let encoded = encode_sync_payload(payload);

    let resp = client
        .post(&url)
        .timeout(Duration::from_secs(6))
        .json(&serde_json::json!({
            "key": cloud_key,
            "val": encoded,
        }))
        .send()
        .await
        .map_err(|e| format!("Erro de rede SET KeyVal: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("HTTP {} ao gravar KeyVal", resp.status()));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("JSON inválido do KeyVal SET: {}", e))?;

    if json.get("status").and_then(|v| v.as_str()) != Some("SUCCESS") {
        return Err(format!(
            "KeyVal SET retornou status inesperado: {:?}",
            json.get("status")
        ));
    }

    Ok(())
}

pub async fn execute_remote_takeover_shutdown(state: &Arc<crate::state::AppState>) {
    state
        .takeover_shutting_down
        .store(true, std::sync::atomic::Ordering::SeqCst);

    crate::audit_log!(
        "SYNC",
        "WARN",
        "Outro dispositivo assumiu o farm na nuvem! Encerrando lives, jogos e processo local imediatamente."
    );

    let _ = state
        .app_handle
        .emit("device-sync-takeover-shutdown", serde_json::json!({ "reason": "remote_takeover" }));

    // 1. No Android, bloqueia e encerra imediatamente o ForegroundService, Watchdog e GameSlotManager via JNI
    //    ANTES de parar streams, impedindo corrida com updateNotification/setFarmingActive.
    #[cfg(target_os = "android")]
    {
        crate::kick::http::shutdown_android_for_remote_takeover();
    }

    // 2. Parar todas as lives Twitch/Kick preservando desired_active_stream_ids para próxima abertura
    state.stop_all_streams_for_takeover().await;

    // 3. Parar todos os slots de jogos ativos e webview de votos no Desktop
    #[cfg(desktop)]
    {
        if let Some(gm) = state
            .app_handle
            .try_state::<Arc<crate::games::manager::GameLayoutManager>>()
        {
            let active_slots: Vec<String> = {
                let map = gm.active_slots.lock().await;
                map.keys().cloned().collect()
            };
            for slot_id in active_slots {
                let _ = gm.stop_game_slot(&slot_id).await;
            }
        }
        if let Some(vm) = state
            .app_handle
            .try_state::<Arc<crate::votes::manager::VoteManager>>()
        {
            let _ = vm.close_vote_webview().await;
        }
    }

    // 4. Marca SafetyNet como OK para evitar falso positivo de crash-loop na próxima abertura
    if let Some(safety) = state
        .app_handle
        .try_state::<Arc<crate::safety::SafetyNet>>()
    {
        safety.mark_ok();
    }

    // Breve janela para flush de arquivos/JNI/WebView2 antes do encerramento do processo
    tokio::time::sleep(Duration::from_millis(500)).await;
    std::process::exit(0);
}

pub fn start_device_sync_loop(state: Arc<crate::state::AppState>) {
    tauri::async_runtime::spawn(async move {
        // Pequena espera inicial para boot do ConfigStore/JNI e restauração inicial
        tokio::time::sleep(Duration::from_millis(800)).await;

        loop {
            let sync_id_opt = {
                let cfg = state.config.lock().await;
                cfg.device_sync_id
                    .as_ref()
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
            };

            if let Some(sync_id) = sync_id_opt {
                let _ = state.poll_device_sync_once(&sync_id).await;
            }

            tokio::time::sleep(Duration::from_secs(POLL_INTERVAL_SECS)).await;
        }
    });
}

pub fn now_unix_secs() -> i64 {
    Utc::now().timestamp()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use std::sync::{Arc as StdArc, Mutex as StdMutex};

    #[test]
    fn tc01_encode_and_decode_roundtrip_and_legacy_compatibility() {
        let raw = DeviceSyncRawData {
            active_device: Some(DeviceType::Mobile),
            device_id: "dev_abc123".into(),
            device_type: DeviceType::Mobile,
            updated_at: 1795612800,
            claim_nonce: "c_1795612800_aa11".into(),
        };
        let encoded = encode_sync_payload(&raw);
        assert_eq!(encoded, "mobile|dev_abc123|mobile|1795612800|c_1795612800_aa11");
        let decoded = decode_sync_payload(&encoded).expect("deve decodificar 5 campos");
        assert_eq!(decoded, raw);

        // Formato legado de 4 campos continua compatível
        let legacy = decode_sync_payload("desktop|dev_pc_1|desktop|1795612000")
            .expect("deve decodificar legado de 4 campos");
        assert_eq!(legacy.active_device, Some(DeviceType::Desktop));
        assert_eq!(legacy.device_id, "dev_pc_1");
        assert_eq!(legacy.claim_nonce, "dev_pc_1:1795612000");

        // Formato JSON legado continua compatível
        let json_raw = r#"{"active_device":"mobile","device_id":"dev_j","device_type":"mobile","updated_at":1795612100}"#;
        let json_decoded = decode_sync_payload(json_raw).expect("deve decodificar JSON");
        assert_eq!(json_decoded.active_device, Some(DeviceType::Mobile));
        assert_eq!(json_decoded.device_id, "dev_j");
    }

    #[test]
    fn tc02_pc_farming_mobile_opens_and_claims_pc_shuts_down() {
        let now = 1_795_613_000i64;
        let mut pc = DeviceSyncTracker::new("dev_pc".into(), DeviceType::Desktop);
        let mut mobile = DeviceSyncTracker::new("dev_mob".into(), DeviceType::Mobile);

        // PC inicia farmando e assume a posse
        let pc_action = pc.evaluate_poll(None, true, now);
        let pc_nonce = match pc_action {
            PollAction::SendHeartbeat { nonce } => nonce,
            other => panic!("PC deveria reivindicar posse, obteve {:?}", other),
        };
        pc.mark_claim_succeeded(&pc_nonce, now);
        let cloud_pc = DeviceSyncRawData {
            active_device: Some(DeviceType::Desktop),
            device_id: "dev_pc".into(),
            device_type: DeviceType::Desktop,
            updated_at: now,
            claim_nonce: pc_nonce.clone(),
        };

        // Mobile abre depois (captura snapshot inicial do PC, não se suicida) e inicia jogos/lives
        let mob_action_1 = mobile.evaluate_poll(Some(&cloud_pc), true, now + 2);
        let mob_nonce = match mob_action_1 {
            PollAction::SendHeartbeat { nonce } => nonce,
            other => panic!("Mobile deveria reivindicar takeover, obteve {:?}", other),
        };
        assert_ne!(mob_nonce, pc_nonce);
        mobile.mark_claim_succeeded(&mob_nonce, now + 2);

        let cloud_mob = DeviceSyncRawData {
            active_device: Some(DeviceType::Mobile),
            device_id: "dev_mob".into(),
            device_type: DeviceType::Mobile,
            updated_at: now + 2,
            claim_nonce: mob_nonce.clone(),
        };

        // PC faz poll seguinte -> deve detectar takeover e encerrar sem liberar posse
        let pc_action_2 = pc.evaluate_poll(Some(&cloud_mob), true, now + 5);
        assert_eq!(pc_action_2, PollAction::TriggerRemoteTakeoverShutdown);
        assert!(!pc.should_release_on_manual_exit());
    }

    #[test]
    fn tc03_mobile_farming_pc_reopens_and_takes_over_mobile_shuts_down() {
        let now = 1_795_614_000i64;
        let mut mobile = DeviceSyncTracker::new("dev_mob".into(), DeviceType::Mobile);
        let mob_nonce = mobile.prepare_local_claim(now);
        mobile.mark_claim_succeeded(&mob_nonce, now);

        let cloud_mob = DeviceSyncRawData {
            active_device: Some(DeviceType::Mobile),
            device_id: "dev_mob".into(),
            device_type: DeviceType::Mobile,
            updated_at: now,
            claim_nonce: mob_nonce.clone(),
        };

        // PC abre horas/minutos depois com auto-restore de jogos e lives
        let mut pc = DeviceSyncTracker::new("dev_pc".into(), DeviceType::Desktop);
        let pc_action = pc.evaluate_poll(Some(&cloud_mob), true, now + 40);
        let pc_nonce = match pc_action {
            PollAction::SendHeartbeat { nonce } => nonce,
            other => panic!("PC deveria reivindicar posse sobre o Mobile, obteve {:?}", other),
        };
        pc.mark_claim_succeeded(&pc_nonce, now + 40);

        let cloud_pc = DeviceSyncRawData {
            active_device: Some(DeviceType::Desktop),
            device_id: "dev_pc".into(),
            device_type: DeviceType::Desktop,
            updated_at: now + 40,
            claim_nonce: pc_nonce,
        };

        // Mobile (mesmo com tela apagada, rodando em Rust) lê e encerra imediatamente
        let mob_action = mobile.evaluate_poll(Some(&cloud_pc), true, now + 44);
        assert_eq!(mob_action, PollAction::TriggerRemoteTakeoverShutdown);
        assert!(!mobile.should_release_on_manual_exit());
    }

    #[test]
    fn tc06_read_before_write_prevents_heartbeat_from_overwriting_remote_takeover() {
        let now = 1_795_615_000i64;
        let mut pc = DeviceSyncTracker::new("dev_pc".into(), DeviceType::Desktop);
        let pc_nonce = pc.prepare_local_claim(now);
        pc.mark_claim_succeeded(&pc_nonce, now);

        // Passaram 31s (hora do heartbeat do PC!), mas 100ms antes o Mobile assumiu na nuvem
        let cloud_mob = DeviceSyncRawData {
            active_device: Some(DeviceType::Mobile),
            device_id: "dev_mob".into(),
            device_type: DeviceType::Mobile,
            updated_at: now + 31,
            claim_nonce: "c_mob_takeover".into(),
        };

        let action = pc.evaluate_poll(Some(&cloud_mob), true, now + 31);
        assert_eq!(
            action,
            PollAction::TriggerRemoteTakeoverShutdown,
            "Heartbeat vencido JAMAIS pode sobrescrever takeover mais recente do outro dispositivo"
        );
    }

    #[test]
    fn tc07_manual_exit_releases_only_if_current_owner() {
        let now = 1_795_616_000i64;
        let mut pc = DeviceSyncTracker::new("dev_pc".into(), DeviceType::Desktop);
        let pc_nonce = pc.prepare_local_claim(now);
        pc.mark_claim_succeeded(&pc_nonce, now);
        assert!(pc.should_release_on_manual_exit());

        // Se o outro dispositivo tomou, não pode liberar (para não apagar a posse alheia)
        let cloud_mob = DeviceSyncRawData {
            active_device: Some(DeviceType::Mobile),
            device_id: "dev_mob".into(),
            device_type: DeviceType::Mobile,
            updated_at: now + 10,
            claim_nonce: "c_mob_owner".into(),
        };
        let _ = pc.evaluate_poll(Some(&cloud_mob), true, now + 10);
        assert!(!pc.should_release_on_manual_exit());
    }

    #[test]
    fn tc08_stale_timeout_allows_new_claim_and_idle_device_ignores_same_initial_heartbeat() {
        let now = 1_795_617_000i64;
        let mut pc = DeviceSyncTracker::new("dev_pc".into(), DeviceType::Desktop);
        let pc_nonce = pc.prepare_local_claim(now);
        pc.mark_claim_succeeded(&pc_nonce, now);

        let cloud_pc_initial = DeviceSyncRawData {
            active_device: Some(DeviceType::Desktop),
            device_id: "dev_pc".into(),
            device_type: DeviceType::Desktop,
            updated_at: now,
            claim_nonce: pc_nonce.clone(),
        };

        // Mobile abre ainda ocioso (antes de clicar em iniciar) e PC manda heartbeat mantendo pc_nonce
        let mut mobile = DeviceSyncTracker::new("dev_mob".into(), DeviceType::Mobile);
        assert_eq!(mobile.evaluate_poll(Some(&cloud_pc_initial), false, now + 1), PollAction::None);

        let cloud_pc_hb = DeviceSyncRawData {
            updated_at: now + 31,
            ..cloud_pc_initial.clone()
        };
        assert_eq!(mobile.evaluate_poll(Some(&cloud_pc_hb), false, now + 31), PollAction::None);

        // Agora se PC reiniciar gerando NOVO nonce enquanto Mobile ficou aberto, Mobile fecha
        let cloud_pc_new_session = DeviceSyncRawData {
            updated_at: now + 45,
            claim_nonce: "c_pc_new_session".into(),
            ..cloud_pc_initial
        };
        assert_eq!(
            mobile.evaluate_poll(Some(&cloud_pc_new_session), false, now + 45),
            PollAction::TriggerRemoteTakeoverShutdown
        );
    }

    #[tokio::test]
    async fn tc09_http_mock_keyval_roundtrip_and_5xx_fail_open() {
        let store: StdArc<StdMutex<HashMap<String, String>>> =
            StdArc::new(StdMutex::new(HashMap::new()));
        let fail_mode: StdArc<StdMutex<bool>> = StdArc::new(StdMutex::new(false));

        let server = tiny_http::Server::http("127.0.0.1:0").expect("bind mock server");
        let addr = server.server_addr().to_ip().unwrap();
        let base_url = format!("http://127.0.0.1:{}", addr.port());

        let store_srv = store.clone();
        let fail_srv = fail_mode.clone();
        let handle = std::thread::spawn(move || {
            for mut req in server.incoming_requests() {
                let mut body = String::new();
                let _ = req.as_reader().read_to_string(&mut body);

                if *fail_srv.lock().unwrap() {
                    let resp = tiny_http::Response::from_string("Service Unavailable")
                        .with_status_code(503);
                    let _ = req.respond(resp);
                    continue;
                }

                let json: serde_json::Value =
                    serde_json::from_str(&body).unwrap_or(serde_json::Value::Null);
                let key = json.get("key").and_then(|k| k.as_str()).unwrap_or("").to_string();

                let reply = if req.url().ends_with("/set") {
                    let val = json.get("val").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    store_srv.lock().unwrap().insert(key, val);
                    serde_json::json!({ "status": "SUCCESS" }).to_string()
                } else {
                    let map = store_srv.lock().unwrap();
                    if let Some(val) = map.get(&key) {
                        serde_json::json!({ "status": "SUCCESS", "val": val }).to_string()
                    } else {
                        serde_json::json!({ "status": "NOT_FOUND" }).to_string()
                    }
                };

                let header = tiny_http::Header::from_bytes(
                    &b"Content-Type"[..],
                    &b"application/json"[..],
                )
                .unwrap();
                let _ = req.respond(tiny_http::Response::from_string(reply).with_header(header));
            }
        });

        let client = reqwest::Client::new();
        let sync_id = "dsync_mock123";
        let now = now_unix_secs();

        let payload = DeviceSyncRawData {
            active_device: Some(DeviceType::Desktop),
            device_id: "dev_pc".into(),
            device_type: DeviceType::Desktop,
            updated_at: now,
            claim_nonce: "c_mock_1".into(),
        };
        post_raw_sync_state(&client, &base_url, sync_id, &payload)
            .await
            .expect("POST /set deve funcionar");

        let fetched = fetch_raw_remote_state(&client, &base_url, sync_id)
            .await
            .expect("GET /get deve funcionar")
            .expect("Valor deve existir");
        assert_eq!(fetched, payload);

        // Simular falha 503 (fail-open: retorna Err sem sobrescrever estado)
        *fail_mode.lock().unwrap() = true;
        let err_res = fetch_raw_remote_state(&client, &base_url, sync_id).await;
        assert!(err_res.is_err(), "Erro HTTP 503 deve retornar Err para manter fail-open");

        drop(handle);
    }
}
