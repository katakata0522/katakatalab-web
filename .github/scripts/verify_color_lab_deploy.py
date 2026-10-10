#!/usr/bin/env python3
"""color_lab の配信成果物と本番反映を照合するスクリプト。"""

from __future__ import annotations

import argparse
import hashlib
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import unquote, urlparse


COLOR_LAB_INDEX = "color_lab/index.html"
SCRIPT_SRC_RE = re.compile(r'<script\b[^>]*\bsrc\s*=\s*["\']([^"\']+)["\'][^>]*>', re.IGNORECASE)
LINK_TAG_RE = re.compile(r'<link\b[^>]*>', re.IGNORECASE)
ATTRIBUTE_RE_TEMPLATE = r'\b{name}\s*=\s*["\']([^"\']+)["\']'


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonicalize_text_bytes(data: bytes) -> bytes:
    """テキスト資産の改行差異を吸収して比較する。"""
    return data.replace(b"\r\n", b"\n").replace(b"\r", b"\n")


def resolve_artifact_root(repo_root: Path, value: str) -> Path:
    candidate = Path(value)
    artifact_root = candidate if candidate.is_absolute() else repo_root / candidate
    artifact_root = artifact_root.resolve()
    repo_root = repo_root.resolve()
    try:
        artifact_root.relative_to(repo_root)
    except ValueError as exc:
        raise ValueError(f"配信成果物はリポジトリ内を指定してください: {artifact_root}") from exc
    if not artifact_root.is_dir():
        raise ValueError(f"配信成果物が見つかりません: {artifact_root}")
    return artifact_root


def get_attribute(tag: str, name: str) -> str:
    pattern = re.compile(ATTRIBUTE_RE_TEMPLATE.format(name=re.escape(name)), re.IGNORECASE)
    match = pattern.search(tag)
    return match.group(1) if match else ""


def resolve_local_reference(artifact_root: Path, source_file: Path, reference: str) -> str | None:
    parsed = urlparse(reference.strip())
    if not parsed.path or parsed.scheme or parsed.netloc:
        return None

    clean_path = unquote(parsed.path)
    if clean_path.startswith("/pikalab/"):
        target = artifact_root / clean_path[len("/pikalab/") :]
    elif clean_path.startswith("/"):
        return None
    else:
        target = source_file.parent / clean_path

    target = target.resolve()
    try:
        relative = target.relative_to(artifact_root.resolve())
    except ValueError as exc:
        raise ValueError(f"配信成果物外への参照を拒否します: {reference}") from exc

    if not target.is_file():
        raise FileNotFoundError(f"配信成果物の参照先がありません: {relative.as_posix()}")
    return relative.as_posix()


def collect_color_lab_targets(artifact_root: Path) -> list[str]:
    index_path = artifact_root / COLOR_LAB_INDEX
    if not index_path.is_file():
        raise FileNotFoundError(f"配信成果物にColor Lab HTMLがありません: {index_path}")

    html = index_path.read_text(encoding="utf-8")
    targets = {COLOR_LAB_INDEX}

    references = list(SCRIPT_SRC_RE.findall(html))
    for tag in LINK_TAG_RE.findall(html):
        rel = {token.lower() for token in get_attribute(tag, "rel").split()}
        if "stylesheet" not in rel:
            continue
        href = get_attribute(tag, "href")
        if href:
            references.append(href)

    for reference in references:
        resolved = resolve_local_reference(artifact_root, index_path, reference)
        if resolved:
            targets.add(resolved)

    if len(targets) < 2:
        raise ValueError("Color Labのローカルscript/stylesheet参照を配信成果物から検出できません")
    return sorted(targets)


def load_local_bytes(artifact_root: Path, relative_path: str) -> bytes:
    file_path = artifact_root / relative_path
    if not file_path.is_file():
        raise FileNotFoundError(f"配信成果物に対象がありません: {file_path}")
    return file_path.read_bytes()


def load_remote_bytes(base_url: str, relative_path: str) -> bytes:
    url = f"{base_url.rstrip('/')}/pikalab/{relative_path}?verify_ts={int(time.time() * 1000)}"
    req = urllib.request.Request(
        url,
        headers={
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "User-Agent": "KatakataLab-ColorLab-Deploy-Verification/3.0",
        },
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read()


def verify_once(artifact_root: Path, base_url: str, targets: list[str]) -> tuple[bool, list[str]]:
    messages: list[str] = []
    all_ok = True
    for relative_path in targets:
        try:
            local_bytes = load_local_bytes(artifact_root, relative_path)
            remote_bytes = load_remote_bytes(base_url, relative_path)
        except (OSError, urllib.error.URLError, TimeoutError) as exc:
            all_ok = False
            messages.append(f"[NG] pikalab/{relative_path}: 取得失敗 ({exc})")
            continue

        local_hash = sha256_bytes(canonicalize_text_bytes(local_bytes))
        remote_hash = sha256_bytes(canonicalize_text_bytes(remote_bytes))
        if local_hash != remote_hash:
            all_ok = False
            messages.append(
                f"[NG] pikalab/{relative_path}: hash不一致 artifact={local_hash[:12]} remote={remote_hash[:12]}"
            )
        else:
            messages.append(f"[OK] pikalab/{relative_path}: 配信成果物と一致")
    return all_ok, messages


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify deployed color_lab files against the built artifact.")
    parser.add_argument("--base-url", default="https://katakatalab.com", help="公開サイトのベースURL")
    parser.add_argument(
        "--artifact-root",
        default="pikalab/dist",
        help="リポジトリルート基準のPikaLab配信成果物ディレクトリ",
    )
    parser.add_argument("--retries", type=int, default=3, help="本番取得の一時失敗に対する検証回数")
    parser.add_argument("--interval", type=int, default=3, help="検証リトライ間隔（秒）")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    try:
        artifact_root = resolve_artifact_root(repo_root, args.artifact_root)
        targets = collect_color_lab_targets(artifact_root)
    except (OSError, UnicodeError, ValueError) as exc:
        print(f"[NG] 配信成果物の検証対象を確定できません: {exc}")
        return 1

    print(f"[INFO] Color Lab配信照合対象: {', '.join(targets)}")
    retries = max(1, args.retries)
    interval = max(1, args.interval)

    for attempt in range(1, retries + 1):
        ok, messages = verify_once(artifact_root, args.base_url, targets)
        print(f"[INFO] deploy verify attempt={attempt}/{retries}")
        for message in messages:
            print(message)
        if ok:
            print("[OK] color_lab のHTMLと参照script/stylesheetが配信成果物と一致しました。")
            return 0
        if attempt < retries:
            time.sleep(interval)

    print("[NG] color_lab の配信成果物と本番の一致を確認できませんでした。")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
