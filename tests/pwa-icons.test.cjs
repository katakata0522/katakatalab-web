'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('本体PWAのSVGアイコンには実寸192pxと512pxのPNG予備がある', () => {
  for (const manifestPath of ['manifest.json', 'pikalab/public/manifest.webmanifest']) {
    const file = path.join(root, manifestPath);
    const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.ok(manifest.icons.some(icon => icon.type === 'image/svg+xml'));
    for (const size of [192, 512]) {
      const icon = manifest.icons.find(icon => icon.type === 'image/png' && icon.sizes === `${size}x${size}`);
      assert.ok(icon, manifestPath + ': PNG予備が必要');
      const bytes = fs.readFileSync(path.resolve(path.dirname(file), icon.src));
      assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.equal(bytes.toString('ascii', 12, 16), 'IHDR');
      assert.equal(bytes.readUInt32BE(16), size);
      assert.equal(bytes.readUInt32BE(20), size);
    }
  }
});
