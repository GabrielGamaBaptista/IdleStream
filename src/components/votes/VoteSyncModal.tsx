import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Smartphone,
  CheckCircle,
  Copy,
  X,
  Unlink,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { voteSyncService } from '../../services/voteSyncService';
import { VoteAccountConfig } from '../../types';

interface VoteSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  voteAccounts: VoteAccountConfig[];
  onSyncStateChanged: () => void;
}

export const VoteSyncModal: React.FC<VoteSyncModalProps> = ({
  isOpen,
  onClose,
  voteAccounts,
  onSyncStateChanged,
}) => {
  const [currentSyncId, setCurrentSyncId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const existingId = voteSyncService.getSyncId();
    setCurrentSyncId(existingId);
    setErrorMsg(null);
    setCopiedSuccess(false);

    if (existingId) {
      generateQr(existingId);
    }

    const handleIncomingSync = (e: any) => {
      const id = e.detail?.syncId;
      if (id) {
        setCurrentSyncId(id);
        generateQr(id);
        onSyncStateChanged();
      }
    };
    window.addEventListener('idlestream-vote-sync-id', handleIncomingSync);
    return () => window.removeEventListener('idlestream-vote-sync-id', handleIncomingSync);
  }, [isOpen, onSyncStateChanged]);

  const generateQr = async (id: string) => {
    try {
      // Deep Link nativo do IdleStream (registrado no AndroidManifest.xml)
      const payload = `idlestream://vote-sync?id=${encodeURIComponent(id)}`;
      const url = await QRCode.toDataURL(payload, {
        width: 260,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrDataUrl(url);
    } catch (e) {
      console.error('Erro ao gerar QRCode:', e);
    }
  };

  const handleCreateNewPairing = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const newId = await voteSyncService.createNewPairingId(voteAccounts);
      setCurrentSyncId(newId);
      await generateQr(newId);
      onSyncStateChanged();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Erro ao criar pareamento');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConnectExisting = async () => {
    const clean = inputCode.trim();
    if (!clean) {
      setErrorMsg('Por favor, informe o código ou link de pareamento do outro dispositivo.');
      return;
    }

    // Extrair ID se for uma URL completa
    let extractedId = clean;
    if (clean.includes('id=')) {
      try {
        const u = new URL(clean.replace('idlestream://', 'http://dummy/'));
        extractedId = u.searchParams.get('id') || clean;
      } catch (_) {}
    }

    voteSyncService.setSyncId(extractedId);
    setCurrentSyncId(extractedId);
    await generateQr(extractedId);
    setInputCode('');
    onSyncStateChanged();
  };

  const handleDisconnect = () => {
    voteSyncService.setSyncId(null);
    setCurrentSyncId(null);
    setQrDataUrl('');
    onSyncStateChanged();
  };

  const handleCopyId = () => {
    if (!currentSyncId) return;
    navigator.clipboard.writeText(currentSyncId).then(() => {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-indigo-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Sincronização PC ↔ Celular
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  Automática
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Acesse o app de qualquer lugar e mantenha os timers de votos 100% alinhados.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-950/70 border border-red-800/80 rounded-xl text-xs text-red-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {currentSyncId ? (
            /* Dispositivo Pareado */
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-xs font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Pareamento Ativo e Sincronizado</span>
              </div>

              {/* QR Code */}
              {qrDataUrl && (
                <div className="p-3 bg-white rounded-2xl shadow-lg border-4 border-neutral-800 inline-block">
                  <img
                    src={qrDataUrl}
                    alt="QR Code de Sincronização"
                    className="w-52 h-52 object-contain block mx-auto rounded-lg"
                  />
                </div>
              )}

              <p className="text-xs text-neutral-300 max-w-sm">
                Aponte a câmera do seu celular para este QR Code ou insira o código abaixo no outro dispositivo. Toda vez que o app for aberto, ele atualizará os votos automaticamente.
              </p>

              {/* Chave de Pareamento com Copiar */}
              <div className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
                <div className="text-left overflow-hidden">
                  <span className="text-[10px] text-neutral-500 uppercase font-semibold block">
                    Código de Pareamento
                  </span>
                  <span className="font-mono text-xs text-indigo-300 truncate block select-all">
                    {currentSyncId}
                  </span>
                </div>
                <button
                  onClick={handleCopyId}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedSuccess ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <div className="w-full pt-2 border-t border-neutral-800 flex justify-between items-center">
                <button
                  onClick={handleDisconnect}
                  className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 hover:underline cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Desconectar Pareamento</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          ) : (
            /* Dispositivo Não Pareado */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>Opção 1: Gerar QR Code para Ler no Outro Aparelho</span>
                </div>
                <p className="text-xs text-neutral-400">
                  Gere um QR Code exclusivo neste dispositivo para escanear com a câmera do seu celular (ou vice-versa).
                </p>
                <button
                  onClick={handleCreateNewPairing}
                  disabled={isGenerating}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/30"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{isGenerating ? 'Gerando Código...' : 'Gerar QR Code de Pareamento'}</span>
                </button>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-neutral-800"></div>
                <span className="bg-neutral-900 px-3 text-[11px] text-neutral-500 font-semibold uppercase">
                  Ou
                </span>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                  <Smartphone className="w-4 h-4" />
                  <span>Opção 2: Conectar Usando Código Existente</span>
                </div>
                <p className="text-xs text-neutral-400">
                  Já gerou o código no outro aparelho? Cole o identificador abaixo:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="Ex: ff808181a09d98f7... ou cole o link"
                    className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white font-mono placeholder:text-neutral-600 focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    onClick={handleConnectExisting}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer shrink-0"
                  >
                    Conectar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
