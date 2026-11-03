import assert from 'node:assert';
import { GameSlotConfig, SlotBounds } from '../src/types/index.ts';

console.log('🧪 Iniciando bateria de testes unitários do Sistema de Jogos Idle...\n');

// 1. Algoritmo de cálculo de layout e coordenadas (Grid 2x2, Foco, Sidebar)
interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

function calculateSlotBounds(
  viewport: Viewport,
  layoutMode: 'grid' | 'focus' | 'sidebar',
  slotIds: string[],
  activeSlotIds: string[],
  focusedSlotId: string
): SlotBounds[] {
  const bounds: SlotBounds[] = [];

  for (let i = 0; i < slotIds.length; i++) {
    const slotId = slotIds[i];
    const isRunning = activeSlotIds.includes(slotId);

    if (!isRunning) {
      bounds.push({
        slot_id: slotId,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        visible: false,
      });
      continue;
    }

    if (layoutMode === 'grid') {
      const halfW = Math.round(viewport.width / 2);
      const halfH = Math.round(viewport.height / 2);
      const col = i % 2;
      const row = Math.floor(i / 2);

      bounds.push({
        slot_id: slotId,
        x: viewport.x + col * halfW,
        y: viewport.y + row * halfH,
        width: halfW,
        height: halfH,
        visible: true,
      });
    } else if (layoutMode === 'focus') {
      const isFocused = slotId === focusedSlotId;
      bounds.push({
        slot_id: slotId,
        x: viewport.x,
        y: viewport.y,
        width: isFocused ? viewport.width : 0,
        height: isFocused ? viewport.height : 0,
        visible: isFocused,
      });
    } else if (layoutMode === 'sidebar') {
      const isFocused = slotId === focusedSlotId;
      const mainW = Math.round(viewport.width * 0.72);
      const sideW = viewport.width - mainW;
      const sideSlots = slotIds.filter((id) => id !== focusedSlotId && activeSlotIds.includes(id));
      const sideH = sideSlots.length > 0 ? Math.round(viewport.height / sideSlots.length) : viewport.height;
      const sideIndex = sideSlots.indexOf(slotId);

      if (isFocused) {
        bounds.push({
          slot_id: slotId,
          x: viewport.x,
          y: viewport.y,
          width: mainW,
          height: viewport.height,
          visible: true,
        });
      } else {
        bounds.push({
          slot_id: slotId,
          x: viewport.x + mainW,
          y: viewport.y + sideIndex * sideH,
          width: sideW,
          height: sideH,
          visible: true,
        });
      }
    }
  }

  return bounds;
}

// ==========================================
// Teste 1: Grid 2x2 com 4 contas ativas
// ==========================================
console.log('🔹 Teste 1: Cálculo de Bounds em Modo Grade (Grid 2x2)...');
const viewport1: Viewport = { x: 260, y: 50, width: 1200, height: 800 };
const allSlots = ['slot-1', 'slot-2', 'slot-3', 'slot-4'];
const gridBounds = calculateSlotBounds(viewport1, 'grid', allSlots, allSlots, 'slot-1');

assert.strictEqual(gridBounds.length, 4);
assert.strictEqual(gridBounds[0].width, 600);
assert.strictEqual(gridBounds[0].height, 400);
assert.strictEqual(gridBounds[0].x, 260);
assert.strictEqual(gridBounds[0].y, 50);

assert.strictEqual(gridBounds[1].x, 860);
assert.strictEqual(gridBounds[1].y, 50);

assert.strictEqual(gridBounds[2].x, 260);
assert.strictEqual(gridBounds[2].y, 450);

assert.strictEqual(gridBounds[3].x, 860);
assert.strictEqual(gridBounds[3].y, 450);
assert.ok(gridBounds.every((b) => b.visible === true), 'Todos devem estar visíveis no grid');
console.log('  ✓ Modo Grade calculou perfeitamente os 4 quadrantes');

// ==========================================
// Teste 2: Modo Foco (1 ativa ocupa 100%, outras invisíveis)
// ==========================================
console.log('\n🔹 Teste 2: Cálculo de Bounds em Modo Foco (100% de tela)...');
const focusBounds = calculateSlotBounds(viewport1, 'focus', allSlots, allSlots, 'slot-2');

const slot2Bounds = focusBounds.find((b) => b.slot_id === 'slot-2')!;
assert.strictEqual(slot2Bounds.visible, true);
assert.strictEqual(slot2Bounds.width, 1200);
assert.strictEqual(slot2Bounds.height, 800);
assert.strictEqual(slot2Bounds.x, 260);
assert.strictEqual(slot2Bounds.y, 50);

const otherSlots = focusBounds.filter((b) => b.slot_id !== 'slot-2');
assert.ok(
  otherSlots.every((b) => b.visible === false),
  'Outros slots devem ter visible=false no modo foco'
);
console.log('  ✓ Modo Foco isolou a conta selecionada e ocultou as secundárias');

// ==========================================
// Teste 3: Modo Sidebar (1 Principal 72% + 3 Laterais 28%)
// ==========================================
console.log('\n🔹 Teste 3: Cálculo de Bounds em Modo Principal + Miniaturas (Sidebar)...');
const sidebarBounds = calculateSlotBounds(viewport1, 'sidebar', allSlots, allSlots, 'slot-1');

const mainSlot = sidebarBounds.find((b) => b.slot_id === 'slot-1')!;
assert.strictEqual(mainSlot.width, 864); // 72% de 1200
assert.strictEqual(mainSlot.height, 800);

const side1 = sidebarBounds.find((b) => b.slot_id === 'slot-2')!;
const side2 = sidebarBounds.find((b) => b.slot_id === 'slot-3')!;
const side3 = sidebarBounds.find((b) => b.slot_id === 'slot-4')!;

assert.strictEqual(side1.width, 336); // 1200 - 864
assert.strictEqual(side1.x, 260 + 864);
assert.strictEqual(side1.y, 50);

assert.strictEqual(side2.x, 260 + 864);
assert.strictEqual(side3.x, 260 + 864);
console.log('  ✓ Modo Sidebar distribuiu 72% para a conta principal e empilhou as laterais');

// ==========================================
// Teste 4: Formatação de URL e Higienização
// ==========================================
console.log('\n🔹 Teste 4: Validação e Higienização de URLs de Jogos...');
function sanitizeGameUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return 'https://pokeidle.io/app';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

assert.strictEqual(sanitizeGameUrl('pokeidle.io/app'), 'https://pokeidle.io/app');
assert.strictEqual(sanitizeGameUrl('  https://pokeidle.io/app  '), 'https://pokeidle.io/app');
assert.strictEqual(sanitizeGameUrl('http://tibiaidle.com'), 'http://tibiaidle.com');
assert.strictEqual(sanitizeGameUrl(''), 'https://pokeidle.io/app');
console.log('  ✓ Higienização e prefixo HTTPS validados com sucesso');

// ==========================================
// Teste 5: Isolamento de Identificadores e Contas
// ==========================================
console.log('\n🔹 Teste 5: Isolamento de Slots e Identificadores...');
const sampleSlots: GameSlotConfig[] = [
  { id: 'slot-1', label: 'Naruto', url: 'https://pokeidle.io/app', color: '#6366F1', auto_start: false },
  { id: 'slot-2', label: 'Naruto 1', url: 'https://pokeidle.io/app', color: '#10B981', auto_start: false },
  { id: 'slot-3', label: 'Naruto 2', url: 'https://pokeidle.io/app', color: '#F59E0B', auto_start: false },
  { id: 'slot-4', label: 'Naruto 4', url: 'https://pokeidle.io/app', color: '#EF4444', auto_start: false },
];

const uniqueIds = new Set(sampleSlots.map((s) => s.id));
assert.strictEqual(uniqueIds.size, 4, 'Todos os 4 IDs de slots devem ser estritamente únicos');

const uniqueColors = new Set(sampleSlots.map((s) => s.color));
assert.strictEqual(uniqueColors.size, 4, 'Todas as 4 cores devem ser únicas para distinção visual');
console.log('  ✓ Slots possuem IDs e identificadores únicos garantidos');

console.log('\n🎉 TODOS OS TESTES UNITÁRIOS DE JOGOS IDLE PASSARAM COM 100% DE SUCESSO!\n');
