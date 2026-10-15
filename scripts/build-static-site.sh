#!/usr/bin/env bash
set -euo pipefail

source_dir=${1:?Usage: build-static-site.sh SOURCE_DIR OUTPUT_DIR}
output_dir=${2:?Usage: build-static-site.sh SOURCE_DIR OUTPUT_DIR}

mkdir -p "$output_dir"
cp "$source_dir/index.html" "$output_dir/index.html"
cp "$source_dir/competition.html" "$output_dir/competition.html"
cp -R "$source_dir/assets" "$output_dir/assets"