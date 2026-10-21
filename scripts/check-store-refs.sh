#!/bin/bash
set -eu
cd "$(dirname "$0")/.."
[ -d stow ] || { echo "stow/ not found" >&2; exit 2; }
if grep -rlE '/nix/store|/etc/profiles|/run/current-system' stow/; then
  exit 1
fi
