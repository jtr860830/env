-- setup() is what lets fzf-lua detect mini.icons; without it fzf-lua finds no
-- provider at all. dropbar only ever reads nvim-web-devicons, falling back to a
-- single generic glyph for every filetype, so it needs the mock as well.
require("mini.icons").setup()
MiniIcons.mock_nvim_web_devicons()

require("mini.diff").setup {
  view = {
    style = "sign",
    signs = { add = "▎", change = "▎", delete = "▎" },
  },
}

-- <A-hjkl> in normal and visual; respects count and stops at buffer edges
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
    config = { width = "auto", border = "rounded" },
  },
}

local sev = vim.diagnostic.severity
local hl_map = {
  [sev.ERROR] = "MiniStatuslineDiagError",
  [sev.WARN] = "MiniStatuslineDiagWarn",
  [sev.INFO] = "MiniStatuslineDiagInfo",
}
local cfg = vim.diagnostic.config() or {}
local sign_text = type(cfg.signs) == "table" and cfg.signs.text or {}

local function statusline_diagnostics()
  local counts = vim.diagnostic.count(0)
  local groups = {}
  for _, s in ipairs { sev.ERROR, sev.WARN, sev.INFO } do
    local count = counts[s] or 0
    if count > 0 then
      local icon = sign_text[s] or ""
      table.insert(groups, {
        hl = hl_map[s],
        strings = { (icon ~= "" and icon .. " " or "") .. count },
      })
    end
  end
  return groups
end

local function statusline_filename()
  local path = vim.api.nvim_buf_get_name(0)
  if path == "" then return "[No Name]" end
  local root = vim.fs.root(0, { ".git", ".hg", "package.json", "Makefile" })
  local display = root and path:sub(#root + 2) or vim.fn.fnamemodify(path, ":~:.")
  return display .. (vim.bo.modified and " [+]" or "")
end

require("mini.statusline").setup {
  use_icons = true,
  content = {
    active = function()
      local mode, mode_hl = MiniStatusline.section_mode { trunc_width = 9999 }
      local filename = statusline_filename()
      local diagnostics = statusline_diagnostics()

      local ft = vim.bo.filetype
      local icon = ft ~= "" and require("mini.icons").get("filetype", ft) or ""
      local filetype = ft ~= "" and (icon .. " " .. ft) or ""

      local groups = {
        { hl = mode_hl, strings = { mode } },
        "%<",
        { hl = "MiniStatuslineFilename", strings = { filename } },
        "%=",
      }
      vim.list_extend(groups, diagnostics)
      table.insert(groups, { hl = "MiniStatuslineFilename", strings = { filetype } })
      return MiniStatusline.combine_groups(groups)
    end,
    -- No `inactive`: mini.statusline short-circuits to `active` when
    -- laststatus is 3, so it would never be called. Its own default still
    -- uses the MiniStatuslineInactive highlight set in theme.lua.
  },
}

require("snacks").setup {
  bigfile = { enabled = true },
  input = { enabled = true },
  notifier = { enabled = true },
  statuscolumn = { enabled = true },
  indent = {
    indent = { char = "▏" },
    scope = { char = "▏" },
  },
  words = {
    enabled = true,
    debounce = 200,
  },
}

require("dropbar").setup()

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
    nix = { "nixfmt" },
  },
}
