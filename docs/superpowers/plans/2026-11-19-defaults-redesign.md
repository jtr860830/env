# Defaults Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-tuned One Dark Pro appearance and tmux with Rosé Pine's upstream themes, Rex and tool defaults, keeping every feature.

**Architecture:** Nine tasks in the spec's order. Files under `config/` are live through stow links, so there is no test suite: each task's tests are commands run against the real home directory, the `rex` CLI, headless nvim and `tsc`, with the output that means pass. Every task ends with the machine working and `just check-docs` green.

**Tech Stack:** GNU stow, just 1.59, Homebrew bundle, fish 4.9 with fisher, Neovim 0.12 (`vim.pack`), pi 1.5.2 extensions (TypeScript, `tsc` 7), Rex 0.1.0-preview.21, OmniWM 0.8.

**Spec:** `docs/superpowers/specs/2026-11-19-defaults-redesign-design.md`. Read it first; this plan does not repeat its reasons.

## Global Constraints

- Work on `main` in this checkout, not a worktree: `~` holds links into this directory, and a worktree would test nothing.
- No comments in config files. No hex colour in `config/` except OmniWM's two values (stored as floats).
- No colour override on top of an upstream theme; a weak cell is accepted.
- Nothing may create a dot entry in `~`. `ls -A ~ | grep '^\.'` must stay `.cache .config .local .ssh .Trash`. Never run `rex terminfo setup` or `rex skill setup`.
- Scripts run under BSD tools (`sed -i ''`). stow always with `--no-folding`. `brewfile` stays one flat alphabetical list per type.
- Every commit passes `just check-docs`. A task that deletes a document or a file named by a `paths` glob fixes the references and the `AGENTS.md` index row in the same commit.
- `just check` fails today on `brew bundle check` (the `claude-code` cask is out of date). That is the baseline, not a regression; use `just check-docs` and the `stow -n` line as the gates.
- Documents rewritten here state the current setup and the reason for each departure from a default, with no dates, measurements or rejected alternatives. Other documents change only where they mention something removed.
- Commit style `type: description`. Commits are signed through 1Password, so the owner approves each one.
- Steps marked **Owner** need the owner's hands or eyes (sudo, Touch ID, Rex's window, Alfred). Stop and ask; do not work around them.
- Agents must not switch on Rex's Remote Control, and must select the owner's session back after showing another one in Rex's window.

## Departures from the spec

Found while checking the spec against the machine on 2026-11-19; the owner agreed to the first four and asked for the last two.

1. **fish theme.** The spec's one line prints errors on every prompt wherever the terminal has not reported light or dark. Rex answers colour queries only for the session its window is showing, so a session made with `rex new` gets no answer, and a new split pane missed it in 4 of 11 starts. A function handles it (Task 3).
2. **`rose-pine/neovim` is added as `{ src = …, name = "rose-pine" }`**, upstream's own `vim.pack` form; without it the plugin is called `neovim`.
3. **`just link` restows (`stow -R`).** `just relink` only visits files still in the repository, so it leaves the link of a deleted file dangling, and `cp -f` onto a dangling link recreates the file in the repository. `stow -R` has one limit, measured: when a whole directory leaves a package, the links inside it stay. Tasks 5 and 6 delete such directories and remove those links by name; Task 9 uses `stow -D` before deleting.
4. **sudo and `xterm-rex`: nothing is done.** sudo drops `TERMINFO_DIRS`, so `top`, `tput` and `clear` under sudo report an unknown terminal; `docs/rex.md` gives `sudo TERM=xterm-256color <command>`.
5. **Documents move with their area** rather than in one late step, because `check-docs` rejects a `paths` glob that matches no file.
6. **The entry is compiled with `/usr/bin/tic`**, never Homebrew's: Homebrew's `tic` writes a newer format once an entry holds a number above 32767, which Apple's ncurses cannot read (`alacritty` from Homebrew's database is "unknown terminal" to `/usr/bin/tput`), while both read Apple's output. For today's `xterm-rex` the two write byte-identical files; this guards a later change to the entry.
7. **pure takes two settings.** The owner wants `$` as the prompt symbol in every vi mode, with the mode told by the cursor's shape alone, so `pure_symbol_prompt` and `pure_symbol_reverse_prompt` are both `$` (Task 3). The spec's "unconfigured" and its `❯`/`❮` no longer hold.
8. **dropbar's symbols are not clickable.** The owner wants the breadcrumb only: `symbol = { on_click = false }` (Task 4). Nothing else opens dropbar's menu; no key is bound to it.
9. **`fish_plugins` is at the repository's root and copied, not stowed** (found by the final review, after Task 3 as written below). fisher rewrites the file from what it managed to install and still exits 0 when a download fails, which through a link dropped the plugin from the repository's list. `just plugins` copies the list into `~/.config/fish`, runs `fisher update </dev/null` and checks every listed plugin is installed.

## Review Focus

1. **A Mac without Rex** (a fresh `just setup`): `link` and `etc` skip their Rex lines and succeed. Test in Task 1, step 2.
2. **`just rex` when Rex refuses** (Remote Control off, no window): it fails with Rex's own message, sets nothing, and a second run imports nothing twice. Tests in Task 2, steps 2 and 5.
3. **A terminal that has not reported light or dark** (background Rex session, new split pane, no tty): fish starts without an error line and follows the report when it comes. Tests in Task 3, step 7.
4. **A file deleted from `config/`**: no link to it is left in `~`, so no plugin manager can write through one. Tests in Task 3, steps 5 and 7; Task 5, step 2; Task 6, step 2.
5. **ssh from `TERM=xterm-rex`** to a host without the entry gets `xterm-256color`; a host listed in `~/.config/rex/terminfo-hosts` keeps `xterm-rex`. Test in Task 1, step 6.

## File Structure

| Path | Change | Responsibility |
|---|---|---|
| `justfile` | modify | `rex_bin`, `rex_themes` variables; `link` restows and links the Rex CLI; `etc` compiles `xterm-rex`; new `rex` recipe; `plugins` runs fisher; `packages` loses `tmux` |
| `brewfile` | modify | add `fisher`, remove `tmux` |
| `.gitignore` | modify | add `.superpowers/` |
| `config/ssh/.ssh/config` | modify | the `TERM` guard |
| `config/fish/.config/fish/conf.d/env.fish` | modify | `TERMINFO_DIRS` gains `/usr/local/share/terminfo` |
| `config/fish/.config/fish/config.fish` | modify | pure's two symbols, one call to `__apply_theme` |
| `config/fish/.config/fish/functions/__apply_theme.fish` | create | choose `Rosé Pine Auto`, dark until the terminal reports |
| `config/fish/.config/fish/fish_plugins` | create | fisher's plugin list |
| `config/fish/…/conf.d/{prompt,theme}.fish`, `functions/fish_{prompt,mode_prompt,title,user_key_bindings}.fish` | delete | replaced by pure and `rose-pine/fish` |
| `config/nvim/.config/nvim/lua/statusline.lua` | create (moved from the prototype) | the statusline |
| `config/nvim/.config/nvim/lua/theme.lua` | delete | |
| `config/nvim/.config/nvim/init.lua`, `lua/{options,keymaps,diagnostics,completion,plugins,treesitter}.lua` | modify | see Tasks 4 and 9 |
| `config/pi/.config/pi/extensions/editor.ts` | replace (moved from the prototype) | arrow and information rule |
| `config/pi/.config/pi/themes/*.json` | delete | |
| `config/ghostty/.config/ghostty/config` | rewrite | five lines |
| `config/ghostty/.config/ghostty/themes/*` | delete | |
| `config/omniwm/.config/omniwm/settings.toml` | modify | two colours, one app rule |
| `config/tmux/` | delete | |
| `docs/rex.md` | create | everything Rex needs here |
| `docs/tmux.md`, `docs/fish-prompt.md` | delete | |
| `docs/{fish,neovim,pi-ui,ghostty}.md`, `.pi/skills/theme/SKILL.md` | rewrite | current state |
| `docs/{env,omniwm,setup,pi,pi-subagents}.md`, `.pi/skills/manual-setup/SKILL.md`, `AGENTS.md`, `README.md` | modify | passages named in the tasks |
| `docs/superpowers/specs/2026-11-19-defaults-redesign-prototypes/` | emptied by `git mv` | |
| `scripts/theme-preview.py` | delete (untracked, not recoverable) | |

Unchanged: `config/{git,npm,tealdeer,claude,codex}`, `footer.ts`, the subagent extension, `.pi/extensions/rules.ts`, `scripts/check-docs.py`, `docs/{homebrew,git}.md`, `bootstrap.sh`.

---

### Task 1: Rex CLI link, terminfo, ssh guard

**Files:**
- Modify: `justfile` (variables, `link`, `etc`), `config/fish/.config/fish/conf.d/env.fish:22`, `config/ssh/.ssh/config`, `docs/env.md:40`, `docs/setup.md:13`, `AGENTS.md` (index), `README.md`
- Create: `docs/rex.md`

**Interfaces:**
- Produces: just variables `rex_bin`, `rex_themes`; `~/.local/bin/rex`; `/usr/local/share/terminfo/78/xterm-rex`; `docs/rex.md` with `paths: ["config/ssh/**", "justfile"]`.

- [ ] **Step 1: See the starting state**

Run: `~/.local/bin/rex version; "$HOME/Library/Application Support/com.superlogical.rex/RexServer/Versions/Current/Rex Server.app/Contents/MacOS/rex" terminfo status | tail -5`
Expected: `No such file or directory`, then a block containing `Not ready`. (`terminfo status` exits 0 either way; read the text.)

- [ ] **Step 2: `justfile` variables, `link` and `etc`**

```just
rex_bin := env("HOME") / "Library/Application Support/com.superlogical.rex/RexServer/Versions/Current/Rex Server.app/Contents/MacOS/rex"
rex_themes := "/Applications/Ghostty.app/Contents/Resources/ghostty/themes"

link:
    stow --no-folding -R -d config -t ~ {{packages}}
    [ ! -x "{{rex_bin}}" ] || { mkdir -p ~/.local/bin && ln -sfn "{{rex_bin}}" ~/.local/bin/rex; }
```

Append to `etc`, after the `chmod 444` line:

```just
    [ ! -x "{{rex_bin}}" ] || { sudo mkdir -p /usr/local/share/terminfo && "{{rex_bin}}" terminfo show | sudo /usr/bin/tic -x -o /usr/local/share/terminfo /dev/stdin; }
```

Run: `just --set rex_bin /nonexistent link; echo $?` → `0`, and `~/.local/bin/rex` still absent.
Run: `just link && rex version && readlink ~/.local/bin/rex | grep -c '/Versions/Current/'` → a `rex 0.1.0-preview` line, then `1`.

- [ ] **Step 3: `TERMINFO_DIRS`**

`env.fish:22` becomes `set -gx TERMINFO_DIRS /opt/homebrew/opt/ncurses/share/terminfo:/usr/local/share/terminfo` (one colon-joined string; fish does not split this variable).

- [ ] **Step 4: ssh guard**

In `config/ssh/.ssh/config`, between the `Include` line and `Host *`, with a blank line on each side:

```
Match exec "/bin/sh -c '[ x$TERM = xxterm-rex ] && ! grep -qxF -- %h ~/.config/rex/terminfo-hosts 2>/dev/null'"
    SetEnv TERM=xterm-256color
```

- [ ] **Step 5 (Owner): `just etc` in the owner's terminal**

`tic` prints one warning about "older tic versions"; it is harmless.

- [ ] **Step 6: Verify**

```sh
for t in xterm-rex xterm-256color; do printf '%s: ' $t; TERM=$t ssh -G example.invalid | grep -i '^setenv' || echo none; done
env -i TERMINFO_DIRS=/opt/homebrew/opt/ncurses/share/terminfo:/usr/local/share/terminfo TERM=xterm-rex /usr/bin/tput colors
rex terminfo status | tail -4
rex new plan-term --shell=none -- /bin/sh -c 'echo TERM=$TERM; sleep 15'; sleep 2; rex capture -s plan-term --trim | grep TERM=; rex kill plan-term
ls -A ~ | grep '^\.' | tr '\n' ' '
```

Expected: `xterm-rex: setenv TERM=xterm-256color`, `xterm-256color: none`; `256`; a line starting `Ready`; `TERM=xterm-rex`; `.cache .config .local .ssh .Trash`. Then add `example.invalid` to a scratch `HOME`'s `.config/rex/terminfo-hosts` and confirm `HOME=<scratch> TERM=xterm-rex ssh -F config/ssh/.ssh/config -G example.invalid` prints no `setenv`.
If `TERM` is still `xterm-256color`, the server decided before the entry existed. Ask the owner before restarting it; a restart may end their sessions.

- [ ] **Step 7: Documents**

- `docs/rex.md`, frontmatter `paths: ["config/ssh/**", "justfile"]`. Sections: the CLI link and why it targets `Current`; `just rex` and what it needs (Task 2 fills this in); terminfo (why `/usr/local/share/terminfo`, why `/usr/bin/tic`, rerun `just etc` when `rex terminfo status` stops saying Ready, the sudo sentence from departure 4); the ssh guard and why it is inline; colour reporting (only the session on screen is answered; `docs/fish.md` has the consequence); driving a TUI with `rex new` / `send` / `send-key` / `capture --trim` / `kill`; the four removal conditions that concern Rex from the spec's Temporary items.
- `docs/env.md:40`: the new value, and that Apple's tools cannot read Homebrew-compiled entries.
- `docs/setup.md:13` and `README.md` step 2: `just etc` also compiles `xterm-rex`. README table: `just link` is "after adding or removing a file under `config/`".
- `AGENTS.md` index: a `docs/rex.md` row; update the `docs/env.md` and `docs/setup.md` rows.

- [ ] **Step 8: Commit**

Run: `just check-docs && stow --no-folding -n -d config -t ~ ssh fish` → OK, no output.
`git commit -m "feat: Rex CLI link, xterm-rex terminfo and ssh guard"`

### Task 2: Rex appearance recipe

**Files:**
- Modify: `justfile` (new `rex` recipe), `docs/rex.md`, `.pi/skills/manual-setup/SKILL.md`, `README.md`

**Interfaces:**
- Consumes: `rex_bin`, `rex_themes` from Task 1.
- Produces: `just rex`.

- [ ] **Step 1: The recipe**

```just
rex:
    "{{rex_bin}}" do client.setting.themes.dark.palette value="Rose Pine" 2>/dev/null || { "{{rex_bin}}" do client.theme.import --args '{"path":"{{rex_themes}}/Rose Pine"}' && "{{rex_bin}}" do client.setting.themes.dark.palette value="Rose Pine"; }
    "{{rex_bin}}" do client.setting.themes.light.palette value="Rose Pine Dawn" 2>/dev/null || { "{{rex_bin}}" do client.theme.import --args '{"path":"{{rex_themes}}/Rose Pine Dawn"}' && "{{rex_bin}}" do client.setting.themes.light.palette value="Rose Pine Dawn"; }
    "{{rex_bin}}" do client.setting.interface.appearance.scheme value=auto
    "{{rex_bin}}" do client.setting.terminal.typography.font value="Maple Mono NF CN"
    "{{rex_bin}}" do client.setting.terminal.typography.size value=14
    "{{rex_bin}}" do client.setting.terminal.typography.line_height value=24
    "{{rex_bin}}" do client.setting.terminal.keyboard.option value=sends_alt
```

`rex` is not added to `setup`.

- [ ] **Step 2: It fails loudly when Rex refuses**

Write an executable stub that prints `Error: Rex.app is not accepting actions.` to stderr and exits 1.
Run: `just --set rex_bin <stub> rex; echo $?` → the stub's message, `recipe `rex` failed`, `1`.

- [ ] **Step 3: Record the theme list, change one value the recipe must restore**

```sh
names() { defaults export com.superlogical.rex - | plutil -extract 'Workspace\.customThemes' raw -o - - | base64 -d | python3 -c 'import json,sys; print(sorted(t["name"] for t in json.load(sys.stdin)))'; }
names; rex do client.setting.terminal.typography.size value=15; defaults read com.superlogical.rex Workspace.terminalFontPointSize
```

Expected: a list containing `Rose Pine` and `Rose Pine Dawn` once each; `15`. If `rex do` reports that Rex is not accepting actions, stop: the **Owner** switches Remote Control on.

- [ ] **Step 4: Run it**

Run: `just rex && defaults export com.superlogical.rex - | plutil -p - | grep -E 'terminalFontPointSize|terminalCellHeightPercent|terminalFontName|"Workspace.appearance"'`
Expected: `14`, `24`, `"Maple Mono NF CN"`, `"system"`.

- [ ] **Step 5: A second run changes nothing**

Run: `just rex && names` → the same list as step 3.

- [ ] **Step 6 (Owner): look**

In a Rex window: `⌥j` moves a line in nvim (mini.move); the spacing looks like Ghostty's; the system's light/dark switch flips Rex and an open nvim. Then delete `onedarkpro_onedark` and `onedarkpro_onelight` in Rex's settings if still listed (Rex has no action for it).

- [ ] **Step 7: Documents, commit**

`docs/rex.md`: what each line of the recipe is for, that it needs a Rex window and Remote Control and so stays out of `just setup`. `manual-setup`: a **Rex** bullet (install by hand, switch on Remote Control, `just etc`, `just rex`, delete old themes). README: a `just rex` row and Rex under "Not automated".
`git commit -m "feat: just rex sets Rex's themes, font, line height and Option key"`

**Checkpoint (Owner):** the owner moves their work into Rex. The tasks below can run from either terminal; Task 9 only from outside tmux.

### Task 3: fish — pure, Rosé Pine, fisher

**Files:**
- Delete: `config/fish/.config/fish/conf.d/prompt.fish`, `conf.d/theme.fish`, `functions/fish_prompt.fish`, `functions/fish_mode_prompt.fish`, `functions/fish_title.fish`, `functions/fish_user_key_bindings.fish`, `docs/fish-prompt.md`
- Create: `config/fish/.config/fish/functions/__apply_theme.fish`, `config/fish/.config/fish/fish_plugins`
- Modify: `config/fish/.config/fish/config.fish`, `brewfile`, `justfile` (`plugins`), `docs/fish.md` (rewrite), `AGENTS.md`, `README.md`, and the references in step 8

**Interfaces:**
- Produces: `__apply_theme` (no arguments; `--on-variable fish_terminal_color_theme`); `just plugins` runs `fish -c 'fisher update'` first.

- [ ] **Step 1: See the starting state**

Run: `fish -i -c 'functions -q _pure_prompt; or echo "no pure"; echo $fish_color_command[1]' </dev/null 2>&1 | tail -2`
Expected: `no pure` and a value that is not `c4a7e7`.

- [ ] **Step 2: fisher**

`brewfile`: `brew "fisher"` between `brew "fish"` and `brew "fx"`. Run `brew install fisher` (`just install` would also upgrade unrelated packages).
`justfile` `plugins`: first line `fish -c 'fisher update'`, then `@echo >&2`, then the existing lines.

- [ ] **Step 3: Delete the six fish files and `docs/fish-prompt.md`** with `git rm`.

- [ ] **Step 4: `__apply_theme` and `config.fish`**

`functions/__apply_theme.fish`:

```fish
function __apply_theme --on-variable fish_terminal_color_theme
    if contains -- "$fish_terminal_color_theme" dark light
        fish_config theme choose "Rosé Pine Auto"
    else
        fish_config theme choose "Rosé Pine Auto" --color-theme=dark
    end
end
```

`config.fish`, whole:

```fish
status is-interactive; and begin
    fish_vi_key_bindings
    set -g fish_cursor_external line
    set -g pure_symbol_prompt '$'
    set -g pure_symbol_reverse_prompt '$'
    __apply_theme

    zoxide init fish | source
end
```

The `__apply_theme` call is required: a file in `functions/` is read on first call, and only then does the handler exist.

`fish_plugins`: two lines, `pure-fish/pure` and `rose-pine/fish`. No `jorgebucaran/fisher` line: Homebrew owns fisher.

- [ ] **Step 5: Restow before fisher ever runs**

Run: `just link; find ~/.config/fish -type l ! -exec test -e {} \; -print; ls -l ~/.config/fish/functions/fish_prompt.fish`
Expected: nothing from `find`; `No such file or directory`. Do not continue otherwise: fisher would write pure into the repository.

- [ ] **Step 6: `just plugins`**

- [ ] **Step 7: Verify**

```sh
git status --short config/fish
fish -i -c 'echo $fish_color_command[1] $pure_color_primary; functions -q _pure_prompt; and echo pure' </dev/null 2>&1 | tail -2
rex new plan-fish -c /private/tmp; sleep 4; rex capture -s plan-fish | grep -c -E 'unknown option|failed to find'; rex capture -s plan-fish --trim | tail -2; rex kill plan-fish
```

Expected: only the deletions, the two new files and `config.fish`, with no `fish_prompt.fish`, `fish_mode_prompt.fish` or `fish_title.fish` reappearing (fisher rewrites `fish_plugins` through its link; the content must be the same two lines); `c4a7e7 ebbcba` then `pure`; `0`; a directory line and `$`. Then `rex send-key -s <session> escape` in such a session and capture again: the last line is still `$`.
In a session Rex's window is showing, open six split panes (`rex split -s <session> --focus=false`) and confirm each capture has `0` error lines, then close them.
**Owner looks:** the prompt in a Rex window in light and dark; the cursor a bar in insert mode and a block in normal mode, which is now the only sign of the mode; fish inside nvim's `:terminal`. If Rex does not change the cursor's shape, delete the `pure_symbol_reverse_prompt` line so normal mode shows pure's `❮`, and say so in `docs/fish.md`.

- [ ] **Step 8: Documents**

- `docs/fish.md` rewritten. Keep `## Fish PATH` as it is. Replace the rest with: the `conf.d` and `functions` layout as it now stands; fisher from Homebrew, `fish_plugins` stowed, and why the links must be clean before fisher runs; pure with its two symbol settings and why (departure 7); `__apply_theme` and the reason from departure 1; the cursor settings and the `vi`/`vim`/`ls`/`rm`/`wget` functions. Drop the colour-variable, EZA and "Waiting on Upstream" sections.
- Remove the references to `docs/fish-prompt.md` at `docs/neovim.md:131`, `docs/pi-ui.md:40,53,57`, `docs/pi.md:33`, `docs/tmux.md:20`, `.pi/skills/theme/SKILL.md:102`, and the `docs/tmux.md` reference at `docs/fish.md:38` goes with the rewrite.
- `AGENTS.md`: delete the `docs/fish-prompt.md` row, rewrite the `docs/fish.md` row. README step 4: "installs fish and Neovim plugins".

- [ ] **Step 9: Commit**

Run: `just check-docs && grep -rnE '#[0-9a-fA-F]{6}\b|38;2;' config/fish | wc -l` → OK, `0`.
`git commit -m "feat: pure and Rosé Pine for fish through fisher, replacing the hand-written prompt"`

### Task 4: nvim

**Files:**
- Move: `docs/superpowers/specs/2026-11-19-defaults-redesign-prototypes/statusline.lua` → `config/nvim/.config/nvim/lua/statusline.lua` (unchanged)
- Delete: `config/nvim/.config/nvim/lua/theme.lua`
- Modify: `init.lua`, `lua/options.lua`, `lua/keymaps.lua`, `lua/diagnostics.lua`, `lua/completion.lua`, `lua/plugins.lua`, `docs/neovim.md` (rewrite), `AGENTS.md`

**Interfaces:**
- Consumes: `diag_icons` in `lua/diagnostics.lua`; `MiniIcons` and the theme's `MiniStatuslineMode*` groups.
- Produces: `require("statusline").render() -> string`.

- [ ] **Step 1: Write the check** to `/private/tmp/plan-nvim-check.lua`

```lua
local line = require("statusline").render()
local s = vim.diagnostic.severity
vim.diagnostic.set(vim.api.nvim_create_namespace "plan", 0, {
  { lnum = 0, col = 0, message = "e", severity = s.ERROR },
  { lnum = 0, col = 0, message = "w", severity = s.WARN },
})
local names = vim.tbl_map(function(p) return p.spec.name end, vim.pack.get())
local dropbar = require "dropbar.configs"
local function bg() return ("#%06x"):format(vim.api.nvim_get_hl(0, { name = "Normal" }).bg) end
local dark = bg()
vim.o.background = "light"
io.stdout:write(table.concat({
  "colors=" .. tostring(vim.g.colors_name),
  "plugins=" .. #names .. " rose-pine=" .. tostring(vim.tbl_contains(names, "rose-pine")) .. " onedarkpro=" .. tostring(vim.tbl_contains(names, "onedarkpro.nvim")),
  "background=" .. dark .. " then " .. bg(),
  "cmdheight=" .. vim.o.cmdheight .. " showcmdloc=" .. vim.o.showcmdloc,
  "notify=" .. debug.getinfo(vim.notify, "S").source:match "[^/]+/[^/]+$",
  "MiniStatusline=" .. tostring(_G.MiniStatusline),
  "dropbar_sources=" .. #dropbar.eval(dropbar.opts.bar.sources, 0, 0) .. " click=" .. tostring(dropbar.opts.symbol.on_click),
  "statusline=" .. line,
  "diag=" .. vim.diagnostic.status(0),
}, "\n") .. "\n")
```

- [ ] **Step 2: Run it and see it fail**

Run: `nvim --headless config/nvim/.config/nvim/init.lua -c 'luafile /private/tmp/plan-nvim-check.lua' -c qa 2>&1 | tail -3`
Expected: `module 'statusline' not found`.

- [ ] **Step 3: `init.lua`**

- The onedarkpro line becomes `{ src = "https://github.com/rose-pine/neovim", name = "rose-pine" },`.
- `vim.cmd.colorscheme "rose-pine"` on its own line after the `vim.pack.add` call.
- Remove `require "theme"`; add `require "statusline"` after `require "plugins"`.
- `git rm lua/theme.lua`; `git mv` the prototype into `lua/statusline.lua`; then `just link`, and `ls -l ~/.config/nvim/lua/ | grep -c -E 'statusline|theme'` → `1`.

- [ ] **Step 4: `lua/options.lua`, `lua/keymaps.lua`**

- Remove `opt.showmode = false`. After `opt.laststatus = 3` add `opt.cmdheight = 0` and `opt.showcmdloc = "statusline"`.
- After the `clipboard` line: `require("vim._core.ui2").enable { msg = { targets = "msg" } }`.
- `<Esc>` maps to a function that calls `vim.cmd.nohlsearch()` then `vim.schedule(vim.cmd.redrawstatus)`, same `desc`. The `<cmd>nohlsearch<Bar>redrawstatus<CR>` form leaves `~@<fd>` in the statusline.

- [ ] **Step 5: `lua/diagnostics.lua`**

Add `status = { format = status }` to the existing `vim.diagnostic.config` call, with `status(counts) -> string` defined above it: for Error, Warn, Info, Hint in that order, where `counts[severity]` is set, `("%%#DiagnosticSign%s#%s %d"):format(name, diag_icons[severity], counts[severity])`, joined by one space.

- [ ] **Step 6: `lua/completion.lua`, `lua/plugins.lua`**

- `completion.lua`: remove `appearance` and the three `border = "rounded"`; what is left of those blocks is `signature = { enabled = true }` and `completion = { documentation = { auto_show = true } }`. `keymap` and `sources` stay.
- `plugins.lua`: delete lines 54–107 (the pill helpers and `mini.statusline` setup). mini.clue's `window.config` becomes `{ width = "auto" }`. In snacks, remove `input` and `notifier`, and `words` becomes `{ enabled = true }`. `require("dropbar").setup()` takes `symbol = { on_click = false }` and the `bar.sources` function from the spec's nvim section.

- [ ] **Step 7: Remove the old plugin, run the check**

Run: `nvim --headless '+lua vim.pack.del { "onedarkpro.nvim" }' +qa`, then the command from step 2.
Expected:

```
colors=rose-pine
plugins=9 rose-pine=true onedarkpro=false
background=#191724 then #faf4ed
cmdheight=0 showcmdloc=statusline
notify=_core/editor
MiniStatusline=nil
dropbar_sources=1 click=false
statusline=%#StatuslineModeNormal#N%* %<%f %h%w%m%r%=%(%S  %)%#MiniIconsAzure#󰢱%*
diag=%#DiagnosticSignError#● 1 %#DiagnosticSignWarn#● 1%##
```

Run: `cd config/nvim/.config/nvim && stylua --check init.lua lua/{options,keymaps,diagnostics,completion,plugins,statusline}.lua` → exit 0. (`treesitter.lua` fails this check before the change too; leave it.)

- [ ] **Step 8: On screen**

Open a Go file in a Rex session (`rex new plan-nvim -- nvim <file>`), then `rex capture -s plan-nvim`: the last line starts `N <file>` and is the screen's bottom row; after `rex send -s plan-nvim i` it starts `I` and `-- INSERT --` appears nowhere; after `/func` and Enter it shows a count such as `1/3`; the first line holds a symbol and no file path. Note where gopls's loading progress shows, for the document. `rex kill plan-nvim`.
**Owner looks:** both appearances, a `:q` on a modified buffer, `grn`.

- [ ] **Step 9: Document, commit**

`docs/neovim.md` rewritten to the new state. Keep the LSP, per-filetype, treesitter, keymap, formatter and testing sections' content where it still holds, minus dates and measurements. Replace the statusline, icon, snacks, fzf-lua colour and theme passages with: Rosé Pine with no overrides; the statusline's contents and why it is hand-written (`cmdheight = 0` hides nvim's search count and recording); `ui2` and its removal condition; dropbar as a breadcrumb of symbols only, with clicking off; which mini and snacks modules are set up and the three characters kept by choice; where LSP progress shows. Remove the `docs/tmux.md` reference at line 121. Update the `AGENTS.md` row.
`git commit -m "feat: Rosé Pine and a plain statusline for nvim"`

### Task 5: pi

**Files:**
- Move: `docs/superpowers/specs/2026-11-19-defaults-redesign-prototypes/editor.ts` → `config/pi/.config/pi/extensions/editor.ts` (`git mv -f`, unchanged)
- Delete: `config/pi/.config/pi/themes/onedarkpro_onedark.json`, `onedarkpro_onelight.json`
- Modify: `docs/pi-ui.md` (rewrite), `docs/pi-subagents.md:133,139`, `.pi/skills/manual-setup/SKILL.md:12`, `AGENTS.md`
- Local, not in the repository: `~/.config/pi/settings.json`

- [ ] **Step 1: The type check**

Write `/private/tmp/pi-tc/tsconfig.json` with `N=/opt/homebrew/opt/pi-coding-agent/libexec/lib/node_modules/@earendil-works/pi-coding-agent` and `R` the repository root substituted:

```json
{
  "compilerOptions": {
    "strict": true, "noImplicitOverride": true, "noEmit": true, "skipLibCheck": true,
    "target": "es2022", "module": "esnext", "moduleResolution": "bundler", "allowImportingTsExtensions": true,
    "types": ["node"], "typeRoots": ["N/node_modules/@types"],
    "paths": {
      "@earendil-works/pi-coding-agent": ["N/dist/index.d.ts"],
      "@earendil-works/pi-ai": ["N/dist/core/extensions/pi-ai-extension-view.d.ts"],
      "@earendil-works/pi-ai/*": ["N/node_modules/@earendil-works/pi-ai/dist/*"],
      "*": ["N/node_modules/*"]
    }
  },
  "files": ["R/config/pi/.config/pi/extensions/editor.ts", "R/config/pi/.config/pi/extensions/footer.ts", "R/config/pi/.config/pi/extensions/subagent/index.ts"]
}
```

Run: `tsc -p /private/tmp/pi-tc/tsconfig.json; echo $?` → `0` on the files as they are today.
Prove it can fail: copy the prototype `editor.ts` to `/private/tmp/pi-tc/bad.ts`, rename its `renderBottomBorder` to `renderBottomBorderX`, add it to `files`, run again → `TS4117`. Remove it from `files`.

- [ ] **Step 2: Move the editor, delete the themes**

Run: `git mv -f <prototype>/editor.ts config/pi/.config/pi/extensions/editor.ts && rm ~/.config/pi/themes/onedarkpro_onedark.json ~/.config/pi/themes/onedarkpro_onelight.json && rmdir ~/.config/pi/themes && git rm config/pi/.config/pi/themes/*.json`
Run: `tsc -p /private/tmp/pi-tc/tsconfig.json; echo $?; grep -cE '#[0-9a-fA-F]{6}' config/pi/.config/pi/extensions/editor.ts; find ~/.config/pi -type l ! -exec test -e {} \; -print; ls docs/superpowers/specs/` → `0`; `0`; nothing; only the design document remains.

- [ ] **Step 3: The local `theme` key**

Run: `sed -i '' '/^  "theme": /d' ~/.config/pi/settings.json && python3 -m json.tool ~/.config/pi/settings.json >/dev/null && grep -c '"theme"' ~/.config/pi/settings.json` → `0` (grep exits 1). A pi already running keeps its colours until restarted.

- [ ] **Step 4: On screen**

```sh
mkdir -p /private/tmp/plan-pi; rex new plan-pi -c /private/tmp/plan-pi -- pi --no-session; sleep 9
rex capture -s plan-pi --trim | tail -3
rex capture -s plan-pi --trim | grep -c -E '[a-z-]+/[a-z0-9.-]+ [a-z]+ ──$'
rex send -s plan-pi '!ls'; sleep 1; rex capture -s plan-pi --trim | grep -c '^ *\$ !ls'; rex kill plan-pi
```

Expected: a rule, a `❯` line, and a rule ending `<percent>/<window>  <provider>/<model> <level> ──`; `1`; `1`.
**Owner looks:** with a subagent running, with `/model` open, across a light/dark switch in Rex, and at 60 columns (the token counts drop first).

- [ ] **Step 5: Documents, commit**

- `docs/pi-ui.md` rewritten; frontmatter `paths: ["config/pi/**/extensions/footer.ts", "config/pi/**/extensions/editor.ts"]`. State: colours are pi's `system` theme, derived from the terminal, with no theme file and no `theme` key; the editor's arrow, the information rule, its items, the drop order and the two thresholds; that it overrides four methods of pi's editor and the type check guards them; the footer section's current behaviour; testing with `rex` (`capture --format=html` for colour; a session not on screen does not report its colours).
- `docs/pi-subagents.md:133` "the editor's pills" → "the editor's information rule"; `:139` the TUI bullet uses a Rex session of its own, driven with `rex send` and `rex send-key`, read with `rex capture`.
- `manual-setup:12`: drop the `"theme"` value; say no `theme` key is set.
- `AGENTS.md`: the `docs/pi-ui.md` row and its globs; the Agents paragraph says "the editor's arrow and information rule".

Run: `just check-docs`. `git commit -m "feat: pi uses its system theme and a plain information rule"`

### Task 6: Ghostty as the fallback

**Files:**
- Rewrite: `config/ghostty/.config/ghostty/config`, `docs/ghostty.md`
- Delete: `config/ghostty/.config/ghostty/themes/onedarkpro_onedark`, `onedarkpro_onelight`
- Modify: `AGENTS.md`

- [ ] **Step 1: The config, whole**

```
theme = dark:Rose Pine,light:Rose Pine Dawn
font-family = Maple Mono NF CN
font-size = 14
macos-option-as-alt = true
adjust-cell-height = 24%
```

- [ ] **Step 2: Verify**

Run: `rm ~/.config/ghostty/themes/onedarkpro_onedark ~/.config/ghostty/themes/onedarkpro_onelight && rmdir ~/.config/ghostty/themes && git rm config/ghostty/.config/ghostty/themes/*; /Applications/Ghostty.app/Contents/MacOS/ghostty +validate-config --config-file=config/ghostty/.config/ghostty/config; echo $?; grep -c . config/ghostty/.config/ghostty/config; find ~/.config/ghostty -type l ! -exec test -e {} \; -print`
Expected: `0`, `5`, nothing. A new Ghostty window now opens fish, not tmux; the running tmux server is untouched.

- [ ] **Step 3: Document, commit**

`docs/ghostty.md`: Ghostty is the fallback while Rex is a preview; the five lines and the reason for the two that are habits; removal condition (the package, the cask, this document, when Rex has a proper release). Update the `AGENTS.md` row.
`git commit -m "feat: Ghostty reduced to a five-line fallback"`

### Task 7: OmniWM

**Files:**
- Modify: `config/omniwm/.config/omniwm/settings.toml:11-21` and after line 344, `docs/omniwm.md:60,64`

- [ ] **Step 1: Colours**

`[borders.color]`: `red = 0.5647058823529412`, `green = 0.47843137254901963`, `blue = 0.6627450980392157`. `[borders.darkColor]`: `red = 0.7686274509803922`, `green = 0.6549019607843137`, `blue = 0.9058823529411765`. `alpha` and `enabled = false` stay.

- [ ] **Step 2: The Rex rule**, directly after the Ghostty rule's block, `id` from `uuidgen`

```toml
[[appRules]]
assignToWorkspace = "1"
bundleId = "com.superlogical.rex"
id = "<uuidgen>"
layout = "tile"
minHeight = 48.0
minWidth = 90.0
```

- [ ] **Step 3: Verify**

Run: `omniwmctl query rules | python3 -c 'import json,sys; print([r.get("bundleId") for r in json.load(sys.stdin)["result"]["payload"]["rules"]])'; git diff --stat config/omniwm`
Expected: the list has `com.superlogical.rex` directly after `com.mitchellh.ghostty` and before the empty catch-all; the diff touches only the six colour lines and the new block. OmniWM reloads the file on save and may rewrite it; if the diff shows more, stop and show the owner.
**Owner looks:** Overview's selected-window border in both appearances; a new Rex window lands on workspace 1.

- [ ] **Step 4: Document, commit**

`docs/omniwm.md:64`: the two values are Rosé Pine's iris, `#907aa9` and `#c4a7e7`, the one hand-copied colour in `config/`. `:60`: Ghostty's config no longer has a `command`; the Quake terminal stays off.
`git commit -m "feat: OmniWM takes Rosé Pine's iris and a rule for Rex"`

### Task 8: Skills, house style, leftovers

**Files:**
- Rewrite: `.pi/skills/theme/SKILL.md`
- Modify: `.pi/skills/manual-setup/SKILL.md:21,29`, `AGENTS.md:13,36`, `docs/env.md:44-56`, `.gitignore`
- Delete: `scripts/theme-preview.py` (untracked)

- [ ] **Step 1: `theme` skill**, one short page

Frontmatter `description`: "Where each tool gets Rosé Pine and the rule against overriding it — nvim, the terminal (Rex, Ghostty), fish, pi, Alfred, OmniWM. Load before changing any colour or adding a themed element." Body: the spec's "Where colours come from" table; the rule (no palette here, no override, a weak cell is accepted and the three accepted ones); how light and dark reach each tool; Alfred needs a theme chosen for each appearance.

- [ ] **Step 2: `manual-setup`**

Alfred bullet: import `rose-pine.alfredappearance` and `rose-pine-dawn.alfredappearance` from `rose-pine/alfred`, select one per appearance, delete the hand-made One themes. Line 29: "reach tmux and Neovim" → "reach the terminal and Neovim".

- [ ] **Step 3: `AGENTS.md`, `docs/env.md`, `.gitignore`**

- `AGENTS.md:13`: the last sentence becomes "Documents describe the current state and the reason for each departure from a tool's default; rejected alternatives and measurements live in the design documents under `docs/superpowers/specs/` and in git history." Line 36: the theme skill's new scope.
- `docs/env.md`: "Man Pages" no longer says the tmux server holds Ghostty's `MANPATH`; "Stale Environments" describes a long-lived Rex server instead of tmux, and loses the `TMUX` example and the `env -u TMUX` sentence.
- `AGENTS.md` index: the `docs/env.md` row says a long-lived Rex server, not tmux.
- `.gitignore`: add `.superpowers/`. `rm scripts/theme-preview.py`.

- [ ] **Step 4 (Owner): Alfred** — do the import in step 2.

- [ ] **Step 5: Verify, commit**

Run: `just check-docs; git status --short; grep -rniE 'onedark|one dark|pill' AGENTS.md README.md docs/*.md .pi/skills config | grep -v '^docs/tmux.md' | wc -l`
Expected: OK; no untracked files; a small count. Read every hit: each must be dated history in a document this plan does not rewrite (`docs/pi.md`, `docs/pi-subagents.md:119`) or OmniWM's own bar (`docs/omniwm.md:48`). Anything describing the present is a miss; fix it.
`git commit -m "docs: theme skill, manual setup and house style for the defaults redesign"`

### Task 9: Remove tmux

**Files:**
- Delete: `config/tmux/`, `docs/tmux.md`
- Modify: `justfile` (`packages`), `brewfile`, `config/nvim/.config/nvim/lua/treesitter.lua:1-13,19`, `docs/pi.md:42`, `docs/setup.md:13`, `AGENTS.md`, `README.md`

- [ ] **Step 1: Precondition**

Run: `[ -z "${TMUX:-}" ] && echo outside`. Expected: `outside`. If not, stop: this session must be restarted in Rex first, and the **Owner** confirms nothing of theirs still runs in tmux.

- [ ] **Step 2: Unlink, then delete**

Run: `stow --no-folding -D -d config -t ~ tmux && rmdir ~/.config/tmux && git rm -r config/tmux docs/tmux.md`
Then: `packages` loses `tmux`; `brewfile` loses `brew "tmux"`; `brew uninstall tmux` (not `just clean`, which removes everything outside the `brewfile`).

- [ ] **Step 3: The treesitter parser**

`treesitter.lua`: delete the `TSUpdate` autocmd (lines 1–13) and `"tmux"` from the list.
Run: `rm -rf ~/.local/share/nvim/site/parser/tmux.so ~/.local/share/nvim/site/queries/tmux ~/.local/share/nvim/site/parser-info/tmux.revision` (`uninstall` refuses a language it no longer knows).
Run: `nvim --headless '+lua io.stdout:write(tostring(vim.tbl_contains(require("nvim-treesitter").get_installed(), "tmux")) .. "\n")' +qa` → `false`.

- [ ] **Step 4: Documents**

`docs/pi.md:42`: the example becomes `@config/ssh/…` loading `docs/rex.md`. `docs/setup.md:13` and README step 2: Touch ID for sudo, without "including inside tmux". `AGENTS.md`: delete the `docs/tmux.md` row.

- [ ] **Step 5: Verify**

Run: `just check-docs; stow --no-folding -n -d config -t ~ $(just --evaluate packages); command -v tmux; grep -rn tmux config justfile brewfile | wc -l; ls -A ~ | grep '^\.' | tr '\n' ' '`
Expected: OK; no output; nothing; `0`; `.cache .config .local .ssh .Trash`.
`git commit -m "feat: remove tmux"`

- [ ] **Step 6 (Owner, optional): is `pam-reattach` still needed?**

In a Rex terminal: `printf 'auth       sufficient     pam_tid.so\n' | sudo tee /etc/pam.d/sudo_local >/dev/null; sudo -k; sudo true`. If Touch ID is offered, remove `brew "pam-reattach"`, shorten the `printf` in `etc` to that one line, update `docs/setup.md`, `brew uninstall pam-reattach`, and commit `chore: drop pam-reattach`. If a password is asked for, run `just etc` to restore the file and leave everything as it is.
