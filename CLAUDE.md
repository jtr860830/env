# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Personal system configuration repository for macOS (ARM). Managed entirely with **nix-darwin + home-manager**. Repo lives at `~/.config/env`. No stow, no brewfile.

## Structure

| Path | Purpose |
|------|---------|
| `flake.nix` | Entry point; defines `darwinConfigurations."pro-darwin"` |
| `darwin/` | macOS system-level config (system defaults, homebrew, security) |
| `home/` | home-manager modules (fish, git, tmux, ghostty, ssh, neovim, packages) |
| `nvim/` | Neovim config (custom minimal, fully nix-managed via `programs.neovim`) |

## Applying Changes

```sh
darwin-rebuild switch --flake ~/.config/env
```

## Nix Quirks

- `environment.shells = [ pkgs.fish ]` is **required** alongside `programs.fish.enable = true` — nix-darwin does not auto-add fish to `/etc/shells`
- Touch ID for sudo: `security.pam.services.sudo_local.touchIdAuth = true`
- Nix flakes only include git-tracked files — must `git add` new files before rebuild

## Neovim

Custom minimal config managed by `programs.neovim` in `home/neovim.nix`. No Lazy.nvim — plugins installed via `programs.neovim.plugins` (uses nixpkgs vimPlugins, placed in packpath).

- `initLua = builtins.readFile ../nvim/init.lua` — entry point
- `xdg.configFile."nvim/lua".source = ../nvim/lua` — Lua modules sourced from repo; **requires rebuild to update**
- Plugins land in `~/.local/share/nvim/site/pack/hm/start/` (picked up by default packpath)

### LSP (neovim 0.11+ API)

Uses `vim.lsp.config` + `vim.lsp.enable` — no `require("lspconfig")` needed. nvim-lspconfig provides `lsp/` directory configs read automatically by `vim.lsp.enable`.

LSP servers are managed in two places: binary in `home/neovim.nix` → `extraPackages`, and enabled in `nvim/lua/lsp.lua` → `vim.lsp.enable { ... }`. Both must be updated when adding a new server.

```lua
vim.lsp.config("*", { capabilities = ... })   -- global config
vim.lsp.config("lua_ls", { settings = ... })  -- per-server override
vim.lsp.enable { "gopls", "ts_ls", ... }
```

### LspAttach Patterns

When registering buffer-local autocmds inside `LspAttach`, always use a per-buffer augroup to prevent stacking when multiple LSP clients attach to the same buffer:

```lua
local hint_group = vim.api.nvim_create_augroup("UserLspInlayHints_" .. bufnr, { clear = true })
vim.api.nvim_create_autocmd("InsertEnter", { group = hint_group, buffer = bufnr, ... })
```

### Neovim 0.12 API Patterns

- `client:supports_method("textDocument/inlayHint")` — colon syntax (dot deprecated)
- `vim.diagnostic.jump({ count = ±1 })` — replaces deprecated `goto_prev/next`
- `vim.diagnostic.count(0)` — efficient per-buffer count
- `vim.treesitter.start()` via FileType autocmd — nvim-treesitter 0.10+ removed configs module
- `vim.fs.root(0, { ".git", ... })` — find project root without shell spawn

### Nerd Font Icons

The Edit tool cannot reliably embed nerd font unicode characters — they silently become spaces. Use `vim.fn.nr2char(codepoint)` instead. Note: `string.char()` is NOT a valid replacement — it only handles 0–255; codepoints like U+25CF (9679) will error.

```lua
vim.fn.nr2char(0xea87)  -- Codicon error
vim.fn.nr2char(0xea6c)  -- Codicon warning
vim.fn.nr2char(0xea74)  -- Codicon info
vim.fn.nr2char(0xea61)  -- Codicon lightbulb
```

## Known nixpkgs Packaging Issues

- `kubernetes-helm` (4.2.0): build fails with `substitute(): ERROR: file '...dependency_build_test.go' does not exist` — workaround: `(kubernetes-helm.overrideAttrs { doCheck = false; })`
- `container` (Darwin): nixpkgs does not symlink `libexec/` into the nix profile — `container-apiserver` fails with `cannot find any plugins with type network`. Package is kept but non-functional until upstream fixes the packaging.

## Homebrew

Casks and Mac App Store apps are declared in `darwin/homebrew.nix`. `cleanup = "zap"` is intentional — removes anything not listed. Generates `Warning: --cleanup is deprecated` from Homebrew; nix-darwin upstream issue, functional but unfixable without upstream change.

## Git Conventions

- Commit style: `type: description` (e.g. `feat:`, `chore:`, `fix:`)
- Git signs commits via 1Password SSH agent (ED25519)
- Default branch is `main`; this repo uses `master`

## Theme Consistency

One Dark Pro (`onedarkpro_onedark`) across all tools: Neovim (`nvim/lua/theme.lua`), Tmux (inline in `home/tmux.nix`), Fish (inline in `home/fish.nix`), Ghostty (`home/ghostty.nix`).

### onedarkpro Colors

Access palette via `require("onedarkpro.helpers").get_colors()`. Key colors:

- `c.bg_statusline` (`#22262d`) — statusline/tmux bar background
- `c.selection` (`#414858`) — selection/highlight background
- `c.fg_gutter` (`#3d4350`) — pane borders, dim separators
- `c.indentline` (`#3b4048`) — static indent guide lines

Tmux colors must be set manually (no Lua access) — align with palette values above.

### onedarkpro Plugin Integrations

Enable in `setup()` to let theme manage highlight groups:

```lua
plugins = { blink_cmp = true, mini_diff = true, mini_icons = true, snacks = true, nvim_lsp = true, treesitter = true }
```

## Key Keybinding Patterns

Tmux handles all split and pane management. No custom Ghostty keybindings — tmux workflow makes them redundant. Tmux prefix is `Ctrl+B`.

Ghostty requires `macos-option-as-alt = true` (set under `lib.optionalString pkgs.stdenv.isDarwin`) for `<A-*>` keybindings to work in Neovim on macOS — without it, Option sends special characters instead.

## Tmux Quirks

- Mode detection without plugins: `#{?client_prefix,...}` and `#{?pane_in_mode,...}` are built-in tmux format strings
- `pane-border-style` and `pane-active-border-style` set to same color (`fg_gutter #3d4350`) — avoids half-active half-inactive visual artifact on shared border line
- Split keybinds need `-c "#{pane_current_path}"` to inherit current directory; omitting it always opens in `$HOME`
- `window-style = "dim"` does NOT work with truecolor apps — SGR dim only affects 16-color ANSI; truecolor RGB values are unaffected. Background color difference is the only reliable inactive-pane visual cue, but Neovim overrides it too.
- `set -g set-clipboard on` enables OSC 52 clipboard sync (replaces yank plugin; requires terminal support e.g. Ghostty)
- `status-justify absolute-centre` centers window list by terminal width; `centre` centers between left/right content
- `#{client_user}` (tmux 3.4+) replaces `#(whoami)` — built-in, no shell spawn
- `#[fg=...]` attributes inside `#{?condition,...}` conditionals can fail to parse; place them outside the conditional instead
- `#{==:#{session_windows},1}` to detect single-window sessions (e.g. hide window list)

## Fish Color Variables

Valid fish color variables (fish 4.x): `fish_color_{normal,command,keyword,quote,redirection,end,option,error,param,comment,selection,search_match,operator,escape,autosuggestion,cwd,user,host,valid_path,prefix,history_current,status}`. Note: `fish_color_history_current_command`, `fish_color_history_duration`, and `fish_color_error_background` do NOT exist.

### pure.fish Colors

pure.fish uses `pure_color_*` variables set with `(set_color $hex)` syntax. Base colors cascade to derived ones — only override what deviates from the semantic base:

```fish
set -g pure_color_primary (set_color $blue)    # CWD path, ❯ on success (via pure_color_prompt_on_success)
set -g pure_color_success (set_color $green)   # prompt ❯ success state, clean git
set -g pure_color_danger  (set_color $red)     # prompt ❯ error state
set -g pure_color_warning (set_color $yellow)  # command duration, AWS profile
set -g pure_color_info    (set_color $cyan)    # git stash/upstream, k8s prefix
set -g pure_color_mute    (set_color $comment) # SSH hostname, username
set -g pure_color_normal  (set_color $foreground)
# Override derived colors that default to pure_color_mute (too dim):
set -g pure_color_git_branch (set_color $cyan)
set -g pure_color_git_dirty  (set_color $yellow)
```

### EZA Colors

`EZA_COLORS` uses the same format as `LS_COLORS`: `key=attrs:key=attrs:...`. Use truecolor ANSI codes (`38;2;R;G;B`), `2;38;2;R;G;B` for dim variants. Set via `builtins.concatStringsSep ":" [...]` in `home.sessionVariables` for readability. Key names: `di` (dir), `ln` (symlink), `ex` (executable), `or` (broken symlink), `da` (date), `sn`/`sb` (size number/unit), `hd` (header), `ur`/`uw`/`ux` (user perms), `gr`/`gw`/`gx` (group perms, use dim), `ga`/`gm`/`gd`/`gv`/`gt` (git added/modified/deleted/renamed/type).

### LSP Status

- `:checkhealth lsp` — check LSP status with native API (`:LspInfo` is nvim-lspconfig's command, not native)
- `:lua vim.print(vim.lsp.get_clients({ bufnr = 0 }))` — list clients attached to current buffer
- `:Inspect` — verify treesitter is active (look for `@`-prefixed highlight groups)

### Sign Column

- snacks.statuscolumn enabled — layout is `[diagnostic] [line number] [git]` left to right
- `signcolumn = "yes"` still set; snacks.statuscolumn overrides it with its own rendering
- Diagnostic signs use `●` (U+25CF, `vim.fn.nr2char(0x25cf)`) for all severities — same character as tmux current window indicator. Color only distinguishes severity via `DiagnosticSign*` highlight groups.

### snacks.nvim

Used for indent guides, word highlighting, big file handling, notification UI, input UI, and statuscolumn. Only modules explicitly set in `setup()` are enabled. onedarkpro `snacks = true` manages `SnacksIndent`/`SnacksIndentScope` highlight groups automatically.

snacks.indent config structure — `char` must be nested under `indent`, not at the top level:
```lua
indent = { indent = { char = "▏" }, scope = { char = "▏" } }  -- correct
indent = { char = "▏", scope = { char = "▏" } }               -- wrong, char ignored
```

### fzf-lua Colors

`fzf_colors = true` in `fzf.setup {}` auto-syncs all fzf UI colors (selection, highlights, prompt, border) from Neovim's current highlight groups — onedarkpro is picked up automatically.

## Container Stack

Fully migrated to podman. `podman machine` manages the Linux VM — no colima/Docker Desktop needed. lima is kept for general-purpose Linux VMs (not container-related). `podlet` converts existing container defs to Quadlet/k8s YAML format.

## Ghostty Shell Integration

`shell-integration = none` — disabled; tmux handles working directory and pane management, making all features redundant.
Available features: `cursor`, `sudo`, `title`, `ssh-env`, `ssh-terminfo`, `path`. In tmux `TERM=tmux-256color` so `ssh-env` TERM conversion does not trigger.
Verify integration is actually loaded: `fish -c 'functions __ghostty_setup'` — returns "not loaded" if disabled correctly. `$GHOSTTY_SHELL_FEATURES` is set by Ghostty process itself and is not a reliable indicator.

## Terminfo

Managed via `pkgs.ncurses` in nix — no manual `~/.local/share/terminfo/` needed. Set in `home/fish.nix`:

```nix
TERMINFO_DIRS = "${pkgs.ncurses}/share/terminfo";
```

Referencing `${pkgs.ncurses}` in a nix expression automatically includes it in the closure — no need to add it to `home.packages`.

## Cross-Platform Nix Patterns

- Platform conditionals: `if pkgs.stdenv.isDarwin then ... else ...`
- Conditional lists: `lib.optionals pkgs.stdenv.isDarwin [ ... ]`
- 1Password SSH sign path: macOS `/Applications/1Password.app/Contents/MacOS/op-ssh-sign`, Linux `/opt/1Password/op-ssh-sign`

## Startup Performance

Profile: `nvim --startuptime /tmp/nvim-startup.log +qa && cat /tmp/nvim-startup.log`
Baseline (no config): ~24ms. Current setup: ~60ms (stable). Largest contributor: onedarkpro (~1.4ms plugin load); most of the time is Neovim runtime + ShaDa.
fzf-lua has no native lazy loading — requires lazy.nvim; not worth adding at current speed.

## Formatters

- Lua: `stylua` (config at `nvim/.stylua.toml`)
- Nix: `nixfmt` (`nix run nixpkgs#nixfmt -- <files>`)

conform is configured without `format_on_save` — format manually with `<leader>cf`.

## Keymap Organisation

Keymaps are split across files by dependency:

- `keymaps.lua` — global keymaps. Plugin keymaps can also live here if they use a lazy `require` inside a function wrapper (the `require` runs at keypress time, not at startup):
  ```lua
  map("n", "<leader>cf", function() require("conform").format { lsp_format = "fallback" } end, ...)
  ```
- `fzf.lua` — fzf keymaps (uses top-level `local fzf = require "fzf-lua"`, so must stay with setup)
- `lsp.lua` LspAttach — only registers `K` (hover with border); all other LSP keymaps use Neovim 0.12 defaults

mini.clue group labels are declared in `clues` to show prefix descriptions at the first level:
- Each mode needs a separate trigger entry — `{ mode, keys }` cannot combine modes in one object
- While popup is visible, key timeout is paused; without a trigger in that mode, pure `timeoutlen` applies
- Available `gen_clues`: `g`, `marks`, `registers`, `windows`, `z`, `square_brackets`, `builtin_completion`
- `gen_clues.g()` on nvim 0.11+ auto-includes visual mode `gr = '+LSP'` clue

```lua
{ mode = "n", keys = "<leader>f", desc = "+find" },
{ mode = "n", keys = "<leader>c", desc = "+code" },
```

Current groups: `<leader>c` (+code), `<leader>f` (+find), `gr` (+lsp). Window/buffer/split keymaps are intentionally absent — terminal (tmux) handles that workflow.

`<leader>c` contains: `cd` (diagnostic float), `cf` (format). Conventional vim LSP keys (`gd`, `gD`, `K`) and bracket navigation (`[d`/`]d`) stay outside the group.

Neovim 0.12 default LSP keys: `grr` (references), `gri` (implementation), `gra` (code action), `grn` (rename), `grt` (type definition), `gO` (symbols).

`K` hover uses `function() vim.lsp.buf.hover { border = "rounded" } end` — must be wrapped in a function to pass options; bare `vim.lsp.buf.hover` as a keymap value ignores opts.
