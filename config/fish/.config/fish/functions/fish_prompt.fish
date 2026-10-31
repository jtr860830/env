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

function fish_prompt
    set -l last_status $status
    set -q __prompt_gap; and echo
    if contains -- --final-rendering $argv
        echo -n -s (set_color $__prompt_c_comment) '❯ ' (set_color normal)
        return
    end
    set -l line (set_color $__prompt_c_gray)

    set -l jobs_pill
    set -l jobs (count (jobs -g 2>/dev/null))
    test $jobs -gt 0; and set jobs_pill (__prompt_pill (set_color $__prompt_c_blue)\uf04c $jobs)
    set -l error_pill
    test $last_status -ne 0; and set error_pill (__prompt_pill (set_color $__prompt_c_red)✘ $last_status)
    set -l duration_pill
    set -q CMD_DURATION; and test $CMD_DURATION -ge 5000; and set duration_pill (__prompt_pill (set_color $__prompt_c_yellow)(__prompt_duration $CMD_DURATION))
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
    set -l need 0
    set -l head
    set -l tail
    set -l rule
    for drop in none short duration jobs branch path venv path git path error path
        switch $drop
            case short
                set dir $short
            case duration
                set duration_pill
            case jobs
                set jobs_pill
            case branch
                set -q __prompt_git_head; and set branch_max (math "max(8, $(string length --visible -- $__prompt_git_head) - $need)")
            case path
                set dir_max --max=(math "max(8, $(string length --visible -- $short) - $need)")
            case venv git error
                set dir_max
                switch $drop
                    case venv
                        set venv_pill
                    case git
                        set show_git
                    case error
                        set error_pill
                end
        end
        set -l git
        set -q show_git[1]; and set git (__prompt_git_pill $branch_max)
        set head $line'╭' (__prompt_dir $dir_max -- $dir) $git $venv_pill
        set tail $jobs_pill $error_pill $duration_pill $line'╮'
        set rule (math $width - (string length --visible -- (string join ' ' -- $head $tail)) - 1)
        test $rule -ge 1; and break
        set need (math 1 - $rule)
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
