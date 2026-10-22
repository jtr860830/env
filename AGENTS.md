# AGENTS.md

This file provides guidance to coding agents — Claude Code and Codex — working in this repository.

## Repository Overview

Personal configuration for one Mac (Apple Silicon). Dotfiles live under `config/` and are linked into `$HOME` with GNU stow; packages are declared in `brewfile` and installed with `brew bundle`; `justfile` holds every operation. The repo usually sits at `~/.config/env` but **can live in any directory** — nothing references its absolute path, and `just check` fails if a file under `config/` contains the repo's own path.

**Why this and not nix (decided 2026-10-21).** The requirements are: configuration reproducible and at standard (XDG) paths; packages reinstallable from one declared list at their **latest** version, with no pinning; one Mac, no cross-OS need. nix-darwin + home-manager met the first and fought the second — a `flake.lock` commit almost every day (34 of 51 commits in the month before), and Darwin packaging breakage in nixpkgs (`bear` 4.2.3's install phase hardcoded `libexec.so`; `container` never worked). With cross-OS sharing dropped, nothing nix did was out of reach of plain files. The nix setup is in git history up to the merge of `stow-migration`.

## House Style

**No comments in config files.** Single-user repo — the reasoning lives here in AGENTS.md instead, where it does not have to be maintained alongside the code. Do not add explanatory comments back when editing; put the finding in this file.

`brewfile` is one flat alphabetical list per kind (`brew`, then `cask`, then `mas`), no category headers. Categories were tried in the old `home/packages.nix` and dropped: they invited endless boundary arguments (is `atac` networking or API tooling? is `gnu-sed` a build tool?), and only 2 of 17 groups ever stayed sorted. Flat keeps lookup and insertion predictable.

The file is lowercase `brewfile`. Homebrew only auto-discovers `Brewfile`, so every call passes `--file`; `HOMEBREW_BUNDLE_FILE` is deliberately not set, because it would hardcode the repo path.

## Applying Changes

Edits under `config/` are live immediately — `~` holds symlinks into the repo. Run a recipe only when the set of files or packages changes:

| recipe | does |
|---|---|
| `just link` | `stow --no-folding` every package — after adding a file under `config/` |
| `just relink` | removes dangling links at exactly the paths `config/` owns, then `link` — after moving the repo |
| `just install` / `just update` | `brew bundle install` / with `--upgrade`, then `just plugins` |
| `just plugins` | `fisher update`, `vim.pack.update`, nvim-treesitter's `update()` for parsers already installed, then a headless nvim run that installs missing ones |
| `just etc` | writes the three `/etc` files below and sets the login shell (sudo) |
| `just check` | `brew bundle check`, a grep of `config/` for the repo's absolute path, `stow -n` dry run |
| `just clean` | `brew bundle cleanup --force` — removes anything not in `brewfile` |
| `just setup` | `install` + `etc` + `link` + `plugins` |

A new machine runs `./bootstrap.sh`: it installs Homebrew and `just` — exporting `XDG_CONFIG_HOME` first, so `~/.homebrew` is never created — and `exec`s `just setup`. Everything else lives in the `justfile`, which resolves paths from its own directory. Moving the repo was tested: 20 links dangled, `just relink` repointed them, nvim, fish and git kept working.

**`stow --no-folding` is required, not a style choice.** With folding, a target directory that does not exist yet becomes a single link into the repo, and fisher (`conf.d/`, `functions/`) and vim.pack (`nvim-pack-lock.json`) then write their own files *into the repo*. Without it every directory under `~` is real and only leaf files are links.

`vi` and `vim` are fish functions (`functions/vi.fish`, `vim.fish`, `--wraps nvim`), replacing home-manager's `viAlias`/`vimAlias`; without them `vim` opens Apple's unconfigured Vim. home-manager's versions were real binaries on `PATH`; functions only apply where fish runs the command, which is accepted — `EDITOR` and git's `core.editor` already name `nvim`, so only something invoking the literal name `vim` from outside fish misses them. Same mechanism as `ls`, `rm` and `wget`.

### System Files

`just etc` owns three files under `/etc` that nix-darwin used to manage:

- `/etc/shells` gains `/opt/homebrew/bin/fish` — `chsh` refuses a shell not listed there
- `/etc/pam.d/sudo_local` — `pam_reattach.so` from `/opt/homebrew/lib/pam/`, then `pam_tid.so`, so Touch ID works for sudo including inside tmux
- `/etc/homebrew/brew.env` — see `## Homebrew`

## PATH and System Binaries

`config/fish/.config/fish/conf.d/env.fish` sets the whole `PATH`: `~/.local/bin`, `/opt/homebrew/bin` and `sbin`, then `/usr/local/bin /usr/local/sbin /usr/bin /usr/sbin /bin /sbin`. `path_helper` is deliberately not used. The reasoning, the collision check and the ordering argument are in `.claude/rules/fish.md`.

**`~/.local/bin` is the one directory for user-installed binaries** — it is `XDG_BIN_HOME`, uv puts its tools there, `GOBIN` points there, and `CARGO_INSTALL_ROOT=$HOME/.local` makes `cargo install` write `~/.local/bin`. The costs are accepted: cargo keeps its install records (`.crates.toml`, `.crates2.json`) in the root, i.e. `~/.local/`, and same-named binaries overwrite one another (`go install` silently; cargo and uv refuse without `--force`). Before this, `~/.local/share/cargo/bin` held old `fd` and `rg` that shadowed the brewfile's — they were removed, along with an unused `rustlings`. `CARGO_HOME` (registry, caches) stays at `~/.local/share/cargo`.

**A keg-only formula is exposed by linking it, never by adding its keg to `PATH`.** `brew "rustup", link: true` in the brewfile makes `brew bundle install` run `brew link --force`, so `cargo`/`rustc`/`rustfmt`/`rust-analyzer` land in `/opt/homebrew/bin` and run the toolchains already in `RUSTUP_HOME` (`stable` and `nightly`, default `nightly`). Adding `/opt/homebrew/opt/rustup/bin` to `PATH` was tried and rejected — the `PATH` list is fixed by design. Any other keg-only formula that needs exposing follows the same `link: true` route.

Linked (decided 2026-10-21 from fish history — 4,665 entries since 2022-02 — and actual consumers):

- **`curl`** — in regular use (last 2026-07); brew's 8.23 (OpenSSL, HTTP/3) over Apple's 8.7.1 (LibreSSL).
- **`llvm`** — puts brew's `clang`, `clang++`, `clangd` and `clang-format` ahead of Apple's. `clang-format` was the real gap: conform formats C with it and macOS ships none, so C formatting silently failed. Do not also install the standalone `clang-format` formula — it is the same 23.x binary and the two would fight over `/opt/homebrew/bin/clang-format`. Verified after linking: brew's `clang`/`clang++` find the SDK and build C and C++, and conform formats a C buffer. `brew link --dry-run llvm` reports a conflict with protobuf's `share/emacs/site-lisp`; it is spurious — the trees are disjoint and the real link succeeds.
- **`rustup`** — see above.

Deliberately not linked: `ncurses` (only its terminfo database is wanted; linking would shadow nine Apple binaries — see `## Terminfo`) and `openjdk` (`java`/`javac`/`mvn` last used 2022, so `java` stays Apple's stub). The gnubin formulae (`make`, `gnu-sed`, `inetutils`) are not keg-only: brew already ships them prefixed (`gmake`, `gsed`, `gping`) in `/opt/homebrew/bin`, and the unprefixed names stay Apple's. Scripts in this repo must therefore run under BSD tools — `sed -i ''`, not `sed -i`. Tools that are not keg-only (`ssh` from `openssh`, `git`, `python3`) already win from `/opt/homebrew/bin`.

## Tools Deliberately Absent

`bat` and `delta` were removed. Neither had another consumer — the man pager is `nvim +Man!`, fzf-lua uses its own builtin previewer, and delta bundles its own syntect so it never needed bat installed. Reading a file with syntax highlighting is something Neovim does better, and for diffs it has twelve fzf-lua git pickers plus `mini.diff`.

Git's own diff is also the *better* choice under a switching theme: it emits nothing but ANSI indices (`\e[31m` `\e[32m` `\e[36m` `\e[1m`, verified — no `38;2;R;G;B` anywhere), so it follows the terminal palette for free, where delta would have needed `BAT_THEME` wired into the fish theme function. `diff.colorMoved=zebra` stays palette-only too, if a richer diff is ever wanted.

`core.pager = nvim` was tried and rejected. It needs five overrides — `nonumber norelativenumber signcolumn=no laststatus=0` plus clearing dropbar's winbar — before it stops looking like an editor that opened a diff by mistake, and at the time it got no syntax highlighting in exchange, because nixpkgs' `diff` parser was out of sync with its queries (`Invalid node type "change"`). That half no longer holds — nvim-treesitter's own parser highlights diffs — so the five overrides are now the whole cost.

## Waiting on Upstream

Better approaches that exist but are not usable yet. Each line gives the check that says whether it has landed, so none of this needs re-deriving.

- **Ghostty 1.4 may make a status bar possible.** 1.3.1 has no such option among its 200 config keys, and the closest surfaces (`title`, `window-subtitle`) take a literal string or a fixed enum. The 1.4 roadmap promises scriptability and "a true Tmux control mode" but says nothing about a status bar; the open request is [Discussion #2421](https://github.com/ghostty-org/ghostty/discussions/2421). Control mode is the more interesting half — it would render tmux windows as native tabs rather than duplicating tmux's bar. Expect roughly September 2026 on the 6-month cycle from 1.3.0.
- **fish theme files cannot hold the whole palette.** `~/.config/fish/themes/*.theme` takes `[light]`/`[dark]` sections and `fish_config theme choose` follows the terminal from them, which would be more idiomatic than a hand-written handler — but theme files only set `fish_color_*`/`fish_pager_color_*`, so `pure_color_*`, `EZA_COLORS` and `LS_COLORS` would still need one. Worth revisiting only if a shipped theme is ever seen setting something outside those two prefixes.

Deliberately declined rather than blocked, kept here so they are not re-proposed as if new: `snacks.scroll` (smooth scrolling, installed and un-`setup()`); `@variable`/`Identifier` → plain foreground, Zed's one portable idea, which would take light-mode variables from 3.51 to 10.86 but moves further from One Dark Pro's style; `column.ui = "auto"`, which fights `branch.sort = "-committerdate"`; and writing an own theme rather than hosting on onedarkpro, scoped at 327 highlight groups of which 69 are pure links.

## Git Conventions

- Commit style: `type: description` (e.g. `feat:`, `chore:`, `fix:`)
- Git signs commits via 1Password SSH agent (ED25519)
- Default branch is `main`, matching `init.defaultBranch` in git's config. Renamed from `master` on 2026-08-15 with GitHub's `branches/{branch}/rename` API, which moves the default and leaves redirects behind.

## Go

`go` comes from the brewfile. `GOPATH` (`~/.local/share/go`) and `GOBIN` (`~/.local/bin`) are plain environment variables in `conf.d/env.fish`, written with `$XDG_DATA_HOME`/`$HOME`.

They used to live in the file `go env` reads (`~/Library/Application Support/go/env` on Darwin), stowed from the repo. That file **cannot use variables**: Go reads it literally, so `$HOME/...` and `${HOME}/...` fail with `GOPATH entry is relative; must be absolute path` and `~/...` with `cannot start with shell metacharacter '~'` — and a bad `GOPATH` there breaks every `go` command, not just `go env`. Keeping it meant a hardcoded `/Users/jtr860830`; moving to the environment trades that for one limit, accepted: only processes started from fish see the variables, so an editor launched from the Dock falls back to Go's default `~/go`. nvim and gopls start from fish. `go env -w` now writes the ordinary file at the default location, not the repo.

`go telemetry` reports `local`, Go's default — counters on disk, nothing uploaded without an explicit `go telemetry on`.

## Homebrew

`brewfile` declares formulae, casks and Mac App Store apps; `just clean` removes anything not listed, the role nix-darwin's `cleanup = "zap"` played. `mas` apps cannot be uninstalled by bundle cleanup, and an App Store update glitch (`Failed to update app for ADAM ID …`) does not fail `brew bundle` — check with `just check`.

Formula names that differ from their nixpkgs attribute: `clang-tools` → `llvm`, `gnumake` → `make`, `gnused` → `gnu-sed`, `jdk` → `openjdk`, `kubectl` → `kubernetes-cli`, `kubernetes-helm` → `helm`, `python3` → `python@3.15` (canonical name, so bundle cleanup matches the installed keg). `mandoc` is not installed: macOS's `/usr/bin/man` already drives mandoc.

### `/etc/homebrew/brew.env`

brew keeps user config in `$XDG_CONFIG_HOME/homebrew` when that variable is set and falls back to `~/.homebrew` otherwise. fish sets it, but brew also runs without fish's environment — `bootstrap.sh` under `/bin/bash`, `sudo brew`, anything launched by launchd. `/etc/homebrew/brew.env` with `HOMEBREW_XDG_CONFIG_HOME=$HOME/.config` covers all of those: brew loads it at `bin/brew:151`, before it decides the path at `:163`. Under nix-darwin this was what stopped every rebuild recreating `~/.homebrew`, since the activation script ran `sudo --preserve-env=PATH … brew bundle` and dropped everything but `PATH`.

The `brew.env` hierarchy (`/etc/homebrew` → `$HOMEBREW_PREFIX/etc/homebrew` → user) is supported upstream and filters to `HOMEBREW_*` only. `HOMEBREW_XDG_CONFIG_HOME` itself is undocumented and unsettled — Homebrew/brew#20250 was closed unmerged with a maintainer preferring a new `HOMEBREW_CONFIG_HOME`. Check what brew resolves with:

```sh
brew ruby -e 'puts ENV["HOMEBREW_USER_CONFIG_HOME"]'
```

## Manual Setup

Steps `just setup` cannot perform — local UI state, app preferences and licences:

- **macOS settings** — Dock, Finder, key repeat, screenshots, hostname and DNS are not managed. They persist on this machine; a new one sets them by hand, and the last declared values are `darwin/system.nix` in git history.
- **OmniWM** — permissions and Start at Login, see `## OmniWM`. Trackpad: turn off macOS's three- and four-finger swipes (System Settings → Trackpad → More Gestures), which OmniWM's gestures replace.
- **Claude Code** — `pluginConfigs["cc-plugin-agents-md@builtin"].options.instructionFiles = "claude-md-and-agents-md"` in `~/.config/claude/settings.json` (see `## AGENTS.md, Not CLAUDE.md`).
- **Alfred** — enter the Powerpack licence; point the sync folder at iCloud, which restores workflows, themes and preferences; set the theme for *both* light and dark appearance (see below); set the hotkey to `⌘Space`; turn off System Settings → Keyboard → Keyboard Shortcuts → Spotlight → "Show Spotlight search", which otherwise owns that key.

Alfred's config is **deliberately not in this repo**. Its sync folder moves the whole `Alfred.alfredpreferences` bundle — app-owned mutable state that Alfred writes to directly, which is a different model from the declarative source the rest of the repo holds. iCloud handles it instead. The licence, clipboard database and usage data sit *outside* that bundle, so nothing secret travels with it.

**Do not try to disable the Spotlight hotkey declaratively.** It lives at `AppleSymbolicHotKeys` key `64` in `com.apple.symbolichotkeys`, and `system.defaults.CustomUserPreferences` emits `defaults write <domain> <key> <plist>` — a whole-dict *replacement*, which would wipe the other ~50 hotkey entries (Mission Control, screenshots, input sources…). `PlistBuddy -c "Set :AppleSymbolicHotKeys:64:enabled false"` edits in place and would work, but needs `killall cfprefsd` for the preference cache and would need its own recipe — not worth it for a one-time toggle.

`⌘` combinations never reach programs inside the terminal (macOS handles them at the app layer), so they are the safe modifier for global hotkeys; `⌃` and `⌥` do reach tmux and Neovim — `⌃Space` is already blink.cmp's completion trigger and `⌥hjkl` is mini.move.

## OmniWM

Tiling window manager (cask `omniwm`, 0.7.6). `config/omniwm/.config/omniwm/settings.toml` is stowed: OmniWM live-reloads it on every save and writes Settings-window changes back **through the symlink** — verified both ways, the link survived a GUI save and the edit landed in the repo. Runtime state (window placements, clipboard) lives in `~/.local/state/omniwm`, not in this file. The schema is strict: change values in place, never delete keys — a missing key rejects the whole file (OmniWM then keeps the previous settings). It drops comments when it rewrites, which matches this repo's no-comment rule. The upstream docs on `main` describe schema 5; this install writes schema 4, so check a key against the generated file before relying on the docs.

Layout follows how the machine is used — one window fills each screen. Workspaces 1–3 live on the built-in display (1 Ghostty, 2 Zen, 3 for anything else) and 4–5 on the secondary display. There is no way to make a workspace exist only while its display is connected: when the home display is missing, 0.7.6 places the workspace on the nearest connected one (`effectiveMonitor` in `WorkspaceManager+MonitorResolution.swift`; `specificDisplay` assignments fall back the same way), so unplugged, 4 and 5 join the built-in display — read from source, not yet observed. Splitting the numbers per display keeps the built-in set stable either way, and `workspaceBar.hideEmptyWorkspaces = true` hides any inactive empty workspace from the bar and Overview and makes next/previous navigation (the three-finger swipe) skip it — so an unplugged 4–5 with nothing in them stays out of sight. `⌥1-5` and `⌥⇧1-5` still reach empty workspaces; only drag-and-drop onto one is lost, since it is no longer drawn. Niri with `visibleContainerCount = 1` and `defaultContainerPrimarySpan = 1.0`, so every column is full width; `⌥.`/`⌥,` cycle a column through ⅓/½/⅔ for a side-by-side view and `⌥⇧F` toggles full width back. `edgeGaps = false` and `gaps.size = 8`, otherwise a full-width column is inset 16pt on every side once a workspace holds two windows. The focus border is off: with one window per screen it marked nothing and cost 5pt on each edge.

`assignToWorkspace` rules route Ghostty to 1 and Zen to 2, but only for an app's **first** tracked window — later windows open on whatever workspace is active. Keeping workspace 1 terminal-only would need a `omniwmctl watch windows-changed` guard; declined for now.

**Everything else tiles on workspace 3 (`Etc`).** A last rule with an empty `bundleId`, `titleRegex = ".*"`, `assignToWorkspace = "3"` and `layout = "tile"` sends any app without its own rule to the built-in display's catch-all as a full-width column. 3 rather than 5 because it exists with or without the secondary display, and a rule names one workspace. It replaced a catch-all `layout = "float"`, which kept ad-hoc windows from pushing the tiled one aside but left them loose on whatever workspace was active. The rule works through specificity (`AppRule.specificity` in 0.7.6: bundle ID +2, each other matcher +1), resolved **per setting**: Ghostty's and Zen's rules (2) win, but only for settings they set, so both carry an explicit `assignToWorkspace` and `layout`. A window with no AX title fails the regex (`guard let title … else { return false }`) and tiles on the active workspace. Verified with TextEdit: it opened as a column on 3 while Ghostty stayed on 1. Limits observed: `assignToWorkspace` moves only an app's first tracked window, so a second window of the same app becomes a column on the active workspace — send it on with `⌥⇧3`; and Calculator, a fixed-size window, appeared on no workspace at all once the rule said `tile` (it floated at 230×408 under the old rule) — cause not read from source, so a non-resizable tool that misbehaves needs its own `layout = "float"` rule. `⌥⇧Space` toggles `toggleFocusedWindowFloating` for one window (unassigned by default; the i3/sway `mod+shift+space` convention, and free among the 67 bound chords — plain `⌥Space` types a no-break space in macOS text fields).

**The Quake terminal is off** (`quakeTerminal.enabled = false`). It is OmniWM's embedded libghostty and reads the same Ghostty config files, so Ghostty's `command` — which starts tmux, see `## Ghostty and tmux` — would attach it to the main session as a second client. A shell-side guard was tried first (`$__CFBundleIdentifier` is `com.barut.OmniWM` in a Quake shell, `com.mitchellh.ghostty` in Ghostty) and dropped in favour of keeping tmux out of the shell config entirely. Measured from a Quake shell before it was disabled: `GHOSTTY_BIN_DIR` inside `OmniWM.app`, `TERM_PROGRAM=ghostty`, `TERM_PROGRAM_VERSION=1.3.2-main+…`, `TERM=xterm-256color`. Re-enabling Quake means first giving it a config that does not carry `command`.

**A floating window belongs to the workspace it opened on — there is no sticky / all-workspaces window in 0.7.6.** The source sets `canJoinAllSpaces` only on OmniWM's own panels (workspace bar, Quake, tooltips), app rules can set layout, workspace, minimum size and initial span but nothing like "every workspace", and OmniWM workspaces are not macOS Spaces (off-workspace windows are parked off-screen), so the native "assign to all desktops" does not apply either. The only thing that follows workspace switches is a revealed scratchpad; auto-assigning new floating windows into one with a `omniwmctl watch windows-changed` launchd agent was weighed and declined — every ad-hoc window would share one slot, `scratchpad assign` acts on whichever window has focus, and assignments vanish on restart. Move a float with `⌥⇧1-3` instead.

**Hidden Bar is off** (`hiddenBar.enabled = false`). It conceals menu-bar icons, but only with Full Disk Access granted to OmniWM and only while the workspace bar is on; it had nothing selected and no such permission, so it did nothing. If the notch ever starts swallowing menu-bar icons, a standalone tool (OmniWM's docs point to Thaw) is the better trade than giving the window manager Full Disk Access.

Scratchpads were considered for summon-on-demand apps; their membership lasts only for the OmniWM process (labels persist, assignments do not), so they need re-assigning after every restart and are unused for now.

The menu bar item shows OmniWM's icon followed by the active workspace's number (`statusBar`: `showIcon = true`, `showWorkspaceName = true`, `useWorkspaceId = true`). The workspace bar shows each workspace's number and its app icons, over the menu bar, revealed by holding `⌥` (`revealModifier`), which pairs with the `⌥1-3` workspace keys. Each workspace has a `displayName` — 1 `Term`, 2 `Web`, 3 `Etc`, 4 `Ref` (the secondary display's main workspace: reading docs, code and papers, mostly in a browser), 5 `Etc` — which the bar shows as its label. 3 and 5 are each display's catch-all and share a name on purpose: `displayName` need not be unique (0.7.6 accepted the duplicate, and every `switch-workspace` form takes a number, never a display name), and the bar draws each display's workspaces separately, so the two never appear side by side; `name` stays the number, so `⌥1-5` and the menu bar's number (`useWorkspaceId`) are unaffected. Two things were tried and dropped on the way: Nerd Font glyphs as names — the bar and menu bar render in the system font, and CoreText resolves U+E795 to `LastResort`, the boxed question mark (`swift` with `CTFontCreateForString` is the instrument) — and bottom placement, which shares its reveal edge with the auto-hidden Dock. The bar's leading OmniWM button is hard-coded in 0.7.6 (`showsOmniWMButton` is `slice != .secondary`) and cannot be turned off until the OmniShell bar ships.

**Overview colours.** Only the selected window's border can follow light/dark: with `overview.matchFocusBorder = true` it takes the focus border's colour (`OverviewAppearance` calls `BorderConfig.from(settings:isDark:)`), and `borders` has both `color` (light) and `darkColor` (dark) in 0.7.6. Those are set to purple — `#a626a4` / `#c678dd`, the colour that means "current" everywhere else (`TabLineSel`, tmux's current window) — while the focus border itself stays disabled; only its colour is borrowed. Backdrop, resting and hovered borders take a single colour for both appearances and stay at OmniWM's defaults: the backdrop is fully transparent, so they are drawn over the wallpaper and a contrast measurement against the palette would not mean anything.

**Trackpad gestures**: three fingers scroll Niri columns left/right and switch workspaces up/down (OmniWM's defaults — the two share a finger count because their axes differ); four fingers swiping up/down open and close Overview. macOS's own three- and four-finger swipes (full-screen apps, Mission Control) are turned off in System Settings, since both would fire on the same swipe. Window move and resize gestures stay off: 0.7.6's `GestureSettingsValidation` requires each to have a finger count no other enabled gesture uses, three and four are taken, and two fingers is ordinary scrolling — `⌥`-drag with the mouse or trackpad covers both.

Hotkeys stay on OmniWM's `⌥` defaults. They take `⌥←→↑↓` from fish (word motion, token history search) — accepted, since vi mode moves with `w`/`b` — and Hyper was not set up. `updateChecksEnabled = false` (brew updates it) and `ipcEnabled = true` (for `omniwmctl`).

Manual setup: grant Accessibility and Input Monitoring on first launch (Screen Recording is optional), keep **Displays have separate Spaces** on, and turn on **Start at Login** in OmniWM's menu — it is a macOS login item, not a key in `settings.toml`.

## Container Stack

Fully migrated to podman. `podman machine` manages the Linux VM — no colima/Docker Desktop needed. lima is kept for general-purpose Linux VMs (not container-related). `podlet` converts existing container defs to Quadlet/k8s YAML format.

`container` (Apple's) was non-functional from nixpkgs, which never symlinked its `libexec/` (`cannot find any plugins with type network`). It comes from Homebrew's formula now and has not been re-verified.

## Theme

All colour and appearance work — the sourcing ladder, which contrast instrument applies to which comparison, the light/dark switching mechanism, onedarkpro's limits and traps, and Alfred's theme design — lives in the `theme` skill (`.claude/skills/theme/SKILL.md`). Load it before changing any colour; every value there was measured and should not be re-derived.

## AGENTS.md, Not CLAUDE.md

This file is `AGENTS.md` so that Claude Code and Codex both read it. Claude Code ships an `instructionFiles` setting whose default, `claude-md-or-agents-md`, loads a project's `AGENTS.md` exactly where `CLAUDE.md` would go — **but only when there is no `CLAUDE.md`**. Verified with a canary string in a scratch repo: `AGENTS.md` alone is read; add any `CLAUDE.md` beside it and the `AGENTS.md` is silently ignored.

So **never let a `CLAUDE.md` appear at the repo root**. `/init`, `/revise-claude-md` from the `claude-md-management` plugin, and the `#` memory shortcut all write `CLAUDE.md` by name, and any one of them would shadow this whole file with no warning. That is guarded against: `~/.config/claude/settings.json` sets `pluginConfigs["cc-plugin-agents-md@builtin"].options.instructionFiles` to `claude-md-and-agents-md`, so a stray `CLAUDE.md` now loads *beside* this file instead of replacing it — verified with two canaries, one per file, both answered. `instructionFiles` is not a top-level settings key: it is the `USER_CONFIG` of a built-in plugin, `cc-plugin-agents-md`, gated by the `tengu_agents_md_mod` flag, and built-in plugin options live under `pluginConfigs.<id>@builtin.options`. That settings file is Claude Code's own and deliberately not in `config/` (see `## Claude Code and Codex`), so this value lives outside the repo and is listed under `## Manual Setup`.

Scope is project-only on purpose. At user scope Claude Code reads only `CLAUDE.md` — its built-in Codex importer copies Codex's `AGENTS.md` *into* Claude's user `CLAUDE.md`, which it would not need to do otherwise — so `config/claude/.config/claude/CLAUDE.md` keeps its name. It is also written in Claude's first person ("execution goes to Codex"), which would read backwards to Codex; sharing it would need a split into a neutral common part and a Claude-only part first.

The `.claude/rules/` and `.claude/skills/` material below is loaded automatically by Claude Code only. Codex does not see it unless it opens those files, so read the relevant one before touching Neovim, tmux, fish or anything colour-related.

## Path-Scoped Rules

Three bodies of guidance were moved out of this file into `.claude/rules/`, where a `paths` frontmatter key loads each one only when a matching file is actually being edited. Nothing was dropped — every measured finding and negative result is still recorded, just not in every session's context.

| File | Loads when editing | Covers |
|------|--------------------|--------|
| `.claude/rules/neovim.md` | `config/nvim/**` | plugins via `vim.pack`, the 0.11+/0.12 LSP API, LspAttach patterns, mini.nvim's per-module `setup()` traps, nerd font icons and the `nr2char` requirement, keymap organisation, formatters, snacks, sign column, fzf-lua colours, startup timings, and what is deliberately absent |
| `.claude/rules/tmux.md` | `config/tmux/**` | the style/format quirks, `message-style` needing `fill=`, extended-keys negotiation, duplicate options, and tmux 3.8's changed default styles |
| `.claude/rules/fish.md` | `config/fish/**` | why `PATH` is written outright in `conf.d/env.fish`, the ordering table and collision check, the pending gnubin/keg-only decision, the conf.d layout and why `theme.fish` must sort after `pure.fish`, and the valid `fish_color_*`/`pure_color_*`/`EZA_COLORS` names |

Same reasoning as the `theme` skill above: measured values that are expensive to re-derive but irrelevant most of the time. Prefer this mechanism over adding another always-loaded section when new guidance is tied to one file.

## Ghostty and tmux

Ghostty starts tmux itself — `command = /usr/bin/env -u TMUX /opt/homebrew/bin/tmux new-session -A -s main` in its config — and fish's config has no tmux logic at all. So only Ghostty windows land in the `main` session; a shell started anywhere else (Zed's terminal, an SSH login, a subshell) is plain fish, with nothing to exclude. The previous `exec tmux` in `config.fish` needed a guard for every non-Ghostty host.

- **Absolute path**: Ghostty launched from the Dock or Alfred has only launchd's `PATH` (`/usr/bin:/bin:/usr/sbin:/sbin`), and `command` runs before fish's `env.fish`.
- **`env -u TMUX`**: an app launched with `open` from inside tmux inherits `TMUX` (see `### GUI Apps Launched From a Terminal`); tmux would refuse to start with *sessions should be nested with care*. Clearing it makes a polluted launch attach normally.
- Detaching closes the window, as `exec` did; panes run the login shell (`/opt/homebrew/bin/fish`), where `env.fish` sets `PATH`.

Verified with two fresh instances (`open -na /Applications/Ghostty.app`): one under the clean launchd environment, one inheriting this shell's `TMUX` — both attached to `main` as a new client.

## Ghostty Shell Integration

`shell-integration = none` — disabled; tmux handles working directory and pane management, making all features redundant.
Available features: `cursor`, `sudo`, `title`, `ssh-env`, `ssh-terminfo`, `path`. In tmux `TERM=tmux-256color` so `ssh-env` TERM conversion does not trigger.
Verify integration is actually loaded: `fish -c 'functions __ghostty_setup'` — returns "not loaded" if disabled correctly. `$GHOSTTY_SHELL_FEATURES` is set by Ghostty process itself and is not a reliable indicator.

## Key Keybinding Patterns

Tmux handles all split and pane management. No custom Ghostty keybindings — tmux workflow makes them redundant. Tmux prefix is `Ctrl+B`.

Ghostty requires `macos-option-as-alt = true` for `<A-*>` keybindings to work in Neovim on macOS — without it, Option sends special characters instead.

## Terminfo

`TERMINFO_DIRS=/opt/homebrew/opt/ncurses/share/terminfo` in `conf.d/env.fish`; `ncurses` is in the brewfile but keg-only, so its nine binaries (`clear`, `tput`, `infocmp`, …) do not shadow Apple's. Homebrew's database has 2,896 entries against the system's 2,684 — the same count nixpkgs' had — including `alacritty` and `wezterm`. ncurses searches `TERMINFO_DIRS` **plus the default compiled into each binary**, so macOS binaries still reach `/usr/share/terminfo` as well; `/usr/bin/infocmp -D` prints the effective list. Ghostty also exports `TERMINFO` pointing into its app bundle, which is searched first. Count entries by path (`find … \( -type f -o -type l \)`); `find -type f` alone skips the symlinked aliases and inflates the difference into the hundreds.

## Man Pages

No `MANPATH` is set. macOS's `/usr/bin/man` is a mandoc front end that derives its search path from `PATH`, so Homebrew's pages (`man -w rg`) and the system's (`man -w ls`) both resolve, and sections 2 and 3 — which macOS no longer ships in `/usr/share/man` — come from the Command Line Tools SDK (`man -w 2 open`). Under home-manager, setting `MANPATH` at all had stopped mandoc consulting the system defaults and hid every macOS manual; leaving it unset is what avoids that. `MANPAGER` is `nvim +Man!`.

## Claude Code Plugin State

The `remember` plugin keeps two separate directories, and only one of them is per-project:

- `<project>/.remember/` — the memory store (`now.md`, `today-*.md`, `recent.md`). Self-ignoring via a `.gitignore` containing `*`, so it never shows in `git status`
- `$HOME/.remember/run/` — spawn records bounding the background summarizer's concurrency and rate

The split is deliberate: the cap has to span projects, or `cd`-ing elsewhere would lift it, and `spawn_guard.py` derives the path from `HOME` alone so a child that inherited no plugin environment resolves the same directory. Relocated to XDG with `REMEMBER_RUNTIME_DIR` in `conf.d/env.fish`, beside Claude Code's own `CLAUDE_CONFIG_DIR`.

`$HOME/.remember/config.json` is a *read-only* lookup for user-global overrides — guarded by `[ -f ]` and never created — so with the runtime dir moved, nothing recreates the directory. `record_dir()` is its only writer. Note `bootstrap-dirs.sh` refuses to migrate `$HOME/.remember` as a legacy project store: opening a session with `cwd = $HOME` would otherwise consume the very config that directs the migration.

## Claude Code and Codex

Both come from casks (`claude-code`, `codex`). `CLAUDE_CONFIG_DIR=~/.config/claude` and `CODEX_HOME=~/.config/codex` are set in `conf.d/env.fish`.

The user-scope instruction file — loaded in every project, unlike this one — is `config/claude/.config/claude/CLAUDE.md`, stowed to `~/.config/claude/CLAUDE.md`. It is a writable link into the repo now, so `#` (quick memory add) and `/memory` edit the repo file directly; under home-manager it was a read-only store path. The repo is public, so that file's contents are too.

**Only that one file is stowed, deliberately.** `~/.config/claude/settings.json` and `~/.config/codex/config.toml` are written by the tools themselves — `/plugin`, `enabledPlugins`, usage counters, `codex mcp`, `codex plugin` — so they stay ordinary local files.

**Codex refuses to create `CODEX_HOME`** — verified against 0.154.0, which prints `CODEX_HOME points to …, but that path does not exist` and degrades (`codex doctor`: `config could not be loaded`). `config/codex/.config/codex/.keep` exists so `just link` creates the directory. Codex is installed so that openai/codex-plugin-cc finds a binary instead of offering `npm install -g @openai/codex`; auth is Codex's own (`codex login`).

npm reads `NPM_CONFIG_USERCONFIG=~/.config/npm/npmrc` (stowed), with `NODE_REPL_HISTORY` and `COREPACK_HOME` beside it in `env.fish`.

## Stale Environments

A long-lived tmux server keeps the environment it started with, so a variable added to `conf.d/env.fish` is missing from new panes until `tmux kill-server`. Under home-manager this was worse — `hm-session-vars.fish` returned early on an inherited `__HM_SESS_VARS_SOURCED` — and that guard is gone, since `env.fish` sets everything unconditionally.

### GUI Apps Launched From a Terminal

A tmux server is not the only thing that pins a stale environment. macOS `open` **passes the caller's environment to the GUI app**, and everything that app later launches inherits it — so `open -a Alfred` from inside tmux gives Alfred `TMUX`, and `TERM=tmux-256color`, and a Ghostty launched from that Alfred hands the same set to every shell in it. Quitting and reopening the *terminal* does not help; the pollution lives upstream in the launcher.

The failure does not name its cause:

- stale `TMUX` — when fish started tmux behind an `if not set -q TMUX` guard, an inherited value made a new window land in a bare fish with no tmux. Ghostty's `command` now clears it with `env -u TMUX`, so this one no longer bites

Read what an app is actually holding with `ps -Eww -o command= -p <pid>`; `launchctl getenv` shows only the launchd session and stays empty in this case. A Finder- or Dock-launched app gets launchd's environment (about a dozen variables — `HOME` `PATH` `USER` `SHELL` `TMPDIR` `SSH_AUTH_SOCK` `XPC_*` …), which is the baseline to compare against. To relaunch one cleanly from a shell, give it that set explicitly rather than subtracting offenders one at a time:

```sh
env -i HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" PATH=/usr/bin:/bin:/usr/sbin:/sbin \
  TMPDIR="$TMPDIR" __CF_USER_TEXT_ENCODING="$__CF_USER_TEXT_ENCODING" open -a "<App>"
```
