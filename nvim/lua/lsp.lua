vim.lsp.config("*", {
  capabilities = require("blink.cmp").get_lsp_capabilities(),

  on_attach = function(client, bufnr)
    vim.keymap.set(
      "n",
      "K",
      function() vim.lsp.buf.hover { border = "rounded" } end,
      { buffer = bufnr, desc = "Hover" }
    )

    if client:supports_method "textDocument/inlayHint" then
      vim.lsp.inlay_hint.enable(true, { bufnr = bufnr })
      local hint_group = vim.api.nvim_create_augroup("UserLspInlayHints_" .. bufnr, { clear = true })
      vim.api.nvim_create_autocmd("InsertEnter", {
        group = hint_group,
        buffer = bufnr,
        callback = function() vim.lsp.inlay_hint.enable(false, { bufnr = bufnr }) end,
      })
      vim.api.nvim_create_autocmd("InsertLeave", {
        group = hint_group,
        buffer = bufnr,
        callback = function() vim.lsp.inlay_hint.enable(true, { bufnr = bufnr }) end,
      })
    end
  end,
})

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
