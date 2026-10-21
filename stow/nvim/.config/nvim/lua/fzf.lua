local fzf = require "fzf-lua"

fzf.setup {
  winopts = {
    height = 0.85,
    width = 0.80,
    border = "rounded",
    preview = {
      layout = "flex",
      flip_columns = 120,
      border = "rounded",
    },
  },
  fzf_colors = true,
}

local map = vim.keymap.set
map("n", "<leader>ff", fzf.files, { desc = "Find files" })
map("n", "<leader>fg", fzf.live_grep, { desc = "Live grep" })
map("n", "<leader>fh", fzf.help_tags, { desc = "Help tags" })
map("n", "<leader>fr", fzf.oldfiles, { desc = "Recent files" })
map("n", "<leader>fs", fzf.lsp_document_symbols, { desc = "Document symbols" })
map("n", "<leader>fw", fzf.grep_cword, { desc = "Grep word" })
map("n", "<leader>fd", fzf.diagnostics_document, { desc = "Diagnostics" })
