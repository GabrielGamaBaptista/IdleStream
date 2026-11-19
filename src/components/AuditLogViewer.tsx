import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Terminal,
  RefreshCw,
  ClipboardCopy,
  Trash2,
  HardDrive,
  Search,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

const CATEGORIES = ['TODAS', 'ACCOUNTS', 'LIVES', 'GAMES', 'VOTES', 'SYSTEM'] as const;
type Category = (typeof CATEGORIES)[number];

const LEVELS = ['TODOS', 'INFO', 'WARN', 'ERROR'] as const;
type Level = (typeof LEVELS)[number];

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [category, setCategory] = useState<Category>('TODAS');
  const [level, setLevel] = useState<Level>('TODOS');
  const [search, setSearch] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke<string>('get_audit_logs', {
        filterCategory: category === 'TODAS' ? null : category,
        filterLevel: level === 'TODOS' ? null : level,
        search: search.trim() ? search.trim() : null,
      });
      setLogs(result || 'Nenhum registro encontrado para estes filtros.');
    } catch (err: any) {
      // Fallback para Android Bridge se get_audit_logs não estiver disponível
      if (typeof window !== 'undefined' && window.AndroidBridge?.getDiagnosticReport) {
        const nativeDiag = window.AndroidBridge.getDiagnosticReport();
        setLogs(`=== IDLESTREAM AUDIT (NATIVO ANDROID) ===\n${nativeDiag}`);
      } else {
        setLogs(`Erro ao carregar logs de auditoria do disco: ${String(err?.message || err)}`);
      }
    } finally {
      setLoading(false);
    }
  }, [category, level, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(logs);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Falha ao copiar:', e);
    }
  };

  const handleClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }

    setClearing(true);
    try {
      await invoke('clear_audit_logs');
      setConfirmClear(false);
      await fetchLogs();
    } catch (err) {
      console.error('Falha ao limpar logs:', err);
    } finally {
      setClearing(false);
    }
  };

  const renderLogLine = (line: string, index: number) => {
    if (!line.trim()) return null;

    if (line.startsWith('===')) {
      return (
        <div key={index} className="text-indigo-400 font-bold py-1 border-b border-neutral-800 text-[11px]">
          {line}
        </div>
      );
    }

    const match = line.match(/^\[(.*?)\]\s+\[(.*?)\]\s+\[(.*?)\]\s+(.*)$/);
    if (match) {
      const [, ts, lvl, cat, msg] = match;
      let lvlClass = 'text-neutral-400 bg-neutral-800/60';
      if (lvl === 'ERROR') lvlClass = 'text-rose-400 bg-rose-950/60 border border-rose-800/40 font-bold';
      else if (lvl === 'WARN') lvlClass = 'text-amber-400 bg-amber-950/60 border border-amber-800/40 font-bold';
      else if (lvl === 'INFO') lvlClass = 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/30';

      let catClass = 'text-neutral-300 bg-neutral-800/60';
      if (cat === 'ACCOUNTS') catClass = 'text-purple-300 bg-purple-950/50';
      else if (cat === 'LIVES') catClass = 'text-cyan-300 bg-cyan-950/50';
      else if (cat === 'GAMES') catClass = 'text-green-300 bg-green-950/50';
      else if (cat === 'VOTES') catClass = 'text-orange-300 bg-orange-950/50';
      else if (cat === 'SYSTEM') catClass = 'text-blue-300 bg-blue-950/50';

      return (
        <div key={index} className="flex flex-wrap items-baseline gap-1.5 py-0.5 hover:bg-neutral-900/60 px-1 rounded transition-colors text-neutral-300 break-all">
          <span className="text-neutral-500 text-[10px] shrink-0 font-mono">[{ts}]</span>
          <span className={`text-[10px] px-1 py-0.5 rounded font-mono shrink-0 ${lvlClass}`}>[{lvl}]</span>
          <span className={`text-[10px] px-1 py-0.5 rounded font-mono shrink-0 ${catClass}`}>[{cat}]</span>
          <span className="text-neutral-200 text-[11px]">{msg}</span>
        </div>
      );
    }

    return (
      <div key={index} className="leading-relaxed hover:bg-neutral-900/40 px-1 rounded transition-colors text-neutral-300 break-all">
        {line}
      </div>
    );
  };

  const logLines = logs.split('\n');

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
      {/* Header com badge de persistência estrita em disco */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">Auditoria & Logs de Execução</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-400 font-mono">
            <HardDrive className="w-3 h-3 text-indigo-400" />
            <span>Gravado em Disco (6h rotativo | 0 MB RAM)</span>
          </span>
        </div>
      </div>

      <p className="text-xs text-neutral-400">
        Auditoria granular gravada hora a hora diretamente em disco, com sobrescrita automática circular das últimas 6 horas. Sem consumo de memória RAM contínua.
      </p>

      {/* Controles de Filtro: Categoria e Nível */}
      <div className="space-y-2.5 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-neutral-400 font-medium mr-1">Categoria:</span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                category === cat
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-600/30'
                  : 'bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-neutral-400 font-medium mr-1">Nível:</span>
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevel(lvl)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                  level === lvl
                    ? lvl === 'ERROR'
                      ? 'bg-rose-600 text-white font-semibold'
                      : lvl === 'WARN'
                      ? 'bg-amber-600 text-white font-semibold'
                      : lvl === 'INFO'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-indigo-600 text-white font-semibold'
                    : 'bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-300'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Campo de Busca Textual */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Buscar nos logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white font-mono placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Janela de Logs Estilo Terminal Monospace */}
      <div className="relative bg-neutral-950 border border-neutral-800/80 rounded-xl p-3 max-h-72 overflow-y-auto font-mono text-[11px] select-text space-y-0.5 shadow-inner">
        {loading && (
          <div className="absolute inset-0 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center gap-2 text-indigo-400 z-10">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-xs">Lendo registros do disco...</span>
          </div>
        )}

        {logLines.length > 0 ? (
          logLines.map((line, idx) => renderLogLine(line, idx))
        ) : (
          <div className="text-neutral-500 italic py-4 text-center">Nenhum evento registrado ainda.</div>
        )}
      </div>

      {/* Ações: Atualizar, Copiar, Limpar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700/60 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700/60 transition cursor-pointer"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copiado!</span>
              </>
            ) : (
              <>
                <ClipboardCopy className="w-3.5 h-3.5 text-indigo-400" />
                <span>Copiar Relatório</span>
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={handleClear}
          disabled={clearing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
            confirmClear
              ? 'bg-rose-950/80 border-rose-700 text-rose-300 font-bold'
              : 'bg-neutral-800/80 hover:bg-rose-950/40 text-neutral-300 hover:text-rose-400 border-neutral-700/60'
          }`}
        >
          {confirmClear ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Confirmar Limpeza do Disco?</span>
            </>
          ) : (
            <>
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Histórico</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
