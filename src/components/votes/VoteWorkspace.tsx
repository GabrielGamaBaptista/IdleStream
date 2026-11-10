import React, { useCallback, useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from '../../stores/appStore';
import {
  VoteAccountConfig,
  VoteBlockedPayload,
  VoteDetectedHintPayload,
  VoteUrlChangedPayload,
} from '../../types';
import {
  buildTopIdleVoteUrl,
  countReadyVoteAccounts,
  DEFAULT_TOPIDLE_GAME_URL,
  DEFAULT_VOTE_ACCOUNTS,
  formatCountdownHms,
  getVoteCooldownInfo,
  votePlatformService,
} from '../../services/votePlatformService';
import {
  BellRing,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  Link2,
  Lock,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Vote,
  X,
} from 'lucide-react';

function formatLocalTimestamp(unixSec?: number | null): string {
  if (!unixSec) return '—';
  try {
    return new Date(unixSec * 1000).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export const VoteWorkspace: React.FC = () => {
  const {
    config,
    updateVoteAccount,
    markVoteCompleted,
    resetVoteTimer,
    testVoteNotification,
    voteAlerts,
    dismissVoteAlert,
    isAddStreamOpen,
    isAddAccountOpen,
    pendingVoteOpenAccountId,
    clearPendingVoteOpenAccountId,
  } = useAppStore();

  const voteAccounts =
    config.vote_accounts && config.vote_accounts.length > 0
      ? config.vote_accounts
      : DEFAULT_VOTE_ACCOUNTS;
  const gameSlots = config.game_slots || [];

  const [nowSec, setNowSec] = useState<number>(() => Math.floor(Date.now() / 1000));
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [isPageLoading, setIsPageLoading] = useState<boolean>(false);
  const [blockedAlert, setBlockedAlert] = useState<VoteBlockedPayload | null>(null);
  const [voteDetectedHint, setVoteDetectedHint] = useState<VoteDetectedHintPayload | null>(null);
  const [editingAccount, setEditingAccount] = useState<VoteAccountConfig | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const webViewMountRef = useRef<HTMLDivElement | null>(null);

  // Ticker de 1 segundo para atualizar os contadores regressivos (24h 01m)
  useEffect(() => {
    const id = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Limpa WebView ao desmontar o componente
  useEffect(() => {
    return () => {
      votePlatformService.closeVoteWebView().catch(() => {});
    };
  }, []);

  // Consome foco pendente caso o usuário tenha clicado em uma notificação Android
  useEffect(() => {
    if (pendingVoteOpenAccountId) {
      const target = voteAccounts.find((v) => v.id === pendingVoteOpenAccountId);
      if (target) {
        setStatusBanner(
          `Notificação selecionada: a conta "${target.label}" (${target.player_identifier}) está pronta para votar no TopIdle.`
        );
      }
      clearPendingVoteOpenAccountId();
    }
  }, [pendingVoteOpenAccountId, voteAccounts, clearPendingVoteOpenAccountId]);

  const activeAccount = activeAccountId
    ? voteAccounts.find((a) => a.id === activeAccountId) || null
    : null;

  const isHiddenBehindModal = Boolean(editingAccount || isAddStreamOpen || isAddAccountOpen);

  // Sincroniza exatamente a geometria do container com a Child WebView nativa
  const syncBounds = useCallback(() => {
    if (!activeAccountId) return;
    const el = webViewMountRef.current;

    if (!el || isHiddenBehindModal) {
      votePlatformService
        .updateBounds({ x: -99999, y: -99999, width: 1, height: 1, visible: false })
        .catch(() => {});
      return;
    }

    const rect = el.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    const visible = width > 10 && height > 10;

    votePlatformService
      .updateBounds({
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: visible ? width : 1,
        height: visible ? height : 1,
        visible,
      })
      .catch(() => {});
  }, [activeAccountId, isHiddenBehindModal]);

  // Recalcula bounds quando layout, barras de aviso ou modais mudam
  useEffect(() => {
    syncBounds();
    const t1 = setTimeout(syncBounds, 50);
    const t2 = setTimeout(syncBounds, 180);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [syncBounds, blockedAlert, voteDetectedHint, statusBanner]);

  // ResizeObserver + window events (resize / focus / tray restore)
  useEffect(() => {
    if (!activeAccountId) return;

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && webViewMountRef.current) {
      ro = new ResizeObserver(() => syncBounds());
      ro.observe(webViewMountRef.current);
    }

    const onEventSync = () => syncBounds();
    window.addEventListener('resize', onEventSync);
    window.addEventListener('focus', onEventSync);

    let unlistenRestored: (() => void) | undefined;
    listen('window-restored', onEventSync)
      .then((unsub) => {
        unlistenRestored = unsub;
      })
      .catch(() => {});

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', onEventSync);
      window.removeEventListener('focus', onEventSync);
      if (unlistenRestored) unlistenRestored();
    };
  }, [activeAccountId, syncBounds]);

  // Escuta eventos Tauri (Desktop) e CustomEvents (Android) da WebView ativa
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    const onUrlChanged = (payload: VoteUrlChangedPayload) => {
      setCurrentUrl(payload.url);
      setIsPageLoading(payload.loading);
    };
    const onBlocked = (payload: VoteBlockedPayload) => {
      setBlockedAlert(payload);
    };
    const onHint = (payload: VoteDetectedHintPayload) => {
      setVoteDetectedHint(payload);
    };

    listen<VoteUrlChangedPayload>('vote-url-changed', (e) => onUrlChanged(e.payload))
      .then((unsub) => cleanups.push(unsub))
      .catch(() => {});
    listen<VoteBlockedPayload>('vote-navigation-blocked', (e) => onBlocked(e.payload))
      .then((unsub) => cleanups.push(unsub))
      .catch(() => {});
    listen<VoteDetectedHintPayload>('vote-detected-hint', (e) => onHint(e.payload))
      .then((unsub) => cleanups.push(unsub))
      .catch(() => {});

    const winUrl = (e: Event) => onUrlChanged((e as CustomEvent<VoteUrlChangedPayload>).detail);
    const winBlocked = (e: Event) => onBlocked((e as CustomEvent<VoteBlockedPayload>).detail);
    const winHint = (e: Event) => onHint((e as CustomEvent<VoteDetectedHintPayload>).detail);

    window.addEventListener('android-vote-url-changed', winUrl);
    window.addEventListener('android-vote-blocked', winBlocked);
    window.addEventListener('android-vote-detected-hint', winHint);

    return () => {
      cleanups.forEach((fn) => fn());
      window.removeEventListener('android-vote-url-changed', winUrl);
      window.removeEventListener('android-vote-blocked', winBlocked);
      window.removeEventListener('android-vote-detected-hint', winHint);
    };
  }, []);

  // ESC fecha modal de edição ou fecha WebView de voto
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingAccount) {
          setEditingAccount(null);
          setEditError(null);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingAccount]);

  const handleOpenVoteWebView = async (account: VoteAccountConfig) => {
    setBlockedAlert(null);
    setVoteDetectedHint(null);
    setStatusBanner(null);

    try {
      const targetUrl = buildTopIdleVoteUrl(account.base_url, account.player_identifier);
      setActiveAccountId(account.id);
      setCurrentUrl(targetUrl);
      setIsPageLoading(true);

      await votePlatformService.openVoteWebView(account);
      setTimeout(syncBounds, 60);
      setTimeout(syncBounds, 220);
    } catch (err: unknown) {
      setActiveAccountId(null);
      setIsPageLoading(false);
      setStatusBanner(`Não foi possível abrir o TopIdle: ${String(err)}`);
    }
  };

  const handleCloseWebView = async () => {
    setActiveAccountId(null);
    setCurrentUrl('');
    setIsPageLoading(false);
    setBlockedAlert(null);
    setVoteDetectedHint(null);
    try {
      await votePlatformService.closeVoteWebView();
    } catch (e) {
      console.warn('Erro ao fechar WebView de voto:', e);
    }
  };

  const handleReloadWebView = async () => {
    try {
      setIsPageLoading(true);
      await votePlatformService.reloadVoteWebView();
    } catch (e) {
      setStatusBanner(`Erro ao recarregar: ${String(e)}`);
    }
  };

  const handleClearTopIdleSession = async () => {
    if (!activeAccount) return;
    try {
      setVoteDetectedHint(null);
      await votePlatformService.clearTopIdleSession(activeAccount);
      setStatusBanner(
        `Sessão e cookies apenas de topidle.com foram limpos para "${activeAccount.label}" (suas sessões do PokeIdle e Google permaneceram intactas).`
      );
    } catch (e) {
      setStatusBanner(`Falha ao limpar sessão TopIdle: ${String(e)}`);
    }
  };

  const handleConfirmVote = async (account: VoteAccountConfig, closeOrAdvanceAfter = false) => {
    try {
      await markVoteCompleted(account.id);
      setVoteDetectedHint(null);
      setStatusBanner(
        `Voto registrado para "${account.label}"! Alerta automático programado para daqui a 24h 01m.`
      );

      if (closeOrAdvanceAfter && activeAccountId === account.id) {
        const nextReady = voteAccounts.find(
          (other) => other.id !== account.id && getVoteCooldownInfo(other.last_voted_at, nowSec).isReady
        );
        if (nextReady) {
          await handleOpenVoteWebView(nextReady);
        } else {
          await handleCloseWebView();
        }
      }
    } catch (e) {
      setStatusBanner(`Erro ao registrar voto: ${String(e)}`);
    }
  };

  const handleCopyUrl = async (account: VoteAccountConfig) => {
    try {
      const target = buildTopIdleVoteUrl(account.base_url, account.player_identifier);
      await navigator.clipboard.writeText(target);
      setCopiedId(account.id);
      setTimeout(() => setCopiedId((prev) => (prev === account.id ? null : prev)), 1800);
    } catch (_) {}
  };

  const handleTestNotification = async () => {
    const firstReady =
      voteAccounts.find((a) => getVoteCooldownInfo(a.last_voted_at, nowSec).isReady) ||
      voteAccounts[0];
    const res = await testVoteNotification(firstReady?.id);
    if (res) {
      setStatusBanner(`Notificação de teste disparada para "${res.label}"!`);
    }
  };

  const handleSaveEditModal = async () => {
    if (!editingAccount) return;
    try {
      buildTopIdleVoteUrl(editingAccount.base_url, editingAccount.player_identifier);
      const cleanLabel = editingAccount.label.trim() || editingAccount.player_identifier.trim() || editingAccount.id;
      await updateVoteAccount({
        ...editingAccount,
        label: cleanLabel,
        player_identifier: editingAccount.player_identifier.trim() || cleanLabel,
        base_url: editingAccount.base_url.trim() || DEFAULT_TOPIDLE_GAME_URL,
      });
      setEditError(null);
      setEditingAccount(null);
      setStatusBanner(`Configuração da conta "${cleanLabel}" salva.`);
    } catch (e: unknown) {
      setEditError(String(e));
    }
  };

  const readyCount = countReadyVoteAccounts(voteAccounts, nowSec);
  const nextReadyAccount = activeAccount
    ? voteAccounts.find(
        (a) => a.id !== activeAccount.id && getVoteCooldownInfo(a.last_voted_at, nowSec).isReady
      ) || null
    : null;

  return (
    <div className="flex flex-col h-full w-full bg-neutral-950 overflow-hidden select-none">
      {/* ===================================================================== */}
      {/* MODO WEBVIEW ATIVA SOB DEMANDA (EXCLUSIVA PARA TOPIDLE.COM)           */}
      {/* ===================================================================== */}
      {activeAccount ? (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Barra de Controle Superior da Sessão de Voto */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 shrink-0 z-20">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={handleCloseWebView}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition cursor-pointer shrink-0"
                title="Fechar WebView de voto e liberar 100% da memória"
              >
                <X className="w-3.5 h-3.5 text-red-400" />
                <span>Fechar WebView</span>
              </button>

              <div className="flex items-center gap-1.5 min-w-0 px-2.5 py-1 rounded-lg bg-neutral-950/90 border border-neutral-800">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: activeAccount.color }}
                />
                <span className="text-xs font-bold text-white truncate">
                  {activeAccount.label}
                </span>
                <span className="hidden sm:inline text-[11px] font-mono text-indigo-300 truncate max-w-[140px]">
                  ?playerIdentifier={activeAccount.player_identifier}
                </span>
              </div>

              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 text-[11px] font-medium shrink-0">
                <Lock className="w-3 h-3" />
                Somente TopIdle.com
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar shrink-0">
              <button
                onClick={handleReloadWebView}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700/80 transition cursor-pointer shrink-0"
                title="Recarregar página atual"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPageLoading ? 'animate-spin text-indigo-400' : ''}`} />
                <span className="hidden sm:inline">Recarregar</span>
              </button>

              <button
                onClick={handleClearTopIdleSession}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-amber-950/80 hover:text-amber-300 text-neutral-300 text-xs font-medium border border-neutral-700/80 transition cursor-pointer shrink-0"
                title="Limpar somente sessão/cookies do topidle.com (preserva Google e PokeIdle)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Limpar Sessão TopIdle</span>
              </button>

              {nextReadyAccount && (
                <button
                  onClick={() => handleOpenVoteWebView(nextReadyAccount)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 text-xs font-semibold border border-indigo-700/60 transition cursor-pointer shrink-0"
                  title={`Alternar para próxima conta pronta: ${nextReadyAccount.label}`}
                >
                  <Play className="w-3 h-3" />
                  <span>Próx: {nextReadyAccount.label}</span>
                </button>
              )}

              <button
                onClick={() => handleConfirmVote(activeAccount, true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-md shadow-emerald-600/30 cursor-pointer shrink-0"
                title="Confirmar que o voto foi enviado e iniciar o alarme de 24h 01m"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirmar Voto (+24h 01m)</span>
              </button>
            </div>
          </div>

          {/* Barra de URL Somente Leitura e Aviso CAPTCHA */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-1.5 bg-neutral-950 border-b border-neutral-800/80 text-[11px] shrink-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-neutral-400 font-mono truncate">
                {currentUrl || buildTopIdleVoteUrl(activeAccount.base_url, activeAccount.player_identifier)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-neutral-500 shrink-0">
              <span>
                {activeAccount.share_game_profile && activeAccount.linked_game_slot_id
                  ? `Perfil Google compartilhado (${
                      gameSlots.find((s) => s.id === activeAccount.linked_game_slot_id)?.label ||
                      activeAccount.linked_game_slot_id
                    })`
                  : 'Perfil isolado de voto'}
              </span>
            </div>
          </div>

          {/* Banner de Aviso caso Navegação Off-Site seja Bloqueada */}
          {blockedAlert && (
            <div className="flex items-center justify-between gap-2 px-4 py-2 bg-red-950/70 border-b border-red-800/70 text-xs text-red-200 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span className="truncate">
                  Navegação bloqueada para <strong>{blockedAlert.host}</strong> — esta WebView permite apenas{' '}
                  <code>topidle.com</code>, Google Login e CAPTCHA.
                </span>
              </div>
              <button
                onClick={() => setBlockedAlert(null)}
                className="text-red-300 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Banner quando Observer Passivo Detecta Confirmação na Página TopIdle */}
          {voteDetectedHint && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-emerald-950/80 border-b border-emerald-700/80 text-xs text-emerald-100 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
                <span>
                  {voteDetectedHint.reason === 'cooldown_already_active'
                    ? `O TopIdle indicou cooldown recente para "${activeAccount.label}". Deseja atualizar o timer para +24h 01m?`
                    : `Confirmação de voto detectada para "${activeAccount.label}"! Clique para iniciar o timer de 24h 01m.`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleConfirmVote(activeAccount, true)}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition cursor-pointer"
                >
                  Confirmar Agora (+24h 01m)
                </button>
                <button
                  onClick={() => setVoteDetectedHint(null)}
                  className="text-emerald-300 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Container DOM onde a Child WebView Nativa se Ancora */}
          <div
            ref={webViewMountRef}
            className="flex-1 w-full min-h-0 relative bg-black flex items-center justify-center overflow-hidden"
          >
            {isHiddenBehindModal ? (
              <div className="text-center p-4 text-neutral-400 text-xs">
                WebView pausada temporariamente enquanto o modal está aberto...
              </div>
            ) : (
              <div className="text-center p-4 text-neutral-500 text-xs">
                Carregando TopIdle interativo ({activeAccount.player_identifier})...
              </div>
            )}
          </div>
        </div>
      ) : (
        /* =================================================================== */
        /* MODO DASHBOARD (0 WEBVIEW ABERTA = 0 MB RAM)                        */
        /* =================================================================== */
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 space-y-6">
          {/* Header da Seção */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Vote className="w-5 h-5 text-amber-400" />
                  <span>Votos Diários (TopIdle)</span>
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border ${
                    readyCount > 0
                      ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/70'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                  }`}
                >
                  {readyCount}/{voteAccounts.length} prontas
                </span>
                <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-400 border border-neutral-800 text-[11px] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  0 MB em repouso
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Abra a WebView restrita ao <span className="text-neutral-200 font-medium">topidle.com</span> apenas
                na hora de votar nas 4 contas. O alerta dispara exatamente após <strong className="text-neutral-200">24h 01m</strong> do último voto.
              </p>
            </div>

            <button
              onClick={handleTestNotification}
              className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700/80 transition cursor-pointer shrink-0"
              title="Enviar notificação de teste no sistema e na interface"
            >
              <BellRing className="w-4 h-4 text-amber-400" />
              <span>Testar Notificação</span>
            </button>
          </div>

          {/* Banner de Feedback / Status */}
          {statusBanner && (
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-indigo-950/60 border border-indigo-800/70 text-xs text-indigo-100">
              <span>{statusBanner}</span>
              <button
                onClick={() => setStatusBanner(null)}
                className="text-indigo-300 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Alertas de Votos Prontos (24h 01m concluído) */}
          {voteAlerts.length > 0 && (
            <div className="space-y-2">
              {voteAlerts.map((alert) => {
                const targetAcc = voteAccounts.find((a) => a.id === alert.account_id);
                return (
                  <div
                    key={`${alert.account_id}-${alert.last_voted_at}-${alert.is_test ? 't' : 'r'}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 rounded-xl bg-emerald-950/60 border border-emerald-700/70 shadow-lg shadow-emerald-950/20"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <BellRing className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 animate-bounce" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-emerald-200">{alert.title}</p>
                        <p className="text-xs text-emerald-300/90 mt-0.5">{alert.body}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {targetAcc && (
                        <button
                          onClick={() => handleOpenVoteWebView(targetAcc)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Votar Agora</span>
                        </button>
                      )}
                      <button
                        onClick={() => dismissVoteAlert(alert.account_id, alert.last_voted_at)}
                        className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900/60 transition cursor-pointer"
                        title="Dispensar aviso"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Grid com as 4 Contas de Voto */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {voteAccounts.map((acc) => {
              const cooldown = getVoteCooldownInfo(acc.last_voted_at, nowSec);
              const linkedSlot = acc.linked_game_slot_id
                ? gameSlots.find((s) => s.id === acc.linked_game_slot_id)
                : null;
              let fullTargetUrl = DEFAULT_TOPIDLE_GAME_URL;
              try {
                fullTargetUrl = buildTopIdleVoteUrl(acc.base_url, acc.player_identifier);
              } catch (_) {}

              return (
                <div
                  key={acc.id}
                  className={`rounded-2xl border p-4 sm:p-5 bg-neutral-900/70 transition flex flex-col justify-between gap-4 ${
                    cooldown.isReady
                      ? 'border-emerald-700/60 shadow-lg shadow-emerald-950/15'
                      : 'border-neutral-800'
                  }`}
                >
                  {/* Cabeçalho do Card */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-3 h-10 rounded-full shrink-0"
                          style={{ backgroundColor: acc.color }}
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm sm:text-base font-bold text-white truncate">
                              {acc.label}
                            </h3>
                            <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-indigo-300 font-mono text-[11px] border border-neutral-700/70">
                              {acc.player_identifier}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-neutral-400">
                            <span className="inline-flex items-center gap-1">
                              <Link2 className="w-3 h-3 text-indigo-400" />
                              {acc.share_game_profile && acc.linked_game_slot_id
                                ? `Google: ${linkedSlot?.label || acc.linked_game_slot_id} (${acc.linked_game_slot_id})`
                                : 'Perfil Google isolado (votos)'}
                            </span>
                            {acc.google_hint && (
                              <span className="px-1.5 py-0.5 rounded bg-neutral-800/80 text-neutral-300 font-mono text-[10px]">
                                {acc.google_hint}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Pill Status Cooldown */}
                      {cooldown.isReady ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-700/70 text-[11px] font-semibold flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Pronto para votar!</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-950/70 text-amber-300 border border-amber-700/60 text-[11px] font-mono font-semibold flex items-center gap-1 shrink-0 tabular-nums">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatCountdownHms(cooldown.remainingSeconds)}</span>
                        </span>
                      )}
                    </div>

                    {/* Preview da URL TopIdle */}
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-neutral-950/80 border border-neutral-800/90 text-[11px]">
                      <span className="text-neutral-400 font-mono truncate select-text">
                        {fullTargetUrl}
                      </span>
                      <button
                        onClick={() => handleCopyUrl(acc)}
                        className="text-neutral-400 hover:text-white transition cursor-pointer shrink-0 flex items-center gap-1"
                        title="Copiar link direto de voto"
                      >
                        {copiedId === acc.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Progresso e Horários (+24h 01m) */}
                    <div className="space-y-1.5">
                      <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            cooldown.isReady ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${cooldown.progressPct}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400">
                        <span>
                          Último voto:{' '}
                          <strong className="text-neutral-300 font-medium">
                            {acc.last_voted_at ? formatLocalTimestamp(acc.last_voted_at) : 'Nunca registrado'}
                          </strong>
                        </span>
                        <span>
                          {cooldown.readyAt ? (
                            <>
                              Libera (+24h 01m):{' '}
                              <strong className={cooldown.isReady ? 'text-emerald-400' : 'text-amber-300'}>
                                {formatLocalTimestamp(cooldown.readyAt)}
                              </strong>
                            </>
                          ) : (
                            <span>Total de votos: {acc.total_votes}</span>
                          )}
                        </span>
                      </div>
                      {acc.last_voted_at && (
                        <div className="flex items-center justify-between text-[11px] text-neutral-500">
                          <span>Total registrado no app: {acc.total_votes}</span>
                          <span>
                            Notificação: {acc.notifications_enabled ? 'Ativada (24h 01m)' : 'Desativada'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações do Card */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-800/80">
                    <button
                      onClick={() => handleOpenVoteWebView(acc)}
                      className={`flex-1 min-w-[160px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        cooldown.isReady
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                          : 'bg-indigo-600/90 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Abrir TopIdle & Votar</span>
                    </button>

                    <button
                      onClick={() => handleConfirmVote(acc, false)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700/70 transition cursor-pointer"
                      title="Marcar manualmente que votou agora e iniciar timer de 24h 01m"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Já Votei Agora</span>
                    </button>

                    {acc.last_voted_at && (
                      <button
                        onClick={() => resetVoteTimer(acc.id)}
                        className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-amber-300 border border-neutral-700/70 transition cursor-pointer"
                        title="Zerar timer e marcar conta como pronta"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setEditError(null);
                        setEditingAccount({ ...acc });
                      }}
                      className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white border border-neutral-700/70 transition cursor-pointer"
                      title="Editar identificadores e vínculo de perfil Google"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL DE EDIÇÃO DA CONTA DE VOTO                                      */}
      {/* ===================================================================== */}
      {editingAccount && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingAccount(null);
              setEditError(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-text"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 w-full max-w-md shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>Configurar Conta de Voto</span>
              </h3>
              <button
                onClick={() => {
                  setEditingAccount(null);
                  setEditError(null);
                }}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="px-3 py-2 rounded-lg bg-red-950/70 border border-red-800/80 text-xs text-red-200">
                {editError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">
                  Nome de Exibição
                </label>
                <input
                  type="text"
                  value={editingAccount.label}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, label: e.target.value })
                  }
                  placeholder="Ex: GGB2006_3"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">
                  Identificador do Jogador (<code>playerIdentifier</code>)
                </label>
                <input
                  type="text"
                  value={editingAccount.player_identifier}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      player_identifier: e.target.value,
                    })
                  }
                  placeholder="Ex: GGB2006_3"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-mono text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">
                  URL Base do Jogo no TopIdle (somente <code>https://topidle.com</code>)
                </label>
                <input
                  type="text"
                  value={editingAccount.base_url}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, base_url: e.target.value })
                  }
                  placeholder={DEFAULT_TOPIDLE_GAME_URL}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-mono text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">
                  Vincular ao Perfil de Sessão do Idle Games
                </label>
                <select
                  value={editingAccount.linked_game_slot_id || ''}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      linked_game_slot_id: e.target.value || null,
                    })
                  }
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="">Sem vínculo (usar perfil próprio)</option>
                  {gameSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.id} — {slot.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="vote_share_profile"
                  checked={editingAccount.share_game_profile}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      share_game_profile: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="vote_share_profile" className="text-xs text-neutral-300 cursor-pointer">
                  Compartilhar perfil/cookies do Google com o slot do Idle Games vinculado
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">
                  Lembrete da Conta Google (opcional)
                </label>
                <input
                  type="text"
                  value={editingAccount.google_hint || ''}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      google_hint: e.target.value || null,
                    })
                  }
                  placeholder="Ex: conta3@gmail.com"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="vote_notif_enabled"
                  checked={editingAccount.notifications_enabled}
                  onChange={(e) =>
                    setEditingAccount({
                      ...editingAccount,
                      notifications_enabled: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="vote_notif_enabled" className="text-xs text-neutral-300 cursor-pointer">
                  Notificar quando completar 24h 01m após o último voto
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditingAccount(null);
                  setEditError(null);
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditModal}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
