---
paths: ["home/fish.nix"]
---

## Fish PATH

`interactiveShellInit` sets the whole `PATH` with `set -gx PATH` rather than prepending with `fish_add_path`, **deliberately**: macOS's `path_helper` reads `/etc/paths` and `/etc/paths.d/*` and *prepends* the system entries, which would push `/usr/bin` ahead of the nix profiles and undo the shadowing below. Writing the list outright is what keeps it out of the way — do not "simplify" this to an append-style call.

The cost is that the list must be maintained by hand, and it is easy to drop an entry. It mirrors nix-darwin's own `environment.systemPath`, so check against that when editing:

```sh
nix eval --json '.#darwinConfigurations.pro-darwin.config.environment.systemPath'
```

`/run/current-system/sw/bin` went missing once, which hid `darwin-rebuild` (it lives there, not in the per-user profile). The symptom is indirect: `darwin-rebuild` reads as "not installed", so the natural workaround is nix-darwin's README bootstrap line, `sudo nix run nix-darwin/master#darwin-rebuild -- switch …` — and *that* is what emits `$HOME … is not owned by you` and `Nix search path entry … does not exist`. Both warnings are downstream of the missing PATH entry, not of any nix setting: the installed `darwin-rebuild` sets `HOME=~root` itself and never trips either, while `nix run` starts nix as root before any of that logic runs. The bootstrap line also resolves `nix-darwin/master` live, ignoring `flake.lock`'s pin.

Three nix directories belong in `PATH`, in this order — user, system, then nix itself:

| Path | Declared by | Rough size here |
|------|-------------|-----------------|
| `/etc/profiles/per-user/$USER/bin` | `home.packages` | ~390 |
| `/run/current-system/sw/bin` | `environment.systemPackages` | ~33 |
| `/nix/var/nix/profiles/default/bin` | nix itself (`nix`, `nix-store`, …) | ~13 |

`$HOME/.nix-profile/bin` is in nix-darwin's list but omitted here — nothing is installed imperatively.

**The trailing six entries are grouped by type — every `bin`, then every `sbin` — and that choice does not matter.** Across `/usr/local/bin`, `/usr/bin`, `/bin`, `/usr/local/sbin`, `/usr/sbin` and `/sbin` there are 1,264 distinct names and **zero collisions**, so no ordering of those six changes which binary wins. Re-check before reopening the question:

```sh
python3 -c "
import os,collections
d=collections.defaultdict(list)
for p in '/usr/local/bin /usr/bin /bin /usr/local/sbin /usr/sbin /sbin'.split():
    for f in (os.listdir(p) if os.path.isdir(p) else []): d[f].append(p)
print({k:v for k,v in d.items() if len(v)>1} or 'no collisions')"
```

Type-first also matches both references that were actually checked: macOS's `/etc/paths`, and Fedora's `setup` package, whose non-root branch appends `/usr/local/sbin` then `/usr/sbin` after the bin entries (`pathmunge … after`) — only its root branch is locality-first, because admin tools should win there. Debian keeps its defaults in `/etc/login.defs` (`ENV_PATH` / `ENV_SUPATH`) and the wiki does not publish the strings, so it was left unverified rather than cited. The locality-first argument — that `/usr/local` exists precisely to override, so it should come first as a block — is sound in the abstract; it just has no effect here and no verified distro backing it for normal users.

Ordering *does* matter in the leading entries, where the nix profiles shadow `/usr/bin` — see `## Shadowing macOS System Binaries` in `CLAUDE.md`.


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

`EZA_COLORS` uses the same format as `LS_COLORS`: `key=attrs:key=attrs:...`. Use truecolor ANSI codes (`38;2;R;G;B`), `2;38;2;R;G;B` for dim variants. Built with `builtins.concatStringsSep ":" [...]` for readability, and exported from fish's theme function in `home/fish.nix` rather than from `home.sessionVariables` — they have to be re-exported when the light/dark palette switches, which a static session variable cannot do. Key names: `di` (dir), `ln` (symlink), `ex` (executable), `or` (broken symlink), `da` (date), `sn`/`sb` (size number/unit), `hd` (header), `ur`/`uw`/`ux` (user perms), `gr`/`gw`/`gx` (group perms, use dim), `ga`/`gm`/`gd`/`gv`/`gt` (git added/modified/deleted/renamed/type).

