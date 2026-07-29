{ hostname, config, ... }:
let
  homeDir = config.users.users.jtr860830.home;
in
{
  networking = {
    hostName = hostname;
    computerName = hostname;
    localHostName = hostname;
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
      # all hot corners disabled
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
      # Absolute path required — nix-darwin shell-escapes the value, so `~` is
      # written literally and never expanded. Directory is created by
      # home/default.nix.
      location = "${homeDir}/Pictures/Screenshots";
      disable-shadow = true;
      show-thumbnail = false;
    };

    # Sonoma+ moves every window aside when the wallpaper is clicked
    WindowManager.EnableStandardClickToShowDesktop = false;
  };
}
