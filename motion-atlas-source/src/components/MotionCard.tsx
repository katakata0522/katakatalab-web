import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Code2,
  Copy,
  Eye,
  Gauge,
  Monitor,
  Play,
  RotateCcw,
  Smartphone,
  Sparkles,
  Star
} from 'lucide-react';
import type { EasingPresetId, MotionPattern, PatternControls } from '../types/motion';
import { EASING_OPTIONS, copyTextToClipboard } from '../utils/motionHelpers';
import {
  MAX_TARGET_NOTE_LENGTH,
  sanitizeControls,
  sanitizePlainText
} from '../utils/security';
import { getStageFrameMeta } from '../utils/searchHelpers';
import { buildTailwindForPattern } from '../utils/tailwindLoader';
import { ErrorBoundary } from './ErrorBoundary';
import { StageDispatcher } from './stages/StageDispatcher';
import { SliderWithNumberInput } from './SliderWithNumberInput';

export type CodeFormat = 'html' | 'tailwind';

interface MotionCardProps {
  pattern: MotionPattern;
  serialCode: string;
  isFavorite: boolean;
  onToggleFavorite: (patternId: string) => void;
  globalTargetNote: string;
  prefersReducedMotion?: boolean;
  codeFormat?: CodeFormat;
  onChangeCodeFormat?: (fmt: CodeFormat) => void;
}

const PRE_PLAY_DELAY_MS = 500;

type DrawerTab = 'steps' | 'prompt' | 'code';

const MotionCardComponent: React.FC<MotionCardProps> = ({
  pattern,
  serialCode,
  isFavorite,
  onToggleFavorite,
  globalTargetNote,
  prefersReducedMotion = false,
  codeFormat: codeFormatProp,
  onChangeCodeFormat
}) => {
  const defaultControls: PatternControls = useMemo(
    () => ({
      duration: pattern.defaultDuration,
      distance: pattern.secondarySlider?.defaultValue ?? 0,
      easing: pattern.defaultEasing
    }),
    [pattern]
  );

  const [controls, setControls] = useState<PatternControls>(defaultControls);
  const [playKey, setPlayKey] = useState(0);
  const [isWaitingStart, setIsWaitingStart] = useState(false);
  const [slowMo, setSlowMo] = useState(false);
  const [showXRay, setShowXRay] = useState(false);
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const hasPlayback = pattern.hasPlayback !== false;
  const showParameterBar =
    hasPlayback || Boolean(pattern.secondarySlider) || Boolean(pattern.hasEasingControl);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('steps');
  const [localTargetNote, setLocalTargetNote] = useState('');
  const [localCodeFormat, setLocalCodeFormat] = useState<CodeFormat>('html');
  const [tailwindCode, setTailwindCode] = useState('');

  const [copiedType, setCopiedType] = useState<'prompt' | 'code' | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const playDelayTimerRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const hasAutoPlayedRef = useRef(false);

  const activeFormat = codeFormatProp ?? localCodeFormat;
  const setCodeFormat = onChangeCodeFormat ?? setLocalCodeFormat;

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      if (playDelayTimerRef.current !== null) {
        window.clearTimeout(playDelayTimerRef.current);
      }
    };
  }, []);

  // 初回ビューポート進入時のみ控えめに1回自動再生（OSのモーション低減設定時は停止）
  useEffect(() => {
    if (!hasPlayback || prefersReducedMotion || hasAutoPlayedRef.current) return;
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver !== 'function') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);
        if (!isVisible || hasAutoPlayedRef.current) return;
        hasAutoPlayedRef.current = true;
        setPlayKey((k) => (k === 0 ? 1 : k));
        observer.disconnect();
      },
      { threshold: 0.35 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasPlayback, prefersReducedMotion]);

  const safeControls = useMemo(() => sanitizeControls(pattern, controls), [pattern, controls]);
  const slowFactor = slowMo ? 3.2 : 1;
  const effectiveDuration = slowMo
    ? Number((safeControls.duration * slowFactor).toFixed(2))
    : safeControls.duration;

  useEffect(() => {
    if (!drawerOpen || drawerTab !== 'code' || activeFormat !== 'tailwind') return;
    let cancelled = false;
    buildTailwindForPattern(pattern, safeControls).then((code) => {
      if (!cancelled) {
        setTailwindCode(code);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [drawerOpen, drawerTab, activeFormat, pattern, safeControls]);

  const isModified =
    Math.abs(safeControls.duration - defaultControls.duration) > 0.001 ||
    (Boolean(pattern.secondarySlider) && safeControls.distance !== defaultControls.distance) ||
    safeControls.easing !== defaultControls.easing;

  const sanitizedGlobalNote = sanitizePlainText(globalTargetNote, MAX_TARGET_NOTE_LENGTH).trim();
  const sanitizedLocalNote = sanitizePlainText(localTargetNote, MAX_TARGET_NOTE_LENGTH).trim();
  const effectiveTargetNote = sanitizedLocalNote || sanitizedGlobalNote;

  // 説明ドロワーの該当タブを開いた時だけ描画用テキストを生成し、100枚一覧時の生成コストを抑える
  const generatedPrompt = useMemo(
    () => (drawerOpen && drawerTab === 'prompt' ? pattern.buildPrompt(safeControls, effectiveTargetNote) : ''),
    [drawerOpen, drawerTab, pattern, safeControls, effectiveTargetNote]
  );

  const htmlCode = useMemo(
    () => (drawerOpen && drawerTab === 'code' && activeFormat === 'html' ? pattern.buildCode(safeControls) : ''),
    [drawerOpen, drawerTab, activeFormat, pattern, safeControls]
  );
  const generatedCode =
    activeFormat === 'tailwind' ? tailwindCode || 'Tailwind CSSコードを読み込み中...' : htmlCode;
  const stageFrameMeta = getStageFrameMeta(pattern.category);

  // 押した瞬間に開始せず、ステージを待機状態に整えて 0.5 秒の間白を置いてから開始する
  const triggerPlay = useCallback(() => {
    if (playDelayTimerRef.current !== null) {
      window.clearTimeout(playDelayTimerRef.current);
      playDelayTimerRef.current = null;
    }
    setIsWaitingStart(true);
    playDelayTimerRef.current = window.setTimeout(() => {
      playDelayTimerRef.current = null;
      setIsWaitingStart(false);
      setPlayKey((k) => k + 1);
    }, PRE_PLAY_DELAY_MS);
  }, []);

  const handleToggleSlowMo = () => {
    const next = !slowMo;
    setSlowMo(next);
    if (next) {
      triggerPlay();
    }
  };

  const handleCopy = async (type: 'prompt' | 'code') => {
    const content =
      type === 'prompt'
        ? pattern.buildPrompt(safeControls, effectiveTargetNote)
        : activeFormat === 'tailwind'
          ? await buildTailwindForPattern(pattern, safeControls)
          : pattern.buildCode(safeControls);
    const ok = await copyTextToClipboard(content);
    if (!ok) return;

    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    setCopiedType(type);
    copyTimerRef.current = window.setTimeout(() => {
      setCopiedType(null);
      copyTimerRef.current = null;
    }, 2000);
  };

  return (
    <article
      id={pattern.id}
      className="atlas-card-perf scroll-mt-20 rounded-2xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0_6px_20px_rgba(0,0,0,0.04)]"
    >
      {/* カード見出し（通し番号 ＋ タイトル ＋ お気に入りボタン） */}
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-balance text-base sm:text-[17px] font-bold tracking-tight text-zinc-900">
            <span className="mr-2 inline-block rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 align-middle font-mono text-[11px] font-bold text-zinc-600">
              {serialCode}
            </span>
            <span className="align-middle">{pattern.title}</span>
          </h2>
          <p className="mt-1 text-xs sm:text-[13px] leading-relaxed text-zinc-500">
            {pattern.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onToggleFavorite(pattern.id)}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `${serialCode} をお気に入りから外す` : `${serialCode} をお気に入りに追加`}
          title={isFavorite ? 'お気に入り済み（クリックで解除）' : 'お気に入りに保存'}
          className={`shrink-0 inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
            isFavorite
              ? 'border-amber-300 bg-amber-50 text-amber-800'
              : 'border-zinc-200 bg-white text-zinc-400 hover:border-zinc-300 hover:text-zinc-700'
          }`}
        >
          <Star
            className={`h-3.5 w-3.5 transition-transform duration-150 ${
              isFavorite ? 'fill-amber-400 text-amber-500 scale-110' : ''
            }`}
          />
          <span className="hidden sm:inline text-[11px]">{isFavorite ? '保存済み' : '保存'}</span>
        </button>
      </header>

      {/* 囲われたプレビューステージ（上段コントロール ＋ 中央ステージ ＋ 下段ヒントを重なりゼロで配置） */}
      <div
        ref={stageRef}
        className={`relative flex min-h-[245px] sm:min-h-[260px] flex-col justify-between overflow-hidden rounded-xl border p-2.5 sm:p-3 ${stageFrameMeta.containerClass}`}
      >
        {/* 上段：左に動的状態バッジ／ブラウザ枠ラベル、右に操作ボタン群 */}
        <div className="z-30 flex w-full flex-wrap items-center justify-between gap-1.5">
          <div className="min-w-0">
            {hasPlayback && slowMo ? (
              <div className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50/95 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                0.3× スロー中（{effectiveDuration.toFixed(2)}秒）
              </div>
            ) : stageFrameMeta.kind === 'browser-chrome' ? (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/90 px-2.5 py-0.5 text-[10px] font-medium text-zinc-500">
                <span className="inline-flex items-center gap-1" aria-hidden="true">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                </span>
                <span>{stageFrameMeta.chromeLabel}</span>
              </div>
            ) : null}
          </div>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
            {pattern.hasViewportToggle && (
              <div
                className="inline-flex items-center rounded-lg border border-zinc-200 bg-white/95 p-0.5"
                role="group"
                aria-label="画面幅のプレビュー切り替え"
              >
                <button
                  type="button"
                  onClick={() => setViewportMode('desktop')}
                  aria-pressed={viewportMode === 'desktop'}
                  title="PC幅の配置で見る"
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    viewportMode === 'desktop'
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <Monitor className="h-3 w-3" />
                  <span>PC</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewportMode('mobile')}
                  aria-pressed={viewportMode === 'mobile'}
                  title="スマホ幅の折りたたみ配置で見る"
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    viewportMode === 'mobile'
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <Smartphone className="h-3 w-3" />
                  <span>スマホ</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowXRay((v) => !v)}
              aria-pressed={showXRay}
              title="裏側の枠線や仕組みを可視化"
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                showXRay
                  ? 'border-orange-300 bg-orange-50 text-orange-700'
                  : 'border-zinc-200 bg-white/95 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>仕組み</span>
            </button>

            {hasPlayback && (
              <>
                <button
                  type="button"
                  onClick={handleToggleSlowMo}
                  aria-pressed={slowMo}
                  title="動きをゆっくりスロー再生で確認"
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    slowMo
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-zinc-200 bg-white/95 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
                >
                  <Gauge className="h-3.5 w-3.5" />
                  <span>スロー</span>
                </button>

                <button
                  type="button"
                  onClick={triggerPlay}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-blue-700 active:translate-y-px cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>{playKey === 0 && !isWaitingStart ? '再生' : 'もう一度'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 中央ステージ本体 */}
        <div className="flex flex-1 w-full items-center justify-center px-1.5 sm:px-2 py-3">
          <ErrorBoundary variant="stage" resetKey={pattern.id}>
            <StageDispatcher
              patternId={pattern.id}
              playKey={playKey}
              isWaitingStart={isWaitingStart}
              slowFactor={slowFactor}
              effectiveDuration={effectiveDuration}
              controls={safeControls}
              showXRay={showXRay}
              viewportMode={viewportMode}
            />
          </ErrorBoundary>
        </div>

        {/* 下端：仕組みキャプション OR 直接操作ヒント */}
        {showXRay ? (
          <div className="z-20 flex items-center justify-center pt-1">
            <div className="rounded-lg border border-orange-200 bg-orange-50/95 px-2.5 py-1 text-center text-[11px] font-medium text-orange-900 shadow-2xs">
              <span className="font-bold">仕組み: </span>
              {pattern.xRayCaption}
            </div>
          </div>
        ) : pattern.interactiveHint ? (
          <div className="pointer-events-none pt-1 text-center text-[11px] text-zinc-400">
            {pattern.interactiveHint}
          </div>
        ) : (
          <div className="h-2" aria-hidden="true" />
        )}
      </div>

      {/* かんたんパラメーター調整バー（動き系・または追加調整があるカードのみ表示） */}
      {showParameterBar && (
        <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2.5 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3.5 py-2.5">
          {hasPlayback && (
            <SliderWithNumberInput
              label="速さ"
              unit="秒"
              min={pattern.durationRange.min}
              max={pattern.durationRange.max}
              step={pattern.durationRange.step}
              value={safeControls.duration}
              ariaLabel={`${pattern.title}の速さ（秒）`}
              onChange={(nextDuration) =>
                setControls((prev) => sanitizeControls(pattern, { ...prev, duration: nextDuration }))
              }
              onCommit={triggerPlay}
            />
          )}

          {pattern.secondarySlider && (
            <SliderWithNumberInput
              label={pattern.secondarySlider.label}
              unit={pattern.secondarySlider.unit}
              min={pattern.secondarySlider.min}
              max={pattern.secondarySlider.max}
              step={pattern.secondarySlider.step}
              value={safeControls.distance}
              ariaLabel={`${pattern.title}の${pattern.secondarySlider.label}`}
              onChange={(nextDist) =>
                setControls((prev) => sanitizeControls(pattern, { ...prev, distance: nextDist }))
              }
              onCommit={hasPlayback ? triggerPlay : undefined}
            />
          )}

          {pattern.hasEasingControl && (
            <div className="flex items-center gap-1" role="group" aria-label="動きの質感">
              {(Object.keys(EASING_OPTIONS) as EasingPresetId[]).map((key) => {
                const opt = EASING_OPTIONS[key];
                const active = safeControls.easing === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setControls((prev) => sanitizeControls(pattern, { ...prev, easing: key }));
                      if (hasPlayback) triggerPlay();
                    }}
                    title={opt.description}
                    className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'bg-zinc-900 text-white'
                        : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {isModified && (
            <button
              type="button"
              onClick={() => {
                setControls(defaultControls);
                if (hasPlayback) triggerPlay();
              }}
              title="数値を初期値に戻す"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-800 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>戻す</span>
            </button>
          )}
        </div>
      )}

      {/* アクションバー（AIへ指示コピー ＋ コードコピー ＋ 詳細折りたたみ） */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleCopy('prompt')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              copiedType === 'prompt'
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            {copiedType === 'prompt' ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>AI指示文をコピーしました</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>AIへの指示文をコピー</span>
              </>
            )}
          </button>

          <div className="inline-flex items-center rounded-xl border border-zinc-200 bg-white p-0.5">
            <div className="flex items-center border-r border-zinc-100 pr-0.5 mr-0.5" role="group" aria-label="コード形式を選択">
              <button
                type="button"
                aria-pressed={activeFormat === 'html'}
                onClick={() => setCodeFormat('html')}
                className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
                  activeFormat === 'html'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                HTML
              </button>
              <button
                type="button"
                aria-pressed={activeFormat === 'tailwind'}
                onClick={() => setCodeFormat('tailwind')}
                className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
                  activeFormat === 'tailwind'
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Tailwind
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleCopy('code')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                copiedType === 'code'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              {copiedType === 'code' ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>{activeFormat === 'tailwind' ? 'Tailwindコピー完了' : 'コードをコピー完了'}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>コードをコピー</span>
                </>
              )}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDrawerOpen((v) => !v)}
          aria-expanded={drawerOpen}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
        >
          <Code2 className="h-3.5 w-3.5" />
          <span>解説・中身を見る</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              drawerOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* 必要な時だけ開く「仕組み3ステップ・AI指示文・コード」ドロワー */}
      {drawerOpen && (
        <div className="mt-3.5 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5">
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-zinc-200 pb-2">
            <div className="flex flex-wrap items-center gap-1" role="tablist">
              {(
                [
                  { id: 'steps', label: '仕組み（3ステップ）' },
                  { id: 'prompt', label: 'AIへの指示文' },
                  { id: 'code', label: '実装コード' }
                ] as { id: DrawerTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={drawerTab === tab.id}
                  onClick={() => setDrawerTab(tab.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    drawerTab === tab.id
                      ? 'border border-zinc-200 bg-white text-zinc-900 shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="hidden sm:inline rounded bg-zinc-200/70 px-2 py-0.5 font-mono text-[10px] text-zinc-700">
              {pattern.mechanismTag}
            </span>
          </div>

          {drawerTab === 'steps' && (
            <div className="grid gap-2 sm:grid-cols-3">
              {pattern.steps.map((step) => (
                <div
                  key={step.title}
                  className="rounded-lg border border-zinc-200/80 bg-white p-3"
                >
                  <div className="text-xs font-bold text-zinc-900">{step.title}</div>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">{step.detail}</p>
                  {step.codeHint && (
                    <code className="mt-2 inline-block rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-blue-700">
                      {step.codeHint}
                    </code>
                  )}
                </div>
              ))}
            </div>
          )}

          {drawerTab === 'prompt' && (
            <div className="space-y-2.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label
                  htmlFor={`target-${pattern.id}`}
                  className="shrink-0 text-xs font-semibold text-zinc-700"
                >
                  どこに使う？（任意）
                </label>
                <input
                  id={`target-${pattern.id}`}
                  type="text"
                  maxLength={MAX_TARGET_NOTE_LENGTH}
                  value={localTargetNote}
                  onChange={(e) =>
                    setLocalTargetNote(sanitizePlainText(e.target.value, MAX_TARGET_NOTE_LENGTH))
                  }
                  placeholder="例：トップページの見出し、記事カードのボタン..."
                  className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-blue-500"
                />
              </div>
              <pre className="atlas-scroll max-h-60 overflow-auto rounded-lg border border-zinc-200 bg-white p-3 text-xs leading-relaxed text-zinc-800 whitespace-pre-wrap">
                {generatedPrompt}
              </pre>
            </div>
          )}

          {drawerTab === 'code' && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-0.5" role="group" aria-label="表示コード形式">
                  <button
                    type="button"
                    aria-pressed={activeFormat === 'html'}
                    onClick={() => setCodeFormat('html')}
                    className={`rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                      activeFormat === 'html'
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    HTML + CSS
                  </button>
                  <button
                    type="button"
                    aria-pressed={activeFormat === 'tailwind'}
                    onClick={() => setCodeFormat('tailwind')}
                    className={`rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                      activeFormat === 'tailwind'
                        ? 'bg-blue-600 text-white'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    Tailwind CSS
                  </button>
                </div>
                <span className="text-[11px] text-zinc-500">
                  個人・商用利用・改変・コピペ自由（MIT準拠）
                </span>
              </div>
              <pre className="atlas-scroll max-h-64 overflow-auto rounded-lg border border-zinc-200 bg-zinc-900 p-3 text-[11px] leading-relaxed text-zinc-100">
                <code>{generatedCode}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </article>
  );
};

export const MotionCard = React.memo(MotionCardComponent);
