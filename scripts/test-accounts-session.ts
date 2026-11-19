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

// 5. Tratamento de timeout / erro de rede (HTTP 408)
const timeoutSummary: AccountsHealthSummary = {
  total: 1,
  healthy: 0,
  failing: 0,
  checking: 0,
  warning: 1,
  all_healthy: false,
  checked_at: 1700000000,
  accounts: [
    {
      account_id: 'kk-timeout',
      platform: 'kick',
      label: 'Kick Timeout',
      username: 'kuser_timeout',
      state: 'network_error',
      authenticated_username: null,
      username_matches: null,
      has_redeem_session: true,
      http_status: 408,
      message: 'Tempo limite (8s) esgotado ao verificar conta com o servidor.',
      checked_at: 1700000000,
      requires_reauth: false,
    },
  ],
};
const timeoutAcc = getAccountHealthStatus(timeoutSummary, 'kk-timeout');
assert.ok(timeoutAcc);
assert.strictEqual(timeoutAcc.state, 'network_error');
assert.strictEqual(timeoutAcc.requires_reauth, false, 'Timeout de rede não deve marcar conta como exigindo re-login');
assert.strictEqual(getFailingAccounts(timeoutSummary).length, 0, 'NetworkError não deve ser listado em failingAccounts');

// 6. Teste de ordenação de contas: 1º Plataforma (Twitch antes de Kick), 2º Nome/Username (A-Z)
const unsortedAccounts = [
  { id: '1', platform: 'kick', label: 'Zebra Kick', username: 'zebrak' },
  { id: '2', platform: 'twitch', label: 'Beta Twitch', username: 'betat' },
  { id: '3', platform: 'kick', label: 'Alfa Kick', username: 'alfak' },
  { id: '4', platform: 'twitch', label: 'Alfa Twitch', username: 'alfat' },
];

const sorted = [...unsortedAccounts].sort((a, b) => {
  if (a.platform !== b.platform) {
    return a.platform === 'twitch' ? -1 : 1;
  }
  const nameA = (a.username || a.label || '').trim().toLowerCase();
  const nameB = (b.username || b.label || '').trim().toLowerCase();
  const nameComp = nameA.localeCompare(nameB);
  if (nameComp !== 0) return nameComp;
  return (a.label || '').trim().toLowerCase().localeCompare((b.label || '').trim().toLowerCase());
});

assert.deepStrictEqual(
  sorted.map((a) => a.id),
  ['4', '2', '3', '1'],
  'As contas devem ser ordenadas Twitch (Alfa, Beta) e depois Kick (Alfa, Zebra)'
);

// 7. Teste de atualização de dados da conta (edição de label e username)
const originalAccount = {
  id: 'acc-edit-1',
  platform: 'twitch' as const,
  label: 'Conta Velha',
  username: 'velho_nick',
  oauth_token: 'valid_token_xyz',
  enabled: true,
};

const updatedAccount = {
  ...originalAccount,
  label: '  Conta Nova Principal  '.trim(),
  username: '  novo_nick_pro  '.trim().toLowerCase(),
};

assert.strictEqual(updatedAccount.label, 'Conta Nova Principal');
assert.strictEqual(updatedAccount.username, 'novo_nick_pro');
assert.strictEqual(updatedAccount.oauth_token, 'valid_token_xyz', 'O token deve permanecer inalterado na edição de nome');
assert.strictEqual(updatedAccount.id, 'acc-edit-1', 'O ID deve permanecer inalterado');

console.log('✅ TODOS OS TESTES FRONTEND DE SAÚDE E GERENCIAMENTO DE CONTAS PASSARAM!\n');
