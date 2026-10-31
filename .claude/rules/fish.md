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
╭ <folder> ~/.config/env (on <branch> main* ↑2 REBASE 2/5) (<python> demo) ──── (<pause> 1) (✘ 1) (1m12s) ╮
  ❯
```

It follows the bars' rule from the `theme` skill — **a pill marks an indicator; the subject stays plain** — so the directory is plain blue text (`Directory`) behind a folder icon, from `prompt_pwd --dir-length=0` and split with one named-capture match, with only the last component bold, exactly as nvim's filename is plain, and everything else is a `float_bg` pill with one space inside its caps and one between pills. Tern pills the directory too; that was tried and dropped for this rule.

| segment | shown when | colour → nvim group |
|---|---|---|
| frame `╭ ─ ╮` | always | `gray` → `WinSeparator` |
| directory | always | `blue` → `Directory` |
| git: `on`, branch, `↑2↓1` | in a repo; the arrows only when ahead or behind, with counts | `comment`, `cyan`, `cyan` (pure's branch and info colours, kept) |
| dirty `*` | uncommitted changes, untracked included | `yellow` |
| operation | `.git/` holds `rebase-merge`, `rebase-apply`, `MERGE_HEAD`, `CHERRY_PICK_HEAD`, `REVERT_HEAD` or `BISECT_LOG` | `red` — a state to resolve |
| virtualenv | `$VIRTUAL_ENV` set | icon `yellow` → `MiniIconsYellow` (mini.icons' own python glyph U+F0320), name `fg` → `UserPill` |
| jobs | background jobs | `blue` → `DiagnosticInfo` |
| exit status | last command failed | `red` → `DiagnosticError` |
| duration | last command ≥ 5 s | `yellow` → `DiagnosticWarn` |
| `❯` | always | by `fish_bind_mode`, the `MiniStatuslineMode*` hues: default purple, insert blue, visual orange, replace red |

The jobs pill was first given cyan as "info"; onedarkpro's `DiagnosticInfo` is blue and cyan is `DiagnosticHint`. The clock Tern shows was dropped — the menu bar has one, and the duration pill covers "how long did that take". When the line does not fit, it gives way in this order, cheapest information first: the path is abbreviated to `prompt_pwd`'s `~/.c/env`; the duration pill goes; the jobs pill; the branch is cut with `string shorten` (down to 8 cells); the path is cut from the left with `string shorten --left`, keeping its end; the virtualenv pill; the git pill; and the exit-status pill last of all, because a failure is what a narrow tmux split most needs to show — the first version dropped all right-hand pills together and lost it. The loop applies one stage and then measures — the stage list starts with `none`, so the untouched layout is tried first — and `prompt_pwd` runs once per render for each form. Each cut is sized from the overflow (`need`), not stepped, and every dropped pill resets the path cut so the next `path` step re-fits it to the room just freed; without that, a path cut to fit the git pill stayed cut after the pill was gone. The line is `COLUMNS - 1` wide so the last column never triggers a wrap. Verified from 140 down to 24 columns on a deep path with a long branch; below about 16 columns the floors (8 cells of path, the frame, one rule cell) exceed the width and the line wraps, accepted.

Durations print as `12s`, `1m12s` or `1h2m` (`__prompt_duration`).

The palette is `__prompt_c_*` in both branches of `__apply_theme`, ten keys — `float_bg fg gray comment blue cyan yellow red purple orange` — every one equal to onedarkpro's own value in that half (diffed against `get_colors()` in an isolated-cache nvim). APCA against the real backdrop (`float_bg` for pill text, `bg` for `❯`): the sub-45 cells are all dark and all already in the skill's sweep — `comment` 33.7, red 40.2/38.9, purple 41.9 — so the prompt is no weaker than the editor. Light `comment` on `float_bg` is 42.2; it carries only `on` and is meant to recede.

**Past prompts collapse to `❯ <command>`, with a blank line between commands.** `set -g fish_transient_prompt 1` (fish 4.1+) in `conf.d/prompt.fish` makes fish call `fish_prompt --final-rendering` when a line is accepted, and that branch prints only the `comment`-coloured `❯`, flush left — the owner's choice over indenting it two cells to line up with the live `❯`, which was tried first. The blank line is printed at the top of every prompt but the shell's first: `__prompt_spacing` sets `__prompt_gap` once `__prompt_seen` exists, and a `clear` command simply erases `__prompt_seen`. That is decided in a `fish_prompt` event handler, not in `fish_prompt`, so a repaint — a vi-mode switch — draws the same prompt rather than adding another line. Verified in a real interactive fish inside a throwaway `tmux -L` server, since `fish -i <script>` never triggers a final rendering. After a clear the prompt starts at the top line: `ctrl-l` is rebound in default, insert and visual mode to `__prompt_drop_gap` followed by fish's own preset actions, unchanged (`status test-terminal-feature scroll-content-up && commandline -f scrollback-push`, then `clear-screen`), and a `fish_postexec` handler erases `__prompt_seen` after a `clear` command so the next prompt is treated as the first. It matches only a line that is exactly `clear`; `clear && …` keeps the gap, accepted. **An empty Enter leaves nothing behind**: `functions/fish_user_key_bindings.fish` binds `enter`, `ctrl-j` and `ctrl-m` in insert mode, and in default mode with `-m insert` as fish's own preset does, to `__prompt_enter`, which repaints instead of executing when the line holds no non-whitespace — refreshing the git segment first, so Enter still works as "update the prompt". The test is one `string match -qr '\S'` on `"$(commandline)"` — the quoted substitution (fish 3.4) keeps a multi-line command as one argument, where `(commandline)` splits it and `string match -q` or `string trim` then treat a loop with a blank line as empty; both mistakes were made first, and `(commandline | string collect)` was the interim fix. Replace mode is bound too, with `-m insert` and a trailing `repaint-mode` as its preset does; `replace_one`'s Enter inserts a newline and is left alone. When driving fish through `tmux send-keys` to test this, send text with `-l`: a bare `end` is the End key.

**git runs once per new prompt, never per repaint.** `__prompt_git` is a `--on-event fish_prompt` handler that caches the segment; the fish_prompt event fires for a new prompt but not for the repaint that `fish_bind_mode` changes trigger, so pressing `Esc` costs nothing. Starship gets this wrong for vi users: its fish init passes the keymap through `fish_prompt` and reruns `starship prompt` — git included — on every mode switch. Two git calls per prompt: `git status --porcelain=v2 --branch` for branch, ahead/behind and dirty, parsed with anchored `string match -rg`, `string match -v` and named captures rather than a line loop — anchored because an unanchored `string replace -f '# branch.head '` also matched an untracked file named `x# branch.head evil`, whose status line then became a second branch; and `git rev-parse --absolute-git-dir` for the operation files and, on a detached HEAD, `head-name` from either `rebase-merge` or `rebase-apply`, so a rebase of either backend shows the branch rather than a sha. (Testing the apply backend here needs `--no-update-refs`: this git config sets `rebase.updateRefs`, which `--apply` refuses.) The second call replaced a hand-written walk up to `.git`, which disagreed with git under `GIT_DIR` or in a bare repository; it costs ~6 ms and removed ten lines. **The cache holds data, not coloured text** — `__prompt_git_head`, `_dirty`, `_ahead`, `_behind`, `_op`, coloured by `__prompt_git_pill` at render time — because caching ANSI strings left the git pill in the old palette after a light/dark switch until the next command; verified by swapping `__prompt_c_cyan` without rerunning git. Files under `.git` are read with `test -f` first: a failed `<` redirection makes fish print a warning that `2>/dev/null` on the command does not catch, which showed on every detached HEAD. `--no-optional-locks` keeps the prompt from contending with a running `git commit`. **Every prompt git call passes `-c core.fsmonitor=false`**: the prompt runs git on every `cd`, so a `.git/config` from an untarred archive could set `core.fsmonitor` to a command and have it run without you typing anything — verified, a plain `git status` in such a repo created a marker file and the prompt did not. Values from the repository and the filesystem are sanitised before printing. The directory comes from `prompt_pwd`, which escapes `$HOME` before matching it and since fish 4.7 strips control characters — but only `[[:cntrl:]]`, so its output is passed through `\p{Cc}` as well; the first version interpolated `$HOME` into a regex and printed `$PWD` raw, so a directory named with an OSC sequence reached the terminal. The virtualenv name gets the same filter. Rebase progress is read with `read` (first line only — `string trim < file` yields one element per line, and `string match -q` passes if *any* element matches, so a second line smuggled an OSC sequence past the digit check) and must be digits. The branch name, from `git status` or `rebase-merge/head-name`, has every Unicode control character stripped with `\p{Cc}`, not `[[:cntrl:]]`: the POSIX class is ASCII-only and misses C1 (U+0080–U+009F, where U+009B is a CSI), and git's ref rules forbid only ASCII controls — `git checkout -b` accepted a branch with an embedded U+009B, which now renders as plain text. Not closable from here: a `.gitattributes` clean filter plus its `filter.<name>.clean` in `.git/config` can still run during `git status`, since the name is the attacker's — the same exposure as running `git status` yourself, and shared by pure, Starship and Tide.

Measured per prompt with a warm cache: ~20 ms in this repo, ~50 ms in `k8s-website-kubeadm` (12,369 files), ~9 ms outside a repo; `git status` is 40 ms of the large repo's figure and its untracked scan the largest part. (Before `rev-parse` was added these were ~14 and ~45 ms.) Two earlier readings were wrong and should not be repeated: 102 ms was the first visit with a cold cache, and 25 ms for `git symbolic-ref` was `python3`'s own startup in the timer — time with zsh's `$EPOCHREALTIME`. Alternatives weighed and declined at those numbers: branch-only (saves ~30 ms in the one large repo, loses dirty everywhere); `core.fsmonitor` + `core.untrackedCache` (~65 ms cold, and a daemon per repo — set it per repo in `.git/config` if one ever matters); Tide's async scheme — a disowned background `fish -c` renders into a universal `_tide_prompt_<pid>`, an `--on-variable` handler repaints, the previous job is killed — which hides latency rather than removing it and flashes stale state; Starship, which is synchronous (1.27.0's `starship.fish` calls `starship prompt` directly) and keeps its palette in TOML, splitting it from `theme.fish`.

**Glyphs.** The arrows are `↑`/`↓` with counts, chosen by the owner as the commonest form. pure's `⇡⇣` — also p10k's, Tide's and Tern's — are not in Maple Mono (they rendered from a fallback face), so they were ruled out; `⇑⇓` were used first, being in the font and Neutral width, but read as unfamiliar. `↑↓` are in the font but East Asian **Ambiguous**, one cell only under `LANG=en_US.UTF-8` — the same accepted condition as the tmux and sign-column symbols in `.claude/rules/neovim.md`. Private-use glyphs are written as fish escapes — `\ue0b6`, `\ue0b4`, `\uf07b`, `\ue725`, `\uf04c`, `\U000f0320` — which fish expands both unquoted and inside `printf`'s format. The Write and Edit tools turn a `\uXXXX` in new text into the literal character, so after any edit check the files with a script for code points in U+E000–U+F8FF and re-escape; the characters themselves came through intact each time.

### EZA Colors

`EZA_COLORS` uses the same format as `LS_COLORS`: `key=attrs:key=attrs:...`. Use truecolor ANSI codes (`38;2;R;G;B`), `2;38;2;R;G;B` for dim variants. Written out in full inside `__apply_theme` in `conf.d/theme.fish`, rather than in `conf.d/env.fish` — they have to be re-exported when the light/dark palette switches, which a static variable cannot do. Key names: `di` (dir), `ln` (symlink), `ex` (executable), `or` (broken symlink), `da` (date), `sn`/`sb` (size number/unit), `hd` (header), `ur`/`uw`/`ux` (user perms), `gr`/`gw`/`gx` (group perms, use dim), `ga`/`gm`/`gd`/`gv`/`gt` (git added/modified/deleted/renamed/type).

