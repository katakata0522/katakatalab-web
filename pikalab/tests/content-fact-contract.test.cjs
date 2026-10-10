const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pikalabRoot = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(pikalabRoot, relativePath), 'utf8');
}

test('記事ハブは公開済み記事だけを案内し、全カテゴリを絞り込める', () => {
    const html = read('articles/index.html');
    const styles = read('articles/style.css');
    const categories = new Set([...html.matchAll(/data-category="([^"]+)"/g)].map((match) => match[1]));
    const filters = new Set([...html.matchAll(/data-filter="([^"]+)"/g)].map((match) => match[1]));
    filters.delete('all');

    assert.doesNotMatch(html, /記事は順次公開予定/);
    assert.doesNotMatch(html, /バックナンバー/);
    assert.doesNotMatch(html, /archive-count/);
    assert.doesNotMatch(styles, /coming-soon-badge|archive-(?:link|count)/);
    assert.doesNotMatch(html, /学びの土台はかなり含まれています/);
    assert.deepEqual([...filters].sort(), [...categories].sort());
});

test('個別記事のカテゴリ表示は記事ハブと一致し、重複表示しない', () => {
    const hub = read('articles/index.html');
    const cards = [...hub.matchAll(
        /<article[^>]+data-category="([^"]+)"[\s\S]*?<a href="([^"]+\.html)" class="read-more/g
    )];

    const articleDirectory = path.join(pikalabRoot, 'articles');
    const articleFiles = fs.readdirSync(articleDirectory)
        .filter((name) => name.endsWith('.html') && name !== 'index.html')
        .sort();
    const cardFiles = cards.map(([, , fileName]) => fileName).sort();

    assert.ok(articleFiles.length > 0, '公開記事がありません');
    assert.deepEqual(cardFiles, articleFiles, '記事ハブは公開記事ファイルを過不足なく案内してください');
    assert.equal(new Set(cardFiles).size, cardFiles.length, '記事ハブに同じ記事を重複表示しないでください');

    for (const [, expectedCategory, fileName] of cards) {
        const html = read(`articles/${fileName}`);
        const category = html.match(
            /<span class="inline-flex[^"]*"[^>]*>[\s\S]*?material-symbols-rounded[\s\S]*?<\/span>\s*([^<]+)\s*<\/span>/
        )?.[1]?.trim();

        assert.equal(category, expectedCategory, `${fileName}: 記事ハブとカテゴリを合わせる`);
        assert.doesNotMatch(
            html,
            /<\/span>\s*考え方\s*<\/div>/,
            `${fileName}: カテゴリ名を二重表示しない`
        );
    }
});

test('PrivacyとTermsは端末内データと運営者へ送信される情報を分けて説明する', () => {
    const privacy = read('privacy.html');
    const terms = read('terms.html');

    for (const [label, html] of [['Privacy', privacy], ['Terms', terms]]) {
        assert.doesNotMatch(html, /旬読/, `${label}: 誤字`);
        assert.match(html, /端末内データ/, `${label}: 端末内データの説明`);
        assert.match(html, /送信された情報/, `${label}: 運営者が取得する情報の説明`);
        const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
        const description = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1];
        assert.ok(description?.trim(), `${label}: 内容を説明するdescription`);
        assert.notEqual(description, title, `${label}: titleの複製ではないdescription`);
        assert.doesNotMatch(description, /TODO|TBD|Lorem ipsum/i, `${label}: 未完成のdescriptionを残さない`);
    }

    assert.doesNotMatch(privacy, /入力内容や記録の削除等の希望があった場合は、本人確認のうえ/);
    assert.doesNotMatch(privacy, /今後設置する場合/);
    assert.match(privacy, /Googleフォーム/);
    assert.doesNotMatch(terms, /これらの入力内容を教育支援の目的の範囲内でのみ利用します/);
    assert.doesNotMatch(terms, /運営者が個人を特定できない形の統計情報として/);
});

test('10記事は引用研究の対象と限界を越えて断定しない', () => {
    const smart = read('articles/smart-child.html');
    assert.doesNotMatch(smart, /学年が上がるほど伸びやすい/);
    assert.doesNotMatch(smart, /学力と非認知能力は別々に育つのではなく、強くつながっている/);

    const play = read('articles/play-is-learning.html');
    assert.match(play, /研究チームが設計した32種類のゲーム/);
    assert.match(play, /自由遊び全般の効果を直接示したものではありません/);
    assert.match(play, /因果関係を確定したものではありません/);

    const reading = read('articles/how-reading-habits-grow.html');
    assert.match(reading, /子どもの言語能力は積極的対照群を上回りませんでした/);
    assert.match(reading, /因果関係を示すものではありません/);

    const math = read('articles/math-difficulty-support.html');
    assert.match(math, /因果の向きまでは決まりません/);

    const rewards = read('articles/rewards-for-learning.html');
    assert.match(rewards, /掲載した研究が直接比較した結果ではありません/);

    const sibling = read('articles/sibling-comparison-hurts.html');
    assert.match(sibling, /研究が扱ったのは比較発言そのものではなく/);
    assert.match(sibling, /<meta name="description" content="[^"]*扱いの差/);
    assert.match(sibling, /<title>[^<]*扱いの差/);
    assert.doesNotMatch(sibling, /比べない方がいい理由/);

    const concentration = read('articles/can-concentration-be-grown.html');
    assert.match(concentration, /15分や25分の有効性を直接検証した研究ではありません/);

    const resilience = read('articles/failure-resilience.html');
    assert.match(resilience, /効果は小さく、研究間の差も大きい/);
    assert.match(resilience, /年齢やプログラムによって結果に差/);
    assert.doesNotMatch(resilience, /2022年のレビュー/);

    const teacher = read('articles/teacher-fit-matters.html');
    assert.doesNotMatch(teacher, /先生との相性/);
    assert.match(teacher, /近さ、葛藤、依存などを含む「関係性の質」/);

    const routines = read('articles/low-grade-routines-matter.html');
    assert.match(routines, /片づけや朝の準備を直接検証したものではありません/);
});

test('Science・Paper・Speed・Typingの説明は実装と確認できる範囲に限定する', () => {
    const science = read('science_maker/index.html');
    assert.doesNotMatch(science, /性格診断/);
    assert.doesNotMatch(science, /最適なテーマ/);
    assert.doesNotMatch(science, /5分で完成/);
    assert.match(science, /使える時間や興味、安全条件/);

    const topics = read('science_maker/topics.js');
    assert.doesNotMatch(topics, /どれ一番/);
    assert.match(topics, /どれが一番/);

    const paper = read('paper_gen/index.html');
    assert.doesNotMatch(paper, /習熟度に合わせた問題/);
    assert.doesNotMatch(paper, /学習用のドリル|出題範囲に合わせた問題|生成した問題/);
    assert.match(paper, /漢字練習帳、方眼紙、英語ノート、五線譜、原稿用紙/);

    const speed = read('speed_reader/index.html');
    assert.doesNotMatch(speed, /情報処理能力」を鍛える/);
    assert.doesNotMatch(speed, /周辺視野」を鍛える/);
    assert.doesNotMatch(speed, /文字を読む力が総合的に伸びていきます/);
    assert.match(speed, /表示速度に慣れるため/);

    const typing = read('typing_dojo/index.html');
    assert.doesNotMatch(typing, /必ず指が自然に動く/);
    assert.match(typing, /指が少しずつ動きやすくなることがあります/);
});

test('読書感想文と自由研究は旧生成説明へ先祖返りしない', () => {
    const book = read('book_report/index.html');
    const bookSupport = read('book_report/summer-support.js');
    const science = read('science_maker/index.html');
    const scienceSupport = read('science_maker/summer-support.js');

    assert.doesNotMatch(book, /AIが生成した草稿|読書感想文の草稿を作成|最強の「構成案/);
    assert.doesNotMatch(bookSupport, /構成づくりクエスト \| 夏の大冒険/);
    assert.match(book, /自分で読書感想文を書くための構成メモ/);

    assert.doesNotMatch(science, /性格や条件に合った研究テーマ/);
    assert.doesNotMatch(scienceSupport, /性格や条件に合った研究テーマ/);
    assert.match(science, /使える時間や興味、安全条件/);
});

test('PikaLab 15 Lab横断監査で実装以上の効果・旧仕様へ戻さない', () => {
    const catalog = JSON.parse(read('js/app-data.json'));
    const byUrl = Object.fromEntries(catalog.apps.map((app) => [app.url, app]));

    assert.match(byUrl['speed_reader/'].description, /1〜3語ずつ/);
    assert.doesNotMatch(byUrl['speed_reader/'].description, /一語ずつ/);
    assert.match(byUrl['typing_dojo/'].description, /難易度や出題数/);
    assert.doesNotMatch(byUrl['typing_dojo/'].description, /寿司打風/);

    const rhythm = read('rhythm_lab/index.html');
    assert.doesNotMatch(rhythm, /リズム感や音楽的感性|プログラミング的思考力/);
    assert.match(rhythm, /BPMと音のパターンが共有URLに含まれ/);

    const focus = read('focus_studio/index.html');
    assert.doesNotMatch(focus, /集中力トレーニング|着手力|自律的な学習習慣|自然に引き出/);
    assert.match(focus, /タイマーは集中力そのものを測るものではなく/);

    const typing = read('typing_dojo/index.html');
    assert.doesNotMatch(typing, /ホームポジションの習得|タイピング能力の基礎を育み/);
    assert.match(typing, /WPM/);

    const fraction = read('fraction_lab/index.html');
    assert.doesNotMatch(fraction, /苦手意識が自然と和ら|分子が必ず 1[^<]*しか使/);
    assert.match(fraction, /2\/3などには特別な表し方/);
    assert.match(fraction, /ひとつの全体を分けて分数で表すとき/);

    const space = read('space_lab/index.html');
    assert.doesNotMatch(space, /自主的な学習態度を育て|組み合わせると効果的/);
    assert.match(space, /自動判定する機能はありません/);

    const speed = read('speed_reader/index.html');
    assert.doesNotMatch(speed, /学習継続の一番の原動力/);
    assert.match(speed, /内容まで追えたか/);

    const book = read('book_report/index.html');
    assert.doesNotMatch(book, /語彙力と読解力が同時に伸び|外部サーバーには送信されません/);
    assert.match(book, /分かりにくい文/);
    assert.match(book, /本のタイトル・感想・下書きなど/);
    assert.match(book, /共有URLに含まれます/);
    assert.match(book, /氏名など共有したくない情報/);

    const science = read('science_maker/index.html');
    assert.doesNotMatch(science, /論理的に物事を考える力を育み|理科好きな子どもを育む近道|本物の科学プロセス/);
    assert.match(science, /予想する→試す→記録する→考える/);
    assert.match(science, /氏名欄を含む研究計画/);
    assert.match(science, /共有URLに含まれます/);

    const deepsea = read('deepsea_lab/index.html');
    assert.doesNotMatch(deepsea, /学びへの熱量を高め|好奇心を育み/);
    assert.match(deepsea, /深さによる環境と生物の違い/);

    const deepseaData = read('deepsea_lab/js/data.ts');
    assert.doesNotMatch(deepseaData, /必ず故郷の浜辺|哺乳類最強のダイバー|脳油|絶対に逃がしません|サエの仲間/);
    assert.match(deepseaData, /エコーロケーション/);
    assert.match(deepseaData, /地球の磁場などを手がかり/);
});

test('Speed ReaderのSNS画像は既存JPGへ統一する', () => {
    const speed = read('speed_reader/index.html');
    const imageUrl = 'https://katakatalab.com/pikalab/pikalab_ogp_compressed.jpg';

    assert.match(speed, new RegExp(`<meta property="og:image" content="${imageUrl}">`));
    assert.match(speed, new RegExp(`<meta name="twitter:image" content="${imageUrl}">`));
    assert.doesNotMatch(speed, /<meta (?:property="og:image"|name="twitter:image")[^>]+\.svg/);
});

test('各記事は本文の流れに合う関連記事を1〜2本だけ通常リンクで案内する', () => {
    const articleDirectory = path.join(pikalabRoot, 'articles');
    const articleFiles = fs.readdirSync(articleDirectory)
        .filter((name) => name.endsWith('.html') && name !== 'index.html')
        .sort();

    assert.ok(articleFiles.length > 0, '関連記事を検証する公開記事がありません');
    for (const fileName of articleFiles) {
        const html = read(`articles/${fileName}`);
        const relatedBlock = html.match(/<!-- 関連記事 -->\s*<p>([\s\S]*?)<\/p>/);
        assert.ok(relatedBlock, `${fileName}: 関連記事ブロック`);

        const links = [...relatedBlock[1].matchAll(/<a href="([^"]+\.html)"[^>]*>/g)]
            .map((match) => match[1]);
        assert.ok(links.length >= 1 && links.length <= 2, `${fileName}: 関連記事は1〜2本`);
        assert.ok(links.every((href) => href !== fileName), `${fileName}: 自己リンクを置かない`);
        assert.equal(new Set(links).size, links.length, `${fileName}: 同じ記事を重複させない`);
        assert.ok(
            links.every((href) => fs.existsSync(path.join(articleDirectory, href))),
            `${fileName}: 実在する記事だけへリンクする`
        );
    }
});

test('Speed ReaderとPaper Genの主要領域はキーボードと読み上げで識別できる', () => {
    const speed = read('speed_reader/index.html');
    assert.match(
        speed,
        /<div[^>]+role="progressbar"[^>]+aria-label="[^"]+"[^>]*>/,
        'Speed Reader: progressbarに名前を付ける'
    );

    const paper = read('paper_gen/index.html');
    assert.match(
        paper,
        /<div[^>]+id="preview-container"[^>]+tabindex="0"[^>]+role="region"[^>]+aria-label="作成した用紙のプレビュー"[^>]*>/,
        'Paper Gen: プレビューをフォーカス可能な名前付き領域にする'
    );
});
