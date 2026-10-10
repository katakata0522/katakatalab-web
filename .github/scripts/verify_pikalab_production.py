#!/usr/bin/env python3
"""PikaLabトップと公開カタログ掲載Labのデプロイ後スモークテスト。"""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urljoin, urlparse


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = REPOSITORY_ROOT / "pikalab" / "js" / "app-data.json"
ANALYTICS_MARKERS = (
    "googletagmanager.com",
    "google-analytics.com",
    "gtag(",
    "adsbygoogle",
    "doubleclick.net",
)


@dataclass(frozen=True)
class Target:
    label: str
    relative_url: str
    expected_canonical: str
    requires_noindex: bool


def load_targets(base_url: str) -> list[Target]:
    data = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    apps = [app for app in data.get("apps", []) if not app.get("isAmazonCard")]
    if not apps:
        raise ValueError("公開Labカタログが空です")

    pikalab_base = f"{base_url.rstrip('/')}/pikalab/"
    targets = [
        Target(
            label="PikaLabトップ",
            relative_url="pikalab/",
            expected_canonical=pikalab_base,
            requires_noindex=False,
        )
    ]

    seen_ids: set[str] = set()
    seen_urls: set[str] = set()
    for app in apps:
        app_id = str(app.get("id", "")).strip()
        relative = str(app.get("url", "")).strip()
        if not app_id or app_id in seen_ids:
            raise ValueError(f"不正または重複したLab ID: {app_id!r}")
        if not relative or relative == "#" or relative in seen_urls:
            raise ValueError(f"不正または重複したLab URL: {relative!r}")
        if urlparse(relative).scheme or relative.startswith("//"):
            raise ValueError(f"外部URLは本番スモークテスト対象にできません: {relative}")

        seen_ids.add(app_id)
        seen_urls.add(relative)
        canonical = urljoin(pikalab_base, relative)
        targets.append(
            Target(
                label=app_id,
                relative_url=f"pikalab/{relative}",
                expected_canonical=canonical,
                requires_noindex=not bool(app.get("indexable")),
            )
        )

    return targets


def fetch_html(base_url: str, target: Target) -> str:
    url = urljoin(f"{base_url.rstrip('/')}/", target.relative_url)
    separator = "&" if "?" in url else "?"
    request = urllib.request.Request(
        f"{url}{separator}verify_ts={int(time.time() * 1000)}",
        headers={
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "User-Agent": "KatakataLab-PikaLab-Deploy-Verification/1.0",
        },
    )
    with urllib.request.urlopen(request, timeout=25) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def verify_html(target: Target, html: str) -> list[str]:
    errors: list[str] = []
    if not re.search(r"<title>\s*[^<]+\s*</title>", html, flags=re.IGNORECASE):
        errors.append("titleが見つからない")
    if not re.search(r"<h1\b", html, flags=re.IGNORECASE):
        errors.append("h1が見つからない")

    canonical_match = re.search(
        r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']',
        html,
        flags=re.IGNORECASE,
    )
    if not canonical_match:
        errors.append("canonicalが見つからない")
    elif canonical_match.group(1) != target.expected_canonical:
        errors.append(
            f"canonical不一致 expected={target.expected_canonical} actual={canonical_match.group(1)}"
        )

    robots_match = re.search(
        r'<meta[^>]+name=["\']robots["\'][^>]+content=["\']([^"\']+)["\']',
        html,
        flags=re.IGNORECASE,
    )
    robots_content = robots_match.group(1).lower() if robots_match else ""
    if target.requires_noindex and "noindex" not in robots_content:
        errors.append("現行方針のnoindexが見つからない")
    if not target.requires_noindex and "noindex" in robots_content:
        errors.append("index対象ページが意図せずnoindexになっている")

    lowered = html.lower()
    for marker in ANALYTICS_MARKERS:
        if marker in lowered:
            errors.append(f"子ども向け画面で禁止している解析・広告マーカーを検出: {marker}")

    return errors


def verify_once(base_url: str, targets: list[Target]) -> tuple[bool, list[str]]:
    messages: list[str] = []
    all_ok = True
    for target in targets:
        try:
            html = fetch_html(base_url, target)
        except (OSError, UnicodeError, urllib.error.URLError, TimeoutError) as exc:
            all_ok = False
            messages.append(f"[NG] {target.label}: 取得失敗 ({exc})")
            continue

        errors = verify_html(target, html)
        if errors:
            all_ok = False
            for error in errors:
                messages.append(f"[NG] {target.label}: {error}")
        else:
            messages.append(f"[OK] {target.label}: 公開状態を確認")
    return all_ok, messages


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify PikaLab production pages after deploy.")
    parser.add_argument("--base-url", default="https://katakatalab.com")
    # rsync直後の一時的なHTTP揺らぎだけを吸収する。query-bust/no-cache済みなので、
    # 長時間の再試行は決定的なHTML不整合の発見を遅らせるだけになる。
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--interval", type=int, default=3)
    args = parser.parse_args()

    try:
        targets = load_targets(args.base_url)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"[NG] 検証対象の読み込みに失敗しました: {exc}")
        return 1

    retries = max(1, args.retries)
    interval = max(1, args.interval)
    for attempt in range(1, retries + 1):
        ok, messages = verify_once(args.base_url, targets)
        print(f"[INFO] PikaLab deploy verify attempt={attempt}/{retries}")
        for message in messages:
            print(message)
        if ok:
            print(f"[OK] PikaLabトップと公開中{len(targets) - 1} Labを確認しました。")
            return 0
        if attempt < retries:
            time.sleep(interval)

    print("[NG] PikaLabのデプロイ後検証に失敗しました。")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
