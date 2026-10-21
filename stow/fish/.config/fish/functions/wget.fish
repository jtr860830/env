function wget
    command wget --hsts-file="$XDG_CACHE_HOME/wget-hsts" $argv
end
