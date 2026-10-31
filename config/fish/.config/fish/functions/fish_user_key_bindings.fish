function fish_user_key_bindings
    for key in enter ctrl-j ctrl-m
        bind -M insert $key __prompt_enter
        bind -M default -m insert $key __prompt_enter
        bind -M replace -m insert $key __prompt_enter repaint-mode
    end
    for mode in default insert visual
        bind -M $mode ctrl-l __prompt_drop_gap 'status test-terminal-feature scroll-content-up && commandline -f scrollback-push' clear-screen
    end
end
