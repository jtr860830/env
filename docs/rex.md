---
paths: ["config/ssh/**", "justfile"]
---

# Rex

Rex is the terminal: a server that owns sessions, windows (tabs) and blocks (panes), and an app that shows them. It is a preview, installed by hand into `/Applications` and updating itself, so it is not in the `brewfile`. Its keys are its defaults: there is no `~/.config/rex/init.lua`.

Two of its own setup commands must not be run, because each creates a dot entry in `~`: `rex terminfo setup` writes `~/.terminfo`, and `rex skill setup` writes `~/.agents`. The agent skill is already at `~/.local/share/agents/skills/rex/`.

## The CLI

`just link` makes `~/.local/bin/rex` a link to the `rex` inside the server's bundle, `~/Library/Application Support/com.superlogical.rex/RexServer/Versions/Current/Rex Server.app/Contents/MacOS/rex`. `Current` moves with each update, so the link survives them. Without the link `rex` is not found even inside a Rex terminal, because `conf.d/env.fish` writes `PATH` outright. The line is skipped when Rex is not installed.

## Appearance

Rex keeps its appearance in macOS defaults (`com.superlogical.rex`) and has no file for it, so `just rex` sets it through `rex do`:

| Line | Why |
|---|---|
| dark palette `Rose Pine`, light palette `Rose Pine Dawn` | the colour scheme (the `theme` skill). When Rex does not know the name, the recipe imports the theme file from Ghostty's bundle and sets it again, so a second run imports nothing |
| `appearance.scheme` `auto` | follow the system's light and dark |
| font `Maple Mono NF CN`, size 14 | the font used everywhere here |
| `line_height` 24 | the owner's habit; a percentage, the same as Ghostty's `adjust-cell-height = 24%` |
| `keyboard.option` `sends_alt` | `⌥hjkl` must reach mini.move in nvim; set outright rather than left to Rex's `automatic` |

Everything else in Rex stays at its default.

The recipe needs Rex open with a window and Remote Control switched on (Settings, under Rex Server). Remote Control is off by default and an agent must not switch it on, so the recipe is not part of `just setup`; `manual-setup` lists it. When Rex refuses, the recipe fails with Rex's own message and sets nothing. Rex has no action that deletes a theme.

## Terminfo

Rex sets `TERM=xterm-rex` only when it finds that entry on the machine and a guard in ssh's configuration; otherwise it stays on `xterm-256color`. `rex terminfo status` says which, and why. It exits 0 either way, so read the text.

`just etc` compiles the entry (`rex terminfo show`) into `/usr/local/share/terminfo`:

- That directory is the only one Rex's server searches that is usable here. `~/.terminfo` would be a dot entry in `~`, `/usr/share/terminfo` is on the sealed system volume, and the server does not look in `XDG_DATA_HOME`.
- Apple's ncurses searches `TERMINFO_DIRS` and `/usr/share/terminfo` only, so `conf.d/env.fish` names the directory in `TERMINFO_DIRS` (`docs/env.md`).
- It is compiled with `/usr/bin/tic`, which always writes the older terminfo format that both Apple's and Homebrew's ncurses read. Homebrew's `tic` switches to a newer format, which Apple's tools cannot read, once an entry holds a number above 32767. For today's entry the two write the same file; Apple's is used so a later change to the entry cannot hide it from `top`, `less` and `clear`.

Run `just etc` again when `rex terminfo status` stops saying Ready after an update.

sudo drops `TERMINFO_DIRS`, so a full-screen program under sudo (`top`, `clear`) reports an unknown terminal. Nothing is configured for that: run `sudo TERM=xterm-256color <command>`.

## The ssh guard

`config/ssh/.ssh/config` holds a `Match exec` block that sends `TERM=xterm-256color` to any host not listed in `~/.config/rex/terminfo-hosts`, the file where Rex records the hosts that have the entry. It is written inline rather than through Rex's own `Include` of `~/.config/rex/ssh_config`: Rex rewrites that file, it would live outside the repository, and Rex will not edit `~/.ssh/config` here because it is a link.

## Colour reporting

Rex answers a program's background-colour query only for the session its window is showing. A session made with `rex new` gets no answer until it is shown, and a new split pane can miss the answer at startup. A program that needs to know light from dark must cope with not being told.

## Driving a terminal program

For testing something that draws on the screen, in a session of its own:

```sh
rex new <label> -c <dir> -- <command>
rex send -s <label> '<text>'
rex send-key -s <label> enter
rex capture -s <label> --trim
rex kill <label>
```

`capture --format=html` keeps colours. A session made this way is not on screen, so see "Colour reporting".

## Temporary

| Item | Remove when |
|---|---|
| Rex installed by hand | Rex has a cask: reinstall from it and add it to the `brewfile` |
| The `xterm-rex` line in `just etc` | `xterm-rex` ships in ncurses |
| `/usr/local/share/terminfo` in `TERMINFO_DIRS` | the same |
| Ghostty as the fallback (`docs/ghostty.md`) | Rex has a proper release. `rex_themes` in the `justfile` points into Ghostty's bundle, so give `just rex` another source for the two theme files first |
