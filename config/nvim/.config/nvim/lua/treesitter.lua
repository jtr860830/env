local install = require("nvim-treesitter").install {
  "bash", "c", "cpp", "css", "diff", "dockerfile", "fish", "git_rebase", "gitcommit",
  "go", "gomod", "helm", "html", "javascript", "json", "lua", "luadoc", "make",
  "markdown", "markdown_inline", "python", "query", "regex", "rust", "sql", "toml",
  "tsx", "typescript", "vim", "vimdoc", "yaml",
}
if #vim.api.nvim_list_uis() == 0 then install:wait(600000) end

vim.api.nvim_create_autocmd("FileType", {
  callback = function() pcall(vim.treesitter.start) end,
})
