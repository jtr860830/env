set shell := ["bash", "-euo", "pipefail", "-c"]

packages := "claude codex fish ghostty git npm nvim omniwm pi ssh"
rex_bin := env("HOME") / "Library/Application Support/com.superlogical.rex/RexServer/Versions/Current/Rex Server.app/Contents/MacOS/rex"
rex_themes := "/Applications/Ghostty.app/Contents/Resources/ghostty/themes"

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
    @echo >&2
    nvim --headless '+lua vim.pack.update(nil, { force = true })' +qa
    @echo >&2
    nvim --headless '+lua require("nvim-treesitter").update():wait(600000)' +qa
    @echo >&2
    nvim --headless +qa

link:
    stow --no-folding -R -d config -t ~ {{packages}}
    [ ! -x "{{rex_bin}}" ] || { mkdir -p ~/.local/bin && ln -sfn "{{rex_bin}}" ~/.local/bin/rex; }

relink:
    cd config && find . -mindepth 2 \( -type f -o -type l \) -print0 | while IFS= read -r -d '' f; do t="$HOME/${f#./*/}"; if [ -L "$t" ] && [ ! -e "$t" ]; then rm "$t"; fi; done
    just link

etc:
    grep -qx /opt/homebrew/bin/fish /etc/shells || echo /opt/homebrew/bin/fish | sudo tee -a /etc/shells >/dev/null
    sudo mkdir -p /etc/homebrew
    printf 'HOMEBREW_CACHE=%s/.cache/homebrew\nHOMEBREW_XDG_CONFIG_HOME=%s/.config\n' "$HOME" "$HOME" | sudo tee /etc/homebrew/brew.env >/dev/null
    printf 'auth       sufficient     pam_tid.so\n' | sudo tee /etc/pam.d/sudo_local >/dev/null
    sudo chmod 444 /etc/pam.d/sudo_local
    [ ! -x "{{rex_bin}}" ] || { sudo mkdir -p /usr/local/share/terminfo && "{{rex_bin}}" terminfo show | sudo /usr/bin/tic -x -o /usr/local/share/terminfo /dev/stdin; }
    [ "$(dscl . -read ~ UserShell | cut -d' ' -f2)" = /opt/homebrew/bin/fish ] || chsh -s /opt/homebrew/bin/fish

rex:
    "{{rex_bin}}" do client.setting.themes.dark.palette value="Rose Pine" 2>/dev/null || { "{{rex_bin}}" do client.theme.import --args '{"path":"{{rex_themes}}/Rose Pine"}' && "{{rex_bin}}" do client.setting.themes.dark.palette value="Rose Pine"; }
    "{{rex_bin}}" do client.setting.themes.light.palette value="Rose Pine Dawn" 2>/dev/null || { "{{rex_bin}}" do client.theme.import --args '{"path":"{{rex_themes}}/Rose Pine Dawn"}' && "{{rex_bin}}" do client.setting.themes.light.palette value="Rose Pine Dawn"; }
    "{{rex_bin}}" do client.setting.interface.appearance.scheme value=auto
    "{{rex_bin}}" do client.setting.terminal.typography.font value="Maple Mono NF CN"
    "{{rex_bin}}" do client.setting.terminal.typography.size value=14
    "{{rex_bin}}" do client.setting.terminal.typography.line_height value=24
    "{{rex_bin}}" do client.setting.terminal.keyboard.option value=sends_alt

check: check-docs
    brew bundle check --file brewfile
    ! grep -rlF "{{justfile_directory()}}" config/
    stow --no-folding -n -d config -t ~ {{packages}}

check-docs:
    python3 scripts/check-docs.py

clean:
    brew bundle cleanup --force --file brewfile
