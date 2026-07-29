{ config, ... }:
let
  homeDir = config.users.users.jtr860830.home;
in
{
  # The activation script runs brew under `sudo --preserve-env=PATH`, which
  # drops XDG_CONFIG_HOME, so Homebrew falls back to $HOME/.homebrew for its
  # user config. brew reads /etc/homebrew/brew.env before deciding that path,
  # and HOMEBREW_XDG_CONFIG_HOME is not in its forbidden-override list.
  #
  # The brew.env hierarchy is supported (Homebrew/brew#15787), but the variable
  # itself is undocumented and upstream has not settled this: Homebrew/brew#20250
  # was closed unmerged with a maintainer preferring a new HOMEBREW_CONFIG_HOME.
  # If ~/.homebrew ever reappears, check whether the name changed.
  environment.etc."homebrew/brew.env".text = ''
    HOMEBREW_XDG_CONFIG_HOME=${homeDir}/.config
  '';

  homebrew = {
    enable = true;
    onActivation = {
      cleanup = "zap";
      autoUpdate = true;
      upgrade = true;
    };

    casks = [
      "1password"
      "burp-suite"
      "claude"
      "dash"
      "discord"
      "drawio"
      "element"
      "firefox"
      "firefox@nightly"
      "ghostty"
      "google-chrome"
      "iina"
      "k6-studio"
      "keyboardcleantool"
      "rustdesk"
      "signal"
      "slack"
      "tailscale-app"
      "telegram"
      "wireshark-app"
      "zed"
    ];

    masApps = {
      "1Password for Safari" = 1569813296;
      "Dropover" = 1355679052;
      "LINE" = 539883307;
      "Wappalyzer" = 1520333300;
      "Windows App" = 1295203466;
    };
  };
}
