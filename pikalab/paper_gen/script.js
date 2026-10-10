/**
 * ============================================================
 * 設定定数
 * ============================================================
 */
const CONFIG = {
    // ズーム設定
    ZOOM: {
        MIN: 0.3,           // 最小ズーム率
        MAX: 1.5,           // 最大ズーム率
        STEP: 0.1,          // ズームステップ
    },

    // A4サイズ設定
    A4: {
        WIDTH_MM: 210,      // A4横幅 (mm)
        MM_TO_PX: 3.7795,   // 96dpiでの1mmあたりのピクセル数
    },

    // 初期化遅延 (ms)
    INIT_DELAY_MS: 100,

    // 用紙設定 (A4: 210x297mm)
    PAPER: {
        A4_W: 210,
        A4_H: 297,
        MARGIN: 15, // 共通マージン(mm)
        KANJI_COLS: 5,
        KANJI_ROWS: 7,
        ENGLISH_ROWS: 15,
        MUSIC_STAVES: 12,
    },

    // ボタンのアクティブ状態クラス
    ACTIVE_CLASS: 'paper-btn--active',
};

const PAPER_TYPES = Object.freeze(['kanji', 'grid5', 'grid10', 'english', 'music', 'genko400', 'genko200']);
const KANJI_STYLES = Object.freeze(['35', '84', '104']);
const BOOK_REPORT_SLOTS = Object.freeze(['1', '2', '3']);
const DRAFT_SAVE_ERROR_MESSAGE = '下書きを保存できませんでした。ブラウザの保存容量や設定を確認してください。';

// 結合文字・異体字セレクタ・絵文字の連結を、表示上の1文字として扱う。
const GRAPHEME_SEGMENTER = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('ja', { granularity: 'grapheme' })
    : null;

function* iterateCharacters(value) {
    const text = typeof value === 'string' ? value : String(value ?? '');
    // 通常のマスは1文字なので、描画ごとの分割器呼び出しを省く。
    if (text.length <= 1) {
        yield* text;
    } else if (GRAPHEME_SEGMENTER) {
        for (const { segment } of GRAPHEME_SEGMENTER.segment(text)) {
            yield segment;
        }
    } else {
        // 古いブラウザでもサロゲートペアは分断しない。
        yield* text;
    }
}

/**
 * 原稿用紙のマス目に文字をマッピングする (右から左、上から下)
 * @param {string} text 入力テキスト
 * @param {number} maxCols 列数 (行数)
 * @param {number} maxRows 行数 (1行の文字数)
 */
function mapTextToGenkoGrid(text, maxCols, maxRows) {
    const pages = [];
    const createNewPage = () => Array.from({ length: maxCols }, () => Array(maxRows).fill(''));
    let currentPage = createNewPage();
    pages.push(currentPage);

    if (!text) return pages;

    const paragraphs = text.split(/\r\n|[\n\r\u2028\u2029]/);
    let pageIdx = 0;
    let col = 0;
    let row = 0;
    const burasageChars = '。、」』）】〉》〕｝';

    for (const paragraph of paragraphs) {
        // 自動字下げ（スペース以外から始まる空でない段落の先頭に全角スペースを追加）
        let processedParagraph = paragraph;
        if (paragraph.length > 0 && !/^[ 　]/.test(paragraph)) {
            processedParagraph = '　' + paragraph;
        }

        const chars = Array.from(iterateCharacters(processedParagraph));
        let charIndex = 0;
        while (charIndex < chars.length) {
            const char = chars[charIndex];

            // 句読点と閉じ括弧の通常の組は行末へぶら下げる。
            // 長い記号列は最大2文字までにし、用紙の下端より外へ消えないよう
            // 残りを次のマスへ送る（文字を削ったり同じ座標へ重ねたりしない）。
            if (row === 0 && burasageChars.includes(char)) {
                const previousColumn = col > 0 ? pages[pageIdx][col - 1]
                    : pageIdx > 0 ? pages[pageIdx - 1][maxCols - 1] : null;
                if (previousColumn && countCharacters(previousColumn[maxRows - 1]) < 3) {
                    previousColumn[maxRows - 1] += char;
                    charIndex++;
                    continue;
                }
            }

            pages[pageIdx][col][row] = char;
            row++;

            if (row >= maxRows) {
                row = 0;
                col++;
            }

            if (col >= maxCols) {
                col = 0;
                row = 0;
                pageIdx++;
                currentPage = createNewPage();
                pages.push(currentPage);
            }
            charIndex++;
        }

        // 段落の終わりで改行
        if (row > 0) {
            row = 0;
            col++;
        } else if (paragraph.length === 0) {
            // 空行は1行空ける
            col++;
        }

        if (col >= maxCols) {
            col = 0;
            row = 0;
            pageIdx++;
            currentPage = createNewPage();
            pages.push(currentPage);
        }
    }

    // 最後のページが完全に空なら取り除く（ただし1枚目の場合は残す）
    while (pages.length > 1) {
        const lastPage = pages[pages.length - 1];
        const isEmpty = lastPage.every(colArr => colArr.every(cell => cell === ''));
        if (isEmpty) {
            pages.pop();
        } else {
            break;
        }
    }

    return pages;
}

/**
 * 縦書き時の句読点や小書き文字のオフセットを取得する
 * @param {string} char 判定する文字
 */
function getVerticalTextOffset(char) {
    const puncs = '。、」』）】〉》〕｝';
    if (puncs.includes(char)) {
        return { dx: '0.3em', dy: '-0.3em', isPunc: true };
    }
    const openBrackets = '「『（【〈《〔｛';
    if (openBrackets.includes(char)) {
        return { dx: '-0.15em', dy: '0.15em', isPunc: false };
    }
    const smalls = 'っゃゅょっぁぃぅぇぉっャュョァィゥェォッー';
    if (smalls.includes(char)) {
        return { dx: '0.15em', dy: '-0.15em', isPunc: false };
    }
    return { dx: '0', dy: '0', isPunc: false };
}


/**
 * 指定時間（wait）内に入力がない場合に処理を実行するデバウンスヘルパー
 */
function debounce(func, wait) {
    let timeout = null;
    let pendingArgs;
    let pendingContext;
    const flush = () => {
        if (timeout === null) return;
        clearTimeout(timeout);
        timeout = null;
        const args = pendingArgs;
        const context = pendingContext;
        pendingArgs = pendingContext = undefined;
        return func.apply(context, args);
    };
    function debounced(...args) {
        pendingContext = this;
        pendingArgs = args;
        clearTimeout(timeout);
        timeout = setTimeout(flush, wait);
    }
    debounced.flush = flush;
    debounced.cancel = () => {
        clearTimeout(timeout);
        timeout = null;
        pendingArgs = pendingContext = undefined;
    };
    return debounced;
}

function clampNumber(value, min, max, fallback = min) {
    const safeFallback = Math.min(max, Math.max(min, fallback));
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return safeFallback;
    return Math.min(max, Math.max(min, parsed));
}

function sanitizePaperType(type) {
    return PAPER_TYPES.includes(type) ? type : 'kanji';
}

function sanitizeKanjiStyle(style) {
    const candidate = String(style ?? '');
    return KANJI_STYLES.includes(candidate) ? candidate : '35';
}

function countCharacters(value) {
    let count = 0;
    for (const character of iterateCharacters(value)) count++;
    return count;
}

function truncateCharacters(value, maxLength) {
    const parsedMax = Number(maxLength);
    const safeMax = Number.isFinite(parsedMax) ? Math.max(0, Math.floor(parsedMax)) : 0;
    if (safeMax === 0) return '';
    const characters = [];
    for (const character of iterateCharacters(value)) {
        characters.push(character);
        if (characters.length >= safeMax) break;
    }
    return characters.join('');
}

// 通常URLとLINEへの入れ子URLがサーバーの要求行上限を超えないようにする。
// 短い旧形式は維持し、日本語1000文字の長文はUTF-8のURL-safe Base64へ切り替える。
function encodeSharedDraft(text) {
    const bytes = new TextEncoder().encode(text);
    return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function readSharedDraft(params) {
    if (params.has('draft')) return params.get('draft');
    const encoded = params.get('draft64');
    if (encoded === null) return null;
    if (!/^[A-Za-z0-9_-]*$/.test(encoded)) throw new TypeError('共有下書きの形式が不正です');
    const bytes = Uint8Array.from(atob(encoded.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
}

function buildShareQuery(type, draftText, kanjiStyle, maxDraftLength = 1000) {
    const safeType = sanitizePaperType(type);
    const params = new URLSearchParams();
    params.set('type', safeType);

    if (safeType === 'kanji') params.set('kanji', sanitizeKanjiStyle(kanjiStyle));

    const isGenko = safeType === 'genko400' || safeType === 'genko200';
    const sourceText = isGenko && typeof draftText === 'string' ? draftText : '';
    let safeDraft = truncateCharacters(sourceText, maxDraftLength);
    if (safeDraft) {
        params.set('draft', safeDraft);
        // 短文は既存URLを保つ。外側URLのパーセント符号化も含めて長さを判定する。
        if (encodeURIComponent(params.toString()).length > 6500) {
            const encoder = new TextEncoder();
            const characters = [];
            let byteLength = 0;
            for (const character of iterateCharacters(safeDraft)) {
                const size = encoder.encode(character).length;
                if (byteLength + size > 4200) break;
                characters.push(character);
                byteLength += size;
            }
            safeDraft = characters.join('');
            params.delete('draft');
            if (safeDraft) params.set('draft64', encodeSharedDraft(safeDraft));
        }
    }

    return {
        query: params.toString(),
        draftWasTruncated: sourceText !== safeDraft
    };
}

function sanitizeBookReportSlot(slot) {
    const candidate = String(slot ?? '');
    return BOOK_REPORT_SLOTS.includes(candidate) ? candidate : '1';
}

function normalizeBookReportData(value, draftText) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const formData = source.formData
        && typeof source.formData === 'object'
        && !Array.isArray(source.formData)
        ? source.formData
        : {};
    const safeDraftText = typeof draftText === 'string' ? draftText : '';

    return {
        ...source,
        formData: {
            ...formData,
            draftText: safeDraftText
        },
        // 古い読書感想文クエストとの互換性を維持する
        draftText: safeDraftText
    };
}

function writeJsonToStorage(storage, key, value, notifyError) {
    try {
        if (!storage || typeof storage.setItem !== 'function' || typeof key !== 'string' || !key) {
            throw new TypeError('保存先または保存キーが不正です');
        }
        storage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('下書き保存エラー:', error);
        if (typeof notifyError === 'function') {
            notifyError(DRAFT_SAVE_ERROR_MESSAGE);
        }
        return false;
    }
}

function calculateAutoScale(containerWidthPx, paperWidthPx, paddingPx, minScale, maxScale) {
    const safeContainerWidth = Math.max(0, Number(containerWidthPx) - Number(paddingPx));
    const safePaperWidth = Number(paperWidthPx);
    if (!Number.isFinite(safePaperWidth) || safePaperWidth <= 0) {
        return clampNumber(1, minScale, maxScale, 1);
    }

    const rawScale = safeContainerWidth < safePaperWidth
        ? safeContainerWidth / safePaperWidth
        : 1;
    return clampNumber(rawScale, minScale, maxScale, 1);
}

function getHorizontalPaddingPx(element) {
    if (!element || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
        return 0;
    }

    const style = window.getComputedStyle(element);
    const paddingLeft = Number.parseFloat(style.paddingLeft);
    const paddingRight = Number.parseFloat(style.paddingRight);
    const totalPadding = (Number.isFinite(paddingLeft) ? paddingLeft : 0)
        + (Number.isFinite(paddingRight) ? paddingRight : 0);

    return Math.max(0, totalPadding);
}

// 単一ページの共通ラッパー
function wrapSinglePageSVG(svgContent, A4_W, A4_H) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${A4_W} ${A4_H}" width="100%" height="100%" style="display: block; background: white;">
        ${svgContent}
    </svg>`;
    return `<div class="paper-sheet">${svg}</div>`;
}

/**
 * 漢字練習帳のマークアップを生成する
 */
function buildKanjiMarkup(paperConfig, kanjiStyle = '35') {
    const { A4_W, A4_H } = paperConfig;
    const greenStroke = '#4ade80'; // tailwind green-400
    let svgContent = '';
    
    let cols = 5;
    let rows = 7;
    let cellW = 36.0;
    let cellH = 36.0;

    const styleStr = sanitizeKanjiStyle(kanjiStyle);
    if (styleStr === '84') {
        cols = 6;
        rows = 14;
        cellW = 20.0;
        cellH = 20.0;
    } else if (styleStr === '104') {
        cols = 8;
        rows = 13;
        cellW = 18.0;
        cellH = 18.0;
    }
    
    // A4用紙（210mm x 297mm）に対して中央寄せになるようマージンを自動配分
    const offsetX = (A4_W - cellW * cols) / 2;
    const offsetY = (A4_H - cellH * rows) / 2;

    // マス目を描画
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = offsetX + c * cellW;
            const y = offsetY + r * cellH;
            svgContent += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="none" stroke="${greenStroke}" stroke-width="0.5" />`;
            svgContent += `
                <line x1="${x + cellW/2}" y1="${y}" x2="${x + cellW/2}" y2="${y + cellH}" stroke="${greenStroke}" stroke-width="0.2" stroke-dasharray="1.5 1.5" />
                <line x1="${x}" y1="${y + cellH/2}" x2="${x + cellW}" y2="${y + cellH/2}" stroke="${greenStroke}" stroke-width="0.2" stroke-dasharray="1.5 1.5" />
            `;
        }
    }
    return wrapSinglePageSVG(svgContent, A4_W, A4_H);
}

/**
 * 方眼紙 (5mm/10mm) のマークアップを生成する
 */
function buildGridMarkup(type, paperConfig) {
    const { A4_W, A4_H } = paperConfig;
    const strokeColor = '#94a3b8'; // tailwind slate-400
    const lightStroke = '#cbd5e1'; // tailwind slate-300
    let svgContent = '';
    const step = type === 'grid5' ? 5 : 10;
    const subStep = type === 'grid10' ? 5 : 0;
    
    // 用紙の外周に余白（マージン）を設定し、格子線が端で切れるのを防止
    const marginX = 10.0;
    const marginY = 13.5;
    const gridW = 190.0; // 5mm / 10mm で美しく割り切れる幅
    const gridH = 270.0; // 5mm / 10mm で美しく割り切れる高さ

    // 外枠の描画 (太さ 0.5)
    svgContent += `<rect x="${marginX}" y="${marginY}" width="${gridW}" height="${gridH}" fill="none" stroke="${strokeColor}" stroke-width="0.5" />`;

    // 縦線（外枠の内側のみ）
    for (let dx = 5; dx < gridW; dx += 5) {
        const x = marginX + dx;
        if (dx % step === 0) {
            svgContent += `<line x1="${x}" y1="${marginY}" x2="${x}" y2="${marginY + gridH}" stroke="${strokeColor}" stroke-width="0.3" />`;
        } else if (subStep && dx % subStep === 0) {
            svgContent += `<line x1="${x}" y1="${marginY}" x2="${x}" y2="${marginY + gridH}" stroke="${lightStroke}" stroke-width="0.2" stroke-dasharray="1.5 1.5" />`;
        }
    }
    // 横線（外枠の内側のみ）
    for (let dy = 5; dy < gridH; dy += 5) {
        const y = marginY + dy;
        if (dy % step === 0) {
            svgContent += `<line x1="${marginX}" y1="${y}" x2="${marginX + gridW}" y2="${y}" stroke="${strokeColor}" stroke-width="0.3" />`;
        } else if (subStep && dy % subStep === 0) {
            svgContent += `<line x1="${marginX}" y1="${y}" x2="${marginX + gridW}" y2="${y}" stroke="${lightStroke}" stroke-width="0.2" stroke-dasharray="1.5 1.5" />`;
        }
    }
    return wrapSinglePageSVG(svgContent, A4_W, A4_H);
}

/**
 * 英語ノート (4線) のマークアップを生成する
 */
function buildEnglishMarkup(paperConfig) {
    const { A4_W, A4_H, MARGIN, ENGLISH_ROWS } = paperConfig;
    const strokeColor = '#94a3b8'; // tailwind slate-400
    const lightStroke = '#cbd5e1'; // tailwind slate-300
    const redStroke = '#f87171'; // tailwind red-400
    let svgContent = '';
    
    const contentH = A4_H - MARGIN * 2;
    const rowH = contentH / ENGLISH_ROWS; // 1行全体の高さ (約17.8mm)
    
    // 4本線全体の高さを一般的な15段ノートと同じ規格（5.0mm）に最適化
    const h = 5.0; 
    const gap = h / 3; // 4本線の間隔 (約1.66mm)

    for (let i = 0; i < ENGLISH_ROWS; i++) {
        const yOffset = MARGIN + i * rowH;
        const startY = yOffset + (rowH - h) / 2; // 4本線の開始Y座標
        svgContent += `
            <line x1="${MARGIN}" y1="${startY}" x2="${A4_W - MARGIN}" y2="${startY}" stroke="${strokeColor}" stroke-width="0.3" />
            <line x1="${MARGIN}" y1="${startY + gap}" x2="${A4_W - MARGIN}" y2="${startY + gap}" stroke="${lightStroke}" stroke-width="0.3" stroke-dasharray="1.5 1.5" />
            <line x1="${MARGIN}" y1="${startY + gap * 2}" x2="${A4_W - MARGIN}" y2="${startY + gap * 2}" stroke="${redStroke}" stroke-width="0.4" />
            <line x1="${MARGIN}" y1="${startY + gap * 3}" x2="${A4_W - MARGIN}" y2="${startY + gap * 3}" stroke="${strokeColor}" stroke-width="0.3" />
        `;
    }
    return wrapSinglePageSVG(svgContent, A4_W, A4_H);
}

/**
 * 五線譜のマークアップを生成する
 */
function buildMusicMarkup(paperConfig) {
    const { A4_W, A4_H, MARGIN, MUSIC_STAVES } = paperConfig;
    const strokeColor = '#94a3b8'; // tailwind slate-400
    let svgContent = '';
    
    const contentH = A4_H - MARGIN * 2;
    const rowH = contentH / MUSIC_STAVES;
    for (let i = 0; i < MUSIC_STAVES; i++) {
        const yOffset = MARGIN + i * rowH;
        const h = rowH * 0.5;
        const startY = yOffset + (rowH - h) / 2;
        const gap = h / 4;
        
        // 5本の平行線を描画
        for (let j = 0; j < 5; j++) {
            svgContent += `<line x1="${MARGIN}" y1="${startY + gap * j}" x2="${A4_W - MARGIN}" y2="${startY + gap * j}" stroke="${strokeColor}" stroke-width="0.3" />`;
        }
        
        // 楽譜としての体裁を整えるため、各段の左右の端を縦線（小節線・開始線）で閉じる
        // 左端：太い小節線と細い開始線の二重線
        svgContent += `<line x1="${MARGIN}" y1="${startY}" x2="${MARGIN}" y2="${startY + gap * 4}" stroke="${strokeColor}" stroke-width="0.6" />`;
        svgContent += `<line x1="${MARGIN + 1.2}" y1="${startY}" x2="${MARGIN + 1.2}" y2="${startY + gap * 4}" stroke="${strokeColor}" stroke-width="0.2" />`;
        // 右端：閉じ線
        svgContent += `<line x1="${A4_W - MARGIN}" y1="${startY}" x2="${A4_W - MARGIN}" y2="${startY + gap * 4}" stroke="${strokeColor}" stroke-width="0.3" />`;
    }
    return wrapSinglePageSVG(svgContent, A4_W, A4_H);
}

/**
 * 原稿用紙 (400字 / 200字) のマークアップを生成する (共通ロジック)
 */
function buildGenkoMarkup(type, paperConfig, text, mappedPages) {
    const { A4_W, A4_H } = paperConfig;
    const genkoStroke = '#8db39e'; // 原稿用紙クラシック緑
    
    const is400 = type === 'genko400';
    const maxCols = is400 ? 20 : 10;
    const maxRows = 20;
    const cellW = is400 ? 7 : 10;
    const cellH = is400 ? 7 : 10;
    const colGap = is400 ? 1.0 : 2.0;
    const rowGap = 0.5;
    const hashiraW = is400 ? 8.0 : 0.0;
    const fontSize = is400 ? 4.8 : 7.2;
    const textYOffset = is400 ? 0.3 : 0.4;
    
    const totalW = maxCols * cellW + (maxCols - (is400 ? 2 : 1)) * colGap + hashiraW; // 400字: 166mm, 200字: 118mm
    const totalH = maxRows * cellH + (maxRows - 1) * rowGap; // 400字: 149.5mm, 200字: 209.5mm
    const offsetX = (A4_W - totalW) / 2;
    const offsetY = (A4_H - totalH) / 2;

    const textPages = mappedPages || mapTextToGenkoGrid(text, maxCols, maxRows);
    let pagesMarkup = '';

    textPages.forEach((textGrid, pageIdx) => {
        let svgContent = '';
        const hashiraCenterX = A4_W / 2;

        // 二重外枠の描画
        svgContent += `<rect x="${offsetX - 1.5}" y="${offsetY - 1.5}" width="${totalW + 3.0}" height="${totalH + 3.0}" fill="none" stroke="${genkoStroke}" stroke-width="0.8" />`;
        svgContent += `<rect x="${offsetX - 0.5}" y="${offsetY - 0.5}" width="${totalW + 1.0}" height="${totalH + 1.0}" fill="none" stroke="${genkoStroke}" stroke-width="0.3" />`;

        if (is400) {
            // 柱の境界線（左右の縦線）の描画
            svgContent += `<line x1="${hashiraCenterX - hashiraW / 2}" y1="${offsetY}" x2="${hashiraCenterX - hashiraW / 2}" y2="${offsetY + totalH}" stroke="${genkoStroke}" stroke-width="0.5" />`;
            svgContent += `<line x1="${hashiraCenterX + hashiraW / 2}" y1="${offsetY}" x2="${hashiraCenterX + hashiraW / 2}" y2="${offsetY + totalH}" stroke="${genkoStroke}" stroke-width="0.5" />`;

            // 柱の中央座標
            const centerY = offsetY + totalH / 2;
            const gyobiIndent = 1.5; // へこみの深さ (mm)
            
            // 魚尾を柱のちょうど中央付近にコンパクトに対向配置（文字は印刷せず、一般的な空白仕様とする）
            const gyobiTopY = centerY - 12.0;
            const gyobiBottomY = centerY - 6.0;
            const gyobiBottomTopY = centerY + 6.0;
            const gyobiBottomBottomY = centerY + 12.0;

            // 上側魚尾
            svgContent += `<path d="M ${hashiraCenterX - hashiraW / 2} ${gyobiTopY} L ${hashiraCenterX + hashiraW / 2} ${gyobiTopY} L ${hashiraCenterX + hashiraW * 0.3} ${gyobiBottomY} L ${hashiraCenterX} ${gyobiBottomY - gyobiIndent} L ${hashiraCenterX - hashiraW * 0.3} ${gyobiBottomY} Z" fill="${genkoStroke}" />`;
            // 下側魚尾
            svgContent += `<path d="M ${hashiraCenterX - hashiraW / 2} ${gyobiBottomBottomY} L ${hashiraCenterX + hashiraW / 2} ${gyobiBottomBottomY} L ${hashiraCenterX + hashiraW * 0.3} ${gyobiBottomTopY} L ${hashiraCenterX} ${gyobiBottomTopY + gyobiIndent} L ${hashiraCenterX - hashiraW * 0.3} ${gyobiBottomTopY} Z" fill="${genkoStroke}" />`;
        }

        // マス目の描画＆流し込み文字
        for (let c = 0; c < maxCols; c++) {
            let x;
            if (is400) {
                if (c < 10) {
                    x = A4_W - offsetX - (c + 1) * cellW - c * colGap;
                } else {
                    x = A4_W - offsetX - (c + 1) * cellW - (c - 1) * colGap - hashiraW;
                }
            } else {
                x = A4_W - offsetX - (c + 1) * cellW - c * colGap;
            }

            for (let r = 0; r < maxRows; r++) {
                const y = offsetY + r * cellH + r * rowGap;
                svgContent += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="none" stroke="${genkoStroke}" stroke-width="${is400 ? 0.4 : 0.5}" />`;
                
                const cellVal = textGrid[c][r];
                if (cellVal && cellVal.trim() !== '') {
                    const chars = Array.from(iterateCharacters(cellVal));
                    chars.forEach((char, idx) => {
                        const offset = getVerticalTextOffset(char);
                        const classStr = offset.isPunc ? 'genko-text punc' : 'genko-text';
                        
                        // ぶら下げの2文字目以降の句読点は、文字と重ならないようにマスの枠外（右下）にオフセット
                        // 連続する「。」や閉じ括弧も、同じ座標に重ねず縦に続ける。
                        // 長音・括弧はフォントの縦書き字形を使い、横向きのままにしない。
                        const verticalForm = 'ー「」『』（）【】〈〉《》〔〕｛｝…‥―—'.includes(char);
                        const dyVal = idx > 0 ? `${idx - 0.3}em` : verticalForm ? '0' : offset.dy;
                        const dxVal = idx > 0 ? '0.3em' : verticalForm ? '0' : offset.dx;
                        const orientation = verticalForm ? ' style="writing-mode:vertical-rl;text-orientation:mixed"' : '';

                        // XML/SVGのパースエラーを防ぐために特殊文字をエスケープ
                        const safeChar = char.replace(/[&<>]/g, (character) => ({
                            '&': '&amp;', '<': '&lt;', '>': '&gt;'
                        })[character]);
                        svgContent += `<text x="${x + cellW / 2}" y="${y + cellH / 2 + textYOffset}" class="${classStr}" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central" dx="${dxVal}" dy="${dyVal}"${orientation}>${safeChar}</text>`;
                    });
                }
            }
        }

        pagesMarkup += wrapSinglePageSVG(svgContent, A4_W, A4_H);
    });

    return pagesMarkup;
}

/**
 * 用紙種別に基づきSVGマークアップを生成する
 */
function buildPaperMarkup(type, paperConfig, text = '', kanjiStyle = '35', mappedPages) {
    const safeType = sanitizePaperType(type);

    switch (safeType) {
        case 'kanji':
            return buildKanjiMarkup(paperConfig, kanjiStyle);
        case 'grid5':
        case 'grid10':
            return buildGridMarkup(safeType, paperConfig);
        case 'english':
            return buildEnglishMarkup(paperConfig);
        case 'music':
            return buildMusicMarkup(paperConfig);
        case 'genko400':
        case 'genko200':
            return buildGenkoMarkup(safeType, paperConfig, text, mappedPages);
        default:
            return '';
    }
}


function applyPortalSettings() {
    try {
        const portalRaw = localStorage.getItem('wonder_school_profile_v2');
        if (portalRaw) {
            const portalData = JSON.parse(portalRaw);
            if (portalData.textSize === 'large') {
                document.body.classList.add('text-large');
            }
            if (portalData.reduceMotion === true) {
                document.body.classList.add('reduce-motion');
            }
        }
    } catch (e) {
        console.error("Failed to apply portal settings:", e);
    }
}

/**
 * ============================================================
 * アプリケーション本体
 * ============================================================
 */
const app = {
    currentScale: 0,
    activePaperType: 'kanji',
    activeKanjiStyle: '35',
    resizeRafId: null,
    saveErrorNotified: false,
    flushDraftUpdates: null,
    cancelDraftUpdatesForSlot: null,
    renderedTarget: null,
    renderedKey: null,
    renderedSheets: [],
    draftAnalysis: null,
    dom: {},

    init() {
        applyPortalSettings();
        this.cacheDOMElements();
        if (!this.validateRequiredDOMElements()) return;
        this.bindEvents();
        this.initializePaper();
        this.listenStorageChanges();
    },

    listenStorageChanges() {
        window.addEventListener('storage', (e) => {
            try {
                const activeSlot = sanitizeBookReportSlot(localStorage.getItem('bookReportQuestActiveSlot'));
                const storageKey = `bookReportQuestData_slot_${activeSlot}`;
                if (e.key === storageKey) {
                    const data = JSON.parse(e.newValue);
                    const text = this.readDraftText(data);
                    if (text === null) return;
                    // 受け入れた外部更新を、同じ作品の古い待機保存で戻さない。
                    this.cancelDraftUpdatesForSlot?.(activeSlot);
                    if (this.dom.draftTextarea && this.dom.draftTextarea.value !== text) {
                        this.dom.draftTextarea.value = text;
                        this.updateDraftCounter();
                        this.refreshPaper();
                    }
                }
            } catch (err) {
                console.error('Failed to parse storage update in paper_gen:', err);
            }
        });
    },

    cacheDOMElements() {
        this.dom.printTarget = document.getElementById('print-target');
        this.dom.previewSizer = document.getElementById('paper-preview-sizer');
        this.dom.previewContainer = document.getElementById('preview-container');
        this.dom.paperBtns = document.querySelectorAll('.paper-btn');
        this.dom.zoomInBtn = document.getElementById('zoom-in-btn');
        this.dom.zoomOutBtn = document.getElementById('zoom-out-btn');
        this.dom.printPaperBtn = document.getElementById('print-paper-btn');
        this.dom.sharePaperBtn = document.getElementById('share-paper-btn');

        // 漢字設定用
        this.dom.kanjiSettingsPanel = document.getElementById('kanji-settings-panel');
        this.dom.kanjiStyleRadios = document.querySelectorAll('input[name="kanji-style"]');

        // 流し込み連携用
        this.dom.draftTextarea = document.getElementById('paper-draft-textarea');
        this.dom.loadDraftBtn = document.getElementById('load-draft-btn');
        this.dom.draftCharCount = document.getElementById('draft-char-count');
        this.dom.draftSheetEstimate = document.getElementById('draft-sheet-estimate');
    },

    validateRequiredDOMElements() {
        const requiredElements = [
            ['printTarget', this.dom.printTarget, '#print-target'],
            ['previewContainer', this.dom.previewContainer, '#preview-container'],
            ['paperBtns', this.dom.paperBtns?.length > 0, '.paper-btn'],
            ['zoomInBtn', this.dom.zoomInBtn, '#zoom-in-btn'],
            ['zoomOutBtn', this.dom.zoomOutBtn, '#zoom-out-btn'],
            ['printPaperBtn', this.dom.printPaperBtn, '#print-paper-btn'],
        ];

        const missingSelectors = requiredElements
            .filter(([, value]) => !value)
            .map(([, , selector]) => selector);
        if (missingSelectors.length === 0) return true;

        console.error(`初期化に失敗しました。必須DOM要素が不足しています: ${missingSelectors.join(', ')}`);
        return false;
    },

    bindEvents() {
        this.dom.paperBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.setPaper(e.currentTarget.dataset.paperType, e.currentTarget));
        });

        this.dom.zoomInBtn?.addEventListener('click', () => this.zoomPreview(CONFIG.ZOOM.STEP));
        this.dom.zoomOutBtn?.addEventListener('click', () => this.zoomPreview(-CONFIG.ZOOM.STEP));
        this.dom.printPaperBtn?.addEventListener('click', () => this.printPaper());
        this.dom.sharePaperBtn?.addEventListener('click', () => this.sharePaper());

        // 漢字設定ラジオボタン連携
        this.dom.kanjiStyleRadios?.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.activeKanjiStyle = sanitizeKanjiStyle(e.target.value);
                this.refreshPaper();
            });
        });

        // 流し込みリアルタイム反映
        let pendingDraftSlot = null;
        const debouncedRefresh = debounce((slot, text) => {
            pendingDraftSlot = null;
            this.refreshPaper();
            this.saveDraftToBookReport(slot, text);
        }, 150);
        this.flushDraftUpdates = debouncedRefresh.flush;
        this.cancelDraftUpdatesForSlot = (slot) => {
            if (slot !== pendingDraftSlot) return;
            debouncedRefresh.cancel();
            pendingDraftSlot = null;
        };

        this.dom.draftTextarea?.addEventListener('input', () => {
            this.updateDraftCounter();
            try {
                // 待機中に別タブの保存先が変わっても、入力時のスロットに保存する。
                const slot = sanitizeBookReportSlot(localStorage.getItem('bookReportQuestActiveSlot'));
                if (pendingDraftSlot !== null && pendingDraftSlot !== slot) {
                    this.flushDraftUpdates();
                }
                pendingDraftSlot = slot;
                debouncedRefresh(slot, this.dom.draftTextarea.value);
            } catch (error) {
                this.refreshPaper();
                this.notifyDraftSaveFailure(DRAFT_SAVE_ERROR_MESSAGE);
            }
        });
        // 印刷と離脱の直前には、最後の入力を取りこぼさない。
        window.addEventListener('beforeprint', () => this.flushDraftUpdates());
        window.addEventListener('afterprint', () => {
            // 印刷中はページ間隔が0になるため、画面用CSSへ戻った後に外枠を測り直す。
            requestAnimationFrame(() => this.updatePreviewSize());
        });
        window.addEventListener('pagehide', () => this.flushDraftUpdates());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') this.flushDraftUpdates();
        });

        // クエスト連携ボタン
        this.dom.loadDraftBtn?.addEventListener('click', () => this.loadFromBookReport());

        window.addEventListener('resize', () => {
            if (this.resizeRafId !== null) return;
            this.resizeRafId = requestAnimationFrame(() => {
                this.resizeRafId = null;
                this.adjustScale();
            });
        }, { passive: true });
    },

    applyScale() {
        if (this.dom.printTarget) {
            this.dom.printTarget.style.transform = `scale(${this.currentScale})`;
        }
        this.updatePreviewSize();
        this.updateZoomButtonState();
    },

    updatePreviewSize() {
        if (!this.dom.previewSizer || !this.dom.printTarget) return;
        // transformだけでは縮小前の大きさがスクロール領域に残る。
        // 表示倍率に合った外枠を用意し、拡大時も左上から全体へ到達できるようにする。
        const scale = this.currentScale || 1;
        this.dom.previewSizer.style.width = `${this.dom.printTarget.offsetWidth * scale}px`;
        this.dom.previewSizer.style.height = `${this.dom.printTarget.offsetHeight * scale}px`;
    },

    zoomPreview(delta) {
        this.currentScale = clampNumber(
            this.currentScale + delta,
            CONFIG.ZOOM.MIN,
            CONFIG.ZOOM.MAX,
            1
        );
        this.applyScale();
    },

    adjustScale() {
        if (!this.dom.previewContainer || !this.dom.printTarget) return;

        const containerW = this.dom.previewContainer.clientWidth;
        const paperW_px = CONFIG.A4.WIDTH_MM * CONFIG.A4.MM_TO_PX;
        const previewPaddingPx = getHorizontalPaddingPx(this.dom.previewContainer);

        const newScale = calculateAutoScale(
            containerW,
            paperW_px,
            previewPaddingPx,
            CONFIG.ZOOM.MIN,
            CONFIG.ZOOM.MAX
        );

        // 差分が0.01（1%）未満の場合は、モバイルスクロール時のツールバー開閉等によるガタつきを防ぐために再適用をスキップ
        if (this.currentScale > 0 && Math.abs(newScale - this.currentScale) < 0.01) {
            return;
        }

        this.currentScale = newScale;
        this.applyScale();
    },

    updateZoomButtonState() {
        const atMin = this.currentScale <= CONFIG.ZOOM.MIN + Number.EPSILON;
        const atMax = this.currentScale >= CONFIG.ZOOM.MAX - Number.EPSILON;
        if (this.dom.zoomOutBtn) {
            this.dom.zoomOutBtn.disabled = atMin;
            this.dom.zoomOutBtn.setAttribute('aria-disabled', atMin ? 'true' : 'false');
        }
        if (this.dom.zoomInBtn) {
            this.dom.zoomInBtn.disabled = atMax;
            this.dom.zoomInBtn.setAttribute('aria-disabled', atMax ? 'true' : 'false');
        }
    },

    /**
     * アクティブなボタンを更新（シンプルなクラストグル方式）
     */
    updateActiveButton(activeBtn) {
        this.dom.paperBtns.forEach((button) => {
            button.classList.remove(CONFIG.ACTIVE_CLASS);
            button.setAttribute('aria-pressed', 'false');
        });
        if (!activeBtn) return;
        activeBtn.classList.add(CONFIG.ACTIVE_CLASS);
        activeBtn.setAttribute('aria-pressed', 'true');
    },

    setPaper(type, btnElement) {
        if (!this.dom.printTarget) return;
        const safeType = sanitizePaperType(type);
        this.activePaperType = safeType;
        const matchedBtn = btnElement || Array.from(this.dom.paperBtns).find(
            (button) => button.dataset.paperType === safeType
        ) || null;

        this.updateActiveButton(matchedBtn);

        // 漢字設定パネルの表示制御
        const isKanji = safeType === 'kanji';
        if (this.dom.kanjiSettingsPanel) {
            if (isKanji) {
                this.dom.kanjiSettingsPanel.classList.remove('hidden');
            } else {
                this.dom.kanjiSettingsPanel.classList.add('hidden');
            }
        }

        // 原稿用紙以外のときは流し込みフォームを無効化
        const isGenko = safeType === 'genko400' || safeType === 'genko200';
        if (this.dom.draftTextarea) {
            this.dom.draftTextarea.disabled = !isGenko;
        }
        if (this.dom.loadDraftBtn) {
            this.dom.loadDraftBtn.disabled = !isGenko;
        }

        this.updateDraftCounter();

        this.refreshPaper();
    },

    refreshPaper() {
        const target = this.dom.printTarget;
        if (!target) return;
        const isGenko = this.activePaperType === 'genko400' || this.activePaperType === 'genko200';
        const text = isGenko ? (this.dom.draftTextarea?.value || '') : '';
        const key = JSON.stringify([this.activePaperType, this.activeKanjiStyle, text]);
        if (this.renderedTarget === target && this.renderedKey === key) return;

        const pages = isGenko ? this.analyzeDraft(text).pages : undefined;
        const markup = buildPaperMarkup(this.activePaperType, CONFIG.PAPER, text, this.activeKanjiStyle, pages);
        const sheets = markup.split(/(?=<div class="paper-sheet">)/);
        if (this.renderedTarget !== target || !target.children || target.children.length !== this.renderedSheets.length) {
            target.innerHTML = markup;
        } else {
            // textノードの個数に依存する差分更新はしない。変わったページだけを
            // 完全なSVGへ交換し、長い原稿の未変更ページを解析・再配置し直さない。
            sheets.forEach((sheet, index) => {
                if (sheet === this.renderedSheets[index]) return;
                if (target.children[index]) target.children[index].outerHTML = sheet;
                else target.insertAdjacentHTML('beforeend', sheet);
            });
            while (target.children.length > sheets.length) target.lastElementChild.remove();
        }
        this.renderedTarget = target;
        this.renderedKey = key;
        this.renderedSheets = sheets;
        this.updatePreviewSize();
    },

    // 空文字の新形式下書きも正本として扱い、古い本文を復活させない。
    // storageイベントに不正な値が来た場合は画面上の入力を保護する。
    readDraftText(data) {
        if (data === null) return '';
        if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
        if (data.formData && typeof data.formData === 'object' && !Array.isArray(data.formData)
            && typeof data.formData.draftText === 'string') return data.formData.draftText;
        if (typeof data.draftText === 'string') return data.draftText;
        return null;
    },

    analyzeDraft(text) {
        const type = this.activePaperType;
        if (this.draftAnalysis?.text === text && this.draftAnalysis.type === type) return this.draftAnalysis;
        const isGenko = type === 'genko400' || type === 'genko200';
        // 文字数表示と150ms後の描画で同じ原稿を二重にマッピングしない。
        this.draftAnalysis = {
            text, type, length: countCharacters(text),
            pages: isGenko ? mapTextToGenkoGrid(text, type === 'genko400' ? 20 : 10, 20) : null
        };
        return this.draftAnalysis;
    },

    updateDraftCounter() {
        if (!this.dom.draftTextarea) return;
        const analysis = this.analyzeDraft(this.dom.draftTextarea.value);
        const len = analysis.length;
        if (this.dom.draftCharCount) {
            this.dom.draftCharCount.textContent = len;
        }

        if (this.dom.draftSheetEstimate) {
            const isGenko = this.activePaperType === 'genko400' || this.activePaperType === 'genko200';
            if (!isGenko) {
                this.dom.draftSheetEstimate.textContent = '目安: 0.0枚';
                return;
            }
            const pages = analysis.pages;
            const limit = this.activePaperType === 'genko400' ? 400 : 200;
            const estimate = (len / limit).toFixed(1);
            this.dom.draftSheetEstimate.textContent = `目安: ${estimate}枚 (印刷: ${pages.length}枚)`;
        }
    },

    saveDraftToBookReport(slot, draftText) {
        try {
            const activeSlot = sanitizeBookReportSlot(slot ?? localStorage.getItem('bookReportQuestActiveSlot'));
            const storageKey = `bookReportQuestData_slot_${activeSlot}`;
            const rawData = localStorage.getItem(storageKey);

            let storedData = {};
            if (rawData) {
                storedData = JSON.parse(rawData);
            }

            const text = typeof draftText === 'string'
                ? draftText
                : (this.dom.draftTextarea?.value || '');
            const data = normalizeBookReportData(storedData, text);
            const saved = writeJsonToStorage(localStorage, storageKey, data, (message) => {
                this.notifyDraftSaveFailure(message);
            });
            if (saved) {
                this.saveErrorNotified = false;
            }
            return saved;
        } catch (e) {
            console.error('Failed to autosave draft from paper_gen', e);
            this.notifyDraftSaveFailure(DRAFT_SAVE_ERROR_MESSAGE);
            return false;
        }
    },

    notifyDraftSaveFailure(message) {
        if (this.saveErrorNotified) return;
        this.saveErrorNotified = true;
        alert(message);
    },

    loadFromBookReport() {
        try {
            const activeSlot = sanitizeBookReportSlot(localStorage.getItem('bookReportQuestActiveSlot'));
            const rawData = localStorage.getItem(`bookReportQuestData_slot_${activeSlot}`);
            if (!rawData) {
                alert('読書感想文クエストのセーブデータ（下書き）が見つかりません。先にクエストをクリアして下書きを作成してください。');
                return;
            }
            const data = JSON.parse(rawData);
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                throw new TypeError('下書きデータの形式が不正です');
            }
            const text = this.readDraftText(data);
            if (text === null) throw new TypeError('下書きデータの形式が不正です');
            if (!text.trim()) {
                alert('感想文クエストの下書きが「からっぽ」です。先に感想文の下書きを入力・作成してください。');
                return;
            }

            if (this.dom.draftTextarea) {
                this.dom.draftTextarea.value = text;
                this.dom.draftTextarea.dispatchEvent(new Event('input'));
            }
        } catch (e) {
            console.error('Failed to load from book report', e);
            alert('データの読み込み中にエラーが発生しました。');
        }
    },

    printPaper() {
        this.flushDraftUpdates?.();
        window.print();
    },

    sharePaper() {
        const type = sanitizePaperType(this.activePaperType);
        const text = this.dom.draftTextarea ? this.dom.draftTextarea.value : '';
        const baseUrl = window.location.origin + window.location.pathname;
        const maxDraftLength = 1000;
        const shareQuery = buildShareQuery(type, text, this.activeKanjiStyle, maxDraftLength);

        if (shareQuery.draftWasTruncated) {
            alert('※下書きの文字数または共有リンクの長さが上限を超えるため、最大1000文字の範囲で一部を省略して共有リンクを作成しました。');
        }

        const shareUrl = `${baseUrl}?${shareQuery.query}`;
        const shareData = {
            title: "PikaLab なんでも用紙ジェネレーター",
            text: "つくった用紙を共有するよ！印刷して使ってね！",
            url: shareUrl
        };
        
        if (navigator.share) {
            navigator.share(shareData).catch(err => {
                console.warn('Share failed:', err);
            });
        } else {
            const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`;
            window.open(lineUrl, '_blank', 'noopener');
        }
    },

    initializePaper() {
        const firstBtn = this.dom.paperBtns[0] || null;
        let initialType = sanitizePaperType(firstBtn?.dataset.paperType || 'kanji');

        // クエリパラメータのチェック
        const params = new URLSearchParams(window.location.search);
        const hasLoadDraft = params.get('load_draft') === 'true';
        let urlDraft = null;
        try {
            urlDraft = readSharedDraft(params);
        } catch (error) {
            console.warn('Failed to read shared draft:', error);
            alert('共有リンクの下書きを読み込めませんでした。');
        }

        if (urlDraft) {
            if (this.dom.draftTextarea) {
                // 共有リンクの閲覧だけでは、端末にある感想文の下書きを上書きしない。
                this.dom.draftTextarea.value = urlDraft;
            }
            const requestedType = params.get('type');
            if (requestedType && PAPER_TYPES.includes(requestedType)) {
                initialType = requestedType;
            } else {
                const len = countCharacters(urlDraft);
                initialType = len > 0 && len <= 200 ? 'genko200' : 'genko400';
            }
        } else if (hasLoadDraft) {
            this.loadFromBookReport();
            const requestedType = params.get('type');
            if (requestedType && PAPER_TYPES.includes(requestedType)) {
                initialType = requestedType;
            } else {
                // 文字数に応じて200字か400字か最適な方を自動で選ぶ
                const len = this.dom.draftTextarea ? countCharacters(this.dom.draftTextarea.value) : 0;
                initialType = len > 0 && len <= 200 ? 'genko200' : 'genko400';
            }
        } else {
            const requestedType = params.get('type');
            if (requestedType && PAPER_TYPES.includes(requestedType)) {
                initialType = requestedType;
            }
        }

        if (initialType === 'kanji') {
            this.activeKanjiStyle = sanitizeKanjiStyle(params.get('kanji'));
            this.dom.kanjiStyleRadios?.forEach((radio) => {
                radio.checked = radio.value === this.activeKanjiStyle;
            });
        }

        this.setPaper(initialType, Array.from(this.dom.paperBtns).find(btn => btn.dataset.paperType === initialType) || firstBtn);

        setTimeout(() => this.adjustScale(), CONFIG.INIT_DELAY_MS);
    }
};

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => app.init());
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        clampNumber,
        sanitizePaperType,
        sanitizeKanjiStyle,
        countCharacters,
        truncateCharacters,
        buildShareQuery,
        readSharedDraft,
        calculateAutoScale,
        getHorizontalPaddingPx,
        buildPaperMarkup,
        mapTextToGenkoGrid,
        getVerticalTextOffset,
        sanitizeBookReportSlot,
        normalizeBookReportData,
        writeJsonToStorage,
        app
    };
}
