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

Edits under `config/` are live immediately — `~` holds symlinks into the repo. Run a recipe only when the set of files or packages changes; `just --list` names them and the `justfile` is short.

A new machine runs `./bootstrap.sh`: it installs Homebrew and `just` — exporting `XDG_CONFIG_HOME` first, so `~/.homebrew` is never created — and `exec`s `just setup`. Everything else lives in the `justfile`, which resolves paths from its own directory. Moving the repo was tested: 20 links dangled, `just relink` repointed them, nvim, fish and git kept working.

**`stow --no-folding` is required, not a style choice.** With folding, a target directory that does not exist yet becomes a single link into the repo, and fish (`fish_variables`) and vim.pack (`nvim-pack-lock.json`) then write their own files *into the repo*. Without it every directory under `~` is real and only leaf files are links.

`vi` and `vim` are fish functions (`functions/vi.fish`, `vim.fish`, `--wraps nvim`), replacing home-manager's `viAlias`/`vimAlias`; without them `vim` opens Apple's unconfigured Vim. home-manager's versions were real binaries on `PATH`; functions only apply where fish runs the command, which is accepted — `EDITOR` and git's `core.editor` already name `nvim`, so only something invoking the literal name `vim` from outside fish misses them. Same mechanism as `ls`, `rm` and `wget`.

### System Files

`just etc` owns three files under `/etc` that nix-darwin used to manage:

- `/etc/shells` gains `/opt/homebrew/bin/fish` — `chsh` refuses a shell not listed there
- `/etc/pam.d/sudo_local` — `pam_reattach.so` from `/opt/homebrew/lib/pam/`, then `pam_tid.so`, so Touch ID works for sudo including inside tmux
- `/etc/homebrew/brew.env` — `HOMEBREW_CACHE` and `HOMEBREW_XDG_CONFIG_HOME`, see `.claude/rules/homebrew.md`

## PATH and System Binaries

`config/fish/.config/fish/conf.d/env.fish` sets the whole `PATH`: `~/.local/bin`, `/opt/homebrew/bin` and `sbin`, then `/usr/local/bin /usr/local/sbin /usr/bin /usr/sbin /bin /sbin`. `path_helper` is deliberately not used. The reasoning, the collision check and the ordering argument are in `.claude/rules/fish.md`.

**`~/.local/bin` is the one directory for user-installed binaries** — it is `XDG_BIN_HOME`, uv puts its tools there, `GOBIN` points there, and `CARGO_INSTALL_ROOT=$HOME/.local` makes `cargo install` write `~/.local/bin`. The costs are accepted: cargo keeps its install records (`.crates.toml`, `.crates2.json`) in the root, i.e. `~/.local/`, and same-named binaries overwrite one another (`go install` silently; cargo and uv refuse without `--force`). Before this, `~/.local/share/cargo/bin` held old `fd` and `rg` that shadowed the brewfile's — they were removed, along with an unused `rustlings`. `CARGO_HOME` (registry, caches) stays at `~/.local/share/cargo`.

**A keg-only formula is exposed by linking it, never by adding its keg to `PATH`.** `brew "rustup", link: true` in the brewfile makes `brew bundle install` run `brew link --force`, so `cargo`/`rustc`/`rustfmt`/`rust-analyzer` land in `/opt/homebrew/bin` and run the toolchains already in `RUSTUP_HOME` (`stable` and `nightly`, default `nightly`). Adding `/opt/homebrew/opt/rustup/bin` to `PATH` was tried and rejected — the `PATH` list is fixed by design. Any other keg-only formula that needs exposing follows the same `link: true` route.

Linked (decided 2026-10-21 from fish history — 4,665 entries since 2022-02 — and actual consumers):

- **`curl`** — in regular use (last 2026-07); brew's 8.23 (OpenSSL, HTTP/3) over Apple's 8.7.1 (LibreSSL).
- **`llvm`** — puts brew's `clang`, `clang++`, `clangd` and `clang-format` ahead of Apple's. `clang-format` was the real gap: conform formats C with it and macOS ships none, so C formatting silently failed. Do not also install the standalone `clang-format` formula — it is the same 23.x binary and the two would fight over `/opt/homebrew/bin/clang-format`. Verified after linking: brew's `clang`/`clang++` find the SDK and build C and C++, and conform formats a C buffer. `brew link --dry-run llvm` reports a conflict with protobuf's `share/emacs/site-lisp`; it is spurious — the trees are disjoint and the real link succeeds.
- **`rustup`** — see above.

Deliberately not linked: `ncurses` (only its terminfo database is wanted; linking would shadow nine Apple binaries — see `.claude/rules/env.md`) and `openjdk` (`java`/`javac`/`mvn` last used 2022, so `java` stays Apple's stub). The gnubin formulae (`make`, `gnu-sed`, `inetutils`) are not keg-only: brew already ships them prefixed (`gmake`, `gsed`, `gping`) in `/opt/homebrew/bin`, and the unprefixed names stay Apple's. Scripts in this repo must therefore run under BSD tools — `sed -i ''`, not `sed -i`. Tools that are not keg-only (`ssh` from `openssh`, `git`, `python3`) already win from `/opt/homebrew/bin`.

## Tools Deliberately Absent

`bat` and `delta` were removed. Neither had another consumer — the man pager is `nvim +Man!`, fzf-lua uses its own builtin previewer, and delta bundles its own syntect so it never needed bat installed. Reading a file with syntax highlighting is something Neovim does better, and for diffs it has twelve fzf-lua git pickers plus `mini.diff`.

Git's own diff is also the *better* choice under a switching theme: it emits nothing but ANSI indices (`\e[31m` `\e[32m` `\e[36m` `\e[1m`, verified — no `38;2;R;G;B` anywhere), so it follows the terminal palette for free, where delta would have needed `BAT_THEME` wired into the fish theme function. `diff.colorMoved=zebra` stays palette-only too, if a richer diff is ever wanted.

`core.pager = nvim` was tried and rejected. It needs five overrides — `nonumber norelativenumber signcolumn=no laststatus=0` plus clearing dropbar's winbar — before it stops looking like an editor that opened a diff by mistake, and at the time it got no syntax highlighting in exchange, because nixpkgs' `diff` parser was out of sync with its queries (`Invalid node type "change"`). That half no longer holds — nvim-treesitter's own parser highlights diffs — so the five overrides are now the whole cost.

## Git Conventions

- Commit style: `type: description` (e.g. `feat:`, `chore:`, `fix:`)
- Git signs commits via 1Password SSH agent (ED25519)
- `column.ui = "auto"` was declined: it fights `branch.sort = "-committerdate"`.
- Default branch is `main`, matching `init.defaultBranch` in git's config. Renamed from `master` on 2026-08-15 with GitHub's `branches/{branch}/rename` API, which moves the default and leaves redirects behind.

## Homebrew

`brewfile` declares formulae, casks and Mac App Store apps; `just clean` removes anything not listed, the role nix-darwin's `cleanup = "zap"` played. `mas` apps cannot be uninstalled by bundle cleanup, and an App Store update glitch (`Failed to update app for ADAM ID …`) does not fail `brew bundle` — check with `just check`.

Formula names that differ from their nixpkgs attribute: `clang-tools` → `llvm`, `gnumake` → `make`, `gnused` → `gnu-sed`, `jdk` → `openjdk`, `kubectl` → `kubernetes-cli`, `kubernetes-helm` → `helm`, `python3` → `python@3.15` (canonical name, so bundle cleanup matches the installed keg). `mandoc` is not installed: macOS's `/usr/bin/man` already drives mandoc.

## Manual Setup

Steps `just setup` cannot perform — macOS settings, OmniWM permissions, pi, rtk, Claude Code's and Codex's local settings, Alfred — live in the `manual-setup` skill (`.claude/skills/manual-setup/SKILL.md`). Load it when setting up a machine or before changing any of those tools' settings: it also records which Claude Code settings are deliberately off and why. Codex does not load skills — open the file.

## Container Stack

Fully migrated to podman. `podman machine` manages the Linux VM — no colima/Docker Desktop needed. lima is kept for general-purpose Linux VMs (not container-related). `podlet` converts existing container defs to Quadlet/k8s YAML format.

`container` (Apple's) was non-functional from nixpkgs, which never symlinked its `libexec/` (`cannot find any plugins with type network`). It comes from Homebrew's formula now and has not been re-verified.

## Theme

All colour and appearance work — the sourcing ladder, which contrast instrument applies to which comparison, the light/dark switching mechanism, onedarkpro's limits and traps, and Alfred's theme design — lives in the `theme` skill (`.claude/skills/theme/SKILL.md`). Load it before changing any colour; every value there was measured and should not be re-derived.

## AGENTS.md, Not CLAUDE.md

This file is `AGENTS.md` so that Claude Code and Codex both read it. Claude Code ships an `instructionFiles` setting whose default, `claude-md-or-agents-md`, loads a project's `AGENTS.md` exactly where `CLAUDE.md` would go — **but only when there is no `CLAUDE.md`**. Verified with a canary string in a scratch repo: `AGENTS.md` alone is read; add any `CLAUDE.md` beside it and the `AGENTS.md` is silently ignored.

So **never let a `CLAUDE.md` appear at the repo root**. `/init`, `/revise-claude-md` from the `claude-md-management` plugin, and the `#` memory shortcut all write `CLAUDE.md` by name, and any one of them would shadow this whole file with no warning. That is guarded against: `~/.config/claude/settings.json` sets `pluginConfigs["cc-plugin-agents-md@builtin"].options.instructionFiles` to `claude-md-and-agents-md`, so a stray `CLAUDE.md` now loads *beside* this file instead of replacing it — verified with two canaries, one per file, both answered. `instructionFiles` is not a top-level settings key: it is the `USER_CONFIG` of a built-in plugin, `cc-plugin-agents-md`, gated by the `tengu_agents_md_mod` flag, and built-in plugin options live under `pluginConfigs.<id>@builtin.options`. That settings file is Claude Code's own and deliberately not in `config/` (see `## Claude Code and Codex`), so this value lives outside the repo and is listed in the `manual-setup` skill.

Scope is project-only on purpose. At user scope Claude Code reads only `CLAUDE.md` — its built-in Codex importer copies Codex's `AGENTS.md` *into* Claude's user `CLAUDE.md`, which it would not need to do otherwise — so `config/claude/.config/claude/CLAUDE.md` keeps its name. It is also written in Claude's first person ("execution goes to Codex"), which would read backwards to Codex; sharing it would need a split into a neutral common part and a Claude-only part first.

The `.claude/rules/` and `.claude/skills/` material below is loaded automatically by Claude Code only. Codex does not see it unless it opens those files, so read the relevant one before touching Neovim, tmux, fish, Ghostty, OmniWM, pi, environment variables or anything colour-related.

## Path-Scoped Rules

Eight bodies of guidance were moved out of this file into `.claude/rules/`, where a `paths` frontmatter key loads each one only when a matching file is actually being edited. Nothing was dropped — every measured finding and negative result is still recorded, just not in every session's context.

| File | Loads when editing | Covers |
|------|--------------------|--------|
| `.claude/rules/neovim.md` | `config/nvim/**` | plugins via `vim.pack`, the 0.11+/0.12 LSP API, LspAttach patterns, mini.nvim's per-module `setup()` traps, nerd font icons and the `nr2char` requirement, keymap organisation, formatters, snacks, sign column, fzf-lua colours, startup timings, and what is deliberately absent |
| `.claude/rules/tmux.md` | `config/tmux/**` | the style/format quirks, `message-style` needing `fill=`, extended-keys negotiation, duplicate options, and tmux 3.8's changed default styles |
| `.claude/rules/fish.md` | `config/fish/**` | why `PATH` is written outright in `conf.d/env.fish`, the ordering table and collision check, the pending gnubin/keg-only decision, the conf.d layout and why the theme and the prompt's git handler live in `conf.d/`, the valid `fish_color_*`/`EZA_COLORS` names, and the hand-written prompt — its segments and their nvim groups, the git caching and timings, why pure, Starship and Tide were not used, and why fish theme files cannot hold the palette |
| `.claude/rules/ghostty.md` | `config/ghostty/**`, `config/tmux/**`, `config/fish/**` | why Ghostty's `command` starts tmux (absolute path, `env -u TMUX`) and fish has no tmux logic, shell integration being off, `macos-option-as-alt`, and the Ghostty 1.4 status-bar wait |
| `.claude/rules/omniwm.md` | `config/omniwm/**` | the stowed `settings.toml` and its strict schema, the 0.8.0 upgrade, workspaces per display, app rules and the catch-all to workspace 3, no sticky windows, the workspace bar's three layers and the stowed OmniShell profile, the status menu, the window switcher, Quake and Hidden Bar being off, Overview colours, trackpad gestures and hotkeys |
| `.claude/rules/pi.md` | `config/pi/**`, `config/fish/**` | pi's lack of XDG support and the two `PI_CODING_AGENT_*` variables, why sessions are DATA not STATE, why only `AGENTS.md` is stowed, and `shellPath` on brew's bash |
| `.claude/rules/env.md` | `config/fish/**`, `config/tealdeer/**`, `config/ghostty/**` | `GOPATH`/`GOBIN` in the environment and why Go's own env file cannot hold variables; the `~/Library` leaks on macOS and the variable verified for each fix (`GOCACHE`, `GOMODCACHE`, `_ZO_DATA_DIR`, tealdeer, rtk, `HOMEBREW_CACHE`); `TERMINFO_DIRS` from keg-only ncurses; why no `MANPATH` is set and Homebrew's `mandoc` must not be installed; stale environments in a long-lived tmux server and in GUI apps launched from a terminal |
| `.claude/rules/homebrew.md` | `justfile`, `bootstrap.sh`, `brewfile` | `/etc/homebrew/brew.env`: why `HOMEBREW_XDG_CONFIG_HOME` is set there, the `brew.env` hierarchy, and how to check what brew resolves |

Same reasoning as the `theme` skill above: measured values that are expensive to re-derive but irrelevant most of the time. Prefer this mechanism over adding another always-loaded section when new guidance is tied to one file.

## Stateless Model

Decided 2026-11-09: the model carries nothing of its own between sessions. Everything persistent lives in the two layers the user edits — `config/claude/.config/claude/CLAUDE.md` at user scope, and `AGENTS.md`, `.claude/rules/` and `.claude/skills/` per project — so what the model knows at session start is exactly what is in the repo. The same decision was taken for pi.

What this turned off, each a store the model wrote to and read back without the user in the loop:

- **Claude Code auto-memory** — `autoMemoryEnabled: false` and `autoDreamEnabled: false` in `~/.config/claude/settings.json` (see the `manual-setup` skill). `~/.config/claude/projects/<cwd>/memory/` is no longer read or written.
- **The `remember` plugin** — uninstalled (`claude plugin uninstall remember@claude-plugins-official`). Disabling alone was not enough to stop a running session: hooks are loaded at session start, so the session that disabled it still fired its `SessionEnd` hook on exit and recreated `.remember/`. It kept a per-project `.remember/` store (self-ignoring via a `.gitignore` containing `*`) and injected it at `SessionStart`, plus spawn records under `REMEMBER_RUNTIME_DIR`; that variable left `conf.d/env.fish` with it. Its background summarizer also ran Claude in temp directories, leaving ~660 empty entries under `~/.config/claude/projects/`.
- **Codex memories** — `codex features list` shows `memories` stable but off; `[features] memories = false` in `~/.config/codex/config.toml` pins it against a default flip.

Not state in this sense, and kept: session transcripts (`--resume` is conversation continuity and ages out with `cleanupPeriodDays`), and the `#` shortcut, which writes to the user `CLAUDE.md` — a user-layer edit the user sees and can revert, not model memory.

## Claude Code and Codex

Both come from casks (`claude-code`, `codex`). `CLAUDE_CONFIG_DIR=~/.config/claude` and `CODEX_HOME=~/.config/codex` are set in `conf.d/env.fish`.

The user-scope instruction file — loaded in every project, unlike this one — is `config/claude/.config/claude/CLAUDE.md`, stowed to `~/.config/claude/CLAUDE.md`. It is a writable link into the repo now, so `#` (quick memory add) and `/memory` edit the repo file directly; under home-manager it was a read-only store path. The repo is public, so that file's contents are too.

**Only that one file is stowed, deliberately.** `~/.config/claude/settings.json` and `~/.config/codex/config.toml` are written by the tools themselves — `/plugin`, `enabledPlugins`, usage counters, `codex mcp`, `codex plugin` — so they stay ordinary local files.

**Codex refuses to create `CODEX_HOME`** — verified against 0.154.0, which prints `CODEX_HOME points to …, but that path does not exist` and degrades (`codex doctor`: `config could not be loaded`). `config/codex/.config/codex/.keep` exists so `just link` creates the directory. Codex is installed so that openai/codex-plugin-cc finds a binary instead of offering `npm install -g @openai/codex`; auth is Codex's own (`codex login`).

npm reads `NPM_CONFIG_USERCONFIG=~/.config/npm/npmrc` (stowed), with `NODE_REPL_HISTORY` beside it in `env.fish`. `COREPACK_HOME` was dropped on 2026-10-28: Node 25 stopped bundling corepack, `corepack` is not on `PATH` under Node 26, and nothing reads the variable. `WGETRC` went the same day — it pointed at an empty, unmanaged `~/.config/wgetrc` from 2023; wget's one XDG need, the HSTS file, is the `--hsts-file=$XDG_CACHE_HOME/wget-hsts` in `functions/wget.fish`.

