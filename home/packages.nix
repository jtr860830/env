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
      unar
      rip2

      # Search & analysis
      tokei
      cloc
      gdu
      erdtree
      fastfetch

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
      llvm
      clang-tools
      buf

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

      # API & testing
      atac
      k6

      # Security
      _1password-cli
      openvpn

      # AI
      claude-code

      # Virtualization
      qemu
      lima

      # Container & Kubernetes
      podman
      skopeo
      crane
      podlet
      kubectl
      kubernetes-helm
      kind
      clusterctl

      # Multimedia
      ffmpeg
      mpv
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
