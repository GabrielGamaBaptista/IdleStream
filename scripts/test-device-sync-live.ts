import * as assert from 'assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  deviceSyncService,
  encodeDeviceSyncState,
  decodeDeviceSyncState,
} from '../src/services/deviceSyncService';

async function runLiveTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 TESTE REAL E INTEGRADO DO ELO PC ↔ CELULAR (KeyVal API)');
  console.log('🧪 ========================================================\n');

  // Teste 0: Protocolo de 5 campos com claim_nonce + retrocompatibilidade
  console.log('🔹 Teste 0: Protocolo com claim_nonce e retrocompatibilidade...');
  const encoded5 = encodeDeviceSyncState({
    active_device: 'mobile',
    device_id: 'dev_mob_1',
    device_type: 'mobile',
    updated_at: 1795612800,
    claim_nonce: 'c_1795612800_abcd',
  });
  assert.strictEqual(encoded5, 'mobile|dev_mob_1|mobile|1795612800|c_1795612800_abcd');
  const decoded5 = decodeDeviceSyncState(encoded5);
  assert.strictEqual(decoded5?.claim_nonce, 'c_1795612800_abcd');
  const decoded4 = decodeDeviceSyncState('desktop|dev_pc_1|desktop|1795612000');
  assert.strictEqual(decoded4?.claim_nonce, 'dev_pc_1:1795612000');
  console.log('  ✓ Protocolo 5 campos e legado 4 campos validados');

  // Teste 1: Geração de Pareamento
  console.log('\n🔹 Teste 1: Gerar novo código de vinculação (createNewPairing)...');
  const syncId = await deviceSyncService.createNewPairing(false);
  console.log('  ✓ Pareamento gerado com sucesso! syncId =', syncId);
  assert.ok(syncId, 'syncId deve ser uma string não vazia');
  assert.ok(syncId.startsWith('dsync_'), 'syncId deve ter o prefixo dsync_');

  // Teste 2: Leitura imediata do estado inicial
  console.log('\n🔹 Teste 2: Consultar estado remoto inicial (fetchRemoteState)...');
  const initialState = await deviceSyncService.fetchRemoteState(syncId, true);
  console.log('  ✓ Estado remoto lido:', initialState);
  assert.ok(initialState, 'Estado remoto não pode ser nulo');
  assert.strictEqual(initialState?.activeDevice, null, 'Dispositivo ativo inicial deve ser null');
  assert.strictEqual(initialState?.isCurrentDeviceActive, false, 'isCurrentDeviceActive deve ser false');
  assert.strictEqual(initialState?.isOtherDeviceActive, false, 'isOtherDeviceActive deve ser false');

  // Teste 3: Reivindicação de farm ativo pelo dispositivo local (PC)
  console.log('\n🔹 Teste 3: Reivindicar farm ativo pelo PC local (claimActive)...');
  const claimSuccess = await deviceSyncService.claimActive(syncId, true);
  assert.strictEqual(claimSuccess, true, 'claimActive deve retornar true');
  console.log('  ✓ Farm reivindicado com sucesso');

  // Teste 4: Consulta pós-reivindicação
  console.log('\n🔹 Teste 4: Consultar estado remoto após reivindicação...');
  const activeState = await deviceSyncService.fetchRemoteState(syncId, true);
  console.log('  ✓ Estado remoto lido:', activeState);
  assert.ok(activeState, 'Estado não pode ser nulo');
  assert.strictEqual(activeState?.isCurrentDeviceActive, true, 'PC deve se reconhecer como ativo');
  assert.strictEqual(activeState?.isOtherDeviceActive, false, 'Outro dispositivo não deve estar ativo');
  assert.strictEqual(activeState?.activeDevice, deviceSyncService.getDeviceType(), 'activeDevice deve ser desktop');
  assert.ok(activeState?.claimNonce, 'claimNonce deve estar preenchido');

  // Teste 5: Simulação do Celular assumindo o farm
  console.log('\n🔹 Teste 5: Simular Celular assumindo o farm na nuvem...');
  const simulatedPhoneId = 'dev_simulated_phone_999';
  const phoneNonce = `c_${Math.floor(Date.now() / 1000)}_mob1`;
  const now = Math.floor(Date.now() / 1000);
  const phonePayload = `mobile|${simulatedPhoneId}|mobile|${now}|${phoneNonce}`;

  const cloudKey = `idlestream_${syncId}`;
  const simRes = await fetch('https://api.keyval.org/set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: cloudKey, val: phonePayload }),
  });
  assert.strictEqual(simRes.status, 200, 'Cloud update deve retornar 200');
  console.log('  ✓ Celular atualizou o estado para mobile na nuvem');

  // Teste 6: PC faz polling read-before-write e detecta Celular ativo SEM sobrescrever
  console.log('\n🔹 Teste 6: PC faz polling read-before-write e detecta Celular ativo sem sobrescrever...');
  deviceSyncService.setSyncId(syncId);
  deviceSyncService.setIsFarmingCheck(() => true);
  let observedOtherActive = false;
  await new Promise<void>((resolve) => {
    deviceSyncService.startPolling(60, (st) => {
      if (st.isOtherDeviceActive && st.activeDevice === 'mobile') {
        observedOtherActive = true;
      }
      resolve();
    });
  });
  deviceSyncService.stopPolling();
  assert.strictEqual(observedOtherActive, true, 'Poller do PC deveria detectar celular ativo');

  const verifyNotOverwritten = await deviceSyncService.fetchRemoteState(syncId, true);
  assert.strictEqual(verifyNotOverwritten?.activeDevice, 'mobile', 'Poller do PC NÃO pode sobrescrever a posse do celular');
  assert.strictEqual(verifyNotOverwritten?.claimNonce, phoneNonce, 'claimNonce do celular deve permanecer intacto');
  console.log('  ✓ Exclusão Mútua + Read-Before-Write validados sem overwrite!');

  // Teste 7: Celular cede o farm (saída graciosa)
  console.log('\n🔹 Teste 7: Celular fecha manualmente e cede o farm (activeDevice = none)...');
  const releasePayload = `none|${simulatedPhoneId}|mobile|${Math.floor(Date.now() / 1000)}|rel_1`;
  await fetch('https://api.keyval.org/set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: cloudKey, val: releasePayload }),
  });

  const stateAfterRelease = await deviceSyncService.fetchRemoteState(syncId, true);
  console.log('  ✓ Estado após liberação:', stateAfterRelease);
  assert.strictEqual(stateAfterRelease?.activeDevice, null, 'Ninguém deve estar ativo');
  assert.strictEqual(stateAfterRelease?.isOtherDeviceActive, false, 'Outro dispositivo não está mais ativo');

  // Teste 8: Teste de robustez e rajada de requisições
  console.log('\n🔹 Teste 8: Teste de rajada (10 requisições consecutivas sem rate limit)...');
  for (let i = 0; i < 10; i++) {
    const ok = await deviceSyncService.claimActive(syncId, true);
    assert.strictEqual(ok, true, `Requisição de rajada #${i + 1} falhou`);
  }
  console.log('  ✓ 10 requisições consecutivas executadas com 100% de sucesso!');

  // Teste 9 (TC-10): Garantir ausência do botão/estado "Tomar Farm" / pausedByOtherDevice
  console.log('\n🔹 Teste 9: Validar remoção do botão Tomar Farm e pausedByOtherDevice na UI...');
  const appTsx = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
  const syncCardTsx = fs.readFileSync(path.join(process.cwd(), 'src/components/DeviceSyncCard.tsx'), 'utf8');
  assert.ok(!appTsx.includes('Tomar Farm'), 'App.tsx não deve conter botão Tomar Farm');
  assert.ok(!appTsx.includes('pausedByOtherDevice'), 'App.tsx não deve conter pausedByOtherDevice');
  assert.ok(!syncCardTsx.includes('Tomar Farm'), 'DeviceSyncCard.tsx não deve conter botão Tomar Farm');
  assert.ok(!syncCardTsx.includes('pausedByOtherDevice'), 'DeviceSyncCard.tsx não deve conter pausedByOtherDevice');
  console.log('  ✓ UI validada sem botão manual de retomada!');

  console.log('\n========================================================');
  console.log('✅ TODOS OS TESTES PASSARAM COM 100% DE SUCESSO REAL!');
  console.log('========================================================\n');
}

runLiveTests().catch((err) => {
  console.error('\n❌ ERRO NO TESTE:', err);
  process.exit(1);
});
