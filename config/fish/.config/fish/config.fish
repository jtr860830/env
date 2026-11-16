status is-interactive; and begin
    fish_vi_key_bindings
    set -g fish_cursor_external line

    zoxide init fish | source
end
