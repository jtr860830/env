{
  pkgs,
  lib,
  config,
  ...
}:
{
  programs.ssh = {
    enable = true;
    enableDefaultConfig = false;

    # Override macOS's older system ssh; see "Shadowing macOS System Binaries"
    package = pkgs.openssh;

    includes = lib.optionals pkgs.stdenv.isDarwin [
      "${config.xdg.dataHome}/lima/*/ssh.config"
    ];

    settings."*".IdentityAgent =
      if pkgs.stdenv.isDarwin then
        ''"~/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock"''
      else
        ''"~/.1password/agent.sock"'';
  };
}
