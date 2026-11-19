use super::*;

#[test]
fn test_hourly_rotation_and_overwrite_at_six_hours() {
    let temp_dir = std::env::temp_dir().join(format!("idlestream_audit_test_{}", uuid::Uuid::new_v4()));
    let logger = AuditLogger::new(temp_dir.clone());

    // 1. Grava no slot inicial (Hora 1)
    logger.log("ACCOUNTS", "INFO", "Sessão iniciada na Hora 1");
    let logs_h1 = logger.get_logs(None, None, None).unwrap();
    assert!(logs_h1.contains("Sessão iniciada na Hora 1"));
    assert!(logs_h1.contains("[ACCOUNTS]"));

    // 2. Simula avanço de 1 hora no relógio -> deve avançar para Hora 2
    {
        let mut state = logger.state.lock().unwrap();
        state.hour_start_epoch -= 3601; // Força passagem de 1h
    }
    logger.log("LIVES", "INFO", "Stream iniciada na Hora 2");
    {
        let state = logger.state.lock().unwrap();
        assert_eq!(state.current_slot, 2, "Deve avançar para slot 2 após 1 hora");
    }

    // 3. Simula avanço de mais 4 horas (total de 5 horas no relógio -> slot 6)
    for _ in 0..4 {
        {
            let mut state = logger.state.lock().unwrap();
            state.hour_start_epoch -= 3601;
        }
        logger.log("GAMES", "INFO", "Tick de jogo registrado");
    }
    {
        let state = logger.state.lock().unwrap();
        assert_eq!(state.current_slot, 6, "Deve estar no slot 6 após 5 transições");
    }

    // 4. Mais 1 hora passa -> DEVE SOBRESCREVER A HORA 1 (limite circular de 6 horas)
    {
        let mut state = logger.state.lock().unwrap();
        state.hour_start_epoch -= 3601;
    }
    logger.log("ACCOUNTS", "WARN", "Nova sessão na Hora 7 que sobrescreveu a Hora 1");
    {
        let state = logger.state.lock().unwrap();
        assert_eq!(state.current_slot, 1, "Slot 1 deve ter sido sobrescrito");
    }

    let logs_after_cycle = logger.get_logs(None, None, None).unwrap();
    assert!(logs_after_cycle.contains("Nova sessão na Hora 7 que sobrescreveu a Hora 1"));
    assert!(!logs_after_cycle.contains("Sessão iniciada na Hora 1"), "Conteúdo de 6 horas atrás deve ter sido purgado do disco");

    // Limpeza
    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_filtering_by_category_level_and_search() {
    let temp_dir = std::env::temp_dir().join(format!("idlestream_audit_test_filter_{}", uuid::Uuid::new_v4()));
    let logger = AuditLogger::new(temp_dir.clone());

    logger.log("ACCOUNTS", "INFO", "Conta @user1 verificada com sucesso");
    logger.log("ACCOUNTS", "ERROR", "Conta @user2 com token expirado HTTP 401");
    logger.log("GAMES", "INFO", "Slot-1 ajustado para 60 FPS");
    logger.log("VOTES", "WARN", "TopIdle timeout de 5 segundos");

    // Filtro por Categoria: ACCOUNTS
    let acc_logs = logger.get_logs(Some("ACCOUNTS"), None, None).unwrap();
    assert!(acc_logs.contains("Conta @user1"));
    assert!(acc_logs.contains("Conta @user2"));
    assert!(!acc_logs.contains("Slot-1 ajustado"));
    assert!(!acc_logs.contains("TopIdle timeout"));

    // Filtro por Nível: ERROR
    let err_logs = logger.get_logs(None, Some("ERROR"), None).unwrap();
    assert!(err_logs.contains("HTTP 401"));
    assert!(!err_logs.contains("verificada com sucesso"));
    assert!(!err_logs.contains("Slot-1 ajustado"));

    // Busca textual
    let search_logs = logger.get_logs(None, None, Some("60 FPS")).unwrap();
    assert!(search_logs.contains("Slot-1 ajustado para 60 FPS"));
    assert!(!search_logs.contains("HTTP 401"));

    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_clear_logs_purges_all_files() {
    let temp_dir = std::env::temp_dir().join(format!("idlestream_audit_test_clear_{}", uuid::Uuid::new_v4()));
    let logger = AuditLogger::new(temp_dir.clone());

    logger.log("SYSTEM", "INFO", "Mensagem de teste antes de limpar");
    let logs = logger.get_logs(None, None, None).unwrap();
    assert!(logs.contains("Mensagem de teste antes de limpar"));

    logger.clear_logs().unwrap();

    let logs_cleared = logger.get_logs(None, None, None).unwrap();
    assert!(!logs_cleared.contains("Mensagem de teste antes de limpar"));
    assert!(logs_cleared.contains("IDLESTREAM AUDIT LOG - HORA 1"));

    let _ = fs::remove_dir_all(&temp_dir);
}
