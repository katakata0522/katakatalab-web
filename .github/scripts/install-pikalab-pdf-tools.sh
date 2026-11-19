#!/usr/bin/env bash
set -euo pipefail

# PythonとPopplerはUbuntu mainにある。配布元が応答しないときは同じ署名付きアーカイブの次のミラーを使う。
sources=$(mktemp --suffix=.sources)
mirrors=$(mktemp)
trap 'rm -f -- "$sources" "$mirrors"' EXIT
printf '%s\tpriority:%d\n' \
    'https://archive.ubuntu.com/ubuntu/' 1 \
    'https://azure.archive.ubuntu.com/ubuntu/' 2 \
    'https://mirrors.edge.kernel.org/ubuntu/' 3 > "$mirrors"
chmod 644 "$mirrors"
# SuitesとSigned-Byは固定イメージの設定を保持し、securityを含む全索引の検証を必須にする。
sed -e 's/^Components:.*/Components: main/' -e "s|^URIs:.*|URIs: mirror+file:$mirrors|" \
    /etc/apt/sources.list.d/ubuntu.sources > "$sources"
apt_sources=(-o "Dir::Etc::sourcelist=$sources" -o "Dir::Etc::sourceparts=-"
    -o Acquire::https::Timeout=8 -o Acquire::Retries=0)
apt-get "${apt_sources[@]}" -o Acquire::Languages=none -o APT::Update::Error-Mode=any update
apt-get "${apt_sources[@]}" install -y --no-install-recommends python3 poppler-utils
