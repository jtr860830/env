---
paths: ["config/ghostty/**"]
---

## Ghostty

Ghostty is the fallback terminal while Rex is a preview (`docs/rex.md`). It opens the login shell directly and is otherwise at its defaults, shell integration included. Its config is five lines:

| Line | Why |
|---|---|
| `theme = dark:Rose Pine,light:Rose Pine Dawn` | the colour scheme, from the themes Ghostty bundles, following the system's light and dark (the `theme` skill) |
| `font-family = Maple Mono NF CN`, `font-size = 14` | the font used everywhere here |
| `macos-option-as-alt = true` | `⌥hjkl` must reach mini.move in nvim; without it Option types special characters |
| `adjust-cell-height = 24%` | the owner's habit, the same spacing Rex is given |

There is no theme file here: the two themes are Ghostty's own, and `just rex` imports the same two files into Rex from Ghostty's bundle.

## Temporary

When Rex has a proper release, remove the `config/ghostty` package and its entry in `packages`, the `ghostty` cask, and this document. Before that, give `just rex` another source for the two theme files, and change `launcher.terminal` and `quakeTerminal.provider` in OmniWM's settings, which name Ghostty (`docs/omniwm.md`).
