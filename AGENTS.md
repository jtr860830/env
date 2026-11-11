# AGENTS.md

This file provides guidance to coding agents — pi, and Claude Code or Codex when they are run here — working in this repository.

## Repository Overview

Personal configuration for one Mac (Apple Silicon). Dotfiles live under `config/` and are linked into `$HOME` with GNU stow; packages are declared in `brewfile` and installed with `brew bundle`; `justfile` holds every operation. The repo usually sits at `~/.config/env` but **can live in any directory** — nothing references its absolute path, and `just check` fails if a file under `config/` contains the repo's own path.

**nix was tried and dropped (2026-10-21).** nix-darwin + home-manager managed this configuration before; it was unsuitable because packages here are wanted at their latest version with no pinning, and there is only one Mac. That setup and the stow-migration plan (`1a90fa2`) are in git history.

## House Style

**No comments in config files.** Single-user repo — the reasoning lives in `docs/`, and in this file only for what applies everywhere, rather than alongside the code. Do not add explanatory comments back when editing; put the finding in the file that loads for that area. Every measured value and every rejected alternative is kept, with its date: those are the expensive part.

**Scripts in this repo run under BSD tools** — `sed -i ''`, not `sed -i`. The GNU versions are installed only under their `g`-prefixed names (`docs/homebrew.md`).

## Applying Changes

Edits under `config/` are live immediately — `~` holds symlinks into the repo. Run a recipe only when the set of files or packages changes; `just --list` names them and the `justfile` is short.

**`stow --no-folding` is required, not a style choice.** With folding, a target directory that does not exist yet becomes a single link into the repo, and fish (`fish_variables`) and vim.pack (`nvim-pack-lock.json`) then write their own files *into the repo*.

## PATH

`PATH` is written outright in `config/fish/.config/fish/conf.d/env.fish`; user-installed binaries go in `~/.local/bin`; a keg-only formula is exposed with `link: true` in the brewfile, never by adding its keg to `PATH` (`docs/fish.md`, `docs/homebrew.md`).

## Git Conventions

- Commit style: `type: description` (e.g. `feat:`, `chore:`, `fix:`)
- Git signs commits via 1Password SSH agent (ED25519)
- Default branch is `main`.

## Skills

- `.pi/skills/manual-setup/SKILL.md`: steps `just setup` cannot perform and local settings deliberately set or off — load when setting up a machine or before changing those tools' settings.
- `.pi/skills/theme/SKILL.md`: any colour or appearance change — load before changing either; its values are measured, do not re-derive.

## Container Stack

Containers run on podman; `podman machine` manages the Linux VM, with no colima or Docker Desktop.

## Agents

pi is the harness (decided 2026-11-10), Claude Code is a backend through `pi-claude-code`, Codex CLI has no role; details in `docs/pi.md`, subagents in `docs/pi-subagents.md`.

**Never let a `CLAUDE.md` appear at the repo root.** Claude Code loads a project's `AGENTS.md` where `CLAUDE.md` would go only when there is no `CLAUDE.md`, so `/init`, `/revise-claude-md` (from the `claude-md-management` plugin) and the `#` shortcut, which all write that name, would silently shadow this file; a local setting guards against it. The settings files of all three tools stay local, since the tools write them. Details and the verifications are in the `manual-setup` skill.

**Stateless model (decided 2026-11-09).** The model carries nothing of its own between sessions: everything persistent lives in files the user edits — this file, `docs/`, `.pi/skills/`, the user-level `AGENTS.md` and `CLAUDE.md` — so what the model knows at session start is exactly what is in the repo. Memory switches and transcript retention are in `.pi/skills/manual-setup/SKILL.md` and `docs/pi.md`.

## Path-Scoped Documentation

Measured findings tied to one area live in the flat, harness-neutral `docs/` directory, indexed below for human readers and agents. A `paths` frontmatter key loads each document only when a matching file is read, edited or written. Prefer this mechanism over adding another always-loaded section when new guidance is tied to one file.

| File | Loads when editing | Covers |
|------|--------------------|--------|
| `docs/neovim.md` | `config/nvim/**` | plugins via `vim.pack`, the 0.11+/0.12 LSP API, LspAttach patterns, mini.nvim's per-module `setup()` traps, nerd font icons written as `\u{…}` escapes, keymap organisation, formatters, snacks, sign column, fzf-lua colours, startup timings, and what is deliberately absent; treesitter parser install/update and the hand-registered tmux parser, Python server choice, lua_ls library setting, testing in an isolated config dir |
| `docs/tmux.md` | `config/tmux/**` | who starts tmux, the style/format quirks, `message-style` needing `fill=`, extended-keys negotiation, duplicate options, and tmux 3.8's changed default styles; default key bindings not to rebind |
| `docs/fish.md` | `config/fish/**` | why `PATH` is written outright, the ordering table and collision check, the conf.d layout and why the theme and the prompt's git handler live in `conf.d/`, the `vi`/`vim`/`ls`/`rm`/`wget` functions, the valid `fish_color_*`/`EZA_COLORS` names, and why fish theme files cannot hold the palette |
| `docs/fish-prompt.md` | `config/fish/**/conf.d/prompt.fish`, `config/fish/**/conf.d/theme.fish`, `config/fish/**/functions/fish_prompt.fish`, `config/fish/**/functions/fish_mode_prompt.fish`, `config/fish/**/functions/fish_user_key_bindings.fish` | the hand-written prompt — its segments and their nvim groups, the framed blocks and fading, the git caching, sanitising and timings, why pure, Starship and Tide were not used; narrow-line drop order, palette keys and contrast, empty-Enter handling, exit-status choice, glyph choices |
| `docs/env.md` | `config/fish/**`, `config/tealdeer/**`, `config/npm/**` | `GOPATH`/`GOBIN` in the environment and why Go's own env file cannot hold variables; the `~/Library` leaks on macOS and the variable verified for each fix; `TERMINFO_DIRS` from keg-only ncurses; why no `MANPATH` is set and Homebrew's `mandoc` must not be installed; tealdeer's cache config, npm's config path and the variables dropped; stale environments in a long-lived tmux server and in GUI apps launched from a terminal |
| `docs/ghostty.md` | `config/ghostty/**` | why Ghostty's `command` starts tmux (absolute path, `env -u TMUX`), shell integration being off, `macos-option-as-alt`, and Ghostty 1.4.0 still having no status bar |
| `docs/git.md` | `config/git/**` | `bat` and `delta` removed and why git's own diff is the better choice under a switching theme, `core.pager = nvim` rejected, `column.ui` declined, the `master` → `main` rename |
| `docs/omniwm.md` | `config/omniwm/**` | the stowed `settings.toml` and its strict schema, the 0.8.0 upgrade, workspaces per display, app rules and the catch-all to workspace 3, no sticky windows, the workspace bar's three layers and the stowed OmniShell profile, the status menu, the window switcher, Quake and Hidden Bar being off, Overview colours, trackpad gestures and hotkeys; `niri.infiniteLoop` wrapping, workspace naming, manual setup (permissions, Start at Login) |
| `docs/pi.md` | `config/pi/.config/pi/*`, `.pi/**` | pi's lack of XDG support and the two `PI_CODING_AGENT_*` variables, why sessions are DATA not STATE, which `settings.json` values are hand-set; pi as the harness, with Claude Code as a backend and OpenAI models through the `openai` provider — why `pi-claude-code` over `pi-claude-bridge` and what it measurably sends; the user-level context file and why it holds no delegation policy; `rules.ts`, why documents live in `docs/` and what was rejected, why document updates are asked for rather than triggered |
| `docs/pi-subagents.md` | `config/pi/**/extensions/subagent/**`, `config/pi/**/agents/**` | the subagent extension — task versus subagent naming, the `task` and `task_control` tools, always-background execution and why, when a result wakes the main session and when it does not (kill, Escape, shutdown) with pi's measured `sendMessage` behaviour, `task-record` entries and the notice after a restart, quota fallback as a virtual model inside the child and the shared exhausted-provider file, child identity and session ids, the widget and folded results, what was removed or declined (chain mode, resume, steering a running child, a transcript viewer); the six agents and how work is routed to them; measured costs; how to type-check and test the extension |
| `docs/homebrew.md` | `justfile`, `bootstrap.sh`, `brewfile` | `/etc/homebrew/brew.env` and the `brew.env` hierarchy; which keg-only formulae are linked and why (`curl`, `llvm`, `rustup`), which are deliberately not (`ncurses`, `openjdk`), the gnubin trio being prefixed rather than keg-only; Python's canonical formula name; bundle cleanup and the `mas` glitch; the brewfile's flat shape, why lima/podlet/container are installed |
| `docs/setup.md` | `justfile`, `bootstrap.sh` | bootstrap and its XDG export, repo-relative paths and the move/relink test, stow's leaf links, `just etc` and its three system files (login shell, Touch ID for sudo inside tmux, Homebrew environment) |

pi injects these through `.pi/extensions/rules.ts` (`docs/pi.md`); Claude Code and Codex get no injection and must open the matching document themselves.

`just check` runs `scripts/check-docs.py` first: every `docs/*.md` reference must name an existing file, every document must have its own index row whose second-cell backticked globs equal its frontmatter `paths`, and every `paths` glob must match a repository file.
