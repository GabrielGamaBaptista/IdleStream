use chrono::Local;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrashGuardState {
    pub version: String,
    pub crash_count: u8,
    pub last_ok_at: u64,
    pub last_backup_at: u64,
    pub last_good_version: Option<String>,
}

impl Default for CrashGuardState {
    fn default() -> Self {
        Self {
            version: String::new(),
            crash_count: 0,
            last_ok_at: 0,
            last_backup_at: 0,
            last_good_version: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartResult {
    pub crash_count: u8,
    pub last_good_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupInfo {
    pub id: String,
    pub created_at: i64,
    pub version: String,
    pub reason: String,
    pub file_count: usize,
}

pub struct SafetyNet {
    config_dir: PathBuf,
    current_version: String,
    lock: Mutex<()>,
}

impl SafetyNet {
    pub fn new(config_dir: PathBuf, current_version: String) -> Arc<Self> {
        let _ = fs::create_dir_all(&config_dir);
        Arc::new(Self {
            config_dir,
            current_version,
            lock: Mutex::new(()),
        })
    }

    fn guard_file(&self) -> PathBuf {
        self.config_dir.join("crash_guard.json")
    }

    fn backups_dir(&self) -> PathBuf {
        self.config_dir.join("backups")
    }

    fn load_guard_state(&self) -> CrashGuardState {
        let path = self.guard_file();
        if !path.exists() {
            return CrashGuardState {
                version: self.current_version.clone(),
                ..Default::default()
            };
        }

        match fs::read_to_string(&path) {
            Ok(content) => {
                let clean = content.trim_start_matches('\u{feff}');
                serde_json::from_str::<CrashGuardState>(clean).unwrap_or_else(|_| CrashGuardState {
                    version: self.current_version.clone(),
                    ..Default::default()
                })
            }
            Err(_) => CrashGuardState {
                version: self.current_version.clone(),
                ..Default::default()
            },
        }
    }

    fn save_guard_state(&self, state: &CrashGuardState) {
        let path = self.guard_file();
        if let Ok(json) = serde_json::to_string_pretty(state) {
            let tmp = path.with_extension("json.tmp");
            if fs::write(&tmp, json).is_ok() {
                let _ = fs::rename(&tmp, &path);
            }
        }
    }

    /// Executado na inicialização: incrementa crash_count e detecta atualizações.
    pub fn before_start(&self) -> StartResult {
        let _guard = self.lock.lock().unwrap_or_else(|e| e.into_inner());
        let mut state = self.load_guard_state();

        // Se a versão mudou (atualização do aplicativo), zera o contador de crash
        if !state.version.is_empty() && state.version != self.current_version {
            if state.crash_count == 0 || state.last_ok_at > 0 {
                state.last_good_version = Some(state.version.clone());
            }
            state.crash_count = 0;
            state.version = self.current_version.clone();
        }

        state.crash_count = state.crash_count.saturating_add(1);
        state.version = self.current_version.clone();
        self.save_guard_state(&state);

        StartResult {
            crash_count: state.crash_count,
            last_good_version: state.last_good_version,
        }
    }

    /// Chamado após período de estabilidade ou fechamento limpo: zera o contador de crashes.
    pub fn mark_ok(&self) {
        let _guard = self.lock.lock().unwrap_or_else(|e| e.into_inner());
        let mut state = self.load_guard_state();
        state.crash_count = 0;
        state.last_ok_at = now_secs();
        state.last_good_version = Some(self.current_version.clone());
        self.save_guard_state(&state);
    }

    /// Retorna o estado atual de inicialização sem alterar contadores.
    pub fn get_start_result(&self) -> StartResult {
        let _guard = self.lock.lock().unwrap_or_else(|e| e.into_inner());
        let state = self.load_guard_state();
        StartResult {
            crash_count: state.crash_count,
            last_good_version: state.last_good_version,
        }
    }

    /// Cria um backup de todos os arquivos de configuração (.json) do diretório.
    pub fn backup_configs(&self, reason: &str) -> Result<BackupInfo, String> {
        let _guard = self.lock.lock().unwrap_or_else(|e| e.into_inner());
        let bdir = self.backups_dir();
        fs::create_dir_all(&bdir).map_err(|e| format!("Falha ao criar pasta de backups: {}", e))?;

        let short_uuid = uuid::Uuid::new_v4().to_string();
        let short_id = short_uuid.get(..8).unwrap_or("00000000");
        let timestamp_str = Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();
        let backup_id = format!("{}_{}", timestamp_str, short_id);
        let target_dir = bdir.join(&backup_id);
        fs::create_dir_all(&target_dir)
            .map_err(|e| format!("Falha ao criar diretório do backup {}: {}", backup_id, e))?;

        let mut copied_count = 0;
        if let Ok(entries) = fs::read_dir(&self.config_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let file_name = path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or_default();
                    if file_name.ends_with(".json")
                        && file_name != "crash_guard.json"
                        && !file_name.ends_with(".tmp")
                    {
                        let dest = target_dir.join(file_name);
                        if fs::copy(&path, &dest).is_ok() {
                            copied_count += 1;
                        }
                    }
                }
            }
        }

        let info = BackupInfo {
            id: backup_id,
            created_at: now_secs() as i64,
            version: self.current_version.clone(),
            reason: reason.to_string(),
            file_count: copied_count,
        };

        let meta_file = target_dir.join("meta.json");
        if let Ok(meta_json) = serde_json::to_string_pretty(&info) {
            let _ = fs::write(&meta_file, meta_json);
        }

        // Atualiza timestamp do último backup
        let mut state = self.load_guard_state();
        state.last_backup_at = now_secs();
        self.save_guard_state(&state);

        // Prunar backups antigos excedentes (> 8)
        self.prune_old_backups_inner();

        Ok(info)
    }

    /// Lista todos os backups disponíveis, ordenados do mais recente ao mais antigo.
    pub fn list_backups(&self) -> Vec<BackupInfo> {
        let _guard = self.lock.lock().unwrap_or_else(|e| e.into_inner());
        let bdir = self.backups_dir();
        if !bdir.exists() {
            return Vec::new();
        }

        let mut backups = Vec::new();
        if let Ok(entries) = fs::read_dir(&bdir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let meta_file = path.join("meta.json");
                    if meta_file.exists() {
                        if let Ok(content) = fs::read_to_string(&meta_file) {
                            if let Ok(info) = serde_json::from_str::<BackupInfo>(&content) {
                                backups.push(info);
                                continue;
                            }
                        }
                    }

                    // Fallback se meta.json corrompido ou ausente: reconstruir a partir do diretório
                    let dirname = path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or_default()
                        .to_string();
                    let file_count = fs::read_dir(&path)
                        .map(|entries| {
                            entries
                                .flatten()
                                .filter(|e| {
                                    e.path().is_file()
                                        && e.path().extension().is_some_and(|ext| ext == "json")
                                })
                                .count()
                        })
                        .unwrap_or(0);

                    backups.push(BackupInfo {
                        id: dirname,
                        created_at: entry
                            .metadata()
                            .and_then(|m| m.modified())
                            .ok()
                            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                            .map(|d| d.as_secs() as i64)
                            .unwrap_or(0),
                        version: self.current_version.clone(),
                        reason: "auto-discovered".to_string(),
                        file_count,
                    });
                }
            }
        }

        backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        backups
    }

    /// Restaura um backup existente pelo seu ID.
    pub fn restore_backup(&self, id: &str) -> Result<(), String> {
        let _guard = self.lock.lock().unwrap_or_else(|e| e.into_inner());
        let bdir = self.backups_dir();
        let target_dir = bdir.join(id);

        if !target_dir.is_dir() {
            return Err(format!("Backup '{}' não encontrado", id));
        }

        let entries = fs::read_dir(&target_dir)
            .map_err(|e| format!("Falha ao ler diretório do backup: {}", e))?;

        let mut restored = 0;
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                let file_name = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or_default();
                if file_name.ends_with(".json") && file_name != "meta.json" {
                    let dest = self.config_dir.join(file_name);
                    fs::copy(&path, &dest)
                        .map_err(|e| format!("Falha ao restaurar {}: {}", file_name, e))?;
                    restored += 1;
                }
            }
        }

        // Zera o contador de crashes após uma restauração bem sucedida
        let mut state = self.load_guard_state();
        state.crash_count = 0;
        state.last_ok_at = now_secs();
        self.save_guard_state(&state);

        if restored == 0 {
            return Err("Nenhum arquivo de configuração encontrado para restaurar".to_string());
        }

        Ok(())
    }

    /// Verifica se é necessário realizar o backup diário (intervalo >= 24h).
    pub fn needs_daily_backup(&self) -> bool {
        let _guard = self.lock.lock().unwrap_or_else(|e| e.into_inner());
        let state = self.load_guard_state();
        if state.last_backup_at == 0 {
            return true;
        }
        now_secs().saturating_sub(state.last_backup_at) >= 86400
    }

    /// Mantém apenas os 8 backups mais recentes, removendo os excedentes.
    fn prune_old_backups_inner(&self) {
        let bdir = self.backups_dir();
        if !bdir.exists() {
            return;
        }

        let mut backups = Vec::new();
        if let Ok(entries) = fs::read_dir(&bdir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let created_at = path
                        .join("meta.json")
                        .pipe(|p| fs::read_to_string(p).ok())
                        .and_then(|c| serde_json::from_str::<BackupInfo>(&c).ok())
                        .map(|i| i.created_at)
                        .unwrap_or_else(|| {
                            entry
                                .metadata()
                                .and_then(|m| m.modified())
                                .ok()
                                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                                .map(|d| d.as_secs() as i64)
                                .unwrap_or(0)
                        });
                    backups.push((path, created_at));
                }
            }
        }

        backups.sort_by(|a, b| b.1.cmp(&a.1));

        if backups.len() > 8 {
            for (old_path, _) in backups.into_iter().skip(8) {
                let _ = fs::remove_dir_all(&old_path);
            }
        }
    }
}

// Extensão auxiliar estilo pipe para expressões legíveis
trait Pipe {
    fn pipe<F, R>(self, f: F) -> R
    where
        Self: Sized,
        F: FnOnce(Self) -> R,
    {
        f(self)
    }
}
impl<T> Pipe for T {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_before_start_and_mark_ok() {
        let temp_dir = std::env::temp_dir().join(format!("idlestream_safety_{}", uuid::Uuid::new_v4()));
        let safety = SafetyNet::new(temp_dir.clone(), "4.2.5".to_string());

        // 1º start -> crash_count 1
        let r1 = safety.before_start();
        assert_eq!(r1.crash_count, 1);

        // 2º start sem mark_ok -> crash_count 2
        let r2 = safety.before_start();
        assert_eq!(r2.crash_count, 2);

        // 3º start sem mark_ok -> crash_count 3
        let r3 = safety.before_start();
        assert_eq!(r3.crash_count, 3);

        // mark_ok após inicialização estável -> crash_count 0
        safety.mark_ok();
        let r_ok = safety.get_start_result();
        assert_eq!(r_ok.crash_count, 0);
        assert_eq!(r_ok.last_good_version, Some("4.2.5".to_string()));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_version_change_resets_crash_count() {
        let temp_dir = std::env::temp_dir().join(format!("idlestream_safety_v_{}", uuid::Uuid::new_v4()));
        let safety_old = SafetyNet::new(temp_dir.clone(), "4.2.4".to_string());
        safety_old.before_start();
        safety_old.before_start();
        safety_old.before_start(); // 3 crashes na 4.2.4

        // Novo executável atualizado para 4.2.5
        let safety_new = SafetyNet::new(temp_dir.clone(), "4.2.5".to_string());
        let res = safety_new.before_start();
        // A contagem deve ser resetada para 1 (novo ciclo da versão nova)
        assert_eq!(res.crash_count, 1);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_backup_and_restore() {
        let temp_dir = std::env::temp_dir().join(format!("idlestream_safety_bkp_{}", uuid::Uuid::new_v4()));
        let safety = SafetyNet::new(temp_dir.clone(), "4.2.5".to_string());

        // Cria arquivos de configuração simulados
        fs::write(temp_dir.join("config.json"), r#"{"streams":["s1"]}"#).unwrap();
        fs::write(temp_dir.join("runtime_state.json"), r#"{"active":true}"#).unwrap();

        // Faz backup
        let bkp = safety.backup_configs("manual_test").unwrap();
        assert_eq!(bkp.file_count, 2);
        assert_eq!(bkp.reason, "manual_test");

        let list = safety.list_backups();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].id, bkp.id);

        // Modifica os arquivos locais (simulando corrupção ou erro)
        fs::write(temp_dir.join("config.json"), r#"{"corrompido":true}"#).unwrap();

        // Restaura
        safety.restore_backup(&bkp.id).unwrap();

        let restored_content = fs::read_to_string(temp_dir.join("config.json")).unwrap();
        assert_eq!(restored_content, r#"{"streams":["s1"]}"#);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_prune_backups_limit_8() {
        let temp_dir = std::env::temp_dir().join(format!("idlestream_safety_prune_{}", uuid::Uuid::new_v4()));
        let safety = SafetyNet::new(temp_dir.clone(), "4.2.5".to_string());
        fs::write(temp_dir.join("config.json"), r#"{}"#).unwrap();

        // Cria 10 backups seguidos
        for i in 0..10 {
            let _ = safety.backup_configs(&format!("batch_{}", i));
            std::thread::sleep(std::time::Duration::from_millis(50));
        }

        let list = safety.list_backups();
        assert_eq!(list.len(), 8, "Deve manter no máximo 8 backups");

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
