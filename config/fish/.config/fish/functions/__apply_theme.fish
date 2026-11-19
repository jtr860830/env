function __apply_theme --on-variable fish_terminal_color_theme
    if contains -- "$fish_terminal_color_theme" dark light
        fish_config theme choose "Rosé Pine Auto"
    else
        fish_config theme choose "Rosé Pine Auto" --color-theme=dark
    end
end
