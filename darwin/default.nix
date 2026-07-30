{ pkgs, config, ... }:
let
  homeDir = config.users.users.jtr860830.home;
in
{
  imports = [
    ./system.nix
    ./homebrew.nix
  ];

  environment.shells = [ pkgs.fish ];
  programs.fish.enable = true;

  programs.zsh = {
    histFile = "${homeDir}/.local/state/zsh/history";
    enableGlobalCompInit = false;
  };

  users.users.jtr860830 = {
    shell = pkgs.fish;
    description = "Josh Hsieh";
    home = "/Users/jtr860830";
  };

  system.primaryUser = "jtr860830";

  security.pam.services.sudo_local = {
    touchIdAuth = true;
    reattach = true;
  };

  fonts.packages = [ pkgs.maple-mono.NF-CN-unhinted ];

  nixpkgs.config.allowUnfree = true;
  nixpkgs.hostPlatform = "aarch64-darwin";

  nix.settings = {
    experimental-features = [
      "nix-command"
      "flakes"
    ];
    use-xdg-base-directories = true;
  };

  system.stateVersion = 6;
}
