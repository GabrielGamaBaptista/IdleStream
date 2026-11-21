import React, { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import {
  Save,
  CheckCircle2,
  Sparkles,
  Download,
  Smartphone,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Archive,
  RotateCcw,
  Clock,
  ChevronDown,
  ChevronUp,
  Moon,
} from 'lucide-react';
import { BatteryBanner } from './BatteryBanner';
import { DeviceSyncCard } from './DeviceSyncCard';
import { AuditLogViewer } from './AuditLogViewer';

export const SettingsTab: React.FC = () => {
  const {
    config,
    updateSettings,
    appVersion,
    updateAvailable,
    updateDownloadProgress,
    isCheckingUpdate,
    isInstallingUpdate,
    updateStatusMessage,
    checkForUpdates,
    installUpdate,
    backups,
    lastBackupInfo,
    createBackupNow,
    restoreBackupById,
    fetchBackups,
    nightModeActive,
    nightModeStartedAt,
    toggleNightMode,
  } = useAppStore();
  const [form, setForm] = useState(config.settings);
  const [saved, setSaved] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);
  const [showBackupsList, setShowBackupsList] = useState(false);
  const [restoringBackupId, setRestoringBackupId] = useState<string | null>(null);
  const isAndroid = typeof window !== 'undefined' && Boolean(window.AndroidBridge?.isAndroid?.());

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    setBackupSuccessMessage(null);
    const result = await createBackupNow();
    setIsBackingUp(false);
    if (result) {
      setBackupSuccessMessage(`Backup "${result.id}" criado com sucesso! (${result.file_count} arquivos)`);
      setTimeout(() => setBackupSuccessMessage(null), 4000);
    }
  };

  const handleRestore = async (id: string) => {
    if (
      window.confirm(
        'Deseja realmente restaurar este backup? O aplicativo será reiniciado automaticamente com as configurações restauradas.'
      )
    ) {
      setRestoringBackupId(id);
      try {
        await restoreBackupById(id);
      } catch (e) {
        alert('Falha ao restaurar backup: ' + e);
        setRestoringBackupId(null);
      }
    }
  };

  const formatDate = (epochSecs: number) => {
    if (!epochSecs) return 'Nenhum';
    return new Date(epochSecs * 1000).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatReason = (reason: string) => {
    switch (reason) {
      case 'daily':
        return 'Diário Automático';
      case 'manual':
        return 'Manual';
      case 'pre-update':
        return 'Pré-Atualização';
      default:
        return reason;
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Configurações Gerais</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Ajuste as preferências de inicialização, comportamento da bandeja e otimizações de recursos.
        </p>
      </div>

      <BatteryBanner />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Modo Noturno Section */}
        <div
          className={`border rounded-xl p-5 space-y-3.5 transition duration-200 ${
            nightModeActive
              ? 'bg-indigo-950/30 border-indigo-500/50 shadow-lg shadow-indigo-950/40'
              : 'bg-neutral-900/60 border-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Moon
                className={`w-4 h-4 ${
                  nightModeActive ? 'text-indigo-400 animate-pulse' : 'text-neutral-400'
                }`}
              />
              <h3 className="text-sm font-semibold text-white">
                Modo Noturno (Madrugada Ultra-Econômica)
              </h3>
            </div>
            {nightModeActive && (
              <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold animate-pulse">
                🌙 Ativo {nightModeStartedAt ? `(há ${Math.max(1, Math.floor((Date.now() / 1000 - nightModeStartedAt) / 60))} min • 10 FPS)` : '(10 FPS + Ultra)'}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1 pr-4">
              <span className="text-sm text-neutral-200 font-medium block">
                {nightModeActive
                  ? 'Desativar Modo Noturno'
                  : 'Ativar Modo Noturno para a Madrugada'}
              </span>
              <p className="text-xs text-neutral-400">
                Reduz o FPS de todos os slots PokeIdle para <strong>10 FPS</strong> e força o{' '}
                <strong>Modo Ultra</strong> para economizar até 80% de energia e GPU enquanto você
                dorme. Ao acordar e focar na janela, um <strong>Relatório Matinal</strong> detalhado
                exibe tudo o que foi farmado.
              </p>
            </div>

            <button
              type="button"
              onClick={() => toggleNightMode()}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition cursor-pointer shrink-0 ${
                nightModeActive
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>{nightModeActive ? 'Desativar Noturno' : 'Ativar Noturno'}</span>
            </button>
          </div>
        </div>

        {/* Modo Vigília / Standby Section */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white border-b border-neutral-800 pb-2">
            Modo Vigília (Economia Máxima de Recursos)
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="autoLive" className="text-sm text-neutral-200 font-medium block cursor-pointer">
                Só ativar quando o streamer estiver efetivamente AO VIVO
              </label>
              <p className="text-xs text-neutral-400">
                Se a live estiver offline, a stream fica em modo vigília consumindo <strong>0 MB de RAM</strong>. Assim que o streamer entrar ao vivo, o IdleStream inicia a stream automaticamente!
              </p>
            </div>
            <input
              type="checkbox"
              id="autoLive"
              checked={form.auto_live_only}
              onChange={(e) => setForm({ ...form, auto_live_only: e.target.checked })}
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-indigo-600 cursor-pointer"
            />
          </div>
        </div>

        {/* App Behavior Section */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white border-b border-neutral-800 pb-2">
            Comportamento do Sistema
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="tray" className="text-sm text-neutral-200 font-medium block cursor-pointer">
                Minimizar para a Bandeja do Sistema (Tray)
              </label>
              <p className="text-xs text-neutral-400">
                Ao fechar a janela, o IdleStream continua rodando em segundo plano mantendo suas streams ativas.
              </p>
            </div>
            <input
              type="checkbox"
              id="tray"
              checked={form.minimize_to_tray}
              onChange={(e) => setForm({ ...form, minimize_to_tray: e.target.checked })}
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-indigo-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <label htmlFor="reconnect" className="text-sm text-neutral-200 font-medium block cursor-pointer">
                Reconexão Automática
              </label>
              <p className="text-xs text-neutral-400">
                Tentar reconectar automaticamente streams que forem desconectadas por instabilidade.
              </p>
            </div>
            <input
              type="checkbox"
              id="reconnect"
              checked={form.auto_reconnect}
              onChange={(e) => setForm({ ...form, auto_reconnect: e.target.checked })}
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-indigo-600 cursor-pointer"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div>
              <label htmlFor="delay" className="text-sm text-neutral-200 font-medium block">
                Intervalo de checagem / reconexão (segundos)
              </label>
              <p className="text-xs text-neutral-400">
                Tempo de intervalo entre checagens de live e tentativas de reconexão.
              </p>
            </div>
            <input
              type="number"
              id="delay"
              min={3}
              max={120}
              value={form.reconnect_delay_secs}
              onChange={(e) => setForm({ ...form, reconnect_delay_secs: parseInt(e.target.value) || 10 })}
              className="w-20 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-sm text-white text-center font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Kick Resource Optimizations */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white border-b border-neutral-800 pb-2">
            Otimizações de Recursos (Kick Live WebViews)
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="kickMute" className="text-sm text-neutral-200 font-medium block cursor-pointer">
                Mutar áudio de todas as transmissões da Kick
              </label>
              <p className="text-xs text-neutral-400">
                Força volume zero e mudo para economizar processamento de decodificação de áudio.
              </p>
            </div>
            <input
              type="checkbox"
              id="kickMute"
              checked={form.kick_mute_audio}
              onChange={(e) => setForm({ ...form, kick_mute_audio: e.target.checked })}
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-emerald-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <label htmlFor="kickChat" className="text-sm text-neutral-200 font-medium block cursor-pointer">
                Ocultar mensagens de chat (preservando menu de resgates de pontos)
              </label>
              <p className="text-xs text-neutral-400">
                Elimina a renderização constante das mensagens para economizar RAM e CPU.
              </p>
            </div>
            <input
              type="checkbox"
              id="kickChat"
              checked={form.kick_hide_chat}
              onChange={(e) => setForm({ ...form, kick_hide_chat: e.target.checked })}
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-emerald-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <label htmlFor="kickLow" className="text-sm text-neutral-200 font-medium block cursor-pointer">
                Forçar qualidade mínima de vídeo (160p/360p)
              </label>
              <p className="text-xs text-neutral-400">
                Seleciona a menor resolução disponível no player da Kick para minimizar banda e uso de GPU.
              </p>
            </div>
            <input
              type="checkbox"
              id="kickLow"
              checked={form.kick_lowest_quality}
              onChange={(e) => setForm({ ...form, kick_lowest_quality: e.target.checked })}
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-emerald-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Configurações</span>
          </button>

          {saved && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Configurações salvas com sucesso!</span>
            </div>
          )}
        </div>
      </form>

      {/* Atualizações do Aplicativo */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Atualizações do Aplicativo</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-neutral-800/80 text-neutral-300 font-medium">
              {isAndroid ? (
                <>
                  <Smartphone className="w-3 h-3 text-emerald-400" />
                  <span>Android (APK)</span>
                </>
              ) : (
                <>
                  <Monitor className="w-3 h-3 text-blue-400" />
                  <span>Desktop (Windows)</span>
                </>
              )}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-neutral-800/80 text-neutral-300 font-mono">
              v{appVersion}
            </span>
          </div>
        </div>

        <p className="text-xs text-neutral-400">
          O IdleStream verifica automaticamente novas releases no GitHub. {isAndroid ? 'No Android, a atualização é baixada diretamente e abre o instalador do sistema para confirmação.' : 'No Windows, a atualização substitui o aplicativo automaticamente.'}
        </p>

        {updateAvailable ? (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-300 block">
                  🎉 Nova versão v{updateAvailable.version} disponível!
                </span>
                {updateAvailable.body && (
                  <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-2">
                    {updateAvailable.body}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => installUpdate()}
                disabled={isInstallingUpdate}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition cursor-pointer disabled:opacity-70 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {isInstallingUpdate
                    ? (updateDownloadProgress !== null && updateDownloadProgress > 0
                        ? `Baixando (${updateDownloadProgress}%)...`
                        : 'Instalando...')
                    : 'Instalar Atualização'}
                </span>
              </button>
            </div>

            {isInstallingUpdate && updateDownloadProgress !== null && (
              <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${updateDownloadProgress}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => checkForUpdates(true)}
              disabled={isCheckingUpdate}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700/60 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isCheckingUpdate ? 'Buscando atualizações...' : 'Verificar Atualizações Agora'}</span>
            </button>

            {updateStatusMessage && (
              <span className="text-xs text-emerald-400 font-medium">
                {updateStatusMessage}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Rede de Segurança e Backups Automáticos */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Segurança & Backups Automáticos</h3>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Crash-Guard Ativo
          </span>
        </div>

        <p className="text-xs text-neutral-400">
          O IdleStream monitora a estabilidade do processo na inicialização (Crash-loop Guard) e gera backups automáticos das suas configurações diariamente e antes de alterações críticas.
        </p>

        {/* Status do último backup */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block">
              Último Backup
            </span>
            <div className="flex items-center gap-2 text-xs text-neutral-200">
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
              <span>
                {lastBackupInfo ? (
                  <>
                    <strong className="text-white font-medium">{formatDate(lastBackupInfo.created_at)}</strong>{' '}
                    <span className="text-neutral-400">({formatReason(lastBackupInfo.reason)} • {lastBackupInfo.file_count} arquivos)</span>
                  </>
                ) : (
                  'Nenhum backup realizado ainda'
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualBackup}
              disabled={isBackingUp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
            >
              <Archive className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-spin' : ''}`} />
              <span>{isBackingUp ? 'Criando...' : 'Fazer Backup Agora'}</span>
            </button>

            {backups.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowBackupsList(!showBackupsList);
                  if (!showBackupsList) fetchBackups();
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700/60 transition cursor-pointer"
              >
                <span>Histórico ({backups.length})</span>
                {showBackupsList ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {backupSuccessMessage && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{backupSuccessMessage}</span>
          </div>
        )}

        {/* Lista expansível de backups */}
        {showBackupsList && backups.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-neutral-800 animate-in fade-in duration-150">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1.5">
              Backups Salvos em Disco (Retenção Máxima: 8)
            </span>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {backups.map((bkp, idx) => (
                <div
                  key={bkp.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{formatDate(bkp.created_at)}</span>
                      {idx === 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Recente
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                        {formatReason(bkp.reason)}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono">
                      v{bkp.version} • {bkp.file_count} arquivos • {bkp.id}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={Boolean(restoringBackupId)}
                    onClick={() => handleRestore(bkp.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-medium border border-neutral-700/60 transition cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3 h-3 ${restoringBackupId === bkp.id ? 'animate-spin' : ''}`} />
                    <span>{restoringBackupId === bkp.id ? 'Restaurando...' : 'Restaurar'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Elo PC ↔ Celular (Exclusão Mútua Cloud) */}
      <DeviceSyncCard />

      {/* Diagnóstico e Relatório de Auditoria (Rotativo 6h em Disco) */}
      <AuditLogViewer />
    </div>
  );
};
