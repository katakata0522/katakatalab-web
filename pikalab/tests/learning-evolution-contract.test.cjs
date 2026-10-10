const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

const speed = require(path.join(root, 'speed_reader/js/comprehension.js'));
const fraction = require(path.join(root, 'fraction_lab/concept-evolution.js'));
const fractionCalculator = require(path.join(root, 'fraction_lab/script.js'));

test('Speed Reader: ライブラリ全作品に設定数の内容チェックがある', () => {
    const constantsPath = path.join(root, 'speed_reader/js/constants.js');
    const constantsSource = fs.readFileSync(constantsPath, 'utf8');
    const context = { globalThis: {} };
    vm.runInNewContext(
        `${constantsSource}\n;globalThis.__speedReaderLibraries = libraries;`,
        context,
        { filename: constantsPath },
    );

    const libraryTitles = Object.values(context.globalThis.__speedReaderLibraries)
        .map((entry) => entry.title)
        .sort();
    const quizTitles = Object.keys(speed.QUIZZES).sort();

    assert.ok(libraryTitles.length > 0, 'Speed Readerのライブラリ作品がありません');
    assert.deepEqual(quizTitles, libraryTitles, '全ライブラリ作品にクイズを用意し、孤立したクイズを残さないでください');

    for (const [title, questions] of Object.entries(speed.QUIZZES)) {
        assert.equal(
            questions.length,
            speed.SPEED_READER_EVOLUTION_CONFIG.QUIZ_COUNT,
            `${title}: 設定された問題数と一致させてください`,
        );
        for (const question of questions) {
            assert.equal(typeof question.q, 'string');
            assert.ok(question.q.length > 0);
            assert.equal(question.o.length, 3);
            assert.ok(Number.isInteger(question.a));
            assert.ok(question.a >= 0 && question.a < question.o.length);
            assert.equal(typeof question.e, 'string');
            assert.ok(question.e.length > 0);
        }
    }
});

test('Fraction Lab: 誤概念チェックは3問で、分数を1つの数として扱う', () => {
    const config = fraction.FRACTION_EVOLUTION_CONFIG;
    assert.equal(config.QUESTIONS.length, 3);
    assert.match(config.EQUAL_PARTITION_COPY, /部分と全体/);
    assert.match(config.EQUAL_PARTITION_COPY, /1つの数/);
    assert.match(config.QUESTIONS[2].explanation, /0と1の間/);
});

test('Fraction Lab: 1を超える和と負の差を入力値のまま計算する', () => {
    assert.deepEqual(
        fractionCalculator.analyzeSameDenominatorOperation(3, 2, 4, 'add'),
        {
            numerator: 5,
            denominator: 4,
            isNegative: false,
            exceedsOne: true,
            fitsSingleUnitPicture: false
        }
    );
    assert.deepEqual(
        fractionCalculator.analyzeSameDenominatorOperation(1, 3, 4, 'subtract'),
        {
            numerator: -2,
            denominator: 4,
            isNegative: true,
            exceedsOne: false,
            fitsSingleUnitPicture: false
        }
    );

    const source = fs.readFileSync(path.join(root, 'fraction_lab/script.js'), 'utf8');
    assert.equal((source.match(/function analyzeSameDenominatorOperation\(/g) || []).length, 1);
    assert.doesNotMatch(source, /n2\s*=\s*d\s*-\s*n1/);
    assert.doesNotMatch(source, /n2\s*=\s*n1\s*;/);
});

test('Deep Sea: 架空の黄金個体を除去し、伝承と科学を分ける契約がある', () => {
    const source = fs.readFileSync(path.join(root, 'deepsea_lab/js/content-evolution.ts'), 'utf8');
    assert.match(source, /REMOVED_CONTENT_IDS[\s\S]*golden_oarfish/);
    assert.match(source, /oarfishEarthquake/);
    assert.match(source, /なぜこんな言い伝えが生まれたんだろう/);
    assert.match(source, /hydrothermal_vent/);
    assert.match(source, /チャレンジャー海淵/);
    assert.doesNotMatch(source, /数百万匹に一匹/);
});

test('Deep Sea: 深度補正と学習補助TSは正式エントリからbundleする', () => {
    const app = fs.readFileSync(path.join(root, 'deepsea_lab/js/app.ts'), 'utf8');
    const vite = fs.readFileSync(path.join(root, 'vite.config.js'), 'utf8');

    const depthImport = app.indexOf("import './depth-consistency';");
    const contentImport = app.indexOf("import './content-evolution';");
    const rendererImport = app.indexOf("import { FieldRenderer }");

    assert.ok(depthImport >= 0, 'depth consistency is imported by app entry');
    assert.ok(contentImport > depthImport, 'content evolution runs after depth normalization');
    assert.ok(rendererImport > contentImport, 'data corrections load before renderer modules');
    assert.doesNotMatch(vite, /\.\/js\/depth-consistency\.ts/);
    assert.doesNotMatch(vite, /\.\/js\/content-evolution\.ts/);
});

test('Vite: JavaScript補助モジュールの既存注入は維持する', () => {
    const source = fs.readFileSync(path.join(root, 'vite.config.js'), 'utf8');
    assert.match(source, /fraction_lab[\s\S]*\.\/concept-evolution\.js/);
    assert.match(source, /speed_reader[\s\S]*\.\/js\/constants\.js/);
    assert.match(source, /speed_reader[\s\S]*\.\/js\/app\.js/);
    assert.match(source, /speed_reader[\s\S]*\.\/js\/comprehension\.js/);
});