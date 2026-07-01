{ pkgs, lib, ... }: {
  home.packages =
    with pkgs;
    [
      # CLI essentials
      bat
      eza
      fd
      fzf
      fzy
      ripgrep
      ripgrep-all
      zoxide
      tealdeer
      tokei
      cloc
      gdu
      erdtree
      unar
      rip2
      fastfetch
      atac

      # System monitoring
      bottom
      htop
      procs
      hwatch
      iftop

      # Network
      curl
      wget
      xh
      mosh
      nmap
      tcpdump
      ipcalc
      inetutils

      # Data
      jq
      fx

      # Build & dev tools
      just
      bear
      gnumake
      gnused

      # Languages & runtimes
      go
      rustup
      zig
      lua
      nodejs
      deno
      uv
      python3
      jdk

      # Editors
      helix

      # Git
      gh
      jj

      # Security
      _1password-cli

      # AI
      claude-code

      # Container & Kubernetes
      colima
      lima
      podman
      skopeo
      crane
      podlet
      kubectl
      kubernetes-helm
      kind
      k6
      clusterctl

      # Multimedia
      ffmpeg
      mpv

      # Misc
      buf
      openvpn
      less
      llvm
      clang-tools
    ]
    ++ lib.optionals pkgs.stdenv.isDarwin [
      mas
      container
    ];

  xdg.configFile."npm/npmrc".text = ''
    prefix=''${XDG_DATA_HOME}/npm
    cache=''${XDG_CACHE_HOME}/npm
    init-module=''${XDG_CONFIG_HOME}/npm/config/npm-init.js
    logs-dir=''${XDG_STATE_HOME}/npm/logs
  '';
}
