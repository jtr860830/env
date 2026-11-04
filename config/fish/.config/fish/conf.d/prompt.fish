status is-interactive; or return

set -g fish_transient_prompt 1

function __prompt_enter
    if string match -qr '\S' -- "$(commandline)"
        commandline -f execute
    else
        commandline ''
        __prompt_git
        commandline -f repaint
    end
end

function __prompt_postexec --on-event fish_postexec
    set -l result $status $pipestatus
    set -l codes
    if test "$status_generation" != "$__prompt_generation"
        set -g __prompt_generation $status_generation
        set codes $result
    end
    string match -qr '^\s*clear\s*$' -- $argv[1]; and return
    __prompt_close $CMD_DURATION $codes
end

function __prompt_git --on-event fish_prompt
    set -e __prompt_git_head __prompt_git_dirty __prompt_git_ahead __prompt_git_behind __prompt_git_op
    set -l lines (command git -c core.fsmonitor=false --no-optional-locks status --porcelain=v2 --branch 2>/dev/null)
    or return
    set -l gitdir (command git -c core.fsmonitor=false rev-parse --absolute-git-dir 2>/dev/null)

    set -l head (string match -rg '^# branch\.head (.*)$' -- $lines)
    if test "$head" = '(detached)'
        set head
        for backend in rebase-merge rebase-apply
            test -f $gitdir/$backend/head-name; or continue
            read -l name < $gitdir/$backend/head-name
            set head (string replace refs/heads/ '' -- $name)
            break
        end
        test -n "$head"; or set head (string match -rg '^# branch\.oid (.{7})' -- $lines)
    end
    set -g __prompt_git_head (string replace -ra '\p{Cc}' '' -- $head)

    string match -qv '#*' -- $lines; and set -g __prompt_git_dirty 1
    if string match -rq '^# branch\.ab \+(?<ahead>\d+) -(?<behind>\d+)$' -- $lines
        test $ahead -gt 0; and set -g __prompt_git_ahead $ahead
        test $behind -gt 0; and set -g __prompt_git_behind $behind
    end
    set -g __prompt_git_op (__prompt_git_operation $gitdir)
end

function __prompt_git_operation
    set -l gitdir $argv[1]
    test -n "$gitdir"; or return
    if test -d $gitdir/rebase-merge
        __prompt_progress REBASE $gitdir/rebase-merge/msgnum $gitdir/rebase-merge/end
    else if test -d $gitdir/rebase-apply
        __prompt_progress REBASE $gitdir/rebase-apply/next $gitdir/rebase-apply/last
    else if test -f $gitdir/MERGE_HEAD
        echo MERGE
    else if test -f $gitdir/CHERRY_PICK_HEAD
        echo CHERRY-PICK
    else if test -f $gitdir/REVERT_HEAD
        echo REVERT
    else if test -f $gitdir/BISECT_LOG
        echo BISECT
    end
end

function __prompt_progress
    set -l done
    set -l total
    test -f $argv[2]; and read done < $argv[2]
    test -f $argv[3]; and read total < $argv[3]
    if string match -qr '^[0-9]+$' -- "$done"; and string match -qr '^[0-9]+$' -- "$total"
        echo $argv[1] $done/$total
    else
        echo $argv[1]
    end
end
