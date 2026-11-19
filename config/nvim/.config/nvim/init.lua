vim.loader.enable()

vim.g.loaded_node_provider = 0
vim.g.loaded_perl_provider = 0
vim.g.loaded_ruby_provider = 0
vim.g.loaded_python3_provider = 0

vim.g.mapleader = " "
vim.g.maplocalleader = " "

vim.pack.add({
  "https://github.com/nvim-treesitter/nvim-treesitter",
  "https://github.com/neovim/nvim-lspconfig",
  { src = "https://github.com/saghen/blink.cmp", version = vim.version.range "1.*" },
  "https://github.com/ibhagwan/fzf-lua",
  "https://github.com/nvim-mini/mini.nvim",
  { src = "https://github.com/rose-pine/neovim", name = "rose-pine" },
  "https://github.com/Bekaboo/dropbar.nvim",
  "https://github.com/folke/snacks.nvim",
  "https://github.com/stevearc/conform.nvim",
}, { confirm = false })

vim.cmd.colorscheme "rose-pine"

require "options"
require "keymaps"
require "treesitter"
require "lsp"
require "diagnostics"
require "completion"
require "fzf"
require "plugins"
require "statusline"
