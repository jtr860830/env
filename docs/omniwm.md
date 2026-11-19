---
paths: ["config/omniwm/**"]
---

## OmniWM

Tiling window manager (cask `omniwm`). `config/omniwm/.config/omniwm/settings.toml` is stowed: OmniWM reloads it on every save and writes Settings-window changes back through the link, into the repo. Runtime state (window placements, clipboard) lives in `~/.local/state/omniwm`.

- **The schema is strict: change values in place, never delete keys.** A missing key rejects the whole file and OmniWM keeps its previous settings. The GUI rewrites the whole file in its own order on every save and drops comments.
- **A schema upgrade rewrites the whole file once** and leaves a backup beside the target; delete the backup and commit the rewrite on its own.
- **Read the whole `settings.toml` diff before committing any OmniWM change.** The GUI writes a key the moment its control is touched, so the file can carry edits made since the last commit that nobody decided on; such a diff usually needs a `git checkout` rather than a commit.

### Layout and workspaces

One window fills each screen. Workspaces 1 to 3 live on the built-in display (1 the terminal, 2 Zen, 3 anything else) and 4 and 5 on the secondary display, and each is shown by its number.

- **Niri with `visibleContainerCount = 1` and `defaultContainerPrimarySpan = 1.0`**, so every column is full width. `⌥.` and `⌥,` cycle a column through ⅓, ½ and ⅔ for a side-by-side view, and `⌥⇧F` toggles full width back.
- **`edgeGaps = false` and `gaps.size = 8`**; with edge gaps a full-width column is inset on every side once a workspace holds two windows.
- **The focus border is off**: with one window per screen it marks nothing and costs space on each edge.
- **A workspace cannot exist only while its display is connected.** When its display is missing OmniWM places it on the nearest connected one, so unplugged, 4 and 5 join the built-in display. `workspaceBar.hideEmptyWorkspaces = true` keeps empty ones out of the bar, Overview and next/previous navigation; `⌥1-5` and `⌥⇧1-5` still reach them.
- **Names**: a workspace with no name has no `displayName` key at all. Nerd Font glyphs do not work as names, since the bar and menu bar draw in the system font.
- **`niri.infiniteLoop = true` wraps keyboard navigation only.** `⌥←→` past the last column returns to the first; the three-finger column scroll drags a bounded strip and does not wrap. The three-finger workspace swipe wraps through `gestures.workspaceSwipeEdgeBehavior = "cycle"`.

### App rules

- **`assignToWorkspace` rules route the terminal to 1** (one rule for Rex, one for Ghostty, its fallback) **and Zen to 2**, but only for an app's first tracked window; later windows open on whatever workspace is active.
- **Everything else tiles on workspace 3.** A last rule with an empty `bundleId`, `titleRegex = ".*"`, `assignToWorkspace = "3"` and `layout = "tile"` sends any app without its own rule there as a full-width column. 3 rather than 5 because it exists with or without the secondary display.
- **Rules are resolved per setting, by specificity** (a bundle ID counts more than other matchers). A more specific rule wins only for the settings it sets, so the terminal's and Zen's rules carry an explicit `assignToWorkspace` and `layout`.
- **Limits.** A second window of an app becomes a column on the active workspace; send it on with `⌥⇧3`. A window with no title fails the regex and tiles where it opened. A fixed-size window can misbehave under `tile` and then needs its own `layout = "float"` rule. `⌥⇧Space` toggles floating for one window.
- **A floating window belongs to the workspace it opened on.** There is no sticky, all-workspaces window: OmniWM workspaces are not macOS Spaces, and app rules cannot say "every workspace". Move a float with `⌥⇧1-3`. Scratchpads are unused, because their assignments last only for the OmniWM process.

### Workspace bar

The bar is OmniShell: widgets drawn by a style. Its configuration resolves in this order, highest first:

1. the user's profile, `~/.config/omniwm/shell/shell.toml`, section `[profiles.default.workspaceBar]`, stowed from `config/omniwm/.config/omniwm/shell/shell.toml`. Settings → Styles & Widgets → Bar writes to it, through the link. `--no-folding` keeps `shell/` a real directory, so the app-owned files beside it stay out of the repo;
2. the style's own file, `~/.config/omniwm/shell/default/shell.toml`, which OmniWM overwrites on every update;
3. `settings.toml`'s `[workspaceBar]`, which decides only the keys neither layer above sets.

`omniwmctl query workspace-bar` shows the resolved values. The profile sets four keys, each because the layers below would give something else:

| Key | Why |
|---|---|
| `autoHide = true` | required for the `⌥` reveal: `revealModifier` only reveals a bar whose resolved `autoHide` is true |
| `fullWidth = false`, `reserveLayoutSpace = false` | undo the style's `true`. An enabled full-width bar anywhere but below the menu bar also sets macOS to hide the menu bar, and a crash can leave that set (`defaults read NSGlobalDomain _HIHideMenuBar`) |
| `height = 24` | undoes the style's 32 |

`position`, `notchMode` and `windowLevel` are deliberately not in the profile; the lower layers' values apply. The window level must stay `popup`: `normal` would sit under the menu bar on a display without a notch.

The menu bar item shows only the active workspace's number (`statusBar.showIcon = false`, `showWorkspaceName = true`). Its dropdown is trimmed by `[statusMenu]`: the control tiles are hidden because they toggle things this file decides, and a GUI toggle writes straight into the repo.

**Hidden Bar is off**, here and in the profile. It conceals menu-bar icons only with Full Disk Access granted to OmniWM, which is not worth giving a window manager.

### Window switcher, Quake, launcher

- **The window switcher is on**: `⌘Tab` cycles the active workspace's windows with thumbnails, `⌥Tab` all workspaces. Thumbnails need Screen Recording and the shortcuts need Input Monitoring. With one window per workspace it mostly duplicates `⌥1-5`; it is kept because the owner likes it.
- **The Quake terminal is off** because it is not used. It is OmniWM's embedded libghostty and reads Ghostty's config files (`docs/ghostty.md`).
- **`[launcher]` has no entries**; Alfred launches things. Its `terminal` and Quake's `provider` both name Ghostty and change when Ghostty goes.
- `[keyboardModes]` is empty, and `[island]` and `shellPermissions.services` are untouched.

### Overview colours

Only the selected window's border can follow light and dark: with `overview.matchFocusBorder = true` it takes the focus border's colour, and `borders` has both `color` (light) and `darkColor` (dark). Those are set to Rosé Pine's iris, `#907aa9` for Dawn and `#c4a7e7` for Main, while the focus border itself stays disabled. They are the one hand-copied colour under `config/` (the `theme` skill), stored as fractions of 255. The backdrop and the resting and hovered borders take one colour for both appearances and stay at OmniWM's defaults.

### Gestures and hotkeys

- **Trackpad**: three fingers scroll Niri columns left and right and switch workspaces up and down; four fingers up and down open and close Overview. macOS's own three- and four-finger swipes are turned off in System Settings, since both would fire on the same swipe.
- **Window move and resize gestures stay off**: each needs a finger count no other enabled gesture uses, and three and four are taken. `⌥`-drag covers both.
- **Hotkeys stay on OmniWM's `⌥` defaults.** They take `⌥←→↑↓` from fish, which is accepted since vi mode moves with `w` and `b`.
- `updateChecksEnabled = false` because brew updates it, and `ipcEnabled = true` for `omniwmctl`.

### Manual setup

Grant Accessibility and Input Monitoring on first launch, plus Screen Recording for the window switcher's thumbnails. Keep **Displays have separate Spaces** on, and turn on **Start at Login** in OmniWM's menu: it is a macOS login item, not a key in `settings.toml`.
