#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
export XDG_CONFIG_HOME="$HOME/.config"
if [ ! -x /opt/homebrew/bin/brew ]; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
eval "$(/opt/homebrew/bin/brew shellenv)"
brew list just >/dev/null 2>&1 || brew install just
exec just setup
