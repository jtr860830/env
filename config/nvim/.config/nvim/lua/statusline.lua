local M = {}

local function mode_colors()
  for _, name in ipairs { "Normal", "Insert", "Visual", "Replace", "Command", "Other" } do
    local bg = vim.api.nvim_get_hl(0, { name = "MiniStatuslineMode" .. name, link = false }).bg
    vim.api.nvim_set_hl(0, "StatuslineMode" .. name, { fg = bg, bold = true })
  end
end
mode_colors()
vim.api.nvim_create_autocmd("ColorScheme", { callback = mode_colors })
vim.api.nvim_create_autocmd("RecordingLeave", { callback = function() vim.schedule(vim.cmd.redrawstatus) end })

local function mode()
  local name, hl = require("mini.statusline").section_mode { trunc_width = math.huge }
  return "%#" .. (hl:gsub("^Mini", "")) .. "#" .. name:sub(1, 1) .. "%*"
end

local function icon()
  local ft = vim.bo.filetype
  if ft == "" then return "" end
  local glyph, hl = MiniIcons.get("filetype", ft)
  return "%#" .. hl .. "#" .. glyph .. "%*"
end

local function recording()
  local reg = vim.fn.reg_recording()
  return reg ~= "" and "recording @" .. reg or ""
end

local function search()
  if vim.v.hlsearch == 0 then return "" end
  local ok, count = pcall(vim.fn.searchcount, { maxcount = 999, timeout = 100 })
  if not ok or not count.total or count.total == 0 then return "" end
  if count.incomplete == 1 then return "?/?" end
  local function capped(n) return n > count.maxcount and ">" .. count.maxcount or n end
  return capped(count.current) .. "/" .. capped(count.total)
end

local function join(parts)
  return table.concat(vim.tbl_filter(function(part) return part ~= "" end, parts), "  ")
end

function M.render()
  return mode() .. " %<%f %h%w%m%r%=%(%S  %)" .. join { recording(), search(), vim.diagnostic.status(), icon() }
end

vim.o.statusline = "%{%v:lua.require'statusline'.render()%}"

return M
