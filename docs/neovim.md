---
paths: ["config/nvim/**"]
---

## Neovim

A small hand-written config in `config/nvim/.config/nvim/`, stowed to `~/.config/nvim` file by file, so `~/.config/nvim` itself is a real directory. Edits are live.

- **Plugins come from Neovim 0.12's built-in `vim.pack`**, declared in one `vim.pack.add { … }` near the top of `init.lua` and installed to `~/.local/share/nvim/site/pack/core/opt/`. `{ confirm = false }` lets a headless first run install without asking. `just plugins` runs `vim.pack.update(nil, { force = true })`. A plugin taken out of the list stays on disk until `vim.pack.del { "<name>" }`.
- **`nvim-pack-lock.json` is deliberately not in the repo** (gitignored): the requirement is latest plugins, not pinned ones, so the lockfile is a real file in `~/.config/nvim`. One that appears inside `config/` came from a probe run with `XDG_CONFIG_HOME` pointed at the repo; delete it.
- **blink.cmp is pinned to `vim.version.range "1.*"`** so vim.pack checks out a release tag, which is what makes blink download its prebuilt Rust fuzzy library; verify with `require("blink.cmp.fuzzy.rust")`.
- **`rose-pine/neovim` is added with `name = "rose-pine"`**, upstream's own form: vim.pack names a plugin after the last part of its URL, which here would be `neovim`.
- **mini.nvim's URL is `nvim-mini/mini.nvim`**; the repo moved from `echasnovski`.
- The four `vim.g.loaded_*_provider = 0` lines keep providers disabled for `:checkhealth` and startup. `vim.loader.enable()` is the first line because Neovim ships the loader off and it shortens startup.

### Colours

`vim.cmd.colorscheme "rose-pine"` in `init.lua`, with no `setup()` and no highlight override anywhere in the config (the `theme` skill has the rule). The scheme follows `background`: Main when it is dark, Dawn when it is light, and Neovim sets `background` from what the terminal reports, so it follows the system's switch while open. Rosé Pine defines groups for blink.cmp, mini, snacks, fzf-lua and the `@lsp` semantic tokens; dropbar has none of its own and takes the linked defaults.

### Statusline and the bottom of the screen

`lua/statusline.lua` draws the statusline itself. Left: the mode as one coloured letter, the file name, `[+]`. Right: the pending command (`%S`), `recording @q`, the search count, the diagnostic counts, and the filetype icon at the far end. There is no cursor position.

- **It is hand-written because `cmdheight = 0`.** The owner wants no empty line under the statusline, and with the command line hidden Neovim's own search count and recording message have nowhere to show, so the statusline carries them. `showcmdloc = "statusline"` moves the pending command there for the same reason. `showmode` is left at its default: with no command line `-- INSERT --` is not drawn.
- **The mode letter's colour is the background Rosé Pine defines for `MiniStatuslineMode*`**, reused as a foreground and read again on `ColorScheme`. The groups exist without mini.statusline's `setup()` because the theme defines them, and `require("mini.statusline").section_mode` supplies the mode's name, so there is no mode table here. mini.statusline is not set up.
- **The diagnostic counts come from `vim.diagnostic.status()`**, formatted in `lua/diagnostics.lua` (`status.format`) to `● 2 ● 1` with the sign column's own dot, in place of Neovim's default letters and colons.
- **`<Esc>` is a function**, `nohlsearch` and then a scheduled `redrawstatus`, or the search count lingers. The `<cmd>nohlsearch<Bar>redrawstatus<CR>` form leaves `~@<fd>` in the statusline.
- **LSP loading progress is not shown.** Neovim's default statusline has it; this one does not.

**Messages use Neovim 0.12's new message UI**, `require("vim._core.ui2").enable { msg = { targets = "msg" } }` in `options.lua`. It is experimental. Without it `cmdheight = 0` makes every error and multi-line message wait for Enter. With it messages and `vim.notify` appear in a box at the bottom right, and a prompt such as `:q` on a modified buffer takes the bottom rows while it is open. When it becomes Neovim's default, delete the line.

### LSP

Uses `vim.lsp.config` and `vim.lsp.enable`; no `require("lspconfig")`. nvim-lspconfig provides the `lsp/` directory configs that `vim.lsp.enable` reads.

A server is managed in two places: the binary in the `brewfile` and the name in `lua/lsp.lua`'s `vim.lsp.enable { … }`. A third, `lsp/<name>.lua`, is needed only when the server has settings of its own. `vim.lsp.enable` does not discover that directory, and nvim-lspconfig ships hundreds of configs, so globbing the runtimepath is not an alternative.

A server attaches only to the filetypes its config claims, so check them against `vim.filetype.add` in `options.lua`. `helm_ls` claims `helm` and `yaml.helm-values`; mapping Helm templates to `gotmpl` leaves them with no LSP. The `helm` parser inherits `gotmpl` and injects `yaml`.

Servers live on the shell `PATH`, not in an editor-private one. `clangd` and `clang-format` come from Homebrew's `llvm`, linked with `link: true` in the brewfile (`docs/homebrew.md`).

#### One file per server

Configs in `lsp/<name>.lua` are deep-merged with the one nvim-lspconfig ships, so a file setting only `settings.Lua.runtime` still gets `cmd`, `filetypes` and `root_markers` from lspconfig. Only `lua_ls` has a file. An empty `return {}` file adds nothing: presence in `lsp/` does not activate a server.

**blink.cmp sets `capabilities` itself, and `on_attach` must never go in the wildcard.** blink runs `vim.lsp.config('*', { capabilities = … })`, so there is no hand-written copy. The merge is `tbl_deep_extend('force', …)` over the wildcard, `lsp/<name>.lua`, then `after/lsp/<name>.lua`. `capabilities` is a table and merges; `on_attach` is a function, so a server's own one replaces the wildcard's outright, and `clangd`, `basedpyright` and `ts_ls` ship one. Shared per-buffer setup therefore lives in an `LspAttach` autocmd, which fires for every client however the configs merged. `after/lsp/<name>.lua` is not an alternative: it would replace lspconfig's `on_attach` and lose those servers' commands.

`vim.lsp.config[name]` shows the resolved config, wildcard included.

`LspAttach` fires once per client, so a buffer with two clients (`helm_ls` beside `yamlls`) runs the callback twice. Buffer-local autocmds registered inside it use a per-buffer augroup with `clear = true` so they do not stack.

#### Borders

`opt.winborder = "rounded"` gives every float without an explicit border the same rounded one: hover (`K`, Neovim's own mapping), the diagnostic float, the signature, blink.cmp's menu and documentation, mini.clue's window. None of them is passed a border here. fzf-lua sets its own in `lua/fzf.lua`.

#### lua_ls library

`lsp/lua_ls.lua` sets `workspace.library` to `$VIMRUNTIME` plus the vim.pack directory, not the whole runtimepath: the config directory is itself on the runtimepath, so its definitions would load twice. lua_ls publishes nothing until the workspace has loaded, so to measure it plant one known error and wait for that.

#### Python

`basedpyright` rather than `pyright`, for inlay hints and semantic tokens, which `pyright` does not advertise. `pyright` stays in the `brewfile`: Claude Code's `pyright-lsp` plugin runs `pyright-langserver`, which basedpyright does not provide. The two share no executable names.

#### Semantic tokens

Nothing here configures them. nvim-lspconfig's `gopls` config turns them on, and `lua_ls`, `basedpyright` and `clangd` send them unasked; `bashls` and `yamlls` have none. They layer `@lsp.type.*` groups over treesitter highlighting, and Rosé Pine defines those groups.

#### Neovim 0.12 API

- `client:supports_method "textDocument/inlayHint"`, with a colon.
- `[d`, `]d` and `<C-w>d` are default mappings; do not re-map them. `<leader>cd` stays only as a `+code` shortcut.
- `K` and every other LSP key are Neovim's defaults; `LspAttach` registers no keymaps.
- `an` and `in` in visual and operator-pending are built-in treesitter node selection, and with a count cover what mini.ai's textobjects would.

### Diagnostics

`vim.diagnostic` display lives in `lua/diagnostics.lua`, not `lsp.lua`: LSP is one producer of diagnostics, not the owner of how they are drawn. Signs are `●` for every severity, told apart by the `DiagnosticSign*` colours; the same dot is used in the statusline. End-of-line text keeps Neovim's default `■` prefix.

### Per-filetype options

`after/ftplugin/<filetype>.lua`, not a `FileType` autocmd. `after/` rather than `ftplugin/` because it runs after the bundled ftplugin and wins. `markdown` and `text` turn on `wrap`, `linebreak` and `breakindent`; code keeps the global `wrap = false`. With `wrap` on, `j` and `k` still move by logical line, deliberately.

### Treesitter

`nvim-treesitter` (the `main` branch) supplies parsers and queries; highlighting is native. `lua/treesitter.lua` calls `require("nvim-treesitter").install { … }` and then `vim.treesitter.start()` per buffer. Parsers are compiled locally into `~/.local/share/nvim/site/parser/`. `install()` is async; with no UI the file waits on it, so `nvim --headless +qa` installs every parser, which `just plugins` relies on. `install()` skips parsers that exist, so `just plugins` also runs `update():wait()`, or updated queries can outrun stale parsers.

A language taken out of the list keeps its parser: nvim-treesitter's `uninstall` only knows languages it still ships, so for one it has dropped, remove `parser/<lang>.so`, `queries/<lang>` and `parser-info/<lang>.revision` under `~/.local/share/nvim/site` by hand.

### Modules

mini.nvim: each module is an independent sub-plugin and needs its own `setup()`. Set up: icons, diff, move, pairs, surround, clue.

- **`mini.icons` must be `setup()`**, not merely required: fzf-lua detects it through the `MiniIcons` global. dropbar only knows nvim-web-devicons, hence `MiniIcons.mock_nvim_web_devicons()`.
- `mini.move` is what `⌥hjkl` drives, so the terminal must send Option as Alt (`docs/rex.md`).
- **mini.clue** group labels are declared in `clues`. Each mode needs its own trigger entry, and a clue set with no matching trigger is silently inert: `z()` needs a `z` trigger, `marks()` needs `'` and `` ` ``, `registers()` needs `"` plus `<C-r>` in insert and cmdline. A trigger does not shadow the key. The triggers are buffer-local, so inspect them with `nvim_buf_get_keymap` after a `BufEnter`. Its `delay` of 300 is shorter than the default on purpose.

snacks.nvim: only modules named in `setup()` are enabled. Set: bigfile, statuscolumn, indent, words. The statuscolumn lays out `[diagnostic] [line number] [git]`; `signcolumn = "yes"` is still set and snacks draws over it. `words` is what highlights other uses of the symbol under the cursor; Neovim does not do that on its own.

Three characters are kept by the owner's choice rather than left at a default: `▎` for mini.diff's signs, `▏` for snacks.indent's line and scope. snacks.indent's `char` must be nested, `indent = { indent = { char = … }, scope = { char = … } }`; at the top level it is ignored.

**dropbar is a breadcrumb only.** Its `bar.sources` leaves out the file path, which the statusline already shows, and gives the LSP's or treesitter's symbols (markdown headings in markdown). `symbol = { on_click = false }` removes the click regions, so nothing opens its menu; no key is bound to it either.

### Completion

blink.cmp with its own keymap, the `lsp`, `path` and `buffer` sources, the signature window and automatic documentation. The `snippets` source is left out: it serves snippet libraries from the runtimepath and none are installed; LSP snippets arrive through the `lsp` source.

### fzf-lua

`fzf_colors = true` takes fzf's colours from Neovim's current highlight groups, so it follows the scheme. Every picker is reachable as `:FzfLua <name>`; the `<leader>f` mappings are shortcuts.

### Keymaps

- `keymaps.lua`: global keymaps, and plugin keymaps that `require` lazily inside a function.
- `fzf.lua`: fzf's keymaps, beside its setup because the file holds the module in a local.

Window, buffer and split keymaps are absent on purpose; the terminal does that. Conventional LSP keys and bracket navigation stay outside the `<leader>c` group.

### Formatters

conform, without `format_on_save`: format with `<leader>cf`.

### Deliberately absent

Do not re-add these:

- **`opt.hlsearch`, `opt.grepformat`, `grepprg`**: Neovim's defaults already, and it picks rg itself.
- **`smartindent`**: `indentexpr` overrules it, and where there is none it strips the indentation off `#` comments.
- **mini.statusline, snacks.notifier, snacks.input**: replaced by `lua/statusline.lua`, the new message UI and Neovim's own prompt, so `grn` asks at the bottom of the screen.
- **snacks.scroll**, and blink's `snippets` source.

### Non-ASCII glyphs

Write a glyph in Lua as a `\u{…}` escape (`"\u{25cf}"`) where an editing tool might mangle it; nerd font characters pasted through one have become spaces. Before adding a glyph, check it is in Maple Mono, since macOS otherwise falls back to another font:

```sh
uv run --with fonttools python3 -c \
  "from fontTools.ttLib import TTFont; print(0x25A0 in TTFont('<font>.ttf', fontNumber=0).getBestCmap())"
```

`●`, `▎` and `▏` are East Asian Width Ambiguous: one cell only because `LANG=en_US.UTF-8`.

### Testing a change

Never test with `set rtp+=`: it appends, so `~/.config/nvim` still wins. Use an isolated config and data directory:

```sh
I=$(mktemp -d); mkdir -p $I/config; ln -s "$(git rev-parse --show-toplevel)/config/nvim/.config/nvim" $I/config/nvim
env XDG_CONFIG_HOME=$I/config XDG_DATA_HOME=$I/data XDG_STATE_HOME=$I/state XDG_CACHE_HOME=$I/cache nvim --headless <file> -c '...' -c qa
```

The first run installs every plugin and parser into `$I/data`, and writes `nvim-pack-lock.json` through the link into the repo; delete it afterwards. Confirm which file won with `vim.api.nvim_get_runtime_file("lua/lsp.lua", true)`.

To see the screen, run nvim in a Rex session of its own and read it with `rex capture` (`docs/rex.md`).

Profile startup with `nvim --startuptime /tmp/nvim-startup.log +qa`.
