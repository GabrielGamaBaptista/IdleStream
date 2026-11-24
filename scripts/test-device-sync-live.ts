import * as assert from 'assert';
import { deviceSyncService } from '../src/services/deviceSyncService';

async function runLiveTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 TESTE REAL E INTEGRADO DO ELO PC ↔ CELULAR (KeyVal API)');
  console.log('🧪 ========================================================\n');

  // Teste 1: Geração de Pareamento
  console.log('🔹 Teste 1: Gerar novo código de vinculação (createNewPairing)...');
  const syncId = await deviceSyncService.createNewPairing(false);
  console.log('  ✓ Pareamento gerado com sucesso! syncId =', syncId);
  assert.ok(syncId, 'syncId deve ser uma string não vazia');
  assert.ok(syncId.startsWith('dsync_'), 'syncId deve ter o prefixo dsync_');

  // Teste 2: Leitura imediata do estado inicial
  console.log('\n🔹 Teste 2: Consultar estado remoto inicial (fetchRemoteState)...');
  const initialState = await deviceSyncService.fetchRemoteState(syncId);
  console.log('  ✓ Estado remoto lido:', initialState);
  assert.ok(initialState, 'Estado remoto não pode ser nulo');
  assert.strictEqual(initialState?.activeDevice, null, 'Dispositivo ativo inicial deve ser null');
  assert.strictEqual(initialState?.isCurrentDeviceActive, false, 'isCurrentDeviceActive deve ser false');
  assert.strictEqual(initialState?.isOtherDeviceActive, false, 'isOtherDeviceActive deve ser false');

  // Teste 3: Reivindicação de farm ativo pelo dispositivo local (PC)
  console.log('\n🔹 Teste 3: Reivindicar farm ativo pelo PC local (claimActive)...');
  const claimSuccess = await deviceSyncService.claimActive(syncId);
  assert.strictEqual(claimSuccess, true, 'claimActive deve retornar true');
  console.log('  ✓ Farm reivindicado com sucesso');

  // Teste 4: Consulta pós-reivindicação
  console.log('\n🔹 Teste 4: Consultar estado remoto após reivindicação...');
  const activeState = await deviceSyncService.fetchRemoteState(syncId);
  console.log('  ✓ Estado remoto lido:', activeState);
  assert.ok(activeState, 'Estado não pode ser nulo');
  assert.strictEqual(activeState?.isCurrentDeviceActive, true, 'PC deve se reconhecer como ativo');
  assert.strictEqual(activeState?.isOtherDeviceActive, false, 'Outro dispositivo não deve estar ativo');
  assert.strictEqual(activeState?.activeDevice, deviceSyncService.getDeviceType(), 'activeDevice deve ser desktop');

  // Teste 5: Simulação do Celular assumindo o farm
  console.log('\n🔹 Teste 5: Simular Celular assumindo o farm na nuvem...');
  const simulatedPhoneId = 'dev_simulated_phone_999';
  const now = Math.floor(Date.now() / 1000);
  const phonePayload = `mobile|${simulatedPhoneId}|mobile|${now}`;
  
  const cloudKey = `idlestream_${syncId}`;
  const simRes = await fetch('https://api.keyval.org/set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: cloudKey, val: phonePayload })
  });
  assert.strictEqual(simRes.status, 200, 'Cloud update deve retornar 200');
  console.log('  ✓ Celular atualizou o estado para mobile na nuvem');

  // Teste 6: PC detecta Celular ativo (Exclusão Mútua)
  console.log('\n🔹 Teste 6: PC faz polling e deve detectar que o Celular está ativo...');
  const stateFromPc = await deviceSyncService.fetchRemoteState(syncId);
  console.log('  ✓ Estado lido pelo PC:', stateFromPc);
  assert.ok(stateFromPc, 'Estado não pode ser nulo');
  assert.strictEqual(stateFromPc?.isCurrentDeviceActive, false, 'PC NÃO deve estar ativo');
  assert.strictEqual(stateFromPc?.isOtherDeviceActive, true, 'PC deve detectar que o outro dispositivo está ativo');
  assert.strictEqual(stateFromPc?.activeDevice, 'mobile', 'activeDevice deve ser mobile');
  assert.strictEqual(stateFromPc?.otherDeviceType, 'mobile', 'otherDeviceType deve ser mobile');
  console.log('  ✓ Exclusão Mútua validada: PC detectou que o Celular está farmando e pausou!');

  // Teste 7: Celular cede o farm (saída graciosa)
  console.log('\n🔹 Teste 7: Celular fecha o app e cede o farm (activeDevice = none)...');
  const releasePayload = `none|${simulatedPhoneId}|mobile|${Math.floor(Date.now() / 1000)}`;
  await fetch('https://api.keyval.org/set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: cloudKey, val: releasePayload })
  });

  const stateAfterRelease = await deviceSyncService.fetchRemoteState(syncId);
  console.log('  ✓ Estado após liberação:', stateAfterRelease);
  assert.strictEqual(stateAfterRelease?.activeDevice, null, 'Ninguém deve estar ativo');
  assert.strictEqual(stateAfterRelease?.isOtherDeviceActive, false, 'Outro dispositivo não está mais ativo');

  // Teste 8: Teste de robustez e rajada de requisições
  console.log('\n🔹 Teste 8: Teste de rajada (10 requisições consecutivas sem rate limit)...');
  for (let i = 0; i < 10; i++) {
    const ok = await deviceSyncService.claimActive(syncId);
    assert.strictEqual(ok, true, `Requisição de rajada #${i + 1} falhou`);
  }
  console.log('  ✓ 10 requisições consecutivas executadas com 100% de sucesso!');

  console.log('\n========================================================');
  console.log('✅ TODOS OS TESTES PASSARAM COM 100% DE SUCESSO REAL!');
  console.log('========================================================\n');
}

runLiveTests().catch(err => {
  console.error('\n❌ ERRO NO TESTE:', err);
  process.exit(1);
});
