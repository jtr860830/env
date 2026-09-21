---
paths: ["nvim/**", "home/neovim.nix"]
---

## Neovim

Custom minimal config managed by `programs.neovim` in `home/neovim.nix`. No Lazy.nvim — plugins installed via `programs.neovim.plugins` (uses nixpkgs vimPlugins, placed in packpath).

- `initLua = builtins.readFile ../nvim/init.lua` — entry point
- `xdg.configFile."nvim/lua".source = ../nvim/lua` — Lua modules sourced from repo; **requires rebuild to update**
- Plugins land in `~/.local/share/nvim/site/pack/hm/start/` (picked up by default packpath)

### LSP (neovim 0.11+ API)

Uses `vim.lsp.config` + `vim.lsp.enable` — no `require("lspconfig")` needed. nvim-lspconfig provides `lsp/` directory configs read automatically by `vim.lsp.enable`.

LSP servers are managed in three places: the binary in `home/packages.nix`, a file in `nvim/lsp/<name>.lua`, and the name in `nvim/lua/lsp/init.lua` → `vim.lsp.enable { ... }`. All three must be updated when adding a server — `vim.lsp.enable` does not discover the directory, and globbing the runtimepath for `lsp/*.lua` is not an alternative because nvim-lspconfig ships 406 of them.

A server only attaches to the filetypes its `lsp/<name>.lua` claims, so check them against `vim.filetype.add` in `options.lua`. `helm_ls` claims `helm` and `yaml.helm-values` — mapping Helm templates to `gotmpl` silently left them with no LSP. The `helm` parser inherits `gotmpl` and additionally injects `yaml`, so it is the better choice anyway (parse tree becomes `[helm, yaml]`).

`programs.neovim.extraPackages` is intentionally NOT used — it wraps binaries into neovim's own PATH (appended as a suffix), making them invisible to the shell and to other editors. `helix` is installed and resolves LSP servers from PATH, so everything lives in `home.packages` instead. Note `clangd`/`clang-format` come from `clang-tools`, which is also used directly as a CLI tool.

```lua
vim.lsp.config("*", { capabilities = ... })   -- global config
vim.lsp.config("lua_ls", { settings = ... })  -- per-server override
vim.lsp.enable { "gopls", "ts_ls", ... }
```

### One File Per Server

Each server gets `nvim/lsp/<name>.lua`, linked by `xdg.configFile."nvim/lsp".source = ../nvim/lsp;`. Configs found there are **deep-merged** with the one nvim-lspconfig ships, not substituted for it — verified: a file setting only `settings.Lua.runtime` still resolves `cmd`, `filetypes` and `root_markers` from lspconfig, and lspconfig's own `settings.Lua` keys survive alongside.

Shared defaults live in `nvim/lua/lsp/defaults.lua`, which returns a function so each file reads `return require "lsp.defaults" { ... }` — nine of the ten pass `{}`. `require` works inside these files because they are ordinary Lua chunks evaluated at config-resolution time.

**`lua/lsp/init.lua` and `lua/lsp/defaults.lua` cannot be one file, and the split is forced rather than stylistic.** `vim.lsp.enable` resolves configs *immediately*, through the `__index` metamethod on `vim.lsp.config` — not lazily when a buffer opens. So a single module calling `enable` would be re-entered by its own `lsp/<name>.lua` files before it had returned:

```
init.lua          require "lsp"
lua/lsp/init.lua  vim.lsp.enable { ... }
vim/lsp.lua:628   enable
vim/lsp.lua:342   __index
lsp/lua_ls.lua    require "lsp"     <- still loading
E5113: loop or previous error loading module 'lsp'
```

Deferring with `vim.schedule` breaks the cycle but costs the startup buffer: `nvim foo.lua` then has no client attached until a manual `:edit`. Measured, not assumed. The two-module namespace avoids both — `lsp` and `lsp.defaults` are distinct modules, so one can be mid-load while the other resolves.

Nothing about the name `lsp` is special to Neovim: `lua/lsp.lua` / `lua/lsp/` is an ordinary module, and the whole runtimepath holds exactly one. Only `lsp/<name>.lua` and `after/lsp/<name>.lua` are directories Neovim scans.

`defaults.lua` carries `capabilities` and `on_attach`, which is why `vim.lsp.config("*", ...)` and the old `LspAttach` autocmd are both gone. A server enabled *without* a file in `nvim/lsp/` would therefore get neither — that is the cost of dropping the wildcard, and the reason all ten have a file even when empty.

Verified end to end against a real `lua_ls` attach: the buffer-local `K` mapping is set, inlay hints turn on, and `lua_ls`'s own `settings` survive the merge.

Merge order is fixed by `:help lsp-config-merge`, in increasing priority: the `'*'` config, then all `lsp/<name>.lua` on the runtimepath, then all `after/lsp/<name>.lua`, then anything set elsewhere. `nvim/lsp/` therefore merges *alongside* nvim-lspconfig's copies rather than above them; if one of its values ever needs overriding outright, `nvim/after/lsp/<name>.lua` is the layer that wins. Not needed so far — all ten resolve as expected.

There is no way to enable a server by dropping the file alone. `:help vim.lsp.enable()` requires a name or list and rejects a wildcard outright ("`{name}` is not a valid LSP config name (for example, `'*'`)"), which is verified behaviour: `vim.lsp.enable("*")` errors with `LSP config name cannot contain wildcard`. That is deliberate — nvim-lspconfig puts 406 configs on the runtimepath, so discovery and activation have to stay separate.

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
- `an`/`in` in visual and operator-pending are **built-in** treesitter node selection ("select parent/child node"). With a count they reproduce mini.ai's structural textobjects — `dan` deletes an argument, `d3an` a whole function call, at the same depth in lua, python and go. Do not add `mini.ai` on the grounds that vanilla lacks `ia`/`af`.

### Per-Filetype Options

`nvim/after/ftplugin/<filetype>.lua` is the mechanism, not a `FileType` autocmd. Neovim already has `~/.config/nvim/after` on the runtimepath because `~/.config/nvim` is the config root, so the directory only needed linking: `xdg.configFile."nvim/after".source = ../nvim/after;` in `home/neovim.nix`, alongside the `nvim/lua` entry. `after/` rather than plain `ftplugin/` because it runs *after* the bundled ftplugin for that filetype and therefore wins.

Prose filetypes (`markdown`, `text`) turn on `wrap`, `linebreak` and `breakindent` there; code keeps the global `wrap = false` from `options.lua`. `breakindent` is the one that matters — without it a wrapped line's continuation starts at column 0 and the indent structure is lost. Adding another filetype means another file; there is no pattern matching, which is the trade for not having to register an autocmd.

`opt.sidescrolloff = 8` only does anything while `wrap` is off, so it stays meaningful for code and is simply inert in prose buffers.

With `wrap` on, `j`/`k` still move by logical line, so one keypress can cross several screen rows. Deliberately not remapped to `gj`/`gk` — revisit if it grates while writing.

### Deliberately Absent

Do not "helpfully" re-add these — each was removed after checking:

- **`opt.hlsearch` / `opt.grepformat`** — identical to Neovim's defaults. Neovim also picks `grepprg` itself: `"rg --vimgrep -uu "` when rg is on PATH, `"grep -HIn $* /dev/null"` otherwise, so an `executable("rg")` guard duplicates it. Nothing here uses `:grep`; fzf-lua builds its own rg invocation and never reads `grepprg`.
- **blink's `snippets` source** — it serves snippet *libraries* found on the runtimepath, and none are installed, so it returned nothing on every keystroke. LSP snippets arrive through the `lsp` source instead; `snippetSupport = true` is hardcoded in blink (`sources/lib/init.lua`), not an option. Snippet libraries are unwanted; LSP-driven completion is.
- **`nvim-treesitter` is never `require`d but must stay** — `treesitter.lua` uses the native `vim.treesitter.start()`, parsers come from `nvim-treesitter-grammars`, but the *queries* come from this plugin. Neovim bundles queries for only 7 languages (`c lua markdown markdown_inline query vim vimdoc`); go, nix, python, typescript, yaml and helm all rely on the 323 sets it ships.

### mini.nvim Modules

Each module is an independent sub-plugin — there is no unified enable, and every one needs its own `setup()`. In use: `icons` `diff` `move` `pairs` `surround` `clue` `statusline`.

- **`mini.icons` must be `setup()`**, not merely required. `require("mini.icons").get(...)` works without it, but fzf-lua detects the provider through the `MiniIcons` global — without `setup()` it falls back to `nvim-web-devicons`, which is not installed, and shows *no* icons at all. dropbar never looks for mini.icons, only `nvim-web-devicons`, and degrades to one generic glyph for every filetype, hence `MiniIcons.mock_nvim_web_devicons()`. Two calls, and stylua splits a semicolon one-liner back apart.
- **`mini.statusline` never calls `content.inactive` when `laststatus = 3`** — its own expression is `(… || &laststatus==3) ? active() : inactive()`. Its default inactive still uses `MiniStatuslineInactive`, so keep that highlight in `theme.lua` even with no custom inactive content.
- `mini.move` replaces hand-rolled `:m .+1`-style mappings: same reindent behaviour, but respects a count and does not raise `E16` at the last line.

### Nerd Font Icons

The Edit tool cannot reliably embed nerd font unicode characters — they silently become spaces. Use `vim.fn.nr2char(codepoint)` instead. Note: `string.char()` is NOT a valid replacement — it only handles 0–255; codepoints like U+25CF (9679) will error.

```lua
vim.fn.nr2char(0xea87)  -- Codicon error
vim.fn.nr2char(0xea6c)  -- Codicon warning
vim.fn.nr2char(0xea74)  -- Codicon info
vim.fn.nr2char(0xea61)  -- Codicon lightbulb
```

Six symbols are used in the whole repo: `▎` (U+258E, mini.diff signs), `▏` (U+258F, snacks indent), `○`/`●` (U+25CB/25CF, tmux windows), `■` (U+25A0, tmux zoom), and U+E0B6/U+E0B4 (the solid half-circles that cap tmux's bubble segments).

In nix, write them as `builtins.fromJSON ''"\ue0b6"''` rather than pasting the character — pasting silently produced `○` where `●` was meant. Beware substring collisions when scripting an edit over such bindings: a replacement targeting `active` also matches inside `inactive`, which is how both dots ended up identical; the bindings are now `dotDim`/`dotOn`.

Three things to check before adding another:

- **Is the glyph in Maple Mono?** macOS falls back to another font when it is not, so it renders but with a mismatched weight and no guarantee on another machine. `▣` (U+25A3), `⛶`, `⤢` and `⊞` are all absent; `■`, `█`, `◉`, `◎` are present. Check with:
  ```sh
  nix shell --impure --expr 'let p = (builtins.getFlake "nixpkgs").legacyPackages.aarch64-darwin;
    in p.python3.withPackages (ps: [ ps.fonttools ])' --command python3 -c \
    "from fontTools.ttLib import TTFont; print(0x25A0 in TTFont('<font>.ttf', fontNumber=0).getBestCmap())"
  ```
- **`bold` does nothing to geometric shapes.** `●` has an identical glyph and advance width in the Regular and Bold faces, so `#[fg=…,bold]` on one is dead styling.
- Every symbol in use is East Asian Width **Ambiguous**, i.e. one cell only because `LANG=en_US.UTF-8`. Switching to a CJK locale would make them two cells wide and break both the tmux status bar and the sign column. `◉` (U+25C9) is the one Neutral alternative.

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

Every picker is reachable as `:FzfLua <name>` with Tab completion, so the `<leader>f` mappings are shortcuts, not the only access. That includes twelve git pickers (`git_blame` `git_bcommits` `git_status` `git_hunks` …) — `git_status` even stages with left/right. Only `git log -L` style range history is missing, which is the one thing `mini.git` would add.

### Keymap Organisation

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
- **A clue set with no matching trigger is silently inert.** `z()` needs a `z` trigger, `marks()` needs `'` and `` ` ``, `registers()` needs `"` plus `<C-r>` in insert and cmdline. Adding the sets without the triggers left ~187 entries unreachable. Adding a trigger does not shadow the key itself — `zz`, `zf`/`za`, `'a` and `"qp` all still work, the popup only appears after the 300ms delay.
- Inspect what is actually wired up with `nvim_buf_get_keymap` after a `BufEnter`; the triggers are buffer-local, so `maparg` shows nothing

```lua
{ mode = "n", keys = "<leader>f", desc = "+find" },
{ mode = "n", keys = "<leader>c", desc = "+code" },
```

Current groups: `<leader>c` (+code), `<leader>f` (+find), `gr` (+lsp). Window/buffer/split keymaps are intentionally absent — terminal (tmux) handles that workflow.

`<leader>c` contains: `cd` (diagnostic float), `cf` (format). Conventional vim LSP keys (`gd`, `gD`, `K`) and bracket navigation (`[d`/`]d`) stay outside the group.

Neovim 0.12 default LSP keys: `grr` (references), `gri` (implementation), `gra` (code action), `grn` (rename), `grt` (type definition), `gO` (symbols).

`K` hover uses `function() vim.lsp.buf.hover { border = "rounded" } end` — must be wrapped in a function to pass options; bare `vim.lsp.buf.hover` as a keymap value ignores opts.
### Formatters

- Lua: `stylua` (config at `nvim/.stylua.toml`)
- Nix: `nixfmt <files>` — on PATH via `home/packages.nix`, no `nix run` needed

conform is configured without `format_on_save` — format manually with `<leader>cf`.

`smartindent` is deliberately **not** set. `indentexpr` overrules it, so it was a no-op for python, yaml, lua, go and sh, while nix has no `indentexpr` and there it treated a leading `#` as a preprocessor directive and stripped the indentation off every comment. `autoindent` is on by default and keeps ordinary lines indented.

### Startup Performance

Profile: `nvim --startuptime /tmp/nvim-startup.log +qa && cat /tmp/nvim-startup.log`
Baseline (no config): ~24ms. Current setup: ~60ms (stable). Largest contributor: onedarkpro (~1.4ms plugin load); most of the time is Neovim runtime + ShaDa.
fzf-lua has no native lazy loading — requires lazy.nvim; not worth adding at current speed.

