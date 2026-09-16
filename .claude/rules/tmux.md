---
paths: ["home/tmux.nix"]
---

## Tmux Quirks

- Mode detection without plugins: `#{?client_prefix,...}` and `#{?pane_in_mode,...}` are built-in tmux format strings
- `pane-border-style` and `pane-active-border-style` set to the same color — a shared border between an active and an inactive pane renders half in each style. Re-verified on tmux 3.7c, so do not try giving the active border its own color again
- **`message-style` needs `fill=`, not just `bg=`.** tmux draws the message over the existing status line and only paints the cells the text occupies, so the rest of the row shows through — `display-message HELLO` over `jtr860830@…` rendered as `HELLO60830@…`. `fill` makes it clear to end of line
- **Options the module already covers must not be repeated in `extraConfig`.** `escapeTime`, `historyLimit`, `focusEvents` each ended up emitted twice, with `extraConfig` winning only by line order; `baseIndex` alone sets both `base-index` and `pane-base-index`. Check with:
  ```sh
  nix eval --raw '.#darwinConfigurations.pro-darwin.config.home-manager.users.jtr860830.xdg.configFile."tmux/tmux.conf".text' \
    | grep -oE '^set(w)? +(-[a-z]+ +)*[a-z-]+' | awk '{print $NF}' | sort | uniq -d
  ```
- Split keybinds need `-c "#{pane_current_path}"` to inherit current directory; omitting it always opens in `$HOME`
- `window-style = "dim"` does NOT work with truecolor apps — SGR dim only affects 16-color ANSI; truecolor RGB values are unaffected. Background color difference is the only reliable inactive-pane visual cue, but Neovim overrides it too.
- `set -g set-clipboard on` enables OSC 52 clipboard sync (replaces yank plugin; requires terminal support e.g. Ghostty)
- `status-justify absolute-centre` centers window list by terminal width; `centre` centers between left/right content
- `#{client_user}` (tmux 3.4+) replaces `#(whoami)` — built-in, no shell spawn
- `#[fg=...]` inside `#{?…}` works fine, including hex colors — `status-right` relies on it. **But only one attribute per directive:** a conditional splits its arguments on commas before styles are parsed, so `#[fg=x,bg=y]` inside `#{?…,…,…}` is cut at the comma and the remainder leaks out as literal text on the bar (`bg=#21252b]` appearing next to the content). Write `#[fg=x]#[bg=y]`. Outside a conditional the comma form is fine, which is why `status-left` can keep it. When testing with `display -p`, note that `#{?1,a,b}` looks *1* up as a variable name, finds nothing and takes the `b` branch; use `#{?#{==:1,1},a,b}` or a real variable or the conditional will look broken
- `#{==:#{session_windows},1}` to detect single-window sessions (e.g. hide window list)
- Shift+Enter reaches applications through `extended-keys`, not a `send-keys` binding. tmux only requests extended keys from the outer terminal when that terminal advertises `extkeys`, and no built-in `terminal-features` entry does — hence `set -as terminal-features "xterm*:extkeys"`. A client negotiates this at attach time, so `tmux kill-server` (or detach/attach) is required after changing it; confirm with `tmux display -p '#{client_termfeatures}'`. `extended-keys-format csi-u` gives `CSI 13;2u`, the `xterm` default gives `CSI 27;2;13~`
- `terminal-overrides ",xterm*:RGB"` is unnecessary: `xterm-ghostty`'s terminfo declares `Tc` and tmux reports `RGB` in `client_termfeatures` without it
- Default `prefix w` is `choose-tree -Zw` and `prefix &` kills the window *with* confirmation. Do not rebind `w` to `kill-window` — with a single window that takes the whole server down, silently
- Built-in `prefix ←↑↓→` pane navigation carries `-r`, so it repeats within `repeat-time` without re-pressing the prefix; hand-rolled `bind h/j/k/l` does not. `prefix q` jumps by pane number, `prefix ;` toggles the last pane

