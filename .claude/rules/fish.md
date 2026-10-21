---
paths: ["stow/fish/**"]
---

## Fish PATH

`conf.d/env.fish` sets the whole `PATH` with `set -gx PATH` rather than prepending with `fish_add_path`, **deliberately**: macOS's `path_helper` reads `/etc/paths` and `/etc/paths.d/*` and *prepends* the system entries, which would push `/usr/bin` ahead of Homebrew. Writing the list outright keeps it out of the way — do not "simplify" this to an append-style call.

It lives in `conf.d/` rather than `config.fish` because conf.d is sourced first, and `config.fish` opens with `exec tmux` — a GUI-launched shell inherits only launchd's `/usr/bin:/bin:/usr/sbin:/sbin`, so `tmux` would not be found if `PATH` were set after it. nix-darwin used to hide this by setting `PATH` in `/etc/fish`.

| Path | Holds |
|------|-------|
| `~/.local/bin`, `~/.local/share/go/bin`, `~/.local/share/cargo/bin` | user-installed binaries, ahead of everything |
| `/opt/homebrew/bin`, `/opt/homebrew/sbin` | the brewfile |
| `/usr/local/bin`, `/usr/local/sbin`, `/usr/bin`, `/usr/sbin`, `/bin`, `/sbin` | the system, locality-first |

**Pending a decision:** gnubin directories (`make`, `gnu-sed`, `inetutils`) and keg-only `bin` directories (`curl`, `openjdk`, `llvm`, `rustup`) are not in `PATH`. Until they are, `sed`/`make`/`ping`/`curl`/`clangd` resolve to Apple's versions, `java` is Apple's stub, and `rustup`/`rustc`/`cargo` are absent.

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

`/nix/var/nix/profiles/default/bin` still appears first while nix is installed: the Determinate installer wrote `/opt/homebrew/etc/fish/conf.d/nix.fish`, which sorts after `env.fish` and prepends it. It is listed in `/nix/receipt.json`, so the uninstaller removes it.

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

`EZA_COLORS` uses the same format as `LS_COLORS`: `key=attrs:key=attrs:...`. Use truecolor ANSI codes (`38;2;R;G;B`), `2;38;2;R;G;B` for dim variants. Written out in full inside `__apply_theme` in `config.fish`, rather than in `conf.d/env.fish` — they have to be re-exported when the light/dark palette switches, which a static variable cannot do. Key names: `di` (dir), `ln` (symlink), `ex` (executable), `or` (broken symlink), `da` (date), `sn`/`sb` (size number/unit), `hd` (header), `ur`/`uw`/`ux` (user perms), `gr`/`gw`/`gx` (group perms, use dim), `ga`/`gm`/`gd`/`gv`/`gt` (git added/modified/deleted/renamed/type).

