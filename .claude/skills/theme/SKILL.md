---
name: theme
description: Palette, colour and appearance work across nvim, tmux, fish, Ghostty and Alfred — the sourcing ladder, which contrast instrument to use, the light/dark switching mechanism, onedarkpro's limits and traps, and Alfred's theme design. Load before changing any colour or adding a themed element.
---

# Theme

Colour decisions in this repo follow a fixed order: semantics first, then the right instrument, then the sourcing ladder. Everything below was measured; do not re-derive it.

## Theme Consistency

### Fixing a Colour

**Semantics comes first and this ladder is subordinate to it.** Which colour an element takes is decided by finding the Neovim highlight group for the same concept, never by eye and never by measurement — most values in this repo are settled there and never reach a number at all (tmux's pill fill is `float_bg` because a pill is a surface floating above the background; fish's `quote` is green because a shell quote *is* a `String`; eza's `sn` is orange because it is a `Number`). Measurement cannot even begin before that, since the assignment is what names both the foreground key and the backdrop it lands on. So the two layers are: **assignment**, answered semantically, and then **whether that key's value survives its own backdrop**, answered by measurement. The ladder below repairs the *value*; a clash between two assignments is fixed in the first layer instead, by moving one of them (eza's `ln` to cyan) — the ladder never enters.

**Then pick the instrument before reading any number**, because the three cases do not share one:

| what is being compared | instrument | threshold |
|---|---|---|
| text against its background | APCA `Lc` | ~45 minimum readable, 75 body text |
| one large fill against another (a selection, a pill) | ΔL\* | 2–3 for a large area |
| two foregrounds sitting side by side | plain RGB distance | — |

WCAG 2.x is reliable only for ranking colours **on a shared background**. It ignores polarity where vision does not — underestimating dark-on-light and overestimating light-on-dark — so it must never be used to compare the dark half against the light one, and it reads two adjacent fills as far closer than they look. Both mistakes were made here before being caught; the measurements are in [Light and Dark](#light-and-dark).

When a colour is defective — measured against its **actual** backdrop, not against nvim's — work down this ladder and stop at the first rung that answers. Every fix in this file came from one of them.

1. **Atom One Dark / One Light — copy the values, one to one.** onedarkpro's `onedark` *is* Atom One Dark, so its keys map exactly onto Atom's hue variables (table below). This is how `onelight`'s nine washed-out hues were replaced.
2. **Zed One — copy the design decision, never the values.** Zed is organised by concept and onedarkpro by hue, so the keys are many-to-many: `palette.yellow` alone drives 27 groups. Assigning Zed's `type` colour there would turn search hits and warnings blue-teal.
3. **Derive from the palette, using the target ratio from step 2.** `PmenuSel` took Zed's ~1.40 and computed `#cbcbcb` from `float_bg`; Zed's own value is `#cacaca`, one unit away. This keeps Zed's judgement without importing its vocabulary.
4. **Invent, and record why.** No *value* in the palette sits here any more. What did reach this rung is a **rule**: the light `bright_*` set had to flip `lighten` to `darken`, because "brighter" means darker on a light background and no reference would say so — Zed's One Light gives four of its six hues an identical `bright`. The values it produces are ordinary rung-3 steps; only the choice of direction was invented.

Two checks that go with it:

- **Compare against the corrected alternative, not the broken one.** The menu selection was first offered as a purple tint at 1.55 against the *shipped* grey at 1.06 — but the real alternative was a corrected grey at 1.41, which won. A comparison against a defect is not a comparison.
- **Count how often a hue already carries meaning before adding another.** Purple measured better for the menu selection but already means "current" in `TabLineSel`, tmux's current window and idle state, and `MiniStatuslineModeNormal`; a fourth use dilutes all four.

One Dark Pro (`onedarkpro_onedark`) across all tools: Neovim (`nvim/lua/theme.lua`), Tmux (inline in `home/tmux.nix`), Fish (inline in `home/fish.nix`), Ghostty (`home/ghostty.nix`).

Every value in all four is an onedarkpro default or a value onedarkpro itself derives — nothing is invented. Ghostty's `palette = 9..15` are exactly `lighten(key, 10)`, the formula its own exporter uses; tmux's `#fce094`/`#07080d` are `CurSearch`'s bg/fg. Note the bright halves disagree on purpose-built formulas: the exporter uses `lighten(x, 10)` while nvim's own `terminal_color_9..14` use `brighten(x, 15)`, so Ghostty and nvim's `:terminal` hold different values for the same slots.

### Light and Dark

`nvim/lua/theme.lua` picks `onelight` or `onedark` from `'background'`, which Neovim maintains itself: it probes DEC mode 2031, enables it when the terminal reports support, and re-queries OSC 11 on each notification and on resume from suspend. Ghostty, and tmux in between, both carry the sequences, and tmux additionally exposes `client-dark-theme`/`client-light-theme` hooks and `#{client_theme}`. Nothing needs to poll the OS, so `auto-dark-mode.nvim` and friends are a generation out of date.

Drive the switch from `OptionSet` (`pattern = "background"`), not `ColorScheme` — the latter fires on *every* colorscheme change, so it fights a manual `:colorscheme`. `nested = true` is required on that handler or the `ColorScheme` it triggers never runs and the statusline highlights silently stay empty. `ColorScheme` then re-applies them, guarded by `args.match ~= variant()` so a foreign colorscheme and mid-switch states are skipped. Startup needs no event — `'background'` is already correct while `init.lua` runs, and `OptionSet` is suppressed for the whole startup phase.

`onelight`'s nine hue keys are overridden with Atom One Light's own values, because the shipped ones are washed out on `#fafafa` — `Type` was 1.96, `Constant` 2.33, `Operator` 2.27, `Normal` 5.18, and `cyan` was simply the dark theme's `#56b6c2` carried over. After the substitution no non-comment group sits below 3:1: `Normal` 10.86, `Keyword` 5.86, `Constant` 4.66, `Operator` 4.00. Washed-out text over a large bright field is what tires the eye, not the field itself — Zed's One Light keeps the same `#fafafa` editor background but pairs it with `#242529` text (14.67) and darker chrome (`#dcdcdd` bars, `#ebebec` panels).

**Those ratios are WCAG 2.x, which cannot compare the two halves against each other.** The formula ignores polarity, and human vision does not: it underestimates dark-text-on-light and overestimates light-text-on-dark, which is the whole reason WCAG 3 is moving to APCA. Every cross-half number in this file therefore flatters the dark theme. Measured with APCA (implementation checked against the canonical `#000/#fff` 106.04, `#fff/#000` -107.88 and `#888/#fff` 63.06):

| on its own `bg` | WCAG | APCA Lc |
|---|---|---|
| dark `comment` | 3.73 | 32.3 |
| light `comment` | 2.55 | **48.7** |
| dark `gray` | 2.32 | 17.4 |
| light `gray` | 2.47 | **47.4** |
| dark `fg` | 6.57 | 56.2 |
| light `fg` | 10.86 | 93.2 |

The ordering inverts for both greys — the light half reads *better*, which matches the eye and not the ratio. The same correction applies to the status bar: light prefix yellow at a WCAG 3.06 against dark's 8.10 looks like a 2.6× deficit but is Lc 60.9 against 67.3, near parity. Nothing here changes a decision already taken, because every one of them compared colours on a *shared* background, where WCAG's ordering holds. What does not survive is the narrative that the light half is the weaker one — a full APCA sweep puts six of the seven sub-45 cells in **dark** (`Comment` 32.3, `NonText` 17.4, `Keyword` 41.9, `Error` 38.9, the window dot 43.3, `comment` on `float_bg` 33.7), against one in light. Those are Atom One Dark's own values, so acting on them would mean overruling Atom, and dark has never been reported as hard to read; the sweep is context, not a worklist.

**Re-measuring does not license reverting the hue substitution.** APCA clears five of the nine shipped `onelight` hues on its own (`fg` 74.0, `red` 60.8, `green` 54.5, `blue` 61.4, `purple` 60.0) and condemns four (`gray` 32.1, `yellow` 36.6, `cyan` 43.5, `orange` 44.4), so a strict reading of the ladder would put five values back at rung 0. Do not: the substitution was adopted as a *set*, and its worth is provenance rather than contrast — `onedark` is Atom One Dark exactly, so `onelight` being Atom One Light exactly is what makes the pair explicable. Reverting five would leave a palette that is neither, and `red` in particular would trade 60.4 for 60.8, changing nothing except the set.

The substitution is safe because **onedarkpro's `onedark` is Atom One Dark exactly**, so its keys map 1:1 onto Atom's hue variables — verified against `atom/one-dark-syntax/styles/colors.less`:

| onedarkpro | Atom | onedarkpro | Atom |
|------------|------|------------|------|
| `red` | `hue-5` | `cyan` | `hue-1` |
| `orange` | `hue-6` | `blue` | `hue-2` |
| `yellow` | `hue-6-2` | `purple` | `hue-3` |
| `green` | `hue-4` | `gray`/`fg` | `mono-3`/`mono-1` |

Note `orange` is `hue-6` and `yellow` is `hue-6-2`, not the reverse — mixing them up sends `#986801` to the wrong key.

**`comment` has no Atom answer — do not go looking for one.** Atom paints comments with `mono-3` in both halves (`.syntax--comment { color: @mono-3 }`), and `mono-3` is exactly what `gray` already holds — `#5c6370` dark, `#a0a1a7` light. onedarkpro instead invents a *fourth* grey for its `comment` key, brighter than `mono-3`, and that departure is its own, applied to both themes. So applying rung 1 here would set `comment` **equal to** `gray`, which is the opposite of the separation the key exists to provide. `mono-2` is not the answer either: it is declared in `colors.less` and then used **zero** times in both `one-dark-syntax` and `one-light-syntax`.

Where the light half does fall short is in executing onedarkpro's own departure: `comment` sits **1.61** from `gray` in dark but only **1.03** in light — the same colour. The one visible consequence is Alfred's result row, which puts `subtext` (comment) next to `shortcut` (gray): in light they are indistinguishable, and selecting a row moves the shortcut from 2.24 to **1.64** rather than rising as it does in dark (2.55 → 2.88). In APCA the direction survives but the ranking does not — light falls 40.9 → 21.6 while dark rises 18.7 → 27.6, so the weakest cell of the four is dark's *unselected* shortcut, not anything in light. Closing it means a rung-3 derivation — a `darken` step off `gray` targeting the dark half's 1.61 — not a value copied from Atom. Declined by eye: the dim comment reads comfortably and lifting it would make comments compete with code. Re-measuring this ramp and finding 1.03 is not a new discovery.

**Zed's One palette cannot be dropped in the same way, even though it is also One-derived.** onedarkpro is organised by hue and Zed by concept, so the keys are many-to-many: `palette.yellow` alone drives 27 groups spanning search (`Search`, `IncSearch`), warnings (`DiagnosticWarn`, `WarningMsg`), types (`Type`, `@lsp.type.class`), preprocessor, builtin identifiers, eight `BlinkCmpKind*` entries and `MiniIconsYellow`. Assigning Zed's `type` colour there would turn search hits and warnings blue-teal and leave a group literally named Yellow not yellow. Adopting Zed's *design* means replacing the assignment table, not the palette. Zed's one portable idea is structural: it keeps `variable` and `punctuation` at plain foreground in both themes and reserves colour for fewer concepts, which is why its light theme reads well — that would be a `highlights` override on `@variable`/`Identifier`, not a `colors` change.

"Rung 0" below is shorthand for *not having entered the ladder* — it is the default state, not a step on it. Every value starts there, so having a rung-0 answer is never a reason to stop: the ladder is entered only once a value has failed a measurement against its actual backdrop, and at that point the shipped value is by definition the thing that failed. `onelight`'s nine hues all had rung-0 values too; they lost because `Type` measured 1.96 and `Operator` 2.27, not because they were missing.

Auditing all 54 palette values against the ladder puts 21 at rung 0 (onedarkpro untouched), 14 at rung 1 (Atom's own hex, all of `onelight`'s hues plus the ANSI black/white/bright-black slots), and the rest derived: dark `bright_*` are `lighten(hue, 10)`, light `bright_*` are `darken(hue, 10)`, and `cursearch_*` are each theme's `CurSearch` bg/fg — every one reproducible. Light ANSI 7 is `#bbbbbb` from Zed (rung 2), which beats the `#c6c7c7` first invented there, 1.84 against 1.62. Light ANSI 15 is `lighten(ansi_white, 10)` = `#d4d4d4` (rung 3), the same formula the dark half uses, replacing an invented `#e0e0e0`: it raises contrast against `bg` from 1.26 to 1.42 and lands at 1.30 from ANSI 7, against the dark half's own 1.33. Nothing in the palette is invented any more.

**ANSI 15 is the one light slot that keeps `lighten` rather than `darken`, and the reason is structural.** The greyscale slots are a single ordered ramp — black, bright-black, white, bright-white — so darkening white walks it into bright-black: `darken("#bbbbbb", 10)` is `#a2a2a2` against bright-black's `#a0a1a7`, a ratio of **1.009**, i.e. the same colour. Each of the six hues has a private `bright_` partner with no neighbour to collide with, which is why `darken` is right for them and wrong here. Zed's `#ffffff` was the rung-2 answer and was declined at 1.04 — invisible on `#fafafa`.

The light `bright_*` set is the one place where inventing beat the reference, and it is worth knowing why before someone "corrects" it back: Zed's One Light gives 4 of 6 hues an identical `bright`, so its terminal cannot distinguish them at all, and its `yellow` (1.88) and `bright_cyan` (2.19) are worse than either of ours. `darken(hue, 10)` separates every pair by +1.03 to +2.80 and raises all six. A reference that declined to answer is not an answer.

`home/palette.nix` is the single source for both halves; `ghostty.nix`, `tmux.nix` and `fish.nix` render from it. Each generated dark output was diffed against the hand-written version it replaced and is unchanged, so only the light halves are new.

**Ghostty must declare both themes before anything downstream works.** It emits the DEC 2031 notification only when its *own* effective theme changes, so with a single theme configured it stays silent — verified by toggling the system appearance twice with no movement in `#{client_theme}`. Once `theme = dark:...,light:...` is set the whole chain follows, including at attach: a tmux server started 27 s earlier already had `client_theme` populated. The unknown state is an empty string, not a guess, so a `source-file` of the dark set stays as the baseline for terminals with no 2031 support.

The tmux bar is drawn as **bubbles on a bar whose background equals the terminal background**, so Ghostty's `window-padding-x` gap at the corners has nothing to contrast against — the problem cannot manifest rather than being patched, which is why `window-padding-color = extend` is not needed. Pills fill with `float_bg`: that is onedarkpro's key for `NormalFloat`/`Pmenu`, i.e. a surface floating above the background, which is what a pill is. `bg_statusline` was the obvious guess but it names the full-width bar we just removed, and `fg_gutter`/`selection` are a separator line and a selection region, not surfaces — `fg_gutter` also has no highlight group using it at all. `float_bg` happens to be the most consistent across modes too, at 1.100 dark / 1.102 light against `bg_statusline`'s 1.085 / 1.063.

**A selected row needs a grey with enough contrast, not an accent.** Zed splits the two cases and it is worth copying: a list or menu selection is a plain surface (`element.selected`, 1.41 dark / 1.38 light) while only *text* selection gets an accent with alpha (`players[0].selection`, blue at 24%). **Measure a selection surface with ΔL\*, not a contrast ratio** — WCAG is a text metric and reads two large adjacent fills as far closer than they look. onedarkpro's shipped `PmenuSel` is 1.22 dark / 1.09 light, which sounds invisible in both, but in ΔL\* the dark one is **6.72** — comfortably past the 2–3 threshold for large areas — while light is **3.15**, sitting on it. Only the light half was actually defective; the dark override exists so the two halves highlight alike (11.42 / 12.76) rather than because dark was broken, and reverting it would leave selection visibly weaker in dark than in light. Both are overridden to `#373e48`/`#cbcbcb`, which are `lighten(float_bg, 10)` and `darken(float_bg, 14)` — the steps landing closest to Zed's ~1.40, at 1.426 and 1.411. Zed's own light value is `#cacaca`, one unit away. **Derive it as a step, not as a free solve.** Targeting the ratio directly gives `#363d47` at 1.404, marginally closer but one unit per channel away from the step — invisible, and it costs the palette its single mechanism, since every other derived value is a `lighten`/`darken` step too. Record the ratio as the rule and the step as the answer: the step alone is a fossil of one solve, and the ratio alone has to be re-solved by hand. `BlinkCmpMenuSelection` is `link = "PmenuSel"` with `default = true`, so the completion menu follows; verified at runtime, since a headless probe never triggers blink's highlight setup and reports the group empty.

A purple tint was tried first and rejected even though it measured better (1.55). Purple already means "current" in three places — `TabLineSel`, tmux's current window and idle state, `MiniStatuslineModeNormal` — and a fourth use dilutes that; a grey also keeps the element inside the surface vocabulary instead of borrowing a hue. The same values are used for Alfred's `backgroundSelected`. Note the first comparison offered was purple against the *shipped* grey at 1.06, which is not the real alternative — a fair comparison needs the corrected grey.

`Visual` is left alone: at 1.53 dark it already matches Zed's 1.57, and light is 1.16 against Zed's 1.32 — a gap worth closing only if it turns out to bother in use.

Both bars follow one rule: **a pill marks a status indicator you glance at; the subject stays plain.** In nvim that makes the mode, the diagnostic counts and the filetype pills while the filename — what the window is *about* rather than a datum — is plain text on the editor background. It also explains why tmux is pills throughout: its bar has no subject, only indicators. Anything added later is decided by the same test, so git branch, diff counts or line:col would all be pills.

nvim's statusline background is `bg`, not `bg_statusline`, so the three rows — buffer, nvim statusline, tmux bar — share one backdrop with only pills floating on it. Keeping nvim's row a solid `#22262d` strip while tmux's went transparent would have put a solid bar directly above a transparent one, which is where an inconsistency shows most.

The state pill and nvim's mode pill both fill with the **base** hue and put `bg` in the foreground, so they are literally the same colour; `accent_*` was removed once the state stopped being text on a near-white strip. The cost is shared rather than divergent: light-mode yellow as a fill is 3.06 in both tools, so if that ever needs fixing it is a palette change, not a per-tool patch.

The window list is **one** pill rather than one per window, capped by testing `#{==:#{window_index},1}` and `#{==:#{window_index},#{session_windows}}`. That only holds because `renumber-windows on` keeps indices contiguous from `baseIndex`; verified that killing a middle window moves the closing cap correctly.

Every pill carries one space of padding inside its caps, and one space separates adjacent pills. Both bars had the same omission at first — tmux's `status-left` and nvim's mode pill were the two that had none, so their text sat flush against the caps while the others did not. tmux's `status-right` needs no change for zoom: the leading space in `#{?window_zoomed_flag, ■,}` takes over as the left padding when zoomed, giving exactly one space either way.

tmux keeps every colour-bearing setting in generated `dark.conf`/`light.conf` sourced by the `client-dark-theme`/`client-light-theme` hooks; the hooks fire on *change* only. **This is the right mechanism for 3.7b and will be superseded by 3.8**, whose CHANGES adds a `theme` option (`terminal`/`light`/`dark`), `theme*` colour names such as `themeblack`, and format expansion inside style values — the two files and both hooks would collapse into inline `#{?#{==:#{client_theme},light},…,…}` conditionals. Verified absent on 3.7b: `theme` is an "invalid option" and `fg=themeblack` an "invalid style". `status-right` uses `accent_*` rather than the base hues because it is a state indicator on a near-white strip where mid-tones stop separating — prefix yellow falls to 2.88 and copy-mode cyan to 3.76 on the light bar, against 8.79 and 6.41 on the dark one, and the darkened accents restore 4.90 and 6.23.

fish wraps the whole palette in `function __apply_theme --on-variable fish_terminal_color_theme`, called once at the end. `EZA_COLORS` moved out of `home.sessionVariables` into that function — an environment variable cannot follow the appearance, and eza is only ever used interactively. Two traps:

- **fish colour values must not carry a leading `#`** — it starts a comment, so `set -g fish_color_normal #383a42` silently sets nothing. `lib.removePrefix "#"` strips it; `EZA_COLORS` keeps the hex because it converts to `38;2;R;G;B`.
- **`fish_terminal_color_theme` is read-only**, so the switch cannot be exercised by assigning it (`set: Tried to change the read-only variable`). Only fish sets it, from its own terminal query, and only in a *real* interactive session — `fish -i -c` never paints a prompt so the variable stays empty there. Test by opening a shell in a tmux window and toggling the system appearance.

`LS_COLORS` is exported alongside `EZA_COLORS`, not instead of it. eza reads both and `EZA_COLORS` wins, but `LS_COLORS` only has ten codes — `di ex fi pi so bd cd ln or` — so it can express 4 of the 24 keys in use and none of the dates, sizes, permission bits or git columns. It is set for **`fd`**, which honours it and otherwise uses built-in colours that ignore the theme (verified: directories move from `#61afef` to `#4078f2` with the switch). `rg` does not read it; it has its own `--colors`.

fish's own first-class alternative was considered and rejected. A `.theme` file under `~/.config/fish/themes/` takes `[light]` and `[dark]` sections, and `fish_config theme choose` follows the terminal from them (unlike `theme save`). But a theme file can only set `fish_color_*` and `fish_pager_color_*` — checked against the shipped `tomorrow`, `solarized` and `ayu` themes, none of which set anything else — so the nine `pure_color_*` values plus `EZA_COLORS` and `LS_COLORS` would still need the handler. Adopting it adds a file and a `fish_config theme choose` call without removing anything, and splits one palette across two mechanisms.

`hexToRgb` uses `lib.fromHexString`, which also accepts uppercase, so no case folding is needed.

Seven fish assignments were also corrected against nvim's own semantics, having been inherited from onedarkpro's exporter (which took them from tokyonight): `quote` → green (`String`), `operator`/`escape`/`redirection` → cyan (`Operator`, `@string.escape`), `comment` → the `comment` key rather than `gray`, `autosuggestion` → `gray` (`NonText`), `end` → `fg` (`@punctuation.delimiter`), `cwd` → blue (`Directory`, and `pure_color_primary` was already blue). `command` stays cyan although `Function` is blue, because `param` is blue and the two would collide. eza's `sn` moved from yellow to orange to match `Number`. eza's `ln` stays cyan for the same collision reason: nvim gives `Directory`, `Special` and `@string.special.path` all the same blue, so a symlink pointing at a directory would be indistinguishable from a directory.

### onedarkpro Colors

**`opt.cursorline = true` alone highlights nothing — onedarkpro gates it behind its own option.** `highlights/editor.lua` reads `CursorLine = { bg = config.options.cursorline and theme.generated.cursorline or theme.palette.bg }`, and `options.cursorline` defaults to **false**, so the group is painted the editor background and vanishes while the Vim option reports `true`. `QuickFixLine` is gated on the same flag. Fixed with `options = { cursorline = true }` in `setup()`. The tell is that `CursorLineNr` *does* colour (purple), so the line number highlights while the line does not — which reads as a half-broken option rather than a theme switch. onedarkpro's own `cursorline` value is deliberately quiet, at ΔL\* 2.40 dark / 2.08 light against `bg` — the low end of the 2–3 threshold for a large area, against `PmenuSel`'s 11.42 / 12.76, because a cursor line marks position without competing with the code.

**Do not lower `bg` through `colors`.** The 23 generated keys are computed by the theme file from its own `default_colors`, so an override never reaches them — in `onelight` all nine surfaces are `darken(bg, N)` (`cursorline` 2.5, `bg_statusline` 2.6, `fold` 3, `color_column` 3.2, `float_bg` 4.5, `selection` 6.5, `indentline` 7.3, `fg_gutter` 9.7, `line_number` 18) and stay pinned to `#fafafa`, so a darker `bg` leaves the cursorline, statusline and fold *brighter* than the editor. Lowering the background means writing a custom theme file, which owns `generate()`. Beware that `get_colors()` reports the overridden value either way, so a failed override looks like a successful one — verify with `nvim_get_hl(0, {name = ..., link = false})`.

**A throwaway `nvim -u NONE` that calls `onedarkpro.setup()` corrupts the real config's theme, and the corruption outlives the probe.** `setup()` is:

```lua
if not config.caching or config.debug then return M.cache() end   -- rewrites every compiled theme, then returns
validate_cache()                                                   -- only this writes the hash file
```

So `caching = false` does not mean "skip the cache" — it means "regenerate every theme from *this* config and leave the hash alone". The probe overwrites `~/.cache/nvim/onedarkpro/*_compiled` with its own bare palette while the hash still matches the real config, so the next real Neovim sees a valid hash and loads the poisoned file. Symptom is the light theme reverting to onedarkpro's washed-out shipped hues (`Normal` `#6a6a6a`, `Keyword` `#9a77cf`) with no config change to explain it — and it survives restarts, which makes it read as a broken override rather than a dirty cache.

Point probes at their own cache instead; the real one is then untouched and needs no cleanup:

```sh
XDG_CACHE_HOME=<scratch> nvim --headless -u NONE -c '…' -c qa
```

`rm -rf ~/.cache/nvim/onedarkpro` repairs an already-poisoned cache — `M.load` regenerates any compiled file that is missing.

Access palette via `require("onedarkpro.helpers").get_colors()`. Key colors:

- `c.bg_statusline` (`#22262d`) — statusline/tmux bar background
- `c.selection` (`#414858`) — selection/highlight background
- `c.fg_gutter` (`#3d4350`) — dim separators
- `c.gray` (`#5c6370`) — structural lines (`WinSeparator`, tmux pane borders)
- `c.comment` (`#7f848e`) — secondary text
- `c.indentline` (`#3b4048`) — static indent guide lines

Tmux has no Lua access, so its colors are hardcoded. Pick each one by finding the Neovim highlight for the same concept rather than by eye:

| tmux | Neovim |
|------|--------|
| `mode-style` | `Visual` |
| `copy-mode-match-style` / `-current-match-style` | `Search` / `CurSearch` |
| `pane-border-style` | `WinSeparator` |
| `message-style` | `MsgArea` |
| current window | `TabLineSel` |
| status-right idle / prefix / copy-mode | `MiniStatuslineMode` Normal / Command / Other |

**Copying the exact hex is not always right — copy the intent.** nvim popups sit on `#282c34` and rely on `FloatBorder` to delineate; a tmux message has no border and sits on the darker status bar, so the same `float_bg` would vanish. Verify a choice by contrast ratio against its actual backdrop, not against nvim's.

**One hue legitimately carries several meanings.** onedarkpro itself puts purple on `Keyword`, `Statement`, `Conditional`, `@punctuation.bracket` *and* `TabLineSel`, all visible at once. Position and context disambiguate — "this color is already used" is not an argument against reusing it.

### onedarkpro Plugin Integrations

Enable in `setup()` to let theme manage highlight groups:

```lua
plugins = { blink_cmp = true, mini_diff = true, mini_icons = true, snacks = true, nvim_lsp = true, treesitter = true }
```

## Alfred Theme Design

Alfred does scan `themes/*/theme.json` regardless of the directory name, so a theme could be installed with `home.file` — but the *selection* lives in `preferences/local/<machine-hash>/appearance/prefs.plist`, and that hash differs per machine, so picking the theme stays manual either way. Setting `visualEffectMode` hands the material to macOS and Alfred zeroes `blur` in response; its own Modern themes ship the same pairing. `2` is dark vibrancy — the Preferences binary names the control `blurVisualEffectDarkButton`.

**The two themes are one layout with two palettes: of their 43 keys, only `name` and `visualEffectMode` differ apart from the colours.** Fonts (`Maple Mono NF CN`, matching Ghostty), sizes, roundness, padding and thicknesses are identical, so any layout edit has to be mirrored or the halves drift. **Alfred changes the foreground on selection and Neovim does not — that divergence is deliberate.** `Pmenu`→`PmenuSel`, `PmenuExtra`→`PmenuExtraSel` and `Visual` all differ in `bg` alone, with the foreground inherited, so thirteen of Alfred's fifteen assignments copy a group directly (`window.color`→`NormalFloat`, `borderColor`→`FloatBorder`, `scrollbar`→`fg_gutter`, text→`Normal`, subtext→`Comment`, shortcut→`NonText`, both selected fills→`PmenuSel`). The two `colorSelected` keys do not: `subtext` goes `comment`→`fg` at 78% and `shortcut` goes `gray`→`fg`. Following nvim's model instead costs every one of the four cells — light subtext 54.1 → 21.6 Lc, light shortcut 66.1 → 20.3 — because nvim has no case to copy: its `Pmenu` foreground is `Normal`, a strong colour, so a row holds no dim secondary text to lose, whereas Alfred's row is three tiers deep and the lower two are already faint before the fill darkens under them.

**Semantics returns nothing for a selected row's secondary text, so the reference is Alfred's own convention.** All nine of its bundled `.alfredappearance` themes raise the foreground on selection, and the idiom is one colour at rising alpha — `#FFFFFF7E`→`#FFFFFFCB` for `subtext` and `#FFFFFF7E`→`#FFFFFFFF` for `shortcut`. Our `C8` alpha came from there rather than from any derivation. `shortcut` originally stopped at `comment`, following the convention only halfway and leaving the weakest cell in the whole system at Lc 21.6 light; taking it to `fg` as Alfred does lifts it to 66.1. `fg` at 78% is not a middle option — it would equal `subtext` exactly and erase the distinction. On selection the shortcut therefore matches the title, which is what every Alfred theme does; the tiering survives in the unselected state and in the 18 pt / 16 pt size gap.

Verifying a rendered colour needs a pixel, not the file: `screencapture -x`, crop with `sips -c H W --cropOffset Y X`, and decode with a hand-rolled zlib/struct PNG reader, since this machine has no PIL. Expect ±1 per channel from font antialiasing. Note the selected row shows `↵` rather than `⌘N` — the `⌘` numbers appear only on *unselected* rows, so a change to `shortcut.colorSelected` lands on a single small glyph and is easy to miss.

The size ladder deliberately does *not* track the colour ladder — unselected, `shortcut` carries the weakest colour (`gray`) at 16pt while `subtext` carries `comment` at 12pt — because they play different roles: `subtext` sits under the title in the same column as part of the result's identity, whereas `shortcut` is a separate right-hand column you aim at rather than read.

**Alfred keeps a separate theme per system appearance, and the Appearance panel shows only the current one.** That plist holds `lightthemeuid` *and* `darkthemeuid`; the panel offers no second slot because it edits whichever key matches the appearance you are in, so a theme picked in Light mode leaves `darkthemeuid` unset and Alfred falls back to a built-in dark theme after sunset. Entering dark mode does not write the key — Alfred only stores it when a theme is chosen while dark. Set both by hand:

```sh
P=~/Library/Application\ Support/Alfred/Alfred.alfredpreferences/preferences/local/*/appearance/prefs.plist
osascript -e 'tell application "Alfred 5" to quit'   # it holds prefs in memory and would clobber the write
plutil -replace darkthemeuid -string "$(plutil -extract lightthemeuid raw -o - $P)" $P
```

`appearance.options.nativedarkmode` is **not** the switch for this — its label is "Use native macOS Dark Mode window rendering", a window-material option.
