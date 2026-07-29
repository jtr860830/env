local map = vim.keymap.set

map("v", "<", "<gv")
map("v", ">", ">gv")

map("n", "<Esc>", "<cmd>nohlsearch<CR>", { desc = "Clear search" })

map("n", "<leader>w", "<cmd>w<CR>", { desc = "Save" })
map("n", "<leader>q", "<cmd>q<CR>", { desc = "Quit" })

map("n", "[d", function() vim.diagnostic.jump { count = -1 } end, { desc = "Previous diagnostic" })
map("n", "]d", function() vim.diagnostic.jump { count = 1 } end, { desc = "Next diagnostic" })
map("n", "<leader>cd", vim.diagnostic.open_float, { desc = "Diagnostic float" })
map("n", "<leader>cf", function() require("conform").format { lsp_format = "fallback" } end, { desc = "Format" })
