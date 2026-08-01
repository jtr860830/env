require("onedarkpro").setup {
  highlights = {
    PmenuSel = {
      bg = {
        dark = "#373e48",
        light = "#cbcbcb",
      },
    },
  },
  colors = {
    light = {
      fg = "#383a42",
      gray = "#a0a1a7",
      red = "#e45649",
      orange = "#986801",
      yellow = "#c18401",
      green = "#50a14f",
      cyan = "#0184bc",
      blue = "#4078f2",
      purple = "#a626a4",
    },
  },
  styles = {
    comments = "italic",
    virtual_text = "italic",
  },
  plugins = {
    blink_cmp = true,
    mini_diff = true,
    mini_icons = true,
    snacks = true,
    nvim_lsp = true,
    treesitter = true,
  },
}

local function variant() return vim.o.background == "light" and "onelight" or "onedark" end

local group = vim.api.nvim_create_augroup("UserTheme", { clear = true })

vim.api.nvim_create_autocmd("ColorScheme", {
  group = group,
  callback = function(args)
    if args.match ~= variant() then return end

    local c = require("onedarkpro.helpers").get_colors()

    for name, hue in pairs {
      Normal = c.purple,
      Insert = c.blue,
      Visual = c.orange,
      Replace = c.red,
      Command = c.yellow,
      Other = c.cyan,
    } do
      vim.api.nvim_set_hl(0, "MiniStatuslineMode" .. name, { bg = hue, fg = c.bg, bold = true })
      vim.api.nvim_set_hl(0, "UserPillCap" .. name, { fg = hue, bg = c.bg })
    end

    vim.api.nvim_set_hl(0, "UserPill", { bg = c.float_bg, fg = c.fg })
    vim.api.nvim_set_hl(0, "UserPillCap", { fg = c.float_bg, bg = c.bg })

    vim.api.nvim_set_hl(0, "MiniStatuslineFilename", { bg = c.bg, fg = c.fg })
    vim.api.nvim_set_hl(0, "MiniStatuslineInactive", { bg = c.bg, fg = c.gray })

    vim.api.nvim_set_hl(0, "MiniStatuslineDiagError", { bg = c.float_bg, fg = c.red })
    vim.api.nvim_set_hl(0, "MiniStatuslineDiagWarn", { bg = c.float_bg, fg = c.yellow })
    vim.api.nvim_set_hl(0, "MiniStatuslineDiagInfo", { bg = c.float_bg, fg = c.blue })
  end,
})

vim.api.nvim_create_autocmd("OptionSet", {
  group = group,
  pattern = "background",
  nested = true,
  callback = function() vim.cmd.colorscheme(variant()) end,
})

vim.cmd.colorscheme(variant())
