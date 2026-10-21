local dot = "\u{25cf}"
local diag_icons = {
  [vim.diagnostic.severity.ERROR] = dot,
  [vim.diagnostic.severity.WARN] = dot,
  [vim.diagnostic.severity.HINT] = dot,
  [vim.diagnostic.severity.INFO] = dot,
}

vim.diagnostic.config {
  virtual_text = true,
  severity_sort = true,
  signs = { text = diag_icons },
  float = { source = true },
}
