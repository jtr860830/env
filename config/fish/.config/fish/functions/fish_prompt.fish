function __prompt_pill
    printf '%s\ue0b6%s %s %s\ue0b4%s' (set_color $__prompt_c_float_bg) (set_color -b $__prompt_c_float_bg) "$argv" (set_color normal; set_color $__prompt_c_float_bg) (set_color normal)
end

function __prompt_dir
    set -l dir (string replace -r "^$HOME(?=/|\$)" '~' -- $PWD)
    test "$argv[1]" = short; and set dir (prompt_pwd)
    set -l parent (string replace -r '[^/]*$' '' -- $dir)
    set -l base (string match -r '[^/]*$' -- $dir)
    echo -n -s (set_color $__prompt_c_blue) \uf07b ' ' $parent (set_color --bold $__prompt_c_blue) $base (set_color normal)
end

function fish_prompt
    set -l last_status $status
    set -q __prompt_gap[1]; and echo
    if contains -- --final-rendering $argv
        echo -n -s '  ' (set_color $__prompt_c_comment) '❯ ' (set_color normal)
        return
    end
    set -l line (set_color $__prompt_c_gray)

    set -l right
    set -l jobs (jobs -g 2>/dev/null | count)
    test $jobs -gt 0; and set -a right (__prompt_pill (set_color $__prompt_c_blue)\uf04c $jobs)
    test $last_status -ne 0; and set -a right (__prompt_pill (set_color $__prompt_c_red)✘ $last_status)
    if test "$CMD_DURATION" -ge 5000 2>/dev/null
        set -l s (math --scale=0 $CMD_DURATION / 1000)
        set -l text {$s}s
        test $s -ge 60; and set text (math --scale=0 $s / 60)m(math $s % 60)s
        set -a right (__prompt_pill (set_color $__prompt_c_yellow)$text)
    end

    set -l git
    test -n "$__prompt_git_text"; and set git (__prompt_pill $__prompt_git_text)
    if set -q VIRTUAL_ENV
        set -l venv $VIRTUAL_ENV_PROMPT
        test -n "$venv"; or set venv (path basename $VIRTUAL_ENV)
        set -a git (__prompt_pill (set_color $__prompt_c_yellow)\U000f0320 (set_color $__prompt_c_fg)(string trim -c '() ' -- $venv))
    end

    set -l width (math $COLUMNS - 1)
    set -l head
    set -l tail
    set -l rule 1
    for fit in full no-right short no-git
        set -l dir (__prompt_dir)
        set -l keep_git $git
        set -l keep_right $right
        switch $fit
            case no-right
                set keep_right
            case short
                set keep_right
                set dir (__prompt_dir short)
            case no-git
                set keep_right
                set dir (__prompt_dir short)
                set keep_git
        end
        set head $line'╭' $dir $keep_git
        set tail $keep_right $line'╮'
        set rule (math $width - (string length --visible -- (string join ' ' -- $head $tail)) - 1)
        test $rule -ge 1; and break
    end
    test $rule -lt 1; and set rule 1

    string join ' ' -- $head $line(string repeat -n $rule ─) $tail
    set_color normal

    set -l mode $__prompt_c_purple
    switch $fish_bind_mode
        case insert
            set mode $__prompt_c_blue
        case visual
            set mode $__prompt_c_orange
        case replace replace_one
            set mode $__prompt_c_red
    end
    echo -n -s '  ' (set_color $mode) '❯ ' (set_color normal)
end
