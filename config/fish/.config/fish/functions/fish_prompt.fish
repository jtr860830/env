function __prompt_pill
    printf '%s\ue0b6%s %s %s\ue0b4%s' (set_color $__prompt_c_float_bg) (set_color -b $__prompt_c_float_bg) "$argv" (set_color normal; set_color $__prompt_c_float_bg) (set_color normal)
end

function __prompt_dir
    argparse 'max=' -- $argv
    set -l dir $argv[1]
    set -q _flag_max; and set dir (string shorten --left -m $_flag_max -- $dir)
    string match -rq '^(?<parent>.*/)?(?<base>[^/]*)$' -- $dir
    echo -n -s (set_color $__prompt_c_blue) \uf07b ' ' $parent (set_color --bold $__prompt_c_blue) $base (set_color normal)
end

function __prompt_git_pill
    set -q __prompt_git_head; or return
    set -l head $__prompt_git_head
    set -q argv[1]; and set head (string shorten -m $argv[1] -- $head)
    set -l text (set_color $__prompt_c_comment)on (set_color $__prompt_c_cyan)\ue725 $head
    set -q __prompt_git_dirty; and set text[-1] $text[-1](set_color $__prompt_c_yellow)'*'
    set -l arrows
    set -q __prompt_git_ahead; and set -a arrows ↑$__prompt_git_ahead
    set -q __prompt_git_behind; and set -a arrows ↓$__prompt_git_behind
    set -q arrows[1]; and set -a text (set_color $__prompt_c_cyan)(string join '' $arrows)
    test -n "$__prompt_git_op"; and set -a text (set_color $__prompt_c_red)$__prompt_git_op
    __prompt_pill $text
end

function __prompt_duration
    set -l s (math --scale=0 $argv[1] / 1000)
    if test $s -ge 3600
        echo (math --scale=0 $s / 3600)h(math --scale=0 $s % 3600 / 60)m
    else if test $s -ge 60
        echo (math --scale=0 $s / 60)m(math $s % 60)s
    else
        echo {$s}s
    end
end

function __prompt_frame
    set -l right
    test -n "$argv[3]"; and set right " $argv[3] "
    set -l rule (math "max(1, $argv[1] - $(string length --visible -- "$argv[2]$right$argv[4]"))")
    echo -n -s $argv[2] (set_color $__prompt_c_gray) (string repeat $rule ─) $right (set_color $__prompt_c_gray) $argv[4]
end

function __prompt_close
    set -l codes
    if set -q argv[4]; and string match -qv 0 -- $argv[3..]
        set codes $argv[3..]
    else if set -q argv[2]; and test $argv[2] -ne 0
        set codes $argv[2]
    end
    set -l error_pill
    set -q codes[1]; and set error_pill (__prompt_pill (set_color $__prompt_c_red)✘ (string join '|' (fish_status_to_signal $codes)))
    set -l duration_pill
    test $argv[1] -ge 5000; and set duration_pill (__prompt_pill (set_color $__prompt_c_yellow)(__prompt_duration $argv[1]))
    set -l columns (command stty size 2>/dev/null | string match -rg '^\d+ (\d+)$')
    test -n "$columns"; or set columns $COLUMNS
    set -l width (math "min($columns - 1, $__prompt_width)")
    set -l frame
    for drop in none duration error
        switch $drop
            case duration
                set duration_pill
            case error
                set error_pill
        end
        set -l pills $error_pill $duration_pill
        set frame (__prompt_frame $width (set_color $__prompt_c_gray)╰ "$pills" ╯)
        test (string length --visible -- $frame) -le $width; and break
    end
    printf '%s⏎%s%s\r\e[K' (set_color $__prompt_c_comment) (set_color normal) (string repeat (math $columns - 1) ' ')
    echo $frame
    set_color normal
end

function fish_prompt
    set -l line (set_color $__prompt_c_gray)

    set -l jobs_pill
    set -l jobs (count (jobs -g 2>/dev/null))
    test $jobs -gt 0; and set jobs_pill (__prompt_pill (set_color $__prompt_c_blue)\uf04c $jobs)
    set -l venv_pill
    if set -q VIRTUAL_ENV
        set -l venv $VIRTUAL_ENV_PROMPT
        test -n "$venv"; or set venv (path basename $VIRTUAL_ENV)
        set venv (string replace -ra '\p{Cc}' '' -- $venv | string trim -c '() ')
        set venv_pill (__prompt_pill (set_color $__prompt_c_yellow)\U000f0320 (set_color $__prompt_c_fg)$venv)
    end

    set -l full (prompt_pwd --dir-length=0 | string replace -ra '\p{Cc}' '')
    set -l short (prompt_pwd | string replace -ra '\p{Cc}' '')
    set -l dir $full
    set -l dir_max
    set -l branch_max
    set -l show_git 1
    set -l width (math $COLUMNS - 1)
    set -g __prompt_width $width
    set -l need 0
    set -l frame
    for drop in none short jobs branch path venv path git path
        switch $drop
            case short
                set dir $short
            case jobs
                set jobs_pill
            case branch
                set -q __prompt_git_head; and set branch_max (math "max(8, $(string length --visible -- $__prompt_git_head) - $need)")
            case path
                set dir_max --max=(math "max(8, $(string length --visible -- $short) - $need)")
            case venv git
                set dir_max
                switch $drop
                    case venv
                        set venv_pill
                    case git
                        set show_git
                end
        end
        set -l git
        set -q show_git[1]; and set git (__prompt_git_pill $branch_max)
        set frame (__prompt_frame $width "$(string join ' ' -- $line'╭' (__prompt_dir $dir_max -- $dir) $git $venv_pill) " "$jobs_pill" ╮)
        set need (math (string length --visible -- $frame) - $width)
        test $need -le 0; and break
    end
    echo $frame
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
