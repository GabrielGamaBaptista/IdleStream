import React, { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { Save, CheckCircle2, Terminal, ClipboardCopy } from 'lucide-react';
import { BatteryBanner } from './BatteryBanner';

export const SettingsTab: React.FC = () => {
  const { config, updateSettings } = useAppStore();
  const [form, setForm] = useState(config.settings);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
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

      {/* Diagnóstico e Relatório de Logs */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
          <Terminal className="w-4 h-4 text-neutral-400" />
          <h3 className="text-sm font-semibold text-white">Diagnóstico e Logs do Sistema</h3>
        </div>
        <p className="text-xs text-neutral-400">
          Se você enfrentar qualquer encerramento inesperado ou erro de conexão, gere e copie o relatório de diagnóstico abaixo para investigação.
        </p>

        <div className="pt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              const crashLog = window.AndroidBridge?.getCrashLog ? window.AndroidBridge.getCrashLog() : 'Nenhum log nativo do Android.';
              const diag = `=== IDLESTREAM DIAGNOSTIC REPORT ===\nApp Version: 2.1.1\nPlatform: ${window.AndroidBridge?.isAndroid() ? 'Android' : 'Desktop'}\nBattery Optimization Ignored: ${window.AndroidBridge?.isBatteryOptimizationIgnored?.() ?? 'N/A'}\nActive Streams: ${JSON.stringify(config.streams.map(s => ({ id: s.id, channel: s.channel_slug, platform: s.platform, auto: s.auto_start })))}\n\n=== NATIVE CRASH/ERROR LOG ===\n${crashLog}`;
              await navigator.clipboard.writeText(diag);
              alert('Relatório de diagnóstico copiado para a área de transferência!');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition cursor-pointer"
          >
            <ClipboardCopy className="w-3.5 h-3.5 text-indigo-400" />
            <span>Copiar Relatório de Diagnóstico</span>
          </button>
        </div>
      </div>
    </div>
  );
};
