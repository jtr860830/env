require("blink.cmp").setup {
  keymap = {
    preset = "none",
    ["<Tab>"] = { "select_next", "snippet_forward", "fallback" },
    ["<S-Tab>"] = { "select_prev", "snippet_backward", "fallback" },
    ["<CR>"] = { "accept", "fallback" },
    ["<C-e>"] = { "hide" },
    ["<C-Space>"] = { "show", "show_documentation", "hide_documentation" },
  },
  sources = {
    default = { "lsp", "path", "buffer" },
  },
  signature = { enabled = true },
  completion = { documentation = { auto_show = true } },
}
