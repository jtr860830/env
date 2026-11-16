---
paths: ["config/pi/**/themes/**", "config/pi/**/extensions/footer.ts", "config/pi/**/extensions/editor.ts"]
---

## pi UI

Three layers: the theme files give pi the editor's colours and `extensions/footer.ts` gives the footer the bars' shape, both from 2026-11-13, and `extensions/editor.ts` puts `❯` in front of the input (2026-11-16). Considered and not done: a fish-style framed editor through `setEditorComponent` (it overrides the editor's render, the part most likely to break on a pi upgrade, and pi's editor has no vi mode for `❯` to follow; the arrow alone was done later without a render of its own, see Editor), and restyling the transcript, which means overriding each built-in tool's renderer separately.

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
- The thinking level is text inside the model pill, coloured by its `thinking*` token so it matches the editor border. Since 2026-11-16 the colour comes from `theme.getThinkingBorderColor(level)`, the function pi's editor border calls, in place of a level-to-token table in the extension; `high` measured as `38;2;198;120;221`, `purple`. It was a filled pill at the far right for a few hours; the owner dropped it as the last and loudest element for what is an attribute of the model.
- Context turns `warning` above 70% and `error` above 90%, the built-in footer's thresholds.
- Usage totals and context usage are cached by leaf id and model, as the built-in footer does.
- **The line below the pills is always there**, blank when no extension has a status, so a starting task does not move the layout; the owner asked for it as the place for subagents. Every extension status is shown, a multi-line status one line per row. With pi's built-in footer the same statuses join into one line.
- Not carried over from the built-in footer: `(auto)`, constant on this machine; the routed model of a virtual model, which extensions cannot read; `isUsingSubscription`, replaced by `isUsingOAuth` for the `sub` mark. The git pill is the branch only: dirty and ahead/behind would need the extension's own git calls.
- The factory returns early unless `ctx.mode` is `tui`, because the file also loads in subagent children.

### Editor (2026-11-16)

`extensions/editor.ts` draws `❯` in front of the editor's first line, in the last two cells of `editorPaddingX` (`3` in the local `settings.json`, the setting's maximum): the arrow is in the second column, under the footer's folder icon, and the text starts in the fourth, under the footer's path. The owner asked for a shell-like prompt mark and chose the colour.

```
──────────────────────────────
 ❯ first line
   second line
──────────────────────────────
 <folder> ~/.config/env (on <branch> main)
```

The first form, earlier the same day, had the padding at `2`, the arrow at the left edge and the text in the third column, where it had always been. It was moved one cell in because everything else on the screen starts there (the footer, its status lines, the transcript's text) and the live `❯` of the fish prompt is indented under its frame as well; the arrow was the only character touching the edge. The cost is one cell of text on each side, since the padding is symmetric. The code did not change: the arrow goes in the last two cells of whatever padding there is.

- It is a `CustomEditor` subclass set with `ctx.ui.setEditorComponent`, and it has no render of its own: it takes `super.render()` and replaces the padding of line 1, the way the upstream `modal-editor.ts` example adds its mode label. That is the difference from the framed editor declined on 2026-11-13. What it relies on is that line 0 is the top border and a content line starts with the padding; when line 1 does not start with the padding, or the padding is under two cells, nothing is drawn and input is unaffected.
- The colour is the editor's `borderColor`. pi sets that to the thinking level's colour and to `bashMode` while the text starts with `!`, so the arrow follows both; `capture-pane -e` shows no SGR sequence between the border and the arrow in either state. fish's `❯` follows the vi mode, which pi does not have.
- Continuation lines stay blank. `render()`'s output does not tell a line break from a soft wrap, marking both would mislead, and telling them apart needs the editor's private layout. When the first line is scrolled out of view the arrow is not drawn and the border's `↑ N more` says so; `renderTopBorder` is overridden only to read its `hiddenLineCount`.
- The constructor passes `embedWorkingStatus: true`, as pi does for its own editor (`interactive-mode.js`); without it a custom editor gets the working indicator on a row of its own instead of in the border. pi copies the border colour and the padding onto a custom editor itself (`setCustomEditorComponent`).
- A file of its own, not part of `footer.ts`: pi loads extensions one file at a time and replacing the editor is the half more likely to break on an upgrade, so a failure costs the arrow and not the footer; the two share no code. Merging both into a `ui.ts` was the alternative. It is `editor.ts` because pi's word for the input is editor (`setEditorComponent`, `editorPaddingX`), and prompt there means what is sent to the model.
- Only one extension can own the editor. Nothing else in `~/.config/pi/extensions` calls `setEditorComponent`.
- The factory returns early unless `ctx.mode` is `tui`, as the footer's does.
- Verified in a scratch tmux server with `--no-session`, no model call. With the padding at `2`: empty, one line, a `!` command, a 30-column window where the text wraps, and 16 lines, where the arrow goes when the first line scrolls out and returns with the cursor. With it at `3`: empty, three lines, a `!` command, a line that wraps, and the `/` completion menu. The working indicator during a run stays in the border, seen by the owner in a real session the same day.

### Testing

- Type check as in `docs/pi-subagents.md`, with `footer.ts` and `editor.ts` added to `files`. The installed `tsc` rejects `baseUrl` (TS5102); `paths` alone is enough.
- pi in its own tmux server with `--no-session --use-theme <name>`; a transcript is shown by opening a copy of a session file with `--session`.
- To look at colour, not text: `capture-pane -p -e -N`, convert the SGR sequences to HTML spans, and render with `qlmanage -t -s 2000`. Without `-N` tmux trims trailing cells and panels look ragged.
- Extension statuses can be faked with a scratch `-e` extension that calls `ctx.ui.setStatus`.
