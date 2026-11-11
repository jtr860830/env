---
paths: ["justfile", "bootstrap.sh", "brewfile"]
---

## Homebrew: `/etc/homebrew/brew.env`

brew keeps user config in `$XDG_CONFIG_HOME/homebrew` when that variable is set and falls back to `~/.homebrew` otherwise. fish sets it, but brew also runs without fish's environment — `bootstrap.sh` under `/bin/bash`, `sudo brew`, anything launched by launchd. `/etc/homebrew/brew.env` with `HOMEBREW_XDG_CONFIG_HOME=$HOME/.config` covers all of those: brew loads it at `bin/brew:151`, before it decides the path at `:163`. `HOMEBREW_CACHE=$HOME/.cache/homebrew` sits beside it for the same reason. Under nix-darwin this was what stopped every rebuild recreating `~/.homebrew`, since the activation script ran `sudo --preserve-env=PATH … brew bundle` and dropped everything but `PATH`.

The `brew.env` hierarchy (`/etc/homebrew` → `$HOMEBREW_PREFIX/etc/homebrew` → user) is supported upstream and filters to `HOMEBREW_*` only. `HOMEBREW_XDG_CONFIG_HOME` itself is undocumented and unsettled — Homebrew/brew#20250 was closed unmerged with a maintainer preferring a new `HOMEBREW_CONFIG_HOME`. Check what brew resolves with:

```sh
brew ruby -e 'puts ENV["HOMEBREW_USER_CONFIG_HOME"]'
```

## Keg-Only Formulae: Link, Never Add to `PATH`

`brew "rustup", link: true` in the brewfile makes `brew bundle install` run `brew link --force`, so `cargo`/`rustc`/`rustfmt`/`rust-analyzer` land in `/opt/homebrew/bin` and run the toolchains already in `RUSTUP_HOME` (`stable` and `nightly`, default `nightly`). Adding `/opt/homebrew/opt/rustup/bin` to `PATH` was tried and rejected — the `PATH` list in `conf.d/env.fish` is fixed by design (`docs/fish.md`). Any other keg-only formula that needs exposing follows the same `link: true` route.

Linked (decided 2026-10-21 from fish history — 4,665 entries since 2022-02 — and actual consumers):

- **`curl`** — in regular use (last 2026-07); brew's 8.23 (OpenSSL, HTTP/3) over Apple's 8.7.1 (LibreSSL).
- **`llvm`** — puts brew's `clang`, `clang++`, `clangd` and `clang-format` ahead of Apple's. `clang-format` was the real gap: conform formats C with it and macOS ships none, so C formatting silently failed. Do not also install the standalone `clang-format` formula — it is the same 23.x binary and the two would fight over `/opt/homebrew/bin/clang-format`. Verified after linking: brew's `clang`/`clang++` find the SDK and build C and C++, and conform formats a C buffer. `brew link --dry-run llvm` reports a conflict with protobuf's `share/emacs/site-lisp`; it is spurious — the trees are disjoint and the real link succeeds.
- **`rustup`** — see above.

Deliberately not linked: `ncurses` (only its terminfo database is wanted; linking would shadow nine Apple binaries — see `docs/env.md`) and `openjdk` (`java`/`javac`/`mvn` last used 2022, so `java` stays Apple's stub). The gnubin formulae (`make`, `gnu-sed`, `inetutils`) are not keg-only: brew already ships them prefixed (`gmake`, `gsed`, `gping`) in `/opt/homebrew/bin`, and the unprefixed names stay Apple's — which is why scripts in this repo must run under BSD tools (`sed -i ''`). Tools that are not keg-only (`ssh` from `openssh`, `git`, `python3`) already win from `/opt/homebrew/bin`.

## Bundle

`just clean` runs `brew bundle cleanup --force` and removes anything not listed. `mas` apps cannot be uninstalled by bundle cleanup, and an App Store update glitch (`Failed to update app for ADAM ID …`) does not fail `brew bundle` — check with `just check`.

Formula names that differ from their nixpkgs attribute: `clang-tools` → `llvm`, `gnumake` → `make`, `gnused` → `gnu-sed`, `jdk` → `openjdk`, `kubectl` → `kubernetes-cli`, `kubernetes-helm` → `helm`, `python3` → `python@3.15` (canonical name, so bundle cleanup matches the installed keg). `mandoc` is not installed: macOS's `/usr/bin/man` already drives mandoc, and Homebrew's would shadow it (`docs/env.md`, `## Man Pages`).
