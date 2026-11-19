---
paths: ["config/fish/**/conf.d/env.fish", "config/fish/**/functions/wget.fish", "config/npm/**"]
---

# Environment Variables

Findings behind the variables `conf.d/env.fish` sets and the files that depend on them. Moved out of `AGENTS.md` on 2026-11-10 so they load only when matching config is read or edited.

## Go

`go` comes from the brewfile. `GOPATH` (`~/.local/share/go`) and `GOBIN` (`~/.local/bin`) are plain environment variables in `conf.d/env.fish`, written with `$XDG_DATA_HOME`/`$HOME`.

They used to live in the file `go env` reads (`~/Library/Application Support/go/env` on Darwin), stowed from the repo. That file **cannot use variables**: Go reads it literally, so `$HOME/...` and `${HOME}/...` fail with `GOPATH entry is relative; must be absolute path` and `~/...` with `cannot start with shell metacharacter '~'` — and a bad `GOPATH` there breaks every `go` command, not just `go env`. Keeping it meant a hardcoded `/Users/jtr860830`; moving to the environment trades that for one limit, accepted: only processes started from fish see the variables, so an editor launched from the Dock falls back to Go's default `~/go`. nvim and gopls start from fish. `go env -w` now writes the ordinary file at the default location, not the repo.

`go telemetry` reports `local`, Go's default — counters on disk, nothing uploaded without an explicit `go telemetry on`.

## XDG on macOS

Outside the XDG directories (`.config`, `.cache`, `.local`), `$HOME` holds only `.ssh` (OpenSSH hardcodes it) and macOS's `.Trash`. The usual macOS leak is not a dotfile but `~/Library`: Go's `os.UserCacheDir`/`os.UserConfigDir` and Rust's `dirs` crate return `~/Library/Caches` and `~/Library/Application Support` on Darwin and ignore `XDG_*` entirely, so a tool that honours XDG on Linux can still write to `~/Library` here. Each fix below names a variable that was confirmed with `strings` on the installed binary before use:

- `GOCACHE=$XDG_CACHE_HOME/go-build` and `GOPLSCACHE=$XDG_CACHE_HOME/gopls` — both had been under `~/Library/Caches`
- `GOMODCACHE=$XDG_CACHE_HOME/go/mod` — the module cache defaults to `$GOPATH/pkg/mod`, i.e. DATA, but it is a re-downloadable cache
- `_ZO_DATA_DIR=$XDG_DATA_HOME/zoxide` — zoxide kept `db.zo` in `~/Library/Application Support/zoxide`; it was moved, not recreated
- `RTK_DB_PATH=$XDG_STATE_HOME/rtk/history.db` and `RTK_TEE_DIR=$XDG_CACHE_HOME/rtk/tee` — rtk's 90-day savings history is action history, so STATE; the tee spool of failed commands' full output is disposable, so CACHE. Both read from `src/core/user_dirs.rs`; `RTK_CONFIG_DIR` looks like the config override but only redirects pipeline loading, verified — `rtk config` still names `~/Library/Application Support/rtk/config.toml`
- `HOMEBREW_CACHE=$HOME/.cache/homebrew` — in `/etc/homebrew/brew.env` beside `HOMEBREW_XDG_CONFIG_HOME`, not in fish, because brew also runs without fish's environment (`bootstrap.sh` under `/bin/bash`, `sudo brew`, launchd); see `docs/homebrew.md`

Left as is: the rest of rtk's directory (`config.toml`, hook markers, trust store — `dirs::config_dir()`/`data_local_dir()`, which read no `XDG_*` on macOS and have no override), lima's download cache (`~/Library/Caches/lima` — the binary reads no cache variable), `~/Library/Caches/goimports` (no variable found), Go's own `env` file (see `## Go`), and Claude Code and Codex, which take one directory each and keep transcripts and caches inside it. Like `GOPATH`, the fish-set variables reach only processes started from fish.

## pi

`PI_CODING_AGENT_DIR=$XDG_CONFIG_HOME/pi` and `PI_CODING_AGENT_SESSION_DIR=$XDG_DATA_HOME/pi/sessions`: pi has no XDG handling and upstream closed the request as wontfix, so these two variables are the permanent answer. Why sessions go to DATA rather than STATE, and everything else about pi, is in `docs/pi.md`. `PI_HARDWARE_CURSOR=1` is the terminal's cursor in pi's input, a setting kept here rather than in pi's local `settings.json` (`docs/pi-ui.md`).

## npm and Node

npm reads `NPM_CONFIG_USERCONFIG=~/.config/npm/npmrc` (stowed), with `NODE_REPL_HISTORY` beside it in `env.fish`. `COREPACK_HOME` was dropped on 2026-10-28: Node 25 stopped bundling corepack, `corepack` is not on `PATH` under Node 26, and nothing reads the variable. `WGETRC` went the same day — it pointed at an empty, unmanaged `~/.config/wgetrc` from 2023; wget's one XDG need, the HSTS file, is the `--hsts-file=$XDG_CACHE_HOME/wget-hsts` in `functions/wget.fish`.

## Terminfo

`TERMINFO_DIRS=/opt/homebrew/opt/ncurses/share/terminfo:/usr/local/share/terminfo` in `conf.d/env.fish`, written as one colon-joined string because fish does not split this variable. The second directory holds Rex's `xterm-rex`, which `just etc` compiles (`docs/rex.md`). Homebrew's `tic` writes a newer format for an entry that holds a number above 32767, and Apple's tools cannot read it: `alacritty` and `wezterm` from Homebrew's database are "unknown terminal" to `/usr/bin/tput` and serve only programs linked against Homebrew's ncurses. Its other entries, and anything written by `/usr/bin/tic`, are read by both. `ncurses` is in the brewfile but keg-only, so its nine binaries (`clear`, `tput`, `infocmp`, …) do not shadow Apple's. Homebrew's database has 2,896 entries against the system's 2,684, including `alacritty` and `wezterm`. ncurses searches `TERMINFO_DIRS` **plus the default compiled into each binary**, so macOS binaries still reach `/usr/share/terminfo` as well; `/usr/bin/infocmp -D` prints the effective list. Ghostty also exports `TERMINFO` pointing into its app bundle, which is searched first. Count entries by path (`find … \( -type f -o -type l \)`); `find -type f` alone skips the symlinked aliases and inflates the difference into the hundreds.

## Man Pages

This repo sets no `MANPATH`. In a Rex terminal none is set at all, and macOS's `/usr/bin/man`, a mandoc front end, uses its own default search, derived from `PATH`. In Ghostty one is present anyway: Ghostty exports `MANPATH=:<Ghostty.app>/Contents/Resources/ghostty/../man` to its children, and because it is set, fish's built-in `__fish_macos_set_env` rebuilds it the way `path_helper` would — `/etc/manpaths` and `/etc/manpaths.d/*` first, the inherited entries after, and an empty element appended, which `man` expands to that same default search. Either way Homebrew's pages (`man -w rg`) and the system's (`man -w ls`) both resolve, and sections 2 and 3 — which macOS no longer ships in `/usr/share/man` — come from the Command Line Tools SDK (`man -w 2 open`). `MANPAGER` is `nvim +Man!`.

**Do not install Homebrew's `mandoc`.** It is 1.14.6 (upstream's last release, 2021), not keg-only, so its `man`/`apropos`/`whatis` would land in `/opt/homebrew/bin` ahead of Apple's; upstream mandoc expands the empty element to its own compiled-in defaults, which know neither `/opt/homebrew/share/man` nor the SDK. `/usr/bin/mandoc` is already there for `-T html` or `-T lint`.

## Stale Environments

The Rex server is long-lived, and a long-lived server keeps the environment it started with. Here launchd starts it, so it holds launchd's dozen variables and a few `REX_SERVER*` of its own, nothing from a shell. A terminal starts a fresh fish that sources `conf.d/env.fish`, and a command given to `rex new` goes through the login shell's environment and gets the same variables; only `--shell=none` hands a process the server's bare environment. `env.fish` sets everything unconditionally. A server started by hand from a shell (`rex server start`) would instead keep that shell's environment until it stops.

### GUI Apps Launched From a Terminal

macOS `open` **passes the caller's environment to the GUI app**, and everything that app later launches inherits it — so `open -a Alfred` from a terminal gives Alfred that terminal's `TERM` and session variables, and a terminal launched from that Alfred hands the same set to every shell in it. Quitting and reopening the *terminal* does not help; the pollution lives upstream in the launcher.

The failure does not name its cause. Read what an app is actually holding with `ps -Eww -o command= -p <pid>`; `launchctl getenv` shows only the launchd session and stays empty in this case. A Finder- or Dock-launched app gets launchd's environment (about a dozen variables — `HOME` `PATH` `USER` `SHELL` `TMPDIR` `SSH_AUTH_SOCK` `XPC_*` …), which is the baseline to compare against. To relaunch one cleanly from a shell, give it that set explicitly rather than subtracting offenders one at a time:

```sh
env -i HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" PATH=/usr/bin:/bin:/usr/sbin:/sbin \
  TMPDIR="$TMPDIR" __CF_USER_TEXT_ENCODING="$__CF_USER_TEXT_ENCODING" open -a "<App>"
```
