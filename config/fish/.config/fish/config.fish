status is-interactive; and begin
    if not set -q TMUX; and test "$__CFBundleIdentifier" != com.barut.OmniWM
        exec tmux new-session -A -s main
    end

    fish_vi_key_bindings

    zoxide init fish | source
end
