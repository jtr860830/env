{ config, ... }:
let
  homeDir = config.users.users.jtr860830.home;
in
{
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
