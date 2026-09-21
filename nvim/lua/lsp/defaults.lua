local base = {
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
}

return function(extra) return vim.tbl_deep_extend("force", base, extra or {}) end
