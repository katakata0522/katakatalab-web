#!/usr/bin/env python3
"""
PikaLab 構造検証:
- 旧資産が残っていないこと
- 現行アプリ定義の遷移先が存在すること
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PIKALAB_DIR = ROOT / "pikalab"
CONSTANTS_JS = PIKALAB_DIR / "js" / "constants.js"
ES_MODULE_SYNTAX = re.compile(r"^\s*(?:import|export)\b", re.MULTILINE)

LEGACY_PATHS = [
    "pikalab/book-report-generator.html",
    "pikalab/color-lab完成ver1.html",
    "pikalab/Focus .html",
    "pikalab/fraction-lab-plus.html",
    "pikalab/geoquest_japan (2).html",
    "pikalab/kanji-lab-v5.html",
    "pikalab/kanji-lab-v8.html",
    "pikalab/kanji-lab-v9.html",
    "pikalab/paper-generator.html",
    "pikalab/quest-board-maker.html",
    "pikalab/rekishi_gram.html",
    "pikalab/rhythm-lab-final-fixed.html",
    "pikalab/rhythm-lab-final.html",
    "pikalab/science_project_maker .html",
    "pikalab/SpeedReader.html",
    "pikalab/wakuwaku-manabi .html",
    "pikalab/wonder-lab-portal-v7.html",
    "pikalab/実験用",
    "pikalab/pikalaboHP",
]

REQUIRED_CANONICAL_PATHS = [
    "pikalab/index.html",
    "pikalab/style.css",
    "pikalab/js/main.js",
    "pikalab/js/constants.js",
    "pikalab/privacy.html",
    "pikalab/terms.html",
    "pikalab/.htaccess",
]

PLACEHOLDER_MARKERS = [
    "https://example.com/",
    "katakatalab.example.com",
    "TODO: OGP",
]

QUEST_BOARD_INDEX = PIKALAB_DIR / "quest_board" / "index.html"
QUEST_BOARD_OGP = PIKALAB_DIR / "quest_board" / "ogp-quest-board.svg"
SYNC_QUEST_BOARD_CSP = ROOT / ".github" / "scripts" / "sync_quest_board_csp.py"

PIKALAB_APP_RULES: dict[str, dict[str, bool]] = {
    "book_report": {"require_index": True, "require_css": True, "require_js": True},
    "color_lab": {"require_index": True, "require_css": True, "require_js": True},
    "focus_studio": {"require_index": True, "require_css": True, "require_js": True},
    "fraction_lab": {"require_index": True, "require_css": True, "require_js": True},
    "kotowaza_quiz": {"require_index": True, "require_css": True, "require_js": True},
    "manabi_land": {"require_index": True, "require_css": True, "require_js": True},
    "paper_gen": {"require_index": True, "require_css": True, "require_js": True},
    "quest_board": {"require_index": True, "require_css": True, "require_js": True},
    "rhythm_lab": {"require_index": True, "require_css": True, "require_js": True},
    "science_maker": {"require_index": True, "require_css": True, "require_js": True},
    "speed_reader": {"require_index": True, "require_css": True, "require_js": False},
    "typing_dojo": {"require_index": True, "require_css": True, "require_js": True},
}


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        raise
    except UnicodeDecodeError as exc:
        raise
    except OSError as exc:
        print(f"[ERROR] ファイル読込に失敗: {path} ({exc})", file=sys.stderr)
        sys.exit(1)


def check_legacy_paths(errors: list[str]) -> None:
    for rel in LEGACY_PATHS:
        target = ROOT / rel
        if target.exists():
            errors.append(f"旧資産が残存: {rel}")


def check_required_paths(errors: list[str]) -> None:
    for rel in REQUIRED_CANONICAL_PATHS:
        target = ROOT / rel
        if not target.exists():
            errors.append(f"必須ファイル不足: {rel}")


def check_app_urls(errors: list[str]) -> None:
    if not CONSTANTS_JS.exists():
        errors.append("必須ファイル不足: pikalab/js/constants.js")
        return

    source = read_text(CONSTANTS_JS)
    # 例: url: 'color_lab/index.html'
    raw_urls = re.findall(r"url:\s*'([^']+)'", source)
    seen: set[str] = set()

    for raw in raw_urls:
        url = raw.strip()
        if not url or url == "#":
            continue
        if re.match(r"^https?://", url, flags=re.IGNORECASE):
            continue
        if url in seen:
            continue
        seen.add(url)

        target = PIKALAB_DIR / url
        if url.endswith("/"):
            target = target / "index.html"

        if not target.exists():
            errors.append(f"遷移先が存在しません: pikalab/{url}")


def check_placeholder_markers(errors: list[str]) -> None:
    for html_file in PIKALAB_DIR.rglob("*.html"):
        if "node_modules" in html_file.parts or "dist" in html_file.parts:
            continue
        source = read_text(html_file)
        rel = html_file.relative_to(ROOT).as_posix()
        for marker in PLACEHOLDER_MARKERS:
            if marker in source:
                errors.append(f"プレースホルダが残存: {rel} ({marker})")


def local_reference_exists(html_file: Path, clean_ref: str) -> bool:
    """ソース直下とViteのpublic公開ルートの両方で参照先を確認する。"""
    if clean_ref.startswith("/"):
        target = ROOT / clean_ref.lstrip("/")
    else:
        target = html_file.parent / clean_ref

    if target.exists():
        return True
    if clean_ref.startswith("/"):
        return False

    try:
        rel_to_pikalab = html_file.relative_to(PIKALAB_DIR)
    except ValueError:
        return False

    public_target = PIKALAB_DIR / "public" / rel_to_pikalab.parent / clean_ref
    return public_target.exists()


def check_manifest_links(errors: list[str]) -> None:
    manifest_pattern = re.compile(
        r'<link[^>]+rel=["\']manifest["\'][^>]+href=["\']([^"\']+)["\']',
        flags=re.IGNORECASE,
    )

    for html_file in PIKALAB_DIR.rglob("*.html"):
        if "node_modules" in html_file.parts or "dist" in html_file.parts:
            continue
        source = read_text(html_file)
        rel = html_file.relative_to(ROOT).as_posix()
        for raw_href in manifest_pattern.findall(source):
            href = raw_href.strip()
            if not href:
                continue
            if re.match(r"^https?://", href, flags=re.IGNORECASE):
                continue
            if href.startswith("data:"):
                continue

            clean_href = href.split("?", 1)[0].split("#", 1)[0]
            if not clean_href:
                continue

            if not local_reference_exists(html_file, clean_href):
                errors.append(f"manifest参照切れ: {rel} -> {clean_href}")


def is_external_ref(ref: str) -> bool:
    lowered = ref.lower()
    return (
        lowered.startswith("http://")
        or lowered.startswith("https://")
        or lowered.startswith("//")
        or lowered.startswith("data:")
        or lowered.startswith("mailto:")
        or lowered.startswith("javascript:")
        or lowered.startswith("#")
    )


def check_local_asset_links(errors: list[str]) -> None:
    asset_pattern = re.compile(
        r'<(?:script|link|img)\b[^>]+(?:src|href)=["\']([^"\']+)["\']',
        flags=re.IGNORECASE,
    )

    for html_file in PIKALAB_DIR.rglob("*.html"):
        if "node_modules" in html_file.parts or "dist" in html_file.parts:
            continue
        source = read_text(html_file)
        rel = html_file.relative_to(ROOT).as_posix()

        for raw_ref in asset_pattern.findall(source):
            ref = raw_ref.strip()
            if not ref or is_external_ref(ref):
                continue

            clean_ref = ref.split("?", 1)[0].split("#", 1)[0]
            if not clean_ref:
                continue

            if local_reference_exists(html_file, clean_ref):
                continue

            errors.append(f"ローカル参照切れ: {rel} -> {clean_ref}")


def check_js_syntax(errors: list[str]) -> None:
    js_files = sorted([f for f in PIKALAB_DIR.rglob("*.js") if "node_modules" not in f.parts and "dist" not in f.parts])
    if not js_files:
        errors.append("JSファイルが見つかりません: pikalab/**/*.js")
        return

    for js_file in js_files:
        rel = js_file.relative_to(ROOT).as_posix()
        try:
            source = read_text(js_file)
        except UnicodeDecodeError:
            errors.append(f"JS構文エラー: {rel} (UTF-8以外のエンコーディングが検出されました。ファイルをUTF-8で保存し直してください)")
            continue
        command = ["node", "--check", str(js_file)]
        stdin = None
        if ES_MODULE_SYNTAX.search(source):
            command = ["node", "--input-type=module", "--check"]
            stdin = source

        try:
            proc = subprocess.run(
                command,
                input=stdin,
                capture_output=True,
                text=True,
                encoding="utf-8",
                check=False,
            )
        except FileNotFoundError:
            errors.append("node コマンドが見つかりません。JS構文チェックを実行できません。")
            return

        if proc.returncode != 0:
            stderr = (proc.stderr or "").strip()
            first_line = stderr.splitlines()[0] if stderr else "構文エラー"
            errors.append(f"JS構文エラー: {rel} ({first_line})")


def check_maintenance_docs(errors: list[str]) -> None:
    for app_name in PIKALAB_APP_RULES:
        maintenance = PIKALAB_DIR / app_name / "MAINTENANCE.md"
        if not maintenance.exists():
            errors.append(f"保守ドキュメント不足: pikalab/{app_name}/MAINTENANCE.md")


def check_app_structure(errors: list[str]) -> None:
    for app_name, rules in PIKALAB_APP_RULES.items():
        app_dir = PIKALAB_DIR / app_name
        if not app_dir.exists():
            errors.append(f"アプリディレクトリ不足: pikalab/{app_name}")
            continue

        if rules.get("require_index", False):
            index_file = app_dir / "index.html"
            if not index_file.exists():
                errors.append(f"必須ファイル不足: pikalab/{app_name}/index.html")

        if rules.get("require_css", False):
            css_file = app_dir / "style.css"
            if not css_file.exists():
                errors.append(f"必須ファイル不足: pikalab/{app_name}/style.css")

        if rules.get("require_js", False):
            js_file = app_dir / "script.js"
            if not js_file.exists():
                errors.append(f"必須ファイル不足: pikalab/{app_name}/script.js")


def check_quest_board_metadata(errors: list[str]) -> None:
    if not QUEST_BOARD_INDEX.exists():
        errors.append("必須ファイル不足: pikalab/quest_board/index.html")
        return

    source = read_text(QUEST_BOARD_INDEX)
    rel = QUEST_BOARD_INDEX.relative_to(ROOT).as_posix()

    if not QUEST_BOARD_OGP.exists():
        errors.append("必須ファイル不足: pikalab/quest_board/ogp-quest-board.svg")

    required_markers = [
        'name="twitter:image"',
        'property="og:image"',
        'property="og:url"',
    ]
    for marker in required_markers:
        if marker not in source:
            errors.append(f"メタ情報不足: {rel} ({marker})")


def check_quest_board_modal_accessibility(errors: list[str]) -> None:
    if not QUEST_BOARD_INDEX.exists():
        return

    source = read_text(QUEST_BOARD_INDEX)
    rel = QUEST_BOARD_INDEX.relative_to(ROOT).as_posix()

    required_markers = [
        'id="help-modal"',
        'role="dialog"',
        'aria-modal="true"',
        'aria-labelledby="help-modal-title"',
        'aria-controls="help-modal"',
        'id="help-close-btn"',
    ]

    for marker in required_markers:
        if marker not in source:
            errors.append(f"モーダル属性不足: {rel} ({marker})")


def check_quest_board_csp_hash(errors: list[str]) -> None:
    if not QUEST_BOARD_INDEX.exists() or not SYNC_QUEST_BOARD_CSP.exists():
        return

    rel = QUEST_BOARD_INDEX.relative_to(ROOT).as_posix()
    try:
        proc = subprocess.run(
            [sys.executable, str(SYNC_QUEST_BOARD_CSP), "--check"],
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError as exc:
        errors.append(f"CSPチェック実行失敗: {rel} ({exc})")
        return

    if proc.returncode != 0:
        stderr = (proc.stderr or "").strip()
        stdout = (proc.stdout or "").strip()
        detail = stderr or stdout or "ハッシュ不一致"
        errors.append(f"CSPハッシュ不一致: {rel} ({detail})")


def check_style_css_content(errors: list[str]) -> None:
    style_css = PIKALAB_DIR / "style.css"
    if not style_css.exists():
        return

    try:
        source = read_text(style_css)
    except (FileNotFoundError, UnicodeDecodeError):
        errors.append("pikalab/style.css をUTF-8のCSSとして読み込めません")
        return

    # ファイル容量ではなく、PikaLabの生HTMLが依存する代表Tailwindユーティリティを確認する。
    required_patterns = {
        "flex": r"\.flex\s*\{\s*display\s*:\s*flex",
        "grid": r"\.grid\s*\{\s*display\s*:\s*grid",
        "hidden": r"\.hidden\s*\{\s*display\s*:\s*none",
        "min-h-screen": r"\.min-h-screen\s*\{",
    }
    missing = [
        label
        for label, pattern in required_patterns.items()
        if not re.search(pattern, source, flags=re.IGNORECASE)
    ]
    if missing:
        errors.append(
            "pikalab/style.css に共有表示で必要な生成CSSが不足しています: "
            + ", ".join(missing)
        )


def main() -> int:
    errors: list[str] = []

    check_legacy_paths(errors)
    check_required_paths(errors)
    check_app_structure(errors)
    check_maintenance_docs(errors)
    check_app_urls(errors)
    check_placeholder_markers(errors)
    check_manifest_links(errors)
    check_local_asset_links(errors)
    check_js_syntax(errors)
    check_quest_board_metadata(errors)
    check_quest_board_modal_accessibility(errors)
    check_style_css_content(errors)

    if errors:
        print("[NG] PikaLab 構造検証に失敗しました。")
        for idx, err in enumerate(errors, start=1):
            print(f"{idx}. {err}")
        return 1

    print("[OK] PikaLab 構造検証に成功しました。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
