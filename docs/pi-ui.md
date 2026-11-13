---
paths: ["config/pi/**/themes/**", "config/pi/**/extensions/footer.ts"]
---

## pi UI

Two layers, both from 2026-11-13: the theme files give pi the editor's colours, and `extensions/footer.ts` gives the footer the bars' shape. Considered and not done: a fish-style framed editor through `setEditorComponent` (it overrides the editor's render, the part most likely to break on a pi upgrade, and pi's editor has no vi mode for `❯` to follow), and restyling the transcript, which means overriding each built-in tool's renderer separately.

### Theme

`themes/onedarkpro_onedark.json` and `onedarkpro_onelight.json`; `vars` are onedarkpro's keys and every value is the one nvim reports, read with `nvim -u NONE`, `packadd onedarkpro.nvim` and `dofile` of `theme.lua` under a scratch `XDG_CACHE_HOME`. Selected by `"theme": "onedarkpro_onelight/onedarkpro_onedark"` in the local `settings.json`; pi persists only the fields it modified itself, so the hand edit survived a running session. The light/dark switch was not exercised: a tmux server with no client reports nothing and pi falls back to dark.

pi's default `system` theme was the starting point and is not enough: it takes hues from the terminal's ANSI palette but recomputes lightness, so no value is the palette's; its token-to-hue table is fixed (keywords blue, headings yellow); and its panels are hue-tinted.

| pi token | key | nvim group |
|---|---|---|
| `text`, `muted`, `dim` | `fg`, `comment`, `gray` | `Normal`, `Comment`, `NonText` |
| `accent` | `purple` | `TabLineSel` ("current") |
| `border`, `borderMuted` | `gray` | `WinSeparator`, `FloatBorder` |
| `success`, `error`, `warning` | `green`, `red`, `yellow` | `DiagnosticOk`/`Error`/`Warn` |
| `selectedBg` | `pmenu_sel` | `PmenuSel` |
| `searchMatchBg`, `searchMatchText` | `selection`, `yellow` | `Search` |
| `mdHeading`, `mdListBullet` | `red` | `@markup.heading`, `@markup.list` |
| `mdCode`, `mdCodeBlock` | `green` | `@markup.raw` |
| `mdLink`, `mdQuote` | `blue` | `@markup.link.label`, `@markup.quote` |
| `mdLinkUrl` | `purple` | `@markup.link.url` |
| `syntax*` | keyword `purple`, function `blue`, variable `red`, string `green`, number `orange`, type `yellow`, operator `cyan`, punctuation `fg` | the groups of the same names |
| `bashMode` | `yellow` | `MiniStatuslineModeCommand` |

**Every panel is `float_bg`; only a failed tool block is tinted.** The fish prompt marks a command only when it fails, and that rule is used here because semantics returns nothing for a tool panel. All-neutral was not possible: the built-in tool blocks tell success from failure by background alone. The tint is onedarkpro's own red surface, chosen per half by ΔL\* against `float_bg`: dark `diff_delete` +8.50; light `diff_delete` is −1.86, so light uses `diff_text_delete` at −7.80.

**The seven thinking levels have no nvim concept**, so the reference is pi's own ramp from neutral through blue and violet to red, mapped to the nearest keys in order: `gray`, `comment`, `cyan`, `blue`, `purple`, `orange`, `red`. `high`, the default here, lands on the purple of tmux's idle state and nvim's Normal mode.

Assigned against the obvious reading, with the reason: `customMessageLabel` is `purple`, not `FloatTitle`'s green, because green already means success next to it in the transcript. The scrollbar is `gray` on `fg_gutter`; nvim's `PmenuThumb`/`PmenuSbar` are `#333842`/`#2f333d` and vanish on `bg`.

APCA on the real backdrops, dark / light: `text` 56.2 / 93.2; `muted` 32.3 / 48.7 on `bg` and 33.7 / 42.2 on `float_bg`; `dim` 17.4 / 47.4 on `bg`. The two weakest cells are both dark and the owner accepted both on 2026-11-13: `dim` carries key hints and queued-message lines at 17.4, following the Alfred and fish precedent of `gray` for tertiary text, and tool output is `comment` at 33.7 on its panel. Raising either is one value.

### Footer

One row of pills and, below it, the extension status lines:

```
<folder> ~/.config/env (on <branch> main) (name)     (↑12k ↓3k …) ($1.428) (3.3%/1.0M) (anthropic/claude-fable-5-2 high)
● parallel-1
├ ● runner  openai/gpt-6-luna  1 turn  15s  $ sleep 20
```

It follows the bars' rule: the directory is the subject and stays plain, everything else is a `float_bg` pill. Both rows start one cell in from the left edge (the owner's request, 2026-11-13); the right end stays flush. Pill caps take `theme.colors.toolPendingBg` as a foreground. pi has no token for a directory or a branch, so the directory borrows `mdLink` (blue, `Directory`) and the branch `syntaxOperator` (cyan); under a built-in theme they degrade to blue and muted.

- Narrow widths drop, in order: token counts, full path (abbreviated as `prompt_pwd` does), session name, provider, cost, branch length (to 8), git pill, context, path (cut from the left, to 8), model name. One stage is applied and the line measured; when the result fits with the short path, the full path is tried once more. Verified from 140 to 16 columns.
- The thinking level is text inside the model pill, coloured by its `thinking*` token so it matches the editor border. It was a filled pill at the far right for a few hours; the owner dropped it as the last and loudest element for what is an attribute of the model.
- Context turns `warning` above 70% and `error` above 90%, the built-in footer's thresholds.
- Usage totals and context usage are cached by leaf id and model, as the built-in footer does.
- **The line below the pills is always there**, blank when no extension has a status, so a starting task does not move the layout; the owner asked for it as the place for subagents. Every extension status is shown, a multi-line status one line per row. With pi's built-in footer the same statuses join into one line.
- Not carried over from the built-in footer: `(auto)`, constant on this machine; the routed model of a virtual model, which extensions cannot read; `isUsingSubscription`, replaced by `isUsingOAuth` for the `sub` mark. The git pill is the branch only: dirty and ahead/behind would need the extension's own git calls.
- The factory returns early unless `ctx.mode` is `tui`, because the file also loads in subagent children.

### Testing

- Type check as in `docs/pi-subagents.md`, with `footer.ts` added to `files`. The installed `tsc` rejects `baseUrl` (TS5102); `paths` alone is enough.
- pi in its own tmux server with `--no-session --use-theme <name>`; a transcript is shown by opening a copy of a session file with `--session`.
- To look at colour, not text: `capture-pane -p -e -N`, convert the SGR sequences to HTML spans, and render with `qlmanage -t -s 2000`. Without `-N` tmux trims trailing cells and panels look ragged.
- Extension statuses can be faked with a scratch `-e` extension that calls `ctx.ui.setStatus`.
