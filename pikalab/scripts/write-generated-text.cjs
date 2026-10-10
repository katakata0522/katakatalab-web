'use strict';

const fs = require('node:fs');

// 既に読み込んだ本文も受け取り、生成処理の重複read/writeを避ける。
// キャッシュは持たず、別の実行での変更や欠損は必ず再確認する。
function writeGeneratedText(filePath, content, previousContent) {
    if (previousContent === undefined) {
        try {
            previousContent = fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }
    if (previousContent === content) return false;
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
}

module.exports = { writeGeneratedText };
