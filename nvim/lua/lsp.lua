vim.lsp.config("*", { capabilities = require("blink.cmp").get_lsp_capabilities() })

vim.api.nvim_create_autocmd("LspAttach", {
  group = vim.api.nvim_create_augroup("UserLspAttach", { clear = true }),
  callback = function(ev)
    local client = vim.lsp.get_client_by_id(ev.data.client_id)
    if not client then return end

    local bufnr = ev.buf

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
