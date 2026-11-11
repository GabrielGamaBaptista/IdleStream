use crate::config::{Account, Platform};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AccountHealthState {
    Healthy,
    Invalid,
    MissingCredentials,
    RateLimited,
    NetworkError,
    Checking,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AccountHealthStatus {
    pub account_id: String,
    pub platform: Platform,
    pub label: String,
    pub username: String,
    pub state: AccountHealthState,
    pub authenticated_username: Option<String>,
    pub username_matches: Option<bool>,
    pub has_redeem_session: bool,
    pub http_status: Option<u16>,
    pub message: String,
    pub checked_at: i64,
    pub requires_reauth: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AccountsHealthSummary {
    pub total: usize,
    pub healthy: usize,
    pub failing: usize,
    pub checking: usize,
    pub warning: usize,
    pub all_healthy: bool,
    pub checked_at: i64,
    pub accounts: Vec<AccountHealthStatus>,
}

pub fn aggregate_accounts_health(
    accounts: &[Account],
    statuses: &HashMap<String, AccountHealthStatus>,
    checked_at: i64,
) -> AccountsHealthSummary {
    let total = accounts.len();
    let mut healthy = 0usize;
    let mut failing = 0usize;
    let mut checking = 0usize;
    let mut warning = 0usize;
    let mut out_accounts = Vec::with_capacity(total);

    for acc in accounts {
        if let Some(st) = statuses.get(&acc.id) {
            match st.state {
                AccountHealthState::Healthy => {
                    healthy += 1;
                    if st.username_matches == Some(false) {
                        warning += 1;
                    }
                }
                AccountHealthState::Invalid | AccountHealthState::MissingCredentials => {
                    failing += 1;
                }
                AccountHealthState::RateLimited | AccountHealthState::NetworkError => {
                    warning += 1;
                }
                AccountHealthState::Checking => {
                    checking += 1;
                }
            }
            out_accounts.push(st.clone());
        } else {
            checking += 1;
            out_accounts.push(AccountHealthStatus {
                account_id: acc.id.clone(),
                platform: acc.platform,
                label: acc.label.clone(),
                username: acc.username.clone(),
                state: AccountHealthState::Checking,
                authenticated_username: None,
                username_matches: None,
                has_redeem_session: match acc.platform {
                    Platform::Kick => acc
                        .kick_session
                        .as_deref()
                        .map(|s| !s.trim().is_empty())
                        .unwrap_or(false)
                        && acc
                            .session_token
                            .as_deref()
                            .map(|s| !s.trim().is_empty())
                            .unwrap_or(false),
                    Platform::Twitch => acc
                        .oauth_token
                        .as_deref()
                        .map(|s| !s.trim().is_empty())
                        .unwrap_or(false),
                },
                http_status: None,
                message: "Aguardando verificação...".into(),
                checked_at,
                requires_reauth: false,
            });
        }
    }

    let all_healthy = total > 0 && healthy == total && failing == 0 && checking == 0;

    AccountsHealthSummary {
        total,
        healthy,
        failing,
        checking,
        warning,
        all_healthy,
        checked_at,
        accounts: out_accounts,
    }
}
