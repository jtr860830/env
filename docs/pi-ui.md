---
paths: ["config/pi/**/extensions/footer.ts", "config/pi/**/extensions/editor.ts"]
---

## pi UI

pi's appearance is its own, with two small extensions: `extensions/editor.ts` adds an arrow to the input and puts session information in the input's bottom rule, and `extensions/footer.ts` draws the extension status lines below it.

```
── ⠴ Working ─────────────────────────────────────────────────────────────────────
❯ first line
  second line
───── ↑9.0k ↓2.1k R206k W4.5k CH93.8%  $0.320  4.8%/1.0M  anthropic/claude-fable-5-2 high ──
 ● parallel-1
 ├ ● runner  openai/gpt-6-luna  1 turn  15s  $ go test ./...
```

### Colours

pi's built-in `system` theme, which is what pi uses when the local `settings.json` has no `theme` key. There is no theme file here and the key must stay unset (`manual-setup`). `system` asks the terminal for its foreground, background and sixteen colours, takes hues from them and computes lightness itself, and asks again when the terminal switches between light and dark. Its colours are therefore near Rosé Pine rather than equal to it; that is accepted (the `theme` skill).

Neither extension holds a colour. Both draw with theme tokens (`muted`, `warning`, `error`) and the editor's own `borderColor`.

### Editor

`extensions/editor.ts` is a `CustomEditor` subclass set with `ctx.ui.setEditorComponent`, constructed with `embedWorkingStatus: true` as pi does for its own editor, so the working indicator stays in the top rule.

- **The arrow.** `❯` in front of the first line of the input, `$` while the text starts with `!`. It sits in the editor's padding, which the class fixes at 2 by overriding `setPaddingX`, since pi pushes its own padding setting at creation and on every `/reload`. Continuation lines stay blank, and the arrow is not drawn while lines are scrolled off above; the top rule's `↑ N more` says so.
- **The information rule.** Plain `muted` text at the right end of the bottom rule, opposite `Working` in the top one: token counts (`↑` input, `↓` output, `R` cache read, `W` cache write, `CH` the latest cache hit rate), cost (with ` sub` when the model is used through a subscription), context use against the window, and `provider/model level`. Context turns `warning` above 70% and `error` above 90%.
- **Narrow widths** drop, in order: token counts, provider, cost, context. When even the model does not fit, the rule is pi's plain one. `↓ N more` keeps its place at the left of the rule.
- **Rules and arrow take pi's own `borderColor`**, which follows the thinking level and changes in bash mode. Nothing overrides it.
- **A selector or dialog replaces the editor**, so the arrow and the information rule are gone while `/model` or a confirmation is open, and return when it closes.
- **It overrides four methods of pi's editor**: `setPaddingX`, `render`, and the protected hooks `renderTopBorder` and `renderBottomBorder`. A rename upstream breaks it, and the type check below catches that through `noImplicitOverride`. Gathering the information is wrapped in `try`, and a failure draws pi's plain rule.
- The factory returns early unless `ctx.mode` is `tui`, because the file also loads in subagent children.
- Only one extension can own the editor; nothing else in `~/.config/pi/extensions` calls `setEditorComponent`.

**The cursor is the terminal's**, a steady bar. `PI_HARDWARE_CURSOR=1` in `conf.d/env.fish` makes pi show the terminal's cursor instead of drawing a cell of its own; pi sets no shape, so the shape is what fish left through `fish_cursor_external` (`docs/fish.md`). The local `settings.json` must not set `showHardwareCursor`, which would win over the variable.

### Footer

`extensions/footer.ts` draws the extension status lines below the editor and nothing else.

- **There is always one line**, blank when no extension has a status, so a starting task does not move the layout. Every extension status is shown, a multi-line status one line per row; pi's built-in footer joins them into one line, which is why this exists. It is where the subagent extension reports (`docs/pi-subagents.md`).
- Lines start one cell in from the left edge and are cut to the width.
- The factory returns early unless `ctx.mode` is `tui`, as the editor's does.

Two files rather than one: pi loads extensions a file at a time, and a failure in the editor leaves the status lines standing.

### Testing

- **Type check**: `tsc -p` on a tsconfig kept outside the repo, as in `docs/pi-subagents.md`, with `editor.ts` and `footer.ts` in `files`. The installed `tsc` rejects `baseUrl`; `paths` alone is enough.
- **On screen**: pi in a Rex session of its own, `rex new <label> -c <scratch dir> -- pi --no-session`, driven with `rex send` and `rex send-key` and read with `rex capture --trim` (`docs/rex.md`). A transcript is shown by opening a copy of a session file with `--session`.
- **Colour**: `rex capture --format=html`. A session made with `rex new` is not on screen, so Rex does not answer its colour queries and `system` falls back to dark; show the session in Rex's window to see the real colours.
- Extension statuses can be faked with a scratch `-e` extension that calls `ctx.ui.setStatus`.
