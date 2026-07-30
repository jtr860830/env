{ hostname, config, ... }:
let
  homeDir = config.users.users.jtr860830.home;
in
{
  networking = {
    hostName = hostname;
    computerName = hostname;
    localHostName = hostname;

    # A deterministic resolver instead of whatever DHCP hands out. This is only
    # the fallback: Tailscale runs with accept-dns and its admin console has
    # "Override Local DNS" on, so live queries go to 100.100.100.100 and the
    # upstreams come from the tailnet, not from here.
    #
    # `dns` only touches the services named here, and a name that matches
    # nothing is skipped silently — so a typo fails quietly. Copy names from
    # `networksetup -listallnetworkservices`. Tailscale's own service is
    # deliberately left out.
    #
    # v6 entries come last on purpose: macOS queries nameservers in order, so
    # on an IPv4-only network the v4 pair answers first and the v6 pair is
    # never tried. Keeping them means an IPv6-capable network needs no change.
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
