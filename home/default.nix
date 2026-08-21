{ pkgs, ... }: {
  imports = [
    ./env.nix
    ./fish.nix
    ./ghostty.nix
    ./git.nix
    ./neovim.nix
    ./packages.nix
    ./ssh.nix
    ./tmux.nix
  ];

  home = {
    username = "jtr860830";
    homeDirectory = if pkgs.stdenv.hostPlatform.isDarwin then "/Users/jtr860830" else "/home/jtr860830";
    stateVersion = "24.11";
  };

  programs.home-manager.enable = true;

  home.file."Pictures/Screenshots/.keep".text = "";

  xdg.enable = true;
}
