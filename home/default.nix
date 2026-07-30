{ pkgs, ... }: {
  imports = [
    ./neovim.nix
    ./fish.nix
    ./git.nix
    ./ssh.nix
    ./tmux.nix
    ./packages.nix
    ./ghostty.nix
  ];

  home = {
    username = "jtr860830";
    homeDirectory = if pkgs.stdenv.isDarwin then "/Users/jtr860830" else "/home/jtr860830";
    stateVersion = "24.11";
  };

  programs.home-manager.enable = true;

  home.file."Pictures/Screenshots/.keep".text = "";

  xdg.enable = true;
}
