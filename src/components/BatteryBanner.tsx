import React, { useEffect, useState } from 'react';
import { BatteryCharging, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const BatteryBanner: React.FC = () => {
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIgnored, setIsIgnored] = useState(true);

  const checkStatus = () => {
    if (typeof window !== 'undefined' && window.AndroidBridge) {
      setIsAndroid(true);
      try {
        const ignored = window.AndroidBridge.isBatteryOptimizationIgnored();
        setIsIgnored(ignored);
      } catch (e) {
        console.error('Failed to check battery optimization:', e);
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

  const handleRequest = () => {
    if (window.AndroidBridge) {
      window.AndroidBridge.requestIgnoreBatteryOptimization();
      setTimeout(checkStatus, 2000);
    }
  };

  if (isIgnored) {
    return (
      <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        <div className="text-xs">
          <p className="font-semibold text-emerald-300">Execução 24/7 Protegida</p>
          <p className="text-emerald-400/80 mt-0.5">
            A otimização de bateria está desativada. Suas streams continuarão ativas mesmo com a tela desligada.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-semibold text-amber-300">Atenção: Otimização de Bateria Ativa no Android</p>
          <p className="text-amber-200/80 mt-1 leading-relaxed">
            O Android pode suspender as conexões de WebSocket em segundo plano se o app for colocado em modo de economia de energia.
            Desative a otimização para que o IdleStream execute sem interrupções 24 horas por dia.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleRequest}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition cursor-pointer shadow-sm"
        >
          <BatteryCharging className="w-4 h-4" />
          <span>Desativar Economia de Energia</span>
        </button>
      </div>
    </div>
  );
};
