use std::net::SocketAddr;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use chrono::Utc;
use pbkdf2::pbkdf2_hmac;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use tiny_http::{Header, Response, Server, StatusCode};
use tauri::{AppHandle, Manager};
use crate::config::AppConfig;
use crate::state::AppState;

pub const EXPORT_PORT: u16 = 47811;
pub const MAX_EXPORTS: u32 = 3;
pub const TIMEOUT_SECS: u64 = 300; // 5 minutos

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedSessionBundle {
    pub version: u32,
    pub salt: String,       // Base64
    pub nonce: String,      // Base64
    pub ciphertext: String, // Base64
    pub exported_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportStatus {
    pub active: bool,
    pub port: u16,
    pub local_ip: String,
    pub export_url: String,
    pub remaining_seconds: u64,
    pub exports_count: u32,
    pub max_exports: u32,
}

pub struct SessionExportServer {
    is_running: Arc<AtomicBool>,
    exports_count: Arc<AtomicU32>,
    app_handle: AppHandle,
}

impl SessionExportServer {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            exports_count: Arc::new(AtomicU32::new(0)),
            app_handle,
        }
    }

    pub fn is_running(&self) -> bool {
        self.is_running.load(Ordering::SeqCst)
    }

    pub fn stop(&self) {
        self.is_running.store(false, Ordering::SeqCst);
        crate::audit_log!("SESSION_EXPORT", "INFO", "Servidor de exportação encerrado");
    }

    pub fn start(&self, pin: String) -> Result<ExportStatus, String> {
        let pin_trimmed = pin.trim().to_string();
        if pin_trimmed.len() < 6 {
            return Err("O PIN de segurança deve ter pelo menos 6 dígitos".to_string());
        }

        // Se já estava rodando, encerra antes
        self.stop();
        thread::sleep(Duration::from_millis(100));

        self.is_running.store(true, Ordering::SeqCst);
        self.exports_count.store(0, Ordering::SeqCst);

        let local_ip = get_local_ip();
        let export_url = format!("http://{}:{}/session", local_ip, EXPORT_PORT);

        // Prepara os dados de contas a serem exportados
        let config_snapshot = {
            let state = self.app_handle
                .try_state::<Arc<AppState>>()
                .ok_or_else(|| "Estado da aplicação indisponível".to_string())?;
            let guard = state.config.blocking_lock();
            guard.clone()
        };

        // Criptografa o bundle em memória com o PIN do usuário
        let bundle = encrypt_session_bundle(&config_snapshot, &pin_trimmed)?;
        let bundle_json = serde_json::to_string(&bundle)
            .map_err(|e| format!("Falha ao serializar bundle: {}", e))?;

        let is_running_clone = self.is_running.clone();
        let exports_count_clone = self.exports_count.clone();
        let addr = format!("0.0.0.0:{}", EXPORT_PORT);

        let server = Server::http(&addr)
            .map_err(|e| format!("Falha ao iniciar servidor HTTP local na porta {}: {}", EXPORT_PORT, e))?;

        crate::audit_log!(
            "SESSION_EXPORT",
            "INFO",
            "Servidor P2P de exportação iniciado em {} (válido por 5 minutos ou 3 downloads)",
            export_url
        );

        thread::spawn(move || {
            let start_time = Instant::now();
            while is_running_clone.load(Ordering::SeqCst) {
                // Timeout de 5 minutos
                if start_time.elapsed().as_secs() >= TIMEOUT_SECS {
                    crate::audit_log!("SESSION_EXPORT", "INFO", "Tempo limite de 5 minutos expirado. Encerrando servidor.");
                    break;
                }

                // Limite de 3 downloads concluídos
                if exports_count_clone.load(Ordering::SeqCst) >= MAX_EXPORTS {
                    crate::audit_log!("SESSION_EXPORT", "INFO", "Limite de 3 downloads atingido. Encerrando servidor.");
                    break;
                }

                match server.recv_timeout(Duration::from_millis(500)) {
                    Ok(Some(request)) => {
                        handle_export_request(request, &bundle_json, &exports_count_clone);
                    }
                    Ok(None) => {}
                    Err(e) => {
                        eprintln!("[SessionExport] Erro HTTP: {}", e);
                    }
                }
            }
            is_running_clone.store(false, Ordering::SeqCst);
            crate::audit_log!("SESSION_EXPORT", "INFO", "Servidor P2P de exportação finalizado");
        });

        Ok(ExportStatus {
            active: true,
            port: EXPORT_PORT,
            local_ip,
            export_url,
            remaining_seconds: TIMEOUT_SECS,
            exports_count: 0,
            max_exports: MAX_EXPORTS,
        })
    }

    pub fn get_status(&self) -> ExportStatus {
        let local_ip = get_local_ip();
        let export_url = format!("http://{}:{}/session", local_ip, EXPORT_PORT);
        ExportStatus {
            active: self.is_running(),
            port: EXPORT_PORT,
            local_ip,
            export_url,
            remaining_seconds: if self.is_running() { TIMEOUT_SECS } else { 0 },
            exports_count: self.exports_count.load(Ordering::SeqCst),
            max_exports: MAX_EXPORTS,
        }
    }
}

fn handle_export_request(
    request: tiny_http::Request,
    bundle_json: &str,
    exports_count: &Arc<AtomicU32>,
) {
    let url_raw = request.url().to_string();
    let path = url_raw.split('?').next().unwrap_or("/");

    let cors_origin = Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap();
    let cors_methods = Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"GET, OPTIONS"[..]).unwrap();
    let cors_headers = Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Content-Type"[..]).unwrap();

    if request.method() == &tiny_http::Method::Options {
        let resp = Response::empty(StatusCode(204))
            .with_header(cors_origin)
            .with_header(cors_methods)
            .with_header(cors_headers);
        let _ = request.respond(resp);
        return;
    }

    // Validação de IP Privado Local (segurança: não aceita conexões de IPs públicos roteados)
    if let Some(remote_addr) = request.remote_addr() {
        if !is_private_or_loopback_ip(remote_addr) {
            crate::audit_log!(
                "SESSION_EXPORT",
                "WARN",
                "Tentativa de acesso bloqueada de IP não-privado: {}",
                remote_addr
            );
            let resp = Response::from_string("Acesso negado: apenas rede local privada permitida")
                .with_status_code(StatusCode(403))
                .with_header(cors_origin);
            let _ = request.respond(resp);
            return;
        }
    }

    if path == "/session" || path == "/session/" {
        exports_count.fetch_add(1, Ordering::SeqCst);
        let count = exports_count.load(Ordering::SeqCst);
        crate::audit_log!("SESSION_EXPORT", "INFO", "Download do pacote de sessão efetuado com sucesso ({}/{})", count, MAX_EXPORTS);

        let content_type = Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap();
        let resp = Response::from_string(bundle_json)
            .with_header(content_type)
            .with_header(cors_origin);
        let _ = request.respond(resp);
    } else {
        let resp = Response::from_string("Not Found")
            .with_status_code(StatusCode(404))
            .with_header(cors_origin);
        let _ = request.respond(resp);
    }
}

/// Identifica se um SocketAddr pertence a blocos RFC1918 ou Loopback
fn is_private_or_loopback_ip(addr: &SocketAddr) -> bool {
    match addr.ip() {
        std::net::IpAddr::V4(ipv4) => {
            ipv4.is_loopback() || ipv4.is_private() || ipv4.is_link_local()
        }
        std::net::IpAddr::V6(ipv6) => ipv6.is_loopback(),
    }
}

/// Detecta o endereço IP local na rede Wi-Fi/Ethernet sem chamadas externas
pub fn get_local_ip() -> String {
    if let Ok(socket) = std::net::UdpSocket::bind("0.0.0.0:0") {
        if socket.connect("8.8.8.8:80").is_ok() {
            if let Ok(addr) = socket.local_addr() {
                return addr.ip().to_string();
            }
        }
    }
    "127.0.0.1".to_string()
}

/// Criptografa o payload com AES-256-GCM + derivação PBKDF2-SHA256 (310k iterações)
pub fn encrypt_session_bundle(
    config: &AppConfig,
    pin: &str,
) -> Result<EncryptedSessionBundle, String> {
    // 1. Gera salt aleatório de 16 bytes
    let salt = uuid::Uuid::new_v4().as_bytes().to_vec();

    // 2. Deriva chave de 32 bytes (256 bits) usando PBKDF2-HMAC-SHA256 com 310.000 iterações
    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(pin.as_bytes(), &salt, 310_000, &mut key);

    // 3. Prepara o payload com contas e streams
    #[derive(Serialize)]
    struct ExportPayload<'a> {
        version: u32,
        exported_at: i64,
        accounts: &'a Vec<crate::config::Account>,
        streams: &'a Vec<crate::config::StreamConfig>,
    }

    let payload = ExportPayload {
        version: 1,
        exported_at: Utc::now().timestamp(),
        accounts: &config.accounts,
        streams: &config.streams,
    };

    let plaintext = serde_json::to_string(&payload)
        .map_err(|e| format!("Falha ao serializar payload: {}", e))?;

    // 4. Gera nonce aleatório de 12 bytes para AES-GCM
    let nonce_bytes = uuid::Uuid::new_v4().as_bytes()[0..12].to_vec();
    let nonce = Nonce::from_slice(&nonce_bytes);

    // 5. Criptografa usando AES-256-GCM
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Falha ao inicializar cifra AES: {}", e))?;

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Falha na criptografia AES-GCM: {}", e))?;

    Ok(EncryptedSessionBundle {
        version: 1,
        salt: BASE64.encode(&salt),
        nonce: BASE64.encode(&nonce_bytes),
        ciphertext: BASE64.encode(&ciphertext),
        exported_at: Utc::now().timestamp(),
    })
}

/// Descriptografa o payload recebido com o PIN correspondente
pub fn decrypt_session_bundle(
    bundle: &EncryptedSessionBundle,
    pin: &str,
) -> Result<String, String> {
    let salt = BASE64.decode(&bundle.salt)
        .map_err(|e| format!("Salt Base64 inválido: {}", e))?;
    let nonce_bytes = BASE64.decode(&bundle.nonce)
        .map_err(|e| format!("Nonce Base64 inválido: {}", e))?;
    let ciphertext = BASE64.decode(&bundle.ciphertext)
        .map_err(|e| format!("Ciphertext Base64 inválido: {}", e))?;

    if nonce_bytes.len() != 12 {
        return Err("Nonce com tamanho incorreto (esperado 12 bytes)".to_string());
    }

    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(pin.as_bytes(), &salt, 310_000, &mut key);

    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Falha ao inicializar cifra AES: {}", e))?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    let decrypted = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| "PIN incorreto ou dados corrompidos".to_string())?;

    String::from_utf8(decrypted).map_err(|e| format!("Payload UTF-8 inválido: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_encryption_and_decryption_roundtrip() {
        let mut config = AppConfig::default();
        config.accounts.push(crate::config::Account {
            id: "acc-1".to_string(),
            platform: crate::config::Platform::Twitch,
            label: "Conta Principal".to_string(),
            username: "ggb2006".to_string(),
            oauth_token: Some("secret_oauth_token_123".to_string()),
            kick_session: None,
            xsrf_token: None,
            session_token: None,
            enabled: true,
        });

        let pin = "84729103";
        let bundle = encrypt_session_bundle(&config, pin).expect("Criptografia deve ter sucesso");

        // Descriptografia com PIN correto
        let decrypted_json = decrypt_session_bundle(&bundle, pin).expect("Descriptografia com PIN correto deve funcionar");
        assert!(decrypted_json.contains("secret_oauth_token_123"));
        assert!(decrypted_json.contains("ggb2006"));

        // Descriptografia com PIN errado deve falhar
        let wrong_pin = "00000000";
        let err = decrypt_session_bundle(&bundle, wrong_pin);
        assert!(err.is_err(), "Descriptografia com PIN incorreto deve falhar com erro de autenticação");
    }

    #[test]
    fn test_private_ip_detection() {
        let private_ipv4: SocketAddr = "192.168.1.150:12345".parse().unwrap();
        assert!(is_private_or_loopback_ip(&private_ipv4));

        let loopback: SocketAddr = "127.0.0.1:8080".parse().unwrap();
        assert!(is_private_or_loopback_ip(&loopback));

        let public_ipv4: SocketAddr = "8.8.8.8:53".parse().unwrap();
        assert!(!is_private_or_loopback_ip(&public_ipv4));
    }
}
