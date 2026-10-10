const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// 著者・研究名と、一次資料を同定するURLの対応を守る。
const verifiedReferences = [
    ['curiosity-and-questions.html', 'Bonawitz, E.', 'https://pubmed.ncbi.nlm.nih.gov/21216395/'],
    ['independent-science-projects.html', 'Bonawitz, E.', 'https://pubmed.ncbi.nlm.nih.gov/21216395/'],
    ['curiosity-and-questions.html', 'Jirout, J.', 'https://doi.org/10.1016/j.dr.2012.04.002'],
    ['starting-homework-routine.html', 'Langberg, J. M.', 'https://pubmed.ncbi.nlm.nih.gov/29172596/'],
    ['teaching-children-at-home.html', 'Grolnick, W. S.', 'https://doi.org/10.1037/0022-0663.81.2.143'],
    ['teaching-children-at-home.html', 'Pomerantz, E. M.', 'https://journals.sagepub.com/doi/10.3102/003465430305567'],
    ['morning-school-reluctance.html', 'COCOLOプラン', 'https://www.mext.go.jp/a_menu/shotou/seitoshidou/1397802_00005.htm'],
    ['skills-for-ai-era.html', '令和の日本型学校教育', 'https://www.mext.go.jp/b_menu/shingi/chukyo/chukyo3/079/sonota/1412985_00002.htm']
];

test('教育記事の出典が同名の研究・公的資料へリンクする', () => {
    for (const [file, title, url] of verifiedReferences) {
        const html = fs.readFileSync(path.join(__dirname, file), 'utf8');
        const paragraphs = [...html.matchAll(/<p\b[^>]*>[\s\S]*?<\/p>/g)].map(match => match[0]);
        const reference = paragraphs.find(paragraph => paragraph.includes(title) && paragraph.includes('<a '));
        assert.ok(reference, `${file}: ${title}の参考文献欄`);
        assert.ok(reference.includes(`href="${url}"`), `${file}: 無関係なPMID・DOIへ戻さない`);
    }
});

test('研究種別と著者名を一次資料と整合させる', () => {
    const teaching = fs.readFileSync(path.join(__dirname, 'teaching-children-at-home.html'), 'utf8');
    assert.match(teaching, /Pomerantz）らの研究レビュー/);
    assert.doesNotMatch(teaching, /Pomerantz）らのメタ分析/);
    const praise = fs.readFileSync(path.join(__dirname, 'how-to-praise-children.html'), 'utf8');
    assert.match(praise, /Brummelman, E\., Thomaes, S\., Orobio de Castro, B\., Overbeek, G\., & Bushman, B\. J\./);
    const math = fs.readFileSync(path.join(__dirname, 'math-difficulty-support.html'), 'utf8');
    assert.match(math, /Balt, M\., Börnert-Ringleb, M\., & Orbach, L\./);
});

test('宿題研究の対象とOECDの定義を取り違えない', () => {
    const homework = fs.readFileSync(path.join(__dirname, 'starting-homework-routine.html'), 'utf8');
    assert.match(homework, /ADHDのある中学生を対象/);
    assert.match(homework, /Journal of Consulting and Clinical Psychology, 86\(1\), 39–55/);
    assert.doesNotMatch(homework, /知能の差ではなく/);
    const ai = fs.readFileSync(path.join(__dirname, 'skills-for-ai-era.html'), 'utf8');
    for (const competency of ['新たな価値を創造すること', '対立やジレンマに対処すること', '責任ある行動をとること']) {
        assert.ok(ai.includes(competency));
    }
});
