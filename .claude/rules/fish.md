---
paths: ["config/fish/**"]
---

## Fish PATH

`conf.d/env.fish` sets the whole `PATH` with `set -gx PATH` rather than prepending with `fish_add_path`, **deliberately**: macOS's `path_helper` reads `/etc/paths` and `/etc/paths.d/*` and *prepends* the system entries, which would push `/usr/bin` ahead of Homebrew. Writing the list outright keeps it out of the way — do not "simplify" this to an append-style call.

It lives in `conf.d/` rather than `config.fish` so it is set for every fish — interactive or not — before anything else runs; a GUI-launched process inherits only launchd's `/usr/bin:/bin:/usr/sbin:/sbin`. nix-darwin used to hide this by setting `PATH` in `/etc/fish`. tmux is not started from fish at all: Ghostty's `command` does it (`.claude/rules/ghostty.md`).

| Path | Holds |
|------|-------|
| `~/.local/bin` | every user-installed binary, ahead of everything: `XDG_BIN_HOME`, uv tools, `go install` (`GOBIN`), `cargo install` (`CARGO_INSTALL_ROOT=$HOME/.local`) |
| `/opt/homebrew/bin`, `/opt/homebrew/sbin` | the brewfile |
| `/usr/local/bin`, `/usr/local/sbin`, `/usr/bin`, `/usr/sbin`, `/bin`, `/sbin` | the system, locality-first |

**Keg-only formulae are linked (`link: true` in the brewfile), not added to `PATH`** — `curl`, `llvm` and `rustup` are, so their binaries resolve from `/opt/homebrew/bin`. `ncurses` and `openjdk` are deliberately not linked, and the gnubin formulae are reached by their `g`-prefixed names; the reasons are in AGENTS.md.

`man` needs no `MANPATH`: macOS's `/usr/bin/man` derives its search path from `PATH` and still reaches sections 2 and 3 in the Command Line Tools SDK — verified with `man -w 2 open`, `man -w rg` and `man -w ls`.

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

`config.fish` holds only behaviour — vi key bindings and zoxide; tmux is started by Ghostty, not here. Everything else is in `conf.d/`, which fish sources first, in filename order: `env.fish`, `prompt.fish`, `theme.fish`. There are no fish plugins and no fisher: pure was the only one, and it was replaced by the hand-written prompt below on 2026-10-31.

**The theme is `conf.d/theme.fish`, not an autoloaded `functions/__apply_theme.fish`.** A function file is read only on first call, so its `--on-variable` handler would register only because something happens to call it at startup; a conf.d file is always sourced, so the handler always exists. It opens with `status is-interactive; or return`. The prompt's git handler lives in `conf.d/prompt.fish` for the same reason: inside `functions/fish_prompt.fish` it registered only when `fish_prompt` first ran, which is *after* the first `fish_prompt` event, so every new shell's first prompt had no git segment — caught in testing.

## Fish Color Variables

Valid fish color variables (fish 4.x): `fish_color_{normal,command,keyword,quote,redirection,end,option,error,param,comment,selection,search_match,operator,escape,autosuggestion,cwd,user,host,valid_path,prefix,history_current,status}`. Note: `fish_color_history_current_command`, `fish_color_history_duration`, and `fish_color_error_background` do NOT exist.

## Prompt

Hand-written (`functions/fish_prompt.fish`, `functions/fish_mode_prompt.fish`, `conf.d/prompt.fish`), modelled on the default prompt of Stencil's Tern terminal — read from its page's HTML and CSS, not from a summary, which had reported "no pills" when every segment was one. The reasons pure was dropped: it can only recolour, so it cannot right-align anything, draw a rule to the edge, or embolden only the last path component, and its empty `fish_mode_prompt` hid the vi mode entirely.

Shown with `( … )` for a pill and `<name>` for a Nerd Font icon:

```
╭ <folder> ~/.config/env (on <branch> main* ⇑ REBASE 2/5) (<python> demo) ──── (<pause> 1) (✘ 1) (1m12s) ╮
  ❯
```

It follows the bars' rule from the `theme` skill — **a pill marks an indicator; the subject stays plain** — so the directory is plain blue text (`Directory`) with only the last component bold, exactly as nvim's filename is plain, and everything else is a `float_bg` pill with one space inside its caps and one between pills. Tern pills the directory too; that was tried and dropped for this rule.

| segment | shown when | colour → nvim group |
|---|---|---|
| frame `╭ ─ ╮` | always | `gray` → `WinSeparator` |
| directory | always | `blue` → `Directory` |
| git: `on`, branch, `⇑⇓` | in a repo | `comment`, `cyan`, `cyan` (pure's branch and info colours, kept) |
| dirty `*` | uncommitted changes, untracked included | `yellow` |
| operation | `.git/` holds `rebase-merge`, `rebase-apply`, `MERGE_HEAD`, `CHERRY_PICK_HEAD`, `REVERT_HEAD` or `BISECT_LOG` | `red` — a state to resolve |
| virtualenv | `$VIRTUAL_ENV` set | icon `yellow` → `MiniIconsYellow` (mini.icons' own python glyph U+F0320), name `fg` → `UserPill` |
| jobs | background jobs | `blue` → `DiagnosticInfo` |
| exit status | last command failed | `red` → `DiagnosticError` |
| duration | last command ≥ 5 s | `yellow` → `DiagnosticWarn` |
| `❯` | always | by `fish_bind_mode`, the `MiniStatuslineMode*` hues: default purple, insert blue, visual orange, replace red |

The jobs pill was first given cyan as "info"; onedarkpro's `DiagnosticInfo` is blue and cyan is `DiagnosticHint`. The clock Tern shows was dropped — the menu bar has one, and the duration pill covers "how long did that take". When the line does not fit, segments go in order: the right-hand pills, then the full path for `prompt_pwd`'s `~/.c/env`, then the git and virtualenv pills; the line is `COLUMNS - 1` wide so the last column never triggers a wrap. Below ~20 columns it still overflows, accepted.

The palette is `__prompt_c_*` in both branches of `__apply_theme`, ten keys — `float_bg fg gray comment blue cyan yellow red purple orange` — every one equal to onedarkpro's own value in that half (diffed against `get_colors()` in an isolated-cache nvim). APCA against the real backdrop (`float_bg` for pill text, `bg` for `❯`): the sub-45 cells are all dark and all already in the skill's sweep — `comment` 33.7, red 40.2/38.9, purple 41.9 — so the prompt is no weaker than the editor. Light `comment` on `float_bg` is 42.2; it carries only `on` and is meant to recede.

**git runs once per new prompt, never per repaint.** `__prompt_git` is a `--on-event fish_prompt` handler that caches the segment; the fish_prompt event fires for a new prompt but not for the repaint that `fish_bind_mode` changes trigger, so pressing `Esc` costs nothing. Starship gets this wrong for vi users: its fish init passes the keymap through `fish_prompt` and reruns `starship prompt` — git included — on every mode switch. One `git --no-optional-locks status --porcelain=v2 --branch` gives branch, ahead/behind and dirty; the operation is found by walking up to `.git` in fish (a `.git` *file*, for worktrees and submodules, is followed), with no process; only a detached HEAD costs a second git call, to read `rebase-merge/head-name` so a rebase shows the branch rather than a sha. `--no-optional-locks` keeps the prompt from contending with a running `git commit`.

Measured per prompt with a warm cache: ~14 ms in this repo and `tk8s`, ~45 ms in `k8s-website-kubeadm` (12,369 files), of which `git status` is 40 ms and its untracked scan the largest part. Two earlier readings were wrong and should not be repeated: 102 ms was the first visit with a cold cache, and 25 ms for `git symbolic-ref` was `python3`'s own startup in the timer — time with zsh's `$EPOCHREALTIME`. Alternatives weighed and declined at those numbers: branch-only (saves ~30 ms in the one large repo, loses dirty everywhere); `core.fsmonitor` + `core.untrackedCache` (~65 ms cold, and a daemon per repo — set it per repo in `.git/config` if one ever matters); Tide's async scheme — a disowned background `fish -c` renders into a universal `_tide_prompt_<pid>`, an `--on-variable` handler repaints, the previous job is killed — which hides latency rather than removing it and flashes stale state; Starship, which is synchronous (1.27.0's `starship.fish` calls `starship prompt` directly) and keeps its palette in TOML, splitting it from `theme.fish`.

**Glyphs.** pure's `⇡⇣` are not in Maple Mono (they rendered from a fallback face); `⇑⇓` are, and are Neutral width. Private-use glyphs are written as fish escapes — `\ue0b6`, `\ue0b4`, `\uf07b`, `\ue725`, `\uf04c`, `\U000f0320` — which fish expands both unquoted and inside `printf`'s format. The Write and Edit tools turn a `\uXXXX` in new text into the literal character, so after any edit check the files with a script for code points in U+E000–U+F8FF and re-escape; the characters themselves came through intact each time.

### EZA Colors

`EZA_COLORS` uses the same format as `LS_COLORS`: `key=attrs:key=attrs:...`. Use truecolor ANSI codes (`38;2;R;G;B`), `2;38;2;R;G;B` for dim variants. Written out in full inside `__apply_theme` in `conf.d/theme.fish`, rather than in `conf.d/env.fish` — they have to be re-exported when the light/dark palette switches, which a static variable cannot do. Key names: `di` (dir), `ln` (symlink), `ex` (executable), `or` (broken symlink), `da` (date), `sn`/`sb` (size number/unit), `hd` (header), `ur`/`uw`/`ux` (user perms), `gr`/`gw`/`gx` (group perms, use dim), `ga`/`gm`/`gd`/`gv`/`gt` (git added/modified/deleted/renamed/type).

