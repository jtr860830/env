{ hostname, config, ... }:
let
  homeDir = config.users.users.jtr860830.home;
in
{
  networking = {
    hostName = hostname;
    computerName = hostname;
    localHostName = hostname;

    knownNetworkServices = [ "Wi-Fi" ];
    dns = [
      "1.1.1.1"
      "1.0.0.1"
      "2606:4700:4700::1111"
      "2606:4700:4700::1001"
    ];
  };

  system.defaults = {
    NSGlobalDomain = {
      AppleInterfaceStyleSwitchesAutomatically = true;
      ApplePressAndHoldEnabled = false;
      KeyRepeat = 2;
      InitialKeyRepeat = 15;
      NSAutomaticCapitalizationEnabled = false;
      NSAutomaticPeriodSubstitutionEnabled = false;
      NSAutomaticDashSubstitutionEnabled = false;
      NSAutomaticQuoteSubstitutionEnabled = false;
    };

    dock = {
      autohide = true;
      autohide-delay = 0.0;
      show-recents = false;
      static-only = true;
      mru-spaces = false;
      wvous-tl-corner = 1;
      wvous-tr-corner = 1;
      wvous-bl-corner = 1;
      wvous-br-corner = 1;
    };

    finder = {
      FXPreferredViewStyle = "clmv";
      AppleShowAllExtensions = true;
      FXEnableExtensionChangeWarning = false;
      ShowPathbar = true;
      ShowStatusBar = false;
      FXDefaultSearchScope = "SCcf";
      FXRemoveOldTrashItems = true;
      QuitMenuItem = true;
      _FXSortFoldersFirst = true;
      CreateDesktop = false;
    };

    loginwindow.GuestEnabled = false;

    screencapture = {
      location = "${homeDir}/Pictures/Screenshots";
      disable-shadow = true;
      show-thumbnail = false;
    };

    WindowManager.EnableStandardClickToShowDesktop = false;
  };
}
