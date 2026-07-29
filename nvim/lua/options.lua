local opt = vim.opt

opt.number = true
opt.relativenumber = true
opt.signcolumn = "yes"
opt.cursorline = true
opt.scrolloff = 8
opt.sidescrolloff = 8

opt.tabstop = 2
opt.shiftwidth = 2
opt.expandtab = true

opt.wrap = false

opt.ignorecase = true
opt.smartcase = true
opt.hlsearch = true

opt.splitbelow = true
opt.splitright = true
-- Default "cursor" scrolls the text to keep the cursor on the same screen row,
-- so opening any window jolts the one below it.
opt.splitkeep = "screen"

opt.showmode = false
opt.laststatus = 3
opt.cmdheight = 0

opt.undofile = true
opt.swapfile = false
-- Prompt instead of failing with E37; <leader>q would otherwise error, and
-- cmdheight = 0 makes that flash the command line. `:q!` is unaffected.
opt.confirm = true

opt.updatetime = 250
opt.timeoutlen = 300

opt.clipboard = "unnamedplus"

if vim.fn.executable "rg" == 1 then
  opt.grepprg = "rg --vimgrep"
  opt.grepformat = "%f:%l:%c:%m"
end

vim.filetype.add {
  pattern = {
    -- helm_ls claims "helm" and "yaml.helm-values"; the helm parser inherits
    -- gotmpl and additionally injects yaml, so "gotmpl" would lose both.
    [".*/templates/.*%.yaml"] = "helm",
    [".*/templates/.*%.tpl"] = "helm",
    [".*values.*%.yaml"] = "yaml.helm-values",
    ["%.gitlab%-ci%.yml"] = "yaml.gitlab",
    ["%.gitlab%-ci%.yaml"] = "yaml.gitlab",
  },
}
