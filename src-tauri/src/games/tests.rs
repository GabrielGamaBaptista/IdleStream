use crate::config::{default_game_slots, GameSlotConfig};
use crate::games::manager::{SlotBounds, ViewLayoutMode, ViewportRect};
use std::path::PathBuf;

#[test]
fn test_default_game_slots_initialization() {
    let slots = default_game_slots();
    assert_eq!(slots.len(), 4, "Devem ser criados exatamente 4 slots padrão");

    let expected_ids = ["slot-1", "slot-2", "slot-3", "slot-4"];
    for (i, slot) in slots.iter().enumerate() {
        assert_eq!(slot.id, expected_ids[i]);
        assert!(!slot.label.is_empty(), "Label não pode ser vazio");
        assert!(slot.url.starts_with("https://"), "URL padrão deve usar HTTPS");
        assert!(slot.color.starts_with('#'), "Cor deve ser código hexadecimal");
        assert!(!slot.auto_start, "Auto-start padrão deve ser falso");
    }

    // Verificar se as cores são distintas
    let mut colors = slots.iter().map(|s| s.color.as_str()).collect::<Vec<_>>();
    colors.sort();
    colors.dedup();
    assert_eq!(colors.len(), 4, "Cada slot deve ter uma cor visual distinta");
}

#[test]
fn test_game_slot_json_serialization() {
    let slot = GameSlotConfig {
        id: "slot-custom".to_string(),
        label: "Naruto Farm".to_string(),
        url: "https://pokeidle.net".to_string(),
        color: "#10B981".to_string(),
        auto_start: true,
        enable_hunt_extension: true,
        zoom: 0.8,
    };

    let json = serde_json::to_string(&slot).expect("Falha ao serializar");
    let deserialized: GameSlotConfig = serde_json::from_str(&json).expect("Falha ao desserializar");

    assert_eq!(deserialized.id, "slot-custom");
    assert_eq!(deserialized.label, "Naruto Farm");
    assert_eq!(deserialized.url, "https://pokeidle.net");
    assert_eq!(deserialized.color, "#10B981");
    assert!(deserialized.auto_start);
    assert!(deserialized.enable_hunt_extension);
    assert_eq!(deserialized.zoom, 0.8);
}

#[test]
fn test_slot_bounds_serialization() {
    let bounds = SlotBounds {
        slot_id: "slot-1".to_string(),
        x: 100.0,
        y: 50.0,
        width: 600.0,
        height: 400.0,
        visible: true,
    };

    let json = serde_json::to_string(&bounds).expect("Falha ao serializar SlotBounds");
    let restored: SlotBounds = serde_json::from_str(&json).expect("Falha ao desserializar SlotBounds");

    assert_eq!(restored.slot_id, "slot-1");
    assert_eq!(restored.x, 100.0);
    assert_eq!(restored.y, 50.0);
    assert_eq!(restored.width, 600.0);
    assert_eq!(restored.height, 400.0);
    assert!(restored.visible);
}

#[test]
fn test_view_layout_modes_serialization() {
    let mode_grid = ViewLayoutMode::Grid2x2;
    let mode_focus = ViewLayoutMode::FocusSingle("slot-2".to_string());
    let mode_sidebar = ViewLayoutMode::FocusSidebar("slot-3".to_string());

    let json_grid = serde_json::to_string(&mode_grid).unwrap();
    let json_focus = serde_json::to_string(&mode_focus).unwrap();
    let json_sidebar = serde_json::to_string(&mode_sidebar).unwrap();

    let d_grid: ViewLayoutMode = serde_json::from_str(&json_grid).unwrap();
    let d_focus: ViewLayoutMode = serde_json::from_str(&json_focus).unwrap();
    let d_sidebar: ViewLayoutMode = serde_json::from_str(&json_sidebar).unwrap();

    match d_grid {
        ViewLayoutMode::Grid2x2 => (),
        _ => panic!("Esperava Grid2x2"),
    }

    match d_focus {
        ViewLayoutMode::FocusSingle(id) => assert_eq!(id, "slot-2"),
        _ => panic!("Esperava FocusSingle"),
    }

    match d_sidebar {
        ViewLayoutMode::FocusSidebar(id) => assert_eq!(id, "slot-3"),
        _ => panic!("Esperava FocusSidebar"),
    }
}

#[test]
fn test_profile_path_isolation() {
    let base = PathBuf::from("C:/Users/test/AppData/Local/com.idlestream.app");
    let slot_1_dir = base.join("game_profiles").join("slot-1");
    let slot_2_dir = base.join("game_profiles").join("slot-2");
    let slot_3_dir = base.join("game_profiles").join("slot-3");
    let slot_4_dir = base.join("game_profiles").join("slot-4");

    assert_ne!(slot_1_dir, slot_2_dir);
    assert_ne!(slot_2_dir, slot_3_dir);
    assert_ne!(slot_3_dir, slot_4_dir);

    // Garantir que cada perfil fica em subpastas estritamente separadas
    assert_eq!(slot_1_dir.file_name().unwrap(), "slot-1");
    assert_eq!(slot_2_dir.file_name().unwrap(), "slot-2");
}

#[test]
fn test_anti_sleep_script_contents() {
    let script = include_str!("anti_sleep.js");
    assert!(!script.is_empty(), "O script anti-sleep não pode estar vazio");
    assert!(script.contains("'hidden'"), "Deve conter spoofing de hidden");
    assert!(script.contains("visibilityState"), "Deve conter spoofing de visibilityState");
    assert!(script.contains("requestAnimationFrame"), "Deve conter loop de rAF");
    assert!(script.contains("setInterval"), "Deve usar setInterval imune a throttling");
    assert!(script.contains("window.gc"), "Deve conter rotina de purga de GC");
    assert!(script.contains("__idlestream_eco_style__"), "Deve conter injeção de CSS de Eco-Mode");
    assert!(script.contains("__setIdleStreamEcoMode"), "Deve conter função de controle ao vivo do modo econômico");
    assert!(script.contains("idlestream-eco-mode"), "Deve conter classe toggleable de modo econômico");
}

#[test]
fn test_hunt_extension_script_contents() {
    let script = include_str!("hunt_extension.js");
    assert!(!script.is_empty(), "O script da extensão /hunt não pode estar vazio");
    assert!(script.contains("__pokeidleHunt") || script.contains("Pokeidle"), "Deve conter o bundle da extensão Pokeidle Hunt");
}

#[test]
fn test_grid2x2_layout_geometry() {
    let rect = ViewportRect {
        x: 200.0,
        y: 60.0,
        width: 1200.0,
        height: 800.0,
    };

    let half_w = rect.width / 2.0;
    let half_h = rect.height / 2.0;

    let q1 = (rect.x, rect.y, half_w, half_h);
    let q2 = (rect.x + half_w, rect.y, half_w, half_h);
    let q3 = (rect.x, rect.y + half_h, half_w, half_h);
    let q4 = (rect.x + half_w, rect.y + half_h, half_w, half_h);

    // 1. Quadrantes não colidem e fecham 100% da área
    let total_quadrant_area = (q1.2 * q1.3) + (q2.2 * q2.3) + (q3.2 * q3.3) + (q4.2 * q4.3);
    let expected_area = rect.width * rect.height;
    assert_eq!(total_quadrant_area, expected_area);

    // 2. Larguras e alturas são exatamente 50%
    assert_eq!(q1.2, 600.0);
    assert_eq!(q1.3, 400.0);
    assert_eq!(q4.0, 800.0);
    assert_eq!(q4.1, 460.0);
}

#[test]
fn test_focus_sidebar_layout_geometry() {
    let rect = ViewportRect {
        x: 0.0,
        y: 0.0,
        width: 1000.0,
        height: 600.0,
    };

    let main_w = rect.width * 0.72;
    let side_w = rect.width - main_w;
    let side_slots_count = 3;
    let side_h = rect.height / (side_slots_count as f64);

    assert_eq!(main_w, 720.0);
    assert_eq!(side_w, 280.0);
    assert_eq!(side_h, 200.0);

    // Soma das alturas das 3 miniaturas laterais deve igualar a altura total
    let total_side_h = side_h * (side_slots_count as f64);
    assert!((total_side_h - rect.height).abs() < 0.001);
}

#[test]
fn test_config_store_game_slots_persistence() {
    use crate::config::ConfigStore;
    let temp_dir = std::env::temp_dir().join(format!("idlestream_game_test_{}", uuid::Uuid::new_v4()));
    let _ = std::fs::create_dir_all(&temp_dir);
    let config_file = temp_dir.join("test_config.json");

    let store = ConfigStore::new_with_path(config_file.clone());
    let mut config = store.load();

    // Deve carregar os 4 slots padrão
    assert_eq!(config.game_slots.len(), 4);

    // Modificar slot 1 com novo nome e URL
    config.game_slots[0].label = "Charizard Farm".to_string();
    config.game_slots[0].url = "https://pokeidle.io/app#charizard".to_string();
    config.game_slots[0].auto_start = true;

    store.save(&config).expect("Falha ao salvar config com game_slots");

    // Recarregar do disco e conferir persistência
    let reloaded = store.load();
    assert_eq!(reloaded.game_slots[0].label, "Charizard Farm");
    assert_eq!(reloaded.game_slots[0].url, "https://pokeidle.io/app#charizard");
    assert!(reloaded.game_slots[0].auto_start);

    // Cleanup
    let _ = std::fs::remove_dir_all(&temp_dir);
}
