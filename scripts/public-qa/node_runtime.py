"""Check the reviewed build runtime, or prepare a local update from Node.js LTS."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import sys
from urllib.request import Request, urlopen


PIN = Path(__file__).resolve().parents[2] / '.node-version'
INDEX = 'https://nodejs.org/dist/index.json'
VERSION = re.compile(r'24\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)')


def exact(text):
    version = text.removesuffix('\n')
    if not VERSION.fullmatch(version):
        raise ValueError('.node-version には承認する Node 24 LTS の完全な x.y.z を1行で指定してください。')
    return version


def components(version):
    return tuple(int(part) for part in version.split('.'))


def latest_lts(releases, current):
    candidates = []
    for release in releases:
        version = release['version'].removeprefix('v')
        if VERSION.fullmatch(version) and release.get('lts') and 'linux-x64' in release.get('files', []):
            candidates.append(version)
    if current not in candidates:
        raise ValueError('固定版を公式のLinux x64 LTS一覧で確認できません。版は変更していません。')
    return max(candidates, key=components)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument('--verify', action='store_true', help='installed Node must match the pin, without network access')
    modes.add_argument('--check', action='store_true', help='report whether a newer stable version is available')
    modes.add_argument('--update', action='store_true', help='write the reviewed release candidate to the local .node-version')
    args = parser.parse_args()
    current = exact(PIN.read_text(encoding='utf8'))
    if args.verify:
        actual = subprocess.check_output(['node', '-p', 'process.versions.node'], text=True, timeout=10).strip()
        if actual != current:
            raise ValueError(f'固定版 {current} と実行中の Node {actual} が一致しません。')
        print(f'Node {current} を使用しています。')
        return 0
    req = Request(INDEX, headers={'Accept':'application/json','User-Agent':'KatakataLab/runtime-check'})
    with urlopen(req, timeout=20) as response:
        latest = latest_lts(json.load(response), current)
    if current == latest:
        print(f'Node {current} は公式の対象LTSの最新版です。')
        return 0
    if args.update:
        PIN.write_bytes((latest + '\n').encode('ascii'))
        print(f'.node-version を {current} から {latest} に更新しました。通常のPRで検証してください。')
        return 0
    print(f'Node {current} → {latest} の更新候補があります。'
          ' python scripts/public-qa/node_runtime.py --update を作業ブランチで実行し、通常のPRで検証してください。')
    return 1


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
        sys.exit(str(error))
