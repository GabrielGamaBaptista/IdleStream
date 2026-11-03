import assert from 'node:assert';
import {
  cleanVersion,
  compareVersions,
  isNewerVersion,
  findAndroidApkAsset,
  parseGitHubRelease,
} from '../src/utils/version.ts';

console.log('🧪 Iniciando bateria de testes unitários de Versionamento e Atualização...');

// 1. cleanVersion
assert.strictEqual(cleanVersion('2.1.1'), '2.1.1');
assert.strictEqual(cleanVersion('v2.1.1'), '2.1.1');
assert.strictEqual(cleanVersion('  V3.0.0  '), '3.0.0');
assert.strictEqual(cleanVersion(''), '0.0.0');
console.log('  ✓ cleanVersion test passed');

// 2. compareVersions
assert.strictEqual(compareVersions('2.1.1', '2.1.1'), 0);
assert.strictEqual(compareVersions('2.1.2', '2.1.1'), 1);
assert.strictEqual(compareVersions('2.1.0', '2.1.1'), -1);
assert.strictEqual(compareVersions('2.2.0', '2.1.9'), 1);
assert.strictEqual(compareVersions('3.0.0', '2.9.9'), 1);
assert.strictEqual(compareVersions('2.1.1', '2.1.1-beta'), 0);
assert.strictEqual(compareVersions('v2.1.2', '2.1.1'), 1);
assert.strictEqual(compareVersions('2.1.1', 'v2.1.2'), -1);
assert.strictEqual(compareVersions('10.0.0', '9.9.9'), 1);
console.log('  ✓ compareVersions test passed');

// 3. isNewerVersion
assert.strictEqual(isNewerVersion('2.1.2', '2.1.1'), true);
assert.strictEqual(isNewerVersion('2.1.1', '2.1.1'), false);
assert.strictEqual(isNewerVersion('2.1.0', '2.1.1'), false);
assert.strictEqual(isNewerVersion('v2.2.0', '2.1.1'), true);
assert.strictEqual(isNewerVersion('v2.1.1', '2.1.1'), false);
console.log('  ✓ isNewerVersion test passed');

// 4. findAndroidApkAsset
const sampleAssets = [
  { name: 'idlestream.exe', browser_download_url: 'https://github.com/.../idlestream.exe' },
  { name: 'IdleStream_2.1.1_x64-setup.exe', browser_download_url: 'https://github.com/.../setup.exe' },
  { name: 'IdleStream_2.1.1_universal.apk', browser_download_url: 'https://github.com/.../universal.apk', size: 9000000 },
  { name: 'IdleStream_2.1.1_arm64.apk', browser_download_url: 'https://github.com/.../arm64.apk', size: 9371471 },
];

const found = findAndroidApkAsset(sampleAssets);
assert.ok(found, 'Deveria encontrar asset APK');
assert.strictEqual(found.name, 'IdleStream_2.1.1_arm64.apk', 'Deve priorizar arm64');
assert.strictEqual(found.url, 'https://github.com/.../arm64.apk');
assert.strictEqual(found.size, 9371471);

// Fallback quando não há arm64 específico
const universalOnly = [
  { name: 'idlestream.exe', browser_download_url: 'https://github.com/.../idlestream.exe' },
  { name: 'IdleStream_release.apk', browser_download_url: 'https://github.com/.../release.apk', size: 8500000 },
];
const foundUniversal = findAndroidApkAsset(universalOnly);
assert.ok(foundUniversal, 'Deveria encontrar o APK universal');
assert.strictEqual(foundUniversal.name, 'IdleStream_release.apk');

// Quando não há nenhum APK
const noApks = [
  { name: 'idlestream.exe', browser_download_url: 'https://github.com/.../idlestream.exe' },
];
assert.strictEqual(findAndroidApkAsset(noApks), null);
console.log('  ✓ findAndroidApkAsset test passed');

// 5. parseGitHubRelease
const releaseData = {
  tag_name: 'v2.1.2',
  name: 'IdleStream v2.1.2 - Nova Versão',
  body: 'Notas da release v2.1.2',
  assets: sampleAssets,
};

const updateResultNew = parseGitHubRelease(releaseData, '2.1.1');
assert.strictEqual(updateResultNew.hasUpdate, true);
assert.strictEqual(updateResultNew.version, '2.1.2');
assert.strictEqual(updateResultNew.apkUrl, 'https://github.com/.../arm64.apk');
assert.strictEqual(updateResultNew.apkSize, 9371471);

const updateResultCurrent = parseGitHubRelease(releaseData, '2.1.2');
assert.strictEqual(updateResultCurrent.hasUpdate, false);

const updateResultOlder = parseGitHubRelease(releaseData, '2.1.3');
assert.strictEqual(updateResultOlder.hasUpdate, false);
console.log('  ✓ parseGitHubRelease test passed');

console.log('\n🎉 TODOS OS TESTES UNITÁRIOS DE VERSIONAMENTO PASSARAM COM SUCESSO!\n');
