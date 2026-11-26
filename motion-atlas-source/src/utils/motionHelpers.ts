import type { CategoryMeta, EasingOption, EasingPresetId, PatternControls } from '../types/motion';
import { MAX_TARGET_NOTE_LENGTH, sanitizePlainText } from './security';

export const EASING_OPTIONS: Readonly<Record<EasingPresetId, Readonly<EasingOption>>> = Object.freeze({
  smooth: Object.freeze({
    id: 'smooth',
    label: 'なめらか',
    css: 'cubic-bezier(0.22, 1, 0.36, 1)',
    description: '最初が速く、止まる直前にスッと減速する上品なカーブ'
  }),
  snappy: Object.freeze({
    id: 'snappy',
    label: 'キビキビ',
    css: 'cubic-bezier(0.16, 1, 0.3, 1)',
    description: '反応が早く、小気味よくピタッと止まる実務向けカーブ'
  }),
  spring: Object.freeze({
    id: 'spring',
    label: '少し弾む',
    css: 'cubic-bezier(0.34, 1.45, 0.64, 1)',
    description: '終点を少しだけ行き過ぎて戻る、親しみのあるバネ感'
  })
});

export const CATEGORIES: readonly CategoryMeta[] = Object.freeze([
  Object.freeze({
    id: 'text',
    code: '01',
    label: '文字の動き',
    shortLabel: '文字',
    description: '見出しやキャッチコピーを印象的に登場させるテキスト表現'
  }),
  Object.freeze({
    id: 'reveal',
    code: '02',
    label: '箱・カードの出現',
    shortLabel: '出現',
    description: '写真・カード・記事ブロックを違和感なく画面に迎え入れる動き'
  }),
  Object.freeze({
    id: 'nav',
    code: '03',
    label: 'ハンバーガー・メニュー',
    shortLabel: 'メニュー',
    description: 'ボタンを押したときのメニューの開き方・画面の覆い方'
  }),
  Object.freeze({
    id: 'tabs',
    code: '04',
    label: 'タブ・切り替え',
    shortLabel: 'タブ',
    description: '選択中の目印の動かし方と、中身の切り替え体験'
  }),
  Object.freeze({
    id: 'search',
    code: '05',
    label: '検索UIの置き方',
    shortLabel: '検索UI',
    description: '虫眼鏡1個から全面透かし文字まで、検索窓の配置と振る舞い'
  }),
  Object.freeze({
    id: 'micro',
    code: '06',
    label: 'ボタン・ホバー反応',
    shortLabel: '反応',
    description: '押した感覚やカーソルに反応する小さな手触り（マイクロインタラクション）'
  }),
  Object.freeze({
    id: 'layout',
    code: '07',
    label: '立て付け・スクロール・待機',
    shortLabel: '立て付け',
    description: 'ページ全体のレイアウト構造、スクロール連動、待機・通知表現'
  }),
  Object.freeze({
    id: 'header',
    code: '08',
    label: 'ヘッダー（頭・リンク表現）',
    shortLabel: 'ヘッダー',
    description: 'サイトの看板であるヘッダー構造と、クリック・ホバー時のリンク表現違い'
  }),
  Object.freeze({
    id: 'footer',
    code: '09',
    label: 'フッター（足・着地）',
    shortLabel: 'フッター',
    description: 'サイトマップ型・超軽量1行・登録欄付き・CTA一体・幕上がり等の足元設計'
  }),
  Object.freeze({
    id: 'craft',
    code: '10',
    label: '独創仕掛け・数値・目次',
    shortLabel: '独創仕掛け',
    description: 'カード裏返し・ビフォーアフター比較・数値カウント・追従目次などの見せ場ギミック'
  }),
  Object.freeze({
    id: 'carousel',
    code: '11',
    label: 'カルーセル・ギャラリー',
    shortLabel: 'カルーセル',
    description: '横に送るサムネイル・チラ見せスライダー・拡大ライトボックス・重ねカードめくり'
  }),
  Object.freeze({
    id: 'pricing',
    code: '12',
    label: '料金・比較（マネタイズ）',
    shortLabel: '料金・比較',
    description: 'プラン比較・○×表・月額/年額スイッチ・利用量計算など契約判断を助ける設計'
  }),
  Object.freeze({
    id: 'forms',
    code: '13',
    label: 'フォーム・操作反応',
    shortLabel: 'フォーム',
    description: '送信状態変化・ラベル移動・エラー揺れ・ステップ進捗・ファイル投入の手触り'
  }),
  Object.freeze({
    id: 'guides',
    code: '14',
    label: '案内・戻る・状態ページ',
    shortLabel: '案内・戻る',
    description: 'TOPへ戻る4形態・お知らせ帯・ツールチップ・空状態・2段階確認などの気配りUI'
  })
]);

export interface PromptSpec {
  name: string;
  goal: string;
  mechanism: string;
  requirements: string[];
  params: PatternControls;
  secondaryLabel?: string;
  secondaryUnit?: string;
  targetNote?: string;
  isStatic?: boolean;
}

export function buildStructuredPrompt(spec: PromptSpec): string {
  const ease = EASING_OPTIONS[spec.params.easing];
  const sanitizedTarget = sanitizePlainText(spec.targetNote ?? '', MAX_TARGET_NOTE_LENGTH).trim();
  const target = sanitizedTarget
    ? sanitizedTarget
    : '（ここに適用したい場所を入力：例・トップページの見出し／ヘッダー／商品一覧）';

  const paramLines: string[] = [];
  if (!spec.isStatic) {
    paramLines.push(`- 所要時間: ${spec.params.duration.toFixed(2)}秒`);
  } else {
    paramLines.push('- 動きの有無: なし（静的配置・レスポンシブ構造重視）');
  }
  if (spec.secondaryLabel) {
    paramLines.push(`- ${spec.secondaryLabel}: ${spec.params.distance}${spec.secondaryUnit ?? ''}`);
  }
  if (!spec.isStatic) {
    paramLines.push(`- 動きの質感: ${ease.label}（CSS: ${ease.css}）`);
  }

  return [
    `次のWebアニメーション／UI表現を、私のサイトに実装してください。`,
    ``,
    `■ 適用したい場所`,
    target,
    ``,
    `■ やりたい動き・見せ方（${spec.name}）`,
    spec.goal,
    ``,
    `■ パラメータ・構成指定`,
    ...paramLines,
    ``,
    `■ 裏側の仕組み（実装方式）`,
    spec.mechanism,
    ``,
    `■ 実装時の注意点`,
    ...spec.requirements.map((req) => `- ${req}`),
    ...(spec.isStatic
      ? []
      : [
          `- OSの「視差効果を減らす（prefers-reduced-motion: reduce）」が有効な場合は過度な移動を控えてください`
        ])
  ].join('\n');
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }

  const prevFocused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const textarea = document.createElement('textarea');
  try {
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.setAttribute('aria-hidden', 'true');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    if (textarea.parentNode) {
      textarea.parentNode.removeChild(textarea);
    }
    prevFocused?.focus?.();
  }
}
