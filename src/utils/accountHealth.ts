export type AccountHealthState =
  | 'healthy'
  | 'invalid'
  | 'missing_credentials'
  | 'rate_limited'
  | 'network_error'
  | 'checking';

export interface AccountHealthStatus {
  account_id: string;
  platform: 'twitch' | 'kick';
  label: string;
  username: string;
  state: AccountHealthState;
  authenticated_username?: string | null;
  username_matches?: boolean | null;
  has_redeem_session: boolean;
  http_status?: number | null;
  message: string;
  checked_at: number;
  requires_reauth: boolean;
}

export interface AccountsHealthSummary {
  total: number;
  healthy: number;
  failing: number;
  checking: number;
  warning: number;
  all_healthy: boolean;
  checked_at: number;
  accounts: AccountHealthStatus[];
}

export function getAccountHealthStatus(
  summary: AccountsHealthSummary | null | undefined,
  accountId: string
): AccountHealthStatus | undefined {
  if (!summary || !Array.isArray(summary.accounts)) return undefined;
  return summary.accounts.find((a) => a.account_id === accountId);
}

export function getFailingAccounts(summary: AccountsHealthSummary | null | undefined): AccountHealthStatus[] {
  if (!summary || !Array.isArray(summary.accounts)) return [];
  return summary.accounts.filter(
    (a) => a.state === 'invalid' || a.state === 'missing_credentials'
  );
}

export function findDuplicateAuthenticatedUsernames(
  summary: AccountsHealthSummary | null | undefined
): Record<string, string[]> {
  if (!summary || !Array.isArray(summary.accounts)) return {};
  const byPlatformUser = new Map<string, { username: string; ids: string[] }>();

  for (const acc of summary.accounts) {
    const authUser = acc.authenticated_username?.trim().toLowerCase();
    if (!authUser) continue;
    const key = `${acc.platform}::${authUser}`;
    const existing = byPlatformUser.get(key);
    if (existing) {
      existing.ids.push(acc.account_id);
    } else {
      byPlatformUser.set(key, { username: authUser, ids: [acc.account_id] });
    }
  }

  const duplicates: Record<string, string[]> = {};
  for (const entry of byPlatformUser.values()) {
    if (entry.ids.length > 1) {
      const existing = duplicates[entry.username];
      duplicates[entry.username] = existing ? [...existing, ...entry.ids] : entry.ids;
    }
  }
  return duplicates;
}

export function shouldConfirmRedeemWhenUnhealthy(
  health: AccountHealthStatus | undefined
): boolean {
  if (!health) return false;
  return (
    health.state === 'invalid' ||
    health.state === 'missing_credentials' ||
    Boolean(health.requires_reauth)
  );
}
