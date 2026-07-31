{ ... }:
let
  palette = import ./palette.nix;

  colors = c: ''
    set -g status-style          "bg=${c.bg_statusline}"
    set -g message-style         "bg=${c.bg},fg=${c.fg},fill=${c.bg}"
    set -g message-command-style "bg=${c.bg},fg=${c.yellow},fill=${c.bg}"
    set -g mode-style            "bg=${c.selection},fg=${c.fg}"

    set -g copy-mode-match-style         "bg=${c.selection},fg=${c.yellow}"
    set -g copy-mode-current-match-style "bg=${c.cursearch_bg},fg=${c.cursearch_fg}"

    set -g status-left  " #[fg=${c.comment}]#{client_user}#[fg=${c.fg_gutter}]@#[fg=${c.fg}]#h "
    set -g status-right "#{?client_prefix,#[fg=${c.accent_yellow}],#{?pane_in_mode,#[fg=${c.accent_cyan}],#[fg=${c.accent_purple}]}}#[bold]#{?window_zoomed_flag, ■,} #S "

    set -g pane-border-style        "fg=${c.gray}"
    set -g pane-active-border-style "fg=${c.gray}"

    setw -g window-status-format         "#[fg=${c.comment}]#{?#{==:#{session_windows},1},, ○ }"
    setw -g window-status-current-format "#[fg=${c.purple}]#{?#{==:#{session_windows},1},, ● }"
  '';
in
{
  xdg.configFile."tmux/dark.conf".text = colors palette.dark;
  xdg.configFile."tmux/light.conf".text = colors palette.light;

  programs.tmux = {
    enable = true;
    mouse = true;
    baseIndex = 1;
    terminal = "tmux-256color";
    keyMode = "vi";
    escapeTime = 0;
    historyLimit = 50000;
    focusEvents = true;

    extraConfig = ''
      set -as terminal-features "xterm*:extkeys"
      set -s extended-keys on
      set -s extended-keys-format csi-u
      set -g renumber-windows on
      set -g set-titles on
      set -g set-clipboard on

      bind-key a send-prefix
      bind r source-file "$XDG_CONFIG_HOME/tmux/tmux.conf"
      bind - split-window -v -c "#{pane_current_path}"
      bind | split-window -h -c "#{pane_current_path}"

      bind -T copy-mode-vi v   send-keys -X begin-selection
      bind -T copy-mode-vi y   send-keys -X copy-pipe-and-cancel
      bind -T copy-mode-vi C-v send-keys -X rectangle-toggle

      set -g status-position     bottom
      set -g status-justify      absolute-centre
      set -g status-left-length  40
      set -g status-right-length 40
      setw -g window-status-separator ""

      set-hook -g client-dark-theme  'source-file "$XDG_CONFIG_HOME/tmux/dark.conf"'
      set-hook -g client-light-theme 'source-file "$XDG_CONFIG_HOME/tmux/light.conf"'
      source-file "$XDG_CONFIG_HOME/tmux/dark.conf"
    '';
  };
}
