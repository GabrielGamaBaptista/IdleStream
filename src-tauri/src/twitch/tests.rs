#[cfg(test)]
mod tests {
    use crate::twitch::coordinator::*;
    use crate::twitch::gql::*;
    use crate::twitch::models::*;
    use crate::twitch::spade::*;
    use base64::prelude::*;
    use serde_json::json;

    #[test]
    fn test_compute_priority_ranks_by_uptime() {
        let mut streamers = vec![
            TwitchStreamerStats {
                channel_slug: "streamer_c".into(),
                channel_id: None,
                avg_duration_hours: 5.5,
                priority_rank: 0,
                is_live: false,
                current_points: None,
            },
            TwitchStreamerStats {
                channel_slug: "streamer_a".into(),
                channel_id: None,
                avg_duration_hours: 12.0,
                priority_rank: 0,
                is_live: false,
                current_points: None,
            },
            TwitchStreamerStats {
                channel_slug: "streamer_b".into(),
                channel_id: None,
                avg_duration_hours: 8.2,
                priority_rank: 0,
                is_live: false,
                current_points: None,
            },
            TwitchStreamerStats {
                channel_slug: "streamer_d".into(),
                channel_id: None,
                avg_duration_hours: 2.1,
                priority_rank: 0,
                is_live: false,
                current_points: None,
            },
        ];

        compute_priority_ranks(&mut streamers);

        assert_eq!(streamers[0].channel_slug, "streamer_a");
        assert_eq!(streamers[0].priority_rank, 1);

        assert_eq!(streamers[1].channel_slug, "streamer_b");
        assert_eq!(streamers[1].priority_rank, 2);

        assert_eq!(streamers[2].channel_slug, "streamer_c");
        assert_eq!(streamers[2].priority_rank, 3);

        assert_eq!(streamers[3].channel_slug, "streamer_d");
        assert_eq!(streamers[3].priority_rank, 4);
    }

    #[test]
    fn test_reconcile_account_slots_max_2_active() {
        // Cenário: 4 streamers cadastrados
        // Rank 1 (streamer_a) - ONLINE -> DEVE SER ATIVO #1
        // Rank 2 (streamer_b) - OFFLINE -> OFFLINE
        // Rank 3 (streamer_c) - ONLINE -> DEVE SER ATIVO #2
        // Rank 4 (streamer_d) - ONLINE -> DEVE SER STANDBY (3º online, excede limite de 2)
        let streamers = vec![
            TwitchStreamerStats {
                channel_slug: "streamer_a".into(),
                channel_id: Some("1".into()),
                avg_duration_hours: 12.0,
                priority_rank: 1,
                is_live: true,
                current_points: Some(100),
            },
            TwitchStreamerStats {
                channel_slug: "streamer_b".into(),
                channel_id: Some("2".into()),
                avg_duration_hours: 10.0,
                priority_rank: 2,
                is_live: false,
                current_points: Some(200),
            },
            TwitchStreamerStats {
                channel_slug: "streamer_c".into(),
                channel_id: Some("3".into()),
                avg_duration_hours: 8.0,
                priority_rank: 3,
                is_live: true,
                current_points: Some(300),
            },
            TwitchStreamerStats {
                channel_slug: "streamer_d".into(),
                channel_id: Some("4".into()),
                avg_duration_hours: 4.0,
                priority_rank: 4,
                is_live: true,
                current_points: Some(400),
            },
        ];

        let slots = reconcile_account_slots(&streamers);

        assert_eq!(slots.get("streamer_a"), Some(&MiningSlotState::ActiveMining));
        assert_eq!(slots.get("streamer_b"), Some(&MiningSlotState::Offline));
        assert_eq!(slots.get("streamer_c"), Some(&MiningSlotState::ActiveMining));
        assert_eq!(slots.get("streamer_d"), Some(&MiningSlotState::StandbyVigil));
    }

    #[test]
    fn test_reconcile_dynamic_promotion_when_top1_goes_offline() {
        // streamer_a encerra a transmissão: streamer_d deve ser promovido para ActiveMining!
        let streamers = vec![
            TwitchStreamerStats {
                channel_slug: "streamer_a".into(),
                channel_id: Some("1".into()),
                avg_duration_hours: 12.0,
                priority_rank: 1,
                is_live: false, // Caiu
                current_points: Some(100),
            },
            TwitchStreamerStats {
                channel_slug: "streamer_b".into(),
                channel_id: Some("2".into()),
                avg_duration_hours: 10.0,
                priority_rank: 2,
                is_live: false,
                current_points: Some(200),
            },
            TwitchStreamerStats {
                channel_slug: "streamer_c".into(),
                channel_id: Some("3".into()),
                avg_duration_hours: 8.0,
                priority_rank: 3,
                is_live: true,
                current_points: Some(300),
            },
            TwitchStreamerStats {
                channel_slug: "streamer_d".into(),
                channel_id: Some("4".into()),
                avg_duration_hours: 4.0,
                priority_rank: 4,
                is_live: true,
                current_points: Some(400),
            },
        ];

        let slots = reconcile_account_slots(&streamers);

        assert_eq!(slots.get("streamer_a"), Some(&MiningSlotState::Offline));
        assert_eq!(slots.get("streamer_b"), Some(&MiningSlotState::Offline));
        assert_eq!(slots.get("streamer_c"), Some(&MiningSlotState::ActiveMining));
        assert_eq!(slots.get("streamer_d"), Some(&MiningSlotState::ActiveMining), "streamer_d deve ser promovido a ativo");
    }

    #[tokio::test]
    async fn test_account_priority_coordinator_thread_safe() {
        let coordinator = AccountPriorityCoordinator::new();

        // 1. Cadastra streamer_x com 5h online
        let (state1, rank1) = coordinator
            .update_streamer_status("acc_1", "streamer_x", Some("101".into()), 5.0, true, Some(1000))
            .await;
        assert_eq!(state1, MiningSlotState::ActiveMining);
        assert_eq!(rank1, 1);

        // 2. Cadastra streamer_y com 10h online (deve ultrapassar streamer_x no rank!)
        let (state2, rank2) = coordinator
            .update_streamer_status("acc_1", "streamer_y", Some("102".into()), 10.0, true, Some(500))
            .await;
        assert_eq!(state2, MiningSlotState::ActiveMining);
        assert_eq!(rank2, 1); // streamer_y é o novo #1!

        // 3. Cadastra streamer_z com 8h online (entra entre y e x)
        let (state3, rank3) = coordinator
            .update_streamer_status("acc_1", "streamer_z", Some("103".into()), 8.0, true, Some(800))
            .await;
        assert_eq!(state3, MiningSlotState::ActiveMining);
        assert_eq!(rank3, 2);

        // 4. Cadastra streamer_w com 1h online (entra em 4º lugar, deve ficar StandbyVigil)
        let (state4, rank4) = coordinator
            .update_streamer_status("acc_1", "streamer_w", Some("104".into()), 1.0, true, Some(200))
            .await;
        assert_eq!(state4, MiningSlotState::StandbyVigil, "4º streamer online deve ficar em Standby");
        assert_eq!(rank4, 4);

        // 5. Verifica a lista consolidada
        let all = coordinator.get_account_streamers("acc_1").await;
        assert_eq!(all.len(), 4);
        assert_eq!(all[0].channel_slug, "streamer_y");
        assert_eq!(all[1].channel_slug, "streamer_z");
        assert_eq!(all[2].channel_slug, "streamer_x");
        assert_eq!(all[3].channel_slug, "streamer_w");
    }

    #[test]
    fn test_spade_payload_generation_and_base64() {
        let payload = build_spade_payload("123456", "987654321", "111222");
        assert!(!payload.is_empty());

        let decoded_bytes = BASE64_STANDARD.decode(&payload).expect("Base64 inválido");
        let json_val: serde_json::Value =
            serde_json::from_slice(&decoded_bytes).expect("JSON inválido no Spade payload");

        assert!(json_val.is_array());
        let event = &json_val[0];
        assert_eq!(event["event"], "minute-watched");
        assert_eq!(event["properties"]["channel_id"], "123456");
        assert_eq!(event["properties"]["broadcast_id"], "987654321");
        assert_eq!(event["properties"]["user_id"], "111222");
        assert_eq!(event["properties"]["player"], "site");
        assert_eq!(event["properties"]["live"], true);
    }

    #[test]
    fn test_parse_uptime_from_videos_json() {
        let mock_json = json!({
            "data": {
                "user": {
                    "videos": {
                        "edges": [
                            { "node": { "id": "1", "lengthSeconds": 36000 } }, // 10 horas
                            { "node": { "id": "2", "lengthSeconds": 28800 } }, // 8 horas
                            { "node": { "id": "3", "lengthSeconds": 43200 } }  // 12 horas
                        ]
                    }
                }
            }
        });

        let avg = parse_uptime_from_videos_json(&mock_json);
        assert_eq!(avg, Some(10.0));
    }

    #[test]
    fn test_parse_channel_points_context() {
        let mock_json = json!({
            "data": {
                "user": {
                    "id": "12345",
                    "stream": {
                        "id": "broadcast_999",
                        "type": "live"
                    },
                    "channel": {
                        "communityPoints": {
                            "balance": 15420,
                            "availableClaim": {
                                "id": "claim_uuid_abc_123"
                            }
                        }
                    }
                }
            }
        });

        let ctx = parse_channel_points_context(&mock_json).expect("Falha ao parsear contexto");
        assert!(ctx.is_live);
        assert_eq!(ctx.channel_id, "12345");
        assert_eq!(ctx.broadcast_id, Some("broadcast_999".into()));
        assert_eq!(ctx.balance, Some(15420));
        assert_eq!(ctx.available_claim_id, Some("claim_uuid_abc_123".into()));
    }

    // Testes de integração ao vivo com a API pública da Twitch (sem auth)
    #[tokio::test]
    async fn test_live_twitch_vods_uptime_fetch() {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .unwrap();

        // Consulta a média real de VODs de um streamer público grande na Twitch (ex: gaules)
        let res = fetch_streamer_uptime_avg(&http, "gaules", None).await;
        assert!(res.is_ok(), "Falha ao consultar VODs reais da Twitch: {:?}", res);
        let avg = res.unwrap();
        println!("Média calculada para gaules via Twitch GQL: {:.1}h", avg);
        assert!(avg > 0.0, "Média de horas deve ser maior que zero");
    }

    #[tokio::test]
    async fn test_live_twitch_channel_context_fetch() {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .unwrap();

        // Consulta o contexto de live real na Twitch (ex: gaules ou alanzoka)
        let res = fetch_channel_points_context(&http, "gaules", None).await;
        assert!(res.is_ok(), "Falha ao consultar contexto real: {:?}", res);
        let ctx = res.unwrap();
        println!("Contexto gaules: channel_id={}, is_live={}, broadcast_id={:?}", ctx.channel_id, ctx.is_live, ctx.broadcast_id);
        assert_eq!(ctx.channel_id, "181077473", "ID oficial do canal gaules na Twitch");
    }
}
