{ ... }: {
  programs.tmux = {
    enable = true;
    mouse = true;
    baseIndex = 1;
    terminal = "tmux-256color";

    extraConfig = ''
      set -as terminal-overrides ",xterm*:RGB"
      setw -g pane-base-index 1
      set -g renumber-windows on
      set -g set-titles on
      set -g escape-time 0
      set -g focus-events on
      set -g set-clipboard on
      set -g history-limit 50000

      bind-key a send-prefix
      bind r source-file "$XDG_CONFIG_HOME/tmux/tmux.conf"
      bind w kill-window
      bind - split-window -v -c "#{pane_current_path}"
      bind | split-window -h -c "#{pane_current_path}"
      bind h select-pane -L
      bind j select-pane -D
      bind k select-pane -U
      bind l select-pane -R
      bind -n S-Enter send-keys Escape "[13;2u"

      set -g status-position       bottom
      set -g status-justify        absolute-centre
      set -g status-style          "bg=#22262d"
      set -g message-style         "bg=#3d4350,fg=#abb2bf"
      set -g message-command-style "bg=#3d4350,fg=#c678dd"
      set -g mode-style            "bg=#3d4350,fg=#abb2bf"

      set -g status-left-length    40
      set -g status-right-length   40
      set -g status-left           " #[fg=#5c6370]#{client_user}#[fg=#3d4350]@#[fg=#abb2bf]#h "
      set -g status-right          "#{?client_prefix,#[fg=#e5c07b],#{?pane_in_mode,#[fg=#56b6c2],#[fg=#c678dd]}}#[bold] #S "

      set -g pane-border-style        "fg=#3d4350"
      set -g pane-active-border-style "fg=#3d4350"

      setw -g window-status-separator    ""
      setw -g window-status-format         "#[fg=#5c6370]#{?#{==:#{session_windows},1},, ○ }"
      setw -g window-status-current-format "#[fg=#61afef,bold]#{?#{==:#{session_windows},1},, ● }"
    '';
  };
}
