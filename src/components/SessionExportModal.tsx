import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { invoke } from '@tauri-apps/api/core';
import { ExportStatus } from '../types';
import { isAndroidPlatform } from '../utils/platform';
import {
  Smartphone,
  RefreshCw,
  Copy,
  Check,
  X,
  Lock,
  Wifi,
  Clock,
  Sparkles,
} from 'lucide-react';

interface SessionExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionExportModal: React.FC<SessionExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [pin, setPin] = useState<string>('');
  const [status, setStatus] = useState<ExportStatus | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [remainingSecs, setRemainingSecs] = useState<number>(300);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedPin, setCopiedPin] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const generatePin = () => {
    const randomPin = Math.floor(10000000 + Math.random() * 90000000).toString();
    setPin(randomPin);
  };

  useEffect(() => {
    if (isOpen) {
      generatePin();
      // Checa se já havia algum servidor rodando
      invoke<ExportStatus>('get_session_export_status')
        .then((st) => {
          if (st.active) {
            setStatus(st);
            setRemainingSecs(st.remaining_seconds || 300);
            QRCode.toDataURL(st.export_url, { width: 220, margin: 2 }).then(setQrDataUrl);
          }
        })
        .catch(() => {});
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setError(null);
    }
  }, [isOpen]);

  // Countdown timer quando ativo
  useEffect(() => {
    if (status?.active && remainingSecs > 0) {
      timerRef.current = setInterval(() => {
        setRemainingSecs((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleStop();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status?.active]);

  const handleStart = async () => {
    if (pin.trim().length < 6) {
      setError('O PIN deve conter pelo menos 6 dígitos numéricos');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const st = await invoke<ExportStatus>('start_session_export', { pin: pin.trim() });
      setStatus(st);
      setRemainingSecs(st.remaining_seconds || 300);
      const url = await QRCode.toDataURL(st.export_url, {
        width: 240,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrDataUrl(url);
    } catch (err: any) {
      setError(typeof err === 'string' ? err : 'Falha ao iniciar servidor local');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      const st = await invoke<ExportStatus>('stop_session_export');
      setStatus(st);
      setQrDataUrl('');
    } catch (_) {} finally {
      setIsLoading(false);
    }
  };

  const handleCopyPin = async () => {
    try {
      await navigator.clipboard.writeText(pin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    } catch (_) {}
  };

  if (!isOpen || isAndroidPlatform()) return null;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Exportar Contas para o Celular
                </h3>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-[9px] text-indigo-300 font-medium">
                  <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                  <span>P2P</span>
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Transferência criptografada via Wi-Fi local sem internet.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition cursor-pointer p-1 rounded-lg hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            {error}
          </div>
        )}

        {!status?.active ? (
          /* Passo 1: Configuração do PIN e Início */
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2 text-xs text-neutral-300">
              <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                <Lock className="w-4 h-4" />
                <span>Criptografia de Ponta a Ponta</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Um servidor HTTP local temporário será aberto na sua rede Wi-Fi. Os tokens das contas são protegidos com <strong>AES-256-GCM</strong> e chave derivada do PIN abaixo via <strong>PBKDF2 (310.000 iterações)</strong>.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                <span>PIN de Segurança (8 dígitos)</span>
                <button
                  type="button"
                  onClick={generatePin}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Gerar Novo PIN</span>
                </button>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={12}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 84729103"
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-center text-lg font-mono font-bold tracking-widest text-indigo-300 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleCopyPin}
                  className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition cursor-pointer shrink-0"
                >
                  {copiedPin ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStart}
              disabled={isLoading || pin.length < 6}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
              <span>Iniciar Servidor P2P e Gerar QR Code</span>
            </button>
          </div>
        ) : (
          /* Passo 2: Servidor Ativo + QR Code */
          <div className="space-y-4 text-center animate-in fade-in">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-2 rounded-xl">
              <Clock className="w-4 h-4" />
              <span>Válido por {formatTimer(remainingSecs)} • Downloads: {status.exports_count}/{status.max_exports}</span>
            </div>

            {/* QR Code */}
            {qrDataUrl && (
              <div className="p-3 bg-white rounded-2xl shadow-xl inline-block mx-auto border-4 border-indigo-500/30">
                <img src={qrDataUrl} alt="QR Code P2P" className="w-48 h-48 block" />
              </div>
            )}

            {/* PIN Prominente */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-1">
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                PIN para Descriptografar no Celular
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-mono font-extrabold text-indigo-300 tracking-widest">
                  {pin.slice(0, 4)} {pin.slice(4)}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPin}
                  className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition cursor-pointer"
                  title="Copiar PIN"
                >
                  {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed max-w-sm mx-auto">
              1. Conecte o celular na <strong>mesma rede Wi-Fi</strong>.<br />
              2. No app móvel, abra <strong>Configurações &gt; Importar Sessão</strong> e aponte a câmera.<br />
              3. Digite o PIN acima para autenticar instantaneamente.
            </p>

            <button
              type="button"
              onClick={handleStop}
              disabled={isLoading}
              className="w-full px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition cursor-pointer"
            >
              Encerrar Servidor P2P
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
