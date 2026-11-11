---
paths: ["justfile", "bootstrap.sh"]
---

## Bootstrap and Relinking

A new machine runs `./bootstrap.sh`: it installs Homebrew and `just` — exporting `XDG_CONFIG_HOME` first, so `~/.homebrew` is never created — and `exec`s `just setup`. Everything else lives in the `justfile`, which resolves paths from its own directory. Moving the repo was tested: 20 links dangled, `just relink` repointed them, nvim, fish and git kept working.

With the required `stow --no-folding` rule in `AGENTS.md`, every directory under `~` is real and only leaf files are links.

## System Files

`just etc` owns three files under `/etc`: `/etc/shells` gains `/opt/homebrew/bin/fish` (`chsh` refuses a shell not listed there); `/etc/pam.d/sudo_local` gets `pam_reattach.so` from `/opt/homebrew/lib/pam/`, then `pam_tid.so`, so Touch ID works for sudo including inside tmux; `/etc/homebrew/brew.env` sets `HOMEBREW_CACHE` and `HOMEBREW_XDG_CONFIG_HOME` (`docs/homebrew.md`).
