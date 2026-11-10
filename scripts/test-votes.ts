import assert from 'node:assert';
import {
  buildTopIdleVoteUrl,
  countReadyVoteAccounts,
  DEFAULT_TOPIDLE_GAME_URL,
  DEFAULT_VOTE_ACCOUNTS,
  formatCountdownHms,
  getVoteCooldownInfo,
  isAllowedVoteUrlPreview,
  VOTE_COOLDOWN_SECONDS,
} from '../src/services/votePlatformService.ts';

console.log('🧪 Iniciando bateria de testes unitários do Sistema de Votos Diários (TopIdle)...\n');

// 1. Contas padrão GGB2006 .. GGB2006_4 vinculadas aos 4 perfis Google do Idle Games
console.log('🔹 Teste 1: Contas padrão e vínculo com perfis Google do Idle Games...');
assert.strictEqual(DEFAULT_VOTE_ACCOUNTS.length, 4);
assert.deepStrictEqual(
  DEFAULT_VOTE_ACCOUNTS.map((a) => a.player_identifier),
  ['GGB2006', 'GGB2006_2', 'GGB2006_3', 'GGB2006_4']
);
assert.deepStrictEqual(
  DEFAULT_VOTE_ACCOUNTS.map((a) => a.linked_game_slot_id),
  ['slot-1', 'slot-2', 'slot-3', 'slot-4']
);
assert.ok(DEFAULT_VOTE_ACCOUNTS.every((a) => a.share_game_profile === true));
assert.strictEqual(new Set(DEFAULT_VOTE_ACCOUNTS.map((a) => a.id)).size, 4);
assert.strictEqual(new Set(DEFAULT_VOTE_ACCOUNTS.map((a) => a.color)).size, 4);
console.log('  ✓ 4 contas padrão configuradas com playerIdentifier e vínculo slot-1..4');

// 2. Construção e validação estrita de URL do TopIdle
console.log('\n🔹 Teste 2: Construção e validação estrita de URLs do TopIdle...');
const exactUrl = buildTopIdleVoteUrl(DEFAULT_TOPIDLE_GAME_URL, 'GGB2006_3');
assert.strictEqual(
  exactUrl,
  'https://topidle.com/jogo/pokeidle-io-5f9969?playerIdentifier=GGB2006_3'
);

const bareHost = buildTopIdleVoteUrl('topidle.com', 'GGB2006_2');
assert.strictEqual(
  bareHost,
  'https://topidle.com/jogo/pokeidle-io-5f9969?playerIdentifier=GGB2006_2'
);

const overrideId = buildTopIdleVoteUrl(
  'https://topidle.com/jogo/pokeidle-io-5f9969?playerIdentifier=ANTIGO&utm=idle',
  'GGB2006_4'
);
assert.ok(overrideId.includes('utm=idle'));
assert.ok(overrideId.includes('playerIdentifier=GGB2006_4'));
assert.ok(!overrideId.includes('ANTIGO'));

assert.throws(() => buildTopIdleVoteUrl('https://evil.com/jogo/pokeidle-io-5f9969', 'GGB2006'));
assert.throws(() => buildTopIdleVoteUrl('http://topidle.com/jogo/pokeidle-io-5f9969', 'GGB2006'));
assert.throws(() => buildTopIdleVoteUrl('https://topidle.com.evil.org/vote', 'GGB2006'));
console.log('  ✓ Somente https://*.topidle.com é aceito com playerIdentifier preservado');

// 3. Whitelist de navegação (TopIdle + Google OAuth + CAPTCHA interativo vs off-site)
console.log('\n🔹 Teste 3: Whitelist rigorosa de domínios permitidos na WebView de Votos...');
assert.strictEqual(
  isAllowedVoteUrlPreview('https://topidle.com/jogo/pokeidle-io-5f9969?playerIdentifier=GGB2006_3'),
  true
);
assert.strictEqual(isAllowedVoteUrlPreview('https://www.topidle.com/ranking'), true);
assert.strictEqual(
  isAllowedVoteUrlPreview('https://accounts.google.com/o/oauth2/v2/auth?client_id=123'),
  true
);
assert.strictEqual(
  isAllowedVoteUrlPreview('https://challenges.cloudflare.com/turnstile/v0/b/abc/api.js'),
  true
);
assert.strictEqual(
  isAllowedVoteUrlPreview('https://newassets.hcaptcha.com/captcha/v1/123/static/hcaptcha.html'),
  true
);
assert.strictEqual(
  isAllowedVoteUrlPreview('https://www.google.com/recaptcha/api2/anchor?k=xyz'),
  true
);
assert.strictEqual(isAllowedVoteUrlPreview('about:blank', true), true);

assert.strictEqual(isAllowedVoteUrlPreview('about:blank', false), false);
assert.strictEqual(isAllowedVoteUrlPreview('https://google.com/search?q=pokeidle'), false);
assert.strictEqual(isAllowedVoteUrlPreview('https://youtube.com/watch?v=123'), false);
assert.strictEqual(isAllowedVoteUrlPreview('https://twitch.tv/directory'), false);
assert.strictEqual(isAllowedVoteUrlPreview('http://topidle.com/jogo/pokeidle-io-5f9969'), false);
assert.strictEqual(isAllowedVoteUrlPreview('javascript:alert(1)'), false);
console.log('  ✓ Sites externos bloqueados; TopIdle, OAuth Google e CAPTCHAs liberados');

// 4. Regra exata de cooldown e notificação de 24h 01m (86.460 segundos)
console.log('\n🔹 Teste 4: Cooldown exato de 24h 01m (86.460s) e formatação HH:MM:SS...');
assert.strictEqual(VOTE_COOLDOWN_SECONDS, 86460);

const neverVoted = getVoteCooldownInfo(null, 1_700_000_000);
assert.strictEqual(neverVoted.isReady, true);
assert.strictEqual(neverVoted.remainingSeconds, 0);

const voteTime = 1_700_000_000;
const atVote = getVoteCooldownInfo(voteTime, voteTime);
assert.strictEqual(atVote.isReady, false);
assert.strictEqual(atVote.remainingSeconds, 86460);
assert.strictEqual(formatCountdownHms(atVote.remainingSeconds), '24:01:00');

const at24h00m = getVoteCooldownInfo(voteTime, voteTime + 86400);
assert.strictEqual(at24h00m.isReady, false, 'Em exatas 24h00m ainda faltam 60s!');
assert.strictEqual(at24h00m.remainingSeconds, 60);
assert.strictEqual(formatCountdownHms(60), '00:01:00');

const oneSecBefore = getVoteCooldownInfo(voteTime, voteTime + 86459);
assert.strictEqual(oneSecBefore.isReady, false);
assert.strictEqual(oneSecBefore.remainingSeconds, 1);
assert.strictEqual(formatCountdownHms(1), '00:00:01');

const exact24h01m = getVoteCooldownInfo(voteTime, voteTime + 86460);
assert.strictEqual(exact24h01m.isReady, true);
assert.strictEqual(exact24h01m.remainingSeconds, 0);
assert.strictEqual(formatCountdownHms(0), '00:00:00');

// 5. Contagem parcial de contas prontas (GGB2006..4)
const now = 1_700_100_000;
const mixed = DEFAULT_VOTE_ACCOUNTS.map((acc, idx) => ({
  ...acc,
  // vote-1: pronta (nunca votou)
  // vote-2: em cooldown (-1h)
  // vote-3: pronta (-24h02m)
  // vote-4: em cooldown (-24h00m -> faltando 1m)
  last_voted_at:
    idx === 0 ? null : idx === 1 ? now - 3600 : idx === 2 ? now - 86520 : now - 86400,
}));
assert.strictEqual(countReadyVoteAccounts(mixed, now), 2);
console.log('  ✓ Contagem parcial e temporizador de 24h 01m validados com precisão ao segundo');

console.log('\n🎉 TODOS OS TESTES UNITÁRIOS DO SISTEMA DE VOTOS PASSARAM COM 100% DE SUCESSO!\n');
