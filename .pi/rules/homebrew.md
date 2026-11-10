---
paths: ["justfile", "bootstrap.sh", "brewfile"]
---

## Homebrew: `/etc/homebrew/brew.env`

brew keeps user config in `$XDG_CONFIG_HOME/homebrew` when that variable is set and falls back to `~/.homebrew` otherwise. fish sets it, but brew also runs without fish's environment — `bootstrap.sh` under `/bin/bash`, `sudo brew`, anything launched by launchd. `/etc/homebrew/brew.env` with `HOMEBREW_XDG_CONFIG_HOME=$HOME/.config` covers all of those: brew loads it at `bin/brew:151`, before it decides the path at `:163`. Under nix-darwin this was what stopped every rebuild recreating `~/.homebrew`, since the activation script ran `sudo --preserve-env=PATH … brew bundle` and dropped everything but `PATH`.

The `brew.env` hierarchy (`/etc/homebrew` → `$HOMEBREW_PREFIX/etc/homebrew` → user) is supported upstream and filters to `HOMEBREW_*` only. `HOMEBREW_XDG_CONFIG_HOME` itself is undocumented and unsettled — Homebrew/brew#20250 was closed unmerged with a maintainer preferring a new `HOMEBREW_CONFIG_HOME`. Check what brew resolves with:

```sh
brew ruby -e 'puts ENV["HOMEBREW_USER_CONFIG_HOME"]'
```
