import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { AlertConfig } from '../types';
import {
  Bell,
  Send,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  MessageSquare,
  Monitor,
  Flame,
  Radio,
} from 'lucide-react';

const DEFAULT_ALERT_CONFIG: AlertConfig = {
  desktop_notifications: true,
  ntfy_enabled: false,
  ntfy_topic: '',
  discord_enabled: false,
  discord_webhook: '',
  events: {
    stream_offline: true,
    auth_failure: true,
    redeem_failed: true,
    points_milestone: false,
    points_milestone_value: 10000,
  },
};

export const AlertSettingsCard: React.FC = () => {
  const { config, updateAlertConfig, testAlert } = useAppStore();
  const [alertConfig, setAlertConfig] = useState<AlertConfig>(
    config.settings.alert_config || DEFAULT_ALERT_CONFIG
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  useEffect(() => {
    if (config.settings.alert_config) {
      setAlertConfig(config.settings.alert_config);
    }
  }, [config.settings.alert_config]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setIsSaving(true);
      await updateAlertConfig(alertConfig);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Falha ao salvar alertas:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setIsTesting(true);
      setTestMessage(null);
      // Salva a configuração atual antes de testar para usar valores recém-digitados
      await updateAlertConfig(alertConfig);
      await testAlert();
      setTestMessage('Alerta de teste disparado com sucesso nos canais ativos!');
      setTimeout(() => setTestMessage(null), 4000);
    } catch (err) {
      setTestMessage('Falha ao disparar alerta de teste: ' + String(err));
    } finally {
      setIsTesting(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      if (res === 'granted') {
        alert('Permissão para notificações na Área de Trabalho concedida!');
      }
    }
  };

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Alertas e Notificações Multicanal</h3>
            <p className="text-xs text-neutral-400">
              Notificações de quedas de live, expiração de tokens e metas de pontos.
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
          <Radio className="w-3 h-3 text-indigo-400 animate-pulse" />
          ntfy • Discord • SO
        </span>
      </div>

      {/* Canais de Entrega */}
      <div className="space-y-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
          1. Canais de Entrega
        </span>

        {/* 1.1 Desktop */}
        <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-neutral-300" />
              <label htmlFor="chk-desktop" className="text-xs font-medium text-white cursor-pointer">
                Notificações na Área de Trabalho (Desktop / SO)
              </label>
            </div>
            <input
              type="checkbox"
              id="chk-desktop"
              checked={alertConfig.desktop_notifications}
              onChange={(e) =>
                setAlertConfig({ ...alertConfig, desktop_notifications: e.target.checked })
              }
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-indigo-600 cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-neutral-400 pl-6">
            Emite toasts do Windows e notificações no navegador quando o IdleStream estiver minimizado.
            {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
              <button
                type="button"
                onClick={requestNotificationPermission}
                className="ml-2 text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer"
              >
                Autorizar notificações do sistema
              </button>
            )}
          </p>
        </div>

        {/* 1.2 ntfy.sh */}
        <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <label htmlFor="chk-ntfy" className="text-xs font-medium text-white cursor-pointer">
                Push no Celular via ntfy.sh (Gratuito e sem cadastro)
              </label>
            </div>
            <input
              type="checkbox"
              id="chk-ntfy"
              checked={alertConfig.ntfy_enabled}
              onChange={(e) =>
                setAlertConfig({ ...alertConfig, ntfy_enabled: e.target.checked })
              }
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-indigo-600 cursor-pointer"
            />
          </div>

          <p className="text-[11px] text-neutral-400 pl-6">
            Instale o app gratuito <strong>ntfy</strong> no seu celular (Android / iOS) e assine o nome do tópico que você escolher abaixo.
          </p>

          {alertConfig.ntfy_enabled && (
            <div className="pl-6 pt-1">
              <label className="text-[11px] text-neutral-300 block mb-1 font-medium">
                Nome do Tópico ntfy.sh (ex: <code className="text-emerald-400">idlestream-meunome</code>):
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500 font-mono">https://ntfy.sh/</span>
                <input
                  type="text"
                  placeholder="escolha-um-topico-unico"
                  value={alertConfig.ntfy_topic || ''}
                  onChange={(e) =>
                    setAlertConfig({ ...alertConfig, ntfy_topic: e.target.value.trim() })
                  }
                  className="flex-1 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* 1.3 Discord Webhook */}
        <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <label htmlFor="chk-discord" className="text-xs font-medium text-white cursor-pointer">
                Canal no Discord (Webhook)
              </label>
            </div>
            <input
              type="checkbox"
              id="chk-discord"
              checked={alertConfig.discord_enabled}
              onChange={(e) =>
                setAlertConfig({ ...alertConfig, discord_enabled: e.target.checked })
              }
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-indigo-600 cursor-pointer"
            />
          </div>

          <p className="text-[11px] text-neutral-400 pl-6">
            Envia mensagens formatadas em embeds elegantes para qualquer canal de texto do Discord.
          </p>

          {alertConfig.discord_enabled && (
            <div className="pl-6 pt-1">
              <label className="text-[11px] text-neutral-300 block mb-1 font-medium">
                URL do Webhook do Discord:
              </label>
              <input
                type="text"
                placeholder="https://discord.com/api/webhooks/..."
                value={alertConfig.discord_webhook || ''}
                onChange={(e) =>
                  setAlertConfig({ ...alertConfig, discord_webhook: e.target.value.trim() })
                }
                className="w-full px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          )}
        </div>
      </div>

      {/* Eventos Monitorados */}
      <div className="space-y-3 pt-2 border-t border-neutral-800">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
          2. Eventos que Disparam Notificação
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Stream offline */}
          <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-200 cursor-pointer hover:bg-neutral-800/40 transition">
            <input
              type="checkbox"
              checked={alertConfig.events.stream_offline}
              onChange={(e) =>
                setAlertConfig({
                  ...alertConfig,
                  events: { ...alertConfig.events, stream_offline: e.target.checked },
                })
              }
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-indigo-600 cursor-pointer"
            />
            <span>Stream ficou offline</span>
          </label>

          {/* Falha de auth */}
          <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-200 cursor-pointer hover:bg-neutral-800/40 transition">
            <input
              type="checkbox"
              checked={alertConfig.events.auth_failure}
              onChange={(e) =>
                setAlertConfig({
                  ...alertConfig,
                  events: { ...alertConfig.events, auth_failure: e.target.checked },
                })
              }
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-indigo-600 cursor-pointer"
            />
            <span>Falha de autenticação (sessão expirada)</span>
          </label>

          {/* Falha de resgate */}
          <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-200 cursor-pointer hover:bg-neutral-800/40 transition">
            <input
              type="checkbox"
              checked={alertConfig.events.redeem_failed}
              onChange={(e) =>
                setAlertConfig({
                  ...alertConfig,
                  events: { ...alertConfig.events, redeem_failed: e.target.checked },
                })
              }
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-indigo-600 cursor-pointer"
            />
            <span>Falha ao resgatar baú/bônus</span>
          </label>

          {/* Marco de pontos */}
          <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-200 cursor-pointer hover:bg-neutral-800/40 transition">
            <input
              type="checkbox"
              checked={alertConfig.events.points_milestone}
              onChange={(e) =>
                setAlertConfig({
                  ...alertConfig,
                  events: { ...alertConfig.events, points_milestone: e.target.checked },
                })
              }
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-indigo-600 cursor-pointer"
            />
            <span>Marco de pontos atingido</span>
          </label>
        </div>

        {alertConfig.events.points_milestone && (
          <div className="p-3 rounded-lg bg-neutral-950/80 border border-neutral-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-neutral-300">
                Notificar quando o saldo de pontos ultrapassar:
              </span>
            </div>
            <input
              type="number"
              min={1000}
              step={1000}
              value={alertConfig.events.points_milestone_value}
              onChange={(e) =>
                setAlertConfig({
                  ...alertConfig,
                  events: {
                    ...alertConfig.events,
                    points_milestone_value: Math.max(100, parseInt(e.target.value) || 10000),
                  },
                })
              }
              className="w-28 px-2.5 py-1 rounded bg-neutral-900 border border-neutral-700 text-xs text-white font-mono text-right"
            />
          </div>
        )}
      </div>

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
          >
            <span>{isSaving ? 'Salvando...' : 'Salvar Alertas'}</span>
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700/60 transition cursor-pointer disabled:opacity-50"
          >
            <Send className={`w-3.5 h-3.5 ${isTesting ? 'animate-bounce text-indigo-400' : ''}`} />
            <span>{isTesting ? 'Enviando...' : 'Testar Alerta Agora'}</span>
          </button>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Configurações de alerta salvas!</span>
          </div>
        )}

        {testMessage && (
          <div className="flex items-center gap-1.5 text-xs text-indigo-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>{testMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
