---
paths: ["config/ghostty/**", "config/tmux/**", "config/fish/**"]
---

## Ghostty and tmux

Ghostty starts tmux itself — `command = /usr/bin/env -u TMUX /opt/homebrew/bin/tmux new-session -A -s main` in its config — and fish's config has no tmux logic at all. So only Ghostty windows land in the `main` session; a shell started anywhere else (Zed's terminal, an SSH login, a subshell) is plain fish, with nothing to exclude. The previous `exec tmux` in `config.fish` needed a guard for every non-Ghostty host.

- **Absolute path**: Ghostty launched from the Dock or Alfred has only launchd's `PATH` (`/usr/bin:/bin:/usr/sbin:/sbin`), and `command` runs before fish's `env.fish`.
- **`env -u TMUX`**: an app launched with `open` from inside tmux inherits `TMUX` (see AGENTS.md, `### GUI Apps Launched From a Terminal`); tmux would refuse to start with *sessions should be nested with care*. Clearing it makes a polluted launch attach normally.
- Detaching closes the window, as `exec` did; panes run the login shell (`/opt/homebrew/bin/fish`), where `env.fish` sets `PATH`.

Verified with two fresh instances (`open -na /Applications/Ghostty.app`): one under the clean launchd environment, one inheriting this shell's `TMUX` — both attached to `main` as a new client.

## Ghostty Shell Integration

`shell-integration = none` — disabled; tmux handles working directory and pane management, making all features redundant.
Available features: `cursor`, `sudo`, `title`, `ssh-env`, `ssh-terminfo`, `path`. In tmux `TERM=tmux-256color` so `ssh-env` TERM conversion does not trigger.
Verify integration is actually loaded: `fish -c 'functions __ghostty_setup'` — returns "not loaded" if disabled correctly. `$GHOSTTY_SHELL_FEATURES` is set by Ghostty process itself and is not a reliable indicator.

## Key Keybinding Patterns

Tmux handles all split and pane management. No custom Ghostty keybindings — tmux workflow makes them redundant. Tmux prefix is `Ctrl+B`.

Ghostty requires `macos-option-as-alt = true` for `<A-*>` keybindings to work in Neovim on macOS — without it, Option sends special characters instead.
