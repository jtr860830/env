set shell := ["bash", "-euo", "pipefail", "-c"]

packages := "bin claude codex fish ghostty git go npm nvim ssh tmux"

default:
    @just --list

setup: install etc link plugins

install:
    brew bundle install --file brewfile

update:
    brew bundle install --upgrade --file brewfile
    just plugins

plugins:
    fish -c 'fisher update'
    nvim --headless '+lua vim.pack.update(nil, { force = true })' +qa
    nvim --headless '+lua require("nvim-treesitter").update():wait(600000)' +qa
    nvim --headless +qa

link:
    stow --no-folding -d stow -t ~ {{packages}}

relink:
    cd stow && find . -mindepth 2 \( -type f -o -type l \) -print0 | while IFS= read -r -d '' f; do t="$HOME/${f#./*/}"; if [ -L "$t" ] && [ ! -e "$t" ]; then rm "$t"; fi; done
    just link

etc:
    grep -qx /opt/homebrew/bin/fish /etc/shells || echo /opt/homebrew/bin/fish | sudo tee -a /etc/shells >/dev/null
    sudo mkdir -p /etc/homebrew
    printf 'HOMEBREW_XDG_CONFIG_HOME=%s/.config\n' "$HOME" | sudo tee /etc/homebrew/brew.env >/dev/null
    printf 'auth       optional       /opt/homebrew/lib/pam/pam_reattach.so\nauth       sufficient     pam_tid.so\n' | sudo tee /etc/pam.d/sudo_local >/dev/null
    sudo chmod 444 /etc/pam.d/sudo_local
    [ "$(dscl . -read ~ UserShell | cut -d' ' -f2)" = /opt/homebrew/bin/fish ] || chsh -s /opt/homebrew/bin/fish

check:
    brew bundle check --file brewfile
    scripts/check-store-refs.sh
    stow --no-folding -n -d stow -t ~ {{packages}}

clean:
    brew bundle cleanup --force --file brewfile
