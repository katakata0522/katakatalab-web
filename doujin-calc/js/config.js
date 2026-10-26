/**
 * config.js (v1.3.0 - ペルソナ辛口レビュー全面反映版)
 * 同人即売会 頒布価格＆お釣り・損益最適化シミュレーター Pro
 */

export const DOUJIN_CONFIG = {
  VERSION: 'v1.3.0',
  APP_NAME: '同人即売会 頒布価格＆お釣り・損益シミュレーター Pro',
  APP_SUBTITLE: 'コミケ・COMITIA・赤ブー・M3・ゲーム即売会・書店委託・BOOTH完全対応',
  DOMAIN: 'https://katakatalab.com/doujin-calc/',

  // ジャンル別プリセット
  PRESETS: {
    manga: {
      id: 'manga',
      icon: 'palette',
      title: 'マンガ同人誌',
      subtext: 'B5 / 28〜36p / 100部',
      marketPrice: '相場 ¥500〜700',
      copies: 100,
      nonSale: 2,
      costTotal: 35000,
      fixedFee: 7000,
      shippingFee: 2500,
      otherFee: 0,
      customPrice: 600,
      recommendPrice: 600,
      printType: 'offset'
    },
    novel: {
      id: 'novel',
      icon: 'book-open',
      title: '小説同人誌',
      subtext: 'A5・文庫 / 100p前後 / 50部',
      marketPrice: '相場 ¥800〜1,000',
      copies: 50,
      nonSale: 2,
      costTotal: 28000,
      fixedFee: 7000,
      shippingFee: 2000,
      otherFee: 0,
      customPrice: 800,
      recommendPrice: 800,
      printType: 'ondemand'
    },
    tech: {
      id: 'tech',
      icon: 'laptop',
      title: '技術書・専門書',
      subtext: 'B5・A5 / 80p以上 / 100部',
      marketPrice: '相場 ¥1,000〜1,500',
      copies: 100,
      nonSale: 3,
      costTotal: 65000,
      fixedFee: 8500,
      shippingFee: 3000,
      otherFee: 0,
      customPrice: 1200,
      recommendPrice: 1200,
      printType: 'ondemand'
    },
    game: {
      id: 'game',
      icon: 'gamepad-2',
      title: 'ゲーム / 音源 / DLカード',
      subtext: 'SONOCA・Steamキー・CDプレス / 50部',
      marketPrice: '相場 ¥1,000〜2,000',
      copies: 50,
      nonSale: 2,
      costTotal: 40000,
      fixedFee: 7000,
      shippingFee: 2000,
      otherFee: 5000,     // DLカード発行費/試聴機
      customPrice: 1500,
      recommendPrice: 1500,
      printType: 'cd_press'
    },
    goods: {
      id: 'goods',
      icon: 'sparkles',
      title: 'グッズ単体',
      subtext: 'アクスタ・缶バッジ・キーホルダー / 30個',
      marketPrice: '相場 ¥500〜800',
      copies: 30,
      nonSale: 1,
      costTotal: 15000,
      fixedFee: 5000,
      shippingFee: 1500,
      otherFee: 0,
      customPrice: 600,
      recommendPrice: 600,
      printType: 'goods_mfg'
    }
  },

  // 固定比較価格プラン
  FIXED_PRICES: [500, 700, 1000],

  // キャッシュレス基本手数料率
  // 仮置き。Airペイのクレジット公開料金。Square対面は条件で2.5%か3.25%（2026年10月の公式料金）
  CASHLESS_FEE_RATE: 0.0324,

  // 委託。メロンは店頭価格（税抜）の30%が受託手数料で純額は70%（小数第一位四捨五入）。
  // BOOTHは公式ヘルプの「価格×5.6%+45円、小数点以下切り上げ」。自宅発送は送料にも5.6%が乗る。
  CONSIGNMENT_RATES: {
    melon: { name: 'メロンブックス', rate: 0.30 },
    booth: { name: 'BOOTH', rate: 0.056, fixed: 45 }
  },

  // 印刷所締切割増・割引倍率
  DEADLINE_DISCOUNTS: {
    early30: { label: '超早割の目安 (-30%)', multiplier: 0.70 },
    early15: { label: '早割の目安 (-15%)', multiplier: 0.85 },
    normal: { label: '通常締切 (±0%)', multiplier: 1.00 },
    late20: { label: '直前割増の目安 (+20%)', multiplier: 1.20 },
    late40: { label: '特急割増の目安 (+40%)', multiplier: 1.40 }
  },

  // 釣銭規模モード
  CHANGE_MODES: {
    beginner: { id: 'beginner', name: '島中・初心者モード (〜50部)', baseMultiplier: 0.15, bills1000Min: 8 },
    standard: { id: 'standard', name: '標準モード (100〜200部)', baseMultiplier: 0.25, bills1000Min: 15 },
    wall: { id: 'wall', name: '大手・壁サークル列耐性モード (300部〜)', baseMultiplier: 0.40, bills1000Min: 40 }
  },

  // サークル設営・当日持ち物チェックリスト初期マスタ
  DEFAULT_CHECKLIST: [
    { id: 'item_money', text: '釣銭（千円札・500円玉・100円玉）＋コインケース', checked: true },
    { id: 'item_sample', text: '見本誌提出用シール ＆ ペン', checked: true },
    { id: 'item_menu', text: 'お品書きPOP ＆ 卓上ポスタースタンド', checked: true },
    { id: 'item_tape', text: '養生テープ・マスキングテープ・ハサミ', checked: true },
    { id: 'item_tablecloth', text: '敷き布（防炎クロス 90×120cm目安）', checked: true },
    { id: 'item_card_terminal', text: 'キャッシュレス決済端末 ＆ モバイルバッテリー', checked: false },
    { id: 'item_bag', text: 'ゴミ袋・搬入用段ボール用ガムテープ', checked: true },
    { id: 'item_pen', text: '筆記用具（油性マジック・ボールペン・メモ帳）', checked: true },
    { id: 'item_battery', text: 'スマホ充電用モバイルバッテリー (大容量)', checked: true }
  ],

  // おすすめ備品セレクション
  AFFILIATE_SUPPLIES: [
    {
      id: 'coin_case',
      title: '50枚区切り コインカウンター付 コインケース',
      desc: '100円玉・500円玉が一目で残高把握できる必須アイテム。',
      price: '約 ¥1,000〜',
      icon: 'boxes',
      iconColor: 'text-amber-500',
      url: 'https://www.amazon.co.jp/s?k=%E3%82%B3%E3%82%A4%E3%83%B3%E3%82%B1%E3%83%BC%E3%82%B9+%E5%8D%B3%E5%A3%B2%E4%BC%9A'
    },
    {
      id: 'poster_stand',
      title: '卓上伸縮式 ポスタースタンド (PO.Stand)',
      desc: 'A3/A2ポスターを机上に目立たせて通行人の視線をキャッチ！',
      price: '約 ¥1,800〜',
      icon: 'presentation',
      iconColor: 'text-indigo-500',
      url: 'https://www.amazon.co.jp/s?k=%E5%8D%93%E4%B8%8A+%E3%83%9D%E3%82%B9%E3%82%BF%E3%83%BC%E3%82%B9%E3%82%BF%E3%83%B3%E3%83%89+%E5%90%8C%E4%BA%BA'
    },
    {
      id: 'square_terminal',
      title: 'Square リーダー (タッチ決済・電子マネー対応)',
      desc: '月額0円。対面手数料は条件により2.5%から。端末代は別。',
      price: '約 ¥4,980〜',
      icon: 'smartphone',
      iconColor: 'text-emerald-500',
      url: 'https://www.amazon.co.jp/s?k=Square+%E3%83%AA%E3%83%BC%E3%83%80%E3%83%BC+%E6%B1%BA%E6%88%88%E7%AB%AF%E6%9C%AB'
    }
  ],

  // よくある質問 (FAQ)
  FAQS: [
    {
      q: '同人誌の頒布価格はどうやって決めるのが一般的ですか？',
      a: '基本は「500円（ワンコイン）」または「1,000円（ジャスト千円）」が会計スピード・お釣りミスの観点で圧倒的におすすめです。ページ数が多く原価が高い場合は700円〜800円に設定されますが、その場合は100円玉のお釣りが大量に必要となるため、事前の釣銭準備が必須となります。'
    },
    {
      q: '少部数（30部〜50部）の初心者ですが、赤字になっても大丈夫ですか？',
      a: '初参加の同人即売会は「認知獲得・読者との出会い・ファンコミュニティ作り」のためのプロモーション活動です。完売して数千円〜1万円程度の赤字であれば、1人あたり数百円の宣伝広告費として大成功と言えます。'
    },
    {
      q: '同人誌が売れ残った場合、税務（確定申告）でどう扱われますか？',
      a: '売れ残った同人誌の製造原価は「棚卸資産（在庫）」となり、その年の経費（売上原価）には計上できません。例えば100部刷って70部売れた場合、残りの30部分の印刷費は翌期以降に繰り越され、実際に売れた年（または廃棄した年）の経費となります。'
    },
    {
      q: '新刊セット（本＋グッズ）を頒布する際のお釣りの注意点は？',
      a: '新刊（700円）＋アクスタ（800円）をバラで売ると100円玉お釣りが頻発しますが、「新刊セット1,500円」や「2,000円」としてまとめ買いを促すことで、千円札と500円玉のみの最速会計が可能になります。'
    }
  ]
};
