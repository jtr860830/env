---
paths: ["config/fish/**"]
---

## Fish PATH

`conf.d/env.fish` sets the whole `PATH` with `set -gx PATH` rather than prepending with `fish_add_path`, **deliberately**: macOS's `path_helper` reads `/etc/paths` and `/etc/paths.d/*` and *prepends* the system entries, which would push `/usr/bin` ahead of Homebrew. Writing the list outright keeps it out of the way — do not "simplify" this to an append-style call.

It lives in `conf.d/` rather than `config.fish` so it is set for every fish — interactive or not — before anything else runs; a GUI-launched process inherits only launchd's `/usr/bin:/bin:/usr/sbin:/sbin`. nix-darwin used to hide this by setting `PATH` in `/etc/fish`. tmux is not started from fish at all: Ghostty's `command` does it (`docs/ghostty.md`), so fish has no tmux logic anywhere.

| Path | Holds |
|------|-------|
| `~/.local/bin` | every user-installed binary, ahead of everything: `XDG_BIN_HOME`, uv tools, `go install` (`GOBIN`), `cargo install` (`CARGO_INSTALL_ROOT=$HOME/.local`). The costs are accepted: cargo keeps its install records (`.crates.toml`, `.crates2.json`) in the root, i.e. `~/.local/`, and same-named binaries overwrite one another (`go install` silently; cargo and uv refuse without `--force`). Before this, `~/.local/share/cargo/bin` held old `fd` and `rg` that shadowed the brewfile's — they were removed, along with an unused `rustlings`. `CARGO_HOME` (registry, caches) stays at `~/.local/share/cargo` |
| `/opt/homebrew/bin`, `/opt/homebrew/sbin` | the brewfile |
| `/usr/local/bin`, `/usr/local/sbin`, `/usr/bin`, `/usr/sbin`, `/bin`, `/sbin` | the system, locality-first |

**Keg-only formulae are linked (`link: true` in the brewfile), not added to `PATH`** — `curl`, `llvm` and `rustup` are, so their binaries resolve from `/opt/homebrew/bin`. `ncurses` and `openjdk` are deliberately not linked, and the gnubin formulae are reached by their `g`-prefixed names; the reasons are in `docs/homebrew.md`. `man` needs no `MANPATH` (`docs/env.md`, `## Man Pages`).

**The system part is six hardcoded directories, locality-first, and `path_helper` is deliberately not used.** Its output is twelve entries here — `/System/Cryptexes/App/usr/bin`, three `cryptexd` bootstrap directories, `/pkg/env/global/bin` and Wireshark's `Contents/MacOS` on top of the six — and the owner chose a short, predictable list over following whatever `/etc/paths.d` accumulates. Anything that needs one of those is called by full path or added here explicitly. Across the six there are 1,273 distinct names (2026-10-21) and **zero collisions**, so locality-first versus bin-then-sbin changes nothing about which binary wins; re-check before reopening it:

```sh
python3 -c "
import os,collections
d=collections.defaultdict(list)
for p in '/usr/local/bin /usr/local/sbin /usr/bin /usr/sbin /bin /sbin'.split():
    for f in (os.listdir(p) if os.path.isdir(p) else []): d[f].append(p)
print({k:v for k,v in d.items() if len(v)>1} or 'no collisions')"
```

## conf.d Layout

`config.fish` holds only behaviour — vi key bindings and zoxide. Everything else is in `conf.d/`, which fish sources first, in filename order: `env.fish`, `prompt.fish`, `theme.fish`. There are no fish plugins and no fisher: pure was the only one, and it was replaced by the hand-written prompt (`docs/fish-prompt.md`) on 2026-10-31.

`vi` and `vim` are fish functions (`functions/vi.fish`, `vim.fish`, `--wraps nvim`), replacing home-manager's `viAlias`/`vimAlias`; without them `vim` opens Apple's unconfigured Vim. home-manager's versions were real binaries on `PATH`; functions only apply where fish runs the command, which is accepted — `EDITOR` and git's `core.editor` already name `nvim`, so only something invoking the literal name `vim` from outside fish misses them. Same mechanism as `ls`, `rm` and `wget` (whose one XDG need, the HSTS file, is the `--hsts-file=$XDG_CACHE_HOME/wget-hsts` in `functions/wget.fish`).

**The theme is `conf.d/theme.fish`, not an autoloaded `functions/__apply_theme.fish`.** A function file is read only on first call, so its `--on-variable` handler would register only because something happens to call it at startup; a conf.d file is always sourced, so the handler always exists. It opens with `status is-interactive; or return`. The prompt's git handler lives in `conf.d/prompt.fish` for the same reason: inside `functions/fish_prompt.fish` it registered only when `fish_prompt` first ran, which is *after* the first `fish_prompt` event, so every new shell's first prompt had no git segment — caught in testing.

## Fish Color Variables

Valid fish color variables (fish 4.x): `fish_color_{normal,command,keyword,quote,redirection,end,option,error,param,comment,selection,search_match,operator,escape,autosuggestion,cwd,user,host,valid_path,prefix,history_current,status}`. Note: `fish_color_history_current_command`, `fish_color_history_duration`, and `fish_color_error_background` do NOT exist.

### EZA Colors

`EZA_COLORS` uses the same format as `LS_COLORS`: `key=attrs:key=attrs:...`. Use truecolor ANSI codes (`38;2;R;G;B`), `2;38;2;R;G;B` for dim variants. Written out in full inside `__apply_theme` in `conf.d/theme.fish`, rather than in `conf.d/env.fish` — they have to be re-exported when the light/dark palette switches, which a static variable cannot do. Key names: `di` (dir), `ln` (symlink), `ex` (executable), `or` (broken symlink), `da` (date), `sn`/`sb` (size number/unit), `hd` (header), `ur`/`uw`/`ux` (user perms), `gr`/`gw`/`gx` (group perms, use dim), `ga`/`gm`/`gd`/`gv`/`gt` (git added/modified/deleted/renamed/type).

## Waiting on Upstream

**fish theme files cannot hold the whole palette.** `~/.config/fish/themes/*.theme` takes `[light]`/`[dark]` sections and `fish_config theme choose` follows the terminal from them, which would be more idiomatic than a hand-written handler — but theme files only set `fish_color_*`/`fish_pager_color_*`, so the prompt's `__prompt_c_*`, `EZA_COLORS` and `LS_COLORS` would still need one. Worth revisiting only if a shipped theme is ever seen setting something outside those two prefixes.
