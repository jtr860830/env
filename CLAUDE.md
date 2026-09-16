# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Personal system configuration repository for macOS (ARM). Managed entirely with **nix-darwin + home-manager**. Repo lives at `~/.config/env`. No stow, no brewfile.

## House Style

**No comments in config files.** Single-user repo — the reasoning lives here in CLAUDE.md instead, where it does not have to be maintained alongside the code. Do not add explanatory comments back when editing; put the finding in this file.

`home/default.nix`'s `imports` is alphabetical for the same reason, and the ordering is free: reordering it leaves the system derivation hash byte-identical, because the module system merges options regardless of import order. It had drifted into accretion order — each module appended as it was written — which is how a list stops being scannable.

`home/packages.nix` is one flat alphabetical list, no category headers. Categories were tried and dropped: they invited endless boundary arguments (is `atac` networking or API tooling? is `gnused` a build tool?), and only 2 of 17 groups ever stayed sorted, so neither lookup nor insertion was predictable. Flat means both are.

The only surviving comment is `flake.nix`'s commented-out `nixosConfigurations` entry, which is a placeholder for a future Linux host rather than prose.

## Applying Changes

```sh
darwin-rebuild switch --flake ~/.config/env
```

## Nix Quirks

- `environment.shells = [ pkgs.fish ]` is **required** alongside `programs.fish.enable = true` — nix-darwin does not auto-add fish to `/etc/shells`
- Touch ID for sudo: `security.pam.services.sudo_local.touchIdAuth = true`
- Nix flakes only include git-tracked files — must `git add` new files before rebuild

## Modules vs `home.packages`

`programs.<x>.enable = true` installs the package itself — **never also list it in `home/packages.nix`**. `home.path` uses `pkgs.buildEnv` without `ignoreCollisions`, and some modules install a wrapped derivation rather than the plain package, so a duplicate can become a hard build failure if the two ever diverge.

Currently enabled: `fish` `git` `neovim` `ssh` `tmux` `zoxide`.

`bat` and `delta` were removed. Neither had another consumer — the man pager is `nvim +Man!`, fzf-lua uses its own builtin previewer, and delta bundles its own syntect so it never needed bat installed. Reading a file with syntax highlighting is something Neovim does better, and for diffs it has twelve fzf-lua git pickers plus `mini.diff`.

Git's own diff is also the *better* choice under a switching theme: it emits nothing but ANSI indices (`\e[31m` `\e[32m` `\e[36m` `\e[1m`, verified — no `38;2;R;G;B` anywhere), so it follows the terminal palette for free, where delta would have needed `BAT_THEME` wired into the fish theme function. `diff.colorMoved=zebra` stays palette-only too, if a richer diff is ever wanted.

`core.pager = nvim` was tried and rejected. It needs five overrides — `nonumber norelativenumber signcolumn=no laststatus=0` plus clearing dropbar's winbar — before it stops looking like an editor that opened a diff by mistake, and it gets no syntax highlighting in exchange: the `diff` parser in `nvim-treesitter-grammars` is out of sync with the queries in `nvim-treesitter`, so `vim.treesitter.start()` fails with `Invalid node type "change"` and the `pcall` in `treesitter.lua` swallows it.

`programs.ssh` is the **only exception** — its `package` defaults to `null` ("use the system client"), so `home/ssh.nix` sets `package = pkgs.openssh;` explicitly.

## Cross-Platform Nix Patterns

- Platform conditionals: `if pkgs.stdenv.hostPlatform.isDarwin then ... else ...`
- Conditional lists: `lib.optionals pkgs.stdenv.hostPlatform.isDarwin [ ... ]`
- **`stdenv.isDarwin` is the deprecated spelling** and emits `evaluation warning: stdenv.isDarwin is deprecated, use stdenv.hostPlatform.isDarwin instead` on every rebuild under nixpkgs 26.11. The shorthand is an alias that nixpkgs plans to drop, so always reach through `hostPlatform`; the same applies to `isLinux`, `isAarch64` and the rest of the `is*` family.
- 1Password SSH sign path: macOS `/Applications/1Password.app/Contents/MacOS/op-ssh-sign`, Linux `/opt/1Password/op-ssh-sign`
- **`nix.channel.enable = false`** in `darwin/default.nix`, because this repo is flakes-only. nix-darwin's default `nixPath` carries `/nix/var/nix/profiles/per-user/root/channels`, a directory that only ever gets created by `nix-channel` — so every rebuild printed `warning: Nix search path entry … does not exist, ignoring`. Disabling channels drops that entry and takes `nix-channel` with it; `nixpkgs=flake:nixpkgs` stays, so `<nixpkgs>` still resolves to the locked input and `nix-shell -p` keeps working.

## Known nixpkgs Packaging Issues

- `kubernetes-helm` (4.2.0): build fails with `substitute(): ERROR: file '...dependency_build_test.go' does not exist` — workaround: `(kubernetes-helm.overrideAttrs { doCheck = false; })`
- `container` (Darwin): nixpkgs does not symlink `libexec/` into the nix profile — `container-apiserver` fails with `cannot find any plugins with type network`. Package is kept but non-functional until upstream fixes the packaging.

## Waiting on Upstream

Better approaches that exist but are not usable yet. Each line gives the check that says whether it has landed, so none of this needs re-deriving.

- **tmux 3.8 replaces the theme hooks.** Its `CHANGES FROM 3.7b TO 3.8` adds a `theme` option (`terminal`/`light`/`dark`), `theme*` colour names such as `themeblack`, and format expansion inside style values — which collapses `tmux/dark.conf`, `tmux/light.conf` and both `client-*-theme` hooks into inline `#{?#{==:#{client_theme},light},…,…}` conditionals. nixpkgs pins 3.7c (3.7b → 3.7c was a patch release, not the feature bump), where `tmux show-options -g theme` still answers `invalid option` and `set -g status-style fg=themeblack` still answers `invalid style`; when both stop erroring, the design recorded in the `theme` skill can be simplified.
- **Ghostty 1.4 may make a status bar possible.** 1.3.1 has no such option among its 200 config keys, and the closest surfaces (`title`, `window-subtitle`) take a literal string or a fixed enum. The 1.4 roadmap promises scriptability and "a true Tmux control mode" but says nothing about a status bar; the open request is [Discussion #2421](https://github.com/ghostty-org/ghostty/discussions/2421). Control mode is the more interesting half — it would render tmux windows as native tabs rather than duplicating tmux's bar. Expect roughly September 2026 on the 6-month cycle from 1.3.0.
- **The `diff` treesitter parser is out of sync with its queries.** `vim.treesitter.start()` on a diff buffer fails with `Invalid node type "change"` from `(change) @diff.delta`, and `treesitter.lua`'s `pcall` swallows it. Of the 25 languages checked, `diff` is the only one affected, so nothing that gets edited is impacted — but re-check after a nixpkgs bump, since the same mismatch could move to another language:

  ```sh
  nvim --headless -c 'lua for _, l in ipairs { "go","nix","python","typescript","lua","yaml","helm","diff","markdown","json","bash","rust","c" } do
    if pcall(vim.treesitter.language.add, l) then
      local ok, err = pcall(vim.treesitter.query.get, l, "highlights")
      if not ok then print(l .. ": " .. tostring(err):match("Invalid node type [^\n]*")) end
    end end print "done"' -c qa
  ```

- **fish theme files cannot hold the whole palette.** `~/.config/fish/themes/*.theme` takes `[light]`/`[dark]` sections and `fish_config theme choose` follows the terminal from them, which would be more idiomatic than a hand-written handler — but theme files only set `fish_color_*`/`fish_pager_color_*`, so `pure_color_*`, `EZA_COLORS` and `LS_COLORS` would still need one. Worth revisiting only if a shipped theme is ever seen setting something outside those two prefixes.

Deliberately declined rather than blocked, kept here so they are not re-proposed as if new: `snacks.scroll` (smooth scrolling, installed and un-`setup()`); `@variable`/`Identifier` → plain foreground, Zed's one portable idea, which would take light-mode variables from 3.51 to 10.86 but moves further from One Dark Pro's style; hardening `interactiveShellInit`'s `if not set -q TMUX` to also check the socket is live; `column.ui = "auto"`, which fights `branch.sort = "-committerdate"`; and writing an own theme rather than hosting on onedarkpro, scoped at 327 highlight groups of which 69 are pure links.

## Git Conventions

- Commit style: `type: description` (e.g. `feat:`, `chore:`, `fix:`)
- Git signs commits via 1Password SSH agent (ED25519)
- Default branch is `main`, matching `init.defaultBranch` in `home/git.nix`. Renamed from `master` on 2026-08-15 with GitHub's `branches/{branch}/rename` API, which moves the default and leaves redirects behind — `flake.nix`'s `nix-darwin/master` is upstream's branch and is unrelated.

## Go

`programs.go` in `home/go.nix` installs the compiler and owns `GOPATH`/`GOBIN`, so `go` left `home/packages.nix` and both variables left `home/env.nix`. `gopls` stays a plain package — the module covers the toolchain, not the language server.

**This module configures Go through Go's own mechanism rather than the environment.** It writes the values to the file `go env` reads, which on Darwin is `~/Library/Application Support/go/env` — the module disables its `xdg.configFile."go/env"` branch on Darwin and enables the `home.file` one, because that is where `go env GOENV` actually points. Verified: with no `GOPATH` anywhere in the environment, `go env GOPATH` still answers `~/.local/share/go`.

Two consequences follow from that, both deliberate:

- **`GOPATH` and `GOBIN` are no longer environment variables.** Anything reading them straight from the environment will not see them; anything asking `go env` — which is how `gopls` and modern tooling resolve them — will. `home/fish.nix` hardcodes `${config.xdg.dataHome}/go/bin` in `PATH` and never derived it from `GOBIN`, so `PATH` is unaffected.
- **`go env -w` stops working.** home-manager installs the env file as a read-only store symlink, and writing fails with `go: writing go env config: open …: permission denied`. Reading is unaffected. This is the same trade refused for Codex's `config.toml`, and accepted here because Go's env file holds settings this repo wants declared, while Codex's holds state its own subcommands write.

`programs.go.telemetry.mode` is available and deliberately unset: `go telemetry` reports `local`, Go's default, which collects counters on disk and uploads nothing without an explicit `go telemetry on`. `programs.go.packages` can also place sources under `GOPATH/src`, which is unused here.

## Homebrew

Casks and Mac App Store apps are declared in `darwin/homebrew.nix`. `cleanup = "zap"` is intentional — removes anything not listed. Generates `Warning: --cleanup is deprecated` from Homebrew; nix-darwin upstream issue, functional but unfixable without upstream change.

### Activation Environment

The activation script runs `sudo --preserve-env=PATH --user=… env brew bundle`, so **only `PATH` survives** — every other variable set for the interactive shell is absent when brew runs. This is hardcoded in nix-darwin's module; there is no option to inject environment variables.

Consequence: brew fell back to `$HOME/.homebrew` for its user config (it prefers `XDG_CONFIG_HOME`, which sudo drops), creating that directory on every rebuild while `brew` run by hand did not. Fixed by writing `/etc/homebrew/brew.env` via `environment.etc`, which brew loads at `bin/brew:151` — before it decides the path at `:163`:

```nix
environment.etc."homebrew/brew.env".text = ''
  HOMEBREW_XDG_CONFIG_HOME=${homeDir}/.config
'';
```

The `brew.env` hierarchy (`/etc/homebrew` → `$HOMEBREW_PREFIX/etc/homebrew` → user) is supported upstream and filters to `HOMEBREW_*` only. `HOMEBREW_XDG_CONFIG_HOME` itself is undocumented and unsettled — Homebrew/brew#20250 was closed unmerged with a maintainer preferring a new `HOMEBREW_CONFIG_HOME`. Variables in `BIN_BREW_EXPORTED_VARS` (including `HOMEBREW_USER_CONFIG_HOME`) cannot be set this way.

Check what brew actually resolves with:

```sh
brew ruby -e 'puts ENV["HOMEBREW_USER_CONFIG_HOME"]'
```

## Manual Setup

Steps a rebuild cannot perform — local UI state, app preferences and licences:

- **Alfred** — enter the Powerpack licence; point the sync folder at iCloud, which restores workflows, themes and preferences; set the theme for *both* light and dark appearance (see below); set the hotkey to `⌘Space`; turn off System Settings → Keyboard → Keyboard Shortcuts → Spotlight → "Show Spotlight search", which otherwise owns that key.

Alfred's config is **deliberately not in this repo**. Its sync folder moves the whole `Alfred.alfredpreferences` bundle — app-owned mutable state that Alfred writes to directly, which is a different model from the declarative source the rest of the repo holds. iCloud handles it instead. The licence, clipboard database and usage data sit *outside* that bundle, so nothing secret travels with it.

**Do not try to disable the Spotlight hotkey declaratively.** It lives at `AppleSymbolicHotKeys` key `64` in `com.apple.symbolichotkeys`, and `system.defaults.CustomUserPreferences` emits `defaults write <domain> <key> <plist>` — a whole-dict *replacement*, which would wipe the other ~50 hotkey entries (Mission Control, screenshots, input sources…). `PlistBuddy -c "Set :AppleSymbolicHotKeys:64:enabled false"` edits in place and would work, but needs `killall cfprefsd` for the preference cache and re-runs on every rebuild — not worth it for a one-time toggle.

`⌘` combinations never reach programs inside the terminal (macOS handles them at the app layer), so they are the safe modifier for global hotkeys; `⌃` and `⌥` do reach tmux and Neovim — `⌃Space` is already blink.cmp's completion trigger and `⌥hjkl` is mini.move.

## Shadowing macOS System Binaries

**Intentional — do not "fix" this.** `/etc/profiles/per-user/$USER/bin` sits before `/usr/bin` in the fish PATH, so nix-provided tools win. Both newer upstream versions and GNU-over-BSD behavior are wanted.

Notable overrides: `make` (GNU 4.4.1 vs macOS 3.81), `sed` (GNU vs BSD — GNU `sed -i` takes no argument), `ssh` (OpenSSH 10.4p1/OpenSSL vs 10.2p1/LibreSSL), `git`, `curl`, `python3`, `clangd`, the `java`/`j*` set (from `jdk`), and `ping`/`hostname`/`ifconfig`/`whois`/`traceroute` (from `inetutils`).

List the full set with:

```sh
P=/etc/profiles/per-user/$USER/bin
for f in "$P"/*; do b=$(basename "$f"); for d in /usr/bin /bin /usr/sbin /sbin; do [ -e "$d/$b" ] && echo "$b -> $d/$b" && break; done; done
```

## Container Stack

Fully migrated to podman. `podman machine` manages the Linux VM — no colima/Docker Desktop needed. lima is kept for general-purpose Linux VMs (not container-related). `podlet` converts existing container defs to Quadlet/k8s YAML format.

## Theme

All colour and appearance work — the sourcing ladder, which contrast instrument applies to which comparison, the light/dark switching mechanism, onedarkpro's limits and traps, and Alfred's theme design — lives in the `theme` skill (`.claude/skills/theme/SKILL.md`). Load it before changing any colour; every value there was measured and should not be re-derived.

## Path-Scoped Rules

Three bodies of guidance were moved out of this file into `.claude/rules/`, where a `paths` frontmatter key loads each one only when a matching file is actually being edited. Nothing was dropped — every measured finding and negative result is still recorded, just not in every session's context.

| File | Loads when editing | Covers |
|------|--------------------|--------|
| `.claude/rules/neovim.md` | `nvim/**`, `home/neovim.nix` | the 0.11+/0.12 LSP API, LspAttach patterns, mini.nvim's per-module `setup()` traps, nerd font icons and the `nr2char` requirement, keymap organisation, formatters, snacks, sign column, fzf-lua colours, startup timings, and what is deliberately absent |
| `.claude/rules/tmux.md` | `home/tmux.nix` | the style/format quirks, `message-style` needing `fill=`, extended-keys negotiation, and which options the module already emits |
| `.claude/rules/fish.md` | `home/fish.nix` | why `PATH` is written outright rather than appended, the ordering table and collision check, and the valid `fish_color_*`/`pure_color_*`/`EZA_COLORS` names |

Same reasoning as the `theme` skill above: measured values that are expensive to re-derive but irrelevant most of the time. Prefer this mechanism over adding another always-loaded section when new guidance is tied to one file.

## Ghostty Shell Integration

`shell-integration = none` — disabled; tmux handles working directory and pane management, making all features redundant.
Available features: `cursor`, `sudo`, `title`, `ssh-env`, `ssh-terminfo`, `path`. In tmux `TERM=tmux-256color` so `ssh-env` TERM conversion does not trigger.
Verify integration is actually loaded: `fish -c 'functions __ghostty_setup'` — returns "not loaded" if disabled correctly. `$GHOSTTY_SHELL_FEATURES` is set by Ghostty process itself and is not a reliable indicator.

## Key Keybinding Patterns

Tmux handles all split and pane management. No custom Ghostty keybindings — tmux workflow makes them redundant. Tmux prefix is `Ctrl+B`.

Ghostty requires `macos-option-as-alt = true` (set under `lib.optionalString pkgs.stdenv.hostPlatform.isDarwin`) for `<A-*>` keybindings to work in Neovim on macOS — without it, Option sends special characters instead.

## Terminfo

Managed via `pkgs.ncurses` in nix — no manual `~/.local/share/terminfo/` needed. Set in `home/env.nix`:

```nix
TERMINFO_DIRS = "${pkgs.ncurses}/share/terminfo";
```

Referencing `${pkgs.ncurses}` in a nix expression automatically includes it in the closure — no need to add it to `home.packages`.

**This plain assignment deliberately overrides `targets/darwin/terminfo.nix`, which is unconditionally active on Darwin and sets the same variable with `mkDefault`.** That module's own comment warns that "once `TERMINFO_DIRS` is set, ncurses stops searching the default system path", which reads like the `MANPATH` trap below — it is not the same situation, and the override should stay.

`infocmp -D` prints the search path a binary will actually use, and shows that ncurses searches `TERMINFO_DIRS` **plus whatever default was compiled into that particular binary**. Under the assignment above:

```
nix-built infocmp  →  <ncurses>/share/terminfo
/usr/bin/infocmp   →  <ncurses>/share/terminfo
                      /usr/share/terminfo
```

So macOS binaries keep reaching the system database on their own, and nothing is truncated. Comparing the two trees by path — **not** with `find -type f`, which silently skips the symlinked aliases that make up much of the nix tree and inflates the difference into the hundreds — nix ships 2,896 entries against the system's 2,684. Only four exist solely in `/usr/share/terminfo`: `2621a`, `hp2621a`, `hp70092a` and `tt505-22`, all 1980s HP and Teletype hardware, and even those stay reachable from macOS binaries. In the other direction nix has 216 the system lacks, including `alacritty` and `wezterm`.

**Do not "fix" this by adopting the module default.** It points at `${profileDirectory}/share/terminfo`, which is empty here precisely because ncurses is a closure reference rather than an installed package — adopting it trades 2,896 entries for 0 and loses the 216 nix-only ones. Making it work means putting `ncurses` in `home.packages`, which shadows nine macOS binaries that currently all resolve to `/usr/bin`: `captoinfo` `clear` `infocmp` `infotocap` `reset` `tabs` `tic` `tput` `tset`. That is a system-wide behaviour change bought for four obsolete terminal definitions.

`$HOME/.terminfo` does not exist here and is searched before `TERMINFO_DIRS` when it does, which is where a terminal that ships its own entry would land.

## Man Pages

`programs.man.mandoc.enable = true` with `man-db.enable = false` (in `home/env.nix`; `MANPAGER` stays in `home/neovim.nix` with `EDITOR`/`VISUAL`). man-db writes `~/.manpath` — a hardcoded path with no XDG support upstream — which was the only entry in `$HOME` outside `.cache` `.config` `.local` `.ssh` `.Trash`. mandoc keeps its cache in `~/.local/share/mandoc/man` instead, so `apropos` still works with nothing left in the home directory.

- fish enables `programs.man.generateCaches` via `mkDefault true` so `man` completion can use `apropos`; a plain assignment overrides it
- mandoc ignores `MANWIDTH`, so `:Man` pages hard-wrap at 80 columns instead of filling the window — the only functional difference. Lookup, rendering, headings, cross-references and overstrike highlighting are unchanged
- man-db derives its search path from `$PATH` automatically; **mandoc requires `MANPATH`**, which the module sets via `home.sessionSearchVariables`
- **The module puts *only* its own cache in `MANPATH`, and setting the variable at all stops mandoc consulting the system defaults** — so every macOS manual silently disappeared, including all 1,171 pages of section 1. `apropos` kept working, which is why the original switch looked clean. `home/env.nix` therefore appends two more entries:

  ```nix
  home.sessionSearchVariables.MANPATH = lib.optionals pkgs.stdenv.hostPlatform.isDarwin [
    "/usr/share/man"
    "/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/share/man"
  ];
  ```

  The second is needed because **macOS no longer ships sections 2 and 3 in `/usr/share/man`** — `man2` and `man3` there are empty directories, and the system-call and libc manuals live in the Command Line Tools SDK instead (264 pages under `MacOSX.sdk`). `MacOSX.sdk` is a symlink that upstream repoints on upgrade (currently `MacOSX26.5.sdk`), so hardcoding that name is stable — do not pin a version. Verify with `man 2 open`, which should print `System Calls Manual`; `xcrun --show-sdk-path` reports the same path if it ever needs re-deriving.

## Claude Code Plugin State

The `remember` plugin keeps two separate directories, and only one of them is per-project:

- `<project>/.remember/` — the memory store (`now.md`, `today-*.md`, `recent.md`). Self-ignoring via a `.gitignore` containing `*`, so it never shows in `git status`
- `$HOME/.remember/run/` — spawn records bounding the background summarizer's concurrency and rate

The split is deliberate: the cap has to span projects, or `cd`-ing elsewhere would lift it, and `spawn_guard.py` derives the path from `HOME` alone so a child that inherited no plugin environment resolves the same directory. Relocated to XDG with `REMEMBER_RUNTIME_DIR` in `home/env.nix`. Claude Code's own `CLAUDE_CONFIG_DIR` used to sit beside it and now comes from `programs.claude-code` instead.

`$HOME/.remember/config.json` is a *read-only* lookup for user-global overrides — guarded by `[ -f ]` and never created — so with the runtime dir moved, nothing recreates the directory. `record_dir()` is its only writer. Note `bootstrap-dirs.sh` refuses to migrate `$HOME/.remember` as a legacy project store: opening a session with `cwd = $HOME` would otherwise consume the very config that directs the migration.

## Claude Code and npm Modules

Both follow the same shape as `## Codex`: a `programs.<x>` module replaces a `home/packages.nix` entry plus a hand-written variable in `home/env.nix`, because the module installs the package itself and derives the path on its own.

`programs.claude-code` (`home/claude-code.nix`) takes `configDir`, and sets `CLAUDE_CONFIG_DIR` only when that differs from its upstream default of `~/.claude`. It also takes `context`, pointed at `claude/CLAUDE.md` in this repo — that is the user-scope instruction file loaded in *every* project, as opposed to the per-project one you are reading. **Nothing else is declared, deliberately.** The module writes `${configDir}/settings.json` as soon as `settings`, `marketplaces` or a disabled MCP server is set, and Claude Code writes that same file itself — `/plugin`, the `enabledPlugins` map, and the usage counters all land there. A read-only store symlink would break all of it. `finalPackage` is the plain `pkgs.claude-code` unless `plugins` is declared, so nothing is wrapped.

`context` is the one file entry the module does contribute, and it is read-only like the rest — so `#` (quick memory add) and `/memory` editing no longer work at user scope; edit `claude/CLAUDE.md` and rebuild instead. That cost is zero here because the file did not exist before 2026-09-16, meaning user-scope `#` had never been used. Note the repo is public, so this file's contents are too.

`programs.npm` (`home/npm.nix`) installs `nodejs` — that is its `package` option — so `nodejs` came out of `packages.nix`, and the `xdg.configFile."npm/npmrc"` block that used to sit at the bottom of that file is now `settings`. The module picks `$XDG_CONFIG_HOME/npm/npmrc` over `~/.npmrc` from `home.preferXdgDirectories`, which is already on for Codex. Generated content matches the old file line for line; only the order differs, since the module sorts keys and npmrc does not care.

**The module builds `NPM_CONFIG_USERCONFIG` wrong, and `home/npm.nix` forces it back.** It computes `lib.removePrefix homeDirectory xdg.configHome` and gets `/.config` rather than `.config` — it wants `removePrefix "${homeDirectory}/"` — so the variable comes out as `/Users/jtr860830//.config/npm/npmrc`. Upstream `master` still has this, so `lib.mkForce` on `home.sessionVariables.NPM_CONFIG_USERCONFIG` is the permanent answer, not a stopgap; a plain assignment would collide, since the module assigns without `mkDefault`. The same missing slash makes the `home.file` key `/.config/npm/npmrc`, which `mkForce` cannot reach because that is an attribute *name* — but the built `home-files` derivation puts the file at `.config/npm/npmrc` regardless, so only the variable was worth correcting. The forced value is `${config.xdg.configHome}/npm/npmrc`, which this repo independently controls through `home.preferXdgDirectories`; if upstream ever moves npmrc on purpose, this force will pin the old path.

`NODE_REPL_HISTORY` and `COREPACK_HOME` stay in `home/env.nix`; no module sets either.

## Codex

Managed by `programs.codex` in `home/codex.nix`, not by an entry in `home/packages.nix` — the module installs `pkgs.codex` itself (`packages = mkIf (cfg.package != null) [ cfg.package ]`), so listing it in both would violate the rule above.

The module derives its paths from `home.preferXdgDirectories` (set in `home/default.nix`), not from `stateVersion`: `useXdgDirectories = config.home.preferXdgDirectories && isTomlConfig`, where `isTomlConfig` means the package is at least Codex 0.2.0 — nixpkgs ships 0.154.0, so it holds. With that flag on, the module writes `CODEX_HOME = ${config.xdg.configHome}/codex` itself, which is why `home/env.nix` no longer declares it. Of the nine modules that read `preferXdgDirectories` — `atuin` `dircolors` `github-copilot-cli` `kubecolor` `lazygit` `npm` `readline` `gtk2` `codex` — only `codex` is enabled here, so the flag has no other effect.

`xdg.configFile."codex/.keep"` stays. **Codex still refuses to create `CODEX_HOME`** — verified against 0.154.0, which prints `CODEX_HOME points to …, but that path does not exist` and then degrades rather than failing outright (`codex doctor` reports `config could not be loaded` and `CODEX_HOME could not be resolved`). The module has no activation step that would create the directory; its only `mkdir` calls are inside build-time derivations. A file entry under `configDir` would create it as a side effect, but the only candidate is `config.toml`, and that is written only when `programs.codex.settings != { }`.

**`settings` is deliberately left empty, so `config.toml` stays Codex's to write.** home-manager would install it as a read-only store symlink, and `codex mcp` and `codex plugin` both persist into that file. There is no `codex config set` subcommand, so those two are the flows that matter. If declaring it ever becomes worthwhile, the module offers declarative replacements for exactly those flows — `enableMcpIntegration` with `programs.mcp.servers`, plus `plugins` and `marketplaces` — along with `profiles`, `skills`, `rules` and `hooks`; `auth.json` and the session history are never managed by the module.

Codex is installed so that [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc) — the Claude Code plugin that delegates work to Codex and runs reviews — finds an existing binary. Its `/codex:setup` otherwise offers `npm install -g @openai/codex`, which would put a second copy outside nix. Auth is Codex's own (`codex login`, ChatGPT subscription or OpenAI API key), so nothing here needs an API key in the environment.

## Stale `__HM_SESS_VARS_SOURCED`

`hm-session-vars.fish` returns early when the exported `__HM_SESS_VARS_SOURCED` is already set — a guard against repeatedly prepending to `PATH`. A long-lived tmux server therefore pins the session variables from whenever it started: after adding or changing one, new panes still inherit the stale value and never pick it up. Symptom is a newly declared variable being simply absent.

`tmux kill-server` is the clean fix (fish re-creates the session via its `exec tmux new-session -A -s main`). To verify a variable is declared correctly rather than merely stale:

```sh
env -u __HM_SESS_VARS_SOURCED fish -c 'echo $MANPATH'
```

### GUI Apps Launched From a Terminal

A tmux server is not the only thing that pins a stale environment. macOS `open` **passes the caller's environment to the GUI app**, and everything that app later launches inherits it — so `open -a Alfred` from inside tmux gives Alfred `TMUX`, `TERM=tmux-256color` and `__HM_SESS_VARS_SOURCED=1`, and a Ghostty launched from that Alfred hands the same set to every shell in it. Quitting and reopening the *terminal* does not help; the pollution lives upstream in the launcher.

The two variables fail in ways that look unrelated, and neither names its cause:

- stale `TMUX` — `interactiveShellInit`'s `if not set -q TMUX` sees a value, skips `exec tmux`, and a new window lands in a bare fish with no tmux at all. The variable can point at a server that has since been killed; the guard only tests existence, not liveness
- stale `__HM_SESS_VARS_SOURCED` — `hm-session-vars.fish` returns early, so a newly declared variable is simply absent even in a brand-new window

Read what an app is actually holding with `ps -Eww -o command= -p <pid>`; `launchctl getenv` shows only the launchd session and stays empty in this case. A Finder- or Dock-launched app gets launchd's environment (about a dozen variables — `HOME` `PATH` `USER` `SHELL` `TMPDIR` `SSH_AUTH_SOCK` `XPC_*` …), which is the baseline to compare against. To relaunch one cleanly from a shell, give it that set explicitly rather than subtracting offenders one at a time:

```sh
env -i HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" PATH=/usr/bin:/bin:/usr/sbin:/sbin \
  TMPDIR="$TMPDIR" __CF_USER_TEXT_ENCODING="$__CF_USER_TEXT_ENCODING" open -a "<App>"
```

