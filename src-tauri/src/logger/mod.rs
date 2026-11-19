use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};
use chrono::Local;
use serde::{Deserialize, Serialize};

pub const MAX_HOURLY_SLOTS: usize = 6;
pub const SECONDS_PER_HOUR: u64 = 3600;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HourlySlotState {
    pub current_slot: usize, // 1 a 6
    pub hour_start_epoch: u64,
}

pub struct AuditLogger {
    base_dir: PathBuf,
    state: Mutex<HourlySlotState>,
}

static GLOBAL_LOGGER: OnceLock<AuditLogger> = OnceLock::new();

impl AuditLogger {
    pub fn new(base_dir: PathBuf) -> Self {
        let _ = fs::create_dir_all(&base_dir);

        let now_epoch = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);

        let state_path = base_dir.join("current_slot.json");
        let initial_state = if state_path.exists() {
            fs::read_to_string(&state_path)
                .ok()
                .and_then(|s| serde_json::from_str::<HourlySlotState>(&s).ok())
                .unwrap_or_else(|| HourlySlotState {
                    current_slot: 1,
                    hour_start_epoch: now_epoch,
                })
        } else {
            HourlySlotState {
                current_slot: 1,
                hour_start_epoch: now_epoch,
            }
        };

        // Garante que o arquivo do slot inicial exista com cabeçalho se estiver vazio
        let initial_file = base_dir.join(format!("audit_hour_{}.log", initial_state.current_slot));
        if !initial_file.exists() || fs::metadata(&initial_file).map(|m| m.len() == 0).unwrap_or(false) {
            if let Ok(mut f) = OpenOptions::new().create(true).write(true).truncate(true).open(&initial_file) {
                let _ = writeln!(
                    f,
                    "=== IDLESTREAM AUDIT LOG - HORA {} (INÍCIO: {}) ===",
                    initial_state.current_slot,
                    Local::now().format("%Y-%m-%d %H:%M:%S")
                );
            }
        }

        Self {
            base_dir,
            state: Mutex::new(initial_state),
        }
    }

    fn get_slot_file_path(&self, slot: usize) -> PathBuf {
        self.base_dir.join(format!("audit_hour_{}.log", slot))
    }

    fn save_state(&self, state: &HourlySlotState) {
        let state_path = self.base_dir.join("current_slot.json");
        if let Ok(json) = serde_json::to_string(state) {
            let _ = fs::write(state_path, json);
        }
    }

    /// Registra um evento de auditoria diretamente em disco (0 MB em RAM)
    pub fn log(&self, category: &str, level: &str, message: &str) {
        let now_epoch = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);

        let mut state = match self.state.lock() {
            Ok(g) => g,
            Err(p) => p.into_inner(),
        };

        // Rotação horária estrita: a cada 3600 segundos (1 hora), avança para o próximo slot
        if now_epoch >= state.hour_start_epoch + SECONDS_PER_HOUR {
            let hours_passed = (now_epoch - state.hour_start_epoch) / SECONDS_PER_HOUR;
            if hours_passed > 0 {
                let slots_to_advance = hours_passed.min(MAX_HOURLY_SLOTS as u64) as usize;
                for i in 1..=slots_to_advance {
                    let next_slot = ((state.current_slot - 1 + i) % MAX_HOURLY_SLOTS) + 1;
                    let file_path = self.get_slot_file_path(next_slot);
                    // Sobrescreve o arquivo da hora antiga (limite estrito de 6 horas)
                    if let Ok(mut f) = File::create(&file_path) {
                        let _ = writeln!(
                            f,
                            "=== IDLESTREAM AUDIT LOG - HORA {} (INÍCIO: {}) ===",
                            next_slot,
                            Local::now().format("%Y-%m-%d %H:%M:%S")
                        );
                    }
                }
                state.current_slot = ((state.current_slot - 1 + (hours_passed as usize)) % MAX_HOURLY_SLOTS) + 1;
                state.hour_start_epoch += hours_passed * SECONDS_PER_HOUR;
                self.save_state(&state);
            }
        }

        // Escreve diretamente em disco e descarrega o buffer
        let file_path = self.get_slot_file_path(state.current_slot);
        if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&file_path) {
            let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
            let line = format!("[{}] [{}] [{}] {}\n", timestamp, level, category, message);
            let _ = f.write_all(line.as_bytes());
            let _ = f.flush();
        }
    }

    /// Lê os logs gravados em disco das últimas 6 horas em ordem cronológica
    pub fn get_logs(
        &self,
        filter_category: Option<&str>,
        filter_level: Option<&str>,
        search: Option<&str>,
    ) -> Result<String, String> {
        let state = match self.state.lock() {
            Ok(g) => g.clone(),
            Err(p) => p.into_inner().clone(),
        };

        let mut output = String::new();
        output.push_str("=== RELATÓRIO DE AUDITORIA DO IDLESTREAM (ÚLTIMAS 6 HORAS EM DISCO) ===\n");
        output.push_str(&format!(
            "Data/Hora da Consulta: {}\nSlot Atual: Hora {} de {}\nDiretório: {:?}\n\n",
            Local::now().format("%Y-%m-%d %H:%M:%S"),
            state.current_slot,
            MAX_HOURLY_SLOTS,
            self.base_dir
        ));

        // Ordem cronológica: começa no slot mais antigo (current_slot + 1) e termina no atual
        let mut slot_order = Vec::with_capacity(MAX_HOURLY_SLOTS);
        for i in 1..=MAX_HOURLY_SLOTS {
            let slot = ((state.current_slot - 1 + i) % MAX_HOURLY_SLOTS) + 1;
            slot_order.push(slot);
        }

        let clean_cat = filter_category.map(|c| c.trim().to_uppercase()).filter(|c| !c.is_empty() && c != "TODAS");
        let clean_lvl = filter_level.map(|l| l.trim().to_uppercase()).filter(|l| !l.is_empty() && l != "TODOS");
        let clean_search = search.map(|s| s.trim().to_lowercase()).filter(|s| !s.is_empty());

        for slot in slot_order {
            let file_path = self.get_slot_file_path(slot);
            if !file_path.exists() {
                continue;
            }

            if let Ok(file) = File::open(&file_path) {
                let reader = BufReader::new(file);
                for line_res in reader.lines() {
                    let line = match line_res {
                        Ok(l) => l,
                        Err(_) => continue,
                    };

                    if line.starts_with("===") {
                        output.push_str(&line);
                        output.push('\n');
                        continue;
                    }

                    // Filtro de Categoria
                    if let Some(ref cat) = clean_cat {
                        let cat_token = format!("[{}]", cat);
                        if !line.contains(&cat_token) {
                            continue;
                        }
                    }

                    // Filtro de Nível
                    if let Some(ref lvl) = clean_lvl {
                        let lvl_token = format!("[{}]", lvl);
                        if !line.contains(&lvl_token) {
                            continue;
                        }
                    }

                    // Busca Textual
                    if let Some(ref q) = clean_search {
                        if !line.to_lowercase().contains(q) {
                            continue;
                        }
                    }

                    output.push_str(&line);
                    output.push('\n');
                }
            }
        }

        Ok(output)
    }

    /// Limpa todos os logs em disco e reinicia o ciclo de 6 horas
    pub fn clear_logs(&self) -> Result<(), String> {
        let mut state = match self.state.lock() {
            Ok(g) => g,
            Err(p) => p.into_inner(),
        };

        for slot in 1..=MAX_HOURLY_SLOTS {
            let file_path = self.get_slot_file_path(slot);
            if file_path.exists() {
                let _ = fs::remove_file(file_path);
            }
        }

        let now_epoch = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);

        state.current_slot = 1;
        state.hour_start_epoch = now_epoch;
        self.save_state(&state);

        let initial_file = self.get_slot_file_path(1);
        if let Ok(mut f) = File::create(&initial_file) {
            let _ = writeln!(
                f,
                "=== IDLESTREAM AUDIT LOG - HORA 1 (INÍCIO: {}) ===",
                Local::now().format("%Y-%m-%d %H:%M:%S")
            );
        }

        Ok(())
    }

    pub fn get_base_dir(&self) -> PathBuf {
        self.base_dir.clone()
    }
}

pub fn init_global_logger(base_dir: PathBuf) {
    let _ = GLOBAL_LOGGER.set(AuditLogger::new(base_dir));
}

pub fn get_global_logger() -> Option<&'static AuditLogger> {
    GLOBAL_LOGGER.get()
}

#[macro_export]
macro_rules! audit_log {
    ($category:expr, $level:expr, $($arg:tt)*) => {
        if let Some(logger) = $crate::logger::get_global_logger() {
            logger.log($category, $level, &format!($($arg)*));
        }
    };
}

#[cfg(test)]
pub mod tests;
