{ pkgs, config, ... }: {
  programs.fish = {
    enable = true;

    plugins = [
      {
        name = "pure";
        src = pkgs.fishPlugins.pure.src;
      }
    ];

    functions = {
      fish_greeting = "";
      ls = "eza --icons=auto --color=auto $argv";
      rm = ''echo "Use 'rip' instead of rm. If you really need rm, use 'command rm'."'';
      wget = ''command wget --hsts-file="$XDG_CACHE_HOME/wget-hsts" $argv'';
    };

    interactiveShellInit = ''
      if not set -q TMUX
        exec tmux new-session -A -s main
      end

      set -gx PATH \
        ${config.home.homeDirectory}/.local/bin \
        ${config.xdg.dataHome}/go/bin \
        ${config.xdg.dataHome}/cargo/bin \
        /etc/profiles/per-user/${config.home.username}/bin \
        /nix/var/nix/profiles/default/bin \
        /usr/local/bin \
        /usr/bin \
        /bin \
        /usr/sbin \
        /sbin

      fish_vi_key_bindings
      zoxide init fish | source

      # One Dark Pro colors
      set -l foreground abb2bf
      set -l selection  414858
      set -l comment    5c6370
      set -l red        e06c75
      set -l orange     d19a66
      set -l yellow     e5c07b
      set -l green      98c379
      set -l blue       61afef
      set -l purple     c678dd
      set -l cyan       56b6c2

      set -g fish_color_normal            $foreground
      set -g fish_color_command           $cyan
      set -g fish_color_keyword           $purple
      set -g fish_color_quote             $yellow
      set -g fish_color_redirection       $foreground
      set -g fish_color_end               $orange
      set -g fish_color_option            $yellow
      set -g fish_color_error             $red
      set -g fish_color_param             $blue
      set -g fish_color_comment           $comment
      set -g fish_color_selection         --background=$selection
      set -g fish_color_search_match      --background=$selection
      set -g fish_color_operator          $foreground
      set -g fish_color_escape            $purple
      set -g fish_color_autosuggestion    $comment
      set -g fish_color_cwd               $cyan
      set -g fish_color_user              $purple
      set -g fish_color_host              $orange
      set -g fish_color_valid_path        $green
      set -g fish_color_prefix            $blue
      set -g fish_color_history_current   $yellow

      set -g fish_pager_color_progress             $comment
      set -g fish_pager_color_prefix               $cyan
      set -g fish_pager_color_completion           $foreground
      set -g fish_pager_color_description          $comment
      set -g fish_pager_color_selected_background  --background=$selection

      # Pure prompt (onedarkpro)
      set -g pure_color_primary   (set_color $blue)
      set -g pure_color_success   (set_color $green)
      set -g pure_color_danger    (set_color $red)
      set -g pure_color_warning   (set_color $yellow)
      set -g pure_color_info      (set_color $cyan)
      set -g pure_color_mute      (set_color $comment)
      set -g pure_color_normal    (set_color $foreground)
      set -g pure_color_git_branch (set_color $cyan)
      set -g pure_color_git_dirty  (set_color $yellow)
    '';
  };

  home.sessionVariables = {
    LANG = "en_US.UTF-8";
    TERMINFO_DIRS = "${pkgs.ncurses}/share/terminfo";

    NODE_REPL_HISTORY = "${config.xdg.dataHome}/node_repl_history";
    COREPACK_HOME = "${config.xdg.dataHome}/corepack";
    NPM_CONFIG_USERCONFIG = "${config.xdg.configHome}/npm/npmrc";

    GOPATH = "${config.xdg.dataHome}/go";
    GOBIN = "${config.xdg.dataHome}/go/bin";

    RUSTUP_HOME = "${config.xdg.dataHome}/rustup";
    CARGO_HOME = "${config.xdg.dataHome}/cargo";

    WGETRC = "${config.xdg.configHome}/wgetrc";
    BAT_THEME = "TwoDark";
    EZA_COLORS = builtins.concatStringsSep ":" [
      "di=38;2;97;175;239" # dir: blue
      "ln=38;2;86;182;194" # symlink: cyan
      "lp=2;38;2;86;182;194" # symlink path: cyan dim
      "ex=38;2;152;195;121" # executable: green
      "or=38;2;224;108;117" # broken symlink: red
      "da=38;2;92;99;112" # date: comment gray
      "sn=38;2;229;192;123" # size number: yellow
      "sb=38;2;92;99;112" # size unit: comment gray
      "hd=1;38;2;171;178;191" # header: bold fg
      "ur=38;2;229;192;123" # user read: yellow
      "uw=38;2;224;108;117" # user write: red
      "ux=38;2;152;195;121" # user exec: green
      "gr=2;38;2;229;192;123" # group read: yellow dim
      "gw=2;38;2;224;108;117" # group write: red dim
      "gx=2;38;2;152;195;121" # group exec: green dim
      "tr=2;38;2;229;192;123" # other read: yellow dim
      "tw=2;38;2;224;108;117" # other write: red dim
      "tx=2;38;2;152;195;121" # other exec: green dim
      "ga=38;2;152;195;121" # git added: green
      "gm=38;2;229;192;123" # git modified: yellow
      "gd=38;2;224;108;117" # git deleted: red
      "gv=38;2;86;182;194" # git renamed: cyan
      "gt=38;2;198;120;221" # git type change: purple
      "gi=38;2;92;99;112" # git ignored: comment gray
    ];
    KUBECONFIG = "${config.xdg.configHome}/kube";
    KUBECACHEDIR = "${config.xdg.cacheHome}/kube";
    LIMA_HOME = "${config.xdg.dataHome}/lima";

    CLAUDE_CONFIG_DIR = "${config.xdg.configHome}/claude";
    SSH_AUTH_SOCK =
      if pkgs.stdenv.isDarwin then
        "${config.home.homeDirectory}/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock"
      else
        "${config.home.homeDirectory}/.1password/agent.sock";
  };
}
