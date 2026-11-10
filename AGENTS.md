# AGENTS.md

This file provides guidance to coding agents — pi, and Claude Code or Codex when they are run here — working in this repository.

## Repository Overview

Personal configuration for one Mac (Apple Silicon). Dotfiles live under `config/` and are linked into `$HOME` with GNU stow; packages are declared in `brewfile` and installed with `brew bundle`; `justfile` holds every operation. The repo usually sits at `~/.config/env` but **can live in any directory** — nothing references its absolute path, and `just check` fails if a file under `config/` contains the repo's own path.

**Why this and not nix (decided 2026-10-21).** The requirements are: configuration reproducible and at standard (XDG) paths; packages reinstallable from one declared list at their **latest** version, with no pinning; one Mac, no cross-OS need. nix-darwin + home-manager met the first and fought the second — a `flake.lock` commit almost every day (34 of 51 commits in the month before), and Darwin packaging breakage in nixpkgs (`bear` 4.2.3's install phase hardcoded `libexec.so`; `container` never worked). With cross-OS sharing dropped, nothing nix did was out of reach of plain files. The nix setup is in git history up to the merge of `stow-migration`.

## House Style

**No comments in config files.** Single-user repo — the reasoning lives in this file and in `.pi/rules/`, where it does not have to be maintained alongside the code. Do not add explanatory comments back when editing; put the finding in the file that loads for that area. Every measured value and every rejected alternative is kept, with its date: those are the expensive part.

`brewfile` is one flat alphabetical list per kind (`brew`, then `cask`, then `mas`), no category headers. Categories were tried in the old `home/packages.nix` and dropped: they invited endless boundary arguments (is `atac` networking or API tooling? is `gnu-sed` a build tool?), and only 2 of 17 groups ever stayed sorted. Flat keeps lookup and insertion predictable. The file is lowercase `brewfile`; Homebrew only auto-discovers `Brewfile`, so every call passes `--file`, and `HOMEBREW_BUNDLE_FILE` is deliberately not set because it would hardcode the repo path.

**Scripts in this repo run under BSD tools** — `sed -i ''`, not `sed -i`. The GNU versions are installed only under their `g`-prefixed names (`.pi/rules/homebrew.md`).

## Applying Changes

Edits under `config/` are live immediately — `~` holds symlinks into the repo. Run a recipe only when the set of files or packages changes; `just --list` names them and the `justfile` is short.

A new machine runs `./bootstrap.sh`: it installs Homebrew and `just` — exporting `XDG_CONFIG_HOME` first, so `~/.homebrew` is never created — and `exec`s `just setup`. Everything else lives in the `justfile`, which resolves paths from its own directory. Moving the repo was tested: 20 links dangled, `just relink` repointed them, nvim, fish and git kept working.

**`stow --no-folding` is required, not a style choice.** With folding, a target directory that does not exist yet becomes a single link into the repo, and fish (`fish_variables`) and vim.pack (`nvim-pack-lock.json`) then write their own files *into the repo*. Without it every directory under `~` is real and only leaf files are links.

`just etc` owns three files under `/etc` that nix-darwin used to manage: `/etc/shells` gains `/opt/homebrew/bin/fish` (`chsh` refuses a shell not listed there); `/etc/pam.d/sudo_local` gets `pam_reattach.so` from `/opt/homebrew/lib/pam/`, then `pam_tid.so`, so Touch ID works for sudo including inside tmux; `/etc/homebrew/brew.env` sets `HOMEBREW_CACHE` and `HOMEBREW_XDG_CONFIG_HOME` (`.pi/rules/homebrew.md`).

`just clean` removes any package not in the brewfile, the role nix-darwin's `cleanup = "zap"` played; `mas` apps are the exception, see `.pi/rules/homebrew.md`.

## PATH

`config/fish/.config/fish/conf.d/env.fish` writes the whole `PATH` outright: `~/.local/bin`, `/opt/homebrew/bin` and `sbin`, then the six system directories. `~/.local/bin` is the one directory for user-installed binaries (uv, `go install`, `cargo install` all land there), a keg-only formula is exposed by `link: true` in the brewfile and never by adding its keg to `PATH`, and `path_helper` is deliberately not used. The reasoning, the collision check and what is linked or deliberately not are in `.pi/rules/fish.md` and `.pi/rules/homebrew.md`.

## Git Conventions

- Commit style: `type: description` (e.g. `feat:`, `chore:`, `fix:`)
- Git signs commits via 1Password SSH agent (ED25519)
- Default branch is `main`. Decisions about git's own config, and the diff and pager tools deliberately absent, are in `.pi/rules/git.md`.

## Manual Setup

Steps `just setup` cannot perform — macOS settings, OmniWM permissions, pi's and Claude Code's and Codex's local settings, rtk, Alfred — live in the `manual-setup` skill (`.pi/skills/manual-setup/SKILL.md`). Load it when setting up a machine or before changing any of those tools' settings: it also records which settings are deliberately off and why.

## Container Stack

Fully migrated to podman. `podman machine` manages the Linux VM — no colima/Docker Desktop needed. lima is kept for general-purpose Linux VMs (not container-related). `podlet` converts existing container defs to Quadlet/k8s YAML format.

`container` (Apple's) was non-functional from nixpkgs, which never symlinked its `libexec/` (`cannot find any plugins with type network`). It comes from Homebrew's formula now and has not been re-verified.

## Theme

All colour and appearance work — the sourcing ladder, which contrast instrument applies to which comparison, the light/dark switching mechanism, onedarkpro's limits and traps, and Alfred's theme design — lives in the `theme` skill (`.pi/skills/theme/SKILL.md`). Load it before changing any colour; every value there was measured and should not be re-derived.

## Agents

pi is the harness (decided 2026-11-10): the orchestrator runs in pi, Claude Code is the `claude` binary behind the `pi-claude-code` package, and Codex CLI has no role in it. Both are still installed and runnable on their own. The whole arrangement — providers, subagents, the six agent definitions, what was tried and rejected — is in `.pi/rules/pi.md`.

**Never let a `CLAUDE.md` appear at the repo root.** Claude Code loads a project's `AGENTS.md` where `CLAUDE.md` would go only when there is no `CLAUDE.md`, so `/init`, `/revise-claude-md` (from the `claude-md-management` plugin) and the `#` shortcut, which all write that name, would silently shadow this file; a local setting guards against it. The user-scope `config/claude/.config/claude/CLAUDE.md` keeps its name because at user scope Claude Code reads only that. The settings files of all three tools stay local, since the tools write them. Details and the verifications are in the `manual-setup` skill.

**Stateless model (decided 2026-11-09).** The model carries nothing of its own between sessions: everything persistent lives in files the user edits — this file, `.pi/rules/`, `.pi/skills/`, the user-level `AGENTS.md` and `CLAUDE.md` — so what the model knows at session start is exactly what is in the repo. Auto-memory, the `remember` plugin and Codex memories are off; the `manual-setup` skill records each. Session transcripts are conversation continuity, not memory, and are kept (Claude Code's `--resume` ages them out with `cleanupPeriodDays`; pi never prunes, see `.pi/rules/pi.md`).

## Path-Scoped Rules

Measured findings tied to one area live in `.pi/rules/`, where a `paths` frontmatter key loads each file only when a matching file is read or edited. Nothing was dropped from this file when they moved out — it is only not in every session's context. Prefer this mechanism over adding another always-loaded section when new guidance is tied to one file.

| File | Loads when editing | Covers |
|------|--------------------|--------|
| `.pi/rules/neovim.md` | `config/nvim/**` | plugins via `vim.pack`, the 0.11+/0.12 LSP API, LspAttach patterns, mini.nvim's per-module `setup()` traps, nerd font icons and the `nr2char` requirement, keymap organisation, formatters, snacks, sign column, fzf-lua colours, startup timings, and what is deliberately absent |
| `.pi/rules/tmux.md` | `config/tmux/**` | who starts tmux, the style/format quirks, `message-style` needing `fill=`, extended-keys negotiation, duplicate options, and tmux 3.8's changed default styles |
| `.pi/rules/fish.md` | `config/fish/**` | why `PATH` is written outright, the ordering table and collision check, the conf.d layout and why the theme and the prompt's git handler live in `conf.d/`, the `vi`/`vim`/`ls`/`rm`/`wget` functions, the valid `fish_color_*`/`EZA_COLORS` names, and why fish theme files cannot hold the palette |
| `.pi/rules/fish-prompt.md` | the prompt files under `config/fish/**` | the hand-written prompt — its segments and their nvim groups, the framed blocks and fading, the git caching, sanitising and timings, why pure, Starship and Tide were not used |
| `.pi/rules/env.md` | `config/fish/**` | `GOPATH`/`GOBIN` in the environment and why Go's own env file cannot hold variables; the `~/Library` leaks on macOS and the variable verified for each fix; `TERMINFO_DIRS` from keg-only ncurses; why no `MANPATH` is set and Homebrew's `mandoc` must not be installed; npm's config path and the variables dropped; stale environments in a long-lived tmux server and in GUI apps launched from a terminal |
| `.pi/rules/ghostty.md` | `config/ghostty/**` | why Ghostty's `command` starts tmux (absolute path, `env -u TMUX`), shell integration being off, `macos-option-as-alt`, and Ghostty 1.4.0 still having no status bar |
| `.pi/rules/git.md` | `config/git/**` | `bat` and `delta` removed and why git's own diff is the better choice under a switching theme, `core.pager = nvim` rejected, `column.ui` declined, the `master` → `main` rename |
| `.pi/rules/omniwm.md` | `config/omniwm/**` | the stowed `settings.toml` and its strict schema, the 0.8.0 upgrade, workspaces per display, app rules and the catch-all to workspace 3, no sticky windows, the workspace bar's three layers and the stowed OmniShell profile, the status menu, the window switcher, Quake and Hidden Bar being off, Overview colours, trackpad gestures and hotkeys |
| `.pi/rules/pi.md` | `config/pi/**`, `.pi/**` | pi's lack of XDG support and the two `PI_CODING_AGENT_*` variables, why sessions are DATA not STATE, which `settings.json` values are hand-set; pi as the harness with Claude Code and Codex as backends — why `pi-claude-code` over `pi-claude-bridge` and what it measurably sends; the subagent extension (thinking, model override, fallback chains, background jobs, child identity), the six agents and the designs rejected; `rules.ts` |
| `.pi/rules/homebrew.md` | `justfile`, `bootstrap.sh`, `brewfile` | `/etc/homebrew/brew.env` and the `brew.env` hierarchy; which keg-only formulae are linked and why (`curl`, `llvm`, `rustup`), which are deliberately not (`ncurses`, `openjdk`, the gnubin trio); formula names that differ from nixpkgs; bundle cleanup and the `mas` glitch |

The loading is done by `.pi/extensions/rules.ts`: it injects a rule when `read`/`edit`/`write` touches a matching path, blocking the first edit so the rule lands before the change. The format is Claude Code's path-scoped rules, where these files lived until 2026-11-11 (`.claude/rules/`, with the skills in `.claude/skills/`); they moved to `.pi/` when pi became the only harness used in this repo, so Claude Code and Codex see them only if they open the files. Details in `.pi/rules/pi.md`.
