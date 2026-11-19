require("mini.icons").setup()
MiniIcons.mock_nvim_web_devicons()

require("mini.diff").setup {
  view = {
    style = "sign",
    signs = { add = "▎", change = "▎", delete = "▎" },
  },
}

require("mini.move").setup()

require("mini.pairs").setup()

require("mini.surround").setup()

local clue = require "mini.clue"
clue.setup {
  triggers = {
    { mode = "n", keys = "<leader>" },
    { mode = "v", keys = "<leader>" },
    { mode = "n", keys = "g" },
    { mode = "v", keys = "g" },
    { mode = "n", keys = "[" },
    { mode = "n", keys = "]" },
    { mode = "n", keys = "<C-w>" },
    { mode = "n", keys = "z" },
    { mode = "v", keys = "z" },
    { mode = "n", keys = "'" },
    { mode = "v", keys = "'" },
    { mode = "n", keys = "`" },
    { mode = "v", keys = "`" },
    { mode = "n", keys = '"' },
    { mode = "v", keys = '"' },
    { mode = "i", keys = "<C-r>" },
    { mode = "c", keys = "<C-r>" },
  },
  clues = {
    clue.gen_clues.g(),
    clue.gen_clues.marks(),
    clue.gen_clues.registers(),
    clue.gen_clues.windows(),
    clue.gen_clues.z(),
    clue.gen_clues.square_brackets(),
    { mode = "n", keys = "<leader>c", desc = "+code" },
    { mode = "n", keys = "<leader>f", desc = "+find" },
  },
  window = {
    delay = 300,
    config = { width = "auto" },
  },
}

require("snacks").setup {
  bigfile = { enabled = true },
  statuscolumn = { enabled = true },
  indent = {
    indent = { char = "▏" },
    scope = { char = "▏" },
  },
  words = { enabled = true },
}

require("dropbar").setup {
  symbol = { on_click = false },
  bar = {
    sources = function(buf)
      local sources = require "dropbar.sources"
      local utils = require "dropbar.utils"
      if vim.bo[buf].ft == "markdown" then return { sources.markdown } end
      if vim.bo[buf].buftype == "terminal" then return { sources.terminal } end
      return { utils.source.fallback { sources.lsp, sources.treesitter } }
    end,
  },
}

require("conform").setup {
  formatters_by_ft = {
    go = { "gofmt" },
    rust = { "rustfmt" },
    javascript = { "prettierd" },
    typescript = { "prettierd" },
    javascriptreact = { "prettierd" },
    typescriptreact = { "prettierd" },
    json = { "prettierd" },
    python = { "ruff_format" },
    c = { "clang_format" },
    sh = { "shfmt" },
    bash = { "shfmt" },
    yaml = { "prettierd" },
    toml = { "taplo" },
    lua = { "stylua" },
  },
}
