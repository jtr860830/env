status is-interactive; or return

function __prompt_git --on-event fish_prompt
    set -g __prompt_git_text
    set -l lines (command git -c core.fsmonitor=false --no-optional-locks status --porcelain=v2 --branch 2>/dev/null)
    or return

    set -l head
    set -l oid
    set -l ahead 0
    set -l behind 0
    set -l dirty
    for line in $lines
        switch $line
            case '# branch.head *'
                set head (string sub -s 15 -- $line)
            case '# branch.oid *'
                set oid (string sub -s 14 -l 7 -- $line)
            case '# branch.ab *'
                set -l ab (string split ' ' -- $line)
                set ahead (string trim -c + -- $ab[3])
                set behind (string trim -c - -- $ab[4])
            case '#*'
            case '*'
                set dirty 1
        end
    end
    if test "$head" = '(detached)'
        set head $oid
        set -l name (string replace refs/heads/ '' < (command git -c core.fsmonitor=false rev-parse --git-path rebase-merge/head-name) 2>/dev/null)
        test -n "$name"; and set head $name
    end

    set head (string replace -ra '\p{Cc}' '' -- $head)
    set -l text (set_color $__prompt_c_comment)on (set_color $__prompt_c_cyan)\ue725 $head
    set -q dirty[1]; and set text[-1] $text[-1](set_color $__prompt_c_yellow)'*'
    set -l arrows
    test "$ahead" -gt 0 2>/dev/null; and set -a arrows ↑$ahead
    test "$behind" -gt 0 2>/dev/null; and set -a arrows ↓$behind
    set -q arrows[1]; and set -a text (set_color $__prompt_c_cyan)(string join '' $arrows)
    set -l op (__prompt_git_operation)
    test -n "$op"; and set -a text (set_color $__prompt_c_red)$op
    set -g __prompt_git_text (string join ' ' -- $text)
end

function __prompt_git_operation
    set -l dir $PWD
    while not test -e $dir/.git
        test "$dir" = /; and return
        set dir (path dirname $dir)
    end
    set -l gitdir $dir/.git
    if test -f $gitdir
        set gitdir (string replace -r '^gitdir: ' '' < $gitdir)
        string match -q '/*' -- $gitdir; or set gitdir $dir/$gitdir
    end

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
    end 2>/dev/null
end

function __prompt_progress
    read -l done < $argv[2] 2>/dev/null
    read -l total < $argv[3] 2>/dev/null
    if string match -qr '^[0-9]+$' -- "$done"; and string match -qr '^[0-9]+$' -- "$total"
        echo $argv[1] $done/$total
    else
        echo $argv[1]
    end
end
