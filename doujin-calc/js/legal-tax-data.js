/**
 * legal-tax-data.js (v1.2.0)
 * 同人即売会 法務・免責事項・税務・キャッシュレスガイドデータ
 */

export const LEGAL_TAX_DATA = {
  terms: `
    <div class="space-y-3 text-xs leading-relaxed">
      <h3 class="font-bold text-sm text-slate-900 dark:text-white">第1条（目的と本サービス）</h3>
      <p>本ツール「同人即売会 頒布価格＆お釣り・損益最適化シミュレーター Pro」は、同人サークルの頒布計画・損益計算・釣銭準備・税務棚卸計算の目安を試算するための無料シミュレーターです。</p>
      
      <h3 class="font-bold text-sm text-slate-900 dark:text-white">第2条（免責事項）</h3>
      <p>1. 本シミュレーターによる試算結果（損益分岐点、お釣り推奨枚数、税務棚卸資産額等）は一般的な計算モデルに基づく参考値であり、実際の売上や税務申告の完全性を保証するものではありません。</p>
      <p>2. 各印刷所の締切割引率・割増率、即売会主催者の規約、決済代行会社（Square・Airペイ等）の手数料・規約変更により実際の金額と乖離が生じる場合があります。</p>
      <p>3. 確定申告や税務処理の詳細については、必ず所轄の税務署または税理士等の専門家へご相談ください。</p>
      
      <h3 class="font-bold text-sm text-slate-900 dark:text-white">第3条（著作権・商標）</h3>
      <p>本サイト内のテキスト・計算ロジック・デザイン等の著作権は運営者に帰属します。各社名・サービス名（コミックマーケット、COMITIA、Square、Airペイ等）は各社の商標または登録商標です。</p>
    </div>
  `,

  privacy: `
    <div class="space-y-3 text-xs leading-relaxed">
      <h3 class="font-bold text-sm text-slate-900 dark:text-white">第1条（個人情報保護・端末内完結）</h3>
      <p>本シミュレーターは完全クライアントサイド（ブラウザ内）で動作します。ユーザーが入力した部数、製造費、価格、売上メモ等のデータは外部サーバーへ一切送信されず、お使いの端末（LocalStorage）にのみ安全に保存されます。</p>
      
      <h3 class="font-bold text-sm text-slate-900 dark:text-white">第2条（アクセス解析・Cookie）</h3>
      <p>本サイトでは、サービスの改善および利用状況の把握のためにGoogle Analytics等のアクセス解析ツール、またはCookieを使用した広告配信（Google AdSense等）を利用する場合があります。これらは匿名で収集され、個人を特定するものではありません。</p>
    </div>
  `,

  taxGuide: `
    <div class="space-y-3 text-xs leading-relaxed">
      <div class="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/60">
        <h4 class="font-black text-xs text-amber-900 dark:text-amber-300 mb-1">⚠️ 同人作家が最もハマる「棚卸資産（売れ残り）」の罠</h4>
        <p class="text-slate-700 dark:text-slate-300">
          同人誌を100部刷って70部売れた場合、<strong>当期の経費にできるのは「売れた70部分の製造原価」のみ</strong>です。残りの30部分は「期末商品棚卸高（在庫資産）」となり、今期の経費から除外（繰越）されます。
        </p>
      </div>

      <h4 class="font-bold text-xs text-slate-900 dark:text-white">家内労働者等の必要経費の特例は、同人頒布には通常使えません</h4>
      <p>
        国税庁タックスアンサーNo.1810の対象は、家内労働者・外交員・集金人・検針人など、特定の相手に継続して役務を提供する人です。不特定の読者に本を売る同人活動は、これだけで特例の対象にはなりません。金額も年分で違い、令和7年分は65万円、令和8年分は69万円（令和8年12月1日施行）です。使えるかは所轄の税務署か税理士に確認してください。
      </p>

      <h4 class="font-bold text-xs text-slate-900 dark:text-white">📦 廃棄した在庫の「廃棄損（除却損）」計上</h4>
      <p>
        長期間売れ残った同人誌を廃棄した場合、廃棄証明（業者伝票や写真）を残すことで、繰り越していた在庫金額を「廃棄損」としてその年の経費に算入できます。
      </p>
    </div>
  `,

  cashlessGuide: `
    <div class="space-y-3 text-xs leading-relaxed">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div class="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div class="font-black text-slate-900 dark:text-white mb-1">■ Square (スクエア)</div>
          <p class="text-slate-600 dark:text-slate-300 text-[11px]">
            ・対面手数料: 条件を満たすと2.5%。満たさない場合は3.25%から（2026年10月のSquare公式料金）<br>
            ・入金日と振込手数料は銀行とプランで変わります。計算前に公式の料金を見てください。<br>
            ・このツールの仮置き3.24%は、Squareの対面手数料ではありません。
          </p>
        </div>

        <div class="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div class="font-black text-slate-900 dark:text-white mb-1">■ Airペイ (エアペイ)</div>
          <p class="text-slate-600 dark:text-slate-300 text-[11px]">
            ・クレジットの公開料金は3.24%とされる例があります（2026年10月時点の比較資料）。契約画面の数字を優先してください。<br>
            ・入金回数と振込手数料は銀行で変わります。<br>
            ・交通系電子マネーに対応しています。
          </p>
        </div>
      </div>
    </div>
  `
};
