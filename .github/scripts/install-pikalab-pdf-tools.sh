#!/usr/bin/env bash
set -euo pipefail

# PythonとPopplerはUbuntu mainにある。公式イメージの署名鍵、更新・セキュリティ配布元を引き継ぐ。
sources=$(mktemp --suffix=.sources)
trap 'rm -f -- "$sources"' EXIT
sed -e 's/^Components:.*/Components: main/' -e 's|http://|https://|g' \
    /etc/apt/sources.list.d/ubuntu.sources > "$sources"
apt_sources=(-o "Dir::Etc::sourcelist=$sources" -o "Dir::Etc::sourceparts=-")
apt-get "${apt_sources[@]}" -o Acquire::Languages=none -o APT::Update::Error-Mode=any update
apt-get "${apt_sources[@]}" install -y --no-install-recommends python3 poppler-utils
