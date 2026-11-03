const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'test_hunt_unpacked');
const srcDir = path.join(baseDir, 'src');

const files = [
  'boot.js',
  'jogo-bundle.js',
  'hook.js',
  'game.js',
  'ritmo.js',
  'engine.js',
  'geo.js',
  'ui.js',
  'wishlist-ponte.js'
];

const cssContent = fs.readFileSync(path.join(srcDir, 'ui.css'), 'utf8');

let bundle = `// [IdleStream] /hunt for PokeIdle - Extensão oficial embutida
// Versão: 1.0.12 (Liang) - Compatível com pokeidle.io
(() => {
  if (window.__pokeidleHuntInstalled) return;
  window.__pokeidleHuntInstalled = true;

  // Injetar estilos visuais da extensão
  try {
    const style = document.createElement('style');
    style.id = '__pokeidle_hunt_style__';
    style.textContent = ${JSON.stringify(cssContent)};
    (document.head || document.documentElement).appendChild(style);
  } catch (e) {
    console.error('[IdleStream Hunt] Falha ao injetar CSS:', e);
  }
})();
\n`;

for (const file of files) {
  const filePath = path.join(srcDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  bundle += `// === ${file} ===\n${content}\n\n`;
}

const outputPath = path.join(__dirname, '..', 'src-tauri', 'src', 'games', 'hunt_extension.js');
fs.writeFileSync(outputPath, bundle, 'utf8');
console.log('Successfully bundled hunt extension to:', outputPath, `(${bundle.length} bytes)`);
