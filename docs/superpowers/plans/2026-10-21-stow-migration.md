# Stow + Brewfile Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace nix-darwin + home-manager with GNU stow (dotfiles) and a brewfile (packages, always latest), then uninstall nix. macOS system settings are no longer managed.

**Architecture:** The repo can live in any directory. `stow/<package>/` mirrors paths relative to `$HOME` and is linked with `stow -d <repo>/stow -t ~`; a `justfile` resolves `<repo>` with `justfile_directory()`, and a minimal `bootstrap.sh` gets a fresh machine as far as `just`. Every dotfile starts life as a dereferenced copy of what home-manager deploys today, so behaviour is unchanged at cut-over; edits happen only where a file references `/nix/store`, `/etc/profiles` or `/run/current-system`. nix is removed last, after everything is verified running from Homebrew.

**Tech Stack:** GNU stow, Homebrew (`brew bundle`), just, fish + fisher, Neovim 0.12 `vim.pack`.

**Spec:** Decisions taken in the 2026-10-21 session, restated as Global Constraints below — there is no separate spec file.

## Global Constraints

- Single machine: macOS on Apple Silicon, host `pro-darwin`, user `jtr860830`. No Linux, no cross-OS abstractions.
- Configuration must be reproducible from the repo and land at XDG paths (`XDG_CONFIG_HOME=~/.config`, `XDG_DATA_HOME=~/.local/share`, `XDG_STATE_HOME=~/.local/state`, `XDG_CACHE_HOME=~/.cache`, `XDG_BIN_HOME=~/.local/bin`).
- Packages must be reinstallable from one declared list; versions are not pinned — always latest.
- The palette is copied as the six files home-manager generates today, unchanged: `ghostty/themes/onedarkpro_{onedark,onelight}`, `tmux/{dark,light}.conf`, and the two colour blocks inside `fish/config.fish`. The ANSI-index simplification is out of scope.
- `PATH` gains only `/opt/homebrew/bin` and `/opt/homebrew/sbin`. gnubin directories and keg-only `bin` directories (`curl`, `openjdk`, `llvm`, `rustup`) are **deliberately deferred** to a discussion after the migration, so until then `make`, `sed`, `ping`/`hostname`/`ifconfig`/`whois`/`traceroute`, `curl` and `clangd` resolve to Apple's versions, `java` is Apple's stub with no runtime, and `rustup`/`rustc`/`cargo` are absent. `ssh` still comes from Homebrew's `openssh`, which is not keg-only.
- macOS settings (`system.defaults`, hostname, DNS) are not managed. They persist on this machine after nix-darwin is removed; a new machine sets them by hand.
- sudo keeps Touch ID: `/etc/pam.d/sudo_local` is rewritten by hand after nix-darwin removes its copy, with `pam_reattach.so` before `pam_tid.so` so it works inside tmux.
- **Location-independent repo.** No file under `stow/`, the `justfile` or `bootstrap.sh` may contain the repo's absolute path; everything derives it (`justfile_directory()`, `$(dirname "$0")`). Nothing in the deployed configs references the repo today (checked 2026-10-21).
- No comments in config files; reasoning goes to `AGENTS.md`.
- Commit style `type: description`; non-ASCII messages via `git commit -F <file>`.
- Work on branch `stow-migration`; `main` keeps the nix setup until Task 6 succeeds.

## Review Focus

1. **Login shell disappears.** `/run/current-system/sw/bin/fish` vanishes when nix-darwin is uninstalled; a new Ghostty window must still open fish. Pinned in Task 6 Step 1.
2. **Scripts assuming GNU tools.** With gnubin deferred, `sed -i` is BSD's and needs `''`; repo scripts (`bootstrap.sh`, `check-store-refs.sh`) must run under Apple's tools. Pinned in Task 3 Step 4.
3. **Touch ID sudo lost.** nix-darwin's uninstall removes `/etc/pam.d/sudo_local`; it must be rewritten afterwards and work inside tmux. Pinned in Task 5 Step 3.
4. **`brew bundle --cleanup` deletes something wanted.** The Brewfile must list every cask and `mas` app before the first cleanup run. Pinned in Task 2 Step 3.
6. **Repo moved after linking.** stow's links are relative, so moving the repo leaves every link dangling and a plain `stow` then reports conflicts. `just relink` must recover from that state. Pinned in Task 6 Step 2.
5. **Stale environment after cut-over.** A long-lived tmux server keeps `__HM_SESS_VARS_SOURCED` and nix PATH entries. Pinned in Task 4 Step 5.

---

### Task 1: Extract deployed dotfiles into a stow tree

**Files:**
- Create: `stow/{fish,ghostty,git,go,npm,nvim,ssh,tmux,claude,codex}/…`
- Create: `scripts/check-store-refs.sh`

**Interfaces:**
- Produces: `stow/<pkg>/` trees whose relative paths equal the target paths under `$HOME`; `scripts/check-store-refs.sh` exits non-zero when any file under `stow/` contains `/nix/store`, `/etc/profiles` or `/run/current-system`.

- [ ] **Step 1: Write `scripts/check-store-refs.sh`** — `grep -rlE '/nix/store|/etc/profiles|/run/current-system' stow/` and exit 1 if it prints anything.
- [ ] **Step 2: Copy every home-manager link with `cp -L`**, preserving the relative path, from this inventory (22 links under `~/.config`, plus two outside it):
  `fish/{config.fish,conf.d/plugin-pure.fish,functions/{fish_greeting,ls,rm,wget}.fish}`, `ghostty/{config,themes/onedarkpro_onedark,themes/onedarkpro_onelight}`, `git/{config,ignore,allowed_signers}`, `npm/npmrc`, `nvim/init.lua`, `tmux/{tmux.conf,dark.conf,light.conf}`, `claude/CLAUDE.md`, `.ssh/config`, `Library/Application Support/go/env`. For `nvim/{after,lsp,lua}` and `claude/CLAUDE.md`, `git mv` the repo sources (`nvim/`, `claude/CLAUDE.md`) into the stow tree instead of copying, so there is one copy. Do not copy `codex/.keep`; create an empty `stow/codex/.config/codex/.keep` so stow creates the directory.
- [ ] **Step 3: Run `scripts/check-store-refs.sh`** — expected FAIL listing exactly `fish/config.fish`, `fish/conf.d/plugin-pure.fish`, `nvim/init.lua`.
- [ ] **Step 4: Remove the references:**
  - `nvim/init.lua`: drop lines 1–2 (`package.path`/`package.cpath` into the luajit env); the remainder equals the repo's old `nvim/init.lua`.
  - `fish/conf.d/plugin-pure.fish`: delete; pure comes from fisher (Task 4).
  - `fish/config.fish`: leave for Task 3, but Step 3's expected list shrinks to it alone.
- [ ] **Step 5: Run the check** — expected FAIL naming only `stow/fish/.config/fish/config.fish`.
- [ ] **Step 6: Commit** — `feat: extract deployed dotfiles into a stow tree`.

### Task 2: Brewfile

**Files:**
- Create: `brewfile`

**Interfaces:**
- Consumes: `darwin/homebrew.nix` (22 casks, 5 `mas` apps), `home/packages.nix` (77 entries), module-installed tools.
- Produces: `brewfile` at the repo root. Homebrew only auto-discovers the capitalised `Brewfile`, so every call passes `--file` explicitly; `HOMEBREW_BUNDLE_FILE` is **not** set, because it would hardcode the repo path. The `justfile` recipes are the entry point.

- [ ] **Step 1: Write the brewfile.** `brew` lines, alphabetical, with these renames from nix attribute names: `clang-tools`→`llvm` (already listed, so one entry), `gnumake`→`make`, `gnused`→`gnu-sed`, `jdk`→`openjdk`, `kubectl`→`kubernetes-cli`, `kubernetes-helm`→`helm`, `python3`→`python`. Drop `nixd` and `nixfmt`. Add what modules installed: `fish git go neovim node openssh tmux zoxide`, plus `fisher ncurses pam-reattach stow tree-sitter-cli`. All 85 formula names were verified present with `brew info --json=v2 --formula`. `cask` lines: the 22 existing casks plus `1password-cli claude-code codex font-maple-mono-nf-cn`. `mas` lines: the 5 apps with their ids from `darwin/homebrew.nix`.
- [ ] **Step 2: Dry-run** — `brew bundle check --file brewfile --verbose`; expected: lists only formulae not yet installed, no parse errors.
- [ ] **Step 3: Cleanup preview** — `brew bundle cleanup --file brewfile` (without `--force`); expected: prints nothing, because everything currently installed by brew is in the file. Any line printed is a missing entry — add it.
- [ ] **Step 4: Install** — `brew bundle install --file brewfile`; expected exit 0. nix still precedes brew in `PATH`, so nothing changes behaviour yet.
- [ ] **Step 5: Commit** — `feat: add a brewfile covering every nix and cask package`.

### Task 3: fish config without nix

**Files:**
- Modify: `stow/fish/.config/fish/config.fish` (copied in Task 1; nix lines are 8, 33–35 and 134)
- Create: `stow/fish/.config/fish/conf.d/env.fish`

**Interfaces:**
- Produces: `env.fish` exporting every variable `hm-session-vars.fish` exports today except `__HM_SESS_VARS_SOURCED`. That includes `CLAUDE_CONFIG_DIR`, `CODEX_HOME` and `NPM_CONFIG_USERCONFIG`, which modules used to provide.

- [ ] **Step 1: Write `env.fish`** with `set -gx` for those variables in the current `hm-session-vars.fish`, values copied verbatim, except `TERMINFO_DIRS=/opt/homebrew/opt/ncurses/share/terminfo` and `MANPATH` (decided in Step 4).
- [ ] **Step 2: Edit `config.fish`:** delete the `source …hm-session-vars.fish` line; replace `zoxide` store path with `zoxide init fish | source`; replace the `PATH` block with, in order: `~/.local/bin`, `~/.local/share/go/bin`, `~/.local/share/cargo/bin`, `/opt/homebrew/bin`, `/opt/homebrew/sbin`, then the six system directories unchanged. Nothing else — see Global Constraints.
- [ ] **Step 3: Run `scripts/check-store-refs.sh`** — expected PASS (no output, exit 0).
- [ ] **Step 4: Verify in a clean shell** without touching the live one (`REPO` is the repo's root, whatever directory it is in): `env -i HOME=$HOME USER=$USER TERM=xterm-256color /opt/homebrew/bin/fish -C "set -x XDG_CONFIG_HOME $REPO/stow/fish/.config" -c '…'` running these checks, each with its expected result:
  - `command -v nvim fish tmux git ssh rg` → all under `/opt/homebrew/bin`; `command -v sed make` → `/usr/bin` (expected while gnubin is deferred)
  - `bash -n` and a dry run of every repo script succeed with `/usr/bin/sed`
  - `man 2 open | head -1` → contains `System Calls Manual`; `man rg | head -1` → ripgrep's page. If either fails, set `MANPATH` in `env.fish` to `/opt/homebrew/share/man:/usr/share/man:/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/share/man` and re-run.
- [ ] **Step 5: Update `.claude/rules/fish.md`** — PATH table and the `nix eval … systemPath` check become the list above and `brew --prefix`; add a line that gnubin and keg-only entries are pending a decision.
- [ ] **Step 6: Commit** — `feat: fish environment and PATH from Homebrew`.

### Task 4: Cut-over to stow

**Files:**
- Create: `stow/fish/.config/fish/fish_plugins` (`jorgebucaran/fisher`, `pure-fish/pure`)
- Modify: `stow/nvim/.config/nvim/init.lua`, `stow/nvim/.config/nvim/lua/{lsp,plugins}.lua`

**Interfaces:**
- Consumes: Task 1 tree, Task 3 fish config.
- Produces: every config path under `$HOME` is a symlink into `<repo>/stow/`.

- [ ] **Step 1: Neovim plugins via `vim.pack`.** At the top of `init.lua`, after the leader lines, one `vim.pack.add { … }` with the GitHub URLs of the nine plugins in `home/neovim.nix`: `nvim-treesitter/nvim-treesitter`, `neovim/nvim-lspconfig`, `saghen/blink.cmp`, `ibhagwan/fzf-lua`, `echasnovski/mini.nvim`, `olimorris/onedarkpro.nvim`, `Bekaboo/dropbar.nvim`, `folke/snacks.nvim`, `stevearc/conform.nvim`. Remove `"nixd"` from `lsp.lua:44` and `nix = { "nixfmt" }` from `plugins.lua:150`. Grammars: `require("nvim-treesitter").install` the languages in the AGENTS.md treesitter check list plus `fish`, `vim`, `vimdoc`, `query`, `toml`, `go`, `gomod`.
- [ ] **Step 2: Remove home-manager's links.** Delete only the symlinks listed in Task 1 Step 2 plus `~/Applications/Home Manager Apps` — every one is a link into `/nix/store`, verified with `test -L` before `rm`.
- [ ] **Step 3: Stow** — `stow -d "$REPO/stow" -t ~ -v fish ghostty git go npm nvim ssh tmux claude codex`; expected: no `conflict` lines.
- [ ] **Step 4: Plugins** — `fish -c 'fisher update'`; `nvim --headless '+lua vim.pack.update(nil, { force = true })' +qa`; then the AGENTS.md treesitter check — expected `done` with no `Invalid node type` lines (the `diff` mismatch may now be gone; record either way).
- [ ] **Step 5: Restart the environment** — `tmux kill-server`, open a new Ghostty window; expected: `set -q __HM_SESS_VARS_SOURCED` fails, `command -v nvim` is `/opt/homebrew/bin/nvim`, prompt is pure, light/dark switching still recolours fish, tmux and Ghostty.
- [ ] **Step 6: Verify the tools that depended on module output:** `go env GOPATH` → `~/.local/share/go`; `npm config get prefix` → the XDG value in `npmrc`; `git commit --allow-empty -m test` on a scratch repo signs (`%G?` = `G`); `ssh -G github.com | grep identityagent` → 1Password socket; Claude Code shows the user `CLAUDE.md` loaded.
- [ ] **Step 7: Commit** — `feat: cut over dotfiles to stow and plugins to vim.pack`.

### Task 5: Uninstall nix-darwin and nix

Irreversible — the executor stops before Step 2 and asks the user.

- [ ] **Step 1: Change the login shell first** — append `/opt/homebrew/bin/fish` to `/etc/shells`, then `chsh -s /opt/homebrew/bin/fish`; expected `dscl . -read ~ UserShell` → `/opt/homebrew/bin/fish`. Open a new Ghostty window to prove it.
- [ ] **Step 2: Uninstall nix-darwin** with its own uninstaller (`sudo darwin-uninstaller`), then nix with the uninstaller matching how it was installed (check `/nix/receipt.json` for Determinate; otherwise the upstream manual steps).
- [ ] **Step 3: Restore the three `/etc` files nix-darwin owned that the setup still needs** — `/etc/shells` must still list `/opt/homebrew/bin/fish`, and `/etc/homebrew/brew.env` must contain `HOMEBREW_XDG_CONFIG_HOME=/Users/jtr860830/.config` (expected: `brew ruby -e 'puts ENV["HOMEBREW_USER_CONFIG_HOME"]'` prints a path under `~/.config`, and `~/.homebrew` is not created). Then write `/etc/pam.d/sudo_local` with two lines, `auth optional /opt/homebrew/lib/pam/pam_reattach.so` then `auth sufficient pam_tid.so`. Expected: `sudo -k; sudo true` inside a tmux pane prompts Touch ID.
- [ ] **Step 4: Verify nothing references nix** — `ls /nix /run/current-system /etc/profiles` all fail; `scripts/check-store-refs.sh` passes; a new window opens fish → tmux with pure prompt.

### Task 6: Repo cleanup and documentation

**Files:**
- Delete: `flake.nix`, `flake.lock`, `darwin/`, `home/` (keep `scripts/check-store-refs.sh`)
- Create: `bootstrap.sh`, `justfile`
- Modify: `AGENTS.md`, `.claude/rules/{fish,neovim,tmux}.md`, `.claude/skills/theme/SKILL.md`

- [ ] **Step 1: `bootstrap.sh`** — only what `just` cannot do: install Homebrew if absent, `brew install just`, `exec just --justfile "$(dirname "$0")/justfile" setup`. Run with Apple's `/bin/bash`.
- [ ] **Step 2: `justfile`** — recipes `setup` (`brew bundle install --file brewfile`, `link`, `etc`, `fisher update`, `vim.pack` update), `update` (`brew bundle install --upgrade --file brewfile`, `fisher update`, `vim.pack` update), `link` (`stow -d stow -t ~` every package), `relink` (delete dangling links under `~` and `~/.config` whose target contains `/stow/`, then `link`), `etc` (write the `/etc/shells` entry, `/etc/homebrew/brew.env` and `/etc/pam.d/sudo_local` when missing or different), `check` (`brew bundle check --file brewfile`, `scripts/check-store-refs.sh`, `stow -n` dry run), `clean` (`brew bundle cleanup --force --file brewfile`). Every path is relative to `justfile_directory()`, where just runs recipes by default. Expected: on the migrated machine `just check` passes and `just setup` changes nothing. Move test: `mv` the repo to a scratch directory, `just relink` there, confirm `nvim --version`, `fish -c true` and `git config user.name` still work, then move it back and `just relink` again.
- [ ] **Step 3: Rewrite `AGENTS.md`** around stow + Brewfile: Repository Overview, Applying Changes (`bootstrap.sh` once, then `just update` / `just link`), the location-independence rule, and delete the nix-only sections — Nix Quirks, Modules vs `home.packages`, Cross-Platform Nix Patterns, Known nixpkgs Packaging Issues, Go/Codex/Claude Code/npm module sections, Terminfo's nix rationale, Stale `__HM_SESS_VARS_SOURCED`. Keep every measured finding that is not about nix (Homebrew `brew.env`, Alfred, the Spotlight-hotkey note, man pages' macOS SDK path, Ghostty, theme pointers). Record the decision and its reasons: single Mac, configs reproducible, packages latest.
- [ ] **Step 4: Rules and theme skill** — replace `palette.nix` as "single source" with the six files named in Global Constraints, and note that a palette change edits all six. `.claude/rules/neovim.md:44` links `~/.config/env/nvim` for isolated tests; make it `$(git rev-parse --show-toplevel)/stow/nvim/.config/nvim`.
- [ ] **Step 5: Verify** — `grep -rn 'nix' AGENTS.md .claude/` returns only intentional historical mentions.
- [ ] **Step 6: Commit, then merge `stow-migration` into `main`** — `chore: remove nix-darwin and home-manager`.
