{ ... }:
let
  palette = import ./palette.nix;

  lcap = builtins.fromJSON ''"\ue0b6"'';
  rcap = builtins.fromJSON ''"\ue0b4"'';
  dotDim = builtins.fromJSON ''"\u25cb"'';
  dotOn = builtins.fromJSON ''"\u25cf"'';
  zoomed = builtins.fromJSON ''"\u25a0"'';

  colors =
    c:
    let
      open = "#[fg=${c.float_bg}]#[bg=${c.bg}]${lcap}#[bg=${c.float_bg}]";
      close = "#[fg=${c.float_bg}]#[bg=${c.bg}]${rcap}";
      stateFg = "#{?client_prefix,#[fg=${c.yellow}],#{?pane_in_mode,#[fg=${c.cyan}],#[fg=${c.purple}]}}";
      stateBg = "#{?client_prefix,#[bg=${c.yellow}],#{?pane_in_mode,#[bg=${c.cyan}],#[bg=${c.purple}]}}";
      single = "#{==:#{session_windows},1}";
      first = "#{?#{==:#{window_index},1},${open},}";
      last = "#{?#{==:#{window_index},#{session_windows}},${close},}";
    in
    ''
      set -g status-style          "bg=${c.bg}"
      set -g message-style         "bg=${c.bg},fg=${c.fg},fill=${c.bg}"
      set -g message-command-style "bg=${c.bg},fg=${c.yellow},fill=${c.bg}"
      set -g mode-style            "bg=${c.selection},fg=${c.fg}"

      set -g copy-mode-match-style         "bg=${c.selection},fg=${c.yellow}"
      set -g copy-mode-current-match-style "bg=${c.cursearch_bg},fg=${c.cursearch_fg}"

      set -g status-left  "${open}#[fg=${c.comment}] #{client_user}#[fg=${c.fg_gutter}]@#[fg=${c.fg}]#h ${close}"
      set -g status-right "${stateFg}${lcap}${stateBg}#[fg=${c.bg}]#[bold]#{?window_zoomed_flag, ${zoomed},} #S #[nobold]${stateFg}#[bg=${c.bg}]${rcap}"

      set -g pane-border-style        "fg=${c.gray}"
      set -g pane-active-border-style "fg=${c.gray}"

      setw -g window-status-format         "#{?${single},,${first}#[fg=${c.comment}]#[bg=${c.float_bg}] ${dotDim} ${last}}"
      setw -g window-status-current-format "#{?${single},,${first}#[fg=${c.purple}]#[bg=${c.float_bg}] ${dotOn} ${last}}"
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
