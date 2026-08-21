{
  pkgs,
  lib,
  config,
  ...
}:
{
  programs.zoxide.enable = true;

  programs.man = {
    man-db.enable = false;
    mandoc.enable = true;
  };

  home.sessionSearchVariables.MANPATH = lib.optionals pkgs.stdenv.hostPlatform.isDarwin [
    "/usr/share/man"
    "/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/share/man"
  ];

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
      if pkgs.stdenv.hostPlatform.isDarwin then
        "${config.home.homeDirectory}/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock"
      else
        "${config.home.homeDirectory}/.1password/agent.sock";
  };
}
