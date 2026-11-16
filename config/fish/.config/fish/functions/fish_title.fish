function fish_title
    set -l command $argv[1]
    if not set -q argv[1]
        set command (status current-command)
        test "$command" = fish; and set command
    end
    string replace -ra '\p{Cc}+' ' ' -- "\$ $command" | string trim -r
end
