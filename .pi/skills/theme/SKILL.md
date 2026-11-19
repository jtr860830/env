---
name: theme
description: Where each tool gets Rosé Pine and the rule against overriding it — nvim, the terminal (Rex, Ghostty), fish, pi, Alfred, OmniWM. Load before changing any colour or adding a themed element.
---

# Theme

The colour scheme is Rosé Pine everywhere: Main when the system is dark, Dawn when it is light. Every tool takes it from an upstream port or from the terminal, so the repository holds theme names, not colours.

## Where colours come from

| Tool | Source | In the repository |
|---|---|---|
| Terminal (Rex, Ghostty) | Ghostty's bundled `Rose Pine` and `Rose Pine Dawn` | the two names: in `just rex` and in Ghostty's `config` |
| nvim | `rose-pine/neovim` | one `colorscheme` line in `init.lua` |
| fish | `rose-pine/fish`, theme `Rosé Pine Auto` | the name, in `functions/__apply_theme.fish` |
| fish prompt | pure, coloured by `rose-pine/fish` | nothing |
| pi | pi's built-in `system` theme, derived from the terminal | nothing; no `theme` key in pi's local settings |
| `ls`, `eza`, other programs | the terminal's sixteen colours | nothing |
| Alfred | `rose-pine/alfred`, imported by hand | a step in `manual-setup` |
| OmniWM | two hand-copied values | `borders.color` and `borders.darkColor` in `settings.toml` |

## The rule

- **No palette here.** No file lists Rosé Pine's colours, and nothing generates one tool's colours from another's.
- **No override on top of an upstream theme.** No highlight group, theme key or colour variable is set to adjust what a port ships.
- **No hex colour under `config/`.** The one exception is OmniWM's Overview border, Rosé Pine's iris (`#907aa9` Dawn, `#c4a7e7` Main), stored as fractions; OmniWM has no port (`docs/omniwm.md`).
- **A weak cell is accepted, not fixed.** When a colour reads poorly, the answer is to live with it or report it upstream. Accepted so far:
  - keywords in nvim and the terminal's "green" are pine, `#31748f`, low in contrast on Main;
  - dropbar has no groups of its own in `rose-pine/neovim` and takes the defaults it links to;
  - Dawn's terminal text, `#575279`, is slightly lighter than nvim's;
  - pi's `system` theme computes its own lightness, so its colours are near Rosé Pine rather than equal to it.

A new themed element follows the same order: use the tool's official Rosé Pine port if there is one and it follows the system's light and dark, otherwise let it take the terminal's colours, and only then ask the owner whether a hand-copied value is worth it.

## Light and dark

Each tool follows the system on its own; nothing here switches them.

| Tool | How it follows |
|---|---|
| Rex | `appearance.scheme` is `auto`, with a palette for each side (`docs/rex.md`) |
| Ghostty | `theme = dark:…,light:…` |
| nvim | sets `background` from what the terminal reports, and the scheme follows `background` |
| fish | `__apply_theme` runs when `fish_terminal_color_theme` changes (`docs/fish.md`) |
| pi | `system` asks the terminal again when it switches (`docs/pi-ui.md`) |
| Alfred | one theme chosen for each appearance |
| OmniWM | `color` is used in light, `darkColor` in dark |

The terminal is the source for nvim, fish and pi, and Rex answers a colour query only for the session its window is showing. A program in a session that is not on screen is told nothing and falls back to dark until it is shown.

## Alfred

Alfred keeps a separate theme for light and for dark appearance. Choosing a theme sets it only for the appearance the system is in at that moment, so each has to be chosen once, with the system switched in between.
