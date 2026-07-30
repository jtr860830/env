{ ... }: {
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

      set -g status-position       bottom
      set -g status-justify        absolute-centre
      set -g status-style          "bg=#22262d"
      set -g message-style         "bg=#282c34,fg=#abb2bf,fill=#282c34"
      set -g message-command-style "bg=#282c34,fg=#e5c07b,fill=#282c34"
      set -g mode-style            "bg=#414858,fg=#abb2bf"

      set -g copy-mode-match-style         "bg=#414858,fg=#e5c07b"
      set -g copy-mode-current-match-style "bg=#fce094,fg=#07080d"

      set -g status-left-length    40
      set -g status-right-length   40
      set -g status-left           " #[fg=#7f848e]#{client_user}#[fg=#3d4350]@#[fg=#abb2bf]#h "
      set -g status-right          "#{?client_prefix,#[fg=#e5c07b],#{?pane_in_mode,#[fg=#56b6c2],#[fg=#c678dd]}}#[bold]#{?window_zoomed_flag, ■,} #S "

      set -g pane-border-style        "fg=#5c6370"
      set -g pane-active-border-style "fg=#5c6370"

      setw -g window-status-separator    ""
      setw -g window-status-format         "#[fg=#7f848e]#{?#{==:#{session_windows},1},, ○ }"
      setw -g window-status-current-format "#[fg=#c678dd]#{?#{==:#{session_windows},1},, ● }"
    '';
  };
}
