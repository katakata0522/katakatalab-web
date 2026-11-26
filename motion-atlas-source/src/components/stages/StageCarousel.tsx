import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import type { StageRendererProps } from './StageTextAndReveal';
import { EASING_OPTIONS } from '../../utils/motionHelpers';

const SNAP_CARDS = [
  { id: 1, title: '見出し演出', tag: 'TEXT', tone: 'bg-blue-50 border-blue-200 text-blue-900' },
  { id: 2, title: 'カード出現', tag: 'CARD', tone: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
  { id: 3, title: '検索配置', tag: 'SEARCH', tone: 'bg-amber-50 border-amber-200 text-amber-900' },
  { id: 4, title: 'ヘッダー設計', tag: 'HEADER', tone: 'bg-zinc-100 border-zinc-300 text-zinc-900' },
  { id: 5, title: '比較スライダー', tag: 'CRAFT', tone: 'bg-sky-50 border-sky-200 text-sky-900' }
];

const THUMB_ITEMS = [
  { label: '朝のデスク', detail: '柔らかな白基調のUI配置例', bg: 'bg-sky-50', accent: 'text-sky-700' },
  { label: '夜の書斎', detail: '集中しやすい低コントラスト配色', bg: 'bg-zinc-900 text-white', accent: 'text-blue-300' },
  { label: '構成メモ', detail: 'ドット方眼の紙面メタファー', bg: 'bg-amber-50', accent: 'text-amber-800' },
  { label: 'モバイル枠', detail: '片手親指で操作できる下端配置', bg: 'bg-emerald-50', accent: 'text-emerald-800' }
];

export const StageCarousel: React.FC<StageRendererProps> = ({
  patternId,
  playKey,
  isWaitingStart,
  slowFactor,
  effectiveDuration,
  controls,
  showXRay
}) => {
  const easeCss = EASING_OPTIONS[controls.easing].css;

  // 1. Scroll Snap carousel
  const snapRef = useRef<HTMLDivElement | null>(null);
  const [snapIdx, setSnapIdx] = useState(0);

  // 2. Peek slider
  const [peekIdx, setPeekIdx] = useState(0);

  // 3. Thumb-sync gallery
  const [thumbIdx, setThumbIdx] = useState(0);

  // 4. Lightbox modal gallery
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // 5. Stack deck
  const [stackTopIdx, setStackTopIdx] = useState(0);

  useEffect(() => {
    if (patternId !== 'carousel-lightbox' || lightboxIdx === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIdx(null);
      } else if (e.key === 'ArrowRight') {
        setLightboxIdx((prev) => (prev === null ? null : (prev + 1) % 3));
      } else if (e.key === 'ArrowLeft') {
        setLightboxIdx((prev) => (prev === null ? null : (prev + 2) % 3));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [patternId, lightboxIdx]);

  // Playback choreography (0.5s lead-in aware)
  useEffect(() => {
    if (isWaitingStart) {
      if (snapRef.current) snapRef.current.scrollLeft = 0;
      setSnapIdx(0);
      setPeekIdx(0);
      setThumbIdx(0);
      setLightboxIdx(null);
      setStackTopIdx(0);
      return;
    }

    if (playKey === 0) return;
    const timers: number[] = [];
    const stepMs = Math.max(420, Math.round(effectiveDuration * 1000 * 0.95));

    if (patternId === 'carousel-scroll-snap') {
      const stepTo = (idx: number) => {
        setSnapIdx(idx);
        const box = snapRef.current;
        if (box) {
          box.scrollTo({ left: idx * 144, behavior: 'smooth' });
        }
      };
      timers.push(window.setTimeout(() => stepTo(1), 80));
      timers.push(window.setTimeout(() => stepTo(2), 80 + stepMs));
      timers.push(window.setTimeout(() => stepTo(0), 80 + stepMs * 2 + Math.round(250 * slowFactor)));
    }

    if (patternId === 'carousel-peek-slider') {
      timers.push(window.setTimeout(() => setPeekIdx(1), 60));
      timers.push(window.setTimeout(() => setPeekIdx(2), 60 + stepMs));
      timers.push(window.setTimeout(() => setPeekIdx(0), 60 + stepMs * 2 + Math.round(200 * slowFactor)));
    }

    if (patternId === 'carousel-thumb-sync') {
      timers.push(window.setTimeout(() => setThumbIdx(1), 60));
      timers.push(window.setTimeout(() => setThumbIdx(2), 60 + stepMs));
      timers.push(window.setTimeout(() => setThumbIdx(3), 60 + stepMs * 2));
    }

    if (patternId === 'carousel-lightbox') {
      setLightboxIdx(0);
      timers.push(window.setTimeout(() => setLightboxIdx(1), 200 + stepMs));
      timers.push(window.setTimeout(() => setLightboxIdx(2), 200 + stepMs * 2));
      timers.push(window.setTimeout(() => setLightboxIdx(null), 200 + stepMs * 3 + Math.round(200 * slowFactor)));
    }

    if (patternId === 'carousel-stack-deck') {
      timers.push(window.setTimeout(() => setStackTopIdx(1), 60));
      timers.push(window.setTimeout(() => setStackTopIdx(2), 60 + stepMs));
      timers.push(window.setTimeout(() => setStackTopIdx(0), 60 + stepMs * 2 + Math.round(200 * slowFactor)));
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [patternId, playKey, isWaitingStart, effectiveDuration, slowFactor]);

  switch (patternId) {
    // -------------------------------------------------------------------------
    // 1. ピタッと吸い付く横スクロール・カルーセル (CSS Scroll Snap)
    // -------------------------------------------------------------------------
    case 'carousel-scroll-snap': {
      const moveSnap = (nextIdx: number) => {
        const clamped = Math.max(0, Math.min(SNAP_CARDS.length - 1, nextIdx));
        setSnapIdx(clamped);
        snapRef.current?.scrollTo({ left: clamped * 144, behavior: 'smooth' });
      };

      return (
        <div className="w-full max-w-md">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-zinc-700">
              横スワイプ / 矢印送り（{snapIdx + 1} / {SNAP_CARDS.length}）
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="前のカード"
                onClick={() => moveSnap(snapIdx - 1)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="次のカード"
                onClick={() => moveSnap(snapIdx + 1)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div
            ref={snapRef}
            onScroll={(e) => {
              const approx = Math.round(e.currentTarget.scrollLeft / 144);
              setSnapIdx(Math.max(0, Math.min(SNAP_CARDS.length - 1, approx)));
            }}
            className="no-scrollbar flex gap-3 overflow-x-auto px-1 py-1 snap-x snap-mandatory scroll-smooth"
          >
            {SNAP_CARDS.map((card, i) => (
              <div
                key={card.id}
                className={`snap-start shrink-0 w-[132px] rounded-xl border p-3 transition-shadow ${card.tone} ${
                  showXRay ? 'border-2 border-dashed border-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono opacity-75">
                  <span>#{i + 1}</span>
                  <span>{card.tag}</span>
                </div>
                <div className="mt-5 text-xs font-bold">{card.title}</div>
                {showXRay && (
                  <div className="mt-1 text-[9px] font-mono text-blue-700">snap-align: start</div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------------------
    // 2. 右端に次のカードがチラ見えするスライダー (Peek)
    // -------------------------------------------------------------------------
    case 'carousel-peek-slider': {
      const slides = [
        { num: '01', name: '第一の切り口：文字から惹きつける', bg: 'bg-white' },
        { num: '02', name: '第二の切り口：カードの余白で見せる', bg: 'bg-blue-50/70' },
        { num: '03', name: '第三の切り口：足元の着地を整える', bg: 'bg-emerald-50/70' }
      ];
      return (
        <div className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="relative overflow-hidden">
            <div
              className="flex gap-3"
              style={{
                transform: `translateX(-${peekIdx * 74}%)`,
                transition: `transform ${effectiveDuration}s ${easeCss}`
              }}
            >
              {slides.map((s, idx) => (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setPeekIdx(idx)}
                  className={`shrink-0 w-[72%] rounded-xl border p-4 text-left shadow-2xs cursor-pointer ${s.bg} ${
                    showXRay && idx === peekIdx + 1
                      ? 'border-2 border-dashed border-orange-500'
                      : 'border-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span>SLIDE {s.num}</span>
                    {idx === peekIdx + 1 && (
                      <span className="font-semibold text-orange-600">← 続きがチラ見え</span>
                    )}
                  </div>
                  <div className="mt-2 text-xs font-bold text-zinc-900">{s.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {slides.map((s, idx) => (
                <button
                  key={s.num}
                  type="button"
                  aria-label={`${idx + 1}枚目へ`}
                  onClick={() => setPeekIdx(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    peekIdx === idx ? 'w-5 bg-blue-600' : 'w-1.5 bg-zinc-300'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="前へ"
                onClick={() => setPeekIdx((v) => Math.max(0, v - 1))}
                className="rounded border border-zinc-200 bg-white p-1 text-zinc-600 hover:bg-zinc-50 cursor-pointer"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <button
                type="button"
                aria-label="次へ"
                onClick={() => setPeekIdx((v) => Math.min(slides.length - 1, v + 1))}
                className="rounded border border-zinc-200 bg-white p-1 text-zinc-600 hover:bg-zinc-50 cursor-pointer"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------------------
    // 3. サムネイル選択 → 上の大きな主役画像が切り替わるギャラリー
    // -------------------------------------------------------------------------
    case 'carousel-thumb-sync': {
      const current = THUMB_ITEMS[thumbIdx] ?? THUMB_ITEMS[0];
      if (!current) return null;
      return (
        <div className="w-full max-w-sm space-y-2">
          {/* 上：メイン表示エリア */}
          <div
            className={`flex h-24 flex-col justify-between rounded-xl border border-zinc-200 p-3.5 transition-colors duration-300 ${current.bg}`}
          >
            <div className={`text-[10px] font-mono font-bold ${current.accent}`}>
              PREVIEW 0{thumbIdx + 1} / 0{THUMB_ITEMS.length}
            </div>
            <div>
              <div className="text-sm font-extrabold">{current.label}</div>
              <div className="text-[11px] opacity-80">{current.detail}</div>
            </div>
          </div>

          {/* 下：並ぶ四角サムネイル */}
          <div className="grid grid-cols-4 gap-2">
            {THUMB_ITEMS.map((item, idx) => {
              const active = idx === thumbIdx;
              return (
                <button
                  key={item.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setThumbIdx(idx)}
                  className={`rounded-lg border p-2 text-center text-[10px] font-bold transition-all cursor-pointer ${
                    active
                      ? 'border-blue-600 ring-2 ring-blue-500/25 scale-[1.03] bg-white text-blue-700'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-white'
                  } ${showXRay && active ? 'border-dashed' : ''}`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------------------
    // 4. サムネクリックで暗転＋中央に拡大表示 (ライトボックス)
    // -------------------------------------------------------------------------
    case 'carousel-lightbox': {
      const photos = [
        { title: '1. グリッド配置', desc: '整頓されたカード構造を拡大確認' },
        { title: '2. 余白の設計', desc: '行間と文字サイズの対比を確認' },
        { title: '3. 配色ルール', desc: '白地×アクセント青の最小色数' }
      ];
      const activePhoto = lightboxIdx !== null ? photos[lightboxIdx] : null;

      return (
        <div className="relative flex h-44 w-full max-w-md items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="grid w-full grid-cols-3 gap-2.5">
            {photos.map((p, idx) => (
              <button
                key={p.title}
                type="button"
                onClick={() => setLightboxIdx(idx)}
                className="group flex h-24 flex-col justify-between rounded-lg border border-zinc-200 bg-white p-2.5 text-left shadow-2xs hover:border-blue-400 cursor-pointer"
              >
                <Maximize2 className="h-3.5 w-3.5 text-zinc-400 group-hover:text-blue-600" />
                <span className="text-[11px] font-bold text-zinc-800">{p.title}</span>
              </button>
            ))}
          </div>

          {/* 暗転＋拡大モーダル */}
          <div
            aria-hidden={lightboxIdx === null}
            onClick={() => setLightboxIdx(null)}
            className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-[1px]"
            style={{
              opacity: lightboxIdx !== null ? 1 : 0,
              pointerEvents: lightboxIdx !== null ? 'auto' : 'none',
              transition: `opacity ${effectiveDuration}s ease`
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-[260px] rounded-xl border bg-white p-4 shadow-2xl ${
                showXRay ? 'border-2 border-dashed border-orange-500' : 'border-zinc-200'
              }`}
              style={{
                transform: lightboxIdx !== null ? 'scale(1)' : 'scale(0.86)',
                transition: `transform ${effectiveDuration}s ${easeCss}`
              }}
            >
              <button
                type="button"
                aria-label="閉じる"
                onClick={() => setLightboxIdx(null)}
                className="absolute top-2.5 right-2.5 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="text-[10px] font-mono text-blue-600">
                ZOOM {(lightboxIdx ?? 0) + 1} / {photos.length}
              </div>
              <div className="mt-1 text-sm font-bold text-zinc-900">{activePhoto?.title}</div>
              <p className="mt-1 text-[11px] text-zinc-500">{activePhoto?.desc}</p>
              <div className="mt-3 flex justify-end gap-1.5">
                <button
                  type="button"
                  aria-label="前へ"
                  onClick={() => setLightboxIdx((prev) => (prev === null ? 0 : (prev + 2) % 3))}
                  className="rounded border border-zinc-200 px-2 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                >
                  ‹ 前
                </button>
                <button
                  type="button"
                  aria-label="次へ"
                  onClick={() => setLightboxIdx((prev) => (prev === null ? 0 : (prev + 1) % 3))}
                  className="rounded border border-zinc-200 px-2 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                >
                  次 ›
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // -------------------------------------------------------------------------
    // 5. トランプのように後ろからせり上がる重ねカード・デッキ
    // -------------------------------------------------------------------------
    case 'carousel-stack-deck': {
      const deck = [
        { num: 'CARD 01', heading: 'クリックで次のカードへ', bg: 'bg-white border-zinc-200' },
        { num: 'CARD 02', heading: '後ろのカードが前に来る', bg: 'bg-blue-50 border-blue-200' },
        { num: 'CARD 03', heading: '順番にトランプのように循環', bg: 'bg-emerald-50 border-emerald-200' }
      ];
      return (
        <div className="relative h-36 w-full max-w-[260px]">
          {deck.map((item, i) => {
            const pos = (i - stackTopIdx + deck.length) % deck.length;
            const translateY = pos * 10;
            const scale = 1 - pos * 0.06;
            const zIndex = deck.length - pos;
            const opacity = pos === 2 ? 0.72 : 1;

            return (
              <button
                key={item.num}
                type="button"
                onClick={() => setStackTopIdx((prev) => (prev + 1) % deck.length)}
                className={`absolute inset-x-0 top-0 h-28 rounded-xl border p-4 text-left shadow-sm cursor-pointer ${item.bg} ${
                  showXRay ? 'border-2 border-dashed' : ''
                }`}
                style={{
                  zIndex,
                  opacity,
                  transform: `translateY(${translateY}px) scale(${scale})`,
                  transition: `transform ${effectiveDuration}s ${easeCss}, opacity ${effectiveDuration}s ease`
                }}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>{item.num}</span>
                  <span>
                    {showXRay
                      ? `depth=${pos} (scale ${scale.toFixed(2)})`
                      : pos === 0
                        ? 'タップで次へ →'
                        : ''}
                  </span>
                </div>
                <div className="mt-2 text-xs font-extrabold text-zinc-900">{item.heading}</div>
              </button>
            );
          })}
        </div>
      );
    }

    default:
      return null;
  }
};
