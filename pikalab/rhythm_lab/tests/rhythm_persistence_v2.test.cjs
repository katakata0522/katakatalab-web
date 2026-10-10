const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const RhythmLab = require(path.resolve(__dirname, '..', 'script.js'));
const { normalizeSharedProject, deserializeGridData, sanitizePresetItem } = RhythmLab.__test;

function pattern() {
    const value = {
        hihat: new Array(16).fill(0),
        clap: new Array(16).fill(0),
        snare: new Array(16).fill(0),
        tom: new Array(16).fill(0),
        kick: new Array(16).fill(0)
    };
    value.kick[0] = 1;
    return value;
}

test('v2共有はBPMとパターンを保持する', () => {
    const restored = normalizeSharedProject({ schemaVersion: 2, tempo: 173, pattern: pattern() });
    assert.equal(restored.tempo, 173);
    assert.equal(restored.pattern.kick[0], 1);
});

test('旧共有パターンは120 BPMとして読み継ぐ', () => {
    const restored = normalizeSharedProject(pattern());
    assert.equal(restored.tempo, 120);
    assert.equal(restored.pattern.kick[0], 1);
});

test('旧保存作品は120 BPMのv2内部形式へ正規化する', () => {
    const restored = sanitizePresetItem({ name: '旧作品', data: pattern() });
    assert.equal(restored.schemaVersion, 2);
    assert.equal(restored.name, '旧作品');
    assert.equal(restored.tempo, 120);
    assert.equal(restored.data.kick[0], 1);
});

test('v2保存作品はBPMを維持する', () => {
    const restored = sanitizePresetItem({
        schemaVersion: 2,
        id: 'project-1',
        name: '173 BPM',
        tempo: 173,
        pattern: pattern(),
        createdAt: 1,
        updatedAt: 2
    });
    assert.equal(restored.id, 'project-1');
    assert.equal(restored.tempo, 173);
    assert.equal(restored.data.kick[0], 1);
});

test('巨大な共有入力はデコード前に拒否する', () => {
    assert.equal(deserializeGridData('a'.repeat(4097)), null);
});
