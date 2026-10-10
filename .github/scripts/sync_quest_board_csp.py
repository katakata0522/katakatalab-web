#!/usr/bin/env python3
"""
quest_board の JSON-LD と CSP(script-src) のハッシュ同期ツール。

使い方:
- 差分確認のみ: python3 .github/scripts/sync_quest_board_csp.py --check
- 自動更新:     python3 .github/scripts/sync_quest_board_csp.py --write
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import os
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
INDEX_FILE = ROOT / "pikalab" / "quest_board" / "index.html"


def read_index() -> str:
    try:
        return INDEX_FILE.read_text(encoding="utf-8")
    except FileNotFoundError:
        print(f"[ERROR] ファイルが見つかりません: {INDEX_FILE}", file=sys.stderr)
        sys.exit(1)
    except OSError as exc:
        print(f"[ERROR] ファイル読込に失敗: {INDEX_FILE} ({exc})", file=sys.stderr)
        sys.exit(1)


def extract_json_ld(source: str) -> str:
    match = re.search(
        r'<script\s+type=["\']application/ld\+json["\']>([\s\S]*?)</script>',
        source,
        flags=re.IGNORECASE,
    )
    if not match:
        print("[ERROR] JSON-LD(script type=application/ld+json) が見つかりません。", file=sys.stderr)
        sys.exit(1)
    return match.group(1)


def compute_sha256(value: str) -> str:
    digest = hashlib.sha256(value.encode("utf-8")).digest()
    return "sha256-" + base64.b64encode(digest).decode("ascii")


def extract_script_src(source: str) -> tuple[str, str]:
    csp_match = re.search(
        r'(<meta\s+http-equiv=["\']Content-Security-Policy["\']\s+content=(["\'])([\s\S]*?)\2)',
        source,
        flags=re.IGNORECASE,
    )
    if not csp_match:
        print("[ERROR] CSPメタタグが見つかりません。", file=sys.stderr)
        sys.exit(1)

    full_meta = csp_match.group(1)
    csp_value = csp_match.group(3)
    script_src_match = re.search(r"(script-src\s+)([^;]+)", csp_value, flags=re.IGNORECASE)
    if not script_src_match:
        print("[ERROR] CSPにscript-srcが見つかりません。", file=sys.stderr)
        sys.exit(1)

    return full_meta, script_src_match.group(2)


def replace_hash_in_script_src(script_src: str, expected_hash: str) -> str:
    if expected_hash in script_src:
        return script_src

    replaced = re.sub(r"'sha256-[^']+'", "", script_src)
    replaced = re.sub(r"\s+", " ", replaced).strip()
    if replaced and not replaced.endswith(" "):
        replaced += " "
    return f"{replaced}'{expected_hash}'".strip()


def sync_csp(source: str, write: bool) -> int:
    json_ld = extract_json_ld(source)
    expected_hash = compute_sha256(json_ld)
    csp_meta, current_script_src = extract_script_src(source)

    if expected_hash in current_script_src:
        print(f"[OK] CSPハッシュ同期済み: {expected_hash}")
        return 0

    if not write:
        print(f"[NG] CSPハッシュ不一致: expected {expected_hash}")
        return 1

    new_script_src = replace_hash_in_script_src(current_script_src, expected_hash)
    new_csp_meta = csp_meta.replace(current_script_src, new_script_src, 1)
    updated_source = source.replace(csp_meta, new_csp_meta, 1)

    try:
        INDEX_FILE.write_text(updated_source, encoding="utf-8")
    except OSError as exc:
        print(f"[ERROR] index.html の書き込みに失敗: {exc}", file=sys.stderr)
        return 1

    print(f"[OK] CSPハッシュを更新しました: {expected_hash}")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="quest_board CSPハッシュ同期")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="差分確認のみ（非更新）")
    mode.add_argument("--write", action="store_true", help="index.html を自動更新")
    return parser.parse_args()


def main() -> int:
    if os.environ.get("KATAKATALAB_RUN_LEGACY_QUEST_CSP_SYNC") != "1":
        print(
            "[DEPRECATED] Quest Boardの現行CSPはunsafe-inline運用のため、"
            "JSON-LD sha256同期器は通常運用から外れています。"
            "厳格なhashベースCSPへ戻す設計変更時だけ明示的に再評価してください。",
            file=sys.stderr,
        )
        return 2

    args = parse_args()
    source = read_index()
    return sync_csp(source, write=args.write)


if __name__ == "__main__":
    sys.exit(main())
