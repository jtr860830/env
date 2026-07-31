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

## House Style

**No comments in config files.** Single-user repo — the reasoning lives here in CLAUDE.md instead, where it does not have to be maintained alongside the code. Do not add explanatory comments back when editing; put the finding in this file.

`home/packages.nix` is one flat alphabetical list, no category headers. Categories were tried and dropped: they invited endless boundary arguments (is `atac` networking or API tooling? is `gnused` a build tool?), and only 2 of 17 groups ever stayed sorted, so neither lookup nor insertion was predictable. Flat means both are.

The only surviving comment is `flake.nix`'s commented-out `nixosConfigurations` entry, which is a placeholder for a future Linux host rather than prose.

## Applying Changes

```sh
darwin-rebuild switch --flake ~/.config/env
```

## Nix Quirks

- `environment.shells = [ pkgs.fish ]` is **required** alongside `programs.fish.enable = true` — nix-darwin does not auto-add fish to `/etc/shells`
- Touch ID for sudo: `security.pam.services.sudo_local.touchIdAuth = true`
- Nix flakes only include git-tracked files — must `git add` new files before rebuild

## Modules vs `home.packages`

`programs.<x>.enable = true` installs the package itself — **never also list it in `home/packages.nix`**. `home.path` uses `pkgs.buildEnv` without `ignoreCollisions`, and some modules install a wrapped derivation (`delta` uses `cfg.finalPackage`), so a duplicate can become a hard build failure if the wrapped and plain packages ever diverge.

Currently enabled: `bat` `delta` `fish` `git` `neovim` `ssh` `tmux` `zoxide`.

`programs.ssh` is the **only exception** — its `package` defaults to `null` ("use the system client"), so `home/ssh.nix` sets `package = pkgs.openssh;` explicitly.

## Cross-Platform Nix Patterns

- Platform conditionals: `if pkgs.stdenv.isDarwin then ... else ...`
- Conditional lists: `lib.optionals pkgs.stdenv.isDarwin [ ... ]`
- 1Password SSH sign path: macOS `/Applications/1Password.app/Contents/MacOS/op-ssh-sign`, Linux `/opt/1Password/op-ssh-sign`

## Known nixpkgs Packaging Issues

- `kubernetes-helm` (4.2.0): build fails with `substitute(): ERROR: file '...dependency_build_test.go' does not exist` — workaround: `(kubernetes-helm.overrideAttrs { doCheck = false; })`
- `container` (Darwin): nixpkgs does not symlink `libexec/` into the nix profile — `container-apiserver` fails with `cannot find any plugins with type network`. Package is kept but non-functional until upstream fixes the packaging.

## Git Conventions

- Commit style: `type: description` (e.g. `feat:`, `chore:`, `fix:`)
- Git signs commits via 1Password SSH agent (ED25519)
- Default branch is `main`; this repo uses `master`

## Homebrew

Casks and Mac App Store apps are declared in `darwin/homebrew.nix`. `cleanup = "zap"` is intentional — removes anything not listed. Generates `Warning: --cleanup is deprecated` from Homebrew; nix-darwin upstream issue, functional but unfixable without upstream change.

### Activation Environment

The activation script runs `sudo --preserve-env=PATH --user=… env brew bundle`, so **only `PATH` survives** — every other variable set for the interactive shell is absent when brew runs. This is hardcoded in nix-darwin's module; there is no option to inject environment variables.

Consequence: brew fell back to `$HOME/.homebrew` for its user config (it prefers `XDG_CONFIG_HOME`, which sudo drops), creating that directory on every rebuild while `brew` run by hand did not. Fixed by writing `/etc/homebrew/brew.env` via `environment.etc`, which brew loads at `bin/brew:151` — before it decides the path at `:163`:

```nix
environment.etc."homebrew/brew.env".text = ''
  HOMEBREW_XDG_CONFIG_HOME=${homeDir}/.config
'';
```

The `brew.env` hierarchy (`/etc/homebrew` → `$HOMEBREW_PREFIX/etc/homebrew` → user) is supported upstream and filters to `HOMEBREW_*` only. `HOMEBREW_XDG_CONFIG_HOME` itself is undocumented and unsettled — Homebrew/brew#20250 was closed unmerged with a maintainer preferring a new `HOMEBREW_CONFIG_HOME`. Variables in `BIN_BREW_EXPORTED_VARS` (including `HOMEBREW_USER_CONFIG_HOME`) cannot be set this way.

Check what brew actually resolves with:

```sh
brew ruby -e 'puts ENV["HOMEBREW_USER_CONFIG_HOME"]'
```

## Manual Setup

Steps a rebuild cannot perform — local UI state, app preferences and licences:

- **Alfred** — enter the Powerpack licence; point the sync folder at iCloud, which restores workflows, themes and preferences; set the theme for *both* light and dark appearance (see below); set the hotkey to `⌘Space`; turn off System Settings → Keyboard → Keyboard Shortcuts → Spotlight → "Show Spotlight search", which otherwise owns that key.

Alfred's config is **deliberately not in this repo**. Its sync folder moves the whole `Alfred.alfredpreferences` bundle — app-owned mutable state that Alfred writes to directly, which is a different model from the declarative source the rest of the repo holds. iCloud handles it instead. The licence, clipboard database and usage data sit *outside* that bundle, so nothing secret travels with it.

Alfred does scan `themes/*/theme.json` regardless of the directory name, so a theme could be installed with `home.file` — but the *selection* lives in `preferences/local/<machine-hash>/appearance/prefs.plist`, and that hash differs per machine, so picking the theme stays manual either way. Setting `visualEffectMode` hands the material to macOS and Alfred zeroes `blur` in response; its own Modern themes ship the same pairing. `2` is dark vibrancy — the Preferences binary names the control `blurVisualEffectDarkButton`.

**Alfred keeps a separate theme per system appearance, and the Appearance panel shows only the current one.** That plist holds `lightthemeuid` *and* `darkthemeuid`; the panel offers no second slot because it edits whichever key matches the appearance you are in, so a theme picked in Light mode leaves `darkthemeuid` unset and Alfred falls back to a built-in dark theme after sunset. Entering dark mode does not write the key — Alfred only stores it when a theme is chosen while dark. Set both by hand:

```sh
P=~/Library/Application\ Support/Alfred/Alfred.alfredpreferences/preferences/local/*/appearance/prefs.plist
osascript -e 'tell application "Alfred 5" to quit'   # it holds prefs in memory and would clobber the write
plutil -replace darkthemeuid -string "$(plutil -extract lightthemeuid raw -o - $P)" $P
```

`appearance.options.nativedarkmode` is **not** the switch for this — its label is "Use native macOS Dark Mode window rendering", a window-material option.

**Do not try to disable the Spotlight hotkey declaratively.** It lives at `AppleSymbolicHotKeys` key `64` in `com.apple.symbolichotkeys`, and `system.defaults.CustomUserPreferences` emits `defaults write <domain> <key> <plist>` — a whole-dict *replacement*, which would wipe the other ~50 hotkey entries (Mission Control, screenshots, input sources…). `PlistBuddy -c "Set :AppleSymbolicHotKeys:64:enabled false"` edits in place and would work, but needs `killall cfprefsd` for the preference cache and re-runs on every rebuild — not worth it for a one-time toggle.

`⌘` combinations never reach programs inside the terminal (macOS handles them at the app layer), so they are the safe modifier for global hotkeys; `⌃` and `⌥` do reach tmux and Neovim — `⌃Space` is already blink.cmp's completion trigger and `⌥hjkl` is mini.move.

## Shadowing macOS System Binaries

**Intentional — do not "fix" this.** `/etc/profiles/per-user/$USER/bin` sits before `/usr/bin` in the fish PATH, so nix-provided tools win. Both newer upstream versions and GNU-over-BSD behavior are wanted.

Notable overrides: `make` (GNU 4.4.1 vs macOS 3.81), `sed` (GNU vs BSD — GNU `sed -i` takes no argument), `ssh` (OpenSSH 10.4p1/OpenSSL vs 10.2p1/LibreSSL), `git`, `curl`, `python3`, `clangd`, the `java`/`j*` set (from `jdk`), and `ping`/`hostname`/`ifconfig`/`whois`/`traceroute` (from `inetutils`).

List the full set with:

```sh
P=/etc/profiles/per-user/$USER/bin
for f in "$P"/*; do b=$(basename "$f"); for d in /usr/bin /bin /usr/sbin /sbin; do [ -e "$d/$b" ] && echo "$b -> $d/$b" && break; done; done
```

## Container Stack

Fully migrated to podman. `podman machine` manages the Linux VM — no colima/Docker Desktop needed. lima is kept for general-purpose Linux VMs (not container-related). `podlet` converts existing container defs to Quadlet/k8s YAML format.

## Theme Consistency

One Dark Pro (`onedarkpro_onedark`) across all tools: Neovim (`nvim/lua/theme.lua`), Tmux (inline in `home/tmux.nix`), Fish (inline in `home/fish.nix`), Ghostty (`home/ghostty.nix`).

### onedarkpro Colors

Access palette via `require("onedarkpro.helpers").get_colors()`. Key colors:

- `c.bg_statusline` (`#22262d`) — statusline/tmux bar background
- `c.selection` (`#414858`) — selection/highlight background
- `c.fg_gutter` (`#3d4350`) — dim separators
- `c.gray` (`#5c6370`) — structural lines (`WinSeparator`, tmux pane borders)
- `c.comment` (`#7f848e`) — secondary text
- `c.indentline` (`#3b4048`) — static indent guide lines

Tmux has no Lua access, so its colors are hardcoded. Pick each one by finding the Neovim highlight for the same concept rather than by eye:

| tmux | Neovim |
|------|--------|
| `mode-style` | `Visual` |
| `copy-mode-match-style` / `-current-match-style` | `Search` / `CurSearch` |
| `pane-border-style` | `WinSeparator` |
| `message-style` | `MsgArea` |
| current window | `TabLineSel` |
| status-right idle / prefix / copy-mode | `MiniStatuslineMode` Normal / Command / Other |

**Copying the exact hex is not always right — copy the intent.** nvim popups sit on `#282c34` and rely on `FloatBorder` to delineate; a tmux message has no border and sits on the darker status bar, so the same `float_bg` would vanish. Verify a choice by contrast ratio against its actual backdrop, not against nvim's.

**One hue legitimately carries several meanings.** onedarkpro itself puts purple on `Keyword`, `Statement`, `Conditional`, `@punctuation.bracket` *and* `TabLineSel`, all visible at once. Position and context disambiguate — "this color is already used" is not an argument against reusing it.

### onedarkpro Plugin Integrations

Enable in `setup()` to let theme manage highlight groups:

```lua
plugins = { blink_cmp = true, mini_diff = true, mini_icons = true, snacks = true, nvim_lsp = true, treesitter = true }
```

## Ghostty Shell Integration

`shell-integration = none` — disabled; tmux handles working directory and pane management, making all features redundant.
Available features: `cursor`, `sudo`, `title`, `ssh-env`, `ssh-terminfo`, `path`. In tmux `TERM=tmux-256color` so `ssh-env` TERM conversion does not trigger.
Verify integration is actually loaded: `fish -c 'functions __ghostty_setup'` — returns "not loaded" if disabled correctly. `$GHOSTTY_SHELL_FEATURES` is set by Ghostty process itself and is not a reliable indicator.

## Key Keybinding Patterns

Tmux handles all split and pane management. No custom Ghostty keybindings — tmux workflow makes them redundant. Tmux prefix is `Ctrl+B`.

Ghostty requires `macos-option-as-alt = true` (set under `lib.optionalString pkgs.stdenv.isDarwin`) for `<A-*>` keybindings to work in Neovim on macOS — without it, Option sends special characters instead.

## Tmux Quirks

- Mode detection without plugins: `#{?client_prefix,...}` and `#{?pane_in_mode,...}` are built-in tmux format strings
- `pane-border-style` and `pane-active-border-style` set to the same color — a shared border between an active and an inactive pane renders half in each style. Re-verified on tmux 3.7b, so do not try giving the active border its own color again
- **`message-style` needs `fill=`, not just `bg=`.** tmux draws the message over the existing status line and only paints the cells the text occupies, so the rest of the row shows through — `display-message HELLO` over `jtr860830@…` rendered as `HELLO60830@…`. `fill` makes it clear to end of line
- **Options the module already covers must not be repeated in `extraConfig`.** `escapeTime`, `historyLimit`, `focusEvents` each ended up emitted twice, with `extraConfig` winning only by line order; `baseIndex` alone sets both `base-index` and `pane-base-index`. Check with:
  ```sh
  nix eval --raw '.#darwinConfigurations.pro-darwin.config.home-manager.users.jtr860830.xdg.configFile."tmux/tmux.conf".text' \
    | grep -oE '^set(w)? +(-[a-z]+ +)*[a-z-]+' | awk '{print $NF}' | sort | uniq -d
  ```
- Split keybinds need `-c "#{pane_current_path}"` to inherit current directory; omitting it always opens in `$HOME`
- `window-style = "dim"` does NOT work with truecolor apps — SGR dim only affects 16-color ANSI; truecolor RGB values are unaffected. Background color difference is the only reliable inactive-pane visual cue, but Neovim overrides it too.
- `set -g set-clipboard on` enables OSC 52 clipboard sync (replaces yank plugin; requires terminal support e.g. Ghostty)
- `status-justify absolute-centre` centers window list by terminal width; `centre` centers between left/right content
- `#{client_user}` (tmux 3.4+) replaces `#(whoami)` — built-in, no shell spawn
- `#[fg=...]` inside `#{?…}` works fine, including hex colors — `status-right` relies on it. When testing with `display -p`, note that `#{?1,a,b}` looks *1* up as a variable name, finds nothing and takes the `b` branch; use `#{?#{==:1,1},a,b}` or a real variable or the conditional will look broken
- `#{==:#{session_windows},1}` to detect single-window sessions (e.g. hide window list)
- Shift+Enter reaches applications through `extended-keys`, not a `send-keys` binding. tmux only requests extended keys from the outer terminal when that terminal advertises `extkeys`, and no built-in `terminal-features` entry does — hence `set -as terminal-features "xterm*:extkeys"`. A client negotiates this at attach time, so `tmux kill-server` (or detach/attach) is required after changing it; confirm with `tmux display -p '#{client_termfeatures}'`. `extended-keys-format csi-u` gives `CSI 13;2u`, the `xterm` default gives `CSI 27;2;13~`
- `terminal-overrides ",xterm*:RGB"` is unnecessary: `xterm-ghostty`'s terminfo declares `Tc` and tmux reports `RGB` in `client_termfeatures` without it
- Default `prefix w` is `choose-tree -Zw` and `prefix &` kills the window *with* confirmation. Do not rebind `w` to `kill-window` — with a single window that takes the whole server down, silently
- Built-in `prefix ←↑↓→` pane navigation carries `-r`, so it repeats within `repeat-time` without re-pressing the prefix; hand-rolled `bind h/j/k/l` does not. `prefix q` jumps by pane number, `prefix ;` toggles the last pane

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

## Terminfo

Managed via `pkgs.ncurses` in nix — no manual `~/.local/share/terminfo/` needed. Set in `home/fish.nix`:

```nix
TERMINFO_DIRS = "${pkgs.ncurses}/share/terminfo";
```

Referencing `${pkgs.ncurses}` in a nix expression automatically includes it in the closure — no need to add it to `home.packages`.

## Man Pages

`programs.man.mandoc.enable = true` with `man-db.enable = false` (in `home/fish.nix`, alongside the other shell tools; `MANPAGER` stays in `home/neovim.nix` with `EDITOR`/`VISUAL`). man-db writes `~/.manpath` — a hardcoded path with no XDG support upstream — which was the only entry in `$HOME` outside `.cache` `.config` `.local` `.ssh` `.Trash`. mandoc keeps its cache in `~/.local/share/mandoc/man` instead, so `apropos` still works with nothing left in the home directory.

- fish enables `programs.man.generateCaches` via `mkDefault true` so `man` completion can use `apropos`; a plain assignment overrides it
- mandoc ignores `MANWIDTH`, so `:Man` pages hard-wrap at 80 columns instead of filling the window — the only functional difference. Lookup, rendering, headings, cross-references and overstrike highlighting are unchanged
- man-db derives its search path from `$PATH` automatically; **mandoc requires `MANPATH`**, which the module sets via `home.sessionSearchVariables`

## Claude Code Plugin State

The `remember` plugin keeps two separate directories, and only one of them is per-project:

- `<project>/.remember/` — the memory store (`now.md`, `today-*.md`, `recent.md`). Self-ignoring via a `.gitignore` containing `*`, so it never shows in `git status`
- `$HOME/.remember/run/` — spawn records bounding the background summarizer's concurrency and rate

The split is deliberate: the cap has to span projects, or `cd`-ing elsewhere would lift it, and `spawn_guard.py` derives the path from `HOME` alone so a child that inherited no plugin environment resolves the same directory. Relocated to XDG with `REMEMBER_RUNTIME_DIR` in `home/fish.nix`, next to `CLAUDE_CONFIG_DIR`.

`$HOME/.remember/config.json` is a *read-only* lookup for user-global overrides — guarded by `[ -f ]` and never created — so with the runtime dir moved, nothing recreates the directory. `record_dir()` is its only writer. Note `bootstrap-dirs.sh` refuses to migrate `$HOME/.remember` as a legacy project store: opening a session with `cwd = $HOME` would otherwise consume the very config that directs the migration.

## Stale `__HM_SESS_VARS_SOURCED`

`hm-session-vars.fish` returns early when the exported `__HM_SESS_VARS_SOURCED` is already set — a guard against repeatedly prepending to `PATH`. A long-lived tmux server therefore pins the session variables from whenever it started: after adding or changing one, new panes still inherit the stale value and never pick it up. Symptom is a newly declared variable being simply absent.

`tmux kill-server` is the clean fix (fish re-creates the session via its `exec tmux new-session -A -s main`). To verify a variable is declared correctly rather than merely stale:

```sh
env -u __HM_SESS_VARS_SOURCED fish -c 'echo $MANPATH'
```

### GUI Apps Launched From a Terminal

A tmux server is not the only thing that pins a stale environment. macOS `open` **passes the caller's environment to the GUI app**, and everything that app later launches inherits it — so `open -a Alfred` from inside tmux gives Alfred `TMUX`, `TERM=tmux-256color` and `__HM_SESS_VARS_SOURCED=1`, and a Ghostty launched from that Alfred hands the same set to every shell in it. Quitting and reopening the *terminal* does not help; the pollution lives upstream in the launcher.

The two variables fail in ways that look unrelated, and neither names its cause:

- stale `TMUX` — `interactiveShellInit`'s `if not set -q TMUX` sees a value, skips `exec tmux`, and a new window lands in a bare fish with no tmux at all. The variable can point at a server that has since been killed; the guard only tests existence, not liveness
- stale `__HM_SESS_VARS_SOURCED` — `hm-session-vars.fish` returns early, so a newly declared variable is simply absent even in a brand-new window

Read what an app is actually holding with `ps -Eww -o command= -p <pid>`; `launchctl getenv` shows only the launchd session and stays empty in this case. A Finder- or Dock-launched app gets launchd's environment (about a dozen variables — `HOME` `PATH` `USER` `SHELL` `TMPDIR` `SSH_AUTH_SOCK` `XPC_*` …), which is the baseline to compare against. To relaunch one cleanly from a shell, give it that set explicitly rather than subtracting offenders one at a time:

```sh
env -i HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" PATH=/usr/bin:/bin:/usr/sbin:/sbin \
  TMPDIR="$TMPDIR" __CF_USER_TEXT_ENCODING="$__CF_USER_TEXT_ENCODING" open -a "<App>"
```

## Neovim

Custom minimal config managed by `programs.neovim` in `home/neovim.nix`. No Lazy.nvim — plugins installed via `programs.neovim.plugins` (uses nixpkgs vimPlugins, placed in packpath).

- `initLua = builtins.readFile ../nvim/init.lua` — entry point
- `xdg.configFile."nvim/lua".source = ../nvim/lua` — Lua modules sourced from repo; **requires rebuild to update**
- Plugins land in `~/.local/share/nvim/site/pack/hm/start/` (picked up by default packpath)

### LSP (neovim 0.11+ API)

Uses `vim.lsp.config` + `vim.lsp.enable` — no `require("lspconfig")` needed. nvim-lspconfig provides `lsp/` directory configs read automatically by `vim.lsp.enable`.

LSP servers are managed in two places: binary in `home/packages.nix`, and enabled in `nvim/lua/lsp.lua` → `vim.lsp.enable { ... }`. Both must be updated when adding a new server.

A server only attaches to the filetypes its `lsp/<name>.lua` claims, so check them against `vim.filetype.add` in `options.lua`. `helm_ls` claims `helm` and `yaml.helm-values` — mapping Helm templates to `gotmpl` silently left them with no LSP. The `helm` parser inherits `gotmpl` and additionally injects `yaml`, so it is the better choice anyway (parse tree becomes `[helm, yaml]`).

`programs.neovim.extraPackages` is intentionally NOT used — it wraps binaries into neovim's own PATH (appended as a suffix), making them invisible to the shell and to other editors. `helix` is installed and resolves LSP servers from PATH, so everything lives in `home.packages` instead. Note `clangd`/`clang-format` come from `clang-tools`, which is also used directly as a CLI tool.

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
- `an`/`in` in visual and operator-pending are **built-in** treesitter node selection ("select parent/child node"). With a count they reproduce mini.ai's structural textobjects — `dan` deletes an argument, `d3an` a whole function call, at the same depth in lua, python and go. Do not add `mini.ai` on the grounds that vanilla lacks `ia`/`af`.

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

Only four symbols are used in the whole repo: `▎` (U+258E, mini.diff signs), `▏` (U+258F, snacks indent), `○`/`●` (U+25CB/25CF, tmux windows), plus `■` (U+25A0, tmux zoom). Two things to check before adding a fifth:

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

