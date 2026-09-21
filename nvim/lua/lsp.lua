vim.lsp.enable {
  "gopls",
  "clangd",
  "pyright",
  "ts_ls",
  "bashls",
  "yamlls",
  "taplo",
  "lua_ls",
  "nixd",
  "helm_ls",
}

local dot = vim.fn.nr2char(0x25cf)
local diag_icons = {
  [vim.diagnostic.severity.ERROR] = dot,
  [vim.diagnostic.severity.WARN] = dot,
  [vim.diagnostic.severity.HINT] = dot,
  [vim.diagnostic.severity.INFO] = dot,
}

vim.diagnostic.config {
  virtual_text = true,
  underline = true,
  update_in_insert = false,
  severity_sort = true,
  signs = { text = diag_icons },
  float = { border = "rounded", source = true },
}
