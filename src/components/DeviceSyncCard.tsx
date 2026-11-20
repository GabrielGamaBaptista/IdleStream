import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useAppStore } from '../stores/appStore';
import { deviceSyncService } from '../services/deviceSyncService';
import {
  Smartphone,
  Monitor,
  QrCode,
  Copy,
  RefreshCw,
  Unlink,
  Radio,
  Zap,
} from 'lucide-react';

export const DeviceSyncCard: React.FC = () => {
  const {
    config,
    deviceSyncRemoteState,
    pausedByOtherDevice,
    setDeviceSyncId,
    claimDeviceActive,
    checkDeviceSync,
    startAll,
    setSessionExportOpen,
  } = useAppStore();

  const [inputSyncId, setInputSyncId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeSyncId = config.device_sync_id || deviceSyncService.getSyncId();

  useEffect(() => {
    if (activeSyncId && showQr) {
      QRCode.toDataURL(`idlestream-devicesync:${activeSyncId}`, {
        width: 200,
        margin: 1.5,
        color: { dark: '#000000', light: '#ffffff' },
      })
        .then((url) => setQrDataUrl(url))
        .catch(() => setQrDataUrl(null));
    }
  }, [activeSyncId, showQr]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setErrorMessage(null);
      const newId = await deviceSyncService.createNewPairing();
      await setDeviceSyncId(newId);
      await checkDeviceSync();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLinkExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputSyncId.trim();
    if (!clean) return;
    try {
      setErrorMessage(null);
      await setDeviceSyncId(clean);
      setInputSyncId('');
      await checkDeviceSync();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const handleUnlink = async () => {
    if (window.confirm('Deseja realmente desvincular a sincronização com o celular?')) {
      await deviceSyncService.releaseActive();
      await setDeviceSyncId(null);
      setShowQr(false);
      setQrDataUrl(null);
    }
  };

  const handleCopy = () => {
    if (!activeSyncId) return;
    navigator.clipboard.writeText(activeSyncId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCheckNow = async () => {
    setIsChecking(true);
    await checkDeviceSync();
    setTimeout(() => setIsChecking(false), 800);
  };

  const handleTakeover = async () => {
    await claimDeviceActive();
    await startAll();
  };

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Elo PC ↔ Celular (Exclusão Mútua)</h3>
            <p className="text-xs text-neutral-400">
              Coordenação em tempo real para não farmar no PC e celular ao mesmo tempo pelo mesmo IP.
            </p>
          </div>
        </div>

        <span
          className={`flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
            activeSyncId
              ? pausedByOtherDevice
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
          }`}
        >
          <Radio className={`w-3 h-3 ${activeSyncId ? 'animate-pulse text-emerald-400' : ''}`} />
          <span>
            {!activeSyncId
              ? 'Não Vinculado'
              : pausedByOtherDevice
              ? '📱 Celular Ativo (PC Pausado)'
              : '🖥️ PC Ativo'}
          </span>
        </span>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs">
          {errorMessage}
        </div>
      )}

      {!activeSyncId ? (
        /* Estado 1: Não Vinculado */
        <div className="space-y-4">
          <p className="text-xs text-neutral-300">
            Ao vincular os dois dispositivos, quem abrir o app assume o farm automaticamente via nuvem. O outro dispositivo entra em modo vigília silencioso, evitando que a Twitch ou Kick detecte conexões simultâneas do mesmo IP.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Criando Código...' : 'Gerar Novo Código de Vinculação'}</span>
            </button>
          </div>

          <form onSubmit={handleLinkExisting} className="pt-2 border-t border-neutral-800/80 space-y-2">
            <label className="text-[11px] font-medium text-neutral-400 block">
              Ou cole um Código de Vinculação gerado no celular:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ex: 1234567"
                value={inputSyncId}
                onChange={(e) => setInputSyncId(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="submit"
                disabled={!inputSyncId.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition cursor-pointer disabled:opacity-40"
              >
                Vincular
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Estado 2: Vinculado */
        <div className="space-y-4">
          {/* Banner de Status Ativo */}
          {pausedByOtherDevice ? (
            <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-amber-200 block">
                  📱 O celular está farmando agora
                </span>
                <p className="text-[11px] text-amber-300/90">
                  Para proteger seus pontos, as streams deste computador estão pausadas.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTakeover}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-600/30 transition cursor-pointer shrink-0"
              >
                Tomar Farm para o PC
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-emerald-400" />
                <span>
                  {deviceSyncRemoteState?.isCurrentDeviceActive
                    ? 'Este computador está farmando ativamente (exclusão mútua garantida).'
                    : 'Dispositivos sincronizados. Pronto para farmar.'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCheckNow}
                disabled={isChecking}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-medium transition cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                <span>Verificar</span>
              </button>
            </div>
          )}

          {/* Código de Vinculação e QR Code */}
          <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Código de Vinculação (Sync ID)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-medium transition cursor-pointer"
                >
                  <QrCode className="w-3 h-3" />
                  <span>{showQr ? 'Ocultar QR' : 'Exibir QR Code'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-medium transition cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800 text-xs text-white font-mono">
              <span className="truncate">{activeSyncId}</span>
            </div>

            {showQr && qrDataUrl && (
              <div className="pt-2 text-center flex flex-col items-center justify-center space-y-1.5 animate-in fade-in">
                <div className="p-2 bg-white rounded-xl shadow-lg inline-block">
                  <img src={qrDataUrl} alt="QR Code de Vinculação" className="w-44 h-44" />
                </div>
                <p className="text-[11px] text-neutral-400">
                  Abra o IdleStream no celular e aponte a câmera para parear instantaneamente.
                </p>
              </div>
            )}
          </div>

          {/* Exportação P2P de Sessão (Feature 8) */}
          <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">Levar Contas para o Celular</p>
                <p className="text-[11px] text-neutral-400">
                  Transfira logins e tokens da Twitch e Kick via Wi-Fi local sem digitar senhas.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSessionExportOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer shrink-0"
            >
              Exportar Sessão
            </button>
          </div>

          {/* Ações inferiores */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleUnlink}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition cursor-pointer"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span>Desvincular Dispositivo</span>
            </button>

            {deviceSyncRemoteState?.lastUpdated ? (
              <span className="text-[11px] text-neutral-500 font-mono">
                Último sinal:{' '}
                {new Date(deviceSyncRemoteState.lastUpdated * 1000).toLocaleTimeString()}
              </span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
