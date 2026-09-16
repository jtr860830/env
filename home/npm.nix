{ lib, config, ... }:
{
  programs.npm = {
    enable = true;

    settings = {
      prefix = "\${XDG_DATA_HOME}/npm";
      cache = "\${XDG_CACHE_HOME}/npm";
      init-module = "\${XDG_CONFIG_HOME}/npm/config/npm-init.js";
      logs-dir = "\${XDG_STATE_HOME}/npm/logs";
    };
  };

  home.sessionVariables.NPM_CONFIG_USERCONFIG = lib.mkForce "${config.xdg.configHome}/npm/npmrc";
}
