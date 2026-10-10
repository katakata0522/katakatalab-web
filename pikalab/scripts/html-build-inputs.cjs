'use strict';

const fs = require('node:fs');
const path = require('node:path');

function getHtmlInputs(projectRoot) {
    const root = path.resolve(projectRoot);
    const inputs = {};
    const visit = (directory) => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const name = entry.name;
            if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
            const fullPath = path.resolve(directory, name);
            // リンクだけは従来どおり参照先を判定する。壊れたリンクも黙って無視しない。
            const isDirectory = entry.isSymbolicLink()
                ? fs.statSync(fullPath).isDirectory()
                : entry.isDirectory();
            if (isDirectory) {
                visit(fullPath);
            } else if (name.endsWith('.html')) {
                const inputName = fullPath.replace(root, '').replace(/^[\\/]/, '')
                    .replace(/\.html$/, '').replace(/[\\/]/g, '_');
                inputs[inputName || 'main'] = fullPath;
            }
        }
    };
    visit(root);
    return inputs;
}

module.exports = { getHtmlInputs };
