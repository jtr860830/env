---
name: manual-setup
description: Steps `just setup` cannot perform on this Mac and the local settings that are deliberately set — macOS settings, OmniWM permissions and Start at Login, Rex, pi, rtk, Claude Code's and Codex's local settings and what is turned off in them and why, Alfred. Load when setting up a machine or before changing any of those tools' settings.
---

# Manual Setup

Steps `just setup` cannot perform: local UI state, app preferences and licences. The settings files of pi, Claude Code and Codex stay local because the tools write them.

## macOS

Dock, Finder, key repeat, screenshots, hostname and DNS are not managed. They persist on this machine; a new one sets them by hand.

## OmniWM

Permissions (Accessibility, Input Monitoring, Screen Recording) and Start at Login, see `docs/omniwm.md`. Turn off macOS's three- and four-finger swipes (System Settings → Trackpad → More Gestures), which OmniWM's gestures replace.

## Rex

Install by hand into `/Applications` (a preview with no cask yet) and open it once. Then `just link` for the `rex` command, `just etc` for its terminfo entry, and, after switching on Remote Control in Rex's settings under Rex Server, `just rex` for the themes, font, line height and Option key. Delete any theme left over from an earlier setup in Rex's settings; no action does it. Do not run `rex terminfo setup` or `rex skill setup` (`docs/rex.md`).

## pi

Hand-set values in `~/.config/pi/settings.json` (why they are local is in `docs/pi.md`):

- `"shellPath": "/opt/homebrew/bin/bash"`.
- `"defaultModel": "claude-fable-5-2"`, with `"defaultProvider"` `anthropic` (the API key) or, once that credit has run out, `claude-code` (the subscription). `/model` switches, and pi saves the choice.
- `modelThinkingLevels`: `high` for fable-5-2, fable-5-1, opus-5-5 and gpt-6-astra; `medium` for sonnet-5-5 and gpt-6.1-sol; `low` for haiku-5-5, gpt-6.1-terra and gpt-6-luna. Each Anthropic model is listed under both `anthropic/` and `claude-code/`, so a provider switch keeps the depth.
- `"skills": ["~/.local/share/agents/skills"]`, the one place skills are installed to.
- No `theme` key, so pi uses its built-in `system` theme (`docs/pi-ui.md`).
- `editorPaddingX` and `showHardwareCursor` must not be set: the first is fixed in `extensions/editor.ts`, the second comes from `PI_HARDWARE_CURSOR` in `env.fish`, which a key in the file would override.

Then:

- Log in with `/login anthropic` (API key) and `/login openai` (Sign in with ChatGPT).
- Packages, recorded in that file's `packages` list by `pi install`: `https://github.com/earendil-works/pi-claude-code` (needs `claude auth login` done in Claude Code), `npm:pi-web-access` (no key) and `git:github.com/obra/superpowers`.
- `/trust` once in this repo so `.pi/` loads, including for subagent children; the decision lives in `~/.config/pi/trust.json`.

## rtk

`rtk init -g`, `rtk init -g --codex` and `rtk init -g --agent pi`. Each writes local files only (`~/.config/claude/RTK.md` and a `PreToolUse` Bash hook in Claude's `settings.json`; `~/.config/codex/{AGENTS.md,hooks.json,RTK.md}`; `~/.config/pi/extensions/rtk.ts`), except the `@RTK.md` line it appends to the stowed Claude `CLAUDE.md`, which is committed.

- `RTK.md` is what tells the agent its output is condensed and that `rtk bypass <cmd>` returns it raw, so `--hook-only` is not used.
- **The pi install writes only the extension, no such file.** The same text, plus `rtk recall`, is hand-copied into the stowed `config/pi/.config/pi/AGENTS.md` as `## Command Output`. An rtk upgrade that rewords `RTK.md` does not update that copy; keep it close to `RTK.md` so the two can be compared.
- **Answer no to "Delegate oversize reads to a cheaper model".** It writes a `pipeline.toml` that routes any large whole-file read to another model, sending the file out and keeping it from the agent. With no `pipeline.toml` rtk is on `rtk:default` (`rtk pipeline status`).
- The telemetry prompt is moot: the Homebrew build has no telemetry endpoint (`rtk telemetry status`).

## Claude Code

`CLAUDE_CONFIG_DIR=~/.config/claude` is set in `conf.d/env.fish`. The one stowed file there is the user-scope `~/.config/claude/CLAUDE.md`, a writable link into the repo: `#` and `/memory` edit the repo file, and the repo is public. At user scope Claude Code reads only a file of that name. Hand-set values in `~/.config/claude/settings.json`:

- `pluginConfigs["cc-plugin-agents-md@builtin"].options.instructionFiles = "claude-md-and-agents-md"`. Claude Code's default loads a project's `AGENTS.md` only when there is no `CLAUDE.md`, and `/init`, `/revise-claude-md` and the `#` shortcut all write `CLAUDE.md` by name. With this value a stray `CLAUDE.md` loads beside `AGENTS.md` instead of replacing it. It is an option of the built-in plugin, not a top-level key.
- `autoMemoryEnabled` and `autoDreamEnabled` set to `false`, so `~/.config/claude/projects/<cwd>/memory/` is neither read nor written.
- Plugins: only `codex@openai-codex` at user scope, for the Codex delegation in the stowed `CLAUDE.md` when Claude Code is run on its own; `pi-claude-code` loads no setting sources, so none of this reaches pi. superpowers, security-guidance and the LSP plugins are uninstalled: in a direct session they cost context every turn, and security-guidance ran a background LLM review on every stop, commit and push. A plugin needed for one project is installed there with `--scope local`.
- `autoMode.environment` is `"$defaults"` plus one line naming the routine local tools, so the built-in entries follow Claude Code's updates instead of being a frozen copy. `/auto-mode-setup` in replace mode drops `"$defaults"`; `claude auto-mode config` shows what is in effect.
- The `remember` plugin uninstalled, not merely disabled (`claude plugin uninstall remember@claude-plugins-official`): a disabled one still fires its hooks in the session that disabled it, and it keeps a per-project `.remember/` store.
- `syncClaudeAiSkills` set to `false`: the skills claude.ai syncs cost their descriptions in every session and were almost never used. When a Word, Excel, PowerPoint or PDF job comes up, copy that one skill's directory from anthropics/skills into the project's `.pi/skills/` for the duration.
- `enableArtifact: false`, `disableBundledSkills: true` and `disableWorkflows: true`: tool and skill definitions that cost tokens every turn and were not used; `/init` and `/doctor` stay typable. `CLAUDE_CODE_SEND_FEEDBACK=0` in `conf.d/env.fish` is there for the same reason.

## Codex

`CODEX_HOME=~/.config/codex` is set in `conf.d/env.fish`, and **Codex refuses to create it**, so `config/codex/.config/codex/.keep` exists for `just link` to create the directory. `~/.config/codex/config.toml` is written by the tool and stays local; its one hand-set value is `[features] memories = false`, which pins the default against a later flip. Codex is installed so that Claude Code's openai/codex-plugin-cc finds a binary; auth is Codex's own (`codex login`).

## Alfred

- Enter the Powerpack licence, and point the sync folder at iCloud, which restores workflows, themes and preferences.
- Import `rose-pine.alfredappearance` and `rose-pine-dawn.alfredappearance` from the `dist/` directory of [rose-pine/alfred](https://github.com/rose-pine/alfred). Choose Rosé Pine while the system is dark and Rosé Pine Dawn while it is light, since Alfred keeps a theme for each appearance (the `theme` skill), and delete any hand-made theme left from an earlier setup.
- Set the hotkey to `⌘Space`, and turn off System Settings → Keyboard → Keyboard Shortcuts → Spotlight → "Show Spotlight search", which otherwise owns that key.

Alfred's config is **deliberately not in this repo**. Its sync folder moves the whole `Alfred.alfredpreferences` bundle, app-owned state that Alfred writes to directly, which is a different model from the declarative source the rest of the repo holds. The licence, clipboard database and usage data sit outside that bundle, so nothing secret travels with it.

**Do not try to disable the Spotlight hotkey declaratively.** It is one entry of the `AppleSymbolicHotKeys` dictionary in `com.apple.symbolichotkeys`, and `defaults write` replaces the whole dictionary, which would wipe every other hotkey. Editing it in place with `PlistBuddy` works but needs the preference cache restarted, which is not worth a recipe for a one-time toggle.

## Notes

Session transcripts are conversation continuity, not memory, and are kept: Claude Code's `--resume` ages them out with `cleanupPeriodDays`, and pi never prunes them (`docs/pi.md`). Auto-memory, the `remember` plugin and Codex memories are off, as above.

`⌘` combinations never reach programs inside the terminal (macOS handles them at the app layer), so they are the safe modifier for global hotkeys. `⌃` and `⌥` do reach the terminal and Neovim: `⌃Space` is blink.cmp's completion trigger and `⌥hjkl` is mini.move.
