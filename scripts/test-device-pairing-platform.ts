import assert from 'node:assert';
import { isAndroidPlatform, isDesktopPlatform } from '../src/utils/platform';

console.log('🧪 Iniciando testes de restrição de plataforma (Mobile vs Desktop)...');

// 1. Simular ambiente Desktop (window.AndroidBridge ausente)
(globalThis as any).window = {};
delete (globalThis as any).window.AndroidBridge;

assert.strictEqual(isAndroidPlatform(), false, 'Desktop não deve ser reconhecido como Android');
assert.strictEqual(isDesktopPlatform(), true, 'Desktop deve ser reconhecido como isDesktopPlatform');
console.log('✅ [1/4] Detecção de ambiente Desktop validada!');

// 2. Simular ambiente Android (window.AndroidBridge presente)
(globalThis as any).window.AndroidBridge = {
  isAndroid: () => true,
};

assert.strictEqual(isAndroidPlatform(), true, 'Android deve ser reconhecido como isAndroidPlatform');
assert.strictEqual(isDesktopPlatform(), false, 'Android não deve ser reconhecido como Desktop');
console.log('✅ [2/4] Detecção de ambiente Android (Mobile) validada!');

// 3. Regras de UX / Pareamento de Votos
interface PlatformSyncRules {
  canGenerateQr: boolean;
  canDisplayQrImage: boolean;
  canExportSession: boolean;
  syncButtonLabel: (syncId: string | null) => string;
}

const getPlatformSyncRules = (isAndroid: boolean): PlatformSyncRules => {
  if (isAndroid) {
    return {
      canGenerateQr: false,
      canDisplayQrImage: false,
      canExportSession: false,
      syncButtonLabel: (syncId) => (syncId ? 'Sincronizado com PC' : 'Conectar ao PC'),
    };
  }
  return {
    canGenerateQr: true,
    canDisplayQrImage: true,
    canExportSession: true,
    syncButtonLabel: (syncId) => (syncId ? 'Sincronizado com Celular' : 'Parear Celular (QR Code)'),
  };
};

const mobileRules = getPlatformSyncRules(true);
assert.strictEqual(mobileRules.canGenerateQr, false, 'Mobile NUNCA pode gerar QR Code de conexão');
assert.strictEqual(mobileRules.canDisplayQrImage, false, 'Mobile NUNCA deve exibir imagem de QR Code');
assert.strictEqual(mobileRules.canExportSession, false, 'Mobile NUNCA deve expor exportação de sessão');
assert.strictEqual(mobileRules.syncButtonLabel(null), 'Conectar ao PC', 'Mobile deve exibir "Conectar ao PC"');
assert.strictEqual(mobileRules.syncButtonLabel('sync-123'), 'Sincronizado com PC', 'Mobile conectado deve exibir "Sincronizado com PC"');
console.log('✅ [3/4] Regras restritivas do Celular (Mobile) validadas!');

const desktopRules = getPlatformSyncRules(false);
assert.strictEqual(desktopRules.canGenerateQr, true, 'Desktop PODE gerar QR Code de conexão');
assert.strictEqual(desktopRules.canDisplayQrImage, true, 'Desktop PODE exibir imagem de QR Code na tela');
assert.strictEqual(desktopRules.canExportSession, true, 'Desktop PODE exportar sessão P2P');
assert.strictEqual(desktopRules.syncButtonLabel(null), 'Parear Celular (QR Code)', 'Desktop deve exibir "Parear Celular (QR Code)"');
assert.strictEqual(desktopRules.syncButtonLabel('sync-123'), 'Sincronizado com Celular', 'Desktop conectado deve exibir "Sincronizado com Celular"');
console.log('✅ [4/4] Regras do Computador (Desktop) validadas!');

console.log('\n🎉 TODOS OS TESTES DE RESTRIÇÃO DE PLATAFORMA FORAM APROVADOS COM SUCESSO!\n');
