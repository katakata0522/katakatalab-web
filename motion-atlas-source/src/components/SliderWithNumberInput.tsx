import React, { useEffect, useId, useState } from 'react';
import { clampAndRound } from '../utils/security';

interface SliderWithNumberInputProps {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  ariaLabel: string;
  onChange: (nextValue: number) => void;
  onCommit?: () => void;
}

/**
 * スライダーと直接数値入力を同期するコントロール。
 * 入力中に最小値で即座に強制補正してしまい数字が打てなくなる問題を防ぐため、
 * フォーカス中は入力文字をそのまま保持し、確定時に範囲・刻み幅へ丸める。
 */
export const SliderWithNumberInput: React.FC<SliderWithNumberInputProps> = ({
  label,
  unit,
  min,
  max,
  step,
  value,
  ariaLabel,
  onChange,
  onCommit
}) => {
  const inputId = useId();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (!isEditing) {
      setDraft(String(value));
    }
  }, [value, isEditing]);

  const roundToStep = (num: number): number => clampAndRound(num, min, max, step, value);

  const commitDraft = () => {
    setIsEditing(false);
    const parsed = Number.parseFloat(draft);
    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    const normalized = roundToStep(parsed);
    setDraft(String(normalized));
    if (normalized !== value) {
      onChange(normalized);
    }
    onCommit?.();
  };

  return (
    <div className="flex min-w-[200px] flex-1 items-center gap-2.5">
      <label htmlFor={inputId} className="shrink-0 text-xs font-semibold text-zinc-600">
        {label}
      </label>
      <input
        id={inputId}
        type="range"
        className="atlas-slider w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const next = roundToStep(Number.parseFloat(e.target.value));
          onChange(next);
        }}
        onPointerUp={() => onCommit?.()}
        onKeyUp={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            onCommit?.();
          }
        }}
      />
      <div className="flex shrink-0 items-center gap-1">
        <input
          type="number"
          aria-label={ariaLabel}
          min={min}
          max={max}
          step={step}
          value={isEditing ? draft : String(value)}
          onFocus={(e) => {
            setIsEditing(true);
            setDraft(String(value));
            e.currentTarget.select();
          }}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            const parsed = Number.parseFloat(raw);
            if (!Number.isNaN(parsed) && parsed >= min && parsed <= max) {
              onChange(roundToStep(parsed));
            }
          }}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              setDraft(String(value));
              setIsEditing(false);
              e.currentTarget.blur();
            }
          }}
          className="w-14 rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-right font-mono text-xs text-zinc-800 outline-none focus:border-blue-500"
        />
        <span className="text-[11px] text-zinc-500">{unit}</span>
      </div>
    </div>
  );
};
