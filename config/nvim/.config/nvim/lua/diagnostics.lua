local dot = "\u{25cf}"
local diag_icons = {
  [vim.diagnostic.severity.ERROR] = dot,
  [vim.diagnostic.severity.WARN] = dot,
  [vim.diagnostic.severity.HINT] = dot,
  [vim.diagnostic.severity.INFO] = dot,
}

local function status(counts)
  local parts = {}
  for severity, name in ipairs { "Error", "Warn", "Info", "Hint" } do
    if counts[severity] then
      parts[#parts + 1] = ("%%#DiagnosticSign%s#%s %d"):format(name, diag_icons[severity], counts[severity])
    end
  end
  return table.concat(parts, " ")
end

vim.diagnostic.config {
  virtual_text = true,
  severity_sort = true,
  signs = { text = diag_icons },
  float = { source = true },
  status = { format = status },
}
