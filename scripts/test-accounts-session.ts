import assert from 'node:assert';
import {
  AccountsHealthSummary,
  findDuplicateAuthenticatedUsernames,
  getAccountHealthStatus,
  getFailingAccounts,
  shouldConfirmRedeemWhenUnhealthy,
} from '../src/utils/accountHealth.ts';

console.log('🧪 Iniciando testes TDD de Saúde de Contas e Sessões (8 Contas)...\n');

const sampleSummary: AccountsHealthSummary = {
  total: 8,
  healthy: 7,
  failing: 1,
  checking: 0,
  warning: 0,
  all_healthy: false,
  checked_at: 1700000000,
  accounts: [
    ...Array.from({ length: 4 }, (_, i) => ({
      account_id: `tw-${i + 1}`,
      platform: 'twitch' as const,
      label: `Twitch ${i + 1}`,
      username: `tuser${i + 1}`,
      state: 'healthy' as const,
      authenticated_username: `tuser${i + 1}`,
      username_matches: true,
      has_redeem_session: true,
      http_status: 200,
      message: 'Conectada',
      checked_at: 1700000000,
      requires_reauth: false,
    })),
    ...Array.from({ length: 3 }, (_, i) => ({
      account_id: `kk-${i + 1}`,
      platform: 'kick' as const,
      label: `Kick ${i + 1}`,
      username: `kuser${i + 1}`,
      state: 'healthy' as const,
      authenticated_username: `kuser${i + 1}`,
      username_matches: true,
      has_redeem_session: true,
      http_status: 200,
      message: 'Conectada',
      checked_at: 1700000000,
      requires_reauth: false,
    })),
    {
      account_id: 'kk-4',
      platform: 'kick' as const,
      label: 'Kick 4',
      username: 'kuser4',
      state: 'invalid' as const,
      authenticated_username: null,
      username_matches: null,
      has_redeem_session: false,
      http_status: 200,
      message: 'Sessão expirada na Kick. Refaça o login.',
      checked_at: 1700000000,
      requires_reauth: true,
    },
  ],
};

// 1. Busca individual de status
const kk4 = getAccountHealthStatus(sampleSummary, 'kk-4');
assert.ok(kk4, 'Deve retornar o status de kk-4');
assert.strictEqual(kk4.state, 'invalid');
assert.strictEqual(kk4.requires_reauth, true);

// 2. Listagem das contas falhando (para banner global e alerta no header)
const failing = getFailingAccounts(sampleSummary);
assert.strictEqual(failing.length, 1);
assert.strictEqual(failing[0].account_id, 'kk-4');

// 3. Confirmação protetiva ao tentar resgatar com conta desconectada
const tw1 = getAccountHealthStatus(sampleSummary, 'tw-1');
assert.strictEqual(shouldConfirmRedeemWhenUnhealthy(tw1), false);
assert.strictEqual(shouldConfirmRedeemWhenUnhealthy(kk4), true);

// 4. Detecção de usuários duplicados logados em slots diferentes
const dupSummary: AccountsHealthSummary = {
  ...sampleSummary,
  accounts: sampleSummary.accounts.map((a) =>
    a.account_id === 'kk-2' ? { ...a, authenticated_username: 'KUSER1' } : a
  ),
};
const dups = findDuplicateAuthenticatedUsernames(dupSummary);
assert.ok(dups['kuser1'] && dups['kuser1'].length === 2, 'Deve identificar contas Kick duplicadas case-insensitive');

console.log('✅ TODOS OS TESTES FRONTEND DE SAÚDE DE CONTAS PASSARAM!\n');
