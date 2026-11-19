# AGENTS.md

This file provides guidance to coding agents — pi, and Claude Code or Codex when they are run here — working in this repository.

## Repository Overview

Personal configuration for one Mac (Apple Silicon). Dotfiles live under `config/` and are linked into `$HOME` with GNU stow; packages are declared in `brewfile` and installed with `brew bundle`; `justfile` holds every operation. The repo usually sits at `~/.config/env` but **can live in any directory** — nothing references its absolute path, and `just check` fails if a file under `config/` contains the repo's own path.

**nix was tried and dropped (2026-10-21).** nix-darwin + home-manager managed this configuration before; it was unsuitable because packages here are wanted at their latest version with no pinning, and there is only one Mac. That setup and the stow-migration plan (`1a90fa2`) are in git history.

## House Style

**No comments in config files.** Single-user repo — the reasoning lives in `docs/`, and in this file only for what applies everywhere, rather than alongside the code. Do not add explanatory comments back when editing; put the finding in the file that loads for that area. Documents describe the current state and the reason for each departure from a tool's default; rejected alternatives and measurements live in git history.

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
- `.pi/skills/theme/SKILL.md`: where each tool gets Rosé Pine and the rule against overriding it — load before changing any colour or adding a themed element.

## Agents

pi is the harness (decided 2026-11-10), Claude Code is a backend through `pi-claude-code` and is also run on its own, Codex CLI has no role in pi; details in `docs/pi.md`, subagents in `docs/pi-subagents.md`, the colours, the editor's arrow and information rule and the footer's status lines in `docs/pi-ui.md`.

**Never let a `CLAUDE.md` appear at the repo root.** Claude Code's default loads `AGENTS.md` only when there is no `CLAUDE.md`, so one written by `/init`, `/revise-claude-md` or the `#` shortcut would silently shadow this file. The local setting that guards against it and the verifications are in the `manual-setup` skill. The settings files of all three tools stay local, since the tools write them.

**Stateless model (decided 2026-11-09).** The model carries nothing of its own between sessions: everything persistent lives in files the user edits — this file, `docs/`, `.pi/skills/`, the user-level `AGENTS.md` and `CLAUDE.md` — so what the model knows at session start is exactly what is in the repo. Memory switches and transcript retention are in `.pi/skills/manual-setup/SKILL.md` and `docs/pi.md`.

## Path-Scoped Documentation

Measured findings tied to one area live in the flat, harness-neutral `docs/` directory, indexed below for human readers and agents. A `paths` frontmatter key loads each document only when a matching file is read, edited or written. Prefer this mechanism over adding another always-loaded section when new guidance is tied to one file.

| File | Loads when editing | Covers |
|------|--------------------|--------|
| `docs/neovim.md` | `config/nvim/**` | plugins via `vim.pack` and removing one, Rosé Pine with no overrides, the hand-written statusline and why `cmdheight = 0` needs it, the new message UI and when its line goes, the 0.11+/0.12 LSP API, one file per server and why `on_attach` stays out of the wildcard, `winborder`, the Python server, semantic tokens, diagnostics, per-filetype options, treesitter parser install/update and removing a dropped parser by hand, which mini and snacks modules are set up and their traps, dropbar as a breadcrumb only, completion, fzf-lua, keymap organisation, formatters, what is deliberately absent, non-ASCII glyphs, testing in an isolated config dir |
| `docs/fish.md` | `config/fish/**` | why `PATH` is written outright, the ordering table and collision check; what the repository holds under `~/.config/fish` and what fisher writes; fisher from Homebrew and why a plugin must never find a link where it writes; pure and its two symbol settings; the `Rosé Pine Auto` theme and why `__apply_theme` chooses it; the cursor shapes and `fish_cursor_external`; the `vi`/`vim`/`ls`/`rm`/`wget` functions |
| `docs/env.md` | `config/fish/**/conf.d/env.fish`, `config/fish/**/functions/wget.fish`, `config/npm/**` | `GOPATH`/`GOBIN` in the environment and why Go's own env file cannot hold variables; the `~/Library` leaks on macOS and the variable verified for each fix; `TERMINFO_DIRS` from keg-only ncurses and `/usr/local/share/terminfo`, and which Homebrew-compiled entries Apple's tools cannot read; why no `MANPATH` is set and Homebrew's `mandoc` must not be installed; npm's config path and the variables dropped; pi's directories and hardware cursor; what the long-lived Rex server's environment holds, and stale environments in GUI apps launched from a terminal |
| `docs/ghostty.md` | `config/ghostty/**` | Ghostty as the fallback terminal while Rex is a preview, its five config lines and the reason for each, and what to remove and change when it goes |
| `docs/git.md` | `config/git/**` | `bat` and `delta` removed and why git's own diff is the better choice under a switching theme, `core.pager = nvim` rejected, `column.ui` declined, the `master` → `main` rename |
| `docs/omniwm.md` | `config/omniwm/**` | the stowed `settings.toml`, its strict schema and why every diff is read before a commit; one window per screen, workspaces per display, `niri.infiniteLoop` wrapping; app rules, the catch-all to workspace 3 and their limits, no sticky windows; the workspace bar's three layers and the stowed OmniShell profile, the status menu, Hidden Bar being off; the window switcher, Quake and the launcher; Overview colours; trackpad gestures and hotkeys; manual setup (permissions, Start at Login) |
| `docs/pi.md` | `config/pi/.config/pi/*`, `.pi/extensions/**` | pi's lack of XDG support and the two `PI_CODING_AGENT_*` variables, why sessions are DATA not STATE; why `settings.json` is local and which values have no other home; pi as the harness, with Claude Code as a backend through `pi-claude-code` and OpenAI models through the `openai` provider; the user-level context file and why it holds no delegation policy; `AGENTS.md` as a map, keeping `paths` narrow, why document updates are asked for rather than triggered; how `rules.ts` injects documents and how to test it; project trust |
| `docs/pi-subagents.md` | `config/pi/**/extensions/subagent/**`, `config/pi/**/agents/**` | the subagent extension — task versus subagent naming, the `task` and `task_control` tools, always-background execution and why, when a result wakes the main session and when it does not (kill, Escape, shutdown), `task-record` entries and the notice after a restart, how a child ends and is read, quota fallback as a virtual model inside the child and the shared exhausted-provider file, child identity and session ids, the footer status lines and folded results; the six agents and how work is routed to them; what is deliberately absent; costs; how to type-check and test the extension |
| `docs/pi-ui.md` | `config/pi/**/extensions/footer.ts`, `config/pi/**/extensions/editor.ts` | pi's built-in `system` theme and why there is no theme file or `theme` key; the editor — `❯` in pi's own input and `$` in bash mode, the information rule in the bottom border with its items, drop order and context thresholds, pi's own border colour, the arrow and rule disappearing behind selectors, the four overridden methods and the type check that guards them, the terminal's bar cursor; the footer's reserved status lines and why two files; testing on screen and for colour with `rex` |
| `docs/homebrew.md` | `justfile`, `bootstrap.sh`, `brewfile` | `/etc/homebrew/brew.env` and the `brew.env` hierarchy; which keg-only formulae are linked and why (`curl`, `llvm`, `rustup`), which is deliberately not (`ncurses`), the gnubin trio being prefixed rather than keg-only; Python's canonical formula name; bundle cleanup and the `mas` glitch; the brewfile's flat shape, the container stack (podman, no colima or Docker Desktop) and why lima/podlet/container are installed |
| `docs/setup.md` | `justfile`, `bootstrap.sh` | bootstrap and its XDG export, repo-relative paths and the move/relink test, stow's leaf links and `just link` restowing, `just etc` and its three system files (login shell, Touch ID for sudo, Homebrew environment) plus Rex's terminfo entry |
| `docs/rex.md` | `config/ssh/**`, `justfile` | Rex installed by hand and the two setup commands that must not be run, the CLI link, `just rex` and what each of its lines is for, `xterm-rex` compiled into `/usr/local/share/terminfo` and why with `/usr/bin/tic`, sudo dropping `TERMINFO_DIRS`, the inline ssh guard, colour queries answered only for the session on screen, driving a terminal program with `rex new`/`send`/`capture`, what is temporary and when it goes |

pi injects these through `.pi/extensions/rules.ts` (`docs/pi.md`); Claude Code and Codex get no injection and must open the matching document themselves.

`just check` runs `scripts/check-docs.py` first: every `docs/*.md` reference must name an existing file, every document must have its own index row whose second-cell backticked globs equal its frontmatter `paths`, and every `paths` glob must match a repository file.
