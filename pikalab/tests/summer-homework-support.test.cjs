const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pikalabRoot = path.resolve(__dirname, '..');

function read(relativePath) {
    return fs.readFileSync(path.join(pikalabRoot, relativePath), 'utf8');
}

test('Science Makerは既存コア→夏休み支援の2段だけで読み込む', () => {
    const loader = read('science_maker/script.js');
    const coreIndex = loader.indexOf('script-core.js');
    const supportIndex = loader.indexOf('summer-support.js');

    assert.ok(coreIndex >= 0, 'science_maker: core loader');
    assert.ok(supportIndex > coreIndex, 'science_maker: summer support after core');
    assert.doesNotMatch(loader, /content-review\.js/);
    assert.equal(fs.existsSync(path.join(pikalabRoot, 'science_maker', 'content-review.js')), false);
});

test('Book Reportも既存コア→夏休み支援の2段だけで読み込む', () => {
    const loader = read('book_report/script.js');
    const coreIndex = loader.indexOf('script-core.js');
    const supportIndex = loader.indexOf('summer-support.js');

    assert.ok(coreIndex >= 0, 'book_report: core loader');
    assert.ok(supportIndex > coreIndex, 'book_report: summer support after core');
    assert.doesNotMatch(loader, /content-review\.js/);
    assert.equal(fs.existsSync(path.join(pikalabRoot, 'book_report', 'content-review.js')), false);
    assert.match(loader, /summer support script could not be loaded/);
});

test('Science Makerは提出代行ではなく研究メモとして結果・考察まで支援する', () => {
    const support = read('science_maker/summer-support.js');
    const loader = read('science_maker/script.js');

    assert.match(support, /研究を整理するためのメモ/);
    assert.match(support, /学校から指定された用紙・形式・書き方を優先/);
    assert.match(support, /id="plan-result"/);
    assert.match(support, /id="plan-discussion"/);
    assert.match(support, /id="plan-next-question"/);
    assert.match(support, /予想と違った/);
    assert.match(loader, /時間や興味に合った研究テーマ/);
    assert.match(loader, /計画部分を共有/);
    assert.match(loader, /結果・考察/);
    assert.doesNotMatch(loader, /性格や条件に合った/);
    assert.match(loader, /beforeprint/);
    assert.match(loader, /afterprint/);
});

test('読書感想文は完成文生成ではなく本人の構成づくりを支援する', () => {
    const support = read('book_report/summer-support.js');

    assert.match(support, /「構成メモ」/);
    assert.match(support, /完成した感想文を自動で作るものではありません/);
    assert.match(support, /自分への問いから始める型/);
    assert.match(support, /あらすじが少し多めかも/);
    assert.match(support, /構成メモの保管用/);
    assert.match(support, /外部AIに文章を送って完成した感想文を生成する機能はありません/);
    assert.match(support, /本人が自分の言葉で清書/);
    assert.match(support, /このツールのしくみとデータ/);
    assert.match(support, /LINE・メール・共有リンクなどの共有機能/);
});

test('読書感想文の学年は未選択を維持し、保存できない環境でも選択中の値を保持する', () => {
    const support = read('book_report/summer-support.js');

    assert.match(support, /const volatileGradeBySlot = new Map\(\)/);
    assert.match(support, /if \(volatileGradeBySlot\.has\(slot\)\) return volatileGradeBySlot\.get\(slot\)/);
    assert.match(support, /return null;/);
    assert.doesNotMatch(support, /\? value : 'high'/);
    assert.match(support, /volatileGradeBySlot\.set\(slot, value\)/);
    assert.match(support, /学年を選ぶと、第72回青少年読書感想文全国コンクールの参考上限を表示します/);
});

test('読書感想文の学年別参考上限は第72回コンクールの区分と一致する', () => {
    const support = read('book_report/summer-support.js');
    assert.match(support, /low:\s*\{ label: '小学1・2年', limit: 800 \}/);
    assert.match(support, /middle:\s*\{ label: '小学3・4年', limit: 1200 \}/);
    assert.match(support, /high:\s*\{ label: '小学5・6年', limit: 1200 \}/);
    assert.match(support, /junior:\s*\{ label: '中学生', limit: 2000 \}/);
    assert.match(support, /senior:\s*\{ label: '高校生', limit: 2000 \}/);
    assert.match(support, /低学年は本文800字以内、中・高学年は本文1,200字以内、中学・高校は本文2,000字以内/);
    assert.match(support, /提出先の学校の指示や地方審査の追加規定も確認/);
    assert.match(support, /dokusyokansoubun\.jp\/youkou\.html/);
});