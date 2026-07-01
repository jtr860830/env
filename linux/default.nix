{ hostname, pkgs, ... }: {
  networking.hostName = hostname;

  environment.shells = [ pkgs.fish ];
  programs.fish.enable = true;

  users.users.jtr860830 = {
    isNormalUser = true;
    shell = pkgs.fish;
    extraGroups = [
      "wheel"
    ];
  };

  nix.settings = {
    experimental-features = [
      "nix-command"
      "flakes"
    ];
  };

  nixpkgs.hostPlatform = "x86_64-linux";
  system.stateVersion = "25.05";
}
