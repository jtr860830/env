function fish_user_key_bindings
    for key in enter ctrl-j ctrl-m
        bind -M insert $key __prompt_enter
        bind -M default -m insert $key __prompt_enter
    end
end
