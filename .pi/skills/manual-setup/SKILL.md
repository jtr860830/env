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
- `"defaultModel": "claude-opus-5-5"`, with `"defaultProvider"` `anthropic` (the API key) or, once that credit has run out, `claude-code` (the subscription). `/model` switches, and pi saves the choice.
- `modelThinkingLevels`: `high` for fable-5-2, fable-5-1, opus-5-5 and gpt-6-astra; `medium` for sonnet-5-5 and gpt-6.1-sol; `low` for haiku-5-5, gpt-6.1-terra and gpt-6-luna. Each Anthropic model is listed under both `anthropic/` and `claude-code/`, so a provider switch keeps the depth.
- `"skills": ["~/.local/share/agents/skills"]`, the one place skills are installed to.
- No `theme` key, so pi uses its built-in `system` theme (`docs/pi-ui.md`).
- `editorPaddingX` and `showHardwareCursor` must not be set: the first is fixed in `extensions/editor.ts`, the second comes from `PI_HARDWARE_CURSOR` in `env.fish`, which a key in the file would override.

Then:

- Log in with `/login anthropic` (API key) and `/login openai` (Sign in with ChatGPT).
- Packages, recorded in that file's `packages` list by `pi install`: `https://github.com/earendil-works/pi-claude-code` (needs `claude auth login` done in Claude Code) and `npm:pi-web-access` (no key).
- `/trust` once in this repo so `.pi/` loads, including for subagent children; the decision lives in `~/.config/pi/trust.json`.

## rtk

`rtk init -g`, `rtk init -g --codex` and `rtk init -g --agent pi`. Each writes local files only (a `PreToolUse` Bash hook in Claude's `settings.json`; `~/.config/codex/{AGENTS.md,hooks.json,RTK.md}`; `~/.config/pi/extensions/rtk.ts`), except Claude's `RTK.md` and the `@RTK.md` line it appends to `CLAUDE.md`: both are stowed, so rtk writes them through the links into the repo and an upgrade that rewords them shows up as a diff.

- `RTK.md` is what tells the agent its output is condensed and that `rtk bypass <cmd>` returns it raw, so `--hook-only` is not used.
- **`RTK.md` must sit beside the real `CLAUDE.md`.** Claude Code resolves `@RTK.md` from the directory of the link's target, the repo, so a local `~/.config/claude/RTK.md` next to the link is silently not loaded.
- **The pi install writes only the extension, no such file.** The same text, plus `rtk recall`, is hand-copied into the stowed `config/pi/.config/pi/AGENTS.md` as `## Command Output`. An rtk upgrade that rewords `RTK.md` does not update that copy; keep it close to `RTK.md` so the two can be compared.
- **Answer no to "Delegate oversize reads to a cheaper model".** It writes a `pipeline.toml` that routes any large whole-file read to another model, sending the file out and keeping it from the agent. With no `pipeline.toml` rtk is on `rtk:default` (`rtk pipeline status`).
- The telemetry prompt is moot: the Homebrew build has no telemetry endpoint (`rtk telemetry status`).

## Claude Code

`CLAUDE_CONFIG_DIR=~/.config/claude` is set in `conf.d/env.fish`. The stowed files there are the user-scope `~/.config/claude/CLAUDE.md` and the `RTK.md` it imports, writable links into the repo: `#` and `/memory` edit the repo file, and the repo is public. At user scope Claude Code reads only a file of that name. Hand-set values in `~/.config/claude/settings.json`:

- `pluginConfigs["cc-plugin-agents-md@builtin"].options.instructionFiles = "claude-md-and-agents-md"`. Claude Code's default loads a project's `AGENTS.md` only when there is no `CLAUDE.md`, and `/init`, `/revise-claude-md` and the `#` shortcut all write `CLAUDE.md` by name. With this value a stray `CLAUDE.md` loads beside `AGENTS.md` instead of replacing it. It is an option of the built-in plugin, not a top-level key.
- `autoMemoryEnabled` and `autoDreamEnabled` unset, so Claude Code run on its own keeps its default memory in `~/.config/claude/projects/<cwd>/memory/`, outside the repo. pi stays stateless: `pi-claude-code` starts `claude` with `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`.
- Plugins: only `codex@openai-codex` at user scope, so Claude Code run on its own can reach Codex; how to use it comes from the plugin's own skills and agent, and the stowed `CLAUDE.md` holds no delegation policy; `pi-claude-code` loads no setting sources, so none of this reaches pi. superpowers, security-guidance and the LSP plugins are uninstalled: in a direct session they cost context every turn, and security-guidance ran a background LLM review on every stop, commit and push. A plugin needed for one project is installed there with `--scope local`. The built-in `cc-plugin-plugin-authoring` is disabled: its skills and agent cost context every session and no plugins are written here. The `claude-community` marketplace (anthropics/claude-plugins-community) stays registered so `/plugin` can browse it; nothing is installed from it.
- The `remember` plugin uninstalled, not merely disabled (`claude plugin uninstall remember@claude-plugins-official`): a disabled one still fires its hooks in the session that disabled it, and it keeps a per-project `.remember/` store.
- `syncClaudeAiSkills` and `syncClaudeAiPlugins` set to `false`: the skills claude.ai syncs cost their descriptions in every session and were almost never used. When a Word, Excel, PowerPoint or PDF job comes up, copy that one skill's directory from anthropics/skills into the project's `.pi/skills/` for the duration. `disableClaudeAiConnectors: true` for the same reason: claude.ai's connectors would add their tool definitions to every session and reach private data.
- `enableArtifact: false`, `disableBundledSkills: true` and `disableWorkflows: true`: tool and skill definitions that cost tokens every turn and were not used; `/init` and `/doctor` stay typable. `CLAUDE_CODE_SEND_FEEDBACK=0` in `conf.d/env.fish` is there for the same reason.
- `awaySummaryEnabled: false` and `promptSuggestionEnabled: false`: background calls that spend tokens unasked.
- No `advisorModel`, which is the default and leaves the advisor off. `/advisor` writes the key into `settings.json`, so it stays on in every later session until `/advisor off`; an advisor call re-reads the whole transcript uncached at the advisor model's rates.
- `env.CLAUDE_CODE_SUBAGENT_MODEL = "sonnet"`: a subagent with no `model` of its own runs on Sonnet instead of inheriting the main model. It sits in `settings.json` rather than `env.fish` so `claude -p` from `pi-claude-code` is unaffected.
- `env.CLAUDE_CODE_DISABLE_FAST_MODE = "1"`: removes `/fast`, which bills the same model at a higher per-token rate and is not used.
- `env.CLAUDE_CODE_EXPERIMENTAL_CODE_MODE = "1"`: Code Mode, in which the model writes JavaScript that makes several tool calls in one `REPL` step. Its first start asks for confirmation and restarts. Each call inside still passes the rtk `PreToolUse` hook under its own tool name, but auto mode's classifier reviews the code as a whole and cannot see values computed at run time. A session started with it resumes only with it on. Like the subagent model it sits in `settings.json`, so `claude -p` from `pi-claude-code` is unaffected.
- `attribution` as `{"commit": "", "pr": "", "sessionUrl": false}`: no Co-Authored-By trailer, PR footer or session link.
- `model: "opus"`, the same model as pi's main session.
- `switchModelsOnFlag: true`: when safeguards flag a message the session continues on another model instead of pausing. The safeguards are deliberately broad and flag ordinary system work as cyber; a pause would only lead to the same switch by hand.
- `permissions.defaultMode: "auto"`: every session starts in auto mode, the classifier deciding what needs a prompt. One user on one machine, and every change here is a git revert away.
- No `autoMode` section, so the classifier uses Claude Code's current defaults. `/auto-mode-setup` writes a frozen `environment` naming this repo as the trusted repo and source control, which at user scope applies to every project; `claude auto-mode reset -y` removes it.

## Codex

`CODEX_HOME=~/.config/codex` is set in `conf.d/env.fish`, and **Codex refuses to create it**, so `config/codex/.config/codex/.keep` exists for `just link` to create the directory. `~/.config/codex/config.toml` is written by the tool and stays local; its one hand-set value is `[features] memories = false`, which pins the default against a later flip. Codex is installed so that Claude Code's openai/codex-plugin-cc finds a binary; auth is Codex's own (`codex login`).

## Alfred

- Enter the Powerpack licence, and point the sync folder at iCloud, which restores workflows, themes and preferences.
- Import `rose-pine.alfredappearance` and `rose-pine-dawn.alfredappearance` from the `dist/` directory of [rose-pine/alfred](https://github.com/rose-pine/alfred). Choose Rosé Pine while the system is dark and Rosé Pine Dawn while it is light, since Alfred keeps a theme for each appearance (the `theme` skill), and delete any hand-made theme left from an earlier setup.
- Set the hotkey to `⌘Space`, and turn off System Settings → Keyboard → Keyboard Shortcuts → Spotlight → "Show Spotlight search", which otherwise owns that key.

Alfred's config is **deliberately not in this repo**. Its sync folder moves the whole `Alfred.alfredpreferences` bundle, app-owned state that Alfred writes to directly, which is a different model from the declarative source the rest of the repo holds. The licence, clipboard database and usage data sit outside that bundle, so nothing secret travels with it.

**Do not try to disable the Spotlight hotkey declaratively.** It is one entry of the `AppleSymbolicHotKeys` dictionary in `com.apple.symbolichotkeys`, and `defaults write` replaces the whole dictionary, which would wipe every other hotkey. Editing it in place with `PlistBuddy` works but needs the preference cache restarted, which is not worth a recipe for a one-time toggle.

## Notes

Session transcripts are conversation continuity, not memory, and are kept: Claude Code's `--resume` ages them out after `cleanupPeriodDays`, left at its default of 30, and pi never prunes them (`docs/pi.md`). Claude Code's own auto memory is on, as above; the `remember` plugin and Codex memories are off.

`⌘` combinations never reach programs inside the terminal (macOS handles them at the app layer), so they are the safe modifier for global hotkeys. `⌃` and `⌥` do reach the terminal and Neovim: `⌃Space` is blink.cmp's completion trigger and `⌥hjkl` is mini.move.
