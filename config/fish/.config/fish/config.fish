status is-interactive; and begin
    fish_vi_key_bindings
    set -g fish_cursor_external line
    set -g pure_symbol_prompt '$'
    set -g pure_symbol_reverse_prompt '$'
    __apply_theme

    zoxide init fish | source
end
