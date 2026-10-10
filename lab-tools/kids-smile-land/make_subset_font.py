"""
Kids Smile Land DX - Font Subset Script
Kiwi Maru TTF -> WOFF2 (subset of chars used in the app)
"""

import subprocess
import sys
import os

SOURCE_FILES = ["index.html", "app.js", "style.css"]

# Build character set
chars = set()

# Basic ASCII printable
for c in range(0x20, 0x7F):
    chars.add(chr(c))

# Hiragana U+3041-U+3096
for c in range(0x3041, 0x3097):
    chars.add(chr(c))

# Katakana U+30A1-U+30F6
for c in range(0x30A1, 0x30F7):
    chars.add(chr(c))

# CJK punctuation & symbols
for ch in "。、・「」『』【】（）〜！？　…ー〜・：；．，":
    chars.add(ch)

# Full-width digits & symbols
for ch in "０１２３４５６７８９":
    chars.add(ch)

# Kanji used in the app
for ch in "年月日時分秒回数合正解問題難易度設定音量高低速遅早新初保護者大中小知育学習平仮名読上絵描木琴動物鳴声答選択遊記録証書印刷全部消完璧始終開閉戻切替次前上下左右":
    chars.add(ch)

# Collect from source files
print("=== Step 1: Collecting characters from source files ===")
for filename in SOURCE_FILES:
    if os.path.exists(filename):
        with open(filename, encoding="utf-8", errors="ignore") as f:
            content = f.read()
        before = len(chars)
        for ch in content:
            cp = ord(ch)
            if cp >= 0x20 and cp != 0x7F:
                chars.add(ch)
        added = len(chars) - before
        print(f"  {filename}: +{added} chars (total {len(chars)})")
    else:
        print(f"  [SKIP] {filename} not found")

# Build unicode list
unicodes = sorted(ord(c) for c in chars)
unicode_str = ",".join("U+{:04X}".format(cp) for cp in unicodes)
print("\nTotal chars: {}".format(len(unicodes)))

# Step 2: Subset + WOFF2 conversion
FONTS = [
    ("kiwimaru-400.ttf", "kiwimaru-400.woff2"),
    ("kiwimaru-500.ttf", "kiwimaru-500.woff2"),
]

print("\n=== Step 2: Subsetting & converting to WOFF2 ===")

for ttf, woff2 in FONTS:
    if not os.path.exists(ttf):
        print("  [SKIP] {} not found".format(ttf))
        continue

    size_before = os.path.getsize(ttf)
    print("\n  {} ({:.0f} KB) -> {}".format(ttf, size_before / 1024, woff2))

    cmd = [
        sys.executable, "-m", "fontTools.subset",
        ttf,
        "--unicodes={}".format(unicode_str),
        "--output-file={}".format(woff2),
        "--flavor=woff2",
        "--layout-features=*",
        "--no-hinting",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        size_after = os.path.getsize(woff2)
        pct = (1 - size_after / size_before) * 100
        print("  OK: {:.0f} KB ({:.1f}% reduction)".format(size_after / 1024, pct))
    else:
        print("  ERROR:\n" + result.stderr)

print("\nDone. Update style.css @font-face to use .woff2 files.")
