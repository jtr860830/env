---
paths: ["config/fish/**"]
---

## Fish PATH

`conf.d/env.fish` sets the whole `PATH` with `set -gx PATH` rather than prepending with `fish_add_path`, **deliberately**: macOS's `path_helper` reads `/etc/paths` and `/etc/paths.d/*` and *prepends* the system entries, which would push `/usr/bin` ahead of Homebrew. Writing the list outright keeps it out of the way — do not "simplify" this to an append-style call.

It lives in `conf.d/` rather than `config.fish` so it is set for every fish — interactive or not — before anything else runs; a GUI-launched process inherits only launchd's `/usr/bin:/bin:/usr/sbin:/sbin`.

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

## Layout

The repository holds four things under `~/.config/fish`:

| Path | Holds |
|------|-------|
| `conf.d/env.fish` | the environment, for every fish |
| `config.fish` | interactive behaviour only: vi key bindings, the cursor for external commands, pure's two symbols, the call to `__apply_theme`, zoxide |
| `functions/` | `__apply_theme`, an empty `fish_greeting`, and the wrappers `ls`, `rm`, `vi`, `vim`, `wget` |
| `fish_plugins` | fisher's plugin list |

Everything else there is written by fisher or by fish and is a real file outside the repository: the plugins' `functions/`, `conf.d/` and `themes/`, and `fish_variables`.

## Plugins

fisher comes from the `brewfile`, so `fish_plugins` lists only the two plugins, `pure-fish/pure` and `rose-pine/fish`, with no line for fisher itself. `just plugins` runs `fisher update`, which installs whatever the list names. fisher rewrites `fish_plugins` through its link each time. The content stays the same as long as every plugin installs. A plugin whose download fails is left out of the rewritten list while fisher still exits 0, which shows as a change in git: restore the file and run `just plugins` again.

**A plugin must never find a link where it wants to write.** fisher copies with `cp -f`, which follows a link, a dangling one included, and would write the plugin's file into the repository. pure ships `fish_prompt.fish`, `fish_mode_prompt.fish` and `fish_title.fish`. So no file under `config/fish` may carry a name a plugin ships, and after deleting one run `just link` before fisher runs again (`docs/setup.md`).

## Prompt

The prompt is pure, with two settings in `config.fish`: `pure_symbol_prompt` and `pure_symbol_reverse_prompt` are both `$`. pure's defaults are `❯` in insert mode and `❮` in the others; the owner wants `$` in every mode and reads the mode from the cursor's shape. Its colours come from `rose-pine/fish`, which maps the theme onto pure's variables. pure's `⇡` and `⇣` are not in Maple Mono NF CN and come from a fallback font.

## Colours

The theme is `Rosé Pine Auto` from `rose-pine/fish`. It has a `[dark]` and a `[light]` section, and `fish_config theme choose` picks one from what the terminal reports in `fish_terminal_color_theme`.

`functions/__apply_theme.fish` makes that choice instead of a bare line in `config.fish`, because the terminal does not always report. Rex answers the colour query only for the session its window is showing (`docs/rex.md`), and there is nothing to ask without a terminal. With no report the bare line leaves a placeholder in every colour variable, and pure then prints an error on each prompt. The function chooses the dark section until the terminal has reported, and runs again when the variable changes, so the colours follow a report that comes late and the system's switch between light and dark.

The call to `__apply_theme` in `config.fish` is required: a file in `functions/` is read on first call, and only then does its `--on-variable` handler exist.

`LS_COLORS` and `EZA_COLORS` are not set; `ls` and `eza` use the terminal's sixteen colours.

## Cursor

fish's vi cursors are its defaults: a bar in insert, a block in default and visual, an underline in replace. With the same prompt symbol in every mode they are the only sign of the mode.

`fish_cursor_external line` gives a program started from fish a bar cursor rather than fish's block. It is there for pi, whose input is always insert mode and which sets no shape of its own (`docs/pi-ui.md`). It is global: a program that shows a cursor is nearly always waiting for input, and one with modes sets its own.

## Functions

`vi` and `vim` are fish functions (`--wraps nvim`); without them `vim` opens Apple's unconfigured Vim. Functions apply only where fish runs the command, which is accepted: `EDITOR` and git's `core.editor` already name `nvim`. `ls`, `rm` and `wget` work the same way, the last for its HSTS file (`docs/env.md`).
