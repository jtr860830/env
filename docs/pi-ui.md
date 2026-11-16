---
paths: ["config/pi/**/themes/**", "config/pi/**/extensions/footer.ts", "config/pi/**/extensions/editor.ts"]
---

## pi UI

Three layers: the theme files give pi the editor's colours (2026-11-13), `extensions/editor.ts` frames the input and carries the status pills, and `extensions/footer.ts` draws the extension status lines below it (both in this form since 2026-11-16). Considered and not done: restyling the transcript, which means overriding each built-in tool's renderer separately, and corners on every other border (see Editor).

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

### Editor (2026-11-16)

`extensions/editor.ts` frames the input as the fish prompt frames a command: `❯` in front of the first line, rounded corners on both borders, and the status pills on the bottom border.

```
╭── ⠙ Working ─────────────────────────────────────────────────────────────────────╮
❯ first line
  second line
╰────────── (↑12k ↓3k …) ($1.428) (3.3%/1.0M) (anthropic/claude-fable-5-2 high) ╯
 ● parallel-1
 ├ ● runner  openai/gpt-6-luna  1 turn  15s  $ sleep 20
```

- **No render of its own.** A `CustomEditor` subclass set with `ctx.ui.setEditorComponent` overrides three things. `renderTopBorder` and `renderBottomBorder` are protected hooks of pi-tui's `Editor` (`CustomEditor` uses the first itself for the working indicator): each puts a corner at either end and hands the rest of the width to `super`, so the working, compaction and retry indicators and `↑`/`↓ N more` stay pi's own. `render` takes `super.render()` and replaces the padding of line 1 with the arrow, as the upstream `modal-editor.ts` adds its mode label. Under 4 columns the borders are pi's, and when line 1 does not start with the padding nothing is drawn. The three are marked `override` and the type check runs with `noImplicitOverride`, so a hook renamed by a pi upgrade fails the check; unmarked, the frame would silently become pi's plain border. The frame was declined on 2026-11-13 as needing a render override; the hooks were found three days later.
- **The arrow** sits in the last two cells of `editorPaddingX` (`2` in the local `settings.json`): first column, directly under `╭` and over `╰`, text from the third. With the padding at `3` it is one cell in, and it was for part of 2026-11-16, before the frame: the arrow was then the only character at the left edge, while the status lines and the transcript start one cell in. Once the corners stood at that edge the owner moved it back, since pi's own rules all start in the first column; its markers do not (`$` of a `!` block in the second, the `→` of the completion menu in the third, measured). fish's live prompt followed the same day (`docs/fish-prompt.md`). The code is the same for both; the padding is symmetric, so text also ends two cells before the right frame.
- **Colour** is the editor's `borderColor` for the arrow, corners and rules. pi sets it to the thinking level's colour and to `bashMode` while the text starts with `!`; `capture-pane -e` shows no SGR sequence between a corner and its rule. fish's frame is `gray` and its `❯` follows the vi mode; pi has no vi mode, and the level's colour is what the level text in the model pill matches.
- **Pills on the bottom border, nothing on the top** (the owner's layout). fish puts status on the bottom frame as well, the pills stay where the footer row had them, and the top border is left to the working indicator. They are token counts, cost, context and model, each a `float_bg` pill with caps taking `theme.colors.toolPendingBg` as a foreground; the frame has no subject, as tmux's bar has none.
- **No directory, branch or session name** (the owner, 2026-11-16); until then they led the footer row. pi sets the terminal title to `π - env`, or `π - name - env`, and tmux's `status-left` shows it; a pi session stays in one directory, unlike a shell; the agent runs git and the branch is in its output. Putting them on the top border, as fish does, was considered: it pushes the working indicator right, needs a second drop order, and the branch reaches only the footer's factory (`footerData.getGitBranch`), which would force the two files into one.
- Narrow widths drop, in order: token counts, provider, cost, context, model; under about 20 columns only the frame is left. `↓ N more` keeps its room. Verified from 130 to 3 columns.
- The thinking level is text inside the model pill, coloured by `theme.getThinkingBorderColor(level)`, the function pi's border calls; `high` measured as `38;2;198;120;221`, `purple`. It was a filled pill at the far right for a few hours on 2026-11-13; the owner dropped it as the last and loudest element for what is an attribute of the model. Context turns `warning` above 70% and `error` above 90%, and usage totals are cached by leaf id and model, both as the built-in footer does.
- The provider is always shown. The footer row showed it only with more than one provider available, from `footerData.getAvailableProviderCount`, which only the footer's factory is given. The editor could count them itself: `ctx.modelRegistry.getAvailable()` returned `anthropic`, `claude-code` and `openai` in 0.04 ms (2026-11-16; this line first said the count could not be read). Not done, since the answer here is always more than one. Not carried over from the built-in footer: `(auto)`, constant on this machine; the routed model of a virtual model, which extensions cannot read; `isUsingSubscription`, replaced by `isUsingOAuth` for the `sub` mark.
- **The frame and pills disappear while a selector or dialog is open.** `/model`, a confirmation and the reload box replace the editor in its container, leaving the selector's own straight rules and the status lines; the footer row was always there. Seen with `/model`, accepted.
- Data comes from the `ctx` of `session_start` and from `ctx.ui.theme`; the editor factory itself is given only an `EditorTheme`. Gathering it is wrapped in `try`, and a failure draws the frame without pills: after `session_shutdown` every `ctx` getter throws (`docs/pi-subagents.md`). A precaution, not triggered.
- **Only the editor is framed (2026-11-16).** pi has no setting or theme field for a border's shape, and the editor is the one border with hooks. Every other one (some twenty selectors and dialogs, the `!` output block, `/changelog`, `/hotkeys`, the startup and update notices) is a `DynamicBorder`, one rule that does not know whether it is the top or the bottom one. A scratch extension that replaced `DynamicBorder.prototype.render` did change `/model` and `/settings`, so it is possible, with both rules getting the same corners. Not done: it patches a class pi does not offer for that and reaches the transcript as well, telling top from bottom was not solved and `/tree` has a third rule, and those views are open for seconds while the input is always there; fish has nothing that corresponds to them either.
- Continuation lines stay blank. `render()`'s output does not tell a line break from a soft wrap, marking both would mislead, and telling them apart needs the editor's private layout. When the first line is scrolled out the arrow is not drawn and the border's `↑ N more` says so.
- The constructor passes `embedWorkingStatus: true`, as pi does for its own editor (`interactive-mode.js`); without it a custom editor gets the working indicator on a row of its own. pi copies the border colour and the padding onto a custom editor itself (`setCustomEditorComponent`).
- Two files still: `editor.ts` needs nothing from the footer's factory, pi loads extensions one file at a time, and a failure in the larger one leaves the status lines. One `ui.ts` was the alternative. It is `editor.ts` because pi's word for the input is editor (`setEditorComponent`, `editorPaddingX`), and prompt there means what is sent to the model.
- Only one extension can own the editor. Nothing else in `~/.config/pi/extensions` calls `setEditorComponent`.
- Verified in a scratch tmux server. Without a model call, with the padding at `3` and the arrow, three lines, wrapped text and the completion menu again at `2`: empty, one and several lines, a `!` command, wrapped text, the `/` completion menu (drawn below the bottom border, pills still there), 16 lines scrolled both ways, a session copy with usage, `/model` and Escape. With every extension loaded and one run on `openai/gpt-6-luna`: the working indicator in the top border, the pills updating during the run, `/reload`, Ctrl+D. Not exercised: the indicator together with `↑ N more` (a 16-line paste collapses to one line), and the light theme.

### Footer

`extensions/footer.ts` draws the extension status lines below the editor and nothing else. From 2026-11-13 to 2026-11-16 it also held the row of pills, led by the directory and branch.

- **There is always one line**, blank when no extension has a status, so a starting task does not move the layout; the owner asked for it as the place for subagents. Every extension status is shown, a multi-line status one line per row. With pi's built-in footer the same statuses join into one line.
- Lines start one cell in from the left edge (the owner's request, 2026-11-13) and are cut to the width.
- The factory returns early unless `ctx.mode` is `tui`, because the file also loads in subagent children; the editor's does the same.

### Testing

- Type check as in `docs/pi-subagents.md`, with `footer.ts` and `editor.ts` added to `files`. The installed `tsc` rejects `baseUrl` (TS5102); `paths` alone is enough.
- pi in its own tmux server with `--no-session --use-theme <name>`; a transcript is shown by opening a copy of a session file with `--session`.
- To look at colour, not text: `capture-pane -p -e -N`, convert the SGR sequences to HTML spans, and render with `qlmanage -t -s 2000`. Without `-N` tmux trims trailing cells and panels look ragged.
- Extension statuses can be faked with a scratch `-e` extension that calls `ctx.ui.setStatus`.
