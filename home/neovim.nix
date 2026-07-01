{ pkgs, ... }: {
  programs.neovim = {
    enable = true;
    viAlias = true;
    vimAlias = true;
    withRuby = false;
    withPython3 = false;
    initLua = builtins.readFile ../nvim/init.lua;

    plugins = with pkgs.vimPlugins; [
      nvim-treesitter.withAllGrammars
      nvim-lspconfig
      blink-cmp
      fzf-lua
      mini-nvim
      onedarkpro-nvim
      dropbar-nvim
      snacks-nvim
      conform-nvim
    ];

    extraPackages = with pkgs; [
      gopls
      typescript-language-server
      pyright
      bash-language-server
      yaml-language-server
      taplo
      lua-language-server
      nixd
      nixfmt
      helm-ls
      prettierd
      ruff
      shfmt
      stylua
    ];
  };

  xdg.configFile."nvim/lua".source = ../nvim/lua;

  home.sessionVariables = {
    EDITOR = "nvim";
    VISUAL = "nvim";
    MANPAGER = "nvim +Man!";
  };
}
