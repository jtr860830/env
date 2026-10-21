vim.api.nvim_create_autocmd("User", {
  pattern = "TSUpdate",
  callback = function()
    require("nvim-treesitter.parsers").tmux = {
      install_info = {
        url = "https://github.com/Freed-Wu/tree-sitter-tmux",
        generate = true,
        queries = "queries",
      },
    }
  end,
})

local install = require("nvim-treesitter").install {
  "bash", "c", "cpp", "css", "diff", "dockerfile", "fish", "git_config",
  "git_rebase", "gitcommit", "gitignore", "go", "gomod", "gosum", "gowork",
  "helm", "html", "javascript", "jsdoc", "json", "lua", "luadoc", "luap", "make",
  "markdown", "markdown_inline", "python", "query", "regex", "rust", "sql",
  "ssh_config", "tmux", "toml", "tsx", "typescript", "vim", "vimdoc", "yaml",
}
if #vim.api.nvim_list_uis() == 0 then install:wait(600000) end

vim.api.nvim_create_autocmd("FileType", {
  callback = function() pcall(vim.treesitter.start) end,
})
