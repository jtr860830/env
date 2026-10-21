vim.g.loaded_node_provider = 0
vim.g.loaded_perl_provider = 0
vim.g.loaded_ruby_provider = 0
vim.g.loaded_python3_provider = 0

vim.g.mapleader = " "
vim.g.maplocalleader = " "

require "options"
require "theme"
require "keymaps"
require "treesitter"
require "lsp"
require "diagnostics"
require "completion"
require "fzf"
require "plugins"
