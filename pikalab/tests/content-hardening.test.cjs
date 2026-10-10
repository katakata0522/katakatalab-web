const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('PikaLabカタログは実装範囲を超える断定をしない', () => {
    const catalog = JSON.parse(read('js/app-data.json'));
    const byUrl = Object.fromEntries(catalog.apps.map((app) => [app.url, app]));

    assert.match(byUrl['deepsea_lab/'].description, /1万m級/);
    assert.match(byUrl['color_lab/'].description, /画面の赤・緑・青/);
    assert.match(byUrl['kanji_lab/'].description, /形・読み・意味/);
    assert.match(byUrl['fraction_lab/'].description, /同分母の足し算・引き算/);
    assert.match(byUrl['space_lab/'].description, /特徴を比べよう/);
    assert.match(byUrl['focus_studio/'].description, /自分で設定できるタイマー/);
    assert.match(byUrl['paper_gen/'].description, /必要な形式を選んで印刷/);
    assert.match(byUrl['quest_board/'].description, /クエスト風に整理/);
    assert.match(byUrl['book_report/'].description, /感想や理由を整理/);
    assert.equal(byUrl['science_maker/'].title, '自由研究・テーマメーカー');
    assert.equal(byUrl['science_maker/'].buttonText, '候補を探す');
});

test('内容補正は後付けスクリプトではなく各正本へ統合する', () => {
    const color = read('color_lab/index.html');
    const manabi = read('manabi_land/index.html');
    const kanji = read('kanji_lab/index.html');
    const kotowaza = read('kotowaza_quiz/index.html');

    assert.match(color, /RGBは光の加法混色/);
    assert.match(color, /絵の具・インクなどの色材/);
    assert.match(manabi, /学校教材の代わりではなく/);
    assert.match(manabi, /外部配信サービスへの通常の通信/);
    const manabiScript = read('manabi_land/script.js');
    assert.match(manabiScript, /aria-pressed/);
    assert.match(manabiScript, /効果音をオンにする/);
    assert.match(manabiScript, /効果音をオフにする/);
    assert.match(kanji, /字源を説明するものではありません/);
    assert.match(kanji, /学年別配当漢字を順番に網羅するドリルではありません/);
    assert.match(kotowaza, /科学的な法則や必ず起こる結果を表すものではありません/);

    for (const app of ['color_lab', 'manabi_land', 'kanji_lab', 'kotowaza_quiz', 'space_lab']) {
        assert.equal(fs.existsSync(path.join(root, app, 'content-review.js')), false, `${app}: 後付け補正を作らない`);
    }
});

test('保護者向け説明は端末内データと外部配信・共有通信を区別する', () => {
    const localOnlyLabs = [
        'deepsea_lab',
        'fraction_lab',
        'space_lab',
        'speed_reader',
        'focus_studio',
        'typing_dojo'
    ];

    for (const lab of localOnlyLabs) {
        const html = read(`${lab}/index.html`);
        assert.doesNotMatch(html, /データは外部サーバーに送信されません。/, `${lab}: 通信全体を否定する曖昧な説明へ戻さない`);
        assert.match(html, /各ツールへ入力した内容や端末内の記録/, `${lab}: 端末内データの範囲を明確にする`);
        assert.match(html, /Webフォント等の外部配信サービスへの通常の通信/, `${lab}: 表示に伴う外部通信を隠さない`);
    }

    const science = read('science_maker/index.html');
    assert.doesNotMatch(science, /データは外部サーバーに送信されません。/);
    assert.match(science, /通常の入力内容は端末内で扱われます/);
    assert.match(science, /氏名欄を含む研究計画の入力内容が共有URLに含まれます/);
    assert.match(science, /氏名など共有したくない情報は共有前に外してください/);
    assert.match(science, /Webフォント等の外部配信サービスへの通常の通信/);

    const book = read('book_report/index.html');
    assert.match(book, /本のタイトル・感想・下書きなど、その時点の入力内容が共有URLに含まれます/);
    assert.match(book, /氏名など共有したくない情報/);
    assert.match(book, /Webフォント等の外部配信サービスへの通常の通信/);
});

test('ことわざの意味は必然・万能と誤解させない', () => {
    const context = {};
    vm.createContext(context);
    vm.runInContext(`${read('data/idioms.js')}\nthis.__IDIOMS_DB__ = IDIOMS_DB;`, context);
    const items = [...context.__IDIOMS_DB__.yojijukugo, ...context.__IDIOMS_DB__.kotowaza];
    const meaningOf = (kanji) => items.find((item) => item.kanji === kanji)?.meaning;

    assert.equal(meaningOf('弱肉強食'), '弱い者が強い者の犠牲になり、強い者が栄えること');
    assert.equal(meaningOf('失敗は成功の母'), '失敗を振り返って学ぶことが、次の成功につながるという教え');
    assert.equal(meaningOf('三つ子の魂百まで'), '幼いころの性質は年をとっても変わりにくい、というたとえ');
    assert.equal(meaningOf('嘘も方便'), '相手や状況のために、やむを得ない嘘が手段になることもあるという言い回し');
    assert.equal(meaningOf('果報は寝て待て'), 'できることをした後は、よい知らせを焦らず待つという教え');
});
