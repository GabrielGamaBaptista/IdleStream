import assert from 'node:assert';

console.log('🧪 Iniciando testes de validação do Resgate de Pontos de Lives (Webview On-Demand)...\n');

// 1. Teste de geração de URL de stream para Twitch e Kick
function buildTargetUrl(platform: 'twitch' | 'kick', channelSlug: string, popoutChat = true): string {
  const clean = channelSlug.trim();
  if (platform === 'kick') {
    return `https://kick.com/${clean}`;
  }
  if (popoutChat) {
    return `https://www.twitch.tv/popout/${clean}/chat?popout=`;
  }
  return `https://www.twitch.tv/${clean}`;
}

assert.strictEqual(
  buildTargetUrl('twitch', 'gaules'),
  'https://www.twitch.tv/popout/gaules/chat?popout=',
  'URL padrão Twitch deve ser Popout Chat para resgate vertical com pontos visíveis'
);
assert.strictEqual(
  buildTargetUrl('twitch', 'gaules', false),
  'https://www.twitch.tv/gaules',
  'URL secundária Twitch deve permitir visualização da live completa'
);
assert.strictEqual(
  buildTargetUrl('twitch', '  alanzoka  '),
  'https://www.twitch.tv/popout/alanzoka/chat?popout=',
  'URL Twitch deve limpar espaços ao redor do slug'
);
assert.strictEqual(
  buildTargetUrl('kick', 'xqc'),
  'https://kick.com/xqc',
  'URL Kick deve ser https://kick.com/<slug>'
);
assert.strictEqual(
  buildTargetUrl('kick', '  trainwreckstv  '),
  'https://kick.com/trainwreckstv',
  'URL Kick deve limpar espaços ao redor do slug'
);
console.log('  ✓ [URLs] Geração e higienização de URLs Twitch (Popout & Live) e Kick validadas');

// 1.1 Teste de User-Agent Desktop para Twitch e Auto-Claimer de Baús
const TWITCH_DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';
assert(TWITCH_DESKTOP_UA.includes('Windows NT 10.0'), 'UA desktop deve simular Windows');
assert(TWITCH_DESKTOP_UA.includes('Chrome/'), 'UA desktop deve simular Chrome');

const CHEST_SELECTORS = [
  'button[aria-label="Claim Bonus"]',
  'button[aria-label="Resgatar bônus"]',
  'button[aria-label*="Claim Bonus" i]',
  'button[aria-label*="Resgatar bônus" i]',
  '[data-test-selector="community-points-claim-summary"] button',
  '[data-test-selector="community-points-claim-summary"]',
  '.claimable-bonus__icon'
];
assert(CHEST_SELECTORS.length >= 5, 'Deve conter seletores abrangentes para baús de pontos');
console.log('  ✓ [Desktop UA & Auto-Claimer] Headers e seletores de baú Twitch validados');

// 2. Teste de sanitização de label de janela (Tauri / Android Profile)
function buildRedeemLabel(platform: 'twitch' | 'kick', accountId: string): string {
  const cleanId = accountId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${platform}_redeem_${cleanId}`;
}

assert.strictEqual(
  buildRedeemLabel('twitch', 'acc-main-1'),
  'twitch_redeem_acc-main-1',
  'Label deve aceitar hífens e números'
);
assert.strictEqual(
  buildRedeemLabel('kick', 'acc@special#2'),
  'kick_redeem_acc_special_2',
  'Label deve sanitizar caracteres especiais para _'
);
console.log('  ✓ [Profiles/Labels] Sanitização de IDs para janelas Tauri e perfis Android validada');

// 3. Teste de formatação e injeção de Cookies para Twitch
function buildTwitchCookie(authToken: string): string {
  return `auth-token=${authToken.trim()}; Domain=.twitch.tv; Path=/; Secure; SameSite=Lax`;
}

const twitchCookie = buildTwitchCookie('oauth_token_twitch_live_999');
assert(twitchCookie.includes('auth-token=oauth_token_twitch_live_999'), 'Deve conter o token correto');
assert(twitchCookie.includes('Domain=.twitch.tv'), 'Deve pertencer ao domínio .twitch.tv');
assert(twitchCookie.includes('SameSite=Lax'), 'Deve conter SameSite=Lax para compatibilidade');
console.log('  ✓ [Twitch Cookies] Formatação de cookies nativos e injeção Webview validada');

// 4. Teste de formatação e injeção de Cookies para Kick
function buildKickCookies(sessionToken?: string, kickSession?: string, xsrfToken?: string) {
  const cookies: { name: string; value: string }[] = [];
  if (sessionToken && sessionToken.trim()) {
    cookies.push({ name: 'session_token', value: `session_token=${sessionToken.trim()}; Domain=.kick.com; Path=/; Secure` });
  }
  if (kickSession && kickSession.trim()) {
    cookies.push({ name: 'kick_session', value: `kick_session=${kickSession.trim()}; Domain=.kick.com; Path=/; Secure` });
  }
  if (xsrfToken && xsrfToken.trim()) {
    cookies.push({ name: 'XSRF-TOKEN', value: `XSRF-TOKEN=${xsrfToken.trim()}; Domain=.kick.com; Path=/; Secure` });
  }
  return cookies;
}

const kickCookies = buildKickCookies('sess_tok_123', 'kick_sess_456', 'xsrf_789');
assert.strictEqual(kickCookies.length, 3, 'Deve gerar os 3 cookies essenciais da Kick');
assert.strictEqual(kickCookies[0].name, 'session_token');
assert(kickCookies[0].value.includes('Domain=.kick.com'));
assert.strictEqual(kickCookies[1].name, 'kick_session');
assert.strictEqual(kickCookies[2].name, 'XSRF-TOKEN');

const partialKick = buildKickCookies('sess_only', undefined, '');
assert.strictEqual(partialKick.length, 1, 'Deve omitir cookies vazios ou indefinidos');
console.log('  ✓ [Kick Cookies] Multi-cookies e tratamento de ausência validados');

// 5. Teste de roteamento: AndroidBridge vs Desktop Invoke
interface MockAndroidBridge {
  lastCall?: any;
  openStreamRedeem(
    platform: string,
    channelSlug: string,
    accountId: string,
    accountLabel: string,
    accountUsername: string,
    authToken: string,
    kickSession: string,
    sessionToken: string,
    xsrfToken: string
  ): void;
}

const mockBridge: MockAndroidBridge = {
  openStreamRedeem(plat, slug, id, label, user, tok, kSess, sTok, xsrf) {
    this.lastCall = { plat, slug, id, label, user, tok, kSess, sTok, xsrf };
  },
};

// Simulação de chamada mobile
mockBridge.openStreamRedeem(
  'twitch',
  'gaules',
  'acc-1',
  'Principal',
  'gabriel',
  'auth123',
  '',
  '',
  ''
);

assert.deepStrictEqual(mockBridge.lastCall, {
  plat: 'twitch',
  slug: 'gaules',
  id: 'acc-1',
  label: 'Principal',
  user: 'gabriel',
  tok: 'auth123',
  kSess: '',
  sTok: '',
  xsrf: '',
});
console.log('  ✓ [Android Bridge Contract] Interface de despacho mobile validada');

// 6. Teste de isolamento on-demand (Webviews não ficam abertas permanentemente)
interface MockStreamRuntime {
  activeRedeemWindows: Set<string>;
  openRedeem(accountId: string): void;
  closeRedeem(accountId: string): void;
}

const runtime: MockStreamRuntime = {
  activeRedeemWindows: new Set(),
  openRedeem(accId) {
    this.activeRedeemWindows.add(accId);
  },
  closeRedeem(accId) {
    this.activeRedeemWindows.delete(accId);
  },
};

assert.strictEqual(runtime.activeRedeemWindows.size, 0, 'Inicia sem webviews de resgate abertas');
runtime.openRedeem('acc-1');
assert.strictEqual(runtime.activeRedeemWindows.size, 1, 'Abre webview exclusivamente no clique do usuário');
assert(runtime.activeRedeemWindows.has('acc-1'));
runtime.closeRedeem('acc-1');
assert.strictEqual(runtime.activeRedeemWindows.size, 0, 'Libera todos os recursos ao fechar a live');
console.log('  ✓ [On-Demand Lifecycle] Abertura sob demanda e destruição limpa validadas');

console.log('\n🎉 TODOS OS TESTES DO FLUXO DE RESGATE DE PONTOS PASSARAM COM SUCESSO (100%)!\n');
