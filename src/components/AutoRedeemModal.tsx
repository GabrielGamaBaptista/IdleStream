import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../stores/appStore';
import { Account, AutoRedeemConfig, BonusType, RedeemMode } from '../types';
import { getAccountAvailablePoints, validateAutoRedeemForm } from '../utils/autoRedeem';
import {
  BONUS_TYPE_LABELS,
  formatHours,
  formatPoints,
  getCatalogByTitle,
  getVariantsForBonusType,
  planDurationRedeems,
} from '../utils/autoRedeemCatalog';
import {
  X,
  Target,
  Check,
  Loader2,
  HelpCircle,
  Globe,
  Tv,
  Sparkles,
  Clock,
  Infinity as InfinityIcon,
  Settings2,
} from 'lucide-react';

interface AutoRedeemModalProps {
  account: Account | null;
  editingConfig?: AutoRedeemConfig | null;
  isOpen: boolean;
  onClose: () => void;
}

const BONUS_TYPES: BonusType[] = ['xp', 'capture', 'lure'];

export const AutoRedeemModal: React.FC<AutoRedeemModalProps> = ({
  account,
  editingConfig,
  isOpen,
  onClose,
}) => {
  const { config, statuses, addAutoRedeem, updateAutoRedeem } = useAppStore();

  const [entryMode, setEntryMode] = useState<'catalog' | 'custom'>('catalog');
  const [bonusType, setBonusType] = useState<BonusType>('xp');
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [autoSelectPackage, setAutoSelectPackage] = useState<boolean>(false);

  const [redeemMode, setRedeemMode] = useState<RedeemMode>('forever');
  const [targetHours, setTargetHours] = useState<string>('10');
  const [customDurationHours, setCustomDurationHours] = useState<string>('');

  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardId, setRewardId] = useState('');
  const [cost, setCost] = useState<string>('300');
  const [allChannels, setAllChannels] = useState(true);
  const [channelSlug, setChannelSlug] = useState('');
  const [channelId, setChannelId] = useState('');
  const [textInput, setTextInput] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !account) return;
    const isTwitchAcc = account.platform === 'twitch';

    if (editingConfig) {
      const catMatch = getCatalogByTitle(account.platform, editingConfig.reward_title);
      if (editingConfig.auto_select_package && isTwitchAcc) {
        setEntryMode('catalog');
        setBonusType(editingConfig.bonus_type || 'xp');
        setAutoSelectPackage(true);
        const variants = getVariantsForBonusType(account.platform, editingConfig.bonus_type || 'xp');
        setSelectedKey(variants[0]?.key || '');
      } else if (catMatch) {
        setEntryMode('catalog');
        setBonusType(catMatch.bonus_type);
        setSelectedKey(catMatch.key);
        setAutoSelectPackage(false);
      } else {
        setEntryMode('custom');
        setBonusType(editingConfig.bonus_type || 'xp');
        setSelectedKey('');
        setAutoSelectPackage(false);
      }

      setRewardTitle(editingConfig.reward_title);
      setRewardId(editingConfig.reward_id || '');
      setCost(String(editingConfig.cost));
      setRedeemMode(editingConfig.redeem_mode || 'forever');
      setTargetHours(
        editingConfig.target_duration_hours != null ? String(editingConfig.target_duration_hours) : '10'
      );
      setCustomDurationHours(
        editingConfig.duration_hours != null ? String(editingConfig.duration_hours) : ''
      );
      setAllChannels(editingConfig.all_channels);
      setChannelSlug(editingConfig.channel_slug || '');
      setChannelId(editingConfig.channel_id || '');
      setTextInput(editingConfig.text_input || '');
      setEnabled(editingConfig.enabled);
    } else {
      const defaultVariants = getVariantsForBonusType(account.platform, 'xp');
      const preferred = defaultVariants[defaultVariants.length - 1] || defaultVariants[0];

      setEntryMode('catalog');
      setBonusType('xp');
      setAutoSelectPackage(false);
      setSelectedKey(preferred?.key || '');
      setRewardTitle(preferred?.reward_title || '');
      setRewardId('');
      setCost(String(preferred?.cost || (isTwitchAcc ? 300 : 200)));
      setRedeemMode('forever');
      setTargetHours('10');
      setCustomDurationHours('');
      setAllChannels(true);
      setChannelSlug('');
      setChannelId('');
      setTextInput('');
      setEnabled(true);
    }
    setError(null);
    setShowHelp(false);
  }, [isOpen, account, editingConfig]);

  const variants = useMemo(() => {
    if (!account) return [];
    return getVariantsForBonusType(account.platform, bonusType);
  }, [account, bonusType]);

  const selectedCatalog = useMemo(() => {
    return variants.find((v) => v.key === selectedKey) || variants[0] || null;
  }, [variants, selectedKey]);

  const availablePoints = useMemo(() => {
    if (!account) return 0;
    return getAccountAvailablePoints(account.id, account.platform, config.streams, statuses);
  }, [account, config.streams, statuses]);

  if (!isOpen || !account) return null;

  const isTwitch = account.platform === 'twitch';
  const existingAutoRedeems = config.auto_redeems || [];
  const accountStreams = config.streams.filter(
    (s) => s.platform === account.platform && s.account_ids.includes(account.id)
  );

  const handleSelectBonusType = (nextType: BonusType) => {
    setBonusType(nextType);
    const nextVariants = getVariantsForBonusType(account.platform, nextType);
    const picked = nextVariants[nextVariants.length - 1] || nextVariants[0];
    if (picked) {
      setSelectedKey(picked.key);
      if (!autoSelectPackage) {
        setRewardTitle(picked.reward_title);
        setCost(String(picked.cost));
      } else {
        setRewardTitle(`Bônus ${BONUS_TYPE_LABELS[nextType]} (Automático)`);
        setCost(String(nextVariants[0]?.cost || picked.cost));
      }
    }
  };

  const handleSelectVariant = (key: string) => {
    setAutoSelectPackage(false);
    setSelectedKey(key);
    const found = variants.find((v) => v.key === key);
    if (found) {
      setRewardTitle(found.reward_title);
      setCost(String(found.cost));
    }
  };

  const handleEnableAutoSelect = () => {
    if (!isTwitch) return;
    setAutoSelectPackage(true);
    setRedeemMode('duration');
    setRewardId('');
    const cheapest = variants[0];
    setRewardTitle(`Bônus ${BONUS_TYPE_LABELS[bonusType]} (Automático)`);
    setCost(String(cheapest?.cost || 300));
  };

  const handleChangeRedeemMode = (nextMode: RedeemMode) => {
    setRedeemMode(nextMode);
    if (nextMode === 'forever' && autoSelectPackage) {
      setAutoSelectPackage(false);
      if (selectedCatalog) {
        setRewardTitle(selectedCatalog.reward_title);
        setCost(String(selectedCatalog.cost));
      }
    }
  };

  const numericTargetHours = Number(targetHours);
  const durationPlanPreview =
    entryMode === 'catalog' && redeemMode === 'duration' && Number.isFinite(numericTargetHours) && numericTargetHours > 0
      ? planDurationRedeems(account.platform, bonusType, numericTargetHours, Number.MAX_SAFE_INTEGER)
      : null;

  const fixedDurationEstimate =
    redeemMode === 'duration' &&
    !autoSelectPackage &&
    Number.isFinite(numericTargetHours) &&
    numericTargetHours > 0 &&
    selectedCatalog
      ? {
          count: Math.ceil(numericTargetHours / selectedCatalog.duration_hours),
          totalCost: Math.ceil(numericTargetHours / selectedCatalog.duration_hours) * selectedCatalog.cost,
          pkgHours: selectedCatalog.duration_hours,
        }
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isCatalog = entryMode === 'catalog';
    const effectiveAutoSelect = isCatalog && isTwitch && redeemMode === 'duration' && autoSelectPackage;

    const effectiveTitle = effectiveAutoSelect
      ? `Bônus ${BONUS_TYPE_LABELS[bonusType]} (Automático)`
      : isCatalog && selectedCatalog
      ? selectedCatalog.reward_title
      : rewardTitle.trim();

    const effectiveCost = effectiveAutoSelect
      ? variants[0]?.cost || Number(cost) || 300
      : isCatalog && selectedCatalog
      ? selectedCatalog.cost
      : Number(cost);

    const effectiveDurationHours = effectiveAutoSelect
      ? null
      : isCatalog && selectedCatalog
      ? selectedCatalog.duration_hours
      : customDurationHours.trim()
      ? Number(customDurationHours)
      : null;

    const validation = validateAutoRedeemForm(
      {
        accountId: account.id,
        platform: account.platform,
        allChannels,
        channelSlug,
        channelId,
        rewardId: effectiveAutoSelect ? '' : rewardId,
        rewardTitle: effectiveTitle,
        cost: effectiveCost,
        textInput,
        isCatalogMode: isCatalog,
        catalogKey: isCatalog && !effectiveAutoSelect ? selectedCatalog?.key : null,
        durationHours: effectiveDurationHours,
        bonusType: isCatalog ? bonusType : null,
        autoSelectPackage: effectiveAutoSelect,
        redeemMode,
        targetDurationHours: redeemMode === 'duration' ? numericTargetHours : null,
      },
      existingAutoRedeems,
      editingConfig?.id
    );

    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    if (validation.requiresReplaceConfirmation) {
      const ok = window.confirm(
        `Esta conta já possui ${validation.specificCountToReplace} configuração(ões) específica(s) por canal. Ativar o modo "Todos os canais" substituirá as configurações específicas por este resgate global. Deseja continuar?`
      );
      if (!ok) return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const cleanSlug = allChannels ? undefined : channelSlug.trim().replace(/^#/, '').toLowerCase();
      const cleanChannelId = allChannels || !isTwitch ? undefined : channelId.trim() || undefined;
      const cleanText = textInput.trim() || undefined;
      const cleanRewardId =
        effectiveAutoSelect || (isCatalog && isTwitch && !rewardId.trim())
          ? null
          : rewardId.trim() || null;

      if (editingConfig) {
        await updateAutoRedeem({
          ...editingConfig,
          all_channels: allChannels,
          channel_slug: cleanSlug,
          channel_id: cleanChannelId,
          reward_id: cleanRewardId,
          reward_title: effectiveTitle,
          cost: effectiveCost,
          duration_hours: effectiveDurationHours,
          bonus_type: isCatalog ? bonusType : null,
          auto_select_package: effectiveAutoSelect,
          text_input: cleanText,
          redeem_mode: redeemMode,
          target_duration_hours: redeemMode === 'duration' ? numericTargetHours : null,
          enabled,
        });
      } else {
        await addAutoRedeem(
          {
            account_id: account.id,
            platform: account.platform,
            all_channels: allChannels,
            channel_slug: cleanSlug,
            channel_id: cleanChannelId,
            reward_id: cleanRewardId,
            reward_title: effectiveTitle,
            cost: effectiveCost,
            duration_hours: effectiveDurationHours,
            bonus_type: isCatalog ? bonusType : null,
            auto_select_package: effectiveAutoSelect,
            text_input: cleanText,
            redeem_mode: redeemMode,
            target_duration_hours: redeemMode === 'duration' ? numericTargetHours : null,
            enabled,
          },
          validation.requiresReplaceConfirmation
        );
      }
      onClose();
    } catch (err: any) {
      setError(`${err?.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isTwitch
                  ? 'bg-purple-950/80 text-purple-400 border border-purple-800/60'
                  : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
              }`}
            >
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {editingConfig ? 'Editar Auto-Resgate' : 'Configurar Auto-Resgate'}
              </h3>
              <p className="text-xs text-neutral-400">
                {account.label} ({isTwitch ? 'Twitch' : 'Kick'}) • Saldo atual nas lives:{' '}
                <span className="text-amber-300 font-semibold">{formatPoints(availablePoints)} pts</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition p-1.5 rounded-lg hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Tabs: Catálogo vs Personalizada */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-neutral-950 border border-neutral-800">
            <button
              type="button"
              onClick={() => {
                setEntryMode('catalog');
                if (selectedCatalog) {
                  setRewardTitle(selectedCatalog.reward_title);
                  setCost(String(selectedCatalog.cost));
                }
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                entryMode === 'catalog'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Catálogo PokeIdle</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryMode('custom');
                setAutoSelectPackage(false);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                entryMode === 'custom'
                  ? 'bg-neutral-800 text-white shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Personalizada</span>
            </button>
          </div>

          {entryMode === 'catalog' ? (
            <div className="space-y-3.5">
              {/* Tipo de Bônus */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-200">Tipo de Bônus</label>
                <div className="grid grid-cols-3 gap-2">
                  {BONUS_TYPES.map((bt) => (
                    <button
                      key={bt}
                      type="button"
                      onClick={() => handleSelectBonusType(bt)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        bonusType === bt
                          ? isTwitch
                            ? 'bg-purple-950/70 border-purple-500 text-purple-200'
                            : 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      {BONUS_TYPE_LABELS[bt]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modo de Operação */}
              <div className="space-y-2 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <label className="text-xs font-semibold text-neutral-200 block">Modo de Resgate</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChangeRedeemMode('forever')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      redeemMode === 'forever'
                        ? 'bg-sky-950/60 border-sky-600 text-sky-200'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <InfinityIcon className="w-3.5 h-3.5" />
                    <span>Para sempre</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeRedeemMode('duration')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      redeemMode === 'duration'
                        ? 'bg-amber-950/60 border-amber-600 text-amber-200'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Meta em horas</span>
                  </button>
                </div>

                {redeemMode === 'duration' && (
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-neutral-300 shrink-0">Quero resgatar:</label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={targetHours}
                        onChange={(e) => setTargetHours(e.target.value)}
                        className="w-24 bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-xs text-neutral-400">horas totais</span>
                    </div>
                    {editingConfig && editingConfig.redeem_mode === 'duration' && editingConfig.accumulated_hours > 0 && (
                      <p className="text-[11px] text-amber-300/90">
                        Progresso atual: {editingConfig.accumulated_hours} / {editingConfig.target_duration_hours}h
                        (alterar a meta reinicia o contador).
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Pacote / Duração */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-200">
                  {redeemMode === 'duration' && isTwitch
                    ? 'Estratégia / Pacote'
                    : 'Duração do Pacote'}
                </label>

                {isTwitch && redeemMode === 'duration' && (
                  <button
                    type="button"
                    onClick={handleEnableAutoSelect}
                    className={`w-full mb-1.5 text-left px-3 py-2.5 rounded-xl border text-xs transition cursor-pointer ${
                      autoSelectPackage
                        ? 'bg-amber-950/50 border-amber-500 text-amber-200'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <div className="font-semibold flex items-center justify-between">
                      <span>⚡ Automático (combinar 10h / 5h / 3h / 1h pelo saldo)</span>
                      {autoSelectPackage && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Escolhe o maior pacote disponível que cabe nos pontos de cada live sem exceder a meta.
                    </p>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {variants.map((v) => {
                    const isSelected = !autoSelectPackage && selectedCatalog?.key === v.key;
                    return (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => handleSelectVariant(v.key)}
                        className={`px-3 py-2 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/60 border-emerald-500 text-white'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div className="text-xs font-bold">{formatHours(v.duration_hours)}</div>
                        <div className="text-[11px] text-neutral-400">{formatPoints(v.cost)} pts</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Resumo / Preview de Duração */}
              {redeemMode === 'duration' && durationPlanPreview && !('error' in durationPlanPreview) && autoSelectPackage && (
                <div className="text-[11px] bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-1">
                  <div className="font-semibold text-neutral-200">
                    Plano ótimo para {formatHours(numericTargetHours)}:
                  </div>
                  <div className="text-neutral-300">
                    {durationPlanPreview.steps
                      .map((s) => `${s.count}x ${formatHours(s.reward.duration_hours)}`)
                      .join(' + ')}{' '}
                    ={' '}
                    <span className="text-amber-300 font-semibold">
                      {formatPoints(durationPlanPreview.total_cost)} pts
                    </span>
                  </div>
                  <div className={availablePoints >= durationPlanPreview.total_cost ? 'text-emerald-400' : 'text-amber-400'}>
                    {availablePoints >= durationPlanPreview.total_cost
                      ? `✓ Você já tem ${formatPoints(availablePoints)} pts disponíveis nas lives.`
                      : `Saldo atual: ${formatPoints(availablePoints)} pts (faltam ${formatPoints(
                          durationPlanPreview.total_cost - availablePoints
                        )} pts — será resgatado conforme farmar).`}
                  </div>
                </div>
              )}

              {redeemMode === 'duration' && fixedDurationEstimate && (
                <div className="text-[11px] bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-neutral-300">
                  Serão necessários aprox.{' '}
                  <strong className="text-white">
                    {fixedDurationEstimate.count} resgate(s) de {formatHours(fixedDurationEstimate.pkgHours)}
                  </strong>{' '}
                  ={' '}
                  <strong className="text-amber-300">
                    {formatPoints(fixedDurationEstimate.totalCost)} pts
                  </strong>
                  . Ao atingir {formatHours(numericTargetHours)}, a configuração pausará automaticamente.
                </div>
              )}

              {/* Twitch vs Kick info / Kick reward_id */}
              {isTwitch ? (
                <div className="text-[11px] text-purple-200 bg-purple-950/40 border border-purple-800/50 rounded-xl px-3 py-2">
                  ✓ Na Twitch, o <span className="font-mono">reward_id</span> é resolvido automaticamente pelo
                  nome exato da recompensa e salvo por canal.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[11px] text-amber-200 bg-amber-950/40 border border-amber-800/50 rounded-xl px-3 py-2 leading-relaxed">
                    Na Kick, a listagem automática de recompensas ainda não está disponível. Nome, custo e
                    duração foram preenchidos pelo catálogo; informe o <span className="font-mono">reward_id</span>{' '}
                    do canal abaixo.
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-neutral-200">ID da Recompensa (Kick)</label>
                      <button
                        type="button"
                        onClick={() => setShowHelp((v) => !v)}
                        className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="w-3 h-3" />
                        <span>Como encontrar?</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={rewardId}
                      onChange={(e) => setRewardId(e.target.value)}
                      placeholder="Ex: 987654"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                    />
                    {showHelp && (
                      <div className="text-[11px] text-sky-200 bg-sky-950/50 border border-sky-800/60 rounded-xl p-2.5 leading-relaxed">
                        Abra a live na Kick → F12 (Network) → filtre &quot;rewards&quot; → resgate o item uma vez e veja a URL /rewards/&#123;reward_id&#125;/redeem.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Modo Personalizado */
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-200">Nome da Recompensa</label>
                <input
                  type="text"
                  value={rewardTitle}
                  onChange={(e) => setRewardTitle(e.target.value)}
                  placeholder="Ex: Bônus XP 10h"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-200">
                    ID da Recompensa ({isTwitch ? 'UUID GraphQL' : 'ID Kick'})
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowHelp((v) => !v)}
                    className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Como encontrar?</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={rewardId}
                  onChange={(e) => setRewardId(e.target.value)}
                  placeholder={isTwitch ? 'ecac50be-b6a2-4c5e-964b-0866b780537f' : '987654'}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                />
                {showHelp && (
                  <div className="text-[11px] text-sky-200 bg-sky-950/50 border border-sky-800/60 rounded-xl p-2.5 leading-relaxed">
                    {isTwitch
                      ? 'Abra a live no navegador → F12 (Network) → filtre "gql" → clique no menu de pontos e resgate/inspecione a recompensa. Copie o campo "rewardID" (UUID) e "cost".'
                      : 'Abra a live na Kick → F12 (Network) → filtre "rewards" → resgate o item uma vez e veja a URL /rewards/{reward_id}/redeem.'}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-200">Custo (pontos)</label>
                  <input
                    type="number"
                    min={1}
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-neutral-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-200">Duração (h, opcional)</label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={customDurationHours}
                    onChange={(e) => setCustomDurationHours(e.target.value)}
                    placeholder="Ex: 10"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Escopo: Todos os canais vs Canal específico */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allChannels}
                onChange={(e) => setAllChannels(e.target.checked)}
                className="mt-0.5 rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-0"
              />
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                  <span>Aplicar em todos os canais desta conta</span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {allChannels
                    ? 'Resgatará automaticamente em todas as streams vinculadas a esta conta (máx. 1 resgate global por conta).'
                    : 'Resgatará apenas no canal específico abaixo (permite vários resgates em canais diferentes).'}
                </p>
              </div>
            </label>
          </div>

          {!allChannels && (
            <div className="space-y-3 p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Canal Específico (slug/login)</span>
                </label>
                {accountStreams.length > 0 && (
                  <select
                    value={
                      accountStreams.some((s) => s.channel_slug.toLowerCase() === channelSlug.toLowerCase())
                        ? channelSlug
                        : ''
                    }
                    onChange={(e) => {
                      if (e.target.value) setChannelSlug(e.target.value);
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 mb-1.5"
                  >
                    <option value="">Selecionar das streams cadastradas...</option>
                    {accountStreams.map((s) => (
                      <option key={s.id} value={s.channel_slug}>
                        {s.channel_slug}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  value={channelSlug}
                  onChange={(e) => setChannelSlug(e.target.value)}
                  placeholder={isTwitch ? 'Ex: gaules' : 'Ex: pokeidle'}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                />
              </div>

              {isTwitch && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-200">
                    ID Numérico do Canal (opcional)
                  </label>
                  <input
                    type="text"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    placeholder="Ex: 190359081 (vazio = resolve automaticamente)"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                  />
                </div>
              )}
            </div>
          )}

          {/* Status Inicial & Texto Opcional */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-200">Status Inicial</label>
              <button
                type="button"
                onClick={() => setEnabled((v) => !v)}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  enabled
                    ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                }`}
              >
                {enabled ? '● Ativo' : '○ Pausado'}
              </button>
            </div>

            {isTwitch && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-200">Texto (se exigir)</label>
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Opcional"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="text-xs text-rose-300 bg-rose-950/60 border border-rose-800/60 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{editingConfig ? 'Salvar Alterações' : 'Ativar Auto-Resgate'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
