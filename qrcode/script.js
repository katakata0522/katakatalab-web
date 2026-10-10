'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const els = {
    text: document.getElementById('qrText'),
    size: document.getElementById('qrSize'),
    sizeVal: document.getElementById('sizeValue'),
    btnDec: document.getElementById('btnDecrease'),
    btnInc: document.getElementById('btnIncrease'),
    fgColor: document.getElementById('qrForeground'),
    bgColor: document.getElementById('qrBackground'),
    swapBtn: document.getElementById('swapColorsBtn'),
    warning: document.getElementById('contrastWarning'),
    transparencyWarning: document.getElementById('transparencyWarning'),
    canvas: document.getElementById('qrCanvas'),
    placeholder: document.getElementById('placeholder'),
    loading: document.getElementById('loadingIndicator'),
    downloadBtn: document.getElementById('downloadBtn'),
    downloadBtnText: document.getElementById('downloadBtnText'),
    fileNamePreview: document.getElementById('fileNamePreview'),
    charCount: document.getElementById('charCount'),
    errorMsg: document.getElementById('errorMsg'),
    dataType: document.getElementById('dataType'),
    templateFields: document.getElementById('templateFields'),
    templateHint: document.getElementById('templateHint'),
    templateErrorMsg: document.getElementById('templateErrorMsg'),
    eccLevel: document.getElementById('eccLevel'),
    qrPadding: document.getElementById('qrPadding'),
    paddingValue: document.getElementById('paddingValue'),
    transparentBg: document.getElementById('transparentBg'),
    exportFormat: document.getElementById('exportFormat'),
    filePrefix: document.getElementById('filePrefix'),
    wifiSsid: document.getElementById('wifiSsid'),
    wifiAuth: document.getElementById('wifiAuth'),
    wifiPassword: document.getElementById('wifiPassword'),
    wifiHidden: document.getElementById('wifiHidden'),
    mailTo: document.getElementById('mailTo'),
    mailSubject: document.getElementById('mailSubject'),
    mailBody: document.getElementById('mailBody'),
    telNumber: document.getElementById('telNumber'),
    smsNumber: document.getElementById('smsNumber'),
    smsBody: document.getElementById('smsBody'),
    lineId: document.getElementById('lineId'),
    socialPlatform: document.getElementById('socialPlatform'),
    socialHandle: document.getElementById('socialHandle'),
    vName: document.getElementById('vName'),
    vOrg: document.getElementById('vOrg'),
    vPhone: document.getElementById('vPhone'),
    vMail: document.getElementById('vMail'),
    vUrl: document.getElementById('vUrl'),
    socialQuickPlatform: document.getElementById('socialQuickPlatform'),
    socialQuickValue: document.getElementById('socialQuickValue'),
    applySocialQuickBtn: document.getElementById('applySocialQuickBtn'),
    bulkCsvFile: document.getElementById('bulkCsvFile'),
    bulkCsvText: document.getElementById('bulkCsvText'),
    bulkPreviewBtn: document.getElementById('bulkPreviewBtn'),
    bulkDownloadBtn: document.getElementById('bulkDownloadBtn'),
    bulkSummary: document.getElementById('bulkSummary'),
    bulkPreviewList: document.getElementById('bulkPreviewList'),
    bulkStatus: document.getElementById('bulkStatus'),
    scannerToggleBtn: document.getElementById('scannerToggleBtn'),
    scannerVideo: document.getElementById('scannerVideo'),
    scannerStatus: document.getElementById('scannerStatus'),
    scannerResult: document.getElementById('scannerResult'),
    planFree: document.getElementById('planFree'),
    planPro: document.getElementById('planPro'),
    licenseKeyInput: document.getElementById('licenseKeyInput'),
    applyLicenseBtn: document.getElementById('applyLicenseBtn'),
    planStatus: document.getElementById('planStatus'),
    planHelp: document.getElementById('planHelp'),
    planToggle: document.getElementById('planToggle'),
    logoFile: document.getElementById('logoFile'),
    logoPreview: document.getElementById('logoPreview'),
    clearLogoBtn: document.getElementById('clearLogoBtn'),
    logoSizePercent: document.getElementById('logoSizePercent'),
    logoSizeValue: document.getElementById('logoSizeValue'),
    logoBackdrop: document.getElementById('logoBackdrop'),
    logoWarning: document.getElementById('logoWarning'),
    qualityGrade: document.getElementById('qualityGrade'),
    qualitySummary: document.getElementById('qualitySummary'),
    qualityChecklist: document.getElementById('qualityChecklist'),
    presetName: document.getElementById('presetName'),
    savePresetBtn: document.getElementById('savePresetBtn'),
    loadPresetBtn: document.getElementById('loadPresetBtn'),
    deletePresetBtn: document.getElementById('deletePresetBtn'),
    presetSelect: document.getElementById('presetSelect'),
    presetStatus: document.getElementById('presetStatus'),
    bulkZipBtn: document.getElementById('bulkZipBtn'),
    openSidebarBtn: document.getElementById('openSidebarBtn'),
    closeSidebarBtn: document.getElementById('closeSidebarBtn'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),
    settingsSidebar: document.getElementById('settingsSidebar'),
    langJaBtn: document.getElementById('langJaBtn'),
    langEnBtn: document.getElementById('langEnBtn'),
    mobileTemplateBtn: document.getElementById('mobileTemplateBtn'),
    mobileSettingsBtn: document.getElementById('mobileSettingsBtn'),
    mobileDownloadBtn: document.getElementById('mobileDownloadBtn')
  };

  const requiredKeys = Object.keys(els);
  const missingKeys = requiredKeys.filter((key) => !els[key]);
  if (missingKeys.length > 0) {
    console.error('QR Code Lab: required elements are missing', missingKeys);
    return;
  }

  const MAX_CHARS = 1000;
  const INPUT_DEBOUNCE_MS = 350;
  const MIME_BY_FORMAT = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf'
  };
  const EXT_BY_FORMAT = {
    png: 'png',
    jpeg: 'jpg',
    webp: 'webp',
    svg: 'svg',
    pdf: 'pdf'
  };
  const OPTIONAL_LIB_SRC = {
    jszip: 'vendor/jszip.min.js',
    jspdf: 'vendor/jspdf.umd.min.js'
  };
  const OPTIONAL_LIB_TIMEOUT_MS = 8000;
  const SOCIAL_BASE_URL = {
    x: 'https://x.com/',
    instagram: 'https://www.instagram.com/',
    youtube: 'https://www.youtube.com/',
    tiktok: 'https://www.tiktok.com/@',
    note: 'https://note.com/',
    website: ''
  };
  const LANG_STORAGE_KEY = 'qr_forge_lab_lang';
  const PLAN_STORAGE_KEY = 'qr_forge_lab_plan';
  const LICENSE_STORAGE_KEY = 'qr_forge_lab_license';
  const PRESET_STORAGE_KEY = 'qr_forge_lab_presets';
  const DEFAULT_LANG = 'ja';
  const DEFAULT_PLAN = 'free';
  const DEFAULT_FOREGROUND_COLOR = '#111827';
  const VALID_LICENSE_PATTERN = /^PRO-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  const MAX_LOGO_FILE_BYTES = 2 * 1024 * 1024;
  const MAX_LOGO_COVERAGE = 0.18;
  const MIN_RECOMMENDED_QUIET_ZONE_MODULES = 4;
  const BULK_PREVIEW_LIMIT = 5;
  const SUPPORTED_LANGS = ['ja', 'en'];
  const PRO_ONLY_EXPORT_FORMATS = new Set(['svg', 'pdf']);
  const TEMPLATE_HINT_KEY_BY_TYPE = Object.freeze({
    plain: 'sidebar.templateHintPlain',
    wifi: 'sidebar.templateHintWifi',
    mailto: 'sidebar.templateHintMailto',
    tel: 'sidebar.templateHintTel',
    sms: 'sidebar.templateHintSms',
    line: 'sidebar.templateHintLine',
    social: 'sidebar.templateHintSocial',
    vcard: 'sidebar.templateHintVcard'
  });
  const DATA_TYPE_VALUES = Object.freeze(Object.keys(TEMPLATE_HINT_KEY_BY_TYPE));
  const I18N = {
    ja: {
      lang: {
        ja: '日本語',
        en: 'English'
      },
      header: {
        tagline: '登録不要・基本機能無料・無制限で使えるQR作成ツール',
        settingsButton: '⚙ 詳細設定',
        badgeTitle: 'QR作成データは端末内で処理されます'
      },
      main: {
        inputLabel: '作成する内容 <small>(URL / テキスト)</small>',
        errorTooLong: '⚠️ 文字数が多すぎます (Max 1000)',
        sizeLabel: 'サイズ',
        decreaseAria: '小さくする',
        increaseAria: '大きくする',
        colorLabel: 'カラー設定',
        swapButton: '⇄ 反転',
        swapAria: '色を反転',
        codeColor: 'コード',
        bgColor: '背景',
        codeColorTitle: 'QRコードの色',
        bgColorTitle: '背景色',
        contrastWarning: '色が似すぎて読み取れない可能性があります',
        placeholder: 'テキストを入力すると<br>即座に表示されます',
        downloadDefault: 'PNGで保存する',
        templatePlaceholder: 'テンプレート入力から自動生成されます'
      },
      sidebar: {
        aria: '詳細設定サイドバー',
        title: '詳細設定',
        closeAria: '詳細設定を閉じる',
        generateOptions: '生成オプション',
        quickStartTitle: 'よく使うテンプレート',
        quickStartAria: '用途カードのクイック選択',
        quickPlain: 'URL / テキスト',
        quickPlainHint: '自由入力',
        quickWifi: 'Wi-Fi',
        quickWifiHint: '店内共有向け',
        quickMail: 'メール',
        quickMailHint: '問い合わせ受付',
        quickSocial: 'SNS',
        quickSocialHint: 'プロフィール案内',
        quickVcard: '連絡先',
        quickVcardHint: '名刺交換向け',
        quickLine: 'LINE',
        quickLineHint: '友だち追加',
        dataTemplate: '作るQRの種類',
        dataTemplateAria: '作るQRの種類を選択',
        typePlain: 'URL / テキスト（自由入力）',
        typeWifi: 'Wi-Fi 接続',
        typeMailto: 'メールリンク',
        typeTel: '電話番号',
        typeSms: 'SMS',
        typeLine: 'LINE 追加',
        typeSocial: 'SNSプロフィール',
        typeVcard: '連絡先（vCard）',
        templateHintPlain: 'URL / テキストはそのまま入力できます。種類を選ぶと必要な入力欄だけ表示されます。',
        templateHintWifi: 'SSID は必須です。共有用QRでは暗号化方式とパスワードを設定してください。',
        templateHintMailto: '宛先メールが必須です。件名と本文は任意で追加できます。',
        templateHintTel: '電話番号を入力すると、タップで発信できるQRになります。',
        templateHintSms: '電話番号が必須です。メッセージ本文は任意です。',
        templateHintLine: 'LINE ID または招待URLを入力すると、追加リンクQRを作成できます。',
        templateHintSocial: 'SNSのID・URLを入力すると、プロフィールを開くQRを作成できます。',
        templateHintVcard: '名刺QRです。1項目以上入力すると vCard 形式で生成されます。',
        validationWifiSsid: 'Wi-FiのSSIDは必須です。',
        validationWifiPassword: '暗号化方式が「なし」以外のときはWi-Fiパスワードが必須です。',
        validationMailRequired: '宛先メールは必須です。',
        validationMailInvalid: '宛先メールの形式が正しくありません。',
        validationTelRequired: '電話番号は必須です。',
        validationSmsRequired: 'SMS送信先の電話番号は必須です。',
        validationLineRequired: 'LINE ID または URL 末尾は必須です。',
        validationSocialRequired: 'SNSのID / URL / ハンドルは必須です。',
        validationVcardRequired: '連絡先（vCard）は最低1項目の入力が必要です。',
        required: '必須',
        recommended: '推奨',
        optionalFields: '任意項目',
        vcardMinimumNote: '最低1項目入力すると連絡先QRを作成できます。',
        wifiSsid: 'SSID',
        wifiAuth: '暗号化方式',
        wifiAuthWpa: 'WPA/WPA2',
        wifiAuthWep: 'WEP',
        wifiAuthNone: 'なし',
        wifiPassword: 'パスワード',
        wifiHidden: '非公開SSID',
        mailTo: '宛先メール',
        mailSubject: '件名',
        mailBody: '本文',
        telNumber: '電話番号',
        smsNumber: '電話番号',
        smsBody: 'メッセージ',
        lineId: 'LINE ID またはURL末尾',
        socialPlatform: 'SNSプラットフォーム',
        socialHandle: 'ID / URL / ハンドル',
        vName: '表示名',
        vOrg: '会社名',
        vPhone: '電話番号',
        vMail: 'メール',
        vUrl: 'Webサイト',
        eccLevel: '誤り訂正レベル',
        eccAuto: '自動（推奨）',
        eccH: 'H（高）',
        eccQ: 'Q（中高）',
        eccM: 'M（中）',
        eccL: 'L（低）',
        eccHelp: '読み取りエラーへの強さです。迷ったら「自動（推奨）」のままで大丈夫です。',
        paddingLabel: '余白（読み取り用スペース）',
        transparentBg: '背景を透過',
        transparencyWarning: '透過背景は設置面によって読み取りにくくなる場合があります',
        exportFormat: '保存形式',
        formatPng: 'PNG',
        formatJpeg: 'JPEG',
        formatWebp: 'WebP',
        formatSvg: 'SVG (Pro)',
        formatPdf: 'PDF (Pro)',
        filePrefix: 'ファイル名プレフィックス',
        socialHub: 'SNSリンクQRハブ',
        socialHubHelp: '種類を切り替えなくても、SNS向けQRをすぐ作成できます。',
        platform: 'プラットフォーム',
        idOrUrl: 'ID / URL',
        applySocialQuick: 'この内容でQRを作成',
        bulkTitle: 'CSV一括生成',
        bulkHelp: '1行に1件ずつ `value,name` 形式で入力すると、複数のQRをまとめて作成できます。',
        bulkFile: 'CSVファイルを読み込む（任意）',
        bulkText: 'CSVテキストを貼り付ける',
        bulkPlaceholder: 'value,name\nhttps://example.com,example',
        bulkParse: 'CSVを解析',
        bulkDownload: '全件保存',
        bulkUnparsed: '未解析',
        scanTitle: 'スキャン確認モード',
        scanHelp: 'この端末のカメラで、作成したQRをその場で確認できます。',
        policyTitle: '安全運用ポリシー',
        policy1: 'QR作成データを広告目的で外部送信しません。',
        policy2: '入力内容をアクセス解析のために収集しません。',
        policy3: 'QR作成に入力した内容はブラウザ内でのみ処理され、外部送信しません。',
        resetAll: '⟳ 設定をすべてリセット',
        resetDone: '✓ 設定をリセットしました'
      },
      platform: {
        x: 'X (Twitter)',
        instagram: 'Instagram',
        youtube: 'YouTube',
        tiktok: 'TikTok',
        note: 'note',
        website: 'Webサイト'
      },
      download: {
        saveAs: '{format}で保存する'
      },
      file: {
        preview: 'ファイル: {name}'
      },
      loading: {
        generating: '作成中...'
      },
      error: {
        initFailed: '⚠️ 初期化に失敗しました。ページを再読み込みしてください。'
      },
      bulk: {
        more: '…他 {count} 件',
        needInput: 'CSVテキストを入力してください。',
        noValidRows: '有効な行が見つかりませんでした。',
        loaded: '{count}件の生成データを読み込みました。',
        fileReadFailed: 'CSVファイルの読み込みに失敗しました。',
        starting: '一括保存を開始します…',
        engineFailed: 'QRエンジンの初期化に失敗しました。',
        savingProgress: '{current} / {total} を保存中…',
        saved: '{count}件を保存しました。'
      },
      scanner: {
        start: 'スキャン開始',
        stop: 'スキャン停止',
        idle: '待機中',
        read: '読取: {value}',
        match: '一致: {value}',
        matchedStatus: '現在のQR内容と一致しました。',
        unmatchedStatus: '現在のQR内容と一致しません。',
        unsupportedBarcode: 'このブラウザは確認モードに未対応です。',
        unsupportedCamera: 'カメラAPIに未対応です。',
        starting: 'カメラ起動中…QRを映してください。',
        startFailed: 'カメラの起動に失敗しました。'
      },
      mobile: {
        template: '用途',
        settings: '設定',
        save: '保存'
      },
      pro: {
        planTitle: 'Proプラン管理',
        planHelpManual: 'FreeとProを切り替えて、Pro限定機能を利用できます。',
        planHelpLicenseOnly: 'Pro機能はライセンス検証が通過した場合のみ有効になります。',
        free: 'Free',
        pro: 'Pro',
        licenseLabel: 'ライセンスキー (Pro)',
        licensePlaceholder: 'PRO-XXXX-XXXX',
        applyLicense: 'ライセンスを適用 (Pro)',
        licenseNotice: 'ライセンス検証時のみ、ライセンスキーと利用ドメインを検証APIへ送信します。',
        exportProNotice: 'SVG / PDF保存はPro機能です。どちらもPNG画像を内包し、拡大しても細部は増えません。',
        statusFree: '現在: Freeプラン',
        statusPro: '現在: Proプラン',
        statusActivated: 'Proプランを有効化しました。',
        statusInvalid: 'ライセンス形式が正しくありません。',
        statusNeedPro: 'この機能はPro限定です。',
        statusVerifying: 'ライセンスを検証中です...',
        statusVerifyFailed: 'ライセンス検証に失敗しました。通信環境をご確認ください。',
        statusUnavailable: '現在はライセンス検証サーバー未設定のため、Pro機能を有効化できません。',
        statusRevoked: 'ライセンスが無効または期限切れです。',
        logoTitle: 'ロゴ挿入 (Pro)',
        logoHelp: '中央ロゴを挿入し、色・余白・ロゴ比率などの設定を確認します。実機での読み取り確認も必要です。',
        logoFileLabel: 'ロゴ画像 (Pro)',
        logoClear: 'ロゴを削除 (Pro)',
        logoSize: 'ロゴサイズ (Pro)',
        logoBackdrop: 'ロゴの下に白背景を敷く (Pro)',
        logoWarning: 'ロゴが大きすぎるため読み取り精度が低下する可能性があります。',
        logoLoaded: 'ロゴ画像を読み込みました。',
        logoRemoved: 'ロゴを削除しました。',
        logoTooLargeFile: 'ロゴ画像は2MB以下にしてください。',
        logoReadFailed: 'ロゴ画像の読み込みに失敗しました。',
        qualityTitle: '設定の目安',
        qualityGrade: '評価',
        qualitySummaryDefault: '色・余白・ロゴ比率などを確認します。読み取り成功を保証する評価ではありません。',
        qualityItemContrast: 'コントラスト: 良好',
        qualityItemPadding: '余白: 良好',
        qualityItemLogo: 'ロゴ占有率: 良好',
        qualityItemEcc: '誤り訂正: 良好',
        qualityHigh: '設定の目安を満たしています。保存後、実際の掲載サイズで読み取りを確認してください。',
        qualityMedium: '一部の設定を見直せます。下の項目を確認し、実際の掲載サイズでも試してください。',
        qualityLow: '設定に注意点があります。色・余白・ロゴサイズを調整し、実機でも確認してください。',
        qualityContrastUnknown: 'コントラスト: 背景透過のため判定不可',
        qualityContrastGood: 'コントラスト: 良好 ({ratio})',
        qualityContrastWarn: 'コントラスト: 低め ({ratio})',
        qualityPaddingGood: '余白: 良好 ({modules}モジュール / {padding}px)',
        qualityPaddingWarn: '余白: 少なめ ({modules}モジュール / {padding}px)',
        qualityLogoGood: 'ロゴ占有率: 良好 ({ratio}%)',
        qualityLogoWarn: 'ロゴ占有率: 高め ({ratio}%)',
        qualityEccGood: '誤り訂正: 高 ({level})',
        qualityEccWarn: '誤り訂正: 低 ({level})',
        presetTitle: 'ブランドプリセット (Pro)',
        presetHelp: '名前を付けて保存すると、必要なときに読み込み・削除できます。',
        presetName: 'プリセット名 (Pro)',
        presetPlaceholder: 'my-brand',
        presetSave: '保存 (Pro)',
        presetLoad: '読込 (Pro)',
        presetDelete: '削除 (Pro)',
        presetManage: '保存済みプリセットを管理 (Pro)',
        presetSavedList: '保存済みプリセット (Pro)',
        presetSelectAria: 'プリセット選択',
        presetEmpty: '保存済みプリセットはありません',
        presetNeedName: 'プリセット名を入力してください。',
        presetSaved: 'プリセット「{name}」を保存しました。',
        presetLoaded: 'プリセット「{name}」を読み込みました。',
        presetDeleted: 'プリセット「{name}」を削除しました。',
        presetNotFound: '対象プリセットが見つかりません。',
        bulkZip: 'ZIP保存 (Pro)',
        zipReady: 'ZIPを作成しました。',
        zipFailed: 'ZIPの作成に失敗しました。',
        pdfFailed: 'PDFの作成に失敗しました。',
        formatLocked: 'FreeプランではPNG/JPEG/WebPのみ利用できます。'
      }
    },
    en: {
      lang: {
        ja: 'Japanese',
        en: 'English'
      },
      header: {
        tagline: 'No-signup QR generator with free core features and unlimited basic usage',
        settingsButton: '⚙ Advanced',
        badgeTitle: 'QR payload is processed only on your device'
      },
      main: {
        inputLabel: 'Content to encode <small>(URL / Text)</small>',
        errorTooLong: '⚠️ Too many characters (Max 1000)',
        sizeLabel: 'Size',
        decreaseAria: 'Decrease size',
        increaseAria: 'Increase size',
        colorLabel: 'Colors',
        swapButton: '⇄ Swap',
        swapAria: 'Swap colors',
        codeColor: 'Code',
        bgColor: 'Background',
        codeColorTitle: 'QR code color',
        bgColorTitle: 'Background color',
        contrastWarning: 'Low contrast may reduce scan accuracy.',
        placeholder: 'Enter text or URL<br>to preview instantly',
        downloadDefault: 'Save as PNG',
        templatePlaceholder: 'Auto-generated from the selected template'
      },
      sidebar: {
        aria: 'Advanced settings sidebar',
        title: 'Advanced Settings',
        closeAria: 'Close advanced settings',
        generateOptions: 'Generation Options',
        quickStartTitle: 'Quick Start Templates',
        quickStartAria: 'Quick purpose card selector',
        quickPlain: 'URL / Text',
        quickPlainHint: 'Manual input',
        quickWifi: 'Wi-Fi',
        quickWifiHint: 'Guest sharing',
        quickMail: 'Email',
        quickMailHint: 'Contact intake',
        quickSocial: 'Social',
        quickSocialHint: 'Profile shortcut',
        quickVcard: 'Contact',
        quickVcardHint: 'Digital business card',
        quickLine: 'LINE',
        quickLineHint: 'Add friend flow',
        dataTemplate: 'QR Type',
        dataTemplateAria: 'Select QR type',
        typePlain: 'URL / Text (manual input)',
        typeWifi: 'Wi-Fi Access',
        typeMailto: 'Email Link',
        typeTel: 'Phone Number',
        typeSms: 'SMS',
        typeLine: 'LINE Add',
        typeSocial: 'Social Profile',
        typeVcard: 'Contact (vCard)',
        templateHintPlain: 'Enter URL/text directly. Choose a type to show only the fields you need.',
        templateHintWifi: 'SSID is required. For shared Wi-Fi QR, set encryption and password.',
        templateHintMailto: 'Recipient email is required. Subject and body are optional.',
        templateHintTel: 'Enter a phone number to generate a tap-to-call QR.',
        templateHintSms: 'Phone number is required. Message body is optional.',
        templateHintLine: 'Enter LINE ID or invite URL to create an add-contact QR.',
        templateHintSocial: 'Enter a social ID/URL to generate a QR that opens the profile directly.',
        templateHintVcard: 'Business card QR. Fill at least one field to generate a vCard payload.',
        validationWifiSsid: 'Wi-Fi SSID is required.',
        validationWifiPassword: 'Wi-Fi password is required unless encryption is set to "None".',
        validationMailRequired: 'Recipient email is required.',
        validationMailInvalid: 'Recipient email format is invalid.',
        validationTelRequired: 'Phone number is required.',
        validationSmsRequired: 'SMS destination phone number is required.',
        validationLineRequired: 'LINE ID or URL suffix is required.',
        validationSocialRequired: 'Social ID / URL / handle is required.',
        validationVcardRequired: 'At least one contact field is required for vCard.',
        required: 'Required',
        recommended: 'Recommended',
        optionalFields: 'Optional fields',
        vcardMinimumNote: 'Enter at least one field to generate a contact QR.',
        wifiSsid: 'SSID',
        wifiAuth: 'Encryption',
        wifiAuthWpa: 'WPA/WPA2',
        wifiAuthWep: 'WEP',
        wifiAuthNone: 'None',
        wifiPassword: 'Password',
        wifiHidden: 'Hidden SSID',
        mailTo: 'To',
        mailSubject: 'Subject',
        mailBody: 'Body',
        telNumber: 'Phone Number',
        smsNumber: 'Phone Number',
        smsBody: 'Message',
        lineId: 'LINE ID or URL suffix',
        socialPlatform: 'Social Platform',
        socialHandle: 'ID / URL / Handle',
        vName: 'Display Name',
        vOrg: 'Company',
        vPhone: 'Phone Number',
        vMail: 'Email',
        vUrl: 'Website',
        eccLevel: 'Error Correction Level',
        eccAuto: 'Auto (Recommended)',
        eccH: 'H (High)',
        eccQ: 'Q (Mid-High)',
        eccM: 'M (Medium)',
        eccL: 'L (Low)',
        eccHelp: 'This controls scan error tolerance. If unsure, keep "Auto (Recommended)".',
        paddingLabel: 'Scan Margin',
        transparentBg: 'Transparent Background',
        transparencyWarning: 'Transparent backgrounds may reduce scan reliability on some surfaces.',
        exportFormat: 'Export Format',
        formatPng: 'PNG',
        formatJpeg: 'JPEG',
        formatWebp: 'WebP',
        formatSvg: 'SVG (Pro)',
        formatPdf: 'PDF (Pro)',
        filePrefix: 'Filename Prefix',
        socialHub: 'Social QR Quick Hub',
        socialHubHelp: 'Create social profile QR codes quickly without switching template type.',
        platform: 'Platform',
        idOrUrl: 'ID / URL',
        applySocialQuick: 'Generate QR with this value',
        bulkTitle: 'Bulk CSV Generator',
        bulkHelp: 'Enter one row per item in `value,name` format to create multiple QR codes.',
        bulkFile: 'Load CSV file (Optional)',
        bulkText: 'Paste CSV text',
        bulkPlaceholder: 'value,name\nhttps://example.com,example',
        bulkParse: 'Parse CSV',
        bulkDownload: 'Download All',
        bulkUnparsed: 'Not parsed yet',
        scanTitle: 'Scan Check Mode',
        scanHelp: 'Use your device camera to check the generated QR right away.',
        policyTitle: 'Security Policy',
        policy1: 'QR input data is not sent externally for advertising purposes.',
        policy2: 'Input content is not collected for analytics.',
        policy3: 'QR payload input is processed locally in your browser and is not sent externally.',
        resetAll: '⟳ Reset All Settings',
        resetDone: '✓ Settings reset'
      },
      platform: {
        x: 'X (Twitter)',
        instagram: 'Instagram',
        youtube: 'YouTube',
        tiktok: 'TikTok',
        note: 'note',
        website: 'Website'
      },
      download: {
        saveAs: 'Save as {format}'
      },
      file: {
        preview: 'File: {name}'
      },
      loading: {
        generating: 'Generating...'
      },
      error: {
        initFailed: '⚠️ Initialization failed. Please reload this page.'
      },
      bulk: {
        more: '... and {count} more',
        needInput: 'Please enter CSV text.',
        noValidRows: 'No valid rows were found.',
        loaded: 'Loaded {count} rows for QR generation.',
        fileReadFailed: 'Failed to read the CSV file.',
        starting: 'Starting bulk export...',
        engineFailed: 'Failed to initialize the QR engine.',
        savingProgress: 'Saving {current} / {total} ...',
        saved: 'Saved {count} files.'
      },
      scanner: {
        start: 'Start Scan',
        stop: 'Stop Scan',
        idle: 'Idle',
        read: 'Read: {value}',
        match: 'Match: {value}',
        matchedStatus: 'Matches the current QR content.',
        unmatchedStatus: 'Does not match the current QR content.',
        unsupportedBarcode: 'This browser does not support scan check mode.',
        unsupportedCamera: 'Camera API is not available in this browser.',
        starting: 'Camera starting... point it at a QR code.',
        startFailed: 'Failed to start the camera.'
      },
      mobile: {
        template: 'Template',
        settings: 'Settings',
        save: 'Save'
      },
      pro: {
        planTitle: 'Pro Plan',
        planHelpManual: 'Switch between Free and Pro to unlock premium features.',
        planHelpLicenseOnly: 'Pro features are enabled only after license verification succeeds.',
        free: 'Free',
        pro: 'Pro',
        licenseLabel: 'License key (Pro)',
        licensePlaceholder: 'PRO-XXXX-XXXX',
        applyLicense: 'Apply License (Pro)',
        licenseNotice: 'Only during license verification, the license key and current origin are sent to the verification API.',
        exportProNotice: 'SVG and PDF are Pro formats. Both embed a PNG image; enlarging them does not add detail.',
        statusFree: 'Current: Free plan',
        statusPro: 'Current: Pro plan',
        statusActivated: 'Pro plan has been activated.',
        statusInvalid: 'License format is invalid.',
        statusNeedPro: 'This feature is available on Pro only.',
        statusVerifying: 'Verifying license...',
        statusVerifyFailed: 'License verification failed. Please check your connection.',
        statusUnavailable: 'Pro activation is unavailable because the license verification server is not configured.',
        statusRevoked: 'License is invalid or expired.',
        logoTitle: 'Logo Insert (Pro)',
        logoHelp: 'Insert a center logo and review contrast, margins, and logo coverage. Test scanning on real devices too.',
        logoFileLabel: 'Logo image (Pro)',
        logoClear: 'Remove Logo (Pro)',
        logoSize: 'Logo Size (Pro)',
        logoBackdrop: 'Draw white backdrop behind logo (Pro)',
        logoWarning: 'Logo is too large and may reduce scan reliability.',
        logoLoaded: 'Logo image has been loaded.',
        logoRemoved: 'Logo has been removed.',
        logoTooLargeFile: 'Please use an image under 2MB.',
        logoReadFailed: 'Failed to read the logo image.',
        qualityTitle: 'Settings Review',
        qualityGrade: 'Grade',
        qualitySummaryDefault: 'Review contrast, margins, and logo coverage. This score does not guarantee a successful scan.',
        qualityItemContrast: 'Contrast: Good',
        qualityItemPadding: 'Quiet Zone: Good',
        qualityItemLogo: 'Logo Coverage: Good',
        qualityItemEcc: 'Error Correction: Good',
        qualityHigh: 'The settings meet the guide values. Test the saved code at its intended display or print size.',
        qualityMedium: 'Some settings could be improved. Review the items below and test at the intended size.',
        qualityLow: 'Review colors, margins, and logo size, then test scanning on a real device.',
        qualityContrastUnknown: 'Contrast: Not scored when transparent background is enabled',
        qualityContrastGood: 'Contrast: Good ({ratio})',
        qualityContrastWarn: 'Contrast: Low ({ratio})',
        qualityPaddingGood: 'Quiet Zone: Good ({modules} modules / {padding}px)',
        qualityPaddingWarn: 'Quiet Zone: Narrow ({modules} modules / {padding}px)',
        qualityLogoGood: 'Logo Coverage: Good ({ratio}%)',
        qualityLogoWarn: 'Logo Coverage: High ({ratio}%)',
        qualityEccGood: 'Error Correction: High ({level})',
        qualityEccWarn: 'Error Correction: Low ({level})',
        presetTitle: 'Brand Presets (Pro)',
        presetHelp: 'Save with a preset name, then load or delete it whenever needed.',
        presetName: 'Preset name (Pro)',
        presetPlaceholder: 'my-brand',
        presetSave: 'Save (Pro)',
        presetLoad: 'Load (Pro)',
        presetDelete: 'Delete (Pro)',
        presetManage: 'Manage saved presets (Pro)',
        presetSavedList: 'Saved presets (Pro)',
        presetSelectAria: 'Preset selection',
        presetEmpty: 'No saved presets',
        presetNeedName: 'Please enter a preset name.',
        presetSaved: 'Preset "{name}" has been saved.',
        presetLoaded: 'Preset "{name}" has been loaded.',
        presetDeleted: 'Preset "{name}" has been deleted.',
        presetNotFound: 'Selected preset was not found.',
        bulkZip: 'Save as ZIP (Pro)',
        zipReady: 'ZIP has been generated.',
        zipFailed: 'Failed to generate ZIP.',
        pdfFailed: 'Failed to generate PDF.',
        formatLocked: 'Free plan supports PNG/JPEG/WebP only.'
      }
    }
  };
  const resolveMessage = (dict, key) => key
    .split('.')
    .reduce((value, segment) => (value && typeof value === 'object' ? value[segment] : undefined), dict);
  const interpolate = (template, params = {}) => String(template).replace(/\{(\w+)\}/g, (match, token) => {
    if (Object.prototype.hasOwnProperty.call(params, token)) {
      return String(params[token]);
    }
    return match;
  });
  const detectInitialLang = () => {
    // 専用英語URLでは保存済み設定より文書言語を優先し、初期描画を英語に固定する
    const pageLang = (document.documentElement.lang || '').toLowerCase().split('-')[0];
    if (pageLang === 'en') return 'en';
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY);
      if (SUPPORTED_LANGS.includes(stored)) return stored;
    } catch {
      // localStorageが使えない環境では既定値を使用
    }
    return DEFAULT_LANG;
  };
  const getRuntimeConfig = () => {
    const raw = window.__QR_PRO_CONFIG__;
    if (!raw || typeof raw !== 'object') {
      return {
        licenseApiUrl: '',
        verifyTimeoutMs: 7000,
        strictVerification: true,
        allowManualPlanSwitch: false,
        allowLocalLicenseFallback: false
      };
    }
    const requestedTimeout = parseInt(raw.verifyTimeoutMs, 10) || 7000;
    const verifyTimeoutMs = Math.min(Math.max(requestedTimeout, 1000), 15000);
    return {
      licenseApiUrl: typeof raw.licenseApiUrl === 'string' ? raw.licenseApiUrl.trim() : '',
      verifyTimeoutMs,
      strictVerification: raw.strictVerification !== false,
      allowManualPlanSwitch: Boolean(raw.allowManualPlanSwitch),
      allowLocalLicenseFallback: Boolean(raw.allowLocalLicenseFallback)
    };
  };
  const detectInitialPlan = (runtimeConfig, licenseKey) => {
    try {
      const stored = localStorage.getItem(PLAN_STORAGE_KEY);
      if (stored === 'pro') {
        if (runtimeConfig.allowManualPlanSwitch) return 'pro';
        // APIを使う構成では、保存済みPro状態を再検証前に復元しない。
        // ローカルfallbackを明示的に許可した構成だけ、保存キーの形式確認で復元する。
        if (
          !runtimeConfig.licenseApiUrl
          && runtimeConfig.allowLocalLicenseFallback
          && VALID_LICENSE_PATTERN.test(licenseKey)
        ) {
          return 'pro';
        }
        // strictVerification=false は移行期間の猶予設定。
        // API構成済みでも保存済みキーの再検証が終わるまで直前のPro状態を維持する。
        if (
          runtimeConfig.strictVerification === false
          && Boolean(runtimeConfig.licenseApiUrl)
          && VALID_LICENSE_PATTERN.test(licenseKey)
        ) {
          return 'pro';
        }
        return 'free';
      }
      if (stored === 'free') return 'free';
    } catch {
      // localStorageが使えない環境では既定値を使用
    }
    return DEFAULT_PLAN;
  };
  const detectLicenseKey = () => {
    try {
      return localStorage.getItem(LICENSE_STORAGE_KEY) || '';
    } catch {
      // localStorageが使えない環境では空文字を返す
      return '';
    }
  };
  const loadStoredPresets = () => {
    try {
      const raw = localStorage.getItem(PRESET_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      return parsed;
    } catch {
      return {};
    }
  };

  const runtimeConfig = getRuntimeConfig();
  const storedLicenseKey = detectLicenseKey();
  const state = {
    qr: null,
    criticalError: false,
    debounceTimer: null,
    plainDraft: '',
    currentDataType: 'plain',
    currentLang: detectInitialLang(),
    currentPlan: detectInitialPlan(runtimeConfig, storedLicenseKey),
    licenseKey: storedLicenseKey,
    runtimeConfig,
    bulkRows: [],
    logoImage: null,
    logoDataUrl: '',
    logoLoadId: 0,
    presets: loadStoredPresets(),
    scanning: false,
    scanDetector: null,
    scannerStream: null,
    scannerTimer: null,
    lastContrastRatio: null,
    lastQrMatrixWidth: null
  };
  const optionalLibPromiseMap = new Map();

  const t = (key, params = {}) => {
    const langPack = I18N[state.currentLang] || I18N[DEFAULT_LANG];
    const defaultPack = I18N[DEFAULT_LANG];
    const value = resolveMessage(langPack, key) ?? resolveMessage(defaultPack, key) ?? key;
    return interpolate(value, params);
  };
  const isUnresolvedI18n = (key, value) => value === key;
  const isProPlan = () => state.currentPlan === 'pro';
  const isManualPlanSwitchEnabled = () => Boolean(state.runtimeConfig.allowManualPlanSwitch);
  const canUseLocalLicenseFallback = () => Boolean(state.runtimeConfig.allowLocalLicenseFallback);
  const formatRatio = (value) => Number(value).toFixed(2);
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const savePlanState = () => {
    try {
      localStorage.setItem(PLAN_STORAGE_KEY, state.currentPlan);
      if (state.licenseKey) {
        localStorage.setItem(LICENSE_STORAGE_KEY, state.licenseKey);
      } else {
        localStorage.removeItem(LICENSE_STORAGE_KEY);
      }
    } catch {
      // localStorageが使えない環境では保存をスキップ
    }
  };
  const savePresets = () => {
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(state.presets));
    } catch {
      // localStorageが使えない環境では保存をスキップ
    }
  };

  const applyI18nText = () => {
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.dataset.i18n;
      const localized = t(key);
      if (isUnresolvedI18n(key, localized)) {
        return;
      }
      element.textContent = localized;
    });
    document.querySelectorAll('[data-i18n-html]').forEach((element) => {
      const key = element.dataset.i18nHtml;
      const localized = t(key);
      if (isUnresolvedI18n(key, localized)) {
        return;
      }
      element.innerHTML = localized;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
      const key = element.dataset.i18nPlaceholder;
      const localized = t(key);
      if (isUnresolvedI18n(key, localized)) {
        return;
      }
      element.setAttribute('placeholder', localized);
    });
    document.querySelectorAll('[data-i18n-title]').forEach((element) => {
      const key = element.dataset.i18nTitle;
      const localized = t(key);
      if (isUnresolvedI18n(key, localized)) {
        return;
      }
      element.setAttribute('title', localized);
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
      const key = element.dataset.i18nAriaLabel;
      const localized = t(key);
      if (isUnresolvedI18n(key, localized)) {
        return;
      }
      element.setAttribute('aria-label', localized);
    });
    document.querySelectorAll('[data-i18n-option]').forEach((element) => {
      const key = element.dataset.i18nOption;
      const localized = t(key);
      if (isUnresolvedI18n(key, localized)) {
        return;
      }
      element.textContent = localized;
    });
    document.querySelectorAll('[data-lang-block]').forEach((element) => {
      element.hidden = element.dataset.langBlock !== state.currentLang;
    });
  };

  const syncLangTabs = () => {
    const langButtons = [els.langJaBtn, els.langEnBtn];
    langButtons.forEach((button) => {
      const selected = button.dataset.lang === state.currentLang;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
  };

  const setLanguage = (lang, options = {}) => {
    const { persist = true } = options;
    if (!SUPPORTED_LANGS.includes(lang)) return;

    state.currentLang = lang;
    document.documentElement.lang = lang;
    applyI18nText();
    syncLangTabs();
    updateDownloadLabel();
    updateScannerUi();

    if (!state.scanning) {
      els.scannerStatus.textContent = t('scanner.idle');
    }

    if (state.currentDataType === 'plain') {
      els.text.placeholder = 'https://katakatalab.com';
    } else {
      els.text.placeholder = t('main.templatePlaceholder');
    }
    updateTemplateHint(state.currentDataType);

    if (state.bulkRows.length === 0 && !els.bulkStatus.textContent.trim()) {
      els.bulkSummary.textContent = t('sidebar.bulkUnparsed');
    }

    syncPlanInputs();
    syncProFeatureLock();
    setPlanStatus();
    syncPresetSelect();
    updateCharCount();
    updateFileNamePreview();
    updateQualityReport();

    if (persist) {
      try {
        localStorage.setItem(LANG_STORAGE_KEY, lang);
      } catch {
        // localStorageが使えない環境では保存をスキップ
      }
    }
  };

  const setControlsDisabled = (disabled) => {
    [
      els.text,
      els.size,
      els.btnDec,
      els.btnInc,
      els.fgColor,
      els.bgColor,
      els.swapBtn,
      els.dataType,
      els.eccLevel,
      els.qrPadding,
      els.transparentBg,
      els.exportFormat,
      els.filePrefix,
      els.socialQuickPlatform,
      els.socialQuickValue,
      els.applySocialQuickBtn,
      els.bulkCsvFile,
      els.bulkCsvText,
      els.bulkPreviewBtn,
      els.bulkDownloadBtn,
      els.bulkZipBtn,
      els.scannerToggleBtn,
      els.planFree,
      els.planPro,
      els.licenseKeyInput,
      els.applyLicenseBtn,
      els.logoFile,
      els.clearLogoBtn,
      els.logoSizePercent,
      els.logoBackdrop,
      els.presetName,
      els.savePresetBtn,
      els.loadPresetBtn,
      els.deletePresetBtn,
      els.presetSelect,
      els.openSidebarBtn,
      els.closeSidebarBtn,
      els.mobileTemplateBtn,
      els.mobileSettingsBtn,
      els.mobileDownloadBtn
    ].forEach((element) => {
      element.disabled = disabled;
    });
    els.downloadBtn.disabled = true;
  };

  const showCriticalError = (error) => {
    console.error('QR Code Lab initialization failed:', error);
    state.criticalError = true;
    setControlsDisabled(true);
    els.loading.style.display = 'none';
    els.errorMsg.textContent = t('error.initFailed');
    els.errorMsg.style.display = 'block';
    els.canvas.style.display = 'none';
    els.placeholder.style.display = 'block';
    els.fileNamePreview.textContent = '';
  };

  const attachQrMetricsHook = () => {
    const renderer = state.qr && state.qr._canvasRenderer;
    if (!renderer || typeof renderer.render !== 'function') {
      return;
    }

    const originalRender = renderer.render.bind(renderer);
    renderer.render = (frame) => {
      if (frame && Number.isFinite(frame.width)) {
        state.lastQrMatrixWidth = frame.width;
      } else {
        state.lastQrMatrixWidth = null;
      }
      return originalRender(frame);
    };
  };

  const initQrEngine = () => {
    try {
      if (typeof window.QRious !== 'function') {
        throw new Error('QRious library is not loaded');
      }
      state.qr = new window.QRious({
        element: els.canvas,
        size: 250,
        level: 'H',
        padding: 4
      });
      attachQrMetricsHook();
      return true;
    } catch (error) {
      showCriticalError(error);
      return false;
    }
  };

  const sanitizePrefix = (prefix) => {
    const normalized = String(prefix || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
    return normalized || 'qr';
  };

  const sanitizePhone = (phone) => String(phone || '').replace(/[^0-9+*#()\- ]/g, '').trim();
  const isLikelyEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));

  const sanitizeTemplateValue = (value) => String(value || '').replace(/\r/g, '').trim();
  const sanitizeFileNamePart = (value) => String(value || '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);

  const escapeWifiValue = (value) => sanitizeTemplateValue(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/:/g, '\\:');

  const escapeVCardValue = (value) => sanitizeTemplateValue(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');

  const buildSocialUrl = (platform, rawValue) => {
    const input = sanitizeTemplateValue(rawValue);
    if (!input) return '';

    if (/^https?:\/\//i.test(input)) {
      return input;
    }

    if (platform === 'website') {
      return input.startsWith('http') ? input : `https://${input}`;
    }

    const normalized = input.replace(/^@/, '');
    const base = SOCIAL_BASE_URL[platform] || '';
    return `${base}${encodeURIComponent(normalized)}`;
  };

  const updateCharCount = () => {
    const len = els.text.value.length;
    els.charCount.textContent = `${len} / ${MAX_CHARS}`;
    if (len > MAX_CHARS) {
      els.charCount.classList.add('limit-over');
      els.errorMsg.textContent = t('main.errorTooLong');
      els.errorMsg.style.display = 'block';
      return;
    }

    els.charCount.classList.remove('limit-over');
    if (!state.criticalError) {
      els.errorMsg.textContent = t('main.errorTooLong');
      els.errorMsg.style.display = 'none';
    }
  };

  const isValidContent = () => {
    const text = els.text.value.trim();
    return Boolean(text) && text.length <= MAX_CHARS;
  };

  const getEffectiveEccLevel = () => {
    if (els.eccLevel.value !== 'auto') {
      return els.eccLevel.value;
    }
    return els.text.value.length > 500 ? 'L' : 'H';
  };

  const getEffectiveMimeType = () => MIME_BY_FORMAT[els.exportFormat.value] || 'image/png';
  const getEffectiveExtension = () => EXT_BY_FORMAT[els.exportFormat.value] || 'png';
  const isProOnlyFormat = (format) => PRO_ONLY_EXPORT_FORMATS.has(format);

  const setLoading = (isLoading) => {
    if (state.criticalError) return;

    if (isLoading && isValidContent()) {
      els.loading.style.display = 'flex';
      els.downloadBtn.disabled = true;
      els.fileNamePreview.textContent = t('loading.generating');
      return;
    }

    els.loading.style.display = 'none';
    if (isValidContent()) {
      els.downloadBtn.disabled = false;
      updateFileNamePreview();
      return;
    }

    els.downloadBtn.disabled = true;
    els.fileNamePreview.textContent = '';
  };

  const updateSizeDisplay = () => {
    els.sizeVal.textContent = els.size.value;
  };

  const updatePaddingDisplay = () => {
    els.paddingValue.textContent = els.qrPadding.value;
  };

  const updateDownloadLabel = () => {
    const formatLabel = getEffectiveExtension().toUpperCase();
    els.downloadBtnText.textContent = t('download.saveAs', { format: formatLabel });
  };

  const updateBackgroundMode = () => {
    const isTransparent = els.transparentBg.checked;
    els.bgColor.disabled = isTransparent;
    els.transparencyWarning.style.display = isTransparent ? 'flex' : 'none';
  };

  const hexToRgb = (hex) => {
    const normalized = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : null;
    if (!normalized) return null;

    const bigint = parseInt(normalized.slice(1), 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255
    };
  };

  const luminance = (rgb) => {
    const channel = [rgb.r, rgb.g, rgb.b].map((value) => {
      const normalized = value / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });

    return channel[0] * 0.2126 + channel[1] * 0.7152 + channel[2] * 0.0722;
  };

  const contrastRatio = (rgb1, rgb2) => {
    const lum1 = luminance(rgb1);
    const lum2 = luminance(rgb2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  };

  const checkContrast = () => {
    if (els.transparentBg.checked) {
      els.warning.style.display = 'none';
      state.lastContrastRatio = null;
      return;
    }

    const fg = hexToRgb(els.fgColor.value);
    const bg = hexToRgb(els.bgColor.value);
    if (!fg || !bg) {
      els.warning.style.display = 'none';
      state.lastContrastRatio = null;
      return;
    }

    const ratio = contrastRatio(fg, bg);
    state.lastContrastRatio = ratio;
    els.warning.style.display = ratio < 3.0 ? 'flex' : 'none';
  };

  const hasLogo = () => Boolean(state.logoImage);
  const getLogoPercent = () => clamp(parseInt(els.logoSizePercent.value, 10) || 14, 8, 28);
  const getLogoCoverageRatio = () => {
    if (!hasLogo()) return 0;
    const percent = getLogoPercent() / 100;
    return percent * percent;
  };
  const getQuietZoneMetrics = () => {
    const paddingPx = parseInt(els.qrPadding.value, 10) || 0;
    const matrixWidth = Number.isFinite(state.lastQrMatrixWidth) ? state.lastQrMatrixWidth : 0;
    if (matrixWidth <= 0) {
      return {
        measured: false,
        paddingPx,
        moduleSizePx: 0,
        quietZoneModules: 0
      };
    }

    const qrSize = parseInt(els.size.value, 10) || 250;
    const moduleSizePx = Math.max(1, Math.floor((qrSize - (paddingPx * 2)) / matrixWidth));
    const quietZoneModules = moduleSizePx > 0 ? paddingPx / moduleSizePx : 0;
    return {
      measured: true,
      paddingPx,
      moduleSizePx,
      quietZoneModules
    };
  };

  const drawRoundedRect = (ctx, x, y, width, height, radius) => {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const applyLogoOverlay = (targetCanvas = null) => {
    const canvas = targetCanvas || (state.qr ? state.qr.canvas : null);
    if (!hasLogo() || !canvas) {
      els.logoWarning.style.display = 'none';
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sizePx = canvas.width * (getLogoPercent() / 100);
    const x = (canvas.width - sizePx) / 2;
    const y = (canvas.height - sizePx) / 2;

    if (els.logoBackdrop.checked) {
      const pad = Math.max(4, sizePx * 0.14);
      const bgX = x - pad;
      const bgY = y - pad;
      const bgW = sizePx + pad * 2;
      const bgH = sizePx + pad * 2;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      drawRoundedRect(ctx, bgX, bgY, bgW, bgH, pad * 0.45);
      ctx.fill();
      ctx.restore();
    }

    ctx.drawImage(state.logoImage, x, y, sizePx, sizePx);
    const ratio = getLogoCoverageRatio();
    els.logoWarning.style.display = ratio > MAX_LOGO_COVERAGE ? 'flex' : 'none';
  };

  const updateLogoSizeDisplay = () => {
    els.logoSizeValue.textContent = String(getLogoPercent());
  };

  const findExistingScriptBySrc = (src) => Array.from(document.scripts).find((script) => script.getAttribute('src') === src) || null;

  const loadOptionalScript = (src, validator) => {
    if (validator()) {
      return Promise.resolve(true);
    }

    if (optionalLibPromiseMap.has(src)) {
      return optionalLibPromiseMap.get(src);
    }

    const promise = new Promise((resolve) => {
      const done = (isReady) => {
        resolve(Boolean(isReady));
      };

      const onLoad = () => done(validator());
      const onError = () => done(false);

      let script = findExistingScriptBySrc(src);
      if (!script) {
        script = document.createElement('script');
        script.src = src;
        script.defer = true;
        script.dataset.optionalLib = 'true';
        document.head.appendChild(script);
      }

      if (validator()) {
        done(true);
        return;
      }

      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });
      setTimeout(() => done(validator()), OPTIONAL_LIB_TIMEOUT_MS);
    }).then((isReady) => {
      if (!isReady) {
        optionalLibPromiseMap.delete(src);
      }
      return isReady;
    });

    optionalLibPromiseMap.set(src, promise);
    return promise;
  };

  const ensureJsPdfLoaded = async () => loadOptionalScript(
    OPTIONAL_LIB_SRC.jspdf,
    () => Boolean(window.jspdf && window.jspdf.jsPDF)
  );

  const ensureJsZipLoaded = async () => loadOptionalScript(
    OPTIONAL_LIB_SRC.jszip,
    () => typeof window.JSZip === 'function'
  );

  const setPlanStatus = (message) => {
    if (message) {
      els.planStatus.textContent = message;
      return;
    }
    els.planStatus.textContent = isProPlan() ? t('pro.statusPro') : t('pro.statusFree');
  };

  const setPresetStatus = (message) => {
    els.presetStatus.textContent = message || '';
  };

  const syncPlanHelpText = () => {
    const messageKey = isManualPlanSwitchEnabled() ? 'pro.planHelpManual' : 'pro.planHelpLicenseOnly';
    els.planHelp.dataset.i18n = messageKey;
    els.planHelp.textContent = t(messageKey);
  };

  const syncPlanInputs = () => {
    els.planFree.checked = !isProPlan();
    els.planPro.checked = isProPlan();
    const manualEnabled = isManualPlanSwitchEnabled();
    els.planToggle.hidden = !manualEnabled;
    els.planToggle.setAttribute('aria-hidden', manualEnabled ? 'false' : 'true');
    els.planFree.disabled = !manualEnabled;
    els.planPro.disabled = !manualEnabled;
    els.licenseKeyInput.value = state.licenseKey;
    syncPlanHelpText();
  };

  const syncPresetSelect = () => {
    const names = Object.keys(state.presets).sort((a, b) => a.localeCompare(b));
    els.presetSelect.innerHTML = '';
    if (names.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = t('pro.presetEmpty');
      els.presetSelect.appendChild(option);
      return;
    }

    names.forEach((name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      els.presetSelect.appendChild(option);
    });
  };

  const syncProFeatureLock = () => {
    const proEnabled = isProPlan();
    const proOnlyElements = [
      els.logoFile,
      els.clearLogoBtn,
      els.logoSizePercent,
      els.logoBackdrop,
      els.presetName,
      els.savePresetBtn,
      els.loadPresetBtn,
      els.deletePresetBtn,
      els.presetSelect,
      els.bulkZipBtn
    ];
    proOnlyElements.forEach((element) => {
      if (proEnabled) {
        element.disabled = false;
        element.classList.remove('feature-locked');
      } else {
        element.disabled = true;
        element.classList.add('feature-locked');
      }
    });

    Array.from(els.exportFormat.options).forEach((option) => {
      if (isProOnlyFormat(option.value)) {
        option.disabled = !proEnabled;
      }
    });

    els.bulkZipBtn.disabled = !proEnabled || state.bulkRows.length === 0;

    const selectedFormat = els.exportFormat.value;
    if (!proEnabled && isProOnlyFormat(selectedFormat)) {
      els.exportFormat.value = 'png';
      setPlanStatus(t('pro.formatLocked'));
      updateDownloadLabel();
      updateFileNamePreview();
    }
  };

  const setPlan = (plan, options = {}) => {
    const { statusMessage = '' } = options;
    state.currentPlan = plan === 'pro' ? 'pro' : 'free';
    if (!isProPlan()) state.logoLoadId = (state.logoLoadId || 0) + 1;
    if (!isProPlan() && hasLogo()) {
      state.logoImage = null;
      state.logoDataUrl = '';
      els.logoPreview.src = '';
      els.logoPreview.hidden = true;
      els.logoWarning.style.display = 'none';
    }
    syncPlanInputs();
    syncProFeatureLock();
    setPlanStatus(statusMessage);
    savePlanState();
    guardFormatByPlan();
    updateDownloadLabel();
    updateFileNamePreview();
    updateQR();
  };

  const getLicenseApiUrl = () => {
    const rawUrl = state.runtimeConfig.licenseApiUrl;
    if (!rawUrl) return '';
    try {
      return new URL(rawUrl, window.location.origin).toString();
    } catch {
      return '';
    }
  };

  const verifyLicenseWithApi = async (licenseKey) => {
    const endpoint = getLicenseApiUrl();
    if (!endpoint) {
      if (!canUseLocalLicenseFallback()) {
        return { valid: false, reason: 'unconfigured', source: 'none' };
      }
      return {
        valid: VALID_LICENSE_PATTERN.test(licenseKey),
        source: 'local'
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), state.runtimeConfig.verifyTimeoutMs);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          licenseKey,
          product: 'qrcode',
          origin: window.location.origin
        }),
        signal: controller.signal,
        credentials: 'omit'
      });

      if (!response.ok) {
        return { valid: false, error: 'http' };
      }

      const payload = await response.json();
      return {
        valid: Boolean(payload) && payload.valid === true,
        reason: payload && typeof payload.reason === 'string' ? payload.reason : '',
        source: 'api'
      };
    } catch {
      return { valid: false, error: 'network' };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const applyLicense = async () => {
    const raw = sanitizeTemplateValue(els.licenseKeyInput.value).toUpperCase();
    els.licenseKeyInput.value = raw;
    if (!VALID_LICENSE_PATTERN.test(raw)) {
      setPlanStatus(t('pro.statusInvalid'));
      return;
    }
    setPlanStatus(t('pro.statusVerifying'));
    els.applyLicenseBtn.disabled = true;
    const verification = await verifyLicenseWithApi(raw);
    els.applyLicenseBtn.disabled = false;

    if (verification.valid) {
      state.licenseKey = raw;
      setPlan('pro', { statusMessage: t('pro.statusActivated') });
      return;
    }

    if (verification.error) {
      // 通信障害では入力済みキーを失効扱いにしない。再試行できるよう保持する。
      state.licenseKey = raw;
      if (state.runtimeConfig.strictVerification) {
        setPlan('free', { statusMessage: t('pro.statusVerifyFailed') });
      } else {
        savePlanState();
        syncPlanInputs();
        setPlanStatus(t('pro.statusVerifyFailed'));
      }
      return;
    }

    if (verification.reason === 'unconfigured') {
      // 設定不足はキーの無効判定ではない。設定復旧後に再試行できるよう保持する。
      state.licenseKey = raw;
      setPlan('free', { statusMessage: t('pro.statusUnavailable') });
      return;
    }

    state.licenseKey = '';
    setPlan('free', { statusMessage: t('pro.statusRevoked') });
  };

  const reconcileStoredLicense = async () => {
    if (!state.licenseKey || !VALID_LICENSE_PATTERN.test(state.licenseKey)) {
      return;
    }
    if (!getLicenseApiUrl() && !canUseLocalLicenseFallback()) {
      // API未設定でも保存済みキーは削除せず、Pro機能だけを無効にする。
      setPlan('free', { statusMessage: t('pro.statusUnavailable') });
      return;
    }
    if (!getLicenseApiUrl()) {
      return;
    }

    const verification = await verifyLicenseWithApi(state.licenseKey);
    if (verification.valid) {
      if (!isProPlan()) {
        setPlan('pro');
      }
      return;
    }

    if (verification.error) {
      // サーバーへ到達できないだけでは保存済みキーを削除しない。
      if (state.runtimeConfig.strictVerification) {
        setPlan('free', { statusMessage: t('pro.statusVerifyFailed') });
      } else {
        savePlanState();
        syncPlanInputs();
        setPlanStatus(t('pro.statusVerifyFailed'));
      }
      return;
    }

    state.licenseKey = '';
    setPlan('free', { statusMessage: t('pro.statusRevoked') });
  };

  const guardFormatByPlan = () => {
    const selected = els.exportFormat.value;
    if (isProPlan()) return true;
    if (selected === 'svg' || selected === 'pdf') {
      els.exportFormat.value = 'png';
      setPlanStatus(t('pro.formatLocked'));
      return false;
    }
    return true;
  };

  const getQualityReport = () => {
    const contrast = state.lastContrastRatio;
    const quietZone = getQuietZoneMetrics();
    const logoCoverage = getLogoCoverageRatio();
    const ecc = getEffectiveEccLevel();
    const isTransparent = Boolean(els.transparentBg.checked);
    const eccWeight = {
      H: 1.0,
      Q: 0.75,
      M: 0.55,
      L: 0.35
    };
    const contrastScore = contrast === null ? 0.62 : clamp(contrast / 7, 0, 1);
    const quietZoneScore = quietZone.measured
      ? clamp(quietZone.quietZoneModules / MIN_RECOMMENDED_QUIET_ZONE_MODULES, 0, 1)
      : clamp(quietZone.paddingPx / 4, 0, 1);
    const logoScore = hasLogo() ? clamp(1 - (logoCoverage / MAX_LOGO_COVERAGE), 0, 1) : 1;
    const eccScore = eccWeight[ecc] || 0.55;
    const total = (contrastScore * 0.34) + (quietZoneScore * 0.2) + (logoScore * 0.26) + (eccScore * 0.2);

    let grade = 'A';
    if (total < 0.56) grade = 'C';
    else if (total < 0.76) grade = 'B';

    return {
      grade,
      contrast,
      isTransparent,
      quietZone,
      logoCoverage,
      ecc
    };
  };

  const updateQualityReport = () => {
    const report = getQualityReport();
    els.qualityGrade.textContent = report.grade;
    els.qualityGrade.classList.remove('quality-a', 'quality-b', 'quality-c');
    els.qualityGrade.classList.add(report.grade === 'A' ? 'quality-a' : report.grade === 'B' ? 'quality-b' : 'quality-c');

    if (report.grade === 'A') {
      els.qualitySummary.textContent = t('pro.qualityHigh');
    } else if (report.grade === 'B') {
      els.qualitySummary.textContent = t('pro.qualityMedium');
    } else {
      els.qualitySummary.textContent = t('pro.qualityLow');
    }

    const contrastText = report.contrast === null
      ? t('pro.qualityContrastUnknown')
      : (report.contrast >= 4.5
        ? t('pro.qualityContrastGood', { ratio: formatRatio(report.contrast) })
        : t('pro.qualityContrastWarn', { ratio: formatRatio(report.contrast) }));
    const quietZoneModules = report.quietZone.measured ? report.quietZone.quietZoneModules : 0;
    const paddingText = quietZoneModules >= MIN_RECOMMENDED_QUIET_ZONE_MODULES
      ? t('pro.qualityPaddingGood', { padding: report.quietZone.paddingPx, modules: formatRatio(quietZoneModules) })
      : t('pro.qualityPaddingWarn', { padding: report.quietZone.paddingPx, modules: formatRatio(quietZoneModules) });
    const logoPercent = Math.round(report.logoCoverage * 100);
    const logoText = report.logoCoverage <= MAX_LOGO_COVERAGE
      ? t('pro.qualityLogoGood', { ratio: logoPercent })
      : t('pro.qualityLogoWarn', { ratio: logoPercent });
    const eccText = (report.ecc === 'H' || report.ecc === 'Q')
      ? t('pro.qualityEccGood', { level: report.ecc })
      : t('pro.qualityEccWarn', { level: report.ecc });

    els.qualityChecklist.innerHTML = '';
    [contrastText, paddingText, logoText, eccText].forEach((text) => {
      const item = document.createElement('li');
      item.textContent = text;
      els.qualityChecklist.appendChild(item);
    });
  };

  const clearLogoState = (statusText = '') => {
    state.logoLoadId = (state.logoLoadId || 0) + 1;
    state.logoImage = null;
    state.logoDataUrl = '';
    els.logoFile.value = '';
    els.logoPreview.src = '';
    els.logoPreview.hidden = true;
    els.logoWarning.style.display = 'none';
    if (statusText) {
      setPlanStatus(statusText);
    }
    updateQR();
  };

  const loadLogoFromFile = async (file) => {
    if (!file) return;
    const loadId = state.logoLoadId = (state.logoLoadId || 0) + 1;
    if (file.size > MAX_LOGO_FILE_BYTES) {
      setPlanStatus(t('pro.logoTooLargeFile'));
      els.logoFile.value = '';
      return;
    }

    const reader = new FileReader();
    await new Promise((resolve, reject) => {
      reader.onload = () => resolve();
      reader.onerror = () => reject(new Error('logo-read-failed'));
      reader.readAsDataURL(file);
    }).catch(() => {
      if (loadId === state.logoLoadId) setPlanStatus(t('pro.logoReadFailed'));
    });

    if (loadId !== state.logoLoadId || !isProPlan()) return;
    if (!reader.result || typeof reader.result !== 'string') {
      return;
    }

    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('logo-image-invalid'));
      image.src = reader.result;
    }).catch(() => {
      if (loadId === state.logoLoadId) setPlanStatus(t('pro.logoReadFailed'));
    });

    if (loadId !== state.logoLoadId || !isProPlan()) return;
    if (!image.complete || !image.naturalWidth || !image.naturalHeight) {
      return;
    }

    state.logoImage = image;
    state.logoDataUrl = reader.result;
    els.logoPreview.src = reader.result;
    els.logoPreview.hidden = false;
    setPlanStatus(t('pro.logoLoaded'));
    updateQR();
  };

  const getTemplateGroups = () => Array.from(els.templateFields.querySelectorAll('.template-group'));
  const getQuickTemplateButtons = () => Array.from(document.querySelectorAll('[data-quick-template]'));

  const normalizeDataType = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return DATA_TYPE_VALUES.includes(normalized) ? normalized : 'plain';
  };

  const syncQuickTemplateButtons = (type) => {
    const currentType = normalizeDataType(type);
    getQuickTemplateButtons().forEach((button) => {
      const buttonType = normalizeDataType(button.dataset.quickTemplate);
      const isActive = buttonType === currentType;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  const focusTemplateField = (type) => {
    const currentType = normalizeDataType(type);
    if (currentType === 'plain') {
      els.text.focus();
      return;
    }
    const targetInput = els.templateFields.querySelector(`.template-group[data-type="${currentType}"] input:not([disabled]), .template-group[data-type="${currentType}"] textarea:not([disabled]), .template-group[data-type="${currentType}"] select:not([disabled])`);
    if (targetInput) {
      targetInput.focus();
    }
  };

  const resolveDataTypeFromLocation = () => {
    try {
      const url = new URL(window.location.href);
      const queryType = normalizeDataType(url.searchParams.get('type'));
      if (queryType !== 'plain') {
        return queryType;
      }
      return normalizeDataType(url.hash.replace(/^#/, ''));
    } catch {
      return 'plain';
    }
  };

  const updateDataTypeInLocation = (type) => {
    if (!window.history || typeof window.history.replaceState !== 'function') {
      return;
    }
    try {
      const normalized = normalizeDataType(type);
      const url = new URL(window.location.href);
      if (normalized === 'plain') {
        url.searchParams.delete('type');
      } else {
        url.searchParams.set('type', normalized);
      }
      const hashType = url.hash.replace(/^#/, '').toLowerCase();
      if (DATA_TYPE_VALUES.includes(hashType)) {
        url.hash = '';
      }
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // URL更新に失敗しても機能に影響しないため継続する
    }
  };

  const syncWifiAuthInputState = () => {
    const isWifiMode = state.currentDataType === 'wifi';
    const requiresPassword = els.wifiAuth.value !== 'nopass';
    const enablePassword = isWifiMode && requiresPassword;
    els.wifiPassword.disabled = !enablePassword;
    els.wifiPassword.setAttribute('aria-disabled', enablePassword ? 'false' : 'true');
    if (!requiresPassword) {
      els.wifiPassword.value = '';
    }
  };

  const updateTemplateHint = (type) => {
    const key = TEMPLATE_HINT_KEY_BY_TYPE[type] || TEMPLATE_HINT_KEY_BY_TYPE.plain;
    els.templateHint.dataset.i18n = key;
    els.templateHint.textContent = t(key);
  };

  const clearTemplateInvalidState = () => {
    Array.from(els.templateFields.querySelectorAll('input, textarea, select')).forEach((field) => {
      field.classList.remove('is-invalid');
      field.setAttribute('aria-invalid', 'false');
    });
  };

  const setTemplateInvalidState = (fieldIds) => {
    clearTemplateInvalidState();
    fieldIds.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      if (!field) return;
      field.classList.add('is-invalid');
      field.setAttribute('aria-invalid', 'true');
    });
  };

  const hideTemplateError = () => {
    els.templateErrorMsg.style.display = 'none';
    els.templateErrorMsg.textContent = '';
  };

  const showTemplateError = (errorKey) => {
    if (!errorKey) {
      hideTemplateError();
      return;
    }
    els.templateErrorMsg.textContent = t(errorKey);
    els.templateErrorMsg.style.display = 'block';
  };

  const hasTemplateValue = (value) => Boolean(sanitizeTemplateValue(value));

  const getTemplateValidation = (type) => {
    switch (type) {
      case 'wifi': {
        if (!hasTemplateValue(els.wifiSsid.value)) {
          return { valid: false, errorKey: 'sidebar.validationWifiSsid', fieldIds: ['wifiSsid'] };
        }
        if (els.wifiAuth.value !== 'nopass' && !hasTemplateValue(els.wifiPassword.value)) {
          return { valid: false, errorKey: 'sidebar.validationWifiPassword', fieldIds: ['wifiPassword'] };
        }
        return { valid: true, errorKey: '', fieldIds: [] };
      }
      case 'mailto': {
        const to = sanitizeTemplateValue(els.mailTo.value);
        if (!to) {
          return { valid: false, errorKey: 'sidebar.validationMailRequired', fieldIds: ['mailTo'] };
        }
        if (!isLikelyEmail(to)) {
          return { valid: false, errorKey: 'sidebar.validationMailInvalid', fieldIds: ['mailTo'] };
        }
        return { valid: true, errorKey: '', fieldIds: [] };
      }
      case 'tel': {
        if (!sanitizePhone(els.telNumber.value)) {
          return { valid: false, errorKey: 'sidebar.validationTelRequired', fieldIds: ['telNumber'] };
        }
        return { valid: true, errorKey: '', fieldIds: [] };
      }
      case 'sms': {
        if (!sanitizePhone(els.smsNumber.value)) {
          return { valid: false, errorKey: 'sidebar.validationSmsRequired', fieldIds: ['smsNumber'] };
        }
        return { valid: true, errorKey: '', fieldIds: [] };
      }
      case 'line': {
        if (!hasTemplateValue(els.lineId.value)) {
          return { valid: false, errorKey: 'sidebar.validationLineRequired', fieldIds: ['lineId'] };
        }
        return { valid: true, errorKey: '', fieldIds: [] };
      }
      case 'social': {
        if (!hasTemplateValue(els.socialHandle.value)) {
          return { valid: false, errorKey: 'sidebar.validationSocialRequired', fieldIds: ['socialHandle'] };
        }
        return { valid: true, errorKey: '', fieldIds: [] };
      }
      case 'vcard': {
        if (
          !hasTemplateValue(els.vName.value)
          && !hasTemplateValue(els.vOrg.value)
          && !sanitizePhone(els.vPhone.value)
          && !hasTemplateValue(els.vMail.value)
          && !hasTemplateValue(els.vUrl.value)
        ) {
          return { valid: false, errorKey: 'sidebar.validationVcardRequired', fieldIds: ['vName'] };
        }
        return { valid: true, errorKey: '', fieldIds: [] };
      }
      default:
        return { valid: true, errorKey: '', fieldIds: [] };
    }
  };

  const validateTemplateInput = (type = state.currentDataType) => {
    const normalizedType = normalizeDataType(type);
    if (normalizedType === 'plain') {
      clearTemplateInvalidState();
      hideTemplateError();
      return { valid: true, errorKey: '', fieldIds: [] };
    }

    const result = getTemplateValidation(normalizedType);
    setTemplateInvalidState(result.fieldIds);
    showTemplateError(result.errorKey);
    return result;
  };

  const toggleTemplateGroups = (type) => {
    const groups = getTemplateGroups();
    groups.forEach((group) => {
      const visible = group.dataset.type === type;
      group.hidden = !visible;
      group.setAttribute('aria-hidden', visible ? 'false' : 'true');
      const controls = Array.from(group.querySelectorAll('input, textarea, select'));
      controls.forEach((control) => {
        control.disabled = !visible;
      });
    });
    els.templateFields.style.display = type === 'plain' ? 'none' : 'block';
    syncWifiAuthInputState();
    updateTemplateHint(type);
  };

  const buildTemplateValue = (type) => {
    switch (type) {
      case 'wifi': {
        const ssid = escapeWifiValue(els.wifiSsid.value);
        if (!ssid) return '';

        const auth = els.wifiAuth.value;
        const parts = [`T:${auth}`, `S:${ssid}`];
        const password = escapeWifiValue(els.wifiPassword.value);
        if (auth !== 'nopass' && password) {
          parts.push(`P:${password}`);
        }
        if (els.wifiHidden.checked) {
          parts.push('H:true');
        }
        return `WIFI:${parts.join(';')};;`;
      }
      case 'mailto': {
        const to = sanitizeTemplateValue(els.mailTo.value);
        if (!to) return '';

        const params = new URLSearchParams();
        const subject = sanitizeTemplateValue(els.mailSubject.value);
        const body = sanitizeTemplateValue(els.mailBody.value);
        if (subject) params.set('subject', subject);
        if (body) params.set('body', body);
        const query = params.toString();
        return query ? `mailto:${to}?${query}` : `mailto:${to}`;
      }
      case 'tel': {
        const number = sanitizePhone(els.telNumber.value);
        return number ? `tel:${number}` : '';
      }
      case 'sms': {
        const number = sanitizePhone(els.smsNumber.value);
        if (!number) return '';
        const message = sanitizeTemplateValue(els.smsBody.value);
        return message ? `SMSTO:${number}:${message}` : `SMSTO:${number}`;
      }
      case 'line': {
        const lineInput = sanitizeTemplateValue(els.lineId.value);
        if (!lineInput) return '';
        if (/^https?:\/\//i.test(lineInput)) return lineInput;
        const normalizedId = lineInput.replace(/^@/, '');
        return `https://line.me/ti/p/~${encodeURIComponent(normalizedId)}`;
      }
      case 'social': {
        return buildSocialUrl(els.socialPlatform.value, els.socialHandle.value);
      }
      case 'vcard': {
        const name = escapeVCardValue(els.vName.value);
        const org = escapeVCardValue(els.vOrg.value);
        const phone = escapeVCardValue(sanitizePhone(els.vPhone.value));
        const mail = escapeVCardValue(els.vMail.value);
        const url = escapeVCardValue(els.vUrl.value);
        if (!name && !org && !phone && !mail && !url) return '';

        const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
        if (name) {
          lines.push(`N:;${name};;;`);
          lines.push(`FN:${name}`);
        }
        if (org) lines.push(`ORG:${org}`);
        if (phone) lines.push(`TEL:${phone}`);
        if (mail) lines.push(`EMAIL:${mail}`);
        if (url) lines.push(`URL:${url}`);
        lines.push('END:VCARD');
        return lines.join('\n');
      }
      default:
        return '';
    }
  };

  const syncTextFromTemplate = () => {
    if (state.currentDataType === 'plain') {
      return;
    }

    syncWifiAuthInputState();
    const generated = buildTemplateValue(state.currentDataType);
    els.text.value = generated;
    updateCharCount();
    validateTemplateInput(state.currentDataType);
    updateQR();
  };

  const applyDataType = (nextType) => {
    const normalizedType = normalizeDataType(nextType);
    const prevType = state.currentDataType;
    if (prevType === 'plain') {
      state.plainDraft = els.text.value;
    }

    state.currentDataType = normalizedType;
    toggleTemplateGroups(normalizedType);

    if (normalizedType === 'plain') {
      els.text.readOnly = false;
      els.text.placeholder = 'https://katakatalab.com';
      els.text.value = state.plainDraft;
    } else {
      els.text.readOnly = true;
      els.text.placeholder = t('main.templatePlaceholder');
      syncTextFromTemplate();
    }

    syncQuickTemplateButtons(normalizedType);
    updateDataTypeInLocation(normalizedType);
    updateCharCount();
    validateTemplateInput(normalizedType);
    updateQR();
  };

  const getContentSlug = () => {
    let text = els.text.value.trim();
    if (!text) return 'qrcode';

    try {
      if (text.startsWith('http')) {
        const url = new URL(text);
        text = url.hostname.replace('www.', '');
      }
    } catch {
      // URL以外はそのまま使用
    }

    let safeName = text
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .toLowerCase();
    safeName = safeName.replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (safeName.length > 24) safeName = safeName.slice(0, 24);
    return safeName || 'qrcode';
  };

  const generateSmartFileName = () => {
    const prefix = sanitizePrefix(els.filePrefix.value);
    const suffix = getContentSlug();
    const extension = getEffectiveExtension();
    return `${prefix}_${suffix}.${extension}`;
  };

  const updateFileNamePreview = () => {
    const templateValidation = validateTemplateInput(state.currentDataType);
    if (!templateValidation.valid || !isValidContent()) {
      els.fileNamePreview.textContent = '';
      return;
    }
    els.fileNamePreview.textContent = t('file.preview', { name: generateSmartFileName() });
  };

  const parseCsvLine = (line) => {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (ch === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current);
    return fields.map((field) => field.trim());
  };

  const normalizeCsvRows = (rawRows) => {
    if (rawRows.length === 0) return [];

    const header = rawRows[0].map((col) => col.toLowerCase());
    const hasHeader = header.some((col) => ['value', 'text', 'content', 'url', 'name', 'filename'].includes(col));

    const rows = [];
    if (hasHeader) {
      const valueIndex = header.findIndex((col) => ['value', 'text', 'content', 'url'].includes(col));
      const nameIndex = header.findIndex((col) => ['name', 'filename', 'file'].includes(col));

      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        const value = sanitizeTemplateValue(row[valueIndex >= 0 ? valueIndex : 0]);
        const name = sanitizeFileNamePart(row[nameIndex >= 0 ? nameIndex : 1] || '');
        if (!value) continue;
        rows.push({
          value,
          name: name || `bulk_${i}`
        });
      }
      return rows;
    }

    rawRows.forEach((row, index) => {
      const value = sanitizeTemplateValue(row[0]);
      const name = sanitizeFileNamePart(row[1] || '');
      if (!value) return;
      rows.push({
        value,
        name: name || `bulk_${index + 1}`
      });
    });

    return rows;
  };

  const clearBulkPreview = () => {
    els.bulkPreviewList.innerHTML = '';
  };

  const setBulkDownloadButtonsDisabled = (disabled) => {
    els.bulkDownloadBtn.disabled = disabled;
    els.bulkZipBtn.disabled = disabled || !isProPlan();
  };

  const previewBulkRows = () => {
    clearBulkPreview();
    const previewCount = Math.min(state.bulkRows.length, BULK_PREVIEW_LIMIT);
    for (let i = 0; i < previewCount; i++) {
      const row = state.bulkRows[i];
      const li = document.createElement('li');
      li.textContent = `${row.name}: ${row.value.slice(0, 64)}${row.value.length > 64 ? '…' : ''}`;
      els.bulkPreviewList.appendChild(li);
    }
    if (state.bulkRows.length > previewCount) {
      const li = document.createElement('li');
      li.textContent = t('bulk.more', { count: state.bulkRows.length - previewCount });
      els.bulkPreviewList.appendChild(li);
    }
  };

  const parseBulkCsv = () => {
    const sourceText = sanitizeTemplateValue(els.bulkCsvText.value);
    if (!sourceText) {
      state.bulkRows = [];
      els.bulkSummary.textContent = t('bulk.needInput');
      els.bulkStatus.textContent = '';
      clearBulkPreview();
      setBulkDownloadButtonsDisabled(true);
      return;
    }

    const lines = sourceText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const parsedRows = lines.map(parseCsvLine);
    const normalized = normalizeCsvRows(parsedRows)
      .filter((row) => row.value.length <= MAX_CHARS);

    state.bulkRows = normalized;
    if (normalized.length === 0) {
      els.bulkSummary.textContent = t('bulk.noValidRows');
      els.bulkStatus.textContent = '';
      clearBulkPreview();
      setBulkDownloadButtonsDisabled(true);
      return;
    }

    els.bulkSummary.textContent = t('bulk.loaded', { count: normalized.length });
    els.bulkStatus.textContent = '';
    previewBulkRows();
    setBulkDownloadButtonsDisabled(false);
  };

  const readBulkCsvFile = async (file) => {
    try {
      const text = await file.text();
      els.bulkCsvText.value = text;
      parseBulkCsv();
    } catch (error) {
      console.error('CSV file read failed:', error);
      els.bulkSummary.textContent = t('bulk.fileReadFailed');
      setBulkDownloadButtonsDisabled(true);
    }
  };

  const updateQR = () => {
    if (state.criticalError || !state.qr) return;
    const templateValidation = validateTemplateInput(state.currentDataType);

    if (!templateValidation.valid || !isValidContent()) {
      state.lastQrMatrixWidth = null;
      els.canvas.style.display = 'none';
      els.placeholder.style.display = 'block';
      els.downloadBtn.disabled = true;
      els.fileNamePreview.textContent = '';
      updateQualityReport();
      return;
    }

    els.canvas.style.display = 'block';
    els.placeholder.style.display = 'none';

    try {
      state.qr.set({
        value: els.text.value.trim(),
        size: parseInt(els.size.value, 10),
        foreground: els.fgColor.value,
        background: els.bgColor.value,
        backgroundAlpha: els.transparentBg.checked ? 0 : 1,
        padding: parseInt(els.qrPadding.value, 10),
        level: getEffectiveEccLevel()
      });
      applyLogoOverlay();
      updateFileNamePreview();
      updateQualityReport();
      els.downloadBtn.disabled = false;
    } catch (error) {
      console.error('QR update failed:', error);
      state.lastQrMatrixWidth = null;
      els.downloadBtn.disabled = true;
      els.fileNamePreview.textContent = '';
      updateQualityReport();
    }
  };

  const triggerDownload = (url, fileName, shouldRevoke) => {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    link.remove();

    if (shouldRevoke) {
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  };

  const getExportCanvasFromSource = (sourceCanvas, format) => {
    if (!sourceCanvas) return els.canvas;
    if (format !== 'jpeg' || !els.transparentBg.checked) {
      return sourceCanvas;
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = sourceCanvas.width;
    exportCanvas.height = sourceCanvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return sourceCanvas;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(sourceCanvas, 0, 0);
    return exportCanvas;
  };

  const getForegroundBounds = (sourceCanvas) => {
    const ctx = sourceCanvas && sourceCanvas.getContext('2d');
    const foreground = hexToRgb(els.fgColor.value) || hexToRgb(DEFAULT_FOREGROUND_COLOR);
    if (!ctx || !foreground) return null;

    const { data, width, height } = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const bounds = {
      minX: width,
      minY: height,
      maxX: -1,
      maxY: -1
    };
    let matchedPixels = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = ((y * width) + x) * 4;
        const a = data[index + 3];
        if (a === 0) continue;

        const distance = Math.abs(data[index] - foreground.r)
          + Math.abs(data[index + 1] - foreground.g)
          + Math.abs(data[index + 2] - foreground.b);
        if (distance > 12) continue;

        matchedPixels += 1;
        bounds.minX = Math.min(bounds.minX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.maxY = Math.max(bounds.maxY, y);
      }
    }

    return matchedPixels > 0 ? bounds : null;
  };

  const getCenteredRasterCanvas = (sourceCanvas, format) => {
    if (!sourceCanvas) return els.canvas;

    const bounds = getForegroundBounds(sourceCanvas);
    if (!bounds) {
      return getExportCanvasFromSource(sourceCanvas, format);
    }

    const activeWidth = bounds.maxX - bounds.minX + 1;
    const activeHeight = bounds.maxY - bounds.minY + 1;
    const targetMinX = Math.floor((sourceCanvas.width - activeWidth) / 2);
    const targetMinY = Math.floor((sourceCanvas.height - activeHeight) / 2);
    const shiftX = targetMinX - bounds.minX;
    const shiftY = targetMinY - bounds.minY;

    if (shiftX === 0 && shiftY === 0) {
      return getExportCanvasFromSource(sourceCanvas, format);
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = sourceCanvas.width;
    exportCanvas.height = sourceCanvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return getExportCanvasFromSource(sourceCanvas, format);

    if (format === 'jpeg' && els.transparentBg.checked) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    } else if (!els.transparentBg.checked) {
      ctx.fillStyle = els.bgColor.value || '#ffffff';
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }
    ctx.drawImage(sourceCanvas, shiftX, shiftY);
    return exportCanvas;
  };

  const getExportCanvas = () => getCenteredRasterCanvas(els.canvas, els.exportFormat.value);

  const generateSvgBlob = (canvas) => {
    const width = canvas.width;
    const height = canvas.height;
    const pngUrl = canvas.toDataURL('image/png');
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `<image href="${pngUrl}" width="${width}" height="${height}" />`,
      '</svg>'
    ].join('');
    return new Blob([svg], { type: 'image/svg+xml' });
  };

  const generatePdfBlob = async (canvas) => {
    const isLoaded = await ensureJsPdfLoaded();
    if (!isLoaded || !window.jspdf || !window.jspdf.jsPDF) {
      throw new Error('jsPDF library is unavailable');
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [canvas.width, canvas.height]
    });
    const imageData = canvas.toDataURL('image/png');
    pdf.addImage(imageData, 'PNG', 0, 0, canvas.width, canvas.height, undefined, 'FAST');
    return pdf.output('blob');
  };

  const downloadBlob = (blob, fileName) => {
    const blobUrl = URL.createObjectURL(blob);
    triggerDownload(blobUrl, fileName, true);
  };

  const downloadQR = async () => {
    const templateValidation = validateTemplateInput(state.currentDataType);
    if (state.criticalError || !templateValidation.valid || !isValidContent()) return;

    const format = els.exportFormat.value;
    const exportCanvas = getExportCanvas();
    const fileName = generateSmartFileName();

    if (format === 'svg') {
      if (!isProPlan()) {
        setPlanStatus(t('pro.statusNeedPro'));
        return;
      }
      const svgBlob = generateSvgBlob(exportCanvas);
      downloadBlob(svgBlob, fileName);
      return;
    }

    if (format === 'pdf') {
      if (!isProPlan()) {
        setPlanStatus(t('pro.statusNeedPro'));
        return;
      }
      try {
        const pdfBlob = await generatePdfBlob(exportCanvas);
        downloadBlob(pdfBlob, fileName);
      } catch (error) {
        console.error('PDF export failed:', error);
        setPlanStatus(t('pro.pdfFailed'));
      }
      return;
    }

    const mimeType = getEffectiveMimeType();
    if (typeof exportCanvas.toBlob === 'function') {
      exportCanvas.toBlob((blob) => {
        if (!blob) return;
        const blobUrl = URL.createObjectURL(blob);
        triggerDownload(blobUrl, fileName, true);
      }, mimeType, 0.95);
      return;
    }

    const dataUrl = exportCanvas.toDataURL(mimeType, 0.95);
    triggerDownload(dataUrl, fileName, false);
  };

  const createBulkQrEngine = () => {
    const canvas = document.createElement('canvas');
    return new window.QRious({
      element: canvas,
      size: parseInt(els.size.value, 10),
      level: getEffectiveEccLevel(),
      padding: parseInt(els.qrPadding.value, 10)
    });
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const createBulkBlob = (canvas, format, mimeType) => new Promise((resolve) => {
    if (format === 'svg') {
      resolve(generateSvgBlob(canvas));
      return;
    }
    if (format === 'pdf') {
      generatePdfBlob(canvas).then((blob) => resolve(blob)).catch(() => resolve(null));
      return;
    }
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => {
        resolve(blob || null);
      }, mimeType, 0.95);
      return;
    }
    const dataUrl = canvas.toDataURL(mimeType, 0.95);
    const byteString = atob(dataUrl.split(',')[1]);
    const byteArray = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      byteArray[i] = byteString.charCodeAt(i);
    }
    resolve(new Blob([byteArray], { type: mimeType }));
  });

  const buildBulkExportContext = () => ({
    format: els.exportFormat.value,
    mimeType: getEffectiveMimeType(),
    extension: getEffectiveExtension(),
    prefix: sanitizePrefix(els.filePrefix.value)
  });

  const buildBulkRowFileName = (row, index, prefix, extension) => (
    `${prefix}_${sanitizeFileNamePart(row.name) || `bulk_${index + 1}`}.${extension}`
  );

  const buildBulkRowCanvas = (qrEngine, row, format) => {
    qrEngine.set({
      value: row.value,
      size: parseInt(els.size.value, 10),
      foreground: els.fgColor.value,
      background: els.bgColor.value,
      backgroundAlpha: els.transparentBg.checked ? 0 : 1,
      padding: parseInt(els.qrPadding.value, 10),
      level: getEffectiveEccLevel()
    });
    applyLogoOverlay(qrEngine.canvas);

    if (format === 'svg' || format === 'pdf') {
      return qrEngine.canvas;
    }

    return getCenteredRasterCanvas(qrEngine.canvas, format);
  };

  const processBulkRows = async (options) => {
    const {
      context,
      qrEngine,
      delayMs,
      onBlob
    } = options;

    let successCount = 0;
    for (let i = 0; i < state.bulkRows.length; i++) {
      const row = state.bulkRows[i];
      els.bulkStatus.textContent = t('bulk.savingProgress', {
        current: i + 1,
        total: state.bulkRows.length
      });

      try {
        const exportCanvas = buildBulkRowCanvas(qrEngine, row, context.format);
        const blob = await createBulkBlob(exportCanvas, context.format, context.mimeType);
        if (blob) {
          const fileName = buildBulkRowFileName(row, i, context.prefix, context.extension);
          await onBlob(blob, fileName, i, row);
          successCount += 1;
        }
      } catch (error) {
        console.error('Bulk row export failed:', error);
      }

      await wait(delayMs);
    }

    return successCount;
  };

  const downloadBulkQr = async () => {
    if (state.bulkRows.length === 0) return;

    const context = buildBulkExportContext();
    if (isProOnlyFormat(context.format) && !isProPlan()) {
      setPlanStatus(t('pro.statusNeedPro'));
      return;
    }

    els.bulkDownloadBtn.disabled = true;
    els.bulkStatus.textContent = t('bulk.starting');

    let qrEngine = null;
    try {
      qrEngine = createBulkQrEngine();
    } catch (error) {
      console.error('Bulk QR engine init failed:', error);
      els.bulkStatus.textContent = t('bulk.engineFailed');
      els.bulkDownloadBtn.disabled = false;
      return;
    }

    const successCount = await processBulkRows({
      context,
      qrEngine,
      delayMs: 120,
      onBlob: async (blob, fileName) => {
        const blobUrl = URL.createObjectURL(blob);
        triggerDownload(blobUrl, fileName, true);
      }
    });

    els.bulkStatus.textContent = t('bulk.saved', { count: successCount });
    els.bulkDownloadBtn.disabled = false;
  };

  const downloadBulkZip = async () => {
    if (!isProPlan()) {
      setPlanStatus(t('pro.statusNeedPro'));
      return;
    }
    if (state.bulkRows.length === 0) return;
    const isLoaded = await ensureJsZipLoaded();
    if (!isLoaded || typeof window.JSZip !== 'function') {
      setPlanStatus(t('pro.zipFailed'));
      return;
    }

    const context = buildBulkExportContext();
    const zip = new window.JSZip();

    els.bulkZipBtn.disabled = true;
    els.bulkStatus.textContent = t('bulk.starting');

    let qrEngine = null;
    try {
      qrEngine = createBulkQrEngine();
    } catch (error) {
      console.error('Bulk ZIP QR engine init failed:', error);
      els.bulkStatus.textContent = t('bulk.engineFailed');
      els.bulkZipBtn.disabled = false;
      return;
    }

    try {
      await processBulkRows({
        context,
        qrEngine,
        delayMs: 40,
        onBlob: async (blob, fileName) => {
          zip.file(fileName, blob);
        }
      });

      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const zipName = `${sanitizePrefix(els.filePrefix.value)}_bundle.zip`;
      downloadBlob(zipBlob, zipName);
      els.bulkStatus.textContent = t('pro.zipReady');
      setPlanStatus(t('pro.zipReady'));
    } catch (error) {
      console.error('Bulk ZIP generation failed:', error);
      els.bulkStatus.textContent = t('pro.zipFailed');
      setPlanStatus(t('pro.zipFailed'));
    } finally {
      els.bulkZipBtn.disabled = false;
    }
  };

  const collectCurrentPreset = () => ({
    size: parseInt(els.size.value, 10),
    foreground: els.fgColor.value,
    background: els.bgColor.value,
    padding: parseInt(els.qrPadding.value, 10),
    transparentBg: Boolean(els.transparentBg.checked),
    eccLevel: els.eccLevel.value,
    logoSizePercent: getLogoPercent(),
    logoBackdrop: Boolean(els.logoBackdrop.checked),
    logoDataUrl: state.logoDataUrl || ''
  });

  const applyPresetData = async (preset) => {
    if (!preset || typeof preset !== 'object') return;
    const loadId = state.logoLoadId = (state.logoLoadId || 0) + 1;

    els.size.value = String(clamp(parseInt(preset.size, 10) || 250, 100, 1000));
    els.fgColor.value = /^#[0-9a-fA-F]{6}$/.test(preset.foreground) ? preset.foreground : DEFAULT_FOREGROUND_COLOR;
    els.bgColor.value = /^#[0-9a-fA-F]{6}$/.test(preset.background) ? preset.background : '#ffffff';
    els.qrPadding.value = String(clamp(parseInt(preset.padding, 10) || 4, 0, 20));
    els.transparentBg.checked = Boolean(preset.transparentBg);
    els.eccLevel.value = ['auto', 'H', 'Q', 'M', 'L'].includes(preset.eccLevel) ? preset.eccLevel : 'auto';
    els.logoSizePercent.value = String(clamp(parseInt(preset.logoSizePercent, 10) || 14, 8, 28));
    els.logoBackdrop.checked = Boolean(preset.logoBackdrop);

    updateSizeDisplay();
    updatePaddingDisplay();
    updateBackgroundMode();
    checkContrast();
    updateLogoSizeDisplay();

    if (typeof preset.logoDataUrl === 'string' && preset.logoDataUrl.startsWith('data:image/')) {
      const image = new Image();
      await new Promise((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
        image.src = preset.logoDataUrl;
      });
      if (loadId !== state.logoLoadId || !isProPlan()) return;
      if (image.complete && image.naturalWidth > 0) {
        state.logoImage = image;
        state.logoDataUrl = preset.logoDataUrl;
        els.logoPreview.src = preset.logoDataUrl;
        els.logoPreview.hidden = false;
      } else {
        state.logoImage = null;
        state.logoDataUrl = '';
        els.logoPreview.src = '';
        els.logoPreview.hidden = true;
      }
    } else {
      state.logoImage = null;
      state.logoDataUrl = '';
      els.logoPreview.src = '';
      els.logoPreview.hidden = true;
    }

    updateQR();
  };

  const savePreset = () => {
    if (!isProPlan()) {
      setPlanStatus(t('pro.statusNeedPro'));
      return;
    }

    const name = sanitizeTemplateValue(els.presetName.value).slice(0, 30);
    if (!name) {
      setPresetStatus(t('pro.presetNeedName'));
      return;
    }

    state.presets[name] = collectCurrentPreset();
    savePresets();
    syncPresetSelect();
    els.presetSelect.value = name;
    setPresetStatus(t('pro.presetSaved', { name }));
  };

  const loadSelectedPreset = async () => {
    if (!isProPlan()) {
      setPlanStatus(t('pro.statusNeedPro'));
      return;
    }

    const name = sanitizeTemplateValue(els.presetSelect.value);
    if (!name || !state.presets[name]) {
      setPresetStatus(t('pro.presetNotFound'));
      return;
    }

    await applyPresetData(state.presets[name]);
    setPresetStatus(t('pro.presetLoaded', { name }));
  };

  const deleteSelectedPreset = () => {
    if (!isProPlan()) {
      setPlanStatus(t('pro.statusNeedPro'));
      return;
    }

    const name = sanitizeTemplateValue(els.presetSelect.value);
    if (!name || !state.presets[name]) {
      setPresetStatus(t('pro.presetNotFound'));
      return;
    }

    delete state.presets[name];
    savePresets();
    syncPresetSelect();
    setPresetStatus(t('pro.presetDeleted', { name }));
  };

  const applySocialQuickPreset = () => {
    els.dataType.value = 'social';
    applyDataType('social');
    els.socialPlatform.value = els.socialQuickPlatform.value;
    els.socialHandle.value = els.socialQuickValue.value;
    syncTextFromTemplate();
  };

  const updateScannerUi = () => {
    els.scannerToggleBtn.textContent = state.scanning ? t('scanner.stop') : t('scanner.start');
    els.scannerVideo.hidden = !state.scanning;
  };

  const syncMobileDownloadState = () => {
    els.mobileDownloadBtn.disabled = els.downloadBtn.disabled;
  };

  const observeDownloadButtonState = () => {
    syncMobileDownloadState();
    const observer = new MutationObserver(() => {
      syncMobileDownloadState();
    });
    observer.observe(els.downloadBtn, { attributes: true, attributeFilter: ['disabled'] });
  };

  const isSidebarOpen = () => document.body.classList.contains('sidebar-open');

  let sidebarReturnFocus = null;

  const getSidebarFocusableElements = () => Array.from(els.settingsSidebar.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
  )).filter((element) => element.getClientRects().length > 0);

  const openGenerateOptionsPanel = () => {
    const panel = els.settingsSidebar.querySelector('details[data-details-id="generate-options"]');
    if (panel && !panel.open) {
      panel.open = true;
    }
  };

  const openSidebar = () => {
    if (isSidebarOpen()) return;

    sidebarReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.classList.add('sidebar-open');
    els.openSidebarBtn.setAttribute('aria-expanded', 'true');
    els.settingsSidebar.inert = false;
    els.settingsSidebar.setAttribute('aria-hidden', 'false');
    els.sidebarBackdrop.setAttribute('aria-hidden', 'false');
    els.closeSidebarBtn.focus();
  };

  const closeSidebar = (options = {}) => {
    const { restoreFocus = true } = options;
    if (!isSidebarOpen()) return;

    document.body.classList.remove('sidebar-open');
    els.openSidebarBtn.setAttribute('aria-expanded', 'false');
    els.settingsSidebar.inert = true;
    els.settingsSidebar.setAttribute('aria-hidden', 'true');
    els.sidebarBackdrop.setAttribute('aria-hidden', 'true');
    if (restoreFocus) {
      const focusTarget = sidebarReturnFocus?.isConnected ? sidebarReturnFocus : els.openSidebarBtn;
      focusTarget.focus();
    }
    sidebarReturnFocus = null;
  };

  const syncSidebarInitialState = () => {
    document.body.classList.remove('sidebar-open');
    els.openSidebarBtn.setAttribute('aria-expanded', 'false');
    els.settingsSidebar.inert = true;
    els.settingsSidebar.setAttribute('aria-hidden', 'true');
    els.sidebarBackdrop.setAttribute('aria-hidden', 'true');
  };

  const stopScanner = () => {
    state.scanning = false;
    if (state.scannerTimer) {
      clearTimeout(state.scannerTimer);
      state.scannerTimer = null;
    }

    if (state.scannerStream) {
      state.scannerStream.getTracks().forEach((track) => track.stop());
      state.scannerStream = null;
    }

    if (els.scannerVideo.srcObject) {
      els.scannerVideo.srcObject = null;
    }

    els.scannerStatus.textContent = t('scanner.idle');
    updateScannerUi();
  };

  const compareScanResult = (rawValue) => {
    const expected = els.text.value.trim();
    if (!expected) return false;
    if (rawValue === expected) return true;

    try {
      return decodeURIComponent(rawValue) === decodeURIComponent(expected);
    } catch {
      return false;
    }
  };

  const scheduleScanLoop = () => {
    if (!state.scanning || !state.scanDetector) return;

    state.scannerTimer = setTimeout(async () => {
      if (!state.scanning) return;

      try {
        const codes = await state.scanDetector.detect(els.scannerVideo);
        if (codes.length > 0) {
          const value = codes[0].rawValue || '';
          const matched = compareScanResult(value);
          els.scannerResult.textContent = matched
            ? t('scanner.match', { value })
            : t('scanner.read', { value });
          els.scannerStatus.textContent = matched
            ? t('scanner.matchedStatus')
            : t('scanner.unmatchedStatus');
        }
      } catch (error) {
        console.error('Scanner detect failed:', error);
      }

      scheduleScanLoop();
    }, 300);
  };

  const startScanner = async () => {
    if (state.scanning) return;

    if (!('BarcodeDetector' in window)) {
      els.scannerStatus.textContent = t('scanner.unsupportedBarcode');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      els.scannerStatus.textContent = t('scanner.unsupportedCamera');
      return;
    }

    try {
      state.scanDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      state.scannerStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      els.scannerVideo.srcObject = state.scannerStream;
      await els.scannerVideo.play();
      state.scanning = true;
      els.scannerStatus.textContent = t('scanner.starting');
      els.scannerResult.textContent = '';
      updateScannerUi();
      scheduleScanLoop();
    } catch (error) {
      console.error('Scanner start failed:', error);
      els.scannerStatus.textContent = t('scanner.startFailed');
      stopScanner();
    }
  };

  const bindTemplateEvents = () => {
    const templateInputs = Array.from(els.templateFields.querySelectorAll('input, textarea, select'));
    templateInputs.forEach((input) => {
      const eventName = input.type === 'checkbox' || input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(eventName, syncTextFromTemplate);
    });
  };

  const resetAllSettings = () => {
    // テキストをクリア
    els.text.value = '';
    state.plainDraft = '';
    updateCharCount();

    // サイズをデフォルトに戻す
    els.size.value = '250';
    updateSizeDisplay();

    // カラーをデフォルトに戻す
    els.fgColor.value = DEFAULT_FOREGROUND_COLOR;
    els.bgColor.value = '#ffffff';
    els.transparentBg.checked = false;
    updateBackgroundMode();
    checkContrast();

    // 詳細設定をデフォルトに戻す
    els.eccLevel.value = 'auto';
    els.qrPadding.value = '4';
    updatePaddingDisplay();

    // ファイル名プレフィックスをデフォルトに戻す
    els.filePrefix.value = 'qr';
    updateFileNamePreview();

    // テンプレートをplainに戻す
    els.dataType.value = 'plain';
    applyDataType('plain');

    // ロゴをクリア
    if (state.logoImage) {
      clearLogoState();
    }

    // QRをクリア
    updateQR();

    // フィードバック表示
    const resetBtn = document.getElementById('resetAllBtn');
    if (resetBtn) {
      const original = resetBtn.textContent;
      resetBtn.textContent = t('sidebar.resetDone');
      resetBtn.disabled = true;
      setTimeout(() => {
        resetBtn.textContent = original;
        resetBtn.disabled = false;
      }, 2000);
    }
  };

  const bindEvents = () => {
    els.langJaBtn.addEventListener('click', () => {
      setLanguage('ja');
    });
    els.langEnBtn.addEventListener('click', () => {
      setLanguage('en');
    });
    els.planFree.addEventListener('change', () => {
      if (!els.planFree.checked) return;
      if (!isManualPlanSwitchEnabled()) {
        syncPlanInputs();
        return;
      }
      setPlan('free');
    });
    els.planPro.addEventListener('change', () => {
      if (!els.planPro.checked) return;
      if (!isManualPlanSwitchEnabled()) {
        syncPlanInputs();
        return;
      }
      setPlan('pro');
    });
    els.applyLicenseBtn.addEventListener('click', async () => {
      await applyLicense();
    });
    els.licenseKeyInput.addEventListener('input', () => {
      els.licenseKeyInput.value = els.licenseKeyInput.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 14);
    });
    els.licenseKeyInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void applyLicense();
      }
    });
    els.logoFile.addEventListener('change', async () => {
      if (!isProPlan()) {
        setPlanStatus(t('pro.statusNeedPro'));
        els.logoFile.value = '';
        return;
      }
      const file = els.logoFile.files && els.logoFile.files[0];
      if (!file) return;
      await loadLogoFromFile(file);
    });
    els.clearLogoBtn.addEventListener('click', () => {
      clearLogoState(t('pro.logoRemoved'));
    });
    els.logoSizePercent.addEventListener('input', () => {
      updateLogoSizeDisplay();
      updateQR();
    });
    els.logoBackdrop.addEventListener('change', () => {
      updateQR();
    });
    els.savePresetBtn.addEventListener('click', savePreset);
    els.loadPresetBtn.addEventListener('click', async () => {
      await loadSelectedPreset();
    });
    els.deletePresetBtn.addEventListener('click', deleteSelectedPreset);

    els.text.addEventListener('input', () => {
      updateCharCount();

      if (state.currentDataType !== 'plain') {
        return;
      }

      if (!isValidContent()) {
        clearTimeout(state.debounceTimer);
        setLoading(false);
        updateQR();
        return;
      }

      setLoading(true);
      clearTimeout(state.debounceTimer);
      state.debounceTimer = setTimeout(() => {
        updateQR();
        setLoading(false);
      }, INPUT_DEBOUNCE_MS);
    });

    els.size.addEventListener('input', () => {
      updateSizeDisplay();
      updateQR();
    });

    els.btnDec.addEventListener('click', () => {
      const current = parseInt(els.size.value, 10);
      const min = parseInt(els.size.min, 10);
      els.size.value = Math.max(min, current - 10).toString();
      updateSizeDisplay();
      updateQR();
    });

    els.btnInc.addEventListener('click', () => {
      const current = parseInt(els.size.value, 10);
      const max = parseInt(els.size.max, 10);
      els.size.value = Math.min(max, current + 10).toString();
      updateSizeDisplay();
      updateQR();
    });

    const handleColorUpdate = () => {
      checkContrast();
      updateQR();
    };

    ['input', 'change'].forEach((eventName) => {
      els.fgColor.addEventListener(eventName, handleColorUpdate);
      els.bgColor.addEventListener(eventName, handleColorUpdate);
    });

    document.querySelectorAll('[data-color-target][data-color-value]').forEach((button) => {
      button.addEventListener('click', () => {
        const targetInput = button.dataset.colorTarget === 'background' ? els.bgColor : els.fgColor;
        targetInput.value = button.dataset.colorValue;
        handleColorUpdate();
      });
    });

    els.swapBtn.addEventListener('click', () => {
      const fg = els.fgColor.value;
      const bg = els.bgColor.value;
      els.fgColor.value = bg;
      els.bgColor.value = fg;
      checkContrast();
      updateQR();
    });

    els.dataType.addEventListener('change', () => {
      applyDataType(els.dataType.value);
    });
    getQuickTemplateButtons().forEach((button) => {
      button.addEventListener('click', () => {
        const nextType = normalizeDataType(button.dataset.quickTemplate);
        els.dataType.value = nextType;
        applyDataType(nextType);
        focusTemplateField(nextType);
      });
    });

    els.eccLevel.addEventListener('change', updateQR);
    els.qrPadding.addEventListener('input', () => {
      updatePaddingDisplay();
      updateQR();
    });
    els.transparentBg.addEventListener('change', () => {
      updateBackgroundMode();
      checkContrast();
      updateQR();
    });

    els.exportFormat.addEventListener('change', () => {
      guardFormatByPlan();
      updateDownloadLabel();
      updateFileNamePreview();
      if (els.exportFormat.value === 'pdf' && isProPlan()) {
        void ensureJsPdfLoaded();
      }
    });
    els.filePrefix.addEventListener('input', () => {
      els.filePrefix.value = sanitizePrefix(els.filePrefix.value);
      updateFileNamePreview();
    });

    els.applySocialQuickBtn.addEventListener('click', applySocialQuickPreset);

    els.bulkCsvFile.addEventListener('change', () => {
      const file = els.bulkCsvFile.files && els.bulkCsvFile.files[0];
      if (!file) return;
      readBulkCsvFile(file);
    });
    els.bulkPreviewBtn.addEventListener('click', parseBulkCsv);
    els.bulkDownloadBtn.addEventListener('click', downloadBulkQr);
    els.bulkZipBtn.addEventListener('click', downloadBulkZip);

    els.scannerToggleBtn.addEventListener('click', async () => {
      if (state.scanning) {
        stopScanner();
      } else {
        await startScanner();
      }
    });

    els.openSidebarBtn.addEventListener('click', openSidebar);
    els.mobileSettingsBtn.addEventListener('click', openSidebar);
    els.mobileTemplateBtn.addEventListener('click', () => {
      openSidebar();
      openGenerateOptionsPanel();
      focusTemplateField(state.currentDataType);
    });
    els.mobileDownloadBtn.addEventListener('click', () => {
      if (els.downloadBtn.disabled) return;
      els.downloadBtn.click();
    });
    els.closeSidebarBtn.addEventListener('click', () => closeSidebar({ restoreFocus: true }));
    els.sidebarBackdrop.addEventListener('click', () => closeSidebar({ restoreFocus: true }));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isSidebarOpen()) {
        closeSidebar({ restoreFocus: true });
        return;
      }

      if (event.key === 'Tab' && isSidebarOpen()) {
        const focusable = getSidebarFocusableElements();
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    els.downloadBtn.addEventListener('click', downloadQR);
    bindTemplateEvents();

    const resetAllBtn = document.getElementById('resetAllBtn');
    if (resetAllBtn) {
      resetAllBtn.addEventListener('click', resetAllSettings);
    }
  };

  setLanguage(state.currentLang, { persist: false });
  syncPlanInputs();
  syncPresetSelect();
  updateLogoSizeDisplay();
  syncProFeatureLock();
  setPlanStatus();
  updateSizeDisplay();
  updatePaddingDisplay();
  updateBackgroundMode();
  checkContrast();
  updateQualityReport();
  syncSidebarInitialState();
  const initialDataType = resolveDataTypeFromLocation();
  els.dataType.value = initialDataType;
  syncQuickTemplateButtons(initialDataType);

  if (!initQrEngine()) {
    return;
  }

  bindEvents();
  observeDownloadButtonState();
  applyDataType(initialDataType);
  updateQR();
  setLoading(false);
  void reconcileStoredLicense();

  window.addEventListener('beforeunload', (e) => {
    stopScanner();
    if (els.text && els.text.value.trim() !== '') {
      e.preventDefault();
      e.returnValue = '';
    }
  });
});
