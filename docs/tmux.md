---
paths: ["config/tmux/**"]
---

## Tmux Quirks

- **tmux is started by Ghostty's `command`, not by fish**, so shells started anywhere else are plain fish. The command, its reasons and the verification are in `docs/ghostty.md`
- Mode detection without plugins: `#{?client_prefix,...}` and `#{?pane_in_mode,...}` are built-in tmux format strings
- `pane-border-style` and `pane-active-border-style` set to the same color — a shared border between an active and an inactive pane renders half in each style. Re-verified on tmux 3.7c, so do not try giving the active border its own color again
- **`message-style` needs `fill=`, not just `bg=`.** tmux draws the message over the existing status line and only paints the cells the text occupies, so the rest of the row shows through — `display-message HELLO` over `jtr860830@…` rendered as `HELLO60830@…`. `fill` makes it clear to end of line
- **An option set twice is set by whichever line comes last.** Check for duplicates before adding one:
  ```sh
  grep -oE '^set(w)? +(-[a-z]+ +)*[a-z@_-]+' config/tmux/.config/tmux/tmux.conf | awk '{print $NF}' | sort | uniq -d
  ```
- **tmux 3.8 (Homebrew) changed default styles** with its built-in themes. `window-status-current-style` became `underscore`, which drew a line under the current window until it was set back to `default`. After any tmux upgrade, compare `tmux show -g` / `show -gw` against the file for styles it does not set.
- Split keybinds need `-c "#{pane_current_path}"` to inherit current directory; omitting it always opens in `$HOME`
- `window-style = "dim"` does NOT work with truecolor apps — SGR dim only affects 16-color ANSI; truecolor RGB values are unaffected. Background color difference is the only reliable inactive-pane visual cue, but Neovim overrides it too.
- `set -g set-clipboard on` enables OSC 52 clipboard sync (replaces yank plugin; requires terminal support e.g. Ghostty)
- `status-justify absolute-centre` centers window list by terminal width; `centre` centers between left/right content
- **The bar is a bottom frame, `╰ … ╯` in `gray`, matching the fish prompt** (2026-11-13). The rule is `#{R:─,#{client_width}}` at the start of `status-right`, with `status-right-length 1000`: when the sections do not fit, tmux cuts the right one from its left edge, so the rule shrinks to exactly the room between the pills and the pill at its end survives. The `absolute-centre` window list is drawn over the rule; the space either side of the window pill belongs to the window formats.
- `status-left` is the active pane's title, `#{=/30/…:pane_title}` (2026-11-13). `user@host` was there before and said nothing: one Mac, and it does not follow ssh. fish sets the title to the running command (20 characters) and `prompt_pwd`: `~/.c/env` at the prompt, `sleep 4 ~/.c/env` while running; pi sets `π - env`. The bar redraws as soon as the title changes. A remote shell's own title was only simulated with an OSC 2 sequence, not seen over a real ssh. Declined: `#{pane_current_command}` (pi is `node`, an idle prompt always `fish`), moving the window list to the left (empty again with one window), a pill only while ssh runs (tmux knows the command name, not the host, and `#(ps …)` spawns a shell per redraw), and leaving the left empty.
- To see the status line without attaching, nest two throwaway servers: an outer `tmux -L` whose pane runs `tmux -L <inner> -f <conf> new-session`, then `capture-pane` the outer one.
- `#[fg=...]` inside `#{?…}` works fine, including hex colors — `status-right` relies on it. **But only one attribute per directive:** a conditional splits its arguments on commas before styles are parsed, so `#[fg=x,bg=y]` inside `#{?…,…,…}` is cut at the comma and the remainder leaks out as literal text on the bar (`bg=#21252b]` appearing next to the content). Write `#[fg=x]#[bg=y]`. Outside a conditional the comma form is fine, which is why `status-left` can keep it. When testing with `display -p`, note that `#{?1,a,b}` looks *1* up as a variable name, finds nothing and takes the `b` branch; use `#{?#{==:1,1},a,b}` or a real variable or the conditional will look broken
- `#{==:#{session_windows},1}` to detect single-window sessions (e.g. hide window list)
- The window pill shows `○`/`●`, and the window number (`#I`) instead while the prefix is held: `#{?client_prefix,#I,○}`. tmux redraws the status line when the prefix is pressed, so the numbers appear exactly when `prefix 1-9` is about to be typed. Verified by expanding both formats with a second window and with `client_prefix` forced true.
- Shift+Enter reaches applications through `extended-keys`, not a `send-keys` binding. tmux only requests extended keys from the outer terminal when that terminal advertises `extkeys`, and no built-in `terminal-features` entry does — hence `set -as terminal-features "xterm*:extkeys"`. A client negotiates this at attach time, so `tmux kill-server` (or detach/attach) is required after changing it; confirm with `tmux display -p '#{client_termfeatures}'`. `extended-keys-format csi-u` gives `CSI 13;2u`, the `xterm` default gives `CSI 27;2;13~`
- `terminal-overrides ",xterm*:RGB"` is unnecessary: `xterm-ghostty`'s terminfo declares `Tc` and tmux reports `RGB` in `client_termfeatures` without it
- Default `prefix w` is `choose-tree -Zw` and `prefix &` kills the window *with* confirmation. Do not rebind `w` to `kill-window` — with a single window that takes the whole server down, silently
- Built-in `prefix ←↑↓→` pane navigation carries `-r`, so it repeats within `repeat-time` without re-pressing the prefix; hand-rolled `bind h/j/k/l` does not. `prefix q` jumps by pane number, `prefix ;` toggles the last pane

