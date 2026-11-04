// [IdleStream] /hunt for PokeIdle - Extensão oficial embutida
// Versão: 1.0.12 (Liang) - Compatível com pokeidle.io
(() => {
  if (window.__pokeidleHuntInstalled) return;
  window.__pokeidleHuntInstalled = true;

  // Injetar estilos visuais da extensão
  try {
    const style = document.createElement('style');
    style.id = '__pokeidle_hunt_style__';
    style.textContent = "/* PokeIdle Hunt — o botão /hunt no \"Em campo\" e o painel \"Onde caçar?\".\n   As cores são as variáveis do próprio jogo (com reserva), para parecer da casa. */\n\n/* O /hunt é o botão \"Mega Evoluir\" do jogo, mais curto: o mesmo dourado com o fio de luz em\n   cima (#ffe9a8 → #d09a17), a mesma moldura e o texto escuro. */\n.pih-btn {\n  display: inline-block; padding: 4px 10px; border: 0; border-radius: 6px; cursor: pointer;\n  background: linear-gradient(180deg, #ffe9a8 0 4px, #d09a17 4px 100%);\n  box-shadow: inset 0 0 0 2px var(--mad-linha, #480e1e), 0 1px 0 var(--mad-luz2, #e7a86d);\n  color: #000; text-shadow: 0 1px 0 rgba(255, 255, 255, .35);\n  font: 700 12px/1.2 Tahoma, Verdana, \"Segoe UI\", sans-serif; white-space: nowrap;\n}\n.pih-btn:hover { filter: brightness(1.06); }\n.pih-btn.pih-carregando { animation: pih-pulso 1s ease-in-out infinite; }\n@keyframes pih-pulso { 50% { filter: brightness(1.2); } }\n\n/* A barra fica no fluxo do painel \"Em campo\", entre o título e o card: acompanha a largura da\n   caixa em qualquer tela e nunca cobre o pokémon. */\n.pih-btn.pih-barra {\n  display: block; width: clamp(110px, 55%, 240px); margin: 0 auto 8px; padding: 7px 10px;\n}\n.pih-btn[hidden] { display: none; }\n/* Reserva, quando o jogador apontou o pokémon à mão (layout desconhecido): flutua acima dele. */\n.pih-btn.pih-fixo { position: fixed; z-index: 38; margin: 0; }\n\n/* ---- painel -------------------------------------------------------------------------- */\n.pih-painel {\n  position: fixed; z-index: 38; width: min(640px, calc(100vw - 24px)); max-height: min(78vh, 760px);\n  display: flex; flex-direction: column;\n  font: 500 12.5px/1.35 \"Barlow\", system-ui, sans-serif; color: var(--sobre-mad, #fff6ef);\n  background: linear-gradient(180deg, var(--mad-esc, #914850) 0 10px, var(--mad, #bd6951) 10px calc(100% - 10px), var(--mad-base, #722c3f) calc(100% - 10px));\n  border-radius: 9px; padding: 12px 14px 12px;\n  box-shadow: inset 0 0 0 2px var(--mad-linha, #480e1e), inset 0 3px 0 var(--mad-luz, #f1d3b7), 0 10px 30px #0009;\n}\n.pih-cab { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }\n.pih-cab .pih-btn { flex: none; cursor: default; }\n.pih-titulo { flex: 1; min-width: 0; }\n.pih-titulo h3 { margin: 0; font-size: 15px; font-weight: 800; letter-spacing: .3px; text-transform: uppercase; }\n.pih-credito { margin-left: 8px; font-size: 10.5px; font-weight: 500; letter-spacing: 0; text-transform: none; color: var(--sobre-mad, #fff6ef); opacity: .38; }\n.pih-titulo small { display: block; color: var(--sobre-mad-dim, #f5cdb9); font-size: 12px; font-weight: 600; }\n.pih-fechar {\n  flex: none; width: 26px; height: 26px; border-radius: 6px; cursor: pointer; font: 800 15px/1 system-ui;\n  color: var(--sobre-mad, #fff6ef); background: var(--vao, #33202b); border: 0;\n  box-shadow: inset 0 0 0 2px var(--mad-linha, #480e1e);\n}\n/* O apoio ao dev: botão dourado no cabeçalho (a cara do /hunt) e o balão com o QR da Livepix. */\n.pih-cab .pih-apoiar { cursor: pointer; padding: 6px 9px; font-size: 11px; }\n.pih-cab .pih-apoiar[aria-expanded=\"true\"] { filter: brightness(.9); }\n.pih-apoio { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; font-size: 12px; }\n.pih-apoio[hidden] { display: none; }\n.pih-apoio-qr { flex: none; display: block; width: 112px; height: 112px; border-radius: 6px; overflow: hidden; box-shadow: 0 0 0 2px var(--mad-luz2, #e7a86d); }\n.pih-apoio-qr svg { display: block; width: 100%; height: 100%; }\n.pih-apoio b { font-size: 14px; }\n.pih-apoio p { margin: 4px 0 6px; color: var(--sobre-mad-dim, #f5cdb9); }\n.pih-apoio-link { text-decoration: none; }\n.pih-vao {\n  background: var(--vao, #33202b); border-radius: 6px; padding: 8px 10px;\n  box-shadow: inset 0 0 0 2px var(--mad-linha, #480e1e), 0 1px 0 var(--mad-luz2, #e7a86d);\n}\n.pih-stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px 8px; margin-bottom: 8px; }\n.pih-stat b { display: block; font-size: 10px; color: var(--vao-dim, #c9a9b4); font-weight: 700; }\n.pih-stat span { font-weight: 700; font-variant-numeric: tabular-nums; }\n.pih-stat i { font-style: normal; color: var(--verde, #6fd08a); font-size: 10.5px; margin-left: 3px; }\n\n.pih-bonus { margin-bottom: 8px; font-size: 12px; display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: baseline; }\n.pih-bonus-total { margin-left: auto; font-weight: 800; color: var(--verde, #6fd08a); }\n.pih-ctrl { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: center; margin-bottom: 8px; }\n.pih-seg { display: inline-flex; border-radius: 6px; overflow: hidden; box-shadow: inset 0 0 0 2px var(--mad-linha, #480e1e); }\n.pih-seg button {\n  border: 0; cursor: pointer; padding: 5px 10px; font: 700 12px/1 \"Barlow\", system-ui, sans-serif;\n  color: var(--sobre-mad-dim, #f5cdb9); background: var(--vao, #33202b);\n}\n.pih-seg button.on { color: var(--rx-luz, #ffdef0); background: linear-gradient(180deg, var(--rx-clr, #e77ad2), var(--rx-esc, #8d49b8)); }\n/* O SHINY: o arco-íris anda e o brilho troca de cor junto. A faixa tem 2× a largura do botão, e 200% é uma volta inteira\n   dela (a posição em % conta sobre o que sobra: 1× o botão), então a repetição não dá salto. */\n.pih-shiny {\n  flex: none; padding: 5px 10px; border: 0; border-radius: 6px; cursor: pointer;\n  background: linear-gradient(90deg, #ff4d6d, #ff9f1c, #ffe14d, #4ade80, #38bdf8, #a78bfa, #f472b6, #ff4d6d) 0 0 / 200% 100%;\n  color: #fff; font: 900 12px/1.2 Tahoma, Verdana, \"Segoe UI\", sans-serif; letter-spacing: 1px; white-space: nowrap;\n  text-shadow: 0 1px 0 #000, 1px 0 0 #000, 0 -1px 0 #000, -1px 0 0 #000, 0 0 5px #000;\n  box-shadow: inset 0 0 0 1px #ffffffa6, 0 0 8px 1px #ff4d6d;\n  animation: pih-arco 4s linear infinite, pih-arco-brilho 4s linear infinite;\n}\n.pih-shiny:hover { filter: brightness(1.12); }\n.pih-shiny:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }\n@keyframes pih-arco { to { background-position: 200% 0; } }\n@keyframes pih-arco-brilho {\n  0%, 100% { box-shadow: inset 0 0 0 1px #ffffffa6, 0 0 8px 1px #ff4d6d; }\n  25% { box-shadow: inset 0 0 0 1px #ffffffa6, 0 0 9px 2px #ffe14d; }\n  50% { box-shadow: inset 0 0 0 1px #ffffffa6, 0 0 9px 2px #38bdf8; }\n  75% { box-shadow: inset 0 0 0 1px #ffffffa6, 0 0 9px 2px #a78bfa; }\n}\n@media (prefers-reduced-motion: reduce) { .pih-shiny { animation: none; } }\n.pih-ctrl label { display: inline-flex; gap: 5px; align-items: center; cursor: pointer; font-weight: 600; }\n.pih-regioes { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }\n.pih-regioes button {\n  display: inline-flex; align-items: baseline; gap: 4px; border: 0; border-radius: 6px; cursor: pointer; padding: 5px 8px;\n  font: 700 12px/1 \"Barlow\", system-ui, sans-serif; color: var(--sobre-mad-dim, #f5cdb9); background: var(--vao, #33202b);\n  box-shadow: inset 0 0 0 2px var(--mad-linha, #480e1e);\n}\n.pih-regioes button small { font-size: 10.5px; font-weight: 600; color: var(--vao-dim, #c9a9b4); }\n.pih-regioes button.on { color: var(--rx-luz, #ffdef0); background: linear-gradient(180deg, var(--rx-clr, #e77ad2), var(--rx-esc, #8d49b8)); }\n.pih-regioes button.on::before { content: \"✓\"; }\n.pih-regioes button.on small { color: var(--rx-luz, #ffdef0); }\n.pih-regioes button:focus-visible { outline: 2px solid #ffe9a8; outline-offset: 1px; }\n\n.pih-ajuda {\n  margin-left: auto; flex: none; width: 22px; height: 22px; padding: 0; border: 0; border-radius: 50%; cursor: pointer;\n  font: 800 13px/1 Tahoma, Verdana, \"Segoe UI\", sans-serif; color: #000;\n  background: linear-gradient(180deg, #ffe9a8 0 3px, #d09a17 3px 100%);\n  box-shadow: inset 0 0 0 2px var(--mad-linha, #480e1e);\n}\n.pih-ajuda:hover { filter: brightness(1.06); }\n.pih-ajuda[aria-expanded=\"true\"] { filter: brightness(.9); }\n.pih-dica { margin: -2px 0 8px; font-size: 12px; }\n.pih-dica[hidden] { display: none; }\n/* O aviso fixo: o que a conta deixa de fora de propósito (discos AoE e TM Elemental). */\n.pih-nota { margin: -2px 0 8px; font-size: 11.5px; font-weight: 600; color: var(--laranja, #f0a03c); }\n.pih-melhor { margin-bottom: 8px; display: flex; gap: 10px; align-items: center; }\n.pih-melhor .pih-coroa { font-size: 20px; }\n.pih-melhor strong { font-size: 15px; }\n.pih-melhor .pih-dim { color: var(--vao-dim, #c9a9b4); }\n\n.pih-lista { overflow: auto; padding: 0; min-height: 80px; }\n.pih-tab { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }\n.pih-tab th {\n  position: sticky; top: 0; z-index: 1; background: var(--vao2, #462b39); color: var(--vao-dim, #c9a9b4);\n  font-size: 10.5px; text-transform: uppercase; letter-spacing: .4px; text-align: right; padding: 6px 8px; white-space: nowrap;\n}\n.pih-tab th:nth-child(-n+2), .pih-tab td:nth-child(-n+2) { text-align: left; }\n.pih-tab td { padding: 5px 8px; text-align: right; border-top: 1px solid var(--vao2, #462b39); white-space: nowrap; }\n.pih-tab tr.pih-top td { background: #6fd08a1f; }\n.pih-tab tr.pih-bloq td { opacity: .5; }\n.pih-tab td.pih-hunt { white-space: normal; }\n.pih-tab td.pih-hunt b { font-weight: 700; }\n.pih-tab td.pih-hunt small { display: block; color: var(--vao-dim, #c9a9b4); font-size: 10.5px; }\n.pih-pos { color: var(--vao-dim, #c9a9b4); width: 1%; }\n.pih-ok { color: var(--verde, #6fd08a); }\n.pih-alerta { color: var(--laranja, #f0a03c); }\n.pih-perigo { color: var(--vermelho-luz, #ffc9bd); }\n.pih-medido { color: var(--verde, #6fd08a); cursor: help; margin-right: 2px; }\n.pih-faixa { display: block; color: var(--vao-dim, #c9a9b4); font-size: 10px; white-space: nowrap; }\n.pih-aprox { color: var(--vao-dim, #c9a9b4); cursor: help; }\n.pih-mais { width: 100%; margin-top: 6px; padding: 6px; cursor: pointer; border: 0; border-radius: 6px;\n  font: 700 12px/1 \"Barlow\", system-ui, sans-serif; color: var(--sobre-mad, #fff6ef); background: var(--vao2, #462b39); }\n.pih-wl-chamada { margin-bottom: 8px; font-size: 12.5px; }\n.pih-wl-chamada b { color: #ffe9a8; }\n.pih-wl-volta { margin-bottom: 8px; font-size: 12.5px; }\n.pih-wl-volta b { color: #6fd08a; }\n.pih-tab tr.pih-wl-primeiro td { background: #d09a1733; }\n.pih-tab tr.pih-wl-primeiro td.pih-wl-valor { color: #ffe9a8; font-weight: 800; }\n.pih-tab td.pih-wl-valor { font-weight: 700; }\n.pih-wl-link { color: #ffe9a8; font-weight: 700; }\n.pih-com-arte { display: flex; align-items: center; gap: 8px; }\n.pih-arte { flex: none; display: block; width: var(--px, 30px); height: var(--px, 30px); }\n.pih-arte img { display: block; width: 100%; height: 100%; }\n.pih-rodape { margin-top: 8px; font-size: 11px; color: var(--sobre-mad-dim, #f5cdb9); }\n.pih-carga { display: grid; place-items: center; gap: 8px; padding: 26px 0; color: var(--vao-dim, #c9a9b4); }\n.pih-carga::before {\n  content: \"\"; width: 26px; height: 26px; border-radius: 50%;\n  border: 3px solid var(--vao2, #462b39); border-top-color: var(--rx-clr, #e77ad2); animation: pih-gira .7s linear infinite;\n}\n@keyframes pih-gira { to { transform: rotate(1turn); } }\n.pih-erro { color: var(--vermelho-luz, #ffc9bd); padding: 12px 0; }\n\n/* ---- aviso (verificação \"onde está seu pokémon ativo?\") ------------------------------- */\n.pih-aviso {\n  position: fixed; left: 16px; bottom: 44px; z-index: 38; max-width: 340px;\n  display: flex; gap: 10px; align-items: center;\n  font: 600 12.5px/1.35 \"Barlow\", system-ui, sans-serif; color: var(--sobre-mad, #fff6ef);\n  background: var(--vao, #33202b); border-radius: 8px; padding: 10px 12px;\n  box-shadow: inset 0 0 0 2px var(--mad-linha, #480e1e), 0 0 0 2px var(--mad-luz2, #e7a86d), 0 8px 20px #0008;\n}\n.pih-aviso .pih-btn { flex: none; font-size: 10.5px; cursor: default; }\n.pih-aviso button.pih-x { margin-left: auto; background: none; border: 0; color: inherit; cursor: pointer; font-size: 14px; }\n.pih-mirando, .pih-mirando * { cursor: crosshair !important; }\n.pih-alvo { outline: 3px dashed var(--seta, #ffd166) !important; outline-offset: 2px; }\n";
    (document.head || document.documentElement).appendChild(style);
  } catch (e) {
    console.error('[IdleStream Hunt] Falha ao injetar CSS:', e);
  }
})();

// === boot.js ===
// O "pronto" dos módulos do jogo. Na loja, quem os entrega é o pacote embutido (jogo-bundle.js,
// gerado por scripts/vendor-jogo.mjs); no userscript, um carregador que os importa ao vivo da
// página. Os dois chamam `definirModulosDoJogo`; game.js e hook.js esperam por `jogoPronto`.
// Nada aqui baixa código: é só o ponto de encontro, para o Manifest V3 não ver import remoto.
(function (root) {
  'use strict';
  const PIH = (root.__pokeidleHunt ??= {});
  let resolver;
  PIH.jogoPronto = new Promise((r) => { resolver = r; });
  PIH.definirModulosDoJogo = (mod, criarMescladorDeEstado) => {
    PIH.modulosDoJogo = mod;
    PIH.criarMescladorDeEstado = criarMescladorDeEstado;
    resolver(mod);
  };
})(globalThis);


// === jogo-bundle.js ===
// GERADO por scripts/vendor-jogo.mjs — NÃO EDITAR. Os módulos do jogo embutidos (sem import remoto).
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // tests/.cache/shared/cooldown-golpes.mjs
  var cooldown_golpes_exports = {};
  __export(cooldown_golpes_exports, {
    COOLDOWN_600_MS: () => COOLDOWN_600_MS,
    COOLDOWN_MEGA_MS: () => COOLDOWN_MEGA_MS,
    PODER_MINIMO: () => PODER_MINIMO,
    SPEED_POTENCIAL_TETO_PCT: () => SPEED_POTENCIAL_TETO_PCT,
    aplicarCurvaNoGolpe: () => aplicarCurvaNoGolpe,
    cooldownDoPoder: () => cooldownDoPoder,
    cooldownGolpeComSpeed: () => cooldownGolpeComSpeed,
    descontoDoSpeedPct: () => descontoDoSpeedPct,
    poderNormalizado: () => poderNormalizado,
    potencialDoSpeed: () => potencialDoSpeed
  });
  var PODER_MINIMO = 15;
  var PODER_JOELHO = 100;
  var COOLDOWN_600_MS = 6e4;
  var COOLDOWN_MEGA_MS = 3e4;
  function poderNormalizado(power) {
    const p = Number(power);
    return Number.isFinite(p) && p > PODER_MINIMO ? p : PODER_MINIMO;
  }
  function cooldownDoPoder(power) {
    const p = poderNormalizado(power);
    const seg = p <= PODER_JOELHO ? 10 + (p - PODER_MINIMO) * 20 / (PODER_JOELHO - PODER_MINIMO) : 30 + (p - PODER_JOELHO) * 30 / (600 - PODER_JOELHO);
    return Math.round(seg * 10) * 100;
  }
  function aplicarCurvaNoGolpe(a) {
    if (!a) return false;
    const poder = poderNormalizado(a.power);
    const cd = cooldownDoPoder(poder);
    if (a.power === poder && a.cooldownMs === cd) return false;
    a.power = poder;
    a.cooldownMs = cd;
    return true;
  }
  var SPEED_POTENCIAL_TETO_PCT = 7;
  var SPEED_JOELHO = 120;
  var ivDoSpeed = (iv) => Math.min(32, Math.max(1, Math.round(Number(iv) || 1)));
  function potencialDoSpeed(speedBase) {
    const s = Math.max(0, Number(speedBase) || 0);
    const pct = s <= SPEED_JOELHO ? s / 20 : 6 + (s - SPEED_JOELHO) / 40;
    return Math.min(SPEED_POTENCIAL_TETO_PCT, pct);
  }
  function descontoDoSpeedPct(speedBase, ivSpeed) {
    return potencialDoSpeed(speedBase) * (ivDoSpeed(ivSpeed) / 32);
  }
  function cooldownGolpeComSpeed(cooldownMs, speedBase, ivSpeed) {
    const base = Math.max(0, Number(cooldownMs) || 0);
    if (base <= 0) return base;
    return Math.round(base * (1 - descontoDoSpeedPct(speedBase, ivSpeed) / 100));
  }

  // tests/.cache/shared/golpes-especiais.mjs
  var golpes_especiais_exports = {};
  __export(golpes_especiais_exports, {
    GOLPE_600_POR_TIPO: () => GOLPE_600_POR_TIPO,
    GOLPE_600_POR_TIPO_B: () => GOLPE_600_POR_TIPO_B,
    GOLPE_600_RESERVA: () => GOLPE_600_RESERVA,
    TIPOS_ELEMENTO: () => TIPOS_ELEMENTO,
    dexDe: () => dexDe,
    ehUltimaEvolucao: () => ehUltimaEvolucao,
    elegivelParaGolpeEspecial: () => elegivelParaGolpeEspecial,
    fixarCooldownGolpe600: () => fixarCooldownGolpe600,
    golpesDaFicha: () => golpesDaFicha,
    injetarGolpesEspeciais: () => injetarGolpesEspeciais,
    limparGolpesQuebrados: () => limparGolpesQuebrados,
    temGolpe600DoTipo: () => temGolpe600DoTipo
  });

  // tests/.cache/shared/outland.mjs
  var outland_exports = {};
  __export(outland_exports, {
    OUTLAND_DEX_BASE: () => OUTLAND_DEX_BASE,
    OUTLAND_POKE_LEGADO_MAX: () => OUTLAND_POKE_LEGADO_MAX,
    OUTLAND_POKE_LEGADO_MIN: () => OUTLAND_POKE_LEGADO_MIN,
    OUTLAND_POKE_MAX: () => OUTLAND_POKE_MAX,
    OUTLAND_POKE_MIN: () => OUTLAND_POKE_MIN,
    OUTLAND_POKE_REMAP_OFFSET: () => OUTLAND_POKE_REMAP_OFFSET,
    aplicarRemapOutlandLista: () => aplicarRemapOutlandLista,
    dexChaveOutland: () => dexChaveOutland,
    isEspelhoFantasmaPokeId: () => isEspelhoFantasmaPokeId,
    isOutlandPokeId: () => isOutlandPokeId,
    isOutlandPokeIdLegado: () => isOutlandPokeIdLegado,
    montarOutlandDex: () => montarOutlandDex,
    montarOutlandDexLegado48: () => montarOutlandDexLegado48,
    remapOutlandPokeId: () => remapOutlandPokeId
  });
  var OUTLAND_DEX_BASE = 2001;
  var OUTLAND_POKE_MIN = 2001;
  var OUTLAND_POKE_MAX = 2059;
  var OUTLAND_POKE_LEGADO_MIN = 10501;
  var OUTLAND_POKE_LEGADO_MAX = 10548;
  var OUTLAND_POKE_REMAP_OFFSET = OUTLAND_POKE_LEGADO_MIN - OUTLAND_POKE_MIN;
  function isOutlandPokeId(pokeId) {
    const id = Number(pokeId);
    return id >= OUTLAND_POKE_MIN && id < OUTLAND_POKE_MAX;
  }
  function isOutlandPokeIdLegado(pokeId) {
    const id = Number(pokeId);
    return id >= OUTLAND_POKE_LEGADO_MIN && id < OUTLAND_POKE_LEGADO_MAX;
  }
  function remapOutlandPokeId(pokeId) {
    const id = Number(pokeId);
    if (!Number.isFinite(id)) return pokeId;
    if (isOutlandPokeIdLegado(id)) return id - OUTLAND_POKE_REMAP_OFFSET;
    return id;
  }
  function isEspelhoFantasmaPokeId(pokeId) {
    const id = Number(pokeId);
    return id >= 1e4 && id < OUTLAND_POKE_LEGADO_MIN;
  }
  function montarOutlandDex(especiesMap) {
    const lista = [...especiesMap.values()].filter((e) => isOutlandPokeId(e.pokeId)).sort((a, b) => a.pokeId - b.pokeId);
    const pokeToDex = {};
    const dexToPoke = {};
    for (const e of lista) {
      pokeToDex[e.pokeId] = e.pokeId;
      dexToPoke[e.pokeId] = e.pokeId;
    }
    const total = lista.length;
    return {
      pokeToDex,
      dexToPoke,
      total,
      min: OUTLAND_DEX_BASE,
      max: total ? OUTLAND_DEX_BASE + total - 1 : OUTLAND_DEX_BASE
    };
  }
  function dexChaveOutland(pokeId) {
    return isOutlandPokeId(pokeId) ? pokeId : null;
  }
  function montarOutlandDexLegado48(_speciesMap) {
    const dexToPoke = {};
    for (let i = 0; i < 47; i++) {
      dexToPoke[OUTLAND_DEX_BASE + i] = OUTLAND_POKE_LEGADO_MIN + i;
    }
    return dexToPoke;
  }
  function aplicarRemapOutlandLista(lista) {
    for (const c of lista) {
      if (isOutlandPokeIdLegado(c.pokeId)) c.pokeId = remapOutlandPokeId(c.pokeId);
      if (c.evolvesToId && isOutlandPokeIdLegado(c.evolvesToId)) {
        c.evolvesToId = remapOutlandPokeId(c.evolvesToId);
      }
    }
  }

  // tests/.cache/shared/golpes-especiais.mjs
  var GOLPE_600_POR_TIPO = {
    GRASS: { name: "Petal Bloom", power: 600, type: "GRASS", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    WATER: { name: "Cyclonic Tide", power: 600, type: "WATER", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    FIRE: { name: "Ignition Point", power: 600, type: "FIRE", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    FLYING: { name: "Massive Hurricane", power: 600, type: "FLYING", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    BUG: { name: "Hive Crush", power: 600, type: "BUG", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    POISON: { name: "Toxic Deluge", power: 600, type: "POISON", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    ELECTRIC: { name: "Static Overload", power: 600, type: "ELECTRIC", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    GROUND: { name: "Crossing Fissure", power: 600, type: "GROUND", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    FIGHTING: { name: "Meteor Fists", power: 600, type: "FIGHTING", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    PSYCHIC: { name: "Mental Singularity", power: 600, type: "PSYCHIC", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    ROCK: { name: "Crumbling Rain", power: 600, type: "ROCK", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    GHOST: { name: "Untold Nightmare", power: 600, type: "GHOST", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    ICE: { name: "Ice Time", power: 600, type: "ICE", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    DARK: { name: "Endless Hollow", power: 600, type: "DARK", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    STEEL: { name: "Alloy Breaker", power: 600, type: "STEEL", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    DRAGON: { name: "Eternal Dragon", power: 600, type: "DRAGON", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    FAIRY: { name: "Starlight Charm", power: 600, type: "FAIRY", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    NORMAL: { name: "Ultimate Force", power: 600, type: "NORMAL", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS }
  };
  var GOLPE_600_POR_TIPO_B = {
    NORMAL: { name: "Giga Impact", power: 600, type: "NORMAL", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    FIRE: { name: "Blast Burn", power: 600, type: "FIRE", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    WATER: { name: "Hydro Cannon", power: 600, type: "WATER", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    GRASS: { name: "Frenzy Plant", power: 600, type: "GRASS", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    ELECTRIC: { name: "Bolt Strike", power: 600, type: "ELECTRIC", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    ICE: { name: "Glacial Lance", power: 600, type: "ICE", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    FIGHTING: { name: "Meteor Assault", power: 600, type: "FIGHTING", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    POISON: { name: "Gunk Shot", power: 600, type: "POISON", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    GROUND: { name: "Precipice Blades", power: 600, type: "GROUND", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    FLYING: { name: "Sky Attack", power: 600, type: "FLYING", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    PSYCHIC: { name: "Prismatic Laser", power: 600, type: "PSYCHIC", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    BUG: { name: "Megahorn", power: 600, type: "BUG", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    ROCK: { name: "Rock Wrecker", power: 600, type: "ROCK", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    GHOST: { name: "Astral Barrage", power: 600, type: "GHOST", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    DRAGON: { name: "Roar of Time", power: 600, type: "DRAGON", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    DARK: { name: "Wicked Blow", power: 600, type: "DARK", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    STEEL: { name: "Steel Beam", power: 600, type: "STEEL", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    FAIRY: { name: "Light of Ruin", power: 600, type: "FAIRY", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS }
  };
  var GOLPE_600_RESERVA = {
    NORMAL: { name: "Blood Moon", power: 600, type: "NORMAL", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    FIRE: { name: "Mind Blown", power: 600, type: "FIRE", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    WATER: { name: "Steam Eruption", power: 600, type: "WATER", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    GRASS: { name: "Chloroblast", power: 600, type: "GRASS", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    ELECTRIC: { name: "Plasma Fists", power: 600, type: "ELECTRIC", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    ICE: { name: "Freeze Shock", power: 600, type: "ICE", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    FIGHTING: { name: "Combat Torque", power: 600, type: "FIGHTING", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    POISON: { name: "Noxious Torque", power: 600, type: "POISON", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    GROUND: { name: "Land's Wrath", power: 600, type: "GROUND", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    FLYING: { name: "Bleakwind Storm", power: 600, type: "FLYING", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    PSYCHIC: { name: "Psycho Boost", power: 600, type: "PSYCHIC", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    BUG: { name: "Pollen Puff", power: 600, type: "BUG", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    ROCK: { name: "Diamond Storm", power: 600, type: "ROCK", category: "PHYSICAL", cooldownMs: COOLDOWN_600_MS },
    GHOST: { name: "Moongeist Beam", power: 600, type: "GHOST", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    DRAGON: { name: "Dynamax Cannon", power: 600, type: "DRAGON", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    DARK: { name: "Fiery Wrath", power: 600, type: "DARK", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    STEEL: { name: "Make It Rain", power: 600, type: "STEEL", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS },
    FAIRY: { name: "Fleur Cannon", power: 600, type: "FAIRY", category: "SPECIAL", cooldownMs: COOLDOWN_600_MS }
  };
  var TIPOS_ELEMENTO = Object.keys(GOLPE_600_POR_TIPO);
  function dexDe(id) {
    return id < 1e3 ? id : id % 1e3;
  }
  function ehUltimaEvolucao(c) {
    return !c.evolvesToId;
  }
  function elegivelParaGolpeEspecial(c) {
    if (!ehUltimaEvolucao(c)) return false;
    if (isEspelhoFantasmaPokeId(c.pokeId)) return false;
    if (c.megaDeDex != null) return false;
    if (c.golpesFechados) return false;
    return true;
  }
  function temGolpe600DoTipo(attacks, tipo) {
    return (attacks ?? []).some((a) => a.power >= 600 && a.type === tipo);
  }
  function limparGolpesQuebrados(attacks) {
    return (attacks ?? []).filter((a) => {
      if (!TIPOS_ELEMENTO.includes(a.type)) return false;
      if ((a.power ?? 0) <= 10) return false;
      return true;
    });
  }
  function fixarCooldownGolpe600(creature) {
    let mexeu = false;
    for (const a of creature.attacks ?? []) {
      if (a.cdFixo) continue;
      if ((a.power ?? 0) >= 600 && a.cooldownMs !== COOLDOWN_600_MS) {
        a.cooldownMs = COOLDOWN_600_MS;
        mexeu = true;
      }
    }
    return mexeu;
  }
  function injetarGolpesEspeciais(creature) {
    fixarCooldownGolpe600(creature);
    if (!elegivelParaGolpeEspecial(creature)) return false;
    let attacks = limparGolpesQuebrados(creature.attacks);
    const antes = JSON.stringify(attacks);
    const tipos = [...new Set([creature.type1, creature.type2].filter((t) => t && TIPOS_ELEMENTO.includes(t)))];
    const catAssinatura = (creature.baseAtk ?? 0) >= (creature.baseSpAtk ?? 0) ? "PHYSICAL" : "SPECIAL";
    for (const a of attacks) {
      if (a.power < 600) continue;
      if (!a.categoriaFixa) a.category = catAssinatura;
      a.cooldownMs = COOLDOWN_600_MS;
    }
    for (const tipo of tipos) {
      const tmpl = GOLPE_600_POR_TIPO[tipo];
      if (!tmpl || temGolpe600DoTipo(attacks, tipo)) continue;
      attacks.push({ ...tmpl, category: catAssinatura, learnLevel: 1 });
    }
    const golpes600 = attacks.filter((a) => a.power >= 600 && TIPOS_ELEMENTO.includes(a.type));
    if (golpes600.length === 1) {
      const b = [GOLPE_600_POR_TIPO_B, GOLPE_600_RESERVA].map((tabela) => tabela[golpes600[0].type]).find((g) => g && !attacks.some((a) => a.name === g.name));
      if (b) attacks.push({ ...b, category: catAssinatura, learnLevel: 1 });
    }
    if (JSON.stringify(attacks) === antes) return false;
    creature.attacks = attacks;
    return true;
  }
  function golpesDaFicha(especie) {
    if (!especie) return [];
    const clone = { ...especie, attacks: (especie.attacks ?? []).map((a) => ({ ...a })) };
    injetarGolpesEspeciais(clone);
    return clone.attacks ?? [];
  }

  // tests/.cache/shared/golpes-planilhas.mjs
  var golpes_planilhas_exports = {};
  __export(golpes_planilhas_exports, {
    GOLPES_ARTE_NOVA: () => GOLPES_ARTE_NOVA,
    GOLPES_CONTRATO_2026_10_16: () => GOLPES_CONTRATO_2026_10_16,
    GOLPES_INICIAIS: () => GOLPES_INICIAIS,
    GOLPES_LENDARIOS_2026_10_11: () => GOLPES_LENDARIOS_2026_10_11,
    GOLPES_LENDARIOS_2026_10_27: () => GOLPES_LENDARIOS_2026_10_27,
    GOLPES_LENDARIOS_2026_10_29: () => GOLPES_LENDARIOS_2026_10_29,
    GOLPES_MEGAS_2026_10_03: () => GOLPES_MEGAS_2026_10_03,
    GOLPES_MEGAS_2026_10_21: () => GOLPES_MEGAS_2026_10_21,
    GOLPES_MEGAS_2026_10_22: () => GOLPES_MEGAS_2026_10_22,
    GOLPES_MEGAS_2026_10_23: () => GOLPES_MEGAS_2026_10_23,
    GOLPES_MEGAS_2026_10_26: () => GOLPES_MEGAS_2026_10_26,
    GOLPES_MEGAS_2026_10_27: () => GOLPES_MEGAS_2026_10_27,
    GOLPES_MEGAS_2026_10_29: () => GOLPES_MEGAS_2026_10_29,
    GOLPES_MEGAS_CONTRATO_2026_10_16: () => GOLPES_MEGAS_CONTRATO_2026_10_16,
    GOLPES_MENOS_DE_10: () => GOLPES_MENOS_DE_10,
    GOLPES_OUTLAND_2026_10_13: () => GOLPES_OUTLAND_2026_10_13,
    GOLPES_OUTLAND_2026_10_15: () => GOLPES_OUTLAND_2026_10_15,
    GOLPES_OUTLAND_2026_10_27: () => GOLPES_OUTLAND_2026_10_27,
    GOLPES_PRE_EVOLUCOES_KANTO: () => GOLPES_PRE_EVOLUCOES_KANTO,
    GOLPES_PSEUDO_LENDARIOS: () => GOLPES_PSEUDO_LENDARIOS,
    GOLPES_REWORK_2026_09: () => GOLPES_REWORK_2026_09,
    GOLPES_REWORK_2026_09_28: () => GOLPES_REWORK_2026_09_28,
    GOLPES_REWORK_2026_10_03: () => GOLPES_REWORK_2026_10_03,
    GOLPES_REWORK_2026_10_04: () => GOLPES_REWORK_2026_10_04,
    GOLPES_REWORK_2026_10_13: () => GOLPES_REWORK_2026_10_13,
    GOLPES_REWORK_2026_10_15: () => GOLPES_REWORK_2026_10_15,
    GOLPES_REWORK_2026_10_23: () => GOLPES_REWORK_2026_10_23,
    GOLPES_REWORK_2026_10_26: () => GOLPES_REWORK_2026_10_26,
    GOLPES_REWORK_2026_10_27: () => GOLPES_REWORK_2026_10_27,
    GOLPES_REWORK_2026_10_29: () => GOLPES_REWORK_2026_10_29,
    GOLPES_SEGUNDA_EVO_2026_10_15: () => GOLPES_SEGUNDA_EVO_2026_10_15,
    aplicarGolpesDasPlanilhas: () => aplicarGolpesDasPlanilhas,
    golpesDaPlanilhaDaMega: () => golpesDaPlanilhaDaMega,
    golpesDaPlanilhaDoOutland: () => golpesDaPlanilhaDoOutland,
    golpesDoOutlandFechados: () => golpesDoOutlandFechados
  });
  var GOLPES_INICIAIS = {};
  var GOLPES_PSEUDO_LENDARIOS = {};
  var GOLPES_MENOS_DE_10 = {
    217: [
      // Ursaring — NORMAL
      ["Bind", "NORMAL", "PHYSICAL", 15],
      ["Fury Attack", "NORMAL", "PHYSICAL", 15],
      ["Fury Swipes", "NORMAL", "PHYSICAL", 18],
      ["Scratch", "NORMAL", "PHYSICAL", 40],
      ["Snore", "NORMAL", "SPECIAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Slash", "NORMAL", "PHYSICAL", 70],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    234: [
      // Stantler — NORMAL
      ["Bind", "NORMAL", "PHYSICAL", 15],
      ["Fury Attack", "NORMAL", "PHYSICAL", 15],
      ["Wrap", "NORMAL", "PHYSICAL", 15],
      ["Tackle", "NORMAL", "PHYSICAL", 40],
      ["Stomp", "NORMAL", "PHYSICAL", 65],
      ["Facade", "NORMAL", "PHYSICAL", 70],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Swift", "NORMAL", "SPECIAL", 120],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ]
    // O Milotic (#350) saiu daqui em 23/10/2026 — ver `GOLPES_REWORK_2026_10_23`.
  };
  var GOLPES_REWORK_2026_09 = {
    57: [
      // Primeape — FIGHTING
      ["Double Kick", "FIGHTING", "PHYSICAL", 30],
      ["Power-Up Punch", "FIGHTING", "PHYSICAL", 40],
      ["Low Kick", "FIGHTING", "PHYSICAL", 55],
      ["Upper Hand", "FIGHTING", "PHYSICAL", 65],
      ["Brick Break", "FIGHTING", "PHYSICAL", 75],
      ["Body Press", "FIGHTING", "PHYSICAL", 80],
      ["Cross Chop", "FIGHTING", "PHYSICAL", 100],
      ["Superpower", "FIGHTING", "PHYSICAL", 120],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ]
  };
  var GOLPES_PRE_EVOLUCOES_KANTO = {
    1: [
      // Bulbasaur — GRASS/POISON
      ["Magical Leaf", "GRASS", "SPECIAL", 30],
      ["Vine Whip", "GRASS", "PHYSICAL", 45],
      ["Razor Leaf", "GRASS", "PHYSICAL", 55],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Grass Knot", "GRASS", "SPECIAL", 100],
      ["Solar Beam", "GRASS", "SPECIAL", 120]
    ],
    4: [
      // Charmander — FIRE
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Lava Plume", "FIRE", "SPECIAL", 80],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Inferno", "FIRE", "SPECIAL", 100],
      ["Overheat", "FIRE", "SPECIAL", 120]
    ],
    7: [
      // Squirtle — WATER
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Surf", "WATER", "SPECIAL", 100],
      ["Wave Crash", "WATER", "PHYSICAL", 120]
    ]
  };
  var GOLPES_REWORK_2026_09_28 = {};
  var GOLPES_REWORK_2026_10_03 = {
    135: [
      // Jolteon — ELECTRIC
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electro Ball", "ELECTRIC", "SPECIAL", 55],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Thunderbolt", "ELECTRIC", "SPECIAL", 90],
      ["Thunder", "ELECTRIC", "SPECIAL", 110],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Electro Shot", "ELECTRIC", "SPECIAL", 130],
      ["Bolt Strike", "ELECTRIC", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    196: [
      // Espeon — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Heart Stamp", "PSYCHIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Psychic Noise", "PSYCHIC", "SPECIAL", 75],
      ["Eerie Spell", "PSYCHIC", "SPECIAL", 80],
      ["Mist Ball", "PSYCHIC", "SPECIAL", 95],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 140],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600]
    ],
    470: [
      // Leafeon — GRASS
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Razor Leaf", "GRASS", "PHYSICAL", 55],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Leaf Blade", "GRASS", "PHYSICAL", 90],
      ["Ivy Cudgel", "GRASS", "PHYSICAL", 100],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Solar Blade", "GRASS", "PHYSICAL", 125],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600]
    ]
  };
  var GOLPES_REWORK_2026_10_04 = {
    124: [
      // Jynx — ICE/PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Powder Snow", "ICE", "SPECIAL", 40],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Aurora Beam", "ICE", "SPECIAL", 65],
      ["Psychic Noise", "PSYCHIC", "SPECIAL", 75],
      ["Eerie Spell", "PSYCHIC", "SPECIAL", 80],
      ["Ice Beam", "ICE", "SPECIAL", 90],
      ["Blizzard", "ICE", "SPECIAL", 110],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 140],
      ["Ice Time", "ICE", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    292: [
      // Shedinja — BUG/GHOST
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Shadow Punch", "GHOST", "PHYSICAL", 55],
      ["Team Slice", "BUG", "PHYSICAL", 55],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["U-turn", "BUG", "PHYSICAL", 70],
      ["Phantom Force", "GHOST", "PHYSICAL", 90],
      ["Night Shade", "GHOST", "SPECIAL", 100],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 140],
      ["Sinister Arrow Raid", "GHOST", "PHYSICAL", 180],
      ["Hive Crush", "BUG", "PHYSICAL", 600],
      ["Untold Nightmare", "GHOST", "PHYSICAL", 600]
    ]
  };
  var MEGA = "MEGA";
  var GOLPES_MEGAS_2026_10_03 = {};
  var GOLPES_LENDARIOS_2026_10_11 = {};
  var GOLPES_REWORK_2026_10_13 = {
    83: [
      // Farfetchd — NORMAL/FLYING
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 40],
      ["Acrobatics", "FLYING", "PHYSICAL", 55],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Hyper Drill", "NORMAL", "PHYSICAL", 100],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600],
      ["Sky Attack", "FLYING", "PHYSICAL", 600]
    ],
    95: [
      // Onix — ROCK/GROUND
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Stone Axe", "ROCK", "PHYSICAL", 65],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600]
    ],
    123: [
      // Scyther — BUG/FLYING
      ["Aerial Ace", "FLYING", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Skitter Smack", "BUG", "PHYSICAL", 70],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Mega Swarm", "BUG", "PHYSICAL", 600],
      ["Sky Attack", "FLYING", "PHYSICAL", 600]
    ],
    190: [
      // Aipom — NORMAL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Hyper Drill", "NORMAL", "PHYSICAL", 100],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Head Charge", "NORMAL", "PHYSICAL", 120],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600]
    ],
    203: [
      // Girafarig — NORMAL/PSYCHIC
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    222: [
      // Corsola — WATER/ROCK
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600]
    ],
    276: [
      // Taillow — NORMAL/FLYING
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Drill Peck", "FLYING", "PHYSICAL", 80],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600],
      ["Sky Attack", "FLYING", "PHYSICAL", 600]
    ],
    625: [
      // Bisharp — DARK/STEEL
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Gear Grind", "STEEL", "PHYSICAL", 50],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Lash Out", "DARK", "PHYSICAL", 75],
      ["Darkest Lariat", "DARK", "PHYSICAL", 85],
      ["Hyperspace Fury", "DARK", "PHYSICAL", 100],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Wicked Blow", "DARK", "PHYSICAL", 600],
      ["Mega Forge", "STEEL", "PHYSICAL", 600]
    ],
    708: [
      // Phantump — GHOST/GRASS
      ["Lick", "GHOST", "PHYSICAL", 30],
      ["Shadow Sneak", "GHOST", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Infernal Parade", "GHOST", "SPECIAL", 60],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Shadow Bone", "GHOST", "PHYSICAL", 85],
      ["Phantom Force", "GHOST", "PHYSICAL", 90],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Wood Hammer", "GRASS", "PHYSICAL", 120],
      ["Soul-Stealing 7-Star Strike", "GHOST", "PHYSICAL", 600],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600]
    ],
    736: [
      // Grubbin — BUG
      ["Infestation", "BUG", "SPECIAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Skitter Smack", "BUG", "PHYSICAL", 70],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Hive Crush", "BUG", "SPECIAL", 600],
      ["Mega Swarm", "BUG", "PHYSICAL", 600]
    ],
    755: [
      // Morelull — GRASS/FAIRY
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Round", "NORMAL", "SPECIAL", 60],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Apple Acid", "GRASS", "SPECIAL", 80],
      ["Grass Knot", "GRASS", "SPECIAL", 100],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Petal Bloom", "GRASS", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    757: [
      // Salandit — POISON/FIRE
      ["Smog", "POISON", "SPECIAL", 30],
      ["Acid Spray", "POISON", "SPECIAL", 40],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Venoshock", "POISON", "SPECIAL", 65],
      ["Cross Poison", "POISON", "PHYSICAL", 70],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Sludge Wave", "POISON", "SPECIAL", 95],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Toxic Deluge", "POISON", "SPECIAL", 600],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ]
  };
  var GOLPES_OUTLAND_2026_10_13 = {
    2020: [
      // Brute Rhydon — GROUND/ROCK · base Rhydon (#112)
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Stone Axe", "ROCK", "PHYSICAL", 65],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600]
    ],
    2006: [
      // Furious Scyther — BUG/FLYING · base Scyther (#123)
      ["Aerial Ace", "FLYING", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Skitter Smack", "BUG", "PHYSICAL", 70],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Mega Swarm", "BUG", "PHYSICAL", 600],
      ["Sky Attack", "FLYING", "PHYSICAL", 600]
    ],
    2007: [
      // Enigmatic Girafarig — NORMAL/PSYCHIC · base Girafarig (#203)
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ]
  };
  var GOLPES_REWORK_2026_10_15 = {};
  var GOLPES_SEGUNDA_EVO_2026_10_15 = {
    2: [
      // Ivysaur — GRASS/POISON
      ["Smog", "POISON", "SPECIAL", 30],
      ["Acid Spray", "POISON", "SPECIAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Syrup Bomb", "GRASS", "SPECIAL", 60],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Trop Kick", "GRASS", "PHYSICAL", 70],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Grass Knot", "GRASS", "SPECIAL", 100],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    5: [
      // Charmeleon — FIRE
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Flame Burst", "FIRE", "SPECIAL", 70],
      ["Burning Jealousy", "FIRE", "SPECIAL", 70],
      ["Mystical Fire", "FIRE", "SPECIAL", 75],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Inferno", "FIRE", "SPECIAL", 100],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    8: [
      // Wartortle — WATER
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Razor Shell", "WATER", "PHYSICAL", 75],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600]
    ],
    11: [
      // Metapod — BUG
      ["Infestation", "BUG", "SPECIAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Struggle Bug", "BUG", "SPECIAL", 50],
      ["Silver Wind", "BUG", "SPECIAL", 60],
      ["Signal Beam", "BUG", "SPECIAL", 75],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Hive Crush", "BUG", "SPECIAL", 600]
    ],
    14: [
      // Kakuna — BUG/POISON
      ["Poison Sting", "POISON", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Skitter Smack", "BUG", "PHYSICAL", 70],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Hive Crush", "BUG", "SPECIAL", 600]
    ],
    17: [
      // Pidgeotto — NORMAL/FLYING
      ["Aerial Ace", "FLYING", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Oblivion Wing", "FLYING", "SPECIAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    25: [
      // Pikachu — ELECTRIC
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Overdrive", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Double Shock", "ELECTRIC", "PHYSICAL", 120],
      ["Mega Thunderstorm", "ELECTRIC", "SPECIAL", 600]
    ],
    30: [
      // Nidorina — POISON
      ["Poison Sting", "POISON", "PHYSICAL", 25],
      ["Acid Spray", "POISON", "SPECIAL", 40],
      ["Poison Tail", "POISON", "PHYSICAL", 50],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Cross Poison", "POISON", "PHYSICAL", 70],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Sludge Wave", "POISON", "SPECIAL", 95],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Toxic Deluge", "POISON", "SPECIAL", 600]
    ],
    33: [
      // Nidorino — POISON
      ["Poison Sting", "POISON", "PHYSICAL", 25],
      ["Acid Spray", "POISON", "SPECIAL", 40],
      ["Poison Tail", "POISON", "PHYSICAL", 50],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Cross Poison", "POISON", "PHYSICAL", 70],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Sludge Wave", "POISON", "SPECIAL", 95],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Noxious Torque", "POISON", "PHYSICAL", 600]
    ],
    35: [
      // Clefairy — FAIRY
      ["Disarming Voice", "FAIRY", "SPECIAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Round", "NORMAL", "SPECIAL", 60],
      ["Spirit Break", "FAIRY", "PHYSICAL", 75],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Misty Explosion", "FAIRY", "SPECIAL", 100],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    39: [
      // Jigglypuff — NORMAL/FAIRY
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    42: [
      // Golbat — POISON/FLYING
      ["Poison Sting", "POISON", "PHYSICAL", 25],
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 40],
      ["Poison Tail", "POISON", "PHYSICAL", 50],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Cross Poison", "POISON", "PHYSICAL", 70],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Noxious Torque", "POISON", "PHYSICAL", 600]
    ],
    44: [
      // Gloom — GRASS/POISON
      ["Smog", "POISON", "SPECIAL", 30],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Syrup Bomb", "GRASS", "SPECIAL", 60],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Grass Knot", "GRASS", "SPECIAL", 100],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    61: [
      // Poliwhirl — WATER
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Jet Punch", "WATER", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600]
    ],
    64: [
      // Kadabra — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    67: [
      // Machoke — FIGHTING
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 55],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Submission", "FIGHTING", "PHYSICAL", 80],
      ["Dynamic Punch", "FIGHTING", "PHYSICAL", 100],
      ["Axe Kick", "FIGHTING", "PHYSICAL", 120],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    70: [
      // Weepinbell — GRASS/POISON
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Sludge Wave", "POISON", "SPECIAL", 95],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600]
    ],
    75: [
      // Graveler — ROCK/GROUND
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Stone Axe", "ROCK", "PHYSICAL", 65],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600]
    ],
    82: [
      // Magneton — ELECTRIC/STEEL
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Mirror Shot", "STEEL", "SPECIAL", 65],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Overdrive", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Mega Thunderstorm", "ELECTRIC", "SPECIAL", 600]
    ],
    93: [
      // Haunter — GHOST/POISON
      ["Smog", "POISON", "SPECIAL", 30],
      ["Shadow Sneak", "GHOST", "PHYSICAL", 40],
      ["Night Shade", "GHOST", "SPECIAL", 55],
      ["Infernal Parade", "GHOST", "SPECIAL", 60],
      ["Bitter Malice", "GHOST", "SPECIAL", 75],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Sludge Wave", "POISON", "SPECIAL", 95],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    112: [
      // Rhydon — GROUND/ROCK
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600]
    ],
    113: [
      // Chansey — NORMAL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Echoed Voice", "NORMAL", "SPECIAL", 40],
      ["Terrain Pulse", "NORMAL", "SPECIAL", 50],
      ["Round", "NORMAL", "SPECIAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Razor Wind", "NORMAL", "SPECIAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Mega Onslaught", "NORMAL", "SPECIAL", 600]
    ],
    117: [
      // Seadra — WATER
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Snipe Shot", "WATER", "SPECIAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Hydro Cannon", "WATER", "SPECIAL", 600]
    ],
    125: [
      // Electabuzz — ELECTRIC
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Overdrive", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Double Shock", "ELECTRIC", "PHYSICAL", 120],
      ["Mega Thunderstorm", "ELECTRIC", "SPECIAL", 600]
    ],
    126: [
      // Magmar — FIRE
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Fire Fang", "FIRE", "PHYSICAL", 65],
      ["Mystical Fire", "FIRE", "SPECIAL", 75],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Sacred Fire", "FIRE", "PHYSICAL", 100],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    148: [
      // Dragonair — DRAGON
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Dragon Tail", "DRAGON", "PHYSICAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Spacial Rend", "DRAGON", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600]
    ],
    153: [
      // Bayleef — GRASS
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Trop Kick", "GRASS", "PHYSICAL", 70],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600]
    ],
    156: [
      // Quilava — FIRE
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Flame Burst", "FIRE", "SPECIAL", 70],
      ["Burning Jealousy", "FIRE", "SPECIAL", 70],
      ["Mystical Fire", "FIRE", "SPECIAL", 75],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Inferno", "FIRE", "SPECIAL", 100],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    159: [
      // Croconaw — WATER
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Jet Punch", "WATER", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Razor Shell", "WATER", "PHYSICAL", 75],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600]
    ],
    176: [
      // Togetic — FAIRY/FLYING
      ["Disarming Voice", "FAIRY", "SPECIAL", 25],
      ["Gust", "FLYING", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Round", "NORMAL", "SPECIAL", 60],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Misty Explosion", "FAIRY", "SPECIAL", 100],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    180: [
      // Flaaffy — ELECTRIC
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Overdrive", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Mega Thunderstorm", "ELECTRIC", "SPECIAL", 600]
    ],
    183: [
      // Marill — WATER/FAIRY
      ["Disarming Voice", "FAIRY", "SPECIAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Spirit Break", "FAIRY", "PHYSICAL", 75],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600]
    ],
    188: [
      // Skiploom — GRASS/FLYING
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Gust", "FLYING", "SPECIAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600]
    ],
    221: [
      // Piloswine — ICE/GROUND
      ["Triple Axel", "ICE", "PHYSICAL", 25],
      ["Ice Shard", "ICE", "PHYSICAL", 40],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Ice Fang", "ICE", "PHYSICAL", 65],
      ["Ice Punch", "ICE", "PHYSICAL", 75],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Glacial Lance", "ICE", "PHYSICAL", 600]
    ],
    233: [
      // Porygon2 — NORMAL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Echoed Voice", "NORMAL", "SPECIAL", 40],
      ["Terrain Pulse", "NORMAL", "SPECIAL", 50],
      ["Round", "NORMAL", "SPECIAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Razor Wind", "NORMAL", "SPECIAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Mega Onslaught", "NORMAL", "SPECIAL", 600]
    ],
    247: [
      // Pupitar — ROCK/GROUND
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Stone Axe", "ROCK", "PHYSICAL", 65],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600]
    ],
    253: [
      // Grovyle — GRASS
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Syrup Bomb", "GRASS", "SPECIAL", 60],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Trop Kick", "GRASS", "PHYSICAL", 70],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Apple Acid", "GRASS", "SPECIAL", 80],
      ["Grass Knot", "GRASS", "SPECIAL", 100],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    256: [
      // Combusken — FIRE/FIGHTING
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Flame Burst", "FIRE", "SPECIAL", 70],
      ["Mystical Fire", "FIRE", "SPECIAL", 75],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Sacred Fire", "FIRE", "PHYSICAL", 100],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    259: [
      // Marshtomp — WATER/GROUND
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Jet Punch", "WATER", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Razor Shell", "WATER", "PHYSICAL", 75],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600]
    ],
    266: [
      // Silcoon — BUG
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Skitter Smack", "BUG", "PHYSICAL", 70],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Mega Swarm", "BUG", "PHYSICAL", 600]
    ],
    268: [
      // Cascoon — BUG
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Skitter Smack", "BUG", "PHYSICAL", 70],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Mega Swarm", "BUG", "PHYSICAL", 600]
    ],
    271: [
      // Lombre — WATER/GRASS
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600]
    ],
    274: [
      // Nuzleaf — GRASS/DARK
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Lash Out", "DARK", "PHYSICAL", 75],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600]
    ],
    281: [
      // Kirlia — PSYCHIC/FAIRY
      ["Disarming Voice", "FAIRY", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    288: [
      // Vigoroth — NORMAL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Hyper Drill", "NORMAL", "PHYSICAL", 100],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    294: [
      // Loudred — NORMAL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    305: [
      // Lairon — STEEL/ROCK
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Gear Grind", "STEEL", "PHYSICAL", 50],
      ["Hard Press", "STEEL", "PHYSICAL", 60],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Mega Forge", "STEEL", "PHYSICAL", 600]
    ],
    315: [
      // Roselia — GRASS/POISON
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Venoshock", "POISON", "SPECIAL", 65],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Grass Knot", "GRASS", "SPECIAL", 100],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    329: [
      // Vibrava — GROUND/DRAGON
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Dragon Hammer", "DRAGON", "PHYSICAL", 90],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600]
    ],
    356: [
      // Dusclops — GHOST
      ["Lick", "GHOST", "PHYSICAL", 30],
      ["Shadow Sneak", "GHOST", "PHYSICAL", 40],
      ["Night Shade", "GHOST", "SPECIAL", 55],
      ["Infernal Parade", "GHOST", "SPECIAL", 60],
      ["Bitter Malice", "GHOST", "SPECIAL", 75],
      ["Shadow Bone", "GHOST", "PHYSICAL", 85],
      ["Phantom Force", "GHOST", "PHYSICAL", 90],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Soul-Stealing 7-Star Strike", "GHOST", "PHYSICAL", 600]
    ],
    364: [
      // Sealeo — WATER/ICE
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Powder Snow", "ICE", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Snipe Shot", "WATER", "SPECIAL", 80],
      ["Ice Beam", "ICE", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Hydro Cannon", "WATER", "SPECIAL", 600]
    ],
    372: [
      // Shelgon — DRAGON
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Dragon Tail", "DRAGON", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 80],
      ["Dragon Hammer", "DRAGON", "PHYSICAL", 90],
      ["Glaive Rush", "DRAGON", "PHYSICAL", 120],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600]
    ],
    375: [
      // Metang — STEEL/PSYCHIC
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Hard Press", "STEEL", "PHYSICAL", 60],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Mega Forge", "STEEL", "PHYSICAL", 600]
    ],
    388: [
      // Grotle — GRASS
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Trop Kick", "GRASS", "PHYSICAL", 70],
      ["Horn Leech", "GRASS", "PHYSICAL", 75],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Wood Hammer", "GRASS", "PHYSICAL", 120],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600]
    ],
    391: [
      // Monferno — FIRE/FIGHTING
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Fire Fang", "FIRE", "PHYSICAL", 65],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Wake-Up Slap", "FIGHTING", "PHYSICAL", 70],
      ["Mystical Fire", "FIRE", "SPECIAL", 75],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Sacred Fire", "FIRE", "PHYSICAL", 100],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    394: [
      // Prinplup — WATER
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Razor Shell", "WATER", "PHYSICAL", 75],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Snipe Shot", "WATER", "SPECIAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Hydro Cannon", "WATER", "SPECIAL", 600]
    ],
    397: [
      // Staravia — NORMAL/FLYING
      ["Aerial Ace", "FLYING", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    404: [
      // Luxio — ELECTRIC
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 50],
      ["Thunder Fang", "ELECTRIC", "PHYSICAL", 65],
      ["Thunder Punch", "ELECTRIC", "PHYSICAL", 75],
      ["Bolt Beak", "ELECTRIC", "PHYSICAL", 85],
      ["Wild Charge", "ELECTRIC", "PHYSICAL", 90],
      ["Double Shock", "ELECTRIC", "PHYSICAL", 120],
      ["Static Overload", "ELECTRIC", "PHYSICAL", 600]
    ],
    444: [
      // Gabite — DRAGON/GROUND
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 80],
      ["Dragon Hammer", "DRAGON", "PHYSICAL", 90],
      ["Glaive Rush", "DRAGON", "PHYSICAL", 120],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600]
    ],
    496: [
      // Servine — GRASS
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Trop Kick", "GRASS", "PHYSICAL", 70],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600]
    ],
    499: [
      // Pignite — FIRE/FIGHTING
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Fire Fang", "FIRE", "PHYSICAL", 65],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Fire Punch", "FIRE", "PHYSICAL", 75],
      ["Temper Flare", "FIRE", "PHYSICAL", 75],
      ["Blaze Kick", "FIRE", "PHYSICAL", 85],
      ["Dynamic Punch", "FIGHTING", "PHYSICAL", 100],
      ["Raging Fury", "FIRE", "PHYSICAL", 120],
      ["Blast Burn", "FIRE", "PHYSICAL", 600]
    ],
    502: [
      // Dewott — WATER
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Razor Shell", "WATER", "PHYSICAL", 75],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600]
    ],
    520: [
      // Tranquill — NORMAL/FLYING
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Acrobatics", "FLYING", "PHYSICAL", 55],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    536: [
      // Palpitoad — WATER/GROUND
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Mud Shot", "GROUND", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600]
    ],
    541: [
      // Swadloon — BUG/GRASS
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Skitter Smack", "BUG", "PHYSICAL", 70],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Mega Swarm", "BUG", "PHYSICAL", 600]
    ],
    544: [
      // Whirlipede — BUG/POISON
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Skitter Smack", "BUG", "PHYSICAL", 70],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Mega Swarm", "BUG", "PHYSICAL", 600]
    ],
    552: [
      // Krokorok — GROUND/DARK
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Lash Out", "DARK", "PHYSICAL", 75],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600]
    ],
    575: [
      // Gothorita — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    578: [
      // Duosion — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    603: [
      // Eelektrik — ELECTRIC
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Overdrive", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Double Shock", "ELECTRIC", "PHYSICAL", 120],
      ["Mega Thunderstorm", "ELECTRIC", "SPECIAL", 600]
    ],
    611: [
      // Fraxure — DRAGON
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Dragon Tail", "DRAGON", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 80],
      ["Dragon Hammer", "DRAGON", "PHYSICAL", 90],
      ["Glaive Rush", "DRAGON", "PHYSICAL", 120],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600]
    ],
    634: [
      // Zweilous — DARK/DRAGON
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Payback", "DARK", "PHYSICAL", 50],
      ["Dragon Tail", "DRAGON", "PHYSICAL", 60],
      ["Lash Out", "DARK", "PHYSICAL", 75],
      ["Darkest Lariat", "DARK", "PHYSICAL", 85],
      ["Hyperspace Fury", "DARK", "PHYSICAL", 100],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    662: [
      // Fletchinder — FIRE/FLYING
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Acrobatics", "FLYING", "PHYSICAL", 55],
      ["Fire Fang", "FIRE", "PHYSICAL", 65],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Blaze Kick", "FIRE", "PHYSICAL", 85],
      ["Sacred Fire", "FIRE", "PHYSICAL", 100],
      ["Raging Fury", "FIRE", "PHYSICAL", 120],
      ["Blast Burn", "FIRE", "PHYSICAL", 600]
    ],
    665: [
      // Spewpa — BUG
      ["Infestation", "BUG", "SPECIAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Struggle Bug", "BUG", "SPECIAL", 50],
      ["Silver Wind", "BUG", "SPECIAL", 60],
      ["Signal Beam", "BUG", "SPECIAL", 75],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Hive Crush", "BUG", "SPECIAL", 600]
    ],
    680: [
      // Doublade — STEEL/GHOST
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Gear Grind", "STEEL", "PHYSICAL", 50],
      ["Hard Press", "STEEL", "PHYSICAL", 60],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Shadow Bone", "GHOST", "PHYSICAL", 85],
      ["Phantom Force", "GHOST", "PHYSICAL", 90],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Mega Forge", "STEEL", "PHYSICAL", 600]
    ],
    705: [
      // Sliggoo — DRAGON
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Dragon Tail", "DRAGON", "PHYSICAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Spacial Rend", "DRAGON", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600]
    ],
    723: [
      // Dartrix — GRASS/FLYING
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Gust", "FLYING", "SPECIAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Air Cutter", "FLYING", "SPECIAL", 60],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600]
    ],
    726: [
      // Torracat — FIRE
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Fire Fang", "FIRE", "PHYSICAL", 65],
      ["Flame Burst", "FIRE", "SPECIAL", 70],
      ["Burning Jealousy", "FIRE", "SPECIAL", 70],
      ["Mystical Fire", "FIRE", "SPECIAL", 75],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Sacred Fire", "FIRE", "PHYSICAL", 100],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    729: [
      // Brionne — WATER
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Razor Shell", "WATER", "PHYSICAL", 75],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Snipe Shot", "WATER", "SPECIAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Hydro Cannon", "WATER", "SPECIAL", 600]
    ],
    732: [
      // Trumbeak — NORMAL/FLYING
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Acrobatics", "FLYING", "PHYSICAL", 55],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Hyper Drill", "NORMAL", "PHYSICAL", 100],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    737: [
      // Charjabug — BUG/ELECTRIC
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Thunder Punch", "ELECTRIC", "PHYSICAL", 75],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Mega Swarm", "BUG", "PHYSICAL", 600]
    ],
    762: [
      // Steenee — GRASS
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600]
    ],
    783: [
      // Hakamo-o — DRAGON/FIGHTING
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Dragon Tail", "DRAGON", "PHYSICAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Submission", "FIGHTING", "PHYSICAL", 80],
      ["Spacial Rend", "DRAGON", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600]
    ],
    814: [
      // Raboot — FIRE
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Fire Fang", "FIRE", "PHYSICAL", 65],
      ["Fire Punch", "FIRE", "PHYSICAL", 75],
      ["Temper Flare", "FIRE", "PHYSICAL", 75],
      ["Mystical Fire", "FIRE", "SPECIAL", 75],
      ["Blaze Kick", "FIRE", "PHYSICAL", 85],
      ["Sacred Fire", "FIRE", "PHYSICAL", 100],
      ["Raging Fury", "FIRE", "PHYSICAL", 120],
      ["Blast Burn", "FIRE", "PHYSICAL", 600]
    ],
    958: [
      // Tinkatuff — FAIRY/STEEL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Spirit Break", "FAIRY", "PHYSICAL", 75],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Play Rough", "FAIRY", "PHYSICAL", 90],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Let's Snuggle Forever", "FAIRY", "PHYSICAL", 600]
    ]
  };
  var GOLPES_OUTLAND_2026_10_15 = {
    2010: [
      // Magnetic Electabuzz — ELECTRIC · base Electabuzz (#125)
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Overdrive", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Double Shock", "ELECTRIC", "PHYSICAL", 120],
      ["Mega Thunderstorm", "ELECTRIC", "SPECIAL", 600]
    ],
    2011: [
      // Ancient Dragonair — DRAGON · base Dragonair (#148)
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Dragon Tail", "DRAGON", "PHYSICAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Spacial Rend", "DRAGON", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600]
    ],
    2015: [
      // Heavy Piloswine — ICE/GROUND · base Piloswine (#221)
      ["Triple Axel", "ICE", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Ice Fang", "ICE", "PHYSICAL", 65],
      ["Ice Punch", "ICE", "PHYSICAL", 75],
      ["Icicle Crash", "ICE", "PHYSICAL", 85],
      ["Mountain Gale", "ICE", "PHYSICAL", 100],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Glacial Lance", "ICE", "PHYSICAL", 600]
    ],
    2032: [
      // Furious Magmar — FIRE · base Magmar (#126)
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Fire Fang", "FIRE", "PHYSICAL", 65],
      ["Mystical Fire", "FIRE", "SPECIAL", 75],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Sacred Fire", "FIRE", "PHYSICAL", 100],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    2033: [
      // Ancient Pupitar — ROCK/GROUND · base Pupitar (#247)
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Stone Axe", "ROCK", "PHYSICAL", 65],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600]
    ]
  };
  var GOLPES_ARTE_NOVA = {};
  var GOLPES_CONTRATO_2026_10_16 = {
    438: [
      // Bonsly — ROCK · 1º estágio
      ["Rollout", "ROCK", "PHYSICAL", 30],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Rock Tomb", "ROCK", "PHYSICAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Stone Edge", "ROCK", "PHYSICAL", 120]
    ],
    440: [
      // Happiny — NORMAL · 1º estágio
      ["Echoed Voice", "NORMAL", "SPECIAL", 40],
      ["Terrain Pulse", "NORMAL", "SPECIAL", 50],
      ["Round", "NORMAL", "SPECIAL", 60],
      ["Razor Wind", "NORMAL", "SPECIAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Swift", "NORMAL", "SPECIAL", 100],
      ["Techno Blast", "NORMAL", "SPECIAL", 120]
    ],
    507: [
      // Herdier — NORMAL · meio da cadeia
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Crush Claw", "NORMAL", "PHYSICAL", 75],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    509: [
      // Purrloin — DARK · 1º estágio
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Beat Up", "DARK", "PHYSICAL", 55],
      ["Crunch", "DARK", "PHYSICAL", 80],
      ["Darkest Lariat", "DARK", "PHYSICAL", 85],
      ["Hyperspace Fury", "DARK", "PHYSICAL", 100],
      ["Pursuit", "DARK", "PHYSICAL", 120]
    ],
    529: [
      // Drilbur — GROUND · 1º estágio
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Earthquake", "GROUND", "PHYSICAL", 100],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120]
    ],
    550: [
      // Basculin — WATER · 1º estágio
      ["Triple Dive", "WATER", "PHYSICAL", 30],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Crabhammer", "WATER", "PHYSICAL", 100],
      ["Wave Crash", "WATER", "PHYSICAL", 120]
    ],
    559: [
      // Scraggy — DARK/FIGHTING · 1º estágio
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Beat Up", "DARK", "PHYSICAL", 55],
      ["Crunch", "DARK", "PHYSICAL", 80],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Hyperspace Fury", "DARK", "PHYSICAL", 100],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120]
    ],
    583: [
      // Vanillish — ICE · meio da cadeia
      ["Triple Axel", "ICE", "PHYSICAL", 25],
      ["Powder Snow", "ICE", "SPECIAL", 40],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Aurora Beam", "ICE", "SPECIAL", 65],
      ["Freeze-Dry", "ICE", "SPECIAL", 70],
      ["Ice Beam", "ICE", "SPECIAL", 90],
      ["Freezy Frost", "ICE", "SPECIAL", 90],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Ice Time", "ICE", "SPECIAL", 600]
    ],
    600: [
      // Klang — STEEL · meio da cadeia
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Gear Grind", "STEEL", "PHYSICAL", 50],
      ["Metal Claw", "STEEL", "PHYSICAL", 50],
      ["Hard Press", "STEEL", "PHYSICAL", 60],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Iron Head", "STEEL", "PHYSICAL", 80],
      ["Meteor Mash", "STEEL", "PHYSICAL", 90],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600]
    ],
    650: [
      // Chespin — GRASS · 1º estágio
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Vine Whip", "GRASS", "PHYSICAL", 45],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Ivy Cudgel", "GRASS", "PHYSICAL", 100],
      ["Power Whip", "GRASS", "PHYSICAL", 120]
    ],
    651: [
      // Quilladin — GRASS · meio da cadeia
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Trailblaze", "GRASS", "PHYSICAL", 50],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Horn Leech", "GRASS", "PHYSICAL", 75],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600]
    ],
    653: [
      // Fennekin — FIRE · 1º estágio
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Inferno", "FIRE", "SPECIAL", 100],
      ["Armor Cannon", "FIRE", "SPECIAL", 120]
    ],
    654: [
      // Braixen — FIRE · meio da cadeia
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Flame Burst", "FIRE", "SPECIAL", 70],
      ["Mystical Fire", "FIRE", "SPECIAL", 75],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    656: [
      // Froakie — WATER · 1º estágio
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Snipe Shot", "WATER", "SPECIAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Surf", "WATER", "SPECIAL", 100],
      ["Hydro Pump", "WATER", "SPECIAL", 120]
    ],
    657: [
      // Frogadier — WATER · meio da cadeia
      ["Water Shuriken", "WATER", "SPECIAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Snipe Shot", "WATER", "SPECIAL", 80],
      ["Scald", "WATER", "SPECIAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600]
    ],
    672: [
      // Skiddo — GRASS · 1º estágio
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Vine Whip", "GRASS", "PHYSICAL", 45],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Ivy Cudgel", "GRASS", "PHYSICAL", 100],
      ["Power Whip", "GRASS", "PHYSICAL", 120]
    ],
    710: [
      // Pumpkaboo — GHOST/GRASS · 1º estágio
      ["Lick", "GHOST", "PHYSICAL", 30],
      ["Vine Whip", "GRASS", "PHYSICAL", 45],
      ["Rage Fist", "GHOST", "PHYSICAL", 50],
      ["Shadow Bone", "GHOST", "PHYSICAL", 85],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Phantom Force", "GHOST", "PHYSICAL", 90],
      ["Power Whip", "GRASS", "PHYSICAL", 120]
    ],
    722: [
      // Rowlet — GRASS/FLYING · 1º estágio
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Ivy Cudgel", "GRASS", "PHYSICAL", 100],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120]
    ],
    739: [
      // Crabrawler — FIGHTING · 1º estágio
      ["Double Kick", "FIGHTING", "PHYSICAL", 30],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 55],
      ["Submission", "FIGHTING", "PHYSICAL", 80],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Cross Chop", "FIGHTING", "PHYSICAL", 100],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120]
    ],
    753: [
      // Fomantis — GRASS · 1º estágio
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Vine Whip", "GRASS", "PHYSICAL", 45],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Ivy Cudgel", "GRASS", "PHYSICAL", 100],
      ["Power Whip", "GRASS", "PHYSICAL", 120]
    ],
    769: [
      // Sandygast — GHOST/GROUND · 1º estágio
      ["Lick", "GHOST", "PHYSICAL", 30],
      ["Mud Shot", "GROUND", "SPECIAL", 55],
      ["Night Shade", "GHOST", "SPECIAL", 55],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Earth Power", "GROUND", "SPECIAL", 90],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120]
    ],
    810: [
      // Grookey — GRASS · 1º estágio
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Vine Whip", "GRASS", "PHYSICAL", 45],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Ivy Cudgel", "GRASS", "PHYSICAL", 100],
      ["Power Whip", "GRASS", "PHYSICAL", 120]
    ],
    811: [
      // Thwackey — GRASS · meio da cadeia
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Trailblaze", "GRASS", "PHYSICAL", 50],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Horn Leech", "GRASS", "PHYSICAL", 75],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600]
    ],
    816: [
      // Sobble — WATER · 1º estágio
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Snipe Shot", "WATER", "SPECIAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Surf", "WATER", "SPECIAL", 100],
      ["Hydro Pump", "WATER", "SPECIAL", 120]
    ],
    817: [
      // Drizzile — WATER · meio da cadeia
      ["Water Shuriken", "WATER", "SPECIAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Snipe Shot", "WATER", "SPECIAL", 80],
      ["Scald", "WATER", "SPECIAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600]
    ],
    819: [
      // Skwovet — NORMAL · 1º estágio
      ["Feint", "NORMAL", "PHYSICAL", 30],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Egg Bomb", "NORMAL", "PHYSICAL", 55],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Hyper Drill", "NORMAL", "PHYSICAL", 100],
      ["Thrash", "NORMAL", "PHYSICAL", 120]
    ],
    821: [
      // Rookidee — FLYING · 1º estágio
      ["Aerial Ace", "FLYING", "PHYSICAL", 25],
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 40],
      ["Acrobatics", "FLYING", "PHYSICAL", 55],
      ["Drill Peck", "FLYING", "PHYSICAL", 80],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Beak Blast", "FLYING", "PHYSICAL", 100],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120]
    ],
    822: [
      // Corvisquire — FLYING · meio da cadeia
      ["Aerial Ace", "FLYING", "PHYSICAL", 25],
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 40],
      ["Acrobatics", "FLYING", "PHYSICAL", 55],
      ["Wing Attack", "FLYING", "PHYSICAL", 60],
      ["Drill Peck", "FLYING", "PHYSICAL", 80],
      ["Bounce", "FLYING", "PHYSICAL", 85],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600]
    ],
    824: [
      // Blipbug — BUG · 1º estágio
      ["Infestation", "BUG", "SPECIAL", 25],
      ["Struggle Bug", "BUG", "SPECIAL", 50],
      ["Silver Wind", "BUG", "SPECIAL", 60],
      ["Signal Beam", "BUG", "SPECIAL", 75],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Attack Order", "BUG", "PHYSICAL", 120]
    ],
    825: [
      // Dottler — BUG/PSYCHIC · meio da cadeia
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Struggle Bug", "BUG", "SPECIAL", 50],
      ["Silver Wind", "BUG", "SPECIAL", 60],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Signal Beam", "BUG", "SPECIAL", 75],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Hive Crush", "BUG", "SPECIAL", 600]
    ],
    827: [
      // Nickit — DARK · 1º estágio
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Snarl", "DARK", "SPECIAL", 55],
      ["Beat Up", "DARK", "PHYSICAL", 55],
      ["Night Daze", "DARK", "SPECIAL", 85],
      ["Fiery Wrath", "DARK", "SPECIAL", 90],
      ["Hyperspace Fury", "DARK", "PHYSICAL", 100],
      ["Baddy Bad", "DARK", "SPECIAL", 120]
    ],
    829: [
      // Gossifleur — GRASS · 1º estágio
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Vine Whip", "GRASS", "PHYSICAL", 45],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Ivy Cudgel", "GRASS", "PHYSICAL", 100],
      ["Power Whip", "GRASS", "PHYSICAL", 120]
    ],
    831: [
      // Wooloo — NORMAL · 1º estágio
      ["Feint", "NORMAL", "PHYSICAL", 30],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Egg Bomb", "NORMAL", "PHYSICAL", 55],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Hyper Drill", "NORMAL", "PHYSICAL", 100],
      ["Thrash", "NORMAL", "PHYSICAL", 120]
    ],
    833: [
      // Chewtle — WATER · 1º estágio
      ["Triple Dive", "WATER", "PHYSICAL", 30],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Crabhammer", "WATER", "PHYSICAL", 100],
      ["Wave Crash", "WATER", "PHYSICAL", 120]
    ],
    835: [
      // Yamper — ELECTRIC · 1º estágio
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 50],
      ["Spark", "ELECTRIC", "PHYSICAL", 65],
      ["Zing Zap", "ELECTRIC", "PHYSICAL", 80],
      ["Wild Charge", "ELECTRIC", "PHYSICAL", 90],
      ["Supercell Slam", "ELECTRIC", "PHYSICAL", 100],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120]
    ],
    837: [
      // Rolycoly — ROCK · 1º estágio
      ["Rollout", "ROCK", "PHYSICAL", 30],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Rock Tomb", "ROCK", "PHYSICAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Stone Edge", "ROCK", "PHYSICAL", 120]
    ],
    838: [
      // Carkol — ROCK/FIRE · meio da cadeia
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Flame Wheel", "FIRE", "PHYSICAL", 60],
      ["Stone Axe", "ROCK", "PHYSICAL", 65],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Heat Crash", "FIRE", "PHYSICAL", 90],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600]
    ],
    840: [
      // Applin — GRASS/DRAGON · 1º estágio
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Dragon Hammer", "DRAGON", "PHYSICAL", 90],
      ["Ivy Cudgel", "GRASS", "PHYSICAL", 100],
      ["Outrage", "DRAGON", "PHYSICAL", 120]
    ],
    843: [
      // Silicobra — GROUND · 1º estágio
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Earthquake", "GROUND", "PHYSICAL", 100],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120]
    ],
    846: [
      // Arrokuda — WATER · 1º estágio
      ["Triple Dive", "WATER", "PHYSICAL", 30],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Crabhammer", "WATER", "PHYSICAL", 100],
      ["Wave Crash", "WATER", "PHYSICAL", 120]
    ],
    848: [
      // Toxel — ELECTRIC/POISON · 1º estágio
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Acid Spray", "POISON", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Overdrive", "ELECTRIC", "SPECIAL", 80],
      ["Sludge Bomb", "POISON", "SPECIAL", 90],
      ["Wildbolt Storm", "ELECTRIC", "SPECIAL", 100],
      ["Belch", "POISON", "SPECIAL", 120]
    ],
    850: [
      // Sizzlipede — FIRE/BUG · 1º estágio
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Fire Lash", "FIRE", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Sacred Fire", "FIRE", "PHYSICAL", 100],
      ["Attack Order", "BUG", "PHYSICAL", 120]
    ],
    852: [
      // Clobbopus — FIGHTING · 1º estágio
      ["Double Kick", "FIGHTING", "PHYSICAL", 30],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 55],
      ["Submission", "FIGHTING", "PHYSICAL", 80],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Cross Chop", "FIGHTING", "PHYSICAL", 100],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120]
    ],
    856: [
      // Hatenna — PSYCHIC · 1º estágio
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120]
    ],
    857: [
      // Hattrem — PSYCHIC · meio da cadeia
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Psychic Noise", "PSYCHIC", "SPECIAL", 75],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    859: [
      // Impidimp — DARK/FAIRY · 1º estágio
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Snarl", "DARK", "SPECIAL", 55],
      ["Night Daze", "DARK", "SPECIAL", 85],
      ["Sparkly Swirl", "FAIRY", "SPECIAL", 90],
      ["Fiery Wrath", "DARK", "SPECIAL", 90],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120]
    ],
    860: [
      // Morgrem — DARK/FAIRY · meio da cadeia (a folha chegou em 17/10, depois da leva)
      ["Disarming Voice", "FAIRY", "SPECIAL", 25],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Snarl", "DARK", "SPECIAL", 55],
      ["Night Daze", "DARK", "SPECIAL", 85],
      ["Fiery Wrath", "DARK", "SPECIAL", 90],
      ["Sparkly Swirl", "FAIRY", "SPECIAL", 90],
      ["Baddy Bad", "DARK", "SPECIAL", 120],
      ["Endless Hollow", "DARK", "SPECIAL", 600]
    ],
    872: [
      // Snom — ICE/BUG · 1º estágio
      ["Powder Snow", "ICE", "SPECIAL", 40],
      ["Struggle Bug", "BUG", "SPECIAL", 50],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Freeze-Dry", "ICE", "SPECIAL", 70],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Ice Beam", "ICE", "SPECIAL", 90],
      ["Bug Buzz", "BUG", "SPECIAL", 120]
    ],
    878: [
      // Cufant — STEEL · 1º estágio
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Gear Grind", "STEEL", "PHYSICAL", 50],
      ["Gyro Ball", "STEEL", "PHYSICAL", 55],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Meteor Mash", "STEEL", "PHYSICAL", 90],
      ["Behemoth Bash", "STEEL", "PHYSICAL", 100],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120]
    ],
    884: [
      // Duraludon — STEEL/DRAGON · 1º estágio
      ["Twister", "DRAGON", "SPECIAL", 40],
      ["Tachyon Cutter", "STEEL", "SPECIAL", 50],
      ["Mirror Shot", "STEEL", "SPECIAL", 65],
      ["Flash Cannon", "STEEL", "SPECIAL", 80],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Behemoth Bash", "STEEL", "PHYSICAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120]
    ],
    886: [
      // Drakloak — DRAGON/GHOST · meio da cadeia
      ["Shadow Punch", "GHOST", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Shadow Claw", "GHOST", "PHYSICAL", 70],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 80],
      ["Order Up", "DRAGON", "PHYSICAL", 80],
      ["Phantom Force", "GHOST", "PHYSICAL", 90],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600]
    ],
    887: [
      // Dragapult — DRAGON/GHOST · última evolução
      ["Shadow Punch", "GHOST", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Shadow Claw", "GHOST", "PHYSICAL", 70],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 80],
      ["Shadow Bone", "GHOST", "PHYSICAL", 85],
      ["Dragon Hammer", "DRAGON", "PHYSICAL", 90],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Untold Nightmare", "GHOST", "PHYSICAL", 600]
    ],
    891: [
      // Kubfu — FIGHTING · 1º estágio
      ["Double Kick", "FIGHTING", "PHYSICAL", 30],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 55],
      ["Submission", "FIGHTING", "PHYSICAL", 80],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Cross Chop", "FIGHTING", "PHYSICAL", 100],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120]
    ],
    906: [
      // Sprigatito — GRASS · 1º estágio
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Vine Whip", "GRASS", "PHYSICAL", 45],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Ivy Cudgel", "GRASS", "PHYSICAL", 100],
      ["Power Whip", "GRASS", "PHYSICAL", 120]
    ],
    907: [
      // Floragato — GRASS · meio da cadeia
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Trailblaze", "GRASS", "PHYSICAL", 50],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Horn Leech", "GRASS", "PHYSICAL", 75],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600]
    ],
    909: [
      // Fuecoco — FIRE · 1º estágio
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Inferno", "FIRE", "SPECIAL", 100],
      ["Armor Cannon", "FIRE", "SPECIAL", 120]
    ],
    910: [
      // Crocalor — FIRE · meio da cadeia
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Flame Burst", "FIRE", "SPECIAL", 70],
      ["Mystical Fire", "FIRE", "SPECIAL", 75],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    912: [
      // Quaxly — WATER · 1º estágio
      ["Triple Dive", "WATER", "PHYSICAL", 30],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Crabhammer", "WATER", "PHYSICAL", 100],
      ["Wave Crash", "WATER", "PHYSICAL", 120]
    ],
    913: [
      // Quaxwell — WATER · meio da cadeia
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Jet Punch", "WATER", "PHYSICAL", 60],
      ["Razor Shell", "WATER", "PHYSICAL", 75],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600]
    ],
    915: [
      // Lechonk — NORMAL · 1º estágio
      ["Feint", "NORMAL", "PHYSICAL", 30],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Egg Bomb", "NORMAL", "PHYSICAL", 55],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Hyper Drill", "NORMAL", "PHYSICAL", 100],
      ["Thrash", "NORMAL", "PHYSICAL", 120]
    ],
    917: [
      // Tarountula — BUG · 1º estágio
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Revenge", "BUG", "PHYSICAL", 55],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Megahorn", "BUG", "PHYSICAL", 120]
    ],
    919: [
      // Nymble — BUG · 1º estágio
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Revenge", "BUG", "PHYSICAL", 55],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Megahorn", "BUG", "PHYSICAL", 120]
    ],
    921: [
      // Pawmi — ELECTRIC · 1º estágio
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 50],
      ["Spark", "ELECTRIC", "PHYSICAL", 65],
      ["Zing Zap", "ELECTRIC", "PHYSICAL", 80],
      ["Wild Charge", "ELECTRIC", "PHYSICAL", 90],
      ["Supercell Slam", "ELECTRIC", "PHYSICAL", 100],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120]
    ],
    922: [
      // Pawmo — ELECTRIC/FIGHTING · meio da cadeia
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 50],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Thunder Punch", "ELECTRIC", "PHYSICAL", 75],
      ["Zing Zap", "ELECTRIC", "PHYSICAL", 80],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120],
      ["Static Overload", "ELECTRIC", "PHYSICAL", 600]
    ],
    924: [
      // Tandemaus — NORMAL · 1º estágio
      ["Feint", "NORMAL", "PHYSICAL", 30],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Egg Bomb", "NORMAL", "PHYSICAL", 55],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Hyper Drill", "NORMAL", "PHYSICAL", 100],
      ["Thrash", "NORMAL", "PHYSICAL", 120]
    ],
    926: [
      // Fidough — FAIRY · 1º estágio
      ["Disarming Voice", "FAIRY", "SPECIAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Spirit Break", "FAIRY", "PHYSICAL", 75],
      ["Play Rough", "FAIRY", "PHYSICAL", 90],
      ["Misty Explosion", "FAIRY", "SPECIAL", 100],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120]
    ],
    928: [
      // Smoliv — GRASS/NORMAL · 1º estágio
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Terrain Pulse", "NORMAL", "SPECIAL", 50],
      ["Syrup Bomb", "GRASS", "SPECIAL", 60],
      ["Apple Acid", "GRASS", "SPECIAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Grass Knot", "GRASS", "SPECIAL", 100],
      ["Techno Blast", "NORMAL", "SPECIAL", 120]
    ],
    929: [
      // Dolliv — GRASS/NORMAL · meio da cadeia
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Syrup Bomb", "GRASS", "SPECIAL", 60],
      ["Round", "NORMAL", "SPECIAL", 60],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Apple Acid", "GRASS", "SPECIAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    932: [
      // Nacli — ROCK · 1º estágio
      ["Rollout", "ROCK", "PHYSICAL", 30],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Rock Tomb", "ROCK", "PHYSICAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Stone Edge", "ROCK", "PHYSICAL", 120]
    ],
    933: [
      // Naclstack — ROCK · meio da cadeia
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Rock Tomb", "ROCK", "PHYSICAL", 60],
      ["Stone Axe", "ROCK", "PHYSICAL", 65],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600]
    ],
    938: [
      // Tadbulb — ELECTRIC · 1º estágio
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Overdrive", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Wildbolt Storm", "ELECTRIC", "SPECIAL", 100],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120]
    ],
    940: [
      // Wattrel — ELECTRIC/FLYING · 1º estágio
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Gust", "FLYING", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Overdrive", "ELECTRIC", "SPECIAL", 80],
      ["Oblivion Wing", "FLYING", "SPECIAL", 80],
      ["Wildbolt Storm", "ELECTRIC", "SPECIAL", 100],
      ["Hurricane", "FLYING", "SPECIAL", 120]
    ],
    942: [
      // Maschiff — DARK · 1º estágio
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Beat Up", "DARK", "PHYSICAL", 55],
      ["Crunch", "DARK", "PHYSICAL", 80],
      ["Darkest Lariat", "DARK", "PHYSICAL", 85],
      ["Hyperspace Fury", "DARK", "PHYSICAL", 100],
      ["Pursuit", "DARK", "PHYSICAL", 120]
    ],
    944: [
      // Shroodle — POISON/NORMAL · 1º estágio
      ["Mortal Spin", "POISON", "PHYSICAL", 30],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Malignant Chain", "POISON", "SPECIAL", 100],
      ["Thrash", "NORMAL", "PHYSICAL", 120]
    ],
    946: [
      // Bramblin — GRASS/GHOST · 1º estágio
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Shadow Sneak", "GHOST", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Phantom Force", "GHOST", "PHYSICAL", 90],
      ["Ivy Cudgel", "GRASS", "PHYSICAL", 100],
      ["Shadow Force", "GHOST", "PHYSICAL", 120]
    ],
    948: [
      // Toedscool — GROUND/GRASS · 1º estágio
      ["Mud-Slap", "GROUND", "SPECIAL", 20],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Mud Shot", "GROUND", "SPECIAL", 55],
      ["Earth Power", "GROUND", "SPECIAL", 90],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Earthquake", "GROUND", "PHYSICAL", 100],
      ["Solar Beam", "GRASS", "SPECIAL", 120]
    ],
    951: [
      // Capsakid — GRASS · 1º estágio
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Vine Whip", "GRASS", "PHYSICAL", 45],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Ivy Cudgel", "GRASS", "PHYSICAL", 100],
      ["Power Whip", "GRASS", "PHYSICAL", 120]
    ],
    953: [
      // Rellor — BUG · 1º estágio
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Revenge", "BUG", "PHYSICAL", 55],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Megahorn", "BUG", "PHYSICAL", 120]
    ],
    955: [
      // Flittle — PSYCHIC · 1º estágio
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120]
    ],
    960: [
      // Wiglett — WATER · 1º estágio
      ["Triple Dive", "WATER", "PHYSICAL", 30],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Crabhammer", "WATER", "PHYSICAL", 100],
      ["Wave Crash", "WATER", "PHYSICAL", 120]
    ],
    963: [
      // Finizen — WATER · 1º estágio
      ["Triple Dive", "WATER", "PHYSICAL", 30],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Crabhammer", "WATER", "PHYSICAL", 100],
      ["Wave Crash", "WATER", "PHYSICAL", 120]
    ],
    965: [
      // Varoom — STEEL/POISON · 1º estágio
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Poison Tail", "POISON", "PHYSICAL", 50],
      ["Gyro Ball", "STEEL", "PHYSICAL", 55],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Behemoth Bash", "STEEL", "PHYSICAL", 100],
      ["Gunk Shot", "POISON", "PHYSICAL", 120]
    ],
    969: [
      // Glimmet — ROCK/POISON · 1º estágio
      ["Rollout", "ROCK", "PHYSICAL", 30],
      ["Acid Spray", "POISON", "SPECIAL", 40],
      ["Ancient Power", "ROCK", "SPECIAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Sludge Bomb", "POISON", "SPECIAL", 90],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Belch", "POISON", "SPECIAL", 120]
    ],
    971: [
      // Greavard — GHOST · 1º estágio
      ["Lick", "GHOST", "PHYSICAL", 30],
      ["Shadow Sneak", "GHOST", "PHYSICAL", 40],
      ["Rage Fist", "GHOST", "PHYSICAL", 50],
      ["Shadow Bone", "GHOST", "PHYSICAL", 85],
      ["Phantom Force", "GHOST", "PHYSICAL", 90],
      ["Spectral Thief", "GHOST", "PHYSICAL", 90],
      ["Shadow Force", "GHOST", "PHYSICAL", 120]
    ],
    974: [
      // Cetoddle — ICE · 1º estágio
      ["Ice Ball", "ICE", "PHYSICAL", 30],
      ["Ice Shard", "ICE", "PHYSICAL", 40],
      ["Avalanche", "ICE", "PHYSICAL", 60],
      ["Icicle Crash", "ICE", "PHYSICAL", 85],
      ["Mountain Gale", "ICE", "PHYSICAL", 100],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Sheer Cold", "ICE", "SPECIAL", 120]
    ],
    996: [
      // Frigibax — DRAGON/ICE · 1º estágio
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Ice Shard", "ICE", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 80],
      ["Icicle Crash", "ICE", "PHYSICAL", 85],
      ["Dragon Rush", "DRAGON", "PHYSICAL", 100],
      ["Freeze Shock", "ICE", "PHYSICAL", 120]
    ],
    997: [
      // Arctibax — DRAGON/ICE · meio da cadeia
      ["Triple Axel", "ICE", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Avalanche", "ICE", "PHYSICAL", 60],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 80],
      ["Order Up", "DRAGON", "PHYSICAL", 80],
      ["Icicle Crash", "ICE", "PHYSICAL", 85],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600]
    ],
    999: [
      // Gimmighoul — GHOST · 1º estágio
      ["Lick", "GHOST", "PHYSICAL", 30],
      ["Night Shade", "GHOST", "SPECIAL", 55],
      ["Infernal Parade", "GHOST", "SPECIAL", 60],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Phantom Force", "GHOST", "PHYSICAL", 90],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120]
    ],
    1011: [
      // Dipplin — GRASS/DRAGON · 1º estágio
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Twister", "DRAGON", "SPECIAL", 40],
      ["Syrup Bomb", "GRASS", "SPECIAL", 60],
      ["Apple Acid", "GRASS", "SPECIAL", 80],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Grass Knot", "GRASS", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120]
    ],
    1012: [
      // Poltchageist — GRASS/GHOST · 1º estágio
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Night Shade", "GHOST", "SPECIAL", 55],
      ["Syrup Bomb", "GRASS", "SPECIAL", 60],
      ["Apple Acid", "GRASS", "SPECIAL", 80],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Grass Knot", "GRASS", "SPECIAL", 100],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120]
    ],
    4019: [
      // Alolan Rattata — DARK/NORMAL · forma de Alola (#19) · 1º estágio
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Beat Up", "DARK", "PHYSICAL", 55],
      ["Crunch", "DARK", "PHYSICAL", 80],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Hyperspace Fury", "DARK", "PHYSICAL", 100],
      ["Thrash", "NORMAL", "PHYSICAL", 120]
    ],
    4027: [
      // Alolan Sandshrew — ICE/STEEL · forma de Alola (#27) · 1º estágio
      ["Ice Ball", "ICE", "PHYSICAL", 30],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Avalanche", "ICE", "PHYSICAL", 60],
      ["Icicle Crash", "ICE", "PHYSICAL", 85],
      ["Meteor Mash", "STEEL", "PHYSICAL", 90],
      ["Mountain Gale", "ICE", "PHYSICAL", 100],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120]
    ],
    4037: [
      // Alolan Vulpix — ICE · forma de Alola (#37) · 1º estágio
      ["Powder Snow", "ICE", "SPECIAL", 40],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Aurora Beam", "ICE", "SPECIAL", 65],
      ["Freeze-Dry", "ICE", "SPECIAL", 70],
      ["Ice Beam", "ICE", "SPECIAL", 90],
      ["Blizzard", "ICE", "SPECIAL", 110],
      ["Sheer Cold", "ICE", "SPECIAL", 120]
    ],
    4050: [
      // Alolan Diglett — GROUND/STEEL · forma de Alola (#50) · 1º estágio
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Meteor Mash", "STEEL", "PHYSICAL", 90],
      ["Earthquake", "GROUND", "PHYSICAL", 100],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120]
    ],
    4052: [
      // Alolan Meowth — DARK · forma de Alola (#52) · 1º estágio
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Snarl", "DARK", "SPECIAL", 55],
      ["Beat Up", "DARK", "PHYSICAL", 55],
      ["Night Daze", "DARK", "SPECIAL", 85],
      ["Fiery Wrath", "DARK", "SPECIAL", 90],
      ["Hyperspace Fury", "DARK", "PHYSICAL", 100],
      ["Baddy Bad", "DARK", "SPECIAL", 120]
    ],
    4074: [
      // Alolan Geodude — ROCK/ELECTRIC · forma de Alola (#74) · 1º estágio
      ["Rollout", "ROCK", "PHYSICAL", 30],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 50],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Wild Charge", "ELECTRIC", "PHYSICAL", 90],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120]
    ],
    4075: [
      // Alolan Graveler — ROCK/ELECTRIC · forma de Alola (#75) · meio da cadeia
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Spark", "ELECTRIC", "PHYSICAL", 65],
      ["Stone Axe", "ROCK", "PHYSICAL", 65],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Wild Charge", "ELECTRIC", "PHYSICAL", 90],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600]
    ],
    4088: [
      // Alolan Grimer — POISON/DARK · forma de Alola (#88) · 1º estágio
      ["Mortal Spin", "POISON", "PHYSICAL", 30],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Darkest Lariat", "DARK", "PHYSICAL", 85],
      ["Malignant Chain", "POISON", "SPECIAL", 100],
      ["Pursuit", "DARK", "PHYSICAL", 120]
    ],
    5052: [
      // Galarian Meowth — STEEL · forma de Galar (#52) · 1º estágio
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Gear Grind", "STEEL", "PHYSICAL", 50],
      ["Gyro Ball", "STEEL", "PHYSICAL", 55],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Meteor Mash", "STEEL", "PHYSICAL", 90],
      ["Behemoth Bash", "STEEL", "PHYSICAL", 100],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120]
    ],
    5077: [
      // Galarian Ponyta — PSYCHIC · forma de Galar (#77) · 1º estágio
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120]
    ],
    5079: [
      // Galarian Slowpoke — PSYCHIC · forma de Galar (#79) · 1º estágio
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120]
    ],
    5083: [
      // Galarian Farfetch'd — FIGHTING · forma de Galar (#83) · 1º estágio
      ["Double Kick", "FIGHTING", "PHYSICAL", 30],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 55],
      ["Submission", "FIGHTING", "PHYSICAL", 80],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Cross Chop", "FIGHTING", "PHYSICAL", 100],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120]
    ],
    5122: [
      // Galarian Mr. Mime — ICE/PSYCHIC · forma de Galar (#122) · meio da cadeia
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Powder Snow", "ICE", "SPECIAL", 40],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Freeze-Dry", "ICE", "SPECIAL", 70],
      ["Ice Beam", "ICE", "SPECIAL", 90],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Ice Time", "ICE", "SPECIAL", 600]
    ],
    5222: [
      // Galarian Corsola — GHOST · forma de Galar (#222) · 1º estágio
      ["Lick", "GHOST", "PHYSICAL", 30],
      ["Night Shade", "GHOST", "SPECIAL", 55],
      ["Infernal Parade", "GHOST", "SPECIAL", 60],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Phantom Force", "GHOST", "PHYSICAL", 90],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120]
    ],
    5263: [
      // Galarian Zigzagoon — DARK/NORMAL · forma de Galar (#263) · 1º estágio
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Beat Up", "DARK", "PHYSICAL", 55],
      ["Crunch", "DARK", "PHYSICAL", 80],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Hyperspace Fury", "DARK", "PHYSICAL", 100],
      ["Thrash", "NORMAL", "PHYSICAL", 120]
    ],
    5264: [
      // Galarian Linoone — DARK/NORMAL · forma de Galar (#264) · meio da cadeia
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Payback", "DARK", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Lash Out", "DARK", "PHYSICAL", 75],
      ["Crunch", "DARK", "PHYSICAL", 80],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Endless Hollow", "DARK", "PHYSICAL", 600]
    ],
    5554: [
      // Galarian Darumaka — ICE · forma de Galar (#554) · 1º estágio
      ["Ice Ball", "ICE", "PHYSICAL", 30],
      ["Ice Shard", "ICE", "PHYSICAL", 40],
      ["Avalanche", "ICE", "PHYSICAL", 60],
      ["Icicle Crash", "ICE", "PHYSICAL", 85],
      ["Mountain Gale", "ICE", "PHYSICAL", 100],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Sheer Cold", "ICE", "SPECIAL", 120]
    ],
    5562: [
      // Galarian Yamask — GROUND/GHOST · forma de Galar (#562) · 1º estágio
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Shadow Sneak", "GHOST", "PHYSICAL", 40],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Phantom Force", "GHOST", "PHYSICAL", 90],
      ["Earthquake", "GROUND", "PHYSICAL", 100],
      ["Shadow Force", "GHOST", "PHYSICAL", 120]
    ],
    6058: [
      // Hisuian Growlithe — FIRE/ROCK · forma de Hisui (#58) · 1º estágio
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Fire Lash", "FIRE", "PHYSICAL", 80],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Sacred Fire", "FIRE", "PHYSICAL", 100],
      ["Stone Edge", "ROCK", "PHYSICAL", 120]
    ],
    6100: [
      // Hisuian Voltorb — ELECTRIC/GRASS · forma de Hisui (#100) · 1º estágio
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Overdrive", "ELECTRIC", "SPECIAL", 80],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Wildbolt Storm", "ELECTRIC", "SPECIAL", 100],
      ["Solar Beam", "GRASS", "SPECIAL", 120]
    ],
    6211: [
      // Hisuian Qwilfish — DARK/POISON · forma de Hisui (#211) · 1º estágio
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Poison Tail", "POISON", "PHYSICAL", 50],
      ["Beat Up", "DARK", "PHYSICAL", 55],
      ["Crunch", "DARK", "PHYSICAL", 80],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Hyperspace Fury", "DARK", "PHYSICAL", 100],
      ["Gunk Shot", "POISON", "PHYSICAL", 120]
    ],
    6215: [
      // Hisuian Sneasel — FIGHTING/POISON · forma de Hisui (#215) · 1º estágio
      ["Double Kick", "FIGHTING", "PHYSICAL", 30],
      ["Poison Tail", "POISON", "PHYSICAL", 50],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 55],
      ["Submission", "FIGHTING", "PHYSICAL", 80],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Cross Chop", "FIGHTING", "PHYSICAL", 100],
      ["Gunk Shot", "POISON", "PHYSICAL", 120]
    ],
    6570: [
      // Hisuian Zorua — NORMAL/GHOST · forma de Hisui (#570) · 1º estágio
      ["Echoed Voice", "NORMAL", "SPECIAL", 40],
      ["Night Shade", "GHOST", "SPECIAL", 55],
      ["Round", "NORMAL", "SPECIAL", 60],
      ["Razor Wind", "NORMAL", "SPECIAL", 80],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Swift", "NORMAL", "SPECIAL", 100],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120]
    ],
    6705: [
      // Hisuian Sliggoo — STEEL/DRAGON · forma de Hisui (#705) · meio da cadeia
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Tachyon Cutter", "STEEL", "SPECIAL", 50],
      ["Gear Grind", "STEEL", "PHYSICAL", 50],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Flash Cannon", "STEEL", "SPECIAL", 80],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Steel Beam", "STEEL", "SPECIAL", 120],
      ["Alloy Breaker", "STEEL", "SPECIAL", 600]
    ],
    7194: [
      // Paldean Wooper — POISON/GROUND · forma de Paldea (#194) · 1º estágio
      ["Mortal Spin", "POISON", "PHYSICAL", 30],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Malignant Chain", "POISON", "SPECIAL", 100],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120]
    ],
    // --- A leva de 18/10/2026, pela mesma régua: Darmanitan, Hoopa, Sinistea, Polteageist e Palafin ganham
    // arte, e entram nove formas (as duas capas da Wormadam, Persian de Alola, Dialga e Palkia Origin,
    // Shaymin Sky, Darmanitan Zen e o de Galar, Black Kyurem).
    854: [
      // Sinistea — GHOST · 1º estágio
      ["Lick", "GHOST", "PHYSICAL", 30],
      ["Night Shade", "GHOST", "SPECIAL", 55],
      ["Infernal Parade", "GHOST", "SPECIAL", 60],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Phantom Force", "GHOST", "PHYSICAL", 90],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120]
    ]
  };
  var GOLPES_MEGAS_CONTRATO_2026_10_16 = {};
  var GOLPES_MEGAS_2026_10_21 = {};
  var GOLPES_MEGAS_2026_10_22 = {};
  var GOLPES_REWORK_2026_10_23 = {
    350: [
      // Milotic — WATER
      ["Water Shuriken", "WATER", "SPECIAL", 25],
      ["Whirlpool", "WATER", "SPECIAL", 35],
      ["Bubble", "WATER", "SPECIAL", 40],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Hydro Steam", "WATER", "SPECIAL", 80],
      ["Bouncy Bubble", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Tidal Cascade", "WATER", "SPECIAL", 120],
      ["Water Spout", "WATER", "SPECIAL", 150],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Mystic Maelstrom", "WATER", "SPECIAL", 600]
    ]
  };
  var GOLPES_MEGAS_2026_10_23 = {};
  var GOLPES_REWORK_2026_10_26 = {
    3: [
      // Venusaur — GRASS/POISON
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Clear Smog", "POISON", "SPECIAL", 50],
      ["Leaf Tornado", "GRASS", "SPECIAL", 65],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Grass Pledge", "GRASS", "SPECIAL", 80],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Verdant Storm", "GRASS", "SPECIAL", 150],
      ["Petal Bloom", "GRASS", "SPECIAL", 600],
      ["Toxic Deluge", "POISON", "SPECIAL", 600]
    ],
    6: [
      // Charizard — FIRE/FLYING
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 40],
      ["Flame Burst", "FIRE", "SPECIAL", 55],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Mind Blown", "FIRE", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "SPECIAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    15: [
      // Beedrill — BUG/POISON
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["U-turn", "BUG", "PHYSICAL", 70],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Lunge", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Hive Crush", "BUG", "PHYSICAL", 600],
      ["Toxic Deluge", "POISON", "PHYSICAL", 600]
    ],
    26: [
      // Raichu — ELECTRIC
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 50],
      ["Spark", "ELECTRIC", "PHYSICAL", 65],
      ["Electro Ball", "ELECTRIC", "SPECIAL", 72],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Wild Charge", "ELECTRIC", "PHYSICAL", 90],
      ["Thunder", "ELECTRIC", "SPECIAL", 120],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Bolt Strike", "ELECTRIC", "PHYSICAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    36: [
      // Clefable — FAIRY
      ["Pixie Dust", "FAIRY", "SPECIAL", 30],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 65],
      ["Sparkly Swirl", "FAIRY", "SPECIAL", 75],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Moonblast", "FAIRY", "SPECIAL", 95],
      ["Disarming Voice", "FAIRY", "SPECIAL", 120],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Lunar Nova", "FAIRY", "SPECIAL", 150],
      ["Light of Ruin", "FAIRY", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    65: [
      // Alakazam — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Dream Eater", "PSYCHIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Psychic Noise", "PSYCHIC", "SPECIAL", 75],
      ["Zen Headbutt", "PSYCHIC", "SPECIAL", 80],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600]
    ],
    80: [
      // Slowbro — WATER/PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Psybeam", "PSYCHIC", "SPECIAL", 70],
      ["Expanding Force", "PSYCHIC", "SPECIAL", 80],
      ["Psychic", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    94: [
      // Gengar — GHOST/POISON
      ["Shadow Punch", "GHOST", "SPECIAL", 25],
      ["Ominous Wind", "GHOST", "SPECIAL", 45],
      ["Night Shade", "GHOST", "SPECIAL", 55],
      ["Hex", "GHOST", "SPECIAL", 65],
      ["Bitter Malice", "GHOST", "SPECIAL", 75],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Sludge Wave", "POISON", "SPECIAL", 95],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Phantom Wail", "GHOST", "SPECIAL", 150],
      ["Toxic Deluge", "POISON", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    115: [
      // Kangaskhan — NORMAL
      ["Double Hit", "NORMAL", "PHYSICAL", 35],
      ["Fake Out", "NORMAL", "PHYSICAL", 40],
      ["Pound", "NORMAL", "PHYSICAL", 50],
      ["Stomp", "NORMAL", "PHYSICAL", 65],
      ["Headbutt", "NORMAL", "PHYSICAL", 70],
      ["Body Slam", "NORMAL", "PHYSICAL", 85],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Skull Bash", "NORMAL", "PHYSICAL", 120],
      ["Last Resort", "NORMAL", "PHYSICAL", 150],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    121: [
      // Starmie — WATER/PSYCHIC
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Brine", "WATER", "SPECIAL", 65],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Snipe Shot", "WATER", "SPECIAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    127: [
      // Pinsir — BUG
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Revenge", "BUG", "PHYSICAL", 70],
      ["Lunge", "BUG", "PHYSICAL", 80],
      ["Leech Life", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Bug Buzz", "BUG", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Hive Crush", "BUG", "PHYSICAL", 600],
      ["Megahorn", "BUG", "PHYSICAL", 600]
    ],
    130: [
      // Gyarados — WATER/FLYING
      ["Clamp", "WATER", "PHYSICAL", 35],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Dive", "WATER", "PHYSICAL", 65],
      ["Bounce", "FLYING", "PHYSICAL", 75],
      ["Waterfall", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Brave Bird", "FLYING", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600]
    ],
    142: [
      // Aerodactyl — ROCK/FLYING
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Rock Throw", "ROCK", "PHYSICAL", 45],
      ["Rock Tomb", "ROCK", "PHYSICAL", 55],
      ["Smack Down", "ROCK", "PHYSICAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Stone Edge", "ROCK", "PHYSICAL", 85],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Brave Bird", "FLYING", "PHYSICAL", 120],
      ["Rock Wrecker", "ROCK", "PHYSICAL", 120],
      ["Head Smash", "ROCK", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600]
    ],
    149: [
      // Dragonite — DRAGON/FLYING
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Breaking Swipe", "DRAGON", "PHYSICAL", 55],
      ["Dragon Tail", "DRAGON", "PHYSICAL", 60],
      ["Wing Attack", "FLYING", "PHYSICAL", 70],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 80],
      ["Dragon Rush", "DRAGON", "PHYSICAL", 100],
      ["Aerial Ace", "FLYING", "PHYSICAL", 120],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Draconic Soul", "DRAGON", "PHYSICAL", 300],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600]
    ],
    154: [
      // Meganium — GRASS
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Razor Leaf", "GRASS", "PHYSICAL", 55],
      ["Magical Leaf", "GRASS", "SPECIAL", 60],
      ["Seed Bomb", "GRASS", "PHYSICAL", 75],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 85],
      ["Leaf Blade", "GRASS", "PHYSICAL", 90],
      ["Petal Dance", "GRASS", "SPECIAL", 120],
      ["Solar Blade", "GRASS", "PHYSICAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Verdant Storm", "GRASS", "SPECIAL", 150],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    160: [
      // Feraligatr — WATER
      ["Aqua Jet", "WATER", "PHYSICAL", 35],
      ["Flip Turn", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Waterfall", "WATER", "PHYSICAL", 65],
      ["Liquidation", "WATER", "PHYSICAL", 75],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Frost Power", "WATER", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Tidal Surge", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Hydro Cannon", "WATER", "PHYSICAL", 600]
    ],
    181: [
      // Ampharos — ELECTRIC
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Charge Beam", "ELECTRIC", "SPECIAL", 50],
      ["Electroweb", "ELECTRIC", "SPECIAL", 60],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Thunderbolt", "ELECTRIC", "SPECIAL", 90],
      ["Thunder", "ELECTRIC", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Bolt Strike", "ELECTRIC", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    208: [
      // Steelix — STEEL/GROUND
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Bonemerang", "GROUND", "PHYSICAL", 45],
      ["Bone Club", "GROUND", "PHYSICAL", 55],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Iron Head", "STEEL", "PHYSICAL", 75],
      ["Dig", "GROUND", "PHYSICAL", 80],
      ["High Horsepower", "GROUND", "PHYSICAL", 95],
      ["Fissure", "GROUND", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600]
    ],
    212: [
      // Scizor — BUG/STEEL
      ["Twineedle", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Revenge", "BUG", "PHYSICAL", 55],
      ["Steamroller", "BUG", "PHYSICAL", 65],
      ["U-turn", "BUG", "PHYSICAL", 70],
      ["X-Scissor", "BUG", "PHYSICAL", 80],
      ["Behemoth Bash", "STEEL", "PHYSICAL", 100],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Hive Crush", "BUG", "PHYSICAL", 600]
    ],
    214: [
      // Heracross — BUG/FIGHTING
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Rock Smash", "FIGHTING", "PHYSICAL", 40],
      ["Low Kick", "FIGHTING", "PHYSICAL", 55],
      ["Counter", "FIGHTING", "PHYSICAL", 60],
      ["Brick Break", "FIGHTING", "PHYSICAL", 75],
      ["Lunge", "BUG", "PHYSICAL", 80],
      ["Collision Course", "FIGHTING", "PHYSICAL", 100],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Megahorn", "BUG", "PHYSICAL", 120],
      ["Focus Punch", "FIGHTING", "PHYSICAL", 150],
      ["Hive Crush", "BUG", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    227: [
      // Skarmory — STEEL/FLYING
      ["Metal Claw", "STEEL", "PHYSICAL", 35],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Gyro Ball", "STEEL", "PHYSICAL", 55],
      ["Sky Drop", "FLYING", "PHYSICAL", 60],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Meteor Mash", "STEEL", "PHYSICAL", 90],
      ["Brave Bird", "FLYING", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Gigaton Hammer", "STEEL", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600]
    ],
    229: [
      // Houndoom — DARK/FIRE
      ["Payback", "DARK", "SPECIAL", 35],
      ["Thief", "DARK", "SPECIAL", 45],
      ["Snarl", "DARK", "SPECIAL", 55],
      ["Dark Pulse", "DARK", "SPECIAL", 65],
      ["Burning Jealousy", "FIRE", "SPECIAL", 70],
      ["Night Daze", "DARK", "SPECIAL", 85],
      ["Fiery Wrath", "DARK", "SPECIAL", 90],
      ["Baddy Bad", "DARK", "SPECIAL", 120],
      ["Overheat", "FIRE", "SPECIAL", 120],
      ["Umbral Blast", "DARK", "SPECIAL", 150],
      ["Endless Hollow", "DARK", "SPECIAL", 600],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    248: [
      // Tyranitar — ROCK/DARK
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Rock Throw", "ROCK", "PHYSICAL", 45],
      ["Rock Tomb", "ROCK", "PHYSICAL", 55],
      ["Bite", "DARK", "PHYSICAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 85],
      ["Stone Edge", "ROCK", "PHYSICAL", 100],
      ["Fling", "DARK", "PHYSICAL", 120],
      ["Rock Wrecker", "ROCK", "PHYSICAL", 120],
      ["Head Smash", "ROCK", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Endless Hollow", "DARK", "PHYSICAL", 600]
    ],
    254: [
      // Sceptile — GRASS
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Grass Knot", "GRASS", "SPECIAL", 40],
      ["Syrup Bomb", "GRASS", "SPECIAL", 55],
      ["Magical Leaf", "GRASS", "SPECIAL", 60],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Grass Pledge", "GRASS", "SPECIAL", 80],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Petal Dance", "GRASS", "SPECIAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Verdant Storm", "GRASS", "SPECIAL", 150],
      ["Frenzy Plant", "GRASS", "SPECIAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    260: [
      // Swampert — WATER/GROUND
      ["Clamp", "WATER", "PHYSICAL", 35],
      ["Yawn", "WATER", "PHYSICAL", 45],
      ["Bulldoze", "GROUND", "PHYSICAL", 50],
      ["Flip Turn", "WATER", "PHYSICAL", 60],
      ["Liquidation", "WATER", "PHYSICAL", 75],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Fissure", "GROUND", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Frost Power", "WATER", "PHYSICAL", 150],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600]
    ],
    282: [
      // Gardevoir — PSYCHIC/FAIRY
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Lumina Crash", "PSYCHIC", "SPECIAL", 80],
      ["Sparkly Swirl", "FAIRY", "SPECIAL", 90],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    302: [
      // Sableye — DARK/GHOST
      ["Astonish", "GHOST", "PHYSICAL", 30],
      ["Shadow Sneak", "GHOST", "PHYSICAL", 40],
      ["Shadow Claw", "GHOST", "PHYSICAL", 55],
      ["Last Respects", "GHOST", "PHYSICAL", 60],
      ["Night Slash", "DARK", "PHYSICAL", 70],
      ["Shadow Bone", "GHOST", "PHYSICAL", 85],
      ["Phantom Force", "GHOST", "PHYSICAL", 90],
      ["Poltergeist", "GHOST", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Soul Reaper", "GHOST", "PHYSICAL", 150],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Untold Nightmare", "GHOST", "PHYSICAL", 600]
    ],
    303: [
      // Mawile — STEEL/FAIRY
      ["Disarming Voice", "FAIRY", "PHYSICAL", 25],
      ["Fairy Wind", "FAIRY", "PHYSICAL", 40],
      ["Draining Kiss", "FAIRY", "PHYSICAL", 50],
      ["Spirit Break", "FAIRY", "PHYSICAL", 65],
      ["Metal Burst", "STEEL", "PHYSICAL", 75],
      ["Dazzling Gleam", "FAIRY", "PHYSICAL", 80],
      ["Play Rough", "FAIRY", "PHYSICAL", 90],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Fae Hammer", "FAIRY", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Starlight Charm", "FAIRY", "PHYSICAL", 600]
    ],
    306: [
      // Aggron — STEEL/ROCK
      ["Bullet Punch", "STEEL", "PHYSICAL", 35],
      ["Gear Grind", "STEEL", "PHYSICAL", 45],
      ["Metal Claw", "STEEL", "PHYSICAL", 50],
      ["Smart Strike", "STEEL", "PHYSICAL", 65],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Iron Tail", "STEEL", "PHYSICAL", 100],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Gigaton Hammer", "STEEL", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600]
    ],
    308: [
      // Medicham — FIGHTING/PSYCHIC
      ["Rock Smash", "FIGHTING", "PHYSICAL", 35],
      ["Counter", "FIGHTING", "PHYSICAL", 40],
      ["Vacuum Wave", "FIGHTING", "SPECIAL", 50],
      ["Force Palm", "FIGHTING", "PHYSICAL", 60],
      ["Psybeam", "PSYCHIC", "SPECIAL", 70],
      ["Aura Sphere", "FIGHTING", "SPECIAL", 80],
      ["Dynamic Punch", "FIGHTING", "PHYSICAL", 100],
      ["Axe Kick", "FIGHTING", "PHYSICAL", 120],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Aura Burst", "FIGHTING", "SPECIAL", 150],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "SPECIAL", 600]
    ],
    310: [
      // Manectric — ELECTRIC
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Charge Beam", "ELECTRIC", "SPECIAL", 50],
      ["Electro Ball", "ELECTRIC", "SPECIAL", 60],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Thunderbolt", "ELECTRIC", "SPECIAL", 90],
      ["Thunder", "ELECTRIC", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Bolt Strike", "ELECTRIC", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    319: [
      // Sharpedo — WATER/DARK
      ["Clamp", "WATER", "PHYSICAL", 35],
      ["Aqua Jet", "WATER", "PHYSICAL", 40],
      ["Flip Turn", "WATER", "PHYSICAL", 55],
      ["Waterfall", "WATER", "PHYSICAL", 65],
      ["Night Slash", "DARK", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Liquidation", "WATER", "PHYSICAL", 95],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Endless Hollow", "DARK", "PHYSICAL", 600]
    ],
    334: [
      // Altaria — DRAGON/FLYING
      ["Peck", "FLYING", "PHYSICAL", 35],
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 40],
      ["Chatter", "FLYING", "SPECIAL", 55],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Air Cutter", "FLYING", "SPECIAL", 70],
      ["Fly", "FLYING", "PHYSICAL", 85],
      ["Floaty Fall", "FLYING", "PHYSICAL", 90],
      ["Brave Bird", "FLYING", "PHYSICAL", 120],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    354: [
      // Banette — GHOST
      ["Lick", "GHOST", "PHYSICAL", 30],
      ["Shadow Sneak", "GHOST", "PHYSICAL", 40],
      ["Last Respects", "GHOST", "PHYSICAL", 50],
      ["Rage Fist", "GHOST", "PHYSICAL", 60],
      ["Shadow Claw", "GHOST", "PHYSICAL", 70],
      ["Shadow Bone", "GHOST", "PHYSICAL", 85],
      ["Phantom Force", "GHOST", "PHYSICAL", 90],
      ["Poltergeist", "GHOST", "PHYSICAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Soul Reaper", "GHOST", "PHYSICAL", 150],
      ["Astral Barrage", "GHOST", "PHYSICAL", 600],
      ["Untold Nightmare", "GHOST", "PHYSICAL", 600]
    ],
    358: [
      // Chimecho — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Mega Mindbreak", "PSYCHIC", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    359: [
      // Absol — DARK
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Bite", "DARK", "PHYSICAL", 45],
      ["Payback", "DARK", "PHYSICAL", 50],
      ["Thief", "DARK", "PHYSICAL", 60],
      ["Night Slash", "DARK", "PHYSICAL", 70],
      ["Throat Chop", "DARK", "PHYSICAL", 80],
      ["Foul Play", "DARK", "PHYSICAL", 95],
      ["Baddy Bad", "DARK", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Midnight Ravage", "DARK", "PHYSICAL", 150],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    362: [
      // Glalie — ICE
      ["Powder Snow", "ICE", "SPECIAL", 35],
      ["Ice Shard", "ICE", "PHYSICAL", 40],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Frost Breath", "ICE", "SPECIAL", 60],
      ["Sheer Cold", "ICE", "SPECIAL", 70],
      ["Icicle Crash", "ICE", "PHYSICAL", 85],
      ["Ice Spinner", "ICE", "PHYSICAL", 90],
      ["Blizzard", "ICE", "SPECIAL", 120],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Permafrost Smash", "ICE", "PHYSICAL", 150],
      ["Glacial Lance", "ICE", "PHYSICAL", 600],
      ["Ice Time", "ICE", "SPECIAL", 600]
    ],
    373: [
      // Salamence — DRAGON/FLYING
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Dragon Tail", "DRAGON", "PHYSICAL", 55],
      ["Breaking Swipe", "DRAGON", "PHYSICAL", 60],
      ["Fly", "FLYING", "PHYSICAL", 75],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 80],
      ["Dragon Rush", "DRAGON", "PHYSICAL", 100],
      ["Brave Bird", "FLYING", "PHYSICAL", 120],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Draconic Soul", "DRAGON", "PHYSICAL", 300],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600]
    ],
    376: [
      // Metagross — STEEL/PSYCHIC
      ["Confusion", "PSYCHIC", "PHYSICAL", 35],
      ["Twin Beam", "PSYCHIC", "PHYSICAL", 40],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 55],
      ["Hard Press", "STEEL", "PHYSICAL", 60],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Zen Headbutt", "PSYCHIC", "PHYSICAL", 80],
      ["Psystrike", "PSYCHIC", "PHYSICAL", 100],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Mind Crusher", "PSYCHIC", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600]
    ],
    398: [
      // Staraptor — NORMAL/FLYING
      ["Aerial Ace", "FLYING", "PHYSICAL", 28],
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 40],
      ["Acrobatics", "FLYING", "PHYSICAL", 55],
      ["Wing Attack", "FLYING", "PHYSICAL", 60],
      ["Pluck", "FLYING", "PHYSICAL", 70],
      ["Take Down", "NORMAL", "PHYSICAL", 85],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Brave Bird", "FLYING", "PHYSICAL", 120],
      ["Endeavor", "NORMAL", "PHYSICAL", 120],
      ["Skyfall Dive", "FLYING", "PHYSICAL", 150],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    428: [
      // Lopunny — NORMAL
      ["Double Hit", "NORMAL", "PHYSICAL", 35],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Cut", "NORMAL", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Headbutt", "NORMAL", "PHYSICAL", 70],
      ["Strength", "NORMAL", "PHYSICAL", 80],
      ["Hyper Drill", "NORMAL", "PHYSICAL", 100],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Head Charge", "NORMAL", "PHYSICAL", 120],
      ["Giga Impact", "NORMAL", "PHYSICAL", 150],
      ["Blood Moon", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    445: [
      // Garchomp — DRAGON/GROUND
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Dragon Tail", "DRAGON", "PHYSICAL", 55],
      ["Breaking Swipe", "DRAGON", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 80],
      ["Dragon Rush", "DRAGON", "PHYSICAL", 100],
      ["Fissure", "GROUND", "PHYSICAL", 120],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Draconic Soul", "DRAGON", "PHYSICAL", 300],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600]
    ],
    460: [
      // Abomasnow — GRASS/ICE
      ["Icicle Spear", "ICE", "PHYSICAL", 25],
      ["Ice Shard", "ICE", "PHYSICAL", 40],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Frost Breath", "ICE", "SPECIAL", 60],
      ["Razor Leaf", "GRASS", "PHYSICAL", 70],
      ["Ice Spinner", "ICE", "PHYSICAL", 80],
      ["Ice Beam", "ICE", "SPECIAL", 90],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Wood Hammer", "GRASS", "PHYSICAL", 120],
      ["Absolute Zero", "ICE", "SPECIAL", 150],
      ["Ice Time", "ICE", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    475: [
      // Gallade — PSYCHIC/FIGHTING
      ["Stored Power", "PSYCHIC", "PHYSICAL", 25],
      ["Twin Beam", "PSYCHIC", "PHYSICAL", 40],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 55],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 65],
      ["Brick Break", "FIGHTING", "PHYSICAL", 75],
      ["Psyshock", "PSYCHIC", "PHYSICAL", 80],
      ["Psychic", "PSYCHIC", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Mind Crusher", "PSYCHIC", "PHYSICAL", 150],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    478: [
      // Froslass — ICE/GHOST
      ["Icicle Spear", "ICE", "PHYSICAL", 25],
      ["Ice Shard", "ICE", "PHYSICAL", 40],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Frost Breath", "ICE", "SPECIAL", 60],
      ["Ice Punch", "ICE", "PHYSICAL", 75],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Icicle Crash", "ICE", "PHYSICAL", 90],
      ["Poltergeist", "GHOST", "PHYSICAL", 120],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Absolute Zero", "ICE", "SPECIAL", 150],
      ["Ice Time", "ICE", "PHYSICAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    500: [
      // Emboar — FIRE/FIGHTING
      ["Fire Spin", "FIRE", "PHYSICAL", 30],
      ["Flame Wheel", "FIRE", "PHYSICAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 50],
      ["Heat Crash", "FIRE", "PHYSICAL", 60],
      ["Fire Punch", "FIRE", "PHYSICAL", 75],
      ["Body Press", "FIGHTING", "PHYSICAL", 80],
      ["Temper Flare", "FIRE", "PHYSICAL", 90],
      ["Raging Fury", "FIRE", "PHYSICAL", 120],
      ["Superpower", "FIGHTING", "PHYSICAL", 120],
      ["Blazing Charge", "FIRE", "PHYSICAL", 150],
      ["V-create", "FIRE", "PHYSICAL", 150],
      ["Blast Burn", "FIRE", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    530: [
      // Excadrill — GROUND/STEEL
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Bonemerang", "GROUND", "PHYSICAL", 45],
      ["Gear Grind", "STEEL", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600],
      ["Mega Forge", "STEEL", "PHYSICAL", 600]
    ],
    531: [
      // Audino — NORMAL
      ["Tackle", "NORMAL", "PHYSICAL", 35],
      ["Pound", "NORMAL", "PHYSICAL", 40],
      ["Covet", "NORMAL", "PHYSICAL", 55],
      ["Round", "NORMAL", "SPECIAL", 60],
      ["Tri Attack", "NORMAL", "SPECIAL", 75],
      ["Body Slam", "NORMAL", "PHYSICAL", 85],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Hyper Beam", "NORMAL", "SPECIAL", 150],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600]
    ],
    545: [
      // Scolipede — BUG/POISON
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Skitter Smack", "BUG", "PHYSICAL", 70],
      ["X-Scissor", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Mega Swarm", "BUG", "PHYSICAL", 600],
      ["Noxious Torque", "POISON", "PHYSICAL", 600]
    ],
    560: [
      // Scrafty — DARK/FIGHTING
      ["Rock Smash", "FIGHTING", "PHYSICAL", 35],
      ["Power-Up Punch", "FIGHTING", "PHYSICAL", 40],
      ["Counter", "FIGHTING", "PHYSICAL", 55],
      ["Brick Break", "FIGHTING", "PHYSICAL", 65],
      ["Low Kick", "FIGHTING", "PHYSICAL", 70],
      ["Crunch", "DARK", "PHYSICAL", 80],
      ["Dynamic Punch", "FIGHTING", "PHYSICAL", 100],
      ["Beat Up", "DARK", "PHYSICAL", 120],
      ["High Jump Kick", "FIGHTING", "PHYSICAL", 120],
      ["Focus Punch", "FIGHTING", "PHYSICAL", 150],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    609: [
      // Chandelure — GHOST/FIRE
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Incinerate", "FIRE", "SPECIAL", 55],
      ["Burning Jealousy", "FIRE", "SPECIAL", 65],
      ["Bitter Malice", "GHOST", "SPECIAL", 75],
      ["Fiery Dance", "FIRE", "SPECIAL", 80],
      ["Heat Wave", "FIRE", "SPECIAL", 95],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Overheat", "FIRE", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    623: [
      // Golurk — GROUND/GHOST
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Bulldoze", "GROUND", "PHYSICAL", 45],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 65],
      ["Shadow Claw", "GHOST", "PHYSICAL", 70],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600],
      ["Soul-Stealing 7-Star Strike", "GHOST", "PHYSICAL", 600]
    ],
    652: [
      // Chesnaught — GRASS/FIGHTING
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Branch Poke", "GRASS", "PHYSICAL", 40],
      ["Trailblaze", "GRASS", "PHYSICAL", 50],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Horn Leech", "GRASS", "PHYSICAL", 75],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Leaf Blade", "GRASS", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Bramble Crush", "GRASS", "PHYSICAL", 150],
      ["Timber Crash", "GRASS", "PHYSICAL", 150],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600]
    ],
    655: [
      // Delphox — FIRE/PSYCHIC
      ["Fire Spin", "FIRE", "SPECIAL", 35],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Burning Jealousy", "FIRE", "SPECIAL", 55],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Mystical Fire", "FIRE", "SPECIAL", 75],
      ["Psychic", "PSYCHIC", "SPECIAL", 85],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Overheat", "FIRE", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Mind Blown", "FIRE", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    668: [
      // Pyroar — FIRE/NORMAL
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Burning Jealousy", "FIRE", "SPECIAL", 55],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Mystical Fire", "FIRE", "SPECIAL", 75],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "SPECIAL", 600],
      ["Mega Onslaught", "NORMAL", "SPECIAL", 600]
    ],
    670: [
      // Floette — FAIRY · forma do meio (→ Florges #671), com o PAR de 600 que a planilha dá
      ["Disarming Voice", "FAIRY", "SPECIAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 65],
      ["Sparkly Swirl", "FAIRY", "SPECIAL", 75],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Misty Explosion", "FAIRY", "SPECIAL", 100],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Magical Torque", "FAIRY", "SPECIAL", 120],
      ["Lunar Nova", "FAIRY", "SPECIAL", 150],
      ["Light of Ruin", "FAIRY", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    678: [
      // Meowstic — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600]
    ],
    687: [
      // Malamar — DARK/PSYCHIC
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Payback", "DARK", "PHYSICAL", 50],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Lash Out", "DARK", "PHYSICAL", 75],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 80],
      ["Hyperspace Fury", "DARK", "PHYSICAL", 100],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Midnight Ravage", "DARK", "PHYSICAL", 150],
      ["Psychic Fangs", "PSYCHIC", "PHYSICAL", 600],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    689: [
      // Barbaracle — ROCK/WATER
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Smack Down", "ROCK", "PHYSICAL", 45],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Stone Axe", "ROCK", "PHYSICAL", 65],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Head Smash", "ROCK", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600]
    ],
    691: [
      // Dragalge — POISON/DRAGON
      ["Smog", "POISON", "SPECIAL", 30],
      ["Acid", "POISON", "SPECIAL", 40],
      ["Acid Spray", "POISON", "SPECIAL", 50],
      ["Venoshock", "POISON", "SPECIAL", 65],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 75],
      ["Sludge Wave", "POISON", "SPECIAL", 85],
      ["Sludge Bomb", "POISON", "SPECIAL", 90],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Toxic Deluge", "POISON", "SPECIAL", 600]
    ],
    701: [
      // Hawlucha — FIGHTING/FLYING
      ["Aerial Ace", "FLYING", "PHYSICAL", 25],
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 40],
      ["Low Kick", "FIGHTING", "PHYSICAL", 55],
      ["Wing Attack", "FLYING", "PHYSICAL", 60],
      ["Acrobatics", "FLYING", "PHYSICAL", 70],
      ["Bounce", "FLYING", "PHYSICAL", 85],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Brave Bird", "FLYING", "PHYSICAL", 120],
      ["High Jump Kick", "FIGHTING", "PHYSICAL", 120],
      ["Sky Attack", "FLYING", "PHYSICAL", 150],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    740: [
      // Crabominable — FIGHTING/ICE
      ["Rock Smash", "FIGHTING", "PHYSICAL", 35],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 55],
      ["Avalanche", "ICE", "PHYSICAL", 60],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Body Press", "FIGHTING", "PHYSICAL", 80],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Focus Punch", "FIGHTING", "PHYSICAL", 150],
      ["Ice Time", "ICE", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    768: [
      // Golisopod — BUG/WATER
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Mega Swarm", "BUG", "PHYSICAL", 600]
    ],
    780: [
      // Drampa — NORMAL/DRAGON
      ["Weather Ball", "NORMAL", "SPECIAL", 35],
      ["Echoed Voice", "NORMAL", "SPECIAL", 40],
      ["Terrain Pulse", "NORMAL", "SPECIAL", 50],
      ["Round", "NORMAL", "SPECIAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Razor Wind", "NORMAL", "SPECIAL", 80],
      ["Spacial Rend", "DRAGON", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Mega Cataclysm", "DRAGON", "SPECIAL", 600],
      ["Mega Onslaught", "NORMAL", "SPECIAL", 600]
    ],
    870: [
      // Falinks — FIGHTING
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 55],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Submission", "FIGHTING", "PHYSICAL", 80],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Axe Kick", "FIGHTING", "PHYSICAL", 120],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Focus Punch", "FIGHTING", "PHYSICAL", 150],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    952: [
      // Scovillain — GRASS/FIRE
      ["Magical Leaf", "GRASS", "SPECIAL", 30],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Flame Wheel", "FIRE", "PHYSICAL", 60],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Giga Drain", "GRASS", "SPECIAL", 80],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    978: [
      // Tatsugiri — DRAGON/WATER
      ["Twister", "DRAGON", "SPECIAL", 35],
      ["Dragon Breath", "DRAGON", "SPECIAL", 45],
      ["Dragon Darts", "DRAGON", "SPECIAL", 50],
      ["Fickle Beam", "DRAGON", "SPECIAL", 65],
      ["Snipe Shot", "WATER", "SPECIAL", 75],
      ["Core Enforcer", "DRAGON", "SPECIAL", 85],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 90],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600]
    ],
    998: [
      // Baxcalibur — DRAGON/ICE
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Breaking Swipe", "DRAGON", "PHYSICAL", 60],
      ["Icicle Crash", "ICE", "PHYSICAL", 75],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 80],
      ["Dragon Hammer", "DRAGON", "PHYSICAL", 90],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Draconic Soul", "DRAGON", "PHYSICAL", 300],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Ice Time", "ICE", "PHYSICAL", 600]
    ]
  };
  var GOLPES_MEGAS_2026_10_26 = {};
  var GOLPES_REWORK_2026_10_27 = {
    12: [
      // Butterfree — BUG/FLYING
      ["Infestation", "BUG", "SPECIAL", 25],
      ["Fury Cutter", "BUG", "SPECIAL", 40],
      ["Struggle Bug", "BUG", "SPECIAL", 50],
      ["Silver Wind", "BUG", "SPECIAL", 60],
      ["Signal Beam", "BUG", "SPECIAL", 75],
      ["Oblivion Wing", "FLYING", "SPECIAL", 80],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Swarm Pulse", "BUG", "SPECIAL", 150],
      ["Hive Crush", "BUG", "SPECIAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    4020: [
      // Alolan Raticate — DARK/NORMAL
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Beat Up", "DARK", "PHYSICAL", 55],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Night Slash", "DARK", "PHYSICAL", 70],
      ["Comeuppance", "DARK", "PHYSICAL", 80],
      ["Darkest Lariat", "DARK", "PHYSICAL", 90],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Midnight Ravage", "DARK", "PHYSICAL", 150],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    20: [
      // Raticate — NORMAL
      ["Bind", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Cut", "NORMAL", "PHYSICAL", 50],
      ["Facade", "NORMAL", "PHYSICAL", 65],
      ["Strength", "NORMAL", "PHYSICAL", 75],
      ["Body Slam", "NORMAL", "PHYSICAL", 85],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Endeavor", "NORMAL", "PHYSICAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    22: [
      // Fearow — NORMAL/FLYING
      ["Aerial Ace", "FLYING", "PHYSICAL", 30],
      ["Peck", "FLYING", "PHYSICAL", 40],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Pluck", "FLYING", "PHYSICAL", 60],
      ["Wing Attack", "FLYING", "PHYSICAL", 70],
      ["Drill Peck", "FLYING", "PHYSICAL", 80],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Brave Bird", "FLYING", "PHYSICAL", 120],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Skyfall Dive", "FLYING", "PHYSICAL", 150],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    4028: [
      // Alolan Sandslash — ICE/STEEL
      ["Ice Shard", "ICE", "PHYSICAL", 35],
      ["Icicle Spear", "ICE", "PHYSICAL", 40],
      ["Avalanche", "ICE", "PHYSICAL", 55],
      ["Hard Press", "STEEL", "PHYSICAL", 60],
      ["Ice Fang", "ICE", "PHYSICAL", 70],
      ["Ice Spinner", "ICE", "PHYSICAL", 80],
      ["Icicle Crash", "ICE", "PHYSICAL", 90],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Permafrost Smash", "ICE", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Ice Time", "ICE", "PHYSICAL", 600]
    ],
    28: [
      // Sandslash — GROUND
      ["Bone Rush", "GROUND", "PHYSICAL", 25],
      ["Sand Tomb", "GROUND", "PHYSICAL", 40],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Dig", "GROUND", "PHYSICAL", 80],
      ["Earthquake", "GROUND", "PHYSICAL", 100],
      ["Fissure", "GROUND", "PHYSICAL", 120],
      ["Precipice Blades", "GROUND", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600]
    ],
    31: [
      // Nidoqueen — POISON/GROUND
      ["Bone Rush", "GROUND", "PHYSICAL", 25],
      ["Sand Tomb", "GROUND", "PHYSICAL", 40],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Earthquake", "GROUND", "PHYSICAL", 100],
      ["Fissure", "GROUND", "PHYSICAL", 120],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Toxic Deluge", "POISON", "PHYSICAL", 600]
    ],
    34: [
      // Nidoking — POISON/GROUND
      ["Poison Sting", "POISON", "PHYSICAL", 25],
      ["Poison Tail", "POISON", "PHYSICAL", 45],
      ["Poison Fang", "POISON", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Cross Poison", "POISON", "PHYSICAL", 70],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Dire Claw", "POISON", "PHYSICAL", 90],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Precipice Blades", "GROUND", "PHYSICAL", 120],
      ["Venom Crash", "POISON", "PHYSICAL", 150],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600],
      ["Noxious Torque", "POISON", "PHYSICAL", 600]
    ],
    4038: [
      // Alolan Ninetales — ICE/FAIRY
      ["Powder Snow", "ICE", "SPECIAL", 35],
      ["Frost Breath", "ICE", "SPECIAL", 45],
      ["Aurora Beam", "ICE", "SPECIAL", 55],
      ["Icy Wind", "ICE", "SPECIAL", 60],
      ["Freeze-Dry", "ICE", "SPECIAL", 70],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Ice Beam", "ICE", "SPECIAL", 90],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Absolute Zero", "ICE", "SPECIAL", 150],
      ["Ice Time", "ICE", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    40: [
      // Wigglytuff — NORMAL/FAIRY
      ["Echoed Voice", "NORMAL", "SPECIAL", 35],
      ["Terrain Pulse", "NORMAL", "SPECIAL", 45],
      ["Round", "NORMAL", "SPECIAL", 55],
      ["Tera Blast", "NORMAL", "SPECIAL", 65],
      ["Swift", "NORMAL", "SPECIAL", 70],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Disarming Voice", "FAIRY", "SPECIAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Hyper Beam", "NORMAL", "SPECIAL", 150],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600]
    ],
    45: [
      // Vileplume — GRASS/POISON
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Syrup Bomb", "GRASS", "SPECIAL", 55],
      ["Venoshock", "POISON", "SPECIAL", 65],
      ["Grass Knot", "GRASS", "SPECIAL", 70],
      ["Giga Drain", "GRASS", "SPECIAL", 80],
      ["Magical Leaf", "GRASS", "SPECIAL", 96],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Petal Dance", "GRASS", "SPECIAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Petal Bloom", "GRASS", "SPECIAL", 600],
      ["Toxic Deluge", "POISON", "SPECIAL", 600]
    ],
    47: [
      // Parasect — BUG/GRASS
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fell Stinger", "BUG", "PHYSICAL", 45],
      ["Fury Cutter", "BUG", "PHYSICAL", 55],
      ["X-Scissor", "BUG", "PHYSICAL", 65],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Hive Crush", "BUG", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600]
    ],
    49: [
      // Venomoth — BUG/POISON
      ["Infestation", "BUG", "SPECIAL", 25],
      ["Struggle Bug", "BUG", "SPECIAL", 45],
      ["Silver Wind", "BUG", "SPECIAL", 55],
      ["Signal Beam", "BUG", "SPECIAL", 65],
      ["Bug Bite", "BUG", "SPECIAL", 75],
      ["Sludge Bomb", "POISON", "SPECIAL", 85],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Swarm Pulse", "BUG", "SPECIAL", 150],
      ["Hive Crush", "BUG", "SPECIAL", 600],
      ["Toxic Deluge", "POISON", "SPECIAL", 600]
    ],
    4051: [
      // Alolan Dugtrio — GROUND/STEEL
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Bonemerang", "GROUND", "PHYSICAL", 45],
      ["Bulldoze", "GROUND", "PHYSICAL", 55],
      ["Hard Press", "STEEL", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Dig", "GROUND", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600]
    ],
    51: [
      // Dugtrio — GROUND
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Bonemerang", "GROUND", "PHYSICAL", 45],
      ["Bulldoze", "GROUND", "PHYSICAL", 50],
      ["Bone Club", "GROUND", "PHYSICAL", 65],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Dig", "GROUND", "PHYSICAL", 80],
      ["Earthquake", "GROUND", "PHYSICAL", 100],
      ["Fissure", "GROUND", "PHYSICAL", 120],
      ["Precipice Blades", "GROUND", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600]
    ],
    4053: [
      // Alolan Persian — DARK
      ["Power Trip", "DARK", "SPECIAL", 25],
      ["Fling", "DARK", "SPECIAL", 40],
      ["Snarl", "DARK", "SPECIAL", 55],
      ["Dark Pulse", "DARK", "SPECIAL", 65],
      ["Night Slash", "DARK", "SPECIAL", 70],
      ["Night Daze", "DARK", "SPECIAL", 85],
      ["Fiery Wrath", "DARK", "SPECIAL", 90],
      ["Baddy Bad", "DARK", "SPECIAL", 120],
      ["Pursuit", "DARK", "SPECIAL", 120],
      ["Umbral Blast", "DARK", "SPECIAL", 150],
      ["Endless Hollow", "DARK", "SPECIAL", 600],
      ["Wicked Blow", "DARK", "SPECIAL", 600]
    ],
    55: [
      // Golduck — WATER
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Brine", "WATER", "SPECIAL", 70],
      ["Surf", "WATER", "SPECIAL", 85],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Origin Pulse", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600]
    ],
    6059: [
      // Hisuian Arcanine — FIRE/ROCK
      ["Fire Spin", "FIRE", "PHYSICAL", 30],
      ["Flame Wheel", "FIRE", "PHYSICAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Temper Flare", "FIRE", "PHYSICAL", 65],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Fire Fang", "FIRE", "PHYSICAL", 80],
      ["Heat Crash", "FIRE", "PHYSICAL", 90],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Blazing Charge", "FIRE", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Ignition Point", "FIRE", "PHYSICAL", 600]
    ],
    62: [
      // Poliwrath — WATER/FIGHTING
      ["Clamp", "WATER", "PHYSICAL", 35],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Low Sweep", "FIGHTING", "PHYSICAL", 65],
      ["Razor Shell", "WATER", "PHYSICAL", 75],
      ["Waterfall", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    76: [
      // Golem — ROCK/GROUND
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Smack Down", "ROCK", "PHYSICAL", 45],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Rock Tomb", "ROCK", "PHYSICAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Dig", "GROUND", "PHYSICAL", 80],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Fissure", "GROUND", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Rock Wrecker", "ROCK", "PHYSICAL", 150],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600]
    ],
    5078: [
      // Galarian Rapidash — PSYCHIC/FAIRY
      ["Stored Power", "PSYCHIC", "PHYSICAL", 25],
      ["Twin Beam", "PSYCHIC", "PHYSICAL", 40],
      ["Mirror Coat", "PSYCHIC", "PHYSICAL", 55],
      ["Spirit Break", "FAIRY", "PHYSICAL", 65],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 80],
      ["Glitzy Glow", "PSYCHIC", "PHYSICAL", 90],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Mind Crusher", "PSYCHIC", "PHYSICAL", 150],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600],
      ["Starlight Charm", "FAIRY", "PHYSICAL", 600]
    ],
    78: [
      // Rapidash — FIRE
      ["Fire Spin", "FIRE", "PHYSICAL", 30],
      ["Flame Charge", "FIRE", "PHYSICAL", 45],
      ["Fire Fang", "FIRE", "PHYSICAL", 55],
      ["Flame Wheel", "FIRE", "PHYSICAL", 60],
      ["Fire Punch", "FIRE", "PHYSICAL", 75],
      ["Blaze Kick", "FIRE", "PHYSICAL", 85],
      ["Sacred Fire", "FIRE", "PHYSICAL", 100],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Pyro Ball", "FIRE", "PHYSICAL", 120],
      ["Blazing Charge", "FIRE", "PHYSICAL", 150],
      ["Blast Burn", "FIRE", "PHYSICAL", 600],
      ["Ignition Point", "FIRE", "PHYSICAL", 600]
    ],
    5080: [
      // Galarian Slowbro — POISON/PSYCHIC
      ["Acid Spray", "POISON", "SPECIAL", 35],
      ["Acid", "POISON", "SPECIAL", 40],
      ["Poison Tail", "POISON", "PHYSICAL", 50],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Cross Poison", "POISON", "PHYSICAL", 70],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Psyshock", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Toxic Torrent", "POISON", "SPECIAL", 150],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600],
      ["Toxic Deluge", "POISON", "SPECIAL", 600]
    ],
    87: [
      // Dewgong — WATER/ICE
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Ice Beam", "ICE", "SPECIAL", 90],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Glacial Lance", "ICE", "PHYSICAL", 600]
    ],
    4089: [
      // Alolan Muk — POISON/DARK
      ["Poison Fang", "POISON", "PHYSICAL", 35],
      ["Mortal Spin", "POISON", "PHYSICAL", 40],
      ["Poison Tail", "POISON", "PHYSICAL", 50],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Cross Poison", "POISON", "PHYSICAL", 70],
      ["Crunch", "DARK", "PHYSICAL", 80],
      ["Poison Jab", "POISON", "PHYSICAL", 90],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Venom Crash", "POISON", "PHYSICAL", 150],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Toxic Deluge", "POISON", "PHYSICAL", 600]
    ],
    91: [
      // Cloyster — WATER/ICE
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Razor Shell", "WATER", "PHYSICAL", 65],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Icicle Crash", "ICE", "PHYSICAL", 85],
      ["Liquidation", "WATER", "PHYSICAL", 95],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Glacial Lance", "ICE", "PHYSICAL", 600]
    ],
    97: [
      // Hypno — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Mind Crusher", "PSYCHIC", "PHYSICAL", 150],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Psychic Fangs", "PSYCHIC", "PHYSICAL", 600]
    ],
    99: [
      // Kingler — WATER
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Jet Punch", "WATER", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Frost Power", "WATER", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Hydro Cannon", "WATER", "PHYSICAL", 600]
    ],
    101: [
      // Electrode — ELECTRIC
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Charge Beam", "ELECTRIC", "SPECIAL", 50],
      ["Electro Ball", "ELECTRIC", "SPECIAL", 60],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Thunderbolt", "ELECTRIC", "SPECIAL", 90],
      ["Thunder", "ELECTRIC", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Bolt Strike", "ELECTRIC", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    6101: [
      // Hisuian Electrode — ELECTRIC/GRASS
      ["Charge Beam", "ELECTRIC", "SPECIAL", 35],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Syrup Bomb", "GRASS", "SPECIAL", 60],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Petal Bloom", "GRASS", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    4103: [
      // Alolan Exeggutor — GRASS/DRAGON
      ["Magical Leaf", "GRASS", "SPECIAL", 30],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Syrup Bomb", "GRASS", "SPECIAL", 55],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Grass Knot", "GRASS", "SPECIAL", 85],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    103: [
      // Exeggutor — GRASS/PSYCHIC
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Leaf Tornado", "GRASS", "SPECIAL", 55],
      ["Syrup Bomb", "GRASS", "SPECIAL", 60],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Apple Acid", "GRASS", "SPECIAL", 80],
      ["Grass Knot", "GRASS", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    4105: [
      // Alolan Marowak — FIRE/GHOST
      ["Fire Spin", "FIRE", "PHYSICAL", 30],
      ["Flame Charge", "FIRE", "PHYSICAL", 45],
      ["Fire Fang", "FIRE", "PHYSICAL", 55],
      ["Flame Wheel", "FIRE", "PHYSICAL", 60],
      ["Shadow Claw", "GHOST", "PHYSICAL", 70],
      ["Fire Punch", "FIRE", "PHYSICAL", 80],
      ["Heat Crash", "FIRE", "PHYSICAL", 90],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Blazing Charge", "FIRE", "PHYSICAL", 150],
      ["Ignition Point", "FIRE", "PHYSICAL", 600],
      ["Untold Nightmare", "GHOST", "PHYSICAL", 600]
    ],
    105: [
      // Marowak — GROUND
      ["Bone Rush", "GROUND", "PHYSICAL", 25],
      ["Sand Tomb", "GROUND", "PHYSICAL", 40],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Bone Club", "GROUND", "PHYSICAL", 65],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Dig", "GROUND", "PHYSICAL", 80],
      ["Earthquake", "GROUND", "PHYSICAL", 100],
      ["Fissure", "GROUND", "PHYSICAL", 120],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600]
    ],
    122: [
      // Mr. Mime — PSYCHIC/FAIRY
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Confusion", "PSYCHIC", "SPECIAL", 45],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Psychic Noise", "PSYCHIC", "SPECIAL", 75],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 80],
      ["Psychic", "PSYCHIC", "SPECIAL", 90],
      ["Disarming Voice", "FAIRY", "SPECIAL", 120],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    7128: [
      // Paldean Tauros — FIGHTING
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 55],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Submission", "FIGHTING", "PHYSICAL", 80],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Axe Kick", "FIGHTING", "PHYSICAL", 120],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Focus Punch", "FIGHTING", "PHYSICAL", 150],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    9128: [
      // Paldean Tauros Aqua — FIGHTING/WATER
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 55],
      ["Jet Punch", "WATER", "PHYSICAL", 60],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Body Press", "FIGHTING", "PHYSICAL", 80],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Focus Punch", "FIGHTING", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    8128: [
      // Paldean Tauros Blaze — FIGHTING/FIRE
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 55],
      ["Flame Wheel", "FIRE", "PHYSICAL", 60],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Body Press", "FIGHTING", "PHYSICAL", 80],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Focus Punch", "FIGHTING", "PHYSICAL", 150],
      ["Ignition Point", "FIRE", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    131: [
      // Lapras — WATER/ICE
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Waterfall", "WATER", "PHYSICAL", 65],
      ["Avalanche", "ICE", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Liquidation", "WATER", "PHYSICAL", 95],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Glacial Lance", "ICE", "PHYSICAL", 600]
    ],
    132: [
      // Ditto — NORMAL
      ["Tail Slap", "NORMAL", "PHYSICAL", 25],
      ["Pay Day", "NORMAL", "PHYSICAL", 40],
      ["Crush Grip", "NORMAL", "PHYSICAL", 50],
      ["Bide", "NORMAL", "PHYSICAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Razor Wind", "NORMAL", "SPECIAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Hyper Beam", "NORMAL", "SPECIAL", 150],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600]
    ],
    139: [
      // Omastar — ROCK/WATER
      ["Rock Blast", "ROCK", "SPECIAL", 25],
      ["Rollout", "ROCK", "SPECIAL", 40],
      ["Rock Throw", "ROCK", "SPECIAL", 50],
      ["Ancient Power", "ROCK", "SPECIAL", 60],
      ["Brine", "WATER", "SPECIAL", 70],
      ["Rock Slide", "ROCK", "SPECIAL", 80],
      ["Diamond Storm", "ROCK", "SPECIAL", 100],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Power Gem", "ROCK", "SPECIAL", 120],
      ["Gem Storm", "ROCK", "SPECIAL", 150],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Meteor Beam", "ROCK", "SPECIAL", 600]
    ],
    141: [
      // Kabutops — ROCK/WATER
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Stone Axe", "ROCK", "PHYSICAL", 65],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Rock Slide", "ROCK", "PHYSICAL", 80],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Head Smash", "ROCK", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600]
    ],
    143: [
      // Snorlax — NORMAL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Hyper Drill", "NORMAL", "PHYSICAL", 100],
      ["Head Charge", "NORMAL", "PHYSICAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    6157: [
      // Hisuian Typhlosion — FIRE/GHOST
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Burning Jealousy", "FIRE", "SPECIAL", 55],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Flame Burst", "FIRE", "SPECIAL", 70],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Mind Blown", "FIRE", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    162: [
      // Furret — NORMAL
      ["Bind", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Facade", "NORMAL", "PHYSICAL", 55],
      ["Super Fang", "NORMAL", "PHYSICAL", 65],
      ["Body Slam", "NORMAL", "PHYSICAL", 75],
      ["Slam", "NORMAL", "PHYSICAL", 80],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Endeavor", "NORMAL", "PHYSICAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    164: [
      // Noctowl — NORMAL/FLYING
      ["Weather Ball", "NORMAL", "SPECIAL", 35],
      ["Echoed Voice", "NORMAL", "SPECIAL", 40],
      ["Terrain Pulse", "NORMAL", "SPECIAL", 50],
      ["Round", "NORMAL", "SPECIAL", 60],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Razor Wind", "NORMAL", "SPECIAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Hyper Beam", "NORMAL", "SPECIAL", 150],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600],
      ["Mega Onslaught", "NORMAL", "SPECIAL", 600]
    ],
    166: [
      // Ledian — BUG/FLYING
      ["Infestation", "BUG", "SPECIAL", 25],
      ["Fury Cutter", "BUG", "SPECIAL", 40],
      ["Struggle Bug", "BUG", "SPECIAL", 50],
      ["Silver Wind", "BUG", "SPECIAL", 60],
      ["Signal Beam", "BUG", "SPECIAL", 75],
      ["Oblivion Wing", "FLYING", "SPECIAL", 80],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Swarm Pulse", "BUG", "SPECIAL", 150],
      ["Hive Crush", "BUG", "SPECIAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    168: [
      // Ariados — BUG/POISON
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Cross Poison", "POISON", "PHYSICAL", 70],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Mega Swarm", "BUG", "PHYSICAL", 600],
      ["Noxious Torque", "POISON", "PHYSICAL", 600]
    ],
    171: [
      // Lanturn — WATER/ELECTRIC
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Bubble Beam", "WATER", "SPECIAL", 70],
      ["Snipe Shot", "WATER", "SPECIAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Mega Thunderstorm", "ELECTRIC", "SPECIAL", 600]
    ],
    178: [
      // Xatu — PSYCHIC/FLYING
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Zen Headbutt", "PSYCHIC", "SPECIAL", 65],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    184: [
      // Azumarill — WATER/FAIRY
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Bubble Beam", "WATER", "SPECIAL", 70],
      ["Surf", "WATER", "SPECIAL", 85],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    185: [
      // Sudowoodo — ROCK
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Rollout", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Rock Tomb", "ROCK", "PHYSICAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 85],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Meteor Beam", "ROCK", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Head Smash", "ROCK", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Rock Wrecker", "ROCK", "PHYSICAL", 600]
    ],
    186: [
      // Politoed — WATER
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Bubble Beam", "WATER", "SPECIAL", 70],
      ["Surf", "WATER", "SPECIAL", 85],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Origin Pulse", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600]
    ],
    189: [
      // Jumpluff — GRASS/FLYING
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Magical Leaf", "GRASS", "SPECIAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Energy Ball", "GRASS", "SPECIAL", 85],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    192: [
      // Sunflora — GRASS
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Magical Leaf", "GRASS", "SPECIAL", 40],
      ["Syrup Bomb", "GRASS", "SPECIAL", 55],
      ["Leaf Tornado", "GRASS", "SPECIAL", 65],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Energy Ball", "GRASS", "SPECIAL", 85],
      ["Grass Knot", "GRASS", "SPECIAL", 100],
      ["Petal Dance", "GRASS", "SPECIAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Frenzy Plant", "GRASS", "SPECIAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    195: [
      // Quagsire — WATER/GROUND
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Waterfall", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600]
    ],
    5199: [
      // Galarian Slowking — POISON/PSYCHIC
      ["Acid", "POISON", "SPECIAL", 35],
      ["Acid Spray", "POISON", "SPECIAL", 40],
      ["Clear Smog", "POISON", "SPECIAL", 50],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Venoshock", "POISON", "SPECIAL", 70],
      ["Sludge Wave", "POISON", "SPECIAL", 85],
      ["Sludge Bomb", "POISON", "SPECIAL", 90],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Toxic Torrent", "POISON", "SPECIAL", 150],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Toxic Deluge", "POISON", "SPECIAL", 600]
    ],
    199: [
      // Slowking — WATER/PSYCHIC
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Scald", "WATER", "SPECIAL", 75],
      ["Snipe Shot", "WATER", "SPECIAL", 80],
      ["Surf", "WATER", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    201: [
      // Unown — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Mind Crusher", "PSYCHIC", "PHYSICAL", 150],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Psychic Fangs", "PSYCHIC", "PHYSICAL", 600]
    ],
    202: [
      // Wobbuffet — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 80],
      ["Freezing Glare", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Mind Crusher", "PSYCHIC", "PHYSICAL", 150],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "PHYSICAL", 600]
    ],
    205: [
      // Forretress — BUG/STEEL
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Gear Grind", "STEEL", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Skitter Smack", "BUG", "PHYSICAL", 70],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["Lunge", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Mega Forge", "STEEL", "PHYSICAL", 600],
      ["Mega Swarm", "BUG", "PHYSICAL", 600]
    ],
    210: [
      // Granbull — FAIRY
      ["Disarming Voice", "FAIRY", "PHYSICAL", 25],
      ["Fairy Wind", "FAIRY", "PHYSICAL", 40],
      ["Draining Kiss", "FAIRY", "PHYSICAL", 50],
      ["Dazzling Gleam", "FAIRY", "PHYSICAL", 65],
      ["Spirit Break", "FAIRY", "PHYSICAL", 75],
      ["Alluring Voice", "FAIRY", "PHYSICAL", 80],
      ["Play Rough", "FAIRY", "PHYSICAL", 90],
      ["Fleur Cannon", "FAIRY", "PHYSICAL", 120],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Fae Hammer", "FAIRY", "PHYSICAL", 150],
      ["Let's Snuggle Forever", "FAIRY", "PHYSICAL", 600],
      ["Starlight Charm", "FAIRY", "PHYSICAL", 600]
    ],
    213: [
      // Shuckle — BUG/ROCK
      ["Infestation", "BUG", "SPECIAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Silver Wind", "BUG", "SPECIAL", 55],
      ["Struggle Bug", "BUG", "SPECIAL", 60],
      ["Skitter Smack", "BUG", "PHYSICAL", 70],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Power Gem", "ROCK", "SPECIAL", 120],
      ["Swarm Pulse", "BUG", "SPECIAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Hive Crush", "BUG", "SPECIAL", 600]
    ],
    219: [
      // Magcargo — FIRE/ROCK
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Incinerate", "FIRE", "SPECIAL", 55],
      ["Ancient Power", "ROCK", "SPECIAL", 60],
      ["Mystical Fire", "FIRE", "SPECIAL", 75],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Inferno", "FIRE", "SPECIAL", 100],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Power Gem", "ROCK", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "SPECIAL", 600],
      ["Meteor Beam", "ROCK", "SPECIAL", 600]
    ],
    224: [
      // Octillery — WATER
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600]
    ],
    225: [
      // Delibird — ICE/FLYING
      ["Powder Snow", "ICE", "SPECIAL", 35],
      ["Frost Breath", "ICE", "SPECIAL", 45],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Aurora Beam", "ICE", "SPECIAL", 65],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Ice Beam", "ICE", "SPECIAL", 85],
      ["Blizzard", "ICE", "SPECIAL", 100],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Absolute Zero", "ICE", "SPECIAL", 150],
      ["Glacial Lance", "ICE", "SPECIAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    226: [
      // Mantine — WATER/FLYING
      ["Bubble", "WATER", "SPECIAL", 35],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Brine", "WATER", "SPECIAL", 70],
      ["Snipe Shot", "WATER", "SPECIAL", 80],
      ["Aeroblast", "FLYING", "SPECIAL", 100],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    232: [
      // Donphan — GROUND
      ["Bone Rush", "GROUND", "PHYSICAL", 25],
      ["Bulldoze", "GROUND", "PHYSICAL", 45],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Bone Club", "GROUND", "PHYSICAL", 65],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Dig", "GROUND", "PHYSICAL", 80],
      ["Earthquake", "GROUND", "PHYSICAL", 100],
      ["Fissure", "GROUND", "PHYSICAL", 120],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Precipice Blades", "GROUND", "PHYSICAL", 600]
    ],
    235: [
      // Smeargle — NORMAL
      ["Bind", "NORMAL", "PHYSICAL", 25],
      ["Pay Day", "NORMAL", "PHYSICAL", 40],
      ["Crush Grip", "NORMAL", "PHYSICAL", 50],
      ["Scratch", "NORMAL", "PHYSICAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Razor Wind", "NORMAL", "SPECIAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Hyper Beam", "NORMAL", "SPECIAL", 150],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600]
    ],
    241: [
      // Miltank — NORMAL
      ["Bind", "NORMAL", "PHYSICAL", 25],
      ["Tackle", "NORMAL", "PHYSICAL", 40],
      ["Headbutt", "NORMAL", "PHYSICAL", 55],
      ["Stomp", "NORMAL", "PHYSICAL", 65],
      ["Facade", "NORMAL", "PHYSICAL", 70],
      ["Body Slam", "NORMAL", "PHYSICAL", 85],
      ["Strength", "NORMAL", "PHYSICAL", 90],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Endeavor", "NORMAL", "PHYSICAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    242: [
      // Blissey — NORMAL
      ["Terrain Pulse", "NORMAL", "SPECIAL", 35],
      ["Echoed Voice", "NORMAL", "SPECIAL", 40],
      ["Weather Ball", "NORMAL", "SPECIAL", 50],
      ["Hidden Power", "NORMAL", "SPECIAL", 60],
      ["Tera Blast", "NORMAL", "SPECIAL", 75],
      ["Hyper Voice", "NORMAL", "SPECIAL", 85],
      ["Swift", "NORMAL", "SPECIAL", 100],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Tera Starstorm", "NORMAL", "SPECIAL", 120],
      ["Hyper Beam", "NORMAL", "SPECIAL", 150],
      ["Giga Impact", "NORMAL", "SPECIAL", 600],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600]
    ],
    262: [
      // Mightyena — DARK
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Payback", "DARK", "PHYSICAL", 50],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Lash Out", "DARK", "PHYSICAL", 75],
      ["Darkest Lariat", "DARK", "PHYSICAL", 85],
      ["Hyperspace Fury", "DARK", "PHYSICAL", 100],
      ["Baddy Bad", "DARK", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Midnight Ravage", "DARK", "PHYSICAL", 150],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    264: [
      // Linoone — NORMAL · evolui (→ #862)
      ["Fury Swipes", "NORMAL", "PHYSICAL", 25],
      ["Tackle", "NORMAL", "PHYSICAL", 40],
      ["Cut", "NORMAL", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Headbutt", "NORMAL", "PHYSICAL", 70],
      ["Slash", "NORMAL", "PHYSICAL", 80],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Flail", "NORMAL", "PHYSICAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Blood Moon", "NORMAL", "PHYSICAL", 600],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600]
    ],
    267: [
      // Beautifly — BUG/FLYING
      ["Infestation", "BUG", "SPECIAL", 25],
      ["Silver Wind", "BUG", "SPECIAL", 45],
      ["Struggle Bug", "BUG", "SPECIAL", 50],
      ["Air Cutter", "FLYING", "SPECIAL", 60],
      ["Signal Beam", "BUG", "SPECIAL", 75],
      ["Leech Life", "BUG", "SPECIAL", 80],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Swarm Pulse", "BUG", "SPECIAL", 150],
      ["Hive Crush", "BUG", "SPECIAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    269: [
      // Dustox — BUG/POISON
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Struggle Bug", "BUG", "SPECIAL", 50],
      ["Silver Wind", "BUG", "SPECIAL", 60],
      ["Venoshock", "POISON", "SPECIAL", 70],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Swarm Pulse", "BUG", "SPECIAL", 150],
      ["Hive Crush", "BUG", "SPECIAL", 600],
      ["Toxic Deluge", "POISON", "PHYSICAL", 600]
    ],
    272: [
      // Ludicolo — WATER/GRASS
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Syrup Bomb", "GRASS", "SPECIAL", 60],
      ["Bubble Beam", "WATER", "SPECIAL", 70],
      ["Snipe Shot", "WATER", "SPECIAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    279: [
      // Pelipper — WATER/FLYING
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Snipe Shot", "WATER", "SPECIAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    284: [
      // Masquerain — BUG/FLYING
      ["Infestation", "BUG", "SPECIAL", 25],
      ["Silver Wind", "BUG", "SPECIAL", 45],
      ["Struggle Bug", "BUG", "SPECIAL", 50],
      ["Signal Beam", "BUG", "SPECIAL", 65],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Leech Life", "BUG", "SPECIAL", 80],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Swarm Pulse", "BUG", "SPECIAL", 150],
      ["Hive Crush", "BUG", "SPECIAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    286: [
      // Breloom — GRASS/FIGHTING
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Submission", "FIGHTING", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Axe Kick", "FIGHTING", "PHYSICAL", 120],
      ["Wood Hammer", "GRASS", "PHYSICAL", 120],
      ["Bramble Crush", "GRASS", "PHYSICAL", 150],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    289: [
      // Slaking — NORMAL
      ["Bind", "NORMAL", "PHYSICAL", 25],
      ["Scratch", "NORMAL", "PHYSICAL", 40],
      ["Slash", "NORMAL", "PHYSICAL", 55],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Facade", "NORMAL", "PHYSICAL", 70],
      ["Body Slam", "NORMAL", "PHYSICAL", 85],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Flail", "NORMAL", "PHYSICAL", 120],
      ["Mega Kick", "NORMAL", "PHYSICAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    291: [
      // Ninjask — BUG/FLYING
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Skitter Smack", "BUG", "PHYSICAL", 70],
      ["Drill Peck", "FLYING", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Mega Swarm", "BUG", "PHYSICAL", 600],
      ["Sky Attack", "FLYING", "PHYSICAL", 600]
    ],
    295: [
      // Exploud — NORMAL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Uproar", "NORMAL", "SPECIAL", 85],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Hyper Beam", "NORMAL", "SPECIAL", 150],
      ["Mega Onslaught", "NORMAL", "SPECIAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    311: [
      // Plusle — ELECTRIC
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Electroweb", "ELECTRIC", "SPECIAL", 45],
      ["Charge Beam", "ELECTRIC", "SPECIAL", 50],
      ["Electro Ball", "ELECTRIC", "SPECIAL", 65],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Thunder", "ELECTRIC", "SPECIAL", 100],
      ["Electro Shot", "ELECTRIC", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Bolt Strike", "ELECTRIC", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    312: [
      // Minun — ELECTRIC
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Overdrive", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Thunder", "ELECTRIC", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Mega Thunderstorm", "ELECTRIC", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    313: [
      // Volbeat — BUG
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Skitter Smack", "BUG", "PHYSICAL", 70],
      ["Lunge", "BUG", "PHYSICAL", 80],
      ["Leech Life", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Bug Buzz", "BUG", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Hive Crush", "BUG", "PHYSICAL", 600],
      ["Megahorn", "BUG", "PHYSICAL", 600]
    ],
    314: [
      // Illumise — BUG
      ["Infestation", "BUG", "SPECIAL", 25],
      ["Fury Cutter", "BUG", "SPECIAL", 40],
      ["Struggle Bug", "BUG", "SPECIAL", 50],
      ["Silver Wind", "BUG", "SPECIAL", 60],
      ["Signal Beam", "BUG", "SPECIAL", 75],
      ["Leech Life", "BUG", "SPECIAL", 80],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Attack Order", "BUG", "SPECIAL", 120],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Swarm Pulse", "BUG", "SPECIAL", 150],
      ["Hive Crush", "BUG", "SPECIAL", 600],
      ["Mega Swarm", "BUG", "SPECIAL", 600]
    ],
    321: [
      // Wailord — WATER
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600]
    ],
    324: [
      // Torkoal — FIRE
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Fire Fang", "FIRE", "PHYSICAL", 65],
      ["Mystical Fire", "FIRE", "SPECIAL", 75],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Sacred Fire", "FIRE", "PHYSICAL", 100],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Blazing Charge", "FIRE", "PHYSICAL", 150],
      ["Blast Burn", "FIRE", "PHYSICAL", 600],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    326: [
      // Grumpig — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Mega Mindbreak", "PSYCHIC", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    330: [
      // Flygon — GROUND/DRAGON
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Bone Rush", "GROUND", "PHYSICAL", 40],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 75],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Glaive Rush", "DRAGON", "PHYSICAL", 120],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Draconic Soul", "DRAGON", "PHYSICAL", 300],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600]
    ],
    337: [
      // Lunatone — ROCK/PSYCHIC
      ["Rock Blast", "ROCK", "SPECIAL", 25],
      ["Salt Cure", "ROCK", "SPECIAL", 40],
      ["Rock Throw", "ROCK", "SPECIAL", 50],
      ["Ancient Power", "ROCK", "SPECIAL", 60],
      ["Rock Slide", "ROCK", "SPECIAL", 75],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Diamond Storm", "ROCK", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Power Gem", "ROCK", "SPECIAL", 120],
      ["Gem Storm", "ROCK", "SPECIAL", 150],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Meteor Beam", "ROCK", "SPECIAL", 600]
    ],
    338: [
      // Solrock — ROCK/PSYCHIC
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 65],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 85],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Head Smash", "ROCK", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Psychic Fangs", "PSYCHIC", "PHYSICAL", 600]
    ],
    342: [
      // Crawdaunt — WATER/DARK
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Payback", "DARK", "PHYSICAL", 50],
      ["Jet Punch", "WATER", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Crabhammer", "WATER", "PHYSICAL", 100],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    344: [
      // Claydol — GROUND/PSYCHIC
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Mud-Slap", "GROUND", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Scorching Sands", "GROUND", "SPECIAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Seismic Blast", "GROUND", "SPECIAL", 150],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    346: [
      // Cradily — ROCK/GRASS
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Rock Tomb", "ROCK", "PHYSICAL", 45],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Ancient Power", "ROCK", "SPECIAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Energy Ball", "GRASS", "SPECIAL", 85],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Gem Storm", "ROCK", "SPECIAL", 150],
      ["Crumbling Rain", "ROCK", "SPECIAL", 600],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600]
    ],
    348: [
      // Armaldo — ROCK/BUG
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Smack Down", "ROCK", "PHYSICAL", 50],
      ["Stone Axe", "ROCK", "PHYSICAL", 65],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Head Smash", "ROCK", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Mega Swarm", "BUG", "PHYSICAL", 600]
    ],
    351: [
      // Castform — NORMAL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Weather Ball", "NORMAL", "SPECIAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Hyper Beam", "NORMAL", "SPECIAL", 150],
      ["Mega Onslaught", "NORMAL", "SPECIAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    8351: [
      // Castform Rainy — WATER
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Jet Punch", "WATER", "PHYSICAL", 60],
      ["Water Pulse", "WATER", "SPECIAL", 70],
      ["Hydro Steam", "WATER", "SPECIAL", 80],
      ["Scald", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Hydro Cannon", "WATER", "PHYSICAL", 600]
    ],
    9351: [
      // Castform Snowy — ICE
      ["Triple Axel", "ICE", "PHYSICAL", 25],
      ["Ice Shard", "ICE", "PHYSICAL", 40],
      ["Ice Fang", "ICE", "PHYSICAL", 55],
      ["Avalanche", "ICE", "PHYSICAL", 60],
      ["Freeze-Dry", "ICE", "SPECIAL", 70],
      ["Freezy Frost", "ICE", "SPECIAL", 85],
      ["Ice Beam", "ICE", "SPECIAL", 90],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Absolute Zero", "ICE", "SPECIAL", 150],
      ["Glacial Lance", "ICE", "PHYSICAL", 600],
      ["Ice Time", "ICE", "SPECIAL", 600]
    ],
    11351: [
      // Castform Sunny — FIRE
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Flame Wheel", "FIRE", "PHYSICAL", 60],
      ["Fire Punch", "FIRE", "PHYSICAL", 75],
      ["Fire Lash", "FIRE", "PHYSICAL", 80],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Fire Blast", "FIRE", "SPECIAL", 120],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Blast Burn", "FIRE", "PHYSICAL", 600],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    352: [
      // Kecleon — NORMAL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Hyper Drill", "NORMAL", "PHYSICAL", 100],
      ["Head Charge", "NORMAL", "PHYSICAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    365: [
      // Walrein — WATER/ICE
      ["Water Shuriken", "WATER", "SPECIAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Brine", "WATER", "SPECIAL", 70],
      ["Ice Beam", "ICE", "SPECIAL", 85],
      ["Bouncy Bubble", "WATER", "SPECIAL", 90],
      ["Blizzard", "ICE", "SPECIAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Glacial Lance", "ICE", "SPECIAL", 600]
    ],
    367: [
      // Huntail — WATER
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600]
    ],
    368: [
      // Gorebyss — WATER
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Brine", "WATER", "SPECIAL", 70],
      ["Snipe Shot", "WATER", "SPECIAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Origin Pulse", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Mega Maelstrom", "WATER", "SPECIAL", 600]
    ],
    369: [
      // Relicanth — WATER/ROCK
      ["Clamp", "WATER", "PHYSICAL", 35],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Jet Punch", "WATER", "PHYSICAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600]
    ],
    370: [
      // Luvdisc — WATER
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Brine", "WATER", "SPECIAL", 70],
      ["Snipe Shot", "WATER", "SPECIAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Origin Pulse", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Mega Maelstrom", "WATER", "SPECIAL", 600]
    ],
    402: [
      // Kricketune — BUG
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Skitter Smack", "BUG", "PHYSICAL", 70],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Megahorn", "BUG", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Hive Crush", "BUG", "PHYSICAL", 600],
      ["Mega Swarm", "BUG", "PHYSICAL", 600]
    ],
    405: [
      // Luxray — ELECTRIC
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 45],
      ["Spark", "ELECTRIC", "PHYSICAL", 55],
      ["Thunder Fang", "ELECTRIC", "PHYSICAL", 65],
      ["Thunder Punch", "ELECTRIC", "PHYSICAL", 75],
      ["Bolt Beak", "ELECTRIC", "PHYSICAL", 85],
      ["Wild Charge", "ELECTRIC", "PHYSICAL", 90],
      ["Double Shock", "ELECTRIC", "PHYSICAL", 120],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120],
      ["Volt Breaker", "ELECTRIC", "PHYSICAL", 150],
      ["Bolt Strike", "ELECTRIC", "PHYSICAL", 600],
      ["Static Overload", "ELECTRIC", "PHYSICAL", 600]
    ],
    409: [
      // Rampardos — ROCK
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Stone Axe", "ROCK", "PHYSICAL", 65],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 85],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Rock Wrecker", "ROCK", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Head Smash", "ROCK", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Mega Landslide", "ROCK", "PHYSICAL", 600]
    ],
    411: [
      // Bastiodon — ROCK/STEEL
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Accelerock", "ROCK", "PHYSICAL", 40],
      ["Smack Down", "ROCK", "PHYSICAL", 50],
      ["Ancient Power", "ROCK", "SPECIAL", 60],
      ["Rock Tomb", "ROCK", "PHYSICAL", 70],
      ["Flash Cannon", "STEEL", "SPECIAL", 80],
      ["Rock Slide", "ROCK", "PHYSICAL", 90],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Meteor Beam", "ROCK", "SPECIAL", 120],
      ["Gem Storm", "ROCK", "SPECIAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Crumbling Rain", "ROCK", "SPECIAL", 600]
    ],
    413: [
      // Wormadam — BUG/GRASS
      ["Struggle Bug", "BUG", "SPECIAL", 35],
      ["Infestation", "BUG", "SPECIAL", 40],
      ["Silver Wind", "BUG", "SPECIAL", 55],
      ["Signal Beam", "BUG", "SPECIAL", 65],
      ["Energy Ball", "GRASS", "SPECIAL", 75],
      ["Pollen Puff", "BUG", "SPECIAL", 85],
      ["Bug Buzz", "BUG", "SPECIAL", 90],
      ["Attack Order", "BUG", "SPECIAL", 120],
      ["Petal Dance", "GRASS", "SPECIAL", 120],
      ["Swarm Pulse", "BUG", "SPECIAL", 150],
      ["Hive Crush", "BUG", "SPECIAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    8413: [
      // Wormadam Sandy — BUG/GROUND
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Revenge", "BUG", "PHYSICAL", 55],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Skitter Smack", "BUG", "PHYSICAL", 70],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Hive Crush", "BUG", "PHYSICAL", 600]
    ],
    9413: [
      // Wormadam Trash — BUG/STEEL
      ["Fury Cutter", "BUG", "PHYSICAL", 35],
      ["Struggle Bug", "BUG", "SPECIAL", 45],
      ["Revenge", "BUG", "PHYSICAL", 55],
      ["Flash Cannon", "STEEL", "SPECIAL", 65],
      ["Silver Wind", "BUG", "SPECIAL", 70],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Steel Beam", "STEEL", "SPECIAL", 120],
      ["Swarm Pulse", "BUG", "SPECIAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Hive Crush", "BUG", "SPECIAL", 600]
    ],
    414: [
      // Mothim — BUG/FLYING
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Struggle Bug", "BUG", "SPECIAL", 50],
      ["Silver Wind", "BUG", "SPECIAL", 60],
      ["U-turn", "BUG", "PHYSICAL", 70],
      ["Bounce", "FLYING", "PHYSICAL", 85],
      ["Bug Buzz", "BUG", "SPECIAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Swarm Pulse", "BUG", "SPECIAL", 150],
      ["Hive Crush", "BUG", "PHYSICAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    416: [
      // Vespiquen — BUG/FLYING
      ["Infestation", "BUG", "SPECIAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Lunge", "BUG", "PHYSICAL", 80],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Swarm Pulse", "BUG", "SPECIAL", 150],
      ["Hive Crush", "BUG", "PHYSICAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    417: [
      // Pachirisu — ELECTRIC
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Charge Beam", "ELECTRIC", "SPECIAL", 50],
      ["Spark", "ELECTRIC", "PHYSICAL", 65],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Thunder Punch", "ELECTRIC", "PHYSICAL", 80],
      ["Wild Charge", "ELECTRIC", "PHYSICAL", 90],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Volt Breaker", "ELECTRIC", "PHYSICAL", 150],
      ["Bolt Strike", "ELECTRIC", "PHYSICAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    419: [
      // Floatzel — WATER
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Jet Punch", "WATER", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Frost Power", "WATER", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Hydro Cannon", "WATER", "PHYSICAL", 600]
    ],
    423: [
      // Gastrodon — WATER/GROUND
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Waterfall", "WATER", "PHYSICAL", 80],
      ["Liquidation", "WATER", "PHYSICAL", 95],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600]
    ],
    424: [
      // Ambipom — NORMAL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Hyper Drill", "NORMAL", "PHYSICAL", 100],
      ["Head Charge", "NORMAL", "PHYSICAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    429: [
      // Mismagius — GHOST
      ["Lick", "GHOST", "SPECIAL", 30],
      ["Ominous Wind", "GHOST", "SPECIAL", 45],
      ["Night Shade", "GHOST", "SPECIAL", 55],
      ["Infernal Parade", "GHOST", "SPECIAL", 60],
      ["Hex", "GHOST", "SPECIAL", 70],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Bitter Malice", "GHOST", "SPECIAL", 90],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Shadow Force", "GHOST", "SPECIAL", 120],
      ["Phantom Wail", "GHOST", "SPECIAL", 150],
      ["Mega Eclipse", "GHOST", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    430: [
      // Honchkrow — DARK/FLYING
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Thief", "DARK", "PHYSICAL", 45],
      ["Night Slash", "DARK", "PHYSICAL", 55],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Drill Peck", "FLYING", "PHYSICAL", 75],
      ["Darkest Lariat", "DARK", "PHYSICAL", 85],
      ["Hyperspace Fury", "DARK", "PHYSICAL", 100],
      ["Brave Bird", "FLYING", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Midnight Ravage", "DARK", "PHYSICAL", 150],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600],
      ["Mega Abyss", "DARK", "PHYSICAL", 600]
    ],
    435: [
      // Skuntank — POISON/DARK
      ["Poison Sting", "POISON", "PHYSICAL", 25],
      ["Poison Fang", "POISON", "PHYSICAL", 45],
      ["Poison Tail", "POISON", "PHYSICAL", 50],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Cross Poison", "POISON", "PHYSICAL", 70],
      ["Darkest Lariat", "DARK", "PHYSICAL", 85],
      ["Poison Jab", "POISON", "PHYSICAL", 90],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Venom Crash", "POISON", "PHYSICAL", 150],
      ["Noxious Torque", "POISON", "PHYSICAL", 600],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    442: [
      // Spiritomb — GHOST/DARK
      ["Lick", "GHOST", "PHYSICAL", 30],
      ["Shadow Sneak", "GHOST", "PHYSICAL", 40],
      ["Night Shade", "GHOST", "SPECIAL", 55],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Bitter Malice", "GHOST", "SPECIAL", 75],
      ["Shadow Bone", "GHOST", "PHYSICAL", 85],
      ["Shadow Ball", "GHOST", "SPECIAL", 90],
      ["Baddy Bad", "DARK", "SPECIAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Phantom Wail", "GHOST", "SPECIAL", 150],
      ["Mega Abyss", "DARK", "SPECIAL", 600],
      ["Soul-Stealing 7-Star Strike", "GHOST", "PHYSICAL", 600]
    ],
    450: [
      // Hippowdon — GROUND
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Bone Rush", "GROUND", "PHYSICAL", 40],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Fissure", "GROUND", "PHYSICAL", 120],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600]
    ],
    452: [
      // Drapion — POISON/DARK
      ["Poison Sting", "POISON", "PHYSICAL", 25],
      ["Poison Fang", "POISON", "PHYSICAL", 45],
      ["Poison Tail", "POISON", "PHYSICAL", 50],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Cross Poison", "POISON", "PHYSICAL", 70],
      ["Darkest Lariat", "DARK", "PHYSICAL", 85],
      ["Poison Jab", "POISON", "PHYSICAL", 90],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Venom Crash", "POISON", "PHYSICAL", 150],
      ["Noxious Torque", "POISON", "PHYSICAL", 600],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    454: [
      // Toxicroak — POISON/FIGHTING
      ["Poison Sting", "POISON", "PHYSICAL", 25],
      ["Poison Fang", "POISON", "PHYSICAL", 45],
      ["Poison Tail", "POISON", "PHYSICAL", 50],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Dire Claw", "POISON", "PHYSICAL", 90],
      ["Axe Kick", "FIGHTING", "PHYSICAL", 120],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Venom Crash", "POISON", "PHYSICAL", 150],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600],
      ["Noxious Torque", "POISON", "PHYSICAL", 600]
    ],
    457: [
      // Lumineon — WATER
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600]
    ],
    461: [
      // Weavile — DARK/ICE
      ["Icicle Spear", "ICE", "PHYSICAL", 25],
      ["Ice Shard", "ICE", "PHYSICAL", 40],
      ["Ice Fang", "ICE", "PHYSICAL", 55],
      ["Avalanche", "ICE", "PHYSICAL", 60],
      ["Night Slash", "DARK", "PHYSICAL", 70],
      ["Ice Spinner", "ICE", "PHYSICAL", 80],
      ["Blizzard", "ICE", "PHYSICAL", 100],
      ["Beat Up", "DARK", "PHYSICAL", 120],
      ["Sheer Cold", "ICE", "PHYSICAL", 120],
      ["Permafrost Smash", "ICE", "PHYSICAL", 150],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Ice Time", "ICE", "PHYSICAL", 600]
    ],
    462: [
      // Magnezone — ELECTRIC/STEEL
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electro Ball", "ELECTRIC", "SPECIAL", 55],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Flash Cannon", "STEEL", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Steel Beam", "STEEL", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Alloy Breaker", "STEEL", "SPECIAL", 600],
      ["Mega Thunderstorm", "ELECTRIC", "SPECIAL", 600]
    ],
    464: [
      // Rhyperior — GROUND/ROCK
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Bone Rush", "GROUND", "PHYSICAL", 40],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600]
    ],
    466: [
      // Electivire — ELECTRIC
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 45],
      ["Thunder Fang", "ELECTRIC", "PHYSICAL", 55],
      ["Spark", "ELECTRIC", "PHYSICAL", 65],
      ["Thunder Punch", "ELECTRIC", "PHYSICAL", 75],
      ["Zing Zap", "ELECTRIC", "PHYSICAL", 80],
      ["Supercell Slam", "ELECTRIC", "PHYSICAL", 100],
      ["Aura Wheel", "ELECTRIC", "PHYSICAL", 120],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120],
      ["Volt Breaker", "ELECTRIC", "PHYSICAL", 150],
      ["Bolt Strike", "ELECTRIC", "PHYSICAL", 600],
      ["Static Overload", "ELECTRIC", "PHYSICAL", 600]
    ],
    472: [
      // Gliscor — GROUND/FLYING
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Bone Rush", "GROUND", "PHYSICAL", 40],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600],
      ["Sky Attack", "FLYING", "PHYSICAL", 600]
    ],
    473: [
      // Mamoswine — ICE/GROUND
      ["Icicle Spear", "ICE", "PHYSICAL", 25],
      ["Ice Shard", "ICE", "PHYSICAL", 40],
      ["Avalanche", "ICE", "PHYSICAL", 55],
      ["Ice Fang", "ICE", "PHYSICAL", 65],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Icicle Crash", "ICE", "PHYSICAL", 85],
      ["Mountain Gale", "ICE", "PHYSICAL", 100],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Permafrost Smash", "ICE", "PHYSICAL", 150],
      ["Glacial Lance", "ICE", "PHYSICAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600]
    ],
    476: [
      // Probopass — ROCK/STEEL
      ["Rock Blast", "ROCK", "SPECIAL", 25],
      ["Salt Cure", "ROCK", "SPECIAL", 40],
      ["Smack Down", "ROCK", "SPECIAL", 50],
      ["Ancient Power", "ROCK", "SPECIAL", 60],
      ["Rock Slide", "ROCK", "SPECIAL", 75],
      ["Flash Cannon", "STEEL", "SPECIAL", 80],
      ["Diamond Storm", "ROCK", "SPECIAL", 100],
      ["Power Gem", "ROCK", "SPECIAL", 120],
      ["Steel Beam", "STEEL", "SPECIAL", 120],
      ["Gem Storm", "ROCK", "SPECIAL", 150],
      ["Alloy Breaker", "STEEL", "SPECIAL", 600],
      ["Meteor Beam", "ROCK", "SPECIAL", 600]
    ],
    12479: [
      // Fan Rotom — ELECTRIC/FLYING
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Air Cutter", "FLYING", "SPECIAL", 60],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    11479: [
      // Frost Rotom — ELECTRIC/ICE
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Freeze-Dry", "ICE", "SPECIAL", 70],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Ice Time", "ICE", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    8479: [
      // Heat Rotom — ELECTRIC/FIRE
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    1479: [
      // Mow Rotom — ELECTRIC/GRASS
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Syrup Bomb", "GRASS", "SPECIAL", 60],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Petal Bloom", "GRASS", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    479: [
      // Rotom — ELECTRIC/GHOST
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electro Ball", "ELECTRIC", "SPECIAL", 55],
      ["Infernal Parade", "GHOST", "SPECIAL", 60],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Overdrive", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Mega Thunderstorm", "ELECTRIC", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    9479: [
      // Wash Rotom — ELECTRIC/WATER
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    508: [
      // Stoutland — NORMAL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Hyper Drill", "NORMAL", "PHYSICAL", 100],
      ["Head Charge", "NORMAL", "PHYSICAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    510: [
      // Liepard — DARK
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Snarl", "DARK", "SPECIAL", 55],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Lash Out", "DARK", "PHYSICAL", 75],
      ["Night Daze", "DARK", "SPECIAL", 85],
      ["Dark Pulse", "DARK", "SPECIAL", 90],
      ["Baddy Bad", "DARK", "SPECIAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Umbral Blast", "DARK", "SPECIAL", 150],
      ["Mega Abyss", "DARK", "SPECIAL", 600],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    516: [
      // Simipour — WATER
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600]
    ],
    518: [
      // Musharna — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Mega Mindbreak", "PSYCHIC", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    521: [
      // Unfezant — NORMAL/FLYING
      ["Quick Attack", "NORMAL", "PHYSICAL", 35],
      ["Pay Day", "NORMAL", "PHYSICAL", 40],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Fly", "FLYING", "PHYSICAL", 75],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Hyper Drill", "NORMAL", "PHYSICAL", 100],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Sky Attack", "FLYING", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    523: [
      // Zebstrika — ELECTRIC
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 45],
      ["Spark", "ELECTRIC", "PHYSICAL", 55],
      ["Thunder Fang", "ELECTRIC", "PHYSICAL", 65],
      ["Thunder Punch", "ELECTRIC", "PHYSICAL", 75],
      ["Bolt Beak", "ELECTRIC", "PHYSICAL", 85],
      ["Wild Charge", "ELECTRIC", "PHYSICAL", 90],
      ["Double Shock", "ELECTRIC", "PHYSICAL", 120],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120],
      ["Volt Breaker", "ELECTRIC", "PHYSICAL", 150],
      ["Bolt Strike", "ELECTRIC", "PHYSICAL", 600],
      ["Static Overload", "ELECTRIC", "PHYSICAL", 600]
    ],
    528: [
      // Swoobat — PSYCHIC/FLYING
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    547: [
      // Whimsicott — GRASS/FAIRY
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Absorb", "GRASS", "SPECIAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Razor Leaf", "GRASS", "PHYSICAL", 60],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 75],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    6549: [
      // Hisuian Lilligant — GRASS/FIGHTING
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Bramble Crush", "GRASS", "PHYSICAL", 150],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600]
    ],
    549: [
      // Lilligant — GRASS
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Leaf Tornado", "GRASS", "SPECIAL", 55],
      ["Syrup Bomb", "GRASS", "SPECIAL", 60],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Apple Acid", "GRASS", "SPECIAL", 80],
      ["Grass Knot", "GRASS", "SPECIAL", 100],
      ["Petal Dance", "GRASS", "SPECIAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Mega Bloom", "GRASS", "SPECIAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    553: [
      // Krookodile — GROUND/DARK
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Bonemerang", "GROUND", "PHYSICAL", 45],
      ["Payback", "DARK", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    555: [
      // Darmanitan — FIRE
      ["Fire Spin", "FIRE", "PHYSICAL", 30],
      ["Flame Charge", "FIRE", "PHYSICAL", 45],
      ["Fire Fang", "FIRE", "PHYSICAL", 55],
      ["Flame Wheel", "FIRE", "PHYSICAL", 60],
      ["Fire Punch", "FIRE", "PHYSICAL", 75],
      ["Fire Lash", "FIRE", "PHYSICAL", 80],
      ["Heat Crash", "FIRE", "PHYSICAL", 90],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Raging Fury", "FIRE", "PHYSICAL", 120],
      ["Blazing Charge", "FIRE", "PHYSICAL", 150],
      ["Blast Burn", "FIRE", "PHYSICAL", 600],
      ["Ignition Point", "FIRE", "PHYSICAL", 600]
    ],
    8555: [
      // Darmanitan Zen — FIRE/PSYCHIC
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Burning Jealousy", "FIRE", "SPECIAL", 55],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Flame Burst", "FIRE", "SPECIAL", 70],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    5555: [
      // Galarian Darmanitan — ICE
      ["Triple Axel", "ICE", "PHYSICAL", 25],
      ["Ice Shard", "ICE", "PHYSICAL", 40],
      ["Ice Fang", "ICE", "PHYSICAL", 55],
      ["Avalanche", "ICE", "PHYSICAL", 60],
      ["Ice Punch", "ICE", "PHYSICAL", 75],
      ["Icicle Crash", "ICE", "PHYSICAL", 85],
      ["Mountain Gale", "ICE", "PHYSICAL", 100],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Sheer Cold", "ICE", "PHYSICAL", 120],
      ["Permafrost Smash", "ICE", "PHYSICAL", 150],
      ["Glacial Lance", "ICE", "PHYSICAL", 600],
      ["Ice Time", "ICE", "PHYSICAL", 600]
    ],
    9555: [
      // Galarian Darmanitan Zen — ICE/FIRE
      ["Ice Ball", "ICE", "PHYSICAL", 30],
      ["Icicle Spear", "ICE", "PHYSICAL", 40],
      ["Ice Shard", "ICE", "PHYSICAL", 50],
      ["Avalanche", "ICE", "PHYSICAL", 60],
      ["Ice Fang", "ICE", "PHYSICAL", 70],
      ["Fire Lash", "FIRE", "PHYSICAL", 80],
      ["Icicle Crash", "ICE", "PHYSICAL", 90],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Permafrost Smash", "ICE", "PHYSICAL", 150],
      ["Ice Time", "ICE", "PHYSICAL", 600],
      ["Ignition Point", "FIRE", "PHYSICAL", 600]
    ],
    561: [
      // Sigilyph — PSYCHIC/FLYING
      ["Gust", "FLYING", "SPECIAL", 35],
      ["Air Cutter", "FLYING", "SPECIAL", 45],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Chatter", "FLYING", "SPECIAL", 65],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Oblivion Wing", "FLYING", "SPECIAL", 80],
      ["Aeroblast", "FLYING", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Tempest Gale", "FLYING", "SPECIAL", 150],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    563: [
      // Cofagrigus — GHOST
      ["Lick", "GHOST", "SPECIAL", 30],
      ["Ominous Wind", "GHOST", "SPECIAL", 45],
      ["Night Shade", "GHOST", "SPECIAL", 55],
      ["Infernal Parade", "GHOST", "SPECIAL", 60],
      ["Hex", "GHOST", "SPECIAL", 70],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Bitter Malice", "GHOST", "SPECIAL", 90],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Shadow Force", "GHOST", "SPECIAL", 120],
      ["Phantom Wail", "GHOST", "SPECIAL", 150],
      ["Mega Eclipse", "GHOST", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    565: [
      // Carracosta — WATER/ROCK
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Rock Tomb", "ROCK", "PHYSICAL", 45],
      ["Smack Down", "ROCK", "PHYSICAL", 50],
      ["Stone Axe", "ROCK", "PHYSICAL", 65],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Head Smash", "ROCK", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600]
    ],
    567: [
      // Archeops — ROCK/FLYING
      ["Aerial Ace", "FLYING", "PHYSICAL", 25],
      ["Pluck", "FLYING", "PHYSICAL", 45],
      ["Acrobatics", "FLYING", "PHYSICAL", 55],
      ["Wing Attack", "FLYING", "PHYSICAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Bounce", "FLYING", "PHYSICAL", 85],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Brave Bird", "FLYING", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Skyfall Dive", "FLYING", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600]
    ],
    6571: [
      // Hisuian Zoroark — NORMAL/GHOST
      ["Terrain Pulse", "NORMAL", "SPECIAL", 35],
      ["Echoed Voice", "NORMAL", "SPECIAL", 40],
      ["Round", "NORMAL", "SPECIAL", 55],
      ["Infernal Parade", "GHOST", "SPECIAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Tera Blast", "NORMAL", "SPECIAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Hyper Beam", "NORMAL", "SPECIAL", 150],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    571: [
      // Zoroark — DARK
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Snarl", "DARK", "SPECIAL", 55],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Lash Out", "DARK", "PHYSICAL", 75],
      ["Dark Pulse", "DARK", "SPECIAL", 80],
      ["Night Daze", "DARK", "SPECIAL", 90],
      ["Baddy Bad", "DARK", "SPECIAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Umbral Blast", "DARK", "SPECIAL", 150],
      ["Mega Abyss", "DARK", "SPECIAL", 600],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    573: [
      // Cinccino — NORMAL
      ["Tail Slap", "NORMAL", "PHYSICAL", 25],
      ["Pound", "NORMAL", "PHYSICAL", 40],
      ["Super Fang", "NORMAL", "PHYSICAL", 55],
      ["Slam", "NORMAL", "PHYSICAL", 65],
      ["Facade", "NORMAL", "PHYSICAL", 70],
      ["Take Down", "NORMAL", "PHYSICAL", 85],
      ["Hyper Drill", "NORMAL", "PHYSICAL", 100],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Endeavor", "NORMAL", "PHYSICAL", 120],
      ["Giga Impact", "NORMAL", "PHYSICAL", 150],
      ["Blood Moon", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    576: [
      // Gothitelle — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Mega Mindbreak", "PSYCHIC", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    579: [
      // Reuniclus — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Mega Mindbreak", "PSYCHIC", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    581: [
      // Swanna — WATER/FLYING
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Oblivion Wing", "FLYING", "SPECIAL", 80],
      ["Liquidation", "WATER", "PHYSICAL", 95],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    584: [
      // Vanilluxe — ICE
      ["Powder Snow", "ICE", "SPECIAL", 35],
      ["Frost Breath", "ICE", "SPECIAL", 45],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Aurora Beam", "ICE", "SPECIAL", 65],
      ["Freeze-Dry", "ICE", "SPECIAL", 70],
      ["Ice Beam", "ICE", "SPECIAL", 85],
      ["Freezy Frost", "ICE", "SPECIAL", 90],
      ["Blizzard", "ICE", "SPECIAL", 120],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Absolute Zero", "ICE", "SPECIAL", 150],
      ["Glacial Lance", "ICE", "SPECIAL", 600],
      ["Mega Permafrost", "ICE", "SPECIAL", 600]
    ],
    587: [
      // Emolga — ELECTRIC/FLYING
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Wing Attack", "FLYING", "PHYSICAL", 70],
      ["Spark", "ELECTRIC", "PHYSICAL", 80],
      ["Wild Charge", "ELECTRIC", "PHYSICAL", 90],
      ["Double Shock", "ELECTRIC", "PHYSICAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Volt Breaker", "ELECTRIC", "PHYSICAL", 150],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600],
      ["Mega Thunderstorm", "ELECTRIC", "PHYSICAL", 600]
    ],
    593: [
      // Jellicent — WATER/GHOST
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Brine", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Scald", "WATER", "SPECIAL", 75],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Water Spout", "WATER", "SPECIAL", 150],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    594: [
      // Alomomola — WATER
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Jet Punch", "WATER", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Frost Power", "WATER", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Hydro Cannon", "WATER", "PHYSICAL", 600]
    ],
    596: [
      // Galvantula — BUG/ELECTRIC
      ["Infestation", "BUG", "SPECIAL", 25],
      ["Silver Wind", "BUG", "SPECIAL", 45],
      ["Struggle Bug", "BUG", "SPECIAL", 50],
      ["Signal Beam", "BUG", "SPECIAL", 65],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Leech Life", "BUG", "SPECIAL", 80],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Swarm Pulse", "BUG", "SPECIAL", 150],
      ["Hive Crush", "BUG", "SPECIAL", 600],
      ["Mega Thunderstorm", "ELECTRIC", "SPECIAL", 600]
    ],
    606: [
      // Beheeyem — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600]
    ],
    614: [
      // Beartic — ICE
      ["Triple Axel", "ICE", "PHYSICAL", 25],
      ["Ice Shard", "ICE", "PHYSICAL", 40],
      ["Avalanche", "ICE", "PHYSICAL", 55],
      ["Ice Fang", "ICE", "PHYSICAL", 65],
      ["Ice Punch", "ICE", "PHYSICAL", 75],
      ["Icicle Crash", "ICE", "PHYSICAL", 85],
      ["Mountain Gale", "ICE", "PHYSICAL", 100],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Sheer Cold", "ICE", "PHYSICAL", 120],
      ["Permafrost Smash", "ICE", "PHYSICAL", 150],
      ["Glacial Lance", "ICE", "PHYSICAL", 600],
      ["Mega Permafrost", "ICE", "PHYSICAL", 600]
    ],
    615: [
      // Cryogonal — ICE
      ["Powder Snow", "ICE", "SPECIAL", 35],
      ["Frost Breath", "ICE", "SPECIAL", 45],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Aurora Beam", "ICE", "SPECIAL", 65],
      ["Freeze-Dry", "ICE", "SPECIAL", 70],
      ["Freezy Frost", "ICE", "SPECIAL", 85],
      ["Ice Beam", "ICE", "SPECIAL", 90],
      ["Blizzard", "ICE", "SPECIAL", 120],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Absolute Zero", "ICE", "SPECIAL", 150],
      ["Glacial Lance", "ICE", "SPECIAL", 600],
      ["Ice Burn", "ICE", "SPECIAL", 600]
    ],
    617: [
      // Accelgor — BUG
      ["Infestation", "BUG", "SPECIAL", 25],
      ["Fury Cutter", "BUG", "SPECIAL", 40],
      ["Struggle Bug", "BUG", "SPECIAL", 50],
      ["Silver Wind", "BUG", "SPECIAL", 60],
      ["Signal Beam", "BUG", "SPECIAL", 75],
      ["Leech Life", "BUG", "SPECIAL", 80],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Attack Order", "BUG", "SPECIAL", 120],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Swarm Pulse", "BUG", "SPECIAL", 150],
      ["Hive Crush", "BUG", "SPECIAL", 600],
      ["Mega Swarm", "BUG", "SPECIAL", 600]
    ],
    5618: [
      // Galarian Stunfisk — GROUND/STEEL
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Bonemerang", "GROUND", "PHYSICAL", 45],
      ["Bulldoze", "GROUND", "PHYSICAL", 55],
      ["Hard Press", "STEEL", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Dig", "GROUND", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600]
    ],
    618: [
      // Stunfisk — GROUND/ELECTRIC
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Discharge", "ELECTRIC", "SPECIAL", 75],
      ["Scorching Sands", "GROUND", "SPECIAL", 80],
      ["Thunderbolt", "ELECTRIC", "SPECIAL", 90],
      ["Earth Power", "GROUND", "SPECIAL", 120],
      ["Thunder", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Land's Wrath", "GROUND", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    6628: [
      // Hisuian Braviary — PSYCHIC/FLYING
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Air Cutter", "FLYING", "SPECIAL", 60],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Esper Wing", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    632: [
      // Durant — BUG/STEEL
      ["Fury Cutter", "BUG", "PHYSICAL", 35],
      ["Bug Bite", "BUG", "PHYSICAL", 45],
      ["Revenge", "BUG", "PHYSICAL", 55],
      ["Hard Press", "STEEL", "PHYSICAL", 60],
      ["Skitter Smack", "BUG", "PHYSICAL", 70],
      ["X-Scissor", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Hive Crush", "BUG", "PHYSICAL", 600]
    ],
    637: [
      // Volcarona — BUG/FIRE
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 40],
      ["Incinerate", "FIRE", "SPECIAL", 55],
      ["Silver Wind", "BUG", "SPECIAL", 60],
      ["Flamethrower", "FIRE", "SPECIAL", 75],
      ["Fiery Dance", "FIRE", "SPECIAL", 80],
      ["Heat Wave", "FIRE", "SPECIAL", 95],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Overheat", "FIRE", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Hive Crush", "BUG", "SPECIAL", 600],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    666: [
      // Vivillon — BUG/FLYING
      ["Infestation", "BUG", "SPECIAL", 25],
      ["Silver Wind", "BUG", "SPECIAL", 45],
      ["Struggle Bug", "BUG", "SPECIAL", 50],
      ["Air Cutter", "FLYING", "SPECIAL", 60],
      ["Signal Beam", "BUG", "SPECIAL", 75],
      ["Leech Life", "BUG", "SPECIAL", 80],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Swarm Pulse", "BUG", "SPECIAL", 150],
      ["Hive Crush", "BUG", "SPECIAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    671: [
      // Florges — FAIRY
      ["Disarming Voice", "FAIRY", "SPECIAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 65],
      ["Sparkly Swirl", "FAIRY", "SPECIAL", 75],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Misty Explosion", "FAIRY", "SPECIAL", 100],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Magical Torque", "FAIRY", "SPECIAL", 120],
      ["Lunar Nova", "FAIRY", "SPECIAL", 150],
      ["Mega Radiance", "FAIRY", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    675: [
      // Pangoro — FIGHTING/DARK
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 55],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Submission", "FIGHTING", "PHYSICAL", 80],
      ["Hyperspace Fury", "DARK", "PHYSICAL", 100],
      ["Axe Kick", "FIGHTING", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Focus Punch", "FIGHTING", "PHYSICAL", 150],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    676: [
      // Furfrou — NORMAL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Egg Bomb", "NORMAL", "PHYSICAL", 55],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    681: [
      // Aegislash — STEEL/GHOST · evolui (→ #8681)
      ["Shadow Punch", "GHOST", "PHYSICAL", 25],
      ["Shadow Sneak", "GHOST", "PHYSICAL", 40],
      ["Last Respects", "GHOST", "PHYSICAL", 50],
      ["Ominous Wind", "GHOST", "SPECIAL", 60],
      ["Shadow Claw", "GHOST", "PHYSICAL", 70],
      ["Flash Cannon", "STEEL", "SPECIAL", 80],
      ["Shadow Ball", "GHOST", "SPECIAL", 90],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Phantom Wail", "GHOST", "SPECIAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    8681: [
      // Aegislash Blade — STEEL/GHOST
      ["Shadow Punch", "GHOST", "PHYSICAL", 25],
      ["Shadow Sneak", "GHOST", "PHYSICAL", 40],
      ["Last Respects", "GHOST", "PHYSICAL", 50],
      ["Ominous Wind", "GHOST", "SPECIAL", 60],
      ["Shadow Claw", "GHOST", "PHYSICAL", 70],
      ["Flash Cannon", "STEEL", "SPECIAL", 80],
      ["Shadow Ball", "GHOST", "SPECIAL", 90],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Phantom Wail", "GHOST", "SPECIAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    683: [
      // Aromatisse — FAIRY
      ["Disarming Voice", "FAIRY", "SPECIAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 65],
      ["Sparkly Swirl", "FAIRY", "SPECIAL", 75],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Misty Explosion", "FAIRY", "SPECIAL", 100],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Magical Torque", "FAIRY", "SPECIAL", 120],
      ["Lunar Nova", "FAIRY", "SPECIAL", 150],
      ["Mega Radiance", "FAIRY", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    685: [
      // Slurpuff — FAIRY
      ["Disarming Voice", "FAIRY", "SPECIAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 65],
      ["Spirit Break", "FAIRY", "PHYSICAL", 75],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Play Rough", "FAIRY", "PHYSICAL", 90],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Fae Hammer", "FAIRY", "PHYSICAL", 150],
      ["Mega Radiance", "FAIRY", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "PHYSICAL", 600]
    ],
    693: [
      // Clawitzer — WATER
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Bubble Beam", "WATER", "SPECIAL", 70],
      ["Snipe Shot", "WATER", "SPECIAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Origin Pulse", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Mega Maelstrom", "WATER", "SPECIAL", 600]
    ],
    695: [
      // Heliolisk — ELECTRIC/NORMAL
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Overdrive", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Mega Onslaught", "NORMAL", "SPECIAL", 600],
      ["Mega Thunderstorm", "ELECTRIC", "SPECIAL", 600]
    ],
    697: [
      // Tyrantrum — ROCK/DRAGON
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Dragon Tail", "DRAGON", "PHYSICAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Diamond Storm", "ROCK", "PHYSICAL", 85],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Draconic Soul", "DRAGON", "PHYSICAL", 300],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600]
    ],
    699: [
      // Aurorus — ROCK/ICE
      ["Rock Blast", "ROCK", "SPECIAL", 25],
      ["Ancient Power", "ROCK", "SPECIAL", 45],
      ["Rock Throw", "ROCK", "SPECIAL", 50],
      ["Aurora Beam", "ICE", "SPECIAL", 65],
      ["Rock Slide", "ROCK", "SPECIAL", 75],
      ["Mighty Cleave", "ROCK", "SPECIAL", 85],
      ["Diamond Storm", "ROCK", "SPECIAL", 100],
      ["Power Gem", "ROCK", "SPECIAL", 120],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Gem Storm", "ROCK", "SPECIAL", 150],
      ["Ice Burn", "ICE", "SPECIAL", 600],
      ["Meteor Beam", "ROCK", "SPECIAL", 600]
    ],
    700: [
      // Sylveon — FAIRY
      ["Disarming Voice", "FAIRY", "SPECIAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 65],
      ["Sparkly Swirl", "FAIRY", "SPECIAL", 75],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Misty Explosion", "FAIRY", "SPECIAL", 100],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Magical Torque", "FAIRY", "SPECIAL", 120],
      ["Lunar Nova", "FAIRY", "SPECIAL", 150],
      ["Mega Radiance", "FAIRY", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    702: [
      // Dedenne — ELECTRIC/FAIRY
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 75],
      ["Overdrive", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Mega Thunderstorm", "ELECTRIC", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    703: [
      // Carbink — ROCK/FAIRY
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Smack Down", "ROCK", "PHYSICAL", 45],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Ancient Power", "ROCK", "SPECIAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Power Gem", "ROCK", "SPECIAL", 80],
      ["Moonblast", "FAIRY", "SPECIAL", 95],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Meteor Beam", "ROCK", "SPECIAL", 120],
      ["Gem Storm", "ROCK", "SPECIAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Light of Ruin", "FAIRY", "SPECIAL", 600]
    ],
    707: [
      // Klefki — STEEL/FAIRY
      ["Metal Claw", "STEEL", "PHYSICAL", 35],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Gear Grind", "STEEL", "PHYSICAL", 50],
      ["Flash Cannon", "STEEL", "SPECIAL", 65],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 75],
      ["Mirror Shot", "STEEL", "SPECIAL", 80],
      ["Iron Tail", "STEEL", "PHYSICAL", 100],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Doom Desire", "STEEL", "SPECIAL", 150],
      ["Alloy Breaker", "STEEL", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "PHYSICAL", 600]
    ],
    709: [
      // Trevenant — GHOST/GRASS
      ["Astonish", "GHOST", "PHYSICAL", 30],
      ["Shadow Sneak", "GHOST", "PHYSICAL", 40],
      ["Rage Fist", "GHOST", "PHYSICAL", 50],
      ["Last Respects", "GHOST", "PHYSICAL", 60],
      ["Shadow Claw", "GHOST", "PHYSICAL", 70],
      ["Shadow Bone", "GHOST", "PHYSICAL", 85],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Wood Hammer", "GRASS", "PHYSICAL", 120],
      ["Soul Reaper", "GHOST", "PHYSICAL", 150],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600],
      ["Soul-Stealing 7-Star Strike", "GHOST", "PHYSICAL", 600]
    ],
    711: [
      // Gourgeist — GHOST/GRASS
      ["Astonish", "GHOST", "PHYSICAL", 30],
      ["Shadow Sneak", "GHOST", "PHYSICAL", 40],
      ["Rage Fist", "GHOST", "PHYSICAL", 50],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Shadow Claw", "GHOST", "PHYSICAL", 70],
      ["Shadow Bone", "GHOST", "PHYSICAL", 85],
      ["Phantom Force", "GHOST", "PHYSICAL", 90],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Soul Reaper", "GHOST", "PHYSICAL", 150],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600],
      ["Untold Nightmare", "GHOST", "PHYSICAL", 600]
    ],
    713: [
      // Avalugg — ICE
      ["Triple Axel", "ICE", "PHYSICAL", 25],
      ["Ice Shard", "ICE", "PHYSICAL", 40],
      ["Avalanche", "ICE", "PHYSICAL", 55],
      ["Ice Fang", "ICE", "PHYSICAL", 65],
      ["Ice Punch", "ICE", "PHYSICAL", 75],
      ["Icicle Crash", "ICE", "PHYSICAL", 85],
      ["Mountain Gale", "ICE", "PHYSICAL", 100],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Sheer Cold", "ICE", "PHYSICAL", 120],
      ["Permafrost Smash", "ICE", "PHYSICAL", 150],
      ["Glacial Lance", "ICE", "PHYSICAL", 600],
      ["Mega Permafrost", "ICE", "PHYSICAL", 600]
    ],
    6713: [
      // Hisuian Avalugg — ICE/ROCK
      ["Icicle Spear", "ICE", "PHYSICAL", 25],
      ["Ice Shard", "ICE", "PHYSICAL", 40],
      ["Ice Fang", "ICE", "PHYSICAL", 55],
      ["Avalanche", "ICE", "PHYSICAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Icicle Crash", "ICE", "PHYSICAL", 85],
      ["Mountain Gale", "ICE", "PHYSICAL", 100],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Permafrost Smash", "ICE", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Ice Time", "ICE", "PHYSICAL", 600]
    ],
    715: [
      // Noivern — FLYING/DRAGON
      ["Gust", "FLYING", "SPECIAL", 35],
      ["Air Cutter", "FLYING", "SPECIAL", 45],
      ["Chatter", "FLYING", "SPECIAL", 55],
      ["Oblivion Wing", "FLYING", "SPECIAL", 65],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Aeroblast", "FLYING", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600],
      ["Mega Cataclysm", "DRAGON", "SPECIAL", 600]
    ],
    6724: [
      // Hisuian Decidueye — GRASS/FIGHTING
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Bramble Crush", "GRASS", "PHYSICAL", 150],
      ["Timber Crash", "GRASS", "PHYSICAL", 150],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600]
    ],
    733: [
      // Toucannon — NORMAL/FLYING
      ["Fury Attack", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Drill Peck", "FLYING", "PHYSICAL", 80],
      ["Hyper Drill", "NORMAL", "PHYSICAL", 100],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Sky Attack", "FLYING", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    738: [
      // Vikavolt — BUG/ELECTRIC
      ["Infestation", "BUG", "SPECIAL", 25],
      ["Silver Wind", "BUG", "SPECIAL", 45],
      ["Struggle Bug", "BUG", "SPECIAL", 50],
      ["Signal Beam", "BUG", "SPECIAL", 65],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Leech Life", "BUG", "SPECIAL", 80],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Swarm Pulse", "BUG", "SPECIAL", 150],
      ["Hive Crush", "BUG", "SPECIAL", 600],
      ["Mega Thunderstorm", "ELECTRIC", "SPECIAL", 600]
    ],
    741: [
      // Oricorio — FIRE/FLYING
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Incinerate", "FIRE", "SPECIAL", 55],
      ["Air Cutter", "FLYING", "SPECIAL", 60],
      ["Flame Burst", "FIRE", "SPECIAL", 70],
      ["Fiery Dance", "FIRE", "SPECIAL", 80],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "SPECIAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    9741: [
      // Oricorio Pa'u — PSYCHIC/FLYING
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Air Cutter", "FLYING", "SPECIAL", 60],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Eerie Spell", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    8741: [
      // Oricorio Pom-Pom — ELECTRIC/FLYING
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Air Cutter", "FLYING", "SPECIAL", 60],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    11741: [
      // Oricorio Sensu — GHOST/FLYING
      ["Astonish", "GHOST", "SPECIAL", 30],
      ["Infernal Parade", "GHOST", "SPECIAL", 45],
      ["Night Shade", "GHOST", "SPECIAL", 55],
      ["Air Cutter", "FLYING", "SPECIAL", 60],
      ["Bitter Malice", "GHOST", "SPECIAL", 75],
      ["Hex", "GHOST", "SPECIAL", 80],
      ["Shadow Ball", "GHOST", "SPECIAL", 90],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Phantom Wail", "GHOST", "SPECIAL", 150],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    743: [
      // Ribombee — BUG/FAIRY
      ["Infestation", "BUG", "SPECIAL", 25],
      ["Fury Cutter", "BUG", "SPECIAL", 40],
      ["Struggle Bug", "BUG", "SPECIAL", 50],
      ["Silver Wind", "BUG", "SPECIAL", 60],
      ["Signal Beam", "BUG", "SPECIAL", 75],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Swarm Pulse", "BUG", "SPECIAL", 150],
      ["Hive Crush", "BUG", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    745: [
      // Lycanroc — ROCK
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Rock Tomb", "ROCK", "PHYSICAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Stone Axe", "ROCK", "PHYSICAL", 80],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Rock Wrecker", "ROCK", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Head Smash", "ROCK", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Meteor Beam", "ROCK", "PHYSICAL", 600]
    ],
    9745: [
      // Lycanroc Dusk — ROCK
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Rock Tomb", "ROCK", "PHYSICAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Stone Axe", "ROCK", "PHYSICAL", 80],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Rock Wrecker", "ROCK", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Head Smash", "ROCK", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Meteor Beam", "ROCK", "PHYSICAL", 600]
    ],
    8745: [
      // Lycanroc Midnight — ROCK
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Rock Tomb", "ROCK", "PHYSICAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Stone Axe", "ROCK", "PHYSICAL", 80],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Rock Wrecker", "ROCK", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Head Smash", "ROCK", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Meteor Beam", "ROCK", "PHYSICAL", 600]
    ],
    746: [
      // Wishiwashi — WATER · evolui (→ #8746)
      ["Water Shuriken", "WATER", "SPECIAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Bubble Beam", "WATER", "SPECIAL", 70],
      ["Snipe Shot", "WATER", "SPECIAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Origin Pulse", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600]
    ],
    8746: [
      // Wishiwashi School — WATER
      ["Water Shuriken", "WATER", "SPECIAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Waterfall", "WATER", "PHYSICAL", 75],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Hydro Cannon", "WATER", "PHYSICAL", 600]
    ],
    748: [
      // Toxapex — POISON/WATER
      ["Poison Sting", "POISON", "PHYSICAL", 25],
      ["Poison Fang", "POISON", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Cross Poison", "POISON", "PHYSICAL", 70],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Dire Claw", "POISON", "PHYSICAL", 90],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Venom Crash", "POISON", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Toxic Deluge", "POISON", "PHYSICAL", 600]
    ],
    750: [
      // Mudsdale — GROUND
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Bone Rush", "GROUND", "PHYSICAL", 40],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Fissure", "GROUND", "PHYSICAL", 120],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600]
    ],
    752: [
      // Araquanid — WATER/BUG
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Mega Swarm", "BUG", "PHYSICAL", 600]
    ],
    754: [
      // Lurantis — GRASS
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Wood Hammer", "GRASS", "PHYSICAL", 120],
      ["Bramble Crush", "GRASS", "PHYSICAL", 150],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600]
    ],
    756: [
      // Shiinotic — GRASS/FAIRY
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Leaf Tornado", "GRASS", "SPECIAL", 55],
      ["Syrup Bomb", "GRASS", "SPECIAL", 60],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Grass Knot", "GRASS", "SPECIAL", 100],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Petal Bloom", "GRASS", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    758: [
      // Salazzle — POISON/FIRE
      ["Smog", "POISON", "SPECIAL", 30],
      ["Acid Spray", "POISON", "SPECIAL", 40],
      ["Clear Smog", "POISON", "SPECIAL", 50],
      ["Venoshock", "POISON", "SPECIAL", 65],
      ["Mystical Fire", "FIRE", "SPECIAL", 75],
      ["Sludge Bomb", "POISON", "SPECIAL", 85],
      ["Sludge Wave", "POISON", "SPECIAL", 95],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Toxic Torrent", "POISON", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "SPECIAL", 600],
      ["Toxic Deluge", "POISON", "SPECIAL", 600]
    ],
    764: [
      // Comfey — FAIRY
      ["Disarming Voice", "FAIRY", "SPECIAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 65],
      ["Strange Steam", "FAIRY", "SPECIAL", 75],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Sparkly Swirl", "FAIRY", "SPECIAL", 90],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Magical Torque", "FAIRY", "SPECIAL", 120],
      ["Lunar Nova", "FAIRY", "SPECIAL", 150],
      ["Light of Ruin", "FAIRY", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    770: [
      // Palossand — GHOST/GROUND
      ["Astonish", "GHOST", "SPECIAL", 30],
      ["Ominous Wind", "GHOST", "SPECIAL", 45],
      ["Night Shade", "GHOST", "SPECIAL", 55],
      ["Mud Shot", "GROUND", "SPECIAL", 60],
      ["Hex", "GHOST", "SPECIAL", 70],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Bitter Malice", "GHOST", "SPECIAL", 90],
      ["Earth Power", "GROUND", "SPECIAL", 120],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Phantom Wail", "GHOST", "SPECIAL", 150],
      ["Crossing Fissure", "GROUND", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    771: [
      // Pyukumuku — WATER
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Jet Punch", "WATER", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Frost Power", "WATER", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Hydro Cannon", "WATER", "PHYSICAL", 600]
    ],
    774: [
      // Minior — ROCK/FLYING · evolui (→ #8774)
      ["Rollout", "ROCK", "PHYSICAL", 30],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Air Cutter", "FLYING", "SPECIAL", 60],
      ["Ancient Power", "ROCK", "SPECIAL", 70],
      ["Diamond Storm", "ROCK", "PHYSICAL", 85],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Power Gem", "ROCK", "SPECIAL", 120],
      ["Gem Storm", "ROCK", "SPECIAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    8774: [
      // Minior Core — ROCK/FLYING
      ["Rollout", "ROCK", "PHYSICAL", 30],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Air Cutter", "FLYING", "SPECIAL", 60],
      ["Ancient Power", "ROCK", "SPECIAL", 70],
      ["Diamond Storm", "ROCK", "PHYSICAL", 85],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Power Gem", "ROCK", "SPECIAL", 120],
      ["Gem Storm", "ROCK", "SPECIAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    776: [
      // Turtonator — FIRE/DRAGON
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Incinerate", "FIRE", "SPECIAL", 55],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Flame Burst", "FIRE", "SPECIAL", 70],
      ["Heat Wave", "FIRE", "SPECIAL", 85],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    777: [
      // Togedemaru — ELECTRIC/STEEL
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 45],
      ["Spark", "ELECTRIC", "PHYSICAL", 55],
      ["Thunder Fang", "ELECTRIC", "PHYSICAL", 65],
      ["Thunder Punch", "ELECTRIC", "PHYSICAL", 75],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Wild Charge", "ELECTRIC", "PHYSICAL", 90],
      ["Double Shock", "ELECTRIC", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Volt Breaker", "ELECTRIC", "PHYSICAL", 150],
      ["Mega Forge", "STEEL", "PHYSICAL", 600],
      ["Static Overload", "ELECTRIC", "PHYSICAL", 600]
    ],
    778: [
      // Mimikyu — GHOST/FAIRY
      ["Lick", "GHOST", "PHYSICAL", 30],
      ["Shadow Sneak", "GHOST", "PHYSICAL", 40],
      ["Last Respects", "GHOST", "PHYSICAL", 50],
      ["Rage Fist", "GHOST", "PHYSICAL", 60],
      ["Shadow Claw", "GHOST", "PHYSICAL", 70],
      ["Play Rough", "FAIRY", "PHYSICAL", 85],
      ["Phantom Force", "GHOST", "PHYSICAL", 90],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Soul Reaper", "GHOST", "PHYSICAL", 150],
      ["Let's Snuggle Forever", "FAIRY", "PHYSICAL", 600],
      ["Soul-Stealing 7-Star Strike", "GHOST", "PHYSICAL", 600]
    ],
    779: [
      // Bruxish — WATER/PSYCHIC
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Jet Punch", "WATER", "PHYSICAL", 60],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Psychic Fangs", "PSYCHIC", "PHYSICAL", 600]
    ],
    781: [
      // Dhelmise — GHOST/GRASS
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Branch Poke", "GRASS", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Shadow Claw", "GHOST", "PHYSICAL", 65],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Drum Beating", "GRASS", "PHYSICAL", 80],
      ["Ivy Cudgel", "GRASS", "PHYSICAL", 100],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Bramble Crush", "GRASS", "PHYSICAL", 150],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600],
      ["Untold Nightmare", "GHOST", "PHYSICAL", 600]
    ],
    812: [
      // Rillaboom — GRASS
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Wood Hammer", "GRASS", "PHYSICAL", 120],
      ["Bramble Crush", "GRASS", "PHYSICAL", 150],
      ["Timber Crash", "GRASS", "PHYSICAL", 150],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600]
    ],
    818: [
      // Inteleon — WATER
      ["Water Shuriken", "WATER", "SPECIAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Bubble Beam", "WATER", "SPECIAL", 70],
      ["Snipe Shot", "WATER", "SPECIAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Origin Pulse", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Water Spout", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600]
    ],
    820: [
      // Greedent — NORMAL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Egg Bomb", "NORMAL", "PHYSICAL", 55],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    823: [
      // Corviknight — FLYING/STEEL
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 35],
      ["Peck", "FLYING", "PHYSICAL", 40],
      ["Acrobatics", "FLYING", "PHYSICAL", 55],
      ["Hard Press", "STEEL", "PHYSICAL", 60],
      ["Drill Peck", "FLYING", "PHYSICAL", 75],
      ["Bounce", "FLYING", "PHYSICAL", 85],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Skyfall Dive", "FLYING", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600]
    ],
    826: [
      // Orbeetle — BUG/PSYCHIC
      ["Infestation", "BUG", "SPECIAL", 25],
      ["Fury Cutter", "BUG", "SPECIAL", 40],
      ["Struggle Bug", "BUG", "SPECIAL", 50],
      ["Silver Wind", "BUG", "SPECIAL", 60],
      ["Signal Beam", "BUG", "SPECIAL", 75],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Swarm Pulse", "BUG", "SPECIAL", 150],
      ["Hive Crush", "BUG", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    828: [
      // Thievul — DARK
      ["Power Trip", "DARK", "SPECIAL", 25],
      ["Fling", "DARK", "SPECIAL", 40],
      ["Snarl", "DARK", "SPECIAL", 55],
      ["Dark Pulse", "DARK", "SPECIAL", 65],
      ["Night Slash", "DARK", "SPECIAL", 70],
      ["Night Daze", "DARK", "SPECIAL", 85],
      ["Fiery Wrath", "DARK", "SPECIAL", 90],
      ["Baddy Bad", "DARK", "SPECIAL", 120],
      ["Pursuit", "DARK", "SPECIAL", 120],
      ["Umbral Blast", "DARK", "SPECIAL", 150],
      ["Endless Hollow", "DARK", "SPECIAL", 600],
      ["Wicked Blow", "DARK", "SPECIAL", 600]
    ],
    830: [
      // Eldegoss — GRASS
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Syrup Bomb", "GRASS", "SPECIAL", 55],
      ["Magical Leaf", "GRASS", "SPECIAL", 60],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Apple Acid", "GRASS", "SPECIAL", 80],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Petal Dance", "GRASS", "SPECIAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Frenzy Plant", "GRASS", "SPECIAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    832: [
      // Dubwool — NORMAL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Egg Bomb", "NORMAL", "PHYSICAL", 55],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    834: [
      // Drednaw — WATER/ROCK
      ["Clamp", "WATER", "PHYSICAL", 35],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Rock Tomb", "ROCK", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Waterfall", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600]
    ],
    836: [
      // Boltund — ELECTRIC
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 50],
      ["Spark", "ELECTRIC", "PHYSICAL", 65],
      ["Thunder Punch", "ELECTRIC", "PHYSICAL", 75],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Thunderbolt", "ELECTRIC", "SPECIAL", 90],
      ["Double Shock", "ELECTRIC", "PHYSICAL", 120],
      ["Thunder", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Bolt Strike", "ELECTRIC", "PHYSICAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    839: [
      // Coalossal — ROCK/FIRE
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Ancient Power", "ROCK", "SPECIAL", 70],
      ["Diamond Storm", "ROCK", "PHYSICAL", 85],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Power Gem", "ROCK", "SPECIAL", 120],
      ["Gem Storm", "ROCK", "SPECIAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    841: [
      // Flapple — GRASS/DRAGON
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Dragon Tail", "DRAGON", "PHYSICAL", 60],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Grav Apple", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Draconic Soul", "DRAGON", "PHYSICAL", 300],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600]
    ],
    842: [
      // Appletun — GRASS/DRAGON
      ["Magical Leaf", "GRASS", "SPECIAL", 30],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Syrup Bomb", "GRASS", "SPECIAL", 55],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Apple Acid", "GRASS", "SPECIAL", 80],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    844: [
      // Sandaconda — GROUND
      ["Bone Rush", "GROUND", "PHYSICAL", 25],
      ["Sand Tomb", "GROUND", "PHYSICAL", 40],
      ["Bone Club", "GROUND", "PHYSICAL", 55],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Fissure", "GROUND", "PHYSICAL", 120],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600]
    ],
    845: [
      // Cramorant — FLYING/WATER
      ["Peck", "FLYING", "PHYSICAL", 35],
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 40],
      ["Acrobatics", "FLYING", "PHYSICAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Air Cutter", "FLYING", "SPECIAL", 70],
      ["Air Slash", "FLYING", "SPECIAL", 80],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Tempest Gale", "FLYING", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    847: [
      // Barraskewda — WATER
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Jet Punch", "WATER", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Frost Power", "WATER", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Hydro Cannon", "WATER", "PHYSICAL", 600]
    ],
    849: [
      // Toxtricity — ELECTRIC/POISON
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Venoshock", "POISON", "SPECIAL", 65],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600],
      ["Toxic Deluge", "POISON", "SPECIAL", 600]
    ],
    851: [
      // Centiskorch — FIRE/BUG
      ["Fire Spin", "FIRE", "PHYSICAL", 30],
      ["Flame Wheel", "FIRE", "PHYSICAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Fire Fang", "FIRE", "PHYSICAL", 70],
      ["Fire Lash", "FIRE", "PHYSICAL", 80],
      ["Heat Crash", "FIRE", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Blazing Charge", "FIRE", "PHYSICAL", 150],
      ["Hive Crush", "BUG", "PHYSICAL", 600],
      ["Ignition Point", "FIRE", "PHYSICAL", 600]
    ],
    853: [
      // Grapploct — FIGHTING
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 55],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Submission", "FIGHTING", "PHYSICAL", 80],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Axe Kick", "FIGHTING", "PHYSICAL", 120],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Focus Punch", "FIGHTING", "PHYSICAL", 150],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    855: [
      // Polteageist — GHOST
      ["Shadow Punch", "GHOST", "SPECIAL", 25],
      ["Ominous Wind", "GHOST", "SPECIAL", 45],
      ["Night Shade", "GHOST", "SPECIAL", 55],
      ["Infernal Parade", "GHOST", "SPECIAL", 60],
      ["Hex", "GHOST", "SPECIAL", 70],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Bitter Malice", "GHOST", "SPECIAL", 90],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Shadow Force", "GHOST", "SPECIAL", 120],
      ["Phantom Wail", "GHOST", "SPECIAL", 150],
      ["Astral Barrage", "GHOST", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    858: [
      // Hatterene — PSYCHIC/FAIRY
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 60],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    861: [
      // Grimmsnarl — DARK/FAIRY
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Beat Up", "DARK", "PHYSICAL", 55],
      ["Spirit Break", "FAIRY", "PHYSICAL", 65],
      ["Night Slash", "DARK", "PHYSICAL", 70],
      ["Darkest Lariat", "DARK", "PHYSICAL", 85],
      ["Foul Play", "DARK", "PHYSICAL", 95],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Midnight Ravage", "DARK", "PHYSICAL", 150],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Starlight Charm", "FAIRY", "PHYSICAL", 600]
    ],
    862: [
      // Obstagoon — DARK/NORMAL
      ["Payback", "DARK", "PHYSICAL", 35],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Beat Up", "DARK", "PHYSICAL", 55],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Night Slash", "DARK", "PHYSICAL", 70],
      ["Throat Chop", "DARK", "PHYSICAL", 80],
      ["Darkest Lariat", "DARK", "PHYSICAL", 90],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Midnight Ravage", "DARK", "PHYSICAL", 150],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    863: [
      // Perrserker — STEEL
      ["Metal Claw", "STEEL", "PHYSICAL", 35],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Gear Grind", "STEEL", "PHYSICAL", 50],
      ["Hard Press", "STEEL", "PHYSICAL", 60],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Meteor Mash", "STEEL", "PHYSICAL", 90],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Steel Roller", "STEEL", "PHYSICAL", 120],
      ["Gigaton Hammer", "STEEL", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Steel Beam", "STEEL", "PHYSICAL", 600]
    ],
    864: [
      // Cursola — GHOST
      ["Shadow Punch", "GHOST", "SPECIAL", 25],
      ["Ominous Wind", "GHOST", "SPECIAL", 45],
      ["Night Shade", "GHOST", "SPECIAL", 55],
      ["Infernal Parade", "GHOST", "SPECIAL", 60],
      ["Hex", "GHOST", "SPECIAL", 70],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Bitter Malice", "GHOST", "SPECIAL", 90],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Shadow Force", "GHOST", "SPECIAL", 120],
      ["Phantom Wail", "GHOST", "SPECIAL", 150],
      ["Astral Barrage", "GHOST", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    865: [
      // Sirfetch'd — FIGHTING
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 55],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Submission", "FIGHTING", "PHYSICAL", 80],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Axe Kick", "FIGHTING", "PHYSICAL", 120],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Focus Punch", "FIGHTING", "PHYSICAL", 150],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    866: [
      // Mr. Rime — ICE/PSYCHIC
      ["Powder Snow", "ICE", "SPECIAL", 35],
      ["Frost Breath", "ICE", "SPECIAL", 45],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Freeze-Dry", "ICE", "SPECIAL", 70],
      ["Freezy Frost", "ICE", "SPECIAL", 85],
      ["Ice Beam", "ICE", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Absolute Zero", "ICE", "SPECIAL", 150],
      ["Ice Time", "ICE", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    867: [
      // Runerigus — GROUND/GHOST
      ["Bone Rush", "GROUND", "PHYSICAL", 25],
      ["Sand Tomb", "GROUND", "PHYSICAL", 40],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Shadow Claw", "GHOST", "PHYSICAL", 70],
      ["Earthquake", "GROUND", "PHYSICAL", 85],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Untold Nightmare", "GHOST", "PHYSICAL", 600]
    ],
    869: [
      // Alcremie — FAIRY
      ["Disarming Voice", "FAIRY", "SPECIAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 65],
      ["Sparkly Swirl", "FAIRY", "SPECIAL", 75],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Misty Explosion", "FAIRY", "SPECIAL", 100],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Magical Torque", "FAIRY", "SPECIAL", 120],
      ["Lunar Nova", "FAIRY", "SPECIAL", 150],
      ["Mega Radiance", "FAIRY", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    873: [
      // Frosmoth — ICE/BUG
      ["Powder Snow", "ICE", "SPECIAL", 35],
      ["Frost Breath", "ICE", "SPECIAL", 45],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Silver Wind", "BUG", "SPECIAL", 60],
      ["Freeze-Dry", "ICE", "SPECIAL", 70],
      ["Aurora Beam", "ICE", "SPECIAL", 80],
      ["Ice Beam", "ICE", "SPECIAL", 90],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Absolute Zero", "ICE", "SPECIAL", 150],
      ["Hive Crush", "BUG", "SPECIAL", 600],
      ["Ice Time", "ICE", "SPECIAL", 600]
    ],
    875: [
      // Eiscue — ICE
      ["Triple Axel", "ICE", "PHYSICAL", 25],
      ["Ice Shard", "ICE", "PHYSICAL", 40],
      ["Ice Fang", "ICE", "PHYSICAL", 55],
      ["Avalanche", "ICE", "PHYSICAL", 60],
      ["Ice Punch", "ICE", "PHYSICAL", 75],
      ["Icicle Crash", "ICE", "PHYSICAL", 85],
      ["Mountain Gale", "ICE", "PHYSICAL", 100],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Sheer Cold", "ICE", "PHYSICAL", 120],
      ["Permafrost Smash", "ICE", "PHYSICAL", 150],
      ["Glacial Lance", "ICE", "PHYSICAL", 600],
      ["Ice Time", "ICE", "PHYSICAL", 600]
    ],
    876: [
      // Indeedee — PSYCHIC/NORMAL
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Round", "NORMAL", "SPECIAL", 60],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Expanding Force", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600]
    ],
    877: [
      // Morpeko — ELECTRIC/DARK
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 45],
      ["Thunder Fang", "ELECTRIC", "PHYSICAL", 55],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Thunder Punch", "ELECTRIC", "PHYSICAL", 75],
      ["Spark", "ELECTRIC", "PHYSICAL", 80],
      ["Wild Charge", "ELECTRIC", "PHYSICAL", 90],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120],
      ["Volt Breaker", "ELECTRIC", "PHYSICAL", 150],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Static Overload", "ELECTRIC", "PHYSICAL", 600]
    ],
    879: [
      // Copperajah — STEEL
      ["Metal Claw", "STEEL", "PHYSICAL", 35],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Gear Grind", "STEEL", "PHYSICAL", 50],
      ["Hard Press", "STEEL", "PHYSICAL", 60],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Meteor Mash", "STEEL", "PHYSICAL", 90],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Steel Roller", "STEEL", "PHYSICAL", 120],
      ["Gigaton Hammer", "STEEL", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Steel Beam", "STEEL", "PHYSICAL", 600]
    ],
    880: [
      // Dracozolt — ELECTRIC/DRAGON
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 45],
      ["Thunder Fang", "ELECTRIC", "PHYSICAL", 55],
      ["Dragon Tail", "DRAGON", "PHYSICAL", 60],
      ["Thunder Punch", "ELECTRIC", "PHYSICAL", 75],
      ["Bolt Beak", "ELECTRIC", "PHYSICAL", 85],
      ["Wild Charge", "ELECTRIC", "PHYSICAL", 90],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120],
      ["Draconic Soul", "DRAGON", "PHYSICAL", 300],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Static Overload", "ELECTRIC", "PHYSICAL", 600]
    ],
    882: [
      // Dracovish — WATER/DRAGON
      ["Clamp", "WATER", "PHYSICAL", 35],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Dragon Tail", "DRAGON", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Fishious Rend", "WATER", "PHYSICAL", 85],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Draconic Soul", "DRAGON", "PHYSICAL", 300],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600]
    ],
    899: [
      // Wyrdeer — NORMAL/PSYCHIC
      ["Tackle", "NORMAL", "PHYSICAL", 35],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Egg Bomb", "NORMAL", "PHYSICAL", 55],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 65],
      ["Uproar", "NORMAL", "SPECIAL", 75],
      ["Tera Blast", "NORMAL", "SPECIAL", 80],
      ["Swift", "NORMAL", "SPECIAL", 100],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Hyper Beam", "NORMAL", "SPECIAL", 150],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600]
    ],
    900: [
      // Kleavor — BUG/ROCK
      ["Pounce", "BUG", "PHYSICAL", 35],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Revenge", "BUG", "PHYSICAL", 55],
      ["Rock Tomb", "ROCK", "PHYSICAL", 60],
      ["Skitter Smack", "BUG", "PHYSICAL", 70],
      ["Lunge", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Hive Crush", "BUG", "PHYSICAL", 600]
    ],
    8901: [
      // Bloodmoon Ursaluna — GROUND/NORMAL
      ["Mud-Slap", "GROUND", "SPECIAL", 25],
      ["Mud Shot", "GROUND", "SPECIAL", 45],
      ["Terrain Pulse", "NORMAL", "SPECIAL", 50],
      ["Mud Bomb", "GROUND", "SPECIAL", 65],
      ["Scorching Sands", "GROUND", "SPECIAL", 70],
      ["Drill Run", "GROUND", "SPECIAL", 80],
      ["Thousand Waves", "GROUND", "SPECIAL", 90],
      ["Earth Power", "GROUND", "SPECIAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Seismic Blast", "GROUND", "SPECIAL", 150],
      ["Crossing Fissure", "GROUND", "SPECIAL", 600],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600]
    ],
    901: [
      // Ursaluna — GROUND/NORMAL
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Bonemerang", "GROUND", "PHYSICAL", 45],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    902: [
      // Basculegion — WATER/GHOST
      ["Clamp", "WATER", "PHYSICAL", 35],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Shadow Claw", "GHOST", "PHYSICAL", 65],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Waterfall", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Untold Nightmare", "GHOST", "PHYSICAL", 600]
    ],
    8902: [
      // Basculegion Female — WATER/GHOST
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Shadow Claw", "GHOST", "PHYSICAL", 65],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Surf", "WATER", "SPECIAL", 85],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "PHYSICAL", 600]
    ],
    903: [
      // Sneasler — FIGHTING/POISON
      ["Rock Smash", "FIGHTING", "PHYSICAL", 35],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 55],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Brick Break", "FIGHTING", "PHYSICAL", 80],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Focus Punch", "FIGHTING", "PHYSICAL", 150],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600],
      ["Toxic Deluge", "POISON", "PHYSICAL", 600]
    ],
    904: [
      // Overqwil — DARK/POISON
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Beat Up", "DARK", "PHYSICAL", 55],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Night Slash", "DARK", "PHYSICAL", 70],
      ["Crunch", "DARK", "PHYSICAL", 80],
      ["Darkest Lariat", "DARK", "PHYSICAL", 90],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Midnight Ravage", "DARK", "PHYSICAL", 150],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Toxic Deluge", "POISON", "PHYSICAL", 600]
    ],
    908: [
      // Meowscarada — GRASS/DARK
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Bramble Crush", "GRASS", "PHYSICAL", 150],
      ["Timber Crash", "GRASS", "PHYSICAL", 150],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600]
    ],
    911: [
      // Skeledirge — FIRE/GHOST
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Burning Jealousy", "FIRE", "SPECIAL", 55],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Flame Burst", "FIRE", "SPECIAL", 70],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Mind Blown", "FIRE", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    914: [
      // Quaquaval — WATER/FIGHTING
      ["Clamp", "WATER", "PHYSICAL", 35],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Aqua Step", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Frost Power", "WATER", "PHYSICAL", 150],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    916: [
      // Oinkologne — NORMAL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Egg Bomb", "NORMAL", "PHYSICAL", 55],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    918: [
      // Spidops — BUG
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Revenge", "BUG", "PHYSICAL", 55],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Skitter Smack", "BUG", "PHYSICAL", 70],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Bug Buzz", "BUG", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Hive Crush", "BUG", "PHYSICAL", 600],
      ["Megahorn", "BUG", "PHYSICAL", 600]
    ],
    920: [
      // Lokix — BUG/DARK
      ["Pounce", "BUG", "PHYSICAL", 35],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Revenge", "BUG", "PHYSICAL", 55],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Skitter Smack", "BUG", "PHYSICAL", 70],
      ["Lunge", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Hive Crush", "BUG", "PHYSICAL", 600]
    ],
    923: [
      // Pawmot — ELECTRIC/FIGHTING
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 45],
      ["Thunder Fang", "ELECTRIC", "PHYSICAL", 55],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Thunder Punch", "ELECTRIC", "PHYSICAL", 75],
      ["Spark", "ELECTRIC", "PHYSICAL", 80],
      ["Wild Charge", "ELECTRIC", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120],
      ["Volt Breaker", "ELECTRIC", "PHYSICAL", 150],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600],
      ["Static Overload", "ELECTRIC", "PHYSICAL", 600]
    ],
    925: [
      // Maushold — NORMAL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Egg Bomb", "NORMAL", "PHYSICAL", 55],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    927: [
      // Dachsbun — FAIRY
      ["Disarming Voice", "FAIRY", "PHYSICAL", 25],
      ["Fairy Wind", "FAIRY", "PHYSICAL", 40],
      ["Draining Kiss", "FAIRY", "PHYSICAL", 50],
      ["Dazzling Gleam", "FAIRY", "PHYSICAL", 65],
      ["Spirit Break", "FAIRY", "PHYSICAL", 75],
      ["Alluring Voice", "FAIRY", "PHYSICAL", 80],
      ["Play Rough", "FAIRY", "PHYSICAL", 90],
      ["Fleur Cannon", "FAIRY", "PHYSICAL", 120],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Fae Hammer", "FAIRY", "PHYSICAL", 150],
      ["Light of Ruin", "FAIRY", "PHYSICAL", 600],
      ["Starlight Charm", "FAIRY", "PHYSICAL", 600]
    ],
    930: [
      // Arboliva — GRASS/NORMAL
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Syrup Bomb", "GRASS", "SPECIAL", 55],
      ["Round", "NORMAL", "SPECIAL", 60],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Grass Knot", "GRASS", "SPECIAL", 85],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Petal Bloom", "GRASS", "SPECIAL", 600],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600]
    ],
    931: [
      // Squawkabilly — NORMAL/FLYING
      ["Fury Attack", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Egg Bomb", "NORMAL", "PHYSICAL", 55],
      ["Wing Attack", "FLYING", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Headbutt", "NORMAL", "PHYSICAL", 80],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    934: [
      // Garganacl — ROCK
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Rock Tomb", "ROCK", "PHYSICAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Stone Axe", "ROCK", "PHYSICAL", 80],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Rock Wrecker", "ROCK", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Head Smash", "ROCK", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Meteor Beam", "ROCK", "PHYSICAL", 600]
    ],
    936: [
      // Armarouge — FIRE/PSYCHIC
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Burning Jealousy", "FIRE", "SPECIAL", 55],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    939: [
      // Bellibolt — ELECTRIC
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Overdrive", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Thunder", "ELECTRIC", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Bolt Strike", "ELECTRIC", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    941: [
      // Kilowattrel — ELECTRIC/FLYING
      ["Charge Beam", "ELECTRIC", "SPECIAL", 35],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Air Cutter", "FLYING", "SPECIAL", 60],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    943: [
      // Mabosstiff — DARK
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Beat Up", "DARK", "PHYSICAL", 55],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Night Slash", "DARK", "PHYSICAL", 70],
      ["Crunch", "DARK", "PHYSICAL", 80],
      ["Darkest Lariat", "DARK", "PHYSICAL", 90],
      ["Baddy Bad", "DARK", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Midnight Ravage", "DARK", "PHYSICAL", 150],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    945: [
      // Grafaiai — POISON/NORMAL
      ["Poison Fang", "POISON", "PHYSICAL", 35],
      ["Mortal Spin", "POISON", "PHYSICAL", 40],
      ["Poison Tail", "POISON", "PHYSICAL", 50],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Cross Poison", "POISON", "PHYSICAL", 70],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Poison Jab", "POISON", "PHYSICAL", 90],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Venom Crash", "POISON", "PHYSICAL", 150],
      ["Toxic Deluge", "POISON", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    947: [
      // Brambleghast — GRASS/GHOST
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Shadow Claw", "GHOST", "PHYSICAL", 65],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Bramble Crush", "GRASS", "PHYSICAL", 150],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600],
      ["Untold Nightmare", "GHOST", "PHYSICAL", 600]
    ],
    950: [
      // Klawf — ROCK
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Rock Tomb", "ROCK", "PHYSICAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Stone Axe", "ROCK", "PHYSICAL", 80],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Rock Wrecker", "ROCK", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Head Smash", "ROCK", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Meteor Beam", "ROCK", "PHYSICAL", 600]
    ],
    954: [
      // Rabsca — BUG/PSYCHIC
      ["Infestation", "BUG", "SPECIAL", 25],
      ["Pounce", "BUG", "SPECIAL", 45],
      ["Struggle Bug", "BUG", "SPECIAL", 50],
      ["Silver Wind", "BUG", "SPECIAL", 60],
      ["Signal Beam", "BUG", "SPECIAL", 75],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Swarm Pulse", "BUG", "SPECIAL", 150],
      ["Hive Crush", "BUG", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    956: [
      // Espathra — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600]
    ],
    959: [
      // Tinkaton — FAIRY/STEEL
      ["Disarming Voice", "FAIRY", "SPECIAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Spirit Break", "FAIRY", "PHYSICAL", 65],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Play Rough", "FAIRY", "PHYSICAL", 90],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Fae Hammer", "FAIRY", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "PHYSICAL", 600]
    ],
    961: [
      // Wugtrio — WATER
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Jet Punch", "WATER", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Frost Power", "WATER", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Hydro Cannon", "WATER", "PHYSICAL", 600]
    ],
    962: [
      // Bombirdier — FLYING/DARK
      ["Peck", "FLYING", "PHYSICAL", 35],
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 40],
      ["Acrobatics", "FLYING", "PHYSICAL", 55],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Drill Peck", "FLYING", "PHYSICAL", 75],
      ["Bounce", "FLYING", "PHYSICAL", 85],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Skyfall Dive", "FLYING", "PHYSICAL", 150],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600]
    ],
    964: [
      // Palafin — WATER · evolui (→ #8964)
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Jet Punch", "WATER", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Frost Power", "WATER", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Hydro Cannon", "WATER", "PHYSICAL", 600]
    ],
    8964: [
      // Palafin Hero — WATER
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Jet Punch", "WATER", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Frost Power", "WATER", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Hydro Cannon", "WATER", "PHYSICAL", 600]
    ],
    966: [
      // Revavroom — STEEL/POISON
      ["Gear Grind", "STEEL", "PHYSICAL", 35],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Gyro Ball", "STEEL", "PHYSICAL", 55],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Iron Head", "STEEL", "PHYSICAL", 80],
      ["Meteor Mash", "STEEL", "PHYSICAL", 90],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Gigaton Hammer", "STEEL", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Toxic Deluge", "POISON", "PHYSICAL", 600]
    ],
    968: [
      // Orthworm — STEEL
      ["Metal Claw", "STEEL", "PHYSICAL", 35],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Gear Grind", "STEEL", "PHYSICAL", 50],
      ["Hard Press", "STEEL", "PHYSICAL", 60],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Meteor Mash", "STEEL", "PHYSICAL", 90],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Steel Roller", "STEEL", "PHYSICAL", 120],
      ["Gigaton Hammer", "STEEL", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Steel Beam", "STEEL", "PHYSICAL", 600]
    ],
    970: [
      // Glimmora — ROCK/POISON
      ["Rock Blast", "ROCK", "SPECIAL", 25],
      ["Salt Cure", "ROCK", "SPECIAL", 40],
      ["Rock Throw", "ROCK", "SPECIAL", 50],
      ["Ancient Power", "ROCK", "SPECIAL", 60],
      ["Rock Slide", "ROCK", "SPECIAL", 75],
      ["Sludge Wave", "POISON", "SPECIAL", 85],
      ["Diamond Storm", "ROCK", "SPECIAL", 100],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Power Gem", "ROCK", "SPECIAL", 120],
      ["Gem Storm", "ROCK", "SPECIAL", 150],
      ["Crumbling Rain", "ROCK", "SPECIAL", 600],
      ["Toxic Deluge", "POISON", "SPECIAL", 600]
    ],
    972: [
      // Houndstone — GHOST
      ["Shadow Punch", "GHOST", "PHYSICAL", 25],
      ["Shadow Sneak", "GHOST", "PHYSICAL", 40],
      ["Rage Fist", "GHOST", "PHYSICAL", 50],
      ["Last Respects", "GHOST", "PHYSICAL", 60],
      ["Shadow Claw", "GHOST", "PHYSICAL", 70],
      ["Shadow Bone", "GHOST", "PHYSICAL", 85],
      ["Phantom Force", "GHOST", "PHYSICAL", 90],
      ["Poltergeist", "GHOST", "PHYSICAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Soul Reaper", "GHOST", "PHYSICAL", 150],
      ["Astral Barrage", "GHOST", "PHYSICAL", 600],
      ["Untold Nightmare", "GHOST", "PHYSICAL", 600]
    ],
    973: [
      // Flamigo — FLYING/FIGHTING
      ["Peck", "FLYING", "PHYSICAL", 35],
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 40],
      ["Acrobatics", "FLYING", "PHYSICAL", 55],
      ["Wing Attack", "FLYING", "PHYSICAL", 60],
      ["Submission", "FIGHTING", "PHYSICAL", 75],
      ["Drill Peck", "FLYING", "PHYSICAL", 80],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Skyfall Dive", "FLYING", "PHYSICAL", 150],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    975: [
      // Cetitan — ICE
      ["Triple Axel", "ICE", "PHYSICAL", 25],
      ["Ice Shard", "ICE", "PHYSICAL", 40],
      ["Ice Fang", "ICE", "PHYSICAL", 55],
      ["Avalanche", "ICE", "PHYSICAL", 60],
      ["Ice Punch", "ICE", "PHYSICAL", 75],
      ["Icicle Crash", "ICE", "PHYSICAL", 85],
      ["Mountain Gale", "ICE", "PHYSICAL", 100],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Sheer Cold", "ICE", "PHYSICAL", 120],
      ["Permafrost Smash", "ICE", "PHYSICAL", 150],
      ["Glacial Lance", "ICE", "PHYSICAL", 600],
      ["Ice Time", "ICE", "PHYSICAL", 600]
    ],
    976: [
      // Veluza — WATER/PSYCHIC
      ["Clamp", "WATER", "PHYSICAL", 35],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 65],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Waterfall", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600]
    ],
    977: [
      // Dondozo — WATER
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Jet Punch", "WATER", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Frost Power", "WATER", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Hydro Cannon", "WATER", "PHYSICAL", 600]
    ],
    980: [
      // Clodsire — POISON/GROUND
      ["Poison Sting", "POISON", "PHYSICAL", 25],
      ["Poison Fang", "POISON", "PHYSICAL", 45],
      ["Poison Tail", "POISON", "PHYSICAL", 50],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Cross Poison", "POISON", "PHYSICAL", 70],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Poison Jab", "POISON", "PHYSICAL", 90],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Venom Crash", "POISON", "PHYSICAL", 150],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Toxic Deluge", "POISON", "PHYSICAL", 600]
    ],
    981: [
      // Farigiraf — NORMAL/PSYCHIC
      ["Terrain Pulse", "NORMAL", "SPECIAL", 35],
      ["Echoed Voice", "NORMAL", "SPECIAL", 40],
      ["Weather Ball", "NORMAL", "SPECIAL", 50],
      ["Round", "NORMAL", "SPECIAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Hyper Beam", "NORMAL", "SPECIAL", 150],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600]
    ],
    982: [
      // Dudunsparce — NORMAL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Egg Bomb", "NORMAL", "PHYSICAL", 55],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    983: [
      // Kingambit — DARK/STEEL
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Beat Up", "DARK", "PHYSICAL", 55],
      ["Hard Press", "STEEL", "PHYSICAL", 60],
      ["Night Slash", "DARK", "PHYSICAL", 70],
      ["Kowtow Cleave", "DARK", "PHYSICAL", 85],
      ["Darkest Lariat", "DARK", "PHYSICAL", 90],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Midnight Ravage", "DARK", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Endless Hollow", "DARK", "PHYSICAL", 600]
    ],
    984: [
      // Great Tusk — GROUND/FIGHTING
      ["Bone Rush", "GROUND", "PHYSICAL", 25],
      ["Sand Tomb", "GROUND", "PHYSICAL", 40],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Submission", "FIGHTING", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    985: [
      // Scream Tail — FAIRY/PSYCHIC
      ["Disarming Voice", "FAIRY", "SPECIAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Spirit Break", "FAIRY", "PHYSICAL", 65],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 80],
      ["Play Rough", "FAIRY", "PHYSICAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Fae Hammer", "FAIRY", "PHYSICAL", 150],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    986: [
      // Brute Bonnet — GRASS/DARK
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Bramble Crush", "GRASS", "PHYSICAL", 150],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600]
    ],
    987: [
      // Flutter Mane — GHOST/FAIRY
      ["Astonish", "GHOST", "SPECIAL", 30],
      ["Infernal Parade", "GHOST", "SPECIAL", 45],
      ["Hex", "GHOST", "SPECIAL", 55],
      ["Night Shade", "GHOST", "SPECIAL", 60],
      ["Bitter Malice", "GHOST", "SPECIAL", 75],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Shadow Ball", "GHOST", "SPECIAL", 90],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Phantom Wail", "GHOST", "SPECIAL", 150],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    988: [
      // Slither Wing — BUG/FIGHTING
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Revenge", "BUG", "PHYSICAL", 55],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Skitter Smack", "BUG", "PHYSICAL", 70],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Hive Crush", "BUG", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    989: [
      // Sandy Shocks — ELECTRIC/GROUND
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Charge Beam", "ELECTRIC", "SPECIAL", 50],
      ["Mud Bomb", "GROUND", "SPECIAL", 65],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Overdrive", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Earth Power", "GROUND", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Mega Thunderstorm", "ELECTRIC", "SPECIAL", 600],
      ["Sandsear Storm", "GROUND", "SPECIAL", 600]
    ],
    990: [
      // Iron Treads — GROUND/STEEL
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Bonemerang", "GROUND", "PHYSICAL", 45],
      ["Bulldoze", "GROUND", "PHYSICAL", 55],
      ["Hard Press", "STEEL", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["High Horsepower", "GROUND", "PHYSICAL", 85],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600]
    ],
    991: [
      // Iron Bundle — ICE/WATER
      ["Powder Snow", "ICE", "SPECIAL", 35],
      ["Frost Breath", "ICE", "SPECIAL", 45],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Freeze-Dry", "ICE", "SPECIAL", 70],
      ["Freezy Frost", "ICE", "SPECIAL", 85],
      ["Ice Beam", "ICE", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Absolute Zero", "ICE", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Ice Time", "ICE", "SPECIAL", 600]
    ],
    992: [
      // Iron Hands — FIGHTING/ELECTRIC
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 55],
      ["Spark", "ELECTRIC", "PHYSICAL", 65],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Body Press", "FIGHTING", "PHYSICAL", 80],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120],
      ["Focus Punch", "FIGHTING", "PHYSICAL", 150],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600],
      ["Static Overload", "ELECTRIC", "PHYSICAL", 600]
    ],
    993: [
      // Iron Jugulis — DARK/FLYING
      ["Power Trip", "DARK", "SPECIAL", 25],
      ["Fling", "DARK", "SPECIAL", 40],
      ["Snarl", "DARK", "SPECIAL", 55],
      ["Air Cutter", "FLYING", "SPECIAL", 60],
      ["Night Daze", "DARK", "SPECIAL", 75],
      ["Dark Pulse", "DARK", "SPECIAL", 80],
      ["Fiery Wrath", "DARK", "SPECIAL", 90],
      ["Baddy Bad", "DARK", "SPECIAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Umbral Blast", "DARK", "SPECIAL", 150],
      ["Endless Hollow", "DARK", "SPECIAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    994: [
      // Iron Moth — FIRE/POISON
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Burning Jealousy", "FIRE", "SPECIAL", 55],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Flame Burst", "FIRE", "SPECIAL", 70],
      ["Sludge Bomb", "POISON", "SPECIAL", 85],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "SPECIAL", 600],
      ["Toxic Deluge", "POISON", "SPECIAL", 600]
    ],
    995: [
      // Iron Thorns — ROCK/ELECTRIC
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Salt Cure", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Spark", "ELECTRIC", "PHYSICAL", 65],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Diamond Storm", "ROCK", "PHYSICAL", 85],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120],
      ["Head Smash", "ROCK", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Static Overload", "ELECTRIC", "PHYSICAL", 600]
    ],
    1e3: [
      // Gholdengo — STEEL/GHOST
      ["Bullet Punch", "STEEL", "SPECIAL", 35],
      ["Gear Grind", "STEEL", "SPECIAL", 45],
      ["Tachyon Cutter", "STEEL", "SPECIAL", 50],
      ["Mirror Shot", "STEEL", "SPECIAL", 65],
      ["Shadow Ball", "GHOST", "SPECIAL", 75],
      ["Flash Cannon", "STEEL", "SPECIAL", 80],
      ["Meteor Mash", "STEEL", "SPECIAL", 90],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Steel Beam", "STEEL", "SPECIAL", 120],
      ["Doom Desire", "STEEL", "SPECIAL", 150],
      ["Alloy Breaker", "STEEL", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    1005: [
      // Roaring Moon — DRAGON/DARK
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 75],
      ["Dragon Rush", "DRAGON", "PHYSICAL", 85],
      ["Dragon Hammer", "DRAGON", "PHYSICAL", 90],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Draconic Soul", "DRAGON", "PHYSICAL", 300],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600]
    ],
    1006: [
      // Iron Valiant — FAIRY/FIGHTING
      ["Disarming Voice", "FAIRY", "SPECIAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Spirit Break", "FAIRY", "PHYSICAL", 75],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 80],
      ["Play Rough", "FAIRY", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Fae Hammer", "FAIRY", "PHYSICAL", 150],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    1013: [
      // Sinistcha — GRASS/GHOST
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Syrup Bomb", "GRASS", "SPECIAL", 55],
      ["Infernal Parade", "GHOST", "SPECIAL", 60],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Matcha Gotcha", "GRASS", "SPECIAL", 80],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Petal Bloom", "GRASS", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    1018: [
      // Archaludon — STEEL/DRAGON
      ["Metal Claw", "STEEL", "SPECIAL", 35],
      ["Gyro Ball", "STEEL", "SPECIAL", 45],
      ["Tachyon Cutter", "STEEL", "SPECIAL", 50],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Flash Cannon", "STEEL", "SPECIAL", 75],
      ["Mirror Shot", "STEEL", "SPECIAL", 80],
      ["Meteor Mash", "STEEL", "SPECIAL", 90],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Steel Beam", "STEEL", "SPECIAL", 120],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Alloy Breaker", "STEEL", "SPECIAL", 600],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600]
    ],
    1019: [
      // Hydrapple — GRASS/DRAGON
      ["Magical Leaf", "GRASS", "SPECIAL", 30],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Syrup Bomb", "GRASS", "SPECIAL", 55],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Grass Knot", "GRASS", "SPECIAL", 85],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ]
  };
  var GOLPES_OUTLAND_2026_10_27 = {
    2008: [
      // Charged Raichu — ELECTRIC · base Raichu (#26)
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Spark", "ELECTRIC", "PHYSICAL", 70],
      ["Thunder Punch", "ELECTRIC", "PHYSICAL", 80],
      ["Wild Charge", "ELECTRIC", "PHYSICAL", 90],
      ["Double Shock", "ELECTRIC", "PHYSICAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Volt Breaker", "ELECTRIC", "PHYSICAL", 150],
      ["Mega Thunderstorm", "ELECTRIC", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "PHYSICAL", 600]
    ],
    2013: [
      // Freezing Dewgong — WATER/ICE · base Dewgong (#87)
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Freeze-Dry", "ICE", "SPECIAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Glacial Lance", "ICE", "PHYSICAL", 600]
    ],
    2012: [
      // Evil Cloyster — WATER/ICE · base Cloyster (#91)
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Razor Shell", "WATER", "PHYSICAL", 65],
      ["Ice Spinner", "ICE", "PHYSICAL", 75],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Liquidation", "WATER", "PHYSICAL", 95],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Glacial Lance", "ICE", "PHYSICAL", 600]
    ],
    2038: [
      // Ancient Hypno — PSYCHIC · base Hypno (#97)
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Mind Crusher", "PSYCHIC", "PHYSICAL", 150],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Psychic Fangs", "PSYCHIC", "PHYSICAL", 600]
    ],
    2055: [
      // Psy Exeggutor — GRASS/PSYCHIC · base Exeggutor (#103)
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Leaf Tornado", "GRASS", "SPECIAL", 55],
      ["Syrup Bomb", "GRASS", "SPECIAL", 60],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Giga Drain", "GRASS", "SPECIAL", 80],
      ["Grass Knot", "GRASS", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    2039: [
      // Furious Gyarados — WATER/FLYING · base Gyarados (#130)
      ["Surging Strikes", "WATER", "PHYSICAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Jet Punch", "WATER", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Sky Attack", "FLYING", "PHYSICAL", 600]
    ],
    2045: [
      // Brave Noctowl — NORMAL/FLYING · base Noctowl (#164)
      ["Weather Ball", "NORMAL", "SPECIAL", 35],
      ["Echoed Voice", "NORMAL", "SPECIAL", 40],
      ["Terrain Pulse", "NORMAL", "SPECIAL", 50],
      ["Tera Blast", "NORMAL", "SPECIAL", 65],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Razor Wind", "NORMAL", "SPECIAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Hyper Beam", "NORMAL", "SPECIAL", 150],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600],
      ["Mega Onslaught", "NORMAL", "SPECIAL", 600]
    ],
    2036: [
      // Ancient Xatu — PSYCHIC/FLYING · base Xatu (#178)
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Psychic", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    2034: [
      // Brave Steelix — STEEL/GROUND · base Steelix (#208)
      ["Metal Claw", "STEEL", "PHYSICAL", 35],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Gear Grind", "STEEL", "PHYSICAL", 50],
      ["Hard Press", "STEEL", "PHYSICAL", 60],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Gigaton Hammer", "STEEL", "PHYSICAL", 150],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600],
      ["Mega Forge", "STEEL", "PHYSICAL", 600]
    ],
    2043: [
      // Ancient Granbull — FAIRY · base Granbull (#210)
      ["Disarming Voice", "FAIRY", "PHYSICAL", 25],
      ["Fairy Wind", "FAIRY", "PHYSICAL", 40],
      ["Draining Kiss", "FAIRY", "PHYSICAL", 50],
      ["Dazzling Gleam", "FAIRY", "PHYSICAL", 65],
      ["Spirit Break", "FAIRY", "PHYSICAL", 75],
      ["Alluring Voice", "FAIRY", "PHYSICAL", 80],
      ["Play Rough", "FAIRY", "PHYSICAL", 90],
      ["Fleur Cannon", "FAIRY", "PHYSICAL", 120],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Fae Hammer", "FAIRY", "PHYSICAL", 150],
      ["Let's Snuggle Forever", "FAIRY", "PHYSICAL", 600],
      ["Starlight Charm", "FAIRY", "PHYSICAL", 600]
    ],
    2053: [
      // Magma Magcargo — FIRE/ROCK · base Magcargo (#219)
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Burning Jealousy", "FIRE", "SPECIAL", 55],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Ancient Power", "ROCK", "SPECIAL", 70],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Power Gem", "ROCK", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "SPECIAL", 600],
      ["Meteor Beam", "ROCK", "SPECIAL", 600]
    ],
    2040: [
      // Brave Mantine — WATER/FLYING · base Mantine (#226)
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Bubble", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Brine", "WATER", "SPECIAL", 70],
      ["Oblivion Wing", "FLYING", "SPECIAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    2056: [
      // Banshee Mismagius — GHOST · base Mismagius (#429)
      ["Lick", "GHOST", "SPECIAL", 30],
      ["Ominous Wind", "GHOST", "SPECIAL", 45],
      ["Night Shade", "GHOST", "SPECIAL", 55],
      ["Infernal Parade", "GHOST", "SPECIAL", 60],
      ["Hex", "GHOST", "SPECIAL", 70],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Bitter Malice", "GHOST", "SPECIAL", 90],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Shadow Force", "GHOST", "SPECIAL", 120],
      ["Phantom Wail", "GHOST", "SPECIAL", 150],
      ["Mega Eclipse", "GHOST", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    2054: [
      // Toxic Toxicroak — FIGHTING/POISON · base Toxicroak (#454)
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Low Kick", "FIGHTING", "PHYSICAL", 45],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 55],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Submission", "FIGHTING", "PHYSICAL", 80],
      ["Dynamic Punch", "FIGHTING", "PHYSICAL", 100],
      ["Axe Kick", "FIGHTING", "PHYSICAL", 120],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Focus Punch", "FIGHTING", "PHYSICAL", 150],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600],
      ["Noxious Torque", "POISON", "PHYSICAL", 600]
    ],
    2052: [
      // Furious Whimsicott — GRASS/FAIRY · base Whimsicott (#547)
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Absorb", "GRASS", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    2057: [
      // Freezing Aurorus — ICE/ROCK · base Aurorus (#699)
      ["Powder Snow", "ICE", "SPECIAL", 35],
      ["Frost Breath", "ICE", "SPECIAL", 45],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Aurora Beam", "ICE", "SPECIAL", 65],
      ["Ancient Power", "ROCK", "SPECIAL", 70],
      ["Freezy Frost", "ICE", "SPECIAL", 85],
      ["Ice Beam", "ICE", "SPECIAL", 90],
      ["Power Gem", "ROCK", "SPECIAL", 120],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Absolute Zero", "ICE", "SPECIAL", 150],
      ["Ice Burn", "ICE", "SPECIAL", 600],
      ["Meteor Beam", "ROCK", "SPECIAL", 600]
    ]
  };
  var GOLPES_LENDARIOS_2026_10_27 = {
    9: [
      // Blastoise — WATER · não é lendário
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Flip Turn", "WATER", "PHYSICAL", 60],
      ["Dive", "WATER", "PHYSICAL", 75],
      ["Waterfall", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Origin Pulse", "WATER", "SPECIAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Water Spout", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600]
    ],
    257: [
      // Blaziken — FIRE/FIGHTING · não é lendário
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Flame Wheel", "FIRE", "PHYSICAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 50],
      ["Heat Crash", "FIRE", "PHYSICAL", 60],
      ["Aura Sphere", "FIGHTING", "SPECIAL", 70],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Overheat", "FIRE", "SPECIAL", 120],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 120],
      ["Blazing Charge", "FIRE", "PHYSICAL", 150],
      ["V-create", "FIRE", "PHYSICAL", 150],
      ["Blast Burn", "FIRE", "SPECIAL", 600],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600]
    ],
    489: [
      // Phione — WATER · evolui (→ #490)
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Bubble Beam", "WATER", "SPECIAL", 65],
      ["Surf", "WATER", "SPECIAL", 100],
      ["Riptide Slam", "WATER", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Frost Power", "WATER", "PHYSICAL", 200],
      ["Aqua Crash", "WATER", "PHYSICAL", 600],
      ["Tidal Vortex", "WATER", "SPECIAL", 600]
    ],
    658: [
      // Greninja — WATER/DARK · não é lendário
      ["Water Shuriken", "WATER", "SPECIAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Flip Turn", "WATER", "PHYSICAL", 60],
      ["Dive", "WATER", "PHYSICAL", 75],
      ["Waterfall", "WATER", "PHYSICAL", 80],
      ["Fiery Wrath", "DARK", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Surf", "WATER", "SPECIAL", 150],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Endless Hollow", "DARK", "SPECIAL", 600]
    ],
    772: [
      // Type: Null — NORMAL · evolui (→ #773)
      ["Feint", "NORMAL", "PHYSICAL", 30],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Egg Bomb", "NORMAL", "PHYSICAL", 55],
      ["Mega Punch", "NORMAL", "PHYSICAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Judgment", "NORMAL", "SPECIAL", 100],
      ["Techno Blast", "NORMAL", "SPECIAL", 120]
    ],
    773: [
      // Silvally — NORMAL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Egg Bomb", "NORMAL", "PHYSICAL", 55],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Razor Wind", "NORMAL", "SPECIAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600]
    ],
    789: [
      // Cosmog — PSYCHIC · evolui (→ #790)
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 55],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120]
    ],
    790: [
      // Cosmoem — PSYCHIC · evolui (→ #791)
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Psychic Noise", "PSYCHIC", "SPECIAL", 75],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600]
    ],
    803: [
      // Poipole — POISON · evolui (→ #804)
      ["Mortal Spin", "POISON", "PHYSICAL", 30],
      ["Acid Spray", "POISON", "SPECIAL", 40],
      ["Poison Fang", "POISON", "PHYSICAL", 50],
      ["Sludge", "POISON", "SPECIAL", 65],
      ["Dire Claw", "POISON", "PHYSICAL", 90],
      ["Sludge Wave", "POISON", "SPECIAL", 95],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Noxious Torque", "POISON", "PHYSICAL", 600],
      ["Toxic Deluge", "POISON", "SPECIAL", 600]
    ]
  };
  var GOLPES_MEGAS_2026_10_27 = {};
  var GOLPES_REWORK_2026_10_29 = {
    4026: [
      // Alolan Raichu — ELECTRIC/PSYCHIC
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 45],
      ["Electroweb", "ELECTRIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Spark", "ELECTRIC", "PHYSICAL", 70],
      ["Thunder Punch", "ELECTRIC", "PHYSICAL", 80],
      ["Wild Charge", "ELECTRIC", "PHYSICAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "PHYSICAL", 600]
    ],
    38: [
      // Ninetales — FIRE
      ["Fire Spin", "FIRE", "SPECIAL", 35],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 50],
      ["Fire Fang", "FIRE", "PHYSICAL", 65],
      ["Burning Jealousy", "FIRE", "SPECIAL", 70],
      ["Fire Lash", "FIRE", "PHYSICAL", 80],
      ["Heat Crash", "FIRE", "PHYSICAL", 90],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Overheat", "FIRE", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Blast Burn", "FIRE", "PHYSICAL", 600],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    53: [
      // Persian — NORMAL
      ["Tail Slap", "NORMAL", "PHYSICAL", 25],
      ["Echoed Voice", "NORMAL", "SPECIAL", 40],
      ["Super Fang", "NORMAL", "PHYSICAL", 50],
      ["Stomp", "NORMAL", "PHYSICAL", 65],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Tera Blast", "NORMAL", "SPECIAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Skull Bash", "NORMAL", "PHYSICAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600]
    ],
    59: [
      // Arcanine — FIRE
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 40],
      ["Flame Charge", "FIRE", "PHYSICAL", 50],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Fire Punch", "FIRE", "PHYSICAL", 75],
      ["Fire Lash", "FIRE", "PHYSICAL", 80],
      ["Heat Crash", "FIRE", "PHYSICAL", 90],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Overheat", "FIRE", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Blast Burn", "FIRE", "PHYSICAL", 600],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    73: [
      // Tentacruel — WATER/POISON
      ["Whirlpool", "WATER", "SPECIAL", 35],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Flip Turn", "WATER", "PHYSICAL", 60],
      ["Sludge", "POISON", "SPECIAL", 70],
      ["Liquidation", "WATER", "PHYSICAL", 85],
      ["Dive", "WATER", "PHYSICAL", 90],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Water Spout", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Toxic Deluge", "POISON", "PHYSICAL", 600]
    ],
    5110: [
      // Galarian Weezing — POISON/FAIRY
      ["Smog", "POISON", "SPECIAL", 30],
      ["Acid Spray", "POISON", "SPECIAL", 40],
      ["Poison Tail", "POISON", "PHYSICAL", 50],
      ["Sludge", "POISON", "SPECIAL", 65],
      ["Cross Poison", "POISON", "PHYSICAL", 70],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Play Rough", "FAIRY", "PHYSICAL", 90],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Toxic Torrent", "POISON", "SPECIAL", 150],
      ["Starlight Charm", "FAIRY", "PHYSICAL", 600],
      ["Toxic Deluge", "POISON", "SPECIAL", 600]
    ],
    134: [
      // Vaporeon — WATER
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Bubble Beam", "WATER", "SPECIAL", 65],
      ["Brine", "WATER", "SPECIAL", 70],
      ["Hydro Steam", "WATER", "SPECIAL", 80],
      ["Bouncy Bubble", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Origin Pulse", "WATER", "SPECIAL", 120],
      ["Water Spout", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600]
    ],
    136: [
      // Flareon — FIRE
      ["Cinder Tap", "FIRE", "PHYSICAL", 25],
      ["Flame Wheel", "FIRE", "PHYSICAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Fire Fang", "FIRE", "PHYSICAL", 65],
      ["Temper Flare", "FIRE", "PHYSICAL", 75],
      ["Fire Lash", "FIRE", "PHYSICAL", 80],
      ["Heat Crash", "FIRE", "PHYSICAL", 90],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Pyro Ball", "FIRE", "PHYSICAL", 120],
      ["Blazing Charge", "FIRE", "PHYSICAL", 150],
      ["Blast Burn", "FIRE", "PHYSICAL", 600],
      ["Ignition Point", "FIRE", "PHYSICAL", 600]
    ],
    157: [
      // Typhlosion — FIRE
      ["Fire Spin", "FIRE", "SPECIAL", 35],
      ["Ember", "FIRE", "SPECIAL", 40],
      ["Burning Jealousy", "FIRE", "SPECIAL", 55],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Mystical Fire", "FIRE", "SPECIAL", 75],
      ["Lava Plume", "FIRE", "SPECIAL", 80],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Overheat", "FIRE", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Mind Blown", "FIRE", "SPECIAL", 150],
      ["Blast Burn", "FIRE", "SPECIAL", 600],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    197: [
      // Umbreon — DARK
      ["Dusk Needle", "DARK", "SPECIAL", 30],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Snarl", "DARK", "SPECIAL", 55],
      ["Knock Off", "DARK", "PHYSICAL", 65],
      ["Night Daze", "DARK", "SPECIAL", 75],
      ["Dark Pulse", "DARK", "SPECIAL", 80],
      ["Foul Play", "DARK", "PHYSICAL", 95],
      ["Baddy Bad", "DARK", "SPECIAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Midnight Ravage", "DARK", "PHYSICAL", 150],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Wicked Blow", "DARK", "SPECIAL", 600]
    ],
    275: [
      // Shiftry — GRASS/DARK
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Magical Leaf", "GRASS", "SPECIAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Dark Pulse", "DARK", "SPECIAL", 75],
      ["Giga Drain", "GRASS", "SPECIAL", 80],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Baddy Bad", "DARK", "SPECIAL", 120],
      ["Solar Blade", "GRASS", "PHYSICAL", 120],
      ["Bramble Crush", "GRASS", "PHYSICAL", 150],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600],
      ["Mega Abyss", "DARK", "SPECIAL", 600]
    ],
    340: [
      // Whiscash — WATER/GROUND
      ["Water Shuriken", "WATER", "SPECIAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Waterfall", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600]
    ],
    389: [
      // Torterra — GRASS/GROUND
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Trailblaze", "GRASS", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Horn Leech", "GRASS", "PHYSICAL", 75],
      ["Leaf Blade", "GRASS", "PHYSICAL", 85],
      ["Ivy Cudgel", "GRASS", "PHYSICAL", 100],
      ["Fissure", "GROUND", "PHYSICAL", 120],
      ["Wood Hammer", "GRASS", "PHYSICAL", 120],
      ["Bramble Crush", "GRASS", "PHYSICAL", 150],
      ["Grove Rampage", "GRASS", "PHYSICAL", 150],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600]
    ],
    392: [
      // Infernape — FIRE/FIGHTING
      ["Cinder Tap", "FIRE", "PHYSICAL", 25],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 50],
      ["Heat Crash", "FIRE", "PHYSICAL", 60],
      ["Fire Punch", "FIRE", "PHYSICAL", 75],
      ["Flamethrower", "FIRE", "SPECIAL", 85],
      ["Aura Sphere", "FIGHTING", "SPECIAL", 90],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Blazing Charge", "FIRE", "PHYSICAL", 150],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "SPECIAL", 600]
    ],
    395: [
      // Empoleon — WATER/STEEL
      ["Whirlpool", "WATER", "SPECIAL", 35],
      ["Bubble", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 50],
      ["Bubble Beam", "WATER", "SPECIAL", 65],
      ["Flash Cannon", "STEEL", "SPECIAL", 75],
      ["Hydro Steam", "WATER", "SPECIAL", 80],
      ["Surf", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Steel Beam", "STEEL", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Water Spout", "WATER", "SPECIAL", 150],
      ["Alloy Breaker", "STEEL", "SPECIAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600]
    ],
    426: [
      // Drifblim — GHOST/FLYING
      ["Astonish", "GHOST", "PHYSICAL", 30],
      ["Shadow Sneak", "GHOST", "PHYSICAL", 40],
      ["Air Cutter", "FLYING", "SPECIAL", 55],
      ["Hex", "GHOST", "SPECIAL", 65],
      ["Shadow Claw", "GHOST", "PHYSICAL", 70],
      ["Night Shade", "GHOST", "SPECIAL", 85],
      ["Shadow Ball", "GHOST", "SPECIAL", 90],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Soul Reaper", "GHOST", "PHYSICAL", 150],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "PHYSICAL", 600]
    ],
    437: [
      // Bronzong — STEEL/PSYCHIC
      ["Tachyon Cutter", "STEEL", "SPECIAL", 35],
      ["Gyro Ball", "STEEL", "PHYSICAL", 45],
      ["Gear Grind", "STEEL", "PHYSICAL", 50],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Mirror Shot", "STEEL", "SPECIAL", 80],
      ["Flash Cannon", "STEEL", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Gigaton Hammer", "STEEL", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600]
    ],
    455: [
      // Carnivine — GRASS
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Magical Leaf", "GRASS", "SPECIAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Apple Acid", "GRASS", "SPECIAL", 80],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Petal Dance", "GRASS", "SPECIAL", 120],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Bramble Crush", "GRASS", "PHYSICAL", 150],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    471: [
      // Glaceon — ICE
      ["Powder Snow", "ICE", "SPECIAL", 35],
      ["Frost Breath", "ICE", "SPECIAL", 45],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Glaciate", "ICE", "SPECIAL", 65],
      ["Freeze-Dry", "ICE", "SPECIAL", 70],
      ["Ice Beam", "ICE", "SPECIAL", 85],
      ["Freezy Frost", "ICE", "SPECIAL", 90],
      ["Freeze Shock", "ICE", "SPECIAL", 120],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Absolute Zero", "ICE", "SPECIAL", 150],
      ["Glacial Lance", "ICE", "SPECIAL", 600],
      ["Ice Time", "ICE", "SPECIAL", 600]
    ],
    497: [
      // Serperior — GRASS
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Trailblaze", "GRASS", "PHYSICAL", 50],
      ["Magical Leaf", "GRASS", "SPECIAL", 60],
      ["Horn Leech", "GRASS", "PHYSICAL", 75],
      ["Leaf Blade", "GRASS", "PHYSICAL", 85],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Petal Dance", "GRASS", "SPECIAL", 120],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Verdant Storm", "GRASS", "SPECIAL", 150],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    6503: [
      // Hisuian Samurott — WATER/DARK
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Hydro Steam", "WATER", "SPECIAL", 80],
      ["Surf", "WATER", "SPECIAL", 100],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Endless Hollow", "DARK", "SPECIAL", 600]
    ],
    503: [
      // Samurott — WATER
      ["Brine Cut", "WATER", "PHYSICAL", 35],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 50],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Razor Shell", "WATER", "PHYSICAL", 75],
      ["Hydro Steam", "WATER", "SPECIAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600]
    ],
    537: [
      // Seismitoad — WATER/GROUND
      ["Water Shuriken", "WATER", "SPECIAL", 25],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600]
    ],
    631: [
      // Heatmor — FIRE
      ["Fire Spin", "FIRE", "SPECIAL", 35],
      ["Flame Charge", "FIRE", "PHYSICAL", 45],
      ["Burning Jealousy", "FIRE", "SPECIAL", 55],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Fire Punch", "FIRE", "PHYSICAL", 75],
      ["Fire Lash", "FIRE", "PHYSICAL", 80],
      ["Bitter Blade", "FIRE", "PHYSICAL", 90],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Blast Burn", "FIRE", "SPECIAL", 600],
      ["Ignition Point", "FIRE", "PHYSICAL", 600]
    ],
    635: [
      // Hydreigon — DARK/DRAGON
      ["Twister", "DRAGON", "SPECIAL", 35],
      ["Dragon Breath", "DRAGON", "SPECIAL", 45],
      ["Draco Slime", "DRAGON", "SPECIAL", 55],
      ["Snarl", "DARK", "SPECIAL", 60],
      ["Fickle Beam", "DRAGON", "SPECIAL", 75],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Core Enforcer", "DRAGON", "SPECIAL", 100],
      ["Baddy Bad", "DARK", "SPECIAL", 120],
      ["Draco Deluge", "DRAGON", "SPECIAL", 120],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Endless Hollow", "DARK", "SPECIAL", 600],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600]
    ],
    660: [
      // Diggersby — NORMAL/GROUND
      ["Echoed Voice", "NORMAL", "SPECIAL", 35],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Scorching Sands", "GROUND", "SPECIAL", 70],
      ["Uproar", "NORMAL", "SPECIAL", 85],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600]
    ],
    673: [
      // Gogoat — GRASS
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Magical Leaf", "GRASS", "SPECIAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Apple Acid", "GRASS", "SPECIAL", 75],
      ["Giga Drain", "GRASS", "SPECIAL", 80],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Bramble Crush", "GRASS", "PHYSICAL", 150],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    706: [
      // Goodra — DRAGON
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Twister", "DRAGON", "SPECIAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Breaking Swipe", "DRAGON", "PHYSICAL", 60],
      ["Wyrm Lash", "DRAGON", "PHYSICAL", 70],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Spacial Rend", "DRAGON", "SPECIAL", 100],
      ["Draco Deluge", "DRAGON", "SPECIAL", 120],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Roar of Time", "DRAGON", "PHYSICAL", 600]
    ],
    6706: [
      // Hisuian Goodra — STEEL/DRAGON
      ["Bullet Punch", "STEEL", "PHYSICAL", 35],
      ["Gear Grind", "STEEL", "PHYSICAL", 45],
      ["Gyro Ball", "STEEL", "PHYSICAL", 55],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Flash Cannon", "STEEL", "SPECIAL", 75],
      ["Mirror Shot", "STEEL", "SPECIAL", 80],
      ["Meteor Mash", "STEEL", "PHYSICAL", 90],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Alloy Breaker", "STEEL", "SPECIAL", 600],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600]
    ],
    724: [
      // Decidueye — GRASS/GHOST
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Magical Leaf", "GRASS", "SPECIAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Shadow Claw", "GHOST", "PHYSICAL", 65],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Grass Pledge", "GRASS", "SPECIAL", 80],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Bramble Crush", "GRASS", "PHYSICAL", 150],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    727: [
      // Incineroar — FIRE/DARK
      ["Cinder Tap", "FIRE", "PHYSICAL", 25],
      ["Flame Charge", "FIRE", "PHYSICAL", 45],
      ["Fire Fang", "FIRE", "PHYSICAL", 55],
      ["Flame Wheel", "FIRE", "PHYSICAL", 60],
      ["Lash Out", "DARK", "PHYSICAL", 75],
      ["Blaze Kick", "FIRE", "PHYSICAL", 85],
      ["Heat Crash", "FIRE", "PHYSICAL", 90],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Fling", "DARK", "PHYSICAL", 120],
      ["Blazing Charge", "FIRE", "PHYSICAL", 150],
      ["V-create", "FIRE", "PHYSICAL", 150],
      ["Blast Burn", "FIRE", "PHYSICAL", 600],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    730: [
      // Primarina — WATER/FAIRY
      ["Whirlpool", "WATER", "SPECIAL", 35],
      ["Bubble", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Octazooka", "WATER", "SPECIAL", 70],
      ["Moonblast", "FAIRY", "SPECIAL", 85],
      ["Surf", "WATER", "SPECIAL", 90],
      ["Disarming Voice", "FAIRY", "SPECIAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Water Spout", "WATER", "SPECIAL", 150],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    784: [
      // Kommo-o — DRAGON/FIGHTING
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Vacuum Wave", "FIGHTING", "SPECIAL", 40],
      ["Final Gambit", "FIGHTING", "SPECIAL", 55],
      ["Draco Slime", "DRAGON", "SPECIAL", 65],
      ["Aura Sphere", "FIGHTING", "SPECIAL", 70],
      ["Body Press", "FIGHTING", "PHYSICAL", 80],
      ["Cross Chop", "FIGHTING", "PHYSICAL", 100],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Draco Deluge", "DRAGON", "SPECIAL", 120],
      ["Draconic Soul", "DRAGON", "PHYSICAL", 300],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "SPECIAL", 600]
    ],
    815: [
      // Cinderace — FIRE
      ["Cinder Tap", "FIRE", "PHYSICAL", 25],
      ["Flame Charge", "FIRE", "PHYSICAL", 45],
      ["Fire Fang", "FIRE", "PHYSICAL", 55],
      ["Flame Wheel", "FIRE", "PHYSICAL", 60],
      ["Fire Punch", "FIRE", "PHYSICAL", 75],
      ["Blaze Kick", "FIRE", "PHYSICAL", 85],
      ["Bitter Blade", "FIRE", "PHYSICAL", 90],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Pyro Ball", "FIRE", "PHYSICAL", 120],
      ["Blazing Charge", "FIRE", "PHYSICAL", 150],
      ["V-create", "FIRE", "PHYSICAL", 150],
      ["Blast Burn", "FIRE", "PHYSICAL", 600],
      ["Ignition Point", "FIRE", "PHYSICAL", 600]
    ],
    871: [
      // Pincurchin — ELECTRIC
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 50],
      ["Spark", "ELECTRIC", "PHYSICAL", 65],
      ["Rising Voltage", "ELECTRIC", "SPECIAL", 70],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Thunderbolt", "ELECTRIC", "SPECIAL", 90],
      ["Double Shock", "ELECTRIC", "PHYSICAL", 120],
      ["Thunder", "ELECTRIC", "SPECIAL", 120],
      ["Volt Breaker", "ELECTRIC", "PHYSICAL", 150],
      ["Bolt Strike", "ELECTRIC", "PHYSICAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    881: [
      // Arctozolt — ELECTRIC/ICE
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 50],
      ["Avalanche", "ICE", "PHYSICAL", 60],
      ["Rising Voltage", "ELECTRIC", "SPECIAL", 70],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Thunderbolt", "ELECTRIC", "SPECIAL", 90],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Thunder", "ELECTRIC", "SPECIAL", 120],
      ["Volt Breaker", "ELECTRIC", "PHYSICAL", 150],
      ["Ice Time", "ICE", "PHYSICAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    883: [
      // Arctovish — WATER/ICE
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Avalanche", "ICE", "PHYSICAL", 60],
      ["Bubble Beam", "WATER", "SPECIAL", 70],
      ["Brine", "WATER", "SPECIAL", 80],
      ["Surf", "WATER", "SPECIAL", 100],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Ice Time", "ICE", "SPECIAL", 600]
    ],
    949: [
      // Toedscruel — GROUND/GRASS
      ["Bone Rush", "GROUND", "PHYSICAL", 25],
      ["Mud-Slap", "GROUND", "SPECIAL", 40],
      ["Mud Shot", "GROUND", "SPECIAL", 55],
      ["Syrup Bomb", "GRASS", "SPECIAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Dig", "GROUND", "PHYSICAL", 80],
      ["Earthquake", "GROUND", "PHYSICAL", 100],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Seismic Blast", "GROUND", "SPECIAL", 150],
      ["Crossing Fissure", "GROUND", "SPECIAL", 600],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600]
    ],
    967: [
      // Cyclizar — DRAGON/NORMAL
      ["Twister", "DRAGON", "SPECIAL", 35],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Breaking Swipe", "DRAGON", "PHYSICAL", 60],
      ["Tera Blast", "NORMAL", "SPECIAL", 75],
      ["Fickle Beam", "DRAGON", "SPECIAL", 80],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 90],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Draconic Soul", "DRAGON", "PHYSICAL", 300],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600]
    ],
    18: [
      // Pidgeot — NORMAL/FLYING
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 35],
      ["Pluck", "FLYING", "PHYSICAL", 45],
      ["Chatter", "FLYING", "SPECIAL", 55],
      ["Air Cutter", "FLYING", "SPECIAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Oblivion Wing", "FLYING", "SPECIAL", 80],
      ["Air Slash", "FLYING", "SPECIAL", 90],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Skyfall Dive", "FLYING", "PHYSICAL", 150],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    71: [
      // Victreebel — GRASS/POISON
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Magical Leaf", "GRASS", "SPECIAL", 40],
      ["Razor Leaf", "GRASS", "PHYSICAL", 55],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Leaf Tornado", "GRASS", "SPECIAL", 70],
      ["Giga Drain", "GRASS", "SPECIAL", 80],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Bramble Crush", "GRASS", "PHYSICAL", 150],
      ["Petal Bloom", "GRASS", "SPECIAL", 600],
      ["Toxic Deluge", "POISON", "PHYSICAL", 600]
    ],
    323: [
      // Camerupt — FIRE/GROUND
      ["Fire Spin", "FIRE", "SPECIAL", 35],
      ["Ember", "FIRE", "SPECIAL", 40],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Flame Charge", "FIRE", "PHYSICAL", 60],
      ["Burning Jealousy", "FIRE", "SPECIAL", 70],
      ["Temper Flare", "FIRE", "PHYSICAL", 80],
      ["Heat Crash", "FIRE", "PHYSICAL", 90],
      ["Fissure", "GROUND", "PHYSICAL", 120],
      ["Overheat", "FIRE", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    448: [
      // Lucario — STEEL/FIGHTING
      ["Vital Throw", "FIGHTING", "PHYSICAL", 30],
      ["Rock Smash", "FIGHTING", "PHYSICAL", 40],
      ["Vacuum Wave", "FIGHTING", "SPECIAL", 50],
      ["Final Gambit", "FIGHTING", "SPECIAL", 60],
      ["Aura Sphere", "FIGHTING", "SPECIAL", 70],
      ["Anchor Shot", "STEEL", "PHYSICAL", 80],
      ["Cross Chop", "FIGHTING", "PHYSICAL", 100],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Steel Beam", "STEEL", "SPECIAL", 120],
      ["Aura Burst", "FIGHTING", "SPECIAL", 150],
      ["Alloy Breaker", "STEEL", "SPECIAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    604: [
      // Eelektross — ELECTRIC
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 45],
      ["Charge Beam", "ELECTRIC", "SPECIAL", 50],
      ["Electro Ball", "ELECTRIC", "SPECIAL", 60],
      ["Thunder Punch", "ELECTRIC", "PHYSICAL", 75],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Thunderbolt", "ELECTRIC", "SPECIAL", 90],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Volt Breaker", "ELECTRIC", "PHYSICAL", 150],
      ["Mega Thunderstorm", "ELECTRIC", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "PHYSICAL", 600]
    ]
  };
  var GOLPES_LENDARIOS_2026_10_29 = {
    144: [
      // Articuno — ICE/FLYING
      ["Ice Ball", "ICE", "PHYSICAL", 30],
      ["Gust", "FLYING", "SPECIAL", 40],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Avalanche", "ICE", "PHYSICAL", 60],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Oblivion Wing", "FLYING", "SPECIAL", 80],
      ["Ice Hammer", "ICE", "PHYSICAL", 100],
      ["Mountain Gale", "ICE", "PHYSICAL", 100],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Glacial Lance", "ICE", "SPECIAL", 600],
      ["Ice Time", "ICE", "SPECIAL", 600],
      ["Sky Attack", "FLYING", "PHYSICAL", 600]
    ],
    5144: [
      // Galarian Articuno — PSYCHIC/FLYING
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Gust", "FLYING", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Oblivion Wing", "FLYING", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600],
      ["Sky Attack", "FLYING", "SPECIAL", 600]
    ],
    5145: [
      // Galarian Zapdos — FIGHTING/FLYING
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 40],
      ["Low Kick", "FIGHTING", "PHYSICAL", 50],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Drill Peck", "FLYING", "PHYSICAL", 80],
      ["Bounce", "FLYING", "PHYSICAL", 85],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Cross Chop", "FIGHTING", "PHYSICAL", 100],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600],
      ["Sky Attack", "FLYING", "PHYSICAL", 600]
    ],
    145: [
      // Zapdos — ELECTRIC/FLYING
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Gust", "FLYING", "SPECIAL", 40],
      ["Electro Ball", "ELECTRIC", "SPECIAL", 55],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Oblivion Wing", "FLYING", "SPECIAL", 80],
      ["Thunderbolt", "ELECTRIC", "SPECIAL", 90],
      ["Wildbolt Storm", "ELECTRIC", "SPECIAL", 100],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Sky Dive", "FLYING", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600],
      ["Volt Surge", "ELECTRIC", "SPECIAL", 600]
    ],
    5146: [
      // Galarian Moltres — DARK/FLYING
      ["Power Trip", "DARK", "SPECIAL", 25],
      ["Gust", "FLYING", "SPECIAL", 40],
      ["Snarl", "DARK", "SPECIAL", 55],
      ["Dark Pulse", "DARK", "SPECIAL", 65],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Oblivion Wing", "FLYING", "SPECIAL", 80],
      ["Fiery Wrath", "DARK", "SPECIAL", 90],
      ["Night Daze", "DARK", "SPECIAL", 90],
      ["Baddy Bad", "DARK", "SPECIAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Endless Hollow", "DARK", "SPECIAL", 600],
      ["Sky Attack", "FLYING", "SPECIAL", 600],
      ["Wicked Blow", "DARK", "SPECIAL", 600]
    ],
    146: [
      // Moltres — FIRE/FLYING
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Gust", "FLYING", "SPECIAL", 40],
      ["Ember", "FIRE", "SPECIAL", 50],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Oblivion Wing", "FLYING", "SPECIAL", 80],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Inferno", "FIRE", "SPECIAL", 100],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Overheat", "FIRE", "SPECIAL", 120],
      ["Ignition Point", "FIRE", "SPECIAL", 600],
      ["Sky Dive", "FLYING", "SPECIAL", 600],
      ["Solar Flare", "FIRE", "SPECIAL", 600]
    ],
    150: [
      // Mewtwo — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Psychic Noise", "PSYCHIC", "SPECIAL", 75],
      ["Eerie Spell", "PSYCHIC", "SPECIAL", 80],
      ["Mist Ball", "PSYCHIC", "SPECIAL", 95],
      ["Photon Geyser", "PSYCHIC", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Mind Pulse", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600]
    ],
    151: [
      // Mew — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 65],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Zen Headbutt", "PSYCHIC", "PHYSICAL", 80],
      ["Freezing Glare", "PSYCHIC", "SPECIAL", 90],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Mind Pulse", "PSYCHIC", "PHYSICAL", 600],
      ["Prismatic Laser", "PSYCHIC", "PHYSICAL", 600]
    ],
    243: [
      // Raikou — ELECTRIC
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Charge Beam", "ELECTRIC", "SPECIAL", 50],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Thunderbolt", "ELECTRIC", "SPECIAL", 90],
      ["Electro Drift", "ELECTRIC", "SPECIAL", 100],
      ["Electro Shot", "ELECTRIC", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Bolt Strike", "ELECTRIC", "SPECIAL", 600],
      ["Volt Surge", "ELECTRIC", "SPECIAL", 600],
      ["Voltage Blast", "ELECTRIC", "SPECIAL", 600]
    ],
    244: [
      // Entei — FIRE
      ["Fire Spin", "FIRE", "PHYSICAL", 30],
      ["Flame Wheel", "FIRE", "PHYSICAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Fire Fang", "FIRE", "PHYSICAL", 65],
      ["Temper Flare", "FIRE", "PHYSICAL", 75],
      ["Fire Lash", "FIRE", "PHYSICAL", 80],
      ["Bitter Blade", "FIRE", "PHYSICAL", 90],
      ["Sacred Fire", "FIRE", "PHYSICAL", 100],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Pyro Ball", "FIRE", "PHYSICAL", 120],
      ["Blast Burn", "FIRE", "PHYSICAL", 600],
      ["Magma Impact", "FIRE", "PHYSICAL", 600],
      ["Solar Flare", "FIRE", "PHYSICAL", 600]
    ],
    245: [
      // Suicune — WATER
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Bubble Beam", "WATER", "SPECIAL", 65],
      ["Brine", "WATER", "SPECIAL", 70],
      ["Hydro Steam", "WATER", "SPECIAL", 80],
      ["Bouncy Bubble", "WATER", "SPECIAL", 90],
      ["Surf", "WATER", "SPECIAL", 100],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Water Spout", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Tidal Vortex", "WATER", "SPECIAL", 600]
    ],
    249: [
      // Lugia — PSYCHIC/FLYING
      ["Peck", "FLYING", "PHYSICAL", 35],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Acrobatics", "FLYING", "PHYSICAL", 55],
      ["Sky Drop", "FLYING", "PHYSICAL", 60],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Bleakwind Storm", "FLYING", "SPECIAL", 100],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600],
      ["Mind Pulse", "PSYCHIC", "SPECIAL", 600],
      ["Sky Dive", "FLYING", "SPECIAL", 600]
    ],
    250: [
      // Ho-oh — FIRE/FLYING
      ["Fire Spin", "FIRE", "PHYSICAL", 30],
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 40],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Flame Wheel", "FIRE", "PHYSICAL", 60],
      ["Drill Peck", "FLYING", "PHYSICAL", 75],
      ["Bounce", "FLYING", "PHYSICAL", 85],
      ["Heat Crash", "FIRE", "PHYSICAL", 90],
      ["Sacred Fire", "FIRE", "PHYSICAL", 100],
      ["Brave Bird", "FLYING", "PHYSICAL", 120],
      ["Raging Fury", "FIRE", "PHYSICAL", 120],
      ["Blast Burn", "FIRE", "PHYSICAL", 600],
      ["Magma Impact", "FIRE", "PHYSICAL", 600],
      ["Sky Attack", "FLYING", "PHYSICAL", 600]
    ],
    251: [
      // Celebi — PSYCHIC/GRASS
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Heart Stamp", "PSYCHIC", "PHYSICAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Horn Leech", "GRASS", "PHYSICAL", 75],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Mist Ball", "PSYCHIC", "SPECIAL", 95],
      ["Photon Geyser", "PSYCHIC", "SPECIAL", 100],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Astral Burst", "PSYCHIC", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600]
    ],
    377: [
      // Regirock — ROCK
      ["Rollout", "ROCK", "PHYSICAL", 30],
      ["Accelerock", "ROCK", "PHYSICAL", 40],
      ["Smack Down", "ROCK", "PHYSICAL", 50],
      ["Rock Tomb", "ROCK", "PHYSICAL", 60],
      ["Stone Axe", "ROCK", "PHYSICAL", 65],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Rock Wrecker", "ROCK", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Geo Pulse", "ROCK", "PHYSICAL", 600],
      ["Meteor Beam", "ROCK", "PHYSICAL", 600]
    ],
    378: [
      // Regice — ICE
      ["Ice Ball", "ICE", "SPECIAL", 30],
      ["Powder Snow", "ICE", "SPECIAL", 40],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Glaciate", "ICE", "SPECIAL", 65],
      ["Freeze-Dry", "ICE", "SPECIAL", 70],
      ["Ice Beam", "ICE", "SPECIAL", 85],
      ["Freezy Frost", "ICE", "SPECIAL", 90],
      ["Blizzard", "ICE", "SPECIAL", 110],
      ["Absolute Zero", "ICE", "SPECIAL", 120],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Glacial Lance", "ICE", "SPECIAL", 600],
      ["Ice Burn", "ICE", "SPECIAL", 600],
      ["Permafrost", "ICE", "SPECIAL", 600]
    ],
    379: [
      // Registeel — STEEL
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Gear Grind", "STEEL", "PHYSICAL", 50],
      ["Tachyon Cutter", "STEEL", "SPECIAL", 50],
      ["Mirror Shot", "STEEL", "SPECIAL", 65],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Flash Cannon", "STEEL", "SPECIAL", 80],
      ["Magnet Bomb", "STEEL", "PHYSICAL", 95],
      ["Sunsteel Strike", "STEEL", "PHYSICAL", 100],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Steel Beam", "STEEL", "SPECIAL", 120],
      ["Alloy Breaker", "STEEL", "SPECIAL", 600],
      ["Alloy Surge", "STEEL", "SPECIAL", 600],
      ["Make It Rain", "STEEL", "PHYSICAL", 600]
    ],
    380: [
      // Latias — DRAGON/PSYCHIC
      ["Scale Shot", "DRAGON", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Twister", "DRAGON", "SPECIAL", 40],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Spacial Rend", "DRAGON", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600],
      ["Roar of Time", "DRAGON", "SPECIAL", 600]
    ],
    381: [
      // Latios — DRAGON/PSYCHIC
      ["Scale Shot", "DRAGON", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Twister", "DRAGON", "SPECIAL", 40],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Spacial Rend", "DRAGON", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600],
      ["Roar of Time", "DRAGON", "SPECIAL", 600]
    ],
    382: [
      // Kyogre — WATER
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Bubble Beam", "WATER", "SPECIAL", 65],
      ["Brine", "WATER", "SPECIAL", 70],
      ["Scald", "WATER", "SPECIAL", 80],
      ["Bouncy Bubble", "WATER", "SPECIAL", 90],
      ["Surf", "WATER", "SPECIAL", 100],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Water Spout", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Tidal Vortex", "WATER", "SPECIAL", 600]
    ],
    383: [
      // Groudon — GROUND
      ["Bone Rush", "GROUND", "PHYSICAL", 25],
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Dig", "GROUND", "PHYSICAL", 80],
      ["High Horsepower", "GROUND", "PHYSICAL", 95],
      ["Earthquake", "GROUND", "PHYSICAL", 100],
      ["Fissure", "GROUND", "PHYSICAL", 120],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Earthshock", "GROUND", "PHYSICAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600],
      ["Sandsear Storm", "GROUND", "PHYSICAL", 600]
    ],
    384: [
      // Rayquaza — DRAGON/FLYING
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Bounce", "FLYING", "PHYSICAL", 85],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 90],
      ["Core Enforcer", "DRAGON", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Dragon Strike", "DRAGON", "SPECIAL", 600],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Sky Dive", "FLYING", "SPECIAL", 600]
    ],
    385: [
      // Jirachi — STEEL/PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Gyro Ball", "STEEL", "PHYSICAL", 55],
      ["Mirror Shot", "STEEL", "SPECIAL", 65],
      ["Psychic Noise", "PSYCHIC", "SPECIAL", 75],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Magnet Bomb", "STEEL", "PHYSICAL", 95],
      ["Behemoth Bash", "STEEL", "PHYSICAL", 100],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Alloy Surge", "STEEL", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600]
    ],
    386: [
      // Deoxys — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 70],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Psychic", "PSYCHIC", "SPECIAL", 90],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "PHYSICAL", 600],
      ["Psycho Boost", "PSYCHIC", "PHYSICAL", 600]
    ],
    8386: [
      // Deoxys Attack — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 70],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Psychic", "PSYCHIC", "SPECIAL", 90],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "PHYSICAL", 600],
      ["Psycho Boost", "PSYCHIC", "PHYSICAL", 600]
    ],
    9386: [
      // Deoxys Defense — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 70],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Psychic", "PSYCHIC", "SPECIAL", 90],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "PHYSICAL", 600],
      ["Psycho Boost", "PSYCHIC", "PHYSICAL", 600]
    ],
    11386: [
      // Deoxys Speed — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 70],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Psychic", "PSYCHIC", "SPECIAL", 90],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "PHYSICAL", 600],
      ["Psycho Boost", "PSYCHIC", "PHYSICAL", 600]
    ],
    480: [
      // Uxie — PSYCHIC · pedido do dono: sem o Astral Burst, como o Mew
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Zen Headbutt", "PSYCHIC", "SPECIAL", 80],
      ["Mist Ball", "PSYCHIC", "SPECIAL", 95],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Mind Pulse", "PSYCHIC", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600],
      ["Prismatic Laser", "PSYCHIC", "PHYSICAL", 600]
    ],
    481: [
      // Mesprit — PSYCHIC · pedido do dono: sem o Astral Burst, como o Mew
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Zen Headbutt", "PSYCHIC", "SPECIAL", 80],
      ["Mist Ball", "PSYCHIC", "SPECIAL", 95],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Mind Pulse", "PSYCHIC", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600],
      ["Prismatic Laser", "PSYCHIC", "PHYSICAL", 600]
    ],
    482: [
      // Azelf — PSYCHIC · pedido do dono: sem o Astral Burst, como o Mew
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Zen Headbutt", "PSYCHIC", "SPECIAL", 80],
      ["Mist Ball", "PSYCHIC", "SPECIAL", 95],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Mind Pulse", "PSYCHIC", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600],
      ["Prismatic Laser", "PSYCHIC", "PHYSICAL", 600]
    ],
    483: [
      // Dialga — STEEL/DRAGON · evolui (→ #8483)
      ["Twister", "DRAGON", "SPECIAL", 40],
      ["Tachyon Cutter", "STEEL", "SPECIAL", 45],
      ["Gyro Ball", "STEEL", "SPECIAL", 55],
      ["Mirror Shot", "STEEL", "SPECIAL", 65],
      ["Fickle Beam", "DRAGON", "SPECIAL", 80],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Flash Cannon", "STEEL", "SPECIAL", 90],
      ["Behemoth Bash", "STEEL", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Steel Beam", "STEEL", "SPECIAL", 120],
      ["Alloy Breaker", "STEEL", "SPECIAL", 600],
      ["Alloy Surge", "STEEL", "SPECIAL", 600],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600]
    ],
    8483: [
      // Dialga Origin — STEEL/DRAGON
      ["Twister", "DRAGON", "SPECIAL", 40],
      ["Tachyon Cutter", "STEEL", "SPECIAL", 45],
      ["Gyro Ball", "STEEL", "SPECIAL", 55],
      ["Mirror Shot", "STEEL", "SPECIAL", 65],
      ["Fickle Beam", "DRAGON", "SPECIAL", 80],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Flash Cannon", "STEEL", "SPECIAL", 90],
      ["Behemoth Bash", "STEEL", "SPECIAL", 100],
      ["Doom Desire", "STEEL", "SPECIAL", 120],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Alloy Breaker", "STEEL", "SPECIAL", 600],
      ["Roar of Time", "DRAGON", "SPECIAL", 600],
      ["Steel Beam", "STEEL", "SPECIAL", 600]
    ],
    484: [
      // Palkia — WATER/DRAGON · evolui (→ #8484)
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Twister", "DRAGON", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Fickle Beam", "DRAGON", "SPECIAL", 80],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Surf", "WATER", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Tidal Vortex", "WATER", "SPECIAL", 600]
    ],
    8484: [
      // Palkia Origin — WATER/DRAGON
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Twister", "DRAGON", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Fickle Beam", "DRAGON", "SPECIAL", 80],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Surf", "WATER", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Roar of Time", "DRAGON", "SPECIAL", 600]
    ],
    485: [
      // Heatran — FIRE/STEEL
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Tachyon Cutter", "STEEL", "SPECIAL", 45],
      ["Ember", "FIRE", "SPECIAL", 50],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Mirror Shot", "STEEL", "SPECIAL", 70],
      ["Flash Cannon", "STEEL", "SPECIAL", 80],
      ["Heat Wave", "FIRE", "SPECIAL", 95],
      ["Inferno", "FIRE", "SPECIAL", 100],
      ["Overheat", "FIRE", "SPECIAL", 120],
      ["Steel Beam", "STEEL", "SPECIAL", 120],
      ["Alloy Surge", "STEEL", "SPECIAL", 600],
      ["Ignition Point", "FIRE", "SPECIAL", 600],
      ["Solar Flare", "FIRE", "SPECIAL", 600]
    ],
    486: [
      // Regigigas — NORMAL
      ["Feint", "NORMAL", "PHYSICAL", 30],
      ["Hold Back", "NORMAL", "PHYSICAL", 40],
      ["Crush Grip", "NORMAL", "PHYSICAL", 50],
      ["Stomp", "NORMAL", "PHYSICAL", 65],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Body Slam", "NORMAL", "PHYSICAL", 85],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Hyper Drill", "NORMAL", "PHYSICAL", 100],
      ["Endeavor", "NORMAL", "PHYSICAL", 120],
      ["Mega Kick", "NORMAL", "PHYSICAL", 120],
      ["Blood Moon", "NORMAL", "PHYSICAL", 600],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    487: [
      // Giratina — GHOST/DRAGON
      ["Lick", "GHOST", "PHYSICAL", 30],
      ["Twister", "DRAGON", "SPECIAL", 40],
      ["Last Respects", "GHOST", "PHYSICAL", 50],
      ["Ominous Wind", "GHOST", "SPECIAL", 60],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 80],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Spectral Thief", "GHOST", "PHYSICAL", 90],
      ["Poltergeist", "GHOST", "PHYSICAL", 110],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Astral Barrage", "GHOST", "SPECIAL", 600],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Untold Nightmare", "GHOST", "PHYSICAL", 600]
    ],
    488: [
      // Cresselia — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 65],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Zen Headbutt", "PSYCHIC", "PHYSICAL", 80],
      ["Freezing Glare", "PSYCHIC", "SPECIAL", 90],
      ["Dream Eater", "PSYCHIC", "SPECIAL", 100],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Astral Burst", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600],
      ["Psychic Fangs", "PSYCHIC", "PHYSICAL", 600]
    ],
    490: [
      // Manaphy — WATER
      ["Clamp", "WATER", "PHYSICAL", 35],
      ["Bubble", "WATER", "SPECIAL", 40],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Bubble Beam", "WATER", "SPECIAL", 65],
      ["Razor Shell", "WATER", "PHYSICAL", 75],
      ["Scald", "WATER", "SPECIAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Bouncy Bubble", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Tidal Vortex", "WATER", "SPECIAL", 600]
    ],
    491: [
      // Darkrai — DARK
      ["Power Trip", "DARK", "SPECIAL", 25],
      ["Fling", "DARK", "SPECIAL", 40],
      ["Snarl", "DARK", "SPECIAL", 55],
      ["Dark Pulse", "DARK", "SPECIAL", 65],
      ["Lash Out", "DARK", "SPECIAL", 75],
      ["Night Daze", "DARK", "SPECIAL", 85],
      ["Fiery Wrath", "DARK", "SPECIAL", 90],
      ["Hyperspace Fury", "DARK", "SPECIAL", 100],
      ["Baddy Bad", "DARK", "SPECIAL", 120],
      ["Malicious Moonsault", "DARK", "SPECIAL", 180],
      ["Endless Hollow", "DARK", "SPECIAL", 600],
      ["Shadow Burst", "DARK", "SPECIAL", 600],
      ["Wicked Blow", "DARK", "SPECIAL", 600]
    ],
    492: [
      // Shaymin — GRASS · evolui (→ #8492)
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Trailblaze", "GRASS", "PHYSICAL", 50],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Apple Acid", "GRASS", "SPECIAL", 90],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Grass Knot", "GRASS", "SPECIAL", 100],
      ["Petal Dance", "GRASS", "SPECIAL", 120],
      ["Wood Hammer", "GRASS", "PHYSICAL", 120],
      ["Chloroblast", "GRASS", "PHYSICAL", 600],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    8492: [
      // Shaymin Sky — GRASS/FLYING
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Gust", "FLYING", "SPECIAL", 40],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Syrup Bomb", "GRASS", "SPECIAL", 60],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Oblivion Wing", "FLYING", "SPECIAL", 80],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Grass Knot", "GRASS", "SPECIAL", 100],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Frenzy Plant", "GRASS", "SPECIAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600],
      ["Sky Attack", "FLYING", "SPECIAL", 600]
    ],
    493: [
      // Arceus — NORMAL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Razor Wind", "NORMAL", "SPECIAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Judgment", "NORMAL", "SPECIAL", 100],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Blood Moon", "NORMAL", "PHYSICAL", 600],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600]
    ],
    494: [
      // Victini — PSYCHIC/FIRE
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Heart Stamp", "PSYCHIC", "PHYSICAL", 55],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 65],
      ["Fire Punch", "FIRE", "PHYSICAL", 75],
      ["Blaze Kick", "FIRE", "PHYSICAL", 85],
      ["Mist Ball", "PSYCHIC", "SPECIAL", 95],
      ["Photon Geyser", "PSYCHIC", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Raging Fury", "FIRE", "PHYSICAL", 120],
      ["Astral Burst", "PSYCHIC", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600],
      ["Solar Flare", "FIRE", "SPECIAL", 600]
    ],
    638: [
      // Cobalion — STEEL/FIGHTING
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Vacuum Wave", "FIGHTING", "SPECIAL", 40],
      ["Tachyon Cutter", "STEEL", "SPECIAL", 50],
      ["Double Iron Bash", "STEEL", "PHYSICAL", 60],
      ["Drain Punch", "FIGHTING", "PHYSICAL", 75],
      ["Aura Sphere", "FIGHTING", "SPECIAL", 80],
      ["Flash Cannon", "STEEL", "SPECIAL", 90],
      ["Magnet Bomb", "STEEL", "PHYSICAL", 95],
      ["Axe Kick", "FIGHTING", "PHYSICAL", 120],
      ["Steel Beam", "STEEL", "SPECIAL", 120],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Alloy Surge", "STEEL", "SPECIAL", 600],
      ["Focus Blast", "FIGHTING", "SPECIAL", 600]
    ],
    639: [
      // Terrakion — ROCK/FIGHTING
      ["Rollout", "ROCK", "PHYSICAL", 30],
      ["Rock Smash", "FIGHTING", "PHYSICAL", 40],
      ["Smack Down", "ROCK", "PHYSICAL", 50],
      ["Rock Tomb", "ROCK", "PHYSICAL", 60],
      ["Drain Punch", "FIGHTING", "PHYSICAL", 75],
      ["Submission", "FIGHTING", "PHYSICAL", 80],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Geo Pulse", "ROCK", "PHYSICAL", 600],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600]
    ],
    640: [
      // Virizion — GRASS/FIGHTING
      ["Magical Leaf", "GRASS", "SPECIAL", 30],
      ["Rock Smash", "FIGHTING", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Syrup Bomb", "GRASS", "SPECIAL", 60],
      ["Drain Punch", "FIGHTING", "PHYSICAL", 75],
      ["Submission", "FIGHTING", "PHYSICAL", 80],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Grass Knot", "GRASS", "SPECIAL", 100],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Seed Flare", "GRASS", "SPECIAL", 120],
      ["Flora Burst", "GRASS", "SPECIAL", 600],
      ["Focus Blast", "FIGHTING", "SPECIAL", 600],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600]
    ],
    641: [
      // Tornadus — FLYING · evolui (→ #8641)
      ["Aerial Ace", "FLYING", "PHYSICAL", 25],
      ["Gust", "FLYING", "SPECIAL", 40],
      ["Air Cutter", "FLYING", "SPECIAL", 60],
      ["Chatter", "FLYING", "SPECIAL", 65],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Bounce", "FLYING", "PHYSICAL", 85],
      ["Floaty Fall", "FLYING", "PHYSICAL", 90],
      ["Beak Blast", "FLYING", "PHYSICAL", 100],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Bleakwind Storm", "FLYING", "SPECIAL", 600],
      ["Sky Attack", "FLYING", "SPECIAL", 600],
      ["Sky Dive", "FLYING", "PHYSICAL", 600]
    ],
    8641: [
      // Tornadus Therian — FLYING
      ["Aerial Ace", "FLYING", "PHYSICAL", 25],
      ["Gust", "FLYING", "SPECIAL", 40],
      ["Air Cutter", "FLYING", "SPECIAL", 60],
      ["Chatter", "FLYING", "SPECIAL", 65],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Bounce", "FLYING", "PHYSICAL", 85],
      ["Floaty Fall", "FLYING", "PHYSICAL", 90],
      ["Beak Blast", "FLYING", "PHYSICAL", 100],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Bleakwind Storm", "FLYING", "SPECIAL", 600],
      ["Sky Attack", "FLYING", "SPECIAL", 600],
      ["Sky Dive", "FLYING", "PHYSICAL", 600]
    ],
    642: [
      // Thundurus — ELECTRIC/FLYING · evolui (→ #8642)
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Gust", "FLYING", "SPECIAL", 40],
      ["Charge Beam", "ELECTRIC", "SPECIAL", 50],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Drill Peck", "FLYING", "PHYSICAL", 75],
      ["Bounce", "FLYING", "PHYSICAL", 85],
      ["Fusion Bolt", "ELECTRIC", "PHYSICAL", 100],
      ["Plasma Fists", "ELECTRIC", "PHYSICAL", 100],
      ["Brave Bird", "FLYING", "PHYSICAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Bolt Strike", "ELECTRIC", "SPECIAL", 600],
      ["Sky Attack", "FLYING", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "PHYSICAL", 600]
    ],
    8642: [
      // Thundurus Therian — ELECTRIC/FLYING
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Gust", "FLYING", "SPECIAL", 40],
      ["Charge Beam", "ELECTRIC", "SPECIAL", 50],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Oblivion Wing", "FLYING", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Electro Drift", "ELECTRIC", "SPECIAL", 100],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Bolt Strike", "ELECTRIC", "SPECIAL", 600],
      ["Sky Attack", "FLYING", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    643: [
      // Reshiram — DRAGON/FIRE
      ["Twister", "DRAGON", "SPECIAL", 35],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Dragon Darts", "DRAGON", "SPECIAL", 50],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Flame Burst", "FIRE", "SPECIAL", 70],
      ["Torch Song", "FIRE", "SPECIAL", 80],
      ["Core Enforcer", "DRAGON", "SPECIAL", 100],
      ["Spacial Rend", "DRAGON", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Overheat", "FIRE", "SPECIAL", 120],
      ["Dragon Strike", "DRAGON", "SPECIAL", 600],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Solar Flare", "FIRE", "SPECIAL", 600]
    ],
    644: [
      // Zekrom — DRAGON/ELECTRIC
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 45],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Breaking Swipe", "DRAGON", "PHYSICAL", 60],
      ["Thunder Punch", "ELECTRIC", "PHYSICAL", 75],
      ["Zing Zap", "ELECTRIC", "PHYSICAL", 80],
      ["Dragon Hammer", "DRAGON", "PHYSICAL", 90],
      ["Dragon Rush", "DRAGON", "PHYSICAL", 100],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120],
      ["Bolt Strike", "ELECTRIC", "PHYSICAL", 600],
      ["Dragon Smash", "DRAGON", "PHYSICAL", 600],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600]
    ],
    645: [
      // Landorus — GROUND/FLYING · evolui (→ #8645)
      ["Bone Rush", "GROUND", "PHYSICAL", 25],
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 40],
      ["Mud Shot", "GROUND", "SPECIAL", 55],
      ["Mud Bomb", "GROUND", "SPECIAL", 65],
      ["Air Slash", "FLYING", "SPECIAL", 80],
      ["Oblivion Wing", "FLYING", "SPECIAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Earthquake", "GROUND", "PHYSICAL", 100],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Crossing Fissure", "GROUND", "SPECIAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600],
      ["Sky Attack", "FLYING", "PHYSICAL", 600]
    ],
    8645: [
      // Landorus Therian — GROUND/FLYING
      ["Bone Rush", "GROUND", "PHYSICAL", 25],
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 40],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Bone Club", "GROUND", "PHYSICAL", 65],
      ["Drill Peck", "FLYING", "PHYSICAL", 80],
      ["Bounce", "FLYING", "PHYSICAL", 85],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Earthquake", "GROUND", "PHYSICAL", 100],
      ["Brave Bird", "FLYING", "PHYSICAL", 120],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600],
      ["Sky Attack", "FLYING", "PHYSICAL", 600]
    ],
    9646: [
      // Black Kyurem — DRAGON/ICE
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Ice Shard", "ICE", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Breaking Swipe", "DRAGON", "PHYSICAL", 60],
      ["Ice Punch", "ICE", "PHYSICAL", 75],
      ["Icicle Crash", "ICE", "PHYSICAL", 85],
      ["Dragon Hammer", "DRAGON", "PHYSICAL", 90],
      ["Dragon Rush", "DRAGON", "PHYSICAL", 100],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Glacial Lance", "ICE", "PHYSICAL", 600],
      ["Roar of Time", "DRAGON", "PHYSICAL", 600]
    ],
    646: [
      // Kyurem — DRAGON/ICE · evolui (→ #8646)
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Powder Snow", "ICE", "SPECIAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Freeze-Dry", "ICE", "SPECIAL", 70],
      ["Icicle Crash", "ICE", "PHYSICAL", 85],
      ["Dragon Hammer", "DRAGON", "PHYSICAL", 90],
      ["Core Enforcer", "DRAGON", "SPECIAL", 100],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Dragon Strike", "DRAGON", "SPECIAL", 600],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Permafrost", "ICE", "SPECIAL", 600]
    ],
    8646: [
      // White Kyurem — DRAGON/ICE
      ["Twister", "DRAGON", "SPECIAL", 35],
      ["Powder Snow", "ICE", "SPECIAL", 40],
      ["Dragon Darts", "DRAGON", "SPECIAL", 50],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Freeze-Dry", "ICE", "SPECIAL", 70],
      ["Freezy Frost", "ICE", "SPECIAL", 85],
      ["Core Enforcer", "DRAGON", "SPECIAL", 100],
      ["Spacial Rend", "DRAGON", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Glacial Lance", "ICE", "SPECIAL", 600],
      ["Roar of Time", "DRAGON", "SPECIAL", 600]
    ],
    647: [
      // Keldeo — WATER/FIGHTING · evolui (→ #8647)
      ["Water Shuriken", "WATER", "SPECIAL", 25],
      ["Vacuum Wave", "FIGHTING", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Final Gambit", "FIGHTING", "SPECIAL", 70],
      ["Aura Sphere", "FIGHTING", "SPECIAL", 90],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Surf", "WATER", "SPECIAL", 100],
      ["Focus Blast", "FIGHTING", "SPECIAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Meteor Assault", "FIGHTING", "SPECIAL", 600]
    ],
    8647: [
      // Keldeo Resolute — WATER/FIGHTING
      ["Water Shuriken", "WATER", "SPECIAL", 25],
      ["Vacuum Wave", "FIGHTING", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Final Gambit", "FIGHTING", "SPECIAL", 70],
      ["Aura Sphere", "FIGHTING", "SPECIAL", 90],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Surf", "WATER", "SPECIAL", 100],
      ["Focus Blast", "FIGHTING", "SPECIAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Meteor Assault", "FIGHTING", "SPECIAL", 600]
    ],
    648: [
      // Meloetta — NORMAL/PSYCHIC
      ["Echoed Voice", "NORMAL", "SPECIAL", 35],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Snore", "NORMAL", "SPECIAL", 50],
      ["Hidden Power", "NORMAL", "SPECIAL", 60],
      ["Psychic Noise", "PSYCHIC", "SPECIAL", 75],
      ["Eerie Spell", "PSYCHIC", "SPECIAL", 80],
      ["Revelation Dance", "NORMAL", "SPECIAL", 90],
      ["Swift", "NORMAL", "SPECIAL", 100],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Tera Starstorm", "NORMAL", "SPECIAL", 120],
      ["Blood Moon", "NORMAL", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600]
    ],
    649: [
      // Genesect — BUG/STEEL
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Shredder Team", "BUG", "PHYSICAL", 55],
      ["Silver Wind", "BUG", "SPECIAL", 60],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Flash Cannon", "STEEL", "SPECIAL", 80],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Signal Beam", "BUG", "SPECIAL", 90],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Alloy Surge", "STEEL", "SPECIAL", 600],
      ["Bug Impact", "BUG", "PHYSICAL", 600],
      ["Hive Crush", "BUG", "SPECIAL", 600]
    ],
    716: [
      // Xerneas — FAIRY
      ["Disarming Voice", "FAIRY", "SPECIAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Spirit Break", "FAIRY", "PHYSICAL", 75],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Play Rough", "FAIRY", "PHYSICAL", 90],
      ["Sparkly Swirl", "FAIRY", "SPECIAL", 90],
      ["Misty Explosion", "FAIRY", "SPECIAL", 100],
      ["Springtide Storm", "FAIRY", "SPECIAL", 100],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 600],
      ["Let's Snuggle Forever", "FAIRY", "PHYSICAL", 600],
      ["Light of Ruin", "FAIRY", "PHYSICAL", 600]
    ],
    717: [
      // Yveltal — DARK/FLYING
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 40],
      ["Payback", "DARK", "PHYSICAL", 50],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Air Slash", "FLYING", "SPECIAL", 80],
      ["Dark Pulse", "DARK", "SPECIAL", 80],
      ["Oblivion Wing", "FLYING", "SPECIAL", 80],
      ["Fiery Wrath", "DARK", "SPECIAL", 90],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Endless Hollow", "DARK", "SPECIAL", 600],
      ["Sky Attack", "FLYING", "PHYSICAL", 600],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    718: [
      // Zygarde — DRAGON/GROUND · evolui (→ #9718)
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Dragon Tail", "DRAGON", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Dragon Hammer", "DRAGON", "PHYSICAL", 90],
      ["Dragon Rush", "DRAGON", "PHYSICAL", 100],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600],
      ["Roar of Time", "DRAGON", "PHYSICAL", 600]
    ],
    8718: [
      // Zygarde 10% — DRAGON/GROUND · evolui (→ #718)
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Dragon Tail", "DRAGON", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Dragon Hammer", "DRAGON", "PHYSICAL", 90],
      ["Dragon Rush", "DRAGON", "PHYSICAL", 100],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600],
      ["Roar of Time", "DRAGON", "PHYSICAL", 600]
    ],
    9718: [
      // Zygarde Complete — DRAGON/GROUND
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Dragon Tail", "DRAGON", "PHYSICAL", 60],
      ["Mud Bomb", "GROUND", "SPECIAL", 70],
      ["Scorching Sands", "GROUND", "SPECIAL", 80],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 90],
      ["Core Enforcer", "DRAGON", "SPECIAL", 100],
      ["Earth Power", "GROUND", "SPECIAL", 120],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600],
      ["Roar of Time", "DRAGON", "PHYSICAL", 600]
    ],
    719: [
      // Diancie — ROCK/FAIRY
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Ancient Power", "ROCK", "SPECIAL", 60],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 75],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Moonblast", "FAIRY", "SPECIAL", 95],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Power Gem", "ROCK", "SPECIAL", 120],
      ["Crumbling Rain", "ROCK", "SPECIAL", 600],
      ["Light of Ruin", "FAIRY", "PHYSICAL", 600],
      ["Meteor Beam", "ROCK", "PHYSICAL", 600]
    ],
    720: [
      // Hoopa — PSYCHIC/GHOST · evolui (→ #8720)
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Night Shade", "GHOST", "SPECIAL", 45],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Bitter Malice", "GHOST", "SPECIAL", 75],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Astral Barrage", "GHOST", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600]
    ],
    8720: [
      // Hoopa Unbound — PSYCHIC/DARK
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Beat Up", "DARK", "PHYSICAL", 55],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 65],
      ["Comeuppance", "DARK", "PHYSICAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600],
      ["Wicked Blow", "DARK", "SPECIAL", 600]
    ],
    721: [
      // Volcanion — FIRE/WATER
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Bubble Beam", "WATER", "SPECIAL", 65],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Inferno", "FIRE", "SPECIAL", 100],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Blast Burn", "FIRE", "SPECIAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    785: [
      // Tapu Koko — ELECTRIC/FAIRY
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Fairy Wind", "FAIRY", "PHYSICAL", 40],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 50],
      ["Spark", "ELECTRIC", "PHYSICAL", 65],
      ["Spirit Break", "FAIRY", "PHYSICAL", 75],
      ["Play Rough", "FAIRY", "PHYSICAL", 90],
      ["Wild Charge", "ELECTRIC", "PHYSICAL", 90],
      ["Supercell Slam", "ELECTRIC", "PHYSICAL", 100],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120],
      ["Bolt Strike", "ELECTRIC", "PHYSICAL", 600],
      ["Light of Ruin", "FAIRY", "PHYSICAL", 600],
      ["Static Overload", "ELECTRIC", "PHYSICAL", 600]
    ],
    786: [
      // Tapu Lele — PSYCHIC/FAIRY
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Light of Ruin", "FAIRY", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600]
    ],
    787: [
      // Tapu Bulu — GRASS/FAIRY
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Fairy Wind", "FAIRY", "PHYSICAL", 40],
      ["Trailblaze", "GRASS", "PHYSICAL", 50],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Spirit Break", "FAIRY", "PHYSICAL", 75],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Play Rough", "FAIRY", "PHYSICAL", 90],
      ["Ivy Cudgel", "GRASS", "PHYSICAL", 100],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600],
      ["Light of Ruin", "FAIRY", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600]
    ],
    788: [
      // Tapu Fini — WATER/FAIRY
      ["Water Shuriken", "WATER", "SPECIAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 80],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Surf", "WATER", "SPECIAL", 100],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Light of Ruin", "FAIRY", "SPECIAL", 600]
    ],
    791: [
      // Solgaleo — PSYCHIC/STEEL
      ["Stored Power", "PSYCHIC", "PHYSICAL", 25],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 55],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Glitzy Glow", "PSYCHIC", "PHYSICAL", 90],
      ["Psystrike", "PSYCHIC", "PHYSICAL", 100],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600],
      ["Prismatic Laser", "PSYCHIC", "PHYSICAL", 600],
      ["Steel Beam", "STEEL", "PHYSICAL", 600]
    ],
    792: [
      // Lunala — PSYCHIC/GHOST
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Night Shade", "GHOST", "SPECIAL", 45],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Bitter Malice", "GHOST", "SPECIAL", 75],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Astral Barrage", "GHOST", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600]
    ],
    793: [
      // Nihilego — ROCK/POISON
      ["Rock Blast", "ROCK", "SPECIAL", 25],
      ["Acid Spray", "POISON", "SPECIAL", 40],
      ["Ancient Power", "ROCK", "SPECIAL", 60],
      ["Rock Tomb", "ROCK", "SPECIAL", 60],
      ["Venoshock", "POISON", "SPECIAL", 65],
      ["Sludge Bomb", "POISON", "SPECIAL", 90],
      ["Mighty Cleave", "ROCK", "SPECIAL", 95],
      ["Diamond Storm", "ROCK", "SPECIAL", 100],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Power Gem", "ROCK", "SPECIAL", 120],
      ["Crumbling Rain", "ROCK", "SPECIAL", 600],
      ["Meteor Beam", "ROCK", "SPECIAL", 600],
      ["Noxious Torque", "POISON", "SPECIAL", 600]
    ],
    794: [
      // Buzzwole — BUG/FIGHTING
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Sky Uppercut", "FIGHTING", "PHYSICAL", 85],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 120],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Hive Crush", "BUG", "PHYSICAL", 600],
      ["Megahorn", "BUG", "PHYSICAL", 600],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600]
    ],
    795: [
      // Pheromosa — BUG/FIGHTING
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Aura Sphere", "FIGHTING", "SPECIAL", 80],
      ["Pollen Puff", "BUG", "SPECIAL", 90],
      ["Bug Buzz", "BUG", "SPECIAL", 120],
      ["Secret Sword", "FIGHTING", "SPECIAL", 120],
      ["Swarm Pulse", "BUG", "SPECIAL", 120],
      ["Hive Crush", "BUG", "SPECIAL", 600],
      ["Megahorn", "BUG", "PHYSICAL", 600],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600]
    ],
    796: [
      // Xurkitree — ELECTRIC
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Charge Beam", "ELECTRIC", "SPECIAL", 50],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Overdrive", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Wildbolt Storm", "ELECTRIC", "SPECIAL", 100],
      ["Thunder", "ELECTRIC", "SPECIAL", 110],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Bolt Strike", "ELECTRIC", "SPECIAL", 600],
      ["Plasma Fists", "ELECTRIC", "SPECIAL", 600],
      ["Volt Surge", "ELECTRIC", "SPECIAL", 600]
    ],
    797: [
      // Celesteela — STEEL/FLYING
      ["Gust", "FLYING", "SPECIAL", 40],
      ["Gear Grind", "STEEL", "PHYSICAL", 50],
      ["Tachyon Cutter", "STEEL", "SPECIAL", 50],
      ["Mirror Shot", "STEEL", "SPECIAL", 65],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Anchor Shot", "STEEL", "PHYSICAL", 80],
      ["Bounce", "FLYING", "PHYSICAL", 85],
      ["Behemoth Bash", "STEEL", "PHYSICAL", 100],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Sky Attack", "FLYING", "SPECIAL", 600],
      ["Steel Beam", "STEEL", "SPECIAL", 600]
    ],
    798: [
      // Kartana — GRASS/STEEL
      ["Snap Trap", "GRASS", "PHYSICAL", 35],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Razor Leaf", "GRASS", "PHYSICAL", 55],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Smart Strike", "STEEL", "PHYSICAL", 70],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Leaf Blade", "GRASS", "PHYSICAL", 90],
      ["Ivy Cudgel", "GRASS", "PHYSICAL", 100],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Make It Rain", "STEEL", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600],
      ["Vine Smash", "GRASS", "PHYSICAL", 600]
    ],
    799: [
      // Guzzlord — DARK/DRAGON
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Beat Up", "DARK", "PHYSICAL", 55],
      ["Assurance", "DARK", "PHYSICAL", 60],
      ["Fickle Beam", "DRAGON", "SPECIAL", 80],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Fiery Wrath", "DARK", "SPECIAL", 90],
      ["Night Daze", "DARK", "SPECIAL", 90],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Endless Hollow", "DARK", "SPECIAL", 600],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    800: [
      // Necrozma — PSYCHIC
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Psychic", "PSYCHIC", "SPECIAL", 90],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 600]
    ],
    801: [
      // Magearna — STEEL/FAIRY
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Gear Grind", "STEEL", "SPECIAL", 50],
      ["Tachyon Cutter", "STEEL", "SPECIAL", 50],
      ["Mirror Shot", "STEEL", "SPECIAL", 65],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 80],
      ["Flash Cannon", "STEEL", "SPECIAL", 80],
      ["Behemoth Bash", "STEEL", "SPECIAL", 100],
      ["Doom Desire", "STEEL", "SPECIAL", 120],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Alloy Breaker", "STEEL", "SPECIAL", 600],
      ["Light of Ruin", "FAIRY", "SPECIAL", 600],
      ["Steel Beam", "STEEL", "SPECIAL", 600]
    ],
    802: [
      // Marshadow — FIGHTING/GHOST
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Shadow Sneak", "GHOST", "PHYSICAL", 40],
      ["Low Kick", "FIGHTING", "PHYSICAL", 50],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Shadow Claw", "GHOST", "PHYSICAL", 70],
      ["Shadow Bone", "GHOST", "PHYSICAL", 85],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Cross Chop", "FIGHTING", "PHYSICAL", 100],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Astral Barrage", "GHOST", "PHYSICAL", 600],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    804: [
      // Naganadel — POISON/DRAGON
      ["Smog", "POISON", "SPECIAL", 30],
      ["Twister", "DRAGON", "SPECIAL", 40],
      ["Clear Smog", "POISON", "SPECIAL", 50],
      ["Sludge", "POISON", "SPECIAL", 65],
      ["Fickle Beam", "DRAGON", "SPECIAL", 80],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Sludge Wave", "POISON", "SPECIAL", 95],
      ["Malignant Chain", "POISON", "SPECIAL", 100],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Toxic Deluge", "POISON", "SPECIAL", 600],
      ["Venom Burst", "POISON", "SPECIAL", 600]
    ],
    805: [
      // Stakataka — ROCK/STEEL
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Rock Tomb", "ROCK", "PHYSICAL", 60],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Meteor Beam", "ROCK", "PHYSICAL", 600],
      ["Steel Beam", "STEEL", "PHYSICAL", 600]
    ],
    806: [
      // Blacephalon — FIRE/GHOST
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Night Shade", "GHOST", "SPECIAL", 45],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Bitter Malice", "GHOST", "SPECIAL", 75],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Inferno", "FIRE", "SPECIAL", 100],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Astral Barrage", "GHOST", "SPECIAL", 600],
      ["Blast Burn", "FIRE", "SPECIAL", 600],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    807: [
      // Zeraora — ELECTRIC
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 50],
      ["Spark", "ELECTRIC", "PHYSICAL", 65],
      ["Thunder Punch", "ELECTRIC", "PHYSICAL", 75],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 80],
      ["Discharge", "ELECTRIC", "SPECIAL", 90],
      ["Thunderbolt", "ELECTRIC", "SPECIAL", 90],
      ["Thunder", "ELECTRIC", "SPECIAL", 120],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120],
      ["Bolt Strike", "ELECTRIC", "PHYSICAL", 600],
      ["Plasma Fists", "ELECTRIC", "PHYSICAL", 600],
      ["Volt Surge", "ELECTRIC", "SPECIAL", 600]
    ],
    808: [
      // Meltan — STEEL · evolui (→ #809)
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Gear Grind", "STEEL", "PHYSICAL", 50],
      ["Metal Claw", "STEEL", "PHYSICAL", 50],
      ["Hard Press", "STEEL", "PHYSICAL", 60],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Meteor Mash", "STEEL", "PHYSICAL", 90],
      ["Behemoth Bash", "STEEL", "PHYSICAL", 100],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Steel Roller", "STEEL", "PHYSICAL", 130],
      ["Alloy Surge", "STEEL", "PHYSICAL", 600],
      ["Make It Rain", "STEEL", "PHYSICAL", 600],
      ["Steel Beam", "STEEL", "PHYSICAL", 600]
    ],
    809: [
      // Melmetal — STEEL
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Gear Grind", "STEEL", "PHYSICAL", 50],
      ["Metal Claw", "STEEL", "PHYSICAL", 50],
      ["Hard Press", "STEEL", "PHYSICAL", 60],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Meteor Mash", "STEEL", "PHYSICAL", 90],
      ["Behemoth Bash", "STEEL", "PHYSICAL", 100],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Steel Roller", "STEEL", "PHYSICAL", 130],
      ["Alloy Surge", "STEEL", "PHYSICAL", 600],
      ["Make It Rain", "STEEL", "PHYSICAL", 600],
      ["Steel Beam", "STEEL", "PHYSICAL", 600]
    ],
    888: [
      // Zacian — FAIRY · evolui (→ #8888)
      ["Disarming Voice", "FAIRY", "PHYSICAL", 25],
      ["Fairy Wind", "FAIRY", "PHYSICAL", 40],
      ["Draining Kiss", "FAIRY", "PHYSICAL", 50],
      ["Spirit Break", "FAIRY", "PHYSICAL", 75],
      ["Alluring Voice", "FAIRY", "PHYSICAL", 80],
      ["Play Rough", "FAIRY", "PHYSICAL", 90],
      ["Sparkly Swirl", "FAIRY", "PHYSICAL", 90],
      ["Misty Explosion", "FAIRY", "PHYSICAL", 100],
      ["Springtide Storm", "FAIRY", "PHYSICAL", 100],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Fleur Cannon", "FAIRY", "PHYSICAL", 600],
      ["Let's Snuggle Forever", "FAIRY", "PHYSICAL", 600],
      ["Light of Ruin", "FAIRY", "PHYSICAL", 600]
    ],
    8888: [
      // Zacian Crowned — FAIRY/STEEL
      ["Disarming Voice", "FAIRY", "PHYSICAL", 25],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Draining Kiss", "FAIRY", "PHYSICAL", 50],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Spirit Break", "FAIRY", "PHYSICAL", 75],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Play Rough", "FAIRY", "PHYSICAL", 90],
      ["Misty Explosion", "FAIRY", "PHYSICAL", 100],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Light of Ruin", "FAIRY", "PHYSICAL", 600],
      ["Starlight Charm", "FAIRY", "PHYSICAL", 600],
      ["Steel Beam", "STEEL", "PHYSICAL", 600]
    ],
    889: [
      // Zamazenta — FIGHTING · evolui (→ #8889)
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Low Kick", "FIGHTING", "PHYSICAL", 50],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Sky Uppercut", "FIGHTING", "PHYSICAL", 85],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Cross Chop", "FIGHTING", "PHYSICAL", 100],
      ["Axe Kick", "FIGHTING", "PHYSICAL", 120],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Combat Torque", "FIGHTING", "PHYSICAL", 600],
      ["Focus Blast", "FIGHTING", "PHYSICAL", 600],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600]
    ],
    8889: [
      // Zamazenta Crowned — FIGHTING/STEEL
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Low Kick", "FIGHTING", "PHYSICAL", 50],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Cross Chop", "FIGHTING", "PHYSICAL", 100],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600],
      ["Steel Beam", "STEEL", "PHYSICAL", 600]
    ],
    890: [
      // Eternatus — POISON/DRAGON
      ["Smog", "POISON", "SPECIAL", 30],
      ["Twister", "DRAGON", "SPECIAL", 40],
      ["Clear Smog", "POISON", "SPECIAL", 50],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Venoshock", "POISON", "SPECIAL", 65],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Sludge Bomb", "POISON", "SPECIAL", 90],
      ["Malignant Chain", "POISON", "SPECIAL", 100],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Noxious Torque", "POISON", "SPECIAL", 600],
      ["Roar of Time", "DRAGON", "SPECIAL", 600],
      ["Toxic Deluge", "POISON", "SPECIAL", 600]
    ],
    892: [
      // Urshifu — FIGHTING/DARK
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Low Kick", "FIGHTING", "PHYSICAL", 50],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Night Slash", "DARK", "PHYSICAL", 70],
      ["Darkest Lariat", "DARK", "PHYSICAL", 85],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Cross Chop", "FIGHTING", "PHYSICAL", 100],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    893: [
      // Zarude — DARK/GRASS
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Payback", "DARK", "PHYSICAL", 50],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Darkest Lariat", "DARK", "PHYSICAL", 85],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Hyperspace Fury", "DARK", "PHYSICAL", 100],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    894: [
      // Regieleki — ELECTRIC
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 50],
      ["Spark", "ELECTRIC", "PHYSICAL", 65],
      ["Thunder Punch", "ELECTRIC", "PHYSICAL", 75],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Electro Drift", "ELECTRIC", "SPECIAL", 100],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Bolt Strike", "ELECTRIC", "PHYSICAL", 600],
      ["Plasma Fists", "ELECTRIC", "PHYSICAL", 600],
      ["Volt Surge", "ELECTRIC", "SPECIAL", 600]
    ],
    895: [
      // Regidrago — DRAGON
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Dragon Tail", "DRAGON", "PHYSICAL", 60],
      ["Fickle Beam", "DRAGON", "SPECIAL", 80],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 90],
      ["Core Enforcer", "DRAGON", "SPECIAL", 100],
      ["Spacial Rend", "DRAGON", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Dragon Strike", "DRAGON", "SPECIAL", 600],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Roar of Time", "DRAGON", "PHYSICAL", 600]
    ],
    896: [
      // Glastrier — ICE
      ["Triple Axel", "ICE", "PHYSICAL", 25],
      ["Ice Shard", "ICE", "PHYSICAL", 40],
      ["Avalanche", "ICE", "PHYSICAL", 60],
      ["Ice Fang", "ICE", "PHYSICAL", 65],
      ["Ice Punch", "ICE", "PHYSICAL", 75],
      ["Icicle Crash", "ICE", "PHYSICAL", 85],
      ["Ice Hammer", "ICE", "PHYSICAL", 100],
      ["Mountain Gale", "ICE", "PHYSICAL", 100],
      ["Blizzard", "ICE", "PHYSICAL", 110],
      ["Permafrost Smash", "ICE", "PHYSICAL", 120],
      ["Freeze Shock", "ICE", "PHYSICAL", 600],
      ["Glacial Lance", "ICE", "PHYSICAL", 600],
      ["Permafrost", "ICE", "PHYSICAL", 600]
    ],
    897: [
      // Spectrier — GHOST
      ["Shadow Punch", "GHOST", "SPECIAL", 25],
      ["Ominous Wind", "GHOST", "SPECIAL", 45],
      ["Night Shade", "GHOST", "SPECIAL", 55],
      ["Infernal Parade", "GHOST", "SPECIAL", 60],
      ["Bitter Malice", "GHOST", "SPECIAL", 75],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Phantom Force", "GHOST", "SPECIAL", 90],
      ["Spectral Thief", "GHOST", "SPECIAL", 90],
      ["Poltergeist", "GHOST", "SPECIAL", 110],
      ["Phantom Wail", "GHOST", "SPECIAL", 120],
      ["Astral Barrage", "GHOST", "SPECIAL", 600],
      ["Moongeist Beam", "GHOST", "SPECIAL", 600],
      ["Soul-Stealing 7-Star Strike", "GHOST", "SPECIAL", 600]
    ],
    898: [
      // Calyrex — PSYCHIC/GRASS
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Psystrike", "PSYCHIC", "SPECIAL", 100],
      ["Petal Dance", "GRASS", "SPECIAL", 120],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "PHYSICAL", 600]
    ],
    8905: [
      // Enamorus Therian — FAIRY/FLYING
      ["Disarming Voice", "FAIRY", "SPECIAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Gust", "FLYING", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Oblivion Wing", "FLYING", "SPECIAL", 80],
      ["Sparkly Swirl", "FAIRY", "SPECIAL", 90],
      ["Misty Explosion", "FAIRY", "SPECIAL", 100],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Light of Ruin", "FAIRY", "SPECIAL", 600],
      ["Sky Attack", "FLYING", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    1001: [
      // Wo-Chien — DARK/GRASS
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Snarl", "DARK", "SPECIAL", 55],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Fiery Wrath", "DARK", "SPECIAL", 90],
      ["Hyperspace Fury", "DARK", "PHYSICAL", 100],
      ["Ivy Cudgel", "GRASS", "PHYSICAL", 100],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Frenzy Plant", "GRASS", "SPECIAL", 600],
      ["Wicked Blow", "DARK", "SPECIAL", 600]
    ],
    1002: [
      // Chien-Pao — DARK/ICE
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Ice Shard", "ICE", "PHYSICAL", 40],
      ["Payback", "DARK", "PHYSICAL", 50],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Ice Fang", "ICE", "PHYSICAL", 65],
      ["Darkest Lariat", "DARK", "PHYSICAL", 85],
      ["Icicle Crash", "ICE", "PHYSICAL", 85],
      ["Hyperspace Fury", "DARK", "PHYSICAL", 100],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Glacial Lance", "ICE", "PHYSICAL", 600],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    1003: [
      // Ting-Lu — DARK/GROUND
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Sand Tomb", "GROUND", "PHYSICAL", 35],
      ["Payback", "DARK", "PHYSICAL", 50],
      ["Brutal Swing", "DARK", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Darkest Lariat", "DARK", "PHYSICAL", 85],
      ["Hyperspace Fury", "DARK", "PHYSICAL", 100],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Land's Wrath", "GROUND", "PHYSICAL", 600],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    1004: [
      // Chi-Yu — DARK/FIRE
      ["Power Trip", "DARK", "SPECIAL", 25],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Snarl", "DARK", "SPECIAL", 55],
      ["Dark Pulse", "DARK", "SPECIAL", 65],
      ["Flame Burst", "FIRE", "SPECIAL", 70],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Fiery Wrath", "DARK", "SPECIAL", 90],
      ["Night Daze", "DARK", "SPECIAL", 90],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Baddy Bad", "DARK", "SPECIAL", 120],
      ["Blast Burn", "FIRE", "SPECIAL", 600],
      ["Endless Hollow", "DARK", "SPECIAL", 600],
      ["Wicked Blow", "DARK", "SPECIAL", 600]
    ],
    1007: [
      // Koraidon — FIGHTING/DRAGON
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Low Kick", "FIGHTING", "PHYSICAL", 50],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 80],
      ["Dragon Hammer", "DRAGON", "PHYSICAL", 90],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Cross Chop", "FIGHTING", "PHYSICAL", 100],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600],
      ["Roar of Time", "DRAGON", "PHYSICAL", 600]
    ],
    1008: [
      // Miraidon — ELECTRIC/DRAGON
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Twister", "DRAGON", "SPECIAL", 40],
      ["Charge Beam", "ELECTRIC", "SPECIAL", 50],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Wildbolt Storm", "ELECTRIC", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Bolt Strike", "ELECTRIC", "SPECIAL", 600],
      ["Roar of Time", "DRAGON", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    1009: [
      // Walking Wake — WATER/DRAGON
      ["Water Shuriken", "WATER", "SPECIAL", 25],
      ["Twister", "DRAGON", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Muddy Water", "WATER", "SPECIAL", 90],
      ["Surf", "WATER", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Roar of Time", "DRAGON", "SPECIAL", 600]
    ],
    1010: [
      // Iron Leaves — GRASS/PSYCHIC
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Twin Beam", "PSYCHIC", "PHYSICAL", 40],
      ["Trailblaze", "GRASS", "PHYSICAL", 50],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Glitzy Glow", "PSYCHIC", "PHYSICAL", 90],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Ivy Cudgel", "GRASS", "PHYSICAL", 100],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600],
      ["Prismatic Laser", "PSYCHIC", "PHYSICAL", 600]
    ],
    1014: [
      // Okidogi — POISON/FIGHTING
      ["Poison Sting", "POISON", "PHYSICAL", 25],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Poison Tail", "POISON", "PHYSICAL", 50],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Sky Uppercut", "FIGHTING", "PHYSICAL", 85],
      ["Dire Claw", "POISON", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600],
      ["Noxious Torque", "POISON", "PHYSICAL", 600],
      ["Toxic Deluge", "POISON", "PHYSICAL", 600]
    ],
    1015: [
      // Munkidori — POISON/PSYCHIC
      ["Smog", "POISON", "SPECIAL", 30],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Clear Smog", "POISON", "SPECIAL", 50],
      ["Venoshock", "POISON", "SPECIAL", 65],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Sludge Bomb", "POISON", "SPECIAL", 90],
      ["Malignant Chain", "POISON", "SPECIAL", 100],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Noxious Torque", "POISON", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600],
      ["Toxic Deluge", "POISON", "SPECIAL", 600]
    ],
    1016: [
      // Fezandipiti — POISON/FAIRY
      ["Poison Sting", "POISON", "PHYSICAL", 25],
      ["Fairy Wind", "FAIRY", "PHYSICAL", 40],
      ["Poison Tail", "POISON", "PHYSICAL", 50],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Spirit Break", "FAIRY", "PHYSICAL", 75],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Dire Claw", "POISON", "PHYSICAL", 90],
      ["Play Rough", "FAIRY", "PHYSICAL", 90],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Light of Ruin", "FAIRY", "PHYSICAL", 600],
      ["Noxious Torque", "POISON", "PHYSICAL", 600],
      ["Toxic Deluge", "POISON", "PHYSICAL", 600]
    ],
    1017: [
      // Ogerpon — GRASS
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Trailblaze", "GRASS", "PHYSICAL", 50],
      ["Needle Arm", "GRASS", "PHYSICAL", 60],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Leaf Blade", "GRASS", "PHYSICAL", 90],
      ["Petal Blizzard", "GRASS", "PHYSICAL", 90],
      ["Ivy Cudgel", "GRASS", "PHYSICAL", 100],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Wood Hammer", "GRASS", "PHYSICAL", 120],
      ["Chloroblast", "GRASS", "PHYSICAL", 600],
      ["Frenzy Plant", "GRASS", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600]
    ],
    1020: [
      // Gouging Fire — FIRE/DRAGON
      ["Fire Spin", "FIRE", "PHYSICAL", 30],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Flame Wheel", "FIRE", "PHYSICAL", 60],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 80],
      ["Dragon Hammer", "DRAGON", "PHYSICAL", 90],
      ["Heat Crash", "FIRE", "PHYSICAL", 90],
      ["Sacred Fire", "FIRE", "PHYSICAL", 100],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Blast Burn", "FIRE", "PHYSICAL", 600],
      ["Ignition Point", "FIRE", "PHYSICAL", 600],
      ["Roar of Time", "DRAGON", "PHYSICAL", 600]
    ],
    1021: [
      // Raging Bolt — ELECTRIC/DRAGON
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Twister", "DRAGON", "SPECIAL", 40],
      ["Charge Beam", "ELECTRIC", "SPECIAL", 50],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Buzzy Buzz", "ELECTRIC", "SPECIAL", 90],
      ["Wildbolt Storm", "ELECTRIC", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Bolt Strike", "ELECTRIC", "SPECIAL", 600],
      ["Roar of Time", "DRAGON", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    1022: [
      // Iron Boulder — ROCK/PSYCHIC
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Twin Beam", "PSYCHIC", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Rock Tomb", "ROCK", "PHYSICAL", 60],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Glitzy Glow", "PSYCHIC", "PHYSICAL", 90],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Meteor Beam", "ROCK", "PHYSICAL", 600],
      ["Prismatic Laser", "PSYCHIC", "PHYSICAL", 600]
    ],
    1023: [
      // Iron Crown — STEEL/PSYCHIC
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Gear Grind", "STEEL", "SPECIAL", 50],
      ["Tachyon Cutter", "STEEL", "SPECIAL", 50],
      ["Mirror Shot", "STEEL", "SPECIAL", 65],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Flash Cannon", "STEEL", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Behemoth Bash", "STEEL", "SPECIAL", 100],
      ["Doom Desire", "STEEL", "SPECIAL", 120],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Alloy Breaker", "STEEL", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600],
      ["Steel Beam", "STEEL", "SPECIAL", 600]
    ],
    1024: [
      // Terapagos — NORMAL
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Flail", "NORMAL", "PHYSICAL", 50],
      ["Covet", "NORMAL", "PHYSICAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Razor Wind", "NORMAL", "SPECIAL", 80],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Judgment", "NORMAL", "SPECIAL", 100],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Blood Moon", "NORMAL", "PHYSICAL", 600],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600]
    ],
    1025: [
      // Pecharunt — POISON/GHOST
      ["Poison Sting", "POISON", "PHYSICAL", 25],
      ["Shadow Sneak", "GHOST", "PHYSICAL", 40],
      ["Poison Tail", "POISON", "PHYSICAL", 50],
      ["Barb Barrage", "POISON", "PHYSICAL", 60],
      ["Bitter Malice", "GHOST", "SPECIAL", 75],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Shell Side Arm", "POISON", "SPECIAL", 85],
      ["Malignant Chain", "POISON", "SPECIAL", 100],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Astral Barrage", "GHOST", "PHYSICAL", 600],
      ["Noxious Torque", "POISON", "PHYSICAL", 600],
      ["Toxic Deluge", "POISON", "SPECIAL", 600]
    ]
  };
  var GOLPES_MEGAS_2026_10_29 = {
    9150: [
      // Mega Mewtwo X — PSYCHIC/FIGHTING · 2ª mega do #150
      ["Stored Power", "PSYCHIC", "PHYSICAL", 25],
      ["Power-Up Punch", "FIGHTING", "PHYSICAL", 40],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 55],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 65],
      ["Brick Break", "FIGHTING", "PHYSICAL", 75],
      ["Eerie Spell", "PSYCHIC", "PHYSICAL", 80],
      ["Mist Ball", "PSYCHIC", "PHYSICAL", 95],
      ["Dynamic Punch", "FIGHTING", "PHYSICAL", 100],
      ["Mind Crusher", "PSYCHIC", "PHYSICAL", 120],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    3150: [
      // Mega Mewtwo Y — PSYCHIC · mega do #150
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Psychic Noise", "PSYCHIC", "SPECIAL", 75],
      ["Eerie Spell", "PSYCHIC", "SPECIAL", 80],
      ["Mist Ball", "PSYCHIC", "SPECIAL", 95],
      ["Photon Geyser", "PSYCHIC", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Astral Burst", "PSYCHIC", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600]
    ],
    3380: [
      // Mega Latias — DRAGON/PSYCHIC · mega do #380
      ["Scale Shot", "DRAGON", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Twister", "DRAGON", "SPECIAL", 40],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Spacial Rend", "DRAGON", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600]
    ],
    3381: [
      // Mega Latios — DRAGON/PSYCHIC · mega do #381
      ["Scale Shot", "DRAGON", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Twister", "DRAGON", "SPECIAL", 40],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Spacial Rend", "DRAGON", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600]
    ],
    3382: [
      // Primal Kyogre — WATER · mega do #382
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Bubble Beam", "WATER", "SPECIAL", 65],
      ["Brine", "WATER", "SPECIAL", 70],
      ["Scald", "WATER", "SPECIAL", 80],
      ["Bouncy Bubble", "WATER", "SPECIAL", 90],
      ["Surf", "WATER", "SPECIAL", 100],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Water Spout", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600],
      ["Tidal Vortex", "WATER", "SPECIAL", 600]
    ],
    3383: [
      // Primal Groudon — GROUND/FIRE · mega do #383
      ["Bone Rush", "GROUND", "PHYSICAL", 25],
      ["Fire Spin", "FIRE", "PHYSICAL", 30],
      ["Sand Tomb", "GROUND", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Fire Punch", "FIRE", "PHYSICAL", 75],
      ["Dig", "GROUND", "PHYSICAL", 80],
      ["High Horsepower", "GROUND", "PHYSICAL", 95],
      ["Sacred Fire", "FIRE", "PHYSICAL", 100],
      ["Fissure", "GROUND", "PHYSICAL", 120],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Blast Burn", "FIRE", "PHYSICAL", 600],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Ignition Point", "FIRE", "PHYSICAL", 600]
    ],
    3384: [
      // Mega Rayquaza — DRAGON/FLYING · mega do #384
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Bounce", "FLYING", "PHYSICAL", 85],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 90],
      ["Core Enforcer", "DRAGON", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600],
      ["Sky Dive", "FLYING", "PHYSICAL", 600]
    ],
    3485: [
      // Mega Heatran — FIRE/STEEL · mega do #485
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Tachyon Cutter", "STEEL", "SPECIAL", 45],
      ["Ember", "FIRE", "SPECIAL", 50],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Mirror Shot", "STEEL", "SPECIAL", 70],
      ["Flash Cannon", "STEEL", "SPECIAL", 80],
      ["Heat Wave", "FIRE", "SPECIAL", 95],
      ["Inferno", "FIRE", "SPECIAL", 100],
      ["Overheat", "FIRE", "SPECIAL", 120],
      ["Steel Beam", "STEEL", "SPECIAL", 120],
      ["Alloy Breaker", "STEEL", "SPECIAL", 600],
      ["Alloy Surge", "STEEL", "SPECIAL", 600],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    3491: [
      // Mega Darkrai — DARK · mega do #491
      ["Power Trip", "DARK", "SPECIAL", 25],
      ["Fling", "DARK", "SPECIAL", 40],
      ["Snarl", "DARK", "SPECIAL", 55],
      ["Dark Pulse", "DARK", "SPECIAL", 65],
      ["Lash Out", "DARK", "SPECIAL", 75],
      ["Night Daze", "DARK", "SPECIAL", 85],
      ["Fiery Wrath", "DARK", "SPECIAL", 90],
      ["Hyperspace Fury", "DARK", "SPECIAL", 100],
      ["Baddy Bad", "DARK", "SPECIAL", 120],
      ["Malicious Moonsault", "DARK", "SPECIAL", 180],
      ["Dark Impact", "DARK", "SPECIAL", 600],
      ["Endless Hollow", "DARK", "SPECIAL", 600],
      ["Wicked Blow", "DARK", "SPECIAL", 600]
    ],
    3718: [
      // Mega Zygarde — DRAGON/GROUND · mega do #718
      ["Mud-Slap", "GROUND", "SPECIAL", 25],
      ["Twister", "DRAGON", "SPECIAL", 35],
      ["Dragon Breath", "DRAGON", "SPECIAL", 55],
      ["Fickle Beam", "DRAGON", "SPECIAL", 65],
      ["Scorching Sands", "GROUND", "SPECIAL", 70],
      ["Mud Bomb", "GROUND", "SPECIAL", 80],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 90],
      ["Core Enforcer", "DRAGON", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Earth Power", "GROUND", "SPECIAL", 120],
      ["Crossing Fissure", "GROUND", "SPECIAL", 600],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Land's Wrath", "GROUND", "SPECIAL", 600]
    ],
    3719: [
      // Mega Diancie — ROCK/FAIRY · mega do #719
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Ancient Power", "ROCK", "SPECIAL", 60],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 75],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Moonblast", "FAIRY", "SPECIAL", 95],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Power Gem", "ROCK", "SPECIAL", 120],
      ["Crumbling Rain", "ROCK", "SPECIAL", 600],
      ["Light of Ruin", "FAIRY", "PHYSICAL", 600],
      ["Starlight Charm", "FAIRY", "PHYSICAL", 600]
    ],
    3801: [
      // Mega Magearna — STEEL/FAIRY · mega do #801
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Gear Grind", "STEEL", "SPECIAL", 50],
      ["Tachyon Cutter", "STEEL", "SPECIAL", 50],
      ["Mirror Shot", "STEEL", "SPECIAL", 65],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 80],
      ["Flash Cannon", "STEEL", "SPECIAL", 80],
      ["Behemoth Bash", "STEEL", "SPECIAL", 100],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Steel Beam", "STEEL", "SPECIAL", 120],
      ["Alloy Breaker", "STEEL", "SPECIAL", 600],
      ["Light of Ruin", "FAIRY", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    3807: [
      // Mega Zeraora — ELECTRIC · mega do #807
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 50],
      ["Spark", "ELECTRIC", "PHYSICAL", 65],
      ["Thunder Punch", "ELECTRIC", "PHYSICAL", 75],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 80],
      ["Discharge", "ELECTRIC", "SPECIAL", 90],
      ["Thunderbolt", "ELECTRIC", "SPECIAL", 90],
      ["Thunder", "ELECTRIC", "SPECIAL", 120],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120],
      ["Bolt Strike", "ELECTRIC", "PHYSICAL", 600],
      ["Plasma Fists", "ELECTRIC", "PHYSICAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    3003: [
      // Mega Venusaur — GRASS/POISON · mega do #3
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Clear Smog", "POISON", "SPECIAL", 50],
      ["Leaf Tornado", "GRASS", "SPECIAL", 65],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Grass Pledge", "GRASS", "SPECIAL", 80],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Verdant Storm", "GRASS", "SPECIAL", 150],
      ["Petal Bloom", "GRASS", "SPECIAL", 600],
      ["Toxic Deluge", "POISON", "SPECIAL", 600]
    ],
    9006: [
      // Mega Charizard X — FIRE/DRAGON · 2ª mega do #6
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 55],
      ["Flame Wheel", "FIRE", "PHYSICAL", 60],
      ["Fire Punch", "FIRE", "PHYSICAL", 75],
      ["Dragon Rush", "DRAGON", "PHYSICAL", 85],
      ["Heat Crash", "FIRE", "PHYSICAL", 90],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Blast Burn", "FIRE", "PHYSICAL", 600],
      ["Dragon Smash", "DRAGON", "PHYSICAL", 600]
    ],
    3006: [
      // Mega Charizard Y — FIRE/FLYING · mega do #6
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 40],
      ["Flame Burst", "FIRE", "SPECIAL", 55],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Fire Pledge", "FIRE", "SPECIAL", 80],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Armor Cannon", "FIRE", "SPECIAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Mind Blown", "FIRE", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "SPECIAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    3009: [
      // Mega Blastoise — WATER · mega do #9
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Water Gun", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Brine", "WATER", "SPECIAL", 65],
      ["Bubble Beam", "WATER", "SPECIAL", 70],
      ["Hydro Steam", "WATER", "SPECIAL", 80],
      ["Bouncy Bubble", "WATER", "SPECIAL", 90],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Origin Pulse", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Water Spout", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Hydro Cannon", "WATER", "SPECIAL", 600]
    ],
    3015: [
      // Mega Beedrill — BUG/POISON · mega do #15
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["U-turn", "BUG", "PHYSICAL", 70],
      ["Poison Jab", "POISON", "PHYSICAL", 80],
      ["Lunge", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Hive Crush", "BUG", "PHYSICAL", 600],
      ["Toxic Deluge", "POISON", "PHYSICAL", 600]
    ],
    3018: [
      // Mega Pidgeot — NORMAL/FLYING · mega do #18
      ["Gust", "FLYING", "SPECIAL", 35],
      ["Air Cutter", "FLYING", "SPECIAL", 45],
      ["Chatter", "FLYING", "SPECIAL", 55],
      ["Hidden Power", "NORMAL", "SPECIAL", 60],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Oblivion Wing", "FLYING", "SPECIAL", 80],
      ["Aeroblast", "FLYING", "SPECIAL", 100],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Tempest Gale", "FLYING", "SPECIAL", 150],
      ["Blood Moon", "NORMAL", "SPECIAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    9026: [
      // Mega Raichu X — ELECTRIC · 2ª mega do #26
      ["Nuzzle", "ELECTRIC", "PHYSICAL", 25],
      ["Thunder Shock", "ELECTRIC", "PHYSICAL", 40],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 50],
      ["Spark", "ELECTRIC", "PHYSICAL", 65],
      ["Thunder Punch", "ELECTRIC", "PHYSICAL", 75],
      ["Wild Charge", "ELECTRIC", "PHYSICAL", 85],
      ["Fusion Bolt", "ELECTRIC", "PHYSICAL", 100],
      ["Aura Wheel", "ELECTRIC", "PHYSICAL", 120],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120],
      ["Volt Breaker", "ELECTRIC", "PHYSICAL", 150],
      ["Bolt Strike", "ELECTRIC", "PHYSICAL", 600],
      ["Static Overload", "ELECTRIC", "PHYSICAL", 600]
    ],
    3026: [
      // Mega Raichu Y — ELECTRIC · mega do #26
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electro Ball", "ELECTRIC", "SPECIAL", 55],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Electro Drift", "ELECTRIC", "SPECIAL", 100],
      ["Electro Shot", "ELECTRIC", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Bolt Strike", "ELECTRIC", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    3036: [
      // Mega Clefable — FAIRY/FLYING · mega do #36
      ["Disarming Voice", "FAIRY", "SPECIAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Chatter", "FLYING", "SPECIAL", 65],
      ["Alluring Voice", "FAIRY", "SPECIAL", 75],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 80],
      ["Moonblast", "FAIRY", "SPECIAL", 95],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Lunar Nova", "FAIRY", "SPECIAL", 150],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    3065: [
      // Mega Alakazam — PSYCHIC · mega do #65
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Psychic Noise", "PSYCHIC", "SPECIAL", 75],
      ["Zen Headbutt", "PSYCHIC", "SPECIAL", 80],
      ["Photon Geyser", "PSYCHIC", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600]
    ],
    3071: [
      // Mega Victreebel — GRASS/POISON · mega do #71
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Leaf Tornado", "GRASS", "SPECIAL", 55],
      ["Venoshock", "POISON", "SPECIAL", 65],
      ["Razor Leaf", "GRASS", "PHYSICAL", 70],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Leaf Blade", "GRASS", "PHYSICAL", 90],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600],
      ["Toxic Deluge", "POISON", "SPECIAL", 600]
    ],
    3080: [
      // Mega Slowbro — WATER/PSYCHIC · mega do #80
      ["Whirlpool", "WATER", "SPECIAL", 30],
      ["Bubble", "WATER", "SPECIAL", 40],
      ["Chilling Water", "WATER", "SPECIAL", 55],
      ["Water Pulse", "WATER", "SPECIAL", 60],
      ["Psychic Noise", "PSYCHIC", "SPECIAL", 75],
      ["Scald", "WATER", "SPECIAL", 80],
      ["Surf", "WATER", "SPECIAL", 100],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    3094: [
      // Mega Gengar — GHOST/POISON · mega do #94
      ["Shadow Punch", "GHOST", "SPECIAL", 25],
      ["Ominous Wind", "GHOST", "SPECIAL", 45],
      ["Night Shade", "GHOST", "SPECIAL", 55],
      ["Hex", "GHOST", "SPECIAL", 65],
      ["Bitter Malice", "GHOST", "SPECIAL", 75],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Sludge Wave", "POISON", "SPECIAL", 95],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Phantom Wail", "GHOST", "SPECIAL", 150],
      ["Toxic Deluge", "POISON", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    3115: [
      // Mega Kangaskhan — NORMAL · mega do #115
      ["Double Slap", "NORMAL", "PHYSICAL", 25],
      ["Tackle", "NORMAL", "PHYSICAL", 40],
      ["Egg Bomb", "NORMAL", "PHYSICAL", 55],
      ["Stomp", "NORMAL", "PHYSICAL", 65],
      ["Crush Claw", "NORMAL", "PHYSICAL", 75],
      ["Body Slam", "NORMAL", "PHYSICAL", 85],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Double-Edge", "NORMAL", "PHYSICAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Giga Impact", "NORMAL", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    3121: [
      // Mega Starmie — WATER/PSYCHIC · mega do #121
      ["Water Shuriken", "WATER", "SPECIAL", 25],
      ["Aqua Jet", "WATER", "PHYSICAL", 40],
      ["Flip Turn", "WATER", "PHYSICAL", 55],
      ["Dive", "WATER", "PHYSICAL", 65],
      ["Psybeam", "PSYCHIC", "SPECIAL", 70],
      ["Scald", "WATER", "SPECIAL", 80],
      ["Surf", "WATER", "SPECIAL", 100],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600]
    ],
    3127: [
      // Mega Pinsir — BUG/FLYING · mega do #127
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Acrobatics", "FLYING", "PHYSICAL", 55],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["U-turn", "BUG", "PHYSICAL", 70],
      ["X-Scissor", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Brave Bird", "FLYING", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Megahorn", "BUG", "PHYSICAL", 600],
      ["Sky Attack", "FLYING", "PHYSICAL", 600]
    ],
    3130: [
      // Mega Gyarados — WATER/DARK · mega do #130
      ["Clamp", "WATER", "PHYSICAL", 35],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Bite", "DARK", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    3142: [
      // Mega Aerodactyl — ROCK/FLYING · mega do #142
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Rock Throw", "ROCK", "PHYSICAL", 45],
      ["Smack Down", "ROCK", "PHYSICAL", 50],
      ["Rock Tomb", "ROCK", "PHYSICAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Bounce", "FLYING", "PHYSICAL", 85],
      ["Diamond Storm", "ROCK", "PHYSICAL", 100],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Head Smash", "ROCK", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600]
    ],
    3149: [
      // Mega Dragonite — DRAGON/FLYING · mega do #149
      ["Scale Shot", "DRAGON", "SPECIAL", 25],
      ["Twister", "DRAGON", "SPECIAL", 40],
      ["Dragon Breath", "DRAGON", "SPECIAL", 55],
      ["Fickle Beam", "DRAGON", "SPECIAL", 65],
      ["Air Slash", "FLYING", "SPECIAL", 75],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Core Enforcer", "DRAGON", "SPECIAL", 100],
      ["Hurricane", "FLYING", "SPECIAL", 120],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Draconic Soul", "DRAGON", "PHYSICAL", 300],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Massive Hurricane", "FLYING", "SPECIAL", 600]
    ],
    3154: [
      // Mega Meganium — GRASS/FAIRY · mega do #154
      ["Magical Leaf", "GRASS", "SPECIAL", 30],
      ["Mega Drain", "GRASS", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Leaf Tornado", "GRASS", "SPECIAL", 65],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Matcha Gotcha", "GRASS", "SPECIAL", 80],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Verdant Storm", "GRASS", "SPECIAL", 150],
      ["Light of Ruin", "FAIRY", "SPECIAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    3160: [
      // Mega Feraligatr — WATER/DRAGON · mega do #160
      ["Triple Dive", "WATER", "PHYSICAL", 30],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Jet Punch", "WATER", "PHYSICAL", 60],
      ["Aqua Cutter", "WATER", "PHYSICAL", 70],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 80],
      ["Liquidation", "WATER", "PHYSICAL", 95],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Draconic Soul", "DRAGON", "PHYSICAL", 300],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600]
    ],
    3181: [
      // Mega Ampharos — ELECTRIC/DRAGON · mega do #181
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electro Ball", "ELECTRIC", "SPECIAL", 55],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Wildbolt Storm", "ELECTRIC", "SPECIAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    3208: [
      // Mega Steelix — STEEL/GROUND · mega do #208
      ["Gear Grind", "STEEL", "PHYSICAL", 35],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Metal Claw", "STEEL", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Smart Strike", "STEEL", "PHYSICAL", 70],
      ["Iron Head", "STEEL", "PHYSICAL", 80],
      ["Meteor Mash", "STEEL", "PHYSICAL", 90],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Gigaton Hammer", "STEEL", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600]
    ],
    3212: [
      // Mega Scizor — BUG/STEEL · mega do #212
      ["Twineedle", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Revenge", "BUG", "PHYSICAL", 55],
      ["Steamroller", "BUG", "PHYSICAL", 65],
      ["U-turn", "BUG", "PHYSICAL", 70],
      ["X-Scissor", "BUG", "PHYSICAL", 80],
      ["Behemoth Bash", "STEEL", "PHYSICAL", 100],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Hive Crush", "BUG", "PHYSICAL", 600]
    ],
    3214: [
      // Mega Heracross — BUG/FIGHTING · mega do #214
      ["Pin Missile", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Pounce", "BUG", "PHYSICAL", 50],
      ["Steamroller", "BUG", "PHYSICAL", 65],
      ["Brick Break", "FIGHTING", "PHYSICAL", 75],
      ["Lunge", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Megahorn", "BUG", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Hive Crush", "BUG", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    3227: [
      // Mega Skarmory — STEEL/FLYING · mega do #227
      ["Metal Claw", "STEEL", "PHYSICAL", 35],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Gyro Ball", "STEEL", "PHYSICAL", 55],
      ["Sky Drop", "FLYING", "PHYSICAL", 60],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Meteor Mash", "STEEL", "PHYSICAL", 90],
      ["Brave Bird", "FLYING", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Gigaton Hammer", "STEEL", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600]
    ],
    3229: [
      // Mega Houndoom — DARK/FIRE · mega do #229
      ["Payback", "DARK", "SPECIAL", 35],
      ["Beat Up", "DARK", "SPECIAL", 45],
      ["Snarl", "DARK", "SPECIAL", 55],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Fiery Wrath", "DARK", "SPECIAL", 75],
      ["Night Daze", "DARK", "SPECIAL", 85],
      ["Dark Pulse", "DARK", "SPECIAL", 90],
      ["Baddy Bad", "DARK", "SPECIAL", 120],
      ["Overheat", "FIRE", "SPECIAL", 120],
      ["Umbral Blast", "DARK", "SPECIAL", 150],
      ["Endless Hollow", "DARK", "SPECIAL", 600],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    3248: [
      // Mega Tyranitar — ROCK/DARK · mega do #248
      ["Rock Blast", "ROCK", "PHYSICAL", 25],
      ["Rock Throw", "ROCK", "PHYSICAL", 45],
      ["Rock Tomb", "ROCK", "PHYSICAL", 55],
      ["Bite", "DARK", "PHYSICAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 85],
      ["Stone Edge", "ROCK", "PHYSICAL", 100],
      ["Fling", "DARK", "PHYSICAL", 120],
      ["Rock Wrecker", "ROCK", "PHYSICAL", 120],
      ["Head Smash", "ROCK", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Endless Hollow", "DARK", "PHYSICAL", 600]
    ],
    3254: [
      // Mega Sceptile — GRASS/DRAGON · mega do #254
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Magical Leaf", "GRASS", "SPECIAL", 40],
      ["Syrup Bomb", "GRASS", "SPECIAL", 55],
      ["Leaf Tornado", "GRASS", "SPECIAL", 65],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    3257: [
      // Mega Blaziken — FIRE/FIGHTING · mega do #257
      ["Cinder Tap", "FIRE", "PHYSICAL", 25],
      ["Flame Wheel", "FIRE", "PHYSICAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 50],
      ["Heat Crash", "FIRE", "PHYSICAL", 60],
      ["Brick Break", "FIGHTING", "PHYSICAL", 75],
      ["Blaze Kick", "FIRE", "PHYSICAL", 85],
      ["Bitter Blade", "FIRE", "PHYSICAL", 90],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 120],
      ["Blazing Charge", "FIRE", "PHYSICAL", 150],
      ["V-create", "FIRE", "PHYSICAL", 150],
      ["Blast Burn", "FIRE", "PHYSICAL", 600],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600]
    ],
    3260: [
      // Mega Swampert — WATER/GROUND · mega do #260
      ["Clamp", "WATER", "PHYSICAL", 35],
      ["Yawn", "WATER", "PHYSICAL", 45],
      ["Bulldoze", "GROUND", "PHYSICAL", 50],
      ["Flip Turn", "WATER", "PHYSICAL", 60],
      ["Liquidation", "WATER", "PHYSICAL", 75],
      ["Dive", "WATER", "PHYSICAL", 80],
      ["Aqua Tail", "WATER", "PHYSICAL", 90],
      ["Fissure", "GROUND", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Frost Power", "WATER", "PHYSICAL", 150],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600]
    ],
    3282: [
      // Mega Gardevoir — PSYCHIC/FAIRY · mega do #282
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Lumina Crash", "PSYCHIC", "SPECIAL", 80],
      ["Sparkly Swirl", "FAIRY", "SPECIAL", 90],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    3302: [
      // Mega Sableye — DARK/GHOST · mega do #302
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Snarl", "DARK", "SPECIAL", 55],
      ["Hex", "GHOST", "SPECIAL", 65],
      ["Sucker Punch", "DARK", "PHYSICAL", 70],
      ["Night Daze", "DARK", "SPECIAL", 85],
      ["Foul Play", "DARK", "PHYSICAL", 95],
      ["Baddy Bad", "DARK", "SPECIAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Umbral Blast", "DARK", "SPECIAL", 150],
      ["Untold Nightmare", "GHOST", "PHYSICAL", 600],
      ["Wicked Blow", "DARK", "SPECIAL", 600]
    ],
    3303: [
      // Mega Mawile — STEEL/FAIRY · mega do #303
      ["Gear Grind", "STEEL", "PHYSICAL", 35],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Metal Claw", "STEEL", "PHYSICAL", 50],
      ["Hard Press", "STEEL", "PHYSICAL", 60],
      ["Spirit Break", "FAIRY", "PHYSICAL", 75],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Behemoth Bash", "STEEL", "PHYSICAL", 100],
      ["Magical Torque", "FAIRY", "PHYSICAL", 120],
      ["Steel Roller", "STEEL", "PHYSICAL", 120],
      ["Gigaton Hammer", "STEEL", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Starlight Charm", "FAIRY", "PHYSICAL", 600]
    ],
    3306: [
      // Mega Aggron — STEEL · mega do #306
      ["Metal Claw", "STEEL", "PHYSICAL", 35],
      ["Bullet Punch", "STEEL", "PHYSICAL", 40],
      ["Gear Grind", "STEEL", "PHYSICAL", 50],
      ["Iron Head", "STEEL", "PHYSICAL", 65],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Metal Burst", "STEEL", "PHYSICAL", 80],
      ["Meteor Mash", "STEEL", "PHYSICAL", 90],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Steel Roller", "STEEL", "PHYSICAL", 120],
      ["Gigaton Hammer", "STEEL", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Steel Beam", "STEEL", "PHYSICAL", 600]
    ],
    3308: [
      // Mega Medicham — FIGHTING/PSYCHIC · mega do #308
      ["Rock Smash", "FIGHTING", "PHYSICAL", 35],
      ["Counter", "FIGHTING", "PHYSICAL", 40],
      ["Low Kick", "FIGHTING", "PHYSICAL", 55],
      ["Force Palm", "FIGHTING", "PHYSICAL", 60],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 70],
      ["Brick Break", "FIGHTING", "PHYSICAL", 80],
      ["Dynamic Punch", "FIGHTING", "PHYSICAL", 100],
      ["Axe Kick", "FIGHTING", "PHYSICAL", 120],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Focus Punch", "FIGHTING", "PHYSICAL", 150],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    3310: [
      // Mega Manectric — ELECTRIC · mega do #310
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Thunder Shock", "ELECTRIC", "SPECIAL", 40],
      ["Electro Ball", "ELECTRIC", "SPECIAL", 55],
      ["Parabolic Charge", "ELECTRIC", "SPECIAL", 65],
      ["Rising Voltage", "ELECTRIC", "SPECIAL", 70],
      ["Overdrive", "ELECTRIC", "SPECIAL", 80],
      ["Thunderbolt", "ELECTRIC", "SPECIAL", 90],
      ["Electro Shot", "ELECTRIC", "SPECIAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Ion Cannon", "ELECTRIC", "SPECIAL", 150],
      ["Bolt Strike", "ELECTRIC", "SPECIAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    3319: [
      // Mega Sharpedo — WATER/DARK · mega do #319
      ["Clamp", "WATER", "PHYSICAL", 35],
      ["Aqua Jet", "WATER", "PHYSICAL", 45],
      ["Yawn", "WATER", "PHYSICAL", 55],
      ["Flip Turn", "WATER", "PHYSICAL", 60],
      ["Lash Out", "DARK", "PHYSICAL", 75],
      ["Fishious Rend", "WATER", "PHYSICAL", 85],
      ["Liquidation", "WATER", "PHYSICAL", 95],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Wave Crash", "WATER", "PHYSICAL", 120],
      ["Riptide Slam", "WATER", "PHYSICAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Endless Hollow", "DARK", "PHYSICAL", 600]
    ],
    3323: [
      // Mega Camerupt — FIRE/GROUND · mega do #323
      ["Fire Spin", "FIRE", "SPECIAL", 35],
      ["Ember", "FIRE", "SPECIAL", 40],
      ["Mud Shot", "GROUND", "SPECIAL", 55],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Burning Jealousy", "FIRE", "SPECIAL", 70],
      ["Fiery Dance", "FIRE", "SPECIAL", 80],
      ["Cinder Barrage", "FIRE", "SPECIAL", 100],
      ["Earth Power", "GROUND", "SPECIAL", 120],
      ["Overheat", "FIRE", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Crossing Fissure", "GROUND", "SPECIAL", 600],
      ["Ignition Point", "FIRE", "SPECIAL", 600]
    ],
    3334: [
      // Mega Altaria — DRAGON/FAIRY · mega do #334
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Twister", "DRAGON", "SPECIAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Dragon Breath", "DRAGON", "SPECIAL", 60],
      ["Spirit Break", "FAIRY", "PHYSICAL", 75],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 80],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 90],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Light of Ruin", "FAIRY", "SPECIAL", 600]
    ],
    3354: [
      // Mega Banette — GHOST · mega do #354
      ["Lick", "GHOST", "PHYSICAL", 30],
      ["Shadow Sneak", "GHOST", "PHYSICAL", 40],
      ["Rage Fist", "GHOST", "PHYSICAL", 50],
      ["Last Respects", "GHOST", "PHYSICAL", 60],
      ["Shadow Claw", "GHOST", "PHYSICAL", 70],
      ["Shadow Bone", "GHOST", "PHYSICAL", 85],
      ["Spectral Thief", "GHOST", "PHYSICAL", 90],
      ["Poltergeist", "GHOST", "PHYSICAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Soul Reaper", "GHOST", "PHYSICAL", 150],
      ["Astral Barrage", "GHOST", "PHYSICAL", 600],
      ["Untold Nightmare", "GHOST", "PHYSICAL", 600]
    ],
    3358: [
      // Mega Chimecho — PSYCHIC/STEEL · mega do #358
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Confusion", "PSYCHIC", "SPECIAL", 50],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Psychic Noise", "PSYCHIC", "SPECIAL", 75],
      ["Flash Cannon", "STEEL", "SPECIAL", 80],
      ["Mist Ball", "PSYCHIC", "SPECIAL", 95],
      ["Steel Beam", "STEEL", "SPECIAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Alloy Breaker", "STEEL", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    3359: [
      // Mega Absol — DARK · mega do #359
      ["Power Trip", "DARK", "PHYSICAL", 25],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Beat Up", "DARK", "PHYSICAL", 55],
      ["Assurance", "DARK", "PHYSICAL", 60],
      ["Lash Out", "DARK", "PHYSICAL", 75],
      ["False Surrender", "DARK", "PHYSICAL", 80],
      ["Foul Play", "DARK", "PHYSICAL", 95],
      ["Baddy Bad", "DARK", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Midnight Ravage", "DARK", "PHYSICAL", 150],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Wicked Blow", "DARK", "PHYSICAL", 600]
    ],
    3362: [
      // Mega Glalie — ICE · mega do #362
      ["Icicle Spear", "ICE", "PHYSICAL", 25],
      ["Ice Shard", "ICE", "PHYSICAL", 40],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Glaciate", "ICE", "SPECIAL", 65],
      ["Freeze-Dry", "ICE", "SPECIAL", 70],
      ["Icicle Crash", "ICE", "PHYSICAL", 85],
      ["Ice Beam", "ICE", "SPECIAL", 90],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Permafrost Smash", "ICE", "PHYSICAL", 150],
      ["Glacial Lance", "ICE", "PHYSICAL", 600],
      ["Ice Burn", "ICE", "SPECIAL", 600]
    ],
    3373: [
      // Mega Salamence — DRAGON/FLYING · mega do #373
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Dragon Tail", "DRAGON", "PHYSICAL", 55],
      ["Breaking Swipe", "DRAGON", "PHYSICAL", 60],
      ["Fly", "FLYING", "PHYSICAL", 75],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 80],
      ["Dragon Rush", "DRAGON", "PHYSICAL", 100],
      ["Brave Bird", "FLYING", "PHYSICAL", 120],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Draconic Soul", "DRAGON", "PHYSICAL", 300],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600]
    ],
    3376: [
      // Mega Metagross — STEEL/PSYCHIC · mega do #376
      ["Confusion", "PSYCHIC", "PHYSICAL", 35],
      ["Twin Beam", "PSYCHIC", "PHYSICAL", 40],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 55],
      ["Hard Press", "STEEL", "PHYSICAL", 60],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 70],
      ["Zen Headbutt", "PSYCHIC", "PHYSICAL", 80],
      ["Psystrike", "PSYCHIC", "PHYSICAL", 100],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Mind Crusher", "PSYCHIC", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600]
    ],
    3398: [
      // Mega Staraptor — FIGHTING/FLYING · mega do #398
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 55],
      ["Wing Attack", "FLYING", "PHYSICAL", 60],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Brick Break", "FIGHTING", "PHYSICAL", 80],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Dragon Ascent", "FLYING", "PHYSICAL", 120],
      ["Focus Punch", "FIGHTING", "PHYSICAL", 150],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    3428: [
      // Mega Lopunny — NORMAL/FIGHTING · mega do #428
      ["Double Hit", "NORMAL", "PHYSICAL", 35],
      ["Quick Attack", "NORMAL", "PHYSICAL", 40],
      ["Egg Bomb", "NORMAL", "PHYSICAL", 55],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Chip Away", "NORMAL", "PHYSICAL", 70],
      ["Headbutt", "NORMAL", "PHYSICAL", 80],
      ["Take Down", "NORMAL", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Thrash", "NORMAL", "PHYSICAL", 120],
      ["Comet Punch", "NORMAL", "PHYSICAL", 150],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600],
      ["Ultimate Force", "NORMAL", "PHYSICAL", 600]
    ],
    3445: [
      // Mega Garchomp — DRAGON/GROUND · mega do #445
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Dragon Tail", "DRAGON", "PHYSICAL", 55],
      ["Breaking Swipe", "DRAGON", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 80],
      ["Dragon Rush", "DRAGON", "PHYSICAL", 100],
      ["Fissure", "GROUND", "PHYSICAL", 120],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Draconic Soul", "DRAGON", "PHYSICAL", 300],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600]
    ],
    9445: [
      // Mega Garchomp Z — DRAGON · 2ª mega do #445
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Fickle Beam", "DRAGON", "SPECIAL", 65],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 75],
      ["Core Enforcer", "DRAGON", "SPECIAL", 85],
      ["Dragon Rush", "DRAGON", "PHYSICAL", 100],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Roar of Time", "DRAGON", "SPECIAL", 600]
    ],
    3448: [
      // Mega Lucario — FIGHTING/STEEL · mega do #448
      ["Vital Throw", "FIGHTING", "PHYSICAL", 30],
      ["Rock Smash", "FIGHTING", "PHYSICAL", 40],
      ["Counter", "FIGHTING", "PHYSICAL", 55],
      ["Low Kick", "FIGHTING", "PHYSICAL", 65],
      ["Brick Break", "FIGHTING", "PHYSICAL", 75],
      ["Meteor Mash", "STEEL", "PHYSICAL", 85],
      ["Cross Chop", "FIGHTING", "PHYSICAL", 100],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Focus Punch", "FIGHTING", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    9448: [
      // Mega Lucario Z — FIGHTING/STEEL · 2ª mega do #448
      ["Arm Thrust", "FIGHTING", "SPECIAL", 25],
      ["Vacuum Wave", "FIGHTING", "SPECIAL", 40],
      ["Final Gambit", "FIGHTING", "SPECIAL", 55],
      ["Mirror Shot", "STEEL", "SPECIAL", 65],
      ["Submission", "FIGHTING", "SPECIAL", 75],
      ["Sky Uppercut", "FIGHTING", "SPECIAL", 85],
      ["Aura Sphere", "FIGHTING", "SPECIAL", 90],
      ["Focus Blast", "FIGHTING", "SPECIAL", 120],
      ["Steel Beam", "STEEL", "SPECIAL", 120],
      ["Aura Burst", "FIGHTING", "SPECIAL", 150],
      ["Alloy Breaker", "STEEL", "SPECIAL", 600],
      ["Meteor Assault", "FIGHTING", "SPECIAL", 600]
    ],
    3460: [
      // Mega Abomasnow — GRASS/ICE · mega do #460
      ["Absorb", "GRASS", "SPECIAL", 25],
      ["Branch Poke", "GRASS", "PHYSICAL", 40],
      ["Razor Leaf", "GRASS", "PHYSICAL", 55],
      ["Avalanche", "ICE", "PHYSICAL", 60],
      ["Giga Drain", "GRASS", "SPECIAL", 75],
      ["Apple Acid", "GRASS", "SPECIAL", 80],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Wood Hammer", "GRASS", "PHYSICAL", 120],
      ["Bramble Crush", "GRASS", "PHYSICAL", 150],
      ["Frenzy Plant", "GRASS", "SPECIAL", 600],
      ["Ice Time", "ICE", "PHYSICAL", 600]
    ],
    3475: [
      // Mega Gallade — PSYCHIC/FIGHTING · mega do #475
      ["Stored Power", "PSYCHIC", "PHYSICAL", 25],
      ["Twin Beam", "PSYCHIC", "PHYSICAL", 40],
      ["Psycho Cut", "PSYCHIC", "PHYSICAL", 55],
      ["Psyshield Bash", "PSYCHIC", "PHYSICAL", 65],
      ["Brick Break", "FIGHTING", "PHYSICAL", 75],
      ["Psyshock", "PSYCHIC", "PHYSICAL", 80],
      ["Psychic", "PSYCHIC", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Psyblade", "PSYCHIC", "PHYSICAL", 120],
      ["Mind Crusher", "PSYCHIC", "PHYSICAL", 150],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    3478: [
      // Mega Froslass — ICE/GHOST · mega do #478
      ["Powder Snow", "ICE", "SPECIAL", 35],
      ["Frost Breath", "ICE", "SPECIAL", 45],
      ["Icy Wind", "ICE", "SPECIAL", 55],
      ["Aurora Beam", "ICE", "SPECIAL", 65],
      ["Freeze-Dry", "ICE", "SPECIAL", 70],
      ["Shadow Ball", "GHOST", "SPECIAL", 80],
      ["Ice Beam", "ICE", "SPECIAL", 90],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Sheer Cold", "ICE", "SPECIAL", 120],
      ["Absolute Zero", "ICE", "SPECIAL", 150],
      ["Astral Barrage", "GHOST", "SPECIAL", 600],
      ["Ice Burn", "ICE", "SPECIAL", 600]
    ],
    3500: [
      // Mega Emboar — FIRE/FIGHTING · mega do #500
      ["Fire Spin", "FIRE", "PHYSICAL", 30],
      ["Flame Wheel", "FIRE", "PHYSICAL", 45],
      ["Flame Charge", "FIRE", "PHYSICAL", 50],
      ["Heat Crash", "FIRE", "PHYSICAL", 60],
      ["Fire Punch", "FIRE", "PHYSICAL", 75],
      ["Body Press", "FIGHTING", "PHYSICAL", 80],
      ["Temper Flare", "FIRE", "PHYSICAL", 90],
      ["Raging Fury", "FIRE", "PHYSICAL", 120],
      ["Superpower", "FIGHTING", "PHYSICAL", 120],
      ["Blazing Charge", "FIRE", "PHYSICAL", 150],
      ["V-create", "FIRE", "PHYSICAL", 150],
      ["Ignition Point", "FIRE", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    3530: [
      // Mega Excadrill — GROUND/STEEL · mega do #530
      ["Bone Rush", "GROUND", "PHYSICAL", 25],
      ["Sand Tomb", "GROUND", "PHYSICAL", 40],
      ["Metal Claw", "STEEL", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Stomping Tantrum", "GROUND", "PHYSICAL", 75],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Earthquake", "GROUND", "PHYSICAL", 100],
      ["Fissure", "GROUND", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600]
    ],
    3531: [
      // Mega Audino — NORMAL/FAIRY · mega do #531
      ["Echoed Voice", "NORMAL", "SPECIAL", 35],
      ["Hidden Power", "NORMAL", "SPECIAL", 45],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Round", "NORMAL", "SPECIAL", 60],
      ["Tri Attack", "NORMAL", "SPECIAL", 75],
      ["Uproar", "NORMAL", "SPECIAL", 85],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Hyper Beam", "NORMAL", "SPECIAL", 150],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600]
    ],
    3545: [
      // Mega Scolipede — BUG/POISON · mega do #545
      ["Twineedle", "BUG", "PHYSICAL", 25],
      ["Fury Cutter", "BUG", "PHYSICAL", 40],
      ["Bug Bite", "BUG", "PHYSICAL", 55],
      ["Steamroller", "BUG", "PHYSICAL", 65],
      ["Cross Poison", "POISON", "PHYSICAL", 70],
      ["Lunge", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Gunk Shot", "POISON", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Hive Crush", "BUG", "PHYSICAL", 600],
      ["Toxic Deluge", "POISON", "PHYSICAL", 600]
    ],
    3560: [
      // Mega Scrafty — DARK/FIGHTING · mega do #560
      ["Payback", "DARK", "PHYSICAL", 35],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Beat Up", "DARK", "PHYSICAL", 55],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Night Slash", "DARK", "PHYSICAL", 70],
      ["Crunch", "DARK", "PHYSICAL", 80],
      ["Darkest Lariat", "DARK", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Midnight Ravage", "DARK", "PHYSICAL", 150],
      ["Endless Hollow", "DARK", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    3604: [
      // Mega Eelektross — ELECTRIC · mega do #604
      ["Shock Wave", "ELECTRIC", "SPECIAL", 25],
      ["Zippy Zap", "ELECTRIC", "PHYSICAL", 45],
      ["Spark", "ELECTRIC", "PHYSICAL", 55],
      ["Thunder Fang", "ELECTRIC", "PHYSICAL", 65],
      ["Volt Switch", "ELECTRIC", "SPECIAL", 70],
      ["Discharge", "ELECTRIC", "SPECIAL", 80],
      ["Thunderbolt", "ELECTRIC", "SPECIAL", 90],
      ["Volt Tackle", "ELECTRIC", "PHYSICAL", 120],
      ["Zap Cannon", "ELECTRIC", "SPECIAL", 120],
      ["Volt Breaker", "ELECTRIC", "PHYSICAL", 150],
      ["Bolt Strike", "ELECTRIC", "PHYSICAL", 600],
      ["Static Overload", "ELECTRIC", "SPECIAL", 600]
    ],
    3609: [
      // Mega Chandelure — GHOST/FIRE · mega do #609
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Incinerate", "FIRE", "SPECIAL", 55],
      ["Burning Jealousy", "FIRE", "SPECIAL", 65],
      ["Bitter Malice", "GHOST", "SPECIAL", 75],
      ["Fiery Dance", "FIRE", "SPECIAL", 80],
      ["Heat Wave", "FIRE", "SPECIAL", 95],
      ["Moongeist Beam", "GHOST", "SPECIAL", 120],
      ["Overheat", "FIRE", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "SPECIAL", 600],
      ["Untold Nightmare", "GHOST", "SPECIAL", 600]
    ],
    3623: [
      // Mega Golurk — GROUND/GHOST · mega do #623
      ["Bone Rush", "GROUND", "PHYSICAL", 25],
      ["Sand Tomb", "GROUND", "PHYSICAL", 40],
      ["Bonemerang", "GROUND", "PHYSICAL", 50],
      ["Bulldoze", "GROUND", "PHYSICAL", 60],
      ["Shadow Claw", "GHOST", "PHYSICAL", 70],
      ["Drill Run", "GROUND", "PHYSICAL", 80],
      ["Thousand Waves", "GROUND", "PHYSICAL", 90],
      ["Headlong Rush", "GROUND", "PHYSICAL", 120],
      ["Shadow Force", "GHOST", "PHYSICAL", 120],
      ["Tectonic Slam", "GROUND", "PHYSICAL", 150],
      ["Crossing Fissure", "GROUND", "PHYSICAL", 600],
      ["Untold Nightmare", "GHOST", "PHYSICAL", 600]
    ],
    3652: [
      // Mega Chesnaught — GRASS/FIGHTING · mega do #652
      ["Bullet Seed", "GRASS", "PHYSICAL", 25],
      ["Branch Poke", "GRASS", "PHYSICAL", 40],
      ["Trailblaze", "GRASS", "PHYSICAL", 50],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Horn Leech", "GRASS", "PHYSICAL", 75],
      ["Seed Bomb", "GRASS", "PHYSICAL", 80],
      ["Leaf Blade", "GRASS", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Power Whip", "GRASS", "PHYSICAL", 120],
      ["Bramble Crush", "GRASS", "PHYSICAL", 150],
      ["Timber Crash", "GRASS", "PHYSICAL", 150],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "PHYSICAL", 600]
    ],
    3655: [
      // Mega Delphox — FIRE/PSYCHIC · mega do #655
      ["Fire Spin", "FIRE", "SPECIAL", 35],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Burning Jealousy", "FIRE", "SPECIAL", 55],
      ["Incinerate", "FIRE", "SPECIAL", 60],
      ["Mystical Fire", "FIRE", "SPECIAL", 75],
      ["Psychic", "PSYCHIC", "SPECIAL", 85],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Overheat", "FIRE", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Mind Blown", "FIRE", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600]
    ],
    3658: [
      // Mega Greninja — WATER/DARK · mega do #658
      ["Water Shuriken", "WATER", "SPECIAL", 25],
      ["Bubble", "WATER", "SPECIAL", 40],
      ["Snarl", "DARK", "SPECIAL", 55],
      ["Flip Turn", "WATER", "PHYSICAL", 60],
      ["Dive", "WATER", "PHYSICAL", 75],
      ["Waterfall", "WATER", "PHYSICAL", 80],
      ["Liquidation", "WATER", "PHYSICAL", 95],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Tidal Surge", "WATER", "SPECIAL", 150],
      ["Water Spout", "WATER", "SPECIAL", 150],
      ["Cyclonic Tide", "WATER", "PHYSICAL", 600],
      ["Endless Hollow", "DARK", "SPECIAL", 600]
    ],
    3668: [
      // Mega Pyroar — FIRE/NORMAL · mega do #668
      ["Fire Spin", "FIRE", "SPECIAL", 30],
      ["Ember", "FIRE", "SPECIAL", 45],
      ["Incinerate", "FIRE", "SPECIAL", 55],
      ["Burning Jealousy", "FIRE", "SPECIAL", 65],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Lava Plume", "FIRE", "SPECIAL", 80],
      ["Flamethrower", "FIRE", "SPECIAL", 90],
      ["Overheat", "FIRE", "SPECIAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Eruption", "FIRE", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "SPECIAL", 600],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600]
    ],
    3670: [
      // Mega Floette — FAIRY · mega do #670
      ["Disarming Voice", "FAIRY", "SPECIAL", 25],
      ["Fairy Wind", "FAIRY", "SPECIAL", 40],
      ["Draining Kiss", "FAIRY", "SPECIAL", 50],
      ["Dazzling Gleam", "FAIRY", "SPECIAL", 65],
      ["Sparkly Swirl", "FAIRY", "SPECIAL", 75],
      ["Alluring Voice", "FAIRY", "SPECIAL", 80],
      ["Misty Explosion", "FAIRY", "SPECIAL", 100],
      ["Fleur Cannon", "FAIRY", "SPECIAL", 120],
      ["Magical Torque", "FAIRY", "SPECIAL", 120],
      ["Lunar Nova", "FAIRY", "SPECIAL", 150],
      ["Light of Ruin", "FAIRY", "SPECIAL", 600],
      ["Starlight Charm", "FAIRY", "SPECIAL", 600]
    ],
    3678: [
      // Mega Meowstic — PSYCHIC · mega do #678
      ["Stored Power", "PSYCHIC", "SPECIAL", 25],
      ["Twin Beam", "PSYCHIC", "SPECIAL", 40],
      ["Mirror Coat", "PSYCHIC", "SPECIAL", 55],
      ["Psybeam", "PSYCHIC", "SPECIAL", 65],
      ["Mystical Power", "PSYCHIC", "SPECIAL", 70],
      ["Psyshock", "PSYCHIC", "SPECIAL", 80],
      ["Glitzy Glow", "PSYCHIC", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Synchronoise", "PSYCHIC", "SPECIAL", 120],
      ["Psycho Boost", "PSYCHIC", "SPECIAL", 150],
      ["Mental Singularity", "PSYCHIC", "SPECIAL", 600],
      ["Prismatic Laser", "PSYCHIC", "SPECIAL", 600]
    ],
    3687: [
      // Mega Malamar — DARK/PSYCHIC · mega do #687
      ["Dusk Needle", "DARK", "SPECIAL", 30],
      ["Fling", "DARK", "PHYSICAL", 40],
      ["Payback", "DARK", "PHYSICAL", 50],
      ["Feint Attack", "DARK", "PHYSICAL", 60],
      ["Psychic Noise", "PSYCHIC", "SPECIAL", 75],
      ["Night Daze", "DARK", "SPECIAL", 85],
      ["Dark Pulse", "DARK", "SPECIAL", 90],
      ["Future Sight", "PSYCHIC", "SPECIAL", 120],
      ["Pursuit", "DARK", "PHYSICAL", 120],
      ["Midnight Ravage", "DARK", "PHYSICAL", 150],
      ["Endless Hollow", "DARK", "SPECIAL", 600],
      ["Mental Singularity", "PSYCHIC", "PHYSICAL", 600]
    ],
    3689: [
      // Mega Barbaracle — ROCK/FIGHTING · mega do #689
      ["Rollout", "ROCK", "PHYSICAL", 30],
      ["Accelerock", "ROCK", "PHYSICAL", 40],
      ["Rock Throw", "ROCK", "PHYSICAL", 50],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Rock Slide", "ROCK", "PHYSICAL", 75],
      ["Diamond Storm", "ROCK", "PHYSICAL", 85],
      ["Mighty Cleave", "ROCK", "PHYSICAL", 95],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Stone Edge", "ROCK", "PHYSICAL", 120],
      ["Head Smash", "ROCK", "PHYSICAL", 150],
      ["Crumbling Rain", "ROCK", "PHYSICAL", 600],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600]
    ],
    3691: [
      // Mega Dragalge — POISON/DRAGON · mega do #691
      ["Smog", "POISON", "SPECIAL", 30],
      ["Acid", "POISON", "SPECIAL", 40],
      ["Acid Spray", "POISON", "SPECIAL", 50],
      ["Venoshock", "POISON", "SPECIAL", 65],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 75],
      ["Sludge Wave", "POISON", "SPECIAL", 85],
      ["Sludge Bomb", "POISON", "SPECIAL", 90],
      ["Belch", "POISON", "SPECIAL", 120],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Toxic Deluge", "POISON", "SPECIAL", 600]
    ],
    3701: [
      // Mega Hawlucha — FIGHTING/FLYING · mega do #701
      ["Aerial Ace", "FLYING", "PHYSICAL", 25],
      ["Dual Wingbeat", "FLYING", "PHYSICAL", 40],
      ["Low Kick", "FIGHTING", "PHYSICAL", 55],
      ["Wing Attack", "FLYING", "PHYSICAL", 60],
      ["Acrobatics", "FLYING", "PHYSICAL", 70],
      ["Bounce", "FLYING", "PHYSICAL", 85],
      ["Fly", "FLYING", "PHYSICAL", 90],
      ["Brave Bird", "FLYING", "PHYSICAL", 120],
      ["High Jump Kick", "FIGHTING", "PHYSICAL", 120],
      ["Sky Attack", "FLYING", "PHYSICAL", 150],
      ["Massive Hurricane", "FLYING", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    3740: [
      // Mega Crabominable — FIGHTING/ICE · mega do #740
      ["Rock Smash", "FIGHTING", "PHYSICAL", 35],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 55],
      ["Avalanche", "ICE", "PHYSICAL", 60],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Body Press", "FIGHTING", "PHYSICAL", 80],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Focus Punch", "FIGHTING", "PHYSICAL", 150],
      ["Ice Time", "ICE", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    3768: [
      // Mega Golisopod — BUG/STEEL · mega do #768
      ["Fury Cutter", "BUG", "PHYSICAL", 35],
      ["Pin Missile", "BUG", "PHYSICAL", 40],
      ["Fell Stinger", "BUG", "PHYSICAL", 50],
      ["Bug Bite", "BUG", "PHYSICAL", 60],
      ["Steel Wing", "STEEL", "PHYSICAL", 70],
      ["Leech Life", "BUG", "PHYSICAL", 80],
      ["First Impression", "BUG", "PHYSICAL", 90],
      ["Attack Order", "BUG", "PHYSICAL", 120],
      ["Heavy Slam", "STEEL", "PHYSICAL", 120],
      ["Bee Swarm", "BUG", "PHYSICAL", 150],
      ["Alloy Breaker", "STEEL", "PHYSICAL", 600],
      ["Hive Crush", "BUG", "PHYSICAL", 600]
    ],
    3780: [
      // Mega Drampa — NORMAL/DRAGON · mega do #780
      ["Terrain Pulse", "NORMAL", "SPECIAL", 35],
      ["Echoed Voice", "NORMAL", "SPECIAL", 40],
      ["Weather Ball", "NORMAL", "SPECIAL", 50],
      ["Hidden Power", "NORMAL", "SPECIAL", 60],
      ["Relic Song", "NORMAL", "SPECIAL", 75],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 85],
      ["Hyper Voice", "NORMAL", "SPECIAL", 90],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Techno Blast", "NORMAL", "SPECIAL", 120],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600],
      ["Ultimate Force", "NORMAL", "SPECIAL", 600]
    ],
    3870: [
      // Mega Falinks — FIGHTING · mega do #870
      ["Arm Thrust", "FIGHTING", "PHYSICAL", 25],
      ["Mach Punch", "FIGHTING", "PHYSICAL", 40],
      ["Seismic Toss", "FIGHTING", "PHYSICAL", 55],
      ["Circle Throw", "FIGHTING", "PHYSICAL", 60],
      ["Reversal", "FIGHTING", "PHYSICAL", 70],
      ["Submission", "FIGHTING", "PHYSICAL", 80],
      ["Sacred Sword", "FIGHTING", "PHYSICAL", 90],
      ["Axe Kick", "FIGHTING", "PHYSICAL", 120],
      ["Close Combat", "FIGHTING", "PHYSICAL", 120],
      ["Focus Punch", "FIGHTING", "PHYSICAL", 150],
      ["Meteor Assault", "FIGHTING", "PHYSICAL", 600],
      ["Meteor Fists", "FIGHTING", "PHYSICAL", 600]
    ],
    3952: [
      // Mega Scovillain — GRASS/FIRE · mega do #952
      ["Magical Leaf", "GRASS", "SPECIAL", 30],
      ["Leafage", "GRASS", "PHYSICAL", 40],
      ["Grassy Glide", "GRASS", "PHYSICAL", 55],
      ["Flame Wheel", "FIRE", "PHYSICAL", 60],
      ["Flower Trick", "GRASS", "PHYSICAL", 70],
      ["Giga Drain", "GRASS", "SPECIAL", 80],
      ["Energy Ball", "GRASS", "SPECIAL", 90],
      ["Flare Blitz", "FIRE", "PHYSICAL", 120],
      ["Solar Beam", "GRASS", "SPECIAL", 120],
      ["Chloroblast", "GRASS", "SPECIAL", 150],
      ["Ignition Point", "FIRE", "PHYSICAL", 600],
      ["Petal Bloom", "GRASS", "SPECIAL", 600]
    ],
    3978: [
      // Mega Tatsugiri — DRAGON/WATER · mega do #978
      ["Twister", "DRAGON", "SPECIAL", 35],
      ["Dragon Breath", "DRAGON", "SPECIAL", 45],
      ["Dragon Darts", "DRAGON", "SPECIAL", 50],
      ["Fickle Beam", "DRAGON", "SPECIAL", 65],
      ["Snipe Shot", "WATER", "SPECIAL", 75],
      ["Core Enforcer", "DRAGON", "SPECIAL", 85],
      ["Dragon Pulse", "DRAGON", "SPECIAL", 90],
      ["Draco Meteor", "DRAGON", "SPECIAL", 120],
      ["Hydro Pump", "WATER", "SPECIAL", 120],
      ["Draconic Soul", "DRAGON", "SPECIAL", 300],
      ["Cyclonic Tide", "WATER", "SPECIAL", 600],
      ["Eternal Dragon", "DRAGON", "SPECIAL", 600]
    ],
    3998: [
      // Mega Baxcalibur — DRAGON/ICE · mega do #998
      ["Scale Shot", "DRAGON", "PHYSICAL", 25],
      ["Dual Chop", "DRAGON", "PHYSICAL", 40],
      ["Dragon Darts", "DRAGON", "PHYSICAL", 50],
      ["Breaking Swipe", "DRAGON", "PHYSICAL", 60],
      ["Icicle Crash", "ICE", "PHYSICAL", 75],
      ["Dragon Claw", "DRAGON", "PHYSICAL", 80],
      ["Dragon Hammer", "DRAGON", "PHYSICAL", 90],
      ["Freeze Shock", "ICE", "PHYSICAL", 120],
      ["Outrage", "DRAGON", "PHYSICAL", 120],
      ["Draconic Soul", "DRAGON", "PHYSICAL", 300],
      ["Eternal Dragon", "DRAGON", "PHYSICAL", 600],
      ["Ice Time", "ICE", "PHYSICAL", 600]
    ]
  };
  var TABELAS = [
    GOLPES_INICIAIS,
    GOLPES_PSEUDO_LENDARIOS,
    GOLPES_MENOS_DE_10,
    GOLPES_REWORK_2026_09,
    GOLPES_PRE_EVOLUCOES_KANTO,
    GOLPES_REWORK_2026_09_28,
    GOLPES_REWORK_2026_10_03,
    GOLPES_REWORK_2026_10_04,
    GOLPES_LENDARIOS_2026_10_11,
    GOLPES_REWORK_2026_10_13,
    GOLPES_REWORK_2026_10_15,
    GOLPES_SEGUNDA_EVO_2026_10_15,
    GOLPES_ARTE_NOVA,
    GOLPES_CONTRATO_2026_10_16,
    GOLPES_REWORK_2026_10_23,
    GOLPES_REWORK_2026_10_26,
    GOLPES_REWORK_2026_10_27,
    GOLPES_LENDARIOS_2026_10_27,
    GOLPES_REWORK_2026_10_29,
    GOLPES_LENDARIOS_2026_10_29
  ];
  var TABELAS_FECHADAS = /* @__PURE__ */ new Set([GOLPES_SEGUNDA_EVO_2026_10_15, GOLPES_CONTRATO_2026_10_16]);
  function golpeDaLinha([name, type, category, power, marca]) {
    if (marca === MEGA) {
      return { name, type, category, power, cooldownMs: COOLDOWN_MEGA_MS, learnLevel: 1, categoriaFixa: true, cdFixo: true, golpeMega: true };
    }
    return {
      name,
      type,
      category,
      power,
      cooldownMs: cooldownDoPoder(power),
      learnLevel: 1,
      ...power >= 600 ? { categoriaFixa: true } : {}
    };
  }
  function golpesDaPlanilhaDaMega(pokeId) {
    const linhas = GOLPES_MEGAS_2026_10_29[pokeId] ?? GOLPES_MEGAS_2026_10_27[pokeId] ?? GOLPES_MEGAS_2026_10_26[pokeId] ?? GOLPES_MEGAS_2026_10_23[pokeId] ?? GOLPES_MEGAS_2026_10_22[pokeId] ?? GOLPES_MEGAS_2026_10_21[pokeId] ?? GOLPES_MEGAS_CONTRATO_2026_10_16[pokeId] ?? GOLPES_MEGAS_2026_10_03[pokeId];
    return linhas ? linhas.map(golpeDaLinha) : null;
  }
  function golpesDaPlanilhaDoOutland(pokeId) {
    const linhas = GOLPES_OUTLAND_2026_10_27[pokeId] ?? GOLPES_OUTLAND_2026_10_15[pokeId] ?? GOLPES_OUTLAND_2026_10_13[pokeId];
    return linhas ? linhas.map(golpeDaLinha) : null;
  }
  function golpesDoOutlandFechados(pokeId) {
    return Object.hasOwn(GOLPES_OUTLAND_2026_10_15, pokeId);
  }
  function aplicarGolpesDasPlanilhas(obter) {
    for (const tabela of TABELAS) {
      const fechada = TABELAS_FECHADAS.has(tabela);
      for (const [id, linhas] of Object.entries(tabela)) {
        for (const esp of obter(Number(id)) ?? []) {
          esp.attacks = linhas.map(golpeDaLinha);
          if (fechada) esp.golpesFechados = true;
          else delete esp.golpesFechados;
        }
      }
    }
  }

  // tests/.cache/shared/herdar-base-outland.mjs
  var herdar_base_outland_exports = {};
  __export(herdar_base_outland_exports, {
    herdarBaseOutland: () => herdarBaseOutland
  });

  // tests/.cache/shared/outland-sprite-dex.mjs
  var PREFIXOS_OUTLAND = [
    "Brave ",
    "Tribal ",
    "Ancient ",
    "War ",
    "Furious ",
    "Charged ",
    "Magnetic ",
    "Evil ",
    "Freezing ",
    "Psy ",
    "Heavy ",
    "Milch-",
    "Roll ",
    "Hard ",
    "Brute ",
    "Enraged ",
    "Dark ",
    "Trickmaster ",
    "Banshee ",
    "Taekwondo ",
    "Enigmatic ",
    "Magma ",
    "Toxic "
  ];
  var DEX_POR_NOME = /* @__PURE__ */ new Map([
    ["blastoise", 9],
    ["feraligatr", 160],
    ["meganium", 154],
    ["venusaur", 3],
    ["heracross", 214],
    ["scyther", 123],
    ["girafarig", 203],
    ["raichu", 26],
    ["ampharos", 181],
    ["electabuzz", 125],
    ["dragonair", 148],
    ["cloyster", 91],
    ["dewgong", 87],
    ["jynx", 124],
    ["piloswine", 221],
    ["miltank", 241],
    ["donphan", 232],
    ["sandslash", 28],
    ["golem", 76],
    ["rhydon", 112],
    ["charizard", 6],
    ["typhlosion", 157],
    ["nidoking", 34],
    ["nidoqueen", 31],
    ["crobat", 169],
    ["gengar", 94],
    ["misdreavus", 200],
    ["hitmonchan", 107],
    ["hitmonlee", 106],
    ["hitmontop", 237],
    ["arcanine", 59],
    ["magmar", 126],
    ["pupitar", 247],
    ["steelix", 208],
    ["wigglytuff", 40],
    ["xatu", 178],
    ["alakazam", 65],
    ["hypno", 97],
    ["gyarados", 130],
    ["mantine", 226],
    ["pinsir", 127],
    ["clefable", 36],
    ["granbull", 210],
    ["skarmory", 227],
    ["noctowl", 164],
    ["pidgeot", 18],
    ["marowak", 105],
    ["tyranitar", 248],
    ["aerodactyl", 142],
    ["scizor", 212],
    ["dragonite", 149],
    ["whimsicott", 547],
    ["magcargo", 219],
    ["toxicroak", 454],
    ["exeggutor", 103],
    ["mismagius", 429],
    ["aurorus", 699],
    ["scrafty", 560]
  ]);
  function dexSpriteBaseOutland(pokeId, nome = "") {
    if (!isOutlandPokeId(pokeId)) return null;
    let base = String(nome ?? "").trim();
    for (const p of PREFIXOS_OUTLAND) {
      if (base.startsWith(p)) {
        base = base.slice(p.length);
        break;
      }
    }
    return DEX_POR_NOME.get(base.toLowerCase()) ?? null;
  }

  // tests/.cache/shared/herdar-base-outland.mjs
  var CAMPOS_STAT = ["baseHp", "baseAtk", "baseDef", "baseSpAtk", "baseSpDef", "baseSpeed"];
  function herdarBaseOutland(lista) {
    const porId = new Map(lista.map((c) => [c.pokeId, c]));
    for (const esp of lista) {
      if (!isOutlandPokeId(esp.pokeId)) continue;
      const proprios = golpesDaPlanilhaDoOutland(esp.pokeId);
      if (proprios) esp.attacks = proprios;
      if (golpesDoOutlandFechados(esp.pokeId)) esp.golpesFechados = true;
      const baseDex = dexSpriteBaseOutland(esp.pokeId, esp.name);
      if (baseDex == null) continue;
      const base = porId.get(baseDex);
      if (!base) continue;
      for (const k of CAMPOS_STAT) {
        if (typeof base[k] === "number") esp[k] = base[k];
      }
      if (!proprios && Array.isArray(base.attacks)) esp.attacks = base.attacks.map((a) => ({ ...a }));
    }
  }

  // tests/.cache/shared/herdar-golpes-orre.mjs
  var herdar_golpes_orre_exports = {};
  __export(herdar_golpes_orre_exports, {
    herdarGolpesOrre: () => herdarGolpesOrre,
    nacionalDeOrre: () => nacionalDeOrre
  });
  var ORRE_MIN = 13e3;
  var ORRE_MAX = 14e3;
  var nacionalDeOrre = (pokeId) => pokeId >= ORRE_MIN && pokeId < ORRE_MAX ? pokeId - ORRE_MIN : null;
  function herdarGolpesOrre(lista) {
    const porId = new Map(lista.map((c) => [c.pokeId, c]));
    for (const esp of lista) {
      const baseId = nacionalDeOrre(esp?.pokeId ?? -1);
      if (baseId == null) continue;
      const base = porId.get(baseId);
      if (Array.isArray(base?.attacks)) esp.attacks = base.attacks.map((a) => ({ ...a }));
    }
  }

  // tests/.cache/shared/megas.mjs
  var megas_exports = {};
  __export(megas_exports, {
    GOLPE_MEGA_POR_TIPO: () => GOLPE_MEGA_POR_TIPO,
    MEGA2_LOOKTYPE_BASE: () => MEGA2_LOOKTYPE_BASE,
    MEGA2_POKE_BASE: () => MEGA2_POKE_BASE,
    MEGA2_SHINY_LOOKTYPE_BASE: () => MEGA2_SHINY_LOOKTYPE_BASE,
    MEGAS: () => MEGAS,
    MEGAS_SEGUNDAS: () => MEGAS_SEGUNDAS,
    MEGA_LOOKTYPE_BASE: () => MEGA_LOOKTYPE_BASE,
    MEGA_POKE_BASE: () => MEGA_POKE_BASE,
    MEGA_POKE_MAX: () => MEGA_POKE_MAX,
    MEGA_POR_DEX: () => MEGA_POR_DEX,
    MEGA_POR_POKEID: () => MEGA_POR_POKEID,
    MEGA_SEGUNDA_POR_DEX: () => MEGA_SEGUNDA_POR_DEX,
    MEGA_SHINY_LOOKTYPE_BASE: () => MEGA_SHINY_LOOKTYPE_BASE,
    TODAS_AS_MEGAS: () => TODAS_AS_MEGAS,
    criarEspeciesMega: () => criarEspeciesMega,
    dexDaMega: () => dexDaMega,
    elosMegaDaNota: () => elosMegaDaNota,
    golpeMegaDe: () => golpeMegaDe,
    isMegaPokeId: () => isMegaPokeId,
    looktypeDaMega: () => looktypeDaMega,
    looktypeMega: () => looktypeMega,
    looktypeMegaShiny: () => looktypeMegaShiny,
    looktypeShinyDaMega: () => looktypeShinyDaMega,
    megaDaEspecie: () => megaDaEspecie,
    megaPokeId: () => megaPokeId,
    megaPorPokeId: () => megaPorPokeId,
    megaTemShiny: () => megaTemShiny,
    megasDaEspecie: () => megasDaEspecie,
    pokeIdDaMega: () => pokeIdDaMega,
    totalBasesMega: () => totalBasesMega
  });

  // tests/.cache/shared/spawns-filtro.mjs
  var LENDARIO_DEX = /* @__PURE__ */ new Set([
    // 3ª Hoenn
    377,
    378,
    379,
    380,
    381,
    382,
    383,
    384,
    // 4ª Sinnoh
    480,
    481,
    482,
    483,
    484,
    485,
    486,
    487,
    488,
    // 5ª Unova
    638,
    639,
    640,
    641,
    642,
    643,
    644,
    645,
    646,
    // 6ª Kalos
    716,
    717,
    718,
    // 7ª Alola (Type: Null e Silvally, Tapu, nebulosa, UB, Necrozma). O Type: Null (#772) e o Silvally (#773) entraram
    // em 18/10/2026 (pedido do dono): são lendários, só pelo Mystic Ticket — tinham ficado de fora e viraram hunt de
    // Alola (Nv 75.000 e 120.550) quando a região abriu, em 17/10.
    772,
    773,
    785,
    786,
    787,
    788,
    789,
    790,
    791,
    792,
    793,
    794,
    795,
    796,
    797,
    798,
    799,
    800,
    803,
    804,
    805,
    806,
    // 8ª Galar (+ Crown Tundra, Legends Arceus)
    888,
    889,
    890,
    891,
    892,
    894,
    895,
    896,
    897,
    898,
    905,
    // 9ª Paldea (+ DLC / Teal Mask / Indigo Disk)
    1001,
    1002,
    1003,
    1004,
    1007,
    1008,
    1009,
    1010,
    1014,
    1015,
    1016,
    1017,
    1020,
    1021,
    1022,
    1023,
    1024
  ]);
  var MITICO_DEX = /* @__PURE__ */ new Set([
    385,
    386,
    489,
    490,
    491,
    492,
    493,
    647,
    648,
    649,
    719,
    720,
    721,
    801,
    802,
    807,
    808,
    809,
    893,
    1025
  ]);

  // tests/.cache/shared/escala-hunt-level.mjs
  function dexDe2(pokeId) {
    const id = Number(pokeId);
    if (!Number.isFinite(id) || id < 1) return id;
    if (id < 1e3) return id;
    if (id >= 13e3) return id % 1e3;
    if (isOutlandPokeId(id)) return id;
    return id;
  }

  // tests/.cache/shared/megas.mjs
  var MEGA_POKE_BASE = 3e3;
  var MEGA_POKE_MAX = 4e3;
  var MEGA_LOOKTYPE_BASE = 8e4;
  var MEGA_SHINY_LOOKTYPE_BASE = 85e3;
  var looktypeMega = (dex) => MEGA_LOOKTYPE_BASE + Number(dex);
  var looktypeMegaShiny = (dex) => MEGA_SHINY_LOOKTYPE_BASE + Number(dex);
  var megaPokeId = (dex) => MEGA_POKE_BASE + Number(dex);
  function isMegaPokeId(pokeId) {
    const id = Number(pokeId);
    return id > MEGA_POKE_BASE && id < MEGA_POKE_MAX || MEGA_SEGUNDA_POR_POKEID.has(id);
  }
  var MEGAS = [
    {
      dex: 3,
      slug: "venusaur",
      nome: "Mega Venusaur",
      pedra: "Venusaurite",
      icone: "venusaurite",
      tipos: ["GRASS", "POISON"],
      bases: { hp: 80, atk: 100, def: 123, spAtk: 122, spDef: 120, speed: 80 }
    },
    {
      dex: 6,
      slug: "charizard",
      nome: "Mega Charizard Y",
      pedra: "Charizardite Y",
      icone: "charizardite-y",
      tipos: ["FIRE", "FLYING"],
      bases: { hp: 78, atk: 104, def: 78, spAtk: 159, spDef: 115, speed: 100 }
    },
    {
      dex: 9,
      slug: "blastoise",
      nome: "Mega Blastoise",
      pedra: "Blastoisinite",
      icone: "blastoisinite",
      tipos: ["WATER"],
      bases: { hp: 79, atk: 103, def: 120, spAtk: 135, spDef: 115, speed: 78 }
    },
    {
      dex: 15,
      slug: "beedrill",
      nome: "Mega Beedrill",
      pedra: "Beedrillite",
      icone: "beedrillite",
      tipos: ["BUG", "POISON"],
      bases: { hp: 65, atk: 150, def: 40, spAtk: 15, spDef: 80, speed: 145 }
    },
    {
      dex: 18,
      slug: "pidgeot",
      nome: "Mega Pidgeot",
      pedra: "Pidgeotite",
      icone: "pidgeotite",
      tipos: ["NORMAL", "FLYING"],
      bases: { hp: 83, atk: 80, def: 80, spAtk: 135, spDef: 80, speed: 121 }
    },
    {
      // A forma Y, que chegou primeiro (25/09/2026). A X é outro sprite e outra pedra, e as duas
      // não cabem no mesmo `3000 + dex`: ela chegou em 18/10/2026 e mora em `MEGAS_SEGUNDAS`.
      dex: 26,
      slug: "raichu_y",
      nome: "Mega Raichu Y",
      pedra: "Raichunite Y",
      icone: "raichunite-y",
      tipos: ["ELECTRIC"],
      bases: { hp: 60, atk: 100, def: 55, spAtk: 160, spDef: 80, speed: 130 }
    },
    {
      dex: 36,
      slug: "clefable",
      nome: "Mega Clefable",
      pedra: "Clefablite",
      icone: "clefablite",
      tipos: ["FAIRY", "FLYING"],
      bases: { hp: 95, atk: 80, def: 93, spAtk: 135, spDef: 110, speed: 70 }
    },
    {
      dex: 65,
      slug: "alakazam",
      nome: "Mega Alakazam",
      pedra: "Alakazite",
      icone: "alakazite",
      tipos: ["PSYCHIC"],
      bases: { hp: 55, atk: 50, def: 65, spAtk: 175, spDef: 105, speed: 150 }
    },
    {
      dex: 71,
      slug: "victreebel",
      nome: "Mega Victreebel",
      pedra: "Victreebelite",
      icone: "victreebelite",
      tipos: ["GRASS", "POISON"],
      bases: { hp: 80, atk: 125, def: 85, spAtk: 135, spDef: 95, speed: 70 }
    },
    {
      dex: 80,
      slug: "slowbro",
      nome: "Mega Slowbro",
      pedra: "Slowbronite",
      icone: "slowbronite",
      tipos: ["WATER", "PSYCHIC"],
      bases: { hp: 95, atk: 75, def: 180, spAtk: 130, spDef: 80, speed: 30 }
    },
    {
      dex: 94,
      slug: "gengar",
      nome: "Mega Gengar",
      pedra: "Gengarite",
      icone: "gengarite",
      tipos: ["GHOST", "POISON"],
      bases: { hp: 60, atk: 65, def: 80, spAtk: 170, spDef: 95, speed: 130 }
    },
    {
      dex: 115,
      slug: "kangaskhan",
      nome: "Mega Kangaskhan",
      pedra: "Kangaskhanite",
      icone: "kangaskhanite",
      tipos: ["NORMAL"],
      bases: { hp: 105, atk: 125, def: 100, spAtk: 60, spDef: 100, speed: 100 }
    },
    {
      dex: 121,
      slug: "starmie",
      nome: "Mega Starmie",
      pedra: "Starminite",
      icone: "starminite",
      tipos: ["WATER", "PSYCHIC"],
      bases: { hp: 60, atk: 140, def: 105, spAtk: 130, spDef: 105, speed: 120 }
    },
    {
      dex: 127,
      slug: "pinsir",
      nome: "Mega Pinsir",
      pedra: "Pinsirite",
      icone: "pinsirite",
      tipos: ["BUG", "FLYING"],
      bases: { hp: 65, atk: 155, def: 120, spAtk: 65, spDef: 90, speed: 105 }
    },
    {
      dex: 130,
      slug: "gyarados",
      nome: "Mega Gyarados",
      pedra: "Gyaradosite",
      icone: "gyaradosite",
      tipos: ["WATER", "DARK"],
      bases: { hp: 95, atk: 155, def: 109, spAtk: 70, spDef: 130, speed: 81 }
    },
    {
      dex: 142,
      slug: "aerodactyl",
      nome: "Mega Aerodactyl",
      pedra: "Aerodactylite",
      icone: "aerodactylite",
      tipos: ["ROCK", "FLYING"],
      bases: { hp: 80, atk: 135, def: 85, spAtk: 70, spDef: 95, speed: 150 }
    },
    {
      dex: 149,
      slug: "dragonite",
      nome: "Mega Dragonite",
      pedra: "Dragonitite",
      icone: "dragonitite",
      tipos: ["DRAGON", "FLYING"],
      bases: { hp: 91, atk: 124, def: 115, spAtk: 145, spDef: 125, speed: 100 }
    },
    {
      // A Y fica com o `3000 + dex` (a primeira a ser desenhada); a X é a 2ª mega do Mewtwo —
      // ver `MEGAS_SEGUNDAS`.
      dex: 150,
      slug: "mewtwo_y",
      nome: "Mega Mewtwo Y",
      pedra: "Mewtwonite Y",
      icone: "mewtwonite-y",
      tipos: ["PSYCHIC"],
      bases: { hp: 106, atk: 150, def: 70, spAtk: 194, spDef: 120, speed: 140 }
    },
    {
      dex: 154,
      slug: "meganium",
      nome: "Mega Meganium",
      pedra: "Meganiumite",
      icone: "meganiumite",
      tipos: ["GRASS", "FAIRY"],
      bases: { hp: 80, atk: 92, def: 115, spAtk: 143, spDef: 115, speed: 80 }
    },
    {
      dex: 160,
      slug: "feraligatr",
      nome: "Mega Feraligatr",
      pedra: "Feraligite",
      icone: "feraligite",
      tipos: ["WATER", "DRAGON"],
      bases: { hp: 85, atk: 160, def: 125, spAtk: 89, spDef: 93, speed: 78 }
    },
    {
      dex: 181,
      slug: "ampharos",
      nome: "Mega Ampharos",
      pedra: "Ampharosite",
      icone: "ampharosite",
      tipos: ["ELECTRIC", "DRAGON"],
      bases: { hp: 90, atk: 95, def: 105, spAtk: 165, spDef: 110, speed: 45 }
    },
    {
      dex: 208,
      slug: "steelix",
      nome: "Mega Steelix",
      pedra: "Steelixite",
      icone: "steelixite",
      tipos: ["STEEL", "GROUND"],
      bases: { hp: 75, atk: 125, def: 230, spAtk: 55, spDef: 95, speed: 30 }
    },
    {
      dex: 212,
      slug: "scizor",
      nome: "Mega Scizor",
      pedra: "Scizorite",
      icone: "scizorite",
      tipos: ["BUG", "STEEL"],
      bases: { hp: 70, atk: 150, def: 140, spAtk: 65, spDef: 100, speed: 75 }
    },
    {
      dex: 214,
      slug: "heracross",
      nome: "Mega Heracross",
      pedra: "Heracronite",
      icone: "heracronite",
      tipos: ["BUG", "FIGHTING"],
      bases: { hp: 80, atk: 185, def: 115, spAtk: 40, spDef: 105, speed: 75 }
    },
    {
      dex: 227,
      slug: "skarmory",
      nome: "Mega Skarmory",
      pedra: "Skarmorite",
      icone: "skarmorite",
      tipos: ["STEEL", "FLYING"],
      bases: { hp: 65, atk: 140, def: 110, spAtk: 40, spDef: 100, speed: 110 }
    },
    {
      dex: 229,
      slug: "houndoom",
      nome: "Mega Houndoom",
      pedra: "Houndoominite",
      icone: "houndoominite",
      tipos: ["DARK", "FIRE"],
      bases: { hp: 75, atk: 90, def: 90, spAtk: 140, spDef: 90, speed: 115 }
    },
    {
      dex: 248,
      slug: "tyranitar",
      nome: "Mega Tyranitar",
      pedra: "Tyranitarite",
      icone: "tyranitarite",
      tipos: ["ROCK", "DARK"],
      bases: { hp: 100, atk: 164, def: 150, spAtk: 95, spDef: 120, speed: 71 }
    },
    {
      dex: 254,
      slug: "sceptile",
      nome: "Mega Sceptile",
      pedra: "Sceptilite",
      icone: "sceptilite",
      tipos: ["GRASS", "DRAGON"],
      bases: { hp: 70, atk: 110, def: 75, spAtk: 145, spDef: 85, speed: 145 }
    },
    {
      dex: 257,
      slug: "blaziken",
      nome: "Mega Blaziken",
      pedra: "Blazikenite",
      icone: "blazikenite",
      tipos: ["FIRE", "FIGHTING"],
      bases: { hp: 80, atk: 160, def: 80, spAtk: 130, spDef: 80, speed: 100 }
    },
    {
      dex: 260,
      slug: "swampert",
      nome: "Mega Swampert",
      pedra: "Swampertite",
      icone: "swampertite",
      tipos: ["WATER", "GROUND"],
      bases: { hp: 100, atk: 150, def: 110, spAtk: 95, spDef: 110, speed: 70 }
    },
    {
      dex: 282,
      slug: "gardevoir",
      nome: "Mega Gardevoir",
      pedra: "Gardevoirite",
      icone: "gardevoirite",
      tipos: ["PSYCHIC", "FAIRY"],
      bases: { hp: 68, atk: 85, def: 65, spAtk: 165, spDef: 135, speed: 100 }
    },
    {
      dex: 302,
      slug: "sableye",
      nome: "Mega Sableye",
      pedra: "Sablenite",
      icone: "sablenite",
      tipos: ["DARK", "GHOST"],
      bases: { hp: 50, atk: 85, def: 125, spAtk: 85, spDef: 115, speed: 20 }
    },
    {
      dex: 303,
      slug: "mawile",
      nome: "Mega Mawile",
      pedra: "Mawilite",
      icone: "mawilite",
      tipos: ["STEEL", "FAIRY"],
      bases: { hp: 50, atk: 105, def: 125, spAtk: 55, spDef: 95, speed: 50 }
    },
    {
      dex: 306,
      slug: "aggron",
      nome: "Mega Aggron",
      pedra: "Aggronite",
      icone: "aggronite",
      // STEEL puro, a oficial. De 03/10 a 21/10/2026 guardou o ROCK do Aggron (planilha "Megas
      // 03-10"), para seguir usando os TMs de ROCK da base; a "Novas Megas Arrumadas" (21/10) a
      // escreve só STEEL e tira todos os golpes de ROCK. O TM de ROCK já aplicado fica (o Z-Move
      // mora no pokemon, como o FLYING do Gyarados que vira Mega Gyarados), só sem STAB.
      tipos: ["STEEL"],
      bases: { hp: 70, atk: 140, def: 230, spAtk: 60, spDef: 80, speed: 50 }
    },
    {
      dex: 308,
      slug: "medicham",
      nome: "Mega Medicham",
      pedra: "Medichamite",
      icone: "medichamite",
      tipos: ["FIGHTING", "PSYCHIC"],
      bases: { hp: 60, atk: 100, def: 85, spAtk: 80, spDef: 85, speed: 100 }
    },
    {
      dex: 310,
      slug: "manectric",
      nome: "Mega Manectric",
      pedra: "Manectite",
      icone: "manectite",
      tipos: ["ELECTRIC"],
      bases: { hp: 70, atk: 75, def: 80, spAtk: 135, spDef: 80, speed: 135 }
    },
    {
      dex: 319,
      slug: "sharpedo",
      nome: "Mega Sharpedo",
      pedra: "Sharpedonite",
      icone: "sharpedonite",
      tipos: ["WATER", "DARK"],
      bases: { hp: 70, atk: 140, def: 70, spAtk: 110, spDef: 65, speed: 105 }
    },
    {
      dex: 323,
      slug: "camerupt",
      nome: "Mega Camerupt",
      pedra: "Cameruptite",
      icone: "cameruptite",
      tipos: ["FIRE", "GROUND"],
      bases: { hp: 70, atk: 120, def: 100, spAtk: 145, spDef: 105, speed: 20 }
    },
    {
      dex: 334,
      slug: "altaria",
      nome: "Mega Altaria",
      pedra: "Altarianite",
      icone: "altarianite",
      tipos: ["DRAGON", "FAIRY"],
      bases: { hp: 75, atk: 110, def: 110, spAtk: 110, spDef: 105, speed: 80 }
    },
    {
      dex: 354,
      slug: "banette",
      nome: "Mega Banette",
      pedra: "Banettite",
      icone: "banettite",
      tipos: ["GHOST"],
      bases: { hp: 64, atk: 165, def: 75, spAtk: 93, spDef: 83, speed: 75 }
    },
    {
      dex: 358,
      slug: "chimecho",
      nome: "Mega Chimecho",
      pedra: "Chimechite",
      icone: "chimechite",
      tipos: ["PSYCHIC", "STEEL"],
      bases: { hp: 75, atk: 50, def: 110, spAtk: 135, spDef: 120, speed: 65 }
    },
    {
      dex: 359,
      slug: "absol",
      nome: "Mega Absol",
      pedra: "Absolite",
      icone: "absolite",
      tipos: ["DARK"],
      bases: { hp: 65, atk: 150, def: 60, spAtk: 115, spDef: 60, speed: 115 }
    },
    {
      dex: 362,
      slug: "glalie",
      nome: "Mega Glalie",
      pedra: "Glalitite",
      icone: "glalitite",
      tipos: ["ICE"],
      bases: { hp: 80, atk: 120, def: 80, spAtk: 120, spDef: 80, speed: 100 }
    },
    {
      dex: 373,
      slug: "salamence",
      nome: "Mega Salamence",
      pedra: "Salamencite",
      icone: "salamencite",
      tipos: ["DRAGON", "FLYING"],
      bases: { hp: 95, atk: 145, def: 130, spAtk: 120, spDef: 90, speed: 120 }
    },
    {
      dex: 376,
      slug: "metagross",
      nome: "Mega Metagross",
      pedra: "Metagrossite",
      icone: "metagrossite",
      tipos: ["STEEL", "PSYCHIC"],
      bases: { hp: 80, atk: 145, def: 150, spAtk: 105, spDef: 110, speed: 110 }
    },
    {
      dex: 380,
      slug: "latias",
      nome: "Mega Latias",
      pedra: "Latiasite",
      icone: "latiasite",
      tipos: ["DRAGON", "PSYCHIC"],
      bases: { hp: 80, atk: 100, def: 120, spAtk: 140, spDef: 150, speed: 110 }
    },
    {
      dex: 381,
      slug: "latios",
      nome: "Mega Latios",
      pedra: "Latiosite",
      icone: "latiosite",
      tipos: ["DRAGON", "PSYCHIC"],
      bases: { hp: 80, atk: 130, def: 100, spAtk: 160, spDef: 120, speed: 110 }
    },
    {
      // Reversão Primal, e não mega: no jogo de origem a Blue Orb não é Mega Stone. Aqui ela segue
      // o mesmo caminho (pedra, Professor, fragmentos) porque o efeito na ficha é o mesmo.
      dex: 382,
      slug: "kyogre_primal",
      nome: "Primal Kyogre",
      pedra: "Blue Orb",
      icone: "blue-orb",
      tipos: ["WATER"],
      bases: { hp: 100, atk: 150, def: 90, spAtk: 180, spDef: 160, speed: 90 }
    },
    {
      // Reversão Primal, como a do Kyogre, com a Red Orb.
      dex: 383,
      slug: "groudon_primal",
      nome: "Primal Groudon",
      pedra: "Red Orb",
      icone: "red-orb",
      tipos: ["GROUND", "FIRE"],
      bases: { hp: 100, atk: 180, def: 160, spAtk: 150, spDef: 90, speed: 90 }
    },
    {
      // A Jade Orb no lugar de pedra: o Rayquaza não tem Mega Stone no jogo de origem (megaevolui
      // pelo Dragon Ascent). Aqui ele precisa de um item, como todo mundo.
      dex: 384,
      slug: "rayquaza",
      nome: "Mega Rayquaza",
      pedra: "Jade Orb",
      icone: "jade-orb",
      tipos: ["DRAGON", "FLYING"],
      bases: { hp: 105, atk: 180, def: 100, spAtk: 180, spDef: 100, speed: 115 }
    },
    {
      dex: 398,
      slug: "staraptor",
      nome: "Mega Staraptor",
      pedra: "Staraptite",
      icone: "staraptite",
      tipos: ["FIGHTING", "FLYING"],
      bases: { hp: 85, atk: 140, def: 100, spAtk: 60, spDef: 90, speed: 110 }
    },
    {
      dex: 428,
      slug: "lopunny",
      nome: "Mega Lopunny",
      pedra: "Lopunnite",
      icone: "lopunnite",
      tipos: ["NORMAL", "FIGHTING"],
      bases: { hp: 65, atk: 136, def: 94, spAtk: 54, spDef: 96, speed: 135 }
    },
    {
      dex: 445,
      slug: "garchomp",
      nome: "Mega Garchomp",
      pedra: "Garchompite",
      icone: "garchompite",
      tipos: ["DRAGON", "GROUND"],
      bases: { hp: 108, atk: 170, def: 115, spAtk: 120, spDef: 95, speed: 92 }
    },
    {
      dex: 448,
      slug: "lucario",
      nome: "Mega Lucario",
      pedra: "Lucarionite",
      icone: "lucarionite",
      tipos: ["FIGHTING", "STEEL"],
      bases: { hp: 70, atk: 145, def: 88, spAtk: 140, spDef: 70, speed: 112 }
    },
    {
      dex: 460,
      slug: "abomasnow",
      nome: "Mega Abomasnow",
      pedra: "Abomasite",
      icone: "abomasite",
      tipos: ["GRASS", "ICE"],
      bases: { hp: 90, atk: 132, def: 105, spAtk: 132, spDef: 105, speed: 30 }
    },
    {
      dex: 475,
      slug: "gallade",
      nome: "Mega Gallade",
      pedra: "Galladite",
      icone: "galladite",
      tipos: ["PSYCHIC", "FIGHTING"],
      bases: { hp: 68, atk: 165, def: 95, spAtk: 65, spDef: 115, speed: 110 }
    },
    {
      dex: 478,
      slug: "froslass",
      nome: "Mega Froslass",
      pedra: "Froslassite",
      icone: "froslassite",
      tipos: ["ICE", "GHOST"],
      bases: { hp: 70, atk: 80, def: 70, spAtk: 140, spDef: 100, speed: 120 }
    },
    {
      dex: 485,
      slug: "heatran",
      nome: "Mega Heatran",
      pedra: "Heatranite",
      icone: "heatranite",
      tipos: ["FIRE", "STEEL"],
      bases: { hp: 91, atk: 120, def: 106, spAtk: 175, spDef: 141, speed: 67 }
    },
    {
      dex: 491,
      slug: "darkrai",
      nome: "Mega Darkrai",
      pedra: "Darkranite",
      icone: "darkranite",
      tipos: ["DARK"],
      bases: { hp: 70, atk: 120, def: 130, spAtk: 165, spDef: 130, speed: 85 }
    },
    {
      dex: 500,
      slug: "emboar",
      nome: "Mega Emboar",
      pedra: "Emboarite",
      icone: "emboarite",
      tipos: ["FIRE", "FIGHTING"],
      bases: { hp: 110, atk: 148, def: 75, spAtk: 110, spDef: 110, speed: 75 }
    },
    {
      dex: 530,
      slug: "excadrill",
      nome: "Mega Excadrill",
      pedra: "Excadrite",
      icone: "excadrite",
      tipos: ["GROUND", "STEEL"],
      bases: { hp: 110, atk: 165, def: 100, spAtk: 65, spDef: 65, speed: 103 }
    },
    {
      dex: 531,
      slug: "audino",
      nome: "Mega Audino",
      pedra: "Audinite",
      icone: "audinite",
      tipos: ["NORMAL", "FAIRY"],
      bases: { hp: 103, atk: 60, def: 126, spAtk: 80, spDef: 126, speed: 50 }
    },
    {
      dex: 545,
      slug: "scolipede",
      nome: "Mega Scolipede",
      pedra: "Scolipite",
      icone: "scolipite",
      tipos: ["BUG", "POISON"],
      bases: { hp: 60, atk: 140, def: 149, spAtk: 75, spDef: 99, speed: 62 }
    },
    {
      dex: 560,
      slug: "scrafty",
      nome: "Mega Scrafty",
      pedra: "Scraftinite",
      icone: "scraftinite",
      tipos: ["DARK", "FIGHTING"],
      bases: { hp: 65, atk: 130, def: 135, spAtk: 55, spDef: 135, speed: 68 }
    },
    {
      dex: 604,
      slug: "eelektross",
      nome: "Mega Eelektross",
      pedra: "Eelektrossite",
      icone: "eelektrossite",
      tipos: ["ELECTRIC"],
      bases: { hp: 85, atk: 145, def: 80, spAtk: 135, spDef: 90, speed: 80 }
    },
    {
      dex: 609,
      slug: "chandelure",
      nome: "Mega Chandelure",
      pedra: "Chandelurite",
      icone: "chandelurite",
      tipos: ["GHOST", "FIRE"],
      bases: { hp: 60, atk: 75, def: 110, spAtk: 175, spDef: 110, speed: 90 }
    },
    {
      dex: 623,
      slug: "golurk",
      nome: "Mega Golurk",
      pedra: "Golurkite",
      icone: "golurkite",
      tipos: ["GROUND", "GHOST"],
      bases: { hp: 89, atk: 159, def: 105, spAtk: 70, spDef: 105, speed: 55 }
    },
    {
      dex: 652,
      slug: "chesnaught",
      nome: "Mega Chesnaught",
      pedra: "Chesnaughtite",
      icone: "chesnaughtite",
      tipos: ["GRASS", "FIGHTING"],
      bases: { hp: 88, atk: 137, def: 172, spAtk: 74, spDef: 115, speed: 44 }
    },
    {
      dex: 655,
      slug: "delphox",
      nome: "Mega Delphox",
      pedra: "Delphoxite",
      icone: "delphoxite",
      tipos: ["FIRE", "PSYCHIC"],
      bases: { hp: 75, atk: 69, def: 72, spAtk: 159, spDef: 125, speed: 134 }
    },
    {
      dex: 658,
      slug: "greninja",
      nome: "Mega Greninja",
      pedra: "Greninjite",
      icone: "greninjite",
      tipos: ["WATER", "DARK"],
      bases: { hp: 72, atk: 125, def: 77, spAtk: 133, spDef: 81, speed: 142 }
    },
    {
      dex: 668,
      slug: "pyroar",
      nome: "Mega Pyroar",
      pedra: "Pyroarite",
      icone: "pyroarite",
      tipos: ["FIRE", "NORMAL"],
      bases: { hp: 86, atk: 88, def: 92, spAtk: 129, spDef: 86, speed: 126 }
    },
    {
      // A mega da Floette de flor eterna no jogo de origem; aqui, da Floette do catálogo.
      dex: 670,
      slug: "floette",
      nome: "Mega Floette",
      pedra: "Floettite",
      icone: "floettite",
      tipos: ["FAIRY"],
      bases: { hp: 74, atk: 85, def: 87, spAtk: 155, spDef: 148, speed: 102 }
    },
    {
      dex: 678,
      slug: "meowstic",
      nome: "Mega Meowstic",
      pedra: "Meowsticite",
      icone: "meowsticite",
      tipos: ["PSYCHIC"],
      bases: { hp: 74, atk: 48, def: 76, spAtk: 143, spDef: 101, speed: 124 }
    },
    {
      dex: 687,
      slug: "malamar",
      nome: "Mega Malamar",
      pedra: "Malamarite",
      icone: "malamarite",
      tipos: ["DARK", "PSYCHIC"],
      bases: { hp: 86, atk: 102, def: 88, spAtk: 98, spDef: 120, speed: 88 }
    },
    {
      dex: 689,
      slug: "barbaracle",
      nome: "Mega Barbaracle",
      pedra: "Barbaracite",
      icone: "barbaracite",
      tipos: ["ROCK", "FIGHTING"],
      bases: { hp: 72, atk: 140, def: 130, spAtk: 64, spDef: 106, speed: 88 }
    },
    {
      dex: 691,
      slug: "dragalge",
      nome: "Mega Dragalge",
      pedra: "Dragalgite",
      icone: "dragalgite",
      tipos: ["POISON", "DRAGON"],
      bases: { hp: 65, atk: 85, def: 105, spAtk: 132, spDef: 163, speed: 44 }
    },
    {
      dex: 701,
      slug: "hawlucha",
      nome: "Mega Hawlucha",
      pedra: "Hawluchanite",
      icone: "hawluchanite",
      tipos: ["FIGHTING", "FLYING"],
      bases: { hp: 78, atk: 137, def: 100, spAtk: 74, spDef: 93, speed: 118 }
    },
    {
      // A partir do Zygarde base (50%) do catálogo — o 10% e o Completo são formas próprias
      // (`formas.mjs`) e não megaevoluem.
      dex: 718,
      slug: "zygarde",
      nome: "Mega Zygarde",
      pedra: "Zygardite",
      icone: "zygardite",
      tipos: ["DRAGON", "GROUND"],
      bases: { hp: 216, atk: 70, def: 91, spAtk: 216, spDef: 85, speed: 100 }
    },
    {
      dex: 719,
      slug: "diancie",
      nome: "Mega Diancie",
      pedra: "Diancite",
      icone: "diancite",
      tipos: ["ROCK", "FAIRY"],
      bases: { hp: 50, atk: 160, def: 110, spAtk: 160, spDef: 110, speed: 110 }
    },
    {
      dex: 740,
      slug: "crabominable",
      nome: "Mega Crabominable",
      pedra: "Crabominite",
      icone: "crabominite",
      tipos: ["FIGHTING", "ICE"],
      bases: { hp: 97, atk: 157, def: 122, spAtk: 62, spDef: 107, speed: 33 }
    },
    {
      dex: 768,
      slug: "golisopod",
      nome: "Mega Golisopod",
      pedra: "Golisopite",
      icone: "golisopite",
      tipos: ["BUG", "STEEL"],
      bases: { hp: 75, atk: 150, def: 175, spAtk: 70, spDef: 120, speed: 40 }
    },
    {
      dex: 780,
      slug: "drampa",
      nome: "Mega Drampa",
      pedra: "Drampanite",
      icone: "drampanite",
      tipos: ["NORMAL", "DRAGON"],
      bases: { hp: 78, atk: 85, def: 110, spAtk: 160, spDef: 116, speed: 36 }
    },
    {
      dex: 801,
      slug: "magearna",
      nome: "Mega Magearna",
      pedra: "Magearnite",
      icone: "magearnite",
      tipos: ["STEEL", "FAIRY"],
      bases: { hp: 80, atk: 125, def: 115, spAtk: 170, spDef: 115, speed: 95 }
    },
    {
      dex: 807,
      slug: "zeraora",
      nome: "Mega Zeraora",
      pedra: "Zeraorite",
      icone: "zeraorite",
      tipos: ["ELECTRIC"],
      bases: { hp: 88, atk: 157, def: 75, spAtk: 147, spDef: 80, speed: 153 }
    },
    {
      dex: 870,
      slug: "falinks",
      nome: "Mega Falinks",
      pedra: "Falinksite",
      icone: "falinksite",
      tipos: ["FIGHTING"],
      bases: { hp: 65, atk: 135, def: 135, spAtk: 70, spDef: 65, speed: 100 }
    },
    {
      dex: 952,
      slug: "scovillain",
      nome: "Mega Scovillain",
      pedra: "Scovillainite",
      icone: "scovillainite",
      tipos: ["GRASS", "FIRE"],
      bases: { hp: 65, atk: 138, def: 85, spAtk: 138, spDef: 85, speed: 75 }
    },
    {
      dex: 978,
      slug: "tatsugiri",
      nome: "Mega Tatsugiri",
      pedra: "Tatsugirinite",
      icone: "tatsugirinite",
      tipos: ["DRAGON", "WATER"],
      bases: { hp: 68, atk: 65, def: 90, spAtk: 135, spDef: 125, speed: 92 }
    },
    {
      dex: 998,
      slug: "baxcalibur",
      nome: "Mega Baxcalibur",
      pedra: "Baxcalibrite",
      icone: "baxcalibrite",
      tipos: ["DRAGON", "ICE"],
      bases: { hp: 115, atk: 175, def: 117, spAtk: 105, spDef: 101, speed: 87 }
    }
  ];
  var MEGAS_SEGUNDAS = [
    {
      dex: 6,
      segunda: true,
      slug: "charizard_x",
      nome: "Mega Charizard X",
      pedra: "Charizardite X",
      icone: "charizardite-x",
      tipos: ["FIRE", "DRAGON"],
      bases: { hp: 78, atk: 130, def: 111, spAtk: 130, spDef: 85, speed: 100 }
    },
    {
      dex: 26,
      segunda: true,
      slug: "raichu_x",
      nome: "Mega Raichu X",
      pedra: "Raichunite X",
      icone: "raichunite-x",
      tipos: ["ELECTRIC"],
      bases: { hp: 60, atk: 135, def: 95, spAtk: 90, spDef: 95, speed: 110 }
    },
    {
      dex: 150,
      segunda: true,
      slug: "mewtwo_x",
      nome: "Mega Mewtwo X",
      pedra: "Mewtwonite X",
      icone: "mewtwonite-x",
      tipos: ["PSYCHIC", "FIGHTING"],
      bases: { hp: 106, atk: 190, def: 100, spAtk: 154, spDef: 100, speed: 130 }
    },
    {
      dex: 445,
      segunda: true,
      slug: "garchomp_z",
      nome: "Mega Garchomp Z",
      pedra: "Garchompite Z",
      icone: "garchompite-z",
      tipos: ["DRAGON"],
      bases: { hp: 108, atk: 130, def: 85, spAtk: 141, spDef: 85, speed: 151 }
    },
    {
      dex: 448,
      segunda: true,
      slug: "lucario_z",
      nome: "Mega Lucario Z",
      pedra: "Lucarionite Z",
      icone: "lucarionite-z",
      tipos: ["FIGHTING", "STEEL"],
      bases: { hp: 70, atk: 100, def: 70, spAtk: 164, spDef: 70, speed: 151 }
    }
  ];
  var MEGA2_POKE_BASE = 9e3;
  var MEGA2_LOOKTYPE_BASE = 83e3;
  var MEGA2_SHINY_LOOKTYPE_BASE = 88e3;
  var TODAS_AS_MEGAS = [...MEGAS, ...MEGAS_SEGUNDAS];
  var pokeIdDaMega = (meta) => (meta.segunda ? MEGA2_POKE_BASE : MEGA_POKE_BASE) + Number(meta.dex);
  var looktypeDaMega = (meta) => (meta.segunda ? MEGA2_LOOKTYPE_BASE : MEGA_LOOKTYPE_BASE) + Number(meta.dex);
  var looktypeShinyDaMega = (meta) => (meta.segunda ? MEGA2_SHINY_LOOKTYPE_BASE : MEGA_SHINY_LOOKTYPE_BASE) + Number(meta.dex);
  var MEGA_POR_DEX = new Map(MEGAS.map((m) => [m.dex, m]));
  var MEGA_SEGUNDA_POR_DEX = new Map(MEGAS_SEGUNDAS.map((m) => [m.dex, m]));
  var MEGA_POR_POKEID = new Map(TODAS_AS_MEGAS.map((m) => [pokeIdDaMega(m), m]));
  var MEGA_SEGUNDA_POR_POKEID = new Map(MEGAS_SEGUNDAS.map((m) => [pokeIdDaMega(m), m]));
  function dexDaMega(pokeId) {
    const id = Number(pokeId);
    if (!Number.isFinite(id) || isOutlandPokeId(id) || isMegaPokeId(id)) return null;
    const dex = dexDe2(id);
    return MEGA_POR_DEX.has(dex) ? dex : null;
  }
  function megaDaEspecie(pokeId, segunda = false) {
    const dex = dexDaMega(pokeId);
    if (dex == null) return null;
    return (segunda ? MEGA_SEGUNDA_POR_DEX.get(dex) : MEGA_POR_DEX.get(dex)) ?? null;
  }
  function megasDaEspecie(pokeId) {
    const dex = dexDaMega(pokeId);
    if (dex == null) return [];
    return [MEGA_POR_DEX.get(dex), MEGA_SEGUNDA_POR_DEX.get(dex)].filter(Boolean);
  }
  var megaPorPokeId = (pokeId) => MEGA_POR_POKEID.get(Number(pokeId)) ?? null;
  var megaTemShiny = (meta) => !!meta && !meta.semShiny;
  var totalBasesMega = (m) => m.bases.hp + m.bases.atk + m.bases.def + m.bases.spAtk + m.bases.spDef + m.bases.speed;
  var GOLPE_MEGA_POR_TIPO = {
    NORMAL: "Mega Onslaught",
    FIRE: "Mega Inferno",
    WATER: "Mega Maelstrom",
    GRASS: "Mega Bloom",
    ELECTRIC: "Mega Thunderstorm",
    ICE: "Mega Permafrost",
    FIGHTING: "Mega Rampage",
    POISON: "Mega Venom",
    GROUND: "Mega Earthshock",
    FLYING: "Mega Tempest",
    PSYCHIC: "Mega Mindbreak",
    BUG: "Mega Swarm",
    ROCK: "Mega Landslide",
    GHOST: "Mega Eclipse",
    DRAGON: "Mega Cataclysm",
    DARK: "Mega Abyss",
    STEEL: "Mega Forge",
    FAIRY: "Mega Radiance"
  };
  function golpeMegaDe(meta) {
    const tipo = meta?.tipos?.[0];
    const nome = GOLPE_MEGA_POR_TIPO[tipo];
    if (!nome) return null;
    return {
      name: nome,
      power: 600,
      type: tipo,
      category: (meta.bases.atk ?? 0) >= (meta.bases.spAtk ?? 0) ? "PHYSICAL" : "SPECIAL",
      cooldownMs: COOLDOWN_MEGA_MS,
      learnLevel: 1,
      // Ver o cabeçalho: sem esta marca o golpe volta para os 60 s de todo golpe de 600.
      cdFixo: true,
      // O que a tela usa para pintar o selo de "golpe da mega" na ficha.
      golpeMega: true
    };
  }
  function criarEspeciesMega(lista) {
    const porId = new Map(lista.map((c) => [c.pokeId, c]));
    const saida = [];
    for (const m of TODAS_AS_MEGAS) {
      const base = porId.get(m.dex);
      if (!base) continue;
      const pokeId = pokeIdDaMega(m);
      saida.push({
        ...base,
        pokeId,
        name: m.nome,
        looktype: looktypeDaMega(m),
        description: `a ${m.nome.toLowerCase()}`,
        type1: m.tipos[0],
        type2: m.tipos[1] ?? null,
        baseHp: m.bases.hp,
        baseAtk: m.bases.atk,
        baseDef: m.bases.def,
        baseSpAtk: m.bases.spAtk,
        baseSpDef: m.bases.spDef,
        baseSpeed: m.bases.speed,
        evolvesToId: 0,
        evolveLevel: 0,
        // O teto de quem NÃO evolui (`TETO_CAPTURA_MAX` em `teto-captura.mjs`, aqui sem o import para
        // não fechar um ciclo de módulos). Até 16/10 toda mega era de última evolução e herdava o 100 da
        // base; a Mega Floette é a primeira de uma forma do meio (Flabébé → Floette → Florges), e
        // herdaria o 40 da Floette — o que uma segunda passagem do teto desfaria.
        tetoCaptura: 100,
        // `loot` e `attacks` viriam por REFERÊNCIA no espalhamento acima, e passagens do boot
        // ainda dão `push` neles (ver `aplicarDropsNossos`). Copiar aqui é o que impede a mega
        // de escrever na ficha do Gengar de verdade.
        loot: (base.loot ?? []).map((l) => ({ ...l })),
        // O moveset da planilha, quando a mega está nela; senão o da base, CÓPIA EXATA, mais o
        // golpe de mega — e nada mais. Ver o cabeçalho de `GOLPE_MEGA_POR_TIPO` para por que a
        // cópia não é rederivada dos tipos novos.
        attacks: golpesDaPlanilhaDaMega(pokeId) ?? [
          ...(base.attacks ?? []).map((a) => ({ ...a })),
          ...golpeMegaDe(m) ? [golpeMegaDe(m)] : []
        ],
        megaDeDex: m.dex,
        ...m.segunda ? { megaSegunda: true } : {}
      });
    }
    return saida;
  }
  function elosMegaDaNota(lista) {
    const existe = new Set(lista.map((c) => c.pokeId));
    const elos = [];
    for (const m of TODAS_AS_MEGAS) {
      const mega = pokeIdDaMega(m);
      if (!existe.has(m.dex) || !existe.has(mega)) continue;
      elos.push([m.dex, mega]);
    }
    return elos;
  }

  // tests/.cache/shared/evolucoes-cruzadas.mjs
  var evolucoes_cruzadas_exports = {};
  __export(evolucoes_cruzadas_exports, {
    CADEIAS_TRUNCADAS: () => CADEIAS_TRUNCADAS,
    EVOLUCOES_ENTRE_GERACOES: () => EVOLUCOES_ENTRE_GERACOES,
    NIVEIS_POR_ONDE_O_ALVO_APARECE: () => NIVEIS_POR_ONDE_O_ALVO_APARECE,
    aplicarCadeiasTruncadas: () => aplicarCadeiasTruncadas,
    aplicarElosEvolutivos: () => aplicarElosEvolutivos,
    aplicarEvolucoesEntreGeracoes: () => aplicarEvolucoesEntreGeracoes,
    corrigirNiveisDeEvolucao: () => corrigirNiveisDeEvolucao,
    normalizarEvolveLevel600: () => normalizarEvolveLevel600
  });
  var CADEIAS_TRUNCADAS = {
    288: { para: 289, nivel: 1250 },
    // Vigoroth → Slaking
    13288: { para: 289, nivel: 1250 },
    372: { para: 373, nivel: 1250 },
    // Shelgon  → Salamence
    13372: { para: 373, nivel: 1250 },
    375: { para: 376, nivel: 1250 },
    // Metang   → Metagross (espelho truncava no 600→100)
    13375: { para: 376, nivel: 1250 }
    // Metang Hoenn → Metagross
  };
  var EVOLUCOES_ENTRE_GERACOES = {
    57: { para: 979, nivel: 114800 },
    // Primeape   Kanto → Annihilape Paldea
    82: { para: 462, nivel: 1500 },
    // Magneton   Kanto → Magnezone  Sinnoh
    108: { para: 463, nivel: 1500 },
    // Lickitung  Kanto → Lickilicky Sinnoh
    176: { para: 468, nivel: 1500 },
    // Togetic    Johto → Togekiss   Sinnoh
    190: { para: 424, nivel: 1250 },
    // Aipom      Johto → Ambipom    Sinnoh
    193: { para: 469, nivel: 1500 },
    // Yanma      Johto → Yanmega    Sinnoh
    198: { para: 430, nivel: 1500 },
    // Murkrow    Johto → Honchkrow  Sinnoh
    200: { para: 429, nivel: 1250 },
    // Misdreavus Johto → Mismagius  Sinnoh
    207: { para: 472, nivel: 1500 },
    // Gligar     Johto → Gliscor    Sinnoh
    215: { para: 461, nivel: 1500 },
    // Sneasel    Johto → Weavile    Sinnoh
    217: { para: 901, nivel: 58900 },
    // Ursaring   Johto → Ursaluna   Galar
    221: { para: 473, nivel: 1500 },
    // Piloswine  Johto → Mamoswine  Sinnoh
    233: { para: 474, nivel: 1500 },
    // Porygon2   Johto → Porygon-Z  Sinnoh
    // Makuhita → Hariyama não atravessa geração: é a mesma cadeia truncada do Vigoroth
    // (`CADEIAS_TRUNCADAS` acima), e o espelho de Hoenn tem as duas metades. Vale para o id
    // do espelho e para o clone 13xxx, que é o que a hunt de Hoenn usa.
    296: { para: 297, nivel: 550 },
    13296: { para: 297, nivel: 550 },
    // --- 18/10/2026 (ver o cabeçalho). O nível é o do alvo — o marcador da hunt dele, ou o
    // `huntLevel` de quem não tem hunt —, e o teto de captura o reescreve no boot (`teto-captura.mjs`).
    203: { para: 981, nivel: 46150 },
    // Girafarig   Johto → Farigiraf        Paldea
    206: { para: 982, nivel: 46150 },
    // Dunsparce   Johto → Dudunsparce      Paldea
    234: { para: 899, nivel: 27500 },
    // Stantler    Johto → Wyrdeer          Hisui
    808: { para: 809, nivel: 108e3 },
    // Meltan            → Melmetal
    647: { para: 8647, nivel: 8600 },
    // Keldeo            → Keldeo Resolute
    8718: { para: 718, nivel: 1e4 },
    // Zygarde 10%       → Zygarde
    718: { para: 9718, nivel: 21200 },
    // Zygarde           → Zygarde Complete
    746: { para: 8746, nivel: 84650 },
    // Wishiwashi        → Wishiwashi School
    // --- As outras FORMAS como evolução (pedido do dono, 18/10/2026): as de lendário, que não têm hunt
    // nem saem do Mystic Ticket e por isso ninguém conseguia ter, e as três de batalha que só vinham da
    // hunt. A pedra é a do tipo da forma, e o primário dela é o mesmo da base em todas — a regra de
    // sempre (`tipoDaPedraDeEvolucao`) já dá a certa. O elo precisa estar AQUI, e não só na tabela das
    // ramificadas: a pedra da evolução (`pedraDeEvolucao`) exige `evolvesToId`. O Kyurem abre em dois
    // (White e Black) e está também em `EVOLUCOES_RAMIFICADAS`.
    483: { para: 8483, nivel: 3500 },
    // Dialga            → Dialga Origin
    484: { para: 8484, nivel: 3500 },
    // Palkia            → Palkia Origin
    492: { para: 8492, nivel: 3500 },
    // Shaymin           → Shaymin Sky
    641: { para: 8641, nivel: 8600 },
    // Tornadus          → Tornadus Therian
    642: { para: 8642, nivel: 8600 },
    // Thundurus         → Thundurus Therian
    645: { para: 8645, nivel: 8600 },
    // Landorus          → Landorus Therian
    646: { para: 8646, nivel: 8600 },
    // Kyurem            → White Kyurem (ou Black)
    681: { para: 8681, nivel: 21200 },
    // Aegislash         → Aegislash Blade
    720: { para: 8720, nivel: 21200 },
    // Hoopa             → Hoopa Unbound
    774: { para: 8774, nivel: 84650 },
    // Minior            → Minior Core
    888: { para: 8888, nivel: 35150 },
    // Zacian            → Zacian Crowned
    889: { para: 8889, nivel: 35150 },
    // Zamazenta         → Zamazenta Crowned
    905: { para: 8905, nivel: 35150 },
    // Enamorus          → Enamorus Therian
    964: { para: 8964, nivel: 53350 }
    // Palafin           → Palafin Hero
  };
  function aplicarElosEvolutivos(lista, tabela) {
    const porId = new Map(lista.map((c) => [c.pokeId, c]));
    let ligados = 0;
    for (const [id, { para, nivel }] of Object.entries(tabela)) {
      const esp = porId.get(Number(id));
      if (!esp || esp.evolvesToId || !porId.has(para)) continue;
      esp.evolvesToId = para;
      esp.evolveLevel = nivel;
      ligados++;
    }
    return ligados;
  }
  function aplicarEvolucoesEntreGeracoes(lista) {
    return aplicarElosEvolutivos(lista, EVOLUCOES_ENTRE_GERACOES);
  }
  var NIVEIS_POR_ONDE_O_ALVO_APARECE = {
    // --- Alvo em SINNOH (dex 387–493)
    82: 1500,
    // Magneton   → Magnezone
    108: 1500,
    // Lickitung  → Lickilicky
    112: 3e3,
    // Rhydon     → Rhyperior
    114: 3e3,
    // Tangela    → Tangrowth
    125: 3e3,
    // Electabuzz → Electivire
    126: 3e3,
    // Magmar     → Magmortar
    176: 1500,
    // Togetic    → Togekiss
    190: 1250,
    // Aipom      → Ambipom
    193: 1500,
    // Yanma      → Yanmega
    198: 1500,
    // Murkrow    → Honchkrow
    200: 1250,
    // Misdreavus → Mismagius
    207: 1500,
    // Gligar     → Gliscor
    215: 1500,
    // Sneasel    → Weavile
    221: 1500,
    // Piloswine  → Mamoswine
    233: 1500,
    // Porygon2   → Porygon-Z
    299: 2e3,
    // Nosepass   → Probopass
    315: 3500,
    // Roselia    → Roserade
    356: 3e3,
    // Dusclops   → Dusknoir
    387: 1750,
    // Turtwig    → Grotle
    388: 3500,
    // Grotle     → Torterra
    390: 1750,
    // Chimchar   → Monferno
    391: 3500,
    // Monferno   → Infernape
    393: 1750,
    // Piplup     → Prinplup
    394: 3500,
    // Prinplup   → Empoleon
    396: 1750,
    // Starly     → Staravia
    397: 3500,
    // Staravia   → Staraptor
    399: 2e3,
    // Bidoof     → Bibarel
    401: 2e3,
    // Kricketot  → Kricketune
    403: 1750,
    // Shinx      → Luxio
    404: 3500,
    // Luxio      → Luxray
    408: 2e3,
    // Cranidos   → Rampardos
    410: 3e3,
    // Shieldon   → Bastiodon
    415: 3e3,
    // Combee     → Vespiquen
    418: 2e3,
    // Buizel     → Floatzel
    420: 2e3,
    // Cherubi    → Cherrim
    422: 2e3,
    // Shellos    → Gastrodon
    425: 2e3,
    // Drifloon   → Drifblim
    427: 3e3,
    // Buneary    → Lopunny
    431: 2e3,
    // Glameow    → Purugly
    434: 2e3,
    // Stunky     → Skuntank
    436: 2e3,
    // Bronzor    → Bronzong
    443: 1750,
    // Gible      → Gabite
    444: 3500,
    // Gabite     → Garchomp
    447: 2e3,
    // Riolu      → Lucario
    449: 2e3,
    // Hippopotas → Hippowdon
    451: 2e3,
    // Skorupi    → Drapion
    453: 2e3,
    // Croagunk   → Toxicroak
    456: 2e3,
    // Finneon    → Lumineon
    459: 2e3,
    // Snover     → Abomasnow
    489: 2e3,
    // Phione     → Manaphy
    13299: 2e3,
    // Nosepass   → Probopass
    13315: 3500,
    // Roselia    → Roserade
    13447: 2e3,
    // Riolu      → Lucario
    // --- Alvo em UNOVA (dex 494–649)
    495: 6400,
    // Snivy      → Servine
    496: 8600,
    // Servine    → Serperior
    498: 6400,
    // Tepig      → Pignite
    499: 8600,
    // Pignite    → Emboar
    501: 6400,
    // Oshawott   → Dewott
    502: 8600,
    // Dewott     → Samurott
    504: 6950,
    // Patrat     → Watchog
    507: 8600,
    // Herdier    → Stoutland
    509: 6950,
    // Purrloin   → Liepard
    511: 6950,
    // Pansage    → Simisage
    513: 6950,
    // Pansear    → Simisear
    515: 6950,
    // Panpour    → Simipour
    517: 6950,
    // Munna      → Musharna
    519: 6400,
    // Pidove     → Tranquill
    520: 8600,
    // Tranquill  → Unfezant
    522: 6950,
    // Blitzle    → Zebstrika
    524: 6400,
    // Roggenrola → Boldore
    525: 8600,
    // Boldore    → Gigalith
    527: 6950,
    // Woobat     → Swoobat
    529: 6950,
    // Drilbur    → Excadrill
    532: 6400,
    // Timburr    → Gurdurr
    533: 8600,
    // Gurdurr    → Conkeldurr
    535: 6400,
    // Tympole    → Palpitoad
    536: 8600,
    // Palpitoad  → Seismitoad
    540: 6400,
    // Sewaddle   → Swadloon
    541: 8600,
    // Swadloon   → Leavanny
    543: 6400,
    // Venipede   → Whirlipede
    544: 8600,
    // Whirlipede → Scolipede
    546: 6950,
    // Cottonee   → Whimsicott
    548: 6950,
    // Petilil    → Lilligant
    551: 6400,
    // Sandile    → Krokorok
    552: 8600,
    // Krokorok   → Krookodile
    557: 6950,
    // Dwebble    → Crustle
    559: 6950,
    // Scraggy    → Scrafty
    562: 6950,
    // Yamask     → Cofagrigus
    564: 6950,
    // Tirtouga   → Carracosta
    566: 8e3,
    // Archen     → Archeops
    568: 6950,
    // Trubbish   → Garbodor
    570: 6950,
    // Zorua      → Zoroark
    572: 6950,
    // Minccino   → Cinccino
    574: 6400,
    // Gothita    → Gothorita
    575: 8600,
    // Gothorita  → Gothitelle
    577: 6400,
    // Solosis    → Duosion
    578: 8600,
    // Duosion    → Reuniclus
    580: 6950,
    // Ducklett   → Swanna
    583: 8600,
    // Vanillish  → Vanilluxe
    585: 6950,
    // Deerling   → Sawsbuck
    588: 6950,
    // Karrablast → Escavalier
    590: 6950,
    // Foongus    → Amoonguss
    592: 6950,
    // Frillish   → Jellicent
    595: 6950,
    // Joltik     → Galvantula
    597: 6950,
    // Ferroseed  → Ferrothorn
    600: 8600,
    // Klang      → Klinklang
    602: 6400,
    // Tynamo     → Eelektrik
    603: 8600,
    // Eelektrik  → Eelektross
    607: 6400,
    // Litwick    → Lampent
    608: 8600,
    // Lampent    → Chandelure
    610: 6400,
    // Axew       → Fraxure
    611: 8600,
    // Fraxure    → Haxorus
    613: 6950,
    // Cubchoo    → Beartic
    616: 6950,
    // Shelmet    → Accelgor
    619: 6950,
    // Mienfoo    → Mienshao
    622: 6950,
    // Golett     → Golurk
    624: 6400,
    // Pawniard   → Bisharp
    627: 6950,
    // Rufflet    → Braviary
    629: 6950,
    // Vullaby    → Mandibuzz
    633: 6400,
    // Deino      → Zweilous
    634: 8600,
    // Zweilous   → Hydreigon
    636: 6950,
    // Larvesta   → Volcarona
    // --- Alvo em KALOS (dex 650–721)
    651: 21200,
    // Quilladin   → Chesnaught
    654: 21200,
    // Braixen     → Delphox
    659: 16e3,
    // Bunnelby    → Diggersby
    661: 14350,
    // Fletchling  → Fletchinder
    662: 21200,
    // Fletchinder → Talonflame
    664: 14350,
    // Scatterbug  → Spewpa
    665: 21200,
    // Spewpa      → Vivillon
    667: 16e3,
    // Litleo      → Pyroar
    669: 14350,
    // Flabebe     → Floette
    670: 21200,
    // Floette     → Florges
    674: 2e4,
    // Pancham     → Pangoro
    679: 14350,
    // Honedge     → Doublade
    680: 1e3,
    // Doublade    → Aegislash
    682: 16e3,
    // Spritzee    → Aromatisse
    684: 16e3,
    // Swirlix     → Slurpuff
    686: 16e3,
    // Inkay       → Malamar
    688: 16e3,
    // Binacle     → Barbaracle
    690: 2e4,
    // Skrelp      → Dragalge
    692: 16e3,
    // Clauncher   → Clawitzer
    694: 16e3,
    // Helioptile  → Heliolisk
    698: 16e3,
    // Amaura      → Aurorus
    704: 14350,
    // Goomy       → Sliggoo
    705: 21200,
    // Sliggoo     → Goodra
    708: 16e3,
    // Phantump    → Trevenant
    712: 16e3,
    // Bergmite    → Avalugg
    714: 16e3,
    // Noibat      → Noivern
    // --- Alvo em ALOLA (dex 722–809)
    722: 32e3,
    // Rowlet    → Dartrix
    725: 32e3,
    // Litten    → Torracat
    726: 43100,
    // Torracat  → Incineroar
    728: 32e3,
    // Popplio   → Brionne
    729: 43100,
    // Brionne   → Primarina
    731: 32e3,
    // Pikipek   → Trumbeak
    732: 43100,
    // Trumbeak  → Toucannon
    734: 34650,
    // Yungoos   → Gumshoos
    736: 32e3,
    // Grubbin   → Charjabug
    737: 43100,
    // Charjabug → Vikavolt
    742: 34650,
    // Cutiefly  → Ribombee
    747: 34650,
    // Mareanie  → Toxapex
    749: 34650,
    // Mudbray   → Mudsdale
    751: 34650,
    // Dewpider  → Araquanid
    755: 34650,
    // Morelull  → Shiinotic
    757: 34650,
    // Salandit  → Salazzle
    759: 34650,
    // Stufful   → Bewear
    761: 32e3,
    // Bounsweet → Steenee
    762: 43100,
    // Steenee   → Tsareena
    767: 34650,
    // Wimpod    → Golisopod
    782: 32e3,
    // Jangmo-o  → Hakamo-o
    783: 43100,
    // Hakamo-o  → Kommo-o
    // --- BEBÊS — base de geração posterior ao alvo, então a hunt dele fica abaixo da do bebê
    172: 60,
    // Pichu     → Pikachu
    173: 40,
    // Cleffa    → Clefairy
    174: 40,
    // Igglybuff → Jigglypuff
    238: 100,
    // Smoochum  → Jynx
    239: 100,
    // Elekid    → Electabuzz
    240: 100,
    // Magby     → Magmar
    298: 20,
    // Azurill   → Marill
    360: 100,
    // Wynaut    → Wobbuffet
    406: 650,
    // Budew     → Roselia
    433: 700,
    // Chingling → Chimecho
    439: 80,
    // Mime Jr.  → Mr. Mime
    446: 100,
    // Munchlax  → Snorlax
    458: 100,
    // Mantyke   → Mantine
    13298: 20,
    // Azurill   → Marill
    13360: 100,
    // Wynaut    → Wobbuffet
    // --- Alvo FORA de Sinnoh–Alola — os cinco que a tabela já trazia, intactos
    113: 1125,
    // Chansey → Blissey
    137: 1125,
    // Porygon → Porygon2
    349: 1125,
    // Feebas  → Milotic
    375: 1250,
    // Metang  → Metagross
    803: 7500
    // Poipole → Naganadel
  };
  function corrigirNiveisDeEvolucao(lista) {
    let corrigidos = 0;
    for (const c of lista) {
      const nivel = NIVEIS_POR_ONDE_O_ALVO_APARECE[c.pokeId];
      if (!nivel || !c.evolvesToId || c.evolveLevel === nivel) continue;
      c.evolveLevel = nivel;
      corrigidos++;
    }
    return corrigidos;
  }
  function normalizarEvolveLevel600(lista) {
    for (const c of lista) {
      if (c.evolveLevel === 600) c.evolveLevel = 100;
    }
  }
  function aplicarCadeiasTruncadas(lista) {
    return aplicarElosEvolutivos(lista, CADEIAS_TRUNCADAS);
  }

  // tests/.cache/shared/recompensa-hunt.mjs
  var recompensa_hunt_exports = {};
  __export(recompensa_hunt_exports, {
    EXPOENTE_RENDA: () => EXPOENTE_RENDA,
    FRACAO_BONUS_LOOT: () => FRACAO_BONUS_LOOT,
    alvoRendaPorKill: () => alvoRendaPorKill,
    ouroDoAbate: () => ouroDoAbate,
    ouroDoLootPorKill: () => ouroDoLootPorKill,
    ouroDoNivel: () => ouroDoNivel,
    ouroPorDerrotaHunt: () => ouroPorDerrotaHunt,
    xpDoNivel: () => xpDoNivel,
    xpPorDerrota: () => xpPorDerrota
  });

  // tests/.cache/shared/sell-value.mjs
  var NIVEL_ANCORA = 150;
  var OURO_ANCORA = 12e3;
  var XP_ANCORA = 0.6 * NIVEL_ANCORA ** 2;
  var xpDoNivel = (n) => n <= NIVEL_ANCORA ? Math.floor(6 * n * n / 10) + 8 : Math.round(XP_ANCORA * (n / NIVEL_ANCORA) ** 1.25);
  var ouroDoNivel = (n) => Math.round(OURO_ANCORA * (n / NIVEL_ANCORA) ** 0.6);
  var OURO_KILL_NIVEL_1 = 36;
  var OURO_KILL_ANCORA_NIVEL = 5e3;
  var OURO_KILL_ANCORA = 6e3;
  var EXPOENTE_OURO_KILL = Math.log(OURO_KILL_ANCORA / OURO_KILL_NIVEL_1) / Math.log(OURO_KILL_ANCORA_NIVEL);
  var NIVEL_TETO_OURO = 25e3;
  var TETO_OURO_KILL = Math.round(OURO_KILL_NIVEL_1 * NIVEL_TETO_OURO ** EXPOENTE_OURO_KILL);
  var ouroPorKillDoNivel = (n) => Math.min(
    TETO_OURO_KILL,
    Math.max(1, Math.round(OURO_KILL_NIVEL_1 * Math.max(1, Number(n) || 1) ** EXPOENTE_OURO_KILL))
  );
  var NIVEL_HUNT_TETO_SELL_POKEMON = 2500;
  var TETO_SELL_POKEMON = ouroDoNivel(NIVEL_HUNT_TETO_SELL_POKEMON);

  // tests/.cache/shared/recompensa-hunt.mjs
  function xpPorDerrota(hunt, nivelMob, especie) {
    return xpDoNivel(nivelMob);
  }
  var FRACAO_BONUS_LOOT = 0.15;
  var EXPOENTE_RENDA = 0.3;
  function alvoRendaPorKill(nivel) {
    const n = Math.max(1, Number(nivel) || 1);
    const base = n <= NIVEL_TETO_OURO ? ouroPorKillDoNivel(n) : TETO_OURO_KILL * (n / NIVEL_TETO_OURO) ** EXPOENTE_RENDA;
    return Math.round(base * (1 + FRACAO_BONUS_LOOT));
  }
  function ouroDoLootPorKill(nivel, bonusLootPct2 = 0) {
    const base = Math.max(0, alvoRendaPorKill(nivel) - ouroPorKillDoNivel(nivel));
    const bonus = Math.max(0, Number(bonusLootPct2) || 0);
    return Math.round(base * (1 + bonus / 100));
  }
  function ouroDoAbate(nivelMob, bonusLootPct2 = 0) {
    const base = ouroPorKillDoNivel(nivelMob);
    const loot = ouroDoLootPorKill(nivelMob, bonusLootPct2);
    return { base, loot, total: base + loot };
  }
  function ouroPorDerrotaHunt(hunt, nivelMob, especie, bonusLootPct2 = 0) {
    return ouroDoAbate(nivelMob, bonusLootPct2).total;
  }

  // tests/.cache/shared/ajustes-especie-espelho.mjs
  var ajustes_especie_espelho_exports = {};
  __export(ajustes_especie_espelho_exports, {
    AJUSTE_HUNT_LEVEL: () => AJUSTE_HUNT_LEVEL,
    aplicarAjustesHuntLevel: () => aplicarAjustesHuntLevel
  });
  var AJUSTE_HUNT_LEVEL = {
    112: 100,
    // Rhydon — hunt Kanto nv 100; espelho deixou 80 (degrau do Rhyhorn)
    219: 100,
    // Magcargo — mesmo bug (degrau do Slugma)
    13447: 1e3,
    // Riolu
    13448: 1250,
    // Lucario
    297: 700,
    // Hariyama — acima do Makuhita (550)
    13297: 700,
    // Hariyama (clone Hoenn)
    // Smeargle é de Gen 2 e mora em Johto (`hunts-johto-novos.json`); o espelho deixou
    // huntLevel 1 com `priceNpc` de 1 milhão, que é lixo de importação. 30 é o degrau dos
    // vizinhos de ilha dele — Dunsparce, Snubbull, Teddiursa —, e é daqui (e não do degrau
    // de `hunts-sinnoh.json`, que o cliente não lê) para as duas pontas verem o mesmo XP.
    // Desde 17/10/2026 (Johto no Nv 200) a hunt dele e a dos vizinhos estão no 290: o 30 aqui é o
    // degrau na escala do espelho, e o valor sobe à curva da hunt em `shared/valor-cadeia.mjs`.
    235: 30,
    // Smeargle
    // Ditto é de Kanto e mora em `hunts-kanto-novos.json` desde 18/10/2026 (pedido do dono), no
    // Nv 50 do Farfetch'd. O espelho deixou huntLevel 1 e `priceNpc` 0 — enquanto ele estava em
    // `hunts-sinnoh.json` o degrau de 1.000 de lá cobria isso no servidor, e fora dele a venda
    // caía para 594. Como no Smeargle: o nível da hunt, para as duas pontas verem o mesmo valor.
    132: 50,
    // Ditto
    // Weavile e Togekiss existem DUAS vezes no catálogo (o espelho e o nosso), e o espelho traz Sneasel → Weavile e
    // Togetic → Togekiss. Montada com ele junto (`aplicarEscalaHuntLevel` no content.mjs), a escada de Sinnoh punha os
    // dois no topo, 3000, só no servidor; o cliente, que não monta a escada, mostrava o 1500 do nosso catálogo — o nível
    // das hunts deles. O card do Market → Vender mostrava um preço e a venda pagava 1,52× (relato do dono, 21/10/2026: um
    // Weavile Nv 100 Q 1,45 mostrava 207.812 e pagou 314.983). Ele escolheu o do card: o nível da hunt.
    461: 1500,
    // Weavile — hunt weavile_sinnoh nv 1500
    468: 1500
    // Togekiss — hunt togekiss_sinnoh nv 1500
  };
  function aplicarAjustesHuntLevel(obter) {
    for (const [id, nivel] of Object.entries(AJUSTE_HUNT_LEVEL)) {
      const esp = obter(Number(id));
      if (!esp) continue;
      esp.huntLevel = nivel;
      if (nivel <= NIVEL_ANCORA) {
        esp.experience = xpDoNivel(nivel);
        const ouro = ouroDoNivel(nivel);
        esp.sellValue = ouro;
        esp.priceNpc = ouro;
      }
    }
  }

  // tests/.cache/raiz/hunt-analyser.mjs
  var hunt_analyser_exports = {};
  __export(hunt_analyser_exports, {
    CD_GOLPE_MS: () => CD_GOLPE_MS,
    CD_MOVIMENTO_MEDIO_MS: () => CD_MOVIMENTO_MEDIO_MS,
    MAX_MOBS: () => MAX_MOBS,
    MS_DESLOC_MS: () => MS_DESLOC_MS,
    MS_MINIMO_RITMO: () => MS_MINIMO_RITMO,
    MS_ONDA: () => MS_ONDA,
    TIPOS_ELEMENTAIS: () => TIPOS_ELEMENTAIS,
    VIP_MULT_XP: () => VIP_MULT_XP,
    analisarHunt: () => analisarHunt,
    bonusLootPct: () => bonusLootPct,
    efetividade: () => efetividade2,
    especiePassaFiltroMatchup: () => especiePassaFiltroMatchup,
    killsPorHora: () => killsPorHora,
    listaDropsEspecie: () => listaDropsEspecie,
    matchupDefensivo: () => matchupDefensivo,
    matchupTiposHunt: () => matchupTiposHunt,
    mediaPorKill: () => mediaPorKill,
    melhorEfetividadeContra: () => melhorEfetividadeContra,
    multXpPokemon: () => multXpPokemon,
    multXpTreinador: () => multXpTreinador,
    ritmoDaSessao: () => ritmoDaSessao
  });

  // tests/.cache/shared/tipo-efetividade.mjs
  var DIAGONAL_DE_TIPOS = Object.freeze({
    FIRE: 0.5,
    WATER: 0.5,
    ELECTRIC: 0.5,
    GRASS: 0.5,
    ICE: 0.5,
    POISON: 0.5,
    PSYCHIC: 0.5,
    DARK: 0.5,
    STEEL: 0.5,
    GHOST: 2,
    DRAGON: 2
  });
  function multAtaqueContraDefesa(atq, def, linha) {
    const a = String(atq).toUpperCase();
    const d = String(def).toUpperCase();
    if (d === a) return DIAGONAL_DE_TIPOS[a] ?? 1;
    return linha[d] ?? 1;
  }
  function efetividade(atq, def1, def2, tabela) {
    const linha = tabela[String(atq).toUpperCase()] ?? {};
    let v = multAtaqueContraDefesa(atq, def1, linha);
    if (def2 && def2 !== def1) v *= multAtaqueContraDefesa(atq, def2, linha);
    return v;
  }

  // tests/.cache/shared/guild-boost.mjs
  var BOOST_GUILD = Object.freeze({
    /** Quanto o boost soma no XP do treinador E no do pokemon. */
    pct: 10,
    dias: 7,
    /** A arte inteira (48×48: a aba Boost, o diálogo, a comemoração) e a pequena (32×32: o que sai a 16-20 px). */
    icone: "/img/itens/boost-guild.png",
    iconeMini: "/img/itens/boost-guild-32.png"
  });
  var BOOST_GUILD_MS = BOOST_GUILD.dias * 24 * 36e5;
  var BOOST_GUILD_MULT = 1 + BOOST_GUILD.pct / 100;
  var BANCO_GUILD = Object.freeze({
    /** Quanto o banco junta para ligar (ou estender) o boost: 7 dias. Era 1.000 até 08/10/2026. */
    meta: 500,
    /** O `ref` das linhas do ledger: a doação (`loja`) e a devolução da guild apagada (`loja_estorno`). */
    ref: "guild_banco",
    /** Os atalhos de doação da tela, além do "Completar". */
    atalhos: [10, 50, 100, 250],
    /** Quantas linhas o histórico do banco traz (doações e bancos cheios, os mais recentes). */
    historico: 25,
    /**
     * Quantas doações o LOG COMPLETO (dono e sub-dono, "Ver tudo" na aba) traz no máximo — as mais
     * recentes. O teto é do socket, que leva a resposta inteira de uma vez: 5.000 linhas são ~200 kB,
     * e uma guild que enche um banco por semana leva anos para chegar nelas. A soma por membro é
     * sempre da vida inteira, com teto ou sem (ver `logBancoDaGuild`).
     */
    logMax: 5e3
  });
  var boostGuildAtivo = (ate, agora) => (Number(ate) || 0) > agora;
  var multBoostGuild = (ate, agora) => boostGuildAtivo(ate, agora) ? BOOST_GUILD_MULT : 1;

  // tests/.cache/raiz/hunt-analyser.mjs
  var MS_ONDA = 2600;
  var MAX_MOBS = 16;
  var CD_GOLPE_MS = 900;
  var MS_DESLOC_MS = 600;
  var CD_MOVIMENTO_MEDIO_MS = 2e3;
  var VIP_MULT_XP = 1.5;
  var TIPOS_ELEMENTAIS = [
    "NORMAL",
    "FIRE",
    "WATER",
    "GRASS",
    "ELECTRIC",
    "ICE",
    "FIGHTING",
    "POISON",
    "GROUND",
    "FLYING",
    "PSYCHIC",
    "BUG",
    "ROCK",
    "GHOST",
    "DRAGON",
    "DARK",
    "STEEL",
    "FAIRY"
  ];
  function efetividade2(atq, def1, def2, tabela) {
    return efetividade(atq, def1, def2, tabela);
  }
  function multBoost(loja, chave, agora, tiposBoost) {
    const ate = loja?.boosts?.[chave] ?? 0;
    if (agora >= ate) return 1;
    return tiposBoost.find((b) => b.chave === chave)?.mult ?? 1;
  }
  var multGuild = (p) => 1 + (Number(p?.guildBonusPct) || 0) / 100;
  var multBoostDaGuild = (p, agora) => multBoostGuild(p?.guild?.boostAte, agora);
  var vipAtivo = (loja, agora) => agora < (loja?.vipAte ?? 0);
  function multXpTreinador(p, agora, tiposBoost) {
    const l = p.loja ?? {};
    return multBoost(l, "xp", agora, tiposBoost) * (vipAtivo(l, agora) ? VIP_MULT_XP : 1) * multGuild(p) * multBoostDaGuild(p, agora);
  }
  function multXpPokemon(p, agora, tiposBoost) {
    const l = p.loja ?? {};
    return multBoost(l, "pokexp", agora, tiposBoost) * (vipAtivo(l, agora) ? VIP_MULT_XP : 1) * multGuild(p) * multBoostDaGuild(p, agora);
  }
  function bonusLootPct(p, agora, tiposBoost, farmEventoPct = 0) {
    const boost = (multBoost(p?.loja ?? {}, "loot", agora, tiposBoost) - 1) * 100;
    return boost + (Number(p?.guildBonusPct) || 0) + (Number(farmEventoPct) || 0);
  }
  function mediaPorKill(hunt, especies, bonusLoot = 0) {
    const total = hunt.especies.reduce((s, e) => s + e.pontos, 0) || 1;
    let xp = 0;
    let gold = 0;
    for (const e of hunt.especies) {
      const esp = especies.get(e.pokeId);
      const peso = e.pontos / total;
      const base = xpPorDerrota(hunt, hunt.nivel, esp);
      xp += base * peso;
      gold += ouroPorDerrotaHunt(hunt, hunt.nivel, esp, bonusLoot) * peso;
    }
    return { xp, gold };
  }
  function killsPorHora(hunt) {
    const pontos = hunt.especies.reduce((s, e) => s + e.pontos, 0) || 1;
    const porOnda = Math.min(MAX_MOBS, pontos);
    const msPorKill = CD_GOLPE_MS + MS_DESLOC_MS + CD_MOVIMENTO_MEDIO_MS;
    const segPorOnda = (porOnda * msPorKill + MS_ONDA) / 1e3;
    return porOnda / segPorOnda * 3600;
  }
  function melhorEfetividadeContra(tiposAtaque, defType1, defType2, tabela) {
    let melhor = 0;
    for (const atk of tiposAtaque) {
      const v = efetividade2(atk, defType1, defType2, tabela);
      if (v > melhor) melhor = v;
    }
    return melhor;
  }
  function especiePassaFiltroMatchup(esp, tiposSel, modo, tabela) {
    if (!esp || !tiposSel?.length || !modo) return false;
    const mult = melhorEfetividadeContra(tiposSel, esp.type1, esp.type2, tabela);
    if (modo === "fraco") return mult >= 2;
    if (modo === "forte") return mult <= 0.5;
    return false;
  }
  function matchupDefensivo(tiposDefensor, tabela) {
    const fracos = [];
    const fortes = [];
    const d1 = tiposDefensor[0];
    const d2 = tiposDefensor[1];
    if (!d1) return { fracos, fortes };
    for (const atk of TIPOS_ELEMENTAIS) {
      const mult = efetividade2(atk, d1, d2 ?? null, tabela);
      if (mult >= 2) fracos.push({ tipo: atk, mult });
      else if (mult <= 0.5) fortes.push({ tipo: atk, mult });
    }
    return { fracos, fortes };
  }
  function matchupTiposHunt(tiposAtaque, tabela) {
    const fortes = [];
    const fracos = [];
    for (const def of TIPOS_ELEMENTAIS) {
      let melhor = 0;
      for (const atk of tiposAtaque) {
        const v = efetividade2(atk, def, null, tabela);
        if (v > melhor) melhor = v;
      }
      if (melhor >= 2) fortes.push({ tipo: def, mult: melhor });
      else if (melhor <= 0.5) fracos.push({ tipo: def, mult: melhor });
    }
    return { fortes, fracos };
  }
  function listaDropsEspecie(especie) {
    return (especie?.loot ?? []).filter((l) => l.chance > 0).map((l) => ({
      name: l.name,
      pct: l.chance / 1e3,
      minCount: l.minCount,
      maxCount: l.maxCount
    })).sort((a, b) => b.pct - a.pct);
  }
  var MS_MINIMO_RITMO = 6e4;
  function ritmoDaSessao(sessao, agora = Date.now()) {
    if (!sessao?.inicio) return null;
    const horas = Math.max(agora - sessao.inicio, MS_MINIMO_RITMO) / 36e5;
    return {
      // `xpH` é a SOMA das duas XPs — o Hunt Analyser ainda mostra assim. O Pocket mostra as duas
      // separadas: somadas, elas davam o dobro do que a barra de cada uma de fato anda por hora.
      xpH: Math.round(((sessao.xpTreinador || 0) + (sessao.xpPokemon || 0)) / horas),
      xpTreinadorH: Math.round((sessao.xpTreinador || 0) / horas),
      xpPokemonH: Math.round((sessao.xpPokemon || 0) / horas),
      ouroH: Math.round((sessao.gold || 0) / horas),
      abatesH: Math.round((sessao.abates || 0) / horas),
      capturasH: Math.round((sessao.capturas || 0) / horas)
    };
  }
  function analisarHunt(hunt, ctx, tiposAtaque = []) {
    const { especies, tabelaTipos, eu, tiposBoost, farmEventoPct = 0 } = ctx;
    const agora = Date.now();
    const media = mediaPorKill(hunt, especies, bonusLootPct(eu, agora, tiposBoost, farmEventoPct));
    const kph = killsPorHora(hunt);
    const multTr = multXpTreinador(eu, agora, tiposBoost);
    const multPk = multXpPokemon(eu, agora, tiposBoost);
    const { fracos, fortes } = matchupDefensivo(tiposAtaque, tabelaTipos);
    return {
      hunt,
      xpTreinadorH: Math.round(media.xp * kph * multTr),
      xpPokemonH: Math.round(media.xp * kph * multPk),
      goldH: Math.round(media.gold * kph),
      killsH: Math.round(kph),
      tiposFracos: fracos,
      tiposResiste: fortes
    };
  }

  // tests/.cache/shared/ginasios.mjs
  var ginasios_exports = {};
  __export(ginasios_exports, {
    ARENA_EXPO_GINASIO: () => ARENA_EXPO_GINASIO,
    ARENA_EXPO_GUERRA: () => ARENA_EXPO_GUERRA,
    ARENA_NIVEL_CHEIO: () => ARENA_NIVEL_CHEIO,
    GINASIO_BUFF_MULT: () => GINASIO_BUFF_MULT,
    GINASIO_BUFF_PCT: () => GINASIO_BUFF_PCT,
    GINASIO_BUFF_PODIO_PCT: () => GINASIO_BUFF_PODIO_PCT,
    GINASIO_DESAFIO_COOLDOWN_MS: () => GINASIO_DESAFIO_COOLDOWN_MS,
    GINASIO_ESCALA_FORCA: () => GINASIO_ESCALA_FORCA,
    GINASIO_NIVEL_MIN: () => GINASIO_NIVEL_MIN,
    GINASIO_TIME_MAX: () => GINASIO_TIME_MAX,
    SLUG_ARENA_GINASIO: () => SLUG_ARENA_GINASIO,
    TIPOS_GINASIO: () => TIPOS_GINASIO,
    VARIACAO_DANO_MAX: () => VARIACAO_DANO_MAX,
    VARIACAO_DANO_MIN: () => VARIACAO_DANO_MIN,
    buffGinasioDoPokemon: () => buffGinasioDoPokemon,
    compararDuelo1v1: () => compararDuelo1v1,
    hpDeCombateGinasio: () => hpDeCombateGinasio,
    iconeDoGinasio: () => iconeDoGinasio,
    melhorGolpeDoGinasio: () => melhorGolpeDoGinasio,
    metricasDeCombate: () => metricasDeCombate,
    motivoForaDoGinasio: () => motivoForaDoGinasio,
    multBuffGinasio: () => multBuffGinasio,
    multDoLugarGinasio: () => multDoLugarGinasio,
    nivelDeArena: () => nivelDeArena,
    nivelNaGuerra: () => nivelNaGuerra,
    nivelNoGinasio: () => nivelNoGinasio,
    pctDoLugarGinasio: () => pctDoLugarGinasio,
    poderDoTimeGinasio: () => poderDoTimeGinasio,
    poderNoGinasio: () => poderNoGinasio,
    poderNoNivel: () => poderNoNivel,
    pokemonDoTipo: () => pokemonDoTipo,
    ratingDeCombate: () => ratingDeCombate,
    segundoETerceiro: () => segundoETerceiro,
    statsNoGinasio: () => statsNoGinasio,
    statsNoNivel: () => statsNoNivel,
    timeValidoDoGinasio: () => timeValidoDoGinasio,
    tipoDeGinasio: () => tipoDeGinasio,
    validarTimeGinasio: () => validarTimeGinasio
  });

  // tests/.cache/shared/refino-stats.mjs
  var STATS_REFINAVEIS = ["hp", "atk", "def", "spAtk", "spDef"];
  var REFINO_TETO_TECNICO = 9999;
  var REFINO_PASSO = 1;
  var inteiro = (v) => {
    const n = Math.floor(Number(v) || 0);
    return n > 0 ? Math.min(REFINO_TETO_TECNICO, n) : 0;
  };
  function normalizarRefino(bruto) {
    const cru = typeof bruto === "string" ? seguroJson(bruto) : bruto;
    const out = {};
    for (const k of STATS_REFINAVEIS) out[k] = inteiro(cru?.[k]);
    return out;
  }
  function seguroJson(txt) {
    try {
      return JSON.parse(txt);
    } catch {
      return null;
    }
  }
  function basesComRefino(especie, bonus) {
    const b = normalizarRefino(bonus);
    return {
      hp: (especie?.baseHp ?? 0) + b.hp * REFINO_PASSO,
      atk: (especie?.baseAtk ?? 0) + b.atk * REFINO_PASSO,
      def: (especie?.baseDef ?? 0) + b.def * REFINO_PASSO,
      spAtk: (especie?.baseSpAtk ?? 0) + b.spAtk * REFINO_PASSO,
      spDef: (especie?.baseSpDef ?? 0) + b.spDef * REFINO_PASSO,
      speed: especie?.baseSpeed ?? 0
    };
  }

  // tests/.cache/shared/formas.mjs
  var FORMAS = [
    { pokeId: 4019, dex: 19, nome: "Alolan Rattata", grupo: "alola", looktype: 64019, looktypeShiny: 74019 },
    { pokeId: 4020, dex: 20, nome: "Alolan Raticate", grupo: "alola", looktype: 64020, looktypeShiny: 74020 },
    { pokeId: 4026, dex: 26, nome: "Alolan Raichu", grupo: "alola", looktype: 64026, looktypeShiny: 74026 },
    { pokeId: 4027, dex: 27, nome: "Alolan Sandshrew", grupo: "alola", looktype: 64027, looktypeShiny: 74027 },
    { pokeId: 4028, dex: 28, nome: "Alolan Sandslash", grupo: "alola", looktype: 64028, looktypeShiny: 74028 },
    { pokeId: 4037, dex: 37, nome: "Alolan Vulpix", grupo: "alola", looktype: 64037, looktypeShiny: 74037 },
    { pokeId: 4038, dex: 38, nome: "Alolan Ninetales", grupo: "alola", looktype: 64038, looktypeShiny: 74038 },
    { pokeId: 4050, dex: 50, nome: "Alolan Diglett", grupo: "alola", looktype: 64050, looktypeShiny: 74050 },
    { pokeId: 4051, dex: 51, nome: "Alolan Dugtrio", grupo: "alola", looktype: 64051, looktypeShiny: 74051 },
    { pokeId: 4052, dex: 52, nome: "Alolan Meowth", grupo: "alola", looktype: 64052, looktypeShiny: 74052 },
    { pokeId: 5052, dex: 52, nome: "Galarian Meowth", grupo: "galar", looktype: 65052, looktypeShiny: 75052 },
    { pokeId: 4053, dex: 53, nome: "Alolan Persian", grupo: "alola", looktype: 64053, looktypeShiny: 74053 },
    { pokeId: 6058, dex: 58, nome: "Hisuian Growlithe", grupo: "hisui", looktype: 66058, looktypeShiny: 76058 },
    { pokeId: 6059, dex: 59, nome: "Hisuian Arcanine", grupo: "hisui", looktype: 66059, looktypeShiny: 76059 },
    { pokeId: 4074, dex: 74, nome: "Alolan Geodude", grupo: "alola", looktype: 64074, looktypeShiny: 74074 },
    { pokeId: 4075, dex: 75, nome: "Alolan Graveler", grupo: "alola", looktype: 64075, looktypeShiny: 74075 },
    { pokeId: 5077, dex: 77, nome: "Galarian Ponyta", grupo: "galar", looktype: 65077, looktypeShiny: 75077 },
    { pokeId: 5078, dex: 78, nome: "Galarian Rapidash", grupo: "galar", looktype: 65078, looktypeShiny: 75078 },
    { pokeId: 5079, dex: 79, nome: "Galarian Slowpoke", grupo: "galar", looktype: 65079, looktypeShiny: 75079 },
    { pokeId: 5080, dex: 80, nome: "Galarian Slowbro", grupo: "galar", looktype: 65080, looktypeShiny: 75080 },
    { pokeId: 5083, dex: 83, nome: "Galarian Farfetch'd", grupo: "galar", looktype: 65083, looktypeShiny: 75083 },
    { pokeId: 4088, dex: 88, nome: "Alolan Grimer", grupo: "alola", looktype: 64088, looktypeShiny: 74088 },
    { pokeId: 4089, dex: 89, nome: "Alolan Muk", grupo: "alola", looktype: 64089, looktypeShiny: 74089 },
    { pokeId: 6100, dex: 100, nome: "Hisuian Voltorb", grupo: "hisui", looktype: 66100, looktypeShiny: 76100 },
    { pokeId: 6101, dex: 101, nome: "Hisuian Electrode", grupo: "hisui", looktype: 66101, looktypeShiny: 76101 },
    { pokeId: 4103, dex: 103, nome: "Alolan Exeggutor", grupo: "alola", looktype: 64103, looktypeShiny: 74103 },
    { pokeId: 4105, dex: 105, nome: "Alolan Marowak", grupo: "alola", looktype: 64105, looktypeShiny: 74105 },
    { pokeId: 5110, dex: 110, nome: "Galarian Weezing", grupo: "galar", looktype: 65110, looktypeShiny: 75110 },
    { pokeId: 5122, dex: 122, nome: "Galarian Mr. Mime", grupo: "galar", looktype: 65122, looktypeShiny: 75122 },
    { pokeId: 7128, dex: 128, nome: "Paldean Tauros", grupo: "paldea", looktype: 67128, looktypeShiny: 77128 },
    { pokeId: 8128, dex: 128, nome: "Paldean Tauros Blaze", grupo: "forma", looktype: 68128, looktypeShiny: 78128 },
    { pokeId: 9128, dex: 128, nome: "Paldean Tauros Aqua", grupo: "forma", looktype: 69128, looktypeShiny: 79128 },
    { pokeId: 5144, dex: 144, nome: "Galarian Articuno", grupo: "galar", looktype: 65144, looktypeShiny: 75144 },
    { pokeId: 5145, dex: 145, nome: "Galarian Zapdos", grupo: "galar", looktype: 65145, looktypeShiny: 75145 },
    { pokeId: 5146, dex: 146, nome: "Galarian Moltres", grupo: "galar", looktype: 65146, looktypeShiny: 75146 },
    { pokeId: 6157, dex: 157, nome: "Hisuian Typhlosion", grupo: "hisui", looktype: 66157, looktypeShiny: 76157 },
    { pokeId: 7194, dex: 194, nome: "Paldean Wooper", grupo: "paldea", looktype: 67194, looktypeShiny: 77194 },
    { pokeId: 5199, dex: 199, nome: "Galarian Slowking", grupo: "galar", looktype: 65199, looktypeShiny: 75199 },
    { pokeId: 6211, dex: 211, nome: "Hisuian Qwilfish", grupo: "hisui", looktype: 66211, looktypeShiny: 76211 },
    { pokeId: 6215, dex: 215, nome: "Hisuian Sneasel", grupo: "hisui", looktype: 66215, looktypeShiny: 76215 },
    { pokeId: 5222, dex: 222, nome: "Galarian Corsola", grupo: "galar", looktype: 65222, looktypeShiny: 75222 },
    { pokeId: 5263, dex: 263, nome: "Galarian Zigzagoon", grupo: "galar", looktype: 65263, looktypeShiny: 75263 },
    { pokeId: 5264, dex: 264, nome: "Galarian Linoone", grupo: "galar", looktype: 65264, looktypeShiny: 75264 },
    { pokeId: 8351, dex: 351, nome: "Castform Rainy", grupo: "forma", looktype: 68351, looktypeShiny: 78351 },
    { pokeId: 9351, dex: 351, nome: "Castform Snowy", grupo: "forma", looktype: 69351, looktypeShiny: 79351 },
    { pokeId: 11351, dex: 351, nome: "Castform Sunny", grupo: "forma", looktype: 71351, looktypeShiny: 81351 },
    { pokeId: 8386, dex: 386, nome: "Deoxys Attack", grupo: "forma", looktype: 68386, looktypeShiny: 78386 },
    { pokeId: 9386, dex: 386, nome: "Deoxys Defense", grupo: "forma", looktype: 69386, looktypeShiny: 79386 },
    { pokeId: 11386, dex: 386, nome: "Deoxys Speed", grupo: "forma", looktype: 71386, looktypeShiny: 81386 },
    { pokeId: 8413, dex: 413, nome: "Wormadam Sandy", grupo: "forma", looktype: 68413, looktypeShiny: 78413 },
    { pokeId: 9413, dex: 413, nome: "Wormadam Trash", grupo: "forma", looktype: 69413, looktypeShiny: 79413 },
    { pokeId: 1479, dex: 479, nome: "Mow Rotom", grupo: "forma", looktype: 61479, looktypeShiny: 91479 },
    { pokeId: 8479, dex: 479, nome: "Heat Rotom", grupo: "forma", looktype: 68479, looktypeShiny: 78479 },
    { pokeId: 9479, dex: 479, nome: "Wash Rotom", grupo: "forma", looktype: 69479, looktypeShiny: 79479 },
    { pokeId: 11479, dex: 479, nome: "Frost Rotom", grupo: "forma", looktype: 71479, looktypeShiny: 81479 },
    { pokeId: 12479, dex: 479, nome: "Fan Rotom", grupo: "forma", looktype: 72479, looktypeShiny: 82479 },
    { pokeId: 8483, dex: 483, nome: "Dialga Origin", grupo: "forma", looktype: 68483, looktypeShiny: 78483 },
    { pokeId: 8484, dex: 484, nome: "Palkia Origin", grupo: "forma", looktype: 68484, looktypeShiny: 78484 },
    { pokeId: 8492, dex: 492, nome: "Shaymin Sky", grupo: "forma", looktype: 68492, looktypeShiny: 78492 },
    { pokeId: 6503, dex: 503, nome: "Hisuian Samurott", grupo: "hisui", looktype: 66503, looktypeShiny: 76503 },
    { pokeId: 6549, dex: 549, nome: "Hisuian Lilligant", grupo: "hisui", looktype: 66549, looktypeShiny: 76549 },
    { pokeId: 5554, dex: 554, nome: "Galarian Darumaka", grupo: "galar", looktype: 65554, looktypeShiny: 75554 },
    { pokeId: 5555, dex: 555, nome: "Galarian Darmanitan", grupo: "galar", looktype: 65555, looktypeShiny: 75555 },
    { pokeId: 8555, dex: 555, nome: "Darmanitan Zen", grupo: "forma", looktype: 68555, looktypeShiny: 78555 },
    { pokeId: 9555, dex: 555, nome: "Galarian Darmanitan Zen", grupo: "forma", looktype: 69555, looktypeShiny: 79555 },
    { pokeId: 5562, dex: 562, nome: "Galarian Yamask", grupo: "galar", looktype: 65562, looktypeShiny: 75562 },
    { pokeId: 6570, dex: 570, nome: "Hisuian Zorua", grupo: "hisui", looktype: 66570, looktypeShiny: 76570 },
    { pokeId: 6571, dex: 571, nome: "Hisuian Zoroark", grupo: "hisui", looktype: 66571, looktypeShiny: 76571 },
    { pokeId: 5618, dex: 618, nome: "Galarian Stunfisk", grupo: "galar", looktype: 65618, looktypeShiny: 75618 },
    { pokeId: 6628, dex: 628, nome: "Hisuian Braviary", grupo: "hisui", looktype: 66628, looktypeShiny: 76628 },
    { pokeId: 8641, dex: 641, nome: "Tornadus Therian", grupo: "forma", looktype: 68641, looktypeShiny: 78641 },
    { pokeId: 8642, dex: 642, nome: "Thundurus Therian", grupo: "forma", looktype: 68642, looktypeShiny: 78642 },
    { pokeId: 8645, dex: 645, nome: "Landorus Therian", grupo: "forma", looktype: 68645, looktypeShiny: 78645 },
    { pokeId: 8646, dex: 646, nome: "White Kyurem", grupo: "forma", looktype: 68646, looktypeShiny: 78646 },
    { pokeId: 9646, dex: 646, nome: "Black Kyurem", grupo: "forma", looktype: 69646, looktypeShiny: 79646 },
    { pokeId: 8647, dex: 647, nome: "Keldeo Resolute", grupo: "forma", looktype: 68647, looktypeShiny: 78647 },
    { pokeId: 8681, dex: 681, nome: "Aegislash Blade", grupo: "forma", looktype: 68681, looktypeShiny: 78681 },
    { pokeId: 6705, dex: 705, nome: "Hisuian Sliggoo", grupo: "hisui", looktype: 66705, looktypeShiny: 76705 },
    { pokeId: 6706, dex: 706, nome: "Hisuian Goodra", grupo: "hisui", looktype: 66706, looktypeShiny: 76706 },
    { pokeId: 6713, dex: 713, nome: "Hisuian Avalugg", grupo: "hisui", looktype: 66713, looktypeShiny: 76713 },
    { pokeId: 8718, dex: 718, nome: "Zygarde 10%", grupo: "forma", looktype: 68718, looktypeShiny: 78718 },
    { pokeId: 9718, dex: 718, nome: "Zygarde Complete", grupo: "forma", looktype: 69718, looktypeShiny: 79718 },
    { pokeId: 8720, dex: 720, nome: "Hoopa Unbound", grupo: "forma", looktype: 68720, looktypeShiny: 78720 },
    { pokeId: 6724, dex: 724, nome: "Hisuian Decidueye", grupo: "hisui", looktype: 66724, looktypeShiny: 76724 },
    { pokeId: 8741, dex: 741, nome: "Oricorio Pom-Pom", grupo: "forma", looktype: 68741, looktypeShiny: 78741 },
    { pokeId: 9741, dex: 741, nome: "Oricorio Pa'u", grupo: "forma", looktype: 69741, looktypeShiny: 79741 },
    { pokeId: 11741, dex: 741, nome: "Oricorio Sensu", grupo: "forma", looktype: 71741, looktypeShiny: 81741 },
    { pokeId: 8745, dex: 745, nome: "Lycanroc Midnight", grupo: "forma", looktype: 68745, looktypeShiny: 78745 },
    { pokeId: 9745, dex: 745, nome: "Lycanroc Dusk", grupo: "forma", looktype: 69745, looktypeShiny: 79745 },
    { pokeId: 8746, dex: 746, nome: "Wishiwashi School", grupo: "forma", looktype: 68746, looktypeShiny: 78746 },
    { pokeId: 8774, dex: 774, nome: "Minior Core", grupo: "forma", looktype: 68774, looktypeShiny: 78774 },
    { pokeId: 8888, dex: 888, nome: "Zacian Crowned", grupo: "forma", looktype: 68888, looktypeShiny: 78888 },
    { pokeId: 8889, dex: 889, nome: "Zamazenta Crowned", grupo: "forma", looktype: 68889, looktypeShiny: 78889 },
    { pokeId: 8901, dex: 901, nome: "Bloodmoon Ursaluna", grupo: "forma", looktype: 68901, looktypeShiny: 78901 },
    { pokeId: 8902, dex: 902, nome: "Basculegion Female", grupo: "forma", looktype: 68902, looktypeShiny: 78902 },
    { pokeId: 8905, dex: 905, nome: "Enamorus Therian", grupo: "forma", looktype: 68905, looktypeShiny: 78905 },
    { pokeId: 8964, dex: 964, nome: "Palafin Hero", grupo: "forma", looktype: 68964, looktypeShiny: 78964 }
  ];
  var FORMA_POR_POKEID = new Map(FORMAS.map((f) => [f.pokeId, f]));
  var dexBaseDaForma = (pokeId) => FORMA_POR_POKEID.get(Number(pokeId))?.dex ?? null;

  // tests/.cache/shared/mistico.mjs
  var CAPTURA_MISTICA_POR_BOLA = Object.freeze({
    1: 1e-3,
    // Poke Ball
    2: 2e-3,
    // Great Ball
    3: 3e-3,
    // Super Ball
    4: 4e-3,
    // Ultra Ball
    5: 5e-3
    // Beast Ball
  });
  var BOLAS_MISTICAS_DA_MELHOR = Object.freeze([5, 4, 3, 2, 1]);
  var LENDARIOS_KANTO_JOHTO = Object.freeze([144, 145, 146, 150, 243, 244, 245, 249, 250]);
  var MITICOS_KANTO_JOHTO = Object.freeze([151, 251]);
  var MITICOS_FORA_DO_FILTRO = Object.freeze([494]);
  var DEX_LENDARIO_OU_MITICO = /* @__PURE__ */ new Set([
    ...LENDARIOS_KANTO_JOHTO,
    ...MITICOS_KANTO_JOHTO,
    ...MITICOS_FORA_DO_FILTRO,
    ...LENDARIO_DEX,
    ...MITICO_DEX
  ]);
  var DEX_MITICO = /* @__PURE__ */ new Set([
    ...MITICOS_KANTO_JOHTO,
    ...MITICOS_FORA_DO_FILTRO,
    ...MITICO_DEX
  ]);
  var dexNacional = (id) => {
    if (id >= 13e3) return id % 1e3;
    if (isMegaPokeId(id)) return megaPorPokeId(id)?.dex ?? id - MEGA_POKE_BASE;
    return dexBaseDaForma(id) ?? id;
  };
  function ehLendarioOuMitico(pokeId) {
    const id = Number(pokeId);
    return Number.isInteger(id) && id > 0 && DEX_LENDARIO_OU_MITICO.has(dexNacional(id));
  }

  // tests/.cache/shared/nota-pokemon.mjs
  var IV_POR_STAT = { min: 1, max: 32 };
  var IV_STATS = 6;
  var IV_MIN = IV_STATS * IV_POR_STAT.min;
  var IV_MAX = IV_STATS * IV_POR_STAT.max;
  var BANDAS_QUALIDADE = [
    { min: 0.8, max: 0.9, chance: 5 },
    { min: 0.9, max: 1, chance: 5 },
    { min: 1, max: 1.1, chance: 34.03846 },
    { min: 1.1, max: 1.2, chance: 20 },
    { min: 1.2, max: 1.3, chance: 10 },
    { min: 1.3, max: 1.4, chance: 10 },
    { min: 1.4, max: 1.5, chance: 10 },
    { min: 1.5, max: 1.6, chance: 5 },
    { min: 1.7, max: 1.8, chance: 0.67308 },
    { min: 1.8, max: 1.8, chance: 0.28846 }
  ];
  var QUALIDADE_MIN = BANDAS_QUALIDADE[0].min;
  var QUALIDADE_MAX = BANDAS_QUALIDADE.at(-1).max;
  var EXPO_QUALIDADE = {
    hp: 0.95,
    atk: 0.8,
    def: 0.8,
    spAtk: 0.8,
    spDef: 0.8,
    speed: 0.95
  };
  var BONUS_POTENCIA = [0, 0.05, 0.1, 0.25, 1];
  var multPotencia = (n) => 1 + (BONUS_POTENCIA[(Math.round(n) || 1) - 1] ?? 0);
  var MULT_SHINY_STATS = 3;
  var MULT_LENDARIO_STATS = 4;
  var multDeNascenca = (potencia, shiny, lendario = false) => multPotencia(potencia) * (shiny ? MULT_SHINY_STATS : 1) * (lendario ? MULT_LENDARIO_STATS : 1);

  // tests/.cache/shared/tm-elemental.mjs
  var TM_ELEMENTAL_POWER = 2800;
  var TM_ELEMENTAL_CD_MS = 6e4;
  var golpeTmElemental = (tipo, fisico = false) => ({
    name: `Z-Move ${tipo}`,
    power: TM_ELEMENTAL_POWER,
    type: tipo,
    category: fisico === true ? "PHYSICAL" : "SPECIAL",
    cooldownMs: TM_ELEMENTAL_CD_MS,
    tmElemental: true
  });
  var ZMOVE_TROCA_COOLDOWN_MS = 5 * 6e4;

  // tests/.cache/shared/ginasios.mjs
  var TIPOS_GINASIO = [
    "NORMAL",
    "FIRE",
    "WATER",
    "GRASS",
    "ELECTRIC",
    "ICE",
    "FIGHTING",
    "POISON",
    "GROUND",
    "FLYING",
    "PSYCHIC",
    "BUG",
    "ROCK",
    "GHOST",
    "DRAGON",
    "DARK",
    "STEEL",
    "FAIRY"
  ];
  var TIPOS_VALIDOS = new Set(TIPOS_GINASIO);
  var iconeDoGinasio = (tipo) => `/img/tipos/${String(tipo).toLowerCase()}.svg`;
  var GINASIO_TIME_MAX = 5;
  var ARENA_NIVEL_CHEIO = 150;
  var ARENA_EXPO_GINASIO = 0.45;
  var ARENA_EXPO_GUERRA = 0.2;
  var GINASIO_NIVEL_MIN = 150;
  var GINASIO_BUFF_PODIO_PCT = Object.freeze([25, 10, 5]);
  var GINASIO_BUFF_PCT = GINASIO_BUFF_PODIO_PCT[0];
  var GINASIO_BUFF_MULT = 1 + GINASIO_BUFF_PCT / 100;
  function segundoETerceiro(times, liderId) {
    const resto = (times ?? []).filter((t) => Number(t.playerId) !== Number(liderId));
    return { segundoId: resto[0]?.playerId ?? null, terceiroId: resto[1]?.playerId ?? null };
  }
  var pctDoLugarGinasio = (lugar) => GINASIO_BUFF_PODIO_PCT[Math.floor(Number(lugar)) - 1] ?? 0;
  var multDoLugarGinasio = (lugar) => 1 + pctDoLugarGinasio(lugar) / 100;
  var GINASIO_DESAFIO_COOLDOWN_MS = 24 * 60 * 60 * 1e3;
  var SLUG_ARENA_GINASIO = "ginasio-duelo";
  function tipoDeGinasio(bruto) {
    const t = String(bruto ?? "").toUpperCase();
    return TIPOS_VALIDOS.has(t) ? t : null;
  }
  var pokemonDoTipo = (tipos, tipo) => (tipos ?? []).some((x) => String(x).toUpperCase() === String(tipo).toUpperCase());
  function nivelDeArena(level, expoente) {
    const n = Math.max(1, Math.floor(Number(level) || 1));
    if (n <= ARENA_NIVEL_CHEIO) return n;
    return Math.max(
      ARENA_NIVEL_CHEIO,
      Math.round(ARENA_NIVEL_CHEIO * (n / ARENA_NIVEL_CHEIO) ** expoente)
    );
  }
  var nivelNoGinasio = (level) => nivelDeArena(level, ARENA_EXPO_GINASIO);
  var nivelNaGuerra = (level) => nivelDeArena(level, ARENA_EXPO_GUERRA);
  var hpDeCombateGinasio = (hp) => Math.max(24, Math.round(hp * 12));
  function statsNoNivel(pk, esp, nivelBruto) {
    if (!esp || !pk?.ivs) return null;
    const nivel = Math.max(1, Math.floor(Number(nivelBruto) || 1));
    const mult = multDeNascenca(pk.potencia, pk.shiny, ehLendarioOuMitico(esp?.pokeId));
    const b = basesComRefino(esp, pk.refino);
    const um = (base, iv, k) => Math.round((base + 2 * (iv ?? 1)) * (nivel / 100) * (Math.pow(Number(pk.quality ?? pk.qualidade) || 1, EXPO_QUALIDADE[k]) * mult));
    return {
      hp: um(b.hp, pk.ivs.hp, "hp"),
      atk: um(b.atk, pk.ivs.atk, "atk"),
      def: um(b.def, pk.ivs.def, "def"),
      spAtk: um(b.spAtk, pk.ivs.spAtk, "spAtk"),
      spDef: um(b.spDef, pk.ivs.spDef, "spDef"),
      speed: um(b.speed, pk.ivs.speed, "speed")
    };
  }
  function statsNoGinasio(pk, esp) {
    return statsNoNivel(pk, esp, nivelNoGinasio(pk?.level));
  }
  var GOLPE_BASICO = { power: 30, cooldownMs: 2e3, category: "PHYSICAL" };
  function notaGolpeGinasio(g, nivel, stats, tipos) {
    const atk = g.category === "SPECIAL" ? stats.spAtk : stats.atk;
    const def = g.category === "SPECIAL" ? stats.spDef : stats.def;
    const stab = tipos.includes(g.type) ? 1.5 : 1;
    const base = (2 * nivel / 5 + 2) * (g.power ?? 0) * (atk / Math.max(1, def)) / 50 + 2;
    return base * stab;
  }
  function melhorGolpeDoGinasio(esp, nivel, stats = null, tmElemental = null, tmFisico = false) {
    const golpes = (esp?.attacks ?? []).filter((a) => (a.learnLevel ?? 1) <= nivel);
    if (tmElemental) golpes.push(golpeTmElemental(tmElemental, tmFisico));
    if (!golpes.length) return GOLPE_BASICO;
    if (stats) {
      const tipos = [esp.type1, esp.type2].filter(Boolean);
      let melhor2 = GOLPE_BASICO;
      let melhorNota = -1;
      for (const g of golpes) {
        const nota2 = notaGolpeGinasio(g, nivel, stats, tipos);
        if (nota2 > melhorNota) {
          melhorNota = nota2;
          melhor2 = g;
        }
      }
      return melhor2;
    }
    let melhor = GOLPE_BASICO;
    let nota = GOLPE_BASICO.power / GOLPE_BASICO.cooldownMs;
    for (const a of golpes) {
      const n = (a.power ?? 0) / Math.max(1, a.cooldownMs ?? 1e4);
      if (n > nota) {
        nota = n;
        melhor = a;
      }
    }
    return melhor;
  }
  function ratingDeCombate(pk, esp) {
    return ratingNoNivel(pk, esp, nivelNoGinasio(pk?.level));
  }
  var poderNoNivel = (pk, esp, nivel) => esp ? Math.max(1, Math.round(ratingNoNivel(pk, esp, nivel) / GINASIO_ESCALA_FORCA)) : 1;
  function ratingNoNivel(pk, esp, nivelBruto) {
    const st = statsNoNivel(pk, esp, nivelBruto);
    if (!st) return 0;
    const nivel = Math.max(1, Math.floor(Number(nivelBruto) || 1));
    const g = melhorGolpeDoGinasio(esp, nivel, st, pk.tmElemental, pk.tmFisico);
    const atk = Math.max(st.atk, st.spAtk);
    const def = (st.def + st.spDef) / 2;
    const dps = (2 * nivel / 5 + 2) * (g.power ?? GOLPE_BASICO.power) * atk / 50 / (Math.max(400, g.cooldownMs ?? GOLPE_BASICO.cooldownMs) / 1e3);
    return dps * hpDeCombateGinasio(st.hp) * def;
  }
  var VARIACAO_DANO_MIN = 0.85;
  var VARIACAO_DANO_MAX = 1;
  function metricasDeCombate(pk, esp) {
    const st = statsNoGinasio(pk, esp);
    if (!st) return null;
    const nivel = nivelNoGinasio(pk.level);
    const g = melhorGolpeDoGinasio(esp, nivel, st, pk.tmElemental, pk.tmFisico);
    const atk = Math.max(st.atk, st.spAtk);
    const def = (st.def + st.spDef) / 2;
    const dps = (2 * nivel / 5 + 2) * (g.power ?? GOLPE_BASICO.power) * atk / 50 / (Math.max(400, g.cooldownMs ?? GOLPE_BASICO.cooldownMs) / 1e3);
    const ehp = hpDeCombateGinasio(st.hp);
    const rating = dps * ehp * def;
    return {
      dps,
      ehp,
      def,
      rating,
      golpe: g,
      stats: st,
      nivel,
      nivelReal: Math.max(1, Math.floor(Number(pk.level) || 1)),
      tm: pk.tmElemental ?? null,
      golpeDaTm: !!g.tmElemental
    };
  }
  var tiposDeEspecie = (esp) => [esp?.type1, esp?.type2].filter(Boolean);
  function basicoContra(tipos, tiposDefensor, tabela) {
    for (const tipo of tipos.length ? tipos : ["NORMAL"]) {
      if (efetividade(tipo, tiposDefensor[0], tiposDefensor[1], tabela) > 0) {
        return { ...GOLPE_BASICO, type: tipo };
      }
    }
    return null;
  }
  function notaGolpeComMatchup(g, nivel, stats, tiposAtacante, tiposDefensor, defStats, tabela) {
    const ef = efetividade(g.type, tiposDefensor[0], tiposDefensor[1], tabela);
    if (ef === 0) return -1;
    const stab = tiposAtacante.includes(g.type) ? 1.5 : 1;
    const atk = g.category === "SPECIAL" ? stats.spAtk : stats.atk;
    const def = defStats ? g.category === "SPECIAL" ? defStats.spDef : defStats.def : atk;
    const base = (2 * nivel / 5 + 2) * (g.power ?? 0) * (atk / Math.max(1, def)) / 50 + 2;
    return base * stab * ef;
  }
  function melhorGolpeContra(esp, nivel, stats, tiposDefensor, defStats, tabela, tmElemental = null, tmFisico = false) {
    const tipos = tiposDeEspecie(esp);
    const golpes = (esp?.attacks ?? []).filter((a) => (a.learnLevel ?? 1) <= nivel);
    if (tmElemental) golpes.push(golpeTmElemental(tmElemental, tmFisico));
    let melhor = null;
    let melhorNota = -1;
    for (const g of golpes) {
      const nota = notaGolpeComMatchup(g, nivel, stats, tipos, tiposDefensor, defStats, tabela);
      if (nota > melhorNota) {
        melhorNota = nota;
        melhor = g;
      }
    }
    if (melhor) return melhor;
    return basicoContra(tipos, tiposDefensor, tabela) ?? GOLPE_BASICO;
  }
  function metricasDeCombateContra(pk, esp, pkOpp, espOpp, tabela) {
    const st = statsNoGinasio(pk, esp);
    const stOpp = statsNoGinasio(pkOpp, espOpp);
    if (!st || !stOpp) return null;
    const nivel = nivelNoGinasio(pk.level);
    const tiposDef = tiposDeEspecie(espOpp);
    const tiposAtq = tiposDeEspecie(esp);
    const g = melhorGolpeContra(esp, nivel, st, tiposDef, stOpp, tabela, pk.tmElemental, pk.tmFisico);
    const atk = g.category === "SPECIAL" ? st.spAtk : st.atk;
    const defOpp = g.category === "SPECIAL" ? stOpp.spDef : stOpp.def;
    const ef = efetividade(g.type, tiposDef[0], tiposDef[1], tabela);
    const stab = tiposAtq.includes(g.type) ? 1.5 : 1;
    const base = (2 * nivel / 5 + 2) * (g.power ?? GOLPE_BASICO.power) * atk / Math.max(1, defOpp) / 50 + 2;
    const dano = base * stab * Math.max(0, ef);
    const cd = Math.max(400, g.cooldownMs ?? GOLPE_BASICO.cooldownMs) / 1e3;
    const dps = dano / cd;
    const ehp = hpDeCombateGinasio(st.hp);
    const defTank = (st.def + st.spDef) / 2;
    const rating = dps * ehp * defTank;
    return {
      dps,
      ehp,
      def: defTank,
      rating,
      golpe: g,
      stats: st,
      nivel,
      nivelReal: Math.max(1, Math.floor(Number(pk.level) || 1)),
      ef,
      stab: stab > 1,
      // `tm` é o TIPO do disco que o bicho tem; `golpeDaTm` diz se foi ELE que a conta usou.
      // São coisas diferentes na tela: ter a TM e não usá-la contra aquele oponente é
      // informação, não detalhe.
      tm: pk.tmElemental ?? null,
      golpeDaTm: !!g.tmElemental
    };
  }
  function rngDeterministico(seed) {
    let s = seed >>> 0;
    return () => {
      s = Math.imul(s, 1664525) + 1013904223 >>> 0;
      return s / 4294967296;
    };
  }
  function compararDuelo1v1(pkA, espA, pkB, espB, { amostras = 400, tabelaTipos = null } = {}) {
    const usaTipos = tabelaTipos && Object.keys(tabelaTipos).length > 0;
    const mA = usaTipos ? metricasDeCombateContra(pkA, espA, pkB, espB, tabelaTipos) : metricasDeCombate(pkA, espA);
    const mB = usaTipos ? metricasDeCombateContra(pkB, espB, pkA, espA, tabelaTipos) : metricasDeCombate(pkB, espB);
    if (!mA || !mB) return null;
    const scoreA = (mA2, v) => usaTipos ? mA2.dps * v * mA2.ehp : mA2.dps * v * mA2.ehp * mA2.def;
    const scoreB = (mB2, v) => usaTipos ? mB2.dps * v * mB2.ehp : mB2.dps * v * mB2.ehp * mB2.def;
    const rAmin = scoreA(mA, VARIACAO_DANO_MIN);
    const rAmax = scoreA(mA, VARIACAO_DANO_MAX);
    const rBmin = scoreB(mB, VARIACAO_DANO_MIN);
    const rBmax = scoreB(mB, VARIACAO_DANO_MAX);
    const baseA = scoreA(mA, 1);
    const baseB = scoreB(mB, 1);
    const espelho = Math.abs(baseA - baseB) / Math.max(baseA, baseB, 1) < 1e-6;
    let pctA;
    let pctB;
    if (espelho) {
      pctA = 0.5;
      pctB = 0.5;
    } else {
      const seed = (pkA.speciesId ?? 0) * 997 + (pkB.speciesId ?? 0) * 991 + Math.round(mA.rating) + Math.round(mB.rating * 3) >>> 0;
      const rnd = rngDeterministico(seed);
      let vitA = 0;
      for (let i = 0; i < amostras; i++) {
        const vA = VARIACAO_DANO_MIN + rnd() * (VARIACAO_DANO_MAX - VARIACAO_DANO_MIN);
        const vB = VARIACAO_DANO_MIN + rnd() * (VARIACAO_DANO_MAX - VARIACAO_DANO_MIN);
        const rA = scoreA(mA, vA);
        const rB = scoreB(mB, vB);
        if (rA > rB) vitA++;
        else if (rA === rB) vitA += 0.5;
      }
      pctA = vitA / amostras;
      pctB = 1 - pctA;
    }
    let pctMinA = pctA;
    let pctMaxA = pctA;
    if (rAmin > rBmax) {
      pctMinA = 1;
      pctMaxA = 1;
    } else if (rAmax < rBmin) {
      pctMinA = 0;
      pctMaxA = 0;
    } else {
      pctMinA = Math.min(pctA, rAmin / (rAmin + rBmax));
      pctMaxA = Math.max(pctA, rAmax / (rAmax + rBmin));
    }
    const favorito = mA.rating >= mB.rating ? "a" : "b";
    return {
      a: mA,
      b: mB,
      poderA: Math.max(1, Math.round(mA.rating / GINASIO_ESCALA_FORCA)),
      poderB: Math.max(1, Math.round(mB.rating / GINASIO_ESCALA_FORCA)),
      pctA,
      pctB,
      pctMinA: Math.max(0, Math.min(1, pctMinA)),
      pctMaxA: Math.max(0, Math.min(1, pctMaxA)),
      favorito,
      empate: espelho || Math.abs(mA.rating - mB.rating) / Math.max(mA.rating, mB.rating, 1) < 0.015
    };
  }
  var GINASIO_ESCALA_FORCA = 1e7;
  var poderNoGinasio = (pk, esp = null) => esp ? Math.max(1, Math.round(ratingDeCombate(pk, esp) / GINASIO_ESCALA_FORCA)) : 1;
  var poderDoTimeGinasio = (pokemons, esps = null) => (pokemons ?? []).reduce(
    (s, pk) => s + poderNoGinasio(pk, esps?.get?.(pk?.speciesId) ?? null),
    0
  );
  function motivoForaDoGinasio(pk, tipo, escolhidos = []) {
    if (!pk) return "sumiu";
    if (!pokemonDoTipo(pk.tipos, tipo)) return "tipo";
    if (escolhidos.some((o) => o && o.id !== pk.id && o.speciesId === pk.speciesId)) return "especie";
    if (escolhidos.some((o) => o && o.id === pk.id)) return "repetido";
    if (escolhidos.length >= GINASIO_TIME_MAX) return "cheio";
    return null;
  }
  function timeValidoDoGinasio(pokemons, tipo) {
    const ok = [];
    for (const pk of pokemons ?? []) {
      if (!motivoForaDoGinasio(pk, tipo, ok)) ok.push(pk);
    }
    return ok;
  }
  function validarTimeGinasio(pokemons, tipo) {
    if (!tipoDeGinasio(tipo)) return { ok: false, motivo: "tipo" };
    const lista = pokemons ?? [];
    if (lista.length > GINASIO_TIME_MAX) return { ok: false, motivo: "cheio" };
    const ok = [];
    for (const pk of lista) {
      const motivo = motivoForaDoGinasio(pk, tipo, ok);
      if (motivo) return { ok: false, motivo };
      ok.push(pk);
    }
    return { ok: true, motivo: null };
  }
  function lugarNoTipo(podio, tipo) {
    if (podio instanceof Map) return podio.get(tipo);
    if (podio instanceof Set) return podio.has(tipo) ? 1 : void 0;
    if (Array.isArray(podio)) return podio.includes(tipo) ? 1 : void 0;
    return podio[tipo];
  }
  function buffGinasioDoPokemon(tiposPokemon, podio) {
    if (!podio || !tiposPokemon?.length) return null;
    let melhor = 0;
    for (const tipo of tiposPokemon) {
      const lugar = Math.floor(Number(lugarNoTipo(podio, String(tipo).toUpperCase())) || 0);
      if (pctDoLugarGinasio(lugar) > 0 && (!melhor || lugar < melhor)) melhor = lugar;
    }
    return melhor ? { lugar: melhor, pct: pctDoLugarGinasio(melhor) } : null;
  }
  function multBuffGinasio(tiposPokemon, podio) {
    const b = buffGinasioDoPokemon(tiposPokemon, podio);
    return b ? multDoLugarGinasio(b.lugar) : 1;
  }

  // tests/.cache/shared/dia-sazonal.mjs
  var dia_sazonal_exports = {};
  __export(dia_sazonal_exports, {
    ANTECIPACAO_SAZONAL_MS: () => ANTECIPACAO_SAZONAL_MS,
    MULT_SAZONAL: () => MULT_SAZONAL,
    TIPOS_SAZONAIS: () => TIPOS_SAZONAIS,
    chaveDoDiaSazonal: () => chaveDoDiaSazonal,
    danoSazonal: () => danoSazonal,
    ehDoTipoSazonal: () => ehDoTipoSazonal,
    fimDoDiaSazonal: () => fimDoDiaSazonal,
    inicioDoDiaSazonal: () => inicioDoDiaSazonal,
    multDanoSazonal: () => multDanoSazonal
  });

  // tests/.cache/shared/fuso-brasilia.mjs
  var FUSO_BRASILIA_MS = 3 * 60 * 6e4;

  // tests/.cache/shared/dia-sazonal.mjs
  var TIPOS_SAZONAIS = Object.freeze([
    "NORMAL",
    "FIRE",
    "WATER",
    "GRASS",
    "ELECTRIC",
    "ICE",
    "FIGHTING",
    "POISON",
    "GROUND",
    "FLYING",
    "PSYCHIC",
    "BUG",
    "ROCK",
    "GHOST",
    "DRAGON",
    "DARK",
    "STEEL",
    "FAIRY"
  ]);
  var MULT_SAZONAL = 2;
  var DIA_MS = 864e5;
  var ANTECIPACAO_SAZONAL_MS = 6 * 36e5;
  var DESLOCAMENTO_MS = FUSO_BRASILIA_MS - ANTECIPACAO_SAZONAL_MS;
  var chaveDoDiaSazonal = (t) => new Date(Number(t) - DESLOCAMENTO_MS).toISOString().slice(0, 10);
  var inicioDoDiaSazonal = (t) => Math.floor((Number(t) - DESLOCAMENTO_MS) / DIA_MS) * DIA_MS + DESLOCAMENTO_MS;
  var fimDoDiaSazonal = (t) => inicioDoDiaSazonal(t) + DIA_MS;
  var ehDoTipoSazonal = (tipos, tipo) => !!tipo && Array.isArray(tipos) && tipos.includes(tipo);
  function multDanoSazonal(tipo, tiposAtacante, tiposDefensor) {
    if (!tipo) return 1;
    const ataca = ehDoTipoSazonal(tiposAtacante, tipo) ? MULT_SAZONAL : 1;
    const apanha = ehDoTipoSazonal(tiposDefensor, tipo) ? MULT_SAZONAL * MULT_SAZONAL : 1;
    return ataca / apanha;
  }
  var danoSazonal = (dano, mult) => mult === 1 ? dano : Math.max(dano > 0 ? 1 : 0, Math.round(dano * mult));

  // tests/.cache/shared/estado-delta.mjs
  function criarMescladorDeEstado() {
    let campos = null;
    let pokemons = /* @__PURE__ */ new Map();
    return function mesclar(parcial) {
      if (!parcial) return campos ? montar() : null;
      const { cheio, pokemons: lista, pkMud, pkFora, dexMud, dexFora, ...resto } = parcial;
      if (cheio || !campos) {
        campos = resto;
        pokemons = new Map((lista ?? []).map((k) => [k.id, k]));
        return montar();
      }
      Object.assign(campos, resto);
      if (lista) pokemons = new Map(lista.map((k) => [k.id, k]));
      for (const k of pkMud ?? []) pokemons.set(k.id, k);
      for (const id of pkFora ?? []) pokemons.delete(id);
      if (dexMud || dexFora) {
        campos.pokedex = { ...campos.pokedex ?? {}, ...dexMud ?? {} };
        for (const chave of dexFora ?? []) delete campos.pokedex[chave];
      }
      return montar();
    };
    function montar() {
      return { ...campos, pokemons: [...pokemons.values()] };
    }
  }

  // <stdin>
  var mod = { cooldown: cooldown_golpes_exports, especiais: golpes_especiais_exports, planilhas: golpes_planilhas_exports, outland: outland_exports, baseOutland: herdar_base_outland_exports, golpesOrre: herdar_golpes_orre_exports, megas: megas_exports, evolucoes: evolucoes_cruzadas_exports, recompensa: recompensa_hunt_exports, ajustes: ajustes_especie_espelho_exports, analyser: hunt_analyser_exports, ginasios: ginasios_exports, sazonal: dia_sazonal_exports };
  (globalThis.__pokeidleHunt ?? (globalThis.__pokeidleHunt = {})).definirModulosDoJogo?.(mod, criarMescladorDeEstado);
})();


// === hook.js ===
// Escuta o WebSocket do jogo sem mexer em nada.
//
// Roda no contexto da página (world MAIN), antes do cliente do jogo abrir o socket. Só
// acrescenta um ouvinte de mensagem: nada é enviado, nada é alterado, o jogo continua
// recebendo exatamente o que recebia. O que chega é repassado ao barramento da extensão
// (`PIH.on`), que as outras partes (catálogo, geometria, tela) assinam.
(function (root) {
  'use strict';
  const PIH = (root.__pokeidleHunt ??= {});
  if (PIH.hookInstalado) return;
  PIH.hookInstalado = true;

  // ---- barramento de eventos -------------------------------------------------------------
  const ouvintes = new Map();
  // O último de cada tipo fica guardado: quem assina depois (a tela carrega mais tarde que o
  // welcome, às vezes) recebe na hora em vez de esperar o próximo.
  const ultimo = new Map();
  const RETIDOS = new Set(['welcome', 'estado']);

  PIH.on = (tipo, fn) => {
    if (!ouvintes.has(tipo)) ouvintes.set(tipo, new Set());
    ouvintes.get(tipo).add(fn);
    if (ultimo.has(tipo)) {
      try { fn(ultimo.get(tipo)); } catch (err) { console.error('[pokeidle-hunt]', err); }
    }
    return () => ouvintes.get(tipo)?.delete(fn);
  };
  PIH.emit = (tipo, dado) => {
    if (RETIDOS.has(tipo)) ultimo.set(tipo, dado);
    for (const fn of ouvintes.get(tipo) ?? []) {
      try { fn(dado); } catch (err) { console.error('[pokeidle-hunt]', err); }
    }
  };

  // ---- o estado chega em delta ------------------------------------------------------------
  // O jogo manda o quadro inteiro no welcome e depois só o que mudou. A remontagem é a do
  // próprio jogo (`shared/estado-delta.mjs`), importada ao vivo; até ela chegar, os pacotes
  // ficam na fila para não perder nenhum delta.
  let mesclar = null;
  const fila = [];
  // A remontagem do estado (`shared/estado-delta.mjs`) vem embutida pelo boot.js, não de um import
  // remoto. Até os módulos chegarem, os pacotes ficam na fila para não perder nenhum delta.
  PIH.jogoPronto
    .then(() => {
      mesclar = PIH.criarMescladorDeEstado();
      for (const parcial of fila.splice(0)) entregarEstado(parcial);
    })
    .catch((err) => console.error('[pokeidle-hunt] estado-delta indisponível', err));

  function entregarEstado(parcial) {
    if (!mesclar) { fila.push(parcial); return; }
    const eu = mesclar(parcial);
    if (eu) PIH.emit('estado', eu);
  }

  function aoReceber(ev) {
    if (typeof ev.data !== 'string') return;
    // Só interessam quatro tipos; os pacotes `campo` são os mais frequentes (vários por
    // segundo) e são pequenos. Tudo o mais passa direto sem parse.
    const cab = ev.data.slice(0, 40);
    let tipo = null;
    if (cab.includes('"t":"welcome"')) tipo = 'welcome';
    else if (cab.includes('"t":"estado"')) tipo = 'estado';
    else if (cab.includes('"t":"campo.init"')) tipo = 'campo.init';
    else if (cab.includes('"t":"campo"')) tipo = 'campo';
    if (!tipo) return;
    let m;
    try { m = JSON.parse(ev.data); } catch { return; }
    if (tipo === 'welcome') {
      // O estado do welcome é o quadro completo (`cheio`): zera o mesclador antes.
      PIH.emit('welcome', m);
      if (m.estado) entregarEstado({ ...m.estado, cheio: true });
    } else if (tipo === 'estado') {
      if (m.estado) entregarEstado(m.estado);
    } else {
      PIH.emit(tipo, m);
    }
  }

  // ---- o socket ---------------------------------------------------------------------------
  const Original = root.WebSocket;
  function WebSocketObservado(...args) {
    const ws = new Original(...args);
    try {
      const alvo = new URL(String(args[0]), location.href);
      if (alvo.host === location.host) ws.addEventListener('message', aoReceber);
    } catch { /* URL estranha: não é o socket do jogo */ }
    return ws;
  }
  WebSocketObservado.prototype = Original.prototype;
  for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) WebSocketObservado[k] = Original[k];
  root.WebSocket = WebSocketObservado;
})(globalThis);


// === game.js ===
// Tudo o que vem do jogo, sempre da versão no ar.
//
// Nada de tabela copiada: as fórmulas são os próprios módulos `shared/` do pokeidle.io,
// importados da página, e o catálogo de espécies é remontado a partir dos mesmos JSONs e na
// mesma ordem que o cliente oficial usa (`carregarCatalogoEspecies` no app.js deles). Quando
// o jogo muda um golpe, um cooldown ou uma curva de XP, a extensão muda junto no próximo F5.
(function (root) {
  'use strict';
  const PIH = (root.__pokeidleHunt ??= {});

  const SEM_CACHE = { cache: 'no-cache' };
  const url = (caminho) => `${location.origin}/${caminho}`;
  const json = (caminho, opcional = false) =>
    fetch(url(caminho), SEM_CACHE).then((r) => {
      if (r.ok) return r.json();
      if (opcional) return null;
      throw new Error(`${caminho}: HTTP ${r.status}`);
    }).catch((err) => { if (opcional) return null; throw err; });

  /** A versão do cliente, lida da folha de estilo (`estilo.css?v=1.233.0`). */
  PIH.versaoDoJogo = () => {
    const link = document.querySelector('link[href*="estilo.css?v="]');
    return link?.getAttribute('href')?.split('v=')[1] ?? null;
  };

  /** Os módulos do jogo que a extensão usa — a mesma lista serve aos testes (scripts/). */
  const MODULOS = {
    cooldown: 'shared/cooldown-golpes.mjs',
    especiais: 'shared/golpes-especiais.mjs',
    planilhas: 'shared/golpes-planilhas.mjs',
    outland: 'shared/outland.mjs',
    baseOutland: 'shared/herdar-base-outland.mjs',
    golpesOrre: 'shared/herdar-golpes-orre.mjs',
    megas: 'shared/megas.mjs',
    evolucoes: 'shared/evolucoes-cruzadas.mjs',
    recompensa: 'shared/recompensa-hunt.mjs',
    ajustes: 'shared/ajustes-especie-espelho.mjs',
    analyser: 'hunt-analyser.mjs',
    // O pódio dos ginásios (+25/10/5% de dano na hunt, jogo 1.377.0): a regra é a do jogo.
    ginasios: 'shared/ginasios.mjs',
    // O dia sazonal (desde 20/10/2026): a tipagem do dia fica 2× mais forte nas hunts do Mapa.
    sazonal: 'shared/dia-sazonal.mjs',
  };
  const CATALOGOS = {
    cr: 'assets/creatures.json',
    novos: 'assets/creatures-novos.json',
    outlandNovos: 'assets/creatures-outland-novos.json',
    formas: 'assets/creatures-formas.json',
    overrides: 'assets/creatures-audit-overrides.json',
  };
  PIH.MODULOS_DO_JOGO = MODULOS;
  PIH.CATALOGOS_DO_JOGO = CATALOGOS;

  // Os módulos do jogo vêm do pacote (jogo-bundle.js) ou do carregador do userscript, via boot.js —
  // nunca de um import remoto, que o Manifest V3 proíbe. Os catálogos (JSON) seguem buscados ao vivo.
  const carregarModulos = () => PIH.jogoPronto;

  /**
   * O catálogo de espécies como o cliente monta — só os passos que mexem em combate:
   * stats-base, tipos e golpes. Evolução, teto de captura e valor de mercado ficam de fora.
   */
  function montarCatalogo(mod, fontes) {
    const { cr, novos, outlandNovos, formas, overrides } = fontes;
    const lista = [...(cr?.creatures ?? [])];
    if (novos?.creatures?.length) lista.push(...novos.creatures);
    if (outlandNovos?.creatures?.length) lista.push(...outlandNovos.creatures);
    // As formas (Heat Rotom, Castform Rainy, Alolan…) têm ficha própria e hunts próprias desde a
    // 1.31x; entram na mesma lista e no mesmo ponto do cliente, antes do remap e das planilhas.
    if (formas?.creatures?.length) lista.push(...formas.creatures);
    mod.outland.aplicarRemapOutlandLista(lista);

    for (const o of overrides?.overrides ?? []) {
      const c = lista.find((x) => x.pokeId === o.pokeId);
      if (!c) continue;
      for (const k of ['baseHp', 'baseAtk', 'baseDef', 'baseSpAtk', 'baseSpDef', 'baseSpeed']) {
        if (typeof o[k] === 'number') c[k] = o[k];
      }
      if (Array.isArray(o.attacks)) c.attacks = o.attacks.map((a) => ({ ...a }));
    }

    mod.planilhas.aplicarGolpesDasPlanilhas((id) => lista.filter((c) => c.pokeId === id));
    mod.baseOutland.herdarBaseOutland(lista);
    // Cadeias truncadas antes da injeção dos golpes de 600: é o que tira o ultimate de quem
    // deixou de ser última evolução (Vigoroth, Shelgon), igual ao servidor.
    mod.evolucoes.aplicarCadeiasTruncadas(lista);
    mod.evolucoes.normalizarEvolveLevel600(lista);
    // Os ajustes de huntLevel por cima do espelho (Rhydon, Lucario, Smeargle…) mudam o XP e o
    // ouro por abate dessas espécies: o cliente aplica aqui, nós também.
    mod.ajustes?.aplicarAjustesHuntLevel?.((id) => lista.find((c) => c.pokeId === id));

    const especies = new Map();
    for (const c of lista) {
      if (mod.outland.isEspelhoFantasmaPokeId(c.pokeId)) continue;
      mod.especiais.injetarGolpesEspeciais(c);
      especies.set(c.pokeId, c);
    }
    mod.golpesOrre.herdarGolpesOrre(lista);
    for (const mega of mod.megas.criarEspeciesMega(lista)) especies.set(mega.pokeId, mega);
    return especies;
  }

  // Para os testes montarem o mesmo catálogo fora do navegador.
  PIH._montarCatalogo = montarCatalogo;

  let promessa = null;
  /** Carrega uma vez por página; as chamadas seguintes recebem o mesmo resultado. */
  PIH.carregarJogo = () => (promessa ??= (async () => {
    const inicio = performance.now();
    const [mod, cr, novos, outlandNovos, formas, overrides] = await Promise.all([
      carregarModulos(),
      json(CATALOGOS.cr),
      json(CATALOGOS.novos, true),
      json(CATALOGOS.outlandNovos, true),
      json(CATALOGOS.formas, true),
      json(CATALOGOS.overrides, true),
    ]);
    const especies = montarCatalogo(mod, { cr, novos, outlandNovos, formas, overrides });
    return {
      mod,
      especies,
      versao: PIH.versaoDoJogo(),
      msCarga: Math.round(performance.now() - inicio),
    };
  })().catch((err) => { promessa = null; throw err; }));
})(globalThis);


// === ritmo.js ===
// GERADO por scripts/exportar-ritmo-mapas.mjs — NÃO EDITAR. O ritmo das hunts medido em jogo, mapa por mapa.
(globalThis.__pokeidleHunt ??= {}).ritmo = {"_origem":"pokeidle-hunt/scripts/exportar-ritmo-mapas.mjs — telemetria do PokeIdle Launcher","versoesDoJogo":["1.380.2"],"geradoEm":"2026-10-29","diaSazonal":"ELECTRIC","faixa":{"p10":2.96,"mediana":3.35,"p90":3.61},"mapas":{"aipom":{"s":3.31,"medidas":1,"ondas":5},"alakazam":{"s":2.42,"medidas":6,"ondas":30},"ancient_dragonair":{"s":3.35,"medidas":1,"ondas":5},"ancient_granbull":{"s":3.37,"medidas":1,"ondas":5},"ancient_hypno":{"s":3.03,"medidas":1,"ondas":5},"ancient_marowak":{"s":3.45,"medidas":1,"ondas":5},"ancient_meganium":{"s":3.29,"medidas":1,"ondas":5},"ancient_pinsir":{"s":3.64,"medidas":1,"ondas":5},"ancient_pupitar":{"s":3.29,"medidas":1,"ondas":5},"ancient_xatu":{"s":3.44,"medidas":1,"ondas":5},"arbok":{"s":3.44,"medidas":1,"ondas":5},"arcanine":{"s":3.31,"medidas":1,"ondas":6},"ariados":{"s":3.5,"medidas":1,"ondas":5},"banshee_misdreavus":{"s":3.61,"medidas":1,"ondas":5},"bayleef":{"s":3.1,"medidas":1,"ondas":5},"beedrill":{"s":3.45,"medidas":1,"ondas":5},"bellossom":{"s":3.49,"medidas":1,"ondas":5},"bellsprout":{"s":3.59,"medidas":1,"ondas":5},"blastoise":{"s":3.16,"medidas":1,"ondas":5},"brave_alakazam":{"s":2.81,"medidas":1,"ondas":5},"brave_arcanine":{"s":3.37,"medidas":1,"ondas":5},"brave_blastoise":{"s":2.97,"medidas":1,"ondas":5},"brave_charizard":{"s":3.37,"medidas":1,"ondas":5},"brave_clefable":{"s":4.5,"medidas":1,"ondas":5},"brave_mantine":{"s":3.49,"medidas":1,"ondas":5},"brave_nidoking":{"s":3.28,"medidas":1,"ondas":5},"brave_nidoqueen":{"s":3.29,"medidas":1,"ondas":5},"brave_noctowl":{"s":3.39,"medidas":1,"ondas":6},"brave_steelix":{"s":3.83,"medidas":1,"ondas":6},"brave_venusaur":{"s":3.35,"medidas":1,"ondas":5},"brute_rhydon":{"s":3.03,"medidas":1,"ondas":6},"bulbasaur":{"s":2.62,"medidas":3,"ondas":1166},"butterfree":{"s":3.42,"medidas":1,"ondas":5},"caterpie":{"s":3.6,"medidas":1,"ondas":6},"chansey":{"s":3.25,"medidas":1,"ondas":5},"charged_raichu":{"s":3.3,"medidas":1,"ondas":5},"charizard":{"s":3.26,"medidas":6,"ondas":940},"charmander":{"s":3.13,"medidas":2,"ondas":10},"charmeleon":{"s":3.4,"medidas":2,"ondas":10},"chikorita":{"s":3.61,"medidas":2,"ondas":10},"clefable":{"s":2.33,"medidas":1,"ondas":6},"clefairy":{"s":2.88,"medidas":1,"ondas":5},"cleffa":{"s":3.39,"medidas":1,"ondas":6},"cloyster":{"s":3.61,"medidas":1,"ondas":5},"cubone":{"s":3.28,"medidas":1,"ondas":5},"dark_crobat":{"s":3.36,"medidas":1,"ondas":5},"delibird":{"s":2.99,"medidas":1,"ondas":5},"dewgong":{"s":3.55,"medidas":1,"ondas":5},"diglett":{"s":3.13,"medidas":1,"ondas":5},"dodrio":{"s":3.35,"medidas":1,"ondas":5},"doduo":{"s":3.22,"medidas":1,"ondas":6},"dragonair":{"s":3.7,"medidas":1,"ondas":5},"dragonite":{"s":3.03,"medidas":1,"ondas":5},"dratini":{"s":3.45,"medidas":1,"ondas":5},"drowzee":{"s":3.62,"medidas":1,"ondas":6},"dugtrio":{"s":3.03,"medidas":1,"ondas":5},"dunsparce":{"s":3.41,"medidas":1,"ondas":6},"ekans":{"s":2.98,"medidas":1,"ondas":5},"electabuzz":{"s":3.62,"medidas":1,"ondas":5},"electrode":{"s":3.44,"medidas":1,"ondas":6},"enigmatic_girafarig":{"s":3.44,"medidas":1,"ondas":5},"enraged_typhlosion":{"s":2.68,"medidas":1,"ondas":5},"evil_cloyster":{"s":3.35,"medidas":1,"ondas":6},"exeggcute":{"s":2.87,"medidas":1,"ondas":5},"exeggutor":{"s":3.4,"medidas":1,"ondas":5},"farfetch_d":{"s":2.84,"medidas":1,"ondas":5},"fearow":{"s":3.39,"medidas":1,"ondas":5},"forretress":{"s":3.34,"medidas":1,"ondas":6},"freezing_dewgong":{"s":3.32,"medidas":1,"ondas":5},"furious_gyarados":{"s":3.27,"medidas":1,"ondas":5},"furious_magmar":{"s":3.53,"medidas":1,"ondas":5},"furious_pidgeot":{"s":3.84,"medidas":1,"ondas":5},"furious_sandslash":{"s":3.42,"medidas":1,"ondas":5},"furious_scyther":{"s":3.18,"medidas":1,"ondas":5},"furious_skarmory":{"s":4.26,"medidas":1,"ondas":5},"furious_wigglytuff":{"s":3.79,"medidas":1,"ondas":5},"furret":{"s":3.39,"medidas":1,"ondas":5},"gengar":{"s":3.41,"medidas":1,"ondas":5},"geodude":{"s":3.68,"medidas":1,"ondas":5},"gligar":{"s":3.12,"medidas":2,"ondas":10},"gloom":{"s":3.28,"medidas":1,"ondas":5},"golbat":{"s":3.68,"medidas":1,"ondas":5},"goldeen":{"s":3.28,"medidas":1,"ondas":5},"golduck":{"s":3.32,"medidas":1,"ondas":5},"golem":{"s":3.26,"medidas":1,"ondas":5},"graveler":{"s":3.42,"medidas":1,"ondas":5},"grimer":{"s":3.53,"medidas":1,"ondas":6},"growlithe":{"s":3.38,"medidas":1,"ondas":6},"gyarados":{"s":3.48,"medidas":1,"ondas":5},"hard_golem":{"s":3.49,"medidas":1,"ondas":6},"haunter":{"s":3.18,"medidas":2,"ondas":10},"heavy_piloswine":{"s":3.3,"medidas":1,"ondas":5},"heracross":{"s":3.18,"medidas":1,"ondas":5},"hitmonchan":{"s":3.03,"medidas":1,"ondas":5},"hitmonlee":{"s":2.71,"medidas":1,"ondas":5},"hoothoot":{"s":3.49,"medidas":1,"ondas":6},"horsea":{"s":3.29,"medidas":1,"ondas":5},"hypno":{"s":2.71,"medidas":1,"ondas":5},"igglybuff":{"s":3.44,"medidas":1,"ondas":5},"ivysaur":{"s":2.78,"medidas":1,"ondas":5},"jigglypuff":{"s":3.4,"medidas":1,"ondas":5},"jumpluff":{"s":3.08,"medidas":1,"ondas":6},"jynx":{"s":3.23,"medidas":1,"ondas":5},"kabuto":{"s":3.32,"medidas":1,"ondas":5},"kabutops":{"s":3.4,"medidas":2,"ondas":10},"kadabra":{"s":3.43,"medidas":1,"ondas":5},"kakuna":{"s":3.28,"medidas":1,"ondas":10},"kangaskhan":{"s":5.6,"medidas":2,"ondas":10},"kingler":{"s":3.26,"medidas":1,"ondas":5},"koffing":{"s":3.39,"medidas":1,"ondas":5},"krabby":{"s":3.34,"medidas":1,"ondas":5},"lapras":{"s":2.65,"medidas":1,"ondas":5},"ledian":{"s":3.53,"medidas":1,"ondas":5},"ledyba":{"s":3.56,"medidas":1,"ondas":5},"lickitung":{"s":3.4,"medidas":1,"ondas":5},"machamp":{"s":2.99,"medidas":1,"ondas":5},"machoke":{"s":3.23,"medidas":1,"ondas":5},"machop":{"s":3.47,"medidas":1,"ondas":6},"magmar":{"s":3.28,"medidas":1,"ondas":5},"magnemite":{"s":3.44,"medidas":1,"ondas":5},"magneton":{"s":3.68,"medidas":1,"ondas":6},"mankey":{"s":3.22,"medidas":1,"ondas":6},"marill":{"s":3.34,"medidas":1,"ondas":5},"marowak":{"s":3.02,"medidas":1,"ondas":5},"meganium":{"s":3.56,"medidas":1,"ondas":6},"meowth":{"s":3.22,"medidas":1,"ondas":5},"metapod":{"s":3.14,"medidas":1,"ondas":10},"milch_miltank":{"s":3.4,"medidas":1,"ondas":5},"mr_mime":{"s":3.7,"medidas":1,"ondas":6},"muk":{"s":2.45,"medidas":1,"ondas":5},"natu":{"s":3.47,"medidas":1,"ondas":5},"nidoking":{"s":3.41,"medidas":1,"ondas":5},"nidoqueen":{"s":3.42,"medidas":1,"ondas":5},"nidoranfe":{"s":3.52,"medidas":1,"ondas":5},"nidoranma":{"s":3.52,"medidas":2,"ondas":10},"nidorina":{"s":3.54,"medidas":1,"ondas":5},"nidorino":{"s":3.53,"medidas":1,"ondas":5},"ninetales":{"s":2.93,"medidas":1,"ondas":5},"oddish":{"s":3.22,"medidas":3,"ondas":15},"omanyte":{"s":3.36,"medidas":1,"ondas":5},"omastar":{"s":3.29,"medidas":1,"ondas":6},"onix":{"s":3.32,"medidas":1,"ondas":5},"paras":{"s":3.08,"medidas":1,"ondas":5},"persian":{"s":2.87,"medidas":2,"ondas":10},"phanpy":{"s":3.29,"medidas":1,"ondas":5},"pichu":{"s":3.32,"medidas":1,"ondas":6},"pidgeot":{"s":2.79,"medidas":1,"ondas":6},"pidgeotto":{"s":3.43,"medidas":1,"ondas":5},"pidgey":{"s":3.23,"medidas":1,"ondas":5},"piloswine":{"s":3.35,"medidas":1,"ondas":6},"pineco":{"s":3.22,"medidas":1,"ondas":6},"pinsir":{"s":3.61,"medidas":1,"ondas":6},"poliwag":{"s":3.36,"medidas":1,"ondas":5},"poliwhirl":{"s":3.33,"medidas":1,"ondas":5},"poliwrath":{"s":3.26,"medidas":1,"ondas":5},"primeape":{"s":2.89,"medidas":1,"ondas":5},"psy_jynx":{"s":3.35,"medidas":1,"ondas":6},"psyduck":{"s":3.37,"medidas":1,"ondas":5},"raichu":{"s":3.28,"medidas":1,"ondas":6},"rapidash":{"s":3.52,"medidas":1,"ondas":5},"raticate":{"s":3.44,"medidas":1,"ondas":5},"rattata":{"s":3.39,"medidas":1,"ondas":5},"remoraid":{"s":3.17,"medidas":1,"ondas":5},"rhydon":{"s":3.11,"medidas":1,"ondas":5},"rhyhorn":{"s":3.39,"medidas":1,"ondas":5},"roll_donphan":{"s":3.42,"medidas":1,"ondas":5},"sandshrew":{"s":2.96,"medidas":1,"ondas":5},"sandslash":{"s":2.94,"medidas":1,"ondas":6},"scizor":{"s":3.52,"medidas":1,"ondas":5},"scyther":{"s":3.51,"medidas":2,"ondas":10},"seadra":{"s":3.36,"medidas":1,"ondas":6},"seaking":{"s":3.28,"medidas":1,"ondas":6},"seel":{"s":3.81,"medidas":1,"ondas":5},"sentret":{"s":3.36,"medidas":1,"ondas":5},"shellder":{"s":3.56,"medidas":1,"ondas":5},"shuckle":{"s":3.31,"medidas":1,"ondas":5},"skarmory":{"s":3.01,"medidas":1,"ondas":5},"skiploom":{"s":3.04,"medidas":1,"ondas":5},"slowbro":{"s":3.17,"medidas":1,"ondas":5},"slowpoke":{"s":3.21,"medidas":1,"ondas":5},"slugma":{"s":3.32,"medidas":1,"ondas":5},"smoochum":{"s":3.23,"medidas":1,"ondas":5},"sneasel":{"s":3.15,"medidas":1,"ondas":6},"snorlax":{"s":2.91,"medidas":1,"ondas":5},"snubbull":{"s":3.11,"medidas":1,"ondas":5},"spearow":{"s":3.77,"medidas":1,"ondas":6},"spinarak":{"s":3.45,"medidas":1,"ondas":5},"squirtle":{"s":3.54,"medidas":1,"ondas":5},"stantler":{"s":3.52,"medidas":1,"ondas":6},"starmie":{"s":3.42,"medidas":1,"ondas":5},"staryu":{"s":3.14,"medidas":1,"ondas":6},"steelix":{"s":3.56,"medidas":1,"ondas":5},"sunflora":{"s":3.37,"medidas":1,"ondas":6},"swinub":{"s":3.15,"medidas":1,"ondas":5},"taekwondo_hitmonchan":{"s":3.42,"medidas":1,"ondas":6},"taekwondo_hitmonlee":{"s":3.46,"medidas":1,"ondas":5},"taekwondo_hitmontop":{"s":3.05,"medidas":1,"ondas":5},"tangela":{"s":2.87,"medidas":1,"ondas":6},"tauros":{"s":3.59,"medidas":1,"ondas":5},"teddiursa":{"s":3.49,"medidas":1,"ondas":5},"tentacool":{"s":3.09,"medidas":1,"ondas":5},"tentacruel":{"s":2.49,"medidas":1,"ondas":5},"togepi":{"s":3.73,"medidas":1,"ondas":5},"tribal_feraligatr":{"s":3.4,"medidas":1,"ondas":5},"trickmaster_gengar":{"s":3.08,"medidas":1,"ondas":5},"tyrogue":{"s":3.37,"medidas":1,"ondas":5},"venomoth":{"s":3.01,"medidas":1,"ondas":5},"venonat":{"s":3.3,"medidas":1,"ondas":5},"venusaur":{"s":3.17,"medidas":2,"ondas":11},"victreebel":{"s":3.6,"medidas":1,"ondas":5},"vileplume":{"s":3.14,"medidas":1,"ondas":5},"voltorb":{"s":3.6,"medidas":1,"ondas":5},"vulpix":{"s":3.36,"medidas":1,"ondas":6},"war_heracross":{"s":3.56,"medidas":1,"ondas":5},"wartortle":{"s":3.16,"medidas":1,"ondas":5},"weedle":{"s":3.7,"medidas":1,"ondas":6},"weepinbell":{"s":3.17,"medidas":1,"ondas":5},"weezing":{"s":2.81,"medidas":1,"ondas":5},"wigglytuff":{"s":4,"medidas":1,"ondas":6},"wooper":{"s":3.38,"medidas":1,"ondas":5},"yanma":{"s":3.43,"medidas":1,"ondas":6},"zubat":{"s":3.35,"medidas":1,"ondas":6},"crobat":{"s":3.51,"medidas":1,"ondas":5,"indireto":true,"golpes":1.09},"croconaw":{"s":3.26,"medidas":1,"ondas":5,"indireto":true,"golpes":1.38},"donphan":{"s":3.32,"medidas":1,"ondas":178,"indireto":true,"golpes":1.23},"elekid":{"s":3.57,"medidas":1,"ondas":5,"indireto":true,"golpes":1.27},"furious_ampharos":{"s":3.32,"medidas":1,"ondas":5,"indireto":true,"golpes":1.08},"girafarig":{"s":3.16,"medidas":1,"ondas":5,"indireto":true,"golpes":1.11},"granbull":{"s":3.31,"medidas":1,"ondas":5,"indireto":true,"golpes":1.19},"hitmontop":{"s":2.87,"medidas":1,"ondas":5,"indireto":true,"golpes":1.18},"larvitar":{"s":2.67,"medidas":1,"ondas":5,"indireto":true,"golpes":1.16},"magnetic_electabuzz":{"s":3.25,"medidas":1,"ondas":5,"indireto":true,"golpes":1.07},"mareep":{"s":3.27,"medidas":1,"ondas":6,"indireto":true,"golpes":1.21},"miltank":{"s":3.25,"medidas":1,"ondas":5,"indireto":true,"golpes":1.23},"misdreavus":{"s":3.27,"medidas":1,"ondas":5,"indireto":true,"golpes":1.18},"pikachu":{"s":3.37,"medidas":1,"ondas":5,"indireto":true,"golpes":1.45},"qwilfish":{"s":3.17,"medidas":1,"ondas":5,"indireto":true,"golpes":1.36},"togetic":{"s":3.93,"medidas":1,"ondas":6,"indireto":true,"golpes":1.18},"ursaring":{"s":3.57,"medidas":1,"ondas":5,"indireto":true,"golpes":1.22},"xatu":{"s":3.33,"medidas":1,"ondas":5,"indireto":true,"golpes":1.12}},"hunts":{"abra":"alakazam","absol_hoenn":"houndour","aerodactyl":"kabutops","altaria_hoenn":"dragonair","ancient_dragonite":"ancient_dragonair","anorith_hoenn":"graveler","aron_hoenn":"magnemite","azurill_hoenn":"pidgey","bagon_hoenn":"dragonair","baltoy_hoenn":"sandshrew","banette_hoenn":"haunter","banshee_mismagius":"banshee_misdreavus","barboach_hoenn":"squirtle","beautifly_hoenn":"butterfree","beldum_hoenn":"magnemite","bidoof_sinnoh":"pidgey","blaziken_hoenn":"charmander","blissey_sinnoh":"pidgey","bonsly_sinnoh":"geodude","brave_aerodactyl":"taekwondo_hitmontop","brave_tyranitar":"ancient_pupitar","breloom_hoenn":"ivysaur","bronzor_sinnoh":"magnemite","budew_sinnoh":"ivysaur","buizel_sinnoh":"squirtle","buneary_sinnoh":"pidgey","burmy_plant_cloak_sinnoh":"butterfree","cacnea_hoenn":"ivysaur","cacturne_hoenn":"ivysaur","camerupt_hoenn":"charmander","carnivine_sinnoh":"ivysaur","carvanha_hoenn":"goldeen","cascoon_hoenn":"butterfree","castform_fire_hoenn":"magcargo","castform_rainy_hoenn":"squirtle","castform_snowy_hoenn":"squirtle","castform_sunny_hoenn":"charmander","chatot_sinnoh":"pidgey","cherrim_sinnoh":"ivysaur","cherubi_sinnoh":"ivysaur","chimchar_sinnoh":"charmander","chimecho_hoenn":"alakazam","chingling_sinnoh":"alakazam","clamperl_hoenn":"squirtle","claydol_hoenn":"sandshrew","combee_sinnoh":"butterfree","combusken_hoenn":"charmander","corphish_hoenn":"staryu","crawdaunt_hoenn":"tribal_feraligatr","croagunk_sinnoh":"ivysaur","delcatty_hoenn":"pidgey","ditto_sinnoh":"pidgey","drifloon_sinnoh":"haunter","dusclops_hoenn":"haunter","duskull_hoenn":"trickmaster_gengar","dustox_hoenn":"butterfree","eevee":"weepinbell","electrike_hoenn":"pikachu","espeon":"alakazam","exploud_hoenn":"pidgey","feebas_hoenn":"squirtle","finneon_sinnoh":"squirtle","flareon":"charmander","flygon_hoenn":"sandshrew","freezing_aurorus":"heavy_piloswine","froslass_sinnoh":"jynx","furious_scizor":"furious_scyther","furious_whimsicott":"brave_clefable","gardevoir_hoenn":"alakazam","gastly":"haunter","gible_sinnoh":"dragonair","glalie_hoenn":"jynx","glameow_sinnoh":"pidgey","gorebyss_hoenn":"squirtle","grotle_sinnoh":"ivysaur","grovyle_hoenn":"ivysaur","grumpig_hoenn":"alakazam","gulpin_hoenn":"brave_nidoqueen","happiny_sinnoh":"pidgey","hariyama_hoenn":"primeape","hippopotas_sinnoh":"sandshrew","hippowdon_sinnoh":"sandshrew","hoppip":"oddish","huntail_hoenn":"squirtle","illumise_hoenn":"ancient_pinsir","jolteon":"pikachu","kecleon_hoenn":"persian","kirlia_hoenn":"alakazam","kricketot_sinnoh":"butterfree","kricketune_sinnoh":"butterfree","lairon_hoenn":"magnemite","leafeon_sinnoh":"ivysaur","lileep_hoenn":"geodude","linoone_hoenn":"pidgey","lombre_hoenn":"blastoise","lotad_hoenn":"wartortle","loudred_hoenn":"pidgey","lucario_sinnoh":"magnemite","ludicolo_hoenn":"squirtle","lunatone_hoenn":"larvitar","luvdisc_hoenn":"squirtle","magikarp":"squirtle","magma_magcargo":"furious_magmar","makuhita_hoenn":"primeape","manectric_hoenn":"pikachu","mantyke_sinnoh":"squirtle","marshtomp_hoenn":"feraligatr","masquerain_hoenn":"weedle","mawile_hoenn":"brave_steelix","medicham_hoenn":"primeape","meditite_hoenn":"mankey","metagross_hoenn":"magnemite","metang_hoenn":"magnemite","mightyena_hoenn":"houndour","milotic_hoenn":"marill","mime_jr_sinnoh":"alakazam","minun_hoenn":"raichu","mismagius_sinnoh":"haunter","monferno_sinnoh":"charmander","mothim_sinnoh":"butterfree","mudkip_hoenn":"corsola","munchlax_sinnoh":"pidgey","murkrow_sinnoh":"houndour","nincada_hoenn":"butterfree","ninjask_hoenn":"ledyba","nosepass_hoenn":"geodude","numel_hoenn":"charmander","nuzleaf_hoenn":"ivysaur","parasect":"chikorita","pelipper_hoenn":"poliwrath","piplup_sinnoh":"squirtle","plusle_hoenn":"pikachu","ponyta":"charmander","poochyena_hoenn":"houndour","porygon2_sinnoh":"pidgey","porygon_sinnoh":"pidgey","psy_exeggutor":"ancient_meganium","ralts_hoenn":"alakazam","riolu_sinnoh":"primeape","roselia_hoenn":"ivysaur","sableye_hoenn":"houndoom","salamence_hoenn":"dragonair","sceptile_hoenn":"ivysaur","sealeo_hoenn":"squirtle","seedot_hoenn":"ivysaur","seviper_hoenn":"muk","sharpedo_hoenn":"squirtle","shedinja_hoenn":"butterfree","shelgon_hoenn":"dragonair","shellos_sinnoh":"squirtle","shieldon_sinnoh":"larvitar","shiftry_hoenn":"ivysaur","shinx_sinnoh":"pikachu","shroomish_hoenn":"ancient_meganium","shuppet_hoenn":"misdreavus","silcoon_hoenn":"scyther","skorupi_sinnoh":"ivysaur","slaking_hoenn":"pidgey","slakoth_hoenn":"dunsparce","slowking_sinnoh":"squirtle","smeargle":"pidgey","snorunt_hoenn":"heavy_piloswine","snover_sinnoh":"heavy_piloswine","spheal_hoenn":"squirtle","spinda_hoenn":"pidgey","spiritomb_sinnoh":"haunter","spoink_hoenn":"alakazam","starly_sinnoh":"pidgey","stunky_sinnoh":"ivysaur","sudowoodo_sinnoh":"geodude","sunkern":"oddish","surskit_hoenn":"venonat","swablu_hoenn":"pidgey","swalot_hoenn":"crobat","swellow_hoenn":"pidgey","taillow_hoenn":"pidgey","torchic_hoenn":"charmander","torkoal_hoenn":"charmander","toxic_toxicroak":"brave_nidoqueen","trapinch_hoenn":"sandshrew","treecko_hoenn":"ivysaur","tropius_hoenn":"ivysaur","turtwig_sinnoh":"ivysaur","umbreon":"houndour","vaporeon":"squirtle","vibrava_hoenn":"sandshrew","vigoroth_hoenn":"pidgey","volbeat_hoenn":"weedle","wailmer_hoenn":"squirtle","wailord_hoenn":"squirtle","walrein_hoenn":"squirtle","war_scrafty":"taekwondo_hitmonchan","whiscash_hoenn":"squirtle","whismur_hoenn":"miltank","wingull_hoenn":"politoed","wormadam_plant_cloak_sinnoh":"butterfree","wormadam_sandy_cloak_sinnoh":"butterfree","wormadam_trash_cloak_sinnoh":"butterfree","wurmple_hoenn":"butterfree","wynaut_hoenn":"alakazam","zangoose_hoenn":"pidgey","zigzagoon_hoenn":"lickitung"},"fontes":["abra","aerodactyl","aipom","alakazam","ampharos","ancient_dragonair","ancient_granbull","ancient_hypno","ancient_marowak","ancient_meganium","ancient_pinsir","ancient_pupitar","ancient_xatu","arbok","arcanine","ariados","azumarill","banshee_misdreavus","bayleef","beedrill","bellossom","bellsprout","blastoise","brave_alakazam","brave_arcanine","brave_blastoise","brave_charizard","brave_clefable","brave_mantine","brave_nidoking","brave_nidoqueen","brave_noctowl","brave_steelix","brave_venusaur","brute_rhydon","bulbasaur","butterfree","caterpie","chansey","charged_raichu","charizard","charmander","charmeleon","chikorita","chinchou","clefable","clefairy","cleffa","cloyster","corsola","crobat","croconaw","cubone","cyndaquil","dark_crobat","delibird","dewgong","diglett","dodrio","doduo","donphan","dragonair","dragonite","dratini","drowzee","dugtrio","dunsparce","ekans","electabuzz","electrode","elekid","enigmatic_girafarig","enraged_typhlosion","evil_cloyster","exeggcute","exeggutor","farfetch_d","fearow","feraligatr","flaaffy","forretress","freezing_dewgong","furious_ampharos","furious_gyarados","furious_magmar","furious_pidgeot","furious_sandslash","furious_scyther","furious_skarmory","furious_wigglytuff","furret","gastly","gengar","geodude","girafarig","gligar","gloom","golbat","goldeen","golduck","golem","granbull","graveler","grimer","growlithe","gyarados","hard_golem","haunter","heavy_piloswine","heracross","hitmonchan","hitmonlee","hitmontop","hoothoot","hoppip","horsea","houndoom","houndour","hypno","igglybuff","ivysaur","jigglypuff","jumpluff","jynx","kabuto","kabutops","kadabra","kakuna","kangaskhan","kingdra","kingler","koffing","krabby","lanturn","lapras","larvitar","ledian","ledyba","lickitung","machamp","machoke","machop","magby","magcargo","magmar","magnemite","magnetic_electabuzz","magneton","mankey","mantine","mareep","marill","marowak","meganium","meowth","metapod","milch_miltank","miltank","misdreavus","mr_mime","muk","natu","nidoking","nidoqueen","nidoranfe","nidoranma","nidorina","nidorino","ninetales","noctowl","octillery","oddish","omanyte","omastar","onix","paras","parasect","persian","phanpy","pichu","pidgeot","pidgeotto","pidgey","pikachu","piloswine","pineco","pinsir","politoed","poliwag","poliwhirl","poliwrath","ponyta","primeape","psy_jynx","psyduck","pupitar","quagsire","quilava","qwilfish","raichu","rapidash","raticate","rattata","remoraid","rhydon","rhyhorn","roll_donphan","sandshrew","sandslash","scizor","scyther","seadra","seaking","seel","sentret","shellder","shuckle","skarmory","skiploom","slowbro","slowpoke","slugma","smoochum","sneasel","snorlax","snubbull","spearow","spinarak","squirtle","stantler","starmie","staryu","steelix","sunflora","sunkern","swinub","taekwondo_hitmonchan","taekwondo_hitmonlee","taekwondo_hitmontop","tangela","tauros","teddiursa","tentacool","tentacruel","togepi","togetic","totodile","tribal_feraligatr","trickmaster_gengar","typhlosion","tyranitar","tyrogue","ursaring","venomoth","venonat","venusaur","victreebel","vileplume","voltorb","vulpix","war_heracross","wartortle","weedle","weepinbell","weezing","wigglytuff","wobbuffet","wooper","xatu","yanma","zubat"],"biomas":{"BUG":{"mapa":"butterfree","acertos":14,"de":22},"DARK":{"mapa":"houndour","acertos":5,"de":6},"DRAGON":{"mapa":"dragonair","acertos":5,"de":6},"ELECTRIC":{"mapa":"pikachu","acertos":5,"de":6},"FIGHTING":{"mapa":"primeape","acertos":4,"de":7},"FIRE":{"mapa":"charmander","acertos":11,"de":12},"GHOST":{"mapa":"haunter","acertos":6,"de":9},"GRASS":{"mapa":"ivysaur","acertos":18,"de":24},"GROUND":{"mapa":"sandshrew","acertos":7,"de":7},"ICE":{"mapa":"heavy_piloswine","acertos":2,"de":5},"NORMAL":{"mapa":"pidgey","acertos":24,"de":30},"POISON":{"mapa":"ivysaur","acertos":3,"de":6},"PSYCHIC":{"mapa":"alakazam","acertos":11,"de":11},"ROCK":{"mapa":"geodude","acertos":4,"de":10},"STEEL":{"mapa":"magnemite","acertos":7,"de":8},"WATER":{"mapa":"squirtle","acertos":23,"de":33}}};


// === engine.js ===
// Motor do "Onde caçar?" — simula o seu pokémon em cada hunt e ordena por XP/h ou ouro/h.
//
// Regras de combate: Pokepédia do jogo (capítulos Combate e Stats) e os módulos `shared/`
// importados ao vivo (curva de cooldown, desconto do Speed, efetividade amplificada, XP e ouro
// por abate, multiplicadores de boost). Constantes que o servidor manda no `welcome`
// (multiplicadores do selvagem, tabela de tipos) entram por `ctx.consts`.
//
// O que NÃO está no cliente e foi medido em jogo fica em MEDIDO e na tabela de ritmo por mapa
// (ritmo.js, gerada por scripts/exportar-ritmo-mapas.mjs).
//
// RITMO (jogo 1.377.0 em diante, hunts "em bandos"): medido pela telemetria do PokeIdle Launcher em
// 28–29/10/2026, jogo 1.380.2. A onda volta 2,8 s depois do último abate em qualquer nível — não há
// reposição por slot — e quem mata de um golpe leva o MESMO tempo por abate num mapa, seja qual for
// o pokémon: é a caminhada entre os bandos, que as paredes decidem. Esse tempo é do MAPA (de 2,3 s
// a 5,6 s por abate), e as hunts de Johto em diante emprestam um dos mapas de Kanto e da Outland —
// o servidor diz qual no `campo.init`. Então:
//
//   segundos por abate = tempo morto + tempo de luta do motor
//
// com as recargas correndo no tempo morto. Quem mata de um golpe tem o tempo morto igual ao do
// mapa; quem luta mais anda menos, porque o bando caminha até o herói (~0,5 tile/s) enquanto ele
// luta — e, andando menos, tem menos recarga para a luta: as duas coisas se acertam num ponto fixo
// (ver `tempoMorto`). Contra 65 medidas de três pokémon que precisam de vários golpes: erro mediano
// de 3–6%, máximo de 19%, viés de −2% a −1%; nas 24 que ninguém usou para ajustar a curva, 4,5%.
// Hunt que ninguém mediu usa
// o mapa que você viu nela (geo.js guarda o `mapa` de cada hunt em que você entra), senão o do
// bioma do tipo (o mapa que o servidor mais empresta ao 1º tipo) ou a mediana dos mapas — e a
// linha diz de onde veio o número e a faixa de abates/h.
//
// O DIA SAZONAL (desde 20/10/2026) vem do estado do jogo (`diaSazonal.tipo`) pela opção
// `tipoDoDia`: nas hunts do Mapa os pokémon da tipagem do dia — o seu e os selvagens — batem o
// dobro e levam ¼ do dano (`multDanoSazonal`, shared/dia-sazonal.mjs).
//
// AoE e TM Elemental (o Z-Move, desde o jogo 1.3xx de 15/10/2026) NÃO entram na conta, por
// decisão de 18/10/2026: estimar o que os discos mudam em abates/h trazia mais erro do que
// acerto, e o ranking oscilava. O que aparece é a base — o pokémon com os golpes da espécie —
// mais os bônus de XP da sessão (VIP, boosts, guild, Twitch, Kick, eventos), que são exatos.
(function (root) {
  'use strict';
  const PIH = (root.__pokeidleHunt ??= {});

  // ---- regras do jogo que o cliente só documenta em texto (Pokepédia > Combate) -----------
  const REGRAS = {
    randMedio: 0.925, // aleatório(0,85–1,00)
    stab: 1.5,
    gapJogadorMs: 900, // intervalo mínimo entre golpes seus
    gapSelvagemS: 1.4, // intervalo mínimo entre golpes dele
    investidaPower: 30,
    investidaCdMs: 2000,
    pisoCdMs: 400, // piso do desconto fixo do IV de SPD
    msPorIvSpd: 10, // −10 ms por ponto de IV de SPD na Investida e no intervalo
    hpCombateMult: 12, // hpDeCombate = máx(24, arred(hp × 12))
    hpCombateMin: 24,
    ivSelvagemMedio: 16, // selvagem: IV sorteado 1–32 por mob
    poderMinimo: 15,
  };

  // ---- ritmo da hunt: medido em jogo ----------------------------------------------------------
  const MEDIDO = {
    ruidoMapa: 0.07, // o mesmo mapa medido duas vezes: diferença mediana de 7%
    ruidoIndireto: 0.1, // mapa medido com quase um golpe (o golpe a mais descontado): erra até 5% a mais
    sPorAbatePadrao: 3.33, // sem a tabela de ritmo: a mediana dos mapas medidos em 29/10/2026
    heroiSPorTile: 0.51, // passo do herói, o mesmo em todo pokémon medido
    distMorteTiles: 20.6, // a corrida de volta depois de morrer (mediana das hunts no layout antigo)
    respawnS: 3, // morte → volta ao jogo (sem contar a corrida)
    amostrasHp: 32, // abates simulados por espécie (IV de HP 1..32)
    maxAtaquesPorAbate: 4000,
    // Quem luta mais anda menos: o bando caminha até o herói enquanto ele luta. A caminhada de um golpe
    // é ~83% do tempo do mapa (o resto é a pausa da onda e a 1ª caminhada de cada leva); com luta longa
    // ela cai até o piso, o tempo de virar para o próximo alvo.
    caminhadaDoMapa: 0.83, // caminhada de um golpe ÷ tempo do mapa (mediana de 245 sessões)
    caminhadaPisoS: 1.41, // a caminhada das sessões com luta ≥ 4 s por abate (mediana)
    caminhadaTauS: 2.8, // a luta que leva 63% do caminho entre a caminhada de um golpe e o piso
  };

  /**
   * Todos os multiplicadores de XP ativos agora (Pokepédia > Níveis e XP: eles se MULTIPLICAM):
   * XP Boost (treinador) e XP Boost Pokémon, VIP, Boost da Guild e bônus do ranking da guild — os
   * quatro já na conta `multXp*` do jogo —, mais o bônus Twitch, o bônus na Kick, o evento e o
   * Boost dos atrasados.
   */
  function bonusXp(eu, ctx, agora = Date.now()) {
    const tiposBoost = ctx.consts.tiposBoost ?? [];
    const base = {
      pokemon: ctx.mod.analyser.multXpPokemon?.(eu ?? {}, agora, tiposBoost) ?? 1,
      treinador: ctx.mod.analyser.multXpTreinador?.(eu ?? {}, agora, tiposBoost) ?? 1,
    };
    const itens = [];
    const l = eu?.loja ?? {};
    const boostDe = (chave) => (agora < (l.boosts?.[chave] ?? 0) ? tiposBoost.find((b) => b.chave === chave)?.mult ?? 1 : 1);
    if (agora < (l.vipAte ?? 0)) itens.push({ nome: 'VIP', mult: ctx.mod.analyser.VIP_MULT_XP ?? 1.5, ambos: true, base: true });
    if (boostDe('xp') > 1) itens.push({ nome: 'XP Boost', mult: boostDe('xp'), treinador: true, base: true });
    if (boostDe('pokexp') > 1) itens.push({ nome: 'XP Boost Pokémon', mult: boostDe('pokexp'), pokemon: true, base: true });
    if (Number(eu?.guildBonusPct) > 0) itens.push({ nome: 'Ranking da guild', mult: 1 + eu.guildBonusPct / 100, ambos: true, base: true });
    if (agora < (eu?.guild?.boostAte ?? 0)) {
      const m = base.pokemon / itens.filter((i) => i.base && (i.ambos || i.pokemon)).reduce((s, i) => s * i.mult, 1);
      if (m > 1.0001) itens.push({ nome: 'Boost da Guild', mult: m, ambos: true, base: true });
    }
    const extra = { pokemon: 1, treinador: 1 };
    const somar = (item) => {
      itens.push(item);
      if (item.ambos || item.pokemon) extra.pokemon *= item.mult;
      if (item.ambos || item.treinador) extra.treinador *= item.mult;
    };
    const tw = eu?.twitch;
    if (tw?.assistindo && Number(tw.pctAtual) > 0) somar({ nome: 'Twitch', mult: 1 + tw.pctAtual / 100, ambos: true });
    const kk = eu?.kick;
    if (agora < (Number(kk?.bonus?.xp) || 0) && Number(kk?.pct) > 0) somar({ nome: 'Kick', mult: 1 + kk.pct / 100, ambos: true });
    const ev = eu?.evento;
    if (ev && agora < (ev.terminaEm ?? 0)) {
      const tr = Number(ev.xpTreinadorPct) || 0;
      const pk = Number(ev.xpPokemonPct) || 0;
      if (tr && tr === pk) somar({ nome: 'Evento', mult: 1 + tr / 100, ambos: true });
      else {
        if (pk) somar({ nome: 'Evento (pokémon)', mult: 1 + pk / 100, pokemon: true });
        if (tr) somar({ nome: 'Evento (treinador)', mult: 1 + tr / 100, treinador: true });
      }
    }
    const at = l.atrasados;
    if (at && Number(at.mult) > 1 && (eu?.level ?? 0) < (Number(at.alvo) || 0)) somar({ nome: 'Atrasados', mult: Number(at.mult), ambos: true });
    return { pokemon: base.pokemon * extra.pokemon, treinador: base.treinador * extra.treinador, itens };
  }

  const STATS = ['hp', 'atk', 'def', 'spAtk', 'spDef', 'speed'];
  const BASE_DE = { hp: 'baseHp', atk: 'baseAtk', def: 'baseDef', spAtk: 'baseSpAtk', spDef: 'baseSpDef', speed: 'baseSpeed' };
  const tiposDe = (esp) => [esp.type1, esp.type2].filter(Boolean);
  const ivSpd = (iv) => Math.min(32, Math.max(1, Math.round(Number(iv) || 1)));
  const cdPeloIv = (ms, iv) => Math.max(REGRAS.pisoCdMs, ms - ivSpd(iv) * REGRAS.msPorIvSpd);

  function dano(nivel, power, atk, def, stab, efet) {
    const base = ((2 * nivel / 5 + 2) * power * Math.max(1, atk) / Math.max(1, def)) / 50 + 2;
    return base * (stab ? REGRAS.stab : 1) * efet * REGRAS.randMedio;
  }

  /** Stats do selvagem: IV médio, qualidade 1, potência I. */
  function statsSelvagem(esp, nivel, iv = REGRAS.ivSelvagemMedio) {
    const o = {};
    for (const k of STATS) o[k] = ((esp[BASE_DE[k]] ?? 0) + 2 * iv) * nivel / 100;
    return o;
  }

  /** Os golpes que o pokémon usa: os da espécie liberados até o nível, com o desconto do Speed. */
  function golpesDoPokemon(pk, esp, mod) {
    const comSpeed = (cd) => mod.cooldown.cooldownGolpeComSpeed(cd, esp.baseSpeed, pk.ivs?.speed);
    return (esp.attacks ?? [])
      .filter((a) => (a.learnLevel ?? 1) <= (pk.level ?? 1))
      .map((a) => ({ ...a, cooldownMs: comSpeed(a.cooldownMs) }));
  }

  /**
   * A vantagem elemental AMPLIFICADA na hunt: o servidor manda o fator no welcome
   * (`ampliacaoHunt`, 1.5) e aplica ×1,5 por cima do que passa de 1 (2 → 2,5) e divide o que
   * fica abaixo (0,5 → 0,33); imunidade e neutro ficam. Era o `efetividadeHunt` do
   * hunt-analyser até o jogo 1.287, que o tirou por não usar mais no cliente — o servidor segue
   * amplificando, então a conta vive aqui.
   */
  function amplificarHunt(v, fator) {
    return v === 0 || v === 1 ? v : v > 1 ? 1 + (v - 1) * fator : v / fator;
  }

  function criarEfetividade(ctx) {
    const tabela = ctx.consts.tabelaTipos ?? {};
    const fator = ctx.consts.ampliacaoHunt ?? 1.5;
    const cache = new Map();
    return (atq, d1, d2) => {
      const k = `${atq}|${d1}|${d2}`;
      let v = cache.get(k);
      if (v === undefined) {
        v = amplificarHunt(ctx.mod.analyser.efetividade(atq, d1, d2 ?? null, tabela), fator);
        cache.set(k, v);
      }
      return v;
    };
  }
  PIH._amplificarHunt = amplificarHunt; // para os testes

  /** A Investida sai no 1º tipo; só passa para o 2º se o alvo for imune ao 1º. */
  function tipoDaInvestida(tipos, ef, alvoTipos) {
    const [t1, t2] = tipos;
    if (t2 && ef(t1, alvoTipos[0], alvoTipos[1]) === 0) return t2;
    return t1;
  }

  /**
   * Segundos de luta por abate. A cada ataque o pokémon usa, entre os golpes prontos, o de
   * maior dano contra o alvo; sem golpe pronto vem a Investida; todo ataque ocupa o intervalo
   * global. O HP do selvagem rola por abate (IV 1–32) e as recargas correm no tempo morto.
   */
  function segundosPorAbate(golpes, investida, gapS, hps, mortoS) {
    const ordem = golpes.map((_, i) => i).filter((i) => golpes[i].d > 0).sort((a, b) => golpes[b].d - golpes[a].d);
    const pronto = golpes.map(() => 0);
    let proxInv = 0, t = 0, luta = 0;
    for (const hp of hps) {
      let feito = 0, ini = t, ultimo = t, ataques = 0;
      while (feito < hp) {
        if (++ataques > MEDIDO.maxAtaquesPorAbate) return Infinity;
        let i = -1;
        for (const j of ordem) if (pronto[j] <= t) { i = j; break; }
        if (i >= 0) {
          feito += golpes[i].d; pronto[i] = t + golpes[i].cdS; ultimo = t; t += gapS;
        } else if (investida.d > 0 && proxInv <= t) {
          feito += investida.d; proxInv = t + investida.cdS; ultimo = t; t += gapS;
        } else {
          let prox = investida.d > 0 ? proxInv : Infinity;
          for (const j of ordem) if (pronto[j] < prox) prox = pronto[j];
          if (!Number.isFinite(prox)) return Infinity;
          t = Math.max(t, prox);
        }
      }
      luta += ultimo - ini;
      t = ultimo + mortoS;
    }
    return luta / hps.length;
  }

  /** O que o selvagem faz com você: dano por segundo e o pior golpe (rolagem máxima). */
  function ameacaDoSelvagem(esp, nivel, pk, ef, ctx, multSazonal) {
    const st = statsSelvagem(esp, nivel);
    const tiposPk = pk.tipos;
    const tiposEsp = tiposDe(esp);
    const multDano = (ctx.consts.multDanoSelvagem ?? 1.8) * multSazonal;
    const golpes = (esp.attacks ?? []).filter((a) => (a.learnLevel ?? 1) <= nivel);
    const danos = golpes.map((a) => {
      const fisico = a.category !== 'SPECIAL';
      return dano(nivel, Math.max(REGRAS.poderMinimo, a.power), fisico ? st.atk : st.spAtk,
        fisico ? pk.stats.def : pk.stats.spDef, tiposEsp.includes(a.type), ef(a.type, tiposPk[0], tiposPk[1]));
    });
    const tipoInv = tipoDaInvestida(tiposEsp, ef, tiposPk);
    const inv = dano(nivel, REGRAS.investidaPower, st.atk, pk.stats.def, true, ef(tipoInv, tiposPk[0], tiposPk[1]));
    const media = danos.length ? (danos.reduce((s, x) => s + x, 0) / danos.length) * 0.92 + inv * 0.08 : inv;
    return {
      dps: media * multDano / REGRAS.gapSelvagemS,
      hitMax: Math.max(inv, ...danos) / REGRAS.randMedio * multDano,
    };
  }

  /**
   * O pódio dos ginásios (jogo 1.377.0, 28/10/2026): quem está no pódio de um tipo bate mais forte
   * na hunt com TODO pokémon daquele tipo — +25% o líder, +10% o 2º, +5% o 3º —, sem empilhar
   * entre os dois tipos de um pokémon. A regra e os números são os do jogo (`shared/ginasios.mjs`);
   * o lugar vem no estado do jogador (`ginasiosPodio`; `ginasios`, só os liderados, nos clientes
   * antigos). Fora do pódio, ×1.
   */
  function podioDoPokemon(tipos, eu, mod) {
    const b = mod.ginasios?.buffGinasioDoPokemon?.(tipos, eu?.ginasiosPodio ?? eu?.ginasios ?? null) ?? null;
    return b ? { lugar: b.lugar, pct: b.pct, mult: 1 + b.pct / 100 } : null;
  }

  /** A tabela de ritmo pronta para consulta (os mapas-fonte num Set). */
  function prepararRitmo(t) {
    return t ? { ...t, fontes: new Set(t.fontes ?? []) } : null;
  }

  const principalDa = (h) => (h.especies ?? []).reduce((m, e) => (!m || Number(e.pontos) > Number(m.pontos) ? e : m), null);

  /**
   * O tempo por abate de quem mata de um golpe na hunt, a faixa dele e de onde veio: `medido` (o
   * mapa da hunt — o da tabela ou o que você viu ao entrar — foi medido), `bioma` (vale o mapa mais
   * emprestado ao 1º tipo do pokémon principal, e a faixa se abre até a dos mapas medidos, porque
   * ~1 em 4 hunts emprestadas foge do bioma), `faixa` (mapa sem medida: a mediana dos mapas) ou
   * `padrao` (sem a tabela).
   */
  function tempoDoMapa(h, ritmo, especies, mapaVisto) {
    if (!ritmo) {
      const s = MEDIDO.sPorAbatePadrao;
      return { s, faixa: [s, s], ritmo: 'padrao', mapa: null };
    }
    const ruido = MEDIDO.ruidoMapa;
    const f = ritmo.faixa;
    const mapa = ritmo.hunts?.[h.slug] ?? (ritmo.fontes.has(h.slug) ? h.slug : null) ?? mapaVisto?.(h.slug) ?? null;
    const medido = mapa ? ritmo.mapas?.[mapa] : null;
    if (medido) {
      const r = medido.indireto ? MEDIDO.ruidoIndireto : ruido;
      return { s: medido.s, faixa: [medido.s * (1 - r), medido.s * (1 + r)], ritmo: 'medido', mapa, indireto: !!medido.indireto };
    }
    if (!mapa) {
      const tipo = especies.get(principalDa(h)?.pokeId)?.type1;
      const bioma = ritmo.biomas?.[tipo];
      const b = bioma ? ritmo.mapas?.[bioma.mapa] : null;
      if (b) return { s: b.s, faixa: [Math.min(b.s * (1 - ruido), f.p10), Math.max(b.s * (1 + ruido), f.p90)], ritmo: 'bioma', mapa: bioma.mapa, bioma: { tipo, ...bioma } };
    }
    return { s: f.mediana, faixa: [f.p10, f.p90], ritmo: 'faixa', mapa };
  }

  /**
   * O tempo morto por abate (caminhada, pausa da onda, recargas correndo) com F segundos de luta por
   * abate, num mapa em que quem mata de um golpe leva `sMapa`.
   */
  function tempoMorto(sMapa, F) {
    const encurta = Math.max(0, MEDIDO.caminhadaDoMapa * sMapa - MEDIDO.caminhadaPisoS);
    return sMapa - encurta * (1 - Math.exp(-F / MEDIDO.caminhadaTauS));
  }

  function simularHunt(h, pk, golpesPk, ef, ctx, opcoes) {
    const especiesHunt = (h.especies ?? [])
      .map((e) => ({ esp: ctx.especies.get(e.pokeId), pontos: Number(e.pontos) || 0 }))
      .filter((e) => e.esp && e.pontos > 0);
    const total = especiesHunt.reduce((s, e) => s + e.pontos, 0);
    if (!total) return null;
    const nivel = h.nivel ?? 1;

    // Entre um abate e o primeiro golpe no próximo alvo o herói anda, e as recargas correm nesse tempo.
    const mapa = tempoDoMapa(h, ctx.ritmo, ctx.especies, ctx.mapaVisto);
    const multSazonal = ctx.mod.sazonal?.multDanoSazonal;
    const sazonal = (atacante, defensor) => (opcoes.tipoDoDia && multSazonal ? multSazonal(opcoes.tipoDoDia, atacante, defensor) : 1);
    const gapS = cdPeloIv(REGRAS.gapJogadorMs, pk.ivs?.speed) / 1000;
    const cdInvS = cdPeloIv(REGRAS.investidaCdMs, pk.ivs?.speed) / 1000;
    const multPodio = pk.multPodio ?? 1;

    let ttk = 0, dps = 0, hitMax = 0, xpKill = 0, ouroKill = 0, efMedia = 0;
    const lutas = [];
    let melhorGolpe = null, melhorDano = -1;
    const alvos = [];
    for (const { esp, pontos } of especiesHunt) {
      const w = pontos / total;
      const tiposAlvo = tiposDe(esp);
      const st = statsSelvagem(esp, nivel);
      const multEu = multPodio * sazonal(pk.tipos, tiposAlvo);
      const golpes = golpesPk.map((g) => {
        const fisico = g.category !== 'SPECIAL';
        const d = multEu * dano(pk.level, Math.max(REGRAS.poderMinimo, g.power), fisico ? pk.stats.atk : pk.stats.spAtk,
          fisico ? st.def : st.spDef, pk.tipos.includes(g.type), ef(g.type, tiposAlvo[0], tiposAlvo[1]));
        return { d, cdS: g.cooldownMs / 1000, g };
      });
      for (const g of golpes) {
        if (g.d * w > melhorDano) { melhorDano = g.d * w; melhorGolpe = g.g; }
      }
      const tipoInv = tipoDaInvestida(pk.tipos, ef, tiposAlvo);
      const investida = {
        d: multEu * dano(pk.level, REGRAS.investidaPower, pk.stats.atk, st.def, true, ef(tipoInv, tiposAlvo[0], tiposAlvo[1])),
        cdS: cdInvS,
      };
      const multHp = ctx.consts.multHpSelvagem ?? 5;
      const hps = [];
      for (let k = 0; k < MEDIDO.amostrasHp; k++) {
        const iv = 1 + Math.floor(k * 32 / MEDIDO.amostrasHp + 0.5);
        const hpStat = ((esp.baseHp ?? 0) + 2 * iv) * nivel / 100;
        hps.push(Math.max(REGRAS.hpCombateMin, Math.round(hpStat * REGRAS.hpCombateMult)) * multHp);
      }
      const s = segundosPorAbate(golpes, investida, gapS, hps, mapa.s);
      if (!Number.isFinite(s)) { ttk = Infinity; break; }
      ttk += w * s;
      lutas.push({ w, golpes, investida, hps });

      const ameaca = ameacaDoSelvagem(esp, nivel, pk, ef, ctx, sazonal(tiposAlvo, pk.tipos));
      dps += w * ameaca.dps;
      hitMax = Math.max(hitMax, ameaca.hitMax);

      xpKill += w * ctx.mod.recompensa.xpPorDerrota(h, nivel, esp);
      // Desde 15/10/2026 (jogo 1.295) os itens de venda ao NPC não caem mais: o que eles rendiam
      // virou o "bônus de loot", pago em ouro dentro de `ouroPorDerrotaHunt`. Sem o Loot Boost
      // (4º argumento), por decisão de 18/10: só a base.
      ouroKill += w * ctx.mod.recompensa.ouroPorDerrotaHunt(h, nivel, esp);
      alvos.push({ w, tiposAlvo });
    }
    for (const { w, tiposAlvo } of alvos) {
      efMedia += w * (melhorGolpe ? ef(melhorGolpe.type, tiposAlvo[0], tiposAlvo[1]) : 1);
    }

    const base = {
      hunt: h, slug: h.slug, nome: h.nome, pokeId: principalDa(h)?.pokeId, nivel, regiao: regiaoDoMapa(h),
      liberada: (ctx.eu?.level ?? Infinity) >= nivel,
      ritmo: mapa.ritmo, mapa: mapa.mapa, bioma: mapa.bioma ?? null, indireto: !!mapa.indireto,
      melhorGolpe: melhorGolpe ? { nome: melhorGolpe.name, tipo: melhorGolpe.type } : null,
      efetividade: efMedia,
    };

    // A luta encurta a caminhada, e a caminhada mais curta deixa menos recarga para a luta: as duas
    // se acertam num ponto fixo. A luta é simulada nas duas pontas do tempo morto (o do mapa e o piso)
    // e, no meio, é a reta entre elas: iterar a simulação faz o ponto fixo pular entre dois valores,
    // porque a luta simulada anda aos saltos (o golpe forte está pronto ou não). Contra as medidas, a
    // reta erra o mesmo que a iteração e deixa o XP/h mais estável de um nível para o outro.
    const semLuta = mapa.s, piso = tempoMorto(mapa.s, Infinity);
    if (Number.isFinite(ttk) && ttk > 0.02 && semLuta - piso > 0.02) {
      const noPiso = lutas.reduce((t, l) => t + l.w * segundosPorAbate(l.golpes, l.investida, gapS, l.hps, piso), 0);
      if (Number.isFinite(noPiso)) {
        const lutaCom = (m) => ttk + (m - semLuta) * (noPiso - ttk) / (piso - semLuta);
        let lo = piso, hi = semLuta; // tempoMorto(lutaCom(m)) − m: ≥ 0 no piso, ≤ 0 sem luta
        for (let i = 0; i < 30; i++) {
          const m = (lo + hi) / 2;
          if (tempoMorto(mapa.s, lutaCom(m)) >= m) lo = m; else hi = m;
        }
        ttk = lutaCom((lo + hi) / 2);
      }
    }
    if (!Number.isFinite(ttk)) return { ...base, inviavel: true, motivo: 'não mata', xpPokemonH: 0, xpTreinadorH: 0, ouroH: 0, kph: 0 };

    const porAbate = (sMapa) => tempoMorto(sMapa, ttk) + ttk;
    const kph = 3600 / porAbate(mapa.s);

    // Morte, com um selvagem batendo por vez: com poção automática só morre quem leva, de uma
    // vez, mais que o HP inteiro; sem poção, morre quando o dano acumulado nos abates passa do HP.
    const hpPk = pk.maxHp ?? Math.max(REGRAS.hpCombateMin, Math.round(pk.stats.hp * REGRAS.hpCombateMult));
    const danoPorAbate = dps * ttk;
    const hitPior = hitMax;
    const umHit = hitPior >= hpPk;
    const abatesPorVida = opcoes.comPocao
      ? (umHit ? hpPk / hitPior : 999)
      : hpPk / Math.max(1e-6, danoPorAbate);
    const tempoMorte = MEDIDO.respawnS + MEDIDO.distMorteTiles * MEDIDO.heroiSPorTile;
    const vidaS = abatesPorVida * (kph > 0 ? 3600 / kph : 0);
    const uptime = vidaS / (vidaS + tempoMorte);
    const mortesH = abatesPorVida >= 999 ? 0 : 3600 / (vidaS + tempoMorte);
    const kphEf = kph * uptime;
    const kphFaixa = [3600 / porAbate(mapa.faixa[1]) * uptime, 3600 / porAbate(mapa.faixa[0]) * uptime];
    // O que você mediu caçando aqui (10+ min com este pokémon) aparece só como referência — senão a
    // hunt em que você está ganharia ou perderia posição por isso.
    const kphMedido = ctx.ritmoMedido?.(h.slug) ?? null;

    const multPk = opcoes.bonusXp?.pokemon ?? 1;
    const multTr = opcoes.bonusXp?.treinador ?? 1;

    return {
      ...base,
      inviavel: false,
      ttk, kph: kphEf, kphFaixa, kphMedido, mortesH, umHit,
      hitPct: hitPior / hpPk,
      danoPorAbate,
      xpPokemonH: kphEf * xpKill * multPk,
      xpTreinadorH: kphEf * xpKill * multTr,
      ouroH: kphEf * ouroKill,
      ouroKill, xpKill,
    };
  }

  // As abas do mapa do jogo, na ordem em que ele as mostra (REGIOES_MAPA no cliente, jogo 1.380):
  // a escada de temporadas. É a divisão que o jogador conhece, e a do painel (o mesmo de
  // dist/js/jogo/regioes.js no site).
  //
  // O jogo põe cada hunt na aba que o servidor manda em `regiao`. Sem ela, vale a `area` e, dentro
  // da área, a geração da espécie com mais pontos de spawn: o welcome manda Kanto e Johto como
  // `area: 'kanto'` (é o mesmo desenho de mapa), e só a geração separa as duas abas.
  const REGIOES_DO_MAPA = [
    { id: 'kanto', rotulo: 'Kanto', area: 'kanto', geracao: 'kanto' },
    { id: 'outland', rotulo: 'Outland', area: 'outland', geracao: null },
    { id: 'johto', rotulo: 'Johto', area: 'kanto', geracao: 'johto' },
    { id: 'hoenn', rotulo: 'Hoenn', area: 'orre', geracao: 'hoenn' },
    { id: 'sinnoh', rotulo: 'Sinnoh', area: 'orre', geracao: 'sinnoh' },
    { id: 'unova', rotulo: 'Unova', area: 'orre', geracao: 'unova' },
    { id: 'kalos', rotulo: 'Kalos', area: 'orre', geracao: 'kalos' },
    { id: 'alola', rotulo: 'Alola', area: 'orre', geracao: 'alola' },
    { id: 'galar', rotulo: 'Galar', area: 'orre', geracao: 'galar' },
    { id: 'paldea', rotulo: 'Paldea', area: 'orre', geracao: 'paldea' },
  ];

  // O último número do dex nacional de cada geração. Os clones de Orre (13xxx) e a Outland (2001+)
  // caem na faixa pelo `% 1000`, como no cliente.
  const FIM_DA_GERACAO = [[151, 'kanto'], [251, 'johto'], [386, 'hoenn'], [493, 'sinnoh'], [649, 'unova'], [721, 'kalos'], [809, 'alola'], [905, 'galar'], [1025, 'paldea']];
  const geracaoDoPokeId = (id) => {
    const dex = id <= 1025 ? id : id % 1000;
    return FIM_DA_GERACAO.find(([fim]) => dex <= fim)?.[1] ?? null;
  };

  function geracaoDaHunt(h) {
    const peso = new Map();
    for (const e of h.especies ?? []) {
      const g = geracaoDoPokeId(Number(e.pokeId));
      if (g) peso.set(g, (peso.get(g) ?? 0) + (Number(e.pontos) || 1));
    }
    return [...peso].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }

  /** A aba do mapa em que o jogo mostra a hunt (`id` de REGIOES_DO_MAPA), ou a área se nenhuma aba casar. */
  function regiaoDoMapa(h) {
    if (h.regiao) return h.regiao;
    const ger = geracaoDaHunt(h);
    return REGIOES_DO_MAPA.find((r) => r.area === h.area && (r.geracao == null || r.geracao === ger))?.id ?? h.area ?? null;
  }

  /**
   * Analisa todas as hunts para o pokémon `pk` (um item de `estado.pokemons`).
   * `ctx`: { mod, especies, hunts, consts, eu, ritmo, mapaVisto, ritmoMedido }.
   * `opcoes`: { comPocao = true, ordem = 'xp' | 'ouro', soLiberadas = true, tipoDoDia = null }.
   */
  function analisar(pk, ctx, opcoes = {}) {
    const op = { comPocao: true, ordem: 'xp', soLiberadas: true, tipoDoDia: null, ...opcoes };
    const esp = ctx.especies.get(pk.speciesId);
    if (!esp) throw new Error(`espécie ${pk.speciesId} (${pk.nome}) não está no catálogo`);
    const stats = pk.stats ?? null;
    if (!stats) throw new Error('o jogo não mandou os stats deste pokémon');
    const tipos = pk.tipos?.length ? pk.tipos : tiposDe(esp);
    const podio = podioDoPokemon(tipos, ctx.eu, ctx.mod);
    const poke = {
      ...pk,
      level: pk.level ?? 1,
      tipos,
      stats,
      multPodio: podio?.mult ?? 1,
    };
    const ef = criarEfetividade(ctx);
    const golpes = golpesDoPokemon(poke, esp, ctx.mod);
    const inicio = (typeof performance !== 'undefined' ? performance : Date).now();
    op.bonusXp = bonusXp(ctx.eu, ctx);
    const linhas = [];
    const ctxHunt = { ...ctx, ritmo: prepararRitmo(ctx.ritmo) };
    for (const h of ctx.hunts ?? []) {
      const r = simularHunt(h, poke, golpes, ef, ctxHunt, op);
      if (r) linhas.push(r);
    }
    const chave = op.ordem === 'ouro' ? 'ouroH' : 'xpPokemonH';
    linhas.sort((a, b) => (b[chave] - a[chave]) || (a.nivel - b.nivel));
    return {
      pokemon: poke,
      especie: esp,
      golpes,
      bonusXp: op.bonusXp,
      podio,
      linhas: op.soLiberadas ? linhas.filter((l) => l.liberada) : linhas,
      total: linhas.length,
      ms: Math.round((typeof performance !== 'undefined' ? performance : Date).now() - inicio),
    };
  }

  PIH.engine = { analisar, REGRAS, MEDIDO, REGIOES_DO_MAPA, regiaoDoMapa, _interno: { dano, statsSelvagem, segundosPorAbate, golpesDoPokemon, bonusXp, podioDoPokemon, tempoDoMapa, tempoMorto, prepararRitmo } };
})(globalThis);


// === geo.js ===
// O que a extensão aprende enquanto você joga.
//
// MAPA (entra no cálculo): o servidor diz, no `campo.init`, de qual mapa vem a geografia da hunt —
// as de Johto em diante emprestam um dos mapas de Kanto e da Outland. Guardamos o mapa de cada hunt
// em que você entra; o motor usa o tempo medido desse mapa (ritmo.js) quando a tabela ainda não
// conhece a hunt.
//
// RITMO (só referência): os abates/h de verdade por hunt e por pokémon. NÃO muda o ranking —
// senão a hunt em que você está caçando ganharia ou perderia posição só por isso.
//
// A geometria das ondas cheias (a distância até cada selvagem novo), que entrava no cálculo até a
// versão 1.0.7, saiu: o ritmo das hunts em bandos é do mapa e foi medido em jogo (ver engine.js).
// As amostras antigas são apagadas do banco; o ritmo, medido desde 28/10/2026, fica.
//
// Tudo fica no localStorage do pokeidle.io, numa chave só da extensão.
(function (root) {
  'use strict';
  const PIH = (root.__pokeidleHunt ??= {});
  const CHAVE = 'pokeidle-hunt:geo:v4';
  const ANTIGAS = ['pokeidle-hunt:geo:v3', 'pokeidle-hunt:geo:v2', 'pokeidle-hunt:geo:v1'];

  let banco = ler();
  function ler() {
    try {
      for (const chave of ANTIGAS) localStorage.removeItem?.(chave);
      const b = JSON.parse(localStorage.getItem(CHAVE)) ?? { hunts: {} };
      for (const h of Object.values(b.hunts ?? {})) { delete h.amostras; delete h.medidoEm; }
      return b;
    } catch { return { hunts: {} }; }
  }
  let gravarTimer = null;
  function gravar() {
    clearTimeout(gravarTimer);
    gravarTimer = setTimeout(() => {
      try { localStorage.setItem(CHAVE, JSON.stringify(banco)); } catch { /* cota cheia: segue sem */ }
    }, 2000);
  }

  // O pacote vem com chaves curtas (ver `mesclar` em campo.mjs do jogo): `s` slot, `x` morto.
  // Boneco de XP Share, pet em treino, NPCs e treinadores não são selvagens.
  const naoSelvagem = (m) => m.bn || m.ti !== undefined || m.cura || m.tm || m.depot || m.tr;

  // ---- sessão atual -----------------------------------------------------------------------
  // { slug, pkId, inicio, abates, slots: Map(slot → vivo?) }
  let sessao = null;

  function fecharSessao() {
    if (!sessao) return;
    const seg = (Date.now() - sessao.inicio) / 1000;
    if (seg >= 60 && sessao.abates > 0) {
      const h = (banco.hunts[sessao.slug] ??= {});
      const r = ((h.ritmo ??= {})[sessao.pkId ?? '?'] ??= { abates: 0, seg: 0 });
      r.abates += sessao.abates;
      r.seg += seg;
      gravar();
    }
    sessao = null;
  }

  // O ritmo é guardado por pokémon. Os discos (AoE, TM Elemental) não entram na conta desde
  // 18/10/2026, então também não separam a medição.
  const chaveDoPokemon = (pk) => (pk?.id ? String(pk.id) : null);
  let pkAtivoId = null;
  PIH.on?.('estado', (eu) => {
    const chave = chaveDoPokemon(eu?.pokemons?.find((p) => p.id === eu.activeId));
    if (chave !== pkAtivoId) {
      fecharSessao();
      pkAtivoId = chave;
    }
  });

  PIH.on?.('campo.init', (m) => {
    fecharSessao();
    if (!m?.slug || m.centro || m.pvp || m.casa != null) return;
    if (m.mapa && banco.hunts[m.slug]?.mapa !== m.mapa) {
      (banco.hunts[m.slug] ??= {}).mapa = m.mapa;
      gravar();
    }
    sessao = { slug: m.slug, pkId: pkAtivoId, inicio: Date.now(), abates: 0, slots: new Map() };
    for (const x of m.mobs ?? []) if (!naoSelvagem(x)) sessao.slots.set(x.s, !x.x);
  });

  PIH.on?.('campo', (m) => {
    const s = sessao;
    if (!s) return;
    for (const x of m.mobs ?? []) {
      if (naoSelvagem(x)) continue;
      const vivoAntes = s.slots.get(x.s);
      if (x.x) {
        if (vivoAntes) s.abates++;
        s.slots.set(x.s, false);
      } else if (!s.slots.has(x.s) || (vivoAntes === false && x.x === false)) {
        s.slots.set(x.s, true); // slot novo, ou um corpo que voltou à vida
      }
    }
    for (const slot of m.fora ?? []) s.slots.delete(slot);
  });

  addEventListener('pagehide', fecharSessao);

  PIH.geo = {
    /** O mapa que o servidor mandou quando você entrou nesta hunt, ou null. */
    mapaDa: (slug) => banco.hunts[slug]?.mapa ?? null,
    chaveDoPokemon,
    /** Abates/h medidos com este pokémon nesta hunt (só com 10+ min acumulados). Só referência. */
    ritmoMedido(slug, chave) {
      const r = banco.hunts[slug]?.ritmo?.[chave];
      return r && r.seg >= 600 ? r.abates * 3600 / r.seg : null;
    },
    /** Em quantas hunts você já entrou desde que a extensão guarda o mapa. */
    huntsComMapa: () => Object.values(banco.hunts).filter((h) => h.mapa).length,
  };
})(globalThis);


// === ui.js ===
// A tela: o botão /hunt ao lado do nome do pokémon em campo e o painel "Onde caçar?".
//
// O card "Em campo" do jogo (`#ativo-card`) é redesenhado inteiro a cada atualização do
// estado. Por isso a barra /hunt NÃO mora dentro dele: fica no painel em volta (`#p-ativo`),
// que não é redesenhado, logo antes do card — no fluxo, acima do pokémon, na largura da caixa.
//
// Ao abrir o jogo, a extensão confere onde está o pokémon ativo. Se o card não estiver onde
// esperamos (layout novo do jogo), ela pede um clique nele e lembra a escolha.
(function (root) {
  'use strict';
  const PIH = (root.__pokeidleHunt ??= {});
  if (!PIH.on || !PIH.engine) return;

  const CHAVE_PREFS = 'pokeidle-hunt:prefs:v1';
  const CHAVE_ALVO = 'pokeidle-hunt:alvo:v1';
  const POR_PAGINA = 25;
  // O apoio ao dev: a página pública na Livepix e o QR dela (mesmo conteúdo; vetor em store/apoio).
  const URL_APOIO = 'https://livepix.gg/crispim';
  const URL_WISHLIST = 'https://pokeidle-gg.pages.dev/#wishlist';
  // Decisão de 18/10/2026: os discos não entram na conta (ver o cabeçalho de engine.js).
  const AVISO_DISCOS = 'Não consideramos o uso de AoE e TM Elemental (Z-Move).';
  const QR_APOIO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 33" shape-rendering="crispEdges"><path fill="#ffffff" d="M0 0h33v33H0z"/><path stroke="#000000" d="M4 4.5h7m1 0h4m1 0h2m3 0h7M4 5.5h1m5 0h1m1 0h3m1 0h1m3 0h1m1 0h1m5 0h1M4 6.5h1m1 0h3m1 0h1m1 0h1m2 0h4m3 0h1m1 0h3m1 0h1M4 7.5h1m1 0h3m1 0h1m2 0h1m3 0h2m1 0h1m1 0h1m1 0h3m1 0h1M4 8.5h1m1 0h3m1 0h1m1 0h3m2 0h2m1 0h1m1 0h1m1 0h3m1 0h1M4 9.5h1m5 0h1m4 0h1m1 0h2m1 0h1m1 0h1m5 0h1M4 10.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M13 11.5h3m1 0h1m1 0h2M4 12.5h1m2 0h7m4 0h1m1 0h2m2 0h1m1 0h3M4 13.5h1m4 0h1m2 0h3m3 0h3m2 0h5M4 14.5h2m1 0h1m2 0h10m1 0h1m2 0h2m2 0h1M4 15.5h1m1 0h1m1 0h2m1 0h1m2 0h3m1 0h1m1 0h1m1 0h7M4 16.5h1m4 0h3m2 0h1m1 0h1m5 0h2m4 0h1M4 17.5h4m6 0h1m1 0h2m1 0h3m2 0h1m2 0h1M4 18.5h3m1 0h1m1 0h1m1 0h1m6 0h1m1 0h2m1 0h5M4 19.5h1m1 0h4m2 0h3m3 0h1m1 0h1m2 0h1m1 0h2m1 0h1M4 20.5h1m4 0h3m1 0h1m2 0h2m2 0h5m1 0h2M12 21.5h3m2 0h1m2 0h1m3 0h1m1 0h2M4 22.5h7m1 0h1m1 0h2m1 0h2m1 0h1m1 0h1m1 0h1m3 0h1M4 23.5h1m5 0h1m1 0h1m1 0h1m1 0h2m1 0h2m3 0h1M4 24.5h1m1 0h3m1 0h1m1 0h2m1 0h2m1 0h7M4 25.5h1m1 0h3m1 0h1m1 0h2m1 0h1m4 0h3m4 0h2M4 26.5h1m1 0h3m1 0h1m2 0h7m1 0h1m2 0h5M4 27.5h1m5 0h1m2 0h1m1 0h2m1 0h2m2 0h3m1 0h3M4 28.5h7m1 0h4m4 0h1m1 0h1m2 0h1m2 0h1"/></svg>';

  const lerJson = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) ?? padrao; } catch { return padrao; } };
  const gravarJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } };

  let prefs = { ordem: 'xp', soLiberadas: true, regiao: '', ...lerJson(CHAVE_PREFS, {}) };
  delete prefs.comPocao; // a poção agora vale sempre (o padrão do motor), mesmo para quem a desmarcou numa versão antiga
  let welcome = null;
  let eu = null;

  // ---- formatação ------------------------------------------------------------------------
  const nf = new Intl.NumberFormat('pt-BR');
  const nfc = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
  const num = (v) => nf.format(Math.round(v));
  const curto = (v) => (Math.abs(v) >= 10000 ? nfc.format(v) : num(v));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const REGIAO = { kanto: 'Kanto', johto: 'Johto', outland: 'Outland', orre: 'Orre', hoenn: 'Hoenn', sinnoh: 'Sinnoh', unova: 'Unova', kalos: 'Kalos', alola: 'Alola', galar: 'Galar', paldea: 'Paldea' };
  const regiao = (r) => REGIAO[r] ?? (r ? r[0].toUpperCase() + r.slice(1) : '');
  const segundos = (s) => (s < 1 ? '<1 s' : s < 60 ? `${s.toFixed(1).replace('.', ',')} s` : `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`);

  const pkAtivo = () => eu?.pokemons?.find((p) => p.id === eu.activeId) ?? null;

  // ---- o botão ---------------------------------------------------------------------------
  function criarBotao(extra = '') {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pih-btn ${extra}`.trim();
    b.textContent = '/hunt';
    return b;
  }

  const botao = criarBotao('pih-barra');
  botao.title = 'Onde caçar? — as melhores hunts para o seu pokémon em campo';
  botao.setAttribute('aria-label', botao.title);
  botao.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    alternarPainel();
  });

  let alvoManual = lerJson(CHAVE_ALVO, null); // seletor escolhido pelo jogador, se o padrão falhar

  function ancora() {
    if (alvoManual) {
      const el = document.querySelector(alvoManual);
      if (el) return { modo: 'manual', el };
    }
    const card = document.getElementById('ativo-card');
    const painel = document.getElementById('p-ativo');
    const nome = card?.querySelector('.ativo-nome');
    if (card && painel && nome && !card.classList.contains('vazio')) return { modo: 'padrao', card, nome };
    return null;
  }

  let quadro = 0;
  function posicionarBotao() {
    cancelAnimationFrame(quadro);
    quadro = requestAnimationFrame(() => {
      const a = ancora();
      if (!a) { botao.hidden = true; return; }
      botao.hidden = false;
      if (a.modo === 'padrao') {
        botao.classList.remove('pih-fixo');
        botao.classList.add('pih-barra');
        botao.style.left = botao.style.top = botao.style.width = '';
        if (a.card.previousElementSibling !== botao) a.card.before(botao);
      } else {
        // Reserva: flutua logo acima do ponto que o jogador apontou.
        botao.classList.remove('pih-barra');
        botao.classList.add('pih-fixo');
        if (botao.parentElement !== document.body) document.body.appendChild(botao);
        const r = a.el.getBoundingClientRect();
        botao.style.left = `${r.left}px`;
        botao.style.top = `${Math.max(4, r.top - botao.offsetHeight - 6)}px`;
      }
    });
  }

  function vigiarCard() {
    const painel = document.getElementById('p-ativo') ?? document.body;
    new MutationObserver(posicionarBotao).observe(painel, { childList: true, subtree: true });
    addEventListener('resize', posicionarBotao);
    addEventListener('scroll', posicionarBotao, true);
    // Rede de segurança para mudanças de layout que não mexem no card (abrir/fechar painéis).
    setInterval(posicionarBotao, 1500);
  }

  // ---- verificação: onde está o pokémon ativo? -------------------------------------------
  let aviso = null;
  function mostrarAviso(html, { fechaEm = 0, acao = null } = {}) {
    aviso?.remove();
    aviso = document.createElement('div');
    aviso.className = 'pih-aviso';
    aviso.append(criarBotao());
    const txt = document.createElement('div');
    txt.innerHTML = html;
    aviso.append(txt);
    if (acao) aviso.append(acao);
    const x = document.createElement('button');
    x.className = 'pih-x';
    x.textContent = '×';
    x.onclick = () => { aviso?.remove(); aviso = null; pararMira(); };
    aviso.append(x);
    document.body.append(aviso);
    if (fechaEm) setTimeout(() => { if (aviso?.contains(txt)) { aviso.remove(); aviso = null; } }, fechaEm);
  }

  let verificado = false;
  function verificar(tentativa = 0) {
    if (verificado || !eu) return;
    const pk = pkAtivo();
    if (!pk) {
      if (tentativa === 0) mostrarAviso('Coloque um pokémon <b>em campo</b> para usar o <b>/hunt</b>.', { fechaEm: 8000 });
      setTimeout(() => verificar(1), 3000);
      return;
    }
    const a = ancora();
    const texto = a?.modo === 'padrao' ? a.nome.textContent : a?.el?.textContent;
    if (a && texto?.includes(pk.nome)) {
      verificado = true;
      posicionarBotao();
      mostrarAviso(`Pokémon em campo encontrado: <b>${esc(pk.nome)}</b>. O <b>/hunt</b> está logo acima dele.`, { fechaEm: 4500 });
      return;
    }
    if (tentativa < 12) { setTimeout(() => verificar(tentativa + 1), 500); return; }
    const mirar = document.createElement('button');
    mirar.className = 'pih-mais';
    mirar.style.width = 'auto';
    mirar.textContent = 'Apontar';
    mirar.onclick = iniciarMira;
    mostrarAviso(`<b>Onde está seu Pokémon ativo?</b><br>Não achei o card de <b>${esc(pk.nome)}</b>. Clique em “Apontar” e depois no nome dele.`, { acao: mirar });
  }

  let mirando = null;
  function iniciarMira() {
    document.documentElement.classList.add('pih-mirando');
    let marcado = null;
    const sobre = (ev) => {
      marcado?.classList.remove('pih-alvo');
      marcado = ev.target instanceof Element && !ev.target.closest('.pih-aviso') ? ev.target : null;
      marcado?.classList.add('pih-alvo');
    };
    const clique = (ev) => {
      if (!marcado) return;
      ev.preventDefault();
      ev.stopPropagation();
      alvoManual = seletorDe(marcado);
      gravarJson(CHAVE_ALVO, alvoManual);
      pararMira();
      verificado = true;
      posicionarBotao();
      mostrarAviso('Pronto: o <b>/hunt</b> vai ficar logo acima deste ponto.', { fechaEm: 4000 });
    };
    addEventListener('mouseover', sobre, true);
    addEventListener('click', clique, true);
    mirando = () => {
      removeEventListener('mouseover', sobre, true);
      removeEventListener('click', clique, true);
      marcado?.classList.remove('pih-alvo');
    };
  }
  function pararMira() {
    document.documentElement.classList.remove('pih-mirando');
    mirando?.();
    mirando = null;
  }
  function seletorDe(el) {
    const partes = [];
    while (el && el !== document.body) {
      if (el.id) { partes.unshift(`#${CSS.escape(el.id)}`); break; }
      const i = [...el.parentElement.children].indexOf(el) + 1;
      partes.unshift(`${el.tagName.toLowerCase()}:nth-child(${i})`);
      el = el.parentElement;
    }
    return partes.join(' > ');
  }

  // ---- o painel --------------------------------------------------------------------------
  let painel = null;
  let mostrando = POR_PAGINA;
  let assinatura = '';
  let ultimo = null; // o último cálculo, para trocar de região sem simular de novo (~0,6 s)
  let apoioAberto = false; // o balão de apoio começa fechado a cada abertura do painel
  let vendoWishlist = false;
  let wishlist = null; // a última resposta da ponte: { dados } ou { erro }; null enquanto busca
  let especiesPorNome = null; // os PINs dizem a espécie pelo nome; preenchido quando o catálogo do jogo carrega

  function alternarPainel() {
    if (painel) return fecharPainel();
    painel = document.createElement('div');
    painel.className = 'pih-painel';
    painel.setAttribute('role', 'dialog');
    painel.setAttribute('aria-label', 'Onde caçar?');
    document.body.append(painel);
    mostrando = POR_PAGINA;
    apoioAberto = false;
    posicionarPainel();
    desenhar();
    addEventListener('keydown', aoTeclar, true);
    setTimeout(() => addEventListener('pointerdown', aoClicarFora, true));
  }
  function fecharPainel() {
    painel?.remove();
    painel = null;
    assinatura = '';
    vendoWishlist = false;
    removeEventListener('keydown', aoTeclar, true);
    removeEventListener('pointerdown', aoClicarFora, true);
  }
  const aoTeclar = (ev) => { if (ev.key === 'Escape') fecharPainel(); };
  const aoClicarFora = (ev) => { if (painel && !painel.contains(ev.target) && ev.target !== botao) fecharPainel(); };

  function posicionarPainel() {
    if (!painel) return;
    const base = document.getElementById('p-ativo')?.getBoundingClientRect() ?? botao.getBoundingClientRect();
    const larg = painel.offsetWidth || 640;
    let left = base.right + 10;
    if (left + larg > innerWidth - 8) left = Math.max(8, innerWidth - larg - 8);
    const top = Math.min(Math.max(8, base.top - 60), Math.max(8, innerHeight - painel.offsetHeight - 8));
    painel.style.left = `${left}px`;
    painel.style.top = `${top}px`;
  }

  function cabecalho(pk) {
    const q = Number(pk?.quality ?? pk?.qualidade);
    const iv = pk?.ivs ? Object.values(pk.ivs).reduce((s, x) => s + (Number(x) || 0), 0) : null;
    const sub = pk
      ? [esc(pk.nome), `Nv ${num(pk.level)}`, `P${pk.potencia ?? 1}`, Number.isFinite(q) ? `Q ${q.toFixed(3).replace('.', ',')}` : '', iv != null ? `IV ${iv}` : '']
        .filter(Boolean).join(' · ')
      : 'nenhum pokémon em campo';
    return `<div class="pih-cab">
      <span class="pih-btn" aria-hidden="true">/hunt</span>
      <div class="pih-titulo"><h3>${vendoWishlist ? '✨ Shiny WishList' : 'Onde caçar?'} <span class="pih-credito">made by Liang</span></h3><small>${sub}</small></div>
      <button type="button" class="pih-btn pih-apoiar" data-acao="wishlist" title="${vendoWishlist ? 'Voltar para o ranking de hunts' : 'Os Shiny que os jogadores querem comprar'}">${vendoWishlist ? '← Onde caçar?' : '✨ Shiny WishList'}</button>
      <button type="button" class="pih-btn pih-apoiar" data-acao="apoiar" aria-expanded="${apoioAberto}" aria-controls="pih-apoio" title="Apoie o dev!">Apoie o dev!</button>
      <button type="button" class="pih-fechar" data-acao="fechar" title="Fechar (Esc)">×</button>
    </div>
    ${blocoApoio()}`;
  }

  /** O balão de apoio: QR e link da Livepix, aberto pelo botão dourado do cabeçalho. */
  function blocoApoio() {
    return `<div class="pih-vao pih-apoio" id="pih-apoio"${apoioAberto ? '' : ' hidden'}>
      <a class="pih-apoio-qr" href="${URL_APOIO}" target="_blank" rel="noopener noreferrer" title="Abrir a página de apoio na Livepix">${QR_APOIO}</a>
      <div>
        <b>Apoie o dev!</b>
        <p>Escaneie o QR com o celular ou abra o link: o Pix vai pela Livepix, valor livre.</p>
        <p>Caso queira, mande uma mensagem pra mim, Liang, com seu @ no Discord e seu nick no jogo! Agradeço pelo apoio!</p>
        <a class="pih-btn pih-apoio-link" href="${URL_APOIO}" target="_blank" rel="noopener noreferrer">Abrir livepix.gg/crispim ↗</a>
      </div>
    </div>`;
  }

  function blocoStats(pk) {
    if (!pk?.stats) return '';
    const rot = [['hp', 'HP'], ['atk', 'ATK'], ['def', 'DEF'], ['spAtk', 'SP.ATK'], ['spDef', 'SP.DEF'], ['speed', 'SPD']];
    return `<div class="pih-vao pih-stats">${rot.map(([k, r]) => `
      <div class="pih-stat"><b>${r}</b><span>${num(pk.stats[k] ?? 0)}</span>${pk.ivs?.[k] != null ? `<i>IV ${pk.ivs[k]}</i>` : ''}</div>`).join('')}
    </div>`;
  }

  /** O pódio de ginásio que entrou no dano deste pokémon (jogo 1.377.0), se ele está num. */
  function blocoPodio(p) {
    if (!p) return '';
    const medalha = ['👑', '🥈', '🥉'][p.lugar - 1] ?? '';
    return `<div class="pih-vao pih-bonus" title="Quem está no pódio de um ginásio bate mais forte na hunt com todo pokémon daquele tipo: +25% o líder, +10% o 2º, +5% o 3º (sem empilhar entre os dois tipos)">
      <b>Pódio de ginásio:</b> ${medalha} ${p.lugar}º lugar <span class="pih-bonus-total">+${p.pct}% de dano</span>
    </div>`;
  }

  /** Os bônus de XP que entraram na conta (multiplicam-se, como no jogo). */
  function blocoBonus(b) {
    if (!b) return '';
    const x = (v) => `×${v.toFixed(2).replace('.', ',')}`;
    const fmt = (i) => `${esc(i.nome)} ${i.mult >= 2 ? x(i.mult) : `+${(Math.round((i.mult - 1) * 1000) / 10).toString().replace('.', ',')}%`}`;
    const lista = b.itens.length ? b.itens.map(fmt).join(' · ') : 'nenhum bônus ativo';
    const iguais = Math.abs(b.pokemon - b.treinador) < 1e-6;
    return `<div class="pih-vao pih-bonus" title="Os bônus se multiplicam entre si (Pokepédia → Níveis e XP)">
      <b>Bônus de XP:</b> ${lista}
      <span class="pih-bonus-total">${iguais ? x(b.pokemon) : `pokémon ${x(b.pokemon)} · treinador ${x(b.treinador)}`}</span>
    </div>`;
  }

  /** O aviso fixo do painel: o que a conta deixa de fora de propósito. */
  const blocoAviso = () => `<div class="pih-nota" role="note">⚠ ${AVISO_DISCOS}</div>`;

  function controles() {
    return `<div class="pih-ctrl">
      <span class="pih-seg">
        <button type="button" data-ordem="xp" class="${prefs.ordem === 'xp' ? 'on' : ''}">XP/h</button>
        <button type="button" data-ordem="ouro" class="${prefs.ordem === 'ouro' ? 'on' : ''}">Ouro/h</button>
      </span>
      <label><input type="checkbox" data-pref="soLiberadas" ${prefs.soLiberadas ? 'checked' : ''}> só hunts liberadas</label>
      <button type="button" class="pih-shiny" data-acao="wishlist" title="Os Shiny que os jogadores querem comprar">✨ SHINY ✨</button>
      ${prefs.ordem === 'ouro' ? '<button type="button" class="pih-ajuda" data-acao="ajuda-ouro" aria-expanded="false" aria-controls="pih-dica-ouro" title="O que entra no ouro/h">?</button>' : ''}
    </div>
    ${prefs.ordem === 'ouro' ? `<div class="pih-vao pih-dica" id="pih-dica-ouro" hidden>
      O ouro/h é o <b>ouro de cada abate</b>, que desde 15/10/2026 já traz o <b>bônus de loot</b> (os itens de venda ao NPC saíram do jogo).
      O Loot Boost e a <b>venda dos pokémon capturados</b> não entram no cálculo.
    </div>` : ''}`;
  }

  function risco(l) {
    if (l.umHit) return '<span class="pih-perigo" title="Um golpe do selvagem passa do seu HP">☠ 1 hit</span>';
    if (l.mortesH >= 0.5) return `<span class="pih-perigo" title="Mortes estimadas por hora">☠ ${l.mortesH.toFixed(1).replace('.', ',')}/h</span>`;
    const pct = Math.round(l.hitPct * 100);
    const oque = `O pior golpe do selvagem tira ${pct}% do seu HP`;
    if (pct >= 50) return `<span class="pih-alerta" title="${oque}">⚠ ${pct}%</span>`;
    return `<span class="pih-ok" title="${oque}">✓ ${pct}%</span>`;
  }

  // Abates/h: o número do mapa medido, ou ≈ com a faixa e, no título, de onde veio a estimativa.
  const faixaDe = (l) => l.kphFaixa ?? [l.kph, l.kph];
  function porqueEstimado(l) {
    if (l.ritmo === 'bioma') return `Hunt ainda não medida: o mapa que o jogo costuma dar às hunts de ${nomeDoTipo(l.bioma.tipo)} (${l.mapa}, o de ${l.bioma.acertos} das ${l.bioma.de} hunts vistas)`;
    if (l.ritmo === 'faixa') return `Mapa${l.mapa ? ` ${l.mapa}` : ''} ainda não medido: a mediana dos mapas medidos`;
    return 'Sem a tabela de ritmo: um tempo padrão por abate';
  }
  function abates(l) {
    if (l.ritmo === 'medido') return `<span title="${esc(`Ritmo medido no mapa ${l.mapa}${l.indireto ? ' (com quase um golpe por abate; o golpe a mais foi descontado)' : ''}`)}">${num(l.kph)}</span>`;
    const [lo, hi] = faixaDe(l);
    return `<span title="${esc(`${porqueEstimado(l)}. Faixa: ${num(lo)}–${num(hi)} abates/h.`)}"><small class="pih-dim">≈</small>${num(l.kph)}<small class="pih-faixa">${num(lo)}–${num(hi)}</small></span>`;
  }

  function linhaHtml(l, i) {
    const medido = l.kphMedido != null
      ? `<span class="pih-medido" title="Você fez ${num(l.kphMedido)} abates/h aqui com este pokémon (referência; não muda o ranking)">●</span>`
      : '';
    const cls = [i === 0 && !l.inviavel ? 'pih-top' : '', l.liberada ? '' : 'pih-bloq'].filter(Boolean).join(' ');
    const golpe = l.melhorGolpe ? `${esc(l.melhorGolpe.nome)} ×${l.efetividade.toFixed(2).replace('.', ',')}` : '';
    if (l.inviavel) {
      return `<tr class="${cls}"><td class="pih-pos">${i + 1}</td>
        <td class="pih-hunt"><div class="pih-com-arte">${arteDaHunt(l)}<div><b>${esc(l.nome)}</b><small>${regiao(l.regiao)} · Nv ${num(l.nivel)}</small></div></div></td>
        <td colspan="5"><span class="pih-perigo">não mata o selvagem</span></td></tr>`;
    }
    return `<tr class="${cls}" title="${esc(golpe)}">
      <td class="pih-pos">${i + 1}</td>
      <td class="pih-hunt"><div class="pih-com-arte">${arteDaHunt(l)}<div><b>${esc(l.nome)}</b><small>${regiao(l.regiao)} · Nv ${num(l.nivel)}${l.liberada ? '' : ' · 🔒'}</small></div></div></td>
      <td>${curto(prefs.ordem === 'ouro' ? l.ouroH : l.xpPokemonH)}</td>
      <td>${medido}${abates(l)}</td>
      <td>${segundos(l.ttk)}</td>
      <td>${risco(l)}</td>
      <td>${curto(prefs.ordem === 'ouro' ? l.xpPokemonH : l.ouroH)}</td>
    </tr>`;
  }

  // A tipagem do dia sazonal, como o jogo manda no estado (o mesmo teste do app.js deles).
  const TIPOS_DO_DIA = ['NORMAL', 'FIRE', 'WATER', 'GRASS', 'ELECTRIC', 'ICE', 'FIGHTING', 'POISON', 'GROUND',
    'FLYING', 'PSYCHIC', 'BUG', 'ROCK', 'GHOST', 'DRAGON', 'DARK', 'STEEL', 'FAIRY'];
  const tipoDoDia = () => (TIPOS_DO_DIA.includes(eu?.diaSazonal?.tipo) ? eu.diaSazonal.tipo : null);
  const nomeDoTipo = (t) => t[0] + t.slice(1).toLowerCase();

  // Um botão por aba do mapa que tem hunt no ranking, com o melhor valor dela: quem quer ficar numa
  // região vê ali o que ela rende e, num clique, o ranking só dela.
  function regioes(todas, vista) {
    const ouro = prefs.ordem === 'ouro';
    const valor = (l) => (ouro ? l.ouroH : l.xpPokemonH);
    const melhor = new Map();
    for (const l of todas) if (!l.inviavel && !melhor.has(l.regiao)) melhor.set(l.regiao, l);
    const botao = (id, rotulo, top) => {
      const titulo = top ? `Melhor ${id ? `em ${rotulo}` : 'de todas'}: ${top.nome}, ${curto(valor(top))} ${ouro ? 'ouro/h' : 'XP/h'}` : `Nenhuma hunt de ${rotulo} mata o selvagem`;
      return `<button type="button" data-regiao="${id}" class="${vista === id ? 'on' : ''}" aria-pressed="${vista === id}" title="${esc(titulo)}">${esc(rotulo)} <small>${top ? curto(valor(top)) : '—'}</small></button>`;
    };
    const presentes = PIH.engine.REGIOES_DO_MAPA.filter((g) => todas.some((l) => l.regiao === g.id));
    return `<div class="pih-regioes" role="group" aria-label="Região do mapa">${botao('', 'Todas', todas.find((l) => !l.inviavel))}${presentes.map((g) => botao(g.id, g.rotulo, melhor.get(g.id))).join('')}</div>`;
  }

  function corpo(r, jogo) {
    const todas = r.linhas;
    if (!todas.length) return '<div class="pih-erro">Nenhuma hunt liberada para o seu nível de treinador.</div>';
    // A região escolhida que sumiu do ranking (outro nível, "só hunts liberadas") volta para "Todas".
    const vista = todas.some((l) => l.regiao === prefs.regiao) ? prefs.regiao : '';
    const linhas = vista ? todas.filter((l) => l.regiao === vista) : todas;
    const top = linhas.find((l) => !l.inviavel);
    const outro = prefs.ordem === 'ouro' ? 'XP/h' : 'Ouro/h';
    const melhor = top ? `<div class="pih-vao pih-melhor">
        <span class="pih-coroa">👑</span>
        ${arteDaHunt(top, 40)}
        <div><strong>${esc(top.nome)}</strong> <span class="pih-dim">${regiao(top.regiao)} · Nv ${num(top.nivel)}</span><br>
        ${curto(top.xpPokemonH)} XP/h do pokémon · ${curto(top.xpTreinadorH)} XP/h do treinador · ${curto(top.ouroH)} ouro/h · ${top.ritmo === 'medido' ? '' : '≈'}${num(top.kph)} abates/h${top.melhorGolpe ? ` · ${esc(top.melhorGolpe.nome)}` : ''}</div>
      </div>` : '';
    return `${regioes(todas, vista)}${melhor}
      <div class="pih-vao pih-lista"><table class="pih-tab">
        <thead><tr><th>#</th><th>Hunt</th><th>${prefs.ordem === 'ouro' ? 'Ouro/h' : 'XP/h'}</th><th>Abates/h</th><th>Mata em</th><th>Risco</th><th>${outro}</th></tr></thead>
        <tbody>${linhas.slice(0, mostrando).map(linhaHtml).join('')}</tbody>
      </table>
      ${linhas.length > mostrando ? `<button type="button" class="pih-mais" data-acao="mais">mostrar mais (${linhas.length - mostrando})</button>` : ''}
      </div>
      <div class="pih-rodape">Dados do jogo ${jogo.versao ? `v${esc(jogo.versao)}` : 'no ar'} · ${r.linhas.length} de ${r.total} hunts${vista ? ` (${linhas.length} em ${regiao(vista)})` : ''} · cálculo em ${r.ms} ms · ritmo do mapa medido em jogo em ${r.linhas.filter((l) => l.ritmo === 'medido').length} delas (≈ estimado)${tipoDoDia() ? ` · dia de ${nomeDoTipo(tipoDoDia())}: os pokémon do tipo ficam 2× mais fortes` : ''} · com poção automática · a pé, sem bicicleta · ● = você já caçou aqui (passe o mouse)</div>`;
  }

  // ---- artes dos pokémon -----------------------------------------------------------------
  // Vêm do próprio jogo: a CSP dele libera imagem e fetch do mesmo domínio. O tracker diz, por looktype, em que atlas está
  // o retrato e em que janela dele. A tela desenha a caixa vazia, e a imagem entra no lugar quando fica pronta, sem
  // redesenhar a lista: assim ela não pula de volta para o topo no meio da rolagem.
  const ARTES_POR_PEDIDO = 40;
  const ALFA_VISIVEL = 16; // abaixo disso é sobra de sombra do atlas, não o contorno do bicho
  const LADO_DA_ARTE = 88; // o maior tamanho em tela (44 px), no dobro para não borrar em tela de alta densidade
  const artes = new Map(); // looktype → imagem pronta; fica entre aberturas para a lista não piscar
  const artesPedidas = new Set();

  function arteHtml(looktype, px) {
    const lt = Number(looktype);
    if (!lt) return `<span class="pih-arte" style="--px:${px}px"></span>`;
    return `<span class="pih-arte" style="--px:${px}px" data-look="${lt}">${artes.has(lt) ? `<img src="${artes.get(lt)}" alt="">` : ''}</span>`;
  }
  const arteDaHunt = (l, px = 30) => arteHtml(ultimo?.jogo?.especies.get(l.pokeId)?.looktype, px);

  async function pintarArtes() {
    const faltam = [...new Set([...(painel?.querySelectorAll('.pih-arte[data-look]:empty') ?? [])].map((el) => Number(el.dataset.look)))].filter((lt) => !artesPedidas.has(lt));
    for (const lt of faltam) artesPedidas.add(lt);
    for (let i = 0; i < faltam.length; i += ARTES_POR_PEDIDO) {
      const lote = faltam.slice(i, i + ARTES_POR_PEDIDO);
      try {
        const r = await fetch(`/tracker/api/sprites?lt=${lote.join(',')}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const { retratos = {} } = await r.json();
        await Promise.all(lote.map(async (lt) => {
          const arte = retratos[lt]?.img ? await recortarArte(retratos[lt]).catch(() => null) : null;
          if (!arte) return;
          artes.set(lt, arte);
          painel?.querySelectorAll(`.pih-arte[data-look="${lt}"]`).forEach((el) => { el.innerHTML = `<img src="${arte}" alt="">`; });
        }));
      } catch (e) {
        for (const lt of lote) artesPedidas.delete(lt);
        console.warn('[pokeidle-hunt] artes dos pokémon:', e);
      }
    }
  }

  // A janela do atlas tem o bicho num canto, cercado de transparência, e cada espécie ocupa um pedaço dela. Recorta pelo
  // contorno para todas ficarem do mesmo tamanho. A imagem é do mesmo domínio, então o canvas pode ler os pixels.
  async function recortarArte({ img, x, y, w, h }) {
    const atlas = new Image();
    atlas.src = img;
    await atlas.decode();
    const janela = document.createElement('canvas');
    janela.width = w;
    janela.height = h;
    const g = janela.getContext('2d', { willReadFrequently: true });
    g.drawImage(atlas, x, y, w, h, 0, 0, w, h);
    const { data } = g.getImageData(0, 0, w, h);
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        if (data[(py * w + px) * 4 + 3] <= ALFA_VISIVEL) continue;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px);
        y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      }
    }
    if (x1 < 0) return null;
    const largura = x1 - x0 + 1;
    const altura = y1 - y0 + 1;
    const saida = document.createElement('canvas');
    saida.width = saida.height = LADO_DA_ARTE;
    const k = LADO_DA_ARTE / Math.max(largura, altura);
    const ctx = saida.getContext('2d');
    ctx.imageSmoothingEnabled = k < 1; // ampliar pixel art sem borrar; reduzir, com suavização
    ctx.drawImage(janela, x0, y0, largura, altura, (LADO_DA_ARTE - largura * k) / 2, (LADO_DA_ARTE - altura * k) / 2, largura * k, altura * k);
    return saida.toDataURL();
  }

  // ---- Shiny WishList --------------------------------------------------------------------
  const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const ETAPA_NOME = { especie: 'na própria espécie', ultima: 'na última evolução' };

  // O prazo cobre a variante userscript, que não tem ponte: ele vence, e sobra o link para o site.
  function pedirWishlist() {
    return new Promise((resolve) => {
      const id = String(Math.random());
      const fim = (r) => { clearTimeout(prazo); removeEventListener('message', aoResponder); resolve(r); };
      const aoResponder = (ev) => { if (ev.source === root && ev.data?.tipo === 'pih:wishlist:lista' && ev.data.id === id) fim(ev.data); };
      const prazo = setTimeout(() => fim({ erro: 'sem resposta da ponte' }), 12000);
      addEventListener('message', aoResponder);
      postMessage({ tipo: 'pih:wishlist:pedir', id }, location.origin);
    });
  }

  async function abrirWishlist() {
    vendoWishlist = true;
    wishlist = null;
    desenhar();
    const r = await pedirWishlist();
    if (r.erro) console.warn('[pokeidle-hunt] Shiny WishList:', r.erro);
    wishlist = r;
    if (vendoWishlist) desenhar();
    if (!r.dados || especiesPorNome) return;
    try {
      const { especies } = await PIH.carregarJogo();
      especiesPorNome = new Map();
      for (const e of especies.values()) if (!especiesPorNome.has(e.name)) especiesPorNome.set(e.name, e);
      if (vendoWishlist && wishlist === r) desenhar();
    } catch (e) {
      console.warn('[pokeidle-hunt] catálogo para as artes da Shiny WishList:', e);
    }
  }

  // A arte shiny, como o `looktypeDe` do cliente; sem ela, a comum, que ainda mostra o bicho certo.
  function arteDoPin(p) {
    const e = especiesPorNome?.get(p.especie);
    return arteHtml(e ? welcome?.shinyLooks?.[e.pokeId] ?? welcome?.shinyLooksOutland?.[e.pokeId] ?? e.looktype : null, 44);
  }

  function exigenciasDoPin(p) {
    const regra = Number.isFinite(p.notaMinima) ? `Nota mínima ${nf.format(p.notaMinima)} ${ETAPA_NOME[p.etapa] ?? ''}`.trim() : '';
    return [regra, p.observacao].filter(Boolean).join(' · ') || 'Sem exigência';
  }

  function linhaDoPin(p, i) {
    return `<tr class="${i === 0 ? 'pih-wl-primeiro' : ''}">
      <td>${i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}</td>
      <td class="pih-hunt"><div class="pih-com-arte">${arteDoPin(p)}<div><b>✨ ${esc(p.especie)}</b><small>${esc(exigenciasDoPin(p))}</small></div></div></td>
      <td>${esc(p.nick)}</td>
      <td class="pih-wl-valor">${reais.format((Number(p.valorCentavos) || 0) / 100)}</td>
    </tr>`;
  }

  function blocoWishlist() {
    const aoSite = `<a class="pih-wl-link" href="${URL_WISHLIST}" target="_blank" rel="noopener noreferrer">Ver no site e como solicitar um Shiny Hunt</a>`;
    if (!wishlist) return `<div class="pih-carga">Buscando a lista…</div><div class="pih-rodape">${aoSite}</div>`;
    if (wishlist.erro) return `<div class="pih-erro">Não deu para carregar a lista aqui.</div><div class="pih-rodape">${aoSite}</div>`;
    const abertos = Array.isArray(wishlist.dados?.abertos) ? wishlist.dados.abertos : [];
    const lista = abertos.length
      ? `<div class="pih-vao pih-lista"><table class="pih-tab">
          <thead><tr><th>#</th><th>Shiny</th><th>Jogador</th><th>Pagou</th></tr></thead>
          <tbody>${abertos.map(linhaDoPin).join('')}</tbody>
        </table></div>`
      : '<div class="pih-carga">Ainda não há PINs.</div>';
    return `<div class="pih-wl-chamada"><b>Não sabe qual Shiny farmar? Veja aqui!</b> Cada PIN é um Shiny que um jogador quer comprar.</div>
      <div class="pih-vao pih-wl-volta">💰 <b>50% do valor volta</b> para quem fechar negócio: 25% para o anunciante e 25% para quem pegar o Shiny.</div>
      ${lista}
      <div class="pih-rodape">O valor é o que o jogador pagou para ficar listado. O preço do Shiny é negociado entre quem pediu e quem pegou. ${aoSite}</div>`;
  }

  async function desenhar() {
    if (!painel) return;
    const pk = pkAtivo();
    if (vendoWishlist) {
      painel.innerHTML = `${cabecalho(pk)}${blocoWishlist()}`;
      ligarEventos();
      posicionarPainel();
      return;
    }
    if (!welcome || !eu) {
      painel.innerHTML = `${cabecalho(pk)}<div class="pih-carga">Esperando o jogo conectar…</div>`;
      ligarEventos();
      return;
    }
    if (!pk) {
      painel.innerHTML = `${cabecalho(null)}<div class="pih-erro">Coloque um pokémon em campo para ver onde caçar.</div>`;
      ligarEventos();
      return;
    }
    painel.innerHTML = `${cabecalho(pk)}${blocoStats(pk)}${controles()}${blocoAviso()}<div class="pih-carga">Lendo o jogo…</div>`;
    ligarEventos();
    posicionarPainel();
    try {
      const jogo = await PIH.carregarJogo();
      if (!painel || vendoWishlist) return;
      const r = PIH.engine.analisar(pk, contexto(jogo, pk), { ...prefs, tipoDoDia: tipoDoDia() });
      ultimo = { r, jogo };
      painel.innerHTML = htmlDoCalculo();
      assinatura = assinaturaDe(pk);
    } catch (err) {
      console.error('[pokeidle-hunt]', err);
      if (!painel || vendoWishlist) return;
      painel.innerHTML = `${cabecalho(pk)}<div class="pih-erro">Não consegui calcular: ${esc(err.message)}</div>`;
    }
    ligarEventos();
    posicionarPainel();
  }

  function htmlDoCalculo() {
    const { r, jogo } = ultimo;
    return `${cabecalho(r.pokemon)}${blocoStats(r.pokemon)}${blocoBonus(r.bonusXp)}${blocoPodio(r.podio)}${controles()}${blocoAviso()}${corpo(r, jogo)}`;
  }

  function contexto(jogo, pk) {
    const chave = PIH.geo?.chaveDoPokemon(pk);
    return {
      mod: jogo.mod,
      especies: jogo.especies,
      hunts: welcome.hunts ?? [],
      consts: {
        tabelaTipos: welcome.tabelaTipos,
        ampliacaoHunt: welcome.ampliacaoHunt,
        multHpSelvagem: welcome.multHpSelvagem,
        multDanoSelvagem: welcome.multDanoSelvagem,
        tiposBoost: welcome.tiposBoost,
      },
      eu,
      ritmo: PIH.ritmo ?? null,
      mapaVisto: (slug) => PIH.geo?.mapaDa(slug) ?? null,
      ritmoMedido: (slug) => (chave ? PIH.geo?.ritmoMedido(slug, chave) ?? null : null),
    };
  }

  function ligarEventos() {
    if (!painel) return;
    painel.querySelector('[data-acao="fechar"]')?.addEventListener('click', fecharPainel);
    for (const b of painel.querySelectorAll('[data-acao="wishlist"]')) {
      b.addEventListener('click', () => {
        if (vendoWishlist) { vendoWishlist = false; desenhar(); } else abrirWishlist();
      });
    }
    pintarArtes();
    const apoiar = painel.querySelector('[data-acao="apoiar"]');
    apoiar?.addEventListener('click', () => {
      apoioAberto = !apoioAberto;
      painel.querySelector('#pih-apoio').hidden = !apoioAberto;
      apoiar.setAttribute('aria-expanded', String(apoioAberto));
      posicionarPainel();
    });
    painel.querySelector('[data-acao="mais"]')?.addEventListener('click', () => { mostrando += POR_PAGINA; desenhar(); });
    const ajuda = painel.querySelector('[data-acao="ajuda-ouro"]');
    ajuda?.addEventListener('click', () => {
      const dica = painel.querySelector('#pih-dica-ouro');
      dica.hidden = !dica.hidden;
      ajuda.setAttribute('aria-expanded', String(!dica.hidden));
    });
    for (const b of painel.querySelectorAll('[data-ordem]')) {
      b.addEventListener('click', () => { prefs.ordem = b.dataset.ordem; gravarJson(CHAVE_PREFS, prefs); desenhar(); });
    }
    for (const b of painel.querySelectorAll('[data-regiao]')) {
      b.addEventListener('click', () => {
        prefs.regiao = b.dataset.regiao;
        gravarJson(CHAVE_PREFS, prefs);
        mostrando = POR_PAGINA;
        if (!ultimo) return desenhar();
        painel.innerHTML = htmlDoCalculo();
        ligarEventos();
        posicionarPainel();
      });
    }
    for (const c of painel.querySelectorAll('[data-pref]')) {
      c.addEventListener('change', () => { prefs[c.dataset.pref] = c.checked; gravarJson(CHAVE_PREFS, prefs); desenhar(); });
    }
  }

  // Recalcula com o painel aberto só quando muda o que entra na conta (outro pokémon, nível
  // novo, refino) — não a cada golpe recebido. Os discos não entram, então não disparam.
  // O dia sazonal vira às 18:00 de Brasília com o jogador em campo: muda o ranking, então entra aqui.
  const assinaturaDe = (pk) => (pk ? `${pk.id}|${pk.level}|${JSON.stringify(pk.stats)}|${tipoDoDia() ?? ''}` : '');

  // ---- ligação com o jogo ----------------------------------------------------------------
  function preaquecer() {
    const ocioso = root.requestIdleCallback ?? ((fn) => setTimeout(fn, 1500));
    ocioso(() => PIH.carregarJogo().catch((err) => console.warn('[pokeidle-hunt] pré-carga falhou', err)));
  }

  PIH.on('welcome', (m) => {
    welcome = m;
    preaquecer();
  });
  PIH.on('estado', (e) => {
    const primeiro = !eu;
    eu = e;
    posicionarBotao();
    if (primeiro) setTimeout(() => verificar(0), 800);
    if (painel && !vendoWishlist && assinatura && assinaturaDe(pkAtivo()) !== assinatura) desenhar();
  });

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', vigiarCard, { once: true });
  else vigiarCard();
})(globalThis);


// === wishlist-ponte.js ===
// A ponte da Shiny WishList. Os scripts que leem o jogo rodam dentro da página (world: MAIN), e a CSP dela
// (connect-src) barraria um fetch deles para o nosso site. Este roda no mundo isolado, fora dessa regra, e só busca
// um endereço fixo: a lista pública, sem cookie. É dado, não código: PIN novo não pede versão nova da extensão.
(function () {
  'use strict';
  const URL_LISTA = 'https://pokeidle-gg.pages.dev/api/wishlist';

  addEventListener('message', async (ev) => {
    if (ev.source !== window || ev.data?.tipo !== 'pih:wishlist:pedir') return;
    const responder = (conteudo) => postMessage({ tipo: 'pih:wishlist:lista', id: ev.data.id, ...conteudo }, location.origin);
    try {
      const r = await fetch(URL_LISTA, { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      responder({ dados: await r.json() });
    } catch (e) {
      responder({ erro: String(e?.message ?? e) });
    }
  });
})();


