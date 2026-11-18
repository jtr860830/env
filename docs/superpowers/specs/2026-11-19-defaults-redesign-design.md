# Defaults redesign: Rosé Pine, Rex, and upstream defaults

Date: 2026-11-19. Repository state this was written against: `749caaf` (2026-11-16).

## Intent

The repository works, but most of its volume is hand-tuned appearance: a One Dark Pro palette copied by hand into five tools, a pill-and-rule visual style drawn separately in nvim, tmux, fish and pi, and about 1,200 lines of documents and skills that record each tuning session. The owner finds that style unpleasant to maintain and the `theme` skill a record without a standard.

The redesign keeps the features and replaces the hand-made appearance with upstream themes and tool defaults, so that what remains in the repository is small enough to hold in one's head.

## Goals

1. **Open directory standards.** XDG base directories without exception: a tool that wants to write to `~` is redirected or not used. The only dot entries in `~` today are `.cache .config .local .ssh .Trash`, and it must stay that way.
2. **One colour scheme everywhere**, following the system's light and dark appearance.
3. **A plain, current look**: no pills, no powerline caps, no coloured blocks.
4. **Work out of the box**: fewer things maintained here. The working rule is that every setting that departs from a tool's default must trace back to goal 1, 2 or 3, or to a stated habit of the owner.

## Non-goals

- Changing what the tools do. LSP, completion, treesitter, formatting, file search, the pi subagent extension, `rules.ts`, the stow layout, the `brewfile` and `justfile` mechanism all stay.
- `config/git`, `config/npm`, `config/tealdeer`, `config/claude`, `config/codex`: untouched.
- OmniWM beyond two colours and one app rule.
- Pinning versions. Packages and plugins stay at their latest.

## Anti-goals

- No palette of our own, no generator, no colour overrides on top of an upstream theme. Where an upstream theme is weak, the weakness is accepted and listed here.
- No hex colour in `config/` except the two OmniWM values below.
- No replacement for tmux's custom bar, the fish prompt's extra segments or the pi pills.

## Constraints

- One Mac, Apple Silicon. Scripts run under BSD tools.
- `stow --no-folding` stays; a plugin manager that writes into `~/.config/<tool>/` must not be able to write through a link into the repository.
- No comments in config files.
- Rex is a beta (`0.1.0-preview.20`), installed by hand, self-updating. Several items below exist only because of that and carry a removal condition.
- The session that implements this runs inside tmux today. tmux is removed last, after the owner has moved to Rex.

## Approaches

Three ways of reaching one colour scheme were considered.

| | A. Upstream theme, tool defaults | B. Own palette spec and a generator | C. Keep One Dark Pro, trim |
|---|---|---|---|
| Source of colours | each tool's official port of one theme | one file here, rendered into each tool's format | `onedarkpro.nvim` plus hand copies |
| Maintained here | theme names | palette, generator, per-tool templates | overrides in five places |
| Weak contrast cells | accepted as shipped | fixable | fixable |
| Light/dark switch | each tool follows the terminal or system | generator emits both | as today |

**Chosen: A.** B gives full control but is exactly the kind of machinery the owner wants to stop maintaining. C was the status quo: One has no maintained family of official ports, so every tool beyond nvim was a hand copy.

The scheme is **Rosé Pine**: Main for dark, Dawn for light. It was chosen for having official, maintained ports for every tool here (nvim, Ghostty, fish, Alfred) and semantic-token highlight groups. Considered and dropped: One (onedarkpro, `navarasu/onedark.nvim`, the Zed port), Catppuccin (too pink), Tokyo Night (too purple), Modus, Kanagawa, GitHub, nvim's built-in scheme. Main was preferred over Moon.

Accepted weak cells: keywords and the terminal's "green" are `#31748f`, Lc 25 on Main; dropbar has no dedicated groups; Dawn's terminal text `#575279` is slightly lighter than nvim's `#464261`.

Where colours come from after the change:

| Tool | Source | In the repository |
|---|---|---|
| Terminal (Rex, Ghostty) | Ghostty's bundled `Rose Pine` and `Rose Pine Dawn` | theme names only |
| nvim | `rose-pine/neovim` | one `colorscheme` line |
| fish | `rose-pine/fish`, theme `Rosé Pine Auto` | one `fish_config theme choose` line |
| fish prompt | pure, coloured by `rose-pine/fish` | nothing |
| pi | pi's built-in `system` theme, derived from the terminal | nothing |
| `ls`, `eza` | terminal's 16 colours | nothing |
| Alfred | `rose-pine/alfred`, imported by hand | a manual step |
| OmniWM | two hand-copied values | six numbers |

## Decisions by area

### Terminal: Rex replaces tmux

tmux and its config go. Rex's keys stay at their defaults: no `~/.config/rex/init.lua`.

- **Install**: by hand, not in the `brewfile`. *Temporary: when Rex has a release with a cask, reinstall from it and add it to the `brewfile`.*
- **CLI**: `~/.local/bin/rex` is a link to `~/Library/Application Support/com.superlogical.rex/RexServer/Versions/Current/Rex Server.app/Contents/MacOS/rex` (`Current` moves with updates), created by a `just` recipe.
- **Appearance**: a `just` recipe sets it through `rex do`, since Rex keeps appearance in macOS defaults and has no file for it:
  - `rex do client.theme.import --args '{"path":"<absolute path>"}'` for the two theme files under `/Applications/Ghostty.app/Contents/Resources/ghostty/themes/`
  - `rex do client.setting.themes.dark.palette value="Rose Pine"`, `client.setting.themes.light.palette value="Rose Pine Dawn"`
  - `client.setting.terminal.typography.font value="Maple Mono NF CN"`, `client.setting.terminal.typography.size value=14`, `client.setting.interface.appearance.scheme value=auto`
  - `client.setting.terminal.keyboard.option value=sends_alt`, so `⌥hjkl` reaches mini.move in nvim. Set explicitly rather than trusting Rex's `automatic`.
  - `client.setting.terminal.typography.line_height value=24`, the owner's habit carried over from Ghostty's `adjust-cell-height = 24%`. Rex's binary describes the setting as "Line height adjustment in percent"; that 24 gives the same spacing is to be confirmed by eye.
  
  Everything else in Rex stays at its default, including ligatures and the font's `ss11` variant, for which Rex has no setting.
  
  It needs Rex running with a window and Remote Control switched on by the owner (an agent must not switch it on). It is therefore not part of `just setup`; `manual-setup` lists it. A palette name that does not exist returns `invalid_value`, which lets the recipe import only when needed. Rex has no action to delete a theme: the two old `onedarkpro_*` themes are deleted by hand in Rex's settings.
- **terminfo**: `xterm-rex` is compiled into `/usr/local/share/terminfo` by `just etc` (`rex terminfo show`, then `tic -x -o`), skipped when Rex is absent. `TERMINFO_DIRS` in `env.fish` gains that directory. Rex's own `rex terminfo setup` writes `~/.terminfo` and is not used; `--system` is refused on macOS; Rex's server does not look in `XDG_DATA_HOME`. *Temporary: when `xterm-rex` ships in ncurses, remove the recipe lines and the `TERMINFO_DIRS` entry.*
- **ssh guard**: Rex switches to `TERM=xterm-rex` only when it also finds a guard that keeps the name from hosts without the entry. The guard is written directly into `config/ssh/.ssh/config`, after the existing `Include` line and before `Host *`:
  ```
  Match exec "/bin/sh -c '[ x$TERM = xxterm-rex ] && ! grep -qxF -- %h ~/.config/rex/terminfo-hosts 2>/dev/null'"
      SetEnv TERM=xterm-256color
  ```
  Inline rather than Rex's own `Include` of `~/.config/rex/ssh_config`, because that file is one Rex rewrites and it would live outside the repository. Measured: with this block `ssh -G` reports `setenv TERM=xterm-256color` under `TERM=xterm-rex` and nothing otherwise, and `rex terminfo status` reports the include as "not needed, because … already includes a guard". Not yet measured: the full "ready" verdict, which needs the real home directory.
- **Ghostty stays as a fallback** with a five-line config: `theme = dark:Rose Pine,light:Rose Pine Dawn`, `font-family = Maple Mono NF CN`, `font-size = 14`, `macos-option-as-alt = true`, `adjust-cell-height = 24%`. The last two are the same two habits Rex is given. The other eleven lines go, among them `command` (which started tmux), `shell-integration = none`, the hidden title bar and the font features. Its two theme files are deleted. *Temporary: delete the package, the cask and its document when Rex has a proper release.*
- **Background detection**: Rex answers OSC 10, OSC 11, DSR 996 and mode 2031; nvim open during a system switch follows it (seen by the owner).
- Rex's agent skill stub already lives in `~/.local/share/agents/skills/rex/`. `rex skill setup` writes `~/.agents` and must not be run.

### fish

- **Prompt: pure (`pure-fish/pure`), unconfigured.** Two lines, `❯` in insert mode and `❮` in normal mode, plus fish's cursor shapes.
  - Rejected: Starship (30/113 ms in this repository and a large one, and a config file to maintain), fish's built-in prompt, a six-line hand-written prompt, tide (84 files, 165 universal variables, asynchronous).
  - Accepted cost: pure redraws on every vi-mode switch, six git commands, 51 to 73 ms. If it ever feels slow, overriding `fish_mode_prompt` in `config.fish` removes the git calls at the price of the reversing arrow.
  - pure's `⇡ ⇣` are not in Maple Mono NF CN and come from a fallback font.
- **Colours: `rose-pine/fish`, `Rosé Pine Auto`**, by one line in `config.fish`: `fish_config theme choose "Rosé Pine Auto"`. `LS_COLORS` and `EZA_COLORS` are no longer set.
- **Plugin manager: fisher**, from the `brewfile`. A stowed `fish_plugins` lists the plugins; `just plugins` runs `fisher update`.
- **Deleted** (333 lines): `conf.d/prompt.fish`, `conf.d/theme.fish`, `functions/fish_prompt.fish`, `fish_mode_prompt.fish`, `fish_title.fish`, `fish_user_key_bindings.fish`.
- **Order matters.** pure ships `fish_prompt.fish`, `fish_mode_prompt.fish` and `fish_title.fish`, and fisher installs with `cp -f`, which follows a link. The repository files must be deleted and their links in `~/.config/fish/functions/` removed (`just relink`) before fisher first runs, or fisher writes pure into the repository.
- Unchanged: `env.fish` apart from `TERMINFO_DIRS`, `fish_vi_key_bindings`, `fish_cursor_external line`, zoxide, the `fish_greeting`, `ls`, `rm`, `vi`, `vim`, `wget` functions.

### nvim

Nine plugins as before, with `onedarkpro.nvim` replaced by `rose-pine/neovim`. Helix was considered and nvim kept.

| Item | Result |
|---|---|
| Colours | `vim.cmd.colorscheme "rose-pine"` in `init.lua`; no overrides. `lua/theme.lua` (82 lines) deleted |
| Statusline | a hand-written `lua/statusline.lua`, 49 lines, replacing mini.statusline and its pills |
| Bottom of the screen | no empty line: `cmdheight = 0`, `showcmdloc = "statusline"` |
| Messages | nvim 0.12's new message UI: `require("vim._core.ui2").enable { msg = { targets = "msg" } }` |
| dropbar | symbols only, no file path |
| Diagnostics | dots in the sign column and statusline, upright end-of-line text, nvim's default `■` prefix |
| Completion | blink.cmp kept; settings equal to its defaults removed |
| Modules | mini.statusline, snacks.notifier and snacks.input removed; mini.clue's config trimmed; the rest kept |
| Semantic tokens | nothing added; they are already on |
| Options | `showmode = false` removed, two added, the other 23 kept |

**Statusline.** The prototype is `2026-11-19-defaults-redesign-prototypes/statusline.lua`; use it as written. Left to right: the mode as one coloured letter with no background, the file name, `[+]`; on the right the pending command (`%S`), `recording @q`, the search count (`4/4`), diagnostics, and the filetype icon at the far end. No cursor position.

- The mode letter's colour is the background Rosé Pine defines for `MiniStatuslineMode*`, reused as a foreground and re-read on `ColorScheme`. Measured without mini.statusline's `setup()`: the groups exist (the theme defines them) and `require("mini.statusline").section_mode` works. Contrast Lc 59 to 71 dark, 52 to 63 light.
- The search count and macro recording are in the statusline because `cmdheight = 0` hides nvim's own.
- Diagnostics use `vim.diagnostic.config { status = { format = … } }` to print `● 2 ● 1` without nvim's default colons:
  ```lua
  local names = { "Error", "Warn", "Info", "Hint" }
  vim.diagnostic.config { status = { format = function(counts)
    local text = vim.diagnostic.config().signs.text
    local parts = {}
    for severity, name in ipairs(names) do
      if counts[severity] then parts[#parts + 1] = ("%%#DiagnosticSign%s#%s %d"):format(name, text[severity], counts[severity]) end
    end
    return table.concat(parts, " ")
  end } }
  ```
- The icon comes from mini.icons. `MiniIcons.mock_nvim_web_devicons()` stays: dropbar only knows nvim-web-devicons.
- `<Esc>` must become `function() vim.cmd.nohlsearch() vim.schedule(vim.cmd.redrawstatus) end`, or the count lingers. The `<cmd>nohlsearch<Bar>redrawstatus<CR>` form leaves `~@<fd>` in the statusline.
- Rejected: mini.statusline's default look, nvim's built-in statusline plus an icon, the mode as `-- INSERT --` or as a coloured block, diagnostics as letters or Zed-style icons, the icon beside the file name.

**Messages.** `ui2` is experimental. Without it, `cmdheight = 0` makes `E486` and multi-line messages wait for Enter. `vim.notify` then appears bottom right. *Temporary: when it becomes nvim's default, delete the line.*

**dropbar**, symbols only:

```lua
require("dropbar").setup { bar = { sources = function(buf)
  local sources = require "dropbar.sources"
  local utils = require "dropbar.utils"
  if vim.bo[buf].ft == "markdown" then return { sources.markdown } end
  if vim.bo[buf].buftype == "terminal" then return { sources.terminal } end
  return { utils.source.fallback { sources.lsp, sources.treesitter } }
end } }
```

**Kept at their current, non-default characters** by the owner's choice: snacks.indent's `▏`, mini.diff's `▎` in the sign column, snacks.statuscolumn. Kept modules: snacks bigfile, words, indent, statuscolumn; mini icons, diff, pairs, surround, move, clue. With snacks.input gone, `grn` prompts at the bottom of the screen.

**Semantic tokens.** gopls's own default is off, but nvim-lspconfig has sent `semanticTokens = true` since 2026-06-02; measured with the real config, a Go file receives token updates. No `lsp/gopls.lua` is added.

**End-of-line diagnostic text** becomes upright (Rosé Pine's default; onedarkpro was configured italic).

### pi

Features stay; appearance returns to pi's own.

- **Colours: the built-in `system` theme.** The two theme files (86 lines each) are deleted, and `"theme"` is removed from the local `~/.config/pi/settings.json` (with no `theme` key pi uses `system`).
  - Rejected: a single file naming the 16 terminal colours (secondary text only Lc 25 on dark; success and failure blocks indistinguishable); two Rosé Pine hex files (closest to the palette, but 170 lines here). `system` derives hues from the terminal and computes lightness itself, so its colours are near Rosé Pine rather than equal to it: gold headings, purple inline code, a saturated red failure block. The owner chose it knowing that.
- **Editor**: `extensions/editor.ts` is replaced by the prototype `2026-11-19-defaults-redesign-prototypes/editor.ts` (147 lines, down from 231; it type-checks against pi 1.5.2 and holds no colour).
  - The pills above the input are gone. The same information is plain `muted` text in the right end of the input's bottom rule, opposite `Working` in the top rule (`embedWorkingStatus`): token counts, cost, context use, `provider/model level`. Context turns `warning` above 70% and `error` above 90%.
  - On a narrow terminal items drop in this order: tokens, provider, cost, context.
  - The `❯` at the start of the input stays, and becomes `$` when the text starts with `!`. It is not drawn while lines are scrolled off above.
  - Rule and arrow take pi's default colour, which follows the thinking level; no override.
  - Rejected: the information at the left of the bottom rule (stacks against the subagent lines, also left-aligned); pi's built-in footer (no extension code at all, but two more lines, one of them the directory the owner had removed on purpose, and multi-line subagent status collapses into one line).
  - Cost: it overrides `renderTopBorder`, `renderBottomBorder`, `render` and `setPaddingX` of pi's editor; a rename upstream breaks it, and the type check catches that.
- `extensions/footer.ts` (27 lines) and the subagent extension are unchanged.

### Alfred and OmniWM

- **Alfred**: import `rose-pine.alfredappearance` and `rose-pine-dawn.alfredappearance` from `rose-pine/alfred`, select one for each system appearance, delete the three hand-made One themes. A manual step; Alfred's preferences stay out of the repository. The font becomes the system font and the selected row a solid rose bar; accepted.
- **OmniWM**: `borders.color` becomes `#907aa9` (red 0.5647058823529412, green 0.47843137254901963, blue 0.6627450980392157) and `borders.darkColor` `#c4a7e7` (red 0.7686274509803922, green 0.6549019607843137, blue 0.9058823529411765). Borders stay disabled; the colour only shows on the selected window in Overview, through `overview.matchFocusBorder`.

### Documents

Documents describe the current state and the reason for each departure from a default. Rejected alternatives and measurements live in design documents under `docs/superpowers/specs/` and in git history, not in the per-area documents. This replaces the house-style sentence "Every measured value and every rejected alternative is kept, with its date".

The rule is applied now to the documents this change rewrites. The others keep their dated history for the moment and are converted whenever they are next edited; only their passages about things removed here change now. This document and its prototypes are committed once the owner approves it.

| Document | Change |
|---|---|
| `docs/tmux.md`, `docs/fish-prompt.md` | deleted |
| `docs/rex.md` | new: the CLI link, the appearance recipe, terminfo, the ssh guard, the removal conditions. `paths`: `config/ssh/**`, `justfile` |
| `docs/ghostty.md` | rewritten: fallback, five lines, removal condition |
| `docs/neovim.md`, `docs/fish.md`, `docs/pi-ui.md` | rewritten to the new state; `docs/pi-ui.md` loses its `themes` glob |
| `docs/env.md`, `docs/omniwm.md`, `docs/setup.md`, `docs/pi.md`, `docs/pi-subagents.md` | only the passages about tmux, pills, the old palette or `TERMINFO_DIRS`; otherwise left as they are |
| `docs/homebrew.md`, `docs/git.md` | untouched |
| `.pi/skills/theme/SKILL.md` | from 202 lines to a short page: where each tool gets Rosé Pine, the no-override rule, the Alfred both-appearances reminder |
| `.pi/skills/manual-setup/SKILL.md` | adds Rex (install, Remote Control, the recipe, deleting old themes), the Alfred import, the pi `theme` key |
| `AGENTS.md`, `README.md` | the house-style sentence, the index table, the Agents paragraph, the setup steps |

`rules.ts` and `scripts/check-docs.py` are unchanged; the index table and every `paths` glob must still pass `just check`.

## Temporary items

| Item | Remove when |
|---|---|
| Ghostty package, cask, `docs/ghostty.md` | Rex has a proper release |
| Rex installed by hand | Rex has a cask: reinstall from it, add it to the `brewfile` |
| `xterm-rex` in `just etc`, the `TERMINFO_DIRS` entry | `xterm-rex` ships in ncurses |
| `vim._core.ui2` line in nvim | it becomes nvim's default |
| The two prototype files beside this document | the real files have landed |

## Order

1. Rex pieces (CLI link, terminfo, ssh guard, appearance), then the owner moves into Rex.
2. fish: delete the old files, relink, then fisher.
3. nvim, pi, Ghostty, OmniWM.
4. Documents and skills.
5. tmux last: the package directory, the `brewfile` line, the `packages` entry in the `justfile`.

## Left to the builder

Calls made while writing this, for the owner to check:

- A Rex app rule in OmniWM's `settings.toml` (`com.superlogical.rex`, workspace 1, tiled), beside the Ghostty one. `launcher.terminal` and `quakeTerminal.provider` stay `"ghostty"` while Ghostty is installed.
- The hand-registered tmux treesitter parser in `lua/treesitter.lua` goes with tmux.
- `scripts/theme-preview.py` (untracked, previews the pill design) is deleted. It is not in git, so this is not recoverable.
- `.superpowers/` is added to `.gitignore`.
- `docs/rex.md` as its own document rather than a section of `docs/setup.md`.
- Ghostty keeps `adjust-cell-height = 24%` so the fallback looks like Rex; the owner asked for the line height in Rex only.

To verify during implementation:

- `rex terminfo status` says ready with the real home directory, and `TERM` is `xterm-rex` in a new Rex terminal.
- Importing a Rex theme twice does not duplicate it; the font, size and scheme actions change the value (so far only seen with the current values).
- `⌥hjkl` moves lines in nvim inside Rex, and Rex's line height at 24 matches Ghostty's 24%.
- `Rosé Pine Auto` in a real Rex window and in nvim's `:terminal`; vi cursor shapes in Rex.
- Whether `fish_plugins` needs a `jorgebucaran/fisher` line when fisher comes from Homebrew.
- Whether Touch ID for sudo works in Rex without `pam-reattach`; if so, drop the formula and its line in `just etc`.
- Which blink.cmp settings equal its defaults (the three `border = "rounded"` may be covered by `winborder`).
- `-- INSERT --` does not appear once `showmode = false` is gone.
- How LSP progress shows in the statusline.
- The pi editor with a real subagent running, with `/model` open, and across a light/dark switch inside Rex.
- `docs/pi-subagents.md` describes testing pi's TUI in a private tmux server; rewrite that paragraph for `rex` once the equivalent commands are confirmed.
