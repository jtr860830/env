{
  pkgs,
  lib,
  config,
  ...
}:
let
  palette = import ./palette.nix;

  hexToRgb =
    hex:
    let
      digits = {
        "0" = 0;
        "1" = 1;
        "2" = 2;
        "3" = 3;
        "4" = 4;
        "5" = 5;
        "6" = 6;
        "7" = 7;
        "8" = 8;
        "9" = 9;
        "a" = 10;
        "b" = 11;
        "c" = 12;
        "d" = 13;
        "e" = 14;
        "f" = 15;
      };
      s = lib.toLower (lib.removePrefix "#" hex);
      at = i: digits.${builtins.substring i 1 s};
      byte = i: (at i) * 16 + (at (i + 1));
    in
    "${toString (byte 0)};${toString (byte 2)};${toString (byte 4)}";

  ezaColors =
    c:
    let
      fg = h: "38;2;${hexToRgb h}";
      dim = h: "2;38;2;${hexToRgb h}";
    in
    builtins.concatStringsSep ":" [
      "di=${fg c.blue}"
      "ln=${fg c.cyan}"
      "lp=${dim c.cyan}"
      "ex=${fg c.green}"
      "or=${fg c.red}"
      "da=${fg c.gray}"
      "sn=${fg c.orange}"
      "sb=${fg c.gray}"
      "hd=1;${fg c.fg}"
      "ur=${fg c.yellow}"
      "uw=${fg c.red}"
      "ux=${fg c.green}"
      "gr=${dim c.yellow}"
      "gw=${dim c.red}"
      "gx=${dim c.green}"
      "tr=${dim c.yellow}"
      "tw=${dim c.red}"
      "tx=${dim c.green}"
      "ga=${fg c.green}"
      "gm=${fg c.yellow}"
      "gd=${fg c.red}"
      "gv=${fg c.cyan}"
      "gt=${fg c.purple}"
      "gi=${fg c.gray}"
    ];

  colors =
    c:
    let
      h = k: lib.removePrefix "#" c.${k};
    in
    ''
      set -g fish_color_normal            ${h "fg"}
      set -g fish_color_command           ${h "cyan"}
      set -g fish_color_keyword           ${h "purple"}
      set -g fish_color_quote             ${h "green"}
      set -g fish_color_redirection       ${h "cyan"}
      set -g fish_color_end               ${h "fg"}
      set -g fish_color_option            ${h "yellow"}
      set -g fish_color_error             ${h "red"}
      set -g fish_color_param             ${h "blue"}
      set -g fish_color_comment           ${h "comment"}
      set -g fish_color_selection         --background=${h "selection"}
      set -g fish_color_search_match      --background=${h "selection"}
      set -g fish_color_operator          ${h "cyan"}
      set -g fish_color_escape            ${h "cyan"}
      set -g fish_color_autosuggestion    ${h "gray"}
      set -g fish_color_cwd               ${h "blue"}
      set -g fish_color_user              ${h "purple"}
      set -g fish_color_host              ${h "orange"}
      set -g fish_color_valid_path        ${h "green"}
      set -g fish_color_prefix            ${h "blue"}
      set -g fish_color_history_current   ${h "yellow"}

      set -g fish_pager_color_progress             ${h "comment"}
      set -g fish_pager_color_prefix               ${h "cyan"}
      set -g fish_pager_color_completion           ${h "fg"}
      set -g fish_pager_color_description          ${h "comment"}
      set -g fish_pager_color_selected_background  --background=${h "selection"}

      set -g pure_color_primary   (set_color ${h "blue"})
      set -g pure_color_success   (set_color ${h "green"})
      set -g pure_color_danger    (set_color ${h "red"})
      set -g pure_color_warning   (set_color ${h "yellow"})
      set -g pure_color_info      (set_color ${h "cyan"})
      set -g pure_color_mute      (set_color ${h "comment"})
      set -g pure_color_normal    (set_color ${h "fg"})
      set -g pure_color_git_branch (set_color ${h "cyan"})
      set -g pure_color_git_dirty  (set_color ${h "yellow"})

      set -gx EZA_COLORS "${ezaColors c}"
    '';
in
{
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

      function __apply_theme --on-variable fish_terminal_color_theme
        if test "$fish_terminal_color_theme" = light
      ${colors palette.light}
        else
      ${colors palette.dark}
        end
      end
      __apply_theme
    '';
  };

  programs.zoxide.enable = true;

  programs.man = {
    man-db.enable = false;
    mandoc.enable = true;
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
    KUBECONFIG = "${config.xdg.configHome}/kube";
    KUBECACHEDIR = "${config.xdg.cacheHome}/kube";
    LIMA_HOME = "${config.xdg.dataHome}/lima";

    CLAUDE_CONFIG_DIR = "${config.xdg.configHome}/claude";
    REMEMBER_RUNTIME_DIR = "${config.xdg.stateHome}/remember/run";
    SSH_AUTH_SOCK =
      if pkgs.stdenv.isDarwin then
        "${config.home.homeDirectory}/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock"
      else
        "${config.home.homeDirectory}/.1password/agent.sock";
  };
}
