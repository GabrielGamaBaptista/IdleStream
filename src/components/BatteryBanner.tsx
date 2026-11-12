import React, { useEffect, useState } from 'react';
import {
  BatteryCharging,
  ShieldAlert,
  CheckCircle2,
  Settings,
  Layers,
  BellOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface OemGuidance {
  manufacturer?: string;
  oemKey?: string;
  title?: string;
  steps?: string[];
  batteryOptimizationIgnored?: boolean;
  canDrawOverlays?: boolean;
  hasNotificationPermission?: boolean;
}

export const BatteryBanner: React.FC = () => {
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIgnored, setIsIgnored] = useState(true);
  const [canOverlay, setCanOverlay] = useState(false);
  const [hasNotif, setHasNotif] = useState(true);
  const [oemGuidance, setOemGuidance] = useState<OemGuidance | null>(null);
  const [showOemSteps, setShowOemSteps] = useState(false);

  const checkStatus = () => {
    if (typeof window !== 'undefined' && window.AndroidBridge?.isAndroid?.()) {
      setIsAndroid(true);
      try {
        setIsIgnored(window.AndroidBridge.isBatteryOptimizationIgnored());
        setCanOverlay(Boolean(window.AndroidBridge.canDrawOverlays?.()));
        setHasNotif(window.AndroidBridge.hasNotificationPermission ? window.AndroidBridge.hasNotificationPermission() : true);
        if (window.AndroidBridge.getOemGuidanceJson) {
          const parsed = JSON.parse(window.AndroidBridge.getOemGuidanceJson()) as OemGuidance;
          setOemGuidance(parsed);
        }
      } catch (e) {
        console.error('Failed to check Android power status:', e);
      }
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    window.addEventListener('focus', checkStatus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkStatus);
    };
  }, []);

  if (!isAndroid) {
    return null;
  }

  const handleRequestBattery = () => {
    window.AndroidBridge?.requestIgnoreBatteryOptimization();
    setTimeout(checkStatus, 1500);
  };

  const handleOpenAppSettings = () => {
    window.AndroidBridge?.openAppSettings?.();
    setTimeout(checkStatus, 1500);
  };

  const handleRequestOverlay = () => {
    window.AndroidBridge?.requestOverlayPermission?.();
    setTimeout(checkStatus, 1500);
  };

  return (
    <div className="space-y-3">
      {!hasNotif && (
        <div className="bg-red-950/40 border border-red-800/70 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <BellOff className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-red-300">Notificações Bloqueadas</p>
              <p className="text-red-200/80 mt-0.5">
                Sem notificação persistente ativa, o Android encerra o serviço em segundo plano em poucos minutos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenAppSettings}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shrink-0 cursor-pointer transition"
          >
            Ativar
          </button>
        </div>
      )}

      {isIgnored ? (
        <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-4 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-emerald-300">Execução 24/7 Protegida (Doze Ignorado)</p>
                <p className="text-emerald-400/80 mt-0.5">
                  O Android permite manter conexões em vigília com a tela apagada. Confira também a regra do fabricante abaixo para proteção total durante a madrugada.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenAppSettings}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-900/70 hover:bg-emerald-800/80 text-emerald-200 text-[11px] font-medium border border-emerald-700/60 shrink-0 cursor-pointer transition"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Config. App</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-amber-300">Atenção: Otimização de Bateria Ativa no Android</p>
              <p className="text-amber-200/80 mt-1 leading-relaxed">
                O sistema pode suspender conexões e WebViews durante a noite se o app não estiver com uso de bateria irrestrito.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={handleOpenAppSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Abrir Config. do App</span>
            </button>
            <button
              type="button"
              onClick={handleRequestBattery}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm"
            >
              <BatteryCharging className="w-4 h-4" />
              <span>Desativar Economia de Energia</span>
            </button>
          </div>
        </div>
      )}

      {/* Permissão Opcional: Auto-Recuperação em Segundo Plano (Sobrepor outros apps) */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Layers className={`w-5 h-5 shrink-0 mt-0.5 ${canOverlay ? 'text-emerald-400' : 'text-indigo-400'}`} />
          <div className="text-xs">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-neutral-200">Auto-Recuperação Silenciosa (Opcional)</p>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  canOverlay
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {canOverlay ? 'Ativada' : 'Opcional'}
              </span>
            </div>
            <p className="text-neutral-400 mt-0.5 leading-relaxed">
              Com “Exibir sobre outros apps”, se o fabricante matar o processo de madrugada, o IdleStream reabre os WebViews automaticamente em segundo plano sem precisar tocar na tela.
            </p>
          </div>
        </div>
        {!canOverlay && (
          <button
            type="button"
            onClick={handleRequestOverlay}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 cursor-pointer transition"
          >
            Permitir Auto-Recuperação
          </button>
        )}
      </div>

      {/* Checklist específico do fabricante */}
      {oemGuidance?.steps && oemGuidance.steps.length > 0 && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowOemSteps((v) => !v)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-left text-xs text-neutral-300 hover:bg-neutral-800/40 transition cursor-pointer"
          >
            <span className="font-semibold">
              Checklist Anti-Sleep do Aparelho: {oemGuidance.title}
            </span>
            {showOemSteps ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>
          {showOemSteps && (
            <div className="px-4 pb-3 pt-1 border-t border-neutral-800/80 space-y-2 text-xs text-neutral-300">
              <ul className="list-disc pl-4 space-y-1 text-neutral-400">
                {oemGuidance.steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleOpenAppSettings}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  Ir direto para Bateria do App →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
