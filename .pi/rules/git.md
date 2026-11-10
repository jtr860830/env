---
paths: ["config/git/**"]
---

## Git

`column.ui = "auto"` was declined: it fights `branch.sort = "-committerdate"`.

Default branch is `main`, matching `init.defaultBranch` in git's config. Renamed from `master` on 2026-08-15 with GitHub's `branches/{branch}/rename` API, which moves the default and leaves redirects behind.

## Tools Deliberately Absent

`bat` and `delta` were removed. Neither had another consumer — the man pager is `nvim +Man!`, fzf-lua uses its own builtin previewer, and delta bundles its own syntect so it never needed bat installed. Reading a file with syntax highlighting is something Neovim does better, and for diffs it has twelve fzf-lua git pickers plus `mini.diff`.

Git's own diff is also the *better* choice under a switching theme: it emits nothing but ANSI indices (`\e[31m` `\e[32m` `\e[36m` `\e[1m`, verified — no `38;2;R;G;B` anywhere), so it follows the terminal palette for free, where delta would have needed `BAT_THEME` wired into the fish theme function. `diff.colorMoved=zebra` stays palette-only too, if a richer diff is ever wanted.

`core.pager = nvim` was tried and rejected. It needs five overrides — `nonumber norelativenumber signcolumn=no laststatus=0` plus clearing dropbar's winbar — before it stops looking like an editor that opened a diff by mistake, and at the time it got no syntax highlighting in exchange, because nixpkgs' `diff` parser was out of sync with its queries (`Invalid node type "change"`). That half no longer holds — nvim-treesitter's own parser highlights diffs — so the five overrides are now the whole cost.
