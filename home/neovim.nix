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
  };

  xdg.configFile."nvim/lua".source = ../nvim/lua;

  programs.man = {
    man-db.enable = false;
    mandoc.enable = true;
  };

  home.sessionVariables = {
    EDITOR = "nvim";
    VISUAL = "nvim";
    MANPAGER = "nvim +Man!";
  };
}
