import { test } from 'node:test';
import assert from 'node:assert/strict';

test('Audit Log categories and levels definition', () => {
  const CATEGORIES = ['TODAS', 'ACCOUNTS', 'LIVES', 'GAMES', 'VOTES', 'SYSTEM'] as const;
  const LEVELS = ['TODOS', 'INFO', 'WARN', 'ERROR'] as const;

  assert.equal(CATEGORIES.length, 6);
  assert.equal(LEVELS.length, 4);
  assert.ok(CATEGORIES.includes('ACCOUNTS'));
  assert.ok(CATEGORIES.includes('LIVES'));
  assert.ok(CATEGORIES.includes('GAMES'));
  assert.ok(CATEGORIES.includes('VOTES'));
  assert.ok(CATEGORIES.includes('SYSTEM'));
});

test('Audit Log line format parser extracts timestamp, level, category and message', () => {
  const line = '[2026-11-18 20:25:00.123] [INFO] [ACCOUNTS] Conta [@user1] autenticada com sucesso';
  const match = line.match(/^\[(.*?)\]\s+\[(.*?)\]\s+\[(.*?)\]\s+(.*)$/);

  assert.ok(match !== null, 'Linha de auditoria deve obedecer ao padrão regex padrão');
  const [, timestamp, level, category, message] = match;

  assert.equal(timestamp, '2026-11-18 20:25:00.123');
  assert.equal(level, 'INFO');
  assert.equal(category, 'ACCOUNTS');
  assert.equal(message, 'Conta [@user1] autenticada com sucesso');
});

test('Audit Log IPC payload parameters construction', () => {
  const buildIpcPayload = (category: string, level: string, search: string) => ({
    filterCategory: category === 'TODAS' ? null : category,
    filterLevel: level === 'TODOS' ? null : level,
    search: search.trim() ? search.trim() : null,
  });

  const payloadAll = buildIpcPayload('TODAS', 'TODOS', '   ');
  assert.deepEqual(payloadAll, {
    filterCategory: null,
    filterLevel: null,
    search: null,
  });

  const payloadFiltered = buildIpcPayload('GAMES', 'WARN', 'fps drop');
  assert.deepEqual(payloadFiltered, {
    filterCategory: 'GAMES',
    filterLevel: 'WARN',
    search: 'fps drop',
  });
});

test('Audit Log line classification for UI highlighting', () => {
  const classifyLine = (line: string) => {
    if (line.startsWith('===')) return 'HEADER';
    if (line.includes('[ERROR]')) return 'ERROR';
    if (line.includes('[WARN]')) return 'WARN';
    if (line.includes('[INFO]')) return 'INFO';
    return 'DEFAULT';
  };

  assert.equal(classifyLine('=== IDLESTREAM AUDIT LOG - HORA 1 ==='), 'HEADER');
  assert.equal(classifyLine('[2026-11-18 20:00:00.000] [ERROR] [ACCOUNTS] Falha HTTP 401'), 'ERROR');
  assert.equal(classifyLine('[2026-11-18 20:00:00.000] [WARN] [LIVES] Stream desconectada'), 'WARN');
  assert.equal(classifyLine('[2026-11-18 20:00:00.000] [INFO] [VOTES] Voto confirmado'), 'INFO');
});
