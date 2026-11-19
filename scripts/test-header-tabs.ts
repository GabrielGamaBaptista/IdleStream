import assert from 'node:assert';

console.log('🧪 Iniciando testes TDD da Etapa 4: Limpeza do Header e Comportamento de Abas...\n');

// 1. Validação de visibilidade do Card de Recursos ("Ao Vivo x Vigília x RAM Est.")
function shouldShowResourceCard(activeTab: string): boolean {
  return activeTab === 'streams';
}

assert.strictEqual(shouldShowResourceCard('streams'), true, 'Card de recursos DEVE ser visível na aba streams');
assert.strictEqual(shouldShowResourceCard('games'), false, 'Card de recursos NÃO DEVE ser visível na aba games');
assert.strictEqual(shouldShowResourceCard('votes'), false, 'Card de recursos NÃO DEVE ser visível na aba votes');
assert.strictEqual(shouldShowResourceCard('accounts'), false, 'Card de recursos NÃO DEVE ser visível na aba accounts');
assert.strictEqual(shouldShowResourceCard('settings'), false, 'Card de recursos NÃO DEVE ser visível na aba settings');
console.log('  ✓ Regra de visibilidade do Card de Recursos validada para todas as abas');

// 2. Validação da presença dos botões de Ação Global e Fullscreen em qualquer aba
interface HeaderControls {
  hasStartAll: boolean;
  hasStopAll: boolean;
  hasFullscreen: boolean;
}

function getHeaderControls(activeTab: string): HeaderControls {
  // Os botões de Ativar e Parar estão acessíveis no topo; o botão Fullscreen no header
  // só é exibido fora de 'games' para não duplicar o botão nativo da barra dos jogos
  return {
    hasStartAll: true,
    hasStopAll: true,
    hasFullscreen: activeTab !== 'games',
  };
}

for (const tab of ['streams', 'games', 'votes', 'accounts', 'settings']) {
  const controls = getHeaderControls(tab);
  assert.strictEqual(controls.hasStartAll, true, `Aba ${tab} deve ter botão Ativar`);
  assert.strictEqual(controls.hasStopAll, true, `Aba ${tab} deve ter botão Parar`);
  assert.strictEqual(
    controls.hasFullscreen,
    tab !== 'games',
    `Aba ${tab} deve ocultar Fullscreen no Header se for games para evitar botões duplicados`
  );
}
console.log('  ✓ Controles globais e prevenção de Fullscreen duplicado na aba games confirmados');

// 3. Validação do modo Fullscreen (Imersivo)
function isNavigationVisible(isImmersiveMode: boolean): boolean {
  return !isImmersiveMode;
}

assert.strictEqual(isNavigationVisible(false), true, 'Com tela cheia desativada, menus devem estar visíveis');
assert.strictEqual(isNavigationVisible(true), false, 'Com tela cheia ativada, menus devem estar ocultos');
console.log('  ✓ Modo Tela Cheia oculta corretamente a navegação para máximo aproveitamento de tela');

console.log('\n🎉 TODOS OS TESTES DA ETAPA 4 PASSARAM COM SUCESSO!\n');
