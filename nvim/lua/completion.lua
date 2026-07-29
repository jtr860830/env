require("blink.cmp").setup {
  keymap = {
    preset = "none",
    ["<Tab>"] = { "select_next", "snippet_forward", "fallback" },
    ["<S-Tab>"] = { "select_prev", "snippet_backward", "fallback" },
    ["<CR>"] = { "accept", "fallback" },
    ["<C-e>"] = { "hide" },
    ["<C-Space>"] = { "show", "show_documentation", "hide_documentation" },
  },
  appearance = { nerd_font_variant = "mono" },
  sources = {
    -- No "snippets" source: that reads snippet libraries off the runtimepath
    -- and none are installed. LSP snippets arrive through "lsp" regardless.
    default = { "lsp", "path", "buffer" },
  },
  signature = {
    enabled = true,
    window = { border = "rounded" },
  },
  completion = {
    documentation = {
      auto_show = true,
      window = { border = "rounded" },
    },
    menu = { border = "rounded" },
  },
}
