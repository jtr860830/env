---
paths: ["config/fish/**", "config/tealdeer/**", "config/ghostty/**"]
---

# Environment Variables

Findings behind the variables `conf.d/env.fish` sets and the files that depend on them. Moved out of `AGENTS.md` on 2026-11-10 so they load only when those files are edited; Codex does not see this file unless it opens it.

## Go

`go` comes from the brewfile. `GOPATH` (`~/.local/share/go`) and `GOBIN` (`~/.local/bin`) are plain environment variables in `conf.d/env.fish`, written with `$XDG_DATA_HOME`/`$HOME`.

They used to live in the file `go env` reads (`~/Library/Application Support/go/env` on Darwin), stowed from the repo. That file **cannot use variables**: Go reads it literally, so `$HOME/...` and `${HOME}/...` fail with `GOPATH entry is relative; must be absolute path` and `~/...` with `cannot start with shell metacharacter '~'` — and a bad `GOPATH` there breaks every `go` command, not just `go env`. Keeping it meant a hardcoded `/Users/jtr860830`; moving to the environment trades that for one limit, accepted: only processes started from fish see the variables, so an editor launched from the Dock falls back to Go's default `~/go`. nvim and gopls start from fish. `go env -w` now writes the ordinary file at the default location, not the repo.

`go telemetry` reports `local`, Go's default — counters on disk, nothing uploaded without an explicit `go telemetry on`.

## XDG on macOS

Outside the XDG directories (`.config`, `.cache`, `.local`), `$HOME` holds only `.ssh` (OpenSSH hardcodes it) and macOS's `.Trash`. The usual macOS leak is not a dotfile but `~/Library`: Go's `os.UserCacheDir`/`os.UserConfigDir` and Rust's `dirs` crate return `~/Library/Caches` and `~/Library/Application Support` on Darwin and ignore `XDG_*` entirely, so a tool that honours XDG on Linux can still write to `~/Library` here. Each fix below names a variable that was confirmed with `strings` on the installed binary before use:

- `GOCACHE=$XDG_CACHE_HOME/go-build` and `GOPLSCACHE=$XDG_CACHE_HOME/gopls` — both had been under `~/Library/Caches`
- `GOMODCACHE=$XDG_CACHE_HOME/go/mod` — the module cache defaults to `$GOPATH/pkg/mod`, i.e. DATA, but it is a re-downloadable cache
- `_ZO_DATA_DIR=$XDG_DATA_HOME/zoxide` — zoxide kept `db.zo` in `~/Library/Application Support/zoxide`; it was moved, not recreated
- tealdeer's cache — `cache_dir = "~/.cache/tealdeer"` in the stowed `config/tealdeer/.config/tealdeer/config.toml`. `TEALDEER_CACHE_DIR` works but 1.9.1 prints a deprecation warning on every call; the config file expands `~` (tested) but not `$HOME`, and has no way to read `XDG_CACHE_HOME`, so the default value is written out
- `RTK_DB_PATH=$XDG_STATE_HOME/rtk/history.db` and `RTK_TEE_DIR=$XDG_CACHE_HOME/rtk/tee` — rtk's 90-day savings history is action history, so STATE; the tee spool of failed commands' full output is disposable, so CACHE. Both read from `src/core/user_dirs.rs`; `RTK_CONFIG_DIR` looks like the config override but only redirects pipeline loading, verified — `rtk config` still names `~/Library/Application Support/rtk/config.toml`
- `HOMEBREW_CACHE=$HOME/.cache/homebrew` — in `/etc/homebrew/brew.env` beside `HOMEBREW_XDG_CONFIG_HOME`, not in fish, for the same reason (see `## Homebrew` in AGENTS.md)

Left as is: the rest of rtk's directory (`config.toml`, hook markers, trust store — `dirs::config_dir()`/`data_local_dir()`, which read no `XDG_*` on macOS and have no override), lima's download cache (`~/Library/Caches/lima` — the binary reads no cache variable), `~/Library/Caches/goimports` (no variable found), Go's own `env` file (see `## Go`), and Claude Code and Codex, which take one directory each and keep transcripts and caches inside it. Like `GOPATH`, the fish-set variables reach only processes started from fish.

## Terminfo

`TERMINFO_DIRS=/opt/homebrew/opt/ncurses/share/terminfo` in `conf.d/env.fish`; `ncurses` is in the brewfile but keg-only, so its nine binaries (`clear`, `tput`, `infocmp`, …) do not shadow Apple's. Homebrew's database has 2,896 entries against the system's 2,684 — the same count nixpkgs' had — including `alacritty` and `wezterm`. ncurses searches `TERMINFO_DIRS` **plus the default compiled into each binary**, so macOS binaries still reach `/usr/share/terminfo` as well; `/usr/bin/infocmp -D` prints the effective list. Ghostty also exports `TERMINFO` pointing into its app bundle, which is searched first. Count entries by path (`find … \( -type f -o -type l \)`); `find -type f` alone skips the symlinked aliases and inflates the difference into the hundreds.

## Man Pages

This repo sets no `MANPATH`, but one is present in every shell anyway. Ghostty exports `MANPATH=:<Ghostty.app>/Contents/Resources/ghostty/../man` to its children (the tmux server holds it; the Ghostty process itself does not), and because it is set, fish's built-in `__fish_macos_set_env` then rebuilds it the way `path_helper` would — `/etc/manpaths` and `/etc/manpaths.d/*` (Wireshark) first, the inherited entries after, and an empty element appended. That empty element is what matters: macOS's `/usr/bin/man` is a mandoc front end that expands it to its own default search, derived from `PATH`, so Homebrew's pages (`man -w rg`) and the system's (`man -w ls`) both resolve, and sections 2 and 3 — which macOS no longer ships in `/usr/share/man` — come from the Command Line Tools SDK (`man -w 2 open`). Under home-manager a `MANPATH` without that empty element had hidden every macOS manual. `MANPAGER` is `nvim +Man!`.

**Do not install Homebrew's `mandoc`.** It is 1.14.6 (upstream's last release, 2021), not keg-only, so its `man`/`apropos`/`whatis` would land in `/opt/homebrew/bin` ahead of Apple's; upstream mandoc expands the empty element to its own compiled-in defaults, which know neither `/opt/homebrew/share/man` nor the SDK. `/usr/bin/mandoc` is already there for `-T html` or `-T lint`.

## Stale Environments

A long-lived tmux server keeps the environment it started with. New panes still get every variable `conf.d/env.fish` sets, because each pane starts a fresh fish that sources it (verified: `env -u GOCACHE fish -c` restores the value); what stays stale until `tmux kill-server` is only what the server itself inherited and passes to processes that are not fish, and anything removed from `env.fish` but still in the server's environment. Under home-manager this was worse — `hm-session-vars.fish` returned early on an inherited `__HM_SESS_VARS_SOURCED` — and that guard is gone, since `env.fish` sets everything unconditionally.

### GUI Apps Launched From a Terminal

A tmux server is not the only thing that pins a stale environment. macOS `open` **passes the caller's environment to the GUI app**, and everything that app later launches inherits it — so `open -a Alfred` from inside tmux gives Alfred `TMUX`, and `TERM=tmux-256color`, and a Ghostty launched from that Alfred hands the same set to every shell in it. Quitting and reopening the *terminal* does not help; the pollution lives upstream in the launcher.

The failure does not name its cause:

- stale `TMUX` — when fish started tmux behind an `if not set -q TMUX` guard, an inherited value made a new window land in a bare fish with no tmux. Ghostty's `command` now clears it with `env -u TMUX`, so this one no longer bites

Read what an app is actually holding with `ps -Eww -o command= -p <pid>`; `launchctl getenv` shows only the launchd session and stays empty in this case. A Finder- or Dock-launched app gets launchd's environment (about a dozen variables — `HOME` `PATH` `USER` `SHELL` `TMPDIR` `SSH_AUTH_SOCK` `XPC_*` …), which is the baseline to compare against. To relaunch one cleanly from a shell, give it that set explicitly rather than subtracting offenders one at a time:

```sh
env -i HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" PATH=/usr/bin:/bin:/usr/sbin:/sbin \
  TMPDIR="$TMPDIR" __CF_USER_TEXT_ENCODING="$__CF_USER_TEXT_ENCODING" open -a "<App>"
```
